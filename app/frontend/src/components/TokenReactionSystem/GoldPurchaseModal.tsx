/**
 * Award Purchase Modal Component
 * Modal for purchasing gold/awards with tiered packages
 */

import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../../context/Web3Context';

interface GoldPackage {
  id: string;
  amount: number;
  price: number;
  bonus?: number;
  popular?: boolean;
}

interface AwardPurchaseModalProps {
  isOpen: boolean;
  awardCost: number; // Gold needed for this award
  currentGold: number;
  onPurchase: (packageId: string) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

const GoldPurchaseModal: React.FC<AwardPurchaseModalProps> = ({
  isOpen,
  awardCost,
  currentGold,
  onPurchase,
  onClose,
  isLoading = false
}) => {
  const { address: walletAddress } = useWeb3();
  const [selectedPackage, setSelectedPackage] = useState<string>('100');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'googlepay'>('card');

  const goldPackages: GoldPackage[] = [
    {
      id: '100',
      amount: 100,
      price: 1.79,
    },
    {
      id: '200',
      amount: 200,
      price: 3.59,
      popular: true,
    },
    {
      id: '300',
      amount: 300,
      price: 5.39,
      bonus: 50,
    }
  ];

  const selectedPackageData = goldPackages.find(pkg => pkg.id === selectedPackage);
  const goldNeeded = Math.max(0, awardCost - currentGold);
  const remainingGold = currentGold + (selectedPackageData?.amount || 0) - awardCost;

  useEffect(() => {
    if (isOpen) {
      // Auto-select package that covers the award cost
      const suitablePackage = goldPackages.find(pkg => pkg.amount >= goldNeeded);
      if (suitablePackage) {
        setSelectedPackage(suitablePackage.id);
      }
    }
  }, [isOpen, goldNeeded]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Buy gold to give this award</h2>
            <p className="text-sm text-gray-600 mt-1">
              Gold is used to give awards. You need at least {goldNeeded} more gold for this award
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Gold Usage Info */}
        <div className="p-6 bg-blue-50 border-b border-gray-200">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
            </svg>
            <span className="text-sm font-medium text-blue-900">How gold will be used</span>
          </div>
          <p className="text-sm text-blue-800">
            {awardCost} gold will automatically be used to give this award. {remainingGold} gold will go to your balance to use on future awards.
          </p>
        </div>

        {/* Gold Packages */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Award this post</h3>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {goldPackages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg.id)}
                className={`
                  relative p-4 rounded-lg border-2 transition-all
                  ${selectedPackage === pkg.id
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                {pkg.popular && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                      Popular
                    </span>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-2xl mb-1">⭐</div>
                  <div className="text-lg font-semibold text-gray-900">{pkg.amount}</div>
                  <div className="text-sm text-gray-600">gold</div>
                  <div className="text-lg font-bold text-gray-900 mt-2">${pkg.price}</div>
                  {pkg.bonus && (
                    <div className="text-xs text-green-600 mt-1">+{pkg.bonus} bonus</div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Payment Method Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment method</h3>
            <div className="flex space-x-4">
              <button
                onClick={() => setPaymentMethod('card')}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all
                  ${paymentMethod === 'card'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                  }
                `}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span>Card</span>
              </button>
              <button
                onClick={() => setPaymentMethod('googlepay')}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all
                  ${paymentMethod === 'googlepay'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                  }
                `}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
                  <path fill="#34A853" d="M5.255 9.787c-.4-.8-.627-1.68-.627-2.613s.227-1.813.627-2.613V2.4h-2.4C1.733 3.76 1.333 5.387 1.333 7.173s.4 3.413 1.52 4.773l2.4-2.16z"/>
                  <path fill="#FBBC05" d="M12.48 5.387c1.653 0 3.147.56 4.32 1.667l2.133-2.133C17.227 2.987 15.08 2 12.48 2 8.373 2 4.907 4.427 3.253 8l2.4 1.68c.853-2.613 3.267-4.293 5.827-4.293z"/>
                  <path fill="#EA4335" d="M12.48 14.613c-2.56 0-4.973-1.68-5.827-4.293l-2.4 1.68c1.653 3.573 5.12 6 9.227 6 3.573 0 6.267-1.173 8.373-3.36l-2.133-2.133c-1.173 1.107-2.667 1.667-4.32 1.667z"/>
                </svg>
                <span>Google Pay</span>
              </button>
            </div>
          </div>

          {/* Payment Form (shown after payment method selection) */}
          {(paymentMethod === 'card' || paymentMethod === 'googlepay') && (
            <div className="space-y-4">
              {paymentMethod === 'card' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Card number
                    </label>
                    <input
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expiration date
                      </label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Security code
                      </label>
                      <input
                        type="text"
                        placeholder="123"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option>United States</option>
                      <option>Canada</option>
                      <option>United Kingdom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP code
                    </label>
                    <input
                      type="text"
                      placeholder="12345"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </>
              )}

              {paymentMethod === 'googlepay' && (
                <div className="text-center py-8">
                  <button className="bg-black text-white px-6 py-3 rounded-lg flex items-center space-x-2 mx-auto">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="white" d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
                    </svg>
                    <span>Pay with Google Pay</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              By continuing you agree to our <a href="#" className="text-blue-600 hover:underline">Econ Terms</a>.
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => onPurchase(selectedPackage)}
              disabled={isLoading}
              className="flex-1 bg-blue-900 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                `Buy Gold and Give Award`
              )}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoldPurchaseModal;