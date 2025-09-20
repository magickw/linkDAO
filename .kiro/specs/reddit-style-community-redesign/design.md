# Design Document

## Overview

The Reddit-style community redesign transforms the existing single-column community page into a modern, three-column layout that mirrors Reddit's familiar interface. This design prioritizes content discoverability, community engagement, and mobile responsiveness while integrating Web3 governance features seamlessly.

## Architecture

### Component Hierarchy

```
CommunityPage
├── CommunityHeader
│   ├── CommunityBanner
│   ├── CommunityInfo
│   └── JoinButton
├── CommunityLayout
│   ├── LeftSidebar
│   │   ├── CommunityNavigation
│   │   ├── FilterPanel
│   │   └── QuickActions
│   ├── MainContent
│   │   ├── PostSortingTabs
│   │   ├── PinnedPostsSection
│   │   ├── PostList
│   │   │   └── RedditStylePostCard[]
│   │   └── InfiniteScrollLoader
│   └── RightSidebar
│       ├── AboutCommunityWidget
│       ├── CommunityStatsWidget
│       ├── ModeratorListWidget
│       ├── GovernanceWidget
│       ├── RelatedCommunitiesWidget
│       └── TrendingWidget
└── MobileNavigationOverlay
```

### State Management

```typescript
interface CommunityPageState {
  community: Community;
  posts: Post[];
  pinnedPosts: Post[];
  sortBy: SortOption;
  timeFilter: TimeFilter;
  activeFilters: FilterState;
  viewMode: 'card' | 'compact';
  sidebarCollapsed: boolean;
  loading: boolean;
  error: string | null;
}

interface FilterState {
  flair: string[];
  author: string[];
  timeRange: DateRange;
  contentType: ContentType[];
}
```

## Components and Interfaces

### 1. CommunityHeader Component

**Purpose:** Displays community branding and key information

**Props:**
```typescript
interface CommunityHeaderProps {
  community: Community;
  isJoined: boolean;
  onJoinToggle: () => void;
  onBannerUpload?: (file: File) => void;
  canModerate: boolean;
}
```

**Features:**
- Responsive banner image with fallback gradient
- Community avatar, name, and tagline
- Member count and online status
- Join/Leave button with loading states
- Banner upload for moderators

### 2. RedditStylePostCard Component

**Purpose:** Displays posts in Reddit-style format with voting and metadata

**Props:**
```typescript
interface RedditStylePostCardProps {
  post: Post;
  viewMode: 'card' | 'compact';
  showThumbnail: boolean;
  onVote: (direction: 'up' | 'down') => void;
  onSave: () => void;
  onHide: () => void;
  onReport: () => void;
  isPinned?: boolean;
}
```

**Features:**
- Left-side voting arrows with score display
- Thumbnail generation for links/images/videos
- Post flair with customizable colors
- Metadata bar (author, time, awards, crosspost info)
- Quick action buttons (save, hide, report, share)
- Comment preview with expand/collapse
- Swipe gesture support on mobile

### 3. PostSortingTabs Component

**Purpose:** Provides Reddit-style sorting and filtering options

**Props:**
```typescript
interface PostSortingTabsProps {
  sortBy: SortOption;
  timeFilter: TimeFilter;
  onSortChange: (sort: SortOption) => void;
  onTimeFilterChange: (filter: TimeFilter) => void;
  postCount: number;
}
```

**Features:**
- Tabs for Best, Hot, New, Top, Rising, Controversial
- Time filter dropdown for Top sorting
- Post count indicator
- Active state styling

### 4. AboutCommunityWidget Component

**Purpose:** Displays comprehensive community information

**Props:**
```typescript
interface AboutCommunityWidgetProps {
  community: Community;
  stats: CommunityStats;
  rules: CommunityRule[];
  canEdit: boolean;
  onEdit?: () => void;
}
```

**Features:**
- Community description with markdown support
- Creation date and member milestones
- Expandable rules section
- Community tags and categories
- Edit button for moderators

### 5. GovernanceWidget Component

**Purpose:** Highlights active governance proposals and voting

**Props:**
```typescript
interface GovernanceWidgetProps {
  activeProposals: Proposal[];
  userVotingPower: number;
  participationRate: number;
  onVote: (proposalId: string, choice: VoteChoice) => void;
}
```

**Features:**
- Active proposal cards with voting status
- Participation rate visualization
- User voting power indicator
- Quick vote buttons
- Proposal deadline countdown

### 6. FilterPanel Component

**Purpose:** Advanced filtering options for post discovery

**Props:**
```typescript
interface FilterPanelProps {
  availableFlairs: Flair[];
  activeFilters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onClearFilters: () => void;
}
```

**Features:**
- Flair filter checkboxes with color indicators
- Author search input
- Date range picker
- Content type filters
- Clear all filters button

## Data Models

### Community Model
```typescript
interface Community {
  id: string;
  name: string;
  displayName: string;
  description: string;
  bannerImage?: string;
  avatarImage?: string;
  memberCount: number;
  onlineCount: number;
  createdAt: Date;
  rules: CommunityRule[];
  flairs: Flair[];
  moderators: Moderator[];
  governanceToken?: string;
  isJoined: boolean;
  canModerate: boolean;
}
```

### Post Model Enhancement
```typescript
interface Post {
  id: string;
  title: string;
  content: string;
  author: User;
  community: Community;
  flair?: Flair;
  thumbnail?: string;
  linkUrl?: string;
  mediaType: 'text' | 'image' | 'video' | 'link';
  voteScore: number;
  userVote?: 'up' | 'down';
  commentCount: number;
  topComment?: Comment;
  awards: Award[];
  isPinned: boolean;
  isGovernanceProposal: boolean;
  createdAt: Date;
  crosspostInfo?: CrosspostInfo;
}
```

### Flair Model
```typescript
interface Flair {
  id: string;
  name: string;
  color: string;
  backgroundColor: string;
  textColor: string;
  description?: string;
  moderatorOnly: boolean;
}
```

## Error Handling

### Error Boundaries
- **PostCardErrorBoundary:** Isolates post rendering errors
- **SidebarErrorBoundary:** Handles widget loading failures
- **CommunityErrorBoundary:** Manages community data errors

### Error States
```typescript
interface ErrorState {
  type: 'network' | 'permission' | 'validation' | 'unknown';
  message: string;
  retryable: boolean;
  action?: () => void;
}
```

### Fallback Components
- **PostCardSkeleton:** Loading state for posts
- **SidebarWidgetSkeleton:** Loading state for sidebar widgets
- **ErrorMessage:** User-friendly error display with retry options

## Testing Strategy

### Unit Tests
- Component rendering with various props
- State management and data transformations
- Utility functions for sorting and filtering
- Vote handling and optimistic updates

### Integration Tests
- Post loading and infinite scroll
- Filter and sort interactions
- Mobile responsive behavior
- Governance integration workflows

### E2E Tests
- Complete user journey through community page
- Mobile swipe gestures and interactions
- Moderator actions and permissions
- Cross-browser compatibility

### Performance Tests
- Large post list rendering
- Image thumbnail loading
- Infinite scroll performance
- Mobile device performance

## Mobile Optimization

### Responsive Breakpoints
```css
/* Mobile First Approach */
.community-layout {
  /* Mobile: Single column */
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  /* Tablet: Two columns */
  .community-layout {
    grid-template-columns: 1fr 300px;
  }
}

@media (min-width: 1024px) {
  /* Desktop: Three columns */
  .community-layout {
    grid-template-columns: 250px 1fr 300px;
  }
}
```

### Touch Interactions
- **Swipe Gestures:** Left swipe for voting, right swipe for actions
- **Pull to Refresh:** Native-like refresh behavior
- **Touch Targets:** Minimum 44px touch targets for accessibility
- **Haptic Feedback:** Vibration feedback for actions

### Performance Optimizations
- **Virtual Scrolling:** For large post lists
- **Image Lazy Loading:** Progressive image loading
- **Code Splitting:** Route-based component splitting
- **Service Worker:** Offline support and caching

## Accessibility

### WCAG 2.1 AA Compliance
- **Keyboard Navigation:** Full keyboard accessibility
- **Screen Reader Support:** Proper ARIA labels and roles
- **Color Contrast:** 4.5:1 minimum contrast ratio
- **Focus Management:** Visible focus indicators

### Semantic HTML
```html
<main role="main" aria-label="Community posts">
  <section aria-label="Pinned posts">
    <h2>Pinned Posts</h2>
    <!-- Pinned posts -->
  </section>
  <section aria-label="Community posts">
    <h2>Posts</h2>
    <!-- Regular posts -->
  </section>
</main>

<aside role="complementary" aria-label="Community information">
  <!-- Sidebar widgets -->
</aside>
```

## Performance Considerations

### Optimization Strategies
- **React.memo:** Prevent unnecessary re-renders
- **useMemo/useCallback:** Memoize expensive calculations
- **Intersection Observer:** Efficient infinite scroll
- **Image Optimization:** WebP format with fallbacks

### Caching Strategy
- **Post Data:** 5-minute cache for post lists
- **Community Info:** 30-minute cache for community data
- **User Preferences:** Local storage for view settings
- **Images:** CDN caching with progressive loading

### Bundle Optimization
- **Tree Shaking:** Remove unused code
- **Dynamic Imports:** Load components on demand
- **Compression:** Gzip/Brotli compression
- **Critical CSS:** Inline critical styles

## Security Considerations

### Input Validation
- **XSS Prevention:** Sanitize user-generated content
- **CSRF Protection:** Token-based request validation
- **Rate Limiting:** Prevent spam and abuse
- **Content Filtering:** Automated moderation integration

### Permission System
```typescript
interface UserPermissions {
  canPost: boolean;
  canComment: boolean;
  canVote: boolean;
  canModerate: boolean;
  canPin: boolean;
  canManageFlairs: boolean;
}
```

### Data Privacy
- **GDPR Compliance:** User data handling
- **Cookie Consent:** Tracking preferences
- **Data Minimization:** Collect only necessary data
- **Audit Logging:** Track sensitive actions