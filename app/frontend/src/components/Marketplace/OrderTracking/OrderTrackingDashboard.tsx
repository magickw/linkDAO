/**
 * OrderTrackingDashboard - Comprehensive order tracking system for buyers and sellers
 * Features: Real-time status updates, delivery confirmation, escrow management
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  MessageSquare,
  Eye,
  Star,
  Shield,
  RefreshCw
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';
import { useToast } from '@/context/ToastContext';
import DisputeResolutionPanel from '../DisputeResolution/DisputeResolutionPanel';

interface Order {
  id: string;
  listingId: string;
  buyerAddress: string;
  sellerAddress: string;
  amount: string;
  paymentToken: string;
  status: OrderStatus;
  escrowId?: string;
  shippingAddress?: ShippingAddress;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: string;
  deliveryConfirmed?: boolean;
  disputeId?: string;
  createdAt: string;
  updatedAt: string;
  product: {
    title: string;
    description: string;
    image: string;
    category: string;
  };
  timeline: OrderEvent[];
}

interface OrderEvent {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  metadata?: any;
}

interface ShippingAddress {
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'completed' | 'disputed' | 'cancelled';

interface OrderTrackingDashboardProps {
  userType: 'buyer' | 'seller';
  className?: string;
}

export const OrderTrackingDashboard: React.FC<OrderTrackingDashboardProps> = ({
  userType,
  className = ''
}) => {
  const { address } = useAccount();
  const { addToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<OrderStatus | 'all'>('all');
  const [showDisputePanel, setShowDisputePanel] = useState(false);

  // Load orders
  useEffect(() => {
    if (address) {
      loadOrders();
    }
  }, [address, userType]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/marketplace/orders/${userType}/${address}`);
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      addToast('Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    const statusColors = {
      pending: 'text-yellow-400 bg-yellow-400/10',
      paid: 'text-blue-400 bg-blue-400/10',
      shipped: 'text-purple-400 bg-purple-400/10',
      delivered: 'text-green-400 bg-green-400/10',
      completed: 'text-green-500 bg-green-500/10',
      disputed: 'text-red-400 bg-red-400/10',
      cancelled: 'text-gray-400 bg-gray-400/10'
    };
    return statusColors[status] || statusColors.pending;
  };

  const getStatusIcon = (status: OrderStatus) => {
    const icons = {
      pending: Clock,
      paid: CheckCircle,
      shipped: Truck,
      delivered: Package,
      completed: CheckCircle,
      disputed: AlertTriangle,
      cancelled: AlertTriangle
    };
    const Icon = icons[status] || Clock;
    return Icon;
  };

  const handleConfirmDelivery = async (orderId: string) => {
    try {
      const response = await fetch(`/api/marketplace/orders/${orderId}/confirm-delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        addToast('Delivery confirmed successfully', 'success');
        loadOrders();
      } else {
        throw new Error('Failed to confirm delivery');
      }
    } catch (error) {
      console.error('Error confirming delivery:', error);
      addToast('Failed to confirm delivery', 'error');
    }
  };

  const handleOpenDispute = async (orderId: string) => {
    setShowDisputePanel(true);
    // The dispute panel will handle the actual dispute creation
  };

  const handleUpdateShipping = async (orderId: string, trackingNumber: string, carrier: string) => {
    try {
      const response = await fetch(`/api/marketplace/orders/${orderId}/shipping`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingNumber, carrier })
      });
      
      if (response.ok) {
        addToast('Shipping information updated', 'success');
        loadOrders();
      } else {
        throw new Error('Failed to update shipping');
      }
    } catch (error) {
      console.error('Error updating shipping:', error);
      addToast('Failed to update shipping information', 'error');
    }
  };

  const filteredOrders = orders.filter(order => 
    activeFilter === 'all' || order.status === activeFilter
  );

  const getActionButtons = (order: Order) => {
    const buttons = [];

    if (userType === 'buyer') {
      if (order.status === 'delivered' && !order.deliveryConfirmed) {
        buttons.push(
          <Button
            key="confirm"
            size="small"
            variant="primary"
            onClick={() => handleConfirmDelivery(order.id)}
          >
            <CheckCircle size={16} className="mr-2" />
            Confirm Delivery
          </Button>
        );
      }
      
      if (['paid', 'shipped', 'delivered'].includes(order.status) && !order.disputeId) {
        buttons.push(
          <Button
            key="dispute"
            size="small"
            variant="outline"
            onClick={() => handleOpenDispute(order.id)}
          >
            <AlertTriangle size={16} className="mr-2" />
            Open Dispute
          </Button>
        );
      }
    }

    if (userType === 'seller') {
      if (order.status === 'paid') {
        buttons.push(
          <Button
            key="ship"
            size="small"
            variant="primary"
            onClick={() => {
              // TODO: Open shipping modal
              const trackingNumber = prompt('Enter tracking number:');
              const carrier = prompt('Enter carrier:');
              if (trackingNumber && carrier) {
                handleUpdateShipping(order.id, trackingNumber, carrier);
              }
            }}
          >
            <Truck size={16} className="mr-2" />
            Add Shipping
          </Button>
        );
      }
    }

    return buttons;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="animate-spin text-blue-400" size={24} />
        <span className="ml-2 text-white">Loading orders...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {userType === 'buyer' ? 'My Orders' : 'Orders to Fulfill'}
        </h2>
        <Button
          variant="outline"
          size="small"
          onClick={loadOrders}
        >
          <RefreshCw size={16} className="mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {['all', 'pending', 'paid', 'shipped', 'delivered', 'completed', 'disputed'].map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter as OrderStatus | 'all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeFilter === filter
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
            {filter !== 'all' && (
              <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {orders.filter(o => o.status === filter).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <GlassPanel variant="primary" className="p-8 text-center">
          <Package size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No orders found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {activeFilter === 'all' 
              ? `You don't have any ${userType === 'buyer' ? 'orders' : 'orders to fulfill'} yet.`
              : `No ${activeFilter} orders found.`
            }
          </p>
        </GlassPanel>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const StatusIcon = getStatusIcon(order.status);
            const statusColor = getStatusColor(order.status);

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group"
              >
                <GlassPanel 
                  variant="primary" 
                  className="p-6 hover:shadow-lg transition-all duration-300"
                >
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
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                            {order.product.title}
                          </h3>
                          <div className={`flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                            <StatusIcon size={14} className="mr-1" />
                            {order.status.toUpperCase()}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div>
                            <span className="font-medium">Order ID:</span> {order.id.slice(0, 8)}...
                          </div>
                          <div>
                            <span className="font-medium">Amount:</span> {formatEther(BigInt(order.amount))} ETH
                          </div>
                          <div>
                            <span className="font-medium">Date:</span> {new Date(order.createdAt).toLocaleDateString()}
                          </div>
                          
                          {order.trackingNumber && (
                            <div className="md:col-span-2">
                              <span className="font-medium">Tracking:</span> {order.carrier} - {order.trackingNumber}
                            </div>
                          )}
                          
                          {order.estimatedDelivery && (
                            <div>
                              <span className="font-medium">Est. Delivery:</span> {new Date(order.estimatedDelivery).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        {/* Escrow Status */}
                        {order.escrowId && (
                          <div className="mt-3 flex items-center text-sm">
                            <Shield size={16} className="text-blue-400 mr-2" />
                            <span className="text-gray-600 dark:text-gray-400">
                              Protected by Escrow #{order.escrowId}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col space-y-2">
                      {getActionButtons(order)}
                      <Button
                        size="small"
                        variant="outline"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <Eye size={16} className="mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>

                  {/* Progress Timeline */}
                  <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between text-sm">
                      {['pending', 'paid', 'shipped', 'delivered', 'completed'].map((step, index) => {
                        const isActive = order.status === step;
                        const isCompleted = ['paid', 'shipped', 'delivered', 'completed'].indexOf(order.status) >= index;
                        
                        return (
                          <div key={step} className="flex items-center">
                            <div className={`w-3 h-3 rounded-full ${
                              isCompleted ? 'bg-green-500' : isActive ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                            }`} />
                            <span className={`ml-2 capitalize ${
                              isActive ? 'text-blue-600 dark:text-blue-400 font-medium' : 
                              isCompleted ? 'text-green-600 dark:text-green-400' : 
                              'text-gray-500 dark:text-gray-400'
                            }`}>
                              {step}
                            </span>
                            {index < 4 && (
                              <div className={`w-8 h-0.5 mx-2 ${
                                isCompleted ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
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
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          userType={userType}
          onClose={() => setSelectedOrder(null)}
          onUpdate={loadOrders}
        />
      )}

      {/* Dispute Resolution Panel */}
      {showDisputePanel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <GlassPanel variant="primary" className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Dispute Resolution System
                </h3>
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => setShowDisputePanel(false)}
                >
                  ✕
                </Button>
              </div>
              
              <DisputeResolutionPanel
                userRole={userType === 'buyer' ? 'buyer' : 'seller'}
                className="text-gray-900 dark:text-white"
              />
            </GlassPanel>
          </div>
        </div>
      )}
    </div>
  );
};

// Order Detail Modal Component
interface OrderDetailModalProps {
  order: Order;
  userType: 'buyer' | 'seller';
  onClose: () => void;
  onUpdate: () => void;
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ 
  order, 
  userType, 
  onClose, 
  onUpdate 
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <GlassPanel variant="primary" className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Order Details
            </h3>
            <Button
              variant="outline"
              size="small"
              onClick={onClose}
            >
              ✕
            </Button>
          </div>

          {/* Order Timeline */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Order Timeline
            </h4>
            
            {order.timeline?.map((event, index) => (
              <div key={event.id} className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-gray-900 dark:text-white font-medium">
                    {event.description}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(event.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Shipping Address */}
          {order.shippingAddress && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Shipping Address
              </h4>
              <div className="text-gray-600 dark:text-gray-400">
                <p>{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
                <p>{order.shippingAddress.address1}</p>
                {order.shippingAddress.address2 && <p>{order.shippingAddress.address2}</p>}
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                </p>
                <p>{order.shippingAddress.country}</p>
              </div>
            </div>
          )}
        </GlassPanel>
      </motion.div>
    </div>
  );
};

export default OrderTrackingDashboard;