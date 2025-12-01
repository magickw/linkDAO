/**
 * PurchaseProgressIndicator - Enhanced feedback system for purchase flow
 * Provides real-time progress tracking and user feedback
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, Loader2, AlertTriangle, X, Info } from 'lucide-react';

interface ProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  message?: string;
  timestamp?: Date;
}

interface PurchaseProgressIndicatorProps {
  steps: ProgressStep[];
  isVisible: boolean;
  onClose: () => void;
  onComplete?: () => void;
  showCloseButton?: boolean;
}

export const PurchaseProgressIndicator: React.FC<PurchaseProgressIndicatorProps> = ({
  steps,
  isVisible,
  onClose,
  onComplete,
  showCloseButton = false
}) => {
  const [autoCloseTimer, setAutoCloseTimer] = useState<NodeJS.Timeout | null>(null);

  // Auto-close when all steps are completed
  useEffect(() => {
    const allCompleted = steps.every(step => step.status === 'completed');
    const hasError = steps.some(step => step.status === 'error');

    if (allCompleted && !hasError && isVisible) {
      const timer = setTimeout(() => {
        onComplete?.();
        onClose();
      }, 3000);
      setAutoCloseTimer(timer);
    }

    return () => {
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
      }
    };
  }, [steps, isVisible, onComplete, onClose]);

  const getStepIcon = (status: ProgressStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'in-progress':
        return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStepColor = (status: ProgressStep['status']) => {
    switch (status) {
      case 'completed':
        return 'border-green-400 bg-green-400/10';
      case 'in-progress':
        return 'border-blue-400 bg-blue-400/10';
      case 'error':
        return 'border-red-400 bg-red-400/10';
      default:
        return 'border-gray-400 bg-gray-400/10';
    }
  };

  const getProgressPercentage = () => {
    const completedSteps = steps.filter(step => step.status === 'completed').length;
    return (completedSteps / steps.length) * 100;
  };

  const hasError = steps.some(step => step.status === 'error');
  const allCompleted = steps.every(step => step.status === 'completed');

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              hasError ? 'bg-red-400' : allCompleted ? 'bg-green-400' : 'bg-blue-400'
            }`} />
            <h3 className="text-white font-medium">
              {hasError ? 'Purchase Failed' : allCompleted ? 'Purchase Complete' : 'Processing Purchase'}
            </h3>
          </div>
          {(showCloseButton || allCompleted) && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="px-4 py-3 bg-gray-800/50">
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                hasError ? 'bg-red-400' : allCompleted ? 'bg-green-400' : 'bg-blue-400'
              }`}
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
          <p className="text-gray-400 text-xs mt-2">
            {Math.round(getProgressPercentage())}% Complete
          </p>
        </div>

        {/* Steps */}
        <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-start space-x-3">
              <div className={`flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center ${getStepColor(step.status)}`}>
                {getStepIcon(step.status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-medium ${
                    step.status === 'completed' ? 'text-green-400' :
                    step.status === 'error' ? 'text-red-400' :
                    step.status === 'in-progress' ? 'text-blue-400' :
                    'text-gray-400'
                  }`}>
                    {step.label}
                  </p>
                  {step.timestamp && (
                    <p className="text-gray-500 text-xs">
                      {step.timestamp.toLocaleTimeString()}
                    </p>
                  )}
                </div>
                {step.message && (
                  <p className="text-gray-400 text-xs mt-1">{step.message}</p>
                )}
              </div>
            </div>
          ))}

          {/* Error Message */}
          {hasError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <Info className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 text-sm font-medium">Transaction Failed</p>
                  <p className="text-gray-400 text-xs mt-1">
                    Please check your wallet balance and try again.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {allCompleted && !hasError && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-green-400 text-sm font-medium">Purchase Successful!</p>
                  <p className="text-gray-400 text-xs mt-1">
                    Your order has been confirmed and will be processed shortly.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Auto-close Notice */}
        {allCompleted && !hasError && (
          <div className="px-4 py-2 bg-gray-800/50 text-center">
            <p className="text-gray-400 text-xs">Closing automatically in 3 seconds...</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Hook for managing purchase progress
export const usePurchaseProgress = () => {
  const [steps, setSteps] = useState<ProgressStep[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  const initializeSteps = (stepLabels: string[]) => {
    const initialSteps: ProgressStep[] = stepLabels.map(label => ({
      id: label.toLowerCase().replace(/\s+/g, '-'),
      label,
      status: 'pending'
    }));
    setSteps(initialSteps);
  };

  const updateStep = (stepId: string, status: ProgressStep['status'], message?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, message, timestamp: new Date() }
        : step
    ));
  };

  const startProgress = (stepLabels: string[]) => {
    initializeSteps(stepLabels);
    setIsVisible(true);
    updateStep(stepLabels[0], 'in-progress');
  };

  const completeStep = (stepId: string, message?: string) => {
    updateStep(stepId, 'completed', message);
    
    // Auto-start next step
    const currentStepIndex = steps.findIndex(step => step.id === stepId);
    if (currentStepIndex < steps.length - 1) {
      const nextStep = steps[currentStepIndex + 1];
      updateStep(nextStep.id, 'in-progress');
    }
  };

  const errorStep = (stepId: string, message?: string) => {
    updateStep(stepId, 'error', message);
  };

  const resetProgress = () => {
    setSteps([]);
    setIsVisible(false);
  };

  const closeProgress = () => {
    setIsVisible(false);
  };

  return {
    steps,
    isVisible,
    startProgress,
    completeStep,
    errorStep,
    resetProgress,
    closeProgress
  };
};

export default PurchaseProgressIndicator;