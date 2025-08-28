# LDAO Token Implementation

This document describes the implementation of the LDAO token for the LinkDAO platform, which enables creator tipping and reward distribution.

## Overview

The LDAO token implementation consists of three main smart contracts and supporting backend infrastructure:

1. **LDAOToken** - ERC-20 token with Permit extension for gasless approvals
2. **TipRouter** - Handles tipping functionality with fee distribution
3. **RewardPool** - Manages creator reward distribution

## Smart Contracts

### LDAOToken.sol

An ERC-20 token with the following features:
- Fixed supply of 1 billion tokens
- ERC-2612 Permit extension for gasless approvals
- Standard ERC-20 functionality

### TipRouter.sol

Handles tipping functionality:
- Accepts tips in LDAO tokens
- Supports permit + tip in one transaction
- Distributes 10% of tips to RewardPool
- Emits Tipped events for indexing

### RewardPool.sol

Manages creator rewards:
- Receives 10% of all tips
- Allows creators to claim earned rewards
- Supports epoch-based reward accounting

## Database Schema

New tables added to support tipping and rewards:

### tips
Stores all tip transactions:
- postId: Reference to the post being tipped
- fromUserId: User who sent the tip
- toUserId: Creator who received the tip
- token: Token type (LDAO)
- amount: Tip amount
- message: Optional message
- txHash: Blockchain transaction hash

### reward_epochs
Tracks reward distribution epochs:
- epoch: Epoch number
- fundedAmount: Amount funded to this epoch
- startAt: Epoch start time
- endAt: Epoch end time

### creator_rewards
Tracks individual creator rewards:
- epoch: Epoch number
- userId: Creator user ID
- earned: Amount earned
- claimedAt: When rewards were claimed

## API Endpoints

### POST /api/tips
Create a new tip:
- Generates EIP-712 permit data for gasless tipping
- Records tip in database

### GET /api/tips/users/:id/earnings
Get earnings for a user:
- Returns total earned and claimable amounts

### POST /api/tips/rewards/claim
Claim rewards:
- Generates transaction data to claim rewards from RewardPool

### GET /api/tips/posts/:id/tips
Get tips for a post:
- Returns list of tips for a specific post

## Frontend Components

### TipBar.tsx
Allows users to tip creators:
- Preset tip amounts (10, 50, 100, 500 LDAO)
- Custom tip amount
- Gasless tipping via permit

### RewardClaim.tsx
Allows creators to claim rewards:
- Displays earned and claimable amounts
- Claim rewards button

## Deployment

### Smart Contracts
Deploy using the deploy-ldao-token.ts script:
```bash
npx hardhat run scripts/deploy-ldao-token.ts --network base
```

### Database Migration
Apply the migration:
```bash
npm run db:migrate
```

## Configuration

Add the following environment variables to backend/.env:
```env
# LDAO Token Contract Addresses
LDAO_TOKEN_ADDRESS=0x...
TIP_ROUTER_ADDRESS=0x...
REWARD_POOL_ADDRESS=0x...
```

## Testing

Run contract tests:
```bash
npx hardhat test test/LDAOToken.test.ts
```

Run backend tests:
```bash
npm run test tipService.test.ts
```

## Future Enhancements

1. **Staking Module** - Allow users to stake LDAO to boost post rankings
2. **Referral System** - Reward users for referring creators
3. **Governance** - Use LDAO for platform governance
4. **Cross-chain Support** - Expand to other chains
5. **Gasless Micro-tips** - Implement ERC-4337 for fully gasless tipping