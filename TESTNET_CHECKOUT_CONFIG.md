# Checkout Configuration - Testnet Ready

## ✅ Deployed Smart Contracts (Sepolia Testnet)

The following contracts are already deployed and ready for testing:

### Network Information
- **Network**: Sepolia Testnet
- **Chain ID**: 11155111
- **Deployer**: `0xEe034b53D4cCb101b2a4faec27708be507197350`
- **Deployment Date**: October 20, 2025

### Contract Addresses

```bash
# Core Marketplace Contracts
MARKETPLACE_CONTRACT_ADDRESS=0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A
ENHANCED_ESCROW_CONTRACT_ADDRESS=0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1
PAYMENT_ROUTER_CONTRACT_ADDRESS=0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50

# Supporting Contracts
DISPUTE_RESOLUTION_CONTRACT_ADDRESS=0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a
REPUTATION_SYSTEM_CONTRACT_ADDRESS=0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2
PROFILE_REGISTRY_CONTRACT_ADDRESS=0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD

# Token Contracts
LDAO_TOKEN_CONTRACT_ADDRESS=0xc9F690B45e33ca909bB9ab97836091673232611B
MOCK_ERC20_CONTRACT_ADDRESS=0xA31D2faD2B1Ab84Fb420824A5CF3aB5a272782CC

# Governance
GOVERNANCE_CONTRACT_ADDRESS=0x27a78A860445DFFD9073aFd7065dd421487c0F8A

# NFT Marketplace
NFT_MARKETPLACE_CONTRACT_ADDRESS=0x012d3646Cd0D587183112fdD38f473FaA50D2A09
NFT_COLLECTION_FACTORY_CONTRACT_ADDRESS=0xf9ba6552025C3e40CB1B91D4b4CF82462643F34F

# Social Features
TIP_ROUTER_CONTRACT_ADDRESS=0x755Fe81411c86019fff6033E0567A4D93b57281b
FOLLOW_MODULE_CONTRACT_ADDRESS=0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439
REWARD_POOL_CONTRACT_ADDRESS=0x0bc773696BD4399a93672F82437a59369C2a1e6f
```

## Environment Variables for Checkout

Add these to your `.env` file:

```bash
# ===== BLOCKCHAIN CONFIGURATION (TESTNET) =====

# Network
ETHEREUM_NETWORK=sepolia
CHAIN_ID=11155111

# RPC Endpoints (Sepolia)
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
# Alternative: https://rpc.sepolia.org

# Escrow Contract (for checkout)
ESCROW_CONTRACT_ADDRESS=0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1

# Marketplace Contract
MARKETPLACE_CONTRACT_ADDRESS=0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A

# Payment Router
PAYMENT_ROUTER_ADDRESS=0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50

# Test Token (for testing payments)
TEST_TOKEN_ADDRESS=0xA31D2faD2B1Ab84Fb420824A5CF3aB5a272782CC

# LDAO Token
LDAO_TOKEN_ADDRESS=0xc9F690B45e33ca909bB9ab97836091673232611B

# ===== STRIPE CONFIGURATION (TEST MODE) =====

# Get these from https://dashboard.stripe.com/test/apikeys
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

# Stripe Connect (optional for escrow)
STRIPE_CONNECT_CLIENT_ID=ca_YOUR_CLIENT_ID
STRIPE_PLATFORM_ACCOUNT_ID=acct_YOUR_ACCOUNT_ID

# ===== CHECKOUT CONFIGURATION =====

# Session expiry (minutes)
CHECKOUT_SESSION_EXPIRY=30

# Platform fee percentage
PLATFORM_FEE_PERCENTAGE=2.5

# Tax rate (percentage)
TAX_RATE=8.0

# Shipping
SHIPPING_COST_PER_ITEM=5.00
```

## Testing the Checkout Flow

### 1. Verify Contract Deployment

```bash
# Check if contracts are deployed
npx hardhat verify --network sepolia 0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1

# Or view on Etherscan
# https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1
```

### 2. Get Testnet ETH

Get Sepolia ETH from faucets:
- https://sepoliafaucet.com/
- https://www.alchemy.com/faucets/ethereum-sepolia
- https://faucet.quicknode.com/ethereum/sepolia

### 3. Test Crypto Payment Flow

```javascript
// In browser console
const checkoutService = require('./services/checkoutService');

// Create session
const session = await checkoutService.createCheckoutSession({
  items: [{
    productId: 'test-1',
    quantity: 1,
    price: 0.001, // Small amount for testing
    name: 'Test Product'
  }]
});

// Process with crypto
const result = await checkoutService.processCheckout({
  sessionId: session.sessionId,
  paymentMethod: 'crypto',
  paymentDetails: {
    token: 'ETH',
    network: 'sepolia'
  },
  shippingAddress: {
    fullName: 'Test User',
    addressLine1: '123 Test St',
    city: 'Test City',
    state: 'TC',
    postalCode: '12345',
    country: 'US'
  }
});
```

### 4. Monitor Transactions

View transactions on Sepolia Etherscan:
- Escrow Contract: https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1
- Marketplace: https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A

## Contract Interaction Examples

### Check Escrow Balance

```javascript
const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/YOUR_KEY');
const escrowAddress = '0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1';

// Get contract ABI from app/contracts/artifacts
const escrowABI = require('./app/contracts/artifacts/EnhancedEscrow.json').abi;
const escrow = new ethers.Contract(escrowAddress, escrowABI, provider);

// Check escrow details
const escrowId = 1; // Your escrow ID
const details = await escrow.getEscrowDetails(escrowId);
console.log('Escrow Details:', details);
```

### Create Test Escrow

```javascript
// Connect with signer
const signer = await provider.getSigner();
const escrowWithSigner = escrow.connect(signer);

// Create escrow
const tx = await escrowWithSigner.createEscrow(
  'listing-123',
  buyerAddress,
  sellerAddress,
  testTokenAddress,
  ethers.parseEther('0.001')
);

await tx.wait();
console.log('Escrow created:', tx.hash);
```

## Troubleshooting

### Issue: Transaction fails with "insufficient funds"
**Solution**: Get more Sepolia ETH from faucets

### Issue: Contract not found
**Solution**: Verify you're connected to Sepolia network (Chain ID: 11155111)

### Issue: RPC errors
**Solution**: Use alternative RPC: https://rpc.sepolia.org

### Issue: Metamask not connecting
**Solution**: 
1. Add Sepolia network to Metamask
2. Network Name: Sepolia
3. RPC URL: https://sepolia.infura.io/v3/YOUR_KEY
4. Chain ID: 11155111
5. Currency: SepoliaETH
6. Block Explorer: https://sepolia.etherscan.io

## Next Steps

1. ✅ Contracts deployed on Sepolia
2. ⏳ Add RPC endpoint to `.env`
3. ⏳ Get Sepolia ETH for testing
4. ⏳ Test escrow creation
5. ⏳ Test full checkout flow
6. ⏳ Monitor transactions on Etherscan

## Production Deployment

When ready for mainnet:
1. Deploy contracts to Ethereum mainnet
2. Update contract addresses in `.env`
3. Switch RPC to mainnet endpoint
4. Update Stripe to live mode
5. Test with small amounts first
