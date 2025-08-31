import React from 'react';
import { cn } from '@/lib/utils';

export type StatusVariant = 'active' | 'inactive' | 'pending' | 'completed' | 'draft' | 'sold' | 'paused';

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusVariant;
  className?: string;
  children?: React.ReactNode;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  className,
  children,
  ...props 
}) => {
  const statusConfig = {
    active: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-800 dark:text-green-400',
      ring: 'ring-green-600/20 dark:ring-green-400/30',
      label: 'Active'
    },
    inactive: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-800 dark:text-gray-300',
      ring: 'ring-gray-600/20 dark:ring-gray-400/30',
      label: 'Inactive'
    },
    pending: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-800 dark:text-yellow-500',
      ring: 'ring-yellow-600/20 dark:ring-yellow-400/30',
      label: 'Pending'
    },
    completed: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-800 dark:text-blue-400',
      ring: 'ring-blue-600/20 dark:ring-blue-400/30',
      label: 'Completed'
    },
    draft: {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-800 dark:text-amber-400',
      ring: 'ring-amber-600/20 dark:ring-amber-400/30',
      label: 'Draft'
    },
    sold: {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-800 dark:text-purple-400',
      ring: 'ring-purple-600/20 dark:ring-purple-400/30',
      label: 'Sold'
    },
    paused: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-800 dark:text-orange-400',
      ring: 'ring-orange-600/20 dark:ring-orange-400/30',
      label: 'Paused'
    }
  };

  const config = statusConfig[status] || statusConfig.inactive;
  const displayText = children || config.label;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        config.bg,
        config.text,
        config.ring,
        className
      )}
      {...props}
    >
      {displayText}
    </span>
  );
};

export default StatusBadge;
