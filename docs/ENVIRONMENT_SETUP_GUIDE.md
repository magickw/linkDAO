# Environment Setup Guide

## Overview

This guide walks you through setting up your environment for smart contract deployment, including the new Etherscan V2 Multi-Chain API configuration.

## ⚠️ Important: Etherscan API V2 Migration

**Etherscan V1 API will be fully deprecated on August 15, 2025.** You must migrate to the new Etherscan V2 Multi-Chain API to avoid service disruption.

### What Changed?

- **Single API Key**: One API key now works across 60+ networks
- **New Base URL**: `https://api.etherscan.io/v2/api`
- **Chain ID Parameter**: Specify network using `chainid` parameter
- **Unified Interface**: Same API for Ethereum, Polygon, Arbitrum, Base, etc.

## Quick Setup

### 1. Copy Environment Template

```bash
cd app/contracts
cp .env.example .env
```

### 2. Get API Keys

#### Etherscan V2 Multi-Chain API Key
1. Go to [Etherscan.io](https://etherscan.io/apis)
2. Register for an Etherscan Multi-Chain API Key
3. This single key works for all supported networks

#### RPC Provider Keys
Choose one of these providers:

**Infura** (Recommended)
1. Go to [Infura.io](https://infura.io)
2. Create a project
3. Get your project ID

**Alchemy** (Alternative)
1. Go to [Alchemy.com](https://alchemy.com)
2. Create an app
3. Get your API key

### 3. Configure Your .env File

```bash
# =============================================================================
# REQUIRED: Basic Configuration
# =============================================================================

# Your deployment wallet private key (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# RPC URLs (choose Infura OR Alchemy)
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
POLYGON_RPC_URL=https://polygon-mainnet.infura.io/v3/YOUR_INFURA_KEY
MUMBAI_RPC_URL=https://polygon-mumbai.infura.io/v3/YOUR_INFURA_KEY

# Etherscan V2 API Key (works for all networks)
ETHERSCAN_API_KEY=your_etherscan_v2_api_key

# =============================================================================
# PRODUCTION: Security Configuration
# =============================================================================

# Multi-sig wallet for production ownership
MULTI_SIG_ADDRESS=0x1234567890123456789012345678901234567890

# Treasury address for fee collection
TREASURY_ADDRESS=0x1234567890123456789012345678901234567890
```

## Etherscan V2 API Usage Examples

### Migration from V1 to V2

**Old V1 API (Deprecated):**
```bash
# Ethereum
https://api.etherscan.io/api?module=account&action=balance&address=0x...

# Polygon
https://api.polygonscan.com/api?module=account&action=balance&address=0x...

# Arbitrum
https://api.arbiscan.io/api?module=account&action=balance&address=0x...
```

**New V2 API (Current):**
```bash
# Ethereum (chainid=1)
https://api.etherscan.io/v2/api?chainid=1&module=account&action=balance&address=0x...

# Polygon (chainid=137)
https://api.etherscan.io/v2/api?chainid=137&module=account&action=balance&address=0x...

# Arbitrum (chainid=42161)
https://api.etherscan.io/v2/api?chainid=42161&module=account&action=balance&address=0x...
```

### Chain IDs for Popular Networks

| Network | Chain ID |
|---------|----------|
| Ethereum Mainnet | 1 |
| Ethereum Sepolia | 11155111 |
| Polygon Mainnet | 137 |
| Polygon Mumbai | 80001 |
| Arbitrum One | 42161 |
| Arbitrum Sepolia | 421614 |
| Base Mainnet | 8453 |
| Optimism | 10 |
| BSC Mainnet | 56 |

### JavaScript Example

```javascript
async function getBalance(chainId, address) {
    const response = await fetch(
        `https://api.etherscan.io/v2/api?chainid=${chainId}&module=account&action=balance&address=${address}&tag=latest&apikey=${process.env.ETHERSCAN_API_KEY}`
    );
    const data = await response.json();
    return data.result;
}

// Usage
const ethBalance = await getBalance(1, '0x...'); // Ethereum
const polygonBalance = await getBalance(137, '0x...'); // Polygon
const arbitrumBalance = await getBalance(42161, '0x...'); // Arbitrum
```

## Security Best Practices

### 1. Private Key Management

**❌ Never do this:**
```bash
# Don't use your main wallet
PRIVATE_KEY=your_main_wallet_private_key

# Don't commit to git
git add .env
```

**✅ Do this instead:**
```bash
# Create a dedicated deployment wallet
# Fund it only with what you need for deployment
PRIVATE_KEY=dedicated_deployment_wallet_key

# Add .env to .gitignore (already done)
echo ".env" >> .gitignore
```

### 2. Multi-Signature Setup

For production deployments, always use multi-sig wallets:

```bash
# Use Gnosis Safe or similar
MULTI_SIG_ADDRESS=0x1234567890123456789012345678901234567890

# Set emergency pause authority
EMERGENCY_PAUSE_AUTHORITY=0x1234567890123456789012345678901234567890
```

### 3. Environment Separation

Use different configurations for different environments:

```bash
# Development
cp .env.example .env.development

# Staging
cp .env.example .env.staging

# Production
cp .env.example .env.production
```

## Network-Specific Configuration

### Ethereum Mainnet

```bash
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
GAS_PRICE_MAINNET=20
VERIFY_CONTRACTS=true
```

### Polygon

```bash
POLYGON_RPC_URL=https://polygon-mainnet.infura.io/v3/YOUR_INFURA_KEY
GAS_PRICE_POLYGON=30
VERIFY_CONTRACTS=true
```

### Arbitrum

```bash
ARBITRUM_RPC_URL=https://arbitrum-mainnet.infura.io/v3/YOUR_INFURA_KEY
VERIFY_CONTRACTS=true
```

## Testing Your Configuration

### 1. Check RPC Connectivity

```bash
cd app/contracts

# Test mainnet connection
npm run check:mainnet

# Test sepolia connection
npm run check:sepolia

# Test polygon connection
npm run check:polygon
```

### 2. Verify API Keys

```bash
# Test Etherscan V2 API
curl "https://api.etherscan.io/v2/api?chainid=1&module=stats&action=ethsupply&apikey=YOUR_API_KEY"

# Should return current ETH supply
```

### 3. Test Deployment (Testnet)

```bash
# Deploy to Sepolia testnet first
npm run deploy:sepolia

# Check deployment status
npm run check:sepolia
```

## Common Issues & Solutions

### Issue: "Invalid API Key"

**Solution:**
1. Verify you're using the V2 API key from Etherscan
2. Check the API key is correctly set in `.env`
3. Ensure no extra spaces or characters

### Issue: "Network not supported"

**Solution:**
1. Check the chain ID is correct
2. Verify the RPC URL is working
3. Ensure sufficient balance for gas fees

### Issue: "Contract verification failed"

**Solution:**
1. Wait a few minutes and try again
2. Check the contract was deployed successfully
3. Verify the API key has verification permissions

### Issue: "Insufficient funds for gas"

**Solution:**
1. Check wallet balance: `npm run check:deployment`
2. Fund your deployment wallet
3. Adjust gas price settings

## Advanced Configuration

### Custom Gas Strategies

```bash
# Dynamic gas pricing
GAS_PRICE_STRATEGY=dynamic

# Fixed gas prices (in gwei)
GAS_PRICE_MAINNET=20
GAS_PRICE_POLYGON=30
GAS_PRICE_ARBITRUM=0.1
```

### Monitoring Integration

```bash
# Slack alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Email notifications
ALERT_EMAIL_RECIPIENTS=admin@example.com,security@example.com

# Custom webhook
ALERT_WEBHOOK_URL=https://your-monitoring-system.com/webhook
ALERT_WEBHOOK_TOKEN=your_webhook_token
```

### Performance Optimization

```bash
# Enable performance monitoring
ENABLE_PERFORMANCE_TESTS=true

# Gas optimization
OPTIMIZE_GAS=true

# Batch operations
ENABLE_BATCH_OPERATIONS=true
```

## Deployment Checklist

### Pre-Deployment

- [ ] `.env` file configured with all required values
- [ ] Private key is for a dedicated deployment wallet
- [ ] Deployment wallet has sufficient funds
- [ ] Multi-sig wallet configured for production
- [ ] API keys tested and working
- [ ] RPC endpoints tested and responsive

### Testnet Deployment

- [ ] Deploy to Sepolia: `npm run deploy:sepolia`
- [ ] Verify deployment: `npm run check:sepolia`
- [ ] Test all contract functions
- [ ] Verify contract verification worked
- [ ] Test ownership transfer

### Mainnet Deployment

- [ ] All testnet tests passed
- [ ] Security audit completed
- [ ] Multi-sig wallet ready
- [ ] Deploy to mainnet: `npm run deploy:mainnet`
- [ ] Verify deployment: `npm run check:mainnet`
- [ ] Transfer ownership to multi-sig
- [ ] Set up monitoring and alerts

### Post-Deployment

- [ ] Update frontend with new addresses
- [ ] Update documentation
- [ ] Announce deployment to community
- [ ] Monitor for 24 hours
- [ ] Create incident response plan

## Getting Help

### Resources

- **Etherscan V2 API Docs**: [https://docs.etherscan.io/v/etherscan-v2](https://docs.etherscan.io/v/etherscan-v2)
- **Hardhat Documentation**: [https://hardhat.org/docs](https://hardhat.org/docs)
- **OpenZeppelin Docs**: [https://docs.openzeppelin.com](https://docs.openzeppelin.com)

### Support Channels

- **Technical Issues**: Check `docs/TROUBLESHOOTING_FAQ.md`
- **Security Concerns**: Follow `app/contracts/security/SecurityAuditChecklist.md`
- **Deployment Problems**: Review `docs/DEPLOYMENT_ADDRESS_GUIDE.md`

### Emergency Contacts

If you encounter critical issues during deployment:

1. **Stop the deployment** immediately
2. **Secure any deployed contracts** (pause if possible)
3. **Document the issue** with logs and transaction hashes
4. **Contact the team** with full details

---

**Remember**: Always test on testnets first, use multi-sig wallets for production, and keep your private keys secure!