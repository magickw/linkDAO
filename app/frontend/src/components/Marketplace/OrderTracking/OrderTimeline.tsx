/**
 * OrderTimeline - Visual timeline of order events and status updates
 * Features: Chronological event display with icons and metadata
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, 
  CheckCircle, 
  Package, 
  Truck, 
  AlertTriangle, 
  CreditCard,
  User,
  System,
  RefreshCw,
  MessageSquare,
  FileText,
  MapPin
} from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { OrderEvent } from '@/types/order';

interface OrderTimelineProps {
  events: OrderEvent[];
  loading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

const OrderTimeline: React.FC<OrderTimelineProps> = ({
  events,
  loading = false,
  onRefresh,
  className = ''
}) => {
  const getEventIcon = (eventType: string) => {
    const iconMap: Record<string, any> = {
      'ORDER_CREATED': Package,
      'PAYMENT_PENDING': CreditCard,
      'PAYMENT_RECEIVED': CheckCircle,
      'PAYMENT_CONFIRMED': CheckCircle,
      'ORDER_PAID': CheckCircle,
      'ORDER_PROCESSING': Package,
      'SHIPPING_ADDED': Truck,
      'ORDER_SHIPPED': Truck,
      'ORDER_DELIVERED': Package,
      'DELIVERY_CONFIRMED': CheckCircle,
      'ORDER_COMPLETED': CheckCircle,
      'DISPUTE_INITIATED': AlertTriangle,
      'DISPUTE_RESOLVED': CheckCircle,
      'ORDER_CANCELLED': AlertTriangle,
      'ORDER_REFUNDED': RefreshCw,
      'STATUS_CHANGED': Clock,
      'NOTE_ADDED': MessageSquare,
      'DOCUMENT_UPLOADED': FileText,
      'ADDRESS_UPDATED': MapPin,
      'SYSTEM_UPDATE': System,
      'USER_ACTION': User
    };

    return iconMap[eventType] || Clock;
  };

  const getEventColor = (eventType: string) => {
    const colorMap: Record<string, string> = {
      'ORDER_CREATED': 'text-blue-600 bg-blue-100 border-blue-200',
      'PAYMENT_PENDING': 'text-yellow-600 bg-yellow-100 border-yellow-200',
      'PAYMENT_RECEIVED': 'text-green-600 bg-green-100 border-green-200',
      'PAYMENT_CONFIRMED': 'text-green-600 bg-green-100 border-green-200',
      'ORDER_PAID': 'text-green-600 bg-green-100 border-green-200',
      'ORDER_PROCESSING': 'text-purple-600 bg-purple-100 border-purple-200',
      'SHIPPING_ADDED': 'text-indigo-600 bg-indigo-100 border-indigo-200',
      'ORDER_SHIPPED': 'text-indigo-600 bg-indigo-100 border-indigo-200',
      'ORDER_DELIVERED': 'text-green-600 bg-green-100 border-green-200',
      'DELIVERY_CONFIRMED': 'text-green-700 bg-green-200 border-green-300',
      'ORDER_COMPLETED': 'text-green-700 bg-green-200 border-green-300',
      'DISPUTE_INITIATED': 'text-red-600 bg-red-100 border-red-200',
      'DISPUTE_RESOLVED': 'text-green-600 bg-green-100 border-green-200',
      'ORDER_CANCELLED': 'text-gray-600 bg-gray-100 border-gray-200',
      'ORDER_REFUNDED': 'text-orange-600 bg-orange-100 border-orange-200',
      'STATUS_CHANGED': 'text-blue-600 bg-blue-100 border-blue-200',
      'NOTE_ADDED': 'text-gray-600 bg-gray-100 border-gray-200',
      'DOCUMENT_UPLOADED': 'text-gray-600 bg-gray-100 border-gray-200',
      'ADDRESS_UPDATED': 'text-blue-600 bg-blue-100 border-blue-200',
      'SYSTEM_UPDATE': 'text-gray-600 bg-gray-100 border-gray-200',
      'USER_ACTION': 'text-blue-600 bg-blue-100 border-blue-200'
    };

    return colorMap[eventType] || 'text-gray-600 bg-gray-100 border-gray-200';
  };

  const getUserTypeIcon = (userType?: string) => {
    switch (userType) {
      case 'buyer':
        return '👤';
      case 'seller':
        return '🏪';
      case 'system':
        return '⚙️';
      default:
        return '📋';
    }
  };

  const formatEventMetadata = (metadata: any) => {
    if (!metadata) return null;

    try {
      const data = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
      
      return (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
              <span className="font-mono">{String(value)}</span>
            </div>
          ))}
        </div>
      );
    } catch (error) {
      return (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {String(metadata)}
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="animate-spin text-blue-400 mr-2" size={24} />
        <span className="text-gray-600 dark:text-gray-400">Loading timeline...</span>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock size={48} className="mx-auto text-gray-400 mb-4" />
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Events Yet
        </h4>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Order events and status updates will appear here as they occur.
        </p>
        {onRefresh && (
          <Button variant="outline" size="small" onClick={onRefresh}>
            <RefreshCw size={16} className="mr-2" />
            Refresh Timeline
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
          Order Timeline
        </h4>
        {onRefresh && (
          <Button variant="outline" size="small" onClick={onRefresh}>
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
        )}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

        {/* Events */}
        <div className="space-y-6">
          {events.map((event, index) => {
            const Icon = getEventIcon(event.eventType);
            const colorClasses = getEventColor(event.eventType);
            const isLatest = index === 0;

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative flex items-start space-x-4"
              >
                {/* Event Icon */}
                <div className={`
                  relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2
                  ${colorClasses}
                  ${isLatest ? 'ring-4 ring-blue-100 dark:ring-blue-900/30' : ''}
                `}>
                  <Icon size={20} />
                </div>

                {/* Event Content */}
                <div className="flex-1 min-w-0 pb-6">
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                    {/* Event Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h5 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {event.description}
                        </h5>
                        <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                          <span>{new Date(event.timestamp).toLocaleString()}</span>
                          {event.userType && (
                            <>
                              <span>•</span>
                              <span className="flex items-center">
                                <span className="mr-1">{getUserTypeIcon(event.userType)}</span>
                                {event.userType}
                              </span>
                            </>
                          )}
                          {event.userAddress && (
                            <>
                              <span>•</span>
                              <span className="font-mono">
                                {event.userAddress.slice(0, 6)}...{event.userAddress.slice(-4)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {isLatest && (
                        <div className="flex items-center text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-1 animate-pulse" />
                          Latest
                        </div>
                      )}
                    </div>

                    {/* Event Metadata */}
                    {event.metadata && formatEventMetadata(event.metadata)}

                    {/* Event Type Badge */}
                    <div className="mt-3">
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {event.eventType.replace(/_/g, ' ').toLowerCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Timeline end marker */}
        <div className="relative flex items-center justify-center">
          <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded-full border-2 border-white dark:border-gray-800" />
        </div>
      </div>

      {/* Timeline Stats */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {events.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Events
            </div>
          </div>
          
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {events.filter(e => e.userType === 'system').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              System Events
            </div>
          </div>
          
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {events.filter(e => e.userType === 'buyer' || e.userType === 'seller').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              User Actions
            </div>
          </div>
          
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {Math.round((Date.now() - new Date(events[events.length - 1]?.timestamp || Date.now()).getTime()) / (1000 * 60 * 60 * 24))}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Days Active
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTimeline;