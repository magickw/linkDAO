import { 
  Order as MarketplaceOrder, 
  OrderEvent, 
  OrderStatus 
} from '../types/order';

export interface OrderItem {
  id: string;
  title: string;
  image: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  status: OrderStatus;
  paymentMethod: 'crypto' | 'fiat';
  total: number;
  currency: string;
  items: OrderItem[];
  createdAt: Date;
  estimatedDelivery?: Date;
  trackingNumber?: string;
  seller: {
    id: string;
    name: string;
    avatar?: string;
  };
}

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
  async getOrdersByUser(userAddress: string): Promise<Order[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/orders/user/${userAddress}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const { orders } = await response.json();
      
      // Transform backend orders to frontend format
      return orders.map((order: any) => this.transformOrder(order));
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string): Promise<Order | null> {
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
        throw new Error('Failed to fetch order');
      }

      const order = await response.json();
      return this.transformOrder(order);
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
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
        throw new Error('Failed to fetch order details');
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
        throw new Error('Failed to fetch order history');
      }

      const timeline = await historyResponse.json();

      // Transform to tracking status format
      return this.transformOrderToTrackingStatus(order, timeline);
    } catch (error) {
      console.error('Error fetching order tracking status:', error);
      throw error;
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
        throw new Error('Failed to confirm delivery');
      }

      return true;
    } catch (error) {
      console.error('Error confirming delivery:', error);
      throw error;
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
        throw new Error('Failed to release funds');
      }

      return true;
    } catch (error) {
      console.error('Error releasing funds:', error);
      throw error;
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
        throw new Error('Failed to open dispute');
      }

      return true;
    } catch (error) {
      console.error('Error opening dispute:', error);
      throw error;
    }
  }

  /**
   * Transform backend order to frontend format
   */
  private transformOrder(order: any): Order {
    // This is a simplified transformation - in a real implementation,
    // you would map the actual backend order structure to the frontend format
    return {
      id: order.id,
      status: order.status as OrderStatus,
      paymentMethod: order.paymentToken && (order.paymentToken.includes('USDC') || order.paymentToken.includes('USDT')) ? 'crypto' : 'fiat',
      total: parseFloat(order.amount) || 0,
      currency: 'USD',
      items: [
        {
          id: order.listingId || '1',
          title: `Order #${order.id}`,
          image: '/api/placeholder/400/400',
          unitPrice: parseFloat(order.amount) || 0,
          quantity: 1,
          totalPrice: parseFloat(order.amount) || 0
        }
      ],
      createdAt: new Date(order.createdAt),
      estimatedDelivery: order.status === 'SHIPPED' ? new Date(Date.now() + 86400000 * 3) : undefined,
      trackingNumber: order.status === 'SHIPPED' ? `TRK${order.id}` : undefined,
      seller: {
        id: order.sellerId || 'seller_1',
        name: 'Marketplace Seller',
        avatar: '/api/placeholder/40/40'
      }
    };
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