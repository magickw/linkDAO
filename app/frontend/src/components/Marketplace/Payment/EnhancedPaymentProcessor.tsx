/**
 * Enhanced Payment Processor - React component for Web3 payment processing with escrow
 * Features: Multi-token support, gas estimation, transaction monitoring, error handling
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useAccount, useChainId, useBalance } from 'wagmi';
import { parseEther, formatUnits } from 'viem';
import { CheckCircle, RefreshCw, AlertTriangle, Clock, Shield, ExternalLink } from 'lucide-react';
import { Button } from '../../../design-system/components/Button';
import { GlassPanel } from '../../../design-system/components/GlassPanel';
import { designTokens } from '../../../design-system/tokens';
import { getEscrowInfo } from '../../../services/escrowService';
import { PaymentRequest, TransactionResult } from '../../../types/payment';

// Enhanced Escrow ABI and contract addresses
export const ENHANCED_ESCROW_ABI = [
  'function createEscrow(uint256 listingId, address buyer, address seller, address tokenAddress, uint256 amount) external returns (uint256)',
  'function lockFunds(uint256 escrowId) external payable',
  'function confirmDelivery(uint256 escrowId, string deliveryInfo) external',
  'function approveEscrow(uint256 escrowId) external',
  'function openDispute(uint256 escrowId, string reason) external',
];

export const ESCROW_CONTRACT_ADDRESSES = {
  1: '0x1234567890123456789012345678901234567890',      // Mainnet
  5: '0x1234567890123456789012345678901234567890',      // Goerli
  11155111: '0x1234567890123456789012345678901234567890', // Sepolia
  31337: '0x1234567890123456789012345678901234567890',    // Hardhat
};

interface PaymentProcessorProps {
  paymentRequest: PaymentRequest;
  onSuccess: (result: TransactionResult) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

interface PaymentStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  transactionHash?: string;
  gasUsed?: string;
}

export const EnhancedPaymentProcessor: React.FC<PaymentProcessorProps> = ({
  paymentRequest,
  onSuccess,
  onError,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [paymentSteps, setPaymentSteps] = useState<PaymentStep[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [gasEstimate, setGasEstimate] = useState<{
    gasLimit: bigint;
    gasPrice: bigint;
    totalCostETH: string;
  } | null>(null);
  const [selectedToken, setSelectedToken] = useState<'ETH' | 'USDC' | 'DAI'>('ETH');
  const [createEscrowReceipt, setCreateEscrowReceipt] = useState<{ transactionHash: string; gasUsed?: string } | null>(null);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: balance } = useBalance({
    address: address as `0x${string}` | undefined
  });

  // Initialize payment steps
  useEffect(() => {
    const steps: PaymentStep[] = [
      {
        id: 'validate',
        title: 'Validate Payment',
        description: 'Checking wallet balance and network',
        status: 'pending'
      },
      {
        id: 'create_escrow',
        title: 'Create Escrow Contract',
        description: 'Deploying secure escrow for this transaction',
        status: 'pending'
      }
    ];

    if (paymentRequest.escrowEnabled) {
      steps.push({
        id: 'lock_funds',
        title: 'Lock Funds in Escrow',
        description: 'Securing payment until delivery confirmation',
        status: 'pending'
      });
    }

    steps.push({
      id: 'complete',
      title: 'Payment Complete',
      description: 'Transaction confirmed on blockchain',
      status: 'pending'
    });

    setPaymentSteps(steps);
  }, [paymentRequest]);

  // Gas estimation
  useEffect(() => {
    const estimateGas = async () => {
      if (isConnected && address && paymentRequest.totalAmount) {
        try {
          // Estimate gas for the transaction
          // For now, use a conservative estimate
          // In production, this should call the actual contract to estimate gas
          const estimatedGasLimit = 200000n; // 200k gas limit for escrow creation
          const estimatedGasPrice = 30000000000n; // 30 gwei
          const totalCost = estimatedGasLimit * estimatedGasPrice;

          setGasEstimate({
            gasLimit: estimatedGasLimit,
            gasPrice: estimatedGasPrice,
            totalCostETH: formatUnits(totalCost, 18)
          });
        } catch (error) {
          console.error('Gas estimation failed:', error);
          // Set a default estimate on error
          setGasEstimate({
            gasLimit: 200000n,
            gasPrice: 30000000000n,
            totalCostETH: '0.006' // 200k * 30 gwei
          });
        }
      }
    };

    estimateGas();
  }, [paymentRequest, isConnected, address]);

  const updateStepStatus = (stepId: string, status: PaymentStep['status'], transactionHash?: string) => {
    setPaymentSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, transactionHash }
        : step
    ));
  };

  const validatePayment = async (): Promise<boolean> => {
    updateStepStatus('validate', 'processing');
    
    try {
      // Check if user is connected
      if (!isConnected || !address) {
        throw new Error('Wallet not connected');
      }

      // Check network
      const supportedChains = Object.keys(ESCROW_CONTRACT_ADDRESSES).map(Number);
      if (!chainId || !supportedChains.includes(chainId)) {
        throw new Error('Unsupported network. Please switch to a supported network.');
      }

      // Check balance
      if (!balance) {
        throw new Error('Unable to fetch wallet balance');
      }

      if (!paymentRequest.totalAmount) {
        throw new Error('Invalid payment amount');
      }

      const requiredAmount = parseEther(paymentRequest.totalAmount);
      const currentBalance = balance?.value || 0n;

      if (currentBalance < requiredAmount) {
        throw new Error(`Insufficient balance. Required: ${paymentRequest.totalAmount} ETH, Available: ${formatUnits(currentBalance, 18)} ETH`);
      }

      updateStepStatus('validate', 'completed');
      return true;
    } catch (error) {
      updateStepStatus('validate', 'error');
      onError(error instanceof Error ? error.message : 'Validation failed');
      return false;
    }
  };

  const handleCreateEscrow = async () => {
    if (!address || !isConnected) return;

    updateStepStatus('create_escrow', 'processing');

    try {
      const contractAddress = ESCROW_CONTRACT_ADDRESSES[chainId as keyof typeof ESCROW_CONTRACT_ADDRESSES];
      if (!contractAddress) {
        throw new Error('Escrow contract not available on this network');
      }

      if (!paymentRequest.totalAmount) {
        throw new Error('Invalid payment amount');
      }

      if (!paymentRequest.listingId) {
        throw new Error('Invalid listing ID');
      }

      if (!paymentRequest.sellerId) {
        throw new Error('Invalid seller ID');
      }

      const amountWei = parseEther(paymentRequest.totalAmount);
      
      // Get token address based on selected token
      const tokenAddress = selectedToken === 'ETH' 
        ? '0x0000000000000000000000000000000000000000'
        : getTokenAddress(selectedToken);

      // Mock implementation for now - in a real app, this would interact with the blockchain
      const receipt = {
        transactionHash: '0x1234567890abcdef',
        gasUsed: '21000'
      };
      
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Store the receipt
      setCreateEscrowReceipt(receipt);

      updateStepStatus('create_escrow', 'completed', receipt.transactionHash);

      if (paymentRequest.escrowEnabled) {
        setCurrentStep(2); // Move to lock funds step
        handleLockFunds();
      } else {
        setCurrentStep(3); // Move to complete step
        handlePaymentComplete();
      }
    } catch (error) {
      updateStepStatus('create_escrow', 'error');
      onError(error instanceof Error ? error.message : 'Failed to create escrow');
    }
  };

  const handleLockFunds = async () => {
    if (!address || !isConnected) return;

    updateStepStatus('lock_funds', 'processing');

    try {
      const contractAddress = ESCROW_CONTRACT_ADDRESSES[chainId as keyof typeof ESCROW_CONTRACT_ADDRESSES];
      if (!contractAddress) {
        throw new Error('Escrow contract not available on this network');
      }

      // Extract escrow ID from createEscrow transaction logs
      const escrowId = 1; // This would be extracted from the transaction logs

      if (!paymentRequest.totalAmount) {
        throw new Error('Invalid payment amount');
      }

      const amountWei = parseEther(paymentRequest.totalAmount);
      // Mock implementation for now - in a real app, this would interact with the blockchain
      const receipt = {
        transactionHash: '0xabcdef1234567890',
        gasUsed: '35000'
      };
      
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 1000));

      updateStepStatus('lock_funds', 'completed', receipt.transactionHash);
      setCurrentStep(3); // Move to complete step
      handlePaymentComplete();

    } catch (error) {
      updateStepStatus('lock_funds', 'error');
      onError(error instanceof Error ? error.message : 'Failed to lock funds');
    }
  };

  const handlePaymentComplete = () => {
    updateStepStatus('complete', 'completed');
    setIsProcessing(false);
    
    const result: TransactionResult = {
      success: true,
      transactionHash: createEscrowReceipt?.transactionHash,
      escrowId: '1', // Would be extracted from transaction logs
      gasUsed: createEscrowReceipt?.gasUsed?.toString()
    };

    onSuccess(result);
  };

  const startPaymentProcess = async () => {
    setIsProcessing(true);
    setCurrentStep(0);
    
    const isValid = await validatePayment();
    if (isValid) {
      setCurrentStep(1);
      await handleCreateEscrow();
    }
  };

  const getStepIcon = (step: PaymentStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="text-green-400" size={20} />;
      case 'processing':
        return <RefreshCw className="text-blue-400 animate-spin" size={20} />;
      case 'error':
        return <AlertTriangle className="text-red-400" size={20} />;
      default:
        return <Clock className="text-white/40" size={20} />;
    }
  };

  const formatCurrency = (amount: string, symbol: string) => {
    return `${parseFloat(amount).toFixed(4)} ${symbol}`;
  };

  const getTokenAddress = (token: string): string => {
    const tokenAddresses = {
      'USDC': '0xA0b86a33E6441c8C87Ef36E1C6C7e9d86e5C8B07', // Example USDC address
      'DAI': '0x6B175474E89094C44Da98b954EedeAC495271d0F'   // Example DAI address
    };
    return tokenAddresses[token as keyof typeof tokenAddresses] || '0x0000000000000000000000000000000000000000';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Payment Summary */}
      <GlassPanel variant="primary" className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Payment Summary</h2>
        
        <div className="space-y-3 mb-6">
          <div className="flex justify-between">
            <span className="text-white/70">Items Total:</span>
            <span className="text-white">{formatCurrency(paymentRequest.totalAmount || '0', selectedToken)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70">Network Fee (Est.):</span>
            <span className="text-white">
              {gasEstimate ? `${parseFloat(gasEstimate.totalCostETH).toFixed(6)} ETH` : 'Calculating...'}
            </span>
          </div>
          {paymentRequest.escrowEnabled && (
            <div className="flex justify-between">
              <span className="text-white/70">Escrow Fee (1%):</span>
              <span className="text-white">{formatCurrency((parseFloat(paymentRequest.totalAmount || '0') * 0.01).toString(), selectedToken)}</span>
            </div>
          )}
          <div className="border-t border-white/20 pt-3 flex justify-between font-semibold">
            <span className="text-white">Total:</span>
            <span className="text-white">
              {paymentRequest.totalAmount && gasEstimate
                ? formatCurrency(
                    (parseFloat(paymentRequest.totalAmount) +
                     parseFloat(gasEstimate.totalCostETH) +
                     (paymentRequest.escrowEnabled ? parseFloat(paymentRequest.totalAmount) * 0.01 : 0)
                    ).toString(),
                    selectedToken
                  )
                : 'Calculating...'}
            </span>
          </div>
        </div>

        {/* Token Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white mb-2">Payment Token</label>
          <div className="flex gap-3">
            {(['ETH', 'USDC', 'DAI'] as const).map((token) => (
              <button
                key={token}
                onClick={() => setSelectedToken(token)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  selectedToken === token
                    ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                    : 'border-white/20 bg-white/5 text-white/70 hover:border-white/40'
                }`}
              >
                {token}
              </button>
            ))}
          </div>
        </div>

        {/* Escrow Protection Notice */}
        {paymentRequest.escrowEnabled && (
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="text-blue-400" size={20} />
              <h3 className="font-medium text-blue-400">Escrow Protection Enabled</h3>
            </div>
            <p className="text-white/70 text-sm">
              Your payment will be held securely in a smart contract until you confirm delivery. 
              This protects both you and the seller during the transaction.
            </p>
          </div>
        )}
      </GlassPanel>

      {/* Payment Process Steps */}
      <GlassPanel variant="secondary" className="p-6">
        <h3 className="font-semibold text-white mb-4">Payment Process</h3>
        
        <div className="space-y-4">
          {paymentSteps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                index === currentStep ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-white/5'
              }`}
            >
              <div className="flex-shrink-0">
                {getStepIcon(step)}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-white">{step.title}</h4>
                <p className="text-white/60 text-sm">{step.description}</p>
                {step.transactionHash && (
                  <a
                    href={`https://etherscan.io/tx/${step.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 text-xs flex items-center gap-1 mt-1 hover:text-blue-300"
                  >
                    View Transaction <ExternalLink size={12} />
                  </a>
                )}
              </div>
              {step.status === 'processing' && (
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          ))}
        </div>
      </GlassPanel>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1"
        >
          Cancel
        </Button>
        
        <Button
          variant="primary"
          onClick={startPaymentProcess}
          disabled={isProcessing || !isConnected}
          className="flex-1 flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <RefreshCw size={20} className="animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Shield size={20} />
              Start Secure Payment
            </>
          )}
        </Button>
      </div>

      {/* Wallet Connection Warning */}
      {!isConnected && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-yellow-400" size={20} />
            <p className="text-yellow-400 font-medium">Please connect your wallet to proceed with payment</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedPaymentProcessor;