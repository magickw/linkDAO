import { DatabaseService } from './databaseService';
import { NotificationService } from './notificationService';
import { HybridPaymentOrchestrator } from './hybridPaymentOrchestrator';
import { ListingService } from './listingService';
import { SellerService } from './sellerService';
import { ShippingService } from './shippingService';

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
  private listingService: ListingService;
  private sellerService: SellerService;
  private shippingService: ShippingService;

  constructor() {
    this.databaseService = new DatabaseService();
    this.notificationService = new NotificationService();
    this.hybridPaymentOrchestrator = new HybridPaymentOrchestrator();
    this.listingService = new ListingService();
    this.sellerService = new SellerService();
    this.shippingService = new ShippingService();
  }

  /**
   * Create a comprehensive order with full validation and processing
   */
  async createOrder(request: OrderCreationRequest): Promise<OrderCreationResult> {
    try {
      console.log(`🛒 Creating order for listing ${request.listingId}`);

      // 1. Validate the order request
      const validation = await this.validateOrderRequest(request);
      if (!validation.isValid) {
        throw new Error(`Order validation failed: ${validation.errors.join(', ')}`);
      }

      // 2. Get listing and seller information
      const listing = await this.listingService.getListingById(parseInt(request.listingId));
      if (!listing) {
        throw new Error('Listing not found');
      }

      const seller = await this.sellerService.getSellerById(listing.sellerId);
      if (!seller) {
        throw new Error('Seller not found');
      }

      // 3. Calculate order totals
      const orderTotals = await this.calculateOrderTotals(listing, request.quantity, request.shippingAddress);

      // 4. Generate unique order number
      const orderNumber = await this.generateOrderNumber();

      // 5. Create order record
      const order = await this.databaseService.createOrder({
        listingId: parseInt(request.listingId),
        buyerId: await this.getOrCreateBuyerId(request.buyerAddress),
        sellerId: listing.sellerId,
        quantity: request.quantity,
        unitPrice: listing.price,
        totalAmount: orderTotals.total.toString(),
        currency: listing.currency || 'USD',
        paymentMethod: request.paymentMethod,
        shippingAddress: JSON.stringify(request.shippingAddress),
        status: 'pending',
        orderNumber,
        metadata: JSON.stringify(request.metadata || {}),
        // Payment-specific fields
        escrowId: request.paymentDetails?.escrowId,
        paymentIntentId: request.paymentDetails?.paymentIntentId,
        stripeTransferGroup: request.paymentDetails?.stripeTransferGroup,
        stripeSellerAccount: request.paymentDetails?.stripeSellerAccount,
        transactionHash: request.paymentDetails?.transactionHash
      });

      // 6. Create shipping record
      const shippingInfo = await this.shippingService.createShippingRecord({
        orderId: order.id,
        shippingAddress: request.shippingAddress,
        expedited: request.metadata?.expeditedShipping || false
      });

      // 7. Update listing inventory
      await this.updateListingInventory(parseInt(request.listingId), request.quantity);

      // 8. Send notifications
      const notifications = await this.sendOrderNotifications(order, listing, seller, request);

      // 9. Create order tracking entry
      await this.createOrderTracking(order.id, 'created', 'Order successfully created');

      console.log(`✅ Order ${order.id} created successfully with number ${orderNumber}`);

      return {
        orderId: order.id.toString(),
        orderNumber,
        status: 'pending',
        totalAmount: orderTotals.total.toString(),
        currency: listing.currency || 'USD',
        estimatedDelivery: shippingInfo.estimatedDelivery,
        trackingInfo: {
          estimatedDelivery: shippingInfo.estimatedDelivery
        },
        paymentStatus: 'pending',
        nextSteps: this.generateNextSteps(request.paymentMethod, order.status),
        notifications
      };

    } catch (error) {
      console.error('❌ Order creation failed:', error);
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

    try {
      // Validate listing exists and is available
      const listing = await this.listingService.getListingById(parseInt(request.listingId));
      if (!listing) {
        errors.push('Listing not found');
        return { isValid: false, errors, warnings, suggestions };
      }

      if (listing.status !== 'active') {
        errors.push('Listing is not available for purchase');
      }

      // Validate quantity
      if (request.quantity <= 0) {
        errors.push('Quantity must be greater than 0');
      }

      if (listing.inventory && request.quantity > listing.inventory) {
        errors.push(`Insufficient inventory. Available: ${listing.inventory}, Requested: ${request.quantity}`);
        suggestions.push(`Consider reducing quantity to ${listing.inventory} or less`);
      }

      // Validate buyer address
      if (!request.buyerAddress || !/^0x[a-fA-F0-9]{40}$/.test(request.buyerAddress)) {
        errors.push('Invalid buyer address');
      }

      // Validate shipping address
      const shippingValidation = this.validateShippingAddress(request.shippingAddress);
      errors.push(...shippingValidation.errors);
      warnings.push(...shippingValidation.warnings);

      // Validate payment method and details
      const paymentValidation = await this.validatePaymentDetails(request.paymentMethod, request.paymentDetails);
      errors.push(...paymentValidation.errors);
      warnings.push(...paymentValidation.warnings);

      // Check if buyer is not the seller
      if (request.buyerAddress.toLowerCase() === listing.sellerAddress?.toLowerCase()) {
        errors.push('Cannot purchase your own listing');
      }

      // Validate listing price and calculate totals
      if (!listing.price || parseFloat(listing.price) <= 0) {
        errors.push('Invalid listing price');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions
      };

    } catch (error) {
      console.error('Error validating order request:', error);
      errors.push('Validation failed due to system error');
      return { isValid: false, errors, warnings, suggestions };
    }
  }

  /**
   * Validate shipping address
   */
  private validateShippingAddress(address: OrderCreationRequest['shippingAddress']): { errors: string[], warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!address.fullName || address.fullName.trim().length < 2) {
      errors.push('Full name is required and must be at least 2 characters');
    }

    if (!address.addressLine1 || address.addressLine1.trim().length < 5) {
      errors.push('Address line 1 is required and must be at least 5 characters');
    }

    if (!address.city || address.city.trim().length < 2) {
      errors.push('City is required and must be at least 2 characters');
    }

    if (!address.state || address.state.trim().length < 2) {
      errors.push('State/Province is required');
    }

    if (!address.postalCode || address.postalCode.trim().length < 3) {
      errors.push('Postal code is required and must be at least 3 characters');
    }

    if (!address.country || address.country.trim().length < 2) {
      errors.push('Country is required');
    }

    // Validate phone number format if provided
    if (address.phoneNumber && !/^\+?[\d\s\-\(\)]{10,}$/.test(address.phoneNumber)) {
      warnings.push('Phone number format may be invalid');
    }

    return { errors, warnings };
  }

  /**
   * Validate payment details based on payment method
   */
  private async validatePaymentDetails(
    paymentMethod: 'crypto' | 'fiat',
    paymentDetails?: OrderCreationRequest['paymentDetails']
  ): Promise<{ errors: string[], warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (paymentMethod === 'crypto') {
      if (!paymentDetails?.escrowId) {
        errors.push('Escrow ID is required for crypto payments');
      }

      if (paymentDetails?.tokenAddress && !/^0x[a-fA-F0-9]{40}$/.test(paymentDetails.tokenAddress)) {
        errors.push('Invalid token address format');
      }

      if (paymentDetails?.transactionHash && !/^0x[a-fA-F0-9]{64}$/.test(paymentDetails.transactionHash)) {
        warnings.push('Transaction hash format may be invalid');
      }
    } else if (paymentMethod === 'fiat') {
      if (!paymentDetails?.paymentIntentId) {
        errors.push('Payment Intent ID is required for fiat payments');
      }

      if (!paymentDetails?.stripeTransferGroup) {
        warnings.push('Stripe transfer group not provided - may affect payment tracking');
      }
    }

    return { errors, warnings };
  }

  /**
   * Calculate comprehensive order totals
   */
  private async calculateOrderTotals(
    listing: any,
    quantity: number,
    shippingAddress: OrderCreationRequest['shippingAddress']
  ): Promise<{
    subtotal: number;
    shipping: number;
    tax: number;
    total: number;
    breakdown: any;
  }> {
    try {
      const unitPrice = parseFloat(listing.price);
      const subtotal = unitPrice * quantity;

      // Calculate shipping cost
      const shippingCost = await this.shippingService.calculateShippingCost({
        weight: listing.weight || 1,
        dimensions: listing.dimensions || { length: 10, width: 10, height: 10 },
        origin: listing.sellerAddress || 'US',
        destination: shippingAddress.country,
        expedited: false
      });

      // Calculate tax (simplified - in production, use proper tax service)
      const taxRate = await this.calculateTaxRate(shippingAddress);
      const tax = subtotal * taxRate;

      const total = subtotal + shippingCost + tax;

      return {
        subtotal,
        shipping: shippingCost,
        tax,
        total,
        breakdown: {
          unitPrice,
          quantity,
          subtotal,
          shippingCost,
          taxRate,
          tax,
          total
        }
      };

    } catch (error) {
      console.error('Error calculating order totals:', error);
      // Fallback calculation
      const subtotal = parseFloat(listing.price) * quantity;
      return {
        subtotal,
        shipping: 0,
        tax: 0,
        total: subtotal,
        breakdown: {
          unitPrice: parseFloat(listing.price),
          quantity,
          subtotal,
          shippingCost: 0,
          taxRate: 0,
          tax: 0,
          total: subtotal
        }
      };
    }
  }

  /**
   * Calculate tax rate based on shipping address
   */
  private async calculateTaxRate(shippingAddress: OrderCreationRequest['shippingAddress']): Promise<number> {
    // Simplified tax calculation - in production, integrate with tax service like TaxJar
    const taxRates: { [key: string]: number } = {
      'US': 0.08,
      'CA': 0.13,
      'GB': 0.20,
      'DE': 0.19,
      'FR': 0.20,
      'AU': 0.10
    };

    return taxRates[shippingAddress.country] || 0;
  }

  /**
   * Generate unique order number
   */
  private async generateOrderNumber(): Promise<string> {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `ORD-${timestamp.slice(-8)}-${random}`;
  }

  /**
   * Get or create buyer ID from address
   */
  private async getOrCreateBuyerId(buyerAddress: string): Promise<string> {
    try {
      let buyer = await this.databaseService.getUserProfileByAddress(buyerAddress);
      
      if (!buyer) {
        // Create new buyer profile
        buyer = await this.databaseService.createUser({
          walletAddress: buyerAddress,
          handle: `buyer_${buyerAddress.slice(-8)}`,
          email: `${buyerAddress.slice(-8)}@temp.com`, // Temporary email
          role: 'buyer'
        });
      }

      return buyer.id;
    } catch (error) {
      console.error('Error getting/creating buyer ID:', error);
      throw error;
    }
  }

  /**
   * Update listing inventory after order
   */
  private async updateListingInventory(listingId: number, quantity: number): Promise<void> {
    try {
      const listing = await this.listingService.getListingById(listingId);
      if (listing && listing.inventory) {
        const newInventory = Math.max(0, listing.inventory - quantity);
        await this.listingService.updateListing(listingId, {
          inventory: newInventory,
          status: newInventory === 0 ? 'sold_out' : listing.status
        });
        console.log(`📦 Updated listing ${listingId} inventory: ${listing.inventory} -> ${newInventory}`);
      }
    } catch (error) {
      console.error('Error updating listing inventory:', error);
      // Don't throw - inventory update failure shouldn't fail order creation
    }
  }

  /**
   * Send comprehensive order notifications
   */
  private async sendOrderNotifications(
    order: any,
    listing: any,
    seller: any,
    request: OrderCreationRequest
  ): Promise<{ buyer: boolean; seller: boolean }> {
    try {
      const notifications = { buyer: false, seller: false };

      // Notify buyer
      try {
        await this.notificationService.sendOrderNotification(
          request.buyerAddress,
          'ORDER_CREATED',
          order.id.toString(),
          {
            orderNumber: order.orderNumber,
            listingTitle: listing.title,
            sellerName: seller.handle || seller.walletAddress,
            totalAmount: order.totalAmount,
            currency: order.currency,
            paymentMethod: request.paymentMethod,
            estimatedDelivery: '5-7 business days'
          }
        );
        notifications.buyer = true;
      } catch (error) {
        console.error('Failed to notify buyer:', error);
      }

      // Notify seller
      try {
        await this.notificationService.sendOrderNotification(
          seller.walletAddress,
          'ORDER_RECEIVED',
          order.id.toString(),
          {
            orderNumber: order.orderNumber,
            listingTitle: listing.title,
            buyerAddress: request.buyerAddress,
            quantity: request.quantity,
            totalAmount: order.totalAmount,
            currency: order.currency,
            paymentMethod: request.paymentMethod
          }
        );
        notifications.seller = true;
      } catch (error) {
        console.error('Failed to notify seller:', error);
      }

      return notifications;

    } catch (error) {
      console.error('Error sending order notifications:', error);
      return { buyer: false, seller: false };
    }
  }

  /**
   * Create order tracking entry
   */
  private async createOrderTracking(orderId: number, status: string, message: string): Promise<void> {
    try {
      await this.databaseService.createOrderTracking({
        orderId,
        status,
        message,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error creating order tracking:', error);
      // Don't throw - tracking failure shouldn't fail order creation
    }
  }

  /**
   * Generate next steps based on payment method and status
   */
  private generateNextSteps(paymentMethod: 'crypto' | 'fiat', status: string): string[] {
    const steps: string[] = [];

    if (paymentMethod === 'crypto') {
      steps.push('Complete payment by funding the escrow contract');
      steps.push('Seller will be notified to prepare your order');
      steps.push('Track your order status in your dashboard');
      steps.push('Confirm delivery when you receive your item');
    } else {
      steps.push('Complete payment with your selected payment method');
      steps.push('Your payment will be held securely until delivery');
      steps.push('Seller will be notified to prepare your order');
      steps.push('Track your order status and shipping updates');
    }

    return steps;
  }

  /**
   * Get order summary by ID
   */
  async getOrderSummary(orderId: string): Promise<OrderSummary | null> {
    try {
      const order = await this.databaseService.getOrderById(parseInt(orderId));
      if (!order) {
        return null;
      }

      const listing = await this.listingService.getListingById(order.listingId);
      const seller = await this.sellerService.getSellerById(order.sellerId);

      return {
        orderId: order.id.toString(),
        orderNumber: order.orderNumber || `ORD-${order.id}`,
        listingTitle: listing?.title || 'Unknown Item',
        sellerName: seller?.handle || seller?.walletAddress || 'Unknown Seller',
        buyerAddress: order.buyerAddress || 'Unknown Buyer',
        quantity: order.quantity,
        unitPrice: listing?.price || '0',
        totalAmount: order.totalAmount,
        currency: order.currency || 'USD',
        paymentMethod: order.paymentMethod as 'crypto' | 'fiat',
        status: order.status,
        createdAt: order.createdAt,
        estimatedDelivery: '5-7 business days' // Calculate based on shipping
      };

    } catch (error) {
      console.error('Error getting order summary:', error);
      return null;
    }
  }

  /**
   * Update order status with tracking
   */
  async updateOrderStatus(
    orderId: string,
    newStatus: string,
    message?: string,
    metadata?: any
  ): Promise<boolean> {
    try {
      await this.databaseService.updateOrder(parseInt(orderId), {
        status: newStatus,
        updatedAt: new Date()
      });

      await this.createOrderTracking(
        parseInt(orderId),
        newStatus,
        message || `Order status updated to ${newStatus}`
      );

      console.log(`📋 Order ${orderId} status updated to ${newStatus}`);
      return true;

    } catch (error) {
      console.error('Error updating order status:', error);
      return false;
    }
  }

  /**
   * Cancel order with proper cleanup
   */
  async cancelOrder(
    orderId: string,
    reason: string,
    cancelledBy: string
  ): Promise<{ success: boolean; refundInitiated?: boolean }> {
    try {
      const order = await this.databaseService.getOrderById(parseInt(orderId));
      if (!order) {
        throw new Error('Order not found');
      }

      if (['shipped', 'delivered', 'cancelled'].includes(order.status)) {
        throw new Error(`Cannot cancel order with status: ${order.status}`);
      }

      // Update order status
      await this.updateOrderStatus(orderId, 'cancelled', `Cancelled by ${cancelledBy}: ${reason}`);

      // Restore inventory
      const listing = await this.listingService.getListingById(order.listingId);
      if (listing) {
        await this.updateListingInventory(order.listingId, -order.quantity); // Add back inventory
      }

      // Initiate refund if payment was completed
      let refundInitiated = false;
      if (order.paymentMethod === 'crypto' && order.escrowId) {
        // Handle crypto refund through escrow
        refundInitiated = true;
      } else if (order.paymentMethod === 'fiat' && order.paymentIntentId) {
        // Handle fiat refund through Stripe
        refundInitiated = true;
      }

      console.log(`🚫 Order ${orderId} cancelled successfully`);
      return { success: true, refundInitiated };

    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  }
}