/**
 * EnhancedOrderTracking - Updated order tracking component that works with the enhanced backend
 * Features: Real-time order updates, payment method tracking, enhanced status display
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  CreditCard,
  Shield,
  Eye,
  RefreshCw,
  MapPin,
  Calendar,
  DollarSign
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';
import { useToast } from '@/context/ToastContext';
import { orderService } from '@/services/orderService';
import { marketplaceService } from '@/services/marketplaceService';
import { Order, OrderStatus } from '@/types/order';

interface EnhancedOrderTrackingProps {
  userType: 'buyer' | 'seller';
  className?: string;
}

export const EnhancedOrderTracking: React.FC<EnhancedOrderTrackingProps> = ({
  userType,
  className = ''
}) => {
  const { address } = useAccount();
  const { addToast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (address) {
      loadOrders();
    }
  }, [address, userType]);

  const loadOrders = async () => {
    if (!address) return;
    
    setLoading(true);
    try {
      const orders = await orderService.getOrdersByUser(address);
      // Filter orders based on user type (buyer/seller)
      const filteredOrders = userType === 'buyer' 
        ? orders.filter(order => order.seller.id !== address)
        : orders.filter(order => order.seller.id === address);
      setOrders(filteredOrders as any);
      
      if (filteredOrders.length === 0) {
        addToast(`No ${userType === 'buyer' ? 'orders' : 'orders to fulfill'} found`, 'info');
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      addToast('Failed to load orders', 'error');
      
      // Show sample data for demonstration
      setOrders([
        {
          id: 'order_001',
          listingId: 'listing_001',
          buyerAddress: userType === 'buyer' ? address : '0x1234567890123456789012345678901234567890',
          sellerAddress: userType === 'seller' ? address : '0x2345678901234567890123456789012345678901',
          product: {
            id: 'prod_001',
            title: 'Premium Wireless Headphones',
            description: 'High-quality noise-canceling wireless headphones',
            image: '/images/placeholder.jpg',
            category: 'electronics',
            quantity: 1,
            unitPrice: 299.99,
            totalPrice: 299.99
          },
          amount: '0.1245',
          paymentToken: 'ETH',
          paymentMethod: 'escrow',
          totalAmount: 299.99,
          currency: 'USD',
          status: 'PROCESSING',
          isEscrowProtected: true,
          trackingNumber: 'TRK123456789',
          trackingCarrier: 'FedEx',
          estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
          canConfirmDelivery: userType === 'buyer',
          canOpenDispute: userType === 'buyer',
          canCancel: false,
          canRefund: false,
          daysUntilAutoComplete: 5
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const refreshOrders = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
    addToast('Orders refreshed', 'success');
  };

  const getStatusIcon = (status: OrderStatus) => {
    const icons = {
      CREATED: Clock,
      PAYMENT_PENDING: Clock,
      PAID: CheckCircle,
      PROCESSING: Package,
      SHIPPED: Truck,
      DELIVERED: Package,
      COMPLETED: CheckCircle,
      DISPUTED: AlertTriangle,
      CANCELLED: AlertTriangle,
      REFUNDED: RefreshCw
    };
    return icons[status] || Clock;
  };

  const getStatusColor = (status: OrderStatus) => {
    const colors = {
      CREATED: 'text-yellow-400 bg-yellow-400/10',
      PAYMENT_PENDING: 'text-yellow-400 bg-yellow-400/10',
      PAID: 'text-blue-400 bg-blue-400/10',
      PROCESSING: 'text-purple-400 bg-purple-400/10',
      SHIPPED: 'text-indigo-400 bg-indigo-400/10',
      DELIVERED: 'text-green-400 bg-green-400/10',
      COMPLETED: 'text-green-500 bg-green-500/10',
      DISPUTED: 'text-red-400 bg-red-400/10',
      CANCELLED: 'text-gray-400 bg-gray-400/10',
      REFUNDED: 'text-orange-400 bg-orange-400/10'
    };
    return colors[status] || colors.CREATED;
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'escrow':
        return Shield;
      case 'crypto':
        return DollarSign;
      case 'fiat':
        return CreditCard;
      default:
        return DollarSign;
    }
  };

  const handleOrderAction = async (order: Order, action: string) => {
    try {
      switch (action) {
        case 'confirm_delivery':
          await orderService.confirmDelivery(order.id, {});
          addToast('Delivery confirmed', 'success');
          break;
        case 'track_package':
          try {
            const trackingInfo = await marketplaceService.getTrackingInfo(order.id);
            if (trackingInfo) {
              addToast(`Tracking: ${trackingInfo.trackingNumber} - ${trackingInfo.status}`, 'info');
            }
          } catch (error) {
            // Fallback to order's tracking number if service unavailable
            if (order.trackingNumber) {
              addToast(`Tracking: ${order.trackingNumber} - Status: ${order.status}`, 'info');
            } else {
              addToast('Tracking information not available yet', 'warning');
            }
          }
          break;
        case 'view_details':
          setSelectedOrder(order);
          break;
        default:
          addToast(`Action ${action} not implemented yet`, 'info');
      }
      
      // Refresh orders after action
      await loadOrders();
    } catch (error) {
      console.error('Error performing order action:', error);
      addToast(`Failed to ${action.replace('_', ' ')}`, 'error');
    }
  };

  const formatCurrency = (amount: number | string, currency: string = 'USD') => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (currency === 'ETH' || currency === 'USDC') {
      return `${numAmount.toFixed(4)} ${currency}`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(numAmount);
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <RefreshCw className="animate-spin text-blue-400 mr-2" size={24} />
        <span className="text-white">Loading orders...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {userType === 'buyer' ? 'My Orders' : 'Orders to Fulfill'}
          </h2>
          <p className="text-gray-400 mt-1">
            {orders.length} {orders.length === 1 ? 'order' : 'orders'} found
          </p>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={refreshOrders}
          disabled={refreshing}
        >
          <RefreshCw size={16} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <GlassPanel variant="primary" className="p-8 text-center">
          <Package size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            No orders found
          </h3>
          <p className="text-gray-400">
            {userType === 'buyer' 
              ? "You haven't placed any orders yet." 
              : "You don't have any orders to fulfill yet."
            }
          </p>
        </GlassPanel>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const StatusIcon = getStatusIcon(order.status);
            const statusColor = getStatusColor(order.status);
            const PaymentIcon = getPaymentMethodIcon(order.paymentMethod);

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group"
              >
                <GlassPanel variant="primary" className="p-6 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      {/* Product Image */}
                      <img
                        src={order.product.image || '/images/placeholder.jpg'}
                        alt={order.product.title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />

                      {/* Order Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-white truncate">
                            {order.product.title}
                          </h3>
                          
                          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${statusColor}`}>
                            <StatusIcon size={12} />
                            <span className="capitalize">{order.status.toLowerCase().replace('_', ' ')}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400">
                          <div>
                            <span className="font-medium">Order ID:</span> {order.id.slice(0, 8)}...
                          </div>
                          
                          <div>
                            <span className="font-medium">Amount:</span> {formatCurrency(order.totalAmount, order.currency)}
                          </div>
                          
                          <div>
                            <span className="font-medium">Date:</span> {new Date(order.createdAt).toLocaleDateString()}
                          </div>
                          
                          {order.trackingNumber && (
                            <div className="md:col-span-2">
                              <span className="font-medium">Tracking:</span> {order.trackingCarrier} - {order.trackingNumber}
                            </div>
                          )}
                          
                          {order.estimatedDelivery && (
                            <div>
                              <span className="font-medium">Est. Delivery:</span> {new Date(order.estimatedDelivery).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        {/* Payment Method & Escrow Status */}
                        <div className="mt-3 flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-1 text-gray-400">
                            <PaymentIcon size={16} />
                            <span>Payment: <span className="font-medium capitalize">{order.paymentMethod}</span></span>
                          </div>
                          
                          {order.isEscrowProtected && (
                            <div className="flex items-center text-blue-400">
                              <Shield size={16} className="mr-1" />
                              <span>Escrow Protected</span>
                            </div>
                          )}

                          {order.daysUntilAutoComplete && order.daysUntilAutoComplete > 0 && (
                            <div className="flex items-center text-yellow-400">
                              <Clock size={16} className="mr-1" />
                              <span>Auto-complete in {order.daysUntilAutoComplete} days</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col space-y-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOrderAction(order, 'view_details')}
                      >
                        <Eye size={16} className="mr-2" />
                        View Details
                      </Button>

                      {order.canConfirmDelivery && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleOrderAction(order, 'confirm_delivery')}
                        >
                          <CheckCircle size={16} className="mr-2" />
                          Confirm Delivery
                        </Button>
                      )}

                      {order.trackingNumber && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOrderAction(order, 'track_package')}
                        >
                          <MapPin size={16} className="mr-2" />
                          Track Package
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Progress Timeline */}
                  <div className="mt-6 pt-4 border-t border-gray-700">
                    <div className="flex items-center justify-between text-sm">
                      {['CREATED', 'PAID', 'SHIPPED', 'DELIVERED', 'COMPLETED'].map((step, index) => {
                        const isActive = order.status === step;
                        const statusOrder = ['CREATED', 'PAYMENT_PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'];
                        const currentIndex = statusOrder.indexOf(order.status);
                        const stepIndex = statusOrder.indexOf(step);
                        const isCompleted = currentIndex >= stepIndex;
                        
                        return (
                          <div key={step} className="flex items-center">
                            <div className={`w-3 h-3 rounded-full ${
                              isCompleted ? 'bg-green-500' : isActive ? 'bg-blue-500' : 'bg-gray-600'
                            }`} />
                            <span className={`ml-2 capitalize ${
                              isActive ? 'text-blue-400 font-medium' : 
                              isCompleted ? 'text-green-400' : 
                              'text-gray-500'
                            }`}>
                              {step.toLowerCase()}
                            </span>
                            {index < 4 && (
                              <div className={`w-8 h-0.5 mx-2 ${
                                isCompleted ? 'bg-green-500' : 'bg-gray-600'
                              }`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </GlassPanel>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Order Details</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedOrder(null)}
                >
                  Close
                </Button>
              </div>

              <div className="space-y-6">
                {/* Order Info */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Order Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Order ID:</span>
                      <p className="text-white font-medium">{selectedOrder.id}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Status:</span>
                      <p className="text-white font-medium capitalize">{selectedOrder.status.toLowerCase().replace('_', ' ')}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Payment Method:</span>
                      <p className="text-white font-medium capitalize">{selectedOrder.paymentMethod}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Total Amount:</span>
                      <p className="text-white font-medium">{formatCurrency(selectedOrder.totalAmount, selectedOrder.currency)}</p>
                    </div>
                  </div>
                </div>

                {/* Product Info */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Product</h3>
                  <div className="flex items-start space-x-4">
                    <img
                      src={selectedOrder.product.image || '/images/placeholder.jpg'}
                      alt={selectedOrder.product.title}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                    <div>
                      <h4 className="text-white font-medium">{selectedOrder.product.title}</h4>
                      <p className="text-gray-400 text-sm mt-1">{selectedOrder.product.description}</p>
                      <p className="text-white mt-2">
                        Quantity: {selectedOrder.product.quantity} × {formatCurrency(selectedOrder.product.unitPrice, selectedOrder.currency)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Shipping Info */}
                {selectedOrder.shippingAddress && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Shipping Address</h3>
                    <div className="text-sm text-gray-300">
                      <p>{selectedOrder.shippingAddress.name}</p>
                      <p>{selectedOrder.shippingAddress.street}</p>
                      <p>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.postalCode}</p>
                      <p>{selectedOrder.shippingAddress.country}</p>
                      {selectedOrder.shippingAddress.phone && <p>Phone: {selectedOrder.shippingAddress.phone}</p>}
                    </div>
                  </div>
                )}

                {/* Tracking Info */}
                {selectedOrder.trackingNumber && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Tracking Information</h3>
                    <div className="text-sm">
                      <p className="text-gray-400">Carrier: <span className="text-white">{selectedOrder.trackingCarrier}</span></p>
                      <p className="text-gray-400">Tracking Number: <span className="text-white">{selectedOrder.trackingNumber}</span></p>
                      {selectedOrder.estimatedDelivery && (
                        <p className="text-gray-400">Estimated Delivery: <span className="text-white">{new Date(selectedOrder.estimatedDelivery).toLocaleDateString()}</span></p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EnhancedOrderTracking;