# Integration Guides

Step-by-step guides for integrating with the Web3 Marketplace platform.

## 🎯 Integration Scenarios

### For E-commerce Platforms
- [Shopify Integration](./shopify.md) - Add Web3 payments to Shopify stores
- [WooCommerce Integration](./woocommerce.md) - WordPress/WooCommerce plugin
- [Magento Integration](./magento.md) - Magento marketplace extension
- [Custom E-commerce](./custom-ecommerce.md) - Integrate with custom platforms

### For Marketplaces
- [NFT Marketplace Integration](./nft-marketplace.md) - Add physical goods to NFT platforms
- [Digital Asset Platforms](./digital-assets.md) - Integrate digital asset trading
- [Service Marketplaces](./service-marketplaces.md) - Add Web3 payments to service platforms

### For Developers
- [Mobile App Integration](./mobile-apps.md) - React Native and Flutter SDKs
- [Web Application Integration](./web-apps.md) - Frontend integration patterns
- [Backend Integration](./backend-services.md) - Server-side integration
- [Webhook Integration](./webhooks.md) - Real-time event handling

## 🚀 Quick Start Integration

### 1. Basic Setup

```javascript
// Install the SDK
npm install @web3marketplace/sdk

// Initialize the SDK
import { Web3MarketplaceSDK } from '@web3marketplace/sdk';

const marketplace = new Web3MarketplaceSDK({
  apiKey: 'your-api-key',
  network: 'mainnet',
  apiUrl: 'https://api.linkdao.io'
});
```

### 2. Authentication Setup

```javascript
// Web3 wallet authentication
async function authenticateUser() {
  // Connect to user's wallet
  const provider = window.ethereum;
  await marketplace.connect(provider);
  
  // Get authentication token
  const auth = await marketplace.auth.authenticate();
  
  return auth.token;
}
```

### 3. Create Your First Product

```javascript
async function createProduct() {
  const product = await marketplace.products.create({
    title: 'My First Web3 Product',
    description: 'A revolutionary product on the blockchain',
    price: {
      amount: '0.1',
      currency: 'ETH'
    },
    category: 'electronics',
    images: ['https://example.com/image1.jpg'],
    shipping: {
      weight: 0.5, // kg
      dimensions: { length: 10, width: 10, height: 5 } // cm
    }
  });
  
  console.log('Product created:', product.id);
  return product;
}
```

### 4. Handle Orders

```javascript
async function handleOrder(productId, buyerAddress) {
  // Create order with automatic escrow
  const order = await marketplace.orders.create({
    productId,
    quantity: 1,
    buyerAddress,
    paymentMethod: 'crypto'
  });
  
  // Listen for order events
  marketplace.orders.on('statusChanged', (orderId, status) => {
    console.log(`Order ${orderId} status: ${status}`);
    
    switch (status) {
      case 'paid':
        // Process and ship the order
        processOrder(orderId);
        break;
      case 'shipped':
        // Notify buyer
        notifyBuyer(orderId);
        break;
      case 'delivered':
        // Payment automatically released from escrow
        console.log('Payment released to seller');
        break;
    }
  });
  
  return order;
}
```

## 🔌 Platform-Specific Integrations

### Shopify Integration

```javascript
// Shopify App Setup
const shopifyApp = express();

// Add Web3 payment option to checkout
shopifyApp.post('/checkout/web3-payment', async (req, res) => {
  const { cartItems, customerAddress } = req.body;
  
  // Create marketplace order
  const order = await marketplace.orders.create({
    items: cartItems.map(item => ({
      productId: item.variant_id,
      quantity: item.quantity,
      price: item.price
    })),
    buyerAddress: customerAddress,
    paymentMethod: 'crypto'
  });
  
  res.json({
    orderId: order.id,
    escrowContract: order.escrowContract,
    paymentAddress: order.paymentAddress
  });
});

// Handle payment confirmation
shopifyApp.post('/webhook/payment-confirmed', async (req, res) => {
  const { orderId, transactionHash } = req.body;
  
  // Update Shopify order status
  await shopify.order.update(orderId, {
    financial_status: 'paid',
    note: `Web3 payment: ${transactionHash}`
  });
  
  res.status(200).send('OK');
});
```

### React Native Mobile App

```javascript
// Install mobile SDK
npm install @web3marketplace/react-native-sdk

// Setup in your React Native app
import { Web3MarketplaceProvider, useMarketplace } from '@web3marketplace/react-native-sdk';

function App() {
  return (
    <Web3MarketplaceProvider
      apiKey="your-api-key"
      network="mainnet"
    >
      <MarketplaceApp />
    </Web3MarketplaceProvider>
  );
}

function ProductScreen() {
  const { products, orders } = useMarketplace();
  
  const handlePurchase = async (productId) => {
    // Mobile wallet integration
    const walletConnect = new WalletConnect({
      bridge: 'https://bridge.walletconnect.org'
    });
    
    await walletConnect.createSession();
    
    // Create order
    const order = await orders.create({
      productId,
      quantity: 1,
      paymentMethod: 'crypto'
    });
    
    // Process payment through mobile wallet
    const payment = await walletConnect.sendTransaction({
      to: order.escrowContract,
      value: order.totalAmount,
      data: order.paymentData
    });
    
    return payment;
  };
  
  return (
    <View>
      {/* Your product UI */}
    </View>
  );
}
```

## 🔄 Webhook Integration

### Setting Up Webhooks

```javascript
// Configure webhook endpoints
const webhookConfig = {
  url: 'https://your-app.com/webhooks/marketplace',
  events: [
    'order.created',
    'order.paid',
    'order.shipped',
    'order.delivered',
    'order.disputed',
    'review.created',
    'user.verified'
  ],
  secret: 'your-webhook-secret'
};

await marketplace.webhooks.create(webhookConfig);
```

### Handling Webhook Events

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();

// Webhook endpoint
app.post('/webhooks/marketplace', express.raw({type: 'application/json'}), (req, res) => {
  const signature = req.headers['x-marketplace-signature'];
  const payload = req.body;
  
  // Verify webhook signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  
  if (signature !== `sha256=${expectedSignature}`) {
    return res.status(401).send('Invalid signature');
  }
  
  const event = JSON.parse(payload);
  
  // Handle different event types
  switch (event.type) {
    case 'order.created':
      handleOrderCreated(event.data);
      break;
    case 'order.paid':
      handleOrderPaid(event.data);
      break;
    case 'order.shipped':
      handleOrderShipped(event.data);
      break;
    case 'order.delivered':
      handleOrderDelivered(event.data);
      break;
    case 'review.created':
      handleReviewCreated(event.data);
      break;
  }
  
  res.status(200).send('OK');
});

async function handleOrderPaid(orderData) {
  // Update your internal systems
  await updateInventory(orderData.productId, -orderData.quantity);
  await createShippingLabel(orderData.orderId);
  await notifyWarehouse(orderData);
}
```

## 🎨 Frontend Integration Patterns

### React Integration

```jsx
import { useMarketplace, MarketplaceProvider } from '@web3marketplace/react';

function App() {
  return (
    <MarketplaceProvider apiKey="your-api-key">
      <ProductCatalog />
    </MarketplaceProvider>
  );
}

function ProductCatalog() {
  const { products, loading, error } = useMarketplace();
  
  if (loading) return <div>Loading products...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div className="product-grid">
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

function ProductCard({ product }) {
  const { orders } = useMarketplace();
  
  const handlePurchase = async () => {
    try {
      const order = await orders.create({
        productId: product.id,
        quantity: 1
      });
      
      // Redirect to payment
      window.location.href = `/checkout/${order.id}`;
    } catch (error) {
      console.error('Purchase failed:', error);
    }
  };
  
  return (
    <div className="product-card">
      <img src={product.images[0]} alt={product.title} />
      <h3>{product.title}</h3>
      <p>{product.price.amount} {product.price.currency}</p>
      <button onClick={handlePurchase}>
        Buy with Web3
      </button>
    </div>
  );
}
```

### Vue.js Integration

```vue
<template>
  <div class="marketplace">
    <product-grid :products="products" @purchase="handlePurchase" />
  </div>
</template>

<script>
import { Web3MarketplaceSDK } from '@web3marketplace/sdk';

export default {
  data() {
    return {
      marketplace: null,
      products: []
    };
  },
  
  async mounted() {
    this.marketplace = new Web3MarketplaceSDK({
      apiKey: process.env.VUE_APP_MARKETPLACE_API_KEY
    });
    
    await this.loadProducts();
  },
  
  methods: {
    async loadProducts() {
      this.products = await this.marketplace.products.list({
        limit: 20,
        sort: 'created_desc'
      });
    },
    
    async handlePurchase(productId) {
      const order = await this.marketplace.orders.create({
        productId,
        quantity: 1
      });
      
      this.$router.push(`/checkout/${order.id}`);
    }
  }
};
</script>
```

## 🔐 Security Best Practices

### API Key Management

```javascript
// Environment-based configuration
const config = {
  development: {
    apiUrl: 'https://api-dev.linkdao.io',
    apiKey: process.env.DEV_API_KEY
  },
  staging: {
    apiUrl: 'https://api-staging.linkdao.io',
    apiKey: process.env.STAGING_API_KEY
  },
  production: {
    apiUrl: 'https://api.linkdao.io',
    apiKey: process.env.PROD_API_KEY
  }
};

const marketplace = new Web3MarketplaceSDK(config[process.env.NODE_ENV]);
```

### Signature Verification

```javascript
// Verify blockchain signatures
async function verifyOrderSignature(order, signature, userAddress) {
  const message = `Order: ${order.id}, Amount: ${order.totalAmount}, Nonce: ${order.nonce}`;
  
  const recoveredAddress = ethers.utils.verifyMessage(message, signature);
  
  if (recoveredAddress.toLowerCase() !== userAddress.toLowerCase()) {
    throw new Error('Invalid signature');
  }
  
  return true;
}
```

### Rate Limiting

```javascript
// Implement client-side rate limiting
class RateLimiter {
  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }
  
  async checkLimit() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      throw new Error('Rate limit exceeded');
    }
    
    this.requests.push(now);
  }
}

const rateLimiter = new RateLimiter();

// Use before API calls
await rateLimiter.checkLimit();
const products = await marketplace.products.list();
```

## 📊 Analytics Integration

### Track User Behavior

```javascript
// Custom analytics integration
marketplace.on('product.viewed', (product) => {
  analytics.track('Product Viewed', {
    productId: product.id,
    category: product.category,
    price: product.price.amount,
    currency: product.price.currency
  });
});

marketplace.on('order.created', (order) => {
  analytics.track('Purchase Started', {
    orderId: order.id,
    value: order.totalAmount,
    currency: order.currency,
    items: order.items.length
  });
});

marketplace.on('order.completed', (order) => {
  analytics.track('Purchase Completed', {
    orderId: order.id,
    value: order.totalAmount,
    currency: order.currency,
    paymentMethod: order.paymentMethod
  });
});
```

## 🧪 Testing Integration

### Mock Data for Development

```javascript
// Use mock mode during development
const marketplace = new Web3MarketplaceSDK({
  apiKey: 'test-key',
  mockMode: process.env.NODE_ENV === 'development',
  mockData: {
    products: [
      {
        id: 'mock-product-1',
        title: 'Test Product',
        price: { amount: '0.1', currency: 'ETH' }
      }
    ]
  }
});
```

### Integration Tests

```javascript
// Jest integration tests
describe('Marketplace Integration', () => {
  let marketplace;
  
  beforeEach(() => {
    marketplace = new Web3MarketplaceSDK({
      apiKey: 'test-key',
      mockMode: true
    });
  });
  
  test('should create product successfully', async () => {
    const product = await marketplace.products.create({
      title: 'Test Product',
      price: { amount: '0.1', currency: 'ETH' }
    });
    
    expect(product.id).toBeDefined();
    expect(product.title).toBe('Test Product');
  });
  
  test('should handle order flow', async () => {
    const product = await marketplace.products.create({
      title: 'Test Product',
      price: { amount: '0.1', currency: 'ETH' }
    });
    
    const order = await marketplace.orders.create({
      productId: product.id,
      quantity: 1
    });
    
    expect(order.status).toBe('created');
    expect(order.escrowContract).toBeDefined();
  });
});
```

## 📞 Support & Resources

- **Integration Support**: [Discord Channel](https://discord.gg/web3marketplace-integration)
- **Code Examples**: [GitHub Repository](https://github.com/web3marketplace/integration-examples)
- **Video Tutorials**: [YouTube Playlist](https://youtube.com/playlist?list=web3marketplace-integration)
- **Office Hours**: Weekly developer Q&A sessions (Fridays 2PM UTC)