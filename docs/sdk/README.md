# Web3 Marketplace SDK

Official SDKs for integrating with the Web3 Marketplace platform.

## 🚀 Available SDKs

| Language | Package | Version | Documentation |
|----------|---------|---------|---------------|
| JavaScript/TypeScript | `@web3marketplace/sdk` | v1.0.0 | [Docs](./javascript/README.md) |
| Python | `web3marketplace-sdk` | v1.0.0 | [Docs](./python/README.md) |
| Go | `github.com/web3marketplace/go-sdk` | v1.0.0 | [Docs](./go/README.md) |
| Rust | `web3marketplace` | v1.0.0 | [Docs](./rust/README.md) |

## 📦 Quick Start

### JavaScript/TypeScript

```bash
npm install @web3marketplace/sdk
```

```javascript
import { Web3MarketplaceSDK } from '@web3marketplace/sdk';

const sdk = new Web3MarketplaceSDK({
  apiUrl: 'https://api.web3marketplace.com',
  network: 'mainnet', // or 'polygon', 'arbitrum'
  apiKey: 'your-api-key'
});

// Initialize with wallet
await sdk.connect(walletProvider);

// Create a product
const product = await sdk.products.create({
  title: 'Amazing NFT',
  price: { amount: '0.1', currency: 'ETH' },
  category: 'digital-art'
});

// Place an order
const order = await sdk.orders.create({
  productId: product.id,
  quantity: 1
});
```

### Python

```bash
pip install web3marketplace-sdk
```

```python
from web3marketplace import Web3MarketplaceSDK

sdk = Web3MarketplaceSDK(
    api_url='https://api.web3marketplace.com',
    network='mainnet',
    api_key='your-api-key'
)

# Connect wallet
sdk.connect(private_key='your-private-key')

# Create product
product = sdk.products.create({
    'title': 'Amazing NFT',
    'price': {'amount': '0.1', 'currency': 'ETH'},
    'category': 'digital-art'
})

# Place order
order = sdk.orders.create({
    'product_id': product['id'],
    'quantity': 1
})
```

## 🔧 Core Features

### Product Management

```javascript
// List products with filters
const products = await sdk.products.list({
  category: 'digital-art',
  minPrice: 0.01,
  maxPrice: 1.0,
  sort: 'price_asc'
});

// Get product details
const product = await sdk.products.get('prod_123');

// Update product
await sdk.products.update('prod_123', {
  price: { amount: '0.15', currency: 'ETH' }
});

// Delete product
await sdk.products.delete('prod_123');
```

### Order Management

```javascript
// Create order with escrow
const order = await sdk.orders.create({
  productId: 'prod_123',
  quantity: 1,
  paymentMethod: 'crypto',
  currency: 'ETH'
});

// Get order status
const orderStatus = await sdk.orders.getStatus(order.id);

// Confirm delivery
await sdk.orders.confirmDelivery(order.id);

// Initiate dispute
await sdk.orders.initiateDispute(order.id, {
  reason: 'Product not as described',
  evidence: ['ipfs://evidence1', 'ipfs://evidence2']
});
```

### User Management

```javascript
// Get user profile
const profile = await sdk.users.getProfile();

// Update profile
await sdk.users.updateProfile({
  displayName: 'Crypto Trader',
  bio: 'NFT enthusiast and collector'
});

// Get user reputation
const reputation = await sdk.users.getReputation('user_123');

// Follow/unfollow user
await sdk.users.follow('user_456');
await sdk.users.unfollow('user_456');
```

### Review System

```javascript
// Submit review
const review = await sdk.reviews.create({
  orderId: 'order_123',
  rating: 5,
  comment: 'Excellent product and fast delivery!',
  revieweeId: 'seller_456'
});

// Get reviews for user
const reviews = await sdk.reviews.getForUser('user_123');

// Get reviews for product
const productReviews = await sdk.reviews.getForProduct('prod_123');
```

### NFT Integration

```javascript
// Mint NFT
const nft = await sdk.nfts.mint({
  to: '0x1234567890abcdef',
  metadata: {
    name: 'Awesome NFT #1',
    description: 'Limited edition artwork',
    image: 'ipfs://QmImageHash',
    attributes: [
      { trait_type: 'Rarity', value: 'Legendary' }
    ]
  }
});

// List NFT for sale
await sdk.nfts.listForSale({
  contractAddress: nft.contractAddress,
  tokenId: nft.tokenId,
  price: { amount: '1.0', currency: 'ETH' }
});

// Buy NFT
await sdk.nfts.buy({
  contractAddress: '0xNFTContract',
  tokenId: '42',
  price: { amount: '1.0', currency: 'ETH' }
});
```

### Payment Processing

```javascript
// Get supported payment methods
const paymentMethods = await sdk.payments.getSupportedMethods();

// Estimate gas fees
const gasEstimate = await sdk.payments.estimateGas({
  amount: '0.1',
  currency: 'ETH',
  to: '0x1234567890abcdef'
});

// Process payment
const payment = await sdk.payments.process({
  orderId: 'order_123',
  paymentMethod: 'crypto',
  currency: 'ETH'
});

// Get payment status
const paymentStatus = await sdk.payments.getStatus(payment.id);
```

## 🔐 Authentication

### Wallet-based Authentication

```javascript
// Connect with MetaMask
const provider = window.ethereum;
await sdk.connect(provider);

// Connect with WalletConnect
import WalletConnect from '@walletconnect/client';
const connector = new WalletConnect({
  bridge: 'https://bridge.walletconnect.org'
});
await sdk.connect(connector);

// Connect with private key (server-side)
await sdk.connect({
  privateKey: 'your-private-key'
});
```

### API Key Authentication

```javascript
const sdk = new Web3MarketplaceSDK({
  apiUrl: 'https://api.web3marketplace.com',
  apiKey: 'your-api-key',
  authMethod: 'api-key' // For server-to-server communication
});
```

## 🔄 Real-time Updates

### WebSocket Events

```javascript
// Subscribe to order updates
sdk.orders.subscribe('order_123', (update) => {
  console.log('Order update:', update);
});

// Subscribe to user notifications
sdk.notifications.subscribe((notification) => {
  console.log('New notification:', notification);
});

// Subscribe to price updates
sdk.products.subscribeToPriceUpdates('prod_123', (priceUpdate) => {
  console.log('Price changed:', priceUpdate);
});
```

## 🧪 Testing

### Mock Mode

```javascript
// Enable mock mode for testing
const sdk = new Web3MarketplaceSDK({
  apiUrl: 'https://api.web3marketplace.com',
  mockMode: true // Returns mock data instead of real API calls
});

// All SDK methods return predictable mock data
const products = await sdk.products.list(); // Returns mock products
```

### Test Utilities

```javascript
import { createTestSDK, mockWallet } from '@web3marketplace/sdk/testing';

// Create SDK instance for testing
const testSDK = createTestSDK();

// Mock wallet for testing
const wallet = mockWallet({
  address: '0x1234567890abcdef',
  balance: '10.0'
});

await testSDK.connect(wallet);
```

## 📊 Error Handling

### Error Types

```javascript
import { 
  ValidationError, 
  AuthenticationError, 
  BlockchainError,
  RateLimitError 
} from '@web3marketplace/sdk';

try {
  await sdk.products.create(invalidProduct);
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Validation failed:', error.details);
  } else if (error instanceof AuthenticationError) {
    console.log('Authentication required');
  } else if (error instanceof BlockchainError) {
    console.log('Blockchain transaction failed:', error.transactionHash);
  } else if (error instanceof RateLimitError) {
    console.log('Rate limit exceeded, retry after:', error.retryAfter);
  }
}
```

### Retry Logic

```javascript
// Built-in retry for transient failures
const sdk = new Web3MarketplaceSDK({
  apiUrl: 'https://api.web3marketplace.com',
  retryConfig: {
    maxRetries: 3,
    retryDelay: 1000, // 1 second
    exponentialBackoff: true
  }
});
```

## 🔧 Configuration

### Environment Configuration

```javascript
const sdk = new Web3MarketplaceSDK({
  // API Configuration
  apiUrl: process.env.WEB3_MARKETPLACE_API_URL,
  apiKey: process.env.WEB3_MARKETPLACE_API_KEY,
  
  // Network Configuration
  network: 'mainnet', // 'mainnet', 'polygon', 'arbitrum', 'testnet'
  
  // Blockchain Configuration
  rpcUrl: process.env.RPC_URL,
  gasPrice: 'fast', // 'slow', 'standard', 'fast', or specific gwei
  
  // Caching Configuration
  cache: {
    enabled: true,
    ttl: 300000, // 5 minutes
    maxSize: 1000
  },
  
  // Logging Configuration
  logging: {
    level: 'info', // 'debug', 'info', 'warn', 'error'
    destination: 'console' // 'console', 'file', or custom logger
  }
});
```

## 📖 Advanced Usage

### Custom Contract Interactions

```javascript
// Access underlying contract instances
const escrowContract = sdk.contracts.escrow;
const reputationContract = sdk.contracts.reputation;

// Direct contract calls
const orderId = await escrowContract.createOrder(
  sellerAddress,
  amount,
  tokenAddress,
  deadline,
  productHash
);
```

### Batch Operations

```javascript
// Batch multiple operations
const batch = sdk.batch()
  .products.create(product1)
  .products.create(product2)
  .orders.create(order1);

const results = await batch.execute();
```

### Plugin System

```javascript
// Add custom plugins
sdk.use(customAnalyticsPlugin);
sdk.use(customPaymentPlugin);

// Plugin example
const analyticsPlugin = {
  name: 'analytics',
  install(sdk) {
    sdk.analytics = {
      track: (event, data) => {
        // Custom analytics implementation
      }
    };
  }
};
```

## 📞 Support

- **Documentation**: [Full SDK Documentation](https://docs.web3marketplace.com/sdk)
- **Examples**: [GitHub Examples Repository](https://github.com/web3marketplace/sdk-examples)
- **Issues**: [GitHub Issues](https://github.com/web3marketplace/sdk/issues)
- **Discord**: [Developer Community](https://discord.gg/web3marketplace-dev)