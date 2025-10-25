# Migration Guide: Enhanced Community Components

This guide explains how to migrate from the legacy community components to the enhanced versions.

## Benefits of Migration

1. **Improved Performance**: Virtualization and optimized rendering
2. **Better Accessibility**: Enhanced ARIA labels and keyboard navigation
3. **Consistent Styling**: Unified Tailwind CSS approach
4. **Enhanced UX**: Better loading states and animations
5. **Modern Features**: New interaction patterns and visual enhancements

## Component Migration

### CommunityCard → CommunityCardEnhanced

#### Before (Legacy)
```tsx
import CommunityCard from '@/components/Community/CommunityCard';

<CommunityCard
  community={community}
  onSelect={handleSelect}
  onJoin={handleJoin}
/>
```

#### After (Enhanced)
```tsx
import { CommunityCardEnhanced } from '@/components/Community';

<CommunityCardEnhanced
  community={community}
  onSelect={handleSelect}
  onJoin={handleJoin}
  showTrendingInfo={true}
/>
```

**Key Changes:**
- Import path changed to use named export
- Added `showTrendingInfo` prop for additional information
- Improved loading states with `isLoading` prop
- Better accessibility with ARIA labels

### CommunityPostCard → CommunityPostCardEnhanced

#### Before (Legacy)
```tsx
import CommunityPostCard from '@/components/CommunityPostCard';

<CommunityPostCard
  post={post}
  community={community}
  userMembership={membership}
  onVote={handleVote}
/>
```

#### After (Enhanced)
```tsx
import { CommunityPostCardEnhanced } from '@/components/Community';

<CommunityPostCardEnhanced
  post={post}
  community={community}
  userMembership={membership}
  onVote={handleVote}
  onReaction={handleReaction}
  onTip={handleTip}
/>
```

**Key Changes:**
- Import path changed to use named export
- Added `onReaction` and `onTip` props for enhanced interactions
- Improved loading states with `isLoading` prop
- Better accessibility with ARIA labels
- Enhanced animations and transitions

### Virtual Feed Implementation

#### Before (Legacy)
```tsx
// Simple list rendering
{posts.map(post => (
  <CommunityPostCard
    key={post.id}
    post={post}
    community={community}
    userMembership={membership}
    onVote={handleVote}
  />
))}
```

#### After (Enhanced)
```tsx
import { VirtualFeedEnhanced } from '@/components/Community';

<VirtualFeedEnhanced
  posts={posts}
  community={community}
  userMembership={membership}
  onVote={handleVote}
  height={600}
  itemHeight={300}
/>
```

**Key Changes:**
- Replaced list rendering with virtualized feed
- Added performance optimization for large datasets
- Configurable height and item sizing
- Automatic fallback to normal rendering for small lists

## Styling Updates

### Tailwind CSS Classes
The enhanced components use a consistent Tailwind CSS approach:

#### Before
```tsx
<div className="community-card">
  <div className="card-content">
    <!-- Content -->
  </div>
</div>
```

#### After
```tsx
<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
  <div className="p-4">
    <!-- Content -->
  </div>
</div>
```

### Color Palette
Updated to use consistent color variables:

- Primary: `bg-primary-600` / `text-primary-600`
- Secondary: `bg-secondary-500` / `text-secondary-500`
- Success: `bg-green-500` / `text-green-500`
- Warning: `bg-yellow-500` / `text-yellow-500`
- Error: `bg-red-500` / `text-red-500`

## Accessibility Improvements

### ARIA Labels
Enhanced components include proper ARIA labels:

```tsx
<button 
  aria-label={isJoined ? "Leave community" : "Join community"}
  aria-pressed={isJoined}
>
  {isJoined ? 'Joined' : 'Join'}
</button>
```

### Keyboard Navigation
All interactive elements support keyboard navigation:

```tsx
<div 
  tabIndex={0}
  onKeyDown={(e) => e.key === 'Enter' && handleAction()}
  role="button"
  aria-label="Interactive element"
>
  <!-- Content -->
</div>
```

## Performance Optimizations

### Virtualization
Large lists now use virtualization:

```tsx
// Automatically switches based on list size
// < 3 items: Normal rendering
// >= 3 items: Virtualized rendering
<VirtualFeedEnhanced posts={posts} {...props} />
```

### Loading States
Enhanced skeleton loading:

```tsx
<CommunityCardEnhanced
  community={community}
  isLoading={true}
/>
```

## Migration Steps

1. **Update Imports**
   ```tsx
   // Before
   import CommunityCard from '@/components/Community/CommunityCard';
   
   // After
   import { CommunityCardEnhanced } from '@/components/Community';
   ```

2. **Update Props**
   - Add new props where applicable
   - Remove deprecated props
   - Update callback signatures

3. **Test Accessibility**
   - Verify keyboard navigation
   - Check screen reader compatibility
   - Validate color contrast

4. **Performance Testing**
   - Test with large datasets
   - Verify loading states
   - Check mobile responsiveness

## Backward Compatibility

Legacy components remain available for backward compatibility:

```tsx
// Still works
import CommunityCard from '@/components/Community/CommunityCard';
```

However, we recommend migrating to the enhanced versions for better performance and user experience.

## Support

For issues during migration, please:
1. Check this guide for common migration patterns
2. Review the component documentation
3. Contact the frontend team for assistance