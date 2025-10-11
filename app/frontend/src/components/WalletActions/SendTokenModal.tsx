import React, { useState } from 'react';
import { TokenBalance } from '../../types/wallet';

interface SendTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokens: TokenBalance[];
  initialToken?: string;
  onSend: (token: string, amount: number, recipient: string) => Promise<void>;
  estimatedGas?: bigint | null;
}

export default function SendTokenModal({ isOpen, onClose, tokens, initialToken, onSend, estimatedGas }: SendTokenModalProps) {
  const [selectedToken, setSelectedToken] = useState(tokens[0]?.symbol || 'ETH');
  const [localEstimatedGas, setLocalEstimatedGas] = useState<bigint | null>(null);

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

    if (!recipient.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError('Invalid recipient address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onSend(selectedToken, parseFloat(amount), recipient);
      onClose();
      setAmount('');
      setRecipient('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setIsLoading(false);
    }
  };

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

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Gas Fee Estimate */}
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Estimated Gas Fee:</span>
              <span className="text-gray-900 dark:text-white">
                {localEstimatedGas !== null ? `${localEstimatedGas.toString()} (gas units)` : '~$2.50'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={isLoading || !amount || !recipient}
            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Send'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}