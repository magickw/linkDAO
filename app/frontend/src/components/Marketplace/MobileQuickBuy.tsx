/**
 * MobileQuickBuy Component - Mobile-optimized purchase flow
 * Bottom sheet design with touch-friendly interactions
 */

import React, { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { X, ShoppingCart, Wallet, Shield, CheckCircle, AlertCircle, Loader2, ChevronUp, ChevronDown } from 'lucide-react';
import { MarketplaceListing } from '@/services/marketplaceService';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/design-system/components/Button';
import { useEnhancedCart } from '@/hooks/useEnhancedCart';

interface MobileQuickBuyProps {
  listing: MarketplaceListing;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (orderId?: string) => void;
}

type MobileQuickBuyStep = 'review' | 'payment' | 'processing' | 'confirmation';

export const MobileQuickBuy: React.FC<MobileQuickBuyProps> = ({
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
  const [currentStep, setCurrentStep] = useState<MobileQuickBuyStep>('review');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useEscrow, setUseEscrow] = useState(true);
  const [deliveryInfo, setDeliveryInfo] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('review');
      setError(null);
      setUseEscrow(true);
      setOrderId(null);
      setIsExpanded(false);
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

      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 2000);

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
      inventory: listing.inventory,
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
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div className={`relative bg-gray-900 w-full max-w-lg rounded-t-3xl shadow-2xl transition-transform duration-300 ${
        isExpanded ? 'max-h-[90vh]' : 'max-h-[70vh]'
      }`}>
        {/* Drag Handle */}
        <div className="flex justify-center py-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            {isExpanded ? <ChevronDown className="w-6 h-6" /> : <ChevronUp className="w-6 h-6" />}
          </button>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">Quick Purchase</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Product Info */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-20 h-20 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="w-10 h-10 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-medium text-lg truncate">
                {listing.metadataURI || 'Unnamed Item'}
              </h3>
              <p className="text-gray-400 text-sm">
                {formatItemType(listing.itemType)} • {formatAddress(listing.sellerWalletAddress)}
              </p>
              <p className="text-gray-500 text-xs mt-1">
                {listing.listingType.replace('_', ' ')}
              </p>
            </div>
          </div>

          {/* Price */}
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-400 text-sm">Total Price</p>
                <p className="text-3xl font-bold text-white">{listing.price} ETH</p>
                <p className="text-gray-400 text-sm">≈ ${(parseFloat(listing.price) * 1650).toFixed(2)} USD</p>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm">Available</p>
                <p className="text-xl font-semibold text-white">{listing.inventory}</p>
              </div>
            </div>
            
            {/* Balance Check */}
            {balance && (
              <div className={`mt-3 pt-3 border-t border-gray-700 flex justify-between items-center ${
                canAffordPurchase() ? 'text-green-400' : 'text-red-400'
              }`}>
                <span className="text-sm">Your Balance</span>
                <span className="text-sm font-medium">{getUserBalance().toFixed(4)} ETH</span>
              </div>
            )}
          </div>

          {/* Review Step */}
          {currentStep === 'review' && (
            <div className="space-y-6">
              {/* Escrow Protection */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Shield className="w-5 h-5 text-blue-400 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium">Escrow Protection</p>
                      <p className="text-gray-400 text-sm">Secure your purchase with escrow</p>
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
              </div>

              {/* Delivery Info for Physical Items */}
              {listing.itemType === 'PHYSICAL' && (
                <div>
                  <label className="block text-white font-medium mb-3">
                    Delivery Information
                  </label>
                  <textarea
                    value={deliveryInfo}
                    onChange={(e) => setDeliveryInfo(e.target.value)}
                    placeholder="Enter your delivery address..."
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                  />
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 pb-6">
                <Button
                  variant="primary"
                  onClick={handleQuickBuy}
                  disabled={loading || !canAffordPurchase()}
                  className="w-full py-4 text-lg font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      Buy Now
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleAddToCart}
                  disabled={loading}
                  className="w-full py-3"
                >
                  Add to Cart
                </Button>
              </div>
            </div>
          )}

          {/* Processing Step */}
          {currentStep === 'processing' && (
            <div className="text-center py-12">
              <Loader2 className="w-16 h-16 text-blue-400 animate-spin mx-auto mb-6" />
              <h3 className="text-white text-xl font-medium mb-3">Processing Purchase</h3>
              <p className="text-gray-400">Securing your transaction on the blockchain...</p>
              <div className="mt-6 flex justify-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-75"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-150"></div>
              </div>
            </div>
          )}

          {/* Confirmation Step */}
          {currentStep === 'confirmation' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-white text-xl font-medium mb-3">Purchase Successful!</h3>
              <p className="text-gray-400 mb-4">Your order has been confirmed</p>
              {orderId && (
                <p className="text-gray-500 text-sm mb-6">Order ID: {orderId}</p>
              )}
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                <p className="text-green-400 text-sm">
                  You'll receive a notification when your order is ready for delivery.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileQuickBuy;