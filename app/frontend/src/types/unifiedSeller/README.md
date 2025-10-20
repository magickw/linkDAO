# Unified Seller Interfaces

This directory contains the unified seller interfaces that resolve data type inconsistencies between different seller components and provide a consistent data structure across the entire seller system.

## Overview

The unified seller interfaces were created to address the following issues:

1. **Data Type Mismatches**: Inconsistent interfaces between `DisplayMarketplaceListing` and `SellerListing`
2. **Cache Management Issues**: Profile updates not properly invalidated across components
3. **Error Handling Inconsistencies**: Different strategies causing crashes vs graceful degradation
4. **Mobile Optimization Gaps**: Limited responsiveness and touch interaction support

## Key Interfaces

### UnifiedSellerListing

Resolves mismatches between `DisplayMarketplaceListing` and `SellerListing` by combining all necessary fields with consistent typing.

**Key Features:**
- Unified pricing format with both numeric and display values
- Consistent status mapping across all listing sources
- Standardized image handling with thumbnails and CDN support
- Blockchain and escrow fields unified
- Comprehensive metadata structure

### UnifiedSellerProfile

Provides consistent profile data structure across all seller components.

**Key Features:**
- Unified image storage with multiple formats (original, thumbnail, CDN, IPFS)
- Comprehensive verification status tracking
- Tier and reputation management
- Settings and preferences consolidation
- Onboarding progress tracking

### UnifiedSellerDashboard

Comprehensive dashboard interface that combines profile, listings, orders, analytics, and notifications.

**Key Features:**
- Complete seller overview in one interface
- Financial metrics and transaction history
- Performance analytics and KPIs
- Real-time notifications and activity feeds
- Quick actions and system status

## Data Transformation

The unified interfaces work with transformation utilities that convert between different data formats:

### Transformation Functions

- `transformDisplayListingToUnified()` - Converts DisplayMarketplaceListing to UnifiedSellerListing
- `transformSellerListingToUnified()` - Converts SellerListing to UnifiedSellerListing
- `transformMarketplaceListingToUnified()` - Converts MarketplaceListing to UnifiedSellerListing
- `transformSellerProfileToUnified()` - Converts SellerProfile to UnifiedSellerProfile
- `transformDashboardStatsToUnified()` - Converts SellerDashboardStats to UnifiedSellerDashboard

### Backward Compatibility

All transformation functions maintain backward compatibility through:

- Field mapping for renamed or restructured fields
- Type conversions for data format changes
- Default values for missing fields
- Warning collection for deprecated field usage

## Usage

### Basic Usage

```typescript
import { UnifiedSellerProfile, UnifiedSellerListing } from '@/types/unifiedSeller';
import { unifiedSellerService } from '@/services/unifiedSellerService';
import { useUnifiedSeller } from '@/hooks/useUnifiedSeller';

// Using the service directly
const profile = await unifiedSellerService.getProfile(walletAddress);
const listings = await unifiedSellerService.getListings(walletAddress);

// Using React hooks
const { profile, loading, error } = useUnifiedSeller(walletAddress);
const { listings, createListing } = useUnifiedSellerListings(walletAddress);
```

### Data Transformation

```typescript
import { transformDisplayListingToUnified } from '@/utils/sellerDataTransformers';

// Transform external data to unified format
const displayListing = { /* DisplayMarketplaceListing data */ };
const transformResult = transformDisplayListingToUnified(displayListing);

if (transformResult.warnings.length > 0) {
  console.warn('Transformation warnings:', transformResult.warnings);
}

const unifiedListing = transformResult.data;
```

### Component Integration

```typescript
import { useUnifiedSellerDashboard } from '@/hooks/useUnifiedSeller';

function SellerDashboard() {
  const { dashboard, loading, error } = useUnifiedSellerDashboard();
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <div>
      <ProfileSection profile={dashboard.profile} />
      <ListingsSection listings={dashboard.listings} />
      <OrdersSection orders={dashboard.orders} />
      <AnalyticsSection analytics={dashboard.analytics} />
    </div>
  );
}
```

## Migration Guide

### From Legacy Interfaces

1. **Update Imports**
   ```typescript
   // Before
   import { SellerProfile, SellerListing } from '@/types/seller';
   
   // After
   import { UnifiedSellerProfile, UnifiedSellerListing } from '@/types/unifiedSeller';
   ```

2. **Update Service Usage**
   ```typescript
   // Before
   import { sellerService } from '@/services/sellerService';
   
   // After
   import { unifiedSellerService } from '@/services/unifiedSellerService';
   ```

3. **Update Hook Usage**
   ```typescript
   // Before
   import { useSeller, useSellerListings } from '@/hooks/useSeller';
   
   // After
   import { useUnifiedSeller, useUnifiedSellerListings } from '@/hooks/useUnifiedSeller';
   ```

### Field Mapping

Common field mappings when migrating:

| Legacy Field | Unified Field | Notes |
|--------------|---------------|-------|
| `profilePicture` | `profileImageUrl` | Unified naming |
| `favorites` | `likes` | Consistent terminology |
| `isEscrowProtected` | `escrowEnabled` | Clearer naming |
| `metadataURI` | `title` | Fallback transformation |
| `itemType` | `category` | Consistent categorization |

## Testing

The unified interfaces include comprehensive tests that verify:

- Data transformation accuracy
- Backward compatibility
- Error handling
- Warning collection
- Field mapping correctness

Run tests with:
```bash
npm test -- sellerDataTransformers.test.ts
```

## Performance Considerations

The unified interfaces are designed with performance in mind:

- **Caching**: Multi-level caching with React Query integration
- **Lazy Loading**: Optional fields loaded on demand
- **Batch Operations**: Support for batch transformations
- **Memory Management**: Automatic cache cleanup and invalidation

## Error Handling

Comprehensive error handling includes:

- **Graceful Degradation**: Fallback values for missing data
- **Error Boundaries**: Component-level error isolation
- **Retry Logic**: Automatic retry with exponential backoff
- **User Feedback**: Clear error messages and recovery options

## Future Enhancements

Planned improvements include:

- Real-time data synchronization with WebSockets
- Advanced caching strategies with dependency tracking
- Performance monitoring and optimization
- Enhanced mobile optimization features
- Automated tier upgrade system

## Contributing

When contributing to the unified seller interfaces:

1. Maintain backward compatibility
2. Add comprehensive tests for new features
3. Update transformation utilities for new fields
4. Document breaking changes in migration guides
5. Follow TypeScript strict mode requirements