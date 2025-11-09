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
import { useAccount } from 'wagmi';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';
import { useToast } from '@/context/ToastContext';
import { orderService } from '@/services/orderService';
import { marketplaceService } from '@/services/marketplaceService';
import { Order, OrderEvent, TrackingInfo } from '@/types/order';
import useOrderUpdates from '@/hooks/useOrderUpdates';
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
  const { address: walletAddress } = useAccount();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [timeline, setTimeline] = useState<OrderEvent[]>([]);
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'tracking' | 'communication'>('details');
  const { subscribeToOrder, unsubscribeFromOrder, orderUpdates, isSubscribed } = useOrderUpdates();
  const [currentOrder, setCurrentOrder] = useState<Order>(order);

  useEffect(() => {
    // Subscribe to order updates when component mounts
    subscribeToOrder(order.id);
    
    // Load initial order details
    loadOrderDetails();
    
    // Cleanup subscription when component unmounts
    return () => {
      unsubscribeFromOrder(order.id);
    };
  }, [order.id]);

  // Listen for order updates
  useEffect(() => {
    if (orderUpdates[order.id]) {
      const updateEvent = orderUpdates[order.id];
      
      // Update the current order if status has changed
      if (updateEvent.type === 'order_status_changed' && updateEvent.data?.order) {
        setCurrentOrder(prevOrder => ({
          ...prevOrder,
          ...updateEvent.data.order
        }));
        addToast(`Order status updated to ${updateEvent.data.order.status}`, 'info');
      } 
      else if (updateEvent.type === 'tracking_info_added' && updateEvent.data?.trackingInfo) {
        setCurrentOrder(prevOrder => ({
          ...prevOrder,
          trackingNumber: updateEvent.data.trackingInfo.trackingNumber,
          trackingCarrier: updateEvent.data.trackingInfo.carrier
        }));
        addToast('Tracking information updated', 'info');
      }
      else if (updateEvent.type === 'order_delivered') {
        addToast('Order has been delivered', 'success');
      }
      else if (updateEvent.type === 'order_completed') {
        addToast('Order has been completed', 'success');
      }
      
      // Reload order details to get the latest timeline
      loadOrderDetails();
    }
  }, [orderUpdates, order.id]);

  const loadOrderDetails = async () => {
    setLoading(true);
    try {
      // Load timeline and tracking info using getOrderTrackingStatus
      const trackingStatus = await orderService.getOrderTrackingStatus(order.id);
      setTimeline(trackingStatus.timeline);

      // Set tracking info if available
      if (order.trackingNumber) {
        const tracking = {
          trackingNumber: order.trackingNumber,
          carrier: order.trackingCarrier,
          status: order.status,
          estimatedDelivery: order.estimatedDelivery,
          events: trackingStatus.timeline
            .filter(event => event.eventType === 'tracking')
            .map(event => ({
              timestamp: event.timestamp,
              status: event.eventType,
              location: '',
              description: event.description
            }))
        };
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
      await orderService.confirmDelivery(currentOrder.id, {});
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
        await orderService.addTrackingInfo(currentOrder.id, trackingNumber, carrier);
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
      await orderService.updateOrderStatus(currentOrder.id, newStatus);
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
      if (currentOrder.status === 'DELIVERED' && !currentOrder.deliveryConfirmation) {
        actions.push({
          key: 'confirm_delivery',
          label: 'Confirm Delivery',
          icon: CheckCircle,
          variant: 'primary' as const,
          onClick: handleConfirmDelivery
        });
      }
      
      if (['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(currentOrder.status) && !currentOrder.disputeId) {
        actions.push({
          key: 'open_dispute',
          label: 'Open Dispute',
          icon: AlertTriangle,
          variant: 'outline' as const,
          onClick: async () => {
            const reason = prompt('Please describe the issue with this order:');
            if (!reason) return;
            
            try {
              // If order has escrow, open dispute on escrow
              if (currentOrder.escrowId) {
                await marketplaceService.openDispute(currentOrder.escrowId, walletAddress!, reason);
                addToast('Dispute opened successfully', 'success');
              } else {
                addToast('This order does not have escrow protection', 'warning');
              }
            } catch (error) {
              console.error('Error opening dispute:', error);
              addToast('Failed to open dispute', 'error');
            }
          }
        });
      }
    }

    if (userType === 'seller') {
      if (currentOrder.status === 'PAID') {
        actions.push({
          key: 'mark_processing',
          label: 'Mark as Processing',
          icon: Package,
          variant: 'primary' as const,
          onClick: () => handleUpdateStatus('PROCESSING')
        });
      }
      
      if (currentOrder.status === 'PROCESSING' && !currentOrder.trackingNumber) {
        actions.push({
          key: 'add_tracking',
          label: 'Add Tracking',
          icon: Truck,
          variant: 'primary' as const,
          onClick: handleAddTracking
        });
      }
      
      if (currentOrder.status === 'PROCESSING' && currentOrder.trackingNumber) {
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
    { key: 'tracking', label: 'Tracking', icon: Truck, disabled: !currentOrder.trackingNumber },
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
                  src={currentOrder.product.image || '/images/placeholder.jpg'}
                  alt={currentOrder.product.title}
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {currentOrder.product.title}
                  </h3>
                  <div className="flex items-center space-x-3 mt-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Order #{currentOrder.id.slice(0, 8)}...
                    </span>
                    <OrderStatusBadge status={currentOrder.status} />
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
                        <span className="font-mono">{currentOrder.id}</span>
                        <button
                          onClick={() => copyToClipboard(currentOrder.id, 'Order ID')}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Date:</span>
                      <span>{new Date(currentOrder.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Status:</span>
                      <OrderStatusBadge status={currentOrder.status} />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Payment Method:</span>
                      <span className="capitalize">{currentOrder.paymentMethod}</span>
                    </div>
                    {currentOrder.isEscrowProtected && (
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
                          <span>{formatCurrency(currentOrder.product.totalPrice, currentOrder.currency)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Quantity:</span>
                          <span>{currentOrder.product.quantity}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-lg">
                          <span>Total:</span>
                          <span>{formatCurrency(currentOrder.totalAmount, currentOrder.currency)}</span>
                        </div>
                        {currentOrder.paymentConfirmationHash && (
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Tx Hash:</span>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-xs">{currentOrder.paymentConfirmationHash.slice(0, 10)}...</span>
                              <button
                                onClick={() => copyToClipboard(currentOrder.paymentConfirmationHash!, 'Transaction Hash')}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <Copy size={14} />
                              </button>
                              <a
                                href={`https://etherscan.io/tx/${currentOrder.paymentConfirmationHash}`}
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
                  {currentOrder.shippingAddress && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <MapPin size={18} className="mr-2" />
                        Shipping Address
                      </h4>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-sm">
                        <div className="space-y-1">
                          <div className="font-medium">{currentOrder.shippingAddress.name}</div>
                          <div>{currentOrder.shippingAddress.street}</div>
                          <div>
                            {currentOrder.shippingAddress.city}, {currentOrder.shippingAddress.state} {currentOrder.shippingAddress.postalCode}
                          </div>
                          <div>{currentOrder.shippingAddress.country}</div>
                          {currentOrder.shippingAddress.phone && (
                            <div className="text-gray-600 dark:text-gray-400">
                              Phone: {currentOrder.shippingAddress.phone}
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
                          src={currentOrder.product.image || '/images/placeholder.jpg'}
                          alt={currentOrder.product.title}
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <h5 className="font-semibold text-gray-900 dark:text-white">
                            {currentOrder.product.title}
                          </h5>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                            {currentOrder.product.description}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-sm">
                            <span>Category: {currentOrder.product.category}</span>
                            <span>Qty: {currentOrder.product.quantity}</span>
                            <span>Price: {formatCurrency(currentOrder.product.unitPrice, currentOrder.currency)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Order Notes */}
                  {currentOrder.orderNotes && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Order Notes
                      </h4>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-sm">
                        {currentOrder.orderNotes}
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
                    order={currentOrder}
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