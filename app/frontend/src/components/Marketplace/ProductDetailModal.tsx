import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { MarketplaceListing } from '@/services/marketplaceService';
import { useToast } from '@/context/ToastContext';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';
import { ImageWithFallback } from '@/utils/imageUtils';
import BidModal from './BidModal';
import PurchaseModal from './PurchaseModal';
import MakeOfferModal from './MakeOfferModal';

interface ProductDetailModalProps {
  listing: MarketplaceListing;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  listing,
  isOpen,
  onClose,
  onRefresh
}) => {
  const { address, isConnected } = useAccount();
  const { addToast } = useToast();
  const [showBidModal, setShowBidModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const formatItemType = (type: string) => {
    return type.charAt(0) + type.slice(1).toLowerCase().replace('_', ' ');
  };

  const getTimeRemaining = (endTime: string) => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const diff = end - now;
    
    if (diff <= 0) return 'Auction ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <GlassPanel variant="primary" className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Product Details</h2>
              <button
                onClick={onClose}
                className="text-white/60 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Product Image */}
              <div className="space-y-4">
                <div className="aspect-square bg-gray-800/50 rounded-lg overflow-hidden">
                  <ImageWithFallback
                    src=""
                    alt={listing.metadataURI || 'Product image'}
                    className="w-full h-full object-cover"
                    fallbackType="product"
                  />
                </div>
              </div>

              {/* Product Info */}
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">
                    {listing.metadataURI || 'Unnamed Item'}
                  </h1>
                  <div className="flex items-center space-x-4 mb-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-300 border border-blue-400/30">
                      {formatItemType(listing.itemType)}
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
                      listing.status === 'ACTIVE' 
                        ? 'bg-green-500/20 text-green-300 border-green-400/30' 
                        : 'bg-gray-500/20 text-gray-300 border-gray-400/30'
                    }`}>
                      {listing.status}
                    </span>
                  </div>
                </div>

                {/* Price Section */}
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white/80">
                      {listing.listingType === 'AUCTION' ? 'Starting Price' : 'Price'}
                    </span>
                    <span className="text-2xl font-bold text-white">{listing.price} ETH</span>
                  </div>
                  
                  {listing.listingType === 'AUCTION' && listing.highestBid && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white/80">Current Highest Bid</span>
                      <span className="text-xl font-semibold text-green-300">{listing.highestBid} ETH</span>
                    </div>
                  )}
                  
                  {listing.listingType === 'AUCTION' && listing.endTime && (
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">Time Remaining</span>
                      <span className="text-white font-medium">{getTimeRemaining(listing.endTime)}</span>
                    </div>
                  )}
                </div>

                {/* Seller Info */}
                <div className="bg-white/10 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-2">Seller Information</h3>
                  <div className="flex justify-between items-center">
                    <span className="text-white/80">Wallet Address</span>
                    <span className="text-white font-mono">{formatAddress(listing.sellerWalletAddress)}</span>
                  </div>
                </div>

                {/* Product Details */}
                <div className="bg-white/10 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-2">Details</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">Quantity Available</span>
                      <span className="text-white">{listing.quantity >= 999999 ? 'Unlimited' : listing.quantity}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">Listing Type</span>
                      <span className="text-white">{listing.listingType.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">Listed On</span>
                      <span className="text-white">{new Date(listing.startTime).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {listing.listingType === 'AUCTION' ? (
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() => {
                        if (!isConnected) {
                          addToast('Please connect your wallet first', 'warning');
                          return;
                        }
                        setShowBidModal(true);
                      }}
                    >
                      Place Bid
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="primary"
                        className="w-full"
                        onClick={() => {
                          if (!isConnected) {
                            addToast('Please connect your wallet first', 'warning');
                            return;
                          }
                          setShowPurchaseModal(true);
                        }}
                      >
                        Buy Now - {listing.price} ETH
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-white/30 text-white/80 hover:bg-white/10"
                        onClick={() => {
                          if (!isConnected) {
                            addToast('Please connect your wallet first', 'warning');
                            return;
                          }
                          setShowOfferModal(true);
                        }}
                      >
                        Make Offer
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* Modals */}
      <BidModal
        listing={listing}
        isOpen={showBidModal}
        onClose={() => setShowBidModal(false)}
        onSuccess={() => {
          onRefresh();
          setShowBidModal(false);
        }}
      />
      <PurchaseModal
        listing={listing}
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        onSuccess={() => {
          onRefresh();
          setShowPurchaseModal(false);
          onClose();
        }}
      />
      <MakeOfferModal
        listing={listing}
        isOpen={showOfferModal}
        onClose={() => setShowOfferModal(false)}
        onSuccess={() => {
          onRefresh();
          setShowOfferModal(false);
        }}
      />
    </>
  );
};

export default ProductDetailModal;