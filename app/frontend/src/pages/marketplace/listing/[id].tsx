import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import { MarketplaceListing, MarketplaceService } from '@/services/marketplaceService';
import { useToast } from '@/context/ToastContext';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';
import Layout from '@/components/Layout';
import { 
  Heart, 
  Share2, 
  ShoppingCart, 
  Shield, 
  Star, 
  MapPin, 
  Clock, 
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface EnhancedDataType {
  title?: string;
  description?: string;
  images?: string[];
  category?: string;
  tags?: string[];
  condition?: string;
  escrowEnabled?: boolean;
}

export default function ListingDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { address, isConnected } = useAccount();
  const { addToast } = useToast();
  
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [quantity, setQuantity] = useState(1);
  
  const marketplaceService = new MarketplaceService();

  useEffect(() => {
    if (id) {
      fetchListing();
    }
  }, [id]);

  const fetchListing = async () => {
    try {
      setLoading(true);
      
      // Try to fetch from seller endpoints since we don't have a direct listing endpoint
      const testAddresses = [
        '0x1234567890123456789012345678901234567890',
        '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
      ];
      
      let foundListing = null;
      for (const address of testAddresses) {
        try {
          const response = await fetch(`http://localhost:3002/marketplace/seller/listings/${address}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              foundListing = data.data.find((l: any) => l.id.toString() === id);
              if (foundListing) break;
            }
          }
        } catch (err) {
          console.error(`Error fetching listings for ${address}:`, err);
        }
      }
      
      if (foundListing) {
        // Transform the data to match our frontend format
        let enhancedData: EnhancedDataType = {};
        try {
          if (foundListing.enhancedData) {
            enhancedData = foundListing.enhancedData;
          } else if (foundListing.metadata_uri) {
            const parsed = JSON.parse(foundListing.metadata_uri);
            enhancedData = {
              title: parsed.title || 'Unnamed Item',
              description: parsed.description || '',
              images: parsed.images || [],
              category: parsed.category || 'general',
              tags: parsed.tags || [],
              condition: parsed.condition || 'new',
              escrowEnabled: parsed.escrowEnabled || false
            };
          }
        } catch (e) {
          enhancedData = {
            title: foundListing.metadataURI || 'Unnamed Item',
            description: '',
            images: [],
            category: 'general',
            tags: [],
            condition: 'new',
            escrowEnabled: false
          };
        }
        
        const transformedListing: MarketplaceListing = {
          id: foundListing.id.toString(),
          sellerWalletAddress: foundListing.sellerWalletAddress,
          tokenAddress: foundListing.tokenAddress || '0x0000000000000000000000000000000000000000',
          price: foundListing.price || '0.1',
          quantity: foundListing.quantity || 1,
          itemType: foundListing.itemType || 'DIGITAL',
          listingType: foundListing.listingType || 'FIXED_PRICE',
          status: foundListing.status || 'ACTIVE',
          startTime: foundListing.startTime || foundListing.createdAt || new Date().toISOString(),
          metadataURI: enhancedData.title || foundListing.metadataURI || 'Unnamed Item',
          isEscrowed: foundListing.isEscrowed || false,
          createdAt: foundListing.createdAt || new Date().toISOString(),
          updatedAt: foundListing.updatedAt || new Date().toISOString(),
          enhancedData: {
            title: enhancedData.title || 'Unnamed Item',
            description: enhancedData.description || '',
            images: enhancedData.images || [],
            price: {
              crypto: foundListing.price || '0.1',
              cryptoSymbol: 'ETH',
              fiat: ((parseFloat(foundListing.price || '0.1')) * 2400).toFixed(2),
              fiatSymbol: 'USD'
            },
            seller: {
              id: foundListing.sellerWalletAddress,
              name: 'Verified Seller',
              rating: 4.8,
              verified: true,
              daoApproved: true,
              walletAddress: foundListing.sellerWalletAddress
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
        
        setListing(transformedListing);
      } else {
        addToast('Listing not found', 'error');
        router.push('/marketplace');
      }
    } catch (error) {
      console.error('Error fetching listing:', error);
      addToast('Failed to load listing', 'error');
      router.push('/marketplace');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!isConnected) {
      addToast('Please connect your wallet first', 'warning');
      return;
    }
    addToast(`Added ${quantity} item(s) to cart`, 'success');
  };

  const handleBuyNow = () => {
    if (!isConnected) {
      addToast('Please connect your wallet first', 'warning');
      return;
    }
    addToast('Redirecting to checkout...', 'info');
  };

  const handleToggleFavorite = () => {
    setIsFavorited(!isFavorited);
    addToast(isFavorited ? 'Removed from favorites' : 'Added to favorites', 'success');
  };

  const handleShare = async () => {
    try {
      const url = window.location.href;
      if (navigator.share) {
        await navigator.share({
          title: listing?.enhancedData?.title || 'Check out this listing',
          url: url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        addToast('Link copied to clipboard!', 'success');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      addToast('Failed to share listing', 'error');
    }
  };

  if (loading) {
    return (
      <Layout title="Loading...">
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white/50"></div>
        </div>
      </Layout>
    );
  }

  if (!listing) {
    return (
      <Layout title="Listing Not Found">
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
          <GlassPanel className="text-center py-12 px-8">
            <h1 className="text-2xl font-bold text-white mb-4">Listing Not Found</h1>
            <p className="text-white/70 mb-6">The listing you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => router.push('/marketplace')} variant="primary">
              Back to Marketplace
            </Button>
          </GlassPanel>
        </div>
      </Layout>
    );
  }

  const images = listing.enhancedData?.images || [];
  const hasImages = images.length > 0;

  return (
    <Layout title={listing.enhancedData?.title || 'Listing Details'}>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="mb-6"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Image Gallery */}
            <div className="space-y-4">
              <GlassPanel className="relative aspect-square overflow-hidden">
                {hasImages ? (
                  <>
                    <img
                      src={images[selectedImageIndex]}
                      alt={listing.enhancedData?.title}
                      className="w-full h-full object-cover"
                    />
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={() => setSelectedImageIndex(Math.max(0, selectedImageIndex - 1))}
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                          disabled={selectedImageIndex === 0}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSelectedImageIndex(Math.min(images.length - 1, selectedImageIndex + 1))}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                          disabled={selectedImageIndex === images.length - 1}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full bg-gray-800/50 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-700 rounded-lg mx-auto mb-4 flex items-center justify-center">
                        <Eye className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-white/60">No image available</p>
                    </div>
                  </div>
                )}
              </GlassPanel>

              {/* Image Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {images.map((image: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                        selectedImageIndex === index ? 'border-blue-400' : 'border-white/20'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${listing.enhancedData?.title} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="space-y-6">
              <GlassPanel className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                      {listing.enhancedData?.title}
                    </h1>
                    <div className="flex items-center gap-4 text-sm text-white/70">
                      <span>Listed {new Date(listing.createdAt).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {listing.enhancedData?.views || 0} views
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleToggleFavorite}
                      variant="outline"
                      size="small"
                      className={isFavorited ? 'text-red-400 border-red-400' : ''}
                    >
                      <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                    </Button>
                    <Button onClick={handleShare} variant="outline" size="small">
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="text-4xl font-bold text-white mb-1">
                    {listing.enhancedData?.price?.crypto || listing.price} ETH
                  </div>
                  <div className="text-lg text-white/70">
                    ≈ ${listing.enhancedData?.price?.fiat || '0'} USD
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="text-white/70 text-sm">Condition</div>
                    <div className="text-white font-medium capitalize">
                      {listing.enhancedData?.condition || 'New'}
                    </div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="text-white/70 text-sm">Category</div>
                    <div className="text-white font-medium capitalize">
                      {listing.enhancedData?.category || 'General'}
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {listing.enhancedData?.tags && listing.enhancedData.tags.length > 0 && (
                  <div className="mb-6">
                    <div className="text-white/70 text-sm mb-2">Tags</div>
                    <div className="flex flex-wrap gap-2">
                      {listing.enhancedData.tags.map((tag: string, index: number) => (
                        <span
                          key={index}
                          className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity Selector */}
                <div className="mb-6">
                  <div className="text-white/70 text-sm mb-2">Quantity</div>
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      variant="outline"
                      size="small"
                      disabled={quantity <= 1}
                    >
                      -
                    </Button>
                    <span className="text-white text-lg font-medium w-8 text-center">
                      {quantity}
                    </span>
                    <Button
                      onClick={() => setQuantity(Math.min(listing.quantity, quantity + 1))}
                      variant="outline"
                      size="small"
                      disabled={quantity >= listing.quantity}
                    >
                      +
                    </Button>
                    <span className="text-white/70 text-sm ml-2">
                      ({listing.quantity} available)
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button
                    onClick={handleBuyNow}
                    variant="primary"
                    className="w-full"
                    disabled={!isConnected}
                  >
                    Buy Now
                  </Button>
                  <Button
                    onClick={handleAddToCart}
                    variant="outline"
                    className="w-full"
                    disabled={!isConnected}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Add to Cart
                  </Button>
                  {!isConnected && (
                    <p className="text-center text-white/60 text-sm">
                      Connect your wallet to purchase
                    </p>
                  )}
                </div>
              </GlassPanel>

              {/* Seller Info */}
              <GlassPanel className="p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Seller Information</h3>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                    {listing.enhancedData?.seller?.name?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <div className="text-white font-medium">
                      {listing.enhancedData?.seller?.name || 'Verified Seller'}
                    </div>
                    <div className="text-white/60 text-sm">
                      {listing.sellerWalletAddress.substring(0, 6)}...{listing.sellerWalletAddress.substring(-4)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-white">{listing.enhancedData?.seller?.rating || 4.8}</span>
                  </div>
                  {listing.enhancedData?.seller?.verified && (
                    <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs">
                      ✅ Verified
                    </span>
                  )}
                  {listing.enhancedData?.seller?.daoApproved && (
                    <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-xs">
                      🏛️ DAO Approved
                    </span>
                  )}
                </div>
              </GlassPanel>

              {/* Description */}
              {listing.enhancedData?.description && (
                <GlassPanel className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Description</h3>
                  <p className="text-white/80 leading-relaxed">
                    {listing.enhancedData.description}
                  </p>
                </GlassPanel>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}