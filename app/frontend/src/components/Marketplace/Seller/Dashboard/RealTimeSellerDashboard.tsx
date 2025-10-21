import React, { useEffect, useState } from 'react';
import { useSellerRealTime } from '../../../../contexts/SellerWebSocketContext';

interface DashboardMetrics {
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  averageRating: number;
  responseTime: string;
  lastUpdated: Date;
}

interface RealTimeSellerDashboardProps {
  walletAddress: string;
  className?: string;
}

export const RealTimeSellerDashboard: React.FC<RealTimeSellerDashboardProps> = ({
  walletAddress,
  className = ''
}) => {
  const {
    isConnected,
    orders,
    analytics,
    notifications,
    unreadCount,
    onNewOrder,
    onOrderStatusChange,
    onPaymentReceived,
    onTierUpgrade,
    requestDataRefresh
  } = useSellerRealTime();

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    averageRating: 0,
    responseTime: '0s',
    lastUpdated: new Date()
  });

  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Update metrics when data changes
  useEffect(() => {
    if (orders.length > 0 || analytics) {
      const pendingOrders = orders.filter(order => order.status === 'pending').length;
      const totalRevenue = analytics?.revenue || 0;
      const averageRating = analytics?.rating || 0;

      setMetrics({
        totalOrders: orders.length,
        pendingOrders,
        totalRevenue,
        averageRating,
        responseTime: isConnected ? '<1s' : 'Offline',
        lastUpdated: new Date()
      });

      setIsLoading(false);
    }
  }, [orders, analytics, isConnected]);

  // Set up real-time event handlers
  useEffect(() => {
    const cleanupFunctions: (() => void)[] = [];

    // Handle new orders
    cleanupFunctions.push(
      onNewOrder((order: any) => {
        console.log('Real-time new order:', order);
        setRecentActivity(prev => [
          {
            id: `order_${order.id}`,
            type: 'order',
            title: 'New Order Received',
            description: `Order ${order.id} for ${order.amount} ${order.currency}`,
            timestamp: new Date(),
            priority: 'high'
          },
          ...prev.slice(0, 9) // Keep last 10 activities
        ]);
      })
    );

    // Handle order status changes
    cleanupFunctions.push(
      onOrderStatusChange((data: any) => {
        console.log('Real-time order status change:', data);
        setRecentActivity(prev => [
          {
            id: `status_${data.orderId}`,
            type: 'status',
            title: 'Order Status Updated',
            description: `Order ${data.orderId} changed to ${data.status}`,
            timestamp: new Date(),
            priority: 'medium'
          },
          ...prev.slice(0, 9)
        ]);
      })
    );

    // Handle payments
    cleanupFunctions.push(
      onPaymentReceived((payment: any) => {
        console.log('Real-time payment received:', payment);
        setRecentActivity(prev => [
          {
            id: `payment_${payment.orderId}`,
            type: 'payment',
            title: 'Payment Received',
            description: `${payment.amount} ${payment.currency} for order ${payment.orderId}`,
            timestamp: new Date(),
            priority: 'high'
          },
          ...prev.slice(0, 9)
        ]);
      })
    );

    // Handle tier upgrades
    cleanupFunctions.push(
      onTierUpgrade((tier: any) => {
        console.log('Real-time tier upgrade:', tier);
        setRecentActivity(prev => [
          {
            id: `tier_${Date.now()}`,
            type: 'tier',
            title: 'Tier Upgraded!',
            description: `Upgraded to ${tier.newTier} tier`,
            timestamp: new Date(),
            priority: 'high'
          },
          ...prev.slice(0, 9)
        ]);
      })
    );

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [onNewOrder, onOrderStatusChange, onPaymentReceived, onTierUpgrade]);

  const handleRefresh = () => {
    setIsLoading(true);
    requestDataRefresh(['orders', 'analytics', 'profile']);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order':
        return '📦';
      case 'payment':
        return '💰';
      case 'status':
        return '📋';
      case 'tier':
        return '🏆';
      default:
        return '📢';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Seller Dashboard</h1>
          <p className="text-gray-600">Real-time seller metrics and activity</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Connection status */}
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
          
          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalOrders}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <span className="text-2xl">📦</span>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm text-gray-500">
              {metrics.pendingOrders} pending
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(metrics.totalRevenue)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <span className="text-2xl">💰</span>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm text-green-600">
              +12% from last month
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Rating</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.averageRating.toFixed(1)}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <span className="text-2xl">⭐</span>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm text-gray-500">
              Based on {orders.length} orders
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Response Time</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.responseTime}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <span className="text-2xl">⚡</span>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm text-gray-500">
              Real-time updates
            </span>
          </div>
        </div>
      </div>

      {/* Recent Activity and Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <p className="text-sm text-gray-600">Live updates from your seller account</p>
          </div>
          <div className="p-6">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📊</div>
                <p className="text-gray-500">No recent activity</p>
                <p className="text-sm text-gray-400 mt-2">
                  Activity will appear here in real-time
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <span className="text-lg">{getActivityIcon(activity.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.title}
                      </p>
                      <p className="text-sm text-gray-600">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatTime(activity.timestamp)}
                      </p>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${
                      activity.priority === 'high' ? 'bg-red-500' :
                      activity.priority === 'medium' ? 'bg-yellow-500' : 'bg-gray-500'
                    }`} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Notifications Summary */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">Important seller notifications</p>
          </div>
          <div className="p-6">
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🔔</div>
                <p className="text-gray-500">No notifications</p>
                <p className="text-sm text-gray-400 mt-2">
                  You're all caught up!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {notifications.slice(0, 5).map((notification) => (
                  <div key={notification.id} className="flex items-start space-x-3">
                    <span className="text-lg">
                      {notification.type === 'order' ? '📦' :
                       notification.type === 'payment' ? '💰' :
                       notification.type === 'review' ? '⭐' :
                       notification.type === 'tier' ? '🏆' : '📢'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                ))}
                {notifications.length > 5 && (
                  <div className="text-center pt-4 border-t">
                    <p className="text-sm text-gray-500">
                      +{notifications.length - 5} more notifications
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {metrics.lastUpdated.toLocaleString()}
        {isConnected && (
          <span className="ml-2 text-green-600">• Live updates enabled</span>
        )}
      </div>
    </div>
  );
};

export default RealTimeSellerDashboard;