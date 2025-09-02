# 🚀 LinkDAO Smart Contract Deployment Guide

## 📋 To See Your Contracts On-Chain

Your contracts are currently deployed locally. To see them on a blockchain explorer, you need to deploy to a public network.

## 🌐 **Option 1: Deploy to Base Sepolia Testnet (Recommended - FREE)**

### Step 1: Get Testnet ETH
1. Go to [Base Sepolia Faucet](https://www.alchemy.com/faucets/base-sepolia)
2. Connect your wallet (MetaMask)
3. Request free testnet ETH

### Step 2: Set Up Environment
1. Copy your wallet's private key:
   - Open MetaMask → Account Details → Export Private Key
   - **⚠️ NEVER share this or commit to git!**

2. Edit the `.env` file:
```bash
PRIVATE_KEY=your_actual_private_key_here
ALCHEMY_API_KEY=demo  # Can use demo for testing
BASESCAN_API_KEY=demo # Can use demo for testing
```

### Step 3: Deploy to Base Sepolia
```bash
cd /Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/contracts
npx hardhat --config hardhat.config.production.cjs run scripts/deploy-testnet.cjs --network baseSepolia
```

## 🌐 **Option 2: Deploy to Ethereum Sepolia Testnet**

### Step 1: Get Free API Keys
1. [Alchemy](https://www.alchemy.com/) - for RPC access
2. [Etherscan](https://etherscan.io/apis) - for contract verification

### Step 2: Get Testnet ETH
1. Go to [Sepolia Faucet](https://sepoliafaucet.com/)
2. Request free testnet ETH

### Step 3: Deploy
```bash
npx hardhat --config hardhat.config.production.cjs run scripts/deploy-testnet.cjs --network sepolia
```

## 🔍 **After Deployment - View on Explorer**

Once deployed, you'll get links like:
- **Base Sepolia**: https://sepolia.basescan.org/address/YOUR_CONTRACT_ADDRESS
- **Ethereum Sepolia**: https://sepolia.etherscan.io/address/YOUR_CONTRACT_ADDRESS

## 🏠 **Option 3: Keep Using Local Network**

If you want to stick with local development:

1. **Use a different approach for local blockchain:**
```bash
# Install and use Ganache CLI instead
npm install -g ganache-cli
ganache-cli --deterministic --accounts 10 --host 0.0.0.0
```

2. **Or use Remix IDE:**
   - Go to [remix.ethereum.org](https://remix.ethereum.org)
   - Upload your contract files
   - Deploy to Remix VM or connect to Injected Web3

## 📱 **Connect to MetaMask**

To interact with your contracts:

1. **Add Base Sepolia to MetaMask:**
   - Network Name: Base Sepolia
   - RPC URL: https://sepolia.base.org
   - Chain ID: 84532
   - Currency Symbol: ETH
   - Block Explorer: https://sepolia.basescan.org

2. **Import tokens to see balances:**
   - Add custom token using your TOKEN_ADDRESS

## 🛠 **Quick Commands**

```bash
# Deploy to Base Sepolia (after setup)
npm run deploy:baseSepolia

# Deploy to Ethereum Sepolia (after setup)
npm run deploy:sepolia

# Verify contracts on explorer
npx hardhat verify --network baseSepolia YOUR_CONTRACT_ADDRESS
```

## 📝 **Current Local Addresses**

Your current local contracts:
- PROFILE_REGISTRY_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
- FOLLOW_MODULE_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
- PAYMENT_ROUTER_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
- GOVERNANCE_ADDRESS=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
- TOKEN_ADDRESS=0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9

These only exist locally until you deploy to a public network!