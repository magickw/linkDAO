# Smart Contract Deployment Address Guide

## Overview

This guide explains how to find deployed smart contract addresses and claim ownership after deployment to live blockchain networks (mainnet, testnets).

## Current Deployment Status

**⚠️ IMPORTANT**: The addresses in `app/contracts/deployedAddresses.json` are from a **local Hardhat network** (chainId: 31337), not from live blockchain networks.

### Local Network Addresses (Development Only)
```json
{
  "PROFILE_REGISTRY_ADDRESS": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "FOLLOW_MODULE_ADDRESS": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  "PAYMENT_ROUTER_ADDRESS": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  "GOVERNANCE_ADDRESS": "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  "TOKEN_ADDRESS": "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
  "deployer": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "network": "localhost",
  "chainId": "31337"
}
```

These addresses are **only valid on your local development environment** and cannot be used on mainnet or testnets.

## How to Deploy to Live Networks

### 1. Deploy to Testnet First

```bash
# Deploy to Sepolia testnet
cd app/contracts
npm run deploy:sepolia

# Deploy to Mumbai (Polygon testnet)
npm run deploy:mumbai
```

### 2. Deploy to Mainnet

```bash
# Deploy to Ethereum mainnet
npm run deploy:mainnet

# Deploy to Polygon mainnet
npm run deploy:polygon
```

## Finding Deployed Contract Addresses

### Method 1: Check Deployment Output

When you run the deployment scripts, they will output the addresses:

```bash
✅ LDAOToken deployed to: 0x1234567890123456789012345678901234567890
✅ Governance deployed to: 0x2345678901234567890123456789012345678901
✅ Marketplace deployed to: 0x3456789012345678901234567890123456789012
```

### Method 2: Check deployedAddresses.json

After successful deployment, the addresses will be saved to:

```bash
# For different networks
app/contracts/deployedAddresses-mainnet.json
app/contracts/deployedAddresses-sepolia.json
app/contracts/deployedAddresses-polygon.json
```

### Method 3: Check Etherscan/Polygonscan

1. Go to [Etherscan.io](https://etherscan.io) (for Ethereum) or [Polygonscan.com](https://polygonscan.com) (for Polygon)
2. Search for your deployer address
3. Look at the "Contract Creation" transactions
4. Find the contract addresses from the transaction details

### Method 4: Use the Contract Registry

```typescript
// Connect to the deployed ContractRegistry
const registry = new ethers.Contract(
  REGISTRY_ADDRESS,
  registryABI,
  provider
);

// Get specific contract addresses
const ldaoTokenAddress = await registry.getContract("LDAOToken");
const governanceAddress = await registry.getContract("Governance");
const marketplaceAddress = await registry.getContract("Marketplace");
```

## Claiming Contract Ownership

### Understanding Ownership Structure

Most contracts use OpenZeppelin's `Ownable` pattern:

```solidity
contract MyContract is Ownable {
    constructor() {
        _transferOwnership(msg.sender); // Deployer becomes initial owner
    }
}
```

### Step 1: Verify Current Owner

```typescript
import { ethers } from 'ethers';

// Connect to the contract
const contract = new ethers.Contract(
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
  provider
);

// Check current owner
const currentOwner = await contract.owner();
console.log('Current owner:', currentOwner);
```

### Step 2: Transfer Ownership (If You're Current Owner)

```typescript
// Connect with the current owner's wallet
const ownerWallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
const contractWithOwner = contract.connect(ownerWallet);

// Transfer to new owner
const newOwnerAddress = "0x..."; // Your new address
const tx = await contractWithOwner.transferOwnership(newOwnerAddress);
await tx.wait();

console.log('Ownership transferred to:', newOwnerAddress);
```

### Step 3: Accept Ownership (Two-Step Process)

Some contracts use `Ownable2Step` for safer transfers:

```typescript
// Step 1: Current owner proposes transfer
await contractWithOwner.transferOwnership(newOwnerAddress);

// Step 2: New owner accepts transfer
const newOwnerWallet = new ethers.Wallet(NEW_OWNER_PRIVATE_KEY, provider);
const contractWithNewOwner = contract.connect(newOwnerWallet);
await contractWithNewOwner.acceptOwnership();
```

## Multi-Signature Ownership

For production deployments, ownership should be transferred to a multi-sig wallet:

### Step 1: Deploy Multi-Sig Wallet

```typescript
// Using Gnosis Safe or similar
const multiSigAddress = "0x..."; // Your multi-sig wallet address
```

### Step 2: Transfer All Contracts to Multi-Sig

```typescript
const contracts = [
  { name: 'LDAOToken', address: '0x...' },
  { name: 'Governance', address: '0x...' },
  { name: 'Marketplace', address: '0x...' },
  // ... other contracts
];

for (const contractInfo of contracts) {
  const contract = new ethers.Contract(
    contractInfo.address,
    contractABI,
    ownerWallet
  );
  
  await contract.transferOwnership(multiSigAddress);
  console.log(`${contractInfo.name} ownership transferred to multi-sig`);
}
```

## Governance-Controlled Ownership

For DAO governance, transfer ownership to the Governance contract:

```typescript
// Transfer ownership to DAO
const governanceAddress = "0x..."; // Governance contract address

await ldaoToken.transferOwnership(governanceAddress);
await marketplace.transferOwnership(governanceAddress);
// ... transfer other contracts
```

## Verification Checklist

### Before Claiming Ownership

- [ ] Verify you have the correct contract addresses
- [ ] Confirm you're on the right network (mainnet/testnet)
- [ ] Check current owner with `contract.owner()`
- [ ] Ensure you have sufficient ETH for gas fees
- [ ] Test on testnet first

### After Claiming Ownership

- [ ] Verify ownership transfer completed
- [ ] Test admin functions work correctly
- [ ] Update documentation with new owner
- [ ] Set up monitoring for the contracts
- [ ] Configure emergency procedures

## Emergency Procedures

### If You Lose Access to Owner Account

1. **Check if contracts use Ownable2Step**: You might be able to recover if transfer is pending
2. **Multi-sig recovery**: If ownership is with multi-sig, use recovery mechanisms
3. **Governance recovery**: If DAO-controlled, use governance proposals
4. **Contact team**: Reach out to other team members who might have access

### If Contracts Are Compromised

1. **Pause contracts** (if pause functionality exists):
   ```typescript
   await contract.pause();
   ```

2. **Emergency governance**: Use emergency multi-sig if available

3. **Community notification**: Inform users immediately

## Tools and Resources

### Deployment Tools

- **Hardhat**: Local development and deployment
- **Foundry**: Alternative deployment framework
- **Remix**: Browser-based deployment
- **Defender**: OpenZeppelin's deployment and monitoring

### Monitoring Tools

- **Etherscan**: Transaction and contract monitoring
- **Tenderly**: Advanced debugging and monitoring
- **Defender Sentinel**: Automated monitoring and alerts
- **Custom monitoring**: Use the monitoring system we built

### Multi-Sig Wallets

- **Gnosis Safe**: Most popular multi-sig solution
- **Argent**: Mobile-friendly multi-sig
- **Custom multi-sig**: Use our MultiSigWallet contract

## Example Deployment Script

```typescript
// scripts/deploy-and-setup-ownership.ts
import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying with account:', deployer.address);

  // Deploy contracts
  const LDAOToken = await ethers.getContractFactory('LDAOToken');
  const ldaoToken = await LDAOToken.deploy();
  await ldaoToken.deployed();

  console.log('LDAOToken deployed to:', ldaoToken.address);

  // Set up multi-sig ownership
  const MULTI_SIG_ADDRESS = process.env.MULTI_SIG_ADDRESS;
  if (MULTI_SIG_ADDRESS) {
    await ldaoToken.transferOwnership(MULTI_SIG_ADDRESS);
    console.log('Ownership transferred to multi-sig:', MULTI_SIG_ADDRESS);
  }

  // Save addresses
  const addresses = {
    LDAOToken: ldaoToken.address,
    deployer: deployer.address,
    network: network.name,
    chainId: network.config.chainId,
    deployedAt: new Date().toISOString()
  };

  fs.writeFileSync(
    `deployedAddresses-${network.name}.json`,
    JSON.stringify(addresses, null, 2)
  );
}

main().catch(console.error);
```

## Security Best Practices

### 1. Use Hardware Wallets
- Never use private keys directly in production
- Use hardware wallets (Ledger, Trezor) for owner accounts
- Store backup phrases securely

### 2. Multi-Signature Requirements
- Use multi-sig for all production contracts
- Require multiple signatures for critical operations
- Distribute signing keys across trusted parties

### 3. Timelock Mechanisms
- Implement timelocks for critical changes
- Allow community review before execution
- Provide emergency override mechanisms

### 4. Regular Security Audits
- Schedule regular security reviews
- Monitor for unusual activity
- Keep emergency response procedures updated

## Contact Information

If you need help with deployment or ownership:

- **Technical Support**: [SUPPORT_EMAIL]
- **Security Issues**: [SECURITY_EMAIL]
- **Emergency Contact**: [EMERGENCY_PHONE]
- **Documentation**: [DOCS_URL]
- **Community**: [DISCORD_URL]

---

**⚠️ Important Notes:**

1. **No Live Deployments Yet**: The current addresses are only for local development
2. **Test First**: Always test on testnets before mainnet deployment
3. **Security First**: Use multi-sig wallets and proper security practices
4. **Documentation**: Keep detailed records of all deployments and ownership transfers
5. **Community**: Inform the community about ownership structures and governance

---

*This guide will be updated as contracts are deployed to live networks. Check back for the latest deployment addresses and procedures.*