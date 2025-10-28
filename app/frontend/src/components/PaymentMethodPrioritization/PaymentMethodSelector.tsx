/**
 * Payment Method Selector Component
 * Main component for displaying prioritized payment methods with responsive design
 */

import React, { useState, useEffect, useMemo } from 'react';
import PaymentMethodCard from './PaymentMethodCard';
import {
  PrioritizedPaymentMethod,
  PaymentMethodType,
  PrioritizationResult,
  AvailabilityStatus
} from '../../types/paymentPrioritization';

interface PaymentMethodSelectorProps {
  prioritizationResult: PrioritizationResult;
  selectedMethodId?: string;
  onMethodSelect: (method: PrioritizedPaymentMethod) => void;
  onMethodChange?: (method: PrioritizedPaymentMethod) => void;
  showCostBreakdown?: boolean;
  showRecommendations?: boolean;
  showWarnings?: boolean;
  maxDisplayMethods?: number;
  className?: string;
  layout?: 'grid' | 'list';
  responsive?: boolean;
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  prioritizationResult,
  selectedMethodId,
  onMethodSelect,
  onMethodChange,
  showCostBreakdown = true,
  showRecommendations = true,
  showWarnings = true,
  maxDisplayMethods = 6,
  className = '',
  layout = 'grid',
  responsive = true
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PrioritizedPaymentMethod | null>(null);
  const [expandedMethods, setExpandedMethods] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('detailed');
  const [isMobile, setIsMobile] = useState(false);

  // Responsive detection
  useEffect(() => {
    if (!responsive) return;

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [responsive]);

  // Auto-select default method
  useEffect(() => {
    if (prioritizationResult.defaultMethod && !selectedMethod) {
      setSelectedMethod(prioritizationResult.defaultMethod);
      onMethodSelect(prioritizationResult.defaultMethod);
    }
  }, [prioritizationResult.defaultMethod, selectedMethod, onMethodSelect]);

  // Update selected method when external selection changes
  useEffect(() => {
    if (selectedMethodId) {
      const method = prioritizationResult.prioritizedMethods.find(
        m => m.method.id === selectedMethodId
      );
      if (method && method !== selectedMethod) {
        setSelectedMethod(method);
      }
    }
  }, [selectedMethodId, prioritizationResult.prioritizedMethods, selectedMethod]);

  const handleMethodSelect = (method: PrioritizedPaymentMethod) => {
    if (method.availabilityStatus !== AvailabilityStatus.AVAILABLE) {
      return;
    }

    setSelectedMethod(method);
    onMethodSelect(method);
    
    if (onMethodChange && method !== selectedMethod) {
      onMethodChange(method);
    }
  };

  const toggleMethodExpansion = (methodId: string) => {
    const newExpanded = new Set(expandedMethods);
    if (newExpanded.has(methodId)) {
      newExpanded.delete(methodId);
    } else {
      newExpanded.add(methodId);
    }
    setExpandedMethods(newExpanded);
  };

  // Filter and limit displayed methods
  const displayedMethods = useMemo(() => {
    return prioritizationResult.prioritizedMethods
      .slice(0, maxDisplayMethods)
      .sort((a, b) => a.priority - b.priority);
  }, [prioritizationResult.prioritizedMethods, maxDisplayMethods]);

  const availableMethods = displayedMethods.filter(
    method => method.availabilityStatus === AvailabilityStatus.AVAILABLE
  );

  // Log to verify fiat is available
  const fiatMethod = availableMethods.find(m => m.method.type === PaymentMethodType.FIAT_STRIPE);
  if (fiatMethod) {
    console.log('✅ Fiat payment method is available and selectable:', {
      name: fiatMethod.method.name,
      priority: fiatMethod.priority,
      availabilityStatus: fiatMethod.availabilityStatus
    });
  } else {
    console.warn('⚠️ Fiat payment method not found in available methods');
  }

  const unavailableMethods = displayedMethods.filter(
    method => method.availabilityStatus !== AvailabilityStatus.AVAILABLE
  );

  const getRecommendedMethod = (): PrioritizedPaymentMethod | null => {
    return availableMethods.length > 0 ? availableMethods[0] : null;
  };

  const getLayoutClasses = (): string => {
    // Always use vertical list layout - one method per row
    return 'space-y-3';
  };

  const recommendedMethod = getRecommendedMethod();

  return (
    <div className={`payment-method-selector ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Choose Payment Method
          </h2>
          <p className="text-sm text-white/70 mt-1">
            {availableMethods.length} of {displayedMethods.length} methods available
          </p>
        </div>

        {/* View Mode Toggle (Desktop only) */}
        {!isMobile && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('compact')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'compact'
                  ? 'bg-blue-500 text-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Compact
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'detailed'
                  ? 'bg-blue-500 text-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Detailed
            </button>
          </div>
        )}
      </div>

      {/* Warnings */}
      {showWarnings && prioritizationResult.warnings.length > 0 && (
        <div className="mb-6 p-4 bg-orange-500/20 border border-orange-400/30 rounded-lg">
          <h3 className="text-sm font-semibold text-orange-300 mb-2">
            ⚠️ Important Notices
          </h3>
          <div className="space-y-2">
            {prioritizationResult.warnings.map((warning, index) => (
              <div key={index} className="text-sm text-orange-200">
                <span className="font-medium">{warning.type.replace('_', ' ').toUpperCase()}:</span>{' '}
                {warning.message}
                {warning.actionRequired && (
                  <div className="mt-1 text-xs text-orange-300 italic">
                    Action: {warning.actionRequired}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Payment Methods */}
      {availableMethods.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-4">
            Available Methods
          </h3>
          <div className={getLayoutClasses()}>
            {availableMethods.map((method) => (
              <PaymentMethodCard
                key={method.method.id}
                paymentMethod={method}
                isSelected={selectedMethod?.method.id === method.method.id}
                isRecommended={recommendedMethod?.method.id === method.method.id}
                onSelect={handleMethodSelect}
                showCostBreakdown={showCostBreakdown && (viewMode === 'detailed' || isMobile)}
                className="w-full"
              />
            ))}
          </div>
        </div>
      )}

      {/* Unavailable Payment Methods */}
      {unavailableMethods.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white/60">
              Unavailable Methods
            </h3>
            <button
              onClick={() => {
                const allUnavailableIds = new Set(unavailableMethods.map(m => m.method.id));
                if (expandedMethods.size === 0 || !Array.from(expandedMethods).some(id => allUnavailableIds.has(id))) {
                  // Expand all unavailable
                  setExpandedMethods(new Set([...expandedMethods, ...allUnavailableIds]));
                } else {
                  // Collapse all unavailable
                  const newExpanded = new Set(expandedMethods);
                  allUnavailableIds.forEach(id => newExpanded.delete(id));
                  setExpandedMethods(newExpanded);
                }
              }}
              className="text-sm text-white/50 hover:text-white"
            >
              {expandedMethods.size > 0 && unavailableMethods.some(m => expandedMethods.has(m.method.id))
                ? 'Hide Details'
                : 'Show Details'
              }
            </button>
          </div>

          <div className={getLayoutClasses()}>
            {unavailableMethods.map((method) => (
              <PaymentMethodCard
                key={method.method.id}
                paymentMethod={method}
                isSelected={false}
                isRecommended={false}
                onSelect={() => {}} // Disabled
                showCostBreakdown={
                  showCostBreakdown &&
                  (viewMode === 'detailed' || isMobile) &&
                  expandedMethods.has(method.method.id)
                }
                className="w-full"
              />
            ))}
          </div>
        </div>
      )}

      {/* No Methods Available */}
      {displayedMethods.length === 0 && (
        <div className="text-center py-12">
          <div className="text-white/40 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            No Payment Methods Available
          </h3>
          <p className="text-white/70">
            Please check your network connection or try again later.
          </p>
        </div>
      )}

      {/* Metadata */}
      <div className="mt-8 pt-4 border-t border-white/20">
        <div className="flex items-center justify-between text-xs text-white/50">
          <div className="flex items-center space-x-4">
            <span>
              Updated: {prioritizationResult.metadata.calculatedAt.toLocaleTimeString()}
            </span>
            <span>
              Confidence: {Math.round(prioritizationResult.metadata.averageConfidence * 100)}%
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span>
              {prioritizationResult.metadata.totalMethodsEvaluated} methods evaluated
            </span>
            <span>•</span>
            <span>
              {prioritizationResult.metadata.processingTimeMs}ms
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodSelector;