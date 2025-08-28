import React, { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { useToast } from '@/context/ToastContext';
import Layout from '@/components/Layout';
import { 
  MarketplaceService, 
  type MarketplaceListing, 
  type MarketplaceBid,
  type UserReputation 
} from '@/services/marketplaceService';

const MarketplacePage: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { addToast } = useToast();
  
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [activeTab, setActiveTab] = useState<'browse' | 'my-listings' | 'create'>('browse');
  const [loading, setLoading] = useState(true);
  const [reputation, setReputation] = useState<UserReputation | null>(null);
  
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
      setListings(activeListings);
    } catch (error) {
      addToast('Failed to fetch listings', 'error');
      console.error('Error fetching listings:', error);
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
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const formatItemType = (type: string) => {
    return type.charAt(0) + type.slice(1).toLowerCase().replace('_', ' ');
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Marketplace</h1>
          <p className="mt-2 text-gray-600">
            Buy and sell digital and physical goods using cryptocurrency
          </p>
        </div>

        {isConnected && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div>
                <h2 className="text-xl font-semibold">Your Wallet</h2>
                <p className="text-gray-600 mt-1">
                  Connected: {formatAddress(address || '')}
                </p>
                {balance && (
                  <p className="text-gray-600 mt-1">
                    Balance: {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
                  </p>
                )}
              </div>
              {reputation && (
                <div className="mt-4 sm:mt-0">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    Reputation: {reputation.score}
                    {reputation.daoApproved && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        DAO Approved
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('browse')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'browse'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Browse Items
            </button>
            <button
              onClick={() => setActiveTab('my-listings')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'my-listings'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Listings
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'create'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Create Listing
            </button>
          </nav>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <>
            {activeTab === 'browse' && (
              <div>
                {listings.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No listings available at the moment.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {listings.map((listing) => (
                      <div key={listing.id} className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="p-6">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-lg font-medium text-gray-900">
                                {listing.metadataURI || 'Unnamed Item'}
                              </h3>
                              <p className="text-sm text-gray-500">
                                Seller: {formatAddress(listing.sellerAddress)}
                              </p>
                            </div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {formatItemType(listing.itemType)}
                            </span>
                          </div>
                          
                          <div className="mt-4">
                            <p className="text-2xl font-bold text-gray-900">
                              {listing.price} ETH
                            </p>
                            <p className="text-sm text-gray-500">
                              Quantity: {listing.quantity}
                            </p>
                          </div>
                          
                          <div className="mt-4 flex items-center justify-between">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {listing.listingType.replace('_', ' ')}
                            </span>
                            {listing.listingType === 'AUCTION' && listing.endTime && (
                              <span className="text-sm text-gray-500">
                                Ends: {new Date(listing.endTime).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          
                          <div className="mt-6">
                            <button
                              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                              onClick={() => {
                                // TODO: Implement buy/bid functionality
                                addToast('Feature coming soon!', 'info');
                              }}
                            >
                              {listing.listingType === 'AUCTION' ? 'Place Bid' : 'Buy Now'}
                            </button>
                          </div>
                        </div>
                      </div>
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
                  <div className="text-center py-12">
                    <p className="text-gray-500">Please connect your wallet to view your listings.</p>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'create' && (
              <div>
                {isConnected ? (
                  <CreateListingTab address={address} onListingCreated={fetchListings} />
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500">Please connect your wallet to create a listing.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
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
      setListings(userListings);
    } catch (error) {
      addToast('Failed to fetch your listings', 'error');
      console.error('Error fetching listings:', error);
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
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <>
          {listings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">You haven't created any listings yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <div key={listing.id} className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {listing.metadataURI || 'Unnamed Item'}
                        </h3>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        listing.status === 'ACTIVE' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {listing.status}
                      </span>
                    </div>
                    
                    <div className="mt-4">
                      <p className="text-2xl font-bold text-gray-900">
                        {listing.price} ETH
                      </p>
                      <p className="text-sm text-gray-500">
                        Quantity: {listing.quantity}
                      </p>
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {formatItemType(listing.itemType)}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {listing.listingType.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <div className="mt-6 flex space-x-3">
                      <button
                        className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        onClick={() => {
                          // TODO: Implement edit functionality
                          addToast('Edit feature coming soon!', 'info');
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
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
                      </button>
                    </div>
                  </div>
                </div>
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
    <div className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-6">Create New Listing</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <div>
            <label htmlFor="itemType" className="block text-sm font-medium text-gray-700">
              Item Type
            </label>
            <select
              id="itemType"
              name="itemType"
              value={formData.itemType}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="PHYSICAL">Physical Goods</option>
              <option value="DIGITAL">Digital Goods</option>
              <option value="NFT">NFT</option>
              <option value="SERVICE">Service</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="listingType" className="block text-sm font-medium text-gray-700">
              Listing Type
            </label>
            <select
              id="listingType"
              name="listingType"
              value={formData.listingType}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="FIXED_PRICE">Fixed Price</option>
              <option value="AUCTION">Auction</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700">
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="0.01"
            />
          </div>
          
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
              Quantity
            </label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              min="1"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          
          {formData.listingType === 'AUCTION' && (
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                Auction Duration (seconds)
              </label>
              <input
                type="number"
                id="duration"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                min="60"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="86400 (24 hours)"
              />
              <p className="mt-1 text-sm text-gray-500">
                Current duration: {Math.floor(formData.duration / 3600)} hours
              </p>
            </div>
          )}
          
          <div>
            <label htmlFor="metadataURI" className="block text-sm font-medium text-gray-700">
              Item Description
            </label>
            <textarea
              id="metadataURI"
              name="metadataURI"
              value={formData.metadataURI}
              onChange={handleChange}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Describe your item..."
            />
          </div>
          
          <div>
            <label htmlFor="tokenAddress" className="block text-sm font-medium text-gray-700">
              Token Address (optional)
            </label>
            <input
              type="text"
              id="tokenAddress"
              name="tokenAddress"
              value={formData.tokenAddress}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="0x... (leave empty for ETH)"
            />
            <p className="mt-1 text-sm text-gray-500">
              Leave empty to use ETH as payment token
            </p>
          </div>
        </div>
        
        <div className="mt-8">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Listing'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MarketplacePage;