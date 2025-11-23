/**
 * Order Tracking Component
 * Provides real-time order status tracking for both crypto and fiat payments
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  AlertTriangle,
  Shield,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  Eye,
  Download
} from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { orderService, OrderTrackingStatus } from '@/services/orderService';
import { toast } from 'react-hot-toast';

interface OrderTrackingProps {
  orderId: string;
}

export const OrderTracking: React.FC<OrderTrackingProps> = ({ orderId }) => {
  const router = useRouter();
  const [orderStatus, setOrderStatus] = useState<OrderTrackingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');

  useEffect(() => {
    loadOrderStatus();
    
    // Set up polling for real-time updates
    const interval = setInterval(loadOrderStatus, 30000); // Poll every 30 seconds
    
    return () => clearInterval(interval);
  }, [orderId]);

  const loadOrderStatus = async () => {
    try {
      const status = await orderService.getOrderTrackingStatus(orderId);
      setOrderStatus(status);
    } catch (error) {
      console.error('Failed to load order status:', error);
      toast.error('Failed to load order status');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadOrderStatus();
  };

  const handleConfirmDelivery = async () => {
    if (!orderStatus) return;

    try {
      await orderService.confirmDelivery(orderId, {
        confirmedAt: new Date(),
        satisfactionRating: 5
      });
      
      toast.success('Delivery confirmed! Funds will be released to seller.');
      loadOrderStatus();
    } catch (error) {
      console.error('Failed to confirm delivery:', error);
      toast.error('Failed to confirm delivery');
    }
  };

  const handleReleaseFunds = async () => {
    if (!orderStatus) return;

    try {
      await orderService.releaseFunds(orderId);
      toast.success('Funds released to seller successfully!');
      loadOrderStatus();
    } catch (error) {
      console.error('Failed to release funds:', error);
      toast.error('Failed to release funds');
    }
  };

  const handleOpenDispute = async () => {
    if (!disputeReason.trim()) {
      toast.error('Please provide a reason for the dispute');
      return;
    }

    try {
      await orderService.openDispute(orderId, disputeReason);
      toast.success('Dispute opened successfully. Our team will review it.');
      setShowDispute(false);
      setDisputeReason('');
      loadOrderStatus();
    } catch (error) {
      console.error('Failed to open dispute:', error);
      toast.error('Failed to open dispute');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'text-green-400';
      case 'processing':
      case 'shipped':
        return 'text-blue-400';
      case 'created':
      case 'paid':
        return 'text-yellow-400';
      case 'cancelled':
      case 'disputed':
        return 'text-red-400';
      default:
        return 'text-white/70';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'processing':
        return <Package className="w-5 h-5 text-blue-400" />;
      case 'shipped':
        return <Truck className="w-5 h-5 text-blue-400" />;
      case 'created':
      case 'paid':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case 'disputed':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      default:
        return <Package className="w-5 h-5 text-white/70" />;
    }
  };

  const renderProgressBar = () => {
    if (!orderStatus) return null;

    const { progress } = orderStatus;
    const progressPercentage = (progress.step / progress.totalSteps) * 100;

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-white">Order Progress</h3>
          <span className="text-white/70 text-sm">
            Step {progress.step} of {progress.totalSteps}
          </span>
        </div>
        
        <div className="bg-white/10 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-blue-400 to-green-400 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-white font-medium">{progress.currentStep}</span>
          {progress.nextStep && (
            <span className="text-white/70">Next: {progress.nextStep}</span>
          )}
        </div>
      </div>
    );
  };

  const renderTimeline = () => {
    if (!orderStatus) return null;

    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-white">Order Timeline</h3>
        
        <div className="space-y-4">
          {orderStatus.timeline.map((event, index) => (
            <div key={event.id} className="flex items-start gap-4">
              <div className={`p-2 rounded-full ${
                event.eventType.includes('COMPLETED') || event.eventType.includes('CONFIRMED') ? 'bg-green-500/20' :
                event.eventType.includes('PENDING') || event.eventType.includes('CREATED') ? 'bg-yellow-500/20' :
                event.eventType.includes('FAILED') || event.eventType.includes('DISPUTE') ? 'bg-red-500/20' :
                'bg-blue-500/20'
              }`}>
                {event.eventType.includes('COMPLETED') || event.eventType.includes('CONFIRMED') ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : event.eventType.includes('PENDING') || event.eventType.includes('CREATED') ? (
                  <Clock className="w-4 h-4 text-yellow-400" />
                ) : event.eventType.includes('FAILED') || event.eventType.includes('DISPUTE') ? (
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                ) : (
                  <Package className="w-4 h-4 text-blue-400" />
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-white">{event.eventType.replace(/_/g, ' ')}</h4>
                  <span className="text-white/60 text-sm">
                    {new Date(event.timestamp).toLocaleDateString()} {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-white/70 text-sm mt-1">{event.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderActions = () => {
    if (!orderStatus) return null;

    const { actions } = orderStatus;

    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-white">Available Actions</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {actions.canConfirmDelivery && (
            <Button
              variant="primary"
              onClick={handleConfirmDelivery}
              className="flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Confirm Delivery
            </Button>
          )}
          
          {actions.canReleaseFunds && (
            <Button
              variant="primary"
              onClick={handleReleaseFunds}
              className="flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              Release Funds
            </Button>
          )}
          
          {actions.canDispute && (
            <Button
              variant="outline"
              onClick={() => setShowDispute(true)}
              className="flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Open Dispute
            </Button>
          )}
          
          {orderStatus.status === 'DELIVERED' && (
            <Button
              variant="outline"
              onClick={() => router.push('/returns')}
              className="flex items-center gap-2 text-blue-400 border-blue-400 hover:bg-blue-400/10"
            >
              <RefreshCw className="w-4 h-4" />
              Request Return
            </Button>
          )}
          
          {actions.canCancel && (
            <Button
              variant="outline"
              className="flex items-center gap-2 text-red-400 border-red-400 hover:bg-red-400/10"
            >
              <AlertTriangle className="w-4 h-4" />
              Cancel Order
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderPaymentDetails = () => {
    if (!orderStatus) return null;

    return (
      <GlassPanel variant="secondary" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Payment Details</h3>
          <div className="flex items-center gap-2">
            {orderStatus.paymentPath === 'crypto' ? (
              <div className="flex items-center gap-2 text-orange-400">
                <Shield className="w-4 h-4" />
                <span className="text-sm">Crypto Escrow</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-blue-400">
                <Shield className="w-4 h-4" />
                <span className="text-sm">Stripe Escrow</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-white/70">Payment Method:</span>
            <span className="text-white capitalize">
              {orderStatus.paymentPath === 'crypto' ? 'Cryptocurrency' : 'Credit Card'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-white/70">Status:</span>
            <span className={`capitalize ${getStatusColor(orderStatus.status)}`}>
              {orderStatus.status.toLowerCase().replace(/_/g, ' ')}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-white/70">Order ID:</span>
            <span className="text-white font-mono">{orderStatus.orderId}</span>
          </div>
          
          {orderStatus.paymentPath === 'crypto' && (
            <div className="flex justify-between items-center">
              <span className="text-white/70">View on Explorer:</span>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
              >
                <ExternalLink className="w-3 h-3" />
                Etherscan
              </Button>
            </div>
          )}
        </div>
      </GlassPanel>
    );
  };

  const renderDisputeModal = () => {
    if (!showDispute) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <GlassPanel variant="primary" className="w-full max-w-md p-6">
          <h3 className="text-xl font-bold text-white mb-4">Open Dispute</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-white/70 text-sm mb-2">
                Reason for dispute
              </label>
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Please describe the issue with your order..."
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 resize-none"
                rows={4}
              />
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDispute(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleOpenDispute}
                className="flex-1"
              >
                Submit Dispute
              </Button>
            </div>
          </div>
        </GlassPanel>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <Package className="w-16 h-16 text-white/60 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Loading Order</h2>
        <p className="text-white/70">Fetching your order details...</p>
      </div>
    );
  }

  if (!orderStatus) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Order Not Found</h2>
        <p className="text-white/70 mb-6">
          We couldn't find an order with ID: {orderId}
        </p>
        <Button variant="primary" onClick={() => router.push('/marketplace')}>
          Back to Marketplace
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Order Tracking</h1>
          <p className="text-white/70">Track your order progress and manage delivery</p>
        </div>
        
        <Button
          variant="ghost"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Status Overview */}
      <GlassPanel variant="secondary" className="p-6">
        <div className="flex items-center gap-4 mb-6">
          {getStatusIcon(orderStatus.status)}
          <div>
            <h2 className="text-xl font-bold text-white">
              Order {orderStatus.status.toLowerCase().replace(/_/g, ' ').charAt(0).toUpperCase() + orderStatus.status.toLowerCase().replace(/_/g, ' ').slice(1)}
            </h2>
            <p className="text-white/70">Order #{orderStatus.orderId}</p>
          </div>
        </div>
        
        {renderProgressBar()}
      </GlassPanel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Timeline */}
        <GlassPanel variant="secondary" className="p-6">
          {renderTimeline()}
        </GlassPanel>

        {/* Payment Details */}
        <div className="space-y-6">
          {renderPaymentDetails()}
          
          {/* Actions */}
          <GlassPanel variant="secondary" className="p-6">
            {renderActions()}
          </GlassPanel>
        </div>
      </div>

      {/* Security Notice */}
      <GlassPanel variant="secondary" className="p-6">
        <div className="flex items-start gap-4">
          <Shield className="w-6 h-6 text-green-400 mt-1" />
          <div>
            <h3 className="font-semibold text-white mb-2">Escrow Protection Active</h3>
            <p className="text-white/70 text-sm">
              Your payment is held securely in {orderStatus.paymentPath === 'crypto' ? 'smart contract' : 'Stripe'} escrow 
              until you confirm delivery. This ensures both buyer and seller protection throughout the transaction.
            </p>
          </div>
        </div>
      </GlassPanel>

      {/* Dispute Modal */}
      {renderDisputeModal()}
    </div>
  );
};

export default OrderTracking;