/**
 * AwardPurchaseModal Component
 * Modal for purchasing gold/awards to give to posts
 * Based on the reference design screenshots
 */

import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../../context/Web3Context';

interface GoldPackage {
  id: string;
  amount: number;
  price: number;
  currency: string;
  bonus?: number;
}

interface AwardPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchase: (packageId: string, paymentMethod: 'card' | 'googlePay') => Promise<void>;
  currentGoldBalance: number;
  awardsNeeded: number;
  totalAwardsToUnlock: number;
}

const GOLD_PACKAGES: GoldPackage[] = [
  { id: 'gold-100', amount: 100, price: 1.79, currency: 'USD' },
  { id: 'gold-200', amount: 200, price: 3.59, currency: 'USD' },
  { id: 'gold-300', amount: 300, price: 5.39, currency: 'USD' },
];

const AwardPurchaseModal: React.FC<AwardPurchaseModalProps> = ({
  isOpen,
  onClose,
  onPurchase,
  currentGoldBalance,
  awardsNeeded,
  totalAwardsToUnlock
}) => {
  const { address } = useWeb3();
  const [selectedPackage, setSelectedPackage] = useState<string>('gold-100');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'googlePay'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  
  // Payment form state
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [country, setCountry] = useState('');
  const [zipCode, setZipCode] = useState('');

  const selectedPackageData = GOLD_PACKAGES.find(p => p.id === selectedPackage);
  const progress = Math.min((currentGoldBalance / totalAwardsToUnlock) * 100, 100);
  const remainingAwards = Math.max(0, awardsNeeded);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setCardNumber('');
      setExpiryDate('');
      setSecurityCode('');
      setCountry('');
      setZipCode('');
      setShowPaymentForm(false);
    }
  }, [isOpen]);

  const handlePackageSelect = (packageId: string) => {
    setSelectedPackage(packageId);
  };

  const handlePurchase = async () => {
    if (!selectedPackageData) return;
    
    setIsProcessing(true);
    try {
      await onPurchase(selectedPackage, paymentMethod);
      onClose();
    } catch (error) {
      console.error('Purchase failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCardNumberChange = (value: string) => {
    // Format card number with spaces
    const cleaned = value.replace(/\s/g, '');
    const formatted = cleaned.replace(/(.{4})/g, '$1 ').trim();
    setCardNumber(formatted);
  };

  const handleExpiryDateChange = (value: string) => {
    // Format expiry date as MM/YY
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      const formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
      setExpiryDate(formatted);
    } else {
      setExpiryDate(cleaned);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Buy gold to give this award</h2>
              <p className="text-gray-600 mt-1">
                Gold is used to give awards. You need at least {remainingAwards} more gold for this award
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
        </div>

        <div className="p-6">
          {/* Progress Section */}
          {progress < 100 && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">Help unlock the leaderboard!</h3>
                <span className="text-sm text-gray-600">{Math.round(progress)}%</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                {remainingAwards} more awards and the leaderboard will be unlocked.
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Award Preview */}
          <div className="mb-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Award this post</h3>
            <div className="inline-flex items-center space-x-2 p-3 bg-yellow-50 rounded-lg">
              <span className="text-2xl">🏆</span>
              <span className="font-medium text-gray-900">Premium Award</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {selectedPackageData && `${selectedPackageData.amount} gold will automatically be used to give this award. ${selectedPackageData.amount - 15} gold will go to your balance to use on future awards.`}
            </p>
          </div>

          {/* Gold Packages */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-4">Select Gold Package</h4>
            <div className="grid grid-cols-3 gap-4">
              {GOLD_PACKAGES.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => handlePackageSelect(pkg.id)}
                  className={`
                    relative p-4 rounded-lg border-2 transition-all
                    ${selectedPackage === pkg.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <div className="text-center">
                    <div className="text-3xl mb-2">⭐</div>
                    <div className="text-2xl font-bold text-gray-900">{pkg.amount}</div>
                    <div className="text-sm text-gray-600">Gold</div>
                    <div className="text-lg font-semibold text-gray-900 mt-2">
                      ${pkg.price}
                    </div>
                  </div>
                  {selectedPackage === pkg.id && (
                    <div className="absolute top-2 right-2">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-4">Payment Method</h4>
            <div className="flex space-x-4">
              <button
                onClick={() => setPaymentMethod('card')}
                className={`
                  flex-1 p-3 rounded-lg border-2 transition-all
                  ${paymentMethod === 'card'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <div className="text-center">
                  <div className="text-lg font-medium">Card</div>
                </div>
              </button>
              <button
                onClick={() => setPaymentMethod('googlePay')}
                className={`
                  flex-1 p-3 rounded-lg border-2 transition-all
                  ${paymentMethod === 'googlePay'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <div className="text-center flex items-center justify-center space-x-2">
                  <div className="w-6 h-6 bg-blue-600 rounded" />
                  <span className="text-lg font-medium">G Pay</span>
                </div>
              </button>
            </div>
          </div>

          {/* Payment Form */}
          {paymentMethod === 'card' && (
            <div className="mb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Card number</label>
                <div className="relative">
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => handleCardNumberChange(e.target.value)}
                    placeholder="1234 5678 9012 3456"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={19}
                  />
                  <div className="absolute right-3 top-2.5 flex space-x-1">
                    <div className="w-8 h-5 bg-blue-600 rounded" />
                    <div className="w-8 h-5 bg-red-500 rounded" />
                    <div className="w-8 h-5 bg-yellow-500 rounded" />
                    <div className="w-8 h-5 bg-blue-800 rounded" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiration date</label>
                  <input
                    type="text"
                    value={expiryDate}
                    onChange={(e) => handleExpiryDateChange(e.target.value)}
                    placeholder="MM/YY"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={5}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Security code</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={securityCode}
                      onChange={(e) => setSecurityCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      maxLength={4}
                    />
                    <div className="absolute right-3 top-2.5">
                      <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select country</option>
                    <option value="US">United States</option>
                    <option value="UK">United Kingdom</option>
                    <option value="CA">Canada</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP code</label>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="12345"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Google Pay Button */}
          {paymentMethod === 'googlePay' && (
            <div className="mb-6">
              <button className="w-full py-3 px-4 bg-black text-white rounded-lg flex items-center justify-center space-x-2 hover:bg-gray-800 transition-colors">
                <div className="w-6 h-6 bg-white rounded" />
                <span className="font-medium">Pay with Google Pay</span>
              </button>
            </div>
          )}

          {/* Terms and Action */}
          <div className="border-t border-gray-200 pt-6">
            <p className="text-sm text-gray-600 mb-4">
              By continuing you agree to our{' '}
              <button className="text-blue-600 hover:text-blue-700 underline">Econ Terms.</button>
            </p>
            
            <div className="flex justify-end">
              <button
                onClick={handlePurchase}
                disabled={isProcessing || !selectedPackageData || (paymentMethod === 'card' && (!cardNumber || !expiryDate || !securityCode))}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  `Buy Gold and Give Award`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AwardPurchaseModal;