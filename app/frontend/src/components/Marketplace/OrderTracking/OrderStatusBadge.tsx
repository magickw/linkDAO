/**
 * OrderStatusBadge - User-friendly order status display
 * Features: Clear status descriptions, visual indicators, helpful messages
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Package, 
  CreditCard, 
  RefreshCw, 
  Truck, 
  CheckCircle, 
  Clock,
  AlertTriangle,
  Info
} from 'lucide-react';

export type OrderStatus = 
  | 'created' 
  | 'pending' 
  | 'paid' 
  | 'processing' 
  | 'shipped' 
  | 'delivered' 
  | 'cancelled' 
  | 'refunded'
  | 'disputed';

interface OrderStatusBadgeProps {
  status: OrderStatus | string;
  className?: string;
  showDescription?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

interface StatusConfig {
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  isWarning?: boolean;
  isSuccess?: boolean;
  isInfo?: boolean;
}

const STATUS_CONFIGS: Record<string, StatusConfig> = {
  created: {
    label: 'Order Placed',
    description: 'Your order has been received and is awaiting payment',
    icon: Package,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    isInfo: true
  },
  pending: {
    label: 'Pending',
    description: 'Order is pending payment confirmation',
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-700',
    isWarning: true
  },
  paid: {
    label: 'Payment Confirmed',
    description: 'Payment received! Seller will prepare your order soon',
    icon: CreditCard,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700',
    isSuccess: true
  },
  processing: {
    label: 'Preparing',
    description: 'Seller is preparing your order for shipment',
    icon: RefreshCw,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    isInfo: true
  },
  shipped: {
    label: 'In Transit',
    description: 'Your order is on its way to you',
    icon: Truck,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    textColor: 'text-indigo-700',
    isInfo: true
  },
  delivered: {
    label: 'Delivered',
    description: 'Your order has been delivered successfully',
    icon: CheckCircle,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
    isSuccess: true
  },
  cancelled: {
    label: 'Cancelled',
    description: 'This order has been cancelled',
    icon: Clock,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-700'
  },
  refunded: {
    label: 'Refunded',
    description: 'Your refund has been processed',
    icon: CheckCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-700',
    isWarning: true
  },
  disputed: {
    label: 'In Dispute',
    description: 'A dispute has been opened for this order',
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700',
    isWarning: true
  }
};

const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({
  status,
  className = '',
  showDescription = false,
  size = 'md'
}) => {
  const normalizedStatus = status?.toLowerCase() || 'created';
  const config = STATUS_CONFIGS[normalizedStatus] || STATUS_CONFIGS.created;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20
  };

  return (
    <div className={`inline-flex ${className}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className={`
          inline-flex items-center gap-2 rounded-lg border
          ${config.bgColor} ${config.borderColor} ${config.textColor}
          ${sizeClasses[size]}
        `}
      >
        <Icon size={iconSizes[size]} className={config.color} />
        <span className="font-medium">{config.label}</span>
      </motion.div>

      {showDescription && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className={`
            mt-2 flex items-start gap-2 text-xs p-2 rounded-lg
            ${config.bgColor} ${config.textColor}
          `}
        >
          <Info size={14} className={`${config.color} flex-shrink-0 mt-0.5`} />
          <span>{config.description}</span>
        </motion.div>
      )}
    </div>
  );
};

export default OrderStatusBadge;