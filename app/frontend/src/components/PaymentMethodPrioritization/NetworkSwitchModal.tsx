import React, { useState } from 'react';
import { PaymentMethod } from '../../types/paymentPrioritization';
import { NetworkHandlingResult, NetworkInfo } from '../../services/networkUnavailabilityHandler';

interface NetworkSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchNetwork: (chainId: number) => void;
  onSelectAlternative: (method: PaymentMethod) => void;
  onRetry: () => void;
  handlingResult: NetworkHandlingResult;
  preferredMethod: PaymentMethod;
  currentNetwork?: NetworkInfo;
}

export const NetworkSwitchModal: React.FC<NetworkSwitchModalProps> = ({
  isOpen,
  onClose,
  onSwitchNetwork,
  onSelectAlternative,
  onRetry,
  handlingResult,
  preferredMethod,
  currentNetwork
}) => {
  const [showInstructions, setShowInstructions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleNetworkSwitch = async () => {
    if (handlingResult.targetNetwork) {
      setIsLoading(true);
      try {
        await onSwitchNetwork(handlingResult.targetNetwork);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const renderContent = () => {
    switch (handlingResult.action) {
      case 'suggest_network_switch':
        return (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Switch Network</h3>
            </div>

            <p className="text-gray-700 mb-4">{handlingResult.userMessage}</p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-blue-900">Recommended Network</h4>
                  <p className="text-sm text-blue-700">{handlingResult.targetNetworkName}</p>
                </div>
                <button
                  onClick={handleNetworkSwitch}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Switching...' : 'Switch Network'}
                </button>
              </div>
            </div>

            {handlingResult.migrationInstructions && (
              <div className="mb-4">
                <button
                  onClick={() => setShowInstructions(!showInstructions)}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  <span>Manual setup instructions</span>
                  <svg 
                    className={`w-4 h-4 transition-transform ${showInstructions ? 'rotate-180' : ''}`}
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>

                {showInstructions && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                      {handlingResult.migrationInstructions}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </>
        );

      case 'suggest_alternatives':
        return (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Alternative Payment Methods</h3>
            </div>

            <p className="text-gray-700 mb-4">{handlingResult.userMessage}</p>

            {handlingResult.alternatives && (
              <div className="space-y-2 mb-4">
                {handlingResult.alternatives.map((method, index) => (
                  <button
                    key={index}
                    onClick={() => onSelectAlternative(method)}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-gray-900">{method.name}</div>
                        <div className="text-sm text-gray-600">
                          {method.type === 'FIAT_STRIPE' && 'No network required'}
                          {method.type === 'STABLECOIN_USDC' && 'Available on current network'}
                          {method.type === 'STABLECOIN_USDT' && 'Available on current network'}
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        );

      case 'show_fiat_option':
        return (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zM14 6a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h8zM6 8a2 2 0 012 2v1a2 2 0 01-2 2H5V8h1zM16 10a2 2 0 01-2 2h-1V8h1a2 2 0 012 2v0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Use Fiat Payment</h3>
            </div>

            <p className="text-gray-700 mb-4">{handlingResult.userMessage}</p>

            {handlingResult.alternatives && handlingResult.alternatives[0] && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-green-900">
                      {handlingResult.alternatives[0].name}
                    </h4>
                    <p className="text-sm text-green-700">No network or gas fees required</p>
                  </div>
                  <button
                    onClick={() => onSelectAlternative(handlingResult.alternatives![0])}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Use Fiat
                  </button>
                </div>
              </div>
            )}
          </>
        );

      case 'show_error':
      default:
        return (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Network Error</h3>
            </div>

            <p className="text-gray-700 mb-4">{handlingResult.userMessage}</p>

            {handlingResult.canRetry && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Try Again</h4>
                    <p className="text-sm text-gray-600">Check your connection and retry</p>
                  </div>
                  <button
                    onClick={onRetry}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}
          </>
        );
    }
  };

  const renderActionButtons = () => {
    switch (handlingResult.action) {
      case 'suggest_network_switch':
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
                Use Alternative
              </button>
            )}
          </div>
        );

      case 'suggest_alternatives':
      case 'show_fiat_option':
        return (
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        );

      case 'show_error':
      default:
        return (
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
            {handlingResult.canRetry && (
              <button
                onClick={onRetry}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="p-6">
          {renderContent()}
          {renderActionButtons()}
        </div>
      </div>
    </div>
  );
};

export default NetworkSwitchModal;