# Backend API Documentation

## Overview

This document provides comprehensive documentation for the LinkDAO Marketplace Backend API. The API follows RESTful principles and returns JSON responses with a standardized format.

## Base URL

```
Production: https://api.linkdao.io
Development: http://localhost:3001
```

## Authentication

The API uses JWT (JSON Web Token) based authentication with wallet signatures for user verification.

### Authentication Flow

1. **Wallet Connection**: User signs a message with their wallet
2. **Token Generation**: Server validates signature and returns JWT token
3. **Authenticated Requests**: Include token in Authorization header

### Authorization Header Format

```
Authorization: Bearer <jwt_token>
```

## Response Format

All API responses follow a standardized format:

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_1705312200000_abc123",
    "version": "1.0.0",
    "pagination": {  // Only for paginated responses
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      // Additional error details (optional)
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_1705312200000_abc123",
    "version": "1.0.0"
  }
}
```

## HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid request data |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Access denied |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation failed |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |
| 503 | Service Unavailable - Service temporarily down |

## Rate Limiting

API requests are rate limited to prevent abuse:

- **Authentication endpoints**: 10 requests per minute per IP
- **General endpoints**: 100 requests per minute per user
- **Search endpoints**: 30 requests per minute per user

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705312800
```

---

# API Endpoints

## Authentication

### POST /api/auth/wallet-connect

Authenticate user with wallet signature.

**Request Body:**
```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b8D0C9e3e4C4c4c4c4",
  "signature": "0x1234567890abcdef...",
  "message": "Sign in to LinkDAO"
}
```

**Validation Rules:**
- `walletAddress`: Valid Ethereum address (0x + 40 hex characters)
- `signature`: Valid signature (130-132 characters)
- `message`: Non-empty string

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_123",
      "walletAddress": "0x742d35Cc6634C0532925a3b8D0C9e3e4C4c4c4c4",
      "displayName": "User123",
      "profileImageUrl": "https://example.com/avatar.jpg",
      "isVerified": false,
      "reputation": 0
    },
    "expiresIn": 3600
  }
}
```

**Error Responses:**
- `400` - Invalid wallet address or signature format
- `401` - Signature verification failed
- `429` - Too many authentication attempts

---

### GET /api/auth/profile

Get authenticated user's profile.

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "walletAddress": "0x742d35Cc6634C0532925a3b8D0C9e3e4C4c4c4c4",
    "displayName": "User123",
    "bio": "Crypto enthusiast and NFT collector",
    "profileImageUrl": "https://example.com/avatar.jpg",
    "ensName": "user123.eth",
    "reputation": 85,
    "isVerified": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `401` - Invalid or expired token

---

### PUT /api/auth/profile

Update authenticated user's profile.

**Authentication:** Required

**Request Body:**
```json
{
  "displayName": "New Display Name",
  "bio": "Updated bio text",
  "profileImageUrl": "https://example.com/new-avatar.jpg",
  "ensName": "newname.eth"
}
```

**Validation Rules:**
- `displayName`: 1-100 characters (optional)
- `bio`: Max 500 characters (optional)
- `profileImageUrl`: Valid URL (optional)
- `ensName`: Valid .eth domain (optional)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "displayName": "New Display Name",
    "bio": "Updated bio text",
    "profileImageUrl": "https://example.com/new-avatar.jpg",
    "ensName": "newname.eth",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Validation failed
- `401` - Invalid or expired token

---

### POST /api/auth/logout

Logout user and invalidate session.

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Successfully logged out"
  }
}
```

---

## Marketplace

### GET /api/marketplace/listings

Get paginated product listings with optional filtering.

**Query Parameters:**
- `page` (optional): Page number (default: 1, min: 1)
- `limit` (optional): Items per page (default: 20, min: 1, max: 100)
- `category` (optional): Filter by category
- `minPrice` (optional): Minimum price filter (USD)
- `maxPrice` (optional): Maximum price filter (USD)
- `sellerId` (optional): Filter by seller ID
- `search` (optional): Search term

**Example Request:**
```
GET /api/marketplace/listings?page=1&limit=10&category=Electronics&minPrice=10&maxPrice=100
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "listings": [
      {
        "id": "listing_123",
        "title": "Wireless Headphones",
        "description": "High-quality wireless headphones with noise cancellation",
        "price": {
          "amount": 0.05,
          "currency": "ETH",
          "usdEquivalent": 125.50
        },
        "images": [
          "https://example.com/image1.jpg",
          "https://example.com/image2.jpg"
        ],
        "seller": {
          "id": "seller_456",
          "name": "TechStore",
          "reputation": 95
        },
        "category": "Electronics",
        "isDigital": false,
        "isNFT": false,
        "inventory": 10,
        "createdAt": "2024-01-10T00:00:00.000Z"
      }
    ]
  },
  "metadata": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 150,
      "totalPages": 15,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### GET /api/marketplace/listings/:id

Get detailed information about a specific product listing.

**Path Parameters:**
- `id`: Product listing ID

**Example Request:**
```
GET /api/marketplace/listings/listing_123
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "listing_123",
    "title": "Wireless Headphones",
    "description": "High-quality wireless headphones with advanced noise cancellation technology...",
    "price": {
      "crypto": 0.05,
      "cryptoSymbol": "ETH",
      "fiat": 125.50,
      "fiatSymbol": "USD"
    },
    "images": [
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg",
      "https://example.com/image3.jpg"
    ],
    "seller": {
      "id": "seller_456",
      "name": "TechStore",
      "avatar": "https://example.com/seller-avatar.jpg",
      "verified": true,
      "reputation": 95,
      "totalSales": 1250,
      "memberSince": "2023-06-01T00:00:00.000Z"
    },
    "category": "Electronics",
    "subcategory": "Audio",
    "tags": ["wireless", "bluetooth", "noise-cancelling"],
    "isDigital": false,
    "isNFT": false,
    "inventory": 10,
    "specifications": {
      "brand": "AudioTech",
      "model": "AT-WH100",
      "color": "Black",
      "warranty": "2 years"
    },
    "shipping": {
      "weight": "0.5kg",
      "dimensions": "20x15x8cm",
      "freeShipping": true,
      "estimatedDelivery": "3-5 business days"
    },
    "createdAt": "2024-01-10T00:00:00.000Z",
    "updatedAt": "2024-01-12T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `404` - Product not found

---

### GET /api/marketplace/sellers/:id

Get seller profile information.

**Path Parameters:**
- `id`: Seller ID

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "seller_456",
    "userId": "user_789",
    "storeName": "TechStore",
    "storeDescription": "Your one-stop shop for the latest tech gadgets and accessories",
    "coverImageUrl": "https://example.com/store-cover.jpg",
    "profileImageUrl": "https://example.com/seller-avatar.jpg",
    "totalSales": 1250,
    "totalListings": 45,
    "averageRating": 4.8,
    "totalReviews": 324,
    "isActive": true,
    "isVerified": true,
    "memberSince": "2023-06-01T00:00:00.000Z",
    "location": {
      "country": "United States",
      "city": "San Francisco"
    },
    "policies": {
      "returnPolicy": "30-day return policy",
      "shippingPolicy": "Ships within 1-2 business days",
      "paymentMethods": ["ETH", "USDC", "Credit Card"]
    },
    "socialLinks": {
      "website": "https://techstore.example.com",
      "twitter": "@techstore",
      "discord": "TechStore#1234"
    }
  }
}
```

**Error Responses:**
- `404` - Seller not found

---

### GET /api/marketplace/sellers/:id/listings

Get listings from a specific seller.

**Path Parameters:**
- `id`: Seller ID

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "listings": [
      // Array of listing objects (same format as /api/marketplace/listings)
    ]
  },
  "metadata": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### GET /api/marketplace/search

Search products and sellers.

**Query Parameters:**
- `q`: Search query (required, min: 1 character)
- `type` (optional): Search type ("products", "sellers", "all" - default: "all")
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `category` (optional): Filter by category
- `minPrice` (optional): Minimum price filter
- `maxPrice` (optional): Maximum price filter

**Example Request:**
```
GET /api/marketplace/search?q=wireless%20headphones&type=products&page=1&limit=10
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "type": "product",
        "id": "listing_123",
        "title": "Wireless Headphones",
        "description": "High-quality wireless headphones...",
        "price": {
          "amount": 0.05,
          "currency": "ETH",
          "usdEquivalent": 125.50
        },
        "images": ["https://example.com/image1.jpg"],
        "seller": {
          "id": "seller_456",
          "name": "TechStore"
        },
        "relevanceScore": 0.95
      }
    ],
    "summary": {
      "totalResults": 25,
      "productResults": 20,
      "sellerResults": 5
    }
  },
  "metadata": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

**Error Responses:**
- `400` - Empty search query

---

## Shopping Cart

### GET /api/cart

Get user's shopping cart.

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "cart_123",
    "userId": "user_123",
    "items": [
      {
        "id": "cart_item_456",
        "productId": "listing_123",
        "product": {
          "id": "listing_123",
          "title": "Wireless Headphones",
          "price": {
            "amount": 0.05,
            "currency": "ETH",
            "usdEquivalent": 125.50
          },
          "images": ["https://example.com/image1.jpg"],
          "seller": {
            "id": "seller_456",
            "name": "TechStore"
          }
        },
        "quantity": 2,
        "addedAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "summary": {
      "totalItems": 2,
      "totalAmount": {
        "crypto": 0.10,
        "currency": "ETH",
        "usdEquivalent": 251.00
      }
    },
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

---

### POST /api/cart/items

Add item to shopping cart.

**Authentication:** Required

**Request Body:**
```json
{
  "productId": "listing_123",
  "quantity": 2
}
```

**Validation Rules:**
- `productId`: Valid product ID (required)
- `quantity`: Positive integer (required, min: 1)

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "cart_item_456",
    "productId": "listing_123",
    "quantity": 2,
    "addedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Invalid product ID or quantity
- `404` - Product not found
- `409` - Item already in cart (use PUT to update)

---

### PUT /api/cart/items/:id

Update cart item quantity.

**Authentication:** Required

**Path Parameters:**
- `id`: Cart item ID

**Request Body:**
```json
{
  "quantity": 3
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "cart_item_456",
    "quantity": 3,
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Invalid quantity
- `404` - Cart item not found

---

### DELETE /api/cart/items/:id

Remove item from shopping cart.

**Authentication:** Required

**Path Parameters:**
- `id`: Cart item ID

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Item removed from cart"
  }
}
```

**Error Responses:**
- `404` - Cart item not found

---

### DELETE /api/cart

Clear all items from shopping cart.

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Cart cleared",
    "itemsRemoved": 3
  }
}
```

---

### POST /api/cart/sync

Sync cart with local storage data.

**Authentication:** Required

**Request Body:**
```json
{
  "items": [
    {
      "productId": "listing_123",
      "quantity": 2
    },
    {
      "productId": "listing_456",
      "quantity": 1
    }
  ]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "syncedItems": 2,
    "totalItems": 3,
    "conflicts": [],
    "message": "Cart synchronized successfully"
  }
}
```

---

## Health Check & Monitoring

### GET /api/health

Basic health check endpoint.

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "uptime": 86400,
    "version": "1.0.0",
    "environment": "production"
  }
}
```

---

### GET /api/health/status

Detailed system status with service health checks.

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "uptime": 86400,
    "version": "1.0.0",
    "environment": "production",
    "services": [
      {
        "name": "database",
        "status": "healthy",
        "responseTime": 15,
        "lastCheck": "2024-01-15T10:30:00.000Z"
      },
      {
        "name": "cache",
        "status": "healthy",
        "responseTime": 2,
        "lastCheck": "2024-01-15T10:30:00.000Z"
      },
      {
        "name": "external_services",
        "status": "degraded",
        "responseTime": 500,
        "lastCheck": "2024-01-15T10:30:00.000Z",
        "warning": "High response time detected"
      }
    ],
    "metrics": {
      "errorRate": 0.01,
      "avgResponseTime": 120,
      "throughput": 150,
      "memoryUsage": 65
    }
  }
}
```

---

### GET /api/ready

Kubernetes readiness probe endpoint.

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "ready": true,
    "message": "Service is ready to accept traffic"
  }
}
```

**Service Unavailable (503):**
```json
{
  "success": false,
  "data": {
    "ready": false,
    "message": "Service is not ready - critical dependencies unavailable",
    "criticalIssues": [
      "Database connection failed",
      "Cache service unavailable"
    ]
  }
}
```

---

### GET /api/live

Kubernetes liveness probe endpoint.

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "alive": true,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "uptime": 86400
  }
}
```

---

## Error Codes Reference

### Authentication Errors
- `UNAUTHORIZED` - Missing or invalid authentication token
- `TOKEN_EXPIRED` - JWT token has expired
- `INVALID_SIGNATURE` - Wallet signature verification failed
- `WALLET_NOT_CONNECTED` - Wallet connection required

### Validation Errors
- `VALIDATION_ERROR` - Request data validation failed
- `INVALID_FORMAT` - Data format is incorrect
- `REQUIRED_FIELD_MISSING` - Required field not provided
- `VALUE_OUT_OF_RANGE` - Value exceeds allowed range

### Resource Errors
- `NOT_FOUND` - Requested resource not found
- `ALREADY_EXISTS` - Resource already exists
- `INSUFFICIENT_INVENTORY` - Not enough items in stock
- `SELLER_INACTIVE` - Seller account is inactive

### System Errors
- `INTERNAL_SERVER_ERROR` - Unexpected server error
- `SERVICE_UNAVAILABLE` - Service temporarily unavailable
- `DATABASE_ERROR` - Database operation failed
- `EXTERNAL_SERVICE_ERROR` - External service integration failed

### Rate Limiting
- `TOO_MANY_REQUESTS` - Rate limit exceeded
- `QUOTA_EXCEEDED` - API quota exceeded

---

## SDK and Integration Examples

### JavaScript/Node.js Example

```javascript
const axios = require('axios');

class LinkDAOAPI {
  constructor(baseURL = 'http://localhost:3001', token = null) {
    this.baseURL = baseURL;
    this.token = token;
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` })
      }
    });
  }

  async authenticate(walletAddress, signature, message) {
    const response = await this.client.post('/api/auth/wallet-connect', {
      walletAddress,
      signature,
      message
    });
    
    if (response.data.success) {
      this.token = response.data.data.token;
      this.client.defaults.headers.Authorization = `Bearer ${this.token}`;
    }
    
    return response.data;
  }

  async getListings(params = {}) {
    const response = await this.client.get('/api/marketplace/listings', { params });
    return response.data;
  }

  async getCart() {
    const response = await this.client.get('/api/cart');
    return response.data;
  }

  async addToCart(productId, quantity) {
    const response = await this.client.post('/api/cart/items', {
      productId,
      quantity
    });
    return response.data;
  }
}

// Usage
const api = new LinkDAOAPI();

// Authenticate
await api.authenticate(
  '0x742d35Cc6634C0532925a3b8D0C9e3e4C4c4c4c4',
  '0x1234567890abcdef...',
  'Sign in to LinkDAO'
);

// Get listings
const listings = await api.getListings({ category: 'Electronics', limit: 10 });

// Add to cart
await api.addToCart('listing_123', 2);
```

### Python Example

```python
import requests
import json

class LinkDAOAPI:
    def __init__(self, base_url='http://localhost:3001', token=None):
        self.base_url = base_url
        self.token = token
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        if token:
            self.session.headers.update({'Authorization': f'Bearer {token}'})

    def authenticate(self, wallet_address, signature, message):
        response = self.session.post(f'{self.base_url}/api/auth/wallet-connect', 
                                   json={
                                       'walletAddress': wallet_address,
                                       'signature': signature,
                                       'message': message
                                   })
        data = response.json()
        if data['success']:
            self.token = data['data']['token']
            self.session.headers.update({'Authorization': f'Bearer {self.token}'})
        return data

    def get_listings(self, **params):
        response = self.session.get(f'{self.base_url}/api/marketplace/listings', 
                                  params=params)
        return response.json()

    def get_cart(self):
        response = self.session.get(f'{self.base_url}/api/cart')
        return response.json()

# Usage
api = LinkDAOAPI()

# Authenticate
auth_result = api.authenticate(
    '0x742d35Cc6634C0532925a3b8D0C9e3e4C4c4c4c4',
    '0x1234567890abcdef...',
    'Sign in to LinkDAO'
)

# Get listings
listings = api.get_listings(category='Electronics', limit=10)
```

---

## Changelog

### Version 1.0.0 (2024-01-15)
- Initial API release
- Authentication with wallet signatures
- Marketplace listings and search
- Shopping cart functionality
- Health check endpoints
- Comprehensive error handling
- Rate limiting implementation

---

## Support

For API support and questions:
- Documentation: https://docs.linkdao.io/api
- Discord: https://discord.gg/linkdao
- Email: api-support@linkdao.io

---

*This documentation is automatically generated and updated. Last updated: 2024-01-15*