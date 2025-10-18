# Quick Deployment Setup Guide

## 🚀 Environment Setup

### 1. Set up your `.env` file

You need to update the following variables in `app/contracts/.env`:

```bash
# Your wallet private key (without 0x prefix)
PRIVATE_KEY=your_actual_private_key_here

# Sepolia RPC URL (get free from Alchemy or Infura)
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY

# Etherscan API key for contract verification
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

### 2. Get Free API Keys

#### Alchemy (Recommended)
1. Go to [alchemy.com](https://alchemy.com)
2. Create free account
3. Create new app for Ethereum Sepolia
4. Copy the API key

#### Etherscan
1. Go to [etherscan.io](https://etherscan.io/apis)
2. Create free account
3. Generate API key

### 3. Fund Your Wallet

Get Sepolia ETH from faucets:
- [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
- [Chainlink Faucet](https://faucets.chain.link/)
- [Infura Faucet](https://www.infura.io/faucet/sepolia)

You need ~0.1 ETH for deployment.

## 🔧 Deployment Commands

### Local Testing (Hardhat Network)
```bash
cd app/contracts
npx hardhat run scripts/deploy-core-minimal.ts --network localhost
```

### Sepolia Testnet
```bash
cd app/contracts
npx hardhat run scripts/deploy-core-minimal.ts --network sepolia
```

### Verify Contracts
```bash
npx hardhat verify --network sepolia CONTRACT_ADDRESS
```

## 📋 What Gets Deployed

1. **LDAOToken** - Main governance token
2. **Counter** - Simple test contract
3. **MockERC20** - Test token for development
4. **ReputationSystem** - User reputation tracking
5. **Governance** - DAO governance
6. **EnhancedEscrow** - Secure escrow system
7. **Marketplace** - Main marketplace contract

## 🎯 Next Steps After Deployment

1. **Save contract addresses** - They'll be in the deployment output
2. **Update frontend/backend** - Replace mock addresses with real ones
3. **Test basic functions** - Verify contracts work correctly
4. **Document addresses** - Keep record for team
5. **Plan mainnet deployment** - When ready for production

## 🔍 Troubleshooting

### "Invalid project id" error
- Check your RPC URL is correct
- Make sure API key is valid
- Try different RPC provider

### "Insufficient funds" error
- Get more Sepolia ETH from faucets
- Check wallet balance

### "Nonce too high" error
- Reset account in MetaMask
- Or use different account

Ready to deploy! 🚀