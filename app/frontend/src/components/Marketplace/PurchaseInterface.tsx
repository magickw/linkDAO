/**
 * Unified Purchase Interface - Consolidates all purchase interactions
 * Replaces multiple purchase modals with a single, consistent interface
 */

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { X, ShoppingCart, Heart, Share2, AlertTriangle } from 'lucide-react';
import { MarketplaceListing } from '@/services/marketplaceService';
import QuickBuy from './QuickBuy';
import { useToast } from '@/context/ToastContext';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';
import { ImageWithFallback } from '@/utils/imageUtils';

interface PurchaseInterfaceProps {
  listing: MarketplaceListing;
  isOpen: boolean;
  onClose: () => void;
  onPurchaseComplete?: (orderId?: string) => void;
}

type ViewMode = 'details' | 'quickbuy' | 'specs';

export const PurchaseInterface: React.FC<PurchaseInterfaceProps> = ({
  listing,
  isOpen,
  onClose,
  onPurchaseComplete
}) => {
  const { address, isConnected } = useAccount();
  const { addToast } = useToast();
  const [currentView, setCurrentView] = useState<ViewMode>('details');
  const [showQuickBuy, setShowQuickBuy] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentView('details');
      setShowQuickBuy(false);
    }
  }, [isOpen]);

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const formatItemType = (type: string) => {
    return type.charAt(0) + type.slice(1).toLowerCase().replace('_', ' ');
  };

  const formatPrice = (price: string) => {
    const ethPrice = parseFloat(price);
    const usdPrice = (ethPrice * 1650).toFixed(2);
    return { eth: ethPrice, usd: parseFloat(usdPrice) };
  };

  const price = formatPrice(listing.price);

  const handleSaveItem = () => {
    if (!isConnected) {
      addToast('Please connect your wallet to save items', 'error');
      return;
    }
    setIsSaved(!isSaved);
    addToast(isSaved ? 'Item removed from saved' : 'Item saved to your collection', 'success');
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: listing.metadataURI || 'Amazing Item',
          text: `Check out this ${formatItemType(listing.itemType)} on LinkDAO Marketplace!`,
          url: window.location.href
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(window.location.href);
        addToast('Link copied to clipboard!', 'success');
      }
    } catch (error) {
      addToast('Failed to share', 'error');
    }
  };

  const handleQuickBuy = () => {
    if (!isConnected) {
      addToast('Please connect your wallet', 'error');
      return;
    }
    setShowQuickBuy(true);
  };

  const handlePurchaseComplete = (orderId?: string) => {
    setShowQuickBuy(false);
    onPurchaseComplete?.(orderId);
    if (orderId) {
      // Keep modal open to show success, but allow closing
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Quick Buy Modal */}
      <QuickBuy
        listing={listing}
        isOpen={showQuickBuy}
        onClose={() => setShowQuickBuy(false)}
        onSuccess={handlePurchaseComplete}
      />

      {/* Main Purchase Interface */}
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <GlassPanel variant="primary" className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <h2 className="text-2xl font-bold text-white">Purchase Details</h2>
              <button
                onClick={onClose}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
                {/* Left Column - Product Image */}
                <div className="space-y-4">
                  <div className="aspect-square bg-gray-800/50 rounded-lg overflow-hidden">
                    <ImageWithFallback
                      src=""
                      alt={listing.metadataURI || 'Product image'}
                      className="w-full h-full object-cover"
                      fallbackType="product"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      variant="outline"
                      onClick={handleSaveItem}
                      className={`flex items-center justify-center ${
                        isSaved ? 'text-red-400 border-red-400/30' : 'text-gray-400 border-gray-400/30'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleShare}
                      className="flex items-center justify-center text-gray-400 border-gray-400/30"
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentView('specs')}
                      className={`flex items-center justify-center ${
                        currentView === 'specs' ? 'text-blue-400 border-blue-400/30' : 'text-gray-400 border-gray-400/30'
                      }`}
                    >
                      Specs
                    </Button>
                  </div>
                </div>

                {/* Right Column - Product Details */}
                <div className="space-y-6">
                  {/* Product Title */}
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                      {listing.metadataURI || 'Unnamed Item'}
                    </h1>
                    <div className="flex items-center space-x-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-300 border border-blue-400/30">
                        {formatItemType(listing.itemType)}
                      </span>
                      <span className="text-gray-400 text-sm">
                        Seller: {formatAddress(listing.sellerWalletAddress)}
                      </span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg p-6">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-gray-400 text-sm mb-1">Price</p>
                        <p className="text-4xl font-bold text-white">{price.eth} ETH</p>
                        <p className="text-gray-400 text-sm">≈ ${price.usd.toLocaleString()} USD</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 text-sm mb-1">Quantity</p>
                        <p className="text-xl font-semibold text-white">{listing.quantity}</p>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Content Based on View */}
                  {currentView === 'details' && (
                    <div className="space-y-4">
                      {/* Description */}
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
                        <p className="text-gray-300 leading-relaxed">
                          {listing.metadataURI ? 
                            `This is a premium ${formatItemType(listing.itemType)} from a verified seller. 
                            The item is authentic and comes with blockchain verification.` :
                            'No description available for this item.'
                          }
                        </p>
                      </div>

                      {/* Trust Indicators */}
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-green-400 font-medium">Protected Purchase</span>
                        </div>
                        <p className="text-gray-300 text-sm">
                          This transaction is protected by escrow. Your funds will only be released 
                          after you confirm receipt of the item.
                        </p>
                      </div>
                    </div>
                  )}

                  {currentView === 'specs' && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white mb-2">Specifications</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-800/50 rounded-lg p-3">
                          <p className="text-gray-400 text-sm">Type</p>
                          <p className="text-white font-medium">{formatItemType(listing.itemType)}</p>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-3">
                          <p className="text-gray-400 text-sm">Status</p>
                          <p className="text-green-400 font-medium">{listing.status}</p>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-3">
                          <p className="text-gray-400 text-sm">Listing Type</p>
                          <p className="text-white font-medium">{listing.listingType.replace('_', ' ')}</p>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-3">
                          <p className="text-gray-400 text-sm">Available</p>
                          <p className="text-white font-medium">{listing.quantity} units</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Warning for Own Listings */}
                  {address && address.toLowerCase() === listing.sellerWalletAddress.toLowerCase() && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-400" />
                        <span className="text-yellow-400 font-medium">Your Listing</span>
                      </div>
                      <p className="text-gray-300 text-sm mt-1">
                        You cannot purchase your own listing.
                      </p>
                    </div>
                  )}

                  {/* Purchase Actions */}
                  <div className="space-y-3 pt-4 border-t border-gray-700">
                    <Button
                      variant="primary"
                      onClick={handleQuickBuy}
                      disabled={!isConnected || address?.toLowerCase() === listing.sellerWalletAddress.toLowerCase()}
                      className="w-full py-4 text-lg font-semibold"
                    >
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      Buy Now - {listing.price} ETH
                    </Button>
                    
                    <p className="text-center text-gray-400 text-sm">
                      Protected by escrow • Instant delivery for digital items
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>
    </>
  );
};

export default PurchaseInterface;