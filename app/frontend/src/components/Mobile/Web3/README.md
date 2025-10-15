# Mobile Web3 Components

This directory contains mobile-optimized React components specifically designed for Web3 interactions on mobile devices. These components provide touch-friendly interfaces, haptic feedback, and responsive design patterns optimized for mobile Web3 experiences.

## Components Overview

### Navigation Components

#### `Web3MobileBottomNavigation`
Mobile-optimized bottom navigation bar with Web3-specific features:
- **Features**: Staking rewards indicators, governance notifications, wallet connection status
- **Accessibility**: Screen reader support, haptic feedback, touch targets
- **Usage**: Primary navigation for mobile Web3 apps

#### `CollapsibleWeb3Sidebar`
Collapsible sidebar with Web3 community management:
- **Features**: Community list, Web3 status, staking summaries, auto-hide on scroll
- **Interactions**: Swipe gestures, touch-optimized controls
- **Usage**: Secondary navigation and community management

### Interaction Components

#### `Web3SwipeGestureHandler`
Advanced swipe gesture handler for Web3 actions:
- **Features**: Multi-level swipe actions (upvote/tip, save/boost), haptic feedback
- **Gestures**: Left/right swipe with distance-based action selection
- **Usage**: Wrap post cards and interactive elements

#### `CompactWeb3PostCard`
Mobile-optimized post card with Web3 metrics:
- **Features**: Staking indicators, governance badges, compact layout
- **Interactions**: Swipe gestures, touch-friendly buttons
- **Usage**: Feed displays, community posts

### Wallet & Connection Components

#### `MobileWalletConnection`
Mobile-optimized wallet connection interface:
- **Features**: QR code support, deep links, mobile wallet detection
- **UX**: Progressive disclosure, clear error states
- **Usage**: Wallet onboarding and connection flows

#### `MobileWeb3DataDisplay`
Comprehensive Web3 data visualization:
- **Features**: Token balances, staking data, governance info, privacy controls
- **Layout**: Tabbed interface, compact/expanded modes
- **Usage**: Dashboard displays, portfolio views

### Governance Components

#### `MobileGovernanceVoting`
Touch-optimized governance voting interface:
- **Features**: Clear confirmation flows, voting progress, quorum tracking
- **UX**: Large touch targets, haptic feedback, accessibility support
- **Usage**: Proposal voting, governance participation

#### `MobileTokenAmountInput`
Specialized input for token amounts:
- **Features**: Haptic feedback, validation, gas estimates, quick amounts
- **UX**: Large numeric input, balance display, USD conversion
- **Usage**: Staking, tipping, token transfers

### Error Handling

#### `MobileWeb3ErrorHandler`
Comprehensive error handling for Web3 operations:
- **Features**: Auto-retry, error categorization, recovery suggestions
- **UX**: Clear error messages, actionable solutions, retry mechanisms
- **Usage**: Wrap Web3 operations and transactions

## Key Features

### 🎯 Touch-Optimized Design
- Minimum 44px touch targets (iOS HIG compliant)
- Gesture-based interactions
- Swipe actions for common operations
- Large, accessible buttons

### 📱 Mobile-First UX
- Bottom navigation for thumb accessibility
- Collapsible interfaces to maximize content
- Progressive disclosure of complex information
- Responsive layouts for all screen sizes

### 🔄 Haptic Feedback
- Light feedback for basic interactions
- Medium feedback for important actions
- Heavy feedback for confirmations
- Error feedback for failures

### ♿ Accessibility
- Screen reader announcements
- High contrast support
- Keyboard navigation
- Focus management

### 🌐 Web3 Integration
- Wallet connection flows
- Transaction confirmations
- Gas fee displays
- Error handling and recovery

## Usage Examples

### Basic Navigation Setup
```tsx
import { Web3MobileBottomNavigation } from '@/components/Mobile/Web3';

<Web3MobileBottomNavigation
  currentPath="/communities"
  onNavigate={handleNavigate}
  onCreatePost={handleCreatePost}
  stakingRewards={150}
  governanceNotifications={3}
  walletConnected={true}
/>
```

### Swipe Gesture Integration
```tsx
import { Web3SwipeGestureHandler } from '@/components/Mobile/Web3';

<Web3SwipeGestureHandler
  onUpvote={handleUpvote}
  onSave={handleSave}
  onTip={handleTip}
  onStake={handleStake}
  walletConnected={walletConnected}
  userBalance={userBalance}
>
  <PostCard {...postProps} />
</Web3SwipeGestureHandler>
```

### Governance Voting
```tsx
import { MobileGovernanceVoting } from '@/components/Mobile/Web3';

<MobileGovernanceVoting
  proposal={proposal}
  userVotingPower={votingPower}
  onVote={handleVote}
  onViewDetails={handleViewDetails}
  walletConnected={walletConnected}
/>
```

### Token Amount Input
```tsx
import { MobileTokenAmountInput } from '@/components/Mobile/Web3';

<MobileTokenAmountInput
  tokenSymbol="LDAO"
  tokenBalance={1000}
  tokenPrice={0.5}
  onAmountChange={handleAmountChange}
  gasEstimate="~$2.50"
  showUSDValue={true}
  hapticFeedback={true}
/>
```

### Error Handling
```tsx
import { MobileWeb3ErrorHandler, useWeb3ErrorHandler } from '@/components/Mobile/Web3';

const { error, isRetrying, handleError, retry, clearError } = useWeb3ErrorHandler();

// In your component
<MobileWeb3ErrorHandler
  error={error}
  onRetry={() => retry(performTransaction)}
  onDismiss={clearError}
  autoRetry={true}
  maxRetries={3}
/>
```

## Design Principles

### 1. Progressive Enhancement
- Core functionality works without Web3
- Enhanced features require wallet connection
- Graceful degradation for unsupported features

### 2. Clear Visual Hierarchy
- Important actions are prominent
- Secondary actions are accessible but not distracting
- Clear distinction between different action types

### 3. Immediate Feedback
- Haptic feedback for all interactions
- Visual feedback for state changes
- Clear loading and error states

### 4. Gesture-First Design
- Swipe gestures for common actions
- Touch-friendly interface elements
- Minimal cognitive load for interactions

## Performance Considerations

### Optimization Strategies
- Lazy loading of complex components
- Memoization of expensive calculations
- Efficient re-rendering with React.memo
- Debounced input handling

### Bundle Size
- Tree-shakeable exports
- Minimal external dependencies
- Optimized animations with Framer Motion
- Efficient icon usage

## Browser Support

### Mobile Browsers
- iOS Safari 14+
- Chrome Mobile 90+
- Firefox Mobile 90+
- Samsung Internet 14+

### Web3 Features
- MetaMask Mobile
- WalletConnect v2
- Coinbase Wallet
- Trust Wallet

## Testing

### Component Testing
```bash
npm run test:mobile-web3
```

### Accessibility Testing
```bash
npm run test:a11y-mobile
```

### Integration Testing
```bash
npm run test:integration-mobile
```

## Contributing

When adding new mobile Web3 components:

1. Follow the established patterns for haptic feedback
2. Ensure accessibility compliance
3. Add comprehensive TypeScript types
4. Include error handling and loading states
5. Test on actual mobile devices
6. Document usage examples

## Dependencies

- `framer-motion`: Animations and gestures
- `@heroicons/react`: Consistent iconography
- Custom hooks: `useMobileOptimization`, `useMobileAccessibility`

## Related Documentation

- [Mobile Optimization Guide](../README.md)
- [Web3 Integration Patterns](../../Web3/README.md)
- [Accessibility Guidelines](../../Accessibility/README.md)
- [Design System](../../design-system/README.md)