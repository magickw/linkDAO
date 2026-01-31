/**
 * Gem Claim Modal Component
 * Allows authors to redeem their earned gems
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface GemClaimModalProps {
  isOpen: boolean;
  userGemBalance: number;
  onClaimComplete: (amount: number) => void;
  onClose: () => void;
}

const GemClaimModal: React.FC<GemClaimModalProps> = ({
  isOpen,
  userGemBalance,
  onClaimComplete,
  onClose
}) => {
  const [claimAmount, setClaimAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleClaim = async () => {
    const amount = parseInt(claimAmount);
    if (isNaN(amount) || amount < 100) {
      setErrorMessage('Minimum claim amount is 100 gems');
      setStatus('error');
      return;
    }

    if (amount > userGemBalance) {
      setErrorMessage('Insufficient gem balance');
      setStatus('error');
      return;
    }

    setIsProcessing(true);
    setStatus('idle');

    try {
      const sessionToken = typeof window !== 'undefined' ? sessionStorage.getItem('linkdao_access_token') : null;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.linkdao.io';

      const response = await fetch(`${apiUrl}/api/gems/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': sessionToken ? `Bearer ${sessionToken}` : ''
        },
        body: JSON.stringify({ amount })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to claim gems');
      }

      const result = await response.json();
      setStatus('success');
      onClaimComplete(amount);
      
      // Auto close after 2 seconds on success
      setTimeout(() => {
        onClose();
        setStatus('idle');
        setClaimAmount('');
      }, 2000);

    } catch (error: any) {
      console.error('Error claiming gems:', error);
      setErrorMessage(error.message || 'Failed to process claim request');
      setStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-2xl">🎁</span> Claim Your Earnings
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {status === 'success' ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Claim Request Submitted!</h4>
              <p className="text-gray-600 dark:text-gray-400">
                Your request to claim {parseInt(claimAmount).toLocaleString()} gems has been submitted. 
                Our team will process your payout within 24-48 hours.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Available to Claim</span>
                  <span className="text-xl font-bold text-indigo-900 dark:text-white">💎 {userGemBalance.toLocaleString()}</span>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount to Claim
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={claimAmount}
                    onChange={(e) => setClaimAmount(e.target.value)}
                    placeholder="Enter amount (min. 100)"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all dark:text-white"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                    gems
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <button 
                    onClick={() => setClaimAmount(userGemBalance.toString())}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                  >
                    Claim All
                  </button>
                  <span className="text-xs text-gray-500">100 gems = $1.00 USD (approx)</span>
                </div>
              </div>

              {status === 'error' && (
                <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p>{errorMessage}</p>
                </div>
              )}

              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <p className="font-semibold text-gray-700 dark:text-gray-300">How it works:</p>
                    <p>• Payouts are currently processed manually via USDC or LDAO tokens.</p>
                    <p>• You will receive a notification once your claim is approved.</p>
                    <p>• Minimum withdrawal is 100 gems.</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClaim}
                  disabled={isProcessing || !claimAmount || parseInt(claimAmount) < 100}
                  className="flex-[2] px-4 py-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Confirm Claim'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default GemClaimModal;