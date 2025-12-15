import React, { useState } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import { TipService } from '@/services/tipService';
import { getProvider } from '@/utils/web3';
import { ethers } from 'ethers';

interface TipBarProps {
  postId: string;
  creatorAddress: string;
  onTipSuccess?: () => void;
}

const TipBar: React.FC<TipBarProps> = ({ postId, creatorAddress, onTipSuccess }) => {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();
  const [tipAmount, setTipAmount] = useState('');
  const [isTipping, setIsTipping] = useState(false);

  const handleTip = async () => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet to tip', 'error');
      return;
    }

    if (!tipAmount || parseFloat(tipAmount) <= 0) {
      addToast('Please enter a valid tip amount', 'error');
      return;
    }

    // Prevent users from tipping themselves
    if (address.toLowerCase() === creatorAddress.toLowerCase()) {
      addToast('You cannot tip yourself', 'error');
      return;
    }

    setIsTipping(true);
    try {
      // Initialize the TipService with the provider
      const provider = await getProvider();
      if (!provider) {
        throw new Error('Failed to get provider');
      }
      
      // Initialize TipService with the provider
      // The provider should be a BrowserProvider when wallet is connected
      await TipService.initialize(provider as any);
      
      // Use the real TipService to process the tip
      const result = await TipService.createTip(
        postId,
        creatorAddress,
        tipAmount,
        'LDAO',
        ''
      );
      
      addToast(`Successfully tipped ${tipAmount} LDAO! Transaction: ${result.transactionHash.substring(0, 10)}...`, 'success');
      setTipAmount('');
      if (onTipSuccess) onTipSuccess();
    } catch (error: any) {
      console.error('Error tipping:', error);
      addToast(`Failed to send tip: ${error.message || 'Please try again.'}`, 'error');
    } finally {
      setIsTipping(false);
    }
  };

  const handlePresetTip = (amount: string) => {
    setTipAmount(amount);
  };

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 p-4">
      <div className="flex items-center space-x-2 mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tip Creator</h3>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 dark:from-purple-900/30 dark:to-indigo-900/30 dark:text-purple-200">
          LDAO
        </span>
      </div>
      
      <div className="flex items-center space-x-2 mb-3">
        <button
          onClick={() => handlePresetTip('10')}
          className="px-3 py-1 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 transition-colors"
        >
          10
        </button>
        <button
          onClick={() => handlePresetTip('50')}
          className="px-3 py-1 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 transition-colors"
        >
          50
        </button>
        <button
          onClick={() => handlePresetTip('100')}
          className="px-3 py-1 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 transition-colors"
        >
          100
        </button>
        <button
          onClick={() => handlePresetTip('500')}
          className="px-3 py-1 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 transition-colors"
        >
          500
        </button>
      </div>
      
      <div className="flex items-center space-x-2">
        <input
          type="number"
          value={tipAmount}
          onChange={(e) => setTipAmount(e.target.value)}
          placeholder="Enter custom amount"
          className="flex-1 min-w-0 block w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <button
          onClick={handleTip}
          disabled={isTipping || !tipAmount || parseFloat(tipAmount) <= 0}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isTipping ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Tipping...
            </>
          ) : (
            'Tip'
          )}
        </button>
      </div>
      
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        10% of tips go to the community reward pool
      </p>
    </div>
  );
};

export default TipBar;