import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { useToast } from '@/context/ToastContext';
import { ImageWithFallback } from '@/utils/imageUtils';
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
import { designTokens } from '@/design-system/tokens';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';
import Layout from '@/components/Layout'; // Import the standard Layout component

const MarketplacePage: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { addToast } = useToast();
  
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [activeTab, setActiveTab] = useState<'browse' | 'my-listings' | 'create'>('browse');
  const [loading, setLoading] = useState(true);
  const [reputation, setReputation] = useState<UserReputation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  const marketplaceService = new MarketplaceService();

  useEffect(() => {
    fetchListings();
    if (address) {
      fetchReputation(address);
    }
  }, [address]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const activeListings = await marketplaceService.getActiveListings();
      // Ensure we always have an array
      setListings(Array.isArray(activeListings) ? activeListings : []);
    } catch (error) {
      console.error('Error fetching listings:', error);
      addToast('Failed to fetch listings. Displaying mock data as fallback.', 'warning');
      // Use mock data as fallback
      setListings([
        {
          id: '1',
          sellerAddress: '0x1234567890123456789012345678901234567890',
          tokenAddress: '0x0000000000000000000000000000000000000000',
          price: '0.5',
          quantity: 1,
          itemType: 'DIGITAL',
          listingType: 'FIXED_PRICE',
          status: 'ACTIVE',
          startTime: new Date().toISOString(),
          metadataURI: 'Rare CryptoPunk #1234',
          isEscrowed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '2',
          sellerAddress: '0x2345678901234567890123456789012345678901',
          tokenAddress: '0x0000000000000000000000000000000000000000',
          price: '1.2',
          quantity: 1,
          itemType: 'NFT',
          listingType: 'AUCTION',
          status: 'ACTIVE',
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
          highestBid: '1.0',
          highestBidder: '0x3456789012345678901234567890123456789012',
          metadataURI: 'DeFi Art Collection',
          isEscrowed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchReputation = async (userAddress: string) => {
    try {
      const userReputation = await marketplaceService.getUserReputation(userAddress);
      setReputation(userReputation);
    } catch (error) {
      console.error('Error fetching reputation:', error);
      // Use mock data as fallback
      setReputation({
        address: userAddress,
        score: 750,
        daoApproved: true
      });
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const formatItemType = (type: string) => {
    return type.charAt(0) + type.slice(1).toLowerCase().replace('_', ' ');
  };

  const formatImageUrl = useCallback((url: string | undefined, width: number, height: number) => {
    if (!url) return '';
    // If it's already a full URL or data URL, return as is
    if (url.startsWith('http') || url.startsWith('data:image')) return url;
    // For local paths, ensure they're properly formatted
    if (url.startsWith('/')) return url;
    // For other cases, use our fallback
    return '';
  }, []);

  // Filter listings based on search term and category
  const filteredListings = Array.isArray(listings) ? listings.filter(listing => {
    const matchesSearch = listing.metadataURI?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.sellerAddress?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || listing.itemType === selectedCategory.toUpperCase();
    
    return matchesSearch && matchesCategory;
  }) : [];

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
          onStartSelling={() => setActiveTab('create')}
          onBrowseMarketplace={() => setActiveTab('browse')}
        />

        {/* Category Grid */}
        <CategoryGrid />

        {/* Main Marketplace Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

          {activeTab === 'browse' && (
            <GlassPanel variant="secondary" className="mb-6">
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                  >
                    <option value="all">All Categories</option>
                    <option value="digital">Digital Goods</option>
                    <option value="physical">Physical Goods</option>
                    <option value="nft">NFTs</option>
                    <option value="service">Services</option>
                  </select>
                </div>
              </div>
            </GlassPanel>
          )}

          {loading ? (
            <GlassPanel variant="primary" className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white/50"></div>
            </GlassPanel>
          ) : (
          <>
            {activeTab === 'browse' && (
              <div>
                {filteredListings.length === 0 ? (
                  <GlassPanel variant="primary" className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <h3 className="mt-2 text-lg font-medium text-white">No items found</h3>
                    <p className="mt-1 text-white/70">
                      {searchTerm || selectedCategory !== 'all' 
                        ? 'No items match your search criteria.' 
                        : 'No listings available at the moment.'}
                    </p>
                  </GlassPanel>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredListings.map((listing) => (
                      <GlassPanel key={listing.id} variant="secondary" hoverable className="overflow-hidden">
                        <div className="p-6">
                          <div className="mt-4 relative h-48 bg-gray-800/50 rounded-lg overflow-hidden">
                            <ImageWithFallback
                              src={formatImageUrl(listing.metadataURI, 400, 300)}
                              alt={listing.metadataURI || 'Product image'}
                              className="w-full h-full object-cover"
                              fallbackType="product"
                            />
                          </div>
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-lg font-medium text-white">
                                {listing.metadataURI || 'Unnamed Item'}
                              </h3>
                              <p className="text-sm text-white/70">
                                Seller: {formatAddress(listing.sellerAddress)}
                              </p>
                            </div>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-400/30">
                              {formatItemType(listing.itemType)}
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
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-400/30">
                              {listing.listingType.replace('_', ' ')}
                            </span>
                            {listing.listingType === 'AUCTION' && listing.endTime && (
                              <span className="text-sm text-white/70">
                                Ends: {new Date(listing.endTime).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          
                          <div className="mt-6">
                            <Button
                              variant="primary"
                              className="w-full"
                              onClick={() => {
                                // TODO: Implement buy/bid functionality
                                addToast('Feature coming soon!', 'info');
                              }}
                            >
                              {listing.listingType === 'AUCTION' ? 'Place Bid' : 'Buy Now'}
                            </Button>
                          </div>
                        </div>
                      </GlassPanel>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'my-listings' && (
              <div>
                {isConnected ? (
                  <MyListingsTab address={address} />
                ) : (
                  <GlassPanel variant="primary" className="text-center py-12">
                    <p className="text-white/70">Please connect your wallet to view your listings.</p>
                  </GlassPanel>
                )}
              </div>
            )}
            
            {activeTab === 'create' && (
              <div>
                {isConnected ? (
                  <CreateListingTab address={address} onListingCreated={fetchListings} />
                ) : (
                  <GlassPanel variant="primary" className="text-center py-12">
                    <p className="text-white/70">Please connect your wallet to create a listing.</p>
                  </GlassPanel>
                )}
              </div>
            )}
          </>
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
      </div>
    </Layout>
  );
};

const MyListingsTab: React.FC<{ address: string | undefined }> = ({ address }) => {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  
  const marketplaceService = new MarketplaceService();

  useEffect(() => {
    if (address) {
      fetchMyListings();
    }
  }, [address]);

  const fetchMyListings = async () => {
    try {
      setLoading(true);
      const userListings = await marketplaceService.getListingsBySeller(address!);
      // Ensure we always have an array
      setListings(Array.isArray(userListings) ? userListings : []);
    } catch (error) {
      console.error('Error fetching listings:', error);
      addToast('Failed to fetch your listings. Displaying mock data as fallback.', 'warning');
      // Use mock data as fallback
      setListings([
        {
          id: '3',
          sellerAddress: address!,
          tokenAddress: '0x0000000000000000000000000000000000000000',
          price: '0.8',
          quantity: 1,
          itemType: 'NFT',
          listingType: 'FIXED_PRICE',
          status: 'ACTIVE',
          startTime: new Date().toISOString(),
          metadataURI: 'My Rare NFT Collection',
          isEscrowed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

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
                    // This would typically navigate to the create listing tab
                    // For now, we'll just show a toast
                    addToast('Navigate to Create Listing tab to get started', 'info');
                  }}
                >
                  Create Listing
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
                          {listing.metadataURI || 'Unnamed Item'}
                        </h3>
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
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-400/30">
                        {formatItemType(listing.itemType)}
                      </span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-400/30">
                        {listing.listingType.replace('_', ' ')}
                      </span>
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
                          try {
                            await marketplaceService.cancelListing(listing.id);
                            addToast('Listing cancelled successfully', 'success');
                            fetchMyListings();
                          } catch (error) {
                            addToast('Failed to cancel listing', 'error');
                            console.error('Error cancelling listing:', error);
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

const CreateListingTab: React.FC<{ 
  address: string | undefined; 
  onListingCreated: () => void 
}> = ({ address, onListingCreated }) => {
  const [formData, setFormData] = useState({
    tokenAddress: '',
    price: '',
    quantity: 1,
    itemType: 'DIGITAL' as 'PHYSICAL' | 'DIGITAL' | 'NFT' | 'SERVICE',
    listingType: 'FIXED_PRICE' as 'FIXED_PRICE' | 'AUCTION',
    duration: 86400, // 24 hours in seconds
    metadataURI: ''
  });
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  
  const marketplaceService = new MarketplaceService();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'duration' ? parseInt(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address) {
      addToast('Please connect your wallet first', 'error');
      return;
    }
    
    try {
      setLoading(true);
      
      // Validate form data
      if (!formData.price || parseFloat(formData.price) <= 0) {
        throw new Error('Price must be greater than 0');
      }
      
      if (formData.quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
      }
      
      if (formData.listingType === 'AUCTION' && formData.duration <= 0) {
        throw new Error('Auction duration must be greater than 0');
      }
      
      if (!formData.metadataURI) {
        throw new Error('Item description is required');
      }
      
      await marketplaceService.createListing({
        sellerAddress: address,
        tokenAddress: formData.tokenAddress || '0x0000000000000000000000000000000000000000', // ETH
        price: formData.price,
        quantity: formData.quantity,
        itemType: formData.itemType,
        listingType: formData.listingType,
        duration: formData.listingType === 'AUCTION' ? formData.duration : undefined,
        metadataURI: formData.metadataURI
      });
      
      addToast('Listing created successfully!', 'success');
      
      // Reset form
      setFormData({
        tokenAddress: '',
        price: '',
        quantity: 1,
        itemType: 'DIGITAL',
        listingType: 'FIXED_PRICE',
        duration: 86400,
        metadataURI: ''
      });
      
      // Refresh listings
      onListingCreated();
    } catch (error: any) {
      addToast(error.message || 'Failed to create listing', 'error');
      console.error('Error creating listing:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassPanel variant="primary" className="max-w-2xl mx-auto">
      <div className="p-8">
        <h2 className="text-xl font-semibold text-white mb-6">Create New Listing</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <div>
            <label htmlFor="itemType" className="block text-sm font-medium text-white/90 mb-2">
              Item Type
            </label>
            <select
              id="itemType"
              name="itemType"
              value={formData.itemType}
              onChange={handleChange}
              className="block w-full rounded-lg bg-white/10 border border-white/20 text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent px-3 py-2"
            >
              <option value="PHYSICAL">Physical Goods</option>
              <option value="DIGITAL">Digital Goods</option>
              <option value="NFT">NFT</option>
              <option value="SERVICE">Service</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="listingType" className="block text-sm font-medium text-white/90 mb-2">
              Listing Type
            </label>
            <select
              id="listingType"
              name="listingType"
              value={formData.listingType}
              onChange={handleChange}
              className="block w-full rounded-lg bg-white/10 border border-white/20 text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent px-3 py-2"
            >
              <option value="FIXED_PRICE">Fixed Price</option>
              <option value="AUCTION">Auction</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-white/90 mb-2">
              Price (ETH)
            </label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleChange}
              step="0.0001"
              min="0"
              className="block w-full rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent px-3 py-2"
              placeholder="0.01"
            />
          </div>
          
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-white/90 mb-2">
              Quantity
            </label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              min="1"
              className="block w-full rounded-lg bg-white/10 border border-white/20 text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent px-3 py-2"
            />
          </div>
          
          {formData.listingType === 'AUCTION' && (
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-white/90 mb-2">
                Auction Duration (seconds)
              </label>
              <input
                type="number"
                id="duration"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                min="60"
                className="block w-full rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent px-3 py-2"
                placeholder="86400 (24 hours)"
              />
              <p className="mt-1 text-sm text-white/70">
                Current duration: {Math.floor(formData.duration / 3600)} hours
              </p>
            </div>
          )}
          
          <div>
            <label htmlFor="metadataURI" className="block text-sm font-medium text-white/90 mb-2">
              Item Description
            </label>
            <textarea
              id="metadataURI"
              name="metadataURI"
              value={formData.metadataURI}
              onChange={handleChange}
              rows={3}
              className="block w-full rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent px-3 py-2"
              placeholder="Describe your item..."
            />
          </div>
          
          <div>
            <label htmlFor="tokenAddress" className="block text-sm font-medium text-white/90 mb-2">
              Token Address (optional)
            </label>
            <input
              type="text"
              id="tokenAddress"
              name="tokenAddress"
              value={formData.tokenAddress}
              onChange={handleChange}
              className="block w-full rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent px-3 py-2"
              placeholder="0x... (leave empty for ETH)"
            />
            <p className="mt-1 text-sm text-white/70">Leave empty to use ETH as payment currency</p>
          </div>
          
          <div className="flex space-x-4">
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="flex-1"
            >
              {loading ? 'Creating...' : 'Create Listing'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormData({
                  tokenAddress: '',
                  price: '',
                  quantity: 1,
                  itemType: 'DIGITAL',
                  listingType: 'FIXED_PRICE',
                  duration: 86400,
                  metadataURI: ''
                });
              }}
              className="border-white/30 text-white/80 hover:bg-white/10"
            >
              Reset
            </Button>
          </div>
        </div>
      </form>
      </div>
    </GlassPanel>
  );
};

export default MarketplacePage;