import React, { useState } from 'react';
import ProductCard from './ProductCard';
import { Filter, SlidersHorizontal } from 'lucide-react';

// Sample product data
const sampleProducts = [
  {
    id: '1',
    title: 'Handcrafted Wooden Watch',
    description: 'Sustainable wooden watch with metal accents',
    images: ['/images/sample-product-1.jpg'],
    price: {
      amount: '45.99',
      currency: 'USDC',
      usdEquivalent: '45.99'
    },
    seller: {
      id: 'seller-1',
      name: 'EcoCrafts',
      avatar: '/images/sample-avatar-1.jpg',
      verified: true,
      reputation: 4.8,
      daoApproved: true
    },
    trust: {
      verified: true,
      escrowProtected: true,
      onChainCertified: false
    },
    category: 'Accessories'
  },
  {
    id: '2',
    title: 'Digital Art Collection',
    description: 'Limited edition NFT collection',
    images: ['/images/sample-product-2.jpg'],
    price: {
      amount: '0.25',
      currency: 'ETH',
      usdEquivalent: '425.00'
    },
    seller: {
      id: 'seller-2',
      name: 'DigitalArtist',
      avatar: '/images/sample-avatar-2.jpg',
      verified: true,
      reputation: 4.9,
      daoApproved: true
    },
    trust: {
      verified: true,
      escrowProtected: false,
      onChainCertified: true
    },
    category: 'Digital Art',
    isNFT: true
  },
  {
    id: '3',
    title: 'Website Development Service',
    description: 'Professional website design and development',
    images: ['/images/sample-product-3.jpg'],
    price: {
      amount: '750.00',
      currency: 'USDC',
      usdEquivalent: '750.00'
    },
    seller: {
      id: 'seller-3',
      name: 'WebExperts',
      avatar: '/images/sample-avatar-3.jpg',
      verified: false,
      reputation: 4.7,
      daoApproved: false
    },
    trust: {
      verified: false,
      escrowProtected: true,
      onChainCertified: false
    },
    category: 'Services'
  },
  {
    id: '4',
    title: 'Premium Coffee Subscription',
    description: 'Monthly delivery of specialty coffee beans',
    images: ['/images/sample-product-4.jpg'],
    price: {
      amount: '29.99',
      currency: 'USDC',
      usdEquivalent: '29.99'
    },
    seller: {
      id: 'seller-4',
      name: 'CoffeeRoasters',
      avatar: '/images/sample-avatar-4.jpg',
      verified: true,
      reputation: 4.6,
      daoApproved: true
    },
    trust: {
      verified: true,
      escrowProtected: true,
      onChainCertified: false
    },
    category: 'Food & Beverage'
  },
  {
    id: '5',
    title: 'Wireless Bluetooth Headphones',
    description: 'Noise-cancelling headphones with 30hr battery',
    images: ['/images/sample-product-5.jpg'],
    price: {
      amount: '89.99',
      currency: 'USDC',
      usdEquivalent: '89.99'
    },
    seller: {
      id: 'seller-5',
      name: 'TechGadgets',
      avatar: '/images/sample-avatar-5.jpg',
      verified: true,
      reputation: 4.5,
      daoApproved: false
    },
    trust: {
      verified: true,
      escrowProtected: true,
      onChainCertified: false
    },
    category: 'Electronics'
  },
  {
    id: '6',
    title: 'Smart Home Security Camera',
    description: '1080p HD indoor security camera with night vision',
    images: ['/images/sample-product-6.jpg'],
    price: {
      amount: '39.99',
      currency: 'USDC',
      usdEquivalent: '39.99'
    },
    seller: {
      id: 'seller-6',
      name: 'HomeSecurity',
      avatar: '/images/sample-avatar-6.jpg',
      verified: false,
      reputation: 4.3,
      daoApproved: false
    },
    trust: {
      verified: false,
      escrowProtected: true,
      onChainCertified: false
    },
    category: 'Home Security'
  }
];

const ProductListingPage = () => {
  const [filters, setFilters] = useState({
    category: 'all',
    minPrice: '',
    maxPrice: '',
    sellerReputation: 0,
    escrowEligible: false,
    productType: 'all'
  });

  const handleFilterChange = (name: string, value: string | number | boolean) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Filters</h2>
              <SlidersHorizontal size={20} className="text-gray-600" />
            </div>
            
            <div className="space-y-6">
              {/* Category Filter */}
              <div>
                <h3 className="font-medium text-gray-800 mb-2">Category</h3>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  <option value="physical">Physical Goods</option>
                  <option value="digital">Digital Services</option>
                  <option value="nft">NFTs & Collectibles</option>
                  <option value="subscription">Subscriptions</option>
                </select>
              </div>
              
              {/* Price Range */}
              <div>
                <h3 className="font-medium text-gray-800 mb-2">Price Range</h3>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Seller Reputation */}
              <div>
                <h3 className="font-medium text-gray-800 mb-2">Seller Reputation</h3>
                <div className="space-y-2">
                  {[4.5, 4.0, 3.5, 3.0].map((rating) => (
                    <label key={rating} className="flex items-center">
                      <input
                        type="radio"
                        name="reputation"
                        checked={filters.sellerReputation === rating}
                        onChange={() => handleFilterChange('sellerReputation', rating)}
                        className="mr-2"
                      />
                      <span>{rating} & up</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Escrow Toggle */}
              <div>
                <h3 className="font-medium text-gray-800 mb-2">Escrow Protection</h3>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.escrowEligible}
                    onChange={(e) => handleFilterChange('escrowEligible', e.target.checked)}
                    className="mr-2"
                  />
                  <span>Escrow-eligible only</span>
                </label>
              </div>
              
              {/* Product Type */}
              <div>
                <h3 className="font-medium text-gray-800 mb-2">Product Type</h3>
                <select
                  value={filters.productType}
                  onChange={(e) => handleFilterChange('productType', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="physical">Physical</option>
                  <option value="digital">Digital</option>
                  <option value="nft">NFT</option>
                  <option value="service">Service</option>
                </select>
              </div>
              
              {/* Apply Filters Button */}
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition-colors">
                Apply Filters
              </button>
            </div>
          </div>
        </div>
        
        {/* Main Product Grid */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Products</h1>
            <div className="flex items-center">
              <span className="text-gray-600 mr-2">Sort by:</span>
              <select className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Featured</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Customer Reviews</option>
                <option>Newest Arrivals</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sampleProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          
          {/* Pagination */}
          <div className="flex justify-center mt-8">
            <nav className="flex items-center space-x-2">
              <button className="px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200">Previous</button>
              <button className="px-3 py-1 rounded-md bg-blue-600 text-white">1</button>
              <button className="px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200">2</button>
              <button className="px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200">3</button>
              <span className="px-2">...</span>
              <button className="px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200">10</button>
              <button className="px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200">Next</button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductListingPage;