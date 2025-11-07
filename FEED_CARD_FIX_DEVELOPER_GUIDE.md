# Feed Card Fix - Developer Guide

## Quick Reference

### Problem
Share modal was blocked by feed card container's `overflow-hidden` CSS, preventing users from accessing share options and commenting.

### Solution
Use React Portal to render modal at document root level, bypassing container constraints.

## Code Changes

### 1. Container Component (Web3SocialPostCard.tsx)

**Before:**
```tsx
return (
  <GestureHandler className="... overflow-hidden ...">
    {/* Content */}
  </GestureHandler>
);
```

**After:**
```tsx
return (
  <>
    <GestureHandler className="..."> {/* No overflow-hidden */}
      {/* Content */}
    </GestureHandler>
  </>
);
```

### 2. Modal Component (SharePostModal.tsx)

**Before:**
```tsx
export default function SharePostModal({ isOpen, onClose, post }) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50">
      {/* Modal content */}
    </div>
  );
}
```

**After:**
```tsx
import { createPortal } from 'react-dom';
import { useEffect } from 'react';

export default function SharePostModal({ isOpen, onClose, post }) {
  // Handle ESC key and body scroll
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal content */}
      </div>
    </div>
  );

  // Render at document root
  return typeof window !== 'undefined' 
    ? createPortal(modalContent, document.body)
    : null;
}
```

## Key Concepts

### React Portal
Portals provide a way to render children into a DOM node that exists outside the parent component's DOM hierarchy.

```tsx
import { createPortal } from 'react-dom';

// Render component at document.body instead of parent
createPortal(
  <YourComponent />,
  document.body
)
```

### Z-Index Stacking
```css
/* Recommended z-index hierarchy */
.page-content { z-index: auto; }
.sticky-header { z-index: 50; }
.dropdown { z-index: 100; }
.tooltip { z-index: 500; }
.modal { z-index: 9999; } /* Highest priority */
```

### Body Scroll Prevention
```tsx
useEffect(() => {
  if (isOpen) {
    // Prevent scroll
    document.body.style.overflow = 'hidden';
  }
  
  return () => {
    // Restore scroll
    document.body.style.overflow = 'unset';
  };
}, [isOpen]);
```

## Best Practices

### 1. Always Use Portal for Modals
```tsx
// ✅ Good - Modal at document root
const Modal = ({ isOpen, children }) => {
  if (!isOpen) return null;
  
  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      {children}
    </div>,
    document.body
  );
};

// ❌ Bad - Modal in component tree
const Modal = ({ isOpen, children }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50">
      {children}
    </div>
  );
};
```

### 2. Handle Keyboard Events
```tsx
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };
  
  if (isOpen) {
    document.addEventListener('keydown', handleEscape);
  }
  
  return () => {
    document.removeEventListener('keydown', handleEscape);
  };
}, [isOpen, onClose]);
```

### 3. Prevent Event Bubbling
```tsx
<div 
  className="modal-backdrop"
  onClick={onClose} // Close on backdrop click
>
  <div 
    className="modal-content"
    onClick={(e) => e.stopPropagation()} // Prevent close on content click
  >
    {/* Content */}
  </div>
</div>
```

### 4. Add ARIA Attributes
```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <h2 id="modal-title">Modal Title</h2>
  <p id="modal-description">Modal description</p>
</div>
```

### 5. SSR Compatibility
```tsx
// Check for window before using portal
return typeof window !== 'undefined' 
  ? createPortal(modalContent, document.body)
  : null;
```

## Common Pitfalls

### ❌ Don't: Use overflow-hidden on containers with modals
```tsx
// This will clip the modal
<div className="overflow-hidden">
  <Modal />
</div>
```

### ✅ Do: Remove overflow restrictions or use portal
```tsx
// Option 1: Remove overflow-hidden
<div>
  <Modal />
</div>

// Option 2: Use portal (recommended)
<div className="overflow-hidden">
  {/* Modal renders at document.body via portal */}
  <Modal />
</div>
```

### ❌ Don't: Forget to clean up event listeners
```tsx
useEffect(() => {
  document.addEventListener('keydown', handleEscape);
  // Missing cleanup!
}, []);
```

### ✅ Do: Always clean up in useEffect
```tsx
useEffect(() => {
  document.addEventListener('keydown', handleEscape);
  
  return () => {
    document.removeEventListener('keydown', handleEscape);
  };
}, []);
```

### ❌ Don't: Use low z-index for modals
```tsx
// Modal might be hidden behind other elements
<div className="fixed inset-0 z-10">
```

### ✅ Do: Use high z-index for modals
```tsx
// Modal appears above all content
<div className="fixed inset-0 z-[9999]">
```

## Testing

### Unit Tests
```tsx
import { render, screen, fireEvent } from '@testing-library/react';

test('modal renders at document root', () => {
  const { container } = render(<Modal isOpen={true} />);
  
  // Modal not in container
  expect(container.querySelector('[role="dialog"]')).toBeNull();
  
  // Modal in document.body
  expect(document.body.querySelector('[role="dialog"]')).toBeInTheDocument();
});

test('modal closes on ESC key', () => {
  const onClose = jest.fn();
  render(<Modal isOpen={true} onClose={onClose} />);
  
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalled();
});
```

### Integration Tests
```tsx
test('share modal appears above feed card', async () => {
  render(<FeedCard />);
  
  const shareButton = screen.getByText(/Share/i);
  fireEvent.click(shareButton);
  
  const modal = await screen.findByRole('dialog');
  expect(modal).toBeInTheDocument();
  expect(modal).toHaveClass('z-[9999]');
});
```

## Debugging

### Check Portal Rendering
```tsx
// Add console.log to verify portal usage
const modalContent = (
  <div>Modal Content</div>
);

console.log('Rendering modal via portal:', typeof window !== 'undefined');

return typeof window !== 'undefined' 
  ? createPortal(modalContent, document.body)
  : null;
```

### Inspect Z-Index Stacking
```javascript
// In browser console
const modal = document.querySelector('[role="dialog"]');
console.log('Modal z-index:', window.getComputedStyle(modal).zIndex);
```

### Check Event Listeners
```javascript
// In browser console
getEventListeners(document); // Chrome DevTools
```

## Performance Considerations

1. **Portal Overhead**: Minimal, React handles efficiently
2. **Event Listeners**: Clean up properly to avoid memory leaks
3. **Re-renders**: Only when modal state changes
4. **Body Scroll**: Toggle only when needed

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari 14+, Chrome Mobile 90+)

## Additional Resources

- [React Portal Documentation](https://react.dev/reference/react-dom/createPortal)
- [ARIA Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [Z-Index Best Practices](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Positioning/Understanding_z_index)
