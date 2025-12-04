import React, { useState } from 'react';
import { format } from 'date-fns';
import { 
  MarketplaceListing
} from '@/services/marketplaceService';
import PurchaseInterface from './PurchaseInterface';

interface ListingCardProps {
  listing: MarketplaceListing;
  onAction?: (listing: MarketplaceListing) => void;
}

const ListingCard: React.FC<ListingCardProps> = ({ listing, onAction }) => {
  const [showPurchaseInterface, setShowPurchaseInterface] = useState(false);

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const formatItemType = (type: string) => {
    return type.charAt(0) + type.slice(1).toLowerCase().replace('_', ' ');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'SOLD':
        return 'bg-blue-100 text-blue-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'EXPIRED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getListingTypeColor = (type: string) => {
    switch (type) {
      case 'FIXED_PRICE':
        return 'bg-indigo-100 text-indigo-800';
      case 'AUCTION':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleBuyNow = () => {
    setShowPurchaseInterface(true);
  };

  const handlePurchaseComplete = () => {
    setShowPurchaseInterface(false);
    onAction?.(listing);
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow duration-300">
      <div className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium text-gray-900 truncate">
              {listing.metadataURI || 'Unnamed Item'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Seller: {formatAddress(listing.sellerWalletAddress)}
            </p>
          </div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(listing.status)}`}>
            {listing.status}
          </span>
        </div>
        
        <div className="mt-4">
          <p className="text-2xl font-bold text-gray-900">
            {listing.price} ETH
          </p>
          <p className="text-sm text-gray-500">
            Quantity: {listing.quantity}
          </p>
        </div>
        
        <div className="mt-4 flex flex-wrap gap-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getListingTypeColor(listing.listingType)}`}>
            {listing.listingType.replace('_', ' ')}
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {formatItemType(listing.itemType)}
          </span>
          {listing.listingType === 'AUCTION' && listing.endTime && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Ends: {format(new Date(listing.endTime), 'MMM d, yyyy')}
            </span>
          )}
        </div>
        
        <div className="mt-6 flex space-x-3">
          <button
            className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 text-sm font-medium"
            onClick={handleBuyNow}
          >
            {listing.listingType === 'AUCTION' ? 'Place Bid' : 'Buy Now'}
          </button>
          {listing.highestBid && (
            <div className="flex items-center text-sm text-gray-500">
              <span className="font-medium">Top Bid:</span>
              <span className="ml-1">{listing.highestBid} ETH</span>
            </div>
          )}
        </div>
      </div>

      {/* Purchase Interface Modal */}
      <PurchaseInterface
        listing={listing}
        isOpen={showPurchaseInterface}
        onClose={() => setShowPurchaseInterface(false)}
        onPurchaseComplete={handlePurchaseComplete}
      />
    </div>
  );
};

export default ListingCard;