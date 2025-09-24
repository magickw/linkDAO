import React from 'react';
import ProductCard from '../ProductDisplay/ProductCard';

// Sample product data
const featuredProducts = [
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
  }
];

const FeaturedProducts = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {featuredProducts.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};

export default FeaturedProducts;