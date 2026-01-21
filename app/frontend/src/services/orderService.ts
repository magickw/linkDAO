import {
  Order as MarketplaceOrder,
  OrderEvent,
  OrderStatus
} from '../types/order';
import { orderNotificationService, OrderNotificationData } from './orderNotificationService';

export interface OrderTrackingStatus {
  orderId: string;
  status: string;
  paymentPath: 'crypto' | 'fiat' | 'x402';
  progress: {
    step: number;
    totalSteps: number;
    currentStep: string;
    nextStep?: string;
  };
  actions: {
    canConfirmDelivery: boolean;
    canReleaseFunds: boolean;
    canDispute: boolean;
    canCancel: boolean;
  };
  timeline: OrderEvent[];
}

class OrderService {
  private apiBaseUrl: string;
  private authToken: string | null = null;

  constructor() {
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    this.checkAuthStatus();
  }

  // Check authentication status from localStorage or other sources
  private checkAuthStatus(): void {
    if (typeof window !== 'undefined') {
      let token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('auth_token') || localStorage.getItem('user_session') || sessionStorage.getItem('auth_token') || sessionStorage.getItem('token') || sessionStorage.getItem('authToken');

      // Also check for linkdao_session_data (wallet authentication)
      if (!token) {
        try {
          const sessionDataStr = localStorage.getItem('linkdao_session_data');
          if (sessionDataStr) {
            const sessionData = JSON.parse(sessionDataStr);
            token = sessionData.token || sessionData.accessToken || '';
          }
        } catch (error) {
          // Don't clear session data - let auth service handle session management
          console.warn('Failed to parse linkdao_session_data');
        }
      }

      this.authToken = token;
    }
  }

  // Get authentication headers
  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Get all orders for the current user
   */
  async getOrdersByUser(userAddress: string): Promise<MarketplaceOrder[]> {
    try {
      // Refresh auth token
      this.checkAuthStatus();

      const response = await fetch(`${this.apiBaseUrl}/api/orders/user/${userAddress}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch orders: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const orders = data.orders || [];
      
      // Transform backend orders to frontend format
      return orders.map((order: any) => this.transformOrder(order));
    } catch (error) {
      console.error('Error fetching orders:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch orders');
    }
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string): Promise<MarketplaceOrder | null> {
    try {
      // Refresh auth token
      this.checkAuthStatus();

      const response = await fetch(`${this.apiBaseUrl}/api/order-management/${orderId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch order: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      // Handle both wrapped ({ success: true, data: ... }) and unwrapped responses
      const order = responseData.data || responseData;
      return this.transformOrder(order);
    } catch (error) {
      console.error('Error fetching order:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch order');
    }
  }

  /**
   * Get order tracking status
   */
  async getOrderTrackingStatus(orderId: string): Promise<OrderTrackingStatus> {
    try {
      // Refresh auth token
      this.checkAuthStatus();

      // Get order details
      const orderResponse = await fetch(`${this.apiBaseUrl}/api/orders/${orderId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include'
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch order details: ${orderResponse.status} ${orderResponse.statusText}`);
      }

      const order = await orderResponse.json();

      // Get order history/timeline
      const historyResponse = await fetch(`${this.apiBaseUrl}/api/orders/${orderId}/history`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include'
      });

      if (!historyResponse.ok) {
        const errorData = await historyResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch order history: ${historyResponse.status} ${historyResponse.statusText}`);
      }

      const timeline = await historyResponse.json();

      // Transform to tracking status format
      return this.transformOrderToTrackingStatus(order, timeline);
    } catch (error) {
      console.error('Error fetching order tracking status:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch order tracking status');
    }
  }

  /**
   * Check if an order is eligible for return
   */
  async checkReturnEligibility(orderId: string): Promise<{ eligible: boolean; deadline?: Date; reason?: string }> {
    try {
      // Call the return refund service to check eligibility
      // This would typically be an API endpoint, but we'll simulate the logic here
      const order = await this.getOrderById(orderId);
      
      if (!order) {
        return { eligible: false, reason: 'Order not found' };
      }
      
      // Orders are eligible for return if they are delivered and within the return window
      if (order.status !== 'DELIVERED' && order.status !== 'COMPLETED') {
        return { eligible: false, reason: 'Order must be delivered before returning' };
      }
      
      // Check if within return window (typically 30 days)
      const deliveryDate = new Date(order.estimatedDelivery || order.createdAt);
      const deadline = new Date(deliveryDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
      const now = new Date();
      
      if (now > deadline) {
        return { eligible: false, reason: 'Return period has expired', deadline };
      }
      
      return { eligible: true, deadline };
    } catch (error) {
      console.error('Error checking return eligibility:', error);
      // Allow return by default if check fails
      return { eligible: true };
    }
  }

  /**
   * Confirm delivery for an order
   */
  async confirmDelivery(orderId: string, deliveryInfo: any): Promise<boolean> {
    try {
      // Refresh auth token
      this.checkAuthStatus();

      // Get order details first for notification
      const order = await this.getOrderById(orderId);

      const response = await fetch(`${this.apiBaseUrl}/api/orders/${orderId}/delivery/confirm`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ deliveryInfo })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to confirm delivery: ${response.status} ${response.statusText}`);
      }

      // Send delivery confirmation notification
      if (order) {
        try {
          const notificationData: OrderNotificationData = {
            orderId: order.id,
            orderNumber: order.id.slice(0, 8).toUpperCase(),
            buyerAddress: order.buyerAddress,
            sellerAddress: order.sellerAddress,
            productTitle: order.product?.title || 'Order',
            productImage: order.product?.image,
            amount: order.totalAmount || parseFloat(order.amount) || 0,
            currency: order.currency || 'USD',
          };

          await orderNotificationService.sendOrderNotification('delivery_confirmed', notificationData);
          await orderNotificationService.sendNotificationViaBackend('delivery_confirmed', notificationData);
        } catch (notificationError) {
          console.warn('Failed to send delivery confirmation notification:', notificationError);
        }
      }

      return true;
    } catch (error) {
      console.error('Error confirming delivery:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to confirm delivery');
    }
  }

  /**
   * Release funds for an order
   */
  async releaseFunds(orderId: string): Promise<boolean> {
    try {
      // Refresh auth token
      this.checkAuthStatus();

      // This would typically be a specific endpoint, but for now we'll simulate
      // by updating the order status to completed
      const response = await fetch(`${this.apiBaseUrl}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ status: 'COMPLETED' })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to release funds: ${response.status} ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Error releasing funds:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to release funds');
    }
  }

  /**
   * Cancel an order
   * Can only cancel orders in CREATED or PAID status
   */
  async cancelOrder(orderId: string, reason?: string): Promise<{ success: boolean; refundInitiated?: boolean; message?: string }> {
    try {
      // Refresh auth token
      this.checkAuthStatus();

      // First get order details to check if it can be cancelled
      const order = await this.getOrderById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Check if order can be cancelled
      if (!['CREATED', 'PENDING', 'PAID', 'PROCESSING'].includes(order.status)) {
        throw new Error(`Cannot cancel order in ${order.status} status. Only orders that are pending, paid, or processing can be cancelled.`);
      }

      const response = await fetch(`${this.apiBaseUrl}/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          reason: reason || 'Cancelled by buyer',
          initiatedBy: 'buyer'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to cancel order: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      // Send cancellation notification to both parties
      try {
        const notificationData: OrderNotificationData = {
          orderId: order.id,
          orderNumber: order.id.slice(0, 8).toUpperCase(),
          buyerAddress: order.buyerAddress,
          sellerAddress: order.sellerAddress,
          productTitle: order.product?.title || 'Order',
          productImage: order.product?.image,
          amount: order.totalAmount || parseFloat(order.amount) || 0,
          currency: order.currency || 'USD',
          cancellationReason: reason,
          refundAmount: result.refundInitiated ? (order.totalAmount || parseFloat(order.amount) || 0) : undefined,
        };

        await orderNotificationService.sendOrderNotification('order_cancelled', notificationData);
        await orderNotificationService.sendNotificationViaBackend('order_cancelled', notificationData);
      } catch (notificationError) {
        console.warn('Failed to send cancellation notification:', notificationError);
        // Don't fail the cancellation if notification fails
      }

      return {
        success: true,
        refundInitiated: result.refundInitiated || false,
        message: result.message || 'Order cancelled successfully'
      };
    } catch (error) {
      console.error('Error cancelling order:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to cancel order');
    }
  }

  /**
   * Open dispute for an order
   */
  async openDispute(orderId: string, reason: string): Promise<boolean> {
    try {
      // Refresh auth token
      this.checkAuthStatus();

      // Get order details first for notification
      const order = await this.getOrderById(orderId);

      const response = await fetch(`${this.apiBaseUrl}/api/orders/${orderId}/dispute`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          initiatorAddress: '', // This would be filled with the user's address
          reason
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to open dispute: ${response.status} ${response.statusText}`);
      }

      // Send dispute notification
      if (order) {
        try {
          const notificationData: OrderNotificationData = {
            orderId: order.id,
            orderNumber: order.id.slice(0, 8).toUpperCase(),
            buyerAddress: order.buyerAddress,
            sellerAddress: order.sellerAddress,
            productTitle: order.product?.title || 'Order',
            productImage: order.product?.image,
            amount: order.totalAmount || parseFloat(order.amount) || 0,
            currency: order.currency || 'USD',
          };

          await orderNotificationService.sendOrderNotification('order_disputed', notificationData);
          await orderNotificationService.sendNotificationViaBackend('order_disputed', notificationData);
        } catch (notificationError) {
          console.warn('Failed to send dispute notification:', notificationError);
        }
      }

      return true;
    } catch (error) {
      console.error('Error opening dispute:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to open dispute');
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: string, metadata?: any): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          status,
          metadata
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update order status: ${response.status} ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Error updating order status:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update order status');
    }
  }

  /**
   * Add tracking information to an order
   */
  async addTrackingInfo(orderId: string, trackingNumber: string, carrier: string): Promise<boolean> {
    try {
      // Refresh auth token
      this.checkAuthStatus();

      // Get order details first for notification
      const order = await this.getOrderById(orderId);

      const response = await fetch(`${this.apiBaseUrl}/api/orders/${orderId}/shipping`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          trackingNumber,
          carrier,
          service: 'Standard',
          fromAddress: {}, // This would be the seller's address
          packageInfo: {
            weight: 0,
            dimensions: { length: 0, width: 0, height: 0 },
            value: '0',
            description: 'Package'
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to add tracking information: ${response.status} ${response.statusText}`);
      }

      // Send shipping notification
      if (order) {
        try {
          const notificationData: OrderNotificationData = {
            orderId: order.id,
            orderNumber: order.id.slice(0, 8).toUpperCase(),
            buyerAddress: order.buyerAddress,
            sellerAddress: order.sellerAddress,
            productTitle: order.product?.title || 'Order',
            productImage: order.product?.image,
            amount: order.totalAmount || parseFloat(order.amount) || 0,
            currency: order.currency || 'USD',
            trackingNumber,
            trackingUrl: this.getTrackingUrl(carrier, trackingNumber),
          };

          await orderNotificationService.sendOrderNotification('order_shipped', notificationData);
          await orderNotificationService.sendNotificationViaBackend('order_shipped', notificationData);
        } catch (notificationError) {
          console.warn('Failed to send shipping notification:', notificationError);
        }
      }

      return true;
    } catch (error) {
      console.error('Error adding tracking information:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to add tracking information');
    }
  }

  /**
   * Get tracking URL for a carrier
   */
  private getTrackingUrl(carrier: string, trackingNumber: string): string {
    const carrierUrls: Record<string, string> = {
      'ups': `https://www.ups.com/track?tracknum=${trackingNumber}`,
      'fedex': `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
      'usps': `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
      'dhl': `https://www.dhl.com/us-en/home/tracking/tracking-parcel.html?submit=1&tracking-id=${trackingNumber}`,
    };

    const normalizedCarrier = carrier.toLowerCase().replace(/[^a-z]/g, '');
    return carrierUrls[normalizedCarrier] || '';
  }

  /**
   * Transform backend order to frontend format
   */
  private transformOrder(order: any): MarketplaceOrder {
    // This is a simplified transformation - in a real implementation,
    // you would map the actual backend order structure to the frontend format
    
    // Add return eligibility information
    const deliveryDate = order.status === 'SHIPPED' ? new Date(Date.now() + 86400000 * 3) : new Date(order.createdAt);
    const returnDeadline = new Date(deliveryDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const now = new Date();
    const returnEligible = (order.status === 'DELIVERED' || order.status === 'COMPLETED') && now < returnDeadline;
    
    return {
      id: order.id,
      listingId: order.listingId || order.id,
      buyerAddress: order.buyerAddress || order.buyerId || '',
      sellerAddress: order.sellerAddress || order.sellerId || '',
      escrowId: order.escrowId,
      amount: order.amount?.toString() || '0',
      paymentToken: order.paymentToken || 'ETH',
      paymentMethod: order.paymentToken && (order.paymentToken.includes('USDC') || order.paymentToken.includes('USDT')) ? 'crypto' : 'fiat',
      status: (order.status?.toUpperCase() as OrderStatus) || 'CREATED',
      createdAt: order.createdAt || new Date().toISOString(),
      shippingAddress: order.shippingAddress,
      trackingNumber: order.trackingNumber,
      trackingCarrier: order.trackingCarrier,
      estimatedDelivery: order.estimatedDelivery,
      actualDelivery: order.actualDelivery,
      deliveryConfirmation: order.deliveryConfirmation,
      totalAmount: parseFloat(order.amount) || 0,
      currency: order.currency || 'USD',
      orderNotes: order.orderNotes,
      orderMetadata: order.orderMetadata,
      disputeId: order.disputeId,
      canConfirmDelivery: ['SHIPPED'].includes(order.status),
      canOpenDispute: ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status),
      canCancel: ['CREATED', 'PENDING', 'PAID'].includes(order.status),
      canRefund: ['COMPLETED', 'DELIVERED'].includes(order.status),
      isEscrowProtected: !!order.escrowId,
      daysUntilAutoComplete: order.daysUntilAutoComplete || 7,
      product: {
        id: order.listingId || '1',
        title: order.title || order.product?.title || `Order #${order.id}`,
        description: order.description || order.product?.description || '',
        image: order.image || order.product?.image || '/api/placeholder/400/400',
        category: order.category || order.product?.category || 'General',
        quantity: order.quantity || order.product?.quantity || 1,
        unitPrice: order.unitPrice || order.product?.unitPrice || parseFloat(order.amount) || 0,
        totalPrice: order.totalPrice || order.product?.totalPrice || parseFloat(order.amount) || 0
      },
      timeline: order.timeline || [],
      trackingInfo: order.trackingInfo,
      updatedAt: order.updatedAt || order.createdAt || new Date().toISOString(),
      billingAddress: order.billingAddress,
      paymentConfirmationHash: order.paymentConfirmationHash,
      escrowContractAddress: order.escrowContractAddress
    };
  }

  /**
   * Get order analytics for a user
   */
  async getOrderAnalytics(userAddress: string, timeframe: 'week' | 'month' | 'year' = 'month'): Promise<any> {
    try {
      // Refresh auth token
      this.checkAuthStatus();

      const response = await fetch(`${this.apiBaseUrl}/api/orders/analytics/${userAddress}?timeframe=${timeframe}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch order analytics: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching order analytics:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch order analytics');
    }
  }

  /**
   * Transform order and timeline to tracking status format
   */
  private transformOrderToTrackingStatus(order: any, timeline: OrderEvent[]): OrderTrackingStatus {
    const statusSteps = [
      { status: 'CREATED', step: 1, label: 'Order Created' },
      { status: 'PAID', step: 2, label: 'Payment Received' },
      { status: 'PROCESSING', step: 3, label: 'Processing' },
      { status: 'SHIPPED', step: 4, label: 'Shipped' },
      { status: 'DELIVERED', step: 5, label: 'Delivered' },
      { status: 'COMPLETED', step: 6, label: 'Completed' }
    ];

    const currentStep = statusSteps.find(step => step.status === order.status) || statusSteps[0];
    
    return {
      orderId: order.id,
      status: order.status,
      paymentPath: order.paymentToken && (order.paymentToken.includes('USDC') || order.paymentToken.includes('USDT')) ? 'crypto' : 'fiat',
      progress: {
        step: currentStep.step,
        totalSteps: statusSteps.length,
        currentStep: currentStep.label,
        nextStep: currentStep.step < statusSteps.length ? statusSteps[currentStep.step].label : undefined
      },
      actions: {
        canConfirmDelivery: order.status === 'SHIPPED',
        canReleaseFunds: order.status === 'DELIVERED',
        canDispute: ['PAID', 'PROCESSING', 'SHIPPED'].includes(order.status),
        canCancel: ['CREATED', 'PAID'].includes(order.status)
      },
      timeline: timeline
    };
  }

  /**
   * Send notification for a newly created order
   */
  async sendOrderCreatedNotification(order: MarketplaceOrder): Promise<void> {
    try {
      const notificationData: OrderNotificationData = {
        orderId: order.id,
        orderNumber: order.id.slice(0, 8).toUpperCase(),
        buyerAddress: order.buyerAddress,
        sellerAddress: order.sellerAddress,
        productTitle: order.product?.title || 'Order',
        productImage: order.product?.image,
        amount: order.totalAmount || parseFloat(order.amount) || 0,
        currency: order.currency || 'USD',
      };

      await orderNotificationService.sendOrderNotification('order_created', notificationData);
      await orderNotificationService.sendNotificationViaBackend('order_created', notificationData);
    } catch (error) {
      console.warn('Failed to send order created notification:', error);
    }
  }

  /**
   * Send notification when order is marked as delivered
   */
  async sendOrderDeliveredNotification(orderId: string): Promise<void> {
    try {
      const order = await this.getOrderById(orderId);
      if (!order) return;

      const notificationData: OrderNotificationData = {
        orderId: order.id,
        orderNumber: order.id.slice(0, 8).toUpperCase(),
        buyerAddress: order.buyerAddress,
        sellerAddress: order.sellerAddress,
        productTitle: order.product?.title || 'Order',
        productImage: order.product?.image,
        amount: order.totalAmount || parseFloat(order.amount) || 0,
        currency: order.currency || 'USD',
      };

      await orderNotificationService.sendOrderNotification('order_delivered', notificationData);
      await orderNotificationService.sendNotificationViaBackend('order_delivered', notificationData);
    } catch (error) {
      console.warn('Failed to send order delivered notification:', error);
    }
  }

  /**
   * Send notification when payment is received
   */
  async sendPaymentReceivedNotification(order: MarketplaceOrder): Promise<void> {
    try {
      const notificationData: OrderNotificationData = {
        orderId: order.id,
        orderNumber: order.id.slice(0, 8).toUpperCase(),
        buyerAddress: order.buyerAddress,
        sellerAddress: order.sellerAddress,
        productTitle: order.product?.title || 'Order',
        productImage: order.product?.image,
        amount: order.totalAmount || parseFloat(order.amount) || 0,
        currency: order.currency || 'USD',
      };

      await orderNotificationService.sendOrderNotification('payment_received', notificationData);
      await orderNotificationService.sendNotificationViaBackend('payment_received', notificationData);
    } catch (error) {
      console.warn('Failed to send payment received notification:', error);
    }
  }
}

export const orderService = new OrderService();