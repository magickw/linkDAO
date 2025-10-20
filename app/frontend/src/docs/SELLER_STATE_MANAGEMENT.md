# Seller State Management with React Query

This document describes the centralized state management system for seller data using React Query, implemented as part of the seller integration consistency improvements.

## Overview

The seller state management system provides:
- **Centralized state management** with React Query
- **Unified API client** with consistent error handling
- **Cache invalidation strategies** with dependency tracking
- **Optimistic updates** for better user experience
- **Loading and error states** management
- **Query invalidation and refetching** strategies

## Architecture

### Core Components

1. **SellerQueryProvider** - React Query provider with seller-specific configuration
2. **SellerCacheManager** - Cache management with dependency tracking
3. **UnifiedSellerAPIClient** - Standardized API client with consistent endpoints
4. **useSellerCache hooks** - React Query hooks for specific data types
5. **useSellerState hooks** - High-level hooks for component consumption

### Data Flow

```
Component -> useSellerState -> useSellerCache -> UnifiedSellerAPIClient -> Backend API
                    ↓
              SellerCacheManager (cache invalidation, optimistic updates)
```

## Usage

### Basic Usage

```tsx
import { useSellerState } from '../hooks/useSellerState';

function SellerComponent() {
  const {
    profile,
    dashboardStats,
    listings,
    orders,
    notifications,
    isLoading,
    hasError,
    updateProfileData,
    createNewListing,
    refreshAllData
  } = useSellerState();

  if (isLoading) return <div>Loading...</div>;
  if (hasError) return <div>Error loading seller data</div>;

  return (
    <div>
      <h1>{profile?.displayName}</h1>
      <p>Active Listings: {listings.length}</p>
      <p>Pending Orders: {orders.filter(o => o.status === 'pending').length}</p>
    </div>
  );
}
```

### Specific Data Hooks

```tsx
import { useSellerProfileState, useSellerListingsState } from '../hooks/useSellerState';

// Profile-specific hook
function ProfileComponent() {
  const {
    profile,
    isLoading,
    updateProfileData,
    isUpdating
  } = useSellerProfileState();

  const handleUpdate = async () => {
    await updateProfileData({
      displayName: 'New Name',
      bio: 'Updated bio'
    });
  };

  return (
    <div>
      <h1>{profile?.displayName}</h1>
      <button onClick={handleUpdate} disabled={isUpdating}>
        Update Profile
      </button>
    </div>
  );
}

// Listings-specific hook
function ListingsComponent() {
  const {
    listings,
    activeListings,
    createNewListing,
    updateExistingListing,
    removeListingById,
    isCreatingListing
  } = useSellerListingsState();

  return (
    <div>
      <h2>Listings ({activeListings.length} active)</h2>
      {listings.map(listing => (
        <div key={listing.id}>
          <h3>{listing.title}</h3>
          <button onClick={() => updateExistingListing(listing.id, { title: 'Updated' })}>
            Update
          </button>
          <button onClick={() => removeListingById(listing.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
```

## Cache Management

### Automatic Cache Invalidation

The system automatically invalidates related caches when data changes:

- **Profile updates** → Invalidates dashboard, store, listings
- **Listing changes** → Invalidates dashboard, store
- **Order updates** → Invalidates dashboard

### Manual Cache Management

```tsx
import { useSellerCacheManager } from '../hooks/useSellerCache';

function CacheManagementComponent() {
  const {
    invalidateAll,
    clearAll,
    warmCache,
    getCacheStats,
    batchInvalidate
  } = useSellerCacheManager();

  const handleRefresh = async () => {
    await invalidateAll(); // Invalidate all seller caches
  };

  const handleClearCache = async () => {
    await clearAll(); // Clear all seller caches
  };

  const handleWarmCache = async () => {
    await warmCache(['profile', 'dashboard']); // Prefetch specific data
  };

  return (
    <div>
      <button onClick={handleRefresh}>Refresh All</button>
      <button onClick={handleClearCache}>Clear Cache</button>
      <button onClick={handleWarmCache}>Warm Cache</button>
    </div>
  );
}
```

### Cache Status Monitoring

```tsx
function CacheStatusComponent() {
  const { cacheStatus, getCacheStats } = useSellerState();
  const stats = getCacheStats();

  return (
    <div>
      <h3>Cache Status</h3>
      <p>Profile: {cacheStatus.profile ? 'Valid' : 'Invalid'}</p>
      <p>Dashboard: {cacheStatus.dashboard ? 'Valid' : 'Invalid'}</p>
      <p>Listings: {cacheStatus.listings ? 'Valid' : 'Invalid'}</p>
      
      <h3>Cache Statistics</h3>
      <p>Total Entries: {stats?.totalEntries}</p>
      <p>Queue Size: {stats?.queueSize}</p>
    </div>
  );
}
```

## Error Handling

### Unified Error Types

```tsx
enum SellerErrorType {
  API_ERROR = 'API_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
}

class SellerAPIError extends Error {
  constructor(
    public type: SellerErrorType,
    public message: string,
    public code?: string,
    public details?: any,
    public status?: number
  ) {
    super(message);
  }
}
```

### Error Recovery

```tsx
function ErrorHandlingComponent() {
  const {
    profile,
    profileError,
    refreshAllData
  } = useSellerState();

  if (profileError) {
    return (
      <div className="error-container">
        <h3>Error Loading Profile</h3>
        <p>{profileError.message}</p>
        <button onClick={refreshAllData}>
          Try Again
        </button>
      </div>
    );
  }

  return <div>{/* Normal content */}</div>;
}
```

## Optimistic Updates

The system supports optimistic updates for better user experience:

```tsx
// Profile updates are optimistic
const updateProfile = useMutation({
  mutationFn: async (updates) => {
    return await unifiedSellerAPIClient.updateProfile(walletAddress, updates);
  },
  onMutate: async (updates) => {
    // Optimistic update - UI updates immediately
    const optimisticData = { ...currentProfile, ...updates };
    queryClient.setQueryData(queryKey, optimisticData);
  },
  onSuccess: (data) => {
    // Update with real data from server
    queryClient.setQueryData(queryKey, data);
  },
  onError: (error, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(queryKey, context.previousProfile);
  }
});
```

## Performance Optimizations

### Intelligent Caching

- **Stale time**: 5 minutes for most data
- **Cache time**: 10 minutes
- **Retry logic**: 2 retries with exponential backoff
- **Dependency tracking**: Automatic invalidation of related data

### Query Deduplication

React Query automatically deduplicates identical queries, preventing unnecessary API calls.

### Background Refetching

Data is refetched in the background when it becomes stale, ensuring fresh data without loading states.

## Integration with Existing Code

### Migration from Legacy Hooks

The new system is backward compatible with existing `useSeller` hooks:

```tsx
// Old way (still works)
import { useSeller } from '../hooks/useSeller';

// New way (recommended)
import { useSellerState } from '../hooks/useSellerState';
```

### Provider Setup

Ensure the `SellerQueryProvider` is included in your app:

```tsx
// pages/_app.tsx
import { SellerQueryProvider } from '../providers/SellerQueryProvider';

export default function App({ Component, pageProps }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SellerQueryProvider queryClient={queryClient}>
        <Component {...pageProps} />
      </SellerQueryProvider>
    </QueryClientProvider>
  );
}
```

## Testing

### Test Setup

```tsx
import { renderHook } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { SellerQueryProvider } from '../providers/SellerQueryProvider';

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }) => (
    <SellerQueryProvider queryClient={client}>
      {children}
    </SellerQueryProvider>
  );
};

test('should fetch seller profile', async () => {
  const { result } = renderHook(() => useSellerState(), {
    wrapper: createWrapper(),
  });

  await waitFor(() => {
    expect(result.current.profile).toBeDefined();
  });
});
```

## Best Practices

1. **Use specific hooks** when you only need certain data types
2. **Handle loading and error states** appropriately
3. **Leverage optimistic updates** for better UX
4. **Monitor cache performance** in development
5. **Use cache invalidation** strategically
6. **Test with React Query DevTools** in development

## Troubleshooting

### Common Issues

1. **Stale data**: Check cache invalidation strategies
2. **Performance issues**: Monitor cache statistics
3. **Error handling**: Ensure proper error boundaries
4. **Memory leaks**: Verify cleanup in useEffect hooks

### Debug Tools

- React Query DevTools (development only)
- Cache statistics monitoring
- Error logging and tracking
- Performance monitoring

## Future Enhancements

- Real-time updates with WebSocket integration
- Advanced analytics and performance insights
- Automated tier upgrade system
- Enhanced security measures
- Mobile optimization improvements