# Migration Guide: Enhanced Community Components

This guide helps developers migrate from the existing community components to the enhanced versions with improved styling, accessibility, and performance.

## Table of Contents

1. [Overview](#overview)
2. [Component Migration](#component-migration)
   - [CommunityCard](#communitycard)
   - [CommunityPostCard](#communitypostcard)
   - [Loading States](#loading-states)
3. [Styling Updates](#styling-updates)
4. [Accessibility Improvements](#accessibility-improvements)
5. [Performance Enhancements](#performance-enhancements)
6. [Testing Updates](#testing-updates)

## Overview

The enhanced community components provide significant improvements over the existing ones:

- **Consistent Styling**: Unified Tailwind CSS approach
- **Better Accessibility**: Improved ARIA labels, keyboard navigation, and focus management
- **Enhanced Performance**: Virtualization for large feeds and optimized rendering
- **Improved Loading States**: Content-structured skeletons

## Component Migration

### CommunityCard

**Before:**
```tsx
import CommunityCard from '@/components/Community/CommunityCard';

<CommunityCard
  community={communityData}
  onSelect={handleSelect}
  onJoin={handleJoin}
/>
```

**After:**
```tsx
import { CommunityCardEnhanced } from '@/components/Community';

<CommunityCardEnhanced
  community={communityData}
  onSelect={handleSelect}
  onJoin={handleJoin}
  showTrendingInfo={true}
/>
```

**Key Changes:**
- Import path remains the same but component name changes
- Added `showTrendingInfo` prop for trending indicators
- Improved styling and accessibility
- Better responsive design

### CommunityPostCard

**Before:**
```tsx
import CommunityPostCard from '@/components/CommunityPostCard';

<CommunityPostCard
  post={postData}
  community={communityData}
  userMembership={membershipData}
  onVote={handleVote}
  onReaction={handleReaction}
  onTip={handleTip}
/>
```

**After:**
```tsx
import CommunityPostCardEnhanced from '@/components/Community/CommunityPostCardEnhanced';

<CommunityPostCardEnhanced
  post={postData}
  community={communityData}
  userMembership={membershipData}
  onVote={handleVote}
  onReaction={handleReaction}
  onTip={handleTip}
/>
```

**Key Changes:**
- Component name changes to `CommunityPostCardEnhanced`
- Enhanced keyboard navigation support
- Improved ARIA labels and roles
- Better focus management
- Enhanced interaction controls

### Loading States

**Before:**
```tsx
// Custom loading implementations
<div className="animate-pulse">
  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
  // ... more skeleton elements
</div>
```

**After:**
```tsx
import { CommunityCardSkeleton, CommunityFeedSkeleton } from '@/components/Community';

// For community cards
<CommunityCardSkeleton />

// For community feeds
<CommunityFeedSkeleton postCount={5} />
```

**Key Changes:**
- Pre-built skeleton components
- Content-structured loading states
- Consistent styling with actual components
- Responsive design support

## Styling Updates

### Color Palette
The enhanced components use a consistent color palette based on Tailwind's default colors:

- Primary: Blue (`bg-blue-500`, `text-blue-600`)
- Secondary: Gray (`bg-gray-100`, `text-gray-600`)
- Success: Green (`bg-green-100`, `text-green-600`)
- Warning: Yellow (`bg-yellow-100`, `text-yellow-600`)
- Danger: Red (`bg-red-100`, `text-red-600`)

### Spacing
Consistent spacing using Tailwind's spacing scale:
- xs: `px-2 py-1`
- sm: `px-3 py-2`
- md: `px-4 py-3`
- lg: `px-6 py-4`

### Typography
- Headings: `font-bold`
- Body text: `font-normal`
- Captions: `text-sm`
- Labels: `text-xs`

## Accessibility Improvements

### ARIA Labels
All interactive elements have proper ARIA labels:
```tsx
<button 
  aria-label={isJoining ? "Joining community..." : "Join community"}
  aria-pressed={isJoined}
>
  {isJoining ? 'Joining...' : 'Join'}
</button>
```

### Keyboard Navigation
Enhanced keyboard navigation support:
- `Enter`/`Space`: Activate elements
- `Tab`: Navigate between interactive elements
- `Esc`: Close modals/popups

### Focus Management
Proper focus management with visible focus indicators:
```tsx
<button className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
  Click me
</button>
```

## Performance Enhancements

### Virtualization
For large feeds, the enhanced components use virtualization:
```tsx
// Automatically enabled for feeds with >50 posts
<InfiniteScrollFeed enableVirtualization={true} />
```

### Memoization
Expensive calculations are memoized:
```tsx
const Row = React.useMemo(() => ({ index, style }) => {
  // Render logic
}, [posts, onReaction, onTip]);
```

### Lazy Loading
Components are designed for lazy loading:
```tsx
const CommunityCardEnhanced = React.lazy(() => import('@/components/Community/CommunityCardEnhanced'));
```

## Testing Updates

### New Test Files
Enhanced components include comprehensive test coverage:
- `CommunityCardEnhanced.test.tsx`
- `CommunityPostCardEnhanced.test.tsx`

### Updated Test Commands
```bash
# Run enhanced component tests
npm test -- src/components/Community/__tests__/CommunityCardEnhanced.test.tsx
npm test -- src/components/Community/__tests__/CommunityPostCardEnhanced.test.tsx

# Run all community component tests
npm test -- src/components/Community
```

### Test Coverage
Enhanced tests cover:
- Component rendering
- User interactions
- Accessibility features
- Responsive behavior
- Edge cases

## Migration Checklist

- [ ] Update import statements for enhanced components
- [ ] Add `showTrendingInfo` prop to CommunityCardEnhanced
- [ ] Replace custom loading skeletons with CommunityLoadingSkeletons
- [ ] Verify accessibility improvements with screen readers
- [ ] Test keyboard navigation
- [ ] Check responsive design on all screen sizes
- [ ] Run updated test suites
- [ ] Update documentation references

## Support

For issues during migration, please:
1. Check the component documentation
2. Review the test files for usage examples
3. Contact the frontend team for assistance