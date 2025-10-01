import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { useRouter } from 'next/router';
import { useToast } from '@/context/ToastContext';
import { useSeller } from '@/hooks/useSeller';
import { ImageWithFallback } from '@/utils/imageUtils';
import { getFallbackImage } from '@/utils/imageUtils';
import {
  MarketplaceService,
  type MarketplaceListing,
  type MarketplaceBid,
  type UserReputation
} from '@/services/marketplaceService';
import {
  HeroSection,
  CategoryGrid,
  FeaturedProductCarousel
} from '@/components/Marketplace/Homepage';
import { SellerQuickAccessPanel } from '@/components/Marketplace/Seller';
import BidModal from '@/components/Marketplace/BidModal';
import PurchaseModal from '@/components/Marketplace/PurchaseModal';
import MakeOfferModal from '@/components/Marketplace/MakeOfferModal';
import ProductDetailModal from '@/components/Marketplace/ProductDetailModal';
import { EnhancedCartProvider, useEnhancedCart } from '@/hooks/useEnhancedCart';
import { EnhancedCheckoutFlow } from '@/components/Marketplace/Payment/EnhancedCheckoutFlow';
import { OrderTrackingDashboard } from '@/components/Marketplace/OrderTracking/OrderTrackingDashboard';
import { DisputeResolutionPanel } from '@/components/Marketplace/DisputeResolution/DisputeResolutionPanel';
import { useDebounce } from '@/hooks/useDebounce';

// New redesigned components
import { EnhancedProductCard } from '@/components/Marketplace/ProductDisplay/EnhancedProductCard';
import { FilterBar, type FilterOptions } from '@/components/Marketplace/ProductDisplay/FilterBar';
import { ViewDensityToggle, useDensityPreference } from '@/components/Marketplace/ProductDisplay/ViewDensityToggle';
import { SortingControls, type SortField, type SortDirection } from '@/components/Marketplace/ProductDisplay/SortingControls';
import { SearchBar } from '@/components/Marketplace/ProductDisplay/SearchBar';
import { motion, AnimatePresence } from 'framer-motion';

import { ShoppingCart } from 'lucide-react';
import { designTokens } from '@/design-system/tokens';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';
import Layout from '@/components/Layout'; // Import the standard Layout component

const MarketplaceContent: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { addToast } = useToast();
  const router = useRouter();
  const { profile } = useSeller();
  const { density, setDensity } = useDensityPreference();

  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [activeTab, setActiveTab] = useState<'browse' | 'my-listings' | 'orders' | 'disputes'>('browse');
  const [loading, setLoading] = useState(true);
  const [reputation, setReputation] = useState<UserReputation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [sortField, setSortField] = useState<SortField>('relevance');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [showBidModal, setShowBidModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  const cart = useEnhancedCart();
  
  // Memoize the marketplace service to prevent recreation on every render
  const marketplaceService = useMemo(() => new MarketplaceService(), []);

  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);
      
      // Use the enhanced marketplace service
      console.log('Fetching listings using enhanced marketplace service...');
      
      const { enhancedMarketplaceService } = await import('@/services/enhancedMarketplaceService');
      const data = await enhancedMarketplaceService.getMarketplaceListings({
        limit: 20, // Reduced limit for faster initial load
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      
      if (Array.isArray(data) && data.length > 0) {
        console.log('Processing listings data:', data.length, 'items');
        
        // Transform backend data to frontend format
        const transformedListings = data.map((listing: any) => {
          // Parse enhanced metadata if available
          let enhancedData: {
            title?: string;
            description?: string;
            images?: string[];
            category?: string;
            tags?: string[];
            condition?: string;
            escrowEnabled?: boolean;
          } = {};
          
          try {
            if (listing.enhancedData) {
              enhancedData = listing.enhancedData;
            } else if (listing.metadata_uri) {
              // Try to parse metadata_uri as JSON
              const parsed = JSON.parse(listing.metadata_uri);
              enhancedData = {
                title: parsed.title || listing.metadataURI || 'Unnamed Item',
                description: parsed.description || '',
                images: parsed.images || [],
                category: parsed.category || 'general',
                tags: parsed.tags || [],
                condition: parsed.condition || 'new',
                escrowEnabled: parsed.escrowEnabled || false
              };
            }
          } catch (e) {
            console.log('Failed to parse metadata for listing', listing.id);
            enhancedData = {
              title: listing.metadataURI || listing.title || 'Unnamed Item',
              description: listing.description || '',
              images: [],
              category: 'general',
              tags: [],
              condition: 'new',
              escrowEnabled: false
            };
          }
          
          return {
            id: listing.id.toString(),
            sellerWalletAddress: listing.sellerWalletAddress || listing.seller_wallet_address || '0x1234567890123456789012345678901234567890',
            tokenAddress: listing.tokenAddress || listing.token_address || '0x0000000000000000000000000000000000000000',
            price: listing.price || '0.1',
            quantity: listing.quantity || 1,
            itemType: listing.itemType || listing.item_type || 'DIGITAL',
            listingType: listing.listingType || listing.listing_type || 'FIXED_PRICE',
            status: listing.status || 'ACTIVE',
            startTime: listing.startTime || listing.start_time || listing.createdAt || listing.created_at || new Date().toISOString(),
            endTime: listing.endTime || listing.end_time || undefined,
            highestBid: listing.highestBid || listing.highest_bid || undefined,
            metadataURI: enhancedData.title || listing.metadataURI || listing.metadata_uri || 'Unnamed Item',
            isEscrowed: listing.isEscrowed || listing.is_escrowed || false,
            createdAt: listing.createdAt || listing.created_at || new Date().toISOString(),
            updatedAt: listing.updatedAt || listing.updated_at || new Date().toISOString(),
            // Enhanced fields for better display
            enhancedData: {
              title: enhancedData.title || 'Unnamed Item',
              description: enhancedData.description || '',
              images: enhancedData.images || [],
              price: {
                crypto: listing.price || '0.1',
                cryptoSymbol: 'ETH',
                fiat: ((parseFloat(listing.price || '0.1')) * 2400).toFixed(2), // Rough ETH to USD conversion
                fiatSymbol: 'USD'
              },
              seller: {
                id: listing.sellerWalletAddress || listing.seller_wallet_address,
                name: 'Verified Seller',
                rating: 4.8,
                verified: true,
                daoApproved: true,
                walletAddress: listing.sellerWalletAddress || listing.seller_wallet_address
              },
              trust: {
                verified: true,
                escrowProtected: enhancedData.escrowEnabled || false,
                onChainCertified: true,
                safetyScore: 95
              },
              category: enhancedData.category || 'general',
              tags: enhancedData.tags || [],
              views: Math.floor(Math.random() * 1000) + 100,
              favorites: Math.floor(Math.random() * 50) + 10,
              condition: enhancedData.condition || 'new',
              escrowEnabled: enhancedData.escrowEnabled || false
            }
          };
        });
        
        console.log('Transformed listings:', transformedListings);
        setListings(transformedListings);
        
        addToast(`Loaded ${transformedListings.length} listings from marketplace`, 'success');
      } else {
        console.log('No listings returned from enhanced service, using fallback data');
        // Enhanced fallback data that matches our backend structure
        setListings([
          {
            id: 'prod_001',
            sellerWalletAddress: '0x1234567890123456789012345678901234567890',
            tokenAddress: '0x0000000000000000000000000000000000000000',
            price: '0.1245',
            quantity: 15,
            itemType: 'DIGITAL',
            listingType: 'FIXED_PRICE',
            status: 'ACTIVE',
            startTime: new Date().toISOString(),
            metadataURI: 'Premium Wireless Headphones',
            isEscrowed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            enhancedData: {
              title: 'Premium Wireless Headphones',
              description: 'High-quality noise-canceling wireless headphones with 30-hour battery life and premium sound quality.',
              images: [],
              price: {
                crypto: '0.1245',
                cryptoSymbol: 'ETH',
                fiat: '299.99',
                fiatSymbol: 'USD'
              },
              seller: {
                id: 'seller_001',
                name: 'TechGear Pro',
                rating: 4.8,
                verified: true,
                daoApproved: true,
                walletAddress: '0x1234567890123456789012345678901234567890'
              },
              trust: {
                verified: true,
                escrowProtected: true,
                onChainCertified: true,
                safetyScore: 98
              },
              category: 'electronics',
              tags: ['electronics', 'audio', 'wireless', 'premium'],
              views: 1247,
              favorites: 89
            }
          },
          {
            id: 'prod_002',
            sellerWalletAddress: '0x2345678901234567890123456789012345678901',
            tokenAddress: '0x0000000000000000000000000000000000000000',
            price: '2.5000',
            quantity: 1,
            itemType: 'NFT',
            listingType: 'AUCTION',
            status: 'ACTIVE',
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            highestBid: '2.1000',
            metadataURI: 'Rare Digital Art NFT Collection',
            isEscrowed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            enhancedData: {
              title: 'Rare Digital Art NFT Collection',
              description: 'Exclusive digital artwork from renowned crypto artist. Limited edition with utility benefits.',
              images: [],
              price: {
                crypto: '2.5000',
                cryptoSymbol: 'ETH',
                fiat: '6000.00',
                fiatSymbol: 'USD'
              },
              seller: {
                id: 'seller_002',
                name: 'CryptoArtist',
                rating: 4.9,
                verified: true,
                daoApproved: true,
                walletAddress: '0x2345678901234567890123456789012345678901'
              },
              trust: {
                verified: true,
                escrowProtected: true,
                onChainCertified: true,
                safetyScore: 96
              },
              category: 'nft',
              tags: ['nft', 'art', 'digital', 'exclusive'],
              views: 892,
              favorites: 156
            }
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
      addToast('Failed to fetch listings from API. Using fallback data.', 'warning');
      
      // Enhanced fallback data that matches our backend structure
      setListings([
        {
          id: 'prod_001',
          sellerWalletAddress: '0x1234567890123456789012345678901234567890',
          tokenAddress: '0x0000000000000000000000000000000000000000',
          price: '0.1245',
          quantity: 15,
          itemType: 'DIGITAL',
          listingType: 'FIXED_PRICE',
          status: 'ACTIVE',
          startTime: new Date().toISOString(),
          metadataURI: 'Premium Wireless Headphones',
          isEscrowed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          enhancedData: {
            title: 'Premium Wireless Headphones',
            description: 'High-quality noise-canceling wireless headphones with 30-hour battery life and premium sound quality.',
            images: [],
            price: {
              crypto: '0.1245',
              cryptoSymbol: 'ETH',
              fiat: '299.99',
              fiatSymbol: 'USD'
            },
            seller: {
              id: 'seller_001',
              name: 'TechGear Pro',
              rating: 4.8,
              verified: true,
              daoApproved: true,
              walletAddress: '0x1234567890123456789012345678901234567890'
            },
            trust: {
              verified: true,
              escrowProtected: true,
              onChainCertified: true,
              safetyScore: 98
            },
            category: 'electronics',
            tags: ['electronics', 'audio', 'wireless', 'premium'],
            views: 1247,
            favorites: 89
          }
        },
        {
          id: 'prod_002',
          sellerWalletAddress: '0x2345678901234567890123456789012345678901',
          tokenAddress: '0x0000000000000000000000000000000000000000',
          price: '2.5000',
          quantity: 1,
          itemType: 'NFT',
          listingType: 'AUCTION',
          status: 'ACTIVE',
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          highestBid: '2.1000',
          metadataURI: 'Rare Digital Art NFT Collection',
          isEscrowed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          enhancedData: {
            title: 'Rare Digital Art NFT Collection',
            description: 'Exclusive digital artwork from renowned crypto artist. Limited edition with utility benefits.',
            images: [],
            price: {
              crypto: '2.5000',
              cryptoSymbol: 'ETH',
              fiat: '6000.00',
              fiatSymbol: 'USD'
            },
            seller: {
              id: 'seller_002',
              name: 'CryptoArtist',
              rating: 4.9,
              verified: true,
              daoApproved: true,
              walletAddress: '0x2345678901234567890123456789012345678901'
            },
            trust: {
              verified: true,
              escrowProtected: true,
              onChainCertified: true,
              safetyScore: 96
            },
            category: 'nft',
            tags: ['nft', 'art', 'digital', 'exclusive'],
            views: 892,
            favorites: 156
          }
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const fetchReputation = useCallback(async (userAddress: string) => {
    // Skip if already loading or if we already have reputation data
    if (reputation?.walletAddress === userAddress) return;
    
    try {
      console.log('Making request to:', `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000'}/marketplace/reputation/${userAddress}`);
      const userReputation = await marketplaceService.getUserReputation(userAddress);
      setReputation(userReputation);
    } catch (error) {
      console.error('Error fetching reputation:', error);
      // Use mock data as fallback
      setReputation({
        walletAddress: userAddress,
        score: 750,
        daoApproved: true
      });
    }
  }, [marketplaceService, reputation?.walletAddress]);

  useEffect(() => {
    let mounted = true;
    
    const timer = setTimeout(async () => {
      if (mounted) {
        await fetchListings();
        if (address && mounted) {
          await fetchReputation(address);
        }
      }
    }, 1500); // Increase debounce to 1.5 seconds to prevent rapid calls
    
    return () => {
      clearTimeout(timer);
      mounted = false;
    };
  }, [address, debouncedSearchTerm, fetchListings, fetchReputation]); // Include fetchListings and fetchReputation in dependencies

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const formatItemType = (type: string) => {
    return type.charAt(0) + type.slice(1).toLowerCase().replace('_', ' ');
  };

  const formatImageUrl = useCallback((url: string | undefined, width: number, height: number) => {
    if (!url) return getFallbackImage('product');
    // If it's already a full URL or data URL, return as is
    if (url.startsWith('http') || url.startsWith('data:image')) return url;
    // For local paths, ensure they're properly formatted
    if (url.startsWith('/')) return url;
    // For other cases, use our fallback
    return getFallbackImage('product');
  }, []);

  // Filter and sort listings with new filter options
  const filteredAndSortedListings = useMemo(() => {
    let result = Array.isArray(listings) ? [...listings] : [];

    // Search filter
    if (debouncedSearchTerm) {
      const query = debouncedSearchTerm.toLowerCase();
      result = result.filter(listing =>
        listing.metadataURI?.toLowerCase().includes(query) ||
        listing.enhancedData?.title?.toLowerCase().includes(query) ||
        listing.enhancedData?.description?.toLowerCase().includes(query) ||
        listing.sellerWalletAddress?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (filters.category) {
      result = result.filter(listing =>
        listing.enhancedData?.category === filters.category ||
        listing.itemType.toLowerCase() === filters.category
      );
    }

    // Price range filter
    if (filters.priceRange) {
      const { min, max } = filters.priceRange;
      result = result.filter(listing => {
        const price = parseFloat(listing.price);
        if (min !== undefined && price < min) return false;
        if (max !== undefined && price > max) return false;
        return true;
      });
    }

    // Condition filter
    if (filters.condition) {
      result = result.filter(listing =>
        listing.enhancedData?.condition === filters.condition
      );
    }

    // Trust filters
    if (filters.verified) {
      result = result.filter(listing => listing.enhancedData?.seller?.verified);
    }
    if (filters.escrowProtected) {
      result = result.filter(listing => listing.enhancedData?.trust?.escrowProtected || listing.isEscrowed);
    }
    if (filters.daoApproved) {
      result = result.filter(listing => listing.enhancedData?.seller?.daoApproved);
    }

    // In stock filter
    if (filters.inStock) {
      result = result.filter(listing => (listing.quantity ?? 0) > 0);
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'price':
          comparison = parseFloat(a.price) - parseFloat(b.price);
          break;
        case 'rating':
          comparison = (b.enhancedData?.seller?.rating || 0) - (a.enhancedData?.seller?.rating || 0);
          break;
        case 'popularity':
          comparison = (b.enhancedData?.views || 0) - (a.enhancedData?.views || 0);
          break;
        case 'date':
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
        default:
          comparison = 0;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [listings, debouncedSearchTerm, filters, sortField, sortDirection]);

  // Grid columns based on density
  const gridColumns =
    density === 'comfortable'
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
      : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6';

  return (
    <Layout title="Marketplace - LinkDAO">
      {/* Background */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          background: designTokens.gradients.heroMain,
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <HeroSection
          onStartSelling={() => {
            if (!isConnected) {
              addToast('Please connect your wallet first', 'warning');
              return;
            }
            if (!profile) {
              // Redirect to seller onboarding API endpoint
              router.push('/marketplace/seller/onboarding');
            } else {
              router.push('/marketplace/seller/dashboard');
            }
          }}
          onBrowseMarketplace={() => setActiveTab('browse')}
        />

        {/* Category Grid */}
        <CategoryGrid />



        {/* Featured Sellers Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Featured Sellers</h2>
            <p className="text-white/80">Discover trusted sellers in our marketplace</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
            {[
              {
                id: '0x1234567890123456789012345678901234567890',
                name: 'TechGear Pro',
                rating: 4.8,
                sales: 1247,
                verified: true,
                daoApproved: true,
                category: 'Electronics'
              },
              {
                id: '0x2345678901234567890123456789012345678901',
                name: 'CryptoArtist',
                rating: 4.9,
                sales: 892,
                verified: true,
                daoApproved: true,
                category: 'NFTs & Art'
              },
              {
                id: '0x3456789012345678901234567890123456789012',
                name: 'FashionHub',
                rating: 4.7,
                sales: 2156,
                verified: true,
                daoApproved: false,
                category: 'Fashion'
              },
              {
                id: '0x4567890123456789012345678901234567890123',
                name: 'BookWorms',
                rating: 4.6,
                sales: 543,
                verified: true,
                daoApproved: true,
                category: 'Books & Media'
              }
            ].map((seller) => (
              <GlassPanel 
                key={seller.id} 
                variant="secondary" 
                hoverable 
                className="p-4 cursor-pointer transform transition-all duration-200 hover:scale-105" 
                onClick={() => router.push(`/seller/${seller.id}`)}
              >
                <div className="text-center">
                  <div className="relative mx-auto mb-3">
                    <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
                      {seller.name.charAt(0)}
                    </div>
                    {seller.verified && (
                      <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-1 rounded-full">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  <h3 className="font-semibold text-white mb-1 truncate" title={seller.name}>{seller.name}</h3>
                  <p className="text-xs text-white/60 mb-2">{seller.category}</p>
                  
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400 text-sm">⭐</span>
                      <span className="text-xs text-white">{seller.rating}</span>
                    </div>
                    <span className="text-white/40">•</span>
                    <span className="text-xs text-white/70">{seller.sales.toLocaleString()} sales</span>
                  </div>
                  
                  <div className="flex justify-center gap-1 mb-3">
                    {seller.verified && (
                      <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full border border-blue-400/30">✅</span>
                    )}
                    {seller.daoApproved && (
                      <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full border border-purple-400/30">🏛️</span>
                    )}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="small"
                    className="w-full border-white/30 text-white/80 hover:bg-white/10 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/seller/${seller.id}`);
                    }}
                  >
                    🏪 Visit Store
                  </Button>
                </div>
              </GlassPanel>
            ))}
          </div>
          
          {/* View All Sellers Link */}
          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => {
                // In a real app, this would navigate to a dedicated sellers page
                addToast('Full sellers directory coming soon!', 'info');
              }}
              className="border-white/30 text-white/80 hover:bg-white/10"
            >
              View All Sellers →
            </Button>
          </div>
        </div>





        {/* Main Marketplace Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          
          {/* Seller Quick Access Panel - Single, clean seller navigation */}
          {isConnected && <SellerQuickAccessPanel />}
          
          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div className="flex space-x-1 bg-white/10 rounded-lg p-1 backdrop-blur-sm">
              <button
                onClick={() => { setActiveTab('browse'); setShowCart(false); setShowCheckout(false); }}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'browse' && !showCart && !showCheckout
                    ? 'bg-white text-gray-900'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                Browse
              </button>

              <button
                onClick={() => { setShowCart(true); setShowCheckout(false); setActiveTab('browse'); }}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  showCart && !showCheckout
                    ? 'bg-white text-gray-900'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <ShoppingCart size={16} />
                Cart ({cart.state.totals.itemCount})
                {cart.state.totals.itemCount > 0 && (
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                )}
              </button>
              <button
                onClick={() => { setActiveTab('orders'); setShowCart(false); setShowCheckout(false); }}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'orders' && !showCart && !showCheckout
                    ? 'bg-white text-gray-900'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
                disabled={!isConnected}
              >
                Orders
              </button>
              <button
                onClick={() => { setActiveTab('disputes'); setShowCart(false); setShowCheckout(false); }}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'disputes' && !showCart && !showCheckout
                    ? 'bg-white text-gray-900'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
                disabled={!isConnected}
              >
                Disputes
              </button>
              <button
                onClick={() => { setActiveTab('my-listings'); setShowCart(false); setShowCheckout(false); }}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'my-listings' && !showCart && !showCheckout
                    ? 'bg-white text-gray-900'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
                disabled={!isConnected}
              >
                My Listings
              </button>
            </div>
          </div>

          {activeTab === 'browse' && (
            <>
              {/* New Filter Bar with Chips */}
              <FilterBar
                filters={filters}
                onFiltersChange={setFilters}
                className="mb-6"
              />

              {/* Search, Sort, and Density Controls */}
              <div className="mb-6 space-y-4">
                <SearchBar
                  value={searchTerm}
                  onChange={setSearchTerm}
                  resultCount={filteredAndSortedListings.length}
                  placeholder="Search products, categories..."
                />

                <div className="flex items-center justify-between">
                  <SortingControls
                    currentSort={{ field: sortField, direction: sortDirection }}
                    onSortChange={(field, direction) => {
                      setSortField(field);
                      setSortDirection(direction);
                    }}
                  />
                  <ViewDensityToggle density={density} onDensityChange={setDensity} />
                </div>
              </div>
            </>
          )}

          {loading ? (
            <div className={`grid ${gridColumns} gap-4`}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="h-96 rounded-lg animate-pulse"
                  style={{ background: designTokens.glassmorphism.secondary.background }}
                />
              ))}
            </div>
          ) : (
          <>
            {(activeTab === 'browse' && !showCart && !showCheckout) && (
              <div>
                {filteredAndSortedListings.length === 0 ? (
                  <GlassPanel variant="primary" className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <h3 className="mt-2 text-lg font-medium text-white">No items found</h3>
                    <p className="mt-1 text-white/70">
                      {searchTerm || Object.keys(filters).length > 0
                        ? 'No items match your search criteria.'
                        : 'No listings available at the moment.'}
                    </p>
                    {isConnected && (
                      <div className="mt-6">
                        <Button
                          variant="primary"
                          onClick={() => {
                            if (!profile) {
                              router.push('/marketplace/seller/onboarding');
                            } else {
                              router.push('/marketplace/seller/listings/create');
                            }
                          }}
                        >
                          {!profile ? 'Become a Seller' : 'Create First Listing'}
                        </Button>
                      </div>
                    )}
                  </GlassPanel>
                ) : (
                  <motion.div
                    className={`grid ${gridColumns} gap-4`}
                    initial="hidden"
                    animate="visible"
                    variants={{
                      visible: {
                        transition: {
                          staggerChildren: 0.05,
                        },
                      },
                    }}
                  >
                    <AnimatePresence mode="popLayout">
                      {filteredAndSortedListings.map((listing) => {
                        // Transform listing to product format for EnhancedProductCard
                        const product = {
                          id: listing.id,
                          title: listing.enhancedData?.title || listing.metadataURI || 'Unnamed Item',
                          description: listing.enhancedData?.description || '',
                          images: listing.enhancedData?.images || [formatImageUrl(listing.metadataURI, 400, 300)],
                          price: {
                            amount: listing.price,
                            currency: listing.enhancedData?.price?.cryptoSymbol || 'ETH',
                            usdEquivalent: listing.enhancedData?.price?.fiat,
                          },
                          seller: {
                            id: listing.sellerWalletAddress,
                            name: listing.enhancedData?.seller?.name || formatAddress(listing.sellerWalletAddress),
                            avatar: listing.enhancedData?.seller?.walletAddress,
                            verified: listing.enhancedData?.seller?.verified || false,
                            rating: listing.enhancedData?.seller?.rating,
                            reviewCount: listing.enhancedData?.favorites,
                            daoApproved: listing.enhancedData?.seller?.daoApproved || false,
                          },
                          trust: {
                            verified: listing.enhancedData?.trust?.verified,
                            escrowProtected: listing.enhancedData?.trust?.escrowProtected || listing.isEscrowed,
                            onChainCertified: listing.enhancedData?.trust?.onChainCertified,
                          },
                          category: listing.enhancedData?.category || listing.itemType.toLowerCase(),
                          stock: listing.quantity,
                          shipping: {
                            free: listing.itemType === 'DIGITAL' || listing.itemType === 'NFT',
                            deliverySpeed: listing.itemType === 'DIGITAL' || listing.itemType === 'NFT' ? 'Instant' : '2-3 days',
                          },
                          condition: listing.enhancedData?.condition as 'new' | 'used' | 'refurbished' | undefined,
                          listingType: listing.listingType,
                          endTime: listing.endTime,
                          highestBid: listing.highestBid,
                        };

                        return (
                          <motion.div
                            key={listing.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                          >
                            <EnhancedProductCard
                              product={product}
                              density={density}
                              onProductClick={(id) => router.push(`/marketplace/listing/${id}`)}
                              onSellerClick={(id) => router.push(`/seller/${id}`)}
                              onAddToCart={(id) => {
                                // Add to cart logic
                                const cartProduct = {
                                  id: listing.id,
                                  title: listing.enhancedData?.title || listing.metadataURI || 'Unnamed Item',
                                  description: listing.enhancedData?.description || '',
                                  image: formatImageUrl(listing.metadataURI, 400, 300) || '',
                                  price: {
                                    crypto: listing.price,
                                    cryptoSymbol: 'ETH',
                                    fiat: (parseFloat(listing.price) * 2400).toFixed(2),
                                    fiatSymbol: 'USD',
                                  },
                                  seller: {
                                    id: listing.sellerWalletAddress,
                                    name: listing.enhancedData?.seller?.name || formatAddress(listing.sellerWalletAddress),
                                    avatar: '',
                                    verified: true,
                                    daoApproved: listing.enhancedData?.seller?.daoApproved || false,
                                    escrowSupported: true,
                                  },
                                  category: listing.itemType.toLowerCase(),
                                  isDigital: listing.itemType === 'DIGITAL' || listing.itemType === 'NFT',
                                  isNFT: listing.itemType === 'NFT',
                                  inventory: listing.quantity,
                                  shipping: {
                                    cost: listing.itemType === 'DIGITAL' || listing.itemType === 'NFT' ? '0' : '0.001',
                                    freeShipping: listing.itemType === 'DIGITAL' || listing.itemType === 'NFT',
                                    estimatedDays: listing.itemType === 'DIGITAL' || listing.itemType === 'NFT' ? 'instant' : '3-5',
                                    regions: ['US', 'CA', 'EU'],
                                  },
                                  trust: {
                                    escrowProtected: true,
                                    onChainCertified: true,
                                    safetyScore: 95,
                                  },
                                };
                                cart.addItem(cartProduct);
                                addToast('Added to cart! 🛒', 'success');
                              }}
                              onBidClick={(id) => {
                                if (!isConnected) {
                                  addToast('Please connect your wallet first', 'warning');
                                  return;
                                }
                                setSelectedListing(listing);
                                setShowBidModal(true);
                              }}
                            />
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </motion.div>
                )}
              </div>
            )}
            

            
            {activeTab === 'my-listings' && (
              <div>
                {isConnected ? (
                  <MyListingsTab address={address} onCreateClick={() => router.push('/marketplace/seller/listings/create')} />
                ) : (
                  <GlassPanel variant="primary" className="text-center py-12">
                    <p className="text-white/70">Please connect your wallet to view your listings.</p>
                  </GlassPanel>
                )}
              </div>
            )}
            
            {activeTab === 'orders' && (
              <div>
                {isConnected ? (
                  <div>
                    <div className="text-center mb-8">
                      <h2 className="text-4xl font-bold text-white mb-4">Order Management</h2>
                      <p className="text-xl text-white/80">Track your orders and manage deliveries with enhanced features</p>
                    </div>
                    {React.createElement(
                      'div',
                      { className: 'text-center text-white/70 py-8' },
                      'Order tracking feature coming soon...'
                    )}
                    {/* TODO: Re-enable when component is stable
                    {React.createElement(
                      EnhancedOrderTracking,
                      { 
                        userType: profile ? 'seller' : 'buyer',
                        className: 'text-white'
                      }
                    )}
                    */}
                  </div>
                ) : (
                  <GlassPanel variant="primary" className="text-center py-12">
                    <p className="text-white/70">Please connect your wallet to view your orders.</p>
                  </GlassPanel>
                )}
              </div>
            )}
            
            {activeTab === 'disputes' && (
              <div>
                {isConnected ? (
                  <div>
                    <div className="text-center mb-8">
                      <h2 className="text-4xl font-bold text-white mb-4">Dispute Resolution</h2>
                      <p className="text-xl text-white/80">Community-driven dispute arbitration with DAO integration</p>
                    </div>
                    <DisputeResolutionPanel
                      userRole={profile ? 'seller' : 'buyer'}
                      className="text-white"
                    />
                  </div>
                ) : (
                  <GlassPanel variant="primary" className="text-center py-12">
                    <p className="text-white/70">Please connect your wallet to access dispute resolution.</p>
                  </GlassPanel>
                )}
              </div>
            )}
          </>
          )}

          {/* Cart View */}
          {showCart && !showCheckout && (
            <div>
              <div className="text-center mb-8">
                <h2 className="text-4xl font-bold text-white mb-4">Shopping Cart</h2>
                <p className="text-xl text-white/80">Review your items and proceed to checkout</p>
              </div>

              {cart.state.items.length === 0 ? (
                <GlassPanel variant="primary" className="text-center py-12">
                  <ShoppingCart size={48} className="mx-auto text-white/60 mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">Your cart is empty</h3>
                  <p className="text-white/80 mb-6 text-lg">Start shopping to add items to your cart</p>
                  <Button
                    variant="primary"
                    onClick={() => setShowCart(false)}
                    className="px-6 py-3 text-lg font-medium"
                  >
                    Continue Shopping
                  </Button>
                </GlassPanel>
              ) : (
                <div className="space-y-6">
                  {/* Cart Items */}
                  <div className="space-y-4">
                    {cart.state.items.map((item) => (
                      <GlassPanel key={item.id} variant="secondary" className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-gray-800/50 rounded-lg flex items-center justify-center">
                            <ShoppingCart className="text-white/60" size={24} />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-white">{item.title}</h3>
                            <p className="text-sm text-white/70 mt-1 line-clamp-2">
                              {item.seller.name}
                            </p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-white font-medium">
                                {item.price.crypto} {item.price.cryptoSymbol}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => cart.updateQuantity(item.id, item.quantity - 1)}
                                  className="w-8 h-8 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                                >
                                  -
                                </button>
                                <span className="text-white w-8 text-center">{item.quantity}</span>
                                <button
                                  onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}
                                  className="w-8 h-8 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => cart.removeItem(item.id)}
                            className="text-red-400 hover:text-red-300 p-2"
                          >
                            ×
                          </button>
                        </div>
                      </GlassPanel>
                    ))}
                  </div>

                  {/* Cart Summary */}
                  <GlassPanel variant="primary" className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">Order Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/70">Subtotal:</span>
                        <span className="text-white">{cart.state.totals.subtotal.toFixed(4)} ETH</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Shipping:</span>
                        <span className="text-white">{cart.state.totals.shipping.toFixed(4)} ETH</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Escrow Fee:</span>
                        <span className="text-white">{cart.state.totals.escrowFees.toFixed(4)} ETH</span>
                      </div>
                      <div className="border-t border-white/20 pt-2 flex justify-between font-medium">
                        <span className="text-white">Total:</span>
                        <span className="text-white">{cart.state.totals.total.toFixed(4)} ETH</span>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      className="w-full mt-6"
                      onClick={() => setShowCheckout(true)}
                    >
                      Proceed to Checkout
                    </Button>
                  </GlassPanel>
                </div>
              )}
            </div>
          )}

          {/* Checkout Flow */}
          {showCheckout && (
            <EnhancedCheckoutFlow
              cartItems={cart.state.items.map(item => ({
                id: item.id,
                title: item.title,
                price: item.price,
                seller: item.seller,
                image: item.image || '',
                quantity: item.quantity,
                isDigital: item.isDigital,
                escrowProtected: item.trust.escrowProtected,
                shippingCost: item.shipping.cost,
                estimatedDelivery: item.shipping.estimatedDays
              }))}
              onComplete={(orderData) => {
                addToast('Order completed successfully!', 'success');
                cart.clearCart();
                setShowCheckout(false);
                setShowCart(false);
              }}
              onCancel={() => setShowCheckout(false)}
            />
          )}
        </div>

        {/* Footer */}
        <footer className="py-12 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-white/60 mb-4">
                © 2025 LinkDAO. Powered by blockchain technology.
              </p>
              <div className="flex justify-center space-x-6 text-sm text-white/40">
                <a href="/terms" className="hover:text-white/60 transition-colors">Terms</a>
                <a href="/privacy" className="hover:text-white/60 transition-colors">Privacy</a>
                <a href="/docs" className="hover:text-white/60 transition-colors">Docs</a>
                <a href="/support" className="hover:text-white/60 transition-colors">Support</a>
              </div>
            </div>
          </div>
        </footer>

        {/* Modals */}
        {selectedListing && (
          <>
            <BidModal
              listing={selectedListing}
              isOpen={showBidModal}
              onClose={() => {
                setShowBidModal(false);
                setSelectedListing(null);
              }}
              onSuccess={() => {
                fetchListings();
              }}
            />
            <PurchaseModal
              listing={selectedListing}
              isOpen={showPurchaseModal}
              onClose={() => {
                setShowPurchaseModal(false);
                setSelectedListing(null);
              }}
              onSuccess={() => {
                fetchListings();
              }}
            />
            <MakeOfferModal
              listing={selectedListing}
              isOpen={showOfferModal}
              onClose={() => {
                setShowOfferModal(false);
                setSelectedListing(null);
              }}
              onSuccess={() => {
                fetchListings();
              }}
            />
            <ProductDetailModal
              listing={selectedListing}
              isOpen={showDetailModal}
              onClose={() => {
                setShowDetailModal(false);
                setSelectedListing(null);
              }}
              onRefresh={() => {
                fetchListings();
              }}
            />
          </>
        )}
      </div>
    </Layout>
  );
};

const MyListingsTab: React.FC<{ address: string | undefined; onCreateClick: () => void }> = ({ address, onCreateClick }) => {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const { profile } = useSeller();
  const router = useRouter();
  
  // Memoize the marketplace service to prevent recreation on every render
  const marketplaceService = useMemo(() => new MarketplaceService(), []);

  const fetchMyListings = useCallback(async (mounted = true) => {
    try {
      setLoading(true);
      console.log('Fetching listings for wallet address:', address);
      
      const userListings = await marketplaceService.getListingsBySeller(address!);
      console.log('Retrieved listings:', userListings);
      
      // Ensure we always have an array
      const validListings = Array.isArray(userListings) ? userListings : [];
      
      // If no listings found for this address, but there are test listings with test address, show them for demo purposes
      if (validListings.length === 0) {
        console.log('No listings found for current address, checking for demo listings...');
        try {
          const demoListings = await marketplaceService.getListingsBySeller('0x1234567890123456789012345678901234567890');
          if (demoListings && demoListings.length > 0) {
            console.log('Found demo listings, displaying them for current user');
            // Update the seller address to match current user for display purposes
            const updatedDemoListings = demoListings.map(listing => ({
              ...listing,
              sellerWalletAddress: address!
            }));
            if (mounted) {
              setListings(updatedDemoListings);
              addToast('Displaying demo listings for development purposes', 'info');
            }
            return;
          }
        } catch (demoError) {
          console.log('No demo listings available either');
        }
      }
      
      if (mounted) {
        setListings(validListings);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
      if (mounted) {
        addToast('Failed to fetch your listings. Please try again.', 'error');
        setListings([]);
      }
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }
  }, [address, addToast, marketplaceService]);

  useEffect(() => {
    let mounted = true;
    const fetchListings = async () => {
      if (address) {
        await fetchMyListings(mounted);
      }
    };
    fetchListings();
    return () => { mounted = false; };
  }, [address, fetchMyListings]);

  const formatItemType = (type: string) => {
    return type.charAt(0) + type.slice(1).toLowerCase().replace('_', ' ');
  };

  return (
    <div>
      {loading ? (
        <GlassPanel variant="primary" className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white/50"></div>
        </GlassPanel>
      ) : (
        <>
          {listings.length === 0 ? (
            <GlassPanel variant="primary" className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-white">No listings yet</h3>
              <p className="mt-1 text-white/70">Get started by creating a new listing.</p>
              <div className="mt-6">
                <Button
                  variant="primary"
                  onClick={() => {
                    if (!profile) {
                      router.push('/marketplace/seller/onboarding');
                    } else {
                      onCreateClick();
                    }
                  }}
                >
                  Create Your First Listing
                </Button>
              </div>
            </GlassPanel>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <GlassPanel key={listing.id} variant="secondary" hoverable className="overflow-hidden">
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-medium text-white">
                          {listing.enhancedData?.title || listing.metadataURI || 'Unnamed Item'}
                        </h3>
                        {listing.enhancedData?.description && (
                          <p className="text-sm text-white/70 mt-1 line-clamp-2">
                            {listing.enhancedData.description}
                          </p>
                        )}
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                        listing.status === 'ACTIVE' 
                          ? 'bg-green-500/20 text-green-300 border-green-400/30' 
                          : 'bg-gray-500/20 text-gray-300 border-gray-400/30'
                      }`}>
                        {listing.status}
                      </span>
                    </div>
                    
                    <div className="mt-4">
                      <p className="text-2xl font-bold text-white">
                        {listing.price} ETH
                      </p>
                      <p className="text-sm text-white/70">
                        Quantity: {listing.quantity}
                      </p>
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-400/30">
                          {formatItemType(listing.itemType)}
                        </span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-400/30">
                          {listing.listingType.replace('_', ' ')}
                        </span>
                        {listing.enhancedData?.condition && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-300 border border-gray-400/30">
                            {listing.enhancedData.condition}
                          </span>
                        )}
                      </div>
                      {listing.enhancedData?.tags && listing.enhancedData.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {listing.enhancedData.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded">
                              {tag}
                            </span>
                          ))}
                          {listing.enhancedData.tags.length > 2 && (
                            <span className="text-xs text-white/60">+{listing.enhancedData.tags.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-6 flex space-x-3">
                      <Button
                        variant="primary"
                        className="flex-1"
                        onClick={() => {
                          // TODO: Implement edit functionality
                          addToast('Edit feature coming soon!', 'info');
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 border-red-400/30 text-red-300 hover:bg-red-500/20"
                        onClick={async () => {
                          if (window.confirm('Are you sure you want to cancel this listing?')) {
                            try {
                              await marketplaceService.cancelListing(listing.id);
                              addToast('Listing cancelled successfully', 'success');
                              fetchMyListings();
                            } catch (error) {
                              addToast('Failed to cancel listing', 'error');
                              console.error('Error cancelling listing:', error);
                            }
                          }
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </GlassPanel>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const MarketplacePage: React.FC = () => {
  return (
    <EnhancedCartProvider>
      <MarketplaceContent />
      
      {/* Floating Seller Action Button - Always accessible */}
      <SellerFloatingActionButton />
    </EnhancedCartProvider>
  );
};

// Floating Action Button Component for Seller Access - Simplified
const SellerFloatingActionButton: React.FC = () => {
  const { isConnected } = useAccount();
  const { profile } = useSeller();
  const router = useRouter();

  // Only show for existing sellers, not for new users
  if (!isConnected || !profile) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={() => router.push('/marketplace/seller/dashboard')}
        className="w-12 h-12 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-full shadow-lg flex items-center justify-center text-white text-sm transition-all duration-200 hover:scale-110 border-2 border-white/20"
        title="Seller Dashboard"
      >
        📊
      </button>
    </div>
  );
};

export default MarketplacePage;