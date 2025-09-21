# Community Components

This directory contains components specifically designed for the Reddit-style community redesign feature.

## PostSortingTabs

A Reddit-style post sorting tabs component that provides comprehensive sorting and filtering options for community posts.

### Features

- **6 Sorting Options**: Best, Hot, New, Top, Rising, Controversial
- **Time Filters**: Hour, Day, Week, Month, Year, All Time (shown only for Top sorting)
- **Post Count Display**: Shows formatted post count with proper number formatting
- **Loading States**: Smooth transitions with loading indicators
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark Mode Support**: Full dark mode compatibility
- **Accessibility**: WCAG 2.1 AA compliant with proper ARIA labels
- **Custom Hook**: `usePostSorting` hook for easy state management

### Usage

#### Basic Usage

```tsx
import PostSortingTabs, { PostSortOption, TimeFilter } from '../components/Community/PostSortingTabs';

function CommunityPage() {
  const [sortBy, setSortBy] = useState(PostSortOption.BEST);
  const [timeFilter, setTimeFilter] = useState(TimeFilter.DAY);

  return (
    <PostSortingTabs
      sortBy={sortBy}
      timeFilter={timeFilter}
      onSortChange={setSortBy}
      onTimeFilterChange={setTimeFilter}
      postCount={1234}
    />
  );
}
```

#### Using the Hook

```tsx
import { usePostSorting } from '../components/Community/PostSortingTabs';

function CommunityPage() {
  const {
    sortBy,
    timeFilter,
    isLoading,
    handleSortChange,
    handleTimeFilterChange
  } = usePostSorting(PostSortOption.HOT, TimeFilter.WEEK);

  return (
    <PostSortingTabs
      sortBy={sortBy}
      timeFilter={timeFilter}
      onSortChange={handleSortChange}
      onTimeFilterChange={handleTimeFilterChange}
      postCount={5678}
    />
  );
}
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `sortBy` | `PostSortOption` | Yes | Current sorting option |
| `timeFilter` | `TimeFilter` | Yes | Current time filter |
| `onSortChange` | `(sort: PostSortOption) => void` | Yes | Callback when sort changes |
| `onTimeFilterChange` | `(filter: TimeFilter) => void` | Yes | Callback when time filter changes |
| `postCount` | `number` | No | Number of posts to display |
| `className` | `string` | No | Additional CSS classes |

### Enums

#### PostSortOption

```tsx
enum PostSortOption {
  BEST = 'best',
  HOT = 'hot',
  NEW = 'new',
  TOP = 'top',
  RISING = 'rising',
  CONTROVERSIAL = 'controversial'
}
```

#### TimeFilter

```tsx
enum TimeFilter {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
  ALL_TIME = 'all'
}
```

### Hook API

The `usePostSorting` hook provides:

```tsx
interface UsePostSortingReturn {
  sortBy: PostSortOption;
  timeFilter: TimeFilter;
  isLoading: boolean;
  handleSortChange: (sort: PostSortOption) => void;
  handleTimeFilterChange: (filter: TimeFilter) => void;
}
```

### Styling

The component uses Tailwind CSS classes and supports:

- Light and dark themes
- Responsive breakpoints
- Hover and focus states
- Loading states
- Active state indicators

### Accessibility

- Full keyboard navigation support
- Screen reader compatible with proper ARIA labels
- Focus management and visual indicators
- Semantic HTML structure
- Color contrast compliance

### Testing

The component includes comprehensive tests covering:

- Rendering all sorting options
- User interactions and state changes
- Time filter functionality
- Loading states and transitions
- Accessibility features
- Edge cases and error handling
- Hook functionality

Run tests with:

```bash
npm test -- --testPathPattern="PostSortingTabs.test.tsx"
```

### Requirements Compliance

This component fulfills the following requirements from the Reddit-style community redesign spec:

- **15.1**: Implements all Reddit-style sorting options (Best, Hot, New, Top, Rising, Controversial)
- **15.2**: Provides time filter dropdown for Top sorting with all required options
- **15.3**: Updates post list immediately without page reload through callback system
- **15.4**: Includes comprehensive test suite with 26 passing tests

### Demo

A test page is available at `/test-post-sorting-tabs` to demonstrate all features and configurations.