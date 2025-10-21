import React, { useState } from 'react';
import { PaymentMethod, GasEstimate } from '../../types/paymentPrioritization';
import { GasFeeHandlingResult, CostComparison } from '../../services/gasFeeThresholdHandler';

interface GasFeeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onSelectAlternative: (method: PaymentMethod) => void;
  handlingResult: GasFeeHandlingResult;
  currentMethod: PaymentMethod;
  gasEstimate: GasEstimate;
}

export const GasFeeConfirmationModal: React.FC<GasFeeConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onSelectAlternative,
  handlingResult,
  currentMethod,
  gasEstimate
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!isOpen) return null;

  const renderActionButtons = () => {
    switch (handlingResult.action) {
      case 'block_transaction':
        return (
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            {handlingResult.alternatives && handlingResult.alternatives.length > 0 && (
              <button
                onClick={() => onSelectAlternative(handlingResult.alternatives![0])}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Use {handlingResult.alternatives[0].name}
              </button>
            )}
          </div>
        );

      case 'suggest_alternatives':
        return (
          <div className="flex gap-3">
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Continue with {currentMethod.name}
            </button>
            {handlingResult.alternatives && handlingResult.alternatives.length > 0 && (
              <button
                onClick={() => onSelectAlternative(handlingResult.alternatives![0])}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Switch to {handlingResult.alternatives[0].name}
              </button>
            )}
          </div>
        );

      case 'warn':
      default:
        return (
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              Proceed Anyway
            </button>
          </div>
        );
    }
  };

  const getModalColor = () => {
    switch (handlingResult.action) {
      case 'block_transaction':
        return 'border-red-500';
      case 'suggest_alternatives':
        return 'border-yellow-500';
      case 'warn':
        return 'border-orange-500';
      default:
        return 'border-gray-300';
    }
  };

  const getIconColor = () => {
    switch (handlingResult.action) {
      case 'block_transaction':
        return 'text-red-500';
      case 'suggest_alternatives':
        return 'text-yellow-500';
      case 'warn':
        return 'text-orange-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-xl max-w-md w-full border-2 ${getModalColor()}`}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getIconColor()}`}>
              {handlingResult.action === 'block_transaction' && (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              {handlingResult.action === 'suggest_alternatives' && (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
              {handlingResult.action === 'warn' && (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {handlingResult.action === 'block_transaction' && 'High Gas Fees Detected'}
              {handlingResult.action === 'suggest_alternatives' && 'Save Money on Gas Fees'}
              {handlingResult.action === 'warn' && 'Gas Fee Warning'}
            </h3>
          </div>

          {/* Message */}
          <p className="text-gray-700 mb-4">{handlingResult.message}</p>

          {/* Gas Fee Details */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Current Gas Fee:</span>
              <span className="font-semibold text-gray-900">
                ${gasEstimate.totalCostUSD?.toFixed(2) || '0.00'}
              </span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-sm text-gray-600">Gas Price:</span>
              <span className="text-sm text-gray-700">
                {Number(gasEstimate.gasPrice) / 1e9 || 0} Gwei
              </span>
            </div>
          </div>

          {/* Cost Comparison */}
          {handlingResult.costComparison && handlingResult.costComparison.length > 0 && (
            <div className="mb-4">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-2"
              >
                <span>View cost comparison</span>
                <svg 
                  className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`}
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {showDetails && (
                <div className="space-y-2">
                  {handlingResult.costComparison.map((comparison, index) => (
                    <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-green-800">
                          {comparison.method.name}
                        </span>
                        <div className="text-right">
                          <div className="text-green-700 font-semibold">
                            Save ${comparison.savings.toFixed(2)}
                          </div>
                          <div className="text-xs text-green-600">
                            ({comparison.savingsPercentage.toFixed(1)}% less)
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-green-700 mt-1">
                        Total cost: ${comparison.totalCost.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Alternative Methods */}
          {handlingResult.alternatives && handlingResult.alternatives.length > 1 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Alternative Payment Methods:</h4>
              <div className="space-y-2">
                {handlingResult.alternatives.slice(1).map((method, index) => (
                  <button
                    key={index}
                    onClick={() => onSelectAlternative(method)}
                    className="w-full text-left p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{method.name}</span>
                      <span className="text-xs text-gray-500">
                        {method.type === 'FIAT_STRIPE' ? 'No gas fees' : 'Lower gas fees'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {renderActionButtons()}
        </div>
      </div>
    </div>
  );
};

export default GasFeeConfirmationModal;