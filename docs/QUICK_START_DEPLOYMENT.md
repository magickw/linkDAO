# Quick Start: Finding Deployed Addresses & Claiming Ownership

## Current Status ⚠️

**The addresses in `app/contracts/deployedAddresses.json` are from LOCAL DEVELOPMENT only (Hardhat network).**

These addresses are **NOT** on mainnet, testnets, or any live blockchain network.

## How to Deploy to Live Networks

### 1. Check Current Status

```bash
cd app/contracts

# Check what's currently deployed
npm run check:deployment

# Check specific networks
npm run check:sepolia
npm run check:mainnet
npm run check:polygon
```

### 2. Deploy to Testnet First

```bash
# Deploy to Sepolia testnet
npm run deploy:sepolia

# Deploy to Mumbai (Polygon testnet)  
npm run deploy:mumbai
```

### 3. Deploy to Mainnet

```bash
# Deploy to Ethereum mainnet
npm run deploy:mainnet

# Deploy to Polygon mainnet
npm run deploy:polygon
```

## Environment Setup

Create a `.env` file in `app/contracts/`:

```bash
# Required for deployment
PRIVATE_KEY=your_private_key_here
INFURA_API_KEY=your_infura_key
ETHERSCAN_API_KEY=your_etherscan_key
POLYGONSCAN_API_KEY=your_polygonscan_key

# Optional: Multi-sig for ownership
MULTI_SIG_ADDRESS=0x...
INITIAL_OWNER=0x...
```

## Finding Deployed Addresses

### Method 1: Check JSON Files

After deployment, addresses are saved to:
- `deployedAddresses-mainnet.json` (Ethereum mainnet)
- `deployedAddresses-sepolia.json` (Sepolia testnet)
- `deployedAddresses-polygon.json` (Polygon mainnet)

### Method 2: Use Check Script

```bash
# Check current network deployment
npm run check:deployment

# Check specific network
npm run check:mainnet
```

### Method 3: Etherscan/Polygonscan

1. Go to [Etherscan.io](https://etherscan.io) or [Polygonscan.com](https://polygonscan.com)
2. Search for your deployer address
3. Look for "Contract Creation" transactions
4. Find contract addresses in transaction details

## Claiming Ownership

### If You're the Deployer

```typescript
// Using the deployment script
import { claimOwnership, transferOwnership } from './scripts/deploy-and-claim-ownership';

// Claim ownership (if using Ownable2Step)
await claimOwnership(contractAddress, 'LDAOToken');

// Transfer to new owner
await transferOwnership(contractAddress, 'LDAOToken', newOwnerAddress);
```

### Manual Ownership Check

```typescript
import { ethers } from 'ethers';

// Connect to contract
const contract = new ethers.Contract(address, abi, signer);

// Check current owner
const owner = await contract.owner();
console.log('Current owner:', owner);

// Transfer ownership (if you're current owner)
await contract.transferOwnership(newOwnerAddress);
```

## Security Best Practices

### 1. Use Multi-Sig Wallets

```bash
# Set multi-sig address in .env
MULTI_SIG_ADDRESS=0x1234567890123456789012345678901234567890

# Deploy with multi-sig ownership
npm run deploy:mainnet
```

### 2. Test on Testnet First

```bash
# Always test on Sepolia first
npm run deploy:sepolia
npm run check:sepolia

# Then deploy to mainnet
npm run deploy:mainnet
```

### 3. Verify Contracts

Contracts are automatically verified on Etherscan/Polygonscan during deployment.

## Common Issues & Solutions

### Issue: "No deployment data found"
**Solution**: Deploy contracts first using `npm run deploy:sepolia` or `npm run deploy:mainnet`

### Issue: "You are not the current owner"
**Solution**: Check who the current owner is with `npm run check:deployment`

### Issue: "Contract not found at address"
**Solution**: Verify you're on the correct network and the contract was deployed successfully

### Issue: "Insufficient funds for gas"
**Solution**: Ensure your wallet has enough ETH for gas fees

## Example Workflow

```bash
# 1. Set up environment
cp .env.example .env
# Edit .env with your keys

# 2. Deploy to testnet
npm run deploy:sepolia

# 3. Check deployment
npm run check:sepolia

# 4. Test contract interactions
# (use frontend or scripts to test)

# 5. Deploy to mainnet
npm run deploy:mainnet

# 6. Verify mainnet deployment
npm run check:mainnet

# 7. Set up monitoring
# (monitoring system will automatically detect new contracts)
```

## Contract Addresses Structure

After deployment, you'll get addresses like:

```json
{
  "network": "mainnet",
  "chainId": 1,
  "deployer": "0xYourAddress...",
  "deployedAt": "2024-12-XX...",
  "contracts": {
    "LDAOToken": {
      "address": "0x1234...",
      "owner": "0xYourAddress...",
      "deploymentTx": "0xabcd..."
    },
    "Governance": {
      "address": "0x5678...",
      "owner": "0xYourAddress...",
      "deploymentTx": "0xefgh..."
    }
    // ... all 16 contracts
  }
}
```

## Next Steps After Deployment

1. **Update Frontend**: Use the new contract addresses in your frontend
2. **Set Up Monitoring**: The monitoring system will automatically detect deployed contracts
3. **Configure Governance**: Set up initial governance parameters
4. **Transfer Ownership**: Move ownership to multi-sig or DAO
5. **Community Announcement**: Inform users about the deployment

## Need Help?

- **Documentation**: Check `docs/DEPLOYMENT_ADDRESS_GUIDE.md` for detailed guide
- **Technical Issues**: Review `docs/TROUBLESHOOTING_FAQ.md`
- **Security Concerns**: Follow `app/contracts/security/SecurityAuditChecklist.md`

---

**Remember**: Always test on testnets before mainnet deployment!