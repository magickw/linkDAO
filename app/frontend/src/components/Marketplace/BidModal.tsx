import React, { useState, useMemo } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { 
  MarketplaceListing,
  UnifiedMarketplaceService,
  PlaceBidInput
} from '@/services/marketplaceService';
import { useToast } from '@/context/ToastContext';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';

interface BidModalProps {
  listing: MarketplaceListing;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BidModal: React.FC<BidModalProps> = ({ listing, isOpen, onClose, onSuccess }) => {
  const { address } = useAccount();
  const { data: balance } = useBalance({ address });
  const { addToast } = useToast();
  const [bidAmount, setBidAmount] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Memoize the marketplace service to prevent recreation on every render
  const marketplaceService = useMemo(() => new UnifiedMarketplaceService(), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address) {
      addToast('Please connect your wallet', 'error');
      return;
    }
    
    if (address.toLowerCase() === listing.sellerWalletAddress.toLowerCase()) {
      addToast('You cannot bid on your own listing', 'error');
      return;
    }
    
    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      addToast('Please enter a valid bid amount', 'error');
      return;
    }
    
    // Check balance
    const userBalance = balance ? parseFloat(balance.formatted) : 0;
    if (userBalance < parseFloat(bidAmount)) {
      addToast(`Insufficient balance. You need ${bidAmount} ETH but have ${userBalance.toFixed(4)} ETH`, 'error');
      return;
    }
    
    // For auctions, bid must be higher than current highest bid
    if (listing.listingType === 'AUCTION') {
      const currentHighest = listing.highestBid ? parseFloat(listing.highestBid) : parseFloat(listing.price);
      if (parseFloat(bidAmount) <= currentHighest) {
        addToast(`Bid must be higher than current highest bid of ${currentHighest} ETH`, 'error');
        return;
      }
    }
    
    try {
      setLoading(true);
      
      const bidInput: PlaceBidInput = {
        bidderWalletAddress: address,
        amount: bidAmount
      };
      
      await marketplaceService.placeBid(listing.id, bidInput);
      
      addToast('Bid placed successfully!', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Bid error:', err);
      addToast(err.message || 'Failed to place bid', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <GlassPanel variant="primary" className="w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-white">
              Place Bid
            </h3>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="mb-6">
            <h4 className="text-lg font-medium text-white mb-2">
              {listing.metadataURI || 'Unnamed Item'}
            </h4>
            <p className="text-white/70 text-sm mb-4">
              Seller: {listing.sellerWalletAddress.substring(0, 6)}...{listing.sellerWalletAddress.substring(listing.sellerWalletAddress.length - 4)}
            </p>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-white/80">Starting Price:</span>
                <span className="text-white">{listing.price} ETH</span>
              </div>
              {listing.highestBid && (
                <div className="flex justify-between items-center mt-2">
                  <span className="text-white/80">Current Highest:</span>
                  <span className="text-white font-semibold">{listing.highestBid} ETH</span>
                </div>
              )}
              <div className="flex justify-between items-center mt-2">
                <span className="text-white/80">Your Balance:</span>
                <span className="text-white">{balance ? parseFloat(balance.formatted).toFixed(4) : '0.0000'} ETH</span>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="bidAmount" className="block text-sm font-medium text-white/90 mb-2">
                Bid Amount (ETH)
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="bidAmount"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  step="0.0001"
                  min="0"
                  className="w-full px-3 py-2 pr-12 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                  placeholder="0.00"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-white/60 text-sm">ETH</span>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 border-white/30 text-white/80 hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                className="flex-1"
              >
                {loading ? 'Processing...' : 'Place Bid'}
              </Button>
            </div>
          </form>
        </div>
      </GlassPanel>
    </div>
  );
};

export default BidModal;