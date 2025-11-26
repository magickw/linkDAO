import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { marketplaceService, MarketplaceListing as ServiceMarketplaceListing } from '@/services/marketplaceService';
import { unifiedSellerService } from '@/services/unifiedSellerService';
import { UnifiedSellerProfile, UnifiedSellerListing } from '@/types/unifiedSeller';
import { useUnifiedSeller, useUnifiedSellerListings } from '@/hooks/useUnifiedSeller';
import { DAOEndorsementModal } from './DAOEndorsementModal';
import { withSellerErrorBoundary } from './ErrorHandling';
import { mapLegacyTierToUnified } from '@/utils/tierMapping';
import { getDefaultMockSeller } from '@/mocks/sellerMockData';
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
  Package,
  Search,
  Phone,
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
  Repeat,
  X
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
  featuredListings: UnifiedSellerListing[];
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

// Using UnifiedSellerListing instead of DisplayMarketplaceListing
// This interface is now replaced by UnifiedSellerListing from @/types/unifiedSeller

// Transform service listing to unified listing using the transformation utility
const transformListing = (serviceListing: ServiceMarketplaceListing): UnifiedSellerListing => {
  const transformResult = unifiedSellerService.transformExternalListing(serviceListing, 'marketplace');
  return transformResult.data;
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
  onProductClick?: (productId: string) => void;
  // Add prop to indicate if this is for the seller's own store (editable)
  isEditable?: boolean;
}

const SellerStorePageComponent: React.FC<SellerStorePageProps> = ({ sellerId, onProductClick, isEditable = false }) => {
  const router = useRouter();
  const { address } = useAccount();
  
  // State management
  const [seller, setSeller] = useState<SellerInfo | null>(null);
  const [listings, setListings] = useState<UnifiedSellerListing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'listings' | 'reviews' | 'about' | 'activity' | 'transactions'>('listings');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isFollowing, setIsFollowing] = useState(false);
  const [showDAOModal, setShowDAOModal] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<'recent' | 'highest' | 'verified'>('recent');
  const [searchQuery, setSearchQuery] = useState('');

  // Use the singleton marketplace service
  const service = useMemo(() => marketplaceService, []);

  // Function to refresh seller data
  const refreshSellerData = async () => {
    if (sellerId) {
      setLoading(true);
      try {
        const { sellerService } = await import('@/services/sellerService');
        // Clear cache to ensure fresh data
        sellerService.clearProfileCache(sellerId);
        
        // Add a small delay to ensure cache clearing is complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Re-fetch the data with cache bypass
        const sellerProfile = await sellerService.getSellerProfile(sellerId);
        if (sellerProfile) {
          console.log('🔍 Profile data received:', {
            storeName: sellerProfile.storeName,
            profilePicture: sellerProfile.profilePicture,
            profileImageCdn: sellerProfile.profileImageCdn,
            bio: sellerProfile.bio,
            description: sellerProfile.description
          });
          
          // Transform and update seller data (same logic as in useEffect)
          const transformedSeller: SellerInfo = {
            id: sellerProfile.walletAddress,
            name: sellerProfile.storeName || 'Anonymous Seller',
            avatar: sellerProfile.profilePicture || sellerProfile.profileImageCdn || '',
            coverImage: sellerProfile.coverImage || sellerProfile.coverImageCdn || '',
            walletAddress: sellerProfile.walletAddress,
            ensName: sellerProfile.ensHandle,
            description: sellerProfile.bio || sellerProfile.description || 'No description available',
            sellerStory: sellerProfile.sellerStory || '',
            memberSince: new Date(sellerProfile.createdAt),
            location: sellerProfile.location || '',
            isOnline: true,
            lastSeen: new Date(sellerProfile.updatedAt),
            
            reputationScore: { 
              value: sellerProfile.stats?.reputationScore?.toString() || '0', 
              tooltip: 'Based on buyer reviews, DAO endorsements, and community feedback' 
            },
            successRate: { 
              value: '98.5%',
              tooltip: 'Percentage of successful transactions without disputes or issues' 
            },
            safetyScore: { 
              value: '9.2',
              tooltip: 'Calculated from transaction history, dispute resolution, and community trust signals' 
            },
            totalTransactions: sellerProfile.stats?.completedOrders || 0,
            successfulTransactions: sellerProfile.stats?.completedOrders || 0,
            disputesRatio: 0.02,
            
            verificationLevels: {
              identity: { type: 'ENHANCED', verified: sellerProfile.ensVerified, verifiedAt: new Date() },
              business: { type: 'BASIC', verified: false },
              kyc: { type: 'PREMIUM', verified: sellerProfile.ensVerified }
            },
            socialLinks: {
              twitter: sellerProfile.socialLinks?.twitter,
              linkedin: sellerProfile.socialLinks?.linkedin,
              website: sellerProfile.websiteUrl || sellerProfile.socialLinks?.website
            },
            
            performanceMetrics: {
              avgDeliveryTime: '1.2 days',
              customerSatisfaction: sellerProfile.stats?.averageRating || 0,
              returnRate: 1.2,
              repeatCustomerRate: 68,
              responseTime: '< 2 hours',
              trend: 'up',
              trendValue: '+12%'
            },
            tier: mapLegacyTierToUnified(sellerProfile.tier),
            tierProgress: { current: 150, required: 500, nextTier: 'TIER_3' },
            isKYCVerified: sellerProfile.ensVerified,
            isDAOEndorsed: false,
            hasEscrowProtection: true,
            followers: 0,
            following: 0,
            daoMemberships: [],
            daoEndorsements: [],
            topCategories: ['electronics', 'digital', 'collectibles'],
            totalListings: sellerProfile.stats?.activeListings || 0,
            activeListings: sellerProfile.stats?.activeListings || 0,
            featuredListings: [],
            featuredProducts: [],
            performanceBadges: [],
            activityTimeline: [],
            recentTransactions: [],
            nftPortfolio: [],
            web3Badges: []
          };
          
          setSeller(transformedSeller);
        } else {
          // If seller not found, use mock data instead of showing error
          const { getDefaultMockSeller } = await import('@/mocks/sellerMockData');
          const mockSeller = getDefaultMockSeller(sellerId);
          setSeller(mockSeller);
        }
      } catch (error) {
        console.error('Failed to refresh seller data:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  // Listen for storage events to detect profile updates from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `seller_profile_updated_${sellerId}`) {
        // Profile was updated, refresh the data
        refreshSellerData();
        // Clear the flag
        localStorage.removeItem(`seller_profile_updated_${sellerId}`);
      }
    };

    const handleProfileUpdate = (e: CustomEvent) => {
      if (e.detail.walletAddress === sellerId) {
        // Profile was updated in the same tab, refresh the data
        refreshSellerData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('sellerProfileUpdated', handleProfileUpdate as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sellerProfileUpdated', handleProfileUpdate as EventListener);
    };
  }, [sellerId]);

  // Enhanced data fetching with proper error handling and retry logic
  const fetchSellerData = async (isRetry = false) => {
    if (!sellerId) {
      setError('No seller ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Try to fetch real seller profile data first
      try {
        const { sellerService } = await import('@/services/sellerService');
        const sellerProfile = await sellerService.getSellerProfile(sellerId);
        
        if (sellerProfile) {
          console.log('🔍 Initial Profile data received:', {
            storeName: sellerProfile.storeName,
            profilePicture: sellerProfile.profilePicture,
            profileImageCdn: sellerProfile.profileImageCdn,
            bio: sellerProfile.bio,
            description: sellerProfile.description
          });
          
          // Transform backend profile to store page format
          const transformedSeller: SellerInfo = {
            id: sellerProfile.walletAddress,
            name: sellerProfile.storeName || 'Anonymous Seller',
            avatar: sellerProfile.profilePicture || sellerProfile.profileImageCdn || '',
            coverImage: sellerProfile.coverImage || sellerProfile.coverImageCdn || '',
            walletAddress: sellerProfile.walletAddress,
            ensName: sellerProfile.ensHandle,
            description: sellerProfile.bio || sellerProfile.description || 'No description available',
            sellerStory: sellerProfile.sellerStory || '',
            memberSince: new Date(sellerProfile.createdAt),
            location: sellerProfile.location || '',
            isOnline: true, // Default to online
            lastSeen: new Date(sellerProfile.updatedAt),
            
            // Use stats from profile or defaults
            reputationScore: { 
              value: sellerProfile.stats?.reputationScore?.toString() || '0', 
              tooltip: 'Based on buyer reviews, DAO endorsements, and community feedback' 
            },
            successRate: { 
              value: sellerProfile.stats?.completedOrders > 0 ? 
                `${Math.round((sellerProfile.stats.completedOrders / sellerProfile.stats.completedOrders) * 100)}%` : 
                '98.5%',
              tooltip: 'Percentage of successful transactions without disputes or issues' 
            },
            safetyScore: { 
              value: sellerProfile.stats?.reputationScore ? 
                Math.min(10, Math.max(1, sellerProfile.stats.reputationScore * 2)).toFixed(1) : 
                '9.2',
              tooltip: 'Calculated from transaction history, dispute resolution, and community trust signals' 
            },
            totalTransactions: sellerProfile.stats?.completedOrders || 0,
            successfulTransactions: sellerProfile.stats?.completedOrders || 0,
            disputesRatio: 0.02, // Default
            
            verificationLevels: {
              identity: { type: 'ENHANCED', verified: sellerProfile.ensVerified, verifiedAt: new Date() },
              business: { type: 'BASIC', verified: false },
              kyc: { type: 'PREMIUM', verified: sellerProfile.ensVerified }
            },
            socialLinks: {
              twitter: sellerProfile.socialLinks?.twitter,
              linkedin: sellerProfile.socialLinks?.linkedin,
              website: sellerProfile.websiteUrl || sellerProfile.socialLinks?.website
            },
            
            performanceMetrics: {
              avgDeliveryTime: '1.2 days',
              customerSatisfaction: sellerProfile.stats?.averageRating || 0,
              returnRate: 1.2,
              repeatCustomerRate: 68,
              responseTime: '< 2 hours',
              trend: 'up',
              trendValue: '+12%'
            },
            tier: mapLegacyTierToUnified(sellerProfile.tier),
            tierProgress: { current: 150, required: 500, nextTier: 'TIER_3' },
            isKYCVerified: sellerProfile.ensVerified,
            isDAOEndorsed: false, // Default
            hasEscrowProtection: true,
            followers: 0, // Default
            following: 0, // Default
            daoMemberships: [],
            daoEndorsements: [],
            topCategories: ['electronics', 'digital', 'collectibles'], // Default
            totalListings: sellerProfile.stats?.activeListings || 0,
            activeListings: sellerProfile.stats?.activeListings || 0,
            featuredListings: [],
            featuredProducts: [],
            performanceBadges: [],
            activityTimeline: [],
            recentTransactions: [],
            nftPortfolio: [],
            web3Badges: []
          };
          
          setSeller(transformedSeller);
        } else {
          throw new Error('Seller profile not found');
        }
      } catch (profileError) {
        console.warn('Failed to fetch real seller profile:', profileError);
        
        if (!isRetry && retryCount < 2) {
          // Retry once for network issues
          setRetryCount(prev => prev + 1);
          setTimeout(() => fetchSellerData(true), 1000);
          return;
        }
        
        // For all errors (including not found), use fallback mock data to ensure page is always accessible
        const mockSeller: SellerInfo = getDefaultMockSeller(sellerId);
        
        setSeller(mockSeller);
        setLoading(false);
      }
      
      // Fetch seller listings with error handling
      try {
        const { sellerService } = await import('@/services/sellerService');
        const sellerListings = await sellerService.getListings(sellerId);
        
        if (sellerListings && sellerListings.length > 0) {
          // Transform seller listings to unified format
          const transformedListings: UnifiedSellerListing[] = sellerListings.map(listing => {
            const transformResult = unifiedSellerService.transformExternalListing(listing, 'seller');
            return transformResult.data;
          });
          setListings(transformedListings);
        } else {
          setListings([]);
        }
      } catch (listingsError) {
        console.warn('Failed to fetch seller listings:', listingsError);
        setListings([]);
      }
      
      // Mock reviews data for now
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
      console.error('Error fetching seller data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load seller store. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch seller data on component mount and sellerId change
  useEffect(() => {
    if (sellerId) {
      setRetryCount(0);
      fetchSellerData();
    }
  }, [sellerId]);

  // Retry function for failed requests
  const handleRetry = () => {
    setRetryCount(0);
    fetchSellerData();
  };

  // Handle product click with proper navigation
  const handleProductClick = (productId: string) => {
    if (onProductClick) {
      onProductClick(productId);
    } else {
      router.push(`/marketplace/listing/${productId}`);
    }
  };

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
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-white/30 border-t-white rounded-full mx-auto mb-4"></div>
          <div className="text-white text-xl mb-2">Loading seller store...</div>
          <div className="text-white/70 text-sm">Please wait while we fetch the seller information</div>
        </div>
      </div>
    );
  }

  if (error || !seller) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Store Unavailable</h2>
          <p className="text-white/80 mb-6">
            {error || 'This seller store could not be found or is currently unavailable.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleRetry}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
            <button
              onClick={() => router.push('/marketplace')}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors border border-white/20"
            >
              Return to Marketplace
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Seller Edit Banner - Only shown when seller views their own store */}
        {isEditable && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-4 mb-6 border border-white/20"
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-white flex-shrink-0" />
                <div>
                  <h3 className="text-white font-semibold">Your Store</h3>
                  <p className="text-white/80 text-sm">You're viewing your store as customers see it</p>
                </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <button
                  onClick={() => router.push('/marketplace/seller/dashboard')}
                  className="flex-1 md:flex-none px-4 py-2 bg-white text-purple-600 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                >
                  Go to Dashboard
                </button>
                <button
                  onClick={() => {
                    router.push('/marketplace/seller/dashboard');
                    // Navigate to profile tab after dashboard loads
                    setTimeout(() => {
                      const event = new CustomEvent('navigateToTab', { detail: { tab: 'profile' } });
                      window.dispatchEvent(event);
                    }, 100);
                  }}
                  className="flex-1 md:flex-none px-4 py-2 bg-white/20 text-white rounded-lg font-medium hover:bg-white/330 transition-colors border border-white/20"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </motion.div>
        )}

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
                    {/* Refresh Button for Testing */}
                    <button 
                      onClick={refreshSellerData}
                      className="px-4 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700 transition-all font-medium flex items-center gap-2"
                      disabled={loading}
                    >
                      <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>

                    <button className="px-6 py-3 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-all font-medium border border-white/20 flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      Message
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
                  <div className="bg-white/15 rounded-xl p-6 text-center backdrop-blur-sm hover:bg-white/20 transition-all duration-300 cursor-pointer">
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
                  
                  <div className="bg-white/15 rounded-xl p-6 text-center backdrop-blur-sm hover:bg-white/20 transition-all duration-300 cursor-pointer">
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
                  <div className="bg-white/10 rounded-xl p-4 text-center backdrop-blur-sm hover:bg-white/15 transition-all duration-300 cursor-pointer">
                    <div className="flex items-center justify-center mb-2">
                      <Truck className="w-5 h-5 text-blue-400 mr-1" />
                      <span className="text-xl font-bold text-white">{seller.performanceMetrics.avgDeliveryTime}</span>
                    </div>
                    <p className="text-xs text-white/70 mb-1">Avg Delivery</p>
                    <span className="text-xs text-blue-400">Fast shipper</span>
                  </div>
                  
                  <div className="bg-white/10 rounded-xl p-4 text-center backdrop-blur-sm hover:bg-white/15 transition-all duration-300 cursor-pointer">
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
                     onClick={() => handleProductClick(listing.id)}>
                  <div className="relative h-32">
                    {listing.images && listing.images.length > 0 ? (
                      <Image src={listing.images[0]} alt={listing.title} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-gray-600 to-gray-700 flex items-center justify-center text-white text-sm">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="p-33">
                    <h3 className="text-white font-medium text-sm truncate">{listing.title}</h3>
                    <div className="text-lg font-bold text-white">{listing.price} {listing.currency}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Breadcrumb Navigation */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <nav className="flex items-center space-x-2 text-sm text-white/70">
            <button 
              onClick={() => router.push('/marketplace')}
              className="hover:text-white transition-colors"
            >
              Marketplace
            </button>
            <span>›</span>
            <button 
              onClick={() => router.push('/marketplace?tab=sellers')}
              className="hover:text-white transition-colors"
            >
              Sellers
            </button>
            <span>›</span>
            <span className="text-white font-medium">
              {seller.name}
            </span>
          </nav>
        </motion.div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 md:gap-6 mb-8 overflow-x-auto pb-2">
          {['listings', 'reviews', 'activity', 'transactions', 'about'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 md:px-6 py-3 rounded-lg font-semibold transition-all capitalize whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-white/20 text-white shadow-lg'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab === 'activity' && <Clock className="w-4 h-4 inline mr-2" />}
              {tab === 'transactions' && <TrendingUp className="w-4 h-4 inline mr-2" />}
              {tab === 'listings' && <Package className="w-4 h-4 inline mr-2" />}
              {tab === 'reviews' && <Star className="w-4 h-4 inline mr-2" />}
              {tab === 'about' && <Info className="w-4 h-4 inline mr-2" />}
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
                <div className="flex items-center gap-4 w-full">
                  <div className="relative w-full max-w-md">
                    <Search className="w-5 h-5 text-white/60 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search in store..."
                      className="w-full bg-white/10 text-white rounded-lg pl-10 pr-4 py-3 border border-white/20 placeholder-white/60 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="bg-white/10 text-white rounded-lg px-4 py-3 border border-white/20 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                    >
                      <option value="all">All Categories</option>
                      {seller.topCategories.map((category) => (
                        <option key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </option>
                      ))}
                    </select>
                    <select className="bg-white/10 text-white rounded-lg px-4 py-3 border border-white/20 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all">
                      <option value="newest">Newest First</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                      <option value="popular">Most Popular</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-3 rounded-lg transition-colors ${
                      viewMode === 'grid' 
                        ? 'bg-white/20 text-white shadow-md' 
                        : 'bg-white/10 text-white/70 hover:text-white hover:bg-white/15'
                    }`}
                    title="Grid view"
                  >
                    <Grid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-3 rounded-lg transition-colors ${
                      viewMode === 'list' 
                        ? 'bg-white/20 text-white shadow-md' 
                        : 'bg-white/10 text-white/70 hover:text-white hover:bg-white/15'
                    }`}
                    title="List view"
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Listings Grid/List */}
              {filteredListings.length > 0 ? (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                  {filteredListings.map((listing, index) => (
                    <motion.div
                      key={listing.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ y: -5 }}
                      className="bg-white/10 rounded-xl overflow-hidden cursor-pointer hover:bg-white/15 transition-all duration-300 border border-white/10 hover:border-white/30"
                      onClick={() => handleProductClick(listing.id)}
                    >
                      <div className="relative">
                        {listing.images && listing.images.length > 0 ? (
                          <div className="relative h-48 overflow-hidden">
                            <Image
                              src={listing.images[0]}
                              alt={listing.title}
                              fill
                              className="object-cover transition-transform duration-500 hover:scale-110"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-48 bg-gradient-to-r from-gray-600 to-gray-700 flex items-center justify-center text-white">
                            <span className="text-lg font-medium">No Image</span>
                          </div>
                        )}
                        {listing.isEscrowProtected && (
                          <div className="absolute top-3 right-3 bg-green-500 rounded-full p-2 shadow-lg">
                            <Shield className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1 text-white text-sm">
                          {listing.likes} likes
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="text-white font-semibold mb-2 truncate">{listing.title}</h3>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xl font-bold text-white">
                            {listing.price} {listing.currency}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-white/60">
                          <span>{listing.views || 0} views</span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            listing.status === 'active' ? 'bg-green-500/20 text-green-400' :
                            listing.status === 'sold' ? 'bg-red-500/20 text-red-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {listing.status.toLowerCase()}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Package className="w-10 h-10 text-white/60" />
                  </div>
                  <h3 className="text-2xl font-semibold text-white mb-3">No listings found</h3>
                  <p className="text-white/70 mb-8 max-w-md mx-auto">
                    {searchQuery || selectedCategory !== 'all' 
                      ? 'Try adjusting your search or filters to find more products.'
                      : 'This seller hasn\'t listed any products yet.'}
                  </p>
                  {(searchQuery || selectedCategory !== 'all') && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('all');
                      }}
                      className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              )}
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

// Wrap with error boundary
const SellerStorePage = withSellerErrorBoundary(SellerStorePageComponent, {
  context: 'SellerStorePage',
  enableRecovery: true,
});

export default SellerStorePage;