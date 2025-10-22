import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon, CreditCardIcon, BanknotesIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import { ldaoAcquisitionService, PurchaseQuote } from '../../services/ldaoAcquisitionService';
import { toast } from 'react-hot-toast';

interface LDAOPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAmount?: string;
}

type PurchaseMethod = 'fiat' | 'crypto' | 'earn';
type FiatMethod = 'card' | 'apple_pay' | 'google_pay';
type CryptoMethod = 'ETH' | 'USDC';

export default function LDAOPurchaseModal({ isOpen, onClose, initialAmount = '1000' }: LDAOPurchaseModalProps) {
  const [purchaseMethod, setPurchaseMethod] = useState<PurchaseMethod>('crypto');
  const [fiatMethod, setFiatMethod] = useState<FiatMethod>('card');
  const [cryptoMethod, setCryptoMethod] = useState<CryptoMethod>('ETH');
  const [ldaoAmount, setLdaoAmount] = useState(initialAmount);
  const [quote, setQuote] = useState<PurchaseQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (isOpen && ldaoAmount) {
      fetchQuote();
    }
  }, [isOpen, ldaoAmount]);

  const fetchQuote = async () => {
    try {
      setLoading(true);
      const quoteData = await ldaoAcquisitionService.getQuote(ldaoAmount);
      setQuote(quoteData);
    } catch (error) {
      console.error('Failed to fetch quote:', error);
      toast.error('Failed to get price quote');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    try {
      setPurchasing(true);
      
      let result;
      if (purchaseMethod === 'fiat') {
        result = await ldaoAcquisitionService.purchaseWithFiat({
          amount: parseFloat(quote?.usdAmount || '0'),
          currency: 'USD',
          paymentMethod: fiatMethod
        });
      } else if (purchaseMethod === 'crypto') {
        result = await ldaoAcquisitionService.purchaseWithCrypto(cryptoMethod, ldaoAmount);
      }
      
      if (result?.success) {
        toast.success('Purchase successful!');
        onClose();
      } else {
        toast.error(result?.error || 'Purchase failed');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Purchase failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const presetAmounts = ['100', '500', '1000', '5000', '10000'];

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    Get LDAO Tokens
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Purchase Method Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    How would you like to get LDAO?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setPurchaseMethod('crypto')}
                      className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                        purchaseMethod === 'crypto'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <BanknotesIcon className="h-5 w-5 mx-auto mb-1" />
                      Crypto
                    </button>
                    <button
                      onClick={() => setPurchaseMethod('fiat')}
                      className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                        purchaseMethod === 'fiat'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <CreditCardIcon className="h-5 w-5 mx-auto mb-1" />
                      Card
                    </button>
                    <button
                      onClick={() => setPurchaseMethod('earn')}
                      className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                        purchaseMethod === 'earn'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <DevicePhoneMobileIcon className="h-5 w-5 mx-auto mb-1" />
                      Earn
                    </button>
                  </div>
                </div>

                {/* Amount Selection */}
                {purchaseMethod !== 'earn' && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      LDAO Amount
                    </label>
                    
                    {/* Preset Amounts */}
                    <div className="grid grid-cols-5 gap-2 mb-3">
                      {presetAmounts.map((amount) => (
                        <button
                          key={amount}
                          onClick={() => setLdaoAmount(amount)}
                          className={`p-2 rounded-lg border text-sm font-medium transition-colors ${
                            ldaoAmount === amount
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {amount}
                        </button>
                      ))}
                    </div>

                    {/* Custom Amount Input */}
                    <input
                      type="number"
                      value={ldaoAmount}
                      onChange={(e) => setLdaoAmount(e.target.value)}
                      placeholder="Enter custom amount"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}

                {/* Payment Method Selection */}
                {purchaseMethod === 'fiat' && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Payment Method
                    </label>
                    <div className="space-y-2">
                      <button
                        onClick={() => setFiatMethod('card')}
                        className={`w-full p-3 rounded-lg border text-left transition-colors ${
                          fiatMethod === 'card'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center">
                          <CreditCardIcon className="h-5 w-5 mr-3" />
                          <div>
                            <div className="font-medium">Credit/Debit Card</div>
                            <div className="text-sm text-gray-500">Instant • 2.9% fee</div>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => setFiatMethod('apple_pay')}
                        className={`w-full p-3 rounded-lg border text-left transition-colors ${
                          fiatMethod === 'apple_pay'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center">
                          <DevicePhoneMobileIcon className="h-5 w-5 mr-3" />
                          <div>
                            <div className="font-medium">Apple Pay</div>
                            <div className="text-sm text-gray-500">Instant • 2.9% fee</div>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {purchaseMethod === 'crypto' && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Pay With
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setCryptoMethod('ETH')}
                        className={`p-3 rounded-lg border text-center transition-colors ${
                          cryptoMethod === 'ETH'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-medium">ETH</div>
                        <div className="text-sm text-gray-500">Ethereum</div>
                      </button>
                      <button
                        onClick={() => setCryptoMethod('USDC')}
                        className={`p-3 rounded-lg border text-center transition-colors ${
                          cryptoMethod === 'USDC'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-medium">USDC</div>
                        <div className="text-sm text-gray-500">USD Coin</div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Quote Display */}
                {quote && purchaseMethod !== 'earn' && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">You'll receive:</span>
                      <span className="font-medium">{quote.ldaoAmount} LDAO</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">
                        {purchaseMethod === 'crypto' ? `${cryptoMethod} cost:` : 'USD cost:'}
                      </span>
                      <span className="font-medium">
                        {purchaseMethod === 'crypto' 
                          ? `${cryptoMethod === 'ETH' ? quote.ethAmount : quote.usdcAmount} ${cryptoMethod}`
                          : `$${quote.usdAmount}`
                        }
                      </span>
                    </div>
                    {quote.discount > 0 && (
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-green-600">Volume discount:</span>
                        <span className="font-medium text-green-600">{quote.discount}%</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>Estimated time:</span>
                      <span>{quote.estimatedTime}</span>
                    </div>
                  </div>
                )}

                {/* Earn Options */}
                {purchaseMethod === 'earn' && (
                  <div className="mb-6">
                    <div className="text-center py-8">
                      <h4 className="text-lg font-medium text-gray-900 mb-2">
                        Earn LDAO Tokens
                      </h4>
                      <p className="text-gray-600 mb-4">
                        Complete activities to earn free LDAO tokens
                      </p>
                      <button
                        onClick={() => {
                          onClose();
                          // Navigate to earn page
                          window.location.href = '/earn';
                        }}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        View Earning Opportunities
                      </button>
                    </div>
                  </div>
                )}

                {/* Purchase Button */}
                {purchaseMethod !== 'earn' && (
                  <div className="flex space-x-3">
                    <button
                      onClick={onClose}
                      className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePurchase}
                      disabled={purchasing || loading || !quote}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {purchasing ? 'Processing...' : `Purchase ${ldaoAmount} LDAO`}
                    </button>
                  </div>
                )}

                {/* Disclaimer */}
                <div className="mt-4 text-xs text-gray-500 text-center">
                  By purchasing LDAO tokens, you agree to our Terms of Service and acknowledge 
                  that cryptocurrency investments carry risk.
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}