# LinkDAO Smart Contracts

This directory contains the smart contracts for the LinkDAO platform.

## Contracts

### Core Contracts
- [ProfileRegistry.sol](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/contracts/contracts/ProfileRegistry.sol) - User profile management
- [FollowModule.sol](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/contracts/contracts/FollowModule.sol) - Follow functionality
- [PaymentRouter.sol](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/contracts/contracts/PaymentRouter.sol) - Payment processing
- [Governance.sol](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/contracts/contracts/Governance.sol) - DAO governance
- [Marketplace.sol](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/contracts/contracts/Marketplace.sol) - NFT and item marketplace
- [EnhancedEscrow.sol](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/contracts/contracts/EnhancedEscrow.sol) - Enhanced escrow functionality

### LDAO Token Contracts
- [LDAOToken.sol](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/contracts/contracts/LDAOToken.sol) - LDAO ERC-20 token with Permit extension
- [TipRouter.sol](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/contracts/contracts/TipRouter.sol) - Tip routing with fee distribution
- [RewardPool.sol](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/contracts/contracts/RewardPool.sol) - Creator reward distribution

### Legacy Contracts
- [LinkDAOToken.sol](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/contracts/contracts/LinkDAOToken.sol) - Original LDAO token (not used in current implementation)

## Deployment Scripts
- [deploy.ts](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/contracts/scripts/deploy.ts) - Main deployment script
- [deploy-enhanced-escrow.ts](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/contracts/scripts/deploy-enhanced-escrow.ts) - Enhanced escrow deployment
- [deploy-ldao-token.ts](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/contracts/scripts/deploy-ldao-token.ts) - LDAO token deployment

## Tests
- [LDAOToken.test.ts](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/contracts/test/LDAOToken.test.ts) - Tests for LDAO token contracts

## Deployment

To deploy the contracts to Base network:

```bash
# Deploy LDAO token contracts
npx hardhat run scripts/deploy-ldao-token.ts --network base

# Deploy all contracts
npx hardhat run scripts/deploy.ts --network base
```

## Testing

To run contract tests:

```bash
npx hardhat test
```