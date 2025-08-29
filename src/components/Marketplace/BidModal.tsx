import React, { useState } from 'react';
import { 
  MarketplaceListing,
  MarketplaceService,
  PlaceBidInput
} from '@/services/marketplaceService';

interface BidModalProps {
  listing: MarketplaceListing;
  isOpen: boolean;
  onClose: () => void;
  userAddress: string;
  onSuccess: () => void;
}

const BidModal: React.FC<BidModalProps> = ({ 
  listing, 
  isOpen, 
  onClose, 
  userAddress,
  onSuccess
}) => {
  const [bidAmount, setBidAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const marketplaceService = new MarketplaceService();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userAddress) {
      setError('Please connect your wallet');
      return;
    }
    
    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      setError('Please enter a valid bid amount');
      return;
    }
    
    // For auctions, bid must be higher than current highest bid
    if (listing.listingType === 'AUCTION') {
      const currentHighest = listing.highestBid ? parseFloat(listing.highestBid) : 0;
      if (parseFloat(bidAmount) <= currentHighest) {
        setError(`Bid must be higher than current highest bid of ${currentHighest} ETH`);
        return;
      }
    }
    
    try {
      setLoading(true);
      setError('');
      
      const bidInput: PlaceBidInput = {
        bidderAddress: userAddress,
        amount: bidAmount
      };
      
      await marketplaceService.placeBid(listing.id, bidInput);
      
      // Success
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to place bid');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {listing.listingType === 'AUCTION' ? 'Place Bid' : 'Buy Item'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-900">{listing.metadataURI}</h4>
            <p className="text-sm text-gray-500 mt-1">
              Seller: {listing.sellerAddress.substring(0, 6)}...{listing.sellerAddress.substring(listing.sellerAddress.length - 4)}
            </p>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="bidAmount" className="block text-sm font-medium text-gray-700">
                {listing.listingType === 'AUCTION' ? 'Bid Amount (ETH)' : 'Price (ETH)'}
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="number"
                  id="bidAmount"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  step="0.0001"
                  min="0"
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pr-12 sm:text-sm border-gray-300 rounded-md"
                  placeholder="0.00"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">ETH</span>
                </div>
              </div>
              {listing.listingType === 'AUCTION' && listing.highestBid && (
                <p className="mt-1 text-sm text-gray-500">
                  Current highest bid: {listing.highestBid} ETH
                </p>
              )}
            </div>
            
            {error && (
              <div className="mb-4 text-sm text-red-600">
                {error}
              </div>
            )}
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-indigo-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Processing...' : (listing.listingType === 'AUCTION' ? 'Place Bid' : 'Buy Now')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BidModal;