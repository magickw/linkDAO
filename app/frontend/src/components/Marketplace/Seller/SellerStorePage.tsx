import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { MarketplaceService, MarketplaceListing as ServiceMarketplaceListing } from '@/services/marketplaceService';
import { 
  Star, 
  Shield, 
  Award, 
  Users, 
  MessageCircle, 
  Calendar,
  TrendingUp,
  Filter,
  Grid,
  List,
  Heart,
  Share2,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  Zap
} from 'lucide-react';

// Enhanced interfaces for Web3 seller profile
interface SellerInfo {
  id: string;
  name: string;
  avatar: string;
  walletAddress: string;
  ensName?: string;
  description: string;
  memberSince: Date;
  location?: string;
  
  // Trust & Reputation
  reputationScore: number;
  totalTransactions: number;
  successfulTransactions: number;
  disputesRatio: number;
  safetyScore: number;
  
  // Verification & Badges
  tier: 'TIER_1' | 'TIER_2' | 'TIER_3';
  isKYCVerified: boolean;
  isDAOEndorsed: boolean;
  hasEscrowProtection: boolean;
  
  // Social & DAO
  followers: number;
  following: number;
  daoMemberships: string[];
  
  // Analytics
  topCategories: string[];
  totalListings: number;
  activeListings: number;
  
  // NFT & Web3 Flair
  nftPortfolio?: NFTItem[];
  web3Badges: Badge[];
}

interface Badge {
  id: string;
  name: string;
  type: 'VERIFICATION' | 'ACHIEVEMENT' | 'DAO' | 'NFT';
  icon: string;
  description: string;
  earnedDate: Date;
}

interface NFTItem {
  id: string;
  name: string;
  image: string;
  collection: string;
  blockchain: string;
}

interface DisplayMarketplaceListing {
  id: string;
  title: string;
  price: number;
  currency: 'ETH' | 'USDC' | 'DAI';
  image: string;
  category: string;
  status: 'ACTIVE' | 'SOLD' | 'DRAFT';
  createdAt: Date;
  views: number;
  likes: number;
  isEscrowProtected: boolean;
}

// Transform service listing to display listing
const transformListing = (serviceListing: ServiceMarketplaceListing): DisplayMarketplaceListing => {
  return {
    id: serviceListing.id,
    title: serviceListing.enhancedData?.title || serviceListing.metadataURI || 'Untitled Listing',
    price: parseFloat(serviceListing.price) || 0,
    currency: 'ETH', // Default currency
    image: serviceListing.enhancedData?.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop',
    category: serviceListing.enhancedData?.category || serviceListing.itemType.toLowerCase(),
    status: serviceListing.status as 'ACTIVE' | 'SOLD' | 'DRAFT',
    createdAt: new Date(serviceListing.createdAt),
    views: serviceListing.enhancedData?.views || 0,
    likes: serviceListing.enhancedData?.favorites || 0,
    isEscrowProtected: serviceListing.isEscrowed
  };
};

interface Review {
  id: string;
  buyerAddress: string;
  buyerENS?: string;
  rating: number;
  comment: string;
  transactionHash: string;
  isVerifiedPurchase: boolean;
  createdAt: Date;
  listingId: string;
}

interface SellerStorePageProps {
  sellerId: string;
}

const SellerStorePage: React.FC<SellerStorePageProps> = ({ sellerId }) => {
  const router = useRouter();
  const { address } = useAccount();
  
  // State management
  const [seller, setSeller] = useState<SellerInfo | null>(null);
  const [listings, setListings] = useState<DisplayMarketplaceListing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'listings' | 'reviews' | 'about'>('listings');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isFollowing, setIsFollowing] = useState(false);

  const marketplaceService = new MarketplaceService();

  // Fetch seller data
  useEffect(() => {
    const fetchSellerData = async () => {
      try {
        setLoading(true);
        
        // For now, use mock seller data until we have a proper sellers endpoint
        const mockSeller: SellerInfo = {
          id: sellerId,
          name: 'Sample Seller',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=face',
          walletAddress: sellerId,
          ensName: undefined,
          description: 'A trusted seller with high-quality products and excellent customer service.',
          memberSince: new Date('2023-01-15'),
          location: 'Digital Marketplace',
          reputationScore: 95,
          totalTransactions: 150,
          successfulTransactions: 147,
          disputesRatio: 0.02,
          safetyScore: 98,
          tier: 'TIER_2',
          isKYCVerified: true,
          isDAOEndorsed: true,
          hasEscrowProtection: true,
          followers: 1250,
          following: 89,
          daoMemberships: ['LinkDAO', 'TechDAO'],
          topCategories: ['electronics', 'digital', 'collectibles'],
          totalListings: 25,
          activeListings: 12,
          nftPortfolio: [],
          web3Badges: [
            {
              id: 'badge1',
              name: 'Verified Creator',
              type: 'VERIFICATION',
              icon: '🎨',
              description: 'Verified digital content creator',
              earnedDate: new Date('2023-06-01')
            }
          ]
        };
        
        setSeller(mockSeller);
        
        // Fetch actual listings using MarketplaceService
        try {
          const listingsData = await marketplaceService.getListingsBySeller(sellerId);
          // Transform service listings to display listings
          const transformedListings = listingsData.map(transformListing);
          setListings(transformedListings);
        } catch (listingsError) {
          console.error('Failed to fetch listings:', listingsError);
          setListings([]);
        }
        
        // Mock reviews data
        const mockReviews: Review[] = [
          {
            id: 'review1',
            buyerAddress: '0x1234567890123456789012345678901234567890',
            buyerENS: 'buyer1.eth',
            rating: 5,
            comment: 'Excellent seller! Fast shipping and exactly as described.',
            transactionHash: '0xabcdef...',
            isVerifiedPurchase: true,
            createdAt: new Date('2024-01-10'),
            listingId: 'listing1'
          },
          {
            id: 'review2',
            buyerAddress: '0x2345678901234567890123456789012345678901',
            rating: 4,
            comment: 'Great product, minor packaging issues but overall satisfied.',
            transactionHash: '0x123456...',
            isVerifiedPurchase: true,
            createdAt: new Date('2024-01-05'),
            listingId: 'listing2'
          }
        ];
        
        setReviews(mockReviews);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load seller data');
      } finally {
        setLoading(false);
      }
    };

    if (sellerId) {
      fetchSellerData();
    }
  }, [sellerId]);

  const fetchSellerReviews = async () => {
    // This function is kept for compatibility but reviews are now loaded in the main fetch
    console.log('Reviews loaded with seller data');
  };

  // Helper functions
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'TIER_3': return 'text-purple-400 bg-purple-500/20';
      case 'TIER_2': return 'text-blue-400 bg-blue-500/20';
      case 'TIER_1': return 'text-green-400 bg-green-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getSuccessRate = () => {
    if (!seller) return 0;
    return Math.round((seller.successfulTransactions / seller.totalTransactions) * 100);
  };

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const filteredListings = listings.filter(listing => 
    selectedCategory === 'all' || listing.category === selectedCategory
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading seller profile...</div>
      </div>
    );
  }

  if (error || !seller) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-red-400 text-xl">{error || 'Seller not found'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8"
        >
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Avatar & Basic Info */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <Image
                  src={seller.avatar}
                  alt={seller.name}
                  width={120}
                  height={120}
                  className="rounded-full border-4 border-white/20"
                />
                {seller.isKYCVerified && (
                  <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-2">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              
              {/* Tier Badge */}
              <div className={`mt-4 px-3 py-1 rounded-full text-sm font-semibold ${getTierColor(seller.tier)}`}>
                {seller.tier.replace('_', ' ')}
              </div>
            </div>

            {/* Main Info */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row justify-between items-start mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">{seller.name}</h1>
                  <div className="flex items-center gap-3 text-white/70 mb-2">
                    <span>{seller.ensName || formatWalletAddress(seller.walletAddress)}</span>
                    {seller.location && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{seller.location}</span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-white/70">
                    <Calendar className="w-4 h-4" />
                    <span>Member since {seller.memberSince.getFullYear()}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-4 md:mt-0">
                  <button
                    onClick={() => setIsFollowing(!isFollowing)}
                    className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                      isFollowing 
                        ? 'bg-gray-600 text-white' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                  <button className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-all">
                    <MessageCircle className="w-5 h-5" />
                  </button>
                  <button className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-all">
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <p className="text-white/80 mb-6">{seller.description}</p>

              {/* Trust Indicators */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{seller.reputationScore}</div>
                  <div className="text-sm text-white/70">Reputation</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{getSuccessRate()}%</div>
                  <div className="text-sm text-white/70">Success Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{seller.totalTransactions}</div>
                  <div className="text-sm text-white/70">Transactions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{seller.followers}</div>
                  <div className="text-sm text-white/70">Followers</div>
                </div>
              </div>

              {/* Verification Badges */}
              <div className="flex flex-wrap gap-2">
                {seller.isKYCVerified && (
                  <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                    <Shield className="w-4 h-4" />
                    KYC Verified
                  </span>
                )}
                {seller.isDAOEndorsed && (
                  <span className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    DAO Endorsed
                  </span>
                )}
                {seller.hasEscrowProtection && (
                  <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                    <Shield className="w-4 h-4" />
                    Escrow Protected
                  </span>
                )}
                {seller.web3Badges.map((badge) => (
                  <span key={badge.id} className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                    <span>{badge.icon}</span>
                    <span>{badge.name}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-6 mb-8">
          {['listings', 'reviews', 'about'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all capitalize ${
                activeTab === tab
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content based on active tab */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl p-8"
        >
          {activeTab === 'listings' && (
            <div>
              {/* Filters and View Controls */}
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-white/10 text-white rounded-lg px-4 py-2 border border-white/20"
                  >
                    <option value="all">All Categories</option>
                    {seller.topCategories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-white/20' : 'bg-white/10'}`}
                  >
                    <Grid className="w-5 h-5 text-white" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-white/20' : 'bg-white/10'}`}
                  >
                    <List className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Listings Grid/List */}
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                {filteredListings.map((listing) => (
                  <motion.div
                    key={listing.id}
                    whileHover={{ scale: 1.02 }}
                    className="bg-white/10 rounded-lg overflow-hidden cursor-pointer"
                    onClick={() => router.push(`/marketplace/listing/${listing.id}`)}
                  >
                    <div className="relative">
                      <Image
                        src={listing.image}
                        alt={listing.title}
                        width={400}
                        height={300}
                        className="w-full h-48 object-cover"
                      />
                      {listing.isEscrowProtected && (
                        <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                          <Shield className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-white font-semibold mb-2 truncate">{listing.title}</h3>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-white">
                          {listing.price} {listing.currency}
                        </span>
                        <div className="flex items-center gap-2 text-white/70 text-sm">
                          <Heart className="w-4 h-4" />
                          <span>{listing.likes}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Customer Reviews</h2>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${star <= Math.round(seller.reputationScore / 20) ? 'text-yellow-400 fill-current' : 'text-gray-400'}`}
                      />
                    ))}
                  </div>
                  <span className="text-white/70">({reviews.length} reviews)</span>
                </div>
              </div>

              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="bg-white/10 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {(review.buyerENS || review.buyerAddress).slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-white font-semibold">
                            {review.buyerENS || formatWalletAddress(review.buyerAddress)}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${star <= review.rating ? 'text-yellow-400 fill-current' : 'text-gray-400'}`}
                                />
                              ))}
                            </div>
                            {review.isVerifiedPurchase && (
                              <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs">
                                Verified Purchase
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-white/70 text-sm">
                        {review.createdAt.toLocaleDateString()}
                      </div>
                    </div>
                    <p className="text-white/80">{review.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-8">
              {/* DAO Memberships */}
              {seller.daoMemberships.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">DAO Memberships</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {seller.daoMemberships.map((dao) => (
                      <div key={dao} className="bg-white/10 rounded-lg p-4 text-center">
                        <div className="text-white font-semibold">{dao}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Analytics */}
              <div>
                <h3 className="text-xl font-bold text-white mb-4">Store Analytics</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="text-2xl font-bold text-white">{seller.activeListings}</div>
                    <div className="text-white/70">Active Listings</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="text-2xl font-bold text-white">{seller.totalListings}</div>
                    <div className="text-white/70">Total Listed</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="text-2xl font-bold text-white">{seller.safetyScore}%</div>
                    <div className="text-white/70">Safety Score</div>
                  </div>
                </div>
              </div>

              {/* NFT Portfolio */}
              {seller.nftPortfolio && seller.nftPortfolio.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">NFT Portfolio</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {seller.nftPortfolio.slice(0, 8).map((nft) => (
                      <div key={nft.id} className="bg-white/10 rounded-lg overflow-hidden">
                        <Image
                          src={nft.image}
                          alt={nft.name}
                          width={200}
                          height={200}
                          className="w-full h-32 object-cover"
                        />
                        <div className="p-3">
                          <div className="text-white font-semibold text-sm truncate">{nft.name}</div>
                          <div className="text-white/70 text-xs">{nft.collection}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default SellerStorePage;