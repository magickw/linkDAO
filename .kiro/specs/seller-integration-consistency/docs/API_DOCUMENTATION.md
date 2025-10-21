# Seller Integration API Documentation

## Overview

This document provides comprehensive API documentation for the standardized seller integration endpoints. All endpoints follow the unified pattern `/api/marketplace/seller` and provide consistent error handling and response formats.

## Base Configuration

```typescript
const SELLER_API_BASE = '/api/marketplace/seller';
const API_VERSION = 'v1';
```

## Authentication

All seller endpoints require wallet-based authentication:

```typescript
Headers: {
  'Authorization': 'Bearer <wallet_signature>',
  'Content-Type': 'application/json',
  'X-Wallet-Address': '<wallet_address>'
}
```

## Standardized Endpoints

### Profile Management

#### Get Seller Profile
```
GET /api/marketplace/seller/{walletAddress}/profile
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "walletAddress": "0x...",
    "displayName": "string",
    "bio": "string",
    "profileImageUrl": "string",
    "coverImageUrl": "string",
    "email": "string",
    "website": "string",
    "socialLinks": {
      "twitter": "string",
      "discord": "string",
      "telegram": "string"
    },
    "verificationStatus": {
      "email": boolean,
      "phone": boolean,
      "kyc": boolean
    },
    "tier": {
      "id": "string",
      "name": "string",
      "level": number
    },
    "stats": {
      "totalSales": number,
      "averageRating": number,
      "totalReviews": number,
      "joinedDate": "string"
    },
    "createdAt": "string",
    "updatedAt": "string"
  },
  "meta": {
    "timestamp": "string",
    "version": "string"
  }
}
```

#### Update Seller Profile
```
PUT /api/marketplace/seller/{walletAddress}/profile
```

**Request Body:**
```typescript
{
  "displayName": "string",
  "bio": "string",
  "email": "string",
  "website": "string",
  "socialLinks": {
    "twitter": "string",
    "discord": "string",
    "telegram": "string"
  }
}
```

### Listing Management

#### Get Seller Listings
```
GET /api/marketplace/seller/{walletAddress}/listings
```

**Query Parameters:**
- `page`: number (default: 1)
- `limit`: number (default: 20, max: 100)
- `status`: 'draft' | 'active' | 'sold' | 'inactive'
- `category`: string
- `sortBy`: 'createdAt' | 'updatedAt' | 'price' | 'title'
- `sortOrder`: 'asc' | 'desc'

**Response:**
```typescript
{
  "success": true,
  "data": {
    "listings": [
      {
        "id": "string",
        "sellerId": "string",
        "title": "string",
        "description": "string",
        "price": number,
        "currency": "ETH" | "USDC" | "DAI" | "USD",
        "images": ["string"],
        "category": "string",
        "status": "draft" | "active" | "sold" | "inactive",
        "escrowEnabled": boolean,
        "shippingInfo": {
          "weight": number,
          "dimensions": {
            "length": number,
            "width": number,
            "height": number
          },
          "shippingCost": number
        },
        "metadata": {
          "tags": ["string"],
          "attributes": {}
        },
        "createdAt": "string",
        "updatedAt": "string"
      }
    ],
    "pagination": {
      "page": number,
      "limit": number,
      "total": number,
      "totalPages": number,
      "hasNext": boolean,
      "hasPrev": boolean
    }
  },
  "meta": {
    "timestamp": "string",
    "version": "string"
  }
}
```

#### Create New Listing
```
POST /api/marketplace/seller/{walletAddress}/listings
```

**Request Body:**
```typescript
{
  "title": "string",
  "description": "string",
  "price": number,
  "currency": "ETH" | "USDC" | "DAI" | "USD",
  "images": ["string"],
  "category": "string",
  "escrowEnabled": boolean,
  "shippingInfo": {
    "weight": number,
    "dimensions": {
      "length": number,
      "width": number,
      "height": number
    },
    "shippingCost": number
  },
  "metadata": {
    "tags": ["string"],
    "attributes": {}
  }
}
```

#### Update Listing
```
PUT /api/marketplace/seller/{walletAddress}/listings/{listingId}
```

#### Delete Listing
```
DELETE /api/marketplace/seller/{walletAddress}/listings/{listingId}
```

### Dashboard Data

#### Get Seller Dashboard
```
GET /api/marketplace/seller/{walletAddress}/dashboard
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "profile": {
      // Profile data structure
    },
    "listings": {
      "total": number,
      "active": number,
      "draft": number,
      "sold": number
    },
    "orders": {
      "pending": number,
      "processing": number,
      "completed": number,
      "cancelled": number,
      "recentOrders": [
        {
          "id": "string",
          "buyerAddress": "string",
          "listingId": "string",
          "amount": number,
          "currency": "string",
          "status": "string",
          "createdAt": "string"
        }
      ]
    },
    "analytics": {
      "totalRevenue": number,
      "monthlyRevenue": number,
      "averageOrderValue": number,
      "conversionRate": number,
      "viewsToSales": number,
      "revenueChart": [
        {
          "date": "string",
          "revenue": number,
          "orders": number
        }
      ]
    },
    "notifications": [
      {
        "id": "string",
        "type": "order" | "message" | "review" | "tier_upgrade",
        "title": "string",
        "message": "string",
        "read": boolean,
        "createdAt": "string"
      }
    ],
    "tierInfo": {
      "current": {
        "id": "string",
        "name": "string",
        "level": number
      },
      "next": {
        "id": "string",
        "name": "string",
        "level": number,
        "requirements": [
          {
            "type": "string",
            "current": number,
            "required": number,
            "met": boolean
          }
        ]
      },
      "benefits": ["string"],
      "limitations": ["string"]
    }
  },
  "meta": {
    "timestamp": "string",
    "version": "string"
  }
}
```

### Analytics

#### Get Seller Analytics
```
GET /api/marketplace/seller/{walletAddress}/analytics
```

**Query Parameters:**
- `period`: '7d' | '30d' | '90d' | '1y'
- `metrics`: comma-separated list of metrics to include

**Response:**
```typescript
{
  "success": true,
  "data": {
    "performance": {
      "totalViews": number,
      "totalSales": number,
      "conversionRate": number,
      "averageOrderValue": number,
      "totalRevenue": number
    },
    "trends": {
      "viewsChart": [
        {
          "date": "string",
          "views": number
        }
      ],
      "salesChart": [
        {
          "date": "string",
          "sales": number,
          "revenue": number
        }
      ]
    },
    "insights": [
      {
        "type": "performance" | "recommendation" | "alert",
        "title": "string",
        "description": "string",
        "actionable": boolean,
        "priority": "low" | "medium" | "high"
      }
    ],
    "tierProgression": {
      "currentTier": "string",
      "progress": number,
      "nextMilestone": {
        "requirement": "string",
        "current": number,
        "target": number
      }
    }
  },
  "meta": {
    "timestamp": "string",
    "version": "string"
  }
}
```

### Store Page

#### Get Seller Store
```
GET /api/marketplace/seller/{walletAddress}/store
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "seller": {
      // Seller profile data
    },
    "featuredListings": [
      // Array of listing objects
    ],
    "categories": [
      {
        "name": "string",
        "count": number
      }
    ],
    "storeStats": {
      "totalListings": number,
      "averageRating": number,
      "totalReviews": number,
      "responseTime": "string",
      "memberSince": "string"
    },
    "reviews": [
      {
        "id": "string",
        "buyerAddress": "string",
        "rating": number,
        "comment": "string",
        "listingId": "string",
        "createdAt": "string"
      }
    ]
  },
  "meta": {
    "timestamp": "string",
    "version": "string"
  }
}
```

#### Get Store Listings
```
GET /api/marketplace/seller/{walletAddress}/store/listings
```

## Error Handling

### Standard Error Response Format

```typescript
{
  "success": false,
  "error": {
    "code": "string",
    "message": "string",
    "details": {},
    "timestamp": "string"
  },
  "meta": {
    "requestId": "string",
    "version": "string"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `SELLER_NOT_FOUND` | 404 | Seller profile not found |
| `UNAUTHORIZED` | 401 | Invalid or missing authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `LISTING_NOT_FOUND` | 404 | Listing not found |
| `TIER_LIMIT_EXCEEDED` | 403 | Action exceeds tier limitations |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

### Error Recovery Strategies

#### Retry Logic
```typescript
const retryConfig = {
  maxAttempts: 3,
  backoffMultiplier: 2,
  initialDelay: 1000,
  retryableErrors: ['RATE_LIMIT_EXCEEDED', 'SERVICE_UNAVAILABLE', 'INTERNAL_ERROR']
};
```

#### Fallback Handling
```typescript
const fallbackStrategies = {
  'SELLER_NOT_FOUND': 'redirect_to_onboarding',
  'UNAUTHORIZED': 'prompt_wallet_connection',
  'FORBIDDEN': 'show_tier_upgrade_prompt',
  'VALIDATION_ERROR': 'highlight_invalid_fields',
  'TIER_LIMIT_EXCEEDED': 'show_tier_upgrade_modal'
};
```

## Rate Limiting

### Default Limits
- **Profile endpoints**: 100 requests per minute
- **Listing endpoints**: 200 requests per minute
- **Dashboard endpoints**: 50 requests per minute
- **Analytics endpoints**: 30 requests per minute

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Caching Strategy

### Cache Headers
```
Cache-Control: public, max-age=300
ETag: "abc123"
Last-Modified: Wed, 21 Oct 2015 07:28:00 GMT
```

### Cache Invalidation
- Profile updates: Invalidate all seller-related caches
- Listing changes: Invalidate listing and dashboard caches
- Order updates: Invalidate dashboard and analytics caches

## WebSocket Events

### Real-time Updates
```typescript
// Connection
ws://api.example.com/seller/{walletAddress}/ws

// Event Types
{
  "type": "profile_updated",
  "data": { /* updated profile data */ }
}

{
  "type": "new_order",
  "data": { /* order details */ }
}

{
  "type": "tier_upgraded",
  "data": { /* new tier information */ }
}

{
  "type": "listing_viewed",
  "data": { /* view analytics */ }
}
```

## SDK Usage Examples

### JavaScript/TypeScript
```typescript
import { UnifiedSellerAPIClient } from '@/services/unifiedSellerAPIClient';

const client = new UnifiedSellerAPIClient();

// Get seller profile
const profile = await client.getProfile('0x...');

// Update profile
const updatedProfile = await client.updateProfile('0x...', {
  displayName: 'New Name',
  bio: 'Updated bio'
});

// Get listings with pagination
const listings = await client.getListings('0x...', {
  page: 1,
  limit: 20,
  status: 'active'
});
```

### React Hooks
```typescript
import { useSellerProfile, useSellerListings } from '@/hooks/useSeller';

function SellerDashboard({ walletAddress }) {
  const { data: profile, isLoading, error } = useSellerProfile(walletAddress);
  const { data: listings } = useSellerListings(walletAddress);

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorFallback error={error} />;

  return (
    <div>
      <SellerProfile profile={profile} />
      <SellerListings listings={listings} />
    </div>
  );
}
```

## Testing

### API Testing
```bash
# Test profile endpoint
curl -X GET \
  "https://api.example.com/api/marketplace/seller/0x.../profile" \
  -H "Authorization: Bearer <token>" \
  -H "X-Wallet-Address: 0x..."

# Test with invalid wallet
curl -X GET \
  "https://api.example.com/api/marketplace/seller/invalid/profile" \
  -H "Authorization: Bearer <token>"
```

### Integration Tests
```typescript
describe('Seller API Integration', () => {
  test('should get seller profile', async () => {
    const response = await request(app)
      .get('/api/marketplace/seller/0x.../profile')
      .set('Authorization', 'Bearer token')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.walletAddress).toBe('0x...');
  });

  test('should handle seller not found', async () => {
    const response = await request(app)
      .get('/api/marketplace/seller/0xinvalid/profile')
      .set('Authorization', 'Bearer token')
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('SELLER_NOT_FOUND');
  });
});
```

## Migration Guide

### From Legacy Endpoints
```typescript
// Old endpoint patterns
'/api/seller/profile' -> '/api/marketplace/seller/{walletAddress}/profile'
'/api/listings/seller' -> '/api/marketplace/seller/{walletAddress}/listings'
'/api/seller/dashboard' -> '/api/marketplace/seller/{walletAddress}/dashboard'

// Update client code
const oldClient = new LegacySellerClient();
const newClient = new UnifiedSellerAPIClient();

// Migrate profile calls
const profile = await newClient.getProfile(walletAddress);
```

## Monitoring and Observability

### Metrics to Track
- API response times
- Error rates by endpoint
- Cache hit/miss ratios
- WebSocket connection stability
- Tier upgrade conversion rates

### Logging Format
```json
{
  "timestamp": "2023-12-01T10:00:00Z",
  "level": "info",
  "service": "seller-api",
  "endpoint": "/api/marketplace/seller/0x.../profile",
  "method": "GET",
  "status": 200,
  "duration": 150,
  "walletAddress": "0x...",
  "userAgent": "Mozilla/5.0...",
  "requestId": "req-123"
}
```

## Security Considerations

### Authentication
- Wallet signature verification required
- JWT tokens with short expiration
- Rate limiting per wallet address

### Data Protection
- PII encryption at rest
- Secure image upload validation
- Input sanitization and validation

### Access Control
- Wallet ownership verification
- Tier-based feature restrictions
- Admin override capabilities

## Support and Troubleshooting

### Common Issues
1. **Authentication failures**: Verify wallet signature and token validity
2. **Rate limiting**: Implement exponential backoff
3. **Cache inconsistencies**: Use proper cache invalidation
4. **WebSocket disconnections**: Implement reconnection logic

### Debug Endpoints
```
GET /api/marketplace/seller/debug/health
GET /api/marketplace/seller/debug/cache-status
GET /api/marketplace/seller/debug/rate-limits
```