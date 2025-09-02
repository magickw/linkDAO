# Products API

The Products API allows you to manage product listings on the Web3 Marketplace.

## Endpoints

### List Products

```http
GET /api/v1/products
```

Retrieve a paginated list of products with optional filtering and sorting.

#### Query Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `search` | string | Search term for product title/description | - |
| `category` | string | Product category filter | - |
| `sellerId` | string | Filter by seller ID | - |
| `minPrice` | number | Minimum price filter | - |
| `maxPrice` | number | Maximum price filter | - |
| `currency` | string | Price currency (ETH, USDC, USD) | ETH |
| `status` | string | Product status (active, sold, inactive) | active |
| `sort` | string | Sort order (price_asc, price_desc, created_asc, created_desc, popularity) | created_desc |
| `limit` | number | Number of results per page (1-100) | 20 |
| `offset` | number | Number of results to skip | 0 |

#### Example Request

```javascript
const response = await fetch('/api/v1/products?search=NFT&category=digital-art&minPrice=0.1&sort=price_asc&limit=10', {
  headers: {
    'Authorization': 'Bearer your-jwt-token'
  }
});

const data = await response.json();
```

#### Example Response

```json
{
  "data": [
    {
      "id": "prod_123456",
      "sellerId": "user_789",
      "title": "Rare Digital Art NFT",
      "description": "Unique digital artwork with blockchain authenticity",
      "price": {
        "amount": "0.15",
        "currency": "ETH",
        "usdEquivalent": "245.50"
      },
      "category": {
        "id": "digital-art",
        "name": "Digital Art",
        "path": ["marketplace", "digital", "art"]
      },
      "images": [
        "ipfs://QmHash1",
        "ipfs://QmHash2"
      ],
      "metadata": {
        "dimensions": "1920x1080",
        "format": "PNG",
        "fileSize": "2.5MB"
      },
      "nft": {
        "contractAddress": "0x1234567890abcdef",
        "tokenId": "42",
        "blockchain": "ethereum"
      },
      "seller": {
        "id": "user_789",
        "username": "cryptoartist",
        "verified": true,
        "reputation": 4.8
      },
      "stats": {
        "views": 1250,
        "favorites": 89,
        "shares": 23
      },
      "status": "active",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 1500,
    "limit": 10,
    "offset": 0,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

### Get Product Details

```http
GET /api/v1/products/{productId}
```

Retrieve detailed information about a specific product.

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `productId` | string | Unique product identifier |

#### Example Request

```javascript
const response = await fetch('/api/v1/products/prod_123456', {
  headers: {
    'Authorization': 'Bearer your-jwt-token'
  }
});

const product = await response.json();
```

#### Example Response

```json
{
  "data": {
    "id": "prod_123456",
    "sellerId": "user_789",
    "title": "Rare Digital Art NFT",
    "description": "Unique digital artwork with blockchain authenticity certificate...",
    "price": {
      "amount": "0.15",
      "currency": "ETH",
      "usdEquivalent": "245.50",
      "priceHistory": [
        {
          "amount": "0.12",
          "currency": "ETH",
          "date": "2024-01-10T10:30:00Z"
        }
      ]
    },
    "category": {
      "id": "digital-art",
      "name": "Digital Art",
      "path": ["marketplace", "digital", "art"]
    },
    "images": [
      "ipfs://QmHash1",
      "ipfs://QmHash2",
      "ipfs://QmHash3"
    ],
    "metadata": {
      "dimensions": "1920x1080",
      "format": "PNG",
      "fileSize": "2.5MB",
      "colorProfile": "sRGB",
      "dpi": 300
    },
    "nft": {
      "contractAddress": "0x1234567890abcdef",
      "tokenId": "42",
      "blockchain": "ethereum",
      "metadata": {
        "name": "Rare Digital Art #42",
        "description": "Part of exclusive collection",
        "attributes": [
          {
            "trait_type": "Rarity",
            "value": "Legendary"
          },
          {
            "trait_type": "Artist",
            "value": "CryptoArtist"
          }
        ]
      }
    },
    "seller": {
      "id": "user_789",
      "username": "cryptoartist",
      "displayName": "Crypto Artist",
      "avatar": "ipfs://QmAvatarHash",
      "verified": true,
      "reputation": 4.8,
      "totalSales": 156,
      "memberSince": "2023-06-15T00:00:00Z"
    },
    "shipping": {
      "required": false,
      "digital": true
    },
    "reviews": {
      "average": 4.9,
      "count": 23,
      "distribution": {
        "5": 20,
        "4": 2,
        "3": 1,
        "2": 0,
        "1": 0
      }
    },
    "stats": {
      "views": 1250,
      "favorites": 89,
      "shares": 23,
      "watchers": 45
    },
    "authenticity": {
      "verified": true,
      "certificate": "ipfs://QmCertHash",
      "verificationDate": "2024-01-15T10:30:00Z"
    },
    "status": "active",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Create Product

```http
POST /api/v1/products
```

Create a new product listing.

#### Request Body

```json
{
  "title": "Amazing NFT Artwork",
  "description": "Detailed description of the product...",
  "price": {
    "amount": "0.25",
    "currency": "ETH"
  },
  "category": "digital-art",
  "images": [
    "ipfs://QmNewHash1",
    "ipfs://QmNewHash2"
  ],
  "metadata": {
    "dimensions": "2048x2048",
    "format": "PNG",
    "fileSize": "3.2MB"
  },
  "nft": {
    "contractAddress": "0xabcdef1234567890",
    "tokenId": "100"
  },
  "shipping": {
    "required": false,
    "digital": true
  },
  "tags": ["art", "nft", "digital", "collectible"]
}
```

#### Example Request

```javascript
const response = await fetch('/api/v1/products', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-jwt-token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Amazing NFT Artwork',
    description: 'Detailed description...',
    price: {
      amount: '0.25',
      currency: 'ETH'
    },
    category: 'digital-art',
    images: ['ipfs://QmNewHash1'],
    nft: {
      contractAddress: '0xabcdef1234567890',
      tokenId: '100'
    }
  })
});

const newProduct = await response.json();
```

#### Example Response

```json
{
  "data": {
    "id": "prod_789012",
    "sellerId": "user_456",
    "title": "Amazing NFT Artwork",
    "status": "pending_review",
    "createdAt": "2024-01-15T11:00:00Z",
    "estimatedApprovalTime": "2024-01-15T13:00:00Z"
  }
}
```

### Update Product

```http
PUT /api/v1/products/{productId}
```

Update an existing product listing.

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `productId` | string | Unique product identifier |

#### Request Body

Same as create product, but all fields are optional.

#### Example Request

```javascript
const response = await fetch('/api/v1/products/prod_123456', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer your-jwt-token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    price: {
      amount: '0.20',
      currency: 'ETH'
    },
    description: 'Updated description with more details...'
  })
});

const updatedProduct = await response.json();
```

### Delete Product

```http
DELETE /api/v1/products/{productId}
```

Remove a product listing (soft delete).

#### Example Request

```javascript
const response = await fetch('/api/v1/products/prod_123456', {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer your-jwt-token'
  }
});

// Returns 204 No Content on success
```

## Error Responses

### Validation Error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid product data",
    "details": {
      "field": "price.amount",
      "reason": "Must be a positive number"
    }
  }
}
```

### Not Found Error

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Product not found",
    "details": {
      "productId": "prod_invalid"
    }
  }
}
```

### Authorization Error

```json
{
  "error": {
    "code": "AUTHORIZATION_ERROR",
    "message": "You can only modify your own products",
    "details": {
      "productId": "prod_123456",
      "ownerId": "user_789"
    }
  }
}
```