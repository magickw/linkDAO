import React, { useState } from 'react';
import { PaymentMethod, PaymentMethodType, GasEstimate } from '../../types/paymentPrioritization';
import { paymentErrorHandlingService, PaymentErrorContext } from '../../services/paymentErrorHandlingService';
import { UnavailabilityReason } from '../../services/paymentMethodUnavailabilityHandler';
import GasFeeConfirmationModal from './GasFeeConfirmationModal';
import NetworkSwitchModal from './NetworkSwitchModal';
import PaymentUnavailableModal from './PaymentUnavailableModal';

const ErrorHandlingDemo: React.FC = () => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [showGasFeeModal, setShowGasFeeModal] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [showUnavailableModal, setShowUnavailableModal] = useState(false);
  const [errorResult, setErrorResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Mock data
  const mockPaymentMethods: PaymentMethod[] = [
    {
      id: 'usdc-1',
      name: 'USDC',
      description: 'USD Coin stablecoin',
      type: PaymentMethodType.STABLECOIN_USDC,
      icon: '💰',
      enabled: true,
      supportedNetworks: [1, 137, 56, 42161]
    },
    {
      id: 'eth-1',
      name: 'Ethereum',
      description: 'Native Ethereum token',
      type: PaymentMethodType.NATIVE_ETH,
      icon: '⟠',
      enabled: true,
      supportedNetworks: [1, 42161]
    },
    {
      id: 'stripe-1',
      name: 'Credit Card',
      description: 'Fiat payment via Stripe',
      type: PaymentMethodType.FIAT_STRIPE,
      icon: '💳',
      enabled: true,
      supportedNetworks: []
    },
    {
      id: 'usdt-1',
      name: 'USDT',
      description: 'Tether stablecoin',
      type: PaymentMethodType.STABLECOIN_USDT,
      icon: '💵',
      enabled: true,
      supportedNetworks: [1, 137, 56]
    }
  ];

  const mockGasEstimate: GasEstimate = {
    gasPrice: BigInt(150000000000), // 150 Gwei
    gasLimit: BigInt(21000),
    totalCost: BigInt('3150000000000000'), // 0.00315 ETH
    totalCostUSD: 75, // High gas fee in USD
    confidence: 0.8
  };

  const handleMethodSelect = async (method: PaymentMethod) => {
    setSelectedMethod(method);
    setIsLoading(true);

    try {
      const context: PaymentErrorContext = {
        selectedMethod: method,
        availableAlternatives: mockPaymentMethods.filter(m => m.id !== method.id),
        currentNetwork: 1, // Ethereum mainnet
        transactionAmount: 100,
        gasEstimate: method.type !== PaymentMethodType.FIAT_STRIPE ? mockGasEstimate : undefined
      };

      const result = await paymentErrorHandlingService.handlePaymentMethodErrors(context);
      setErrorResult(result);

      // Show appropriate modal based on error type
      switch (result.type) {
        case 'gas_fee_warning':
          setShowGasFeeModal(true);
          break;
        case 'network_unavailable':
          setShowNetworkModal(true);
          break;
        case 'method_unavailable':
          setShowUnavailableModal(true);
          break;
        case 'success':
          alert('Payment method is ready to use!');
          break;
      }
    } catch (error) {
      console.error('Error handling payment method:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGasFeeConfirm = () => {
    setShowGasFeeModal(false);
    alert('Proceeding with high gas fees');
  };

  const handleNetworkSwitch = async (chainId: number) => {
    setShowNetworkModal(false);
    alert(`Switching to network ${chainId}`);
  };

  const handleRetry = async () => {
    if (selectedMethod && errorResult?.unavailabilityResult) {
      const mockReason: UnavailabilityReason = {
        type: 'service_unavailable',
        message: 'Service temporarily unavailable'
      };

      const context: PaymentErrorContext = {
        selectedMethod,
        availableAlternatives: mockPaymentMethods.filter(m => m.id !== selectedMethod.id),
        currentNetwork: 1,
        transactionAmount: 100
      };

      const success = await paymentErrorHandlingService.handlePaymentRetry(
        selectedMethod,
        mockReason,
        context
      );

      if (success) {
        setShowUnavailableModal(false);
        alert('Retry successful!');
      } else {
        alert('Retry failed. Please try again later.');
      }
    }
  };

  const handleSelectAlternative = (method: PaymentMethod) => {
    setShowGasFeeModal(false);
    setShowNetworkModal(false);
    setShowUnavailableModal(false);
    alert(`Switched to ${method.name}`);
  };

  const handleTakeAction = (actionType: string, actionUrl?: string) => {
    setShowUnavailableModal(false);
    alert(`Taking action: ${actionType}${actionUrl ? ` - ${actionUrl}` : ''}`);
  };

  const simulateScenario = (scenario: string) => {
    let method: PaymentMethod;
    let gasEstimate: GasEstimate | undefined;

    switch (scenario) {
      case 'high_gas':
        method = mockPaymentMethods.find(m => m.type === PaymentMethodType.NATIVE_ETH)!;
        gasEstimate = { ...mockGasEstimate, totalCostUSD: 100 }; // Very high gas fee
        break;
      case 'network_error':
        method = mockPaymentMethods.find(m => m.type === PaymentMethodType.STABLECOIN_USDC)!;
        // This will trigger network unavailability in the demo
        break;
      case 'insufficient_balance':
        method = mockPaymentMethods.find(m => m.type === PaymentMethodType.NATIVE_ETH)!;
        // This will trigger unavailability handling
        break;
      default:
        return;
    }

    handleMethodSelect(method);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Payment Method Error Handling Demo
      </h1>

      {/* Scenario Buttons */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Test Scenarios</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => simulateScenario('high_gas')}
            className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors"
          >
            High Gas Fees
          </button>
          <button
            onClick={() => simulateScenario('network_error')}
            className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors"
          >
            Network Error
          </button>
          <button
            onClick={() => simulateScenario('insufficient_balance')}
            className="px-4 py-2 bg-orange-100 text-orange-800 rounded-lg hover:bg-orange-200 transition-colors"
          >
            Insufficient Balance
          </button>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Select Payment Method</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {mockPaymentMethods.map((method) => (
            <button
              key={method.id}
              onClick={() => handleMethodSelect(method)}
              disabled={isLoading}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-2xl mb-2">{method.icon}</div>
              <div className="font-medium text-gray-900">{method.name}</div>
              <div className="text-sm text-gray-600">{method.type.replace('_', ' ')}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Current Status */}
      {selectedMethod && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Current Status</h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{selectedMethod.icon}</span>
              <span className="font-medium">{selectedMethod.name}</span>
              {isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              )}
            </div>
            
            {errorResult && (
              <div className="mt-3">
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  errorResult.type === 'success' ? 'bg-green-100 text-green-800' :
                  errorResult.type === 'gas_fee_warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {errorResult.type.replace('_', ' ').toUpperCase()}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {errorResult.recommendedAction}
                </p>
                {errorResult.fallbackMethods && errorResult.fallbackMethods.length > 0 && (
                  <div className="mt-2">
                    <span className="text-xs text-gray-500">Alternatives: </span>
                    {errorResult.fallbackMethods.slice(0, 2).map((method: PaymentMethod, index: number) => (
                      <span key={index} className="text-xs text-blue-600">
                        {method.name}{index < Math.min(errorResult.fallbackMethods.length, 2) - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Handling Features */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Error Handling Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Gas Fee Threshold</h3>
            <p className="text-sm text-gray-600 mb-3">
              Warns users about high gas fees and suggests alternatives
            </p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• Warning threshold: $10</li>
              <li>• Blocking threshold: $50</li>
              <li>• Cost comparison</li>
              <li>• Alternative suggestions</li>
            </ul>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Network Compatibility</h3>
            <p className="text-sm text-gray-600 mb-3">
              Handles network switching and compatibility issues
            </p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• Network detection</li>
              <li>• Switch suggestions</li>
              <li>• Fallback methods</li>
              <li>• Setup instructions</li>
            </ul>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Method Availability</h3>
            <p className="text-sm text-gray-600 mb-3">
              Handles various payment method failures with retry logic
            </p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• Insufficient balance</li>
              <li>• Service unavailable</li>
              <li>• Network errors</li>
              <li>• Retry strategies</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modals */}
      {errorResult?.gasFeeResult && (
        <GasFeeConfirmationModal
          isOpen={showGasFeeModal}
          onClose={() => setShowGasFeeModal(false)}
          onConfirm={handleGasFeeConfirm}
          onSelectAlternative={handleSelectAlternative}
          handlingResult={errorResult.gasFeeResult}
          currentMethod={selectedMethod!}
          gasEstimate={mockGasEstimate}
        />
      )}

      {errorResult?.networkResult && (
        <NetworkSwitchModal
          isOpen={showNetworkModal}
          onClose={() => setShowNetworkModal(false)}
          onSwitchNetwork={handleNetworkSwitch}
          onSelectAlternative={handleSelectAlternative}
          onRetry={() => setShowNetworkModal(false)}
          handlingResult={errorResult.networkResult}
          preferredMethod={selectedMethod!}
        />
      )}

      {errorResult?.unavailabilityResult && (
        <PaymentUnavailableModal
          isOpen={showUnavailableModal}
          onClose={() => setShowUnavailableModal(false)}
          onSelectAlternative={handleSelectAlternative}
          onRetry={handleRetry}
          onTakeAction={handleTakeAction}
          handlingResult={errorResult.unavailabilityResult}
          unavailableMethod={selectedMethod!}
          reason={{
            type: 'service_unavailable',
            message: 'Service temporarily unavailable',
            details: 'The payment service is experiencing temporary issues. Please try again in a few minutes.'
          }}
        />
      )}
    </div>
  );
};

export default ErrorHandlingDemo;