# Enhanced Social Features Deployment Guide

This guide explains how to deploy the enhanced social features contracts for LinkDAO.

## Overview

The enhanced social features include:

1. **Enhanced ProfileRegistry** - Multi-profile support, visibility settings, social links
2. **Enhanced FollowModule** - Private profiles, follow requests, muting, lists, tiers
3. **Enhanced TipRouter** - Subscription tipping, tiered fees, tip comments, limits
4. **SocialReputationToken** - Reputation token based on social activity

## Prerequisites

1. Hardhat environment properly configured
2. Existing contracts deployed:
   - LDAOToken
   - RewardPool
3. Private key with sufficient funds for deployment

## Deployment Steps

### 1. Compile Contracts

```bash
npx hardhat compile
```

### 2. Deploy Enhanced Social Contracts

```bash
npx hardhat run scripts/deploy-enhanced-social-features.ts --network <network>
```

Replace `<network>` with your target network (e.g., `mainnet`, `sepolia`, `localhost`).

### 3. Verify Contracts (Optional)

```bash
npx hardhat verify --network <network> <contract-address> <constructor-args>
```

## Contract Interactions

### ProfileRegistry Enhancements

1. **Multi-profile Support**
   - Users can create multiple profiles with `createProfile()`
   - Set primary profile with `setPrimaryProfile()`
   - Get all profiles with `getProfilesByAddress()`

2. **Profile Visibility**
   - Set visibility with `setProfileVisibility()`
   - Visibility levels: Public (0), FollowersOnly (1), Private (2)

3. **Social Links**
   - Add social links with `setSocialLink()`
   - Get social links with `getSocialLink()`

### FollowModule Enhancements

1. **Private Profiles & Follow Requests**
   - Follow private profiles with `requestFollow()`
   - Accept requests with `acceptFollowRequest()`
   - Reject requests with `rejectFollowRequest()`

2. **Muting**
   - Mute users with `muteUser()`
   - Unmute users with `unmuteUser()`

3. **Follow Lists**
   - Add to lists with `addToFollowList()`
   - Remove from lists with `removeFromFollowList()`
   - Get lists with `getFollowList()` and `getUserLists()`

4. **Follow Tiers**
   - Set tiers with `setFollowTier()`
   - Tiers: Fan (0), Professional (1), CloseFriend (2)

### TipRouter Enhancements

1. **Standard Tipping**
   - Standard tips with `tip()`
   - Tips with comments with `tipWithComment()`

2. **Subscription Tipping**
   - Create subscriptions with `createSubscription()`
   - Cancel subscriptions with `cancelSubscription()`
   - Process payments with `processSubscriptionPayment()`

3. **Tiered Fees**
   - Configure fee tiers with `setFeeTiers()`
   - Automatic fee calculation based on amount

4. **Tip Limits**
   - Configure limits with `setTipLimits()`

### SocialReputationToken

1. **Reputation Management**
   - Update reputation with `updateReputation()`
   - Batch update with `batchUpdateReputation()`
   - Get reputation with `getReputation()`

## Testing

Run the test suite to verify functionality:

```bash
npx hardhat test test/enhanced-social-features.test.ts
```

## Integration with Frontend

The enhanced contracts are backward compatible with existing frontend code but offer additional features:

1. **Profile Management UI**
   - Profile switching interface
   - Visibility settings
   - Social link management

2. **Social Interaction UI**
   - Follow request management
   - Mute/block functionality
   - Follow lists/circles
   - Follow tiers

3. **Tipping UI**
   - Subscription tipping options
   - Tip comments
   - Tiered fee display

4. **Reputation System**
   - Reputation score display
   - Reputation-based features

## Security Considerations

1. All contracts use OpenZeppelin's battle-tested libraries
2. Reentrancy protection in TipRouter
3. Access control with Ownable pattern
4. Input validation on all public functions
5. Rate limiting for tips to prevent spam

## Gas Optimization

The enhanced contracts are optimized for gas efficiency:

1. Efficient storage patterns
2. Minimal event emissions
3. Batch operations where possible
4. Optimized mappings for lookups

## Upgrade Path

These contracts are designed as enhancements to existing functionality:

1. Existing profiles can be migrated to enhanced ProfileRegistry
2. Existing follows can be imported to enhanced FollowModule
3. Existing tips will work with enhanced TipRouter
4. Reputation system is additive and doesn't affect existing functionality

## Troubleshooting

### Common Issues

1. **Deployment fails due to missing dependencies**
   - Ensure LDAOToken and RewardPool addresses are in deployedAddresses.json

2. **Function calls fail with access control errors**
   - Ensure caller has proper permissions (owner, profile owner, etc.)

3. **Tip transactions fail with transfer errors**
   - Ensure sufficient LDAO token approval for TipRouter

### Support

For issues with deployment or functionality, check:
1. Contract ABIs in artifacts directory
2. Event logs for detailed error information
3. Hardhat console output for deployment details