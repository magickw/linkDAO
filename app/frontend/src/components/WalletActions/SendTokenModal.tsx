import React, { useState } from 'react';
import { TokenBalance } from '../../types/wallet';
import { GasFeeEstimate } from '../../types/payment';
import { useToast } from '@/context/ToastContext';

interface SendTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokens: TokenBalance[];
  initialToken?: string;
  onSend: (token: string, amount: number, recipient: string) => Promise<{ hash?: string } | void>;
  isPending?: boolean;
  estimatedGas?: GasFeeEstimate | null;
  onEstimate?: (opts: { token: string; amount: string; recipient: string }) => Promise<GasFeeEstimate | null>;
}

export default function SendTokenModal({ isOpen, onClose, tokens, initialToken, onSend, isPending, estimatedGas, onEstimate }: SendTokenModalProps) {
  const { addToast } = useToast();
  const [selectedToken, setSelectedToken] = useState(tokens[0]?.symbol || 'ETH');
  const [localEstimatedGas, setLocalEstimatedGas] = useState<GasFeeEstimate | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);

  // Sync selected token when modal opens or when tokens/initialToken change
  React.useEffect(() => {
    if (!isOpen) return;

    // If initialToken provided and present in tokens, select it
    if (initialToken) {
      const found = tokens.find(t => t.symbol === initialToken);
      if (found) {
        setSelectedToken(initialToken);
        // fall through
      }
    }

    // Default to first token in list if available
    if (tokens && tokens.length > 0 && !initialToken) {
      setSelectedToken(tokens[0].symbol);
    }

  // Mirror estimatedGas from parent for display
  setLocalEstimatedGas(typeof estimatedGas !== 'undefined' ? (estimatedGas ?? null) : null);
  }, [isOpen, tokens, initialToken, estimatedGas]);
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const estimateRef = React.useRef<number | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const selectedTokenData = tokens.find(t => t.symbol === selectedToken);
  const maxAmount = selectedTokenData?.balance || 0;
  const estimatedValue = parseFloat(amount || '0') * (selectedTokenData?.valueUSD || 0) / (selectedTokenData?.balance || 1);

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

    setIsLoading(true);
    setError('');

    try {
      const result = await onSend(selectedToken, parseFloat(amount), recipient);
      if (result && result.hash) {
        setTxHash(result.hash);
      }
      onClose();
      setAmount('');
      setRecipient('');
      addToast('Transaction submitted successfully!', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
      addToast('Transaction failed: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced estimate effect: call onEstimate 300ms after user stops typing/changing
  React.useEffect(() => {
    // If parent provided an estimatedGas prop, mirror it (higher priority)
    if (typeof estimatedGas !== 'undefined') {
      setLocalEstimatedGas(estimatedGas ?? null);
      return;
    }

    if (!onEstimate) return;

    // clear previous timer
    if (estimateRef.current) window.clearTimeout(estimateRef.current);

    if (!amount || !recipient) {
      setLocalEstimatedGas(null);
      return;
    }

    setIsEstimating(true);
    estimateRef.current = window.setTimeout(async () => {
      try {
        const res = await onEstimate({ token: selectedToken, amount, recipient });
        setLocalEstimatedGas(res ?? null);
      } catch (e) {
        setLocalEstimatedGas(null);
      } finally {
        setIsEstimating(false);
      }
    }, 300);

    return () => {
      if (estimateRef.current) window.clearTimeout(estimateRef.current);
    };
  }, [amount, recipient, selectedToken, onEstimate, estimatedGas]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Send Tokens</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Token Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Token
            </label>
            <select
              value={selectedToken}
              onChange={(e) => setSelectedToken(e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {tokens.map((token) => (
                <option key={token.symbol} value={token.symbol}>
                  {token.symbol} - {token.balance.toFixed(4)} available
                </option>
              ))}
            </select>
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
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                onClick={() => setAmount(maxAmount.toString())}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-primary-600 dark:text-primary-400 text-sm font-medium hover:underline"
              >
                MAX
              </button>
            </div>
            {amount && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Estimated Gas */}
          {(localEstimatedGas || isEstimating) && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-700 dark:text-blue-300">Estimated Gas Fee:</span>
                {isEstimating ? (
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                    {localEstimatedGas?.totalCost.toString()} wei
                    {localEstimatedGas?.totalCostUSD && ` (~$${localEstimatedGas.totalCostUSD.toFixed(2)} USD)`}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Transaction Hash */}
          {txHash && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-200">
                Transaction submitted! Hash: {txHash.slice(0, 10)}...{txHash.slice(-8)}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSend}
            disabled={isLoading || isPending || isEstimating}
            className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading || isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Sending...
              </>
            ) : (
              'Send Tokens'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}