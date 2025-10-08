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
    images: ['https://via.placeholder.com/400x300'],
    inventory: 15,
    isNFT: false,
    tags: ['electronics', 'audio', 'wireless', 'premium'],
    createdAt: '2023-06-15T10:30:00Z',
    updatedAt: '2023-06-15T10:30:00Z',
    views: 1247,
    favorites: 89,
    specifications: {
      'Brand': 'TechGear',
      'Model': 'TG-WH2000',
      'Battery Life': '30 hours',
      'Connectivity': 'Bluetooth 5.2'
    },
    shipping: {
      free: false,
      cost: '9.99',
      estimatedDays: '3-5 business days',
      regions: ['US', 'CA', 'EU'],
      expedited: true
    }
  },
  {
    id: 'prod_002',
    title: 'Rare Digital Art NFT Collection',
    description: 'Exclusive digital artwork from renowned crypto artist. Limited edition with utility benefits.',
    price: '6000.00',
    currency: 'USD',
    cryptoPrice: '2.5000',
    cryptoSymbol: 'ETH',
    category: 'nft',
    listingType: 'AUCTION',
    seller: {
      id: 'seller_002',
      name: 'CryptoArtist',
      rating: 4.9,
      reputation: 98,
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
    images: ['https://via.placeholder.com/400x300'],
    inventory: 1,
    isNFT: true,
    tags: ['nft', 'art', 'digital', 'exclusive'],
    createdAt: '2023-06-10T14:22:00Z',
    updatedAt: '2023-06-10T14:22:00Z',
    views: 892,
    favorites: 156,
    auctionEndTime: '2023-06-20T14:22:00Z',
    highestBid: '2.1000',
    bidCount: 12
  },
  {
    id: 'prod_003',
    title: 'Vintage Leather Jacket',
    description: 'Authentic vintage leather jacket from the 80s. Excellent condition with minor wear.',
    price: '149.99',
    currency: 'USD',
    cryptoPrice: '0.0623',
    cryptoSymbol: 'ETH',
    category: 'fashion',
    listingType: 'FIXED_PRICE',
    seller: {
      id: 'seller_003',
      name: 'VintageVibes',
      rating: 4.6,
      reputation: 87,
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
    images: ['https://via.placeholder.com/400x300'],
    inventory: 1,
    isNFT: false,
    tags: ['vintage', 'leather', 'jacket', '80s'],
    createdAt: '2023-06-05T09:15:00Z',
    updatedAt: '2023-06-05T09:15:00Z',
    views: 563,
    favorites: 42,
    specifications: {
      'Size': 'M',
      'Color': 'Black',
      'Material': 'Genuine Leather',
      'Condition': 'Excellent'
    },
    shipping: {
      free: true,
      cost: '0.00',
      estimatedDays: '5-7 business days',
      regions: ['US', 'CA'],
      expedited: false
    }
  },
  {
    id: 'prod_004',
    title: 'Limited Edition Sneakers',
    description: 'Rare limited edition sneakers from popular brand. Box included, never worn.',
    price: '899.99',
    currency: 'USD',
    cryptoPrice: '0.3738',
    cryptoSymbol: 'ETH',
    category: 'fashion',
    listingType: 'AUCTION',
    seller: {
      id: 'seller_004',
      name: 'SneakerHead',
      rating: 4.9,
      reputation: 96,
      verified: true,
      daoApproved: true,
      walletAddress: '0x4567890123456789012345678901234567890123'
    },
    trust: {
      verified: true,
      escrowProtected: true,
      onChainCertified: true,
      safetyScore: 97
    },
    images: ['https://via.placeholder.com/400x300'],
    inventory: 1,
    isNFT: false,
    tags: ['sneakers', 'limited', 'edition', 'rare'],
    createdAt: '2023-06-12T16:45:00Z',
    updatedAt: '2023-06-12T16:45:00Z',
    views: 2105,
    favorites: 312,
    auctionEndTime: '2023-06-19T16:45:00Z',
    highestBid: '0.3200',
    bidCount: 28,
    shipping: {
      free: true,
      cost: '0.00',
      estimatedDays: '2-3 business days',
      regions: ['US', 'CA', 'EU', 'UK'],
      expedited: true
    }
  },
  {
    id: 'prod_005',
    title: 'Blockchain Development Course',
    description: 'Comprehensive course on blockchain development with hands-on projects and certification.',
    price: '199.99',
    currency: 'USD',
    cryptoPrice: '0.0831',
    cryptoSymbol: 'ETH',
    category: 'education',
    listingType: 'FIXED_PRICE',
    seller: {
      id: 'seller_005',
      name: 'CryptoAcademy',
      rating: 4.7,
      reputation: 92,
      verified: true,
      daoApproved: true,
      walletAddress: '0x5678901234567890123456789012345678901234'
    },
    trust: {
      verified: true,
      escrowProtected: false,
      onChainCertified: true,
      safetyScore: 90
    },
    images: ['https://via.placeholder.com/400x300'],
    inventory: 1000,
    isNFT: false,
    tags: ['blockchain', 'development', 'course', 'education'],
    createdAt: '2023-05-20T11:20:00Z',
    updatedAt: '2023-05-20T11:20:00Z',
    views: 3421,
    favorites: 876
  },
  {
    id: 'prod_006',
    title: 'Crypto Trading Bot Software',
    description: 'Advanced trading bot with AI-powered strategies for cryptocurrency markets.',
    price: '499.99',
    currency: 'USD',
    cryptoPrice: '0.2076',
    cryptoSymbol: 'ETH',
    category: 'software',
    listingType: 'FIXED_PRICE',
    seller: {
      id: 'seller_006',
      name: 'AlgoTraders',
      rating: 4.5,
      reputation: 88,
      verified: true,
      daoApproved: false,
      walletAddress: '0x6789012345678901234567890123456789012345'
    },
    trust: {
      verified: true,
      escrowProtected: true,
      onChainCertified: false,
      safetyScore: 82
    },
    images: ['https://via.placeholder.com/400x300'],
    inventory: 50,
    isNFT: false,
    tags: ['crypto', 'trading', 'bot', 'software', 'AI'],
    createdAt: '2023-06-01T13:10:00Z',
    updatedAt: '2023-06-01T13:10:00Z',
    views: 1789,
    favorites: 234,
    specifications: {
      'Platform': 'Windows, Mac, Linux',
      'License': '1-year subscription',
      'Support': '24/7 email support'
    }
  },
  {
    id: 'prod_007',
    title: 'Digital Collectible Pack',
    description: 'Pack of 5 exclusive digital collectibles from popular NFT series.',
    price: '150.00',
    currency: 'USD',
    cryptoPrice: '0.0623',
    cryptoSymbol: 'ETH',
    category: 'collectibles',
    listingType: 'FIXED_PRICE',
    seller: {
      id: 'seller_007',
      name: 'DigitalCollectors',
      rating: 4.8,
      reputation: 94,
      verified: true,
      daoApproved: true,
      walletAddress: '0x7890123456789012345678901234567890123456'
    },
    trust: {
      verified: true,
      escrowProtected: true,
      onChainCertified: true,
      safetyScore: 95
    },
    images: ['https://via.placeholder.com/400x300'],
    inventory: 25,
    isNFT: true,
    tags: ['digital', 'collectibles', 'NFT', 'pack'],
    createdAt: '2023-06-08T15:30:00Z',
    updatedAt: '2023-06-08T15:30:00Z',
    views: 967,
    favorites: 143
  },
  {
    id: 'prod_008',
    title: 'Rare Vintage Watch',
    description: 'Authentic vintage watch from luxury brand. Comes with original box and papers.',
    price: '2500.00',
    currency: 'USD',
    cryptoPrice: '1.0382',
    cryptoSymbol: 'ETH',
    category: 'collectibles',
    listingType: 'AUCTION',
    seller: {
      id: 'seller_008',
      name: 'LuxuryTime',
      rating: 4.9,
      reputation: 97,
      verified: true,
      daoApproved: true,
      walletAddress: '0x8901234567890123456789012345678901234567'
    },
    trust: {
      verified: true,
      escrowProtected: true,
      onChainCertified: true,
      safetyScore: 98
    },
    images: ['https://via.placeholder.com/400x300'],
    inventory: 1,
    isNFT: false,
    tags: ['vintage', 'watch', 'luxury', 'rare'],
    createdAt: '2023-06-03T10:00:00Z',
    updatedAt: '2023-06-03T10:00:00Z',
    views: 3245,
    favorites: 567,
    auctionEndTime: '2023-06-22T10:00:00Z',
    highestBid: '0.9500',
    bidCount: 42,
    specifications: {
      'Brand': 'LuxuryBrand',
      'Model': 'Vintage-1950',
      'Year': '1950',
      'Condition': 'Excellent'
    },
    shipping: {
      free: false,
      cost: '49.99',
      estimatedDays: '2-3 business days',
      regions: ['US', 'CA', 'EU', 'UK'],
      expedited: true
    }
  }
];