import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { MarketplaceService, MarketplaceListing as ServiceMarketplaceListing } from '@/services/marketplaceService';
import { DAOEndorsementModal } from './DAOEndorsementModal';
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
  Zap,
  Info,
  User,
  ShoppingBag,
  Package,
  Search,
  Phone,
  Video,
  Globe,
  Truck,
  RotateCcw,
  Target,
  ArrowUp,
  ArrowDown,
  Minus,
  ExternalLink,
  BadgeCheck,
  Timer,
  Repeat
} from 'lucide-react';

// Enhanced interfaces for Web3 seller profile
interface TrustMetric {
  value: string;
  tooltip: string;
}

interface DAOMembership {
  name: string;
  role: string;
  joinDate: string;
  contributions: number;
}

interface FeaturedProduct {
  id: string;
  name: string;
  price: string;
  image: string;
  category: string;
}

interface VerificationLevel {
  type: 'BASIC' | 'ENHANCED' | 'PREMIUM';
  verified: boolean;
  verifiedAt?: Date;
}

interface SocialLinks {
  twitter?: string;
  linkedin?: string;
  instagram?: string;
  website?: string;
}

interface PerformanceMetrics {
  avgDeliveryTime: string;
  customerSatisfaction: number;
  returnRate: number;
  repeatCustomerRate: number;
  responseTime: string;
  trend: 'up' | 'down' | 'stable';
  trendValue: string;
}

interface SellerInfo {
  id: string;
  name: string;
  avatar: string;
  coverImage?: string;
  walletAddress: string;
  ensName?: string;
  description: string;
  sellerStory?: string;
  memberSince: Date;
  location?: string;
  isOnline: boolean;
  lastSeen?: Date;
  
  // Trust & Reputation
  reputationScore: TrustMetric;
  successRate: TrustMetric;
  safetyScore: TrustMetric;
  totalTransactions: number;
  successfulTransactions: number;
  disputesRatio: number;
  
  // Enhanced Verification
  verificationLevels: {
    identity: VerificationLevel;
    business: VerificationLevel;
    kyc: VerificationLevel;
  };
  socialLinks: SocialLinks;
  
  // Performance Analytics
  performanceMetrics: PerformanceMetrics;
  
  // Verification & Badges
  tier: 'TIER_1' | 'TIER_2' | 'TIER_3';
  tierProgress: { current: number; required: number; nextTier: string };
  isKYCVerified: boolean;
  isDAOEndorsed: boolean;
  hasEscrowProtection: boolean;
  
  // Social & DAO
  followers: number;
  following: number;
  daoMemberships: DAOMembership[];
  daoEndorsements: DAOEndorsement[];
  
  // Analytics
  topCategories: string[];
  totalListings: number;
  activeListings: number;
  featuredListings: DisplayMarketplaceListing[];
  featuredProducts: FeaturedProduct[];
  
  // Performance & Activity
  performanceBadges: PerformanceBadge[];
  activityTimeline: ActivityEvent[];
  recentTransactions: Array<{
    id: string;
    type: 'sale' | 'purchase';
    amount: string;
    timestamp: string;
    counterparty: string;
  }>;
  
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

interface PerformanceBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  earnedDate: Date;
}

interface ActivityEvent {
  id: string;
  type: 'LISTING' | 'SALE' | 'ENDORSEMENT' | 'MILESTONE';
  title: string;
  description: string;
  timestamp: Date;
  icon: string;
}

interface DAOEndorsement {
  id: string;
  endorserAddress: string;
  endorserENS?: string;
  proposalHash: string;
  voteCount: number;
  timestamp: Date;
  reason: string;
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
    image: serviceListing.enhancedData?.images?.[0] || '',
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
  const [activeTab, setActiveTab] = useState<'listings' | 'reviews' | 'about' | 'activity' | 'transactions'>('listings');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isFollowing, setIsFollowing] = useState(false);
  const [showDAOModal, setShowDAOModal] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<'recent' | 'highest' | 'verified'>('recent');
  const [searchQuery, setSearchQuery] = useState('');

  const marketplaceService = new MarketplaceService();

  // Fetch seller data
  useEffect(() => {
    const fetchSellerData = async () => {
      try {
        setLoading(true);
        
        // For now, use mock seller data until we have a proper sellers endpoint
        const mockSeller: SellerInfo = {
          id: sellerId,
          name: 'Alex Chen',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
          coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=300&fit=crop',
          walletAddress: sellerId,
          ensName: 'cryptoartist.eth',
          description: 'Digital artist and NFT creator specializing in generative art and Web3 experiences.',
          sellerStory: 'Started as a traditional artist in 2018, transitioned to Web3 in 2021. I create unique generative art pieces that blend mathematics with creativity, focusing on sustainable and community-driven projects.',
          memberSince: new Date('2023-01-15'),
          location: 'San Francisco, CA',
          isOnline: true,
          lastSeen: new Date(),
          reputationScore: { value: '4.8', tooltip: 'Based on buyer reviews, DAO endorsements, and community feedback' },
          successRate: { value: '98.5%', tooltip: 'Percentage of successful transactions without disputes or issues' },
          safetyScore: { value: '9.2', tooltip: 'Calculated from transaction history, dispute resolution, and community trust signals' },
          totalTransactions: 150,
          successfulTransactions: 147,
          disputesRatio: 0.02,
          
          verificationLevels: {
            identity: { type: 'ENHANCED', verified: true, verifiedAt: new Date('2023-02-01') },
            business: { type: 'BASIC', verified: true, verifiedAt: new Date('2023-03-15') },
            kyc: { type: 'PREMIUM', verified: true, verifiedAt: new Date('2023-01-20') }
          },
          socialLinks: {
            twitter: 'https://twitter.com/alexchen_art',
            linkedin: 'https://linkedin.com/in/alexchen',
            website: 'https://alexchen.art'
          },
          
          performanceMetrics: {
            avgDeliveryTime: '1.2 days',
            customerSatisfaction: 4.9,
            returnRate: 1.2,
            repeatCustomerRate: 68,
            responseTime: '< 2 hours',
            trend: 'up',
            trendValue: '+12%'
          },
          tier: 'TIER_2',
          tierProgress: { current: 150, required: 500, nextTier: 'TIER_3' },
          isKYCVerified: true,
          isDAOEndorsed: true,
          hasEscrowProtection: true,
          followers: 1250,
          following: 89,
          daoMemberships: [
            { name: 'LinkDAO', role: 'Core Contributor', joinDate: '2023-03-15', contributions: 45 },
            { name: 'TechDAO', role: 'Member', joinDate: '2023-06-20', contributions: 12 },
            { name: 'ArtistsDAO', role: 'Delegate', joinDate: '2023-04-10', contributions: 28 }
          ],
          daoEndorsements: [
            {
              id: 'endorsement1',
              endorserAddress: '0xdao123...',
              endorserENS: 'dao_leader.eth',
              proposalHash: '0xproposal123...',
              voteCount: 45,
              timestamp: new Date('2024-01-10'),
              reason: 'Exceptional service and community contribution'
            }
          ],
          topCategories: ['electronics', 'digital', 'collectibles'],
          totalListings: 25,
          activeListings: 12,
          featuredListings: [],
          featuredProducts: [
            { id: '1', name: 'Quantum Dreams #001', price: '2.5 ETH', image: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=200&h=200&fit=crop', category: 'Digital Art' },
            { id: '2', name: 'Generative Landscape', price: '1.8 ETH', image: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=200&h=200&fit=crop', category: 'NFT' },
            { id: '3', name: 'Abstract Motion', price: '3.2 ETH', image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=200&h=200&fit=crop', category: 'Digital Art' }
          ],
          performanceBadges: [
            {
              id: 'perf1',
              title: 'Top Seller This Month',
              description: 'Ranked #3 in sales volume',
              icon: '🏆',
              color: 'text-yellow-400 bg-yellow-500/20',
              earnedDate: new Date('2024-01-01')
            },
            {
              id: 'perf2',
              title: 'Fast Shipper',
              description: 'Average shipping time: 1.2 days',
              icon: '⚡',
              color: 'text-green-400 bg-green-500/20',
              earnedDate: new Date('2023-12-15')
            }
          ],
          activityTimeline: [
            {
              id: 'activity1',
              type: 'SALE',
              title: 'Completed 3 sales',
              description: 'Successfully delivered premium headphones, NFT artwork, and digital course',
              timestamp: new Date('2024-01-15'),
              icon: '💰'
            },
            {
              id: 'activity2',
              type: 'LISTING',
              title: 'Listed Product A',
              description: 'Added new wireless earbuds to marketplace',
              timestamp: new Date('2024-01-12'),
              icon: '📦'
            },
            {
              id: 'activity3',
              type: 'ENDORSEMENT',
              title: 'Received DAO endorsement',
              description: 'LinkDAO community voted to endorse this seller',
              timestamp: new Date('2024-01-10'),
              icon: '🏛️'
            }
          ],
          recentTransactions: [
            { id: '1', type: 'sale', amount: '2.1 ETH', timestamp: '2024-01-15T10:30:00Z', counterparty: '0x123...789' },
            { id: '2', type: 'sale', amount: '1.5 ETH', timestamp: '2024-01-14T15:45:00Z', counterparty: '0xabc...def' },
            { id: '3', type: 'purchase', amount: '0.8 ETH', timestamp: '2024-01-13T09:20:00Z', counterparty: '0x456...123' },
            { id: '4', type: 'sale', amount: '4.2 ETH', timestamp: '2024-01-12T14:10:00Z', counterparty: '0x789...abc' },
            { id: '5', type: 'sale', amount: '1.9 ETH', timestamp: '2024-01-11T11:55:00Z', counterparty: '0xdef...456' }
          ],
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
        
        // Use mock listings data for now to avoid backend 503 errors
        const mockListings: DisplayMarketplaceListing[] = [
          {
            id: '1',
            title: 'Premium Wireless Headphones',
            price: 0.15,
            currency: 'ETH',
            image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop',
            category: 'electronics',
            status: 'ACTIVE',
            createdAt: new Date('2024-01-10'),
            views: 245,
            likes: 18,
            isEscrowProtected: true
          },
          {
            id: '2', 
            title: 'Digital Art Collection NFT',
            price: 2.5,
            currency: 'ETH',
            image: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=400&h=300&fit=crop',
            category: 'digital',
            status: 'ACTIVE',
            createdAt: new Date('2024-01-08'),
            views: 189,
            likes: 32,
            isEscrowProtected: true
          },
          {
            id: '3',
            title: 'Vintage Collectible Watch',
            price: 1.8,
            currency: 'ETH', 
            image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop',
            category: 'collectibles',
            status: 'ACTIVE',
            createdAt: new Date('2024-01-05'),
            views: 156,
            likes: 24,
            isEscrowProtected: true
          }
        ];
        setListings(mockListings);
        
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

  const filteredListings = listings.filter(listing => {
    const matchesCategory = selectedCategory === 'all' || listing.category === selectedCategory;
    const matchesSearch = searchQuery === '' || listing.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
        {/* Header Section with Cover Image */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl overflow-hidden mb-8"
        >
          {/* Cover Image */}
          <div className="relative h-32 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600">
            {seller.coverImage && (
              <Image
                src={seller.coverImage}
                alt="Cover"
                fill
                className="object-cover"
              />
            )}
            <div className="absolute inset-0 bg-black/20" />
          </div>
          
          <div className="p-8 -mt-16 relative">
            <div className="flex flex-col md:flex-row items-start gap-6">
              {/* Avatar & Basic Info */}
              <div className="flex flex-col items-center relative z-10">
                <div className="relative">
                  {seller.avatar ? (
                    <Image
                      src={seller.avatar}
                      alt={seller.name}
                      width={120}
                      height={120}
                      className="rounded-full border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-[120px] h-[120px] rounded-full border-4 border-white shadow-lg bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white text-3xl font-bold">
                      {seller.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                
                {/* Tier Badge with Progress */}
                <div className={`mt-4 px-3 py-1 rounded-full text-sm font-semibold ${getTierColor(seller.tier)}`}>
                  {seller.tier.replace('_', ' ')}
                </div>
                <div className="mt-2 text-center">
                  <div className="text-xs text-white/70 mb-1">
                    {seller.tierProgress.current}/{seller.tierProgress.required} to {seller.tierProgress.nextTier}
                  </div>
                  <div className="w-24 h-1 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-300"
                      style={{ width: `${(seller.tierProgress.current / seller.tierProgress.required) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Main Info */}
              <div className="flex-1">
                <div className="flex flex-col md:flex-row justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold text-white">{seller.name}</h1>
                        {/* Online Status */}
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            seller.isOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
                          }`} />
                          <span className="text-sm text-white/70">
                            {seller.isOnline ? 'Online now' : `Last seen ${seller.lastSeen?.toLocaleDateString()}`}
                          </span>
                        </div>
                      </div>
                      
                      {/* Enhanced Verification Badges */}
                      <div className="flex gap-2">
                        {seller.verificationLevels.identity.verified && (
                          <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${
                            seller.verificationLevels.identity.type === 'PREMIUM' ? 'bg-purple-500/20 text-purple-400' :
                            seller.verificationLevels.identity.type === 'ENHANCED' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-green-500/20 text-green-400'
                          }`}>
                            <BadgeCheck className="w-3 h-3" />
                            {seller.verificationLevels.identity.type} ID
                          </span>
                        )}
                        {seller.verificationLevels.business.verified && (
                          <span className="bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            Business
                          </span>
                        )}
                        {seller.isDAOEndorsed && (
                          <button
                            onClick={() => setShowDAOModal(true)}
                            className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full text-xs flex items-center gap-1 hover:bg-purple-500/30 transition-colors"
                          >
                            <Users className="w-3 h-3" />
                            DAO Endorsed
                          </button>
                        )}
                      </div>
                    </div>
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
                      {/* Response Time */}
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Timer className="w-4 h-4" />
                        <span>Responds in {seller.performanceMetrics.responseTime}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-white/70">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Member since {seller.memberSince.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                      </div>
                      {/* Social Links */}
                      <div className="flex items-center gap-2">
                        {seller.socialLinks.twitter && (
                          <a href={seller.socialLinks.twitter} target="_blank" rel="noopener noreferrer" 
                             className="text-white/60 hover:text-blue-400 transition-colors">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        {seller.socialLinks.website && (
                          <a href={seller.socialLinks.website} target="_blank" rel="noopener noreferrer"
                             className="text-white/60 hover:text-blue-400 transition-colors">
                            <Globe className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Enhanced CTA Button Group */}
                  <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
                    <button 
                      onClick={() => setActiveTab('listings')}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      Shop Now
                    </button>
                    <button className="px-6 py-3 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-all font-medium border border-white/20 flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      Message
                    </button>
                    <button className="px-6 py-3 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-all font-medium border border-white/20 flex items-center gap-2">
                      <Video className="w-4 h-4" />
                      Video Call
                    </button>
                    <button
                      onClick={() => setIsFollowing(!isFollowing)}
                      className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                        isFollowing 
                          ? 'bg-gray-600 text-white' 
                          : 'bg-gradient-to-r from-gray-100/20 to-gray-200/20 text-white hover:from-gray-200/30 hover:to-gray-300/30'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isFollowing ? 'fill-current' : ''}`} />
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                    <button className="p-3 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-all border border-white/20">
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
              </div>

                <p className="text-white/80 mb-6">{seller.description}</p>

                {/* Enhanced Stats with Trends */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {/* Primary Trust Signals with Trends */}
                  <div className="bg-white/15 rounded-xl p-6 text-center backdrop-blur-sm">
                    <div className="flex items-center justify-center mb-2 group relative">
                      <Star className="w-6 h-6 text-yellow-400 mr-1" />
                      <span className="text-2xl font-bold text-white">{seller.reputationScore.value}</span>
                      <Info className="w-4 h-4 text-white/60 ml-1 cursor-help" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none w-48 z-10">
                        {seller.reputationScore.tooltip}
                      </div>
                    </div>
                    <p className="text-sm font-medium text-white/90 mb-1">Reputation</p>
                    <div className="flex items-center justify-center gap-1 text-xs">
                      <ArrowUp className="w-3 h-3 text-green-400" />
                      <span className="text-green-400">{seller.performanceMetrics.trendValue} this week</span>
                    </div>
                  </div>
                  
                  <div className="bg-white/15 rounded-xl p-6 text-center backdrop-blur-sm">
                    <div className="flex items-center justify-center mb-2 group relative">
                      <CheckCircle className="w-6 h-6 text-green-400 mr-1" />
                      <span className="text-2xl font-bold text-white">{seller.successRate.value}</span>
                      <Info className="w-4 h-4 text-white/60 ml-1 cursor-help" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none w-48 z-10">
                        {seller.successRate.tooltip}
                      </div>
                    </div>
                    <p className="text-sm font-medium text-white/90 mb-1">Success Rate</p>
                    <span className="text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded-full">
                      Above average
                    </span>
                  </div>
                  
                  {/* Performance Metrics */}
                  <div className="bg-white/10 rounded-xl p-4 text-center backdrop-blur-sm">
                    <div className="flex items-center justify-center mb-2">
                      <Truck className="w-5 h-5 text-blue-400 mr-1" />
                      <span className="text-xl font-bold text-white">{seller.performanceMetrics.avgDeliveryTime}</span>
                    </div>
                    <p className="text-xs text-white/70 mb-1">Avg Delivery</p>
                    <span className="text-xs text-blue-400">Fast shipper</span>
                  </div>
                  
                  <div className="bg-white/10 rounded-xl p-4 text-center backdrop-blur-sm">
                    <div className="flex items-center justify-center mb-2">
                      <Repeat className="w-5 h-5 text-purple-400 mr-1" />
                      <span className="text-xl font-bold text-white">{seller.performanceMetrics.repeatCustomerRate}%</span>
                    </div>
                    <p className="text-xs text-white/70 mb-1">Repeat Buyers</p>
                    <span className="text-xs text-purple-400">High loyalty</span>
                  </div>
                </div>

                {/* Additional Performance Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-white">{seller.performanceMetrics.customerSatisfaction}/5</div>
                    <div className="text-xs text-white/60">Customer Satisfaction</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-white">{seller.performanceMetrics.returnRate}%</div>
                    <div className="text-xs text-white/60">Return Rate</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-white">{seller.totalTransactions}</div>
                    <div className="text-xs text-white/60">Total Sales</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-white">{seller.followers}</div>
                    <div className="text-xs text-white/60">Followers</div>
                  </div>
                </div>

                {/* Safety Score */}
                <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-xl p-4 mb-6 border border-green-400/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center group relative">
                      <Shield className="w-6 h-6 text-green-400 mr-2" />
                      <span className="text-lg font-semibold text-white">Safety Score: {seller.safetyScore.value}/10</span>
                      <Info className="w-4 h-4 text-white/60 ml-2 cursor-help" />
                      <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none w-64 z-10">
                        {seller.safetyScore.tooltip}
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-white/80">
                      <Shield className="w-4 h-4 mr-1" />
                      <span>Disputes resolved by DAO vote</span>
                      <button className="ml-2 text-blue-300 hover:text-blue-100 underline">
                        Learn more
                      </button>
                    </div>
                  </div>
                </div>

                {/* Seller Story */}
                {seller.sellerStory && (
                  <div className="bg-white/10 rounded-xl p-6 mb-6 backdrop-blur-sm">
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                      <User className="w-5 h-5 mr-2" />
                      Seller Story
                    </h3>
                    <p className="text-white/80 leading-relaxed">{seller.sellerStory}</p>
                  </div>
                )}

                {/* Featured Products Snapshot */}
                <div className="bg-white/10 rounded-xl p-6 mb-6 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center">
                      <Star className="w-5 h-5 mr-2 text-yellow-400" />
                      Featured Items
                    </h3>
                    <button 
                      onClick={() => setActiveTab('listings')}
                      className="text-blue-300 hover:text-blue-100 text-sm font-medium"
                    >
                      View All →
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {seller.featuredProducts.map((product) => (
                      <div key={product.id} className="group cursor-pointer">
                        <div className="aspect-square bg-white/5 rounded-lg overflow-hidden mb-3">
                          <img 
                            src={product.image} 
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        </div>
                        <h4 className="font-medium text-white mb-1 group-hover:text-blue-300 transition-colors">
                          {product.name}
                        </h4>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-white">{product.price}</span>
                          <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded-full">
                            {product.category}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Performance Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {seller.performanceBadges.map((badge) => (
                    <span key={badge.id} className={`${badge.color} px-3 py-1 rounded-full text-sm flex items-center gap-1 border border-current/30`}>
                      <span>{badge.icon}</span>
                      <span>{badge.title}</span>
                    </span>
                  ))}
                </div>

                {/* Community Endorsements */}
                {seller.daoEndorsements.length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm text-white/70 mb-2">Community Endorsements:</div>
                    <div className="flex flex-wrap gap-2">
                      {seller.daoEndorsements.map((endorsement) => (
                        <span key={endorsement.id} className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm">
                          Endorsed by @{endorsement.endorserENS || formatWalletAddress(endorsement.endorserAddress)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trust Guarantees */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
                    <Shield className="w-5 h-5 text-green-400 mx-auto mb-1" />
                    <div className="text-sm text-green-400 font-medium">Money-Back Guarantee</div>
                    <div className="text-xs text-white/60">30-day protection</div>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-center">
                    <Truck className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                    <div className="text-sm text-blue-400 font-medium">Fast & Secure Shipping</div>
                    <div className="text-xs text-white/60">Tracked delivery</div>
                  </div>
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 text-center">
                    <Users className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                    <div className="text-sm text-purple-400 font-medium">DAO Dispute Resolution</div>
                    <div className="text-xs text-white/60">Community protected</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Featured Listings Section */}
        {seller.featuredListings.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8"
          >
            <h2 className="text-xl font-bold text-white mb-4">Featured Listings</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {seller.featuredListings.slice(0, 3).map((listing) => (
                <div key={listing.id} className="bg-white/10 rounded-lg overflow-hidden cursor-pointer hover:bg-white/15 transition-colors"
                     onClick={() => router.push(`/marketplace/listing/${listing.id}`)}>
                  <div className="relative h-32">
                    {listing.image ? (
                      <Image src={listing.image} alt={listing.title} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-gray-600 to-gray-700 flex items-center justify-center text-white text-sm">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="text-white font-medium text-sm truncate">{listing.title}</h3>
                    <div className="text-lg font-bold text-white">{listing.price} {listing.currency}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-6 mb-8">
          {['listings', 'reviews', 'activity', 'transactions', 'about'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all capitalize ${
                activeTab === tab
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab === 'activity' && <Clock className="w-4 h-4 inline mr-2" />}
              {tab === 'transactions' && <TrendingUp className="w-4 h-4 inline mr-2" />}
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
              {/* Enhanced Store Navigation */}
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="relative">
                    <Search className="w-4 h-4 text-white/60 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search in store..."
                      className="bg-white/10 text-white rounded-lg pl-10 pr-4 py-2 border border-white/20 placeholder-white/60 focus:border-white/40 focus:outline-none"
                    />
                  </div>
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
                  <select className="bg-white/10 text-white rounded-lg px-4 py-2 border border-white/20">
                    <option value="newest">Newest First</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="popular">Most Popular</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70 hover:text-white'}`}
                  >
                    <Grid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70 hover:text-white'}`}
                  >
                    <List className="w-5 h-5" />
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
                      {listing.image ? (
                        <Image
                          src={listing.image}
                          alt={listing.title}
                          width={400}
                          height={300}
                          className="w-full h-48 object-cover"
                        />
                      ) : (
                        <div className="w-full h-48 bg-gradient-to-r from-gray-600 to-gray-700 flex items-center justify-center text-white">
                          <span className="text-lg font-medium">No Image</span>
                        </div>
                      )}
                      {listing.isEscrowProtected && (
                        <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                          <Shield className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-white font-semibold mb-2 truncate">{listing.title}</h3>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-lg font-bold text-white">
                          {listing.price} {listing.currency}
                        </span>
                        <div className="flex items-center gap-2 text-white/70 text-sm">
                          <Heart className="w-4 h-4" />
                          <span>{listing.likes}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-white/60">
                        <span>{listing.views} views</span>
                        <span className={`px-2 py-1 rounded-full ${
                          listing.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                          listing.status === 'SOLD' ? 'bg-red-500/20 text-red-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {listing.status.toLowerCase()}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Customer Reviews</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-5 h-5 ${star <= Math.round(parseFloat(seller.reputationScore.value) / 20) ? 'text-yellow-400 fill-current' : 'text-gray-400'}`}
                        />
                      ))}
                    </div>
                    <span className="text-white/70">({reviews.length} reviews)</span>
                  </div>
                </div>
                
                {/* Review Filters */}
                <div className="flex gap-2">
                  {[{ key: 'recent', label: 'Most Recent' }, { key: 'highest', label: 'Highest Rated' }, { key: 'verified', label: 'Verified Purchases' }].map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => setReviewFilter(filter.key as any)}
                      className={`px-3 py-1 rounded-lg text-sm transition-all ${
                        reviewFilter === filter.key
                          ? 'bg-white/20 text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/15'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
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

          {activeTab === 'activity' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Activity Timeline</h2>
              <div className="space-y-4">
                {seller.activityTimeline.map((event) => (
                  <div key={event.id} className="bg-white/10 rounded-lg p-4 flex items-start gap-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-lg flex-shrink-0">
                      {event.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-white font-semibold">{event.title}</h3>
                        <span className="text-white/60 text-sm">{event.timestamp.toLocaleDateString()}</span>
                      </div>
                      <p className="text-white/80 text-sm">{event.description}</p>
                      <div className="mt-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          event.type === 'SALE' ? 'bg-green-500/20 text-green-400' :
                          event.type === 'LISTING' ? 'bg-blue-500/20 text-blue-400' :
                          event.type === 'ENDORSEMENT' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {event.type.toLowerCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Recent Transactions</h2>
                <div className="text-sm text-white/70 flex items-center">
                  <Shield className="w-4 h-4 mr-1" />
                  Blockchain verified
                </div>
              </div>
              <div className="space-y-3">
                {seller.recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-4 bg-white/10 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        tx.type === 'sale' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {tx.type === 'sale' ? '↗' : '↙'}
                      </div>
                      <div>
                        <div className="font-medium text-white capitalize">{tx.type}</div>
                        <div className="text-sm text-white/60">
                          {tx.counterparty.slice(0, 6)}...{tx.counterparty.slice(-4)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-white">{tx.amount}</div>
                      <div className="text-xs text-white/50">
                        {new Date(tx.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-8">
              {/* Enhanced DAO Memberships */}
              {seller.daoMemberships.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">DAO Memberships</h3>
                  <div className="space-y-3">
                    {seller.daoMemberships.map((dao, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-4 bg-white/10 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {dao.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-white">{dao.name}</div>
                            <div className="text-sm text-white/60">{dao.role} • {dao.contributions} contributions</div>
                          </div>
                        </div>
                        <div className="text-xs text-white/50">
                          Since {new Date(dao.joinDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </div>
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
                    <div className="text-2xl font-bold text-white">{seller.safetyScore.value}/10</div>
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
        
        {/* DAO Endorsement Modal */}
        <DAOEndorsementModal
          isOpen={showDAOModal}
          onClose={() => setShowDAOModal(false)}
          endorsements={seller.daoEndorsements}
          sellerName={seller.name}
        />
      </div>
    </div>
  );
};

export default SellerStorePage;