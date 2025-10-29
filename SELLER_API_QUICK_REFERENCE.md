# Seller Backend API - Quick Reference Guide

## Base URL
```
Production: https://api.linkdao.io
Development: http://localhost:10000
```

## Authentication
Most seller endpoints require wallet address verification. Include in request headers:
```
X-Wallet-Address: 0x...
X-Signature: 0x...
```

---

## Dashboard & Analytics

### Get Dashboard Stats
```http
GET /api/marketplace/seller/dashboard/:walletAddress
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sales": { "today": 0, "thisWeek": 0, "thisMonth": 0, "total": 0 },
    "orders": { "pending": 0, "processing": 0, "shipped": 0, "delivered": 0, "completed": 0 },
    "listings": { "active": 0, "inactive": 0, "total": 0 },
    "balance": { "available": 0, "pending": 0, "escrow": 0, "total": 0 }
  }
}
```

### Get Notifications
```http
GET /api/marketplace/seller/notifications/:walletAddress
  ?limit=10&offset=0&unreadOnly=true
```

### Get Analytics
```http
GET /api/marketplace/seller/analytics/:walletAddress
  ?period=30d
```

**Period options:** `7d`, `30d`, `90d`, `1y`

---

## Orders Management

### Get Orders List
```http
GET /api/marketplace/seller/orders/:walletAddress
  ?status=pending&limit=20&offset=0&sortBy=createdAt&sortOrder=desc
```

**Status options:** `pending`, `processing`, `shipped`, `delivered`, `completed`, `cancelled`, `refunded`

### Update Order Status
```http
PUT /api/marketplace/seller/orders/:orderId/status
Content-Type: application/json

{
  "status": "processing",
  "notes": "Order confirmed and being prepared"
}
```

### Update Tracking Info
```http
PUT /api/marketplace/seller/orders/:orderId/tracking
Content-Type: application/json

{
  "trackingNumber": "1Z999AA10123456784",
  "trackingCarrier": "UPS",
  "estimatedDelivery": "2025-11-01",
  "notes": "Package shipped via UPS Ground"
}
```

### Get Order Details
```http
GET /api/marketplace/seller/orders/detail/:orderId
```

---

## Listings Management

### Get Listings
```http
GET /api/marketplace/seller/listings/:walletAddress
  ?status=active&limit=20&offset=0&sortBy=createdAt&sortOrder=desc
```

**Status options:** `active`, `inactive`, `sold_out`, `suspended`, `draft`

### Create Listing
```http
POST /api/marketplace/seller/listings
Content-Type: application/json

{
  "walletAddress": "0x...",
  "title": "Product Title",
  "description": "Product description",
  "price": 99.99,
  "categoryId": "uuid",
  "currency": "USD",
  "inventory": 10,
  "images": ["ipfs://...", "ipfs://..."],
  "tags": ["tag1", "tag2"],
  "metadata": {},
  "shipping": {
    "weight": 1.5,
    "dimensions": { "length": 10, "width": 5, "height": 3 }
  }
}
```

### Update Listing
```http
PUT /api/marketplace/seller/listings/:listingId
Content-Type: application/json

{
  "price": 149.99,
  "status": "active",
  "inventory": 5
}
```

### Delete Listing (Soft Delete)
```http
DELETE /api/marketplace/seller/listings/:listingId
```

### Get Listing Details
```http
GET /api/marketplace/seller/listings/detail/:listingId
```

---

## Image Upload

### Upload Profile/Cover Images
```http
PUT /api/marketplace/seller/:walletAddress/enhanced
Content-Type: multipart/form-data

profileImage: <file>
coverImage: <file>
displayName: "Seller Name"
bio: "Seller bio"
storeName: "Store Name"
```

### Generic Image Upload
```http
POST /api/marketplace/seller/image/upload
Content-Type: multipart/form-data

image: <file>
walletAddress: 0x...
usageType: listing
usageReferenceId: listing-uuid
```

**Usage Types:** `profile`, `cover`, `listing`, `product`

**Response:**
```json
{
  "success": true,
  "data": {
    "uploads": [
      {
        "ipfsHash": "Qm...",
        "cdnUrl": "https://ipfs.io/ipfs/Qm...",
        "metadata": {
          "originalFilename": "image.jpg",
          "contentType": "image/jpeg",
          "fileSize": 123456
        }
      }
    ],
    "count": 1
  }
}
```

---

## ENS Validation

### Validate ENS Name
```http
POST /api/marketplace/seller/ens/validate
Content-Type: application/json

{
  "ensName": "vitalik.eth"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "ensName": "vitalik.eth",
    "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    "owner": "0x...",
    "resolver": "0x...",
    "profile": {
      "avatar": "ipfs://...",
      "twitter": "VitalikButerin",
      "github": "vbuterin",
      "email": "...",
      "url": "https://...",
      "description": "..."
    }
  }
}
```

### Verify ENS Ownership
```http
POST /api/marketplace/seller/ens/verify-ownership
Content-Type: application/json

{
  "ensName": "vitalik.eth",
  "walletAddress": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  "storeVerification": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "ensName": "vitalik.eth",
    "walletAddress": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    "verificationMethod": "forward_resolution",
    "resolvedAddress": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    "stored": true
  }
}
```

### Get Stored Verifications
```http
GET /api/marketplace/seller/ens/verifications/:walletAddress
```

### Revoke Verification
```http
DELETE /api/marketplace/seller/ens/verifications/:walletAddress/:ensName
```

### Quick ENS Resolution
```http
GET /api/marketplace/seller/ens/resolve/:ensName
GET /api/marketplace/seller/ens/reverse/:walletAddress
```

---

## Onboarding

### Update Onboarding Step
```http
PUT /api/marketplace/seller/onboarding/:walletAddress/:stepId
Content-Type: application/json

{
  "completed": true
}
```

**Step IDs (both formats accepted):**
- `profile-setup` or `profile_setup`
- `payout-setup` or `payout_setup`
- `first-listing` or `first_listing`
- `verification`

---

## Error Responses

### Validation Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "errors": [
        {
          "field": "walletAddress",
          "message": "Invalid wallet address format"
        }
      ]
    }
  },
  "metadata": {
    "timestamp": "2025-10-19T...",
    "requestId": "uuid"
  }
}
```

### Not Found
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Seller profile not found"
  }
}
```

### Rate Limited
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later"
  }
}
```

---

## Rate Limits

| Endpoint Category | Limit |
|------------------|-------|
| Dashboard/Analytics | 60 req/min |
| Orders (Read) | 60 req/min |
| Orders (Write) | 30 req/min |
| Listings (Read) | 60 req/min |
| Listings (Create) | 10 req/min |
| Listings (Update) | 30 req/min |
| Listings (Delete) | 20 req/min |
| ENS Validation | 20 req/min |
| ENS Verification | 10 req/min |

---

## Pagination

All list endpoints support pagination:
```
?limit=20&offset=0
```

**Limits:**
- Min: 1
- Max: 100
- Default: 20

**Response includes pagination metadata:**
```json
{
  "data": {
    "items": [...],
    "totalCount": 150,
    "pagination": {
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

---

## Caching

Cached endpoints return `X-Cache` header:
```
X-Cache: HIT
X-Cache: MISS
```

**Cache TTLs:**
- Dashboard: 60 seconds
- Notifications: 30 seconds
- Analytics: 5 minutes
- Orders: 30 seconds
- Listings: 60 seconds

**Cache invalidation:**
- Automatic on write operations (create, update, delete)
- Manual via cache management API (admin only)

---

## Testing

### Run Integration Tests
```bash
npm run test:integration
npm run test:integration -- sellerEndpoints
npm run test:integration:verbose
```

### Manual Testing with curl
```bash
# Dashboard
curl http://localhost:10000/api/marketplace/seller/dashboard/0x1234567890123456789012345678901234567890

# Create listing
curl -X POST http://localhost:10000/api/marketplace/seller/listings \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x1234567890123456789012345678901234567890",
    "title": "Test Product",
    "description": "Test description",
    "price": 99.99,
    "categoryId": "123e4567-e89b-12d3-a456-426614174000"
  }'

# Validate ENS
curl -X POST http://localhost:10000/api/marketplace/seller/ens/validate \
  -H "Content-Type: application/json" \
  -d '{"ensName": "vitalik.eth"}'
```

---

## Environment Setup

Required variables:
```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
IPFS_URL=http://127.0.0.1:5001
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
```

Optional:
```bash
CDN_BASE_URL=https://cdn.linkdao.io
IPFS_GATEWAY=https://ipfs.io/ipfs
MAINNET_RPC_URL=https://eth.llamarpc.com
```

---

## Support

- API Documentation: `/api/docs`
- Health Check: `/health`
- Marketplace Health: `/api/marketplace/health`
- GitHub Issues: https://github.com/magickw/marketplace/issues

---

**Last Updated:** 2025-10-19
**API Version:** 1.0.0
**Status:** Production Ready ✅
