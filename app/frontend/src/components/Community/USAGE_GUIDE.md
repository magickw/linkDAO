# Enhanced Community Components Usage Guide

This guide explains how to use the enhanced community components in your application.

## Installation and Setup

The enhanced components are already included in the project. No additional installation is required.

## Available Components

### 1. CommunityCardEnhanced
An enhanced version of the community card with improved styling, animations, and accessibility.

**Import:**
```tsx
import { CommunityCardEnhanced } from '@/components/Community';
```

**Usage:**
```tsx
<CommunityCardEnhanced
  community={communityData}
  onSelect={handleCommunitySelect}
  onJoin={handleJoinCommunity}
  showTrendingInfo={true}
  compact={false}
  isLoading={false}
/>
```

**Props:**
- `community` (Community): The community data to display
- `onSelect` (function): Callback when the card is clicked
- `onJoin` (function): Callback when the join button is clicked
- `showTrendingInfo` (boolean): Whether to show trending information
- `compact` (boolean): Whether to use compact layout
- `isLoading` (boolean): Whether to show loading skeleton

### 2. CommunityPostCardEnhanced
An enhanced version of the post card with better loading states and interactions.

**Import:**
```tsx
import { CommunityPostCardEnhanced } from '@/components/Community';
```

**Usage:**
```tsx
<CommunityPostCardEnhanced
  post={postData}
  community={communityData}
  userMembership={userMembership}
  onVote={handleVote}
  onReaction={handleReaction}
  onTip={handleTip}
  isLoading={false}
/>
```

**Props:**
- `post` (CommunityPost): The post data to display
- `community` (Community): The community the post belongs to
- `userMembership` (CommunityMembership | null): User's membership status
- `onVote` (function): Callback for voting actions
- `onReaction` (function): Callback for reaction actions
- `onTip` (function): Callback for tipping actions
- `isLoading` (boolean): Whether to show loading skeleton

### 3. VirtualFeedEnhanced
A virtualized feed component for better performance with large lists of posts.

**Import:**
```tsx
import { VirtualFeedEnhanced } from '@/components/Community';
```

**Usage:**
```tsx
<VirtualFeedEnhanced
  posts={posts}
  community={communityData}
  userMembership={userMembership}
  onVote={handleVote}
  height={600}
  itemHeight={300}
/>
```

**Props:**
- `posts` (CommunityPost[]): Array of posts to display
- `community` (Community): The community the posts belong to
- `userMembership` (CommunityMembership | null): User's membership status
- `onVote` (function): Callback for voting actions
- `height` (number): Height of the feed container
- `itemHeight` (number): Height of each post item

## Enhanced Pages

### Communities Enhanced Page
A complete enhanced communities page showcasing all the new components.

**Location:** `src/pages/communities-enhanced.tsx`

**Access:** Visit `/communities-enhanced` in your browser

### Community Enhanced Page
A complete enhanced community page with improved layout and interactions.

**Location:** `src/pages/dao/[community]-enhanced.tsx`

**Access:** Visit `/dao/[community-name]-enhanced` in your browser

## Migration from Legacy Components

### Before (Legacy)
```tsx
import CommunityCard from '@/components/Community/CommunityCard';
import CommunityPostCard from '@/components/CommunityPostCard';

<CommunityCard
  community={community}
  onSelect={handleSelect}
  onJoin={handleJoin}
/>

<CommunityPostCard
  post={post}
  community={community}
  userMembership={membership}
  onVote={handleVote}
/>
```

### After (Enhanced)
```tsx
import { CommunityCardEnhanced, CommunityPostCardEnhanced } from '@/components/Community';

<CommunityCardEnhanced
  community={community}
  onSelect={handleSelect}
  onJoin={handleJoin}
  showTrendingInfo={true}
/>

<CommunityPostCardEnhanced
  post={post}
  community={community}
  userMembership={membership}
  onVote={handleVote}
  onReaction={handleReaction}
  onTip={handleTip}
/>
```

## Styling Guidelines

### Color Palette
The enhanced components use a consistent color palette:
- Primary: `bg-primary-600` / `text-primary-600`
- Secondary: `bg-secondary-500` / `text-secondary-500`
- Success: `bg-green-500` / `text-green-500`
- Warning: `bg-yellow-500` / `text-yellow-500`
- Error: `bg-red-500` / `text-red-500`

### Spacing System
Consistent spacing using Tailwind classes:
- xs: `p-1`, `m-1`
- sm: `p-2`, `m-2`
- md: `p-4`, `m-4`
- lg: `p-6`, `m-6`
- xl: `p-8`, `m-8`

### Typography
Consistent typography hierarchy:
- Display: `text-3xl`, `text-4xl`
- Headings: `text-xl`, `text-2xl`
- Subheadings: `text-lg`
- Body: `text-base`
- Captions: `text-sm`, `text-xs`

## Accessibility Features

### ARIA Labels
All interactive elements have proper ARIA labels:
```tsx
<button 
  aria-label={isJoined ? "Leave community" : "Join community"}
  aria-pressed={isJoined}
>
  {isJoined ? 'Joined' : 'Join'}
</button>
```

### Keyboard Navigation
All components support keyboard navigation:
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

### Focus Management
Clear focus indicators:
```tsx
<button className="focus:outline-none focus:ring-2 focus:ring-primary-500">
  Click me
</button>
```

## Performance Optimization

### Virtualization
Large lists automatically use virtualization:
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

## Customization Options

### Compact Mode
Use compact mode for space-constrained layouts:
```tsx
<CommunityCardEnhanced
  community={community}
  compact={true}
/>
```

### Trending Information
Show additional trending information:
```tsx
<CommunityCardEnhanced
  community={community}
  showTrendingInfo={true}
/>
```

### Loading States
Show loading skeletons during data fetching:
```tsx
<CommunityPostCardEnhanced
  post={post}
  isLoading={true}
/>
```

## Best Practices

### 1. Use Enhanced Components
Always prefer the enhanced components over legacy versions for new development.

### 2. Consistent Styling
Follow the established color palette and spacing system for consistency.

### 3. Accessibility First
Ensure all interactive elements have proper ARIA labels and keyboard support.

### 4. Performance Optimization
Use VirtualFeedEnhanced for large lists of posts to improve performance.

### 5. Loading States
Always provide loading states for better user experience during data fetching.

### 6. Error Handling
Implement proper error handling with clear messaging and recovery options.

## Troubleshooting

### Common Issues

1. **Import Errors**: Make sure to use the correct import paths from `@/components/Community`

2. **TypeScript Errors**: Ensure all required props are provided to components

3. **Styling Issues**: Check that Tailwind CSS classes are correctly applied

4. **Accessibility Issues**: Verify ARIA labels and keyboard navigation support

### Getting Help

For issues with the enhanced components:
1. Check this usage guide for common patterns
2. Review the component documentation
3. Contact the frontend team for assistance

## Future Updates

The enhanced components will continue to evolve with:
- Additional customization options
- Improved performance optimizations
- Enhanced accessibility features
- Better internationalization support