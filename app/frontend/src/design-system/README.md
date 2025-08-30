# Web3 Marketplace Glassmorphism Design System

A comprehensive design system built for the Web3 Marketplace platform, featuring glassmorphism aesthetics, NFT-style visual effects, and Web3-native components.

## 🎨 Design Philosophy

The design system is built around the concept of **glassmorphism** - a modern UI trend that creates depth and hierarchy through frosted-glass effects, blurred transparency, and subtle shadows. This aesthetic perfectly complements Web3 applications by providing a futuristic, tech-inspired visual language while maintaining excellent usability.

### Key Principles

- **Transparency & Depth**: Layered glassmorphic panels create visual hierarchy
- **Web3 Native**: Trust indicators, dual pricing, and blockchain-specific components
- **Mobile First**: Responsive design optimized for all device sizes
- **Accessibility**: WCAG 2.1 AA compliant with proper contrast and focus management
- **Performance**: Optimized animations and efficient rendering

## 🚀 Getting Started

### Installation

The design system is already integrated into the Web3 Marketplace frontend. To use components:

```tsx
import { 
  GlassPanel, 
  Button, 
  TrustIndicators, 
  DualPricing 
} from '@/design-system';
```

### Basic Usage

```tsx
import { GlassPanel, PrimaryButton, TrustIndicators } from '@/design-system';

function ProductCard() {
  return (
    <GlassPanel variant="secondary" hoverable>
      <h3>Premium NFT Collection</h3>
      <TrustIndicators 
        verified 
        escrowProtected 
        onChainCertified 
        size="medium" 
      />
      <PrimaryButton>Buy Now</PrimaryButton>
    </GlassPanel>
  );
}
```

## 📦 Components

### Core Components

#### GlassPanel
Foundational glassmorphic container with multiple variants and NFT-style shadow effects.

```tsx
<GlassPanel variant="primary" nftShadow="premium" hoverable>
  Content goes here
</GlassPanel>
```

**Variants**: `primary`, `secondary`, `navbar`, `modal`  
**NFT Shadows**: `standard`, `premium`, `dao`

#### Button
Interactive buttons with ripple effects and Web3 aesthetics.

```tsx
<Button 
  variant="gradient" 
  gradient="techBlue" 
  size="large" 
  icon={<Icon />}
  ripple
>
  Launch App
</Button>
```

**Variants**: `primary`, `secondary`, `outline`, `ghost`, `gradient`  
**Sizes**: `small`, `medium`, `large`

#### TrustIndicators
Web3-specific trust badges showing verification status and security features.

```tsx
<TrustIndicators 
  verified 
  escrowProtected 
  onChainCertified 
  daoApproved 
  layout="badges" 
  size="medium" 
/>
```

**Layouts**: `badges`, `inline`, `compact`  
**Sizes**: `small`, `medium`, `large`

#### DualPricing
Cryptocurrency and fiat price display with real-time conversion.

```tsx
<DualPricing 
  cryptoPrice="0.15" 
  cryptoSymbol="ETH" 
  fiatPrice="270.00" 
  realTimeConversion 
  showToggle 
/>
```

**Layouts**: `horizontal`, `vertical`, `stacked`  
**Sizes**: `small`, `medium`, `large`

#### LoadingSkeleton
Glassmorphic loading states with shimmer animations.

```tsx
<LoadingSkeleton variant="card" width="300px" height="200px" />
<ProductCardSkeleton />
<UserProfileSkeleton />
```

**Variants**: `text`, `card`, `image`, `button`, `avatar`, `custom`

### Specialized Components

- **NFTGlassCard**: Pre-configured NFT display card
- **PremiumNFTCard**: Premium NFT with golden glow effects
- **DAOApprovedCard**: Community-verified items with special styling
- **ProductPricing**: Large pricing display for product pages
- **CompactPricing**: Small pricing for card layouts

## 🎭 Design Tokens

### Glassmorphism Effects

```typescript
const glassmorphism = {
  primary: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
  },
  // ... more variants
};
```

### Gradients

```typescript
const gradients = {
  primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  techBlue: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
  nftRainbow: 'linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 25%, #45b7d1 50%, #96ceb4 75%, #ffeaa7 100%)',
  // ... more gradients
};
```

### Trust Colors

```typescript
const trustColors = {
  verified: '#10b981',    // Green for verified items
  escrow: '#3b82f6',      // Blue for escrow protection
  onChain: '#8b5cf6',     // Purple for blockchain certification
  dao: '#f59e0b',         // Amber for DAO approval
};
```

## 📱 Responsive Design

The design system uses a mobile-first approach with the following breakpoints:

- **xs**: 320px (Small phones)
- **sm**: 640px (Large phones)
- **md**: 768px (Tablets)
- **lg**: 1024px (Small laptops)
- **xl**: 1280px (Large laptops)
- **2xl**: 1536px (Desktop monitors)

### Responsive Hooks

```tsx
import { useResponsive, useIsMobile, useResponsiveValue } from '@/design-system';

function ResponsiveComponent() {
  const { isMobile, breakpoint } = useResponsive();
  const columns = useResponsiveValue({
    xs: 1,
    sm: 2,
    md: 3,
    lg: 4,
  });
  
  return (
    <div style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {/* Content */}
    </div>
  );
}
```

## ✨ Animations

Built with Framer Motion for smooth, performant animations.

### Animation Presets

```tsx
import { animationPresets, fadeAnimations } from '@/design-system';

<motion.div {...animationPresets.cardHover}>
  <motion.div variants={fadeAnimations.fadeInUp}>
    Content with animations
  </motion.div>
</motion.div>
```

### Custom Animations

```tsx
import { createAnimation, easings } from '@/design-system';

const customAnimation = createAnimation(
  { opacity: 0, scale: 0.8 },
  { opacity: 1, scale: 1 },
  { opacity: 0, scale: 0.9 },
  { duration: 0.3, ease: easings.easeOut }
);
```

## 🎨 Storybook Documentation

View all components in Storybook:

```bash
npm run storybook
```

This will start Storybook at `http://localhost:6006` with:
- Interactive component playground
- Design token documentation
- Usage examples
- Accessibility testing
- Responsive viewport testing

## 🔧 Customization

### Theme Overrides

```tsx
import { createTheme, designTokens } from '@/design-system';

const customTheme = createTheme({
  colors: {
    ...designTokens.colors,
    primary: {
      ...designTokens.colors.primary,
      500: '#your-custom-color',
    },
  },
});
```

### CSS Custom Properties

The design system exposes CSS custom properties for easy theming:

```css
:root {
  --glass-primary-bg: rgba(255, 255, 255, 0.1);
  --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --trust-verified: #10b981;
}
```

## 🧪 Testing

### Component Testing

```tsx
import { render, screen } from '@testing-library/react';
import { Button } from '@/design-system';

test('renders button with correct variant', () => {
  render(<Button variant="primary">Test Button</Button>);
  expect(screen.getByRole('button')).toHaveClass('glass-button');
});
```

### Accessibility Testing

```tsx
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('should not have accessibility violations', async () => {
  const { container } = render(<Button>Accessible Button</Button>);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## 📋 Best Practices

### Component Usage

1. **Use semantic variants**: Choose the appropriate variant for the context
2. **Maintain consistency**: Use the same components across similar use cases
3. **Respect spacing**: Use design token spacing values
4. **Consider performance**: Use loading skeletons for better perceived performance

### Accessibility

1. **Color contrast**: All components meet WCAG 2.1 AA standards
2. **Keyboard navigation**: All interactive elements are keyboard accessible
3. **Screen readers**: Proper ARIA labels and semantic HTML
4. **Reduced motion**: Respects `prefers-reduced-motion` setting

### Performance

1. **Lazy loading**: Use loading skeletons while content loads
2. **Animation optimization**: Animations use GPU acceleration
3. **Bundle size**: Tree-shakeable exports for optimal bundle size
4. **Responsive images**: Use optimized images with proper sizing

## 🔄 Migration Guide

### From Custom Components

Replace custom glassmorphic styles with design system components:

```tsx
// Before
<div className="custom-glass-panel">
  <div className="custom-button">Click me</div>
</div>

// After
<GlassPanel variant="primary">
  <Button variant="primary">Click me</Button>
</GlassPanel>
```

### Styling Migration

Replace custom CSS with design tokens:

```css
/* Before */
.custom-style {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

/* After */
.custom-style {
  background: var(--glass-primary-bg);
  backdrop-filter: var(--glass-primary-backdrop);
}
```

## 🤝 Contributing

### Adding New Components

1. Create component in `src/design-system/components/`
2. Add Storybook stories
3. Write comprehensive tests
4. Update documentation
5. Export from main index file

### Design Token Updates

1. Update `tokens.ts` with new values
2. Update CSS custom properties
3. Test across all components
4. Update Storybook documentation

## 📚 Resources

- [Storybook Documentation](http://localhost:6006)
- [Framer Motion Docs](https://www.framer.com/motion/)
- [Glassmorphism Design Guide](https://uxdesign.cc/glassmorphism-in-user-interfaces-1f39bb1308c9)
- [Web3 Design Patterns](https://web3.design/)

## 🐛 Troubleshooting

### Common Issues

**Backdrop filter not working**
- Ensure browser support for `backdrop-filter`
- Check for conflicting CSS properties

**Animations not smooth**
- Verify GPU acceleration is enabled
- Check for `will-change` property usage

**Components not responsive**
- Ensure proper breakpoint usage
- Check viewport meta tag configuration

### Browser Support

- Chrome 76+
- Firefox 103+
- Safari 14+
- Edge 79+

For older browsers, graceful degradation removes glassmorphic effects while maintaining functionality.