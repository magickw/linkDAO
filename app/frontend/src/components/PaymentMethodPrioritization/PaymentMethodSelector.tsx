/**
 * Payment Method Selector Component
 * Compact-only view for displaying prioritized payment methods
 */

import React, { useState, useEffect, useMemo } from 'react';
import PaymentMethodCard from './PaymentMethodCard';
import {
  PrioritizedPaymentMethod,
  PaymentMethodType,
  PrioritizationResult,
  AvailabilityStatus
} from '../../types/paymentPrioritization';
import { groupPaymentMethods, GroupedPaymentMethods } from '../../utils/networkUtils';

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
  layout?: 'grid' | 'list' | 'auto';
  responsive?: boolean;
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  prioritizationResult,
  selectedMethodId,
  onMethodSelect,
  onMethodChange,
  showCostBreakdown = false,
  showRecommendations: _showRecommendations = true,
  showWarnings = true,
  maxDisplayMethods = 6,
  className = '',
  layout = 'list',
  responsive = true
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PrioritizedPaymentMethod | null>(null);
  const [expandedMethods, setExpandedMethods] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [showTestnets, setShowTestnets] = useState(false);

  // Responsive detection
  useEffect(() => {
    if (!responsive) return;

    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < 768;
      setIsMobile(isMobileDevice);
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

  // Filter and limit displayed methods
  const displayedMethods = useMemo(() => {
    return prioritizationResult.prioritizedMethods
      .slice(0, maxDisplayMethods)
      .sort((a, b) => a.priority - b.priority);
  }, [prioritizationResult.prioritizedMethods, maxDisplayMethods]);

  const availableMethods = displayedMethods.filter(
    method => method.availabilityStatus === AvailabilityStatus.AVAILABLE
  );

  const unavailableMethods = displayedMethods.filter(
    method => method.availabilityStatus !== AvailabilityStatus.AVAILABLE
  );

  const getRecommendedMethod = (): PrioritizedPaymentMethod | null => {
    return availableMethods.length > 0 ? availableMethods[0] : null;
  };

  const recommendedMethod = getRecommendedMethod();

  // Group available methods by network type
  const groupedMethods: GroupedPaymentMethods = useMemo(() => {
    return groupPaymentMethods(availableMethods);
  }, [availableMethods]);

  return (
    <div className={`payment-method-selector ${className}`}>
      {/* Header - Simple, no toggle */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Choose Payment Method
          </h2>
          <p className="text-sm text-white/70 mt-1">
            {availableMethods.length} payment {availableMethods.length === 1 ? 'option' : 'options'} available
          </p>
        </div>
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

      {/* Grouped Payment Methods */}
      {availableMethods.length > 0 && (
        <div className="mb-6 space-y-6">
          {/* Fiat Payment Methods */}
          {groupedMethods.fiat.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="2" y="6" width="20" height="12" rx="2" strokeWidth="2" />
                  <path d="M2 10h20" strokeWidth="2" />
                </svg>
                Credit/Debit Card
              </h3>
              <div className="space-y-3">
                {groupedMethods.fiat.map((method) => (
                  <PaymentMethodCard
                    key={method.method.id}
                    paymentMethod={method}
                    isSelected={selectedMethod?.method.id === method.method.id}
                    isRecommended={recommendedMethod?.method.id === method.method.id}
                    onSelect={handleMethodSelect}
                    viewMode="compact"
                    showCostBreakdown={showCostBreakdown}
                    showBenefits={false}
                    showNetworkDetails={false}
                    className="w-full"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Mainnet L1 */}
          {groupedMethods.mainnetL1.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                Mainnet (Layer 1)
              </h3>
              <div className="space-y-3">
                {groupedMethods.mainnetL1.map((method) => (
                  <PaymentMethodCard
                    key={method.method.id}
                    paymentMethod={method}
                    isSelected={selectedMethod?.method.id === method.method.id}
                    isRecommended={recommendedMethod?.method.id === method.method.id}
                    onSelect={handleMethodSelect}
                    viewMode="compact"
                    showCostBreakdown={showCostBreakdown}
                    showBenefits={false}
                    showNetworkDetails={true}
                    className="w-full"
                  />
                ))}
              </div>
            </div>
          )}

          {/* L2 Solutions */}
          {groupedMethods.l2Solutions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                Layer 2 Solutions
                <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">Lower Fees</span>
              </h3>
              <div className="space-y-3">
                {groupedMethods.l2Solutions.map((method) => (
                  <PaymentMethodCard
                    key={method.method.id}
                    paymentMethod={method}
                    isSelected={selectedMethod?.method.id === method.method.id}
                    isRecommended={recommendedMethod?.method.id === method.method.id}
                    onSelect={handleMethodSelect}
                    viewMode="compact"
                    showCostBreakdown={showCostBreakdown}
                    showBenefits={false}
                    showNetworkDetails={true}
                    className="w-full"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Testnets - Collapsible */}
          {groupedMethods.testnets.length > 0 && (
            <div>
              <button
                onClick={() => setShowTestnets(!showTestnets)}
                className="w-full text-left mb-3 flex items-center justify-between text-sm font-semibold text-white/60 hover:text-white/80 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                  Testnets
                  <span className="text-xs text-gray-400 bg-gray-400/10 px-2 py-0.5 rounded-full">For Testing</span>
                </div>
                <svg
                  className={`w-4 h-4 transition-transform ${showTestnets ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showTestnets && (
                <div className="space-y-3">
                  {groupedMethods.testnets.map((method) => (
                    <PaymentMethodCard
                      key={method.method.id}
                      paymentMethod={method}
                      isSelected={selectedMethod?.method.id === method.method.id}
                      isRecommended={false}
                      onSelect={handleMethodSelect}
                      viewMode="compact"
                      showCostBreakdown={showCostBreakdown}
                      showBenefits={false}
                      showNetworkDetails={true}
                      className="w-full opacity-75"
                    />
                  ))}
                </div>
              )}
            </div>
          )}
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
                  setExpandedMethods(new Set([...expandedMethods, ...allUnavailableIds]));
                } else {
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

          <div className="space-y-3">
            {unavailableMethods.map((method) => (
              <PaymentMethodCard
                key={method.method.id}
                paymentMethod={method}
                isSelected={false}
                isRecommended={false}
                onSelect={() => { }}
                viewMode="compact"
                showCostBreakdown={false}
                showBenefits={false}
                showNetworkDetails={false}
                className="w-full opacity-60"
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