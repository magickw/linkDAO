import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  HeartIcon,
  ShareIcon,
  EyeIcon,
  ClockIcon,
  CurrencyDollarIcon,
  FireIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

interface NFT {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  animationUrl?: string;
  price?: string;
  currency: string;
  creator: {
    id: string;
    handle: string;
    walletAddress: string;
  };
  collection?: {
    id: string;
    name: string;
    verified: boolean;
  };
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  isVerified: boolean;
  isLiked?: boolean;
  likes: number;
  views: number;
  listingType?: 'fixed' | 'auction';
  auctionEndTime?: string;
  currentBid?: string;
  lastSale?: {
    price: string;
    currency: string;
    date: string;
  };
}

interface NFTMarketplaceProps {
  onNFTClick?: (nft: NFT) => void;
  onLike?: (nftId: string) => void;
  onShare?: (nft: NFT) => void;
}

export default function NFTMarketplace({ 
  onNFTClick, 
  onLike, 
  onShare 
}: NFTMarketplaceProps) {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [showFilters, setShowFilters] = useState(false);

  const categories = [
    { id: 'all', name: 'All Items', count: 1234 },
    { id: 'art', name: 'Art', count: 456 },
    { id: 'collectibles', name: 'Collectibles', count: 234 },
    { id: 'gaming', name: 'Gaming', count: 123 },
    { id: 'photography', name: 'Photography', count: 89 },
    { id: 'music', name: 'Music', count: 67 },
    { id: 'virtual-worlds', name: 'Virtual Worlds', count: 45 },
  ];

  const sortOptions = [
    { id: 'recent', name: 'Recently Listed' },
    { id: 'price-low', name: 'Price: Low to High' },
    { id: 'price-high', name: 'Price: High to Low' },
    { id: 'most-liked', name: 'Most Liked' },
    { id: 'ending-soon', name: 'Ending Soon' },
  ];

  useEffect(() => {
    fetchNFTs();
  }, [selectedCategory, sortBy, searchQuery]);

  const fetchNFTs = async () => {
    try {
      setLoading(true);
      // Mock data for now - replace with actual API call
      const mockNFTs: NFT[] = [
        {
          id: '1',
          name: 'Cosmic Wanderer #1234',
          description: 'A beautiful cosmic wanderer exploring the digital universe.',
          imageUrl: 'https://via.placeholder.com/400x400/6366f1/ffffff?text=NFT+1',
          price: '2.5',
          currency: 'ETH',
          creator: {
            id: 'creator1',
            handle: 'cosmicartist',
            walletAddress: '0x1234...5678',
          },
          collection: {
            id: 'collection1',
            name: 'Cosmic Wanderers',
            verified: true,
          },
          attributes: [
            { trait_type: 'Background', value: 'Nebula' },
            { trait_type: 'Rarity', value: 'Legendary' },
          ],
          isVerified: true,
          isLiked: false,
          likes: 42,
          views: 1234,
          listingType: 'fixed',
        },
        {
          id: '2',
          name: 'Digital Dreams #0567',
          description: 'An abstract representation of digital consciousness.',
          imageUrl: 'https://via.placeholder.com/400x400/8b5cf6/ffffff?text=NFT+2',
          price: '1.8',
          currency: 'ETH',
          creator: {
            id: 'creator2',
            handle: 'dreamweaver',
            walletAddress: '0x5678...9012',
          },
          attributes: [
            { trait_type: 'Style', value: 'Abstract' },
            { trait_type: 'Color Scheme', value: 'Purple' },
          ],
          isVerified: false,
          isLiked: true,
          likes: 28,
          views: 892,
          listingType: 'auction',
          auctionEndTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          currentBid: '1.2',
        },
        // Add more mock NFTs...
      ];
      
      setNfts(mockNFTs);
    } catch (error) {
      console.error('Error fetching NFTs:', error);
      toast.error('Failed to load NFTs');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = (nftId: string) => {
    setNfts(prev => prev.map(nft => 
      nft.id === nftId 
        ? { 
            ...nft, 
            isLiked: !nft.isLiked,
            likes: nft.isLiked ? nft.likes - 1 : nft.likes + 1
          }
        : nft
    ));
    onLike?.(nftId);
  };

  const formatTimeRemaining = (endTime: string) => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const diff = end - now;
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const NFTCard = ({ nft }: { nft: NFT }) => (
    <div 
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group"
      onClick={() => onNFTClick?.(nft)}
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden">
        <img
          src={nft.imageUrl}
          alt={nft.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Overlay Actions */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLike(nft.id);
              }}
              className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:scale-110 transition-transform"
            >
              {nft.isLiked ? (
                <HeartSolidIcon className="h-5 w-5 text-red-500" />
              ) : (
                <HeartIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShare?.(nft);
              }}
              className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:scale-110 transition-transform"
            >
              <ShareIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>

        {/* Verification Badge */}
        {nft.isVerified && (
          <div className="absolute top-3 left-3">
            <div className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
              <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Verified
            </div>
          </div>
        )}

        {/* Auction Timer */}
        {nft.listingType === 'auction' && nft.auctionEndTime && (
          <div className="absolute top-3 right-3">
            <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
              <ClockIcon className="h-3 w-3 mr-1" />
              {formatTimeRemaining(nft.auctionEndTime)}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Collection */}
        {nft.collection && (
          <div className="flex items-center mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {nft.collection.name}
            </span>
            {nft.collection.verified && (
              <svg className="h-4 w-4 ml-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        )}

        {/* Title */}
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 truncate">
          {nft.name}
        </h3>

        {/* Creator */}
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          by @{nft.creator.handle}
        </p>

        {/* Price/Bid Info */}
        <div className="flex items-center justify-between mb-3">
          <div>
            {nft.listingType === 'auction' ? (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Current bid</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {nft.currentBid} {nft.currency}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Price</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {nft.price} {nft.currency}
                </p>
              </div>
            )}
          </div>
          
          {nft.lastSale && (
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400">Last sale</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {nft.lastSale.price} {nft.lastSale.currency}
              </p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <HeartIcon className="h-4 w-4 mr-1" />
              {nft.likes}
            </div>
            <div className="flex items-center">
              <EyeIcon className="h-4 w-4 mr-1" />
              {nft.views}
            </div>
          </div>
          
          {nft.listingType === 'auction' && (
            <div className="flex items-center text-red-500">
              <FireIcon className="h-4 w-4 mr-1" />
              Hot
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          NFT Marketplace
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Discover, collect, and trade unique digital assets
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search NFTs, collections, or creators..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Categories */}
          <div className="flex items-center space-x-2 overflow-x-auto">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {category.name} ({category.count})
              </button>
            ))}
          </div>

          {/* Sort and Filter Controls */}
          <div className="flex items-center space-x-4 ml-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              {sortOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              Filters
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Min Price ({nfts[0]?.currency || 'ETH'})
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={priceRange.min}
                  onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Price ({nfts[0]?.currency || 'ETH'})
                </label>
                <input
                  type="number"
                  placeholder="100.00"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setPriceRange({ min: '', max: '' })}
                  className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* NFT Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-xl aspect-square animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {nfts.map((nft) => (
            <NFTCard key={nft.id} nft={nft} />
          ))}
        </div>
      )}

      {/* Load More */}
      {!loading && nfts.length > 0 && (
        <div className="text-center mt-12">
          <button className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Load More NFTs
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && nfts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No NFTs found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}
    </div>
  );
}