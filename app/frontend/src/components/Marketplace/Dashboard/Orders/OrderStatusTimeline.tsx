import React from 'react';
import { OrderStatus } from './OrderStatusBadge';

interface TimelineStep {
  status: OrderStatus;
  label: string;
  date?: string;
  completed: boolean;
  current: boolean;
}

interface OrderStatusTimelineProps {
  currentStatus: OrderStatus | string;
  orderType?: 'physical' | 'digital' | 'service' | 'nft';
  events?: Array<{
    status: string;
    date: string;
    note?: string;
  }>;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

// Get the appropriate workflow steps based on order type
const getWorkflowSteps = (orderType: string): Array<{ status: OrderStatus; label: string }> => {
  switch (orderType) {
    case 'digital':
      return [
        { status: 'pending', label: 'Pending' },
        { status: 'processing', label: 'Processing' },
        { status: 'delivered', label: 'Delivered' },
        { status: 'completed', label: 'Completed' },
      ];
    case 'service':
      return [
        { status: 'pending', label: 'Pending' },
        { status: 'processing', label: 'In Progress' },
        { status: 'delivered', label: 'Service Complete' },
        { status: 'completed', label: 'Confirmed' },
      ];
    case 'nft':
      return [
        { status: 'pending', label: 'Payment Received' },
        { status: 'processing', label: 'NFT Deposited' },
        { status: 'delivered', label: 'Transfer Complete' },
        { status: 'completed', label: 'Completed' },
      ];
    case 'physical':
    default:
      return [
        { status: 'pending', label: 'Pending' },
        { status: 'processing', label: 'Processing' },
        { status: 'ready_to_ship', label: 'Ready to Ship' },
        { status: 'shipped', label: 'Shipped' },
        { status: 'delivered', label: 'Delivered' },
      ];
  }
};

// Map status to step index
const getStatusIndex = (status: string, steps: Array<{ status: OrderStatus; label: string }>): number => {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
  const index = steps.findIndex(s => s.status === normalizedStatus);
  return index >= 0 ? index : 0;
};

export function OrderStatusTimeline({
  currentStatus,
  orderType = 'physical',
  events = [],
  className = '',
  orientation = 'horizontal',
}: OrderStatusTimelineProps) {
  const workflowSteps = getWorkflowSteps(orderType);
  const normalizedStatus = currentStatus.toLowerCase().replace(/\s+/g, '_');
  const currentIndex = getStatusIndex(normalizedStatus, workflowSteps);

  // Check for terminal states
  const isTerminal = ['cancelled', 'refunded', 'disputed', 'returned'].includes(normalizedStatus);

  // Build timeline steps
  const timelineSteps: TimelineStep[] = workflowSteps.map((step, index) => {
    const eventForStep = events.find(e =>
      e.status.toLowerCase().replace(/\s+/g, '_') === step.status
    );

    return {
      ...step,
      date: eventForStep?.date,
      completed: index < currentIndex,
      current: index === currentIndex && !isTerminal,
    };
  });

  if (orientation === 'vertical') {
    return (
      <div className={`relative ${className}`}>
        {timelineSteps.map((step, index) => (
          <div key={step.status} className="flex items-start mb-4 last:mb-0">
            {/* Connector line */}
            {index < timelineSteps.length - 1 && (
              <div
                className={`absolute left-3 mt-6 w-0.5 h-8 ${
                  step.completed ? 'bg-purple-500' : 'bg-gray-700'
                }`}
              />
            )}

            {/* Step indicator */}
            <div
              className={`
                relative z-10 flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0
                ${step.completed
                  ? 'bg-purple-500'
                  : step.current
                    ? 'bg-purple-500/30 border-2 border-purple-500'
                    : 'bg-gray-700'
                }
              `}
            >
              {step.completed ? (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : step.current ? (
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
              ) : (
                <div className="w-2 h-2 bg-gray-600 rounded-full" />
              )}
            </div>

            {/* Step content */}
            <div className="ml-4 flex-1">
              <p
                className={`text-sm font-medium ${
                  step.completed || step.current ? 'text-white' : 'text-gray-500'
                }`}
              >
                {step.label}
              </p>
              {step.date && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(step.date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          </div>
        ))}

        {/* Terminal state indicator */}
        {isTerminal && (
          <div className="flex items-start mt-4 pt-4 border-t border-gray-700">
            <div
              className={`
                relative z-10 flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0
                ${normalizedStatus === 'cancelled' || normalizedStatus === 'refunded'
                  ? 'bg-gray-500'
                  : 'bg-orange-500'
                }
              `}
            >
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
              </svg>
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-white capitalize">
                {normalizedStatus.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Horizontal orientation
  return (
    <div className={`w-full ${className}`}>
      <div className="relative flex items-center justify-between">
        {/* Background line */}
        <div className="absolute left-0 right-0 h-0.5 bg-gray-700 top-3" />

        {/* Progress line */}
        <div
          className="absolute left-0 h-0.5 bg-purple-500 top-3 transition-all duration-500"
          style={{
            width: `${(currentIndex / (timelineSteps.length - 1)) * 100}%`,
          }}
        />

        {/* Steps */}
        {timelineSteps.map((step, index) => (
          <div
            key={step.status}
            className="relative flex flex-col items-center"
            style={{ width: `${100 / timelineSteps.length}%` }}
          >
            {/* Step indicator */}
            <div
              className={`
                relative z-10 flex items-center justify-center w-6 h-6 rounded-full
                ${step.completed
                  ? 'bg-purple-500'
                  : step.current
                    ? 'bg-purple-500/30 border-2 border-purple-500'
                    : 'bg-gray-700'
                }
              `}
            >
              {step.completed ? (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : step.current ? (
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
              ) : (
                <div className="w-2 h-2 bg-gray-600 rounded-full" />
              )}
            </div>

            {/* Step label */}
            <div className="mt-2 text-center">
              <p
                className={`text-xs font-medium ${
                  step.completed || step.current ? 'text-white' : 'text-gray-500'
                }`}
              >
                {step.label}
              </p>
              {step.date && (
                <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">
                  {new Date(step.date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Terminal state indicator */}
      {isTerminal && (
        <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-center">
          <span
            className={`
              inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium
              ${normalizedStatus === 'cancelled' || normalizedStatus === 'refunded'
                ? 'bg-gray-500/20 text-gray-400'
                : 'bg-orange-500/20 text-orange-300'
              }
            `}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
            </svg>
            Order {normalizedStatus.replace(/_/g, ' ')}
          </span>
        </div>
      )}
    </div>
  );
}

export default OrderStatusTimeline;
