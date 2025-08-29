import React, { useState } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import { communityWeb3Service } from '@/services/communityWeb3Service';

interface CommunityTipButtonProps {
  postId: string;
  recipientAddress: string;
  communityId: string;
  onTip?: (postId: string, amount: string, token: string) => void;
  className?: string;
}

const SUPPORTED_TOKENS = [
  { symbol: 'LDAO', name: 'LinkDAO Token', decimals: 18 },
  { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  { symbol: 'ETH', name: 'Ethereum', decimals: 18 }
];

const QUICK_AMOUNTS = ['1', '5', '10', '25', '50'];

export default function CommunityTipButton({
  postId,
  recipientAddress,
  communityId,
  onTip,
  className = ''
}: CommunityTipButtonProps) {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();

  const [showTipModal, setShowTipModal] = useState(false);
  const [tipAmount, setTipAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState(SUPPORTED_TOKENS[0]);
  const [message, setMessage] = useState('');
  const [isTipping, setIsTipping] = useState(false);

  const handleTipClick = () => {
    if (!isConnected) {
      addToast('Please connect your wallet to tip', 'error');
      return;
    }

    if (address?.toLowerCase() === recipientAddress.toLowerCase()) {
      addToast('You cannot tip yourself', 'error');
      return;
    }

    setShowTipModal(true);
  };

  const handleQuickAmount = (amount: string) => {
    setTipAmount(amount);
  };

  const handleSendTip = async () => {
    if (!tipAmount || parseFloat(tipAmount) <= 0) {
      addToast('Please enter a valid tip amount', 'error');
      return;
    }

    try {
      setIsTipping(true);

      const txHash = await communityWeb3Service.tipCommunityPost({
        postId,
        recipientAddress,
        amount: tipAmount,
        token: selectedToken.symbol,
        message: message.trim() || undefined
      });

      addToast(`Successfully tipped ${tipAmount} ${selectedToken.symbol}!`, 'success');
      
      // Call parent handler if provided
      if (onTip) {
        onTip(postId, tipAmount, selectedToken.symbol);
      }

      // Reset form and close modal
      setTipAmount('');
      setMessage('');
      setShowTipModal(false);
    } catch (error) {
      console.error('Error sending tip:', error);
      addToast('Failed to send tip. Please try again.', 'error');
    } finally {
      setIsTipping(false);
    }
  };

  return (
    <>
      {/* Tip Button */}
      <button
        onClick={handleTipClick}
        className={`flex items-center space-x-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors duration-200 ${className}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm font-medium">Tip</span>
      </button>

      {/* Tip Modal */}
      {showTipModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                Send Tip
              </h4>
              <button
                onClick={() => setShowTipModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Recipient Info */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Sending to:</div>
              <div className="font-mono text-sm text-gray-900 dark:text-white">
                {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)}
              </div>
            </div>

            {/* Token Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Token
              </label>
              <select
                value={selectedToken.symbol}
                onChange={(e) => {
                  const token = SUPPORTED_TOKENS.find(t => t.symbol === e.target.value);
                  if (token) setSelectedToken(token);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={isTipping}
              >
                {SUPPORTED_TOKENS.map((token) => (
                  <option key={token.symbol} value={token.symbol}>
                    {token.name} ({token.symbol})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Amount Buttons */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quick Amounts
              </label>
              <div className="flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => handleQuickAmount(amount)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      tipAmount === amount
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    disabled={isTipping}
                  >
                    {amount} {selectedToken.symbol}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={tipAmount}
                  onChange={(e) => setTipAmount(e.target.value)}
                  className="w-full px-3 py-2 pr-16 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter amount"
                  disabled={isTipping}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-gray-500 dark:text-gray-400 text-sm">
                    {selectedToken.symbol}
                  </span>
                </div>
              </div>
            </div>

            {/* Message Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Message (Optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                placeholder="Add a message with your tip..."
                disabled={isTipping}
                maxLength={200}
              />
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {message.length}/200 characters
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={handleSendTip}
                disabled={isTipping || !tipAmount || parseFloat(tipAmount) <= 0}
                className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isTipping ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </div>
                ) : (
                  `Send ${tipAmount || '0'} ${selectedToken.symbol}`
                )}
              </button>
              <button
                onClick={() => setShowTipModal(false)}
                disabled={isTipping}
                className="px-4 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors duration-200 font-medium"
              >
                Cancel
              </button>
            </div>

            {/* Fee Notice */}
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex items-start">
                <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    A small network fee will be deducted from your tip to support community rewards.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}