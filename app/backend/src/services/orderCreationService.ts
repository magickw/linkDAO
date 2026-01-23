import { DatabaseService } from './databaseService';
import { safeLogger } from '../utils/safeLogger';
import { NotificationService } from './notificationService';
import { HybridPaymentOrchestrator } from './hybridPaymentOrchestrator';
import { ProductListingService } from './listingService';
import { sellerService } from './sellerService';
import { ShippingService } from './shippingService';
import { taxCalculationService } from './taxCalculationService';

export interface OrderCreationRequest {
  listingId: string;
  buyerAddress: string;
  quantity: number;
  shippingAddress: {
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phoneNumber?: string;
  };
  billingAddress?: {
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phoneNumber?: string;
  };
  paymentMethod: 'crypto' | 'fiat';
  paymentDetails?: {
    // For crypto payments
    tokenAddress?: string;
    tokenSymbol?: string;
    transactionHash?: string;
    escrowId?: string;
    // For fiat payments
    paymentIntentId?: string;
    stripeTransferGroup?: string;
    stripeSellerAccount?: string;
  };
  metadata?: {
    notes?: string;
    giftMessage?: string;
    expeditedShipping?: boolean;
    [key: string]: any;
  };
}

export interface OrderCreationResult {
  orderId: string;
  orderNumber: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  totalAmount: string;
  currency: string;
  estimatedDelivery: string;
  trackingInfo?: {
    carrier?: string;
    trackingNumber?: string;
    estimatedDelivery?: string;
  };
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  nextSteps: string[];
  notifications: {
    buyer: boolean;
    seller: boolean;
  };
}

export interface OrderValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface OrderSummary {
  orderId: string;
  orderNumber: string;
  listingTitle: string;
  sellerName: string;
  buyerAddress: string;
  quantity: number;
  unitPrice: string;
  totalAmount: string;
  currency: string;
  paymentMethod: 'crypto' | 'fiat';
  status: string;
  createdAt: Date;
  estimatedDelivery: string;
}

export class OrderCreationService {
  private databaseService: DatabaseService;
  private notificationService: NotificationService;
  private hybridPaymentOrchestrator: HybridPaymentOrchestrator;
  private listingService: ProductListingService;
  private sellerService: typeof sellerService;
  private shippingService: ShippingService;

  constructor() {
    this.databaseService = new DatabaseService();
    this.notificationService = new NotificationService();
    this.hybridPaymentOrchestrator = new HybridPaymentOrchestrator();
    this.listingService = new ProductListingService();
    this.sellerService = sellerService;
    this.shippingService = new ShippingService();
  }


  /**
   * Create a comprehensive order with full validation and processing
   */
  async createOrder(request: OrderCreationRequest): Promise<OrderCreationResult> {
    try {
      safeLogger.info(`🛒 Creating order for listing ${request.listingId}`);

      // 1. Validate the order request
      const validation = await this.validateOrderRequest(request);
      if (!validation.isValid) {
        throw new Error(`Order validation failed: ${validation.errors.join(', ')}`);
      }

      // 2. Get listing and seller information
      const listing = await this.listingService.getListingById(request.listingId);
      if (!listing) {
        throw new Error('Listing not found');
      }

      // 3. Calculate order totals
      const orderTotals = await this.calculateOrderTotals(listing, request.quantity, request.shippingAddress);

      // 4. Generate unique order number
      const orderNumber = await this.generateOrderNumber();

      // 5. Create order record
      const order = await this.databaseService.createOrder(
        request.listingId,
        request.buyerAddress,
        listing.sellerId, // sellerId
        orderTotals.total.toString(),
        'USDC', // paymentToken
        undefined, // escrowId
        undefined, // variantId
        undefined, // orderId
        orderTotals.tax.toString(),
        orderTotals.shippingCost.toString(),
        orderTotals.platformFee.toString(),
        orderTotals.taxBreakdown,
        request.shippingAddress,
        request.billingAddress || request.shippingAddress, // Fallback to shipping if billing not provided
        request.paymentMethod,
        request.paymentDetails
      );

      // 6. Send notifications
      const notifications = await this.sendOrderNotifications(order, listing, request);

      safeLogger.info(`✅ Order ${order.id} created successfully with number ${orderNumber}`);

      return {
        orderId: order.id.toString(),
        orderNumber,
        status: 'pending',
        totalAmount: orderTotals.total.toString(),
        currency: 'USDC',
        estimatedDelivery: '5-7 business days',
        paymentStatus: 'pending',
        nextSteps: this.generateNextSteps(request.paymentMethod, 'pending'),
        notifications
      };

    } catch (error) {
      safeLogger.error('❌ Order creation failed:', error);
      throw error;
    }
  }

  /**
   * Validate order request comprehensively
   */
  async validateOrderRequest(request: OrderCreationRequest): Promise<OrderValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Validate required fields
    if (!request.listingId) {
      errors.push('Listing ID is required');
    }

    if (!request.buyerAddress) {
      errors.push('Buyer address is required');
    }

    if (!request.quantity || request.quantity <= 0) {
      errors.push('Quantity must be a positive number');
    }

    if (!request.shippingAddress) {
      errors.push('Shipping address is required');
    }

    if (!request.paymentMethod) {
      errors.push('Payment method is required');
    }

    // Validate shipping address
    if (request.shippingAddress) {
      if (!request.shippingAddress.fullName) {
        errors.push('Shipping address full name is required');
      }
      if (!request.shippingAddress.addressLine1) {
        errors.push('Shipping address line 1 is required');
      }
      if (!request.shippingAddress.city) {
        errors.push('Shipping address city is required');
      }
      if (!request.shippingAddress.state) {
        errors.push('Shipping address state is required');
      }
      if (!request.shippingAddress.postalCode) {
        errors.push('Shipping address postal code is required');
      }
      if (!request.shippingAddress.country) {
        errors.push('Shipping address country is required');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Calculate order totals including shipping and taxes
   */
  private async calculateOrderTotals(listing: any, quantity: number, shippingAddress: any) {
    const price = parseFloat(listing.price || '0');
    const subtotal = price * quantity;
    const shippingCost = 5.99; // Fixed shipping cost for now, logic can be enhanced later

    // Calculate Platform Fee (15% - charged to SELLER, not included in buyer total)
    const platformFeeRate = 0.15;
    const platformFee = subtotal * platformFeeRate;

    // Use TaxCalculationService
    const taxResult = await taxCalculationService.calculateTax(
      [{
        id: listing.id,
        name: listing.title,
        price: price,
        quantity: quantity,
        isDigital: listing.itemType === 'digital',
        isTaxExempt: false
      }],
      {
        country: shippingAddress.country,
        state: shippingAddress.state,
        city: shippingAddress.city,
        postalCode: shippingAddress.postalCode,
        line1: shippingAddress.addressLine1
      },
      shippingCost
    );

    // Buyer total does NOT include platform fee - that's charged to seller
    const total = subtotal + shippingCost + taxResult.taxAmount;

    return {
      subtotal,
      shippingCost,
      tax: taxResult.taxAmount,
      platformFee, // Tracked for seller deduction, not charged to buyer
      total,
      taxBreakdown: taxResult.taxBreakdown
    };
  }

  /**
   * Generate unique order number
   */
  private async generateOrderNumber(): Promise<string> {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ORD-${timestamp}-${random}`;
  }

  /**
   * Send order notifications to buyer and seller
   */
  private async sendOrderNotifications(order: any, listing: any, request: OrderCreationRequest) {
    try {
      // Notify buyer
      await this.notificationService.sendOrderNotification(
        request.buyerAddress,
        'ORDER_CREATED',
        order.id.toString(),
        {
          orderId: order.id,
          listingTitle: listing.title,
          totalAmount: order.amount
        }
      );

      // Notify seller
      await this.notificationService.sendOrderNotification(
        listing.sellerId,
        'ORDER_RECEIVED',
        order.id.toString(),
        {
          orderId: order.id,
          buyer: request.buyerAddress,
          totalAmount: order.amount
        }
      );

      return {
        buyer: true,
        seller: true
      };
    } catch (error) {
      safeLogger.error('Failed to send order notifications:', error);
      return {
        buyer: false,
        seller: false
      };
    }
  }

  /**
   * Generate next steps based on payment method and order status
   */
  private generateNextSteps(paymentMethod: string, status: string): string[] {
    const steps: string[] = [];

    if (status === 'pending') {
      if (paymentMethod === 'crypto') {
        steps.push('Complete crypto payment');
        steps.push('Wait for payment confirmation');
      } else {
        steps.push('Complete fiat payment');
        steps.push('Wait for payment processing');
      }
      steps.push('Order confirmation');
    }

    return steps;
  }

  /**
   * Get order summary by ID
   */
  async getOrderSummary(orderId: string): Promise<OrderSummary | null> {
    try {
      const order = await this.databaseService.getOrderById(orderId);
      if (!order) {
        return null;
      }

      const listing = await this.listingService.getListingById(order.listingId.toString());
      if (!listing) {
        throw new Error('Listing not found for order');
      }

      return {
        orderId: order.id.toString(),
        orderNumber: `ORD-${order.id}`,
        listingTitle: listing.title || 'Untitled Listing',
        sellerName: listing.sellerId,
        buyerAddress: order.buyerId,
        quantity: order.quantity || 1,
        unitPrice: (parseFloat(order.amount) / (order.quantity || 1)).toString(),
        totalAmount: order.amount,
        currency: 'USDC',
        paymentMethod: 'crypto',
        status: 'pending',
        createdAt: new Date(),
        estimatedDelivery: '5-7 business days'
      };
    } catch (error) {
      safeLogger.error('Error getting order summary:', error);
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: string, message?: string, metadata?: any): Promise<boolean> {
    try {
      const order = await this.databaseService.getOrderById(orderId);
      if (!order) {
        return false;
      }

      await this.databaseService.updateOrder(orderId, {
        status
      });

      // Send notification about status update
      await this.notificationService.sendOrderNotification(
        order.buyerId,
        'ORDER_PROCESSING',
        orderId,
        {
          orderId,
          status,
          metadata
        }
      );

      return true;
    } catch (error) {
      safeLogger.error('Error updating order status:', error);
      return false;
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string, reason: string, cancelledBy: string): Promise<any> {
    try {
      const order = await this.databaseService.getOrderById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Update order status to cancelled
      await this.databaseService.updateOrder(orderId, {
        status: 'cancelled'
      });

      // Send cancellation notification
      await this.notificationService.sendOrderNotification(
        order.buyerId,
        'ORDER_CANCELLED',
        orderId,
        {
          orderId,
          reason,
          cancelledBy
        }
      );

      return {
        success: true,
        orderId,
        status: 'cancelled'
      };
    } catch (error) {
      safeLogger.error('Error cancelling order:', error);
      throw error;
    }
  }
}
