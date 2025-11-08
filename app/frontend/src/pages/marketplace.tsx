import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/router';
import { useToast } from '@/context/ToastContext';
import { useSeller } from '@/hooks/useSeller';
import { getFallbackImage } from '@/utils/imageUtils';
import { marketplaceService } from '@/services/marketplaceService';
import { enhancedMarketplaceService } from '@/services/enhancedMarketplaceService';
import type { MarketplaceListing } from '@/services/marketplaceService';
import BidModal from '@/components/Marketplace/BidModal';
import PurchaseModal from '@/components/Marketplace/PurchaseModal';
import MakeOfferModal from '@/components/Marketplace/MakeOfferModal';
import ProductDetailModal from '@/components/Marketplace/ProductDetailModal';
import ReturnRefundModal from '@/components/Marketplace/ReturnRefundModal';
import { returnRefundService } from '@/services/returnRefundService';
import { useCart } from '@/hooks/useCart';
import { useDebounce } from '@/hooks/useDebounce';

// New redesigned components
import { ProductCard } from '@/components/Marketplace/ProductDisplay/ProductCard';
import { FilterBar, type FilterOptions } from '@/components/Marketplace/ProductDisplay/FilterBar';
import { ViewDensityToggle, useDensityPreference } from '@/components/Marketplace/ProductDisplay/ViewDensityToggle';
import { SortingControls, type SortField, type SortDirection } from '@/components/Marketplace/ProductDisplay/SortingControls';
import { SearchBar } from '@/components/Marketplace/ProductDisplay/SearchBar';
import { ActiveFilterChips } from '@/components/Marketplace/ProductDisplay/ActiveFilterChips';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';
import Layout from '@/components/Layout'; // Import the standard Layout component
import { MarketplaceBreadcrumbs } from '@/components/Marketplace/Navigation/MarketplaceBreadcrumbs';
import { useMarketplaceBreadcrumbs } from '@/hooks/useMarketplaceBreadcrumbs';
import { MarketplaceErrorBoundary } from '@/components/ErrorHandling/MarketplaceErrorBoundary';
import { NetworkErrorFallback, ServerErrorFallback } from '@/components/ErrorHandling/MarketplaceErrorFallback';
import { NavigationLoadingStates } from '@/components/Performance/NavigationLoadingStates';
import { MarketplacePreloader } from '@/components/Performance/MarketplacePreloader';
import { PerformanceIndicator } from '@/components/Performance/MarketplacePerformanceDashboard';
import { navigationPreloadService } from '@/services/navigationPreloadService';
import { productCache, sellerCache, searchCache } from '@/services/marketplaceDataCache';
import TokenAcquisitionSection from '@/components/Marketplace/TokenAcquisition/TokenAcquisitionSection';

// Define design tokens for fallback
const designTokens = {
  glassmorphism: {
    secondary: {
      background: 'rgba(255, 255, 255, 0.05)'
    }
  }
};

const MarketplaceContent: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { addToast } = useToast();
  const router = useRouter();
  const { profile } = useSeller();
  const { density, setDensity } = useDensityPreference();
  const { breadcrumbItems } = useMarketplaceBreadcrumbs();

  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [sortField, setSortField] = useState<SortField>('relevance');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const ITEMS_PER_PAGE = 24;
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [showBidModal, setShowBidModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReturnRefundModal, setShowReturnRefundModal] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);

  const cart = useCart();
  const browseSectionRef = useRef<HTMLDivElement | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);
  
  const marketplaceActions = useMemo(() => {
    const cartCount = cart.state.totals.itemCount;
    return [
      {
        label: cartCount > 0 ? `View cart (${cartCount})` : 'View cart',
        description: 'Review items before checkout',
        href: '/marketplace/cart' as const,
        action: undefined as string | undefined,
      },
      {
        label: 'Secure checkout',
        description: 'Complete escrow-backed purchases',
        href: '/marketplace/checkout' as const,
        action: undefined as string | undefined,
      },
      {
        label: 'Get LDAO Tokens',
        description: 'Buy, stake, and earn with LDAO tokens',
        href: '/token' as const,
        action: undefined as string | undefined,
      },
      {
        label: 'Orders & tracking',
        description: 'View your purchase history',
        href: '/orders' as const,
        action: undefined as string | undefined,
      },
      {
        label: 'Returns & Refunds',
        description: 'Request returns and manage refunds',
        href: '/returns' as const,
        action: undefined as string | undefined,
      },
      {
        label: 'Support & disputes',
        description: 'Escalate issues with sellers',
        href: '/marketplace/disputes' as const,
        action: undefined as string | undefined,
      },
    ];
  }, [cart.state.totals.itemCount]);

  const fetchListings = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      
      // Check cache first for better performance
      const cacheKey = `listings-${pageNum}-${JSON.stringify({ sortBy: 'createdAt', sortOrder: 'desc' })}`;
      const cachedData = await productCache.get(cacheKey);
      
      if (cachedData && !append) {
        console.log('Using cached listings data');
        setListings(Array.isArray(cachedData) ? cachedData : []);
        setLoading(false);
        return;
      }
      
      // Use the marketplace service
      console.log('Fetching listings using marketplace service...', { page: pageNum });
      
      const data = await marketplaceService.getMarketplaceListings({
        limit: ITEMS_PER_PAGE,
        offset: (pageNum - 1) * ITEMS_PER_PAGE,
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
        
        // Cache the transformed data for better performance
        if (!append) {
          await productCache.set(cacheKey, transformedListings, { 
            ttl: 5 * 60 * 1000, // 5 minutes
            priority: 'high' 
          });
        }
        
        if (append) {
          setListings(prev => [...prev, ...transformedListings]);
        } else {
          setListings(transformedListings);
        }
        
        setHasMore(transformedListings.length === ITEMS_PER_PAGE);
        
        if (!append) {
          addToast(`Loaded ${transformedListings.length} listings from marketplace`, 'success');
        }
      } else {
        console.log('No listings returned from enhanced service, using fallback data');
        // Enhanced fallback data that matches our backend structure
        setListings([
          {
            id: 'prod_001',
            sellerWalletAddress: '0x1234567890123456789012345678901234567890',
            tokenAddress: '0xEe034b53D4cCb101b2a4faec27708be507197350',
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
            // enhancedData properties removed to match MarketplaceListing interface
          },
          {
            id: 'prod_002',
            sellerWalletAddress: '0xEe034b53D4cCb101b2a4faec27708be507197350',
            tokenAddress: '0xEe034b53D4cCb101b2a4faec27708be507197350',
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
            // enhancedData properties removed to match MarketplaceListing interface
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
          sellerWalletAddress: '0xEe034b53D4cCb101b2a4faec27708be507197350',
          tokenAddress: '0xEe034b53D4cCb101b2a4faec27708be507197350',
          price: '0.00245',
          quantity: 15,
          itemType: 'DIGITAL',
          listingType: 'FIXED_PRICE',
          status: 'ACTIVE',
          startTime: new Date().toISOString(),
          metadataURI: 'Premium Wireless Headphones',
          isEscrowed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          // enhancedData properties removed to match MarketplaceListing interface
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
          // enhancedData properties removed to match MarketplaceListing interface
        }
      ]);
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [addToast, ITEMS_PER_PAGE]);

  useEffect(() => {
    let mounted = true;
    
    const timer = setTimeout(async () => {
      if (mounted) {
        setPage(1);
        await fetchListings(1, false);
      }
    }, 1000);
    
    return () => {
      clearTimeout(timer);
      mounted = false;
    };
  }, [debouncedSearchTerm, filters, sortField, sortDirection]);

  // Initialize navigation preloading
  useEffect(() => {
    navigationPreloadService.initialize();
    
    return () => {
      navigationPreloadService.destroy();
    };
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      await fetchListings(nextPage, true);
    }
  }, [page, loadingMore, hasMore, fetchListings]);

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: handleLoadMore,
    hasMore,
    isLoading: loadingMore,
    threshold: 0.8,
  });

  const handleRemoveFilter = useCallback((filterKey: keyof FilterOptions) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[filterKey];
      return newFilters;
    });
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setFilters({});
  }, []);

  const handleStartSelling = useCallback(() => {
    if (!isConnected) {
      addToast('Please connect your wallet first', 'warning');
      return;
    }
    if (!profile) {
      router.push('/marketplace/seller/onboarding');
    } else {
      router.push('/marketplace/seller/dashboard');
    }
  }, [addToast, isConnected, profile, router]);

  const handleBrowseMarketplace = useCallback(() => {
    if (browseSectionRef.current) {
      browseSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

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
        listing.metadataURI?.toLowerCase().includes(query) ||
        listing.sellerWalletAddress?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (filters.category) {
      result = result.filter(listing =>
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
      // Skip condition filter for now
    }

    // Trust filters
    if (filters.verified) {
      // Skip verified filter for now
    }
    if (filters.escrowProtected) {
      result = result.filter(listing => listing.isEscrowed);
    }
    if (filters.daoApproved) {
      // Skip daoApproved filter for now
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
          // Skip rating comparison for now
          break;
        case 'popularity':
          // Skip views comparison for now
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

  // Grid columns based on density - optimized for product browsing
  const gridColumns =
    density === 'comfortable'
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-3';

  return (
    <Layout title="Marketplace - LinkDAO" fullWidth={true}>
      {/* Breadcrumb Navigation */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <MarketplaceBreadcrumbs 
            items={breadcrumbItems}
            className="text-white/80"
            preserveFilters={true}
          />
        </div>
      </div>
      
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div ref={browseSectionRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          
          {/* Token Acquisition Section */}
          <TokenAcquisitionSection />

          <div className="bg-white/10 rounded-2xl p-6 space-y-6 text-white">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-white tracking-tight">Web3 Marketplace</h1>
                <p className="text-white/70 text-base">
                  Discover tokenized goods, on-chain verified services, and rare NFTs backed by escrow protection.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative" ref={actionsMenuRef}>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
                    onClick={() => setActionsMenuOpen((prev) => !prev)}
                    aria-haspopup="true"
                    aria-expanded={actionsMenuOpen}
                  >
                    Marketplace actions
                    <ChevronDown size={16} />
                  </Button>
                  {actionsMenuOpen && (
                    <div className="absolute right-0 mt-3 w-72 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl z-50">
                      <ul className="py-2">
                        {marketplaceActions.map((action, index) => (
                          <li key={action.href || action.action || index}>
                            <button
                              type="button"
                              className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                              onClick={() => {
                                setActionsMenuOpen(false);
                                if (action.action === 'open-return-refund-modal') {
                                  setShowReturnRefundModal(true);
                                } else if (action.href) {
                                  router.push(action.href);
                                }
                              }}
                            >
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">{action.label}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">{action.description}</p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <Button variant="primary" onClick={handleStartSelling}>
                  {profile ? 'Seller dashboard' : 'Become a seller'}
                </Button>
              </div>
            </div>

            {/* Search Bar and Filters in Banner */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Search Bar */}
              <div className="lg:col-span-8">
                <SearchBar
                  value={searchTerm}
                  onChange={setSearchTerm}
                  resultCount={filteredAndSortedListings.length}
                  placeholder="Search collections, sellers, tokens..."
                />
              </div>
              
              {/* Trust Labels */}
              <div className="lg:col-span-4 flex items-center justify-end">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 text-emerald-700 dark:text-emerald-300 text-sm font-medium">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Escrow-backed
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-900/30 px-3 py-1.5 text-cyan-700 dark:text-cyan-300 text-sm font-medium">
                    <span className="h-2 w-2 rounded-full bg-cyan-500" />
                    DAO reviewed
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="w-full md:w-auto">
                <FilterBar
                  filters={filters}
                  onFiltersChange={setFilters}
                  className="space-y-3"
                />
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
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
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          

          <section className="space-y-6 lg:col-span-12">
            {/* Active Filter Chips */}
            <ActiveFilterChips
              filters={filters}
              onRemoveFilter={handleRemoveFilter}
              onClearAll={handleClearAllFilters}
            />

            {/* Trust labels and sorting controls moved to banner area */}

            {loading ? (
            <div className={`grid ${gridColumns} gap-6`}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="h-96 rounded-lg animate-pulse bg-gray-200 dark:bg-gray-700"
                />
              ))}
            </div>
          ) : (
            <div>
              {filteredAndSortedListings.length === 0 ? (
                <div className="bg-white/10 rounded-2xl text-center py-12 px-6 text-white">
                  <svg className="mx-auto h-12 w-12 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-white">No items found</h3>
                  <p className="mt-2 text-white/70">
                    {searchTerm || Object.keys(filters).length > 0
                      ? 'No items match your search criteria. Try adjusting your filters.'
                      : 'No listings available at the moment. Check back soon!'}
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
                </div>
              ) : (
                <motion.div
                  className={`grid ${gridColumns} gap-6`}
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
                        // Transform listing to product format for ProductCard
                        const product = {
                          id: listing.id,
                          title: listing.metadataURI || 'Unnamed Item',
                          description: '',
                          images: [formatImageUrl(listing.metadataURI, 400, 300)],
                          price: {
                            amount: listing.price,
                            currency: 'ETH',
                            usdEquivalent: (parseFloat(listing.price) * 2400).toFixed(2),
                          },
                          seller: {
                            id: listing.sellerWalletAddress,
                            name: formatAddress(listing.sellerWalletAddress),
                            avatar: listing.sellerWalletAddress,
                            verified: true,
                            reputation: 4.8,
                            daoApproved: true,
                          },
                          trust: {
                            verified: true,
                            escrowProtected: listing.isEscrowed,
                            onChainCertified: true,
                          },
                          category: listing.itemType.toLowerCase(),
                          inventory: listing.quantity,
                          condition: 'new' as 'new' | 'used' | 'refurbished' | undefined,
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
                            <ProductCard
                              product={product}
                              variant="grid"
                              onAddToCart={(id) => {
                                // Add to cart logic
                                const cartProduct = {
                                  id: listing.id,
                                  title: listing.metadataURI || 'Unnamed Item',
                                  description: '',
                                  image: formatImageUrl(listing.metadataURI, 400, 300) || '',
                                  price: {
                                    crypto: listing.price,
                                    cryptoSymbol: 'ETH',
                                    fiat: (parseFloat(listing.price) * 2400).toFixed(2),
                                    fiatSymbol: 'USD',
                                  },
                                  seller: {
                                    id: listing.sellerWalletAddress,
                                    name: formatAddress(listing.sellerWalletAddress),
                                    avatar: '',
                                    verified: true,
                                    daoApproved: true,
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
                                cart.actions.addItem(cartProduct);
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

              {/* Infinite Scroll Sentinel */}
              {hasMore && (
                <div ref={sentinelRef} className="col-span-full py-8 flex justify-center">
                  {loadingMore && (
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Loading more products...</p>
                    </div>
                  )}
                </div>
              )}

              {/* Load More Button (fallback) */}
              {hasMore && !loadingMore && filteredAndSortedListings.length >= ITEMS_PER_PAGE && (
                <div className="col-span-full py-8 flex justify-center">
                  <button
                    onClick={handleLoadMore}
                    className="px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                  >
                    Load more products
                  </button>
                </div>
              )}
            </div>
            )}
          </section>
        </div>
        </div>

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

        {/* Return & Refund Modal */}
        <ReturnRefundModal
          isOpen={showReturnRefundModal}
          onClose={() => setShowReturnRefundModal(false)}
          order={{
            id: 'order_demo_001',
            productId: 'prod_demo_001',
            productTitle: 'Sample Product - Demo Order',
            productImage: '/api/placeholder/400/400',
            amount: 0.1,
            currency: 'ETH',
            orderDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            canReturn: true,
            canRefund: true,
            returnDeadline: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString()
          }}
          onSubmit={async (request) => {
            try {
              await returnRefundService.submitReturnRequest(request);
              addToast('Return request submitted successfully!', 'success');
            } catch (error) {
              addToast('Failed to submit return request', 'error');
              throw error;
            }
          }}
        />
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
  const service = useMemo(() => marketplaceService, []);

  const fetchMyListings = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching listings for wallet address:', address);
      
      // Use the marketplace service directly
      const userListings = await marketplaceService.getMarketplaceListings({
        sellerWalletAddress: address!
      });
      console.log('Retrieved listings:', userListings);
      
      // Ensure we always have an array
      const validListings = Array.isArray(userListings) ? userListings : [];
      
      // If no listings found, try the dedicated seller listings method
      if (validListings.length === 0) {
        console.log('No listings found, trying getListingsBySeller...');
        try {
          const sellerListings = await marketplaceService.getListingsBySeller(address!);
          if (sellerListings && sellerListings.length > 0) {
            console.log('Found seller listings:', sellerListings.length);
            setListings(sellerListings);
            return;
          }
        } catch (sellerError) {
          console.log('getListingsBySeller also returned no results');
        }
      }
      
      setListings(validListings);
    } catch (error) {
      console.error('Error fetching listings:', error);
      addToast('Failed to fetch your listings. Please try again.', 'error');
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [address, addToast, marketplaceService, service]);

  useEffect(()4 => {
    let mounted = true;
    const fetchListings = async () => {
      if (address) {
        await fetchMyListings();
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
            <GlassPanel variant="secondary" className="p-6">
              <div className="flex flex-col gap-6">
                <h3 className="text-2xl font-semibold text-white">No active listings yet</h3>
                <p className="text-white/70 max-w-2xl">
                  Use the marketplace actions below to manage your buying journey or create your first seller listing.
                </p>

                <div className="space-y-4 text-center">
                  <p className="text-white/70">
                    Use the <span className="font-semibold text-white">Marketplace actions</span> menu above to access your cart, checkout, order history, or disputes without leaving the listings view.
                  </p>
                  <div>
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
                </div>
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
                          {listing.metadataURI || 'Unnamed Item'}
                        </h3>
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                        listing.status === 'ACTIVE' 
                          ? 'bg-green-500/20 text-green-300 border-green-400/30' 
                          : 'bg-gray-500/20 text-gray-330 border-gray-400/30'
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
                        {/* Condition removed as it's not in MarketplaceListing interface */}
                      </div>
                      {/* Tags removed as they're not in MarketplaceListing interface */}
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
                              await marketplaceService.cancelListing(listing.id, address!);
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
    <NavigationLoadingStates showProgressBar={true} showSkeletons={true}>
      <MarketplacePreloader 
        config={{
          preloadCategories: true,
          preloadFeaturedProducts: true,
          preloadOnHover: true,
          preloadDelay: 150
        }}
      />
      <MarketplaceContent />
      
      {/* Floating Seller Action Button - Always accessible */}
      <SellerFloatingActionButton />
      
      {/* Performance Indicator - Development only */}
      <PerformanceIndicator />
    </NavigationLoadingStates>
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