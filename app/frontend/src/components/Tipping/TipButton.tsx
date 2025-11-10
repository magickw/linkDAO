import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Heart, Coins, Gift, Award } from 'lucide-react';
import { tipService, Award as AwardType, Tip } from '../../services/tipService';
import { useWeb3 } from '../../hooks/useWeb3';

interface TipButtonProps {
  toAddress: string;
  postId?: string;
  commentId?: string;
  type?: 'tip' | 'award';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  initialTipCount?: number;
}

const TipButton: React.FC<TipButtonProps> = ({
  toAddress,
  postId,
  commentId,
  type = 'tip',
  className = '',
  size = 'md',
  showCount = true,
  initialTipCount = 0
}) => {
  const { account, provider } = useWeb3();
  const [isOpen, setIsOpen] = useState(false);
  const [tipAmount, setTipAmount] = useState('1');
  const [selectedCurrency, setSelectedCurrency] = useState<'LDAO' | 'USDC'>('LDAO');
  const [ldaoBalance, setLdaoBalance] = useState('0');
  const [message, setMessage] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tipCount, setTipCount] = useState(initialTipCount);

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  // Fetch LDAO balance when wallet is connected
  useEffect(() => {
    if (account && provider) {
      fetchLdaoBalance();
    }
  }, [account, provider]);

  const fetchLdaoBalance = async () => {
    if (!account || !provider) return;

    try {
      const balance = await tipService.getLdaoBalance();
      setLdaoBalance(parseFloat(balance).toFixed(2));
    } catch (error) {
      console.error('Error fetching LDAO balance:', error);
    }
  };

  const handleTip = async () => {
    if (!account || !provider) {
      return;
    }

    setIsProcessing(true);
    try {
      await tipService.initialize(provider);
      
      const tip = await tipService.createTip(
        postId || '',
        toAddress,
        tipAmount,
        selectedCurrency,
        message
      );

      setTipCount(prev => prev + 1);
      setIsOpen(false);
      setTipAmount('1');
      setMessage('');
      
      // Refresh balance after tip
      await fetchLdaoBalance();
      
      // Show success notification
      alert(`Successfully sent ${tipAmount} ${selectedCurrency}!`);
    } catch (error) {
      console.error('Failed to send tip:', error);
      alert('Failed to send tip. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAward = async (awardType: 'silver' | 'gold' | 'platinum' | 'diamond') => {
    if (!account || !provider) {
      return;
    }

    setIsProcessing(true);
    try {
      await tipService.initialize(provider);
      
      const tip = await tipService.sendAward({
        toAddress,
        postId,
        commentId,
        awardType,
        message
      });

      setTipCount(prev => prev + 1);
      setIsOpen(false);
      setMessage('');
      
      // Refresh balance after award
      await fetchLdaoBalance();
      
      // Show success notification
      alert(`Successfully sent ${awardType} award!`);
    } catch (error) {
      console.error('Failed to send award:', error);
      alert('Failed to send award. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (type === 'award') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center space-x-1 ${sizeClasses[size]} bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full hover:from-purple-600 hover:to-pink-600 transition-all`}
        >
          <Award className={iconSizes[size]} />
          {showCount && (
            <span className="font-medium">{tipCount}</span>
          )}
        </button>

        {isOpen && (
          <div className="absolute bottom-full right-0 mb-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Send an Award</h3>
            <div className="space-y-2">
              {tipService.AWARDS.map((award) => (
                <button
                  key={award.id}
                  onClick={() => handleAward(award.type)}
                  disabled={isProcessing || parseFloat(ldaoBalance) < award.cost.LDAO}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">{award.icon}</span>
                    <div className="text-left">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {award.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {award.cost.LDAO} LDAO
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Your LDAO balance: {ldaoBalance}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-1 ${sizeClasses[size]} bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full hover:from-blue-600 hover:to-purple-700 transition-all`}
      >
        <Coins className={iconSizes[size]} />
        {showCount && (
          <span className="font-medium">{tipCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Send a Tip</h3>
          
          <div className="space-y-3">
            {/* Balance Display */}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Your LDAO balance:</span>
              <span className="font-medium text-gray-900 dark:text-white">{ldaoBalance} LDAO</span>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amount
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={tipAmount}
                  onChange={(e) => setTipAmount(e.target.value)}
                  min="0.01"
                  step="0.01"
                  max={ldaoBalance}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value as 'LDAO' | 'USDC')}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="LDAO">LDAO</option>
                  <option value="USDC">USDC</option>
                </select>
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-5 gap-2">
              {[1, 5, 10, 25, 50].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setTipAmount(amount.toString())}
                  disabled={parseFloat(ldaoBalance) < amount}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {amount}
                </button>
              ))}
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Message (optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a message..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              />
            </div>

            {/* Public/Private Toggle */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Public tip
              </label>
              <button
                onClick={() => setIsPublic(!isPublic)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isPublic ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPublic ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Send Button */}
            <button
              onClick={handleTip}
              disabled={isProcessing || !account || parseFloat(tipAmount) <= 0 || (selectedCurrency === 'LDAO' && parseFloat(tipAmount) > parseFloat(ldaoBalance))}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-md hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Heart className="w-4 h-4" />
              <span>{isProcessing ? 'Sending...' : 'Send Tip'}</span>
            </button>

            {/* Fee Information */}
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <p>5% fee goes to the DAO treasury</p>
              <p>95% goes to the content creator</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TipButton;