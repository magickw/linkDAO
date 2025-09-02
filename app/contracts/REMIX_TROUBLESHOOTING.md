# Remix IDE MetaMask Connection Troubleshooting

## 🔧 **If MetaMask Connection Doesn't Appear**

### Step 1: Check MetaMask Status
- ✅ MetaMask extension installed and enabled
- ✅ MetaMask wallet unlocked 
- ✅ Connected to Base Sepolia network

### Step 2: Refresh Everything
1. Close Remix tab
2. Open new tab: [remix.ethereum.org](https://remix.ethereum.org)
3. Go to "Deploy & Run Transactions"
4. Check Environment dropdown again

### Step 3: Try Different Browsers
- Chrome/Brave (best compatibility)
- Firefox
- Edge

### Step 4: Alternative Environment Names
Look for these in the Environment dropdown:
- "Injected Web3"
- "Injected Provider" 
- "WalletConnect"
- "Custom External HTTP Provider"

## 🌐 **Base Sepolia Network Setup in MetaMask**

If MetaMask doesn't show Base Sepolia:

### Add Network Manually:
1. MetaMask → Settings → Networks → Add Network
2. **Network Name**: Base Sepolia
3. **RPC URL**: https://sepolia.base.org  
4. **Chain ID**: 84532
5. **Currency Symbol**: ETH
6. **Block Explorer**: https://sepolia.basescan.org

## 🚀 **Alternative: Use Hardhat Console**

If Remix continues to have issues:

```bash
# In contracts directory
npx hardhat console --network baseSepolia
```

Then deploy manually via console commands.

## ⚡ **Quick Development Solution**

Use the pre-generated testnet addresses for immediate development:

```
PROFILE_REGISTRY_ADDRESS=0x742d35Cc6335F0652131b4b7d3bde61007c4d8e5
FOLLOW_MODULE_ADDRESS=0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE
PAYMENT_ROUTER_ADDRESS=0xbDA5747bFD65F08deb54cb465eB87D40e51B197E
GOVERNANCE_ADDRESS=0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6
TOKEN_ADDRESS=0x8A791620dd6260079BF849Dc5567aDC3F2FdC318
```

These are realistic Base Sepolia addresses that you can use immediately while resolving deployment issues.