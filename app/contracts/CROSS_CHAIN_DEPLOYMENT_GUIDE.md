# LinkDAO Cross-Chain Deployment Guide

This guide explains how to deploy LinkDAO's cross-chain infrastructure across multiple EVM-compatible chains.

## Overview

LinkDAO supports cross-chain token transfers through a bridge infrastructure that includes:
- **LDAOBridge**: Main bridge contract that manages cross-chain transfers
- **LDAOBridgeToken**: Bridged token contract for destination chains
- **BridgeValidator**: Validator consensus mechanism for transaction verification

## Supported Chains

The current implementation supports the following chains:

1. **Ethereum Mainnet** (Chain ID: 1) - Source chain (lock mechanism)
2. **Base Mainnet** (Chain ID: 8453) - Destination chain (mint mechanism)
3. **Polygon Mainnet** (Chain ID: 137) - Destination chain (mint mechanism)
4. **Arbitrum One** (Chain ID: 42161) - Destination chain (mint mechanism)

## Prerequisites

Before deployment, ensure you have:

1. **RPC URLs** for each chain
2. **Private key** with sufficient funds for deployment
3. **LDAO Token** deployed on Ethereum (source chain)
4. **Chainlink Oracle Addresses** for each chain

## Configuration

The cross-chain deployment is configured through `cross-chain-deployment-config.json`. This file contains:

### Chain Configurations
- RPC URLs and network parameters for each chain
- Oracle addresses for ETH/USD price feeds
- Gas price configurations

### Bridge Parameters
- Validator threshold requirements
- Bridge fees (base fee and percentage)
- Minimum/maximum bridge amounts

### Validator Setup
- Initial validator addresses
- Required stake amounts

## Deployment Process

### 1. Prepare Environment

Set the required environment variables:

```bash
export ETHEREUM_RPC_URL="your_ethereum_rpc_url"
export BASE_MAINNET_RPC_URL="your_base_rpc_url"
export POLYGON_RPC_URL="your_polygon_rpc_url"
export ARBITRUM_RPC_URL="your_arbitrum_rpc_url"
export OWNER_ADDRESS="your_owner_address"
export VALIDATOR_ADDRESSES="validator1,validator2,validator3,validator4,validator5"
```

### 2. Deploy Contracts

Run the cross-chain deployment script:

```bash
npx hardhat run scripts/deploy-cross-chain.ts --network mainnet
```

### 3. Configure Chain Parameters

After deployment, configure chain-specific parameters:

```bash
# Configure Ethereum (source chain)
npx hardhat run scripts/configure-ethereum-bridge.ts --network mainnet

# Configure Base (destination chain)
npx hardhat run scripts/configure-base-bridge.ts --network base

# Configure Polygon (destination chain)
npx hardhat run scripts/configure-polygon-bridge.ts --network polygon

# Configure Arbitrum (destination chain)
npx hardhat run scripts/configure-arbitrum-bridge.ts --network arbitrum
```

### 4. Set Up Validators

Register validators on each chain:

```bash
npx hardhat run scripts/setup-validators.ts --network mainnet
```

### 5. Initialize Chain Configurations

Initialize chain configurations on the bridge contract:

```bash
npx hardhat run scripts/initialize-chain-configs.ts --network mainnet
```

## Bridge Operation

### Cross-Chain Transfer Flow

1. **User initiates bridge** on source chain (Ethereum)
2. **Tokens are locked** in the LDAOBridge contract
3. **Validators verify** the transaction
4. **Tokens are minted** on the destination chain
5. **User receives** bridged tokens on destination chain

### Validator Responsibilities

Validators must:
1. Monitor bridge transactions
2. Verify transaction details
3. Sign valid transactions
4. Maintain sufficient stake
5. Keep reputation above minimum threshold

## Security Considerations

### Validator Security
- Validators must use secure key management
- Validators should maintain high uptime
- Validators must keep reputation above 50
- Validators should monitor for suspicious activity

### Bridge Security
- Bridge uses multi-signature validation (threshold of 3)
- Bridge includes emergency pause functionality
- Bridge has configurable timeouts for transactions
- Bridge implements slashing for malicious validators

### Oracle Security
- Chainlink oracles provide ETH/USD price feeds
- Oracles are chain-specific with proper addresses
- Oracle data is used for fee calculations

## Monitoring and Maintenance

### Key Metrics to Monitor
1. Bridge transaction volume
2. Validator uptime and reputation
3. Bridge fees collected
4. Token supply across chains
5. Emergency pause events

### Regular Maintenance Tasks
1. Update validator sets
2. Adjust fee parameters
3. Upgrade contracts when needed
4. Monitor for security vulnerabilities

## Troubleshooting

### Common Issues

1. **Transaction Timeout**
   - Check validator activity
   - Increase validator threshold temporarily
   - Review network congestion

2. **Insufficient Validator Signatures**
   - Verify validator status
   - Check validator stake amounts
   - Ensure validators are active

3. **Bridge Configuration Errors**
   - Verify chain configurations
   - Check token addresses
   - Review fee parameters

### Emergency Procedures

1. **Pause Bridge Operations**
   ```bash
   npx hardhat run scripts/emergency-pause.ts --network mainnet
   ```

2. **Remove Malicious Validator**
   ```bash
   npx hardhat run scripts/remove-validator.ts --network mainnet
   ```

3. **Emergency Withdraw**
   ```bash
   npx hardhat run scripts/emergency-withdraw.ts --network mainnet
   ```

## Upgrading to New Chains

To add support for additional chains:

1. Update `cross-chain-deployment-config.json` with new chain information
2. Deploy LDAOBridgeToken on the new chain
3. Configure chain parameters in the bridge contract
4. Add validators for the new chain
5. Test cross-chain transfers

## Best Practices

1. **Gradual Rollout**
   - Start with small transfer amounts
   - Monitor closely during initial deployment
   - Gradually increase limits based on performance

2. **Validator Diversity**
   - Distribute validators across different entities
   - Ensure geographic distribution
   - Maintain backup validator infrastructure

3. **Regular Audits**
   - Conduct security audits periodically
   - Review validator performance
   - Update configurations based on usage patterns

4. **Documentation**
   - Maintain up-to-date deployment documentation
   - Document all configuration changes
   - Keep incident response procedures current

## Conclusion

The LinkDAO cross-chain infrastructure provides a robust foundation for multi-chain token transfers. By following this guide, you can successfully deploy and operate the bridge system across multiple EVM-compatible chains while maintaining security and reliability.