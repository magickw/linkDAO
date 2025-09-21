# Accessibility Implementation for Reddit-Style Community Redesign

This document outlines the comprehensive accessibility features implemented for the Reddit-style community redesign components.

## Overview

All components have been enhanced with WCAG 2.1 AA compliance features including:

- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- Focus management
- High contrast and reduced motion support
- Touch target optimization

## Components

### AccessibilityProvider

The main provider component that wraps the application and provides accessibility context.

```tsx
import { AccessibilityProvider } from '@/components/Accessibility/AccessibilityProvider';

function App() {
  return (
    <AccessibilityProvider>
      {/* Your app content */}
    </AccessibilityProvider>
  );
}
```

### useAccessibility Hook

Core hook that provides accessibility utilities:

```tsx
const {
  announceToScreenReader,
  manageFocus,
  trapFocus,
  restoreFocus,
  isScreenReaderActive,
  prefersReducedMotion,
  keyboardNavigation
} = useAccessibility();
```

## Key Features

### 1. Screen Reader Support

- **Live Regions**: Automatic announcements for dynamic content changes
- **Descriptive Labels**: All interactive elements have meaningful aria-labels
- **Semantic HTML**: Proper use of headings, landmarks, and roles

```tsx
// Example: Vote button with screen reader support
<button
  aria-label={`${userVote === 'up' ? 'Remove upvote' : 'Upvote post'}`}
  aria-pressed={userVote === 'up'}
  onClick={() => handleVote('up')}
>
  <ChevronUp aria-hidden="true" />
</button>
```

### 2. Keyboard Navigation

All components support full keyboard navigation:

- **Tab Navigation**: Logical tab order through all interactive elements
- **Arrow Keys**: Navigation within tab lists and menus
- **Keyboard Shortcuts**: Quick actions (U for upvote, D for downvote, etc.)
- **Escape Key**: Close modals and menus

```tsx
// Example: Keyboard handler for post cards
const handleKeyDown = createKeyboardHandler({
  'Enter': () => onComment?.(post.id),
  'u': () => handleVote('up'),
  'd': () => handleVote('down'),
  's': () => handleSave(),
  'Escape': () => closeModals()
});
```

### 3. Focus Management

- **Focus Trapping**: Modal dialogs trap focus within their boundaries
- **Focus Restoration**: Focus returns to trigger element when modals close
- **Visible Focus Indicators**: Clear visual indication of focused elements
- **Skip Links**: Allow users to skip to main content

```tsx
// Example: Focus trap in modal
const cleanup = trapFocus(modalRef.current);
return () => {
  cleanup();
  restoreFocus();
};
```

### 4. ARIA Implementation

Comprehensive ARIA attributes for all interactive elements:

- **aria-expanded**: For collapsible content
- **aria-pressed**: For toggle buttons
- **aria-selected**: For tab navigation
- **aria-live**: For dynamic content updates
- **aria-describedby**: For additional context

### 5. Responsive Design

- **Touch Targets**: Minimum 44px touch targets for mobile
- **Responsive Text**: Scalable text that works with browser zoom
- **Flexible Layouts**: Components adapt to different screen sizes

## Testing

### Automated Testing

Run accessibility tests with:

```bash
npm run test:accessibility
```

Tests include:
- axe-core integration for automated WCAG compliance
- Keyboard navigation testing
- Screen reader announcement verification
- Focus management validation

### Manual Testing Checklist

- [ ] All interactive elements are keyboard accessible
- [ ] Screen reader announces all important changes
- [ ] Focus indicators are visible and clear
- [ ] Color contrast meets WCAG AA standards (4.5:1)
- [ ] Components work with browser zoom up to 200%
- [ ] Touch targets are at least 44px on mobile

### Screen Reader Testing

Test with popular screen readers:
- **NVDA** (Windows)
- **JAWS** (Windows)
- **VoiceOver** (macOS/iOS)
- **TalkBack** (Android)

## Browser Support

Accessibility features are supported in:
- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

## Performance Considerations

- **Reduced Motion**: Respects `prefers-reduced-motion` setting
- **High Contrast**: Adapts to `prefers-contrast: high`
- **Efficient Updates**: Debounced screen reader announcements
- **Lazy Loading**: Accessible image loading with proper alt text

## Common Patterns

### Post Card Accessibility

```tsx
<article
  role="article"
  aria-labelledby="post-title"
  aria-describedby="post-metadata post-actions"
  tabIndex={0}
  onKeyDown={handleKeyDown}
>
  <h2 id="post-title">{post.title}</h2>
  <div id="post-metadata">{/* metadata */}</div>
  <div id="post-actions" role="group" aria-label="Post actions">
    {/* action buttons */}
  </div>
</article>
```

### Tab Navigation

```tsx
<div role="tablist" aria-label="Sort posts by">
  {tabs.map((tab, index) => (
    <button
      key={tab.id}
      role="tab"
      aria-selected={activeTab === tab.id}
      aria-controls={`panel-${tab.id}`}
      tabIndex={activeTab === tab.id ? 0 : -1}
    >
      {tab.label}
    </button>
  ))}
</div>
```

### Modal Dialog

```tsx
<div
  role="dialog"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
  aria-modal="true"
>
  <h2 id="dialog-title">Dialog Title</h2>
  <p id="dialog-description">Dialog content</p>
  {/* focusable content */}
</div>
```

## Troubleshooting

### Common Issues

1. **Focus not visible**: Ensure focus indicators aren't removed by CSS
2. **Screen reader not announcing**: Check aria-live regions and labels
3. **Keyboard navigation broken**: Verify tabindex and event handlers
4. **Poor contrast**: Use accessibility color utilities

### Debug Tools

- **axe DevTools**: Browser extension for accessibility testing
- **Lighthouse**: Built-in Chrome accessibility audit
- **WAVE**: Web accessibility evaluation tool
- **Color Contrast Analyzers**: For checking color combinations

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

## Contributing

When adding new components or features:

1. Include accessibility from the start of development
2. Test with keyboard navigation
3. Verify screen reader compatibility
4. Add appropriate ARIA attributes
5. Include accessibility tests
6. Update this documentation

## Support

For accessibility questions or issues:
- Review the component documentation
- Check the test files for examples
- Consult WCAG guidelines
- Test with actual assistive technologies