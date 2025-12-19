import React, { useState, useEffect } from 'react';
import { TokenBalance } from '../../types/wallet';
import { useToast } from '@/context/ToastContext';
import { useTokenTransfer } from '../../hooks/useTokenTransfer';
import { useChainId } from 'wagmi';

interface SendTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokens: TokenBalance[];
  initialToken?: string;
  onSuccess?: (hash: string) => void;
}

export default function SendTokenModal({ isOpen, onClose, tokens, initialToken, onSuccess }: SendTokenModalProps) {
  const { addToast } = useToast();
  const chainId = useChainId();
  const { transfer, isPending, txHash } = useTokenTransfer();

  const [selectedTokenSymbol, setSelectedTokenSymbol] = useState(tokens[0]?.symbol || 'ETH');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [error, setError] = useState('');

  // Sync selected token when modal opens or when tokens/initialToken change
  useEffect(() => {
    if (!isOpen) return;

    if (initialToken) {
      const found = tokens.find(t => t.symbol === initialToken);
      if (found) {
        setSelectedTokenSymbol(initialToken);
        return;
      }
    }

    if (tokens && tokens.length > 0 && !initialToken) {
      setSelectedTokenSymbol(tokens[0].symbol);
    }
  }, [isOpen, tokens, initialToken]);

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setRecipient('');
      setError('');
    }
  }, [isOpen]);

  const selectedToken = tokens.find(t => t.symbol === selectedTokenSymbol);
  const maxAmount = selectedToken?.balance || 0;
  const estimatedValue = parseFloat(amount || '0') * (selectedToken?.valueUSD || 0) / (selectedToken?.balance || 1);

  const handleSend = async () => {
    if (!amount || !recipient) {
      setError('Please fill in all fields');
      return;
    }

    if (parseFloat(amount) > maxAmount) {
      setError('Insufficient balance');
      return;
    }

    if (parseFloat(amount) <= 0) {
      setError('Amount must be greater than zero');
      return;
    }

    if (!recipient.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError('Invalid recipient address');
      return;
    }

    setError('');

    try {
      const hash = await transfer({
        tokenAddress: selectedToken?.contractAddress,
        recipient,
        amount,
        decimals: selectedTokenSymbol === 'USDC' ? 6 : 18 // Simple heuristic, ideally comes from token data
      });

      if (hash) {
        addToast('Transaction submitted successfully!', 'success');
        if (onSuccess) onSuccess(hash);
        
        // Construct the explorer URL based on the current chain
        let explorerUrl = '';
        switch (chainId) {
          case 1: // Ethereum Mainnet
            explorerUrl = `https://etherscan.io/tx/${hash}`;
            break;
          case 8453: // Base Mainnet
            explorerUrl = `https://basescan.org/tx/${hash}`;
            break;
          case 84532: // Base Sepolia
            explorerUrl = `https://sepolia.basescan.org/tx/${hash}`;
            break;
          case 137: // Polygon
            explorerUrl = `https://polygonscan.com/tx/${hash}`;
            break;
          case 42161: // Arbitrum
            explorerUrl = `https://arbiscan.io/tx/${hash}`;
            break;
          case 11155111: // Sepolia Testnet
            explorerUrl = `https://sepolia.etherscan.io/tx/${hash}`;
            break;
          default:
            // Fallback to Ethereum mainnet if chain is not recognized
            explorerUrl = `https://etherscan.io/tx/${hash}`;
        }

        // Ask user if they want to view the transaction on the explorer
        if (window.confirm(`Transaction submitted! Would you like to view it on the blockchain explorer?`)) {
          window.open(explorerUrl, '_blank', 'noopener,noreferrer');
        }

        onClose();
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Transaction failed');
      addToast('Transaction failed: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
    }
  };

  const handleMax = () => {
    setAmount(maxAmount.toString());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Send Tokens</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Chain ID: {chainId} • Direct Transfer
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Token Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Asset
            </label>
            <div className="relative">
              <select
                value={selectedTokenSymbol}
                onChange={(e) => setSelectedTokenSymbol(e.target.value)}
                className="w-full p-3 pl-10 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none"
              >
                {tokens.map((token) => (
                  <option key={token.symbol} value={token.symbol}>
                    {token.symbol}
                  </option>
                ))}
              </select>
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <div className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-bold text-primary-600 dark:text-primary-400">
                  {selectedTokenSymbol.slice(0, 1)}
                </div>
              </div>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <div className="mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
              <span>Balance: {selectedToken?.balance.toFixed(4)} {selectedTokenSymbol}</span>
              <span>≈ ${selectedToken?.valueUSD?.toFixed(2) || '0.00'}</span>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Amount
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full p-3 pr-16 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
              />
              <button
                onClick={handleMax}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-xs font-bold rounded hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
              >
                MAX
              </button>
            </div>
            {amount && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                ≈ ${estimatedValue.toFixed(2)} USD
              </p>
            )}
          </div>

          {/* Recipient */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Recipient Address
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSend}
            disabled={isPending || !amount || !recipient}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Send {selectedTokenSymbol}
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}