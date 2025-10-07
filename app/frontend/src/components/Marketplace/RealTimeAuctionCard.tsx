/**
 * Real-Time Auction Card Component
 * Displays auction information with real-time updates and bidding functionality
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { marketplaceService, MockProduct } from '../../services/unifiedMarketplaceService';

interface RealTimeAuctionCardProps {
  auction: MockProduct;
  userAddress?: string;
  onBidPlaced?: (auctionId: string, bidAmount: number) => void;
  onWatchToggle?: (auctionId: string, isWatched: boolean) => void;
  showBidding?: boolean;
  className?: string;
}

export default function RealTimeAuctionCard({
  auction,
  userAddress,
  onBidPlaced,
  onWatchToggle,
  showBidding = true,
  className = ''
}: RealTimeAuctionCardProps) {
  const [currentBid, setCurrentBid] = useState(parseFloat(auction.highestBid || auction.price));
  const [bidCount, setBidCount] = useState(auction.bidCount || 0);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isWatched, setIsWatched] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [auctionStats, setAuctionStats] = useState<any>(null);
  const [recentBids, setRecentBids] = useState<any[]>([]);
  const [isEnded, setIsEnded] = useState(false);

  // Calculate time remaining
  const calculateTimeRemaining = useCallback(() => {
    if (!auction.auctionEndTime) return 'No end time';
    
    const endTime = new Date(auction.auctionEndTime);
    const now = new Date();
    const diff = endTime.getTime() - now.getTime();
    
    if (diff <= 0) {
      setIsEnded(true);
      return 'Auction Ended';
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }, [auction.auctionEndTime]);

  // Update time remaining every second
  useEffect(() => {
    const updateTime = () => {
      setTimeRemaining(calculateTimeRemaining());
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [calculateTimeRemaining]);

  // Load auction stats and recent bids
  useEffect(() => {
    const loadAuctionData = async () => {
      try {
        // Note: These methods would need to be implemented in the unified service
        // For now, we'll use placeholder data
        const stats = null;
        const bids: any[] = [];

        if (stats) {
          setAuctionStats(stats);
        }

        setRecentBids(bids.slice(0, 3)); // Show last 3 bids
      } catch (error) {
        console.error('Error loading auction data:', error);
      }
    };

    loadAuctionData();
  }, [auction.id]);

  // Subscribe to real-time updates
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const subscribeToUpdates = async () => {
      try {
        unsubscribe = await marketplaceService.subscribeToAuctionUpdates(
          auction.id,
          (update) => {
            switch (update.type) {
              case 'bid':
                setCurrentBid(update.data.amount);
                setBidCount(prev => prev + 1);
                setRecentBids(prev => [update.data, ...prev.slice(0, 2)]);
                break;
              case 'end':
                setIsEnded(true);
                break;
              case 'extend':
                // Handle auction time extension
                break;
            }
          }
        );
      } catch (error) {
        console.error('Error subscribing to auction updates:', error);
      }
    };

    subscribeToUpdates();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [auction.id]);

  const handlePlaceBid = async () => {
    if (!userAddress || !bidAmount || isPlacingBid) return;

    const bid = parseFloat(bidAmount);
    if (bid <= currentBid) {
      alert('Bid must be higher than current bid');
      return;
    }

    setIsPlacingBid(true);

    try {
      const success = await marketplaceService.placeBid(auction.id, bid, userAddress);
      
      if (success) {
        setBidAmount('');
        onBidPlaced?.(auction.id, bid);
        // Real-time update will handle UI updates
      } else {
        alert('Failed to place bid. Please try again.');
      }
    } catch (error) {
      console.error('Error placing bid:', error);
      alert('Error placing bid. Please try again.');
    } finally {
      setIsPlacingBid(false);
    }
  };

  const handleWatchToggle = async () => {
    if (!userAddress) return;

    try {
      // Note: Watch/unwatch functionality would need to be implemented in unified service
      // For now, we'll simulate success
      const success = true;
      
      if (success) {
        setIsWatched(!isWatched);
        onWatchToggle?.(auction.id, !isWatched);
      }
    } catch (error) {
      console.error('Error toggling watch status:', error);
    }
  };

  const formatCurrency = (amount: number, symbol: string = 'ETH') => {
    return `${amount.toFixed(4)} ${symbol}`;
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      {/* Auction Image */}
      <div className="relative">
        <Link href={`/marketplace/auction/${auction.id}`}>
          <img
            src={auction.images[0] || '/placeholder-product.jpg'}
            alt={auction.title}
            className="w-full h-48 object-cover hover:scale-105 transition-transform duration-200"
          />
        </Link>
        
        {/* Status Badge */}
        <div className="absolute top-2 left-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            isEnded 
              ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
          }`}>
            {isEnded ? 'Ended' : 'Live Auction'}
          </span>
        </div>

        {/* Watch Button */}
        {userAddress && (
          <button
            onClick={handleWatchToggle}
            className="absolute top-2 right-2 p-2 bg-white dark:bg-gray-800 rounded-full shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <svg 
              className={`h-4 w-4 ${isWatched ? 'text-red-500' : 'text-gray-400'}`} 
              fill={isWatched ? 'currentColor' : 'none'} 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        )}
      </div>

      {/* Auction Info */}
      <div className="p-4">
        <Link href={`/marketplace/auction/${auction.id}`}>
          <h3 className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            {auction.title}
          </h3>
        </Link>

        {/* Current Bid */}
        <div className="mt-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">Current Bid</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {formatCurrency(currentBid, auction.cryptoSymbol)}
            </span>
          </div>
          
          {bidCount > 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {bidCount} bid{bidCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Time Remaining */}
        <div className="mt-2 flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">Time Remaining</span>
          <span className={`text-sm font-medium ${
            isEnded 
              ? 'text-gray-500 dark:text-gray-400'
              : timeRemaining.includes('s') && !timeRemaining.includes('m') && !timeRemaining.includes('h')
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-900 dark:text-white'
          }`}>
            {timeRemaining}
          </span>
        </div>

        {/* Seller Info */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                {auction.seller.name.charAt(0)}
              </span>
            </div>
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">
              {auction.seller.name}
            </span>
          </div>
          
          {auction.seller.verified && (
            <div className="flex items-center">
              <svg className="h-4 w-4 text-blue-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-xs text-blue-600 dark:text-blue-400">Verified</span>
            </div>
          )}
        </div>

        {/* Recent Bids */}
        {recentBids.length > 0 && (
          <div className="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Recent Bids</div>
            <div className="space-y-1">
              {recentBids.map((bid, index) => (
                <div key={bid.id} className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 dark:text-gray-300">
                    {formatAddress(bid.bidderAddress)}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(bid.amount, auction.cryptoSymbol)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bidding Section */}
        {showBidding && userAddress && !isEnded && (
          <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex gap-2">
              <input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder={`Min: ${(currentBid + 0.001).toFixed(4)}`}
                step="0.001"
                min={currentBid + 0.001}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handlePlaceBid}
                disabled={isPlacingBid || !bidAmount || parseFloat(bidAmount) <= currentBid}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-md transition-colors disabled:cursor-not-allowed"
              >
                {isPlacingBid ? 'Bidding...' : 'Bid'}
              </button>
            </div>
          </div>
        )}

        {/* Auction Stats */}
        {auctionStats && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
            <div>Views: {auctionStats.viewCount}</div>
            <div>Watchers: {auctionStats.watcherCount}</div>
          </div>
        )}
      </div>
    </div>
  );
}