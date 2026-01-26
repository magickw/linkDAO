/**
 * OrderProgressBar - Visual progress indicator showing order journey stages
 * Features: Animated progress bar, stage indicators, estimated time remaining
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
  Calendar
} from 'lucide-react';

export type OrderStage = 'created' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface OrderProgressBarProps {
  currentStage: OrderStage;
  estimatedDelivery?: Date;
  className?: string;
}

interface StageConfig {
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}

const STAGES: Record<OrderStage, StageConfig> = {
  created: {
    label: 'Order Placed',
    description: 'Your order has been received',
    icon: Package,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-500'
  },
  paid: {
    label: 'Payment Confirmed',
    description: 'Payment processed successfully',
    icon: CreditCard,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-500'
  },
  processing: {
    label: 'Preparing',
    description: 'Seller is preparing your order',
    icon: RefreshCw,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-500'
  },
  shipped: {
    label: 'In Transit',
    description: 'Your order is on its way',
    icon: Truck,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    borderColor: 'border-indigo-500'
  },
  delivered: {
    label: 'Delivered',
    description: 'Order has been delivered',
    icon: CheckCircle,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    borderColor: 'border-emerald-500'
  },
  cancelled: {
    label: 'Cancelled',
    description: 'Order was cancelled',
    icon: Clock,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-500'
  }
};

const STAGE_ORDER: OrderStage[] = ['created', 'paid', 'processing', 'shipped', 'delivered'];

const getStageIndex = (stage: OrderStage): number => {
  if (stage === 'cancelled') return -1;
  return STAGE_ORDER.indexOf(stage);
};

const getProgressPercentage = (currentStage: OrderStage): number => {
  if (currentStage === 'cancelled') return 0;
  const currentIndex = getStageIndex(currentStage);
  return ((currentIndex + 1) / STAGE_ORDER.length) * 100;
};

const OrderProgressBar: React.FC<OrderProgressBarProps> = ({
  currentStage,
  estimatedDelivery,
  className = ''
}) => {
  const currentIndex = getStageIndex(currentStage);
  const progressPercentage = getProgressPercentage(currentStage);
  const isCancelled = currentStage === 'cancelled';

  const getDaysUntilDelivery = (): string | null => {
    if (!estimatedDelivery) return null;
    const now = new Date();
    const diffTime = estimatedDelivery.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'Expected today';
    if (diffDays === 1) return 'Expected tomorrow';
    return `Expected in ${diffDays} days`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Progress Bar */}
      <div className="relative">
        {/* Background Track */}
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          {/* Animated Progress */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: isCancelled ? 0 : `${progressPercentage}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              isCancelled 
                ? 'bg-gray-400' 
                : 'bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500'
            }`}
          />
        </div>
      </div>

      {/* Stage Indicators */}
      <div className="flex items-center justify-between relative">
        {/* Stage Nodes */}
        {STAGE_ORDER.map((stage, index) => {
          const config = STAGES[stage];
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <div key={stage} className="flex flex-col items-center flex-1 relative">
              {/* Stage Icon */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0.5 }}
                animate={{ 
                  scale: isCurrent ? 1.1 : 1,
                  opacity: isPending ? 0.5 : 1
                }}
                transition={{ duration: 0.3 }}
                className={`
                  relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2
                  ${isCompleted 
                    ? `${config.bgColor} ${config.borderColor} ${config.color}` 
                    : isCurrent 
                      ? `${config.bgColor} ${config.borderColor} ${config.color} ring-4 ring-${config.borderColor.split('-')[1]}-200 dark:ring-${config.borderColor.split('-')[1]}-900/30`
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400'
                  }
                `}
              >
                {isCompleted ? (
                  <CheckCircle size={20} className={config.color} />
                ) : (
                  React.createElement(config.icon, { size: 20 })
                )}
              </motion.div>

              {/* Stage Label */}
              <div className="mt-2 text-center">
                <p className={`text-xs font-medium ${
                  isCurrent 
                    ? config.color 
                    : isCompleted 
                      ? 'text-gray-700 dark:text-gray-300' 
                      : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {config.label}
                </p>
                {isCurrent && (
                  <motion.p
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-gray-500 dark:text-gray-400 mt-1"
                  >
                    {config.description}
                  </motion.p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Estimated Delivery Info */}
      {estimatedDelivery && !isCancelled && currentStage !== 'delivered' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3"
        >
          <Calendar size={16} className="text-blue-600 dark:text-blue-400" />
          <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
            {getDaysUntilDelivery()}
          </span>
          <span className="text-xs text-blue-600 dark:text-blue-400">
            ({estimatedDelivery.toLocaleDateString()})
          </span>
        </motion.div>
      )}

      {/* Cancelled Message */}
      {isCancelled && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-3"
        >
          <Clock size={16} className="text-gray-600 dark:text-gray-400" />
          <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
            This order has been cancelled
          </span>
        </motion.div>
      )}

      {/* Delivered Message */}
      {currentStage === 'delivered' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3"
        >
          <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
            Order delivered successfully!
          </span>
        </motion.div>
      )}
    </div>
  );
};

export default OrderProgressBar;