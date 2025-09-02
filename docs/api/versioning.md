# API Versioning and Backward Compatibility

## Overview

The Web3 Marketplace API uses semantic versioning to ensure backward compatibility and smooth transitions between API versions. This document outlines our versioning strategy, migration paths, and compatibility guarantees.

## Versioning Strategy

### Version Format

We use semantic versioning (SemVer) for our API:

```
MAJOR.MINOR.PATCH
```

- **MAJOR**: Breaking changes that require code updates
- **MINOR**: New features that are backward compatible
- **PATCH**: Bug fixes and minor improvements

### Current Versions

| Version | Status | Release Date | End of Life | Breaking Changes |
|---------|--------|--------------|-------------|------------------|
| v2.1.0 | Current | 2024-01-15 | TBD | None |
| v2.0.0 | Supported | 2023-09-01 | 2024-12-31 | Authentication method |
| v1.2.3 | Deprecated | 2023-03-15 | 2024-06-30 | Response format |
| v1.1.0 | End of Life | 2022-12-01 | 2023-12-31 | N/A |

## API Endpoint Structure

### Version in URL Path

```
https://api.web3marketplace.com/v{MAJOR}/endpoint
```

Examples:
```
GET https://api.web3marketplace.com/v2/products
POST https://api.web3marketplace.com/v2/orders
GET https://api.web3marketplace.com/v1/users/profile
```

### Version in Headers (Alternative)

```http
GET /products HTTP/1.1
Host: api.web3marketplace.com
Accept: application/vnd.web3marketplace.v2+json
Authorization: Bearer your-jwt-token
```

## Backward Compatibility Guarantees

### What We Guarantee

#### Within Major Versions (v2.x.x)
- ✅ Existing endpoints remain functional
- ✅ Response structure stays consistent
- ✅ Required parameters don't change
- ✅ Authentication methods remain the same
- ✅ Error codes and formats stay consistent

#### Across Minor Versions (v2.0.x → v2.1.x)
- ✅ New optional parameters may be added
- ✅ New response fields may be added
- ✅ New endpoints may be introduced
- ✅ Performance improvements
- ✅ Bug fixes

### What May Change

#### In Minor Updates
- New optional query parameters
- Additional response fields
- New HTTP headers
- Enhanced error messages
- New endpoint features

#### In Major Updates
- Required parameter changes
- Response structure modifications
- Authentication method updates
- Endpoint URL changes
- Error code modifications

## Migration Guide

### From v1.x to v2.x

#### Breaking Changes Summary

1. **Authentication Method**
   - Old: API key in query parameter
   - New: JWT token in Authorization header

2. **Response Format**
   - Old: Direct data response
   - New: Wrapped in `data` object with metadata

3. **Error Handling**
   - Old: Simple error messages
   - New: Structured error objects

4. **Pagination**
   - Old: `page` and `per_page` parameters
   - New: `offset` and `limit` parameters

#### Migration Steps

##### 1. Update Authentication

**v1.x (Deprecated)**
```javascript
// Old method - API key in URL
const response = await fetch(
  'https://api.web3marketplace.com/v1/products?api_key=your-api-key'
);
```

**v2.x (Current)**
```javascript
// New method - JWT token in header
const response = await fetch(
  'https://api.web3marketplace.com/v2/products',
  {
    headers: {
      'Authorization': 'Bearer your-jwt-token',
      'Content-Type': 'application/json'
    }
  }
);
```

##### 2. Update Response Handling

**v1.x Response**
```json
[
  {
    "id": "prod_123",
    "title": "Product Name",
    "price": "0.1"
  }
]
```

**v2.x Response**
```json
{
  "data": [
    {
      "id": "prod_123",
      "title": "Product Name",
      "price": {
        "amount": "0.1",
        "currency": "ETH"
      }
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  },
  "meta": {
    "requestId": "req_456",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

**Migration Code**
```javascript
// v1.x
const products = await response.json();

// v2.x
const result = await response.json();
const products = result.data;
const pagination = result.pagination;
```

##### 3. Update Error Handling

**v1.x Error**
```json
{
  "error": "Product not found"
}
```

**v2.x Error**
```json
{
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product not found",
    "details": {
      "productId": "prod_123"
    },
    "requestId": "req_456",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

**Migration Code**
```javascript
// v1.x
if (response.error) {
  console.error(response.error);
}

// v2.x
if (response.error) {
  console.error(`${response.error.code}: ${response.error.message}`);
  console.log('Request ID:', response.error.requestId);
}
```

##### 4. Update Pagination

**v1.x Pagination**
```javascript
const products = await fetch(
  '/v1/products?page=2&per_page=20'
);
```

**v2.x Pagination**
```javascript
const products = await fetch(
  '/v2/products?offset=20&limit=20'
);
```

### Automated Migration Tools

#### Migration Script

```bash
# Install migration tool
npm install -g @web3marketplace/api-migrator

# Run migration analysis
web3marketplace-migrate analyze --from=v1 --to=v2 --path=./src

# Apply automatic fixes
web3marketplace-migrate fix --from=v1 --to=v2 --path=./src

# Generate migration report
web3marketplace-migrate report --output=migration-report.html
```

#### SDK Auto-Migration

```javascript
import { Web3MarketplaceSDK } from '@web3marketplace/sdk';

// SDK automatically handles version differences
const sdk = new Web3MarketplaceSDK({
  apiUrl: 'https://api.web3marketplace.com',
  version: 'v2', // Specify version
  autoMigrate: true // Enable automatic migration
});

// Works with both v1 and v2 APIs
const products = await sdk.products.list();
```

## Version Support Policy

### Support Lifecycle

1. **Current Version**: Full support, new features, bug fixes
2. **Supported Version**: Security updates, critical bug fixes
3. **Deprecated Version**: Security updates only, migration warnings
4. **End of Life**: No support, may be shut down

### Support Timeline

- **Current Version**: Indefinite support
- **Previous Major Version**: 18 months support
- **Deprecated Versions**: 6 months notice before shutdown
- **Security Updates**: Available for all supported versions

### Deprecation Process

#### 1. Announcement (6 months before)
- Blog post and documentation updates
- Email notifications to API users
- Deprecation headers in API responses
- Migration guides published

#### 2. Deprecation Warnings (3 months before)
- Warning headers in all responses
- Dashboard notifications
- SDK warnings and logs
- Community forum announcements

#### 3. End of Life Notice (1 month before)
- Final migration deadline
- Direct contact with active users
- Emergency migration assistance
- Automatic redirects where possible

## Version Detection

### Automatic Version Detection

```javascript
// SDK automatically detects and uses appropriate version
const sdk = new Web3MarketplaceSDK({
  apiUrl: 'https://api.web3marketplace.com',
  autoDetectVersion: true
});
```

### Manual Version Specification

```javascript
// Explicitly specify version
const sdk = new Web3MarketplaceSDK({
  apiUrl: 'https://api.web3marketplace.com',
  version: 'v2'
});
```

### Version Negotiation

```http
GET /products HTTP/1.1
Host: api.web3marketplace.com
Accept: application/vnd.web3marketplace.v2+json, application/vnd.web3marketplace.v1+json;q=0.8
```

Response:
```http
HTTP/1.1 200 OK
Content-Type: application/vnd.web3marketplace.v2+json
API-Version: 2.1.0
Supported-Versions: v2.1.0, v2.0.0, v1.2.3
Deprecated-Versions: v1.2.3
```

## Compatibility Testing

### Automated Testing

```javascript
// Test suite for version compatibility
describe('API Version Compatibility', () => {
  const versions = ['v1', 'v2'];
  
  versions.forEach(version => {
    describe(`Version ${version}`, () => {
      let sdk;
      
      beforeEach(() => {
        sdk = new Web3MarketplaceSDK({ version });
      });
      
      it('should list products', async () => {
        const products = await sdk.products.list();
        expect(products).toBeDefined();
        expect(Array.isArray(products.data || products)).toBe(true);
      });
      
      it('should create orders', async () => {
        const order = await sdk.orders.create(mockOrderData);
        expect(order.id).toBeDefined();
      });
    });
  });
});
```

### Contract Testing

```javascript
// Pact contract testing for API compatibility
const { Pact } = require('@pact-foundation/pact');

const provider = new Pact({
  consumer: 'Web3MarketplaceClient',
  provider: 'Web3MarketplaceAPI',
  port: 1234,
  log: path.resolve(process.cwd(), 'logs', 'pact.log'),
  dir: path.resolve(process.cwd(), 'pacts'),
  logLevel: 'INFO'
});

describe('API Contract Tests', () => {
  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());
  
  describe('Products API', () => {
    beforeEach(() => {
      return provider.addInteraction({
        state: 'products exist',
        uponReceiving: 'a request for products',
        withRequest: {
          method: 'GET',
          path: '/v2/products'
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            data: Matchers.eachLike({
              id: Matchers.string('prod_123'),
              title: Matchers.string('Product Name')
            })
          }
        }
      });
    });
    
    it('should return products', async () => {
      const response = await fetch(`${provider.mockService.baseUrl}/v2/products`);
      const data = await response.json();
      expect(data.data).toBeDefined();
    });
  });
});
```

## Best Practices

### For API Consumers

#### 1. Version Pinning
```javascript
// Pin to specific version for stability
const sdk = new Web3MarketplaceSDK({
  version: 'v2.1.0' // Specific version
});
```

#### 2. Graceful Degradation
```javascript
// Handle version differences gracefully
async function getProducts() {
  try {
    const response = await sdk.products.list();
    return response.data || response; // Handle both v1 and v2 formats
  } catch (error) {
    if (error.code === 'VERSION_NOT_SUPPORTED') {
      // Fallback to older version
      return await legacyGetProducts();
    }
    throw error;
  }
}
```

#### 3. Feature Detection
```javascript
// Check for feature availability
if (sdk.hasFeature('batch-operations')) {
  await sdk.batch().products.create(products).execute();
} else {
  // Fallback to individual operations
  for (const product of products) {
    await sdk.products.create(product);
  }
}
```

#### 4. Version Monitoring
```javascript
// Monitor API version in production
sdk.on('version-warning', (warning) => {
  console.warn('API Version Warning:', warning);
  // Send to monitoring service
  monitoring.track('api_version_warning', warning);
});

sdk.on('version-deprecated', (info) => {
  console.error('API Version Deprecated:', info);
  // Alert development team
  alerts.send('api_version_deprecated', info);
});
```

### For API Providers

#### 1. Gradual Rollout
- Deploy new versions to staging first
- Use feature flags for new functionality
- Monitor error rates and performance
- Gradual traffic shifting

#### 2. Monitoring and Alerting
- Track version usage statistics
- Monitor error rates by version
- Alert on deprecated version usage spikes
- Performance monitoring across versions

#### 3. Documentation
- Maintain changelog for all versions
- Provide clear migration guides
- Document breaking changes thoroughly
- Offer migration assistance

## Changelog

### v2.1.0 (2024-01-15)
#### Added
- Batch operations for products and orders
- Enhanced search filters
- Real-time price updates via WebSocket
- NFT metadata validation

#### Changed
- Improved error messages with more context
- Enhanced rate limiting with burst allowance
- Optimized response times for large datasets

#### Fixed
- Pagination edge cases
- Timezone handling in date filters
- Memory leaks in WebSocket connections

### v2.0.0 (2023-09-01)
#### Breaking Changes
- JWT authentication required (was API key)
- Response format wrapped in `data` object
- Pagination uses `offset`/`limit` (was `page`/`per_page`)
- Error format standardized

#### Added
- Smart contract integration
- NFT marketplace functionality
- Real-time order tracking
- Multi-currency support

#### Removed
- Legacy API key authentication
- Direct array responses
- Deprecated user endpoints

### v1.2.3 (2023-03-15) - DEPRECATED
#### Fixed
- Security vulnerability in authentication
- Rate limiting bypass issue
- Data validation edge cases

## Support and Migration Assistance

### Migration Support
- **Free Migration Consultation**: 1-hour session with our team
- **Migration Tools**: Automated code transformation tools
- **Testing Environment**: Sandbox for testing migrations
- **Priority Support**: Dedicated support during migration

### Contact Information
- **Migration Help**: migration@web3marketplace.com
- **Technical Support**: api-support@web3marketplace.com
- **Discord**: #api-migration channel
- **Documentation**: [Migration Guides](./migration/)

### Emergency Migration
If you need urgent migration assistance:
1. Contact emergency-migration@web3marketplace.com
2. Include your API usage patterns and timeline
3. We'll provide dedicated engineering support
4. Expedited migration tools and testing