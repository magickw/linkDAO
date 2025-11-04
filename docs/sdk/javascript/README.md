# Web3 Marketplace JavaScript/TypeScript SDK

The official JavaScript/TypeScript SDK for the Web3 Marketplace platform.

## Installation

```bash
npm install @web3marketplace/sdk
# or
yarn add @web3marketplace/sdk
```

## Quick Start

```typescript
import { Web3MarketplaceSDK } from '@web3marketplace/sdk';

// Initialize SDK
const sdk = new Web3MarketplaceSDK({
  apiUrl: 'https://api.linkdao.io',
  network: 'mainnet', // 'mainnet', 'polygon', 'arbitrum', 'testnet'
  apiKey: 'your-api-key' // Optional for public endpoints
});

// Connect wallet
await sdk.connect(window.ethereum);

// Start using the SDK
const products = await sdk.products.list();
```

## Configuration

### Basic Configuration

```typescript
interface SDKConfig {
  apiUrl: string;
  network: 'mainnet' | 'polygon' | 'arbitrum' | 'testnet';
  apiKey?: string;
  rpcUrl?: string;
  gasPrice?: 'slow' | 'standard' | 'fast' | number;
  cache?: CacheConfig;
  logging?: LoggingConfig;
  retryConfig?: RetryConfig;
}

const sdk = new Web3MarketplaceSDK({
  apiUrl: 'https://api.linkdao.io',
  network: 'mainnet',
  apiKey: process.env.WEB3_MARKETPLACE_API_KEY,
  
  // Custom RPC endpoint
  rpcUrl: 'https://mainnet.infura.io/v3/your-project-id',
  
  // Gas price strategy
  gasPrice: 'fast', // or specific gwei: 50
  
  // Caching configuration
  cache: {
    enabled: true,
    ttl: 300000, // 5 minutes
    maxSize: 1000
  },
  
  // Logging configuration
  logging: {
    level: 'info',
    destination: 'console'
  },
  
  // Retry configuration
  retryConfig: {
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true
  }
});
```

### Environment Variables

```bash
# .env file
WEB3_MARKETPLACE_API_URL=https://api.linkdao.io
WEB3_MARKETPLACE_API_KEY=your-api-key
WEB3_MARKETPLACE_NETWORK=mainnet
WEB3_MARKETPLACE_RPC_URL=https://mainnet.infura.io/v3/your-project-id
```

## Authentication

### Wallet Connection

```typescript
// MetaMask
if (window.ethereum) {
  await sdk.connect(window.ethereum);
}

// WalletConnect
import WalletConnect from '@walletconnect/client';
const connector = new WalletConnect({
  bridge: 'https://bridge.walletconnect.org',
  qrcodeModal: QRCodeModal
});
await sdk.connect(connector);

// Coinbase Wallet
import CoinbaseWalletSDK from '@coinbase/wallet-sdk';
const coinbaseWallet = new CoinbaseWalletSDK({
  appName: 'Web3 Marketplace',
  appLogoUrl: 'https://example.com/logo.png'
});
const provider = coinbaseWallet.makeWeb3Provider();
await sdk.connect(provider);

// Private Key (server-side only)
await sdk.connect({
  privateKey: process.env.PRIVATE_KEY
});
```

### Authentication Events

```typescript
// Listen for authentication events
sdk.on('connected', (address) => {
  console.log('Wallet connected:', address);
});

sdk.on('disconnected', () => {
  console.log('Wallet disconnected');
});

sdk.on('accountChanged', (newAddress) => {
  console.log('Account changed to:', newAddress);
});

sdk.on('networkChanged', (networkId) => {
  console.log('Network changed to:', networkId);
});
```

## Products API

### List Products

```typescript
interface ProductFilter {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  currency?: string;
  seller?: string;
  verified?: boolean;
  nftOnly?: boolean;
  location?: string;
  condition?: 'new' | 'used' | 'refurbished';
}

interface ProductSort {
  field: 'price' | 'created_at' | 'popularity' | 'rating';
  direction: 'asc' | 'desc';
}

interface Pagination {
  limit?: number;
  offset?: number;
}

// List products with filters
const products = await sdk.products.list({
  search: 'digital art',
  category: 'nft',
  minPrice: 0.01,
  maxPrice: 1.0,
  currency: 'ETH',
  verified: true
}, {
  field: 'price',
  direction: 'asc'
}, {
  limit: 20,
  offset: 0
});

console.log('Products:', products.data);
console.log('Total:', products.pagination.total);
```

### Create Product

```typescript
interface CreateProductInput {
  title: string;
  description: string;
  price: {
    amount: string;
    currency: string;
  };
  category: string;
  images: string[];
  metadata?: Record<string, any>;
  inventory?: number;
  shipping?: {
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    freeShipping: boolean;
    shippingCost?: string;
  };
  nft?: {
    contractAddress: string;
    tokenId: string;
    metadata: NFTMetadata;
  };
}

// Create a new product
const product = await sdk.products.create({
  title: 'Awesome Digital Art NFT',
  description: 'Unique digital artwork with blockchain authenticity',
  price: {
    amount: '0.1',
    currency: 'ETH'
  },
  category: 'digital-art',
  images: [
    'ipfs://QmExampleHash1',
    'ipfs://QmExampleHash2'
  ],
  metadata: {
    artist: 'CryptoArtist',
    edition: 'Limited Edition',
    rarity: 'Legendary'
  },
  nft: {
    contractAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
    tokenId: '42',
    metadata: {
      name: 'Awesome Digital Art NFT #42',
      description: 'Unique digital artwork',
      image: 'ipfs://QmExampleHash1',
      attributes: [
        { trait_type: 'Rarity', value: 'Legendary' },
        { trait_type: 'Artist', value: 'CryptoArtist' }
      ]
    }
  }
});

console.log('Product created:', product);
```

### Update Product

```typescript
// Update product
const updatedProduct = await sdk.products.update('prod_123456789', {
  price: {
    amount: '0.15',
    currency: 'ETH'
  },
  inventory: 5
});
```

### Get Product Details

```typescript
// Get single product
const product = await sdk.products.get('prod_123456789');

// Get product with related data
const productWithReviews = await sdk.products.get('prod_123456789', {
  include: ['reviews', 'seller', 'similar_products']
});
```

### Delete Product

```typescript
// Delete product
await sdk.products.delete('prod_123456789');
```

## Orders API

### Create Order

```typescript
interface CreateOrderInput {
  productId: string;
  quantity: number;
  paymentMethod: 'crypto' | 'fiat';
  currency: string;
  shippingAddress?: ShippingAddress;
  billingAddress?: BillingAddress;
  notes?: string;
}

// Create order with crypto payment
const order = await sdk.orders.create({
  productId: 'prod_123456789',
  quantity: 1,
  paymentMethod: 'crypto',
  currency: 'ETH',
  shippingAddress: {
    street: '123 Blockchain Ave',
    city: 'Crypto City',
    state: 'CA',
    zipCode: '94105',
    country: 'US',
    name: 'John Doe',
    phone: '+1-555-0123'
  }
});

console.log('Order created:', order);
console.log('Escrow contract:', order.blockchain.escrowContract);
```

### Get Order Status

```typescript
// Get order details
const order = await sdk.orders.get('order_123456789');

console.log('Order status:', order.status);
console.log('Tracking number:', order.shipping.trackingNumber);
console.log('Estimated delivery:', order.shipping.estimatedDelivery);
```

### Confirm Delivery

```typescript
// Buyer confirms delivery (releases payment from escrow)
await sdk.orders.confirmDelivery('order_123456789');
```

### Initiate Dispute

```typescript
// Initiate dispute
const dispute = await sdk.orders.initiateDispute('order_123456789', {
  reason: 'Product not as described',
  description: 'The item received does not match the description provided.',
  evidence: [
    'ipfs://QmEvidenceHash1',
    'ipfs://QmEvidenceHash2'
  ]
});

console.log('Dispute initiated:', dispute);
```

### Order History

```typescript
// Get user's order history
const orders = await sdk.orders.list({
  status: 'completed',
  dateFrom: '2024-01-01',
  dateTo: '2024-12-31'
});

// Get orders as seller
const sellerOrders = await sdk.orders.list({
  role: 'seller',
  status: 'pending'
});
```

## User Management

### Get Profile

```typescript
// Get current user profile
const profile = await sdk.users.getProfile();

// Get another user's public profile
const publicProfile = await sdk.users.getProfile('user_123456789');
```

### Update Profile

```typescript
// Update user profile
const updatedProfile = await sdk.users.updateProfile({
  displayName: 'Crypto Trader Pro',
  bio: 'NFT enthusiast and digital art collector',
  avatar: 'ipfs://QmAvatarHash',
  website: 'https://myportfolio.com',
  social: {
    twitter: '@cryptotrader',
    discord: 'cryptotrader#1234'
  },
  preferences: {
    currency: 'ETH',
    language: 'en',
    notifications: {
      email: true,
      push: true,
      orderUpdates: true,
      priceAlerts: true
    }
  }
});
```

### Get Reputation

```typescript
// Get user reputation
const reputation = await sdk.users.getReputation('user_123456789');

console.log('Reputation score:', reputation.score);
console.log('Total reviews:', reputation.reviewCount);
console.log('Reputation tier:', reputation.tier);
```

### Follow/Unfollow Users

```typescript
// Follow a user
await sdk.users.follow('user_123456789');

// Unfollow a user
await sdk.users.unfollow('user_123456789');

// Get followers
const followers = await sdk.users.getFollowers('user_123456789');

// Get following
const following = await sdk.users.getFollowing('user_123456789');
```

## Reviews API

### Submit Review

```typescript
interface CreateReviewInput {
  orderId: string;
  revieweeId: string;
  rating: number; // 1-5
  comment: string;
  images?: string[];
  anonymous?: boolean;
}

// Submit review after order completion
const review = await sdk.reviews.create({
  orderId: 'order_123456789',
  revieweeId: 'seller_123456789',
  rating: 5,
  comment: 'Excellent product and fast delivery! Highly recommended.',
  images: ['ipfs://QmReviewImageHash'],
  anonymous: false
});

console.log('Review submitted:', review);
```

### Get Reviews

```typescript
// Get reviews for a user
const userReviews = await sdk.reviews.getForUser('user_123456789', {
  role: 'seller', // 'buyer' or 'seller'
  limit: 10,
  offset: 0
});

// Get reviews for a product
const productReviews = await sdk.reviews.getForProduct('prod_123456789');

// Get review details
const review = await sdk.reviews.get('review_123456789');
```

## NFT Integration

### Mint NFT

```typescript
interface MintNFTInput {
  to: string;
  metadata: {
    name: string;
    description: string;
    image: string;
    attributes?: Array<{
      trait_type: string;
      value: string | number;
    }>;
  };
  royalty?: {
    recipient: string;
    percentage: number; // 0-10 (10%)
  };
}

// Mint new NFT
const nft = await sdk.nfts.mint({
  to: '0x1234567890abcdef1234567890abcdef12345678',
  metadata: {
    name: 'Awesome NFT #1',
    description: 'Limited edition digital artwork',
    image: 'ipfs://QmImageHash',
    attributes: [
      { trait_type: 'Rarity', value: 'Legendary' },
      { trait_type: 'Edition', value: 1 }
    ]
  },
  royalty: {
    recipient: '0x1234567890abcdef1234567890abcdef12345678',
    percentage: 5 // 5% royalty
  }
});

console.log('NFT minted:', nft);
```

### List NFT for Sale

```typescript
// List NFT on marketplace
await sdk.nfts.listForSale({
  contractAddress: nft.contractAddress,
  tokenId: nft.tokenId,
  price: {
    amount: '1.0',
    currency: 'ETH'
  },
  duration: 7 * 24 * 60 * 60, // 7 days in seconds
  allowOffers: true
});
```

### Buy NFT

```typescript
// Purchase NFT
const purchase = await sdk.nfts.buy({
  contractAddress: '0xNFTContract',
  tokenId: '42',
  price: {
    amount: '1.0',
    currency: 'ETH'
  }
});

console.log('NFT purchased:', purchase);
```

### Get NFT Details

```typescript
// Get NFT metadata and ownership
const nftDetails = await sdk.nfts.get({
  contractAddress: '0xNFTContract',
  tokenId: '42'
});

// Get user's NFT collection
const collection = await sdk.nfts.getCollection('user_123456789');
```

## Payment Processing

### Supported Payment Methods

```typescript
// Get supported payment methods
const paymentMethods = await sdk.payments.getSupportedMethods();

console.log('Crypto currencies:', paymentMethods.crypto);
console.log('Fiat methods:', paymentMethods.fiat);
```

### Estimate Fees

```typescript
// Estimate transaction fees
const feeEstimate = await sdk.payments.estimateFees({
  amount: '0.1',
  currency: 'ETH',
  paymentMethod: 'crypto'
});

console.log('Gas fee:', feeEstimate.gasFee);
console.log('Platform fee:', feeEstimate.platformFee);
console.log('Total cost:', feeEstimate.totalCost);
```

### Process Payment

```typescript
// Process crypto payment
const payment = await sdk.payments.process({
  orderId: 'order_123456789',
  paymentMethod: 'crypto',
  currency: 'ETH',
  amount: '0.1'
});

// Process fiat payment
const fiatPayment = await sdk.payments.process({
  orderId: 'order_123456789',
  paymentMethod: 'fiat',
  currency: 'USD',
  amount: '250.00',
  paymentDetails: {
    cardToken: 'tok_1234567890',
    billingAddress: {
      street: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94105',
      country: 'US'
    }
  }
});
```

## Real-time Updates

### WebSocket Events

```typescript
// Subscribe to order updates
sdk.orders.subscribe('order_123456789', (update) => {
  console.log('Order update:', update);
  
  switch (update.type) {
    case 'status_changed':
      console.log('New status:', update.data.status);
      break;
    case 'shipped':
      console.log('Tracking number:', update.data.trackingNumber);
      break;
    case 'delivered':
      console.log('Delivery confirmed');
      break;
  }
});

// Subscribe to user notifications
sdk.notifications.subscribe((notification) => {
  console.log('New notification:', notification);
  
  // Show notification to user
  showNotification(notification.title, notification.message);
});

// Subscribe to price updates
sdk.products.subscribeToPriceUpdates('prod_123456789', (priceUpdate) => {
  console.log('Price changed:', priceUpdate);
  updateProductPrice(priceUpdate.newPrice);
});

// Subscribe to marketplace events
sdk.marketplace.subscribe('new_listing', (listing) => {
  console.log('New product listed:', listing);
});
```

### Unsubscribe from Events

```typescript
// Unsubscribe from specific order
sdk.orders.unsubscribe('order_123456789');

// Unsubscribe from all notifications
sdk.notifications.unsubscribeAll();

// Unsubscribe from price updates
sdk.products.unsubscribeFromPriceUpdates('prod_123456789');
```

## Error Handling

### Error Types

```typescript
import { 
  ValidationError, 
  AuthenticationError, 
  AuthorizationError,
  BlockchainError,
  RateLimitError,
  NetworkError 
} from '@web3marketplace/sdk';

try {
  await sdk.products.create(productData);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.details);
    // Show validation errors to user
    showValidationErrors(error.details);
    
  } else if (error instanceof AuthenticationError) {
    console.error('Authentication required');
    // Redirect to login
    redirectToLogin();
    
  } else if (error instanceof AuthorizationError) {
    console.error('Insufficient permissions');
    // Show permission error
    showPermissionError();
    
  } else if (error instanceof BlockchainError) {
    console.error('Blockchain transaction failed:', error.transactionHash);
    // Show blockchain error with transaction link
    showBlockchainError(error);
    
  } else if (error instanceof RateLimitError) {
    console.error('Rate limit exceeded, retry after:', error.retryAfter);
    // Show rate limit message
    showRateLimitError(error.retryAfter);
    
  } else if (error instanceof NetworkError) {
    console.error('Network error:', error.message);
    // Show network error
    showNetworkError();
    
  } else {
    console.error('Unknown error:', error);
    // Show generic error
    showGenericError();
  }
}
```

### Retry Logic

```typescript
// Built-in retry for transient failures
const sdk = new Web3MarketplaceSDK({
  apiUrl: 'https://api.linkdao.io',
  retryConfig: {
    maxRetries: 3,
    retryDelay: 1000, // 1 second
    exponentialBackoff: true,
    retryCondition: (error) => {
      // Retry on network errors and 5xx responses
      return error instanceof NetworkError || 
             (error.status >= 500 && error.status < 600);
    }
  }
});

// Manual retry with custom logic
async function createProductWithRetry(productData, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await sdk.products.create(productData);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // Wait before retry (exponential backoff)
      const delay = 1000 * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

## Testing

### Mock Mode

```typescript
// Enable mock mode for testing
const testSDK = new Web3MarketplaceSDK({
  apiUrl: 'https://api.linkdao.io',
  mockMode: true // Returns mock data instead of real API calls
});

// All SDK methods return predictable mock data
const products = await testSDK.products.list(); // Returns mock products
const order = await testSDK.orders.create(orderData); // Returns mock order
```

### Test Utilities

```typescript
import { 
  createTestSDK, 
  mockWallet, 
  mockProduct, 
  mockOrder 
} from '@web3marketplace/sdk/testing';

// Create SDK instance for testing
const testSDK = createTestSDK({
  network: 'testnet',
  mockData: {
    products: [mockProduct(), mockProduct()],
    orders: [mockOrder()]
  }
});

// Mock wallet for testing
const wallet = mockWallet({
  address: '0x1234567890abcdef1234567890abcdef12345678',
  balance: '10.0',
  network: 'testnet'
});

await testSDK.connect(wallet);

// Use in tests
describe('Product Management', () => {
  it('should create product', async () => {
    const product = await testSDK.products.create(mockProduct());
    expect(product.id).toBeDefined();
    expect(product.title).toBe('Mock Product');
  });
});
```

## Advanced Usage

### Custom Contract Interactions

```typescript
// Access underlying contract instances
const escrowContract = sdk.contracts.escrow;
const reputationContract = sdk.contracts.reputation;
const nftContract = sdk.contracts.nftMarketplace;

// Direct contract calls
const orderId = await escrowContract.createOrder(
  sellerAddress,
  amount,
  tokenAddress,
  deadline,
  productHash,
  { value: amount }
);

// Listen to contract events
escrowContract.on('OrderCreated', (orderId, buyer, seller, amount) => {
  console.log('Order created on-chain:', { orderId, buyer, seller, amount });
});
```

### Batch Operations

```typescript
// Batch multiple operations
const batch = sdk.batch()
  .products.create(product1)
  .products.create(product2)
  .orders.create(order1)
  .reviews.create(review1);

// Execute all operations
const results = await batch.execute();

console.log('Batch results:', results);
```

### Plugin System

```typescript
// Custom analytics plugin
const analyticsPlugin = {
  name: 'analytics',
  install(sdk) {
    sdk.analytics = {
      track: (event, data) => {
        // Send to analytics service
        analytics.track(event, data);
      }
    };
    
    // Hook into SDK events
    sdk.on('product.created', (product) => {
      sdk.analytics.track('product_created', { productId: product.id });
    });
  }
};

// Install plugin
sdk.use(analyticsPlugin);

// Use plugin
sdk.analytics.track('page_view', { page: 'products' });
```

### Custom Middleware

```typescript
// Request middleware
sdk.addRequestMiddleware((config) => {
  // Add custom headers
  config.headers['X-Client-Version'] = '1.0.0';
  
  // Log requests
  console.log('API Request:', config.method, config.url);
  
  return config;
});

// Response middleware
sdk.addResponseMiddleware((response) => {
  // Log responses
  console.log('API Response:', response.status, response.data);
  
  return response;
});
```

## TypeScript Support

### Type Definitions

```typescript
import { 
  Product, 
  Order, 
  User, 
  Review, 
  NFT,
  PaymentMethod,
  OrderStatus 
} from '@web3marketplace/sdk/types';

// Strongly typed product creation
const product: Product = await sdk.products.create({
  title: 'My Product',
  description: 'Product description',
  price: { amount: '0.1', currency: 'ETH' },
  category: 'digital-art',
  images: ['ipfs://hash']
});

// Type-safe order handling
const order: Order = await sdk.orders.get('order_123');
if (order.status === OrderStatus.DELIVERED) {
  await sdk.orders.confirmDelivery(order.id);
}
```

### Generic Types

```typescript
// Custom product type
interface CustomProduct extends Product {
  customField: string;
}

// Type-safe SDK usage
const customSDK = sdk as Web3MarketplaceSDK<CustomProduct>;
const product: CustomProduct = await customSDK.products.get('prod_123');
```

## Performance Optimization

### Caching

```typescript
// Configure caching
const sdk = new Web3MarketplaceSDK({
  apiUrl: 'https://api.linkdao.io',
  cache: {
    enabled: true,
    ttl: 300000, // 5 minutes
    maxSize: 1000,
    strategy: 'lru' // 'lru' or 'fifo'
  }
});

// Manual cache control
await sdk.cache.set('products:featured', featuredProducts, 600000); // 10 minutes
const cached = await sdk.cache.get('products:featured');
await sdk.cache.delete('products:featured');
await sdk.cache.clear();
```

### Request Optimization

```typescript
// Batch requests
const [products, orders, profile] = await Promise.all([
  sdk.products.list(),
  sdk.orders.list(),
  sdk.users.getProfile()
]);

// Pagination optimization
const allProducts = [];
let offset = 0;
const limit = 100;

while (true) {
  const batch = await sdk.products.list({}, {}, { limit, offset });
  allProducts.push(...batch.data);
  
  if (batch.data.length < limit) break;
  offset += limit;
}
```

## Migration Guide

### From v0.x to v1.x

```typescript
// v0.x (deprecated)
const sdk = new Web3MarketplaceSDK('https://api.linkdao.io');
await sdk.authenticate(privateKey);
const products = await sdk.getProducts();

// v1.x (current)
const sdk = new Web3MarketplaceSDK({
  apiUrl: 'https://api.linkdao.io'
});
await sdk.connect({ privateKey });
const products = await sdk.products.list();
```

## Support and Resources

- **Documentation**: [Full SDK Documentation](https://docs.linkdao.io/sdk/javascript)
- **API Reference**: [API Documentation](https://docs.linkdao.io/api)
- **Examples**: [GitHub Examples Repository](https://github.com/web3marketplace/sdk-examples)
- **TypeScript Types**: [Type Definitions](https://github.com/web3marketplace/sdk/tree/main/types)
- **Issues**: [GitHub Issues](https://github.com/web3marketplace/sdk/issues)
- **Discord**: [Developer Community](https://discord.gg/web3marketplace-dev)
- **Email**: sdk-support@linkdao.io