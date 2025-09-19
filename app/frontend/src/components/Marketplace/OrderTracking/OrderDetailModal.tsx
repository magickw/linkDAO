/**
 * OrderDetailModal - Comprehensive order detail view with complete information
 * Features: Order timeline, shipping details, payment info, and actions
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  MapPin,
  CreditCard,
  Shield,
  Download,
  MessageSquare,
  Star,
  Copy,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { formatEther } from 'viem';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';
import { useToast } from '@/context/ToastContext';
import { orderService } from '@/services/orderService';
import { Order, OrderEvent, TrackingInfo } from '@/types/order';
import OrderStatusBadge from './OrderStatusBadge';
import OrderTimeline from './OrderTimeline';
import TrackingDisplay from './TrackingDisplay';

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
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [timeline, setTimeline] = useState<OrderEvent[]>([]);
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'tracking' | 'communication'>('details');

  useEffect(() => {
    loadOrderDetails();
  }, [order.id]);

  const loadOrderDetails = async () => {
    setLoading(true);
    try {
      // Load timeline
      const timelineData = await orderService.getOrderTimeline(order.id);
      setTimeline(timelineData);

      // Load tracking info if available
      if (order.trackingNumber) {
        const tracking = await orderService.getTrackingInfo(order.id);
        setTrackingInfo(tracking);
      }
    } catch (error) {
      console.error('Error loading order details:', error);
      addToast('Failed to load order details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelivery = async () => {
    try {
      await orderService.confirmDelivery(order.id);
      addToast('Delivery confirmed successfully', 'success');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error confirming delivery:', error);
      addToast('Failed to confirm delivery', 'error');
    }
  };

  const handleAddTracking = async () => {
    const trackingNumber = prompt('Enter tracking number:');
    const carrier = prompt('Enter carrier (e.g., FedEx, UPS, DHL):');
    
    if (trackingNumber && carrier) {
      try {
        await orderService.addTrackingInfo(order.id, trackingNumber, carrier);
        addToast('Tracking information added successfully', 'success');
        onUpdate();
        loadOrderDetails();
      } catch (error) {
        console.error('Error adding tracking info:', error);
        addToast('Failed to add tracking information', 'error');
      }
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      await orderService.updateOrderStatus(order.id, newStatus as any);
      addToast('Order status updated successfully', 'success');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating order status:', error);
      addToast('Failed to update order status', 'error');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    addToast(`${label} copied to clipboard`, 'success');
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

  const getAvailableActions = () => {
    const actions = [];

    if (userType === 'buyer') {
      if (order.status === 'DELIVERED' && !order.deliveryConfirmation) {
        actions.push({
          key: 'confirm_delivery',
          label: 'Confirm Delivery',
          icon: CheckCircle,
          variant: 'primary' as const,
          onClick: handleConfirmDelivery
        });
      }
      
      if (['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status) && !order.disputeId) {
        actions.push({
          key: 'open_dispute',
          label: 'Open Dispute',
          icon: AlertTriangle,
          variant: 'outline' as const,
          onClick: () => {
            // TODO: Open dispute modal
            addToast('Dispute system will be implemented', 'info');
          }
        });
      }
    }

    if (userType === 'seller') {
      if (order.status === 'PAID') {
        actions.push({
          key: 'mark_processing',
          label: 'Mark as Processing',
          icon: Package,
          variant: 'primary' as const,
          onClick: () => handleUpdateStatus('PROCESSING')
        });
      }
      
      if (order.status === 'PROCESSING' && !order.trackingNumber) {
        actions.push({
          key: 'add_tracking',
          label: 'Add Tracking',
          icon: Truck,
          variant: 'primary' as const,
          onClick: handleAddTracking
        });
      }
      
      if (order.status === 'PROCESSING' && order.trackingNumber) {
        actions.push({
          key: 'mark_shipped',
          label: 'Mark as Shipped',
          icon: Truck,
          variant: 'primary' as const,
          onClick: () => handleUpdateStatus('SHIPPED')
        });
      }
    }

    return actions;
  };

  const tabs = [
    { key: 'details', label: 'Order Details', icon: Package },
    { key: 'timeline', label: 'Timeline', icon: Clock },
    { key: 'tracking', label: 'Tracking', icon: Truck, disabled: !order.trackingNumber },
    { key: 'communication', label: 'Messages', icon: MessageSquare }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        <GlassPanel variant="primary" className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-4">
              <img
                src={order.product.image || '/images/placeholder.jpg'}
                alt={order.product.title}
                className="w-12 h-12 rounded-lg object-cover"
              />
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {order.product.title}
                </h3>
                <div className="flex items-center space-x-3 mt-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Order #{order.id.slice(0, 8)}...
                  </span>
                  <OrderStatusBadge status={order.status} />
                </div>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="small"
              onClick={onClose}
            >
              <X size={16} />
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => !tab.disabled && setActiveTab(tab.key as any)}
                  disabled={tab.disabled}
                  className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : tab.disabled
                      ? 'border-transparent text-gray-400 cursor-not-allowed'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon size={16} className="mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              {activeTab === 'details' && (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Order Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Order Information
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Order ID:</span>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono">{order.id}</span>
                            <button
                              onClick={() => copyToClipboard(order.id, 'Order ID')}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Date:</span>
                          <span>{new Date(order.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Status:</span>
                          <OrderStatusBadge status={order.status} />
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Payment Method:</span>
                          <span className="capitalize">{order.paymentMethod}</span>
                        </div>
                        {order.isEscrowProtected && (
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Escrow:</span>
                            <div className="flex items-center text-blue-400">
                              <Shield size={14} className="mr-1" />
                              <span>Protected</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Payment Details
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                          <span>{formatCurrency(order.product.totalPrice, order.currency)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Quantity:</span>
                          <span>{order.product.quantity}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-lg">
                          <span>Total:</span>
                          <span>{formatCurrency(order.totalAmount, order.currency)}</span>
                        </div>
                        {order.paymentConfirmationHash && (
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Tx Hash:</span>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-xs">{order.paymentConfirmationHash.slice(0, 10)}...</span>
                              <button
                                onClick={() => copyToClipboard(order.paymentConfirmationHash!, 'Transaction Hash')}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <Copy size={14} />
                              </button>
                              <a
                                href={`https://etherscan.io/tx/${order.paymentConfirmationHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-600"
                              >
                                <ExternalLink size={14} />
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  {order.shippingAddress && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <MapPin size={18} className="mr-2" />
                        Shipping Address
                      </h4>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-sm">
                        <div className="space-y-1">
                          <div className="font-medium">{order.shippingAddress.name}</div>
                          <div>{order.shippingAddress.street}</div>
                          <div>
                            {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                          </div>
                          <div>{order.shippingAddress.country}</div>
                          {order.shippingAddress.phone && (
                            <div className="text-gray-600 dark:text-gray-400">
                              Phone: {order.shippingAddress.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Product Details */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Product Details
                    </h4>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <div className="flex items-start space-x-4">
                        <img
                          src={order.product.image || '/images/placeholder.jpg'}
                          alt={order.product.title}
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <h5 className="font-semibold text-gray-900 dark:text-white">
                            {order.product.title}
                          </h5>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                            {order.product.description}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-sm">
                            <span>Category: {order.product.category}</span>
                            <span>Qty: {order.product.quantity}</span>
                            <span>Price: {formatCurrency(order.product.unitPrice, order.currency)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Order Notes */}
                  {order.orderNotes && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Order Notes
                      </h4>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-sm">
                        {order.orderNotes}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'timeline' && (
                <motion.div
                  key="timeline"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <OrderTimeline 
                    events={timeline} 
                    loading={loading}
                    onRefresh={loadOrderDetails}
                  />
                </motion.div>
              )}

              {activeTab === 'tracking' && (
                <motion.div
                  key="tracking"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <TrackingDisplay 
                    order={order}
                    trackingInfo={trackingInfo}
                    onRefresh={loadOrderDetails}
                  />
                </motion.div>
              )}

              {activeTab === 'communication' && (
                <motion.div
                  key="communication"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="text-center py-8"
                >
                  <MessageSquare size={48} className="mx-auto text-gray-400 mb-4" />
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Communication System
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    Direct messaging between buyers and sellers will be available soon.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="small"
                onClick={() => window.print()}
              >
                <Download size={16} className="mr-2" />
                Print Receipt
              </Button>
            </div>
            
            <div className="flex items-center space-x-3">
              {getAvailableActions().map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.key}
                    variant={action.variant}
                    size="small"
                    onClick={action.onClick}
                  >
                    <Icon size={16} className="mr-2" />
                    {action.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  );
};

export default OrderDetailModal;