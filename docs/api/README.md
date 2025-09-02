# API Documentation

The Web3 Marketplace provides both REST and GraphQL APIs for comprehensive platform integration.

## 🌐 Base URLs

- **Production**: `https://api.web3marketplace.com`
- **Staging**: `https://api-staging.web3marketplace.com`
- **Local Development**: `http://localhost:3001`

## 🔐 Authentication

All API requests require authentication using JWT tokens obtained through Web3 wallet signature verification.

### Authentication Flow

```javascript
// 1. Request authentication challenge
const challenge = await fetch('/api/auth/challenge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ address: walletAddress })
});

// 2. Sign challenge with wallet
const signature = await wallet.signMessage(challenge.message);

// 3. Verify signature and get JWT token
const auth = await fetch('/api/auth/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    address: walletAddress, 
    signature,
    message: challenge.message 
  })
});

const { token } = await auth.json();

// 4. Use token in subsequent requests
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

## 📊 API Versions

### Current Version: v1

All API endpoints are versioned. Include the version in your requests:

```
GET /api/v1/products
POST /api/v1/orders
```

### Version Compatibility

| Version | Status | Support Until | Breaking Changes |
|---------|--------|---------------|------------------|
| v1      | Current| 2025-12-31    | None             |
| v0      | Deprecated | 2024-06-30 | Authentication method |

## 🔗 Quick Reference

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/products` | GET, POST | Product management |
| `/api/v1/orders` | GET, POST | Order operations |
| `/api/v1/users/profile` | GET, PUT | User profile management |
| `/api/v1/reviews` | GET, POST | Review system |
| `/api/v1/disputes` | GET, POST | Dispute resolution |

### GraphQL Endpoint

```
POST /api/v1/graphql
```

## 📖 Detailed Documentation

- [REST API Reference](./rest/README.md)
- [GraphQL Schema](./graphql/README.md)
- [WebSocket Events](./websocket/README.md)
- [Rate Limiting](./rate-limiting.md)
- [Error Handling](./error-handling.md)
- [Pagination](./pagination.md)

## 🧪 Testing

- [Postman Collection](./postman-collection.json)
- [OpenAPI Specification](./openapi.yaml)
- [Interactive API Explorer](./explorer.html)

## 📝 Examples

### Create Product

```javascript
const product = await fetch('/api/v1/products', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Awesome NFT Collection',
    description: 'Limited edition digital art collection',
    price: {
      amount: '0.1',
      currency: 'ETH'
    },
    category: 'digital-art',
    images: ['ipfs://QmHash1', 'ipfs://QmHash2'],
    nft: {
      contractAddress: '0x...',
      tokenId: '1'
    }
  })
});

const newProduct = await product.json();
```

### Search Products

```javascript
const products = await fetch('/api/v1/products?search=NFT&category=digital-art&minPrice=0.01&maxPrice=1.0&sort=price_asc&limit=20&offset=0', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { data, pagination } = await products.json();
```

### Create Order with Escrow

```javascript
const order = await fetch('/api/v1/orders', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    productId: 'prod_123',
    quantity: 1,
    paymentMethod: 'crypto',
    currency: 'ETH',
    shippingAddress: {
      street: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94105',
      country: 'US'
    }
  })
});

const newOrder = await order.json();
// Returns order with escrow contract address
```

## 🚨 Error Handling

All API responses follow a consistent error format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid product data",
    "details": {
      "field": "price.amount",
      "reason": "Must be a positive number"
    },
    "requestId": "req_123456789",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTHENTICATION_ERROR` | 401 | Invalid or expired token |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `BLOCKCHAIN_ERROR` | 502 | Blockchain interaction failed |

## 📈 Rate Limiting

API requests are rate limited to ensure fair usage:

- **Authenticated requests**: 1000 requests per hour
- **Unauthenticated requests**: 100 requests per hour
- **Burst limit**: 50 requests per minute

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642248600
```