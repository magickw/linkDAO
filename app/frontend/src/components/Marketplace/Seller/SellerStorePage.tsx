/**
 * SellerStorePage Component - Public seller store page for buyers
 * Features seller information, product listings, and purchase functionality
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { 
  Star, Shield, CheckCircle, MapPin, Clock, Calendar, 
  Filter, Grid, List, Search, Heart, Share2, 
  ShoppingCart, Eye, MessageCircle, Phone, Mail,
  Award, Users, Package, TrendingUp
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';
import { useEnhancedCart } from '@/hooks/useEnhancedCart';
import ProductDetailModal from '../ProductDetailModal';
import { ImageWithFallback } from '@/utils/imageUtils';
import { MarketplaceService, type MarketplaceListing } from '@/services/marketplaceService';

interface SellerInfo {
  id: string;
  displayName: string;
  storeName: string;
  bio: string;
  description: string;
  avatar: string;
  coverImage?: string;
  location?: string;
  memberSince: string;
  verified: boolean;
  daoApproved: boolean;
  stats: {
    totalSales: number;
    activeListings: number;
    reputationScore: number;
    responseTime: string;
    completionRate: number;
    totalReviews: number;
  };
  badges: string[];
  socialLinks?: {
    website?: string;
    twitter?: string;
    discord?: string;
  };
  policies: {
    returns: string;
    shipping: string;
    warranty: string;
  };
}

interface SellerStorePageProps {
  sellerId: string;
  onContactSeller?: (sellerId: string) => void;
}

export const SellerStorePage: React.FC<SellerStorePageProps> = ({
  sellerId,
  onContactSeller
}) => {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { addToast } = useToast();
  const cart = useEnhancedCart();
  
  const [seller, setSeller] = useState<SellerInfo | null>(null);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('newest');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [isFollowing, setIsFollowing] = useState(false);

  const marketplaceService = new MarketplaceService();

  useEffect(() => {
    fetchSellerInfo();
    fetchSellerListings();
  }, [sellerId]);

  const fetchSellerInfo = async () => {
    try {
      setLoading(true);
      // Mock seller data - in real app, fetch from API
      const mockSeller: SellerInfo = {
        id: sellerId,
        displayName: 'TechGear Pro',
        storeName: 'TechGear Pro Store',
        bio: 'Premium electronics and gadgets for tech enthusiasts',
        description: 'We specialize in high-quality electronics, gadgets, and tech accessories. Our team has over 10 years of experience in the tech industry, ensuring that every product we sell meets the highest standards of quality and performance. We offer comprehensive warranty coverage and exceptional customer service.',
        avatar: '/api/placeholder/150/150',
        coverImage: '/api/placeholder/1200/300',
        location: 'San Francisco, CA',
        memberSince: '2022-03-15',
        verified: true,
        daoApproved: true,
        stats: {
          totalSales: 1247,
          activeListings: 28,
          reputationScore: 4.8,
          responseTime: '< 2 hours',
          completionRate: 98.5,
          totalReviews: 324
        },
        badges: ['Verified Seller', 'DAO Approved', 'Fast Shipping', 'Top Rated'],
        socialLinks: {
          website: 'https://techgearpro.com',
          twitter: '@techgearpro',
          discord: 'TechGearPro#1234'
        },
        policies: {
          returns: '30-day return policy with free returns on defective items',
          shipping: 'Free shipping on orders over $50. Express shipping available',
          warranty: '1-year manufacturer warranty + extended protection available'
        }
      };
      
      setSeller(mockSeller);
    } catch (error) {
      console.error('Error fetching seller info:', error);
      addToast('Failed to load seller information', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSellerListings = async () => {
    try {
      setListingsLoading(true);
      // Mock listings data - in real app, fetch from API
      const mockListings: MarketplaceListing[] = [
        {
          id: '1',
          sellerWalletAddress: sellerId,
          tokenAddress: '0x0000000000000000000000000000000000000000',
          price: '0.25',
          quantity: 1,
          itemType: 'PHYSICAL',
          listingType: 'FIXED_PRICE',
          status: 'ACTIVE',
          startTime: new Date().toISOString(),
          metadataURI: 'ipfs://example1',
          isEscrowed: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          enhancedData: {
            title: 'Premium Wireless Headphones',
            description: 'High-quality wireless headphones with noise cancellation',
            images: ['/api/placeholder/300/300'],
            price: {
              crypto: '0.25',
              cryptoSymbol: 'ETH',
              fiat: '425.00',
              fiatSymbol: 'USD'
            },
            seller: {
              id: sellerId,
              name: 'TechGear Pro',
              rating: 4.8,
              verified: true,
              daoApproved: true,
              walletAddress: sellerId
            },
            trust: {
              verified: true,
              escrowProtected: true,
              onChainCertified: true,
              safetyScore: 95
            },
            category: 'Electronics',
            tags: ['headphones', 'wireless', 'premium'],
            views: 156,
            favorites: 23
          }
        },
        {
          id: '2',
          sellerWalletAddress: sellerId,
          tokenAddress: '0x0000000000000000000000000000000000000000',
          price: '0.15',
          quantity: 1,
          itemType: 'PHYSICAL',
          listingType: 'FIXED_PRICE',
          status: 'ACTIVE',
          startTime: new Date().toISOString(),
          metadataURI: 'ipfs://example2',
          isEscrowed: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          enhancedData: {
            title: 'Smart Fitness Tracker',
            description: 'Advanced fitness tracker with heart rate monitoring',
            images: ['/api/placeholder/300/300'],
            price: {
              crypto: '0.15',
              cryptoSymbol: 'ETH',
              fiat: '255.00',
              fiatSymbol: 'USD'
            },
            seller: {
              id: sellerId,
              name: 'TechGear Pro',
              rating: 4.8,
              verified: true,
              daoApproved: true,
              walletAddress: sellerId
            },
            trust: {
              verified: true,
              escrowProtected: true,
              onChainCertified: true,
              safetyScore: 95
            },
            category: 'Wearables',
            tags: ['fitness', 'tracker', 'health'],
            views: 89,
            favorites: 15
          }
        },
        {
          id: '3',
          sellerWalletAddress: sellerId,
          tokenAddress: '0x0000000000000000000000000000000000000000',
          price: '0.12',
          quantity: 1,
          itemType: 'PHYSICAL',
          listingType: 'AUCTION',
          status: 'ACTIVE',
          startTime: new Date().toISOString(),
          metadataURI: 'ipfs://example3',
          isEscrowed: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          enhancedData: {
            title: 'Gaming Mechanical Keyboard',
            description: 'RGB mechanical keyboard perfect for gaming',
            images: ['/api/placeholder/300/300'],
            price: {
              crypto: '0.12',
              cryptoSymbol: 'ETH',
              fiat: '204.00',
              fiatSymbol: 'USD'
            },
            seller: {
              id: sellerId,
              name: 'TechGear Pro',
              rating: 4.8,
              verified: true,
              daoApproved: true,
              walletAddress: sellerId
            },
            trust: {
              verified: true,
              escrowProtected: true,
              onChainCertified: true,
              safetyScore: 95
            },
            category: 'Gaming',
            tags: ['gaming', 'keyboard', 'mechanical'],
            views: 234,
            favorites: 31
          }
        }
      ];
      
      setListings(mockListings);
    } catch (error) {
      console.error('Error fetching listings:', error);
      addToast('Failed to load listings', 'error');
    } finally {
      setListingsLoading(false);
    }
  };

  const handleAddToCart = (listing: MarketplaceListing) => {
    if (!isConnected) {
      addToast('Please connect your wallet to add items to cart', 'warning');
      return;
    }

    cart.addItem({
      id: listing.id,
      title: listing.enhancedData?.title || 'Untitled Item',
      description: listing.enhancedData?.description || 'No description available',
      price: {
        crypto: listing.enhancedData?.price?.crypto || listing.price,
        cryptoSymbol: listing.enhancedData?.price?.cryptoSymbol || 'ETH',
        fiat: listing.enhancedData?.price?.fiat || (parseFloat(listing.price) * 1700).toFixed(2),
        fiatSymbol: listing.enhancedData?.price?.fiatSymbol || 'USD'
      },
      seller: {
        id: listing.sellerWalletAddress,
        name: seller?.displayName || 'Unknown Seller',
        avatar: seller?.avatar || '/api/placeholder/40/40',
        verified: seller?.verified || false,
        daoApproved: seller?.daoApproved || false,
        escrowSupported: listing.isEscrowed
      },
      image: listing.enhancedData?.images?.[0] || '/api/placeholder/300/300',
      category: listing.enhancedData?.category || 'Uncategorized',
      isDigital: listing.itemType === 'DIGITAL',
      isNFT: listing.itemType === 'NFT',
      inventory: listing.quantity,
      trust: {
        escrowProtected: listing.itemType === 'PHYSICAL',
        onChainCertified: true,
        safetyScore: 95
      },
      shipping: {
        freeShipping: true,
        estimatedDays: '2-3 business days',
        cost: '0',
        regions: ['US', 'CA', 'EU']
      }
    });

    addToast(`Added "${listing.enhancedData?.title || 'Item'}" to cart`, 'success');
  };

  const handleContactSeller = () => {
    if (onContactSeller) {
      onContactSeller(sellerId);
    } else {
      addToast('Contact feature coming soon', 'info');
    }
  };

  const handleFollowSeller = () => {
    setIsFollowing(!isFollowing);
    addToast(isFollowing ? 'Unfollowed seller' : 'Following seller', 'success');
  };

  const filteredListings = listings.filter(listing => {
    const matchesSearch = searchTerm === '' || 
      (listing.enhancedData?.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (listing.enhancedData?.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || listing.enhancedData?.category === categoryFilter;
    
    const listingPrice = parseFloat(listing.price);
    const matchesPrice = listingPrice >= priceRange[0] && listingPrice <= priceRange[1];
    
    return matchesSearch && matchesCategory && matchesPrice;
  });

  const sortedListings = [...filteredListings].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return parseFloat(a.price) - parseFloat(b.price);
      case 'price-high':
        return parseFloat(b.price) - parseFloat(a.price);
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'newest':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white/50"></div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassPanel className="max-w-md w-full text-center p-8">
          <h1 className="text-2xl font-bold text-white mb-4">Store Not Found</h1>
          <p className="text-white/70 mb-6">The seller store you're looking for doesn't exist.</p>
          <Button
            onClick={() => router.push('/marketplace')}
            variant="primary"
          >
            Back to Marketplace
          </Button>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Store Header */}
      <div className="relative">
        {/* Cover Image */}
        <div className="h-64 lg:h-80 relative overflow-hidden">
          <ImageWithFallback
            src={seller.coverImage || '/api/placeholder/1200/300'}
            alt="Store cover"
            className="w-full h-full object-cover"
            fallbackSrc="/api/placeholder/1200/300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </div>

        {/* Store Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-end gap-6">
              {/* Store Avatar */}
              <div className="relative">
                <ImageWithFallback
                  src={seller.avatar}
                  alt={seller.displayName}
                  className="w-24 h-24 lg:w-32 lg:h-32 rounded-full border-4 border-white shadow-lg"
                  fallbackSrc="/api/placeholder/150/150"
                />
                {seller.verified && (
                  <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white p-2 rounded-full">
                    <CheckCircle size={16} />
                  </div>
                )}
              </div>

              {/* Store Details */}
              <div className="flex-1">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                      {seller.storeName}
                    </h1>
                    <div className="flex flex-wrap items-center gap-3 text-white/80">
                      <div className="flex items-center gap-1">
                        <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{seller.stats.reputationScore}</span>
                        <span>({seller.stats.totalReviews} reviews)</span>
                      </div>
                      {seller.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{seller.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Member since {new Date(seller.memberSince).getFullYear()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button
                      onClick={handleFollowSeller}
                      variant={isFollowing ? "outline" : "secondary"}
                      className="flex items-center gap-2"
                    >
                      <Heart className={`w-4 h-4 ${isFollowing ? 'fill-current' : ''}`} />
                      {isFollowing ? 'Following' : 'Follow'}
                    </Button>
                    <Button
                      onClick={handleContactSeller}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Contact
                    </Button>
                    <Button
                      onClick={() => {
                        navigator.share?.({
                          title: seller.storeName,
                          text: seller.bio,
                          url: window.location.href
                        }) || addToast('Link copied to clipboard', 'success');
                      }}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Store Stats */}
              <GlassPanel className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Store Statistics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Total Sales</span>
                    <span className="text-white font-medium">{seller.stats.totalSales.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Active Listings</span>
                    <span className="text-white font-medium">{seller.stats.activeListings}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Response Time</span>
                    <span className="text-white font-medium">{seller.stats.responseTime}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Completion Rate</span>
                    <span className="text-white font-medium">{seller.stats.completionRate}%</span>
                  </div>
                </div>
              </GlassPanel>

              {/* Badges */}
              <GlassPanel className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Achievements</h3>
                <div className="flex flex-wrap gap-2">
                  {seller.badges.map((badge, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs rounded-full"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </GlassPanel>

              {/* About */}
              <GlassPanel className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">About</h3>
                <p className="text-white/80 text-sm leading-relaxed mb-4">{seller.description}</p>
                
                {seller.socialLinks && (
                  <div className="space-y-2">
                    {seller.socialLinks.website && (
                      <a
                        href={seller.socialLinks.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        Website
                      </a>
                    )}
                    {seller.socialLinks.twitter && (
                      <a
                        href={`https://twitter.com/${seller.socialLinks.twitter.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
                      >
                        <MessageCircle className="w-4 h-4" />
                        {seller.socialLinks.twitter}
                      </a>
                    )}
                  </div>
                )}
              </GlassPanel>

              {/* Policies */}
              <GlassPanel className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Store Policies</h3>
                <div className="space-y-3">
                  <div>
                    <h4 className="text-white font-medium text-sm mb-1">Returns</h4>
                    <p className="text-white/70 text-xs">{seller.policies.returns}</p>
                  </div>
                  <div>
                    <h4 className="text-white font-medium text-sm mb-1">Shipping</h4>
                    <p className="text-white/70 text-xs">{seller.policies.shipping}</p>
                  </div>
                  <div>
                    <h4 className="text-white font-medium text-sm mb-1">Warranty</h4>
                    <p className="text-white/70 text-xs">{seller.policies.warranty}</p>
                  </div>
                </div>
              </GlassPanel>
            </div>
          </div>

          {/* Listings */}
          <div className="lg:col-span-3">
            {/* Filters and Search */}
            <GlassPanel className="p-6 mb-6">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Category Filter */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Wearables">Wearables</option>
                  <option value="Gaming">Gaming</option>
                </select>

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>

                {/* View Mode */}
                <div className="flex border border-white/20 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}`}
                  >
                    <Grid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </GlassPanel>

            {/* Listings Grid/List */}
            {listingsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <GlassPanel key={i} className="p-6 animate-pulse">
                    <div className="bg-white/10 h-48 rounded-lg mb-4"></div>
                    <div className="bg-white/10 h-4 rounded mb-2"></div>
                    <div className="bg-white/10 h-3 rounded w-2/3"></div>
                  </GlassPanel>
                ))}
              </div>
            ) : sortedListings.length > 0 ? (
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-4"
              }>
                {sortedListings.map((listing) => (
                  <motion.div
                    key={listing.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <GlassPanel className={viewMode === 'grid' ? "p-4" : "p-4 flex gap-4"}>
                      {/* Product Image */}
                      <div className={viewMode === 'grid' ? "relative mb-4" : "flex-shrink-0"}>
                        <ImageWithFallback
                          src={listing.enhancedData?.images?.[0] || '/api/placeholder/300/300'}
                          alt={listing.enhancedData?.title || 'Product image'}
                          className={viewMode === 'grid' 
                            ? "w-full h-48 object-cover rounded-lg"
                            : "w-24 h-24 object-cover rounded-lg"
                          }
                          fallbackSrc="/api/placeholder/300/300"
                        />
                        {listing.listingType === 'AUCTION' && (
                          <span className="absolute top-2 left-2 bg-purple-500 text-white px-2 py-1 rounded text-xs">
                            Auction
                          </span>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1">
                        <h3 className="text-white font-medium mb-2 line-clamp-2">{listing.enhancedData?.title || 'Untitled Item'}</h3>
                        <p className="text-white/70 text-sm mb-3 line-clamp-2">{listing.enhancedData?.description || 'No description available'}</p>
                        
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <span className="text-white font-bold text-lg">
                              {listing.enhancedData?.price?.crypto || listing.price} {listing.enhancedData?.price?.cryptoSymbol || 'ETH'}
                            </span>
                            {listing.listingType === 'AUCTION' && listing.highestBid && (
                              <div className="text-green-400 text-sm">
                                Current bid: {listing.highestBid} {listing.enhancedData?.price?.cryptoSymbol || 'ETH'}
                              </div>
                            )}
                          </div>
                          <span className="text-white/60 text-sm">{listing.enhancedData?.category || 'Uncategorized'}</span>
                        </div>

                        {/* Action Buttons */}
                        <div className={viewMode === 'grid' ? "space-y-2" : "flex gap-2"}>
                          <Button
                            onClick={() => handleAddToCart(listing)}
                            variant="primary"
                            size="small"
                            className="flex items-center gap-2 w-full"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            Add to Cart
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedListing(listing);
                              setShowDetailModal(true);
                            }}
                            variant="outline"
                            size="small"
                            className="flex items-center gap-2 w-full"
                          >
                            <Eye className="w-4 h-4" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    </GlassPanel>
                  </motion.div>
                ))}
              </div>
            ) : (
              <GlassPanel className="p-12 text-center">
                <Package className="w-16 h-16 text-white/30 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Products Found</h3>
                <p className="text-white/70">This seller doesn't have any products matching your criteria.</p>
              </GlassPanel>
            )}
          </div>
        </div>
      </div>

      {/* Product Detail Modal */}
      {selectedListing && (
        <ProductDetailModal
          listing={selectedListing}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedListing(null);
          }}
          onRefresh={fetchSellerListings}
        />
      )}
    </div>
  );
};

export default SellerStorePage;