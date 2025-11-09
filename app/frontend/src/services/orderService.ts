import { 
  Order as MarketplaceOrder, 
  OrderEvent, 
  OrderStatus,
  OrderItem
} from '../types/order';

export interface OrderTrackingStatus {
  orderId: string;
  status: string;
  paymentPath: 'crypto' | 'fiat';
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

  constructor() {
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }

  /**
   * Get all orders for the current user
   */
  async getOrdersByUser(userAddress: string): Promise<MarketplaceOrder[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/orders/user/${userAddress}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
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
      const response = await fetch(`${this.apiBaseUrl}/api/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch order: ${response.status} ${response.statusText}`);
      }

      const order = await response.json();
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
      // Get order details
      const orderResponse = await fetch(`${this.apiBaseUrl}/api/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
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
        headers: {
          'Content-Type': 'application/json',
        },
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
      const deliveryDate = order.estimatedDelivery || order.createdAt;
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
      const response = await fetch(`${this.apiBaseUrl}/api/orders/${orderId}/delivery/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ deliveryInfo })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to confirm delivery: ${response.status} ${response.statusText}`);
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
      // This would typically be a specific endpoint, but for now we'll simulate
      // by updating the order status to completed
      const response = await fetch(`${this.apiBaseUrl}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
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
   * Open dispute for an order
   */
  async openDispute(orderId: string, reason: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/orders/${orderId}/dispute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      const response = await fetch(`${this.apiBaseUrl}/api/orders/${orderId}/shipping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      status: order.status as OrderStatus,
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
      canOpenDispute: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status),
      canCancel: ['CREATED', 'PAID'].includes(order.status),
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
      escrowContractAddress: order.escrowContractAddress,
      preferences: order.preferences,
      privacySettings: order.privacySettings
    };
  }

  /**
   * Get order analytics for a user
   */
  async getOrderAnalytics(userAddress: string, timeframe: 'week' | 'month' | 'year' = 'month'): Promise<any> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/orders/analytics/${userAddress}?timeframe=${timeframe}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
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
}

export const orderService = new OrderService();