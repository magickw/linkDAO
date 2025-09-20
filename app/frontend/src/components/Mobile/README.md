# Mobile Optimizations

This directory contains mobile-optimized components and utilities for the enhanced social dashboard. All components are designed with touch-first interactions, performance optimizations, and accessibility in mind.

## Components

### Core Mobile Components

#### `MobileEnhancedPostComposer`
Touch-friendly post creation interface with:
- Swipe-to-close gesture
- Content type tabs (Text, Media, Link, Poll, Proposal)
- Drag & drop media upload
- Auto-resizing textarea
- Keyboard-aware layout
- Haptic feedback on interactions

```tsx
import { MobileEnhancedPostComposer } from '@/components/Mobile';

<MobileEnhancedPostComposer
  isOpen={showComposer}
  onClose={() => setShowComposer(false)}
  onSubmit={(content) => handlePostSubmit(content)}
  communityId="optional-community-id"
/>
```

#### `MobileTokenReactionSystem`
Touch-optimized token-based reactions with:
- Touch-friendly reaction buttons (44px+ touch targets)
- Long press for reaction picker
- Haptic feedback on interactions
- Smooth animations and transitions
- Token amount indicators

```tsx
import { MobileTokenReactionSystem } from '@/components/Mobile';

<MobileTokenReactionSystem
  postId="post-123"
  reactions={reactions}
  onReact={(type, amount) => handleReaction(type, amount)}
  onViewReactors={(type) => showReactors(type)}
/>
```

#### `MobileEnhancedPostCard`
Mobile-optimized post display with:
- Swipe gestures (left to bookmark, right to like)
- Touch-optimized interaction areas
- Expandable content with "show more/less"
- Inline media previews
- Social proof indicators

```tsx
import { MobileEnhancedPostCard } from '@/components/Mobile';

<MobileEnhancedPostCard
  post={post}
  onReact={handleReaction}
  onComment={handleComment}
  onShare={handleShare}
  onBookmark={handleBookmark}
  onViewReactors={handleViewReactors}
  onUserPress={handleUserPress}
/>
```

#### `MobileModal`
Touch-friendly modal with:
- Swipe-to-close gesture
- Safe area support
- Keyboard-aware positioning
- Multiple sizes and positions
- Backdrop close prevention option

```tsx
import { MobileModal } from '@/components/Mobile';

<MobileModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Modal Title"
  size="md"
  position="bottom"
  allowSwipeClose={true}
>
  <div>Modal content</div>
</MobileModal>
```

#### `MobileVirtualScrolling`
High-performance virtual scrolling with:
- Pull-to-refresh support
- Infinite scroll
- Hardware acceleration
- Memory optimization
- Loading states

```tsx
import { MobileVirtualScrolling } from '@/components/Mobile';

<MobileVirtualScrolling
  items={virtualItems}
  renderItem={(item, index) => <PostCard key={item.id} post={item.data} />}
  itemHeight={300}
  onEndReached={loadMore}
  onRefresh={refresh}
  refreshing={isRefreshing}
/>
```

#### `MobileEnhancedFeed`
Complete mobile feed experience with:
- Virtual scrolling for performance
- Pull-to-refresh
- Floating action button
- Search and filters
- Sort tabs (Hot, New, Top, Rising)

```tsx
import { MobileEnhancedFeed } from '@/components/Mobile';

<MobileEnhancedFeed
  posts={posts}
  onLoadMore={loadMore}
  onRefresh={refresh}
  onPostCreate={createPost}
  onPostReact={reactToPost}
  // ... other handlers
/>
```

## Hooks

### `useMobileOptimization`
Core mobile optimization hook providing:
- Device detection (mobile, touch)
- Haptic feedback utilities
- Touch gesture handlers
- Safe area insets
- Keyboard visibility detection
- Touch target optimization

```tsx
import { useMobileOptimization } from '@/hooks/useMobileOptimization';

const {
  isMobile,
  isTouch,
  triggerHapticFeedback,
  safeAreaInsets,
  isKeyboardVisible,
  createSwipeHandler,
  touchTargetClasses,
  mobileOptimizedClasses
} = useMobileOptimization();
```

### `useMobileAccessibility`
Mobile accessibility enhancements:
- Screen reader optimizations
- High contrast mode support
- Reduced motion preferences
- Large text support
- Focus management
- Voice control support

```tsx
import { useMobileAccessibility } from '@/hooks/useMobileAccessibility';

const {
  announceToScreenReader,
  manageFocus,
  enhanceTouchTargets,
  applyHighContrastMode,
  accessibilityClasses
} = useMobileAccessibility();
```

## CSS Classes

### Touch Optimization
```css
.touch-manipulation /* Optimizes touch interactions */
.touch-target /* Ensures 44px minimum touch target */
.touch-target-large /* 56px touch target for important actions */
```

### Performance
```css
.hardware-accelerated /* Enables GPU acceleration */
.mobile-scroll /* Optimized scrolling for mobile */
.mobile-optimized /* General mobile optimizations */
```

### Safe Areas
```css
.safe-area-top /* Padding for top safe area */
.safe-area-bottom /* Padding for bottom safe area */
.safe-area-insets /* All safe area padding */
.pb-safe /* Bottom safe area padding */
.pt-safe /* Top safe area padding */
```

### Mobile-Specific Styling
```css
.mobile-glass /* Glassmorphism effect */
.mobile-focus-ring /* Touch-friendly focus indicators */
.mobile-skeleton /* Loading skeleton animation */
.mobile-bounce /* Touch feedback animation */
```

## Features

### Touch Interactions
- **Minimum Touch Targets**: All interactive elements are at least 44px
- **Haptic Feedback**: Vibration feedback for interactions
- **Swipe Gestures**: Left/right swipes for quick actions
- **Long Press**: Extended press for additional options
- **Pull-to-Refresh**: Standard mobile refresh pattern

### Performance Optimizations
- **Virtual Scrolling**: Handles large lists efficiently
- **Hardware Acceleration**: GPU-accelerated animations
- **Lazy Loading**: Images and content load on demand
- **Memory Management**: Proper cleanup of event listeners
- **Bundle Optimization**: Code splitting for mobile-specific features

### Accessibility
- **Screen Reader Support**: Proper ARIA labels and announcements
- **High Contrast Mode**: Automatic detection and support
- **Reduced Motion**: Respects user motion preferences
- **Large Text Support**: Scales with user text size preferences
- **Keyboard Navigation**: Full keyboard accessibility
- **Focus Management**: Proper focus handling for modals and navigation

### Responsive Design
- **Breakpoint Detection**: Automatic mobile/desktop switching
- **Orientation Support**: Portrait and landscape optimizations
- **Safe Area Support**: iPhone X+ notch and home indicator support
- **Keyboard Awareness**: Layout adjusts when keyboard is visible

## Testing

### Unit Tests
```bash
npm test -- --testPathPatterns="Mobile"
```

### Integration Tests
```bash
npm run test:integration
```

### Accessibility Tests
```bash
npm run test:accessibility
```

### Manual Testing Checklist

#### Touch Interactions
- [ ] All buttons are at least 44px touch targets
- [ ] Swipe gestures work smoothly
- [ ] Long press triggers haptic feedback
- [ ] Pull-to-refresh functions correctly
- [ ] Double-tap interactions work

#### Performance
- [ ] Smooth 60fps scrolling
- [ ] No janky animations
- [ ] Quick response to touch
- [ ] Efficient memory usage
- [ ] Fast initial load

#### Accessibility
- [ ] Screen reader announces content changes
- [ ] High contrast mode works
- [ ] Reduced motion is respected
- [ ] Keyboard navigation works
- [ ] Focus indicators are visible

#### Device Compatibility
- [ ] Works on iOS Safari
- [ ] Works on Android Chrome
- [ ] Handles different screen sizes
- [ ] Respects safe areas
- [ ] Keyboard doesn't break layout

## Browser Support

### Mobile Browsers
- **iOS Safari**: 14.0+
- **Android Chrome**: 90+
- **Samsung Internet**: 14.0+
- **Firefox Mobile**: 90+

### Features Used
- **CSS**: `env()` for safe areas, `backdrop-filter` for glassmorphism
- **JavaScript**: Touch events, Intersection Observer, ResizeObserver
- **APIs**: Vibration API, Visual Viewport API, matchMedia

## Performance Metrics

### Target Metrics
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms
- **Time to Interactive**: < 3.5s

### Optimization Techniques
- Virtual scrolling for large lists
- Image lazy loading with blur-to-sharp transitions
- Code splitting by route and feature
- Service worker caching
- Bundle size optimization

## Troubleshooting

### Common Issues

#### Touch Events Not Working
- Ensure `touch-action: manipulation` is applied
- Check for conflicting event listeners
- Verify touch target sizes are adequate

#### Performance Issues
- Check for memory leaks in event listeners
- Verify virtual scrolling is working
- Monitor bundle size and loading times

#### Accessibility Problems
- Test with actual screen readers
- Verify ARIA labels are present
- Check focus management in modals

#### Layout Issues
- Test on various device sizes
- Verify safe area support
- Check keyboard layout adjustments

### Debug Tools
- React DevTools for component inspection
- Chrome DevTools for performance profiling
- Lighthouse for accessibility and performance audits
- axe-core for accessibility testing

## Contributing

When adding new mobile components:

1. **Follow Touch Guidelines**: Ensure 44px minimum touch targets
2. **Add Haptic Feedback**: Use `triggerHapticFeedback()` for interactions
3. **Support Gestures**: Implement relevant swipe/long-press gestures
4. **Optimize Performance**: Use hardware acceleration and virtual scrolling
5. **Test Accessibility**: Verify screen reader and keyboard support
6. **Write Tests**: Include unit and integration tests
7. **Document Usage**: Update this README with new components

### Code Style
- Use TypeScript for all components
- Follow existing naming conventions
- Include proper prop types and documentation
- Add error boundaries for robustness
- Use consistent animation timing and easing