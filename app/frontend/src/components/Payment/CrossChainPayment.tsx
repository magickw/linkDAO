import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { crossChainService, CHAIN_CONFIGS, BRIDGE_ADDRESSES } from '../../services/web3/crossChainService';
import { safeLogger } from '../../utils/safeLogger';

interface CrossChainPaymentProps {
  amount: string;
  recipient: string;
  onPaymentComplete?: (txHash: string) => void;
  onError?: (error: string) => void;
}

/**
 * Cross-Chain Payment Component
 * Allows users to make payments across different blockchain networks
 */
export const CrossChainPayment: React.FC<CrossChainPaymentProps> = ({
  amount,
  recipient,
  onPaymentComplete,
  onError
}) => {
  const [sourceChain, setSourceChain] = useState<keyof typeof CHAIN_CONFIGS>('ETHEREUM');
  const [destinationChain, setDestinationChain] = useState<keyof typeof CHAIN_CONFIGS>('POLYGON');
  const [balance, setBalance] = useState<string>('0');
  const [bridgeFee, setBridgeFee] = useState<string>('0');
  const [totalAmount, setTotalAmount] = useState<string>('0');
  const [estimatedGas, setEstimatedGas] = useState<string>('0');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSwitchingChain, setIsSwitchingChain] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentChainId, setCurrentChainId] = useState<number>(0);

  // Get supported chains
  const supportedChains = Object.entries(CHAIN_CONFIGS) as [keyof typeof CHAIN_CONFIGS, typeof CHAIN_CONFIGS[keyof typeof CHAIN_CONFIGS]][];

  // Calculate fee when chains or amount change
  useEffect(() => {
    if (amount && sourceChain !== destinationChain) {
      crossChainService.calculateBridgeFee(sourceChain, destinationChain, amount)
        .then(feeInfo => {
          setBridgeFee(feeInfo.fee);
          setTotalAmount(feeInfo.totalAmount);
          setEstimatedGas(feeInfo.estimatedGas);
        })
        .catch(err => {
          safeLogger.error('Error calculating bridge fee:', err);
          setError('Failed to calculate bridge fee');
        });
    }
  }, [amount, sourceChain, destinationChain]);

  // Check balance when source chain changes
  useEffect(() => {
    // In a real app, you'd get the user's wallet address here
    const userAddress = '0x0000000000000000000000000000000000000000'; // Placeholder

    crossChainService.checkBalance(CHAIN_CONFIGS[sourceChain].chainId, userAddress)
      .then(setBalance)
      .catch(err => {
        safeLogger.error('Error checking balance:', err);
      });
  }, [sourceChain]);

  // Detect current chain
  useEffect(() => {
    const detectChain = async () => {
      try {
        if (typeof window !== 'undefined' && (window as any).ethereum) {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          const network = await provider.getNetwork();
          setCurrentChainId(Number(network.chainId));
        }
      } catch (err) {
        safeLogger.error('Error detecting chain:', err);
      }
    };

    detectChain();
  }, []);

  const handleSourceChainChange = async (chain: keyof typeof CHAIN_CONFIGS) => {
    if (chain === destinationChain) {
      setError('Source and destination chains must be different');
      return;
    }

    setSourceChain(chain);
    setError(null);

    // Switch wallet to selected chain
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        setIsSwitchingChain(true);
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        await crossChainService.switchChain(CHAIN_CONFIGS[chain].chainId, signer);
        setCurrentChainId(CHAIN_CONFIGS[chain].chainId);
      } catch (err) {
        safeLogger.error('Error switching chain:', err);
        setError('Failed to switch chain. Please switch manually in your wallet.');
      } finally {
        setIsSwitchingChain(false);
      }
    }
  };

  const handleDestinationChainChange = (chain: keyof typeof CHAIN_CONFIGS) => {
    if (chain === sourceChain) {
      setError('Source and destination chains must be different');
      return;
    }

    setDestinationChain(chain);
    setError(null);
  };

  const handlePayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (parseFloat(amount) > parseFloat(balance)) {
      setError('Insufficient balance');
      return;
    }

    if (sourceChain === destinationChain) {
      setError('Source and destination chains must be different');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();

        const txHash = await crossChainService.initiateBridge({
          amount,
          sourceChain,
          destinationChain,
          recipient
        }, signer);

        if (onPaymentComplete) {
          onPaymentComplete(txHash);
        }
      } else {
        throw new Error('No wallet connected');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const formatAmount = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    return num.toFixed(4);
  };

  const isBridgeAvailable = (chain: keyof typeof CHAIN_CONFIGS) => {
    const chainId = CHAIN_CONFIGS[chain].chainId;
    return BRIDGE_ADDRESSES[chain] && BRIDGE_ADDRESSES[chain] !== '';
  };

  return (
    <div className="cross-chain-payment">
      <div style={{
        background: '#f5f5f5',
        padding: '1.5rem',
        borderRadius: '8px',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <h2 style={{
          margin: '0 0 1.5rem 0',
          fontSize: '1.5rem',
          fontWeight: '600'
        }}>
          Cross-Chain Payment
        </h2>

        {/* Amount Display */}
        <div style={{
          background: '#fff',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
            Amount to Send
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '700' }}>
            {formatAmount(amount)} LDAO
          </div>
        </div>

        {/* Chain Selection */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            marginBottom: '0.5rem'
          }}>
            From Chain
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
            {supportedChains.map(([key, config]) => (
              <button
                key={key}
                onClick={() => handleSourceChainChange(key)}
                disabled={!isBridgeAvailable(key) || isSwitchingChain}
                style={{
                  padding: '0.75rem',
                  border: '2px solid',
                  borderColor: sourceChain === key ? '#4CAF50' : '#ddd',
                  borderRadius: '8px',
                  background: sourceChain === key ? '#e8f5e9' : '#fff',
                  cursor: isBridgeAvailable(key) && !isSwitchingChain ? 'pointer' : 'not-allowed',
                  opacity: isBridgeAvailable(key) ? 1 : 0.5,
                  fontSize: '0.875rem',
                  fontWeight: sourceChain === key ? '600' : '400',
                  transition: 'all 0.2s ease'
                }}
              >
                {config.name}
                {!isBridgeAvailable(key) && ' (Coming Soon)'}
              </button>
            ))}
          </div>
        </div>

        {/* Chain Arrow */}
        <div style={{
          textAlign: 'center',
          marginBottom: '1.5rem',
          color: '#666',
          fontSize: '1.5rem'
        }}>
          ⬇️
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            marginBottom: '0.5rem'
          }}>
            To Chain
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
            {supportedChains.map(([key, config]) => (
              <button
                key={key}
                onClick={() => handleDestinationChainChange(key)}
                disabled={!isBridgeAvailable(key) || key === sourceChain}
                style={{
                  padding: '0.75rem',
                  border: '2px solid',
                  borderColor: destinationChain === key ? '#4CAF50' : '#ddd',
                  borderRadius: '8px',
                  background: destinationChain === key ? '#e8f5e9' : '#fff',
                  cursor: isBridgeAvailable(key) && key !== sourceChain ? 'pointer' : 'not-allowed',
                  opacity: isBridgeAvailable(key) ? 1 : 0.5,
                  fontSize: '0.875rem',
                  fontWeight: destinationChain === key ? '600' : '400',
                  transition: 'all 0.2s ease'
                }}
              >
                {config.name}
                {!isBridgeAvailable(key) && ' (Coming Soon)'}
              </button>
            ))}
          </div>
        </div>

        {/* Balance Display */}
        <div style={{
          background: '#fff',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.875rem', color: '#666' }}>
            Available Balance ({CHAIN_CONFIGS[sourceChain].name})
          </span>
          <span style={{ fontSize: '1.125rem', fontWeight: '600' }}>
            {formatAmount(balance)} LDAO
          </span>
        </div>

        {/* Fee Breakdown */}
        {bridgeFee && (
          <div style={{
            background: '#fff',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '0.5rem',
              fontSize: '0.875rem'
            }}>
              <span style={{ color: '#666' }}>Amount</span>
              <span style={{ fontWeight: '500' }}>{formatAmount(amount)} LDAO</span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '0.5rem',
              fontSize: '0.875rem'
            }}>
              <span style={{ color: '#666' }}>Bridge Fee</span>
              <span style={{ fontWeight: '500' }}>{formatAmount(bridgeFee)} LDAO</span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: '0.5rem',
              borderTop: '1px solid #eee',
              fontSize: '0.875rem'
            }}>
              <span style={{ color: '#666' }}>Total</span>
              <span style={{ fontWeight: '600', color: '#4CAF50' }}>
                {formatAmount(totalAmount)} LDAO
              </span>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div style={{
            background: '#fee',
            border: '1px solid #fcc',
            color: '#c33',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        {/* Payment Button */}
        <button
          onClick={handlePayment}
          disabled={
            isProcessing ||
            isSwitchingChain ||
            !isBridgeAvailable(sourceChain) ||
            !isBridgeAvailable(destinationChain) ||
            sourceChain === destinationChain ||
            parseFloat(amount) > parseFloat(balance)
          }
          style={{
            width: '100%',
            padding: '1rem',
            background: (
              isProcessing ||
              isSwitchingChain ||
              !isBridgeAvailable(sourceChain) ||
              !isBridgeAvailable(destinationChain) ||
              sourceChain === destinationChain ||
              parseFloat(amount) > parseFloat(balance)
            ) ? '#ccc' : '#4CAF50',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: (
              isProcessing ||
              isSwitchingChain ||
              !isBridgeAvailable(sourceChain) ||
              !isBridgeAvailable(destinationChain) ||
              sourceChain === destinationChain ||
              parseFloat(amount) > parseFloat(balance)
            ) ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s ease'
          }}
        >
          {isProcessing ? 'Processing...' : isSwitchingChain ? 'Switching Chain...' : 'Make Payment'}
        </button>

        {/* Info Message */}
        <div style={{
          marginTop: '1rem',
          fontSize: '0.75rem',
          color: '#999',
          textAlign: 'center'
        }}>
          ⏱️ Estimated time: ~30 minutes for bridge completion
        </div>
      </div>
    </div>
  );
};

export default CrossChainPayment;