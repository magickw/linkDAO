# LinkDAO Testnet Cross-Chain Deployment Guide

This guide explains how to deploy the LinkDAO cross-chain infrastructure to testnets for testing and validation before mainnet deployment.

## Prerequisites

Before deployment, ensure you have:

1. **Node.js** (v16 or higher) and **npm** installed
2. **Hardhat** installed globally: `npm install -g hardhat`
3. **Testnet RPC URLs** for:
   - Sepolia (Ethereum testnet)
   - Base Sepolia
   - Polygon Mumbai
   - Arbitrum Goerli
4. **Testnet ETH** for each network
5. **Environment variables** configured in `.env` file

## Environment Setup

Create a `.env` file in the contracts directory with the following variables:

```bash
# RPC URLs
SEPOLIA_RPC_URL="https://sepolia.infura.io/v3/YOUR_INFURA_KEY"
BASE_SEPOLIA_RPC_URL="https://base-sepolia.infura.io/v3/YOUR_INFURA_KEY"
MUMBAI_RPC_URL="https://polygon-mumbai.infura.io/v3/YOUR_INFURA_KEY"
ARBITRUM_GOERLI_RPC_URL="https://arbitrum-goerli.infura.io/v3/YOUR_INFURA_KEY"

# Wallet
PRIVATE_KEY="YOUR_PRIVATE_KEY"

# Etherscan API Keys
ETHERSCAN_API_KEY="YOUR_ETHERSCAN_API_KEY"
POLYGONSCAN_API_KEY="YOUR_POLYGONSCAN_API_KEY"
ARBISCAN_API_KEY="YOUR_ARBISCAN_API_KEY"

# Contract Addresses (to be filled after deployment)
LDAO_TOKEN_ADDRESS="0x..."
LDAO_BRIDGE_ADDRESS="0x..."
BRIDGE_VALIDATOR_ADDRESS="0x..."

# Validator Addresses
VALIDATOR_1_ADDRESS="0x..."
VALIDATOR_2_ADDRESS="0x..."
VALIDATOR_3_ADDRESS="0x..."

# Owner Address
OWNER_ADDRESS="0x..."
```

## Deployment Steps

### 1. Install Dependencies

```bash
cd app/contracts
npm install
```

### 2. Compile Contracts

```bash
npm run compile
```

### 3. Deploy to Testnets

Deploy the cross-chain infrastructure to all testnets:

```bash
npm run deploy:cross-chain:testnet
```

This will deploy:
- LDAO Token, LDAO Bridge, and Bridge Validator on Sepolia
- LDAO Bridge Token on Base Sepolia, Polygon Mumbai, and Arbitrum Goerli

### 4. Set Up Validators

Set up the validator network:

```bash
npm run setup:validators
```

This will:
- Register initial validators
- Set validator staking requirements
- Configure validator threshold

### 5. Initialize Chain Configurations

Initialize chain configurations for each network:

```bash
npm run init:chain-configs
```

This will:
- Configure chain-specific parameters
- Set token addresses for each chain
- Configure fee structures

## Testing

### Run Cross-Chain Tests

```bash
npm run test:cross-chain
```

This will test:
- Bridge transaction initiation
- Validator consensus
- Token minting on destination chains
- Fee collection
- Error handling

### Manual Testing

1. **Sepolia -> Base Sepolia Transfer**
   - Initiate bridge transfer on Sepolia
   - Have validators sign the transaction
   - Verify tokens are minted on Base Sepolia

2. **Sepolia -> Polygon Mumbai Transfer**
   - Initiate bridge transfer on Sepolia
   - Have validators sign the transaction
   - Verify tokens are minted on Polygon Mumbai

3. **Sepolia -> Arbitrum Goerli Transfer**
   - Initiate bridge transfer on Sepolia
   - Have validators sign the transaction
   - Verify tokens are minted on Arbitrum Goerli

## Verification

### Contract Verification

Verify deployed contracts on block explorers:

```bash
# Verify on Etherscan (Sepolia)
npx hardhat verify --network sepolia DEPLOYED_CONTRACT_ADDRESS

# Verify on Base Sepolia
npx hardhat verify --network baseSepolia DEPLOYED_CONTRACT_ADDRESS

# Verify on Polygon Mumbai
npx hardhat verify --network mumbai DEPLOYED_CONTRACT_ADDRESS

# Verify on Arbitrum Goerli
npx hardhat verify --network arbitrumGoerli DEPLOYED_CONTRACT_ADDRESS
```

## Security Audit Preparation

After successful testnet deployment and testing:

1. Document all deployed contract addresses
2. Prepare audit environment with testnet deployments
3. Gather all relevant documentation
4. Schedule security audit with audit firm

## Troubleshooting

### Common Issues

1. **RPC Connection Errors**
   - Verify RPC URLs are correct
   - Check network connectivity
   - Ensure sufficient testnet ETH

2. **Deployment Failures**
   - Check gas price settings
   - Verify private key has sufficient funds
   - Ensure contracts are compiled

3. **Verification Failures**
   - Check Etherscan API keys
   - Verify contract addresses
   - Ensure source code matches deployed bytecode

### Emergency Procedures

1. **Pause Bridge Operations**
   ```bash
   # Call pause() function on LDAOBridge contract
   ```

2. **Emergency Withdraw**
   ```bash
   # Call emergencyWithdraw() function on LDAOBridge contract
   ```

## Next Steps

After successful testnet deployment and testing:

1. Conduct security audit
2. Address any audit findings
3. Prepare for mainnet deployment
4. Set up monitoring and alerting
5. Document operational procedures

## Support

For issues with testnet deployment, contact the development team or refer to the documentation in:
- CROSS_CHAIN_DEPLOYMENT_GUIDE.md
- SECURITY_AUDIT_PREP.md