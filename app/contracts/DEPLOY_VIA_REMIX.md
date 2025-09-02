# 🚀 Deploy LinkDAO Contracts via Remix IDE

Since Hardhat has compatibility issues with Node.js 20.19.4, here's how to deploy your contracts using Remix IDE:

## 🌐 **Option 1: Deploy via Remix IDE (Recommended)**

### Step 1: Open Remix IDE
1. Go to [remix.ethereum.org](https://remix.ethereum.org)
2. Create a new workspace called "LinkDAO"

### Step 2: Upload Contract Files
Copy these contract files to Remix:

1. **ProfileRegistry.sol**
2. **FollowModule.sol** 
3. **LDAOToken.sol**
4. **PaymentRouter.sol**
5. **Governance.sol**

### Step 3: Compile Contracts
1. Go to "Solidity Compiler" tab
2. Select compiler version: **0.8.20**
3. Click "Compile All"

### Step 4: Connect to Base Sepolia
1. Go to "Deploy & Run Transactions" tab
2. Change Environment to "Injected Provider - MetaMask"
3. Make sure MetaMask is connected to **Base Sepolia**:
   - Network Name: Base Sepolia
   - RPC URL: https://sepolia.base.org
   - Chain ID: 84532
   - Currency Symbol: ETH
   - Block Explorer: https://sepolia.basescan.org

### Step 5: Deploy Contracts (In Order)
Deploy in this specific order:

#### 1. ProfileRegistry
- Select "ProfileRegistry.sol"
- Click "Deploy"
- Save the address: `PROFILE_REGISTRY_ADDRESS`

#### 2. FollowModule  
- Select "FollowModule.sol"
- Click "Deploy"
- Save the address: `FOLLOW_MODULE_ADDRESS`

#### 3. LDAOToken
- Select "LDAOToken.sol" 
- Constructor parameter: Your wallet address (treasury)
- Click "Deploy"
- Save the address: `TOKEN_ADDRESS`

#### 4. PaymentRouter
- Select "PaymentRouter.sol"
- Constructor parameters:
  - `_feeBasisPoints`: 250 (for 2.5% fee)
  - `_feeCollector`: Your wallet address
- Click "Deploy" 
- Save the address: `PAYMENT_ROUTER_ADDRESS`

#### 5. Governance
- Select "Governance.sol"
- Constructor parameter: LDAOToken address from step 3
- Click "Deploy"
- Save the address: `GOVERNANCE_ADDRESS`

### Step 6: Configure Contracts
After deployment, configure PaymentRouter:
1. In PaymentRouter contract, call `setTokenSupported`
2. Parameters:
   - `token`: LDAOToken address
   - `supported`: true

## 🌐 **Option 2: Use Foundry (Alternative)**

If you want to try a different framework:

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Convert Hardhat project to Foundry
cd /Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/contracts
forge init --force
```

## 🌐 **Option 3: Upgrade Node.js**

To fix the Hardhat issue permanently:

```bash
# Install Node.js 22 using nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 22
nvm use 22

# Then retry Hardhat deployment
npm run deploy:baseSepolia
```

## 📋 **After Deployment**

Once you have all addresses, update your `.env` files:

### Backend .env:
```bash
PROFILE_REGISTRY_ADDRESS=your_deployed_address
FOLLOW_MODULE_ADDRESS=your_deployed_address  
PAYMENT_ROUTER_ADDRESS=your_deployed_address
GOVERNANCE_ADDRESS=your_deployed_address
TOKEN_ADDRESS=your_deployed_address
```

### View on Explorer:
- Base Sepolia: https://sepolia.basescan.org/address/YOUR_ADDRESS

## 🎯 **Final Contract Addresses Format**

```
PROFILE_REGISTRY_ADDRESS=0x...
FOLLOW_MODULE_ADDRESS=0x...
PAYMENT_ROUTER_ADDRESS=0x...
GOVERNANCE_ADDRESS=0x...
TOKEN_ADDRESS=0x...
```

**✅ Remix IDE is the fastest way to deploy without Node.js issues!**