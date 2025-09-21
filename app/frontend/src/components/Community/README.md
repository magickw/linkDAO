# Reddit-Style Community Components Documentation

This documentation covers all components used in the Reddit-style community redesign implementation.

## Table of Contents

1. [Overview](#overview)
2. [Core Components](#core-components)
3. [Layout Components](#layout-components)
4. [Post Components](#post-components)
5. [Sidebar Components](#sidebar-components)
6. [Interactive Components](#interactive-components)
7. [Mobile Components](#mobile-components)
8. [Usage Examples](#usage-examples)
9. [Styling Guidelines](#styling-guidelines)
10. [Accessibility](#accessibility)
11. [Performance Considerations](#performance-considerations)

## Overview

The Reddit-style community redesign transforms the traditional single-column layout into a familiar three-column Reddit-like interface. The implementation focuses on:

- **Responsive Design**: Mobile-first approach with progressive enhancement
- **Accessibility**: WCAG 2.1 AA compliance with full keyboard navigation
- **Performance**: Virtual scrolling, lazy loading, and optimized rendering
- **User Experience**: Smooth animations, intuitive interactions, and clear feedback

## Core Components

### CommunityView

The main container component that orchestrates the entire community page.

```tsx
import { CommunityView } from '@/components/Community/CommunityView';

<CommunityView 
  communityId="example-community"
  initialSort="hot"
  initialViewMode="card"
/>
```

**Props:**
- `communityId: string` - Unique identifier for the community
- `initialSort?: SortOption` - Initial sorting option (default: 'hot')
- `initialViewMode?: 'card' | 'compact'` - Initial view mode (default: 'card')

**Features:**
- Three-column responsive layout
- State management for posts, filters, and preferences
- Error boundary integration
- Loading state management

### CommunityHeader

Displays community branding and key information.

```tsx
import { CommunityHeader } from '@/components/Community/CommunityHeader';

<CommunityHeader
  community={communityData}
  isJoined={false}
  onJoinToggle={handleJoinToggle}
  canModerate={false}
/>
```

**Props:**
- `community: Community` - Community data object
- `isJoined: boolean` - User's membership status
- `onJoinToggle: () => void` - Join/leave handler
- `canModerate?: boolean` - Moderator permissions (default: false)
- `onBannerUpload?: (file: File) => void` - Banner upload handler

**Features:**
- Responsive banner with fallback gradient
- Member count and online status
- Join/Leave functionality
- Moderator banner upload

## Layout Components

### CommunityLayout

Responsive three-column grid layout container.

```tsx
import { CommunityLayout } from '@/components/Community/CommunityLayout';

<CommunityLayout>
  <CommunityLayout.LeftSidebar>
    {/* Navigation and filters */}
  </CommunityLayout.LeftSidebar>
  
  <CommunityLayout.MainContent>
    {/* Posts and content */}
  </CommunityLayout.MainContent>
  
  <CommunityLayout.RightSidebar>
    {/* Community info widgets */}
  </CommunityLayout.RightSidebar>
</CommunityLayout>
```

**Responsive Behavior:**
- **Desktop (≥1024px)**: Three columns visible
- **Tablet (768px-1023px)**: Two columns (left sidebar collapsed)
- **Mobile (<768px)**: Single column with overlay sidebars

### PostList

Container for Reddit-style post cards with virtual scrolling.

```tsx
import { PostList } from '@/components/Community/PostList';

<PostList
  posts={posts}
  viewMode="card"
  onVote={handleVote}
  onSave={handleSave}
  onHide={handleHide}
  onReport={handleReport}
  loading={false}
  hasMore={true}
  onLoadMore={handleLoadMore}
/>
```

**Props:**
- `posts: Post[]` - Array of post objects
- `viewMode: 'card' | 'compact'` - Display mode
- `onVote: (postId: string, direction: 'up' | 'down') => void` - Vote handler
- `onSave: (postId: string) => void` - Save handler
- `onHide: (postId: string) => void` - Hide handler
- `onReport: (postId: string, reason: string) => void` - Report handler
- `loading?: boolean` - Loading state
- `hasMore?: boolean` - More posts available
- `onLoadMore?: () => void` - Load more handler

## Post Components

### RedditStylePostCard

Individual post card with Reddit-style layout and interactions.

```tsx
import { RedditStylePostCard } from '@/components/Community/RedditStylePostCard';

<RedditStylePostCard
  post={postData}
  viewMode="card"
  onVote={handleVote}
  onSave={handleSave}
  onHide={handleHide}
  onReport={handleReport}
  isPinned={false}
  showThumbnail={true}
/>
```

**Props:**
- `post: Post` - Post data object
- `viewMode: 'card' | 'compact'` - Display mode
- `onVote: (direction: 'up' | 'down') => void` - Vote handler
- `onSave: () => void` - Save handler
- `onHide: () => void` - Hide handler
- `onReport: () => void` - Report handler
- `isPinned?: boolean` - Pinned status
- `showThumbnail?: boolean` - Show thumbnail (default: true)

**Features:**
- Left-side voting arrows with score display
- Thumbnail generation for media content
- Post flair with customizable styling
- Metadata display (author, time, awards)
- Quick action buttons on hover
- Comment preview with expand/collapse
- Mobile swipe gesture support

### PostMetadata

Displays comprehensive post metadata information.

```tsx
import { PostMetadata } from '@/components/Community/PostMetadata';

<PostMetadata
  post={postData}
  showAwards={true}
  showCrosspost={true}
  compact={false}
/>
```

**Props:**
- `post: Post` - Post data object
- `showAwards?: boolean` - Display awards (default: true)
- `showCrosspost?: boolean` - Show crosspost info (default: true)
- `compact?: boolean` - Compact display mode (default: false)

## Sidebar Components

### AboutCommunityWidget

Displays community information and rules.

```tsx
import { AboutCommunityWidget } from '@/components/Community/AboutCommunityWidget';

<AboutCommunityWidget
  community={communityData}
  stats={communityStats}
  rules={communityRules}
  canEdit={false}
  onEdit={handleEdit}
/>
```

**Props:**
- `community: Community` - Community data
- `stats: CommunityStats` - Community statistics
- `rules: CommunityRule[]` - Community rules
- `canEdit?: boolean` - Edit permissions
- `onEdit?: () => void` - Edit handler

**Features:**
- Community description with markdown support
- Creation date and member milestones
- Expandable rules section
- Edit functionality for moderators

### CommunityStatsWidget

Real-time community statistics display.

```tsx
import { CommunityStatsWidget } from '@/components/Community/CommunityStatsWidget';

<CommunityStatsWidget
  stats={statsData}
  loading={false}
  error={null}
/>
```

**Props:**
- `stats: CommunityStats` - Statistics data
- `loading?: boolean` - Loading state
- `error?: string | null` - Error message

**Features:**
- Real-time member count and online status
- Weekly activity metrics
- Growth indicators
- Fallback for unavailable data

### ModeratorListWidget

Displays community moderators with roles and status.

```tsx
import { ModeratorListWidget } from '@/components/Community/ModeratorListWidget';

<ModeratorListWidget
  moderators={moderatorList}
  loading={false}
/>
```

**Props:**
- `moderators: Moderator[]` - Moderator list
- `loading?: boolean` - Loading state

**Features:**
- Moderator usernames and roles
- Special badges for different roles
- Last active time for offline moderators
- Role hierarchy display

### GovernanceWidget

Web3 governance integration with proposal display.

```tsx
import { GovernanceWidget } from '@/components/Community/GovernanceWidget';

<GovernanceWidget
  activeProposals={proposals}
  userVotingPower={votingPower}
  participationRate={participationRate}
  onVote={handleVote}
/>
```

**Props:**
- `activeProposals: Proposal[]` - Active governance proposals
- `userVotingPower: number` - User's voting weight
- `participationRate: number` - Current participation rate
- `onVote: (proposalId: string, choice: VoteChoice) => void` - Vote handler

**Features:**
- Active proposal cards with voting status
- Participation rate visualization
- User voting power indicator
- Quick vote buttons
- Proposal deadline countdown

### RelatedCommunitiesWidget

Community discovery and recommendations.

```tsx
import { RelatedCommunitiesWidget } from '@/components/Community/RelatedCommunitiesWidget';

<RelatedCommunitiesWidget
  relatedCommunities={relatedList}
  onJoin={handleJoin}
  loading={false}
/>
```

**Props:**
- `relatedCommunities: Community[]` - Related communities
- `onJoin: (communityId: string) => void` - Join handler
- `loading?: boolean` - Loading state

**Features:**
- Recommendation algorithm based on shared members
- Community name, member count, and join button
- Fallback to popular communities
- Join functionality

## Interactive Components

### PostSortingTabs

Reddit-style sorting options with time filters.

```tsx
import { PostSortingTabs } from '@/components/Community/PostSortingTabs';

<PostSortingTabs
  sortBy="hot"
  timeFilter="day"
  onSortChange={handleSortChange}
  onTimeFilterChange={handleTimeFilterChange}
  postCount={42}
/>
```

**Props:**
- `sortBy: SortOption` - Current sort option
- `timeFilter: TimeFilter` - Current time filter
- `onSortChange: (sort: SortOption) => void` - Sort change handler
- `onTimeFilterChange: (filter: TimeFilter) => void` - Time filter handler
- `postCount?: number` - Total post count

**Features:**
- Tabs for Best, Hot, New, Top, Rising, Controversial
- Time filter dropdown for Top sorting
- Active state styling
- Post count indicator

### FilterPanel

Advanced filtering options for post discovery.

```tsx
import { FilterPanel } from '@/components/Community/FilterPanel';

<FilterPanel
  availableFlairs={flairList}
  activeFilters={currentFilters}
  onFilterChange={handleFilterChange}
  onClearFilters={handleClearFilters}
/>
```

**Props:**
- `availableFlairs: Flair[]` - Available flair options
- `activeFilters: FilterState` - Current filter state
- `onFilterChange: (filters: FilterState) => void` - Filter change handler
- `onClearFilters: () => void` - Clear filters handler

**Features:**
- Flair filter checkboxes with color indicators
- Author search input
- Date range picker
- Content type filters
- Clear all filters button
- Filter state persistence

### ViewModeToggle

Toggle between card and compact view modes.

```tsx
import { ViewModeToggle } from '@/components/Community/ViewModeToggle';

<ViewModeToggle
  viewMode="card"
  onViewModeChange={handleViewModeChange}
/>
```

**Props:**
- `viewMode: 'card' | 'compact'` - Current view mode
- `onViewModeChange: (mode: 'card' | 'compact') => void` - Change handler

**Features:**
- Card/compact view toggle
- User preference persistence
- Smooth transition animations

### CommentPreviewSystem

Comment preview with expand/collapse functionality.

```tsx
import { CommentPreviewSystem } from '@/components/Community/CommentPreviewSystem';

<CommentPreviewSystem
  postId="post-123"
  topComment={topCommentData}
  commentCount={15}
  onExpand={handleExpand}
/>
```

**Props:**
- `postId: string` - Post identifier
- `topComment?: Comment` - Top comment data
- `commentCount: number` - Total comment count
- `onExpand: (postId: string) => void` - Expand handler

**Features:**
- Top comment snippet (100 character limit)
- Expand/collapse functionality
- "No comments yet" placeholder
- Full comment thread expansion

## Mobile Components

### MobileSidebarManager

Mobile sidebar overlay management.

```tsx
import { MobileSidebarManager } from '@/components/Mobile/MobileSidebarManager';

<MobileSidebarManager
  isOpen={sidebarOpen}
  onToggle={handleSidebarToggle}
  side="left"
>
  {sidebarContent}
</MobileSidebarManager>
```

**Props:**
- `isOpen: boolean` - Sidebar open state
- `onToggle: () => void` - Toggle handler
- `side: 'left' | 'right'` - Sidebar position
- `children: React.ReactNode` - Sidebar content

**Features:**
- Overlay sidebar for mobile
- Smooth slide animations
- Focus management
- Touch-friendly interactions

### SwipeablePostCard

Mobile post card with swipe gesture support.

```tsx
import { SwipeablePostCard } from '@/components/Mobile/SwipeablePostCard';

<SwipeablePostCard
  post={postData}
  onSwipeLeft={handleSwipeLeft}
  onSwipeRight={handleSwipeRight}
  onVote={handleVote}
  onSave={handleSave}
/>
```

**Props:**
- `post: Post` - Post data
- `onSwipeLeft: (actions: SwipeAction[]) => void` - Left swipe handler
- `onSwipeRight: (actions: SwipeAction[]) => void` - Right swipe handler
- `onVote: (direction: 'up' | 'down') => void` - Vote handler
- `onSave: () => void` - Save handler

**Features:**
- Left swipe for voting actions
- Right swipe for save/share actions
- Haptic feedback simulation
- Fallback to tap interactions

## Usage Examples

### Basic Community Page Setup

```tsx
import React from 'react';
import { CommunityView } from '@/components/Community/CommunityView';

export default function CommunityPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <CommunityView 
        communityId={params.id}
        initialSort="hot"
        initialViewMode="card"
      />
    </div>
  );
}
```

### Custom Post Card Implementation

```tsx
import React from 'react';
import { RedditStylePostCard } from '@/components/Community/RedditStylePostCard';
import { usePostInteractions } from '@/hooks/usePostInteractions';

export function CustomPostCard({ post }: { post: Post }) {
  const { handleVote, handleSave, handleHide, handleReport } = usePostInteractions();

  return (
    <RedditStylePostCard
      post={post}
      viewMode="card"
      onVote={(direction) => handleVote(post.id, direction)}
      onSave={() => handleSave(post.id)}
      onHide={() => handleHide(post.id)}
      onReport={() => handleReport(post.id)}
      showThumbnail={true}
    />
  );
}
```

### Sidebar Widget Composition

```tsx
import React from 'react';
import { 
  AboutCommunityWidget,
  CommunityStatsWidget,
  ModeratorListWidget,
  GovernanceWidget,
  RelatedCommunitiesWidget 
} from '@/components/Community';

export function CommunitySidebar({ community, stats, moderators }: SidebarProps) {
  return (
    <div className="space-y-4">
      <AboutCommunityWidget
        community={community}
        stats={stats}
        rules={community.rules}
        canEdit={community.canModerate}
      />
      
      <CommunityStatsWidget
        stats={stats}
        loading={false}
      />
      
      <ModeratorListWidget
        moderators={moderators}
        loading={false}
      />
      
      <GovernanceWidget
        activeProposals={community.activeProposals}
        userVotingPower={community.userVotingPower}
        participationRate={community.participationRate}
        onVote={handleGovernanceVote}
      />
      
      <RelatedCommunitiesWidget
        relatedCommunities={community.relatedCommunities}
        onJoin={handleJoinCommunity}
      />
    </div>
  );
}
```

## Styling Guidelines

### CSS Classes

All components use consistent CSS class naming:

```css
/* Component base classes */
.reddit-style-post-card { /* Post card container */ }
.community-header { /* Header container */ }
.sidebar-widget { /* Widget container */ }

/* State classes */
.loading { /* Loading state */ }
.error { /* Error state */ }
.active { /* Active state */ }
.voted { /* Voted state */ }

/* Responsive classes */
.mobile-layout { /* Mobile layout */ }
.tablet-layout { /* Tablet layout */ }
.desktop-layout { /* Desktop layout */ }
```

### Theme Variables

```css
:root {
  --primary-color: #ff4500;
  --secondary-color: #0079d3;
  --background-color: #ffffff;
  --card-background: #ffffff;
  --border-color: #edeff1;
  --text-primary: #1c1c1c;
  --text-secondary: #7c7c7c;
  --vote-orange: #ff4500;
  --vote-blue: #0079d3;
}
```

### Dark Mode Support

```css
@media (prefers-color-scheme: dark) {
  :root {
    --background-color: #030303;
    --card-background: #1a1a1b;
    --border-color: #343536;
    --text-primary: #d7dadc;
    --text-secondary: #818384;
  }
}
```

## Accessibility

### ARIA Labels and Roles

```tsx
// Post card accessibility
<article 
  role="article"
  aria-label={`Post by ${post.author}: ${post.title}`}
  tabIndex={0}
>
  <button
    role="button"
    aria-label={`Upvote post. Current score: ${post.voteScore}`}
    aria-pressed={userVote === 'up'}
    tabIndex={0}
  >
    Upvote
  </button>
</article>
```

### Keyboard Navigation

- **Tab**: Navigate between interactive elements
- **Enter/Space**: Activate buttons and links
- **Arrow Keys**: Navigate within component groups
- **Escape**: Close modals and overlays

### Screen Reader Support

```tsx
// Live regions for dynamic content
<div aria-live="polite" aria-atomic="true">
  {voteScore} points
</div>

// Descriptive text for complex interactions
<span className="sr-only">
  Post has {commentCount} comments. Click to expand.
</span>
```

## Performance Considerations

### Virtual Scrolling

Large post lists use virtual scrolling to maintain performance:

```tsx
import { VirtualScrollContainer } from '@/components/Performance/VirtualScrollContainer';

<VirtualScrollContainer
  items={posts}
  itemHeight={200}
  renderItem={({ item, index }) => (
    <RedditStylePostCard key={item.id} post={item} />
  )}
/>
```

### Lazy Loading

Images and thumbnails are lazy loaded:

```tsx
<img
  src={post.thumbnail}
  alt={post.title}
  loading="lazy"
  onLoad={handleImageLoad}
  onError={handleImageError}
/>
```

### Memoization

Components use React.memo and useMemo for optimization:

```tsx
export const RedditStylePostCard = React.memo(({ post, ...props }) => {
  const memoizedMetadata = useMemo(() => 
    generatePostMetadata(post), [post.id, post.updatedAt]
  );

  return (
    // Component JSX
  );
});
```

### Bundle Splitting

Components are code-split for optimal loading:

```tsx
const GovernanceWidget = lazy(() => 
  import('@/components/Community/GovernanceWidget')
);

<Suspense fallback={<WidgetSkeleton />}>
  <GovernanceWidget {...props} />
</Suspense>
```

## Testing

### Unit Tests

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { RedditStylePostCard } from '@/components/Community/RedditStylePostCard';

test('should handle vote interaction', async () => {
  const mockVote = jest.fn();
  const post = createMockPost();

  render(
    <RedditStylePostCard 
      post={post} 
      onVote={mockVote}
      viewMode="card"
    />
  );

  const upvoteButton = screen.getByTestId('upvote-button');
  fireEvent.click(upvoteButton);

  expect(mockVote).toHaveBeenCalledWith('up');
});
```

### Integration Tests

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { CommunityView } from '@/components/Community/CommunityView';

test('should load community with posts and sidebar', async () => {
  render(<CommunityView communityId="test-community" />);

  await waitFor(() => {
    expect(screen.getByTestId('community-header')).toBeInTheDocument();
    expect(screen.getAllByTestId('reddit-style-post-card')).toHaveLength(5);
    expect(screen.getByTestId('about-community-widget')).toBeInTheDocument();
  });
});
```

This documentation provides comprehensive guidance for implementing and using the Reddit-style community components. For additional examples and advanced usage patterns, refer to the component source files and test suites.