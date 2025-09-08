import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/router';
import { useToast } from '@/context/ToastContext';
import { MarketplaceService, type MarketplaceListing } from '@/services/marketplaceService';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';
import Layout from '@/components/Layout';

const CreateListingPage: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { addToast } = useToast();
  const router = useRouter();
  
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
    
    if (!isConnected || !address) {
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
        sellerWalletAddress: address,
        tokenAddress: formData.tokenAddress || '0x0000000000000000000000000000000000000000', // ETH
        price: formData.price,
        quantity: formData.quantity,
        itemType: formData.itemType,
        listingType: formData.listingType,
        duration: formData.listingType === 'AUCTION' ? formData.duration : undefined,
        metadataURI: formData.metadataURI
      });
      
      addToast('Listing created successfully!', 'success');
      
      // Redirect to marketplace
      router.push('/marketplace');
    } catch (error: any) {
      addToast(error.message || 'Failed to create listing', 'error');
      console.error('Error creating listing:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <Layout title="Create Listing - LinkDAO Marketplace">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <GlassPanel variant="primary" className="text-center py-12">
            <p className="text-white/70">Please connect your wallet to create a listing.</p>
          </GlassPanel>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Create Listing - LinkDAO Marketplace">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
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
      </div>
    </Layout>
  );
};

export default CreateListingPage;