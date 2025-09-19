/**
 * OrderStatusBadge - Visual status indicator for orders
 * Features: Color-coded status badges with icons and animations
 */

import React from 'react';
import { 
  Clock, 
  CheckCircle, 
  Package, 
  Truck, 
  AlertTriangle, 
  X, 
  RefreshCw,
  CreditCard
} from 'lucide-react';
import { OrderStatus } from '@/types/order';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  showText?: boolean;
  animated?: boolean;
  className?: string;
}

const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({
  status,
  size = 'medium',
  showIcon = true,
  showText = true,
  animated = false,
  className = ''
}) => {
  const getStatusConfig = (status: OrderStatus) => {
    const configs = {
      CREATED: {
        icon: Clock,
        label: 'Created',
        color: 'text-yellow-600 bg-yellow-100 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-400/10 dark:border-yellow-400/20',
        pulseColor: 'animate-pulse'
      },
      PAYMENT_PENDING: {
        icon: CreditCard,
        label: 'Payment Pending',
        color: 'text-orange-600 bg-orange-100 border-orange-200 dark:text-orange-400 dark:bg-orange-400/10 dark:border-orange-400/20',
        pulseColor: 'animate-pulse'
      },
      PAID: {
        icon: CheckCircle,
        label: 'Paid',
        color: 'text-blue-600 bg-blue-100 border-blue-200 dark:text-blue-400 dark:bg-blue-400/10 dark:border-blue-400/20',
        pulseColor: ''
      },
      PROCESSING: {
        icon: Package,
        label: 'Processing',
        color: 'text-purple-600 bg-purple-100 border-purple-200 dark:text-purple-400 dark:bg-purple-400/10 dark:border-purple-400/20',
        pulseColor: 'animate-pulse'
      },
      SHIPPED: {
        icon: Truck,
        label: 'Shipped',
        color: 'text-indigo-600 bg-indigo-100 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-400/10 dark:border-indigo-400/20',
        pulseColor: ''
      },
      DELIVERED: {
        icon: Package,
        label: 'Delivered',
        color: 'text-green-600 bg-green-100 border-green-200 dark:text-green-400 dark:bg-green-400/10 dark:border-green-400/20',
        pulseColor: ''
      },
      COMPLETED: {
        icon: CheckCircle,
        label: 'Completed',
        color: 'text-green-700 bg-green-200 border-green-300 dark:text-green-300 dark:bg-green-500/20 dark:border-green-500/30',
        pulseColor: ''
      },
      DISPUTED: {
        icon: AlertTriangle,
        label: 'Disputed',
        color: 'text-red-600 bg-red-100 border-red-200 dark:text-red-400 dark:bg-red-400/10 dark:border-red-400/20',
        pulseColor: 'animate-pulse'
      },
      CANCELLED: {
        icon: X,
        label: 'Cancelled',
        color: 'text-gray-600 bg-gray-100 border-gray-200 dark:text-gray-400 dark:bg-gray-400/10 dark:border-gray-400/20',
        pulseColor: ''
      },
      REFUNDED: {
        icon: RefreshCw,
        label: 'Refunded',
        color: 'text-orange-600 bg-orange-100 border-orange-200 dark:text-orange-400 dark:bg-orange-400/10 dark:border-orange-400/20',
        pulseColor: ''
      }
    };

    return configs[status] || configs.CREATED;
  };

  const getSizeClasses = (size: 'small' | 'medium' | 'large') => {
    const sizes = {
      small: {
        container: 'px-2 py-1 text-xs',
        icon: 12,
        gap: 'space-x-1'
      },
      medium: {
        container: 'px-2.5 py-1 text-sm',
        icon: 14,
        gap: 'space-x-1.5'
      },
      large: {
        container: 'px-3 py-1.5 text-base',
        icon: 16,
        gap: 'space-x-2'
      }
    };

    return sizes[size];
  };

  const config = getStatusConfig(status);
  const sizeClasses = getSizeClasses(size);
  const Icon = config.icon;

  return (
    <div
      className={`
        inline-flex items-center font-medium rounded-full border
        ${sizeClasses.container}
        ${sizeClasses.gap}
        ${config.color}
        ${animated ? config.pulseColor : ''}
        ${className}
      `}
    >
      {showIcon && (
        <Icon 
          size={sizeClasses.icon} 
          className={animated && config.pulseColor ? 'animate-spin' : ''}
        />
      )}
      {showText && (
        <span>{config.label}</span>
      )}
    </div>
  );
};

export default OrderStatusBadge;