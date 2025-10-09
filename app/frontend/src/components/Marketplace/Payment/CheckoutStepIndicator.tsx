/**
 * CheckoutStepIndicator - Visual stepper for checkout flow
 * Shows: Review → Payment → Confirm → Complete
 */

import React from 'react';
import { Check } from 'lucide-react';

export type CheckoutStep = 'review' | 'payment' | 'confirm' | 'complete';

interface CheckoutStepIndicatorProps {
  currentStep: CheckoutStep;
}

const steps: Array<{ key: CheckoutStep; label: string }> = [
  { key: 'review', label: 'Review Order' },
  { key: 'payment', label: 'Payment' },
  { key: 'confirm', label: 'Confirm' },
  { key: 'complete', label: 'Complete' },
];

export const CheckoutStepIndicator: React.FC<CheckoutStepIndicatorProps> = ({ currentStep }) => {
  const currentIndex = steps.findIndex(s => s.key === currentStep);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isUpcoming = index > currentIndex;

          return (
            <React.Fragment key={step.key}>
              {/* Step Circle */}
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    isCompleted
                      ? 'bg-green-600 text-white'
                      : isCurrent
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/30'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {isCompleted ? <Check size={20} /> : index + 1}
                </div>
                <span
                  className={`mt-2 text-xs sm:text-sm font-medium ${
                    isCurrent
                      ? 'text-blue-600 dark:text-blue-400'
                      : isCompleted
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={`h-1 flex-1 mx-2 transition-all ${
                    index < currentIndex
                      ? 'bg-green-600'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  style={{ maxWidth: '100px' }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
