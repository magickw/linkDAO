import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { PaymentMethod, tokenService, TokenInfo } from '../../services/tokenService';
import PaymentMethodSelector from './PaymentMethodSelector';

interface ListNFTModalProps {
  isOpen: boolean;
  onClose: () => void;
  nft: {
    tokenId: number;
    name: string;
    image: string;
    owner: string;
  };
  marketplaceAddress: string;
  onSuccess: () => void;
}

export const ListNFTModal: React.FC<ListNFTModalProps> = ({
  isOpen,
  onClose,
  nft,
  marketplaceAddress,
  onSuccess
}) => {
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('7'); // days
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.ETH);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [step, setStep] = useState<'form' | 'processing' | 'success' | 'error'>('form');

  useEffect(() => {
    if (isOpen) {
      loadTokenInfo();
    }
  }, [isOpen, paymentMethod]);

  const loadTokenInfo = async () => {
    try {
      await tokenService.initialize();
      const info = await tokenService.getTokenInfo(paymentMethod);
      setTokenInfo(info);
    } catch (err) {
      console.error('Failed to load token info:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!price || parseFloat(price) <= 0) {
      setError('Please enter a valid price');
      return;
    }

    if (!tokenInfo) {
      setError('Token information not loaded');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setStep('processing');

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Get marketplace contract
      const marketplaceABI = [
        'function listNFT(uint256 tokenId, uint256 price, uint256 duration, uint8 paymentMethod)',
        'function approve(address to, uint256 tokenId)',
        'function getApproved(uint256 tokenId) view returns (address)'
      ];
      const marketplace = new ethers.Contract(marketplaceAddress, marketplaceABI, signer);

      // Check if marketplace is approved to transfer NFT
      const approvedAddress = await marketplace.getApproved(nft.tokenId);
      if (approvedAddress.toLowerCase() !== marketplaceAddress.toLowerCase()) {
        // Approve marketplace to transfer NFT
        const approveTx = await marketplace.approve(marketplaceAddress, nft.tokenId);
        await approveTx.wait();
      }

      // Convert price to correct decimals
      const priceBigInt = tokenService.parseAmount(price, tokenInfo.decimals);

      // Convert duration to seconds
      const durationSeconds = parseInt(duration) * 24 * 60 * 60;

      // List NFT
      const listTx = await marketplace.listNFT(
        nft.tokenId,
        priceBigInt,
        durationSeconds,
        paymentMethod
      );

      const receipt = await listTx.wait();
      setTxHash(receipt.hash);
      setStep('success');

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Listing error:', err);
      setError(err.message || 'Failed to list NFT. Please try again.');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (step) {
      case 'form':
        return (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* NFT Preview */}
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <img src={nft.image} alt={nft.name} className="w-full h-48 object-cover" />
              <div className="p-4">
                <h4 className="font-semibold text-gray-900">{nft.name}</h4>
                <p className="text-sm text-gray-600 mt-1">Token ID: {nft.tokenId}</p>
              </div>
            </div>

            {/* Payment Method Selector */}
            <PaymentMethodSelector
              selectedMethod={paymentMethod}
              onMethodChange={setPaymentMethod}
              showBalance={false}
            />

            {/* Price Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Price ({tokenInfo?.symbol})
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={`0.00`}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <div className="absolute right-3 top-3 text-gray-500 font-medium">
                  {tokenInfo?.symbol}
                </div>
              </div>
              {price && tokenInfo && (
                <p className="text-sm text-gray-600">
                  ≈ ${(parseFloat(price) * (tokenInfo.symbol === 'USDC' || tokenInfo.symbol === 'USDT' ? 1 : 2000)).toFixed(2)} USD
                </p>
              )}
            </div>

            {/* Duration Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Listing Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="1">1 day</option>
                <option value="3">3 days</option>
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
              </select>
            </div>

            {/* Platform Fee Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="flex-1 text-sm text-blue-800">
                  <p className="font-medium">Platform Fee: 2.5%</p>
                  <p className="text-xs mt-1">You will receive {price ? (parseFloat(price) * 0.975).toFixed(4) : '0.00'} {tokenInfo?.symbol} after the sale (minus any royalties)</p>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !price || parseFloat(price) <= 0}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Listing...' : 'List NFT for Sale'}
            </button>
          </form>
        );

      case 'processing':
        return (
          <div className="text-center space-y-4 py-8">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Listing NFT...</h3>
            <p className="text-sm text-gray-600">Please wait while your transaction is being confirmed</p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center space-y-4 py-8">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">NFT Listed Successfully!</h3>
            <p className="text-sm text-gray-600">
              Your NFT is now listed for {price} {tokenInfo?.symbol}
            </p>
            {txHash && (
              <a
                href={`https://etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                View transaction →
              </a>
            )}
          </div>
        );

      case 'error':
        return (
          <div className="text-center space-y-4 py-8">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Listing Failed</h3>
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={() => setStep('form')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              Try Again
            </button>
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        {/* Modal panel */}
        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          {/* Close button */}
          {step === 'form' && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Header */}
          {step === 'form' && (
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">List NFT for Sale</h2>
              <p className="text-sm text-gray-600 mt-1">Choose your preferred payment method and set a price</p>
            </div>
          )}

          {/* Modal content */}
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default ListNFTModal;
