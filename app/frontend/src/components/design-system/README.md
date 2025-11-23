# Button Components

This directory contains the standardized button components for the LinkDAO application.

## Size Standardization

All button components now use consistent size values:

| Size | Description | Use Case |
|------|-------------|----------|
| `sm` | Small | Compact UI, secondary actions, inline buttons |
| `md` | Medium | Default size, most common use case |
| `lg` | Large | Primary CTAs, mobile-friendly touch targets |

## Available Button Components

### 1. design-system/Button
**Location**: `components/design-system/components/Button.tsx`

Basic button component with simple variants.

```tsx
import { Button } from '@/components/design-system/components/Button';

<Button size="md" variant="primary">Click me</Button>
```

**Variants**: `primary` | `outline` | `ghost`

### 2. ui/button
**Location**: `components/ui/button.tsx`

Feature-rich button with design system tokens.

```tsx
import { Button } from '@/components/ui/button';

<Button size="md" variant="default">Click me</Button>
```

**Variants**: `default` | `destructive` | `outline` | `secondary` | `ghost` | `link`

**Special sizes**: Also supports `icon` for icon-only buttons

### 3. TouchOptimizedButton
**Locations**: 
- `components/Admin/Mobile/TouchInteractions/TouchOptimizedButton.tsx`
- `components/Marketplace/Seller/Mobile/TouchOptimizedButton.tsx`

Mobile-optimized button with touch interactions, haptic feedback, and ripple effects.

```tsx
import { TouchOptimizedButton } from '@/components/Marketplace/Seller/Mobile/TouchOptimizedButton';

<TouchOptimizedButton 
  size="md" 
  variant="primary"
  hapticFeedback={true}
  onClick={() => console.log('clicked')}
>
  Touch me
</TouchOptimizedButton>
```

**Variants**: `primary` | `secondary` | `outline` | `ghost` | `danger`

**Features**:
- Touch-optimized with 44px minimum touch targets (iOS standard)
- Haptic feedback support
- Ripple effects
- Long press support (Admin version)
- Loading states (Marketplace version)

## Migration Guide

If you see TypeScript errors about button sizes, update your code as follows:

### Old → New Mapping

```tsx
// design-system/Button
size="small"  → size="sm"
size="medium" → size="md"
size="large"  → size="lg"

// ui/button
size="default" → size="md"  // Still works, but 'md' is preferred
size="sm"      → size="sm"  // No change
size="lg"      → size="lg"  // No change
size="icon"    → size="icon" // No change (special case)
```

### Backward Compatibility

During the migration period, the following legacy values are still supported but will log deprecation warnings in development:

- `small` → automatically converted to `sm`
- `medium` → automatically converted to `md`
- `large` → automatically converted to `lg`

**Note**: These will be removed in a future version. Please update your code to use the new values.

## Best Practices

### Size Selection

1. **Use `sm` for**:
   - Secondary actions
   - Inline buttons within text
   - Compact UI elements
   - Table actions

2. **Use `md` for**:
   - Default buttons
   - Form submissions
   - Modal actions
   - Most general use cases

3. **Use `lg` for**:
   - Primary CTAs
   - Mobile interfaces
   - Hero sections
   - High-importance actions

### Accessibility

All button sizes meet WCAG 2.1 Level AA requirements:

- `sm`: 36px minimum height
- `md`: 44px minimum height (iOS standard)
- `lg`: 52px minimum height

For mobile interfaces, prefer `md` or `lg` to ensure adequate touch targets.

### Touch Optimization

When building mobile interfaces, use `TouchOptimizedButton` for:

- Touch-heavy interactions
- Mobile-first experiences
- When haptic feedback is desired
- When visual feedback (ripples) enhances UX

## Type Definitions

All button components now share common type definitions from:

```typescript
import { ButtonSize, ButtonVariant } from '@/components/design-system/types/button';
```

This ensures type consistency across the entire application.

## Examples

### Basic Usage

```tsx
// Small secondary button
<Button size="sm" variant="outline">Cancel</Button>

// Medium primary button (default)
<Button size="md" variant="primary">Submit</Button>

// Large CTA button
<Button size="lg" variant="primary">Get Started</Button>
```

### Mobile Touch Button

```tsx
<TouchOptimizedButton
  size="md"
  variant="primary"
  hapticFeedback={true}
  rippleEffect={true}
  loading={isSubmitting}
  onClick={handleSubmit}
>
  Submit Order
</TouchOptimizedButton>
```

### Icon Button

```tsx
import { Button } from '@/components/ui/button';

<Button size="icon" variant="ghost">
  <IconComponent />
</Button>
```

## Future Enhancements

Planned improvements for the button system:

1. **Unified Button Component**: Single source of truth with composable architecture
2. **Design Tokens**: Centralized size/spacing definitions
3. **Theme Support**: Light/dark mode variants
4. **Additional Sizes**: Potential `xs` and `xl` options
5. **Accessibility Improvements**: Enhanced ARIA labels and keyboard navigation

## Questions or Issues?

If you encounter any issues with the button standardization or have questions about which button component to use, please:

1. Check this README first
2. Review the implementation plan in the artifacts
3. Reach out to the design system team
