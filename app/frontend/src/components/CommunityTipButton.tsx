import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import { communityWeb3Service } from '@/services/communityWeb3Service';
import { getEnabledNetworks, NETWORKS } from '@/config/web3Config';
import { FeedService } from '@/services/feedService';

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
  { symbol: 'USDT', name: 'Tether USD', decimals: 6 }
];

const QUICK_AMOUNTS = ['1', '5', '10', '25', '50'];

export default function CommunityTipButton({
  postId,
  recipientAddress,
  communityId,
  onTip,
  className = ''
}: CommunityTipButtonProps) {
  const { address, isConnected, chainId } = useWeb3();
  const { addToast } = useToast();

  const [showTipModal, setShowTipModal] = useState(false);
  const [tipAmount, setTipAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState(SUPPORTED_TOKENS[0]);
  const [message, setMessage] = useState('');
  const [isTipping, setIsTipping] = useState(false);

  // Initialize with current chain if supported, otherwise default to Ethereum Sepolia (or first enabled)
  const enabledNetworks = getEnabledNetworks();
  const [selectedNetwork, setSelectedNetwork] = useState(
    enabledNetworks.find(n => n.chainId === chainId) || enabledNetworks[0]
  );

  // Update selected network when wallet chain changes, if modal is not open
  useEffect(() => {
    if (!showTipModal && chainId) {
      const currentNetwork = enabledNetworks.find(n => n.chainId === chainId);
      if (currentNetwork) {
        setSelectedNetwork(currentNetwork);
      }
    }
  }, [chainId, showTipModal]);

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
        message: message.trim() || undefined,
        targetChainId: selectedNetwork.chainId
      });

      // Record the tip in the database (blockchain tx already sent)
      await FeedService.recordTip(
        postId,
        parseFloat(tipAmount),
        selectedToken.symbol,
        txHash,
        message.trim() || undefined
      );

      // Show success message
      addToast(
        <div className="flex flex-col gap-1">
          <span>Successfully tipped {tipAmount} {selectedToken.symbol}!</span>
          <a
            href={`${selectedNetwork.blockExplorer}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs underline"
          >
            View on {selectedNetwork.shortName} scan
          </a>
        </div> as any,
        'success'
      );

      // Call parent handler for UI updates only (parent should NOT send another blockchain tx)
      if (onTip) {
        onTip(postId, tipAmount, selectedToken.symbol);
      }

      // Reset form and close modal
      setTipAmount('');
      setMessage('');
      setShowTipModal(false);
    } catch (error: any) {
      console.error('Error sending tip:', error);
      // Only show error message here
      addToast(`Failed to send tip: ${error.message || 'Please try again.'}`, 'error');
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

      {/* Tip Modal - Rendered via Portal to break out of parent stacking contexts */}
      {showTipModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-2xl transform transition-all scale-100 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="p-1.5 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                Send Tip
              </h4>
              <button
                onClick={() => setShowTipModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Recipient Info */}
            <div className="bg-gray-50 dark:bg-gray-750 rounded-lg p-3 mb-5 border border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">Recipient</span>
              <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-600">
                {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)}
              </span>
            </div>

            {/* Network Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Network
              </label>
              <select
                value={selectedNetwork.chainId}
                onChange={(e) => {
                  const network = enabledNetworks.find(n => n.chainId === Number(e.target.value));
                  if (network) setSelectedNetwork(network);
                }}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                disabled={isTipping}
              >
                {enabledNetworks.map((network) => (
                  <option key={network.chainId} value={network.chainId}>
                    {network.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Token Selection */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Token
              </label>
              <select
                value={selectedToken.symbol}
                onChange={(e) => {
                  const token = SUPPORTED_TOKENS.find(t => t.symbol === e.target.value);
                  if (token) setSelectedToken(token);
                }}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
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
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Amount
              </label>
              <div className="grid grid-cols-5 gap-2 mb-3">
                {QUICK_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => handleQuickAmount(amount)}
                    className={`px-1 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border ${tipAmount === amount
                      ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-200 dark:border-primary-700 text-primary-700 dark:text-primary-300 ring-1 ring-primary-500/20'
                      : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-300'
                      }`}
                    disabled={isTipping}
                  >
                    {amount}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount Input */}
            <div className="mb-5">
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={tipAmount}
                  onChange={(e) => setTipAmount(e.target.value)}
                  className="w-full px-3 py-2.5 pr-16 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg font-mono placeholder-gray-400"
                  placeholder="0.00"
                  disabled={isTipping}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    {selectedToken.symbol}
                  </span>
                </div>
              </div>
            </div>

            {/* Message Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Message <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-sm"
                placeholder="Add a nice message..."
                disabled={isTipping}
                maxLength={200}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setShowTipModal(false)}
                disabled={isTipping}
                className="px-5 py-2.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-xl transition-colors font-medium text-sm w-1/3"
              >
                Cancel
              </button>
              <button
                onClick={handleSendTip}
                disabled={isTipping || !tipAmount || parseFloat(tipAmount) <= 0}
                className="flex-1 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm shadow-lg shadow-primary-500/20 flex items-center justify-center"
              >
                {isTipping ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Confirming...
                  </>
                ) : (
                  `Send ${tipAmount || '0'} ${selectedToken.symbol}`
                )}
              </button>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Powered by LinkDAO Protocol
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}