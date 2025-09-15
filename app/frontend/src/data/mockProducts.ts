/**
 * Mock Products Data for Testing Enhanced Marketplace Features
 * Includes various product types to showcase grid layout, escrow, and trust indicators
 */

export interface MockProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  cryptoPrice: string;
  cryptoSymbol: string;
  category: string;
  listingType: 'FIXED_PRICE' | 'AUCTION';
  seller: {
    id: string;
    name: string;
    rating: number;
    reputation: number;
    verified: boolean;
    daoApproved: boolean;
    walletAddress: string;
  };
  trust: {
    verified: boolean;
    escrowProtected: boolean;
    onChainCertified: boolean;
    safetyScore: number;
  };
  images: string[];
  inventory: number;
  isNFT: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  views: number;
  favorites: number;
  auctionEndTime?: string;
  highestBid?: string;
  bidCount?: number;
  specifications?: Record<string, string>;
  shipping?: {
    free: boolean;
    cost: string;
    estimatedDays: string;
    regions: string[];
    expedited: boolean;
  };
}

export const mockProducts: MockProduct[] = [
  {
    id: 'prod_001',
    title: 'Premium Wireless Headphones',
    description: 'High-quality noise-canceling wireless headphones with 30-hour battery life and premium sound quality.',
    price: '299.99',
    currency: 'USD',
    cryptoPrice: '0.1245',
    cryptoSymbol: 'ETH',
    category: 'electronics',
    listingType: 'FIXED_PRICE',
    seller: {
      id: 'seller_001',
      name: 'TechGear Pro',
      rating: 4.8,
      reputation: 95,
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
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400&h=300&fit=crop'
    ],
    inventory: 15,
    isNFT: false,
    tags: ['electronics', 'audio', 'wireless', 'premium'],
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-20T14:22:00Z',
    views: 1247,
    favorites: 89,
    specifications: {
      brand: 'AudioMax',
      model: 'WH-1000XM5',
      batteryLife: '30 hours',
      connectivity: 'Bluetooth 5.2',
      noiseCanceling: 'Active'
    },
    shipping: {
      free: true,
      cost: '0',
      estimatedDays: '2-3',
      regions: ['US', 'CA', 'EU'],
      expedited: true
    }
  },
  {
    id: 'prod_002',
    title: 'Rare Digital Art NFT Collection',
    description: 'Exclusive digital artwork from renowned crypto artist. Limited edition with utility benefits.',
    price: '2.5',
    currency: 'ETH',
    cryptoPrice: '2.5000',
    cryptoSymbol: 'ETH',
    category: 'nft',
    listingType: 'AUCTION',
    seller: {
      id: 'seller_002',
      name: 'CryptoArtist',
      rating: 4.9,
      reputation: 88,
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
    images: [
      'https://images.unsplash.com/photo-1634973357973-f2ed2657db3c?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=300&fit=crop'
    ],
    inventory: 1,
    isNFT: true,
    tags: ['nft', 'art', 'digital', 'exclusive', 'utility'],
    createdAt: '2024-01-18T16:45:00Z',
    updatedAt: '2024-01-22T09:15:00Z',
    views: 892,
    favorites: 156,
    auctionEndTime: '2024-02-01T18:00:00Z',
    highestBid: '2.1000',
    bidCount: 12
  },
  {
    id: 'prod_003',
    title: 'Vintage Mechanical Keyboard',
    description: 'Restored 1980s mechanical keyboard with Cherry MX switches. Perfect for collectors and enthusiasts.',
    price: '450.00',
    currency: 'USD',
    cryptoPrice: '0.1875',
    cryptoSymbol: 'ETH',
    category: 'collectibles',
    listingType: 'FIXED_PRICE',
    seller: {
      id: 'seller_003',
      name: 'RetroTech Collector',
      rating: 4.6,
      reputation: 72,
      verified: true,
      daoApproved: false,
      walletAddress: '0x3456789012345678901234567890123456789012'
    },
    trust: {
      verified: true,
      escrowProtected: true,
      onChainCertified: false,
      safetyScore: 85
    },
    images: [
      'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&h=300&fit=crop'
    ],
    inventory: 1,
    isNFT: false,
    tags: ['vintage', 'keyboard', 'mechanical', 'collectible', 'restored'],
    createdAt: '2024-01-12T08:20:00Z',
    updatedAt: '2024-01-19T11:30:00Z',
    views: 543,
    favorites: 67,
    specifications: {
      brand: 'IBM',
      model: 'Model M',
      switches: 'Cherry MX Blue',
      year: '1987',
      condition: 'Restored'
    },
    shipping: {
      free: false,
      cost: '25.00',
      estimatedDays: '5-7',
      regions: ['US'],
      expedited: false
    }
  },
  {
    id: 'prod_004',
    title: 'Smart Home Security Camera',
    description: '4K wireless security camera with AI detection, night vision, and cloud storage integration.',
    price: '189.99',
    currency: 'USD',
    cryptoPrice: '0.0790',
    cryptoSymbol: 'ETH',
    category: 'electronics',
    listingType: 'AUCTION',
    seller: {
      id: 'seller_004',
      name: 'SmartHome Solutions',
      rating: 4.7,
      reputation: 91,
      verified: true,
      daoApproved: true,
      walletAddress: '0x4567890123456789012345678901234567890123'
    },
    trust: {
      verified: true,
      escrowProtected: true,
      onChainCertified: true,
      safetyScore: 93
    },
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=400&h=300&fit=crop'
    ],
    inventory: 8,
    isNFT: false,
    tags: ['security', 'camera', 'smart-home', '4k', 'wireless'],
    createdAt: '2024-01-20T13:15:00Z',
    updatedAt: '2024-01-23T16:45:00Z',
    views: 756,
    favorites: 94,
    auctionEndTime: '2024-01-30T20:00:00Z',
    highestBid: '0.0650',
    bidCount: 7,
    specifications: {
      resolution: '4K Ultra HD',
      nightVision: 'Yes',
      storage: 'Cloud + Local',
      connectivity: 'WiFi 6',
      aiFeatures: 'Person/Vehicle Detection'
    },
    shipping: {
      free: true,
      cost: '0',
      estimatedDays: '3-5',
      regions: ['US', 'CA'],
      expedited: true
    }
  },
  {
    id: 'prod_005',
    title: 'Handcrafted Leather Wallet',
    description: 'Premium handcrafted leather wallet with RFID protection and minimalist design.',
    price: '89.99',
    currency: 'USD',
    cryptoPrice: '0.0375',
    cryptoSymbol: 'ETH',
    category: 'fashion',
    listingType: 'FIXED_PRICE',
    seller: {
      id: 'seller_005',
      name: 'Artisan Leather Co',
      rating: 4.9,
      reputation: 78,
      verified: false,
      daoApproved: false,
      walletAddress: '0x5678901234567890123456789012345678901234'
    },
    trust: {
      verified: false,
      escrowProtected: true,
      onChainCertified: false,
      safetyScore: 76
    },
    images: [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&h=300&fit=crop'
    ],
    inventory: 25,
    isNFT: false,
    tags: ['leather', 'wallet', 'handcrafted', 'rfid', 'minimalist'],
    createdAt: '2024-01-10T09:30:00Z',
    updatedAt: '2024-01-21T12:00:00Z',
    views: 432,
    favorites: 38,
    specifications: {
      material: 'Full Grain Leather',
      rfidProtection: 'Yes',
      cardSlots: '8',
      dimensions: '4.3 x 3.1 x 0.4 inches',
      color: 'Brown'
    },
    shipping: {
      free: false,
      cost: '8.99',
      estimatedDays: '4-6',
      regions: ['US', 'CA', 'EU'],
      expedited: true
    }
  },
  {
    id: 'prod_006',
    title: 'Gaming Metaverse Land NFT',
    description: 'Prime virtual real estate in popular metaverse game. Includes building rights and revenue sharing.',
    price: '5.2',
    currency: 'ETH',
    cryptoPrice: '5.2000',
    cryptoSymbol: 'ETH',
    category: 'nft',
    listingType: 'AUCTION',
    seller: {
      id: 'seller_006',
      name: 'MetaLand Ventures',
      rating: 4.5,
      reputation: 84,
      verified: true,
      daoApproved: true,
      walletAddress: '0x6789012345678901234567890123456789012345'
    },
    trust: {
      verified: true,
      escrowProtected: true,
      onChainCertified: true,
      safetyScore: 91
    },
    images: [
      'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1614728263952-84ea256f9679?w=400&h=300&fit=crop'
    ],
    inventory: 1,
    isNFT: true,
    tags: ['nft', 'metaverse', 'land', 'gaming', 'virtual-real-estate'],
    createdAt: '2024-01-22T14:20:00Z',
    updatedAt: '2024-01-24T10:15:00Z',
    views: 1156,
    favorites: 203,
    auctionEndTime: '2024-02-05T15:30:00Z',
    highestBid: '4.8000',
    bidCount: 18,
    specifications: {
      size: '64x64 parcels',
      location: 'Central District',
      buildingRights: 'Commercial + Residential',
      revenueShare: '15%',
      game: 'CryptoWorlds'
    }
  },
  {
    id: 'prod_007',
    title: 'Professional Drone with 4K Camera',
    description: 'High-end professional drone with 4K camera, 45-minute flight time, and obstacle avoidance.',
    price: '1299.99',
    currency: 'USD',
    cryptoPrice: '0.5416',
    cryptoSymbol: 'ETH',
    category: 'electronics',
    listingType: 'FIXED_PRICE',
    seller: {
      id: 'seller_007',
      name: 'AerialTech Pro',
      rating: 4.8,
      reputation: 96,
      verified: true,
      daoApproved: true,
      walletAddress: '0x7890123456789012345678901234567890123456'
    },
    trust: {
      verified: true,
      escrowProtected: true,
      onChainCertified: true,
      safetyScore: 97
    },
    images: [
      'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=400&h=300&fit=crop'
    ],
    inventory: 5,
    isNFT: false,
    tags: ['drone', '4k', 'professional', 'camera', 'aerial'],
    createdAt: '2024-01-16T11:45:00Z',
    updatedAt: '2024-01-25T08:30:00Z',
    views: 987,
    favorites: 142,
    specifications: {
      flightTime: '45 minutes',
      cameraResolution: '4K Ultra HD',
      maxSpeed: '68 mph',
      range: '18.5 km',
      obstacleAvoidance: 'Omnidirectional'
    },
    shipping: {
      free: true,
      cost: '0',
      estimatedDays: '2-4',
      regions: ['US', 'CA', 'EU', 'AU'],
      expedited: true
    }
  },
  {
    id: 'prod_008',
    title: 'Rare Pokemon Trading Card',
    description: 'Mint condition Charizard holographic card from Base Set. PSA graded 10. Perfect for collectors.',
    price: '15000.00',
    currency: 'USD',
    cryptoPrice: '6.2500',
    cryptoSymbol: 'ETH',
    category: 'collectibles',
    listingType: 'AUCTION',
    seller: {
      id: 'seller_008',
      name: 'CardMaster Collectibles',
      rating: 4.9,
      reputation: 89,
      verified: true,
      daoApproved: false,
      walletAddress: '0x8901234567890123456789012345678901234567'
    },
    trust: {
      verified: true,
      escrowProtected: true,
      onChainCertified: false,
      safetyScore: 88
    },
    images: [
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1613963931023-5dc59437c8a6?w=400&h=300&fit=crop'
    ],
    inventory: 1,
    isNFT: false,
    tags: ['pokemon', 'trading-card', 'charizard', 'psa-10', 'collectible'],
    createdAt: '2024-01-08T15:00:00Z',
    updatedAt: '2024-01-26T13:20:00Z',
    views: 2341,
    favorites: 387,
    auctionEndTime: '2024-02-10T19:00:00Z',
    highestBid: '5.8000',
    bidCount: 24,
    specifications: {
      card: 'Charizard',
      set: 'Base Set',
      number: '4/102',
      condition: 'PSA 10',
      year: '1998'
    },
    shipping: {
      free: false,
      cost: '50.00',
      estimatedDays: '7-10',
      regions: ['US', 'CA', 'EU'],
      expedited: true
    }
  }
];

export const getProductsByCategory = (category: string): MockProduct[] => {
  return mockProducts.filter(product => product.category === category);
};

export const getProductsByListingType = (listingType: 'FIXED_PRICE' | 'AUCTION'): MockProduct[] => {
  return mockProducts.filter(product => product.listingType === listingType);
};

export const getFeaturedProducts = (): MockProduct[] => {
  return mockProducts.filter(product => product.seller.daoApproved && product.trust.safetyScore > 90);
};

export const getProductById = (id: string): MockProduct | undefined => {
  return mockProducts.find(product => product.id === id);
};

export const searchProducts = (query: string): MockProduct[] => {
  const lowercaseQuery = query.toLowerCase();
  return mockProducts.filter(product => 
    product.title.toLowerCase().includes(lowercaseQuery) ||
    product.description.toLowerCase().includes(lowercaseQuery) ||
    product.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  );
};

export default mockProducts;