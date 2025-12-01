/**
 * QuickBuy Component - Streamlined purchase flow for single items
 * Provides immediate purchase experience without cart complexity
 */

import React, { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { X, ShoppingBag, Wallet, Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { MarketplaceListing } from '@/services/marketplaceService';
import { useToast } from '@/context/ToastContext';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';
import { useEnhancedCart } from '@/hooks/useEnhancedCart';

interface QuickBuyProps {
  listing: MarketplaceListing;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (orderId?: string) => void;
}

type QuickBuyStep = 'review' | 'payment' | 'processing' | 'confirmation';

export const QuickBuy: React.FC<QuickBuyProps> = ({
  listing,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { addToast } = useToast();
  const cart = useEnhancedCart();

  // State
  const [currentStep, setCurrentStep] = useState<QuickBuyStep>('review');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useEscrow, setUseEscrow] = useState(true);
  const [deliveryInfo, setDeliveryInfo] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('review');
      setError(null);
      setUseEscrow(true);
      setOrderId(null);
    }
  }, [isOpen]);

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const formatItemType = (type: string) => {
    return type.charAt(0) + type.slice(1).toLowerCase().replace('_', ' ');
  };

  const getUserBalance = () => {
    return balance ? parseFloat(balance.formatted) : 0;
  };

  const canAffordPurchase = () => {
    const price = parseFloat(listing.price);
    return getUserBalance() >= price;
  };

  const handleQuickBuy = async () => {
    if (!address || !isConnected) {
      addToast('Please connect your wallet', 'error');
      return;
    }

    if (address.toLowerCase() === listing.sellerWalletAddress.toLowerCase()) {
      addToast('You cannot buy your own listing', 'error');
      return;
    }

    if (!canAffordPurchase()) {
      addToast(`Insufficient balance. You need ${listing.price} ETH`, 'error');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setCurrentStep('processing');

      // Simulate purchase process
      const purchaseData = {
        listingId: listing.id,
        buyerAddress: address,
        sellerAddress: listing.sellerWalletAddress,
        price: listing.price,
        useEscrow,
        deliveryInfo,
        timestamp: new Date().toISOString()
      };

      // API call to process purchase
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000'}/api/marketplace/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('linkdao_access_token') || localStorage.getItem('token')}`,
        },
        body: JSON.stringify(purchaseData),
      });

      if (!response.ok) {
        throw new Error('Purchase failed');
      }

      const result = await response.json();
      setOrderId(result.orderId);
      
      setCurrentStep('confirmation');
      addToast('Purchase successful!', 'success');
      onSuccess(result.orderId);

    } catch (err) {
      console.error('Purchase error:', err);
      setError('Purchase failed. Please try again.');
      addToast('Purchase failed. Please try again.', 'error');
      setCurrentStep('review');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!address || !isConnected) {
      addToast('Please connect your wallet', 'error');
      return;
    }

    const cartProduct = {
      id: listing.id,
      title: listing.metadataURI || 'Unnamed Item',
      description: listing.metadataURI || '',
      image: '',
      price: {
        crypto: listing.price,
        cryptoSymbol: 'ETH',
        fiat: (parseFloat(listing.price) * 1650).toFixed(2),
        fiatSymbol: 'USD'
      },
      seller: {
        id: listing.sellerWalletAddress,
        name: `Seller ${listing.sellerWalletAddress.slice(0, 6)}`,
        avatar: '',
        verified: true,
        daoApproved: false,
        escrowSupported: true
      },
      category: listing.itemType.toLowerCase(),
      isDigital: listing.itemType === 'DIGITAL' || listing.itemType === 'NFT',
      isNFT: listing.itemType === 'NFT',
      inventory: listing.quantity,
      shipping: {
        cost: '0',
        freeShipping: true,
        estimatedDays: listing.itemType === 'DIGITAL' ? 'instant' : '3-5',
        regions: ['US', 'CA', 'EU']
      },
      trust: {
        escrowProtected: true,
        onChainCertified: true,
        safetyScore: 95
      }
    };
    
    cart.addItem(cartProduct);
    addToast('Added to cart!', 'success');
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <GlassPanel variant="primary" className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Quick Purchase</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === 'review' ? 'bg-blue-500 text-white' : 
              currentStep === 'payment' ? 'bg-blue-500 text-white' :
              currentStep === 'processing' ? 'bg-yellow-500 text-white' :
              'bg-green-500 text-white'
            }`}>
              {currentStep === 'confirmation' ? <CheckCircle className="w-4 h-4" /> : '1'}
            </div>
            <div className={`flex-1 h-1 rounded ${
              currentStep === 'review' ? 'bg-gray-600' :
              currentStep === 'payment' ? 'bg-gray-600' :
              currentStep === 'processing' ? 'bg-yellow-500' :
              'bg-green-500'
            }`} />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Review Step */}
          {currentStep === 'review' && (
            <div className="space-y-4">
              {/* Product Info */}
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center">
                  <ShoppingBag className="w-8 h-8 text-gray-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-medium">
                    {listing.metadataURI || 'Unnamed Item'}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {formatItemType(listing.itemType)} • {formatAddress(listing.sellerWalletAddress)}
                  </p>
                </div>
              </div>

              {/* Price */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Price</span>
                  <span className="text-2xl font-bold text-white">{listing.price} ETH</span>
                </div>
                {balance && (
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-gray-400 text-sm">Your Balance</span>
                    <span className={`text-sm font-medium ${
                      canAffordPurchase() ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {getUserBalance().toFixed(4)} ETH
                    </span>
                  </div>
                )}
              </div>

              {/* Escrow Option */}
              <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <div>
                    <p className="text-white text-sm font-medium">Escrow Protection</p>
                    <p className="text-gray-400 text-xs">Secure your purchase with escrow</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useEscrow}
                    onChange={(e) => setUseEscrow(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
              </div>

              {/* Delivery Info for Physical Items */}
              {listing.itemType === 'PHYSICAL' && (
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Delivery Information
                  </label>
                  <textarea
                    value={deliveryInfo}
                    onChange={(e) => setDeliveryInfo(e.target.value)}
                    placeholder="Enter your delivery address..."
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="flex items-center space-x-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  variant="primary"
                  onClick={handleQuickBuy}
                  disabled={loading || !canAffordPurchase()}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Buy Now'
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleAddToCart}
                  disabled={loading}
                  className="w-full"
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Add to Cart
                </Button>
              </div>
            </div>
          )}

          {/* Processing Step */}
          {currentStep === 'processing' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
              <h3 className="text-white text-lg font-medium mb-2">Processing Purchase</h3>
              <p className="text-gray-400">Securing your transaction on the blockchain...</p>
            </div>
          )}

          {/* Confirmation Step */}
          {currentStep === 'confirmation' && (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-white text-lg font-medium mb-2">Purchase Successful!</h3>
              <p className="text-gray-400 mb-4">Your order has been confirmed</p>
              {orderId && (
                <p className="text-gray-500 text-sm mb-4">Order ID: {orderId}</p>
              )}
              <Button
                variant="primary"
                onClick={onClose}
                className="w-full"
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </GlassPanel>
    </div>
  );
};

export default QuickBuy;