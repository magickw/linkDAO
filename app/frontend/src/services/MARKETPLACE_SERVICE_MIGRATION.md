# Marketplace Service Migration Guide

## Problem
We had three similar marketplace service files that created confusion and maintenance issues:
- `marketplaceService.ts` - Original blockchain-focused service
- `enhancedMarketplaceService.ts` - Enhanced version with advanced features
- `realMarketplaceService.ts` - Wrapper for replacing mock data

## Solution
Consolidated all functionality into a single `unifiedMarketplaceService.ts` that provides:
- All original blockchain marketplace operations
- Enhanced features (search, filtering, real-time auctions)
- Real database integration (no more mock data)
- Backward compatibility for existing code

## Migration Steps

### 1. Update Imports

**Before:**
```typescript
import { MarketplaceService } from './marketplaceService';
import { EnhancedMarketplaceService } from './enhancedMarketplaceService';
import { realMarketplaceService } from './realMarketplaceService';
```

**After:**
```typescript
import { marketplaceService } from './unifiedMarketplaceService';
// or
import { UnifiedMarketplaceService } from './unifiedMarketplaceService';
```

### 2. Update Service Usage

**Before:**
```typescript
const marketplace = new MarketplaceService();
const enhanced = new EnhancedMarketplaceService();
const real = realMarketplaceService;

// Multiple service calls
const products = await real.getAllProducts();
const auctions = await enhanced.getActiveAuctions();
const listings = await marketplace.getActiveListings();
```

**After:**
```typescript
import { marketplaceService } from './unifiedMarketplaceService';

// Single service for everything
const products = await marketplaceService.getAllProducts();
const auctions = await marketplaceService.getActiveAuctions();
const listings = await marketplaceService.getMarketplaceListings();
```

### 3. Legacy Function Support

For backward compatibility, these functions still work:
```typescript
import { 
  getProductsByCategory,
  getFeaturedProducts,
  searchProducts 
} from './unifiedMarketplaceService';

// These still work as before
const electronics = await getProductsByCategory('electronics');
const featured = await getFeaturedProducts();
const results = await searchProducts('laptop');
```

### 4. Component Updates

**Before:**
```typescript
// DashboardRightSidebar.tsx
import { realMarketplaceService } from '../services/realMarketplaceService';

const auctions = await realMarketplaceService.getActiveAuctions();
```

**After:**
```typescript
// DashboardRightSidebar.tsx
import { marketplaceService } from '../services/unifiedMarketplaceService';

const auctions = await marketplaceService.getActiveAuctions();
```

## Benefits

1. **Single Source of Truth**: One service handles all marketplace operations
2. **Reduced Confusion**: Developers know exactly which service to use
3. **Better Maintenance**: Changes only need to be made in one place
4. **Improved Testing**: Only one service to mock and test
5. **Backward Compatibility**: Existing code continues to work
6. **Enhanced Features**: All advanced features available in one place

## File Cleanup

After migration is complete, we can safely remove:
- `app/frontend/src/services/marketplaceService.ts`
- `app/frontend/src/services/enhancedMarketplaceService.ts`
- `app/frontend/src/services/realMarketplaceService.ts`

## Next Steps

1. Update all imports to use `unifiedMarketplaceService`
2. Test all marketplace functionality
3. Remove old service files
4. Update documentation and examples