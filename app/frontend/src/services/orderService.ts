/**
 * Order Service - Comprehensive order tracking and management
 * Handles order history, status updates, search, and filtering
 */

import { Order, OrderStatus, OrderEvent, OrderFilters, OrderSearchQuery, PaginatedOrders } from '../types/order';

export class OrderService {
  private baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

  /**
   * Get order history for a user (buyer or seller)
   */
  async getOrderHistory(
    userAddress: string, 
    userType: 'buyer' | 'seller' = 'buyer',
    page: number = 1,
    limit: number = 20,
    filters?: OrderFilters
  ): Promise<PaginatedOrders> {
    const fallback: PaginatedOrders = {
      orders: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
    };

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        userType,
      });

      // Add filters to query params
      if (filters) {
        if (filters.status) params.append('status', filters.status);
        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.append('dateTo', filters.dateTo);
        if (filters.paymentMethod) params.append('paymentMethod', filters.paymentMethod);
        if (filters.minAmount) params.append('minAmount', filters.minAmount.toString());
        if (filters.maxAmount) params.append('maxAmount', filters.maxAmount.toString());
        if (filters.hasDispute !== undefined) params.append('hasDispute', filters.hasDispute.toString());
        if (filters.hasTracking !== undefined) params.append('hasTracking', filters.hasTracking.toString());
      }

      const response = await fetch(
        `${this.baseUrl}/api/orders/user/${userAddress}?${params.toString()}`
      );

      if (!response.ok) {
        console.warn(`Order history unavailable (${response.status}). Using fallback.`);
        return fallback;
      }

      const result = await response.json();
      
      if (result.success) {
        return {
          orders: result.data.orders || [],
          total: result.data.total || 0,
          page: result.data.page || page,
          limit: result.data.limit || limit,
          totalPages: result.data.totalPages || Math.ceil((result.data.total || 0) / limit),
        };
      } else {
        console.warn('Order history response not successful. Using fallback.');
        return fallback;
      }
    } catch (error) {
      console.error('Error fetching order history:', error);
      return fallback;
    }
  }

  /**
   * Get detailed order information by ID
   */
  async getOrderById(orderId: string): Promise<Order | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/orders/${orderId}`);
      
      if (!response.ok) {
        if (response.status === 404) return null;
        console.warn(`Order ${orderId} unavailable (${response.status}). Returning null.`);
        return null;
      }

      const result = await response.json().catch(() => ({ success: false }));
      
      if (result.success) {
        return result.data as Order;
      } else {
        console.warn('Order response not successful. Returning null.');
        return null;
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      // Gracefully degrade instead of throwing to avoid runtime overlays
      return null;
    }
  }

  /**
   * Get order timeline/events
   */
  async getOrderTimeline(orderId: string): Promise<OrderEvent[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/marketplace/orders/${orderId}/timeline`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch order timeline: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        return result.data || [];
      } else {
        throw new Error(result.message || 'Failed to fetch order timeline');
      }
    } catch (error) {
      console.error('Error fetching order timeline:', error);
      return [];
    }
  }

  /**
   * Search orders with advanced filtering
   */
  async searchOrders(
    userAddress: string,
    query: OrderSearchQuery,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedOrders> {
    try {
      const response = await fetch(`${this.baseUrl}/api/marketplace/orders/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress,
          query,
          page,
          limit,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to search orders: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        return {
          orders: result.data.orders || [],
          total: result.data.total || 0,
          page: result.data.page || page,
          limit: result.data.limit || limit,
          totalPages: result.data.totalPages || Math.ceil((result.data.total || 0) / limit),
        };
      } else {
        throw new Error(result.message || 'Failed to search orders');
      }
    } catch (error) {
      console.error('Error searching orders:', error);
      throw error;
    }
  }

  /**
   * Update order status (seller only)
   */
  async updateOrderStatus(
    orderId: string, 
    status: OrderStatus, 
    metadata?: any
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/marketplace/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, metadata }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update order status: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  /**
   * Add tracking information to order
   */
  async addTrackingInfo(
    orderId: string,
    trackingNumber: string,
    carrier: string,
    estimatedDelivery?: string
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/marketplace/orders/${orderId}/tracking`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trackingNumber,
          carrier,
          estimatedDelivery,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to add tracking info: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to add tracking info');
      }
    } catch (error) {
      console.error('Error adding tracking info:', error);
      throw error;
    }
  }

  /**
   * Confirm delivery (buyer only)
   */
  async confirmDelivery(orderId: string, deliveryInfo?: any): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/marketplace/orders/${orderId}/confirm-delivery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deliveryInfo }),
      });

      if (!response.ok) {
        throw new Error(`Failed to confirm delivery: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to confirm delivery');
      }
    } catch (error) {
      console.error('Error confirming delivery:', error);
      throw error;
    }
  }

  /**
   * Get order statistics for dashboard
   */
  async getOrderStatistics(
    userAddress: string,
    userType: 'buyer' | 'seller' = 'buyer',
    timeframe: 'week' | 'month' | 'year' = 'month'
  ): Promise<{
    totalOrders: number;
    completedOrders: number;
    pendingOrders: number;
    disputedOrders: number;
    totalValue: number;
    averageOrderValue: number;
    completionRate: number;
    statusBreakdown: Record<OrderStatus, number>;
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/marketplace/orders/statistics/${userAddress}?userType=${userType}&timeframe=${timeframe}`
      );

      if (!response.ok) {
        console.warn(`Order statistics unavailable (${response.status}). Using defaults.`);
        return {
          totalOrders: 0,
          completedOrders: 0,
          pendingOrders: 0,
          disputedOrders: 0,
          totalValue: 0,
          averageOrderValue: 0,
          completionRate: 0,
          statusBreakdown: {
            CREATED: 0,
            PAYMENT_PENDING: 0,
            PAID: 0,
            PROCESSING: 0,
            SHIPPED: 0,
            DELIVERED: 0,
            COMPLETED: 0,
            DISPUTED: 0,
            CANCELLED: 0,
            REFUNDED: 0,
          },
        };
      }

      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        console.warn('Order statistics response not successful. Using defaults.');
        return {
          totalOrders: 0,
          completedOrders: 0,
          pendingOrders: 0,
          disputedOrders: 0,
          totalValue: 0,
          averageOrderValue: 0,
          completionRate: 0,
          statusBreakdown: {
            CREATED: 0,
            PAYMENT_PENDING: 0,
            PAID: 0,
            PROCESSING: 0,
            SHIPPED: 0,
            DELIVERED: 0,
            COMPLETED: 0,
            DISPUTED: 0,
            CANCELLED: 0,
            REFUNDED: 0,
          },
        };
      }
    } catch (error) {
      console.error('Error fetching order statistics:', error);
      // Return default statistics on error
      return {
        totalOrders: 0,
        completedOrders: 0,
        pendingOrders: 0,
        disputedOrders: 0,
        totalValue: 0,
        averageOrderValue: 0,
        completionRate: 0,
        statusBreakdown: {
          CREATED: 0,
          PAYMENT_PENDING: 0,
          PAID: 0,
          PROCESSING: 0,
          SHIPPED: 0,
          DELIVERED: 0,
          COMPLETED: 0,
          DISPUTED: 0,
          CANCELLED: 0,
          REFUNDED: 0,
        },
      };
    }
  }

  /**
   * Get tracking information for an order
   */
  async getTrackingInfo(orderId: string): Promise<{
    trackingNumber?: string;
    carrier?: string;
    status?: string;
    estimatedDelivery?: string;
    actualDelivery?: string;
    events: Array<{
      timestamp: string;
      status: string;
      location: string;
      description: string;
    }>;
  } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/marketplace/orders/${orderId}/tracking`);
      
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to fetch tracking info: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to fetch tracking info');
      }
    } catch (error) {
      console.error('Error fetching tracking info:', error);
      return null;
    }
  }

  /**
   * Export order history to CSV
   */
  async exportOrderHistory(
    userAddress: string,
    userType: 'buyer' | 'seller' = 'buyer',
    filters?: OrderFilters
  ): Promise<Blob> {
    try {
      const params = new URLSearchParams({
        userType,
        format: 'csv',
      });

      // Add filters to query params
      if (filters) {
        if (filters.status) params.append('status', filters.status);
        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.append('dateTo', filters.dateTo);
        if (filters.paymentMethod) params.append('paymentMethod', filters.paymentMethod);
      }

      const response = await fetch(
        `${this.baseUrl}/api/marketplace/orders/export/${userAddress}?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Failed to export order history: ${response.status} ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Error exporting order history:', error);
      throw error;
    }
  }

  /**
   * Get order notifications
   */
  async getOrderNotifications(
    userAddress: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    notifications: Array<{
      id: string;
      orderId: string;
      type: string;
      message: string;
      metadata?: any;
      read: boolean;
      createdAt: string;
    }>;
    total: number;
    unreadCount: number;
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/marketplace/orders/notifications/${userAddress}?limit=${limit}&offset=${offset}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to fetch notifications');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return {
        notifications: [],
        total: 0,
        unreadCount: 0,
      };
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/marketplace/orders/notifications/${notificationId}/read`,
        { method: 'PUT' }
      );

      if (!response.ok) {
        throw new Error(`Failed to mark notification as read: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to mark notification as read');
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }
}

export const orderService = new OrderService();