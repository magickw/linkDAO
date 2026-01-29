import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useSellerOrders, useSeller } from '@/hooks/useSeller';
import { Button, GlassPanel, LoadingSkeleton } from '@/design-system';
import Layout from '@/components/Layout';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';
import { Bell, Package, Truck, CheckCircle, XCircle, AlertTriangle, X, RefreshCw } from 'lucide-react';
import OrderProgressBar from '@/components/Marketplace/OrderTracking/OrderProgressBar';
import OrderStatusBadge from '@/components/Marketplace/OrderTracking/OrderStatusBadge';
import { toast } from 'react-hot-toast';

// Helper function to map order status to progress bar stage
const mapStatusToStage = (status: string): 'created' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' => {
  const statusLower = status.toLowerCase();
  switch (statusLower) {
    case 'created':
    case 'pending':
      return 'created';
    case 'paid':
    case 'payment_confirmed':
    case 'payment_received':
      return 'paid';
    case 'processing':
    case 'preparing':
      return 'processing';
    case 'shipped':
    case 'in_transit':
    case 'out_for_delivery':
      return 'shipped';
    case 'delivered':
    case 'completed':
      return 'delivered';
    case 'cancelled':
    case 'refunded':
      return 'cancelled';
    default:
      return 'created';
  }
};

export default function SellerOrdersPage() {
  const router = useRouter();
  const { profile } = useSeller();
  const { orders, loading, error, refetch } = useSellerOrders();
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [truckingOrder, setTruckingOrder] = useState<any>(null);

  // Subscribe to order notifications for sellers
  const { notifications, unreadCount, markAsRead, clearNotifications } = useOrderNotifications({
    autoSubscribe: true,
    filterByRole: 'seller',
    showToasts: true,
    maxNotifications: 20,
  });

  // Handle new order notifications - refresh the orders list
  useEffect(() => {
    if (notifications.length > 0) {
      const latestNotification = notifications[0];
      // Track new orders specifically
      if (latestNotification.event === 'order_created') {
        setNewOrderCount(prev => prev + 1);
      }
      // Add to recent notifications
      setRecentNotifications(prev => [latestNotification, ...prev].slice(0, 10));
      // Refresh orders list when new notifications arrive
      if (refetch) {
        refetch();
      }
    }
  }, [notifications, refetch]);

  // Clear new order count when user views orders
  const handleViewOrders = useCallback(() => {
    setNewOrderCount(0);
  }, []);

  // Get notification icon based on event type
  const getNotificationIcon = (event: string) => {
    switch (event) {
      case 'order_created':
        return <Package className="w-5 h-5 text-green-400" />;
      case 'order_shipped':
        return <Truck className="w-5 h-5 text-purple-400" />;
      case 'delivery_confirmed':
        return <CheckCircle className="w-5 h-5 text-blue-400" />;
      case 'order_cancelled':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'order_disputed':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      default:
        return <Bell className="w-5 h-5 text-gray-400" />;
    }
  };

  if (!profile) {
    return (
      <Layout title="Seller Orders - LinkDAO Marketplace" fullWidth={true}>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
          <GlassPanel className="max-w-md w-full text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Seller Profile Required</h1>
              <p className="text-gray-300 mb-6">
                You need to have a seller profile to view orders.
              </p>
            </div>
            <Button onClick={() => router.push('/marketplace/seller/onboarding')} variant="primary">
              Start Seller Onboarding
            </Button>
          </GlassPanel>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Seller Orders - LinkDAO Marketplace" fullWidth={true}>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => router.push('/marketplace/seller/dashboard')}
              className="flex items-center text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>

            <h1 className="text-2xl font-bold text-white">Seller Orders</h1>

            {/* Notification Bell with Badge */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                className="relative p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <Bell className="w-6 h-6 text-white" />
                {(unreadCount > 0 || newOrderCount > 0) && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                    {unreadCount + newOrderCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {showNotificationPanel && (
                <div className="absolute right-0 top-12 w-80 z-50">
                  <GlassPanel className="p-4 max-h-96 overflow-y-auto">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-semibold">Order Notifications</h3>
                      {recentNotifications.length > 0 && (
                        <button
                          onClick={() => {
                            clearNotifications();
                            setRecentNotifications([]);
                            setNewOrderCount(0);
                          }}
                          className="text-xs text-gray-400 hover:text-white"
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    {recentNotifications.length === 0 ? (
                      <div className="text-center py-6">
                        <Bell className="w-10 h-10 text-gray-500 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">No new notifications</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {recentNotifications.map((notif, index) => (
                          <div
                            key={`${notif.event}-${index}`}
                            className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                            onClick={() => {
                              router.push(`/marketplace/orders/${notif.data.orderId}`);
                              setShowNotificationPanel(false);
                            }}
                          >
                            {getNotificationIcon(notif.event)}
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium truncate">
                                {notif.data.productTitle}
                              </p>
                              <p className="text-gray-400 text-xs">
                                Order #{notif.data.orderNumber}
                              </p>
                              <p className="text-gray-500 text-xs mt-1">
                                {notif.event.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </p>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </GlassPanel>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <GlassPanel className="p-6">
              <LoadingSkeleton className="h-8 w-1/4 mb-6" />
              {[...Array(3)].map((_, i) => (
                <LoadingSkeleton key={i} className="h-24 mb-4" />
              ))}
            </GlassPanel>
          ) : error ? (
            <GlassPanel className="p-6 text-center">
              <div className="text-red-400 mb-4">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-lg font-semibold">Error loading orders</p>
                <p className="text-sm mt-2">{error}</p>
              </div>
              <Button onClick={() => window.location.reload()} variant="primary">
                Try Again
              </Button>
            </GlassPanel>
          ) : orders.length === 0 ? (
            <GlassPanel className="p-12 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-xl font-semibold text-white mb-2">No Orders Yet</h3>
              <p className="text-gray-300 mb-6">
                You don't have any orders yet. When customers purchase your listings, they'll appear here.
              </p>
              <Button
                onClick={() => router.push('/marketplace/seller/listings/create')}
                variant="primary"
              >
                Create Your First Listing
              </Button>
            </GlassPanel>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <GlassPanel className="p-4 text-center">
                  <p className="text-2xl font-bold text-white">{orders.filter(o => o.status === 'pending').length}</p>
                  <p className="text-gray-300 text-sm">Pending</p>
                </GlassPanel>
                <GlassPanel className="p-4 text-center">
                  <p className="text-2xl font-bold text-white">{orders.filter(o => o.status === 'processing').length}</p>
                  <p className="text-gray-300 text-sm">Processing</p>
                </GlassPanel>
                <GlassPanel className="p-4 text-center">
                  <p className="text-2xl font-bold text-white">{orders.filter(o => o.status === 'shipped').length}</p>
                  <p className="text-gray-300 text-sm">Shipped</p>
                </GlassPanel>
                <GlassPanel className="p-4 text-center">
                  <p className="text-2xl font-bold text-white">{orders.filter(o => o.status === 'delivered').length}</p>
                  <p className="text-gray-300 text-sm">Delivered</p>
                </GlassPanel>
              </div>

              <GlassPanel className="p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Recent Orders</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 text-gray-300 font-medium">Order</th>
                        <th className="text-left py-3 text-gray-300 font-medium">Item</th>
                        <th className="text-left py-3 text-gray-300 font-medium">Customer</th>
                        <th className="text-left py-3 text-gray-300 font-medium">Amount</th>
                        <th className="text-left py-3 text-gray-300 font-medium">Status</th>
                        <th className="text-left py-3 text-gray-300 font-medium">Progress</th>
                        <th className="text-left py-3 text-gray-300 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id} className="border-b border-gray-800 hover:bg-gray-800">
                          <td className="py-4">
                            <div>
                              <p className="text-white font-medium">#{order.id.substring(0, 8)}</p>
                              <p className="text-gray-400 text-sm">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </p>
                              {order.estimatedDelivery && (
                                <div className="flex items-center gap-1 mt-1 text-xs text-blue-400">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span>
                                    {new Date(order.estimatedDelivery).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-4">
                            <p className="text-white">{order.listingTitle}</p>
                            <p className="text-gray-400 text-sm">Qty: {order.quantity}</p>
                          </td>
                          <td className="py-4">
                            <p className="text-white">{order.buyerName}</p>
                            <p className="text-gray-400 text-sm truncate">{order.buyerAddress}</p>
                          </td>
                          <td className="py-4">
                            <p className="text-white">{order.totalAmount} {order.currency}</p>
                          </td>
                          <td className="py-4">
                            <OrderStatusBadge 
                              status={order.status} 
                              size="sm"
                            />
                          </td>
                          <td className="py-4">
                            <div className="w-48">
                              <OrderProgressBar 
                                currentStage={mapStatusToStage(order.status)}
                                estimatedDelivery={order.estimatedDelivery}
                              />
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                icon={<Truck size={16} />}
                                onClick={() => setTruckingOrder(order)}
                              >
                                Book Trucking
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/marketplace/orders/${order.id}`)}
                              >
                                Track Order
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassPanel>
            </div>
          )}
        </div>
      </div>

      {/* Trucking Quote Modal - Seller only */}
      {truckingOrder && (
        <SellerTruckingQuoteModal
          order={truckingOrder}
          onClose={() => setTruckingOrder(null)}
        />
      )}
    </Layout>
  );
}

// Seller Trucking Quote Modal Component
function SellerTruckingQuoteModal({ order, onClose }: { order: any; onClose: () => void }) {
  const [step, setStep] = useState<'details' | 'quotes' | 'success'>('details');
  const [loading, setLoading] = useState(false);
  const [rates, setRates] = useState<any[]>([]);
  const [selectedRate, setSelectedRate] = useState<any>(null);
  const [packageInfo, setPackageInfo] = useState({
    weight: '10',
    length: '12',
    width: '12',
    height: '12',
    description: 'Order items'
  });

  const fetchRates = async () => {
    try {
      setLoading(true);
      // Mock call - in real scenario, this would gather addresses from the order
      const rateData = {
        fromAddress: {
          name: 'Your Business',
          street: order.seller?.address?.street || '123 Seller St',
          city: order.seller?.address?.city || 'San Francisco',
          state: order.seller?.address?.state || 'CA',
          postalCode: order.seller?.address?.postalCode || '94105',
          country: order.seller?.address?.country || 'US',
          phone: '555-0100'
        },
        toAddress: {
          name: order.buyer?.displayName || 'Buyer',
          street: order.shippingAddress?.addressLine1 || '123 Buyer St',
          city: order.shippingAddress?.city || 'New York',
          state: order.shippingAddress?.state || 'NY',
          postalCode: order.shippingAddress?.postalCode || '10001',
          country: order.shippingAddress?.country || 'US',
          phone: order.shippingAddress?.phone || '555-0101'
        },
        packageInfo: {
          weight: parseFloat(packageInfo.weight),
          dimensions: {
            length: parseFloat(packageInfo.length),
            width: parseFloat(packageInfo.width),
            height: parseFloat(packageInfo.height)
          },
          value: order.total?.toString() || '100',
          description: packageInfo.description
        }
      };

      // Simulating API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      setRates([
        { carrier: 'FEDEX', service: 'Ground', price: 45.00, estimation: '3-5 days' },
        { carrier: 'UPS', service: 'Standard', price: 48.50, estimation: '3-4 days' },
        { carrier: 'DHL', service: 'Express', price: 85.00, estimation: '1-2 days' },
        { carrier: 'USPS', service: 'Priority', price: 25.00, estimation: '2-3 days' }
      ]);
      setStep('quotes');
    } catch (error) {
      toast.error('Failed to fetch rates');
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    if (!selectedRate) return;
    try {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Trucking booked successfully!');
      setStep('success');
    } catch (error) {
      toast.error('Booking failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <GlassPanel variant="modal" className="max-w-lg w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Truck className="text-purple-400" />
              Book Trucking
            </h3>
            <button onClick={onClose} className="text-white/40 hover:text-white">
              <X size={24} />
            </button>
          </div>

          {step === 'details' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Package Weight (lbs)</label>
                <input
                  type="number"
                  value={packageInfo.weight}
                  onChange={(e) => setPackageInfo({ ...packageInfo, weight: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Length</label>
                  <input
                    type="number"
                    value={packageInfo.length}
                    onChange={(e) => setPackageInfo({ ...packageInfo, length: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Width</label>
                  <input
                    type="number"
                    value={packageInfo.width}
                    onChange={(e) => setPackageInfo({ ...packageInfo, width: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Height</label>
                  <input
                    type="number"
                    value={packageInfo.height}
                    onChange={(e) => setPackageInfo({ ...packageInfo, height: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" fullWidth onClick={onClose}>Cancel</Button>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={fetchRates}
                  disabled={loading}
                  icon={loading ? <RefreshCw size={16} className="animate-spin" /> : undefined}
                >
                  {loading ? 'Getting Quotes...' : 'Get Quotes'}
                </Button>
              </div>
            </div>
          )}

          {step === 'quotes' && (
            <div className="space-y-4">
              <div className="space-y-2">
                {rates.map((rate) => (
                  <div
                    key={rate.carrier}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedRate?.carrier === rate.carrier
                        ? 'bg-blue-500/20 border-blue-500'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                    onClick={() => setSelectedRate(rate)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-white">{rate.carrier}</p>
                        <p className="text-sm text-white/60">{rate.service}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-white">${rate.price.toFixed(2)}</p>
                        <p className="text-sm text-white/60">{rate.estimation}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" fullWidth onClick={() => setStep('details')}>Back</Button>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={handleBook}
                  disabled={loading || !selectedRate}
                  icon={loading ? <RefreshCw size={16} className="animate-spin" /> : undefined}
                >
                  {loading ? 'Booking...' : 'Book Selected'}
                </Button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Booking Confirmed!</h3>
              <p className="text-white/60 mb-6">Your trucking request has been submitted. You will receive updates shortly.</p>
              <Button variant="primary" onClick={onClose}>Close</Button>
            </div>
          )}
        </div>
      </GlassPanel>
    </div>
  );
}