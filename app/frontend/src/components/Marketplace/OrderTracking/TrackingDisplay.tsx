/**
 * TrackingDisplay - Shipping tracking information display
 * Features: Carrier tracking, delivery status, tracking events
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Truck, 
  Package, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Copy,
  Calendar
} from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { useToast } from '@/context/ToastContext';
import { Order, TrackingInfo } from '@/types/order';

interface TrackingDisplayProps {
  order: Order;
  trackingInfo: TrackingInfo | null;
  onRefresh?: () => void;
  className?: string;
}

const TrackingDisplay: React.FC<TrackingDisplayProps> = ({
  order,
  trackingInfo,
  onRefresh,
  className = ''
}) => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);

  const copyTrackingNumber = () => {
    if (order.trackingNumber) {
      navigator.clipboard.writeText(order.trackingNumber);
      addToast('Tracking number copied to clipboard', 'success');
    }
  };

  const getCarrierUrl = (carrier: string, trackingNumber: string) => {
    const urls: Record<string, string> = {
      'FEDEX': `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
      'UPS': `https://www.ups.com/track?tracknum=${trackingNumber}`,
      'DHL': `https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=${trackingNumber}`,
      'USPS': `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
    };
    
    return urls[carrier.toUpperCase()] || `https://www.google.com/search?q=${carrier}+tracking+${trackingNumber}`;
  };

  const getTrackingStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'DELIVERED': 'text-green-600 bg-green-100 border-green-200',
      'OUT_FOR_DELIVERY': 'text-blue-600 bg-blue-100 border-blue-200',
      'IN_TRANSIT': 'text-yellow-600 bg-yellow-100 border-yellow-200',
      'PICKED_UP': 'text-purple-600 bg-purple-100 border-purple-200',
      'LABEL_CREATED': 'text-gray-600 bg-gray-100 border-gray-200',
      'EXCEPTION': 'text-red-600 bg-red-100 border-red-200',
      'DELAYED': 'text-orange-600 bg-orange-100 border-orange-200',
    };
    
    return statusColors[status] || 'text-gray-600 bg-gray-100 border-gray-200';
  };

  const getTrackingStatusIcon = (status: string) => {
    const statusIcons: Record<string, any> = {
      'DELIVERED': CheckCircle,
      'OUT_FOR_DELIVERY': Truck,
      'IN_TRANSIT': Truck,
      'PICKED_UP': Package,
      'LABEL_CREATED': Package,
      'EXCEPTION': AlertTriangle,
      'DELAYED': Clock,
    };
    
    return statusIcons[status] || Package;
  };

  const formatTrackingStatus = (status: string) => {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  if (!order.trackingNumber) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <Package size={48} className="mx-auto text-gray-400 mb-4" />
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Tracking Information
        </h4>
        <p className="text-gray-600 dark:text-gray-400">
          Tracking information will be available once the order is shipped.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Tracking Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
          Shipping Tracking
        </h4>
        {onRefresh && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        )}
      </div>

      {/* Tracking Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tracking Details */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Tracking Number
              </label>
              <div className="flex items-center space-x-2 mt-1">
                <span className="font-mono text-lg text-gray-900 dark:text-white">
                  {order.trackingNumber}
                </span>
                <button
                  onClick={copyTrackingNumber}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <Copy size={16} />
                </button>
                <a
                  href={getCarrierUrl(order.trackingCarrier || '', order.trackingNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Carrier
              </label>
              <div className="text-lg text-gray-900 dark:text-white mt-1">
                {order.trackingCarrier || 'Unknown'}
              </div>
            </div>

            {trackingInfo?.status && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Current Status
                </label>
                <div className="mt-1">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getTrackingStatusColor(trackingInfo.status)}`}>
                    {React.createElement(getTrackingStatusIcon(trackingInfo.status), { size: 16, className: 'mr-2' })}
                    {formatTrackingStatus(trackingInfo.status)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Delivery Information */}
          <div className="space-y-4">
            {order.estimatedDelivery && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Estimated Delivery
                </label>
                <div className="flex items-center text-lg text-gray-900 dark:text-white mt-1">
                  <Calendar size={16} className="mr-2" />
                  {new Date(order.estimatedDelivery).toLocaleDateString()}
                </div>
              </div>
            )}

            {order.actualDelivery && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Actual Delivery
                </label>
                <div className="flex items-center text-lg text-green-600 dark:text-green-400 mt-1">
                  <CheckCircle size={16} className="mr-2" />
                  {new Date(order.actualDelivery).toLocaleDateString()}
                </div>
              </div>
            )}

            {order.shippingAddress && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Delivery Address
                </label>
                <div className="text-sm text-gray-900 dark:text-white mt-1 space-y-1">
                  <div>{order.shippingAddress.name}</div>
                  <div>{order.shippingAddress.street}</div>
                  <div>
                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                  </div>
                  <div>{order.shippingAddress.country}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tracking Events */}
      {trackingInfo?.events && trackingInfo.events.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Tracking History
          </h5>
          
          <div className="space-y-4">
            {trackingInfo.events.map((event, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start space-x-4 pb-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0 last:pb-0"
              >
                {/* Event Icon */}
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${getTrackingStatusColor(event.status)}`}>
                  {React.createElement(getTrackingStatusIcon(event.status), { size: 16 })}
                </div>

                {/* Event Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h6 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatTrackingStatus(event.status)}
                      </h6>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {event.description}
                      </p>
                      {event.location && (
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <MapPin size={12} className="mr-1" />
                          {event.location}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-500 dark:text-gray-400 ml-4">
                      {new Date(event.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Tracking Progress Bar */}
      {trackingInfo && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Delivery Progress
          </h5>
          
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700" />
            
            {/* Progress Steps */}
            <div className="relative flex justify-between">
              {[
                { key: 'LABEL_CREATED', label: 'Label Created', icon: Package },
                { key: 'PICKED_UP', label: 'Picked Up', icon: Truck },
                { key: 'IN_TRANSIT', label: 'In Transit', icon: Truck },
                { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Truck },
                { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle }
              ].map((step, index) => {
                const isCompleted = trackingInfo.events?.some(event => event.status === step.key) || false;
                const isActive = trackingInfo.status === step.key;
                const Icon = step.icon;
                
                return (
                  <div key={step.key} className="flex flex-col items-center">
                    <div className={`
                      w-10 h-10 rounded-full border-2 flex items-center justify-center relative z-10
                      ${isCompleted || isActive 
                        ? 'bg-blue-500 border-blue-500 text-white' 
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400'
                      }
                    `}>
                      <Icon size={16} />
                    </div>
                    <span className={`
                      text-xs mt-2 text-center max-w-16
                      ${isCompleted || isActive 
                        ? 'text-blue-600 dark:text-blue-400 font-medium' 
                        : 'text-gray-500 dark:text-gray-400'
                      }
                    `}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* No Tracking Data */}
      {!trackingInfo && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="text-yellow-600 dark:text-yellow-400 mr-3" size={20} />
            <div>
              <h6 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                Tracking Data Unavailable
              </h6>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Tracking information is not available yet. This may be because the package hasn't been scanned by the carrier or there's a delay in updating the tracking system.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackingDisplay;