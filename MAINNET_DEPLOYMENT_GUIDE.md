# LinkDAO Mainnet Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying LinkDAO smart contracts to the Ethereum mainnet. It includes pre-deployment checklists, deployment procedures, and post-deployment verification steps.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Contract Deployment](#contract-deployment)
4. [Post-Deployment Verification](#post-deployment-verification)
5. [Monitoring Setup](#monitoring-setup)
6. [Emergency Procedures](#emergency-procedures)
7. [Troubleshooting](#troubleshooting)

## Pre-Deployment Checklist

### Security Audits ✅
- [ ] Third-party audit completed (Trail of Bits/OpenZeppelin)
- [ ] All critical and high-severity issues resolved
- [ ] Medium issues documented and accepted
- [ ] Audit report published

### Technical Requirements ✅
- [ ] Solidity version 0.8.20
- [ ] All contracts verified on Etherscan
- [ ] Gas optimization completed
- [ ] Test coverage >90% on critical contracts

### Infrastructure ✅
- [ ] Multi-sig wallet configured (3/5 signatures required)
- [ ] Hardware security modules (HSMs) set up
- [ ] Monitoring infrastructure deployed
- [ ] Alert systems configured
- [ ] Backup systems verified

### Legal & Compliance ✅
- [ ] Legal review completed
- [ ] KYC/AML procedures in place
- [ ] Regulatory approvals obtained
- [ ] Terms of service updated
- [ ] Privacy policy compliant

### Financial ✅
- [ ] Treasury funded with sufficient LDAO
- [ ] Insurance fund capitalized (1000 ETH)
- [ ] Bridge insurance fund ready
- [ ] Operational budget allocated
- [ ] Emergency fund established

## Environment Setup

### Required Tools
```bash
# Node.js
node --version  # >= 18.0.0

# npm
npm --version # >= 8.0.0

# Hardhat
npx hardhat --version # >= 2.17.0

# Git
git --version  # >= 2.30.0
```

### Installation
```bash
# Clone repository
git clone https://github.com/magickw/linkdao.git
cd linkdao

# Install dependencies
npm install

# Compile contracts
npm run compile

# Run tests
npm run test
```

### Environment Configuration
```bash
# Copy environment template
cp .env.mainnet.example .env.mainnet

# Edit environment variables
nano .env.mainnet
```

Required variables in `.env.mainnet`:
```env
# Network Configuration
PRIVATE_KEY=your_encrypted_private_key
RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
ETHERSCAN_API_KEY=your_etherscan_api_key

# Contract Addresses (will be populated after deployment)
NEXT_PUBLIC_LDAO_TOKEN_ADDRESS=
NEXT_PUBLIC_TREASURY_ADDRESS=
NEXT_PUBLIC_GOVERNANCE_ADDRESS=
# ... other addresses
```

## Contract Deployment

### 1. Deploy Core Contracts

```bash
# Deploy to mainnet
npx hardhat run deploy-mainnet --network mainnet
```

Expected output:
```
✅ LDAOToken deployed to: 0x...
✅ LDAOTreasury deployed to: 0x...
✅ Governance deployed to: 0x...
✅ ReputationSystem deployed to: 0x...
✅ ProfileRegistry deployed to: 0x...
```

### 2. Deploy Charity System

```bash
# Deploy charity monitoring
npx hardhat run deploy-charity-monitor --network mainnet

# Deploy reputation bridge
npx hardhat run deploy-reputation-bridge --network mainnet
```

### 3. Deploy Bridge System (Optional)

```bash
# Deploy bridge contracts
npx hardhat run deploy-bridge-mainnet --network mainnet
```

### 4. Verify All Contracts

```bash
# Check all contracts on Etherscan
npx hardhat run check-verification --network mainnet
```

## Post-Deployment Verification

### 1. Contract Verification

```bash
# Check all contracts on Etherscan
npx hardhat run check-verification --network mainnet
```

### 2. Initial Configuration

```bash
# Configure charity system
npx hardhat run configure-charity --network mainnet

# Set up monitoring
npx hardhat run setup-monitoring --network mainnet
```

### 3. Test Transactions

```bash
# Test charity verification
npx hardhat run test-charity-flow --network mainnet

# Test reputation bridge
npx hardhat run test-reputation-bridge --network mainnet
```

### 4. Multi-Sig Setup

```bash
# Configure multi-sig wallet
npx hardhat run setup-multisig --network mainnet
```

Expected multi-sig addresses:
```
1. Owner 1: 0x...
2. Owner 2: 0x...
3. Owner 3: 0x...
```

### 5. Fund Treasury

```bash
# Fund treasury with initial supply
npx hardhat run fund-treasury --network mainnet --amount 1000000
```

## Monitoring Setup

### 1. Contract Monitoring

```bash
# Deploy monitoring contracts
npx hardhat run deploy-monitoring --network mainnet
```

### 2. Alert Configuration

```bash
# Configure alert thresholds
npx hardhat run configure-alerts --network mainnet \
  --daily-limit 400000 \
  --single-limit 50000 \
  --low-fund 1000000
```

### 3. Dashboard Setup

```bash
# Deploy monitoring dashboard
npm run build:dashboard
npm run deploy:dashboard
```

### 4. Notification Setup

Configure notifications in your monitoring system:
- Email alerts for critical events
- Slack notifications for important updates
- PagerDuty for emergency situations

## Emergency Procedures

### 1. Emergency Pause

```bash
# Emergency pause all operations
npx hardhat run emergency-pause --network mainnet
```

### 2. Fund Recovery

```bash
# Recover funds from compromised contract
npx hardhat run emergency-recovery --network mainnet
```

### 3. Contract Upgrade

```bash
# Upgrade contract implementation
npx hardhat run upgrade-contract --network mainnet \
  --contract LDAOTreasury \
  --implementation 0x...
```

## Troubleshooting

### Common Issues

#### 1. Gas Limit Exceeded
```bash
# Increase gas limit
npx hardhat run deploy-with-gas-limit --network mainnet --gaslimit 8000000
```

#### 2. Transaction Stuck
```bash
# Cancel stuck transaction
npx hardhat run cancel-transaction --tx 0x...
```

#### 3. Verification Failed
```bash
# Re-verify contract
npx hardhat run verify-contract --network mainnet \
  --address 0x... \
  --contract LDAOTreasury
```

### Support Contacts

- **Technical Support**: tech@linkdao.io
- **Security Team**: security@linkdao.io
- **Emergency**: emergency@linkdao.io

## Post-Deployment Checklist

### Immediate (First Hour)
- [ ] All contracts verified on Etherscan
- [ ] Multi-sig wallet configured
- [ ] Initial treasury funded
- [ ] Monitoring active

### Short-term (First 24 Hours)
- [ ] Charity governance tested
- [ ] Reputation bridge functional
- [ ] Alert systems working
- [ ] Community notified

### Medium-term (First Week)
- [ ] Performance monitoring stable
- [ ] User adoption metrics collected
- [ ] Bug bounty program launched
- [ ] Documentation updated

## Security Considerations

### Private Key Security
- Store private keys in hardware wallets
- Use encrypted storage for backup keys
- Never expose private keys in code
- Rotate keys periodically

### Contract Security
- Implement time-locks for critical functions
- Use multi-sig for admin operations
- Monitor for unusual activity
- Keep contracts up-to-date

### Network Security
- Use reputable RPC providers
- Implement DDoS protection
- Monitor for sandwich attacks
- Use secure connections (HTTPS)

## Appendix

### A. Contract Addresses

Will be populated after deployment:
```
LDAOToken: 0x...
LDAOTreasury: 0x...
Governance: 0x...
ReputationSystem: 0x...
ProfileRegistry: 0x...
CharityMonitor: 0x...
ReputationBridge: 0x...
```

### B. ABI Files

ABIs will be generated in `artifacts/contracts/` directory after compilation.

### C. Deployment Scripts

All deployment scripts are located in `scripts/` directory with appropriate naming conventions.

---

**⚠️ WARNING**: Always test thoroughly on testnet before mainnet deployment. Never deploy unaudited code to mainnet.

**📧 For support**, contact the LinkDAO team at support@linkdao.io