/**
 * Mock product data for testing the product detail page
 */

export const mockProducts = [
  {
    id: '1',
    title: 'Premium Wireless Headphones',
    description: 'High-quality wireless headphones with noise cancellation',
    longDescription: 'Experience premium sound quality with these wireless headphones featuring active noise cancellation, 30-hour battery life, and premium comfort design. Perfect for music lovers and professionals who need to focus in noisy environments.',
    price: {
      crypto: '0.1245',
      cryptoSymbol: 'ETH',
      fiat: '298.80',
      fiatSymbol: 'USD'
    },
    seller: {
      id: '0x1234567890123456789012345678901234567890',
      name: 'TechStore Pro',
      avatar: 'https://placehold.co/400x400/667eea/ffffff?text=TechStore',
      verified: true,
      reputation: 4.8,
      daoApproved: true,
      totalSales: 1247,
      memberSince: '2023-01-15',
      responseTime: '< 2 hours'
    },
    trust: {
      verified: true,
      escrowProtected: true,
      onChainCertified: true
    },
    specifications: {
      'Brand': 'AudioTech',
      'Model': 'AT-WH1000',
      'Battery Life': '30 hours',
      'Connectivity': 'Bluetooth 5.0',
      'Weight': '250g',
      'Noise Cancellation': 'Active',
      'Frequency Response': '20Hz - 20kHz'
    },
    category: 'Electronics',
    tags: ['audio', 'wireless', 'premium', 'noise-cancellation'],
    inventory: 15,
    shipping: {
      freeShipping: true,
      estimatedDays: '3-5 business days'
    },
    reviews: {
      average: 4.8,
      count: 124
    },
    media: [
      {
        type: 'image' as const,
        url: 'https://placehold.co/600x600/667eea/ffffff?text=Headphones+Front',
        thumbnail: 'https://placehold.co/150x150/667eea/ffffff?text=Headphones+Front',
        alt: 'Premium Wireless Headphones - Front View'
      },
      {
        type: 'image' as const,
        url: 'https://placehold.co/600x600/667eea/ffffff?text=Headphones+Side',
        thumbnail: 'https://placehold.co/150x150/667eea/ffffff?text=Headphones+Side',
        alt: 'Premium Wireless Headphones - Side View'
      },
      {
        type: 'image' as const,
        url: 'https://placehold.co/600x600/667eea/ffffff?text=Headphones+Charging',
        thumbnail: 'https://placehold.co/150x150/667eea/ffffff?text=Headphones+Charging',
        alt: 'Premium Wireless Headphones - Charging Case'
      }
    ]
  },
  {
    id: '2',
    title: 'Smart Fitness Watch',
    description: 'Advanced fitness tracking with health monitoring',
    longDescription: 'Stay connected and track your fitness goals with this advanced smartwatch. Features heart rate monitoring, sleep tracking, GPS navigation, and water resistance up to 50 meters. Syncs seamlessly with your smartphone to keep you connected on the go.',
    price: {
      crypto: '0.0895',
      cryptoSymbol: 'ETH',
      fiat: '214.80',
      fiatSymbol: 'USD'
    },
    seller: {
      id: '0xabcdef1234567890abcdef1234567890abcdef12',
      name: 'FitnessGadgets Inc',
      avatar: 'https://placehold.co/400x400/4ade80/ffffff?text=FitnessGadgets',
      verified: true,
      reputation: 4.6,
      daoApproved: false,
      totalSales: 892,
      memberSince: '2022-11-03',
      responseTime: '< 4 hours'
    },
    trust: {
      verified: true,
      escrowProtected: true,
      onChainCertified: false
    },
    specifications: {
      'Brand': 'FitTech',
      'Model': 'FT-W200',
      'Display': '1.4" AMOLED',
      'Battery Life': '7 days',
      'Water Resistance': '5ATM',
      'Connectivity': 'Bluetooth 5.2',
      'Sensors': 'Heart Rate, GPS, Accelerometer, Gyroscope'
    },
    category: 'Wearables',
    tags: ['fitness', 'health', 'smartwatch', 'wearable'],
    inventory: 23,
    shipping: {
      freeShipping: false,
      estimatedDays: '5-7 business days',
      cost: '9.99'
    },
    reviews: {
      average: 4.6,
      count: 89
    },
    media: [
      {
        type: 'image' as const,
        url: 'https://placehold.co/600x600/4ade80/ffffff?text=Smart+Watch+Front',
        thumbnail: 'https://placehold.co/150x150/4ade80/ffffff?text=Smart+Watch+Front',
        alt: 'Smart Fitness Watch - Front View'
      },
      {
        type: 'image' as const,
        url: 'https://placehold.co/600x600/4ade80/ffffff?text=Smart+Watch+Side',
        thumbnail: 'https://placehold.co/150x150/4ade80/ffffff?text=Smart+Watch+Side',
        alt: 'Smart Fitness Watch - Side View'
      }
    ]
  }
];