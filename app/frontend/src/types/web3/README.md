# Web3 Integration Foundation

This directory contains the foundational types, services, and utilities for Web3-native community enhancements.

## Overview

The Web3 integration foundation provides:

1. **Enhanced Data Models** - Web3-specific data types for communities, tokens, governance, and on-chain verification
2. **Token Activity Tracking** - Models for tips, stakes, rewards, and other token interactions
3. **Governance Integration** - Proposal and voting data structures with on-chain verification
4. **Error Handling** - Comprehensive Web3 error handling with progressive enhancement
5. **Progressive Enhancement** - Framework for graceful degradation when Web3 features are unavailable

## Key Components

### Data Types

- **`web3Community.ts`** - Enhanced community data with governance tokens, treasury, and staking
- **`tokenActivity.ts`** - Token activity tracking for tips, stakes, and rewards
- **`governance.ts`** - Governance proposal and voting data structures
- **`web3Post.ts`** - Enhanced post data with Web3 integration
- **`onChainVerification.ts`** - On-chain verification and proof structures

### Services

- **`tokenService.ts`** - Token operations, pricing, and transaction handling
- **`governanceService.ts`** - Governance interactions and proposal management
- **`onChainVerificationService.ts`** - Transaction verification and on-chain proof validation

### Utilities

- **`web3ErrorHandling.ts`** - Comprehensive error handling for Web3 operations
- **`progressiveEnhancement.ts`** - Progressive enhancement framework for Web3 features

### Hooks

- **`useWeb3Community.ts`** - React hook for Web3 community integration

## Usage Example

```typescript
import { useWeb3Community } from '../hooks/useWeb3Community';

function CommunityPage({ communityId, userAddress }) {
  const {
    community,
    tokenActivity,
    governanceData,
    loading,
    error,
    tipUser,
    stakeOnPost,
    vote,
    canUseWeb3Features,
    featureLevel
  } = useWeb3Community({
    communityId,
    userAddress,
    enableRealTimeUpdates: true
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>{community?.name}</h1>
      {canUseWeb3Features && (
        <div>
          <p>Token Balance: {community?.userTokenBalance}</p>
          <p>Governance Notifications: {community?.governanceNotifications}</p>
        </div>
      )}
    </div>
  );
}
```

## Progressive Enhancement

The framework supports three feature levels:

1. **Basic** - Core functionality without Web3 features
2. **Enhanced** - Basic Web3 features (wallet connection, token displays)
3. **Premium** - Full Web3 features (governance, staking, on-chain verification)

Features automatically degrade gracefully when Web3 capabilities are not available.

## Error Handling

All Web3 operations include comprehensive error handling with:

- Automatic retry for transient errors
- User-friendly error messages
- Fallback actions when possible
- Technical details for debugging

## Requirements Addressed

This implementation addresses the following requirements:

- **1.4** - Token balance and staking status display
- **2.7** - Engagement score calculation with token activity
- **9.4** - On-chain verification and proof display
- **10.7** - Real-time blockchain data updates

## Next Steps

This foundation enables the implementation of:

1. Enhanced left sidebar with Web3 identity features
2. Advanced post cards with token integration
3. Token staking visualization system
4. Enhanced right sidebar with Web3 features
5. Advanced post interaction system
6. On-chain verification and integration
7. Real-time updates and performance optimization