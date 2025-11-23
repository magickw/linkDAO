# Smart Contracts Documentation

## Overview

LinkDAO's smart contract ecosystem powers the decentralized marketplace, governance, and token economy. All contracts are deployed on Base network and are fully audited.

## Core Contracts

### LDAO Token Contract

**Address**: `TBD`

The LDAO token is an ERC-20 token that serves as the native currency of the LinkDAO ecosystem.

**Key Features:**
- Standard ERC-20 functionality
- Governance voting power
- Staking rewards
- Marketplace transactions

### NFT Marketplace Contract

**Address**: `TBD`

Enables buying, selling, and trading of NFTs within the LinkDAO ecosystem.

**Key Functions:**
- `listItem(tokenId, price)` - List an NFT for sale
- `buyItem(tokenId)` - Purchase a listed NFT
- `cancelListing(tokenId)` - Cancel an active listing

### Governance Contract

**Address**: `TBD`

Manages proposal creation, voting, and execution for DAO governance.

**Key Functions:**
- `propose(targets, values, calldatas, description)` - Create a proposal
- `castVote(proposalId, support)` - Vote on a proposal
- `execute(proposalId)` - Execute a passed proposal

### Payment Router Contract

**Address**: `TBD`

Handles multi-currency payments and routing for marketplace transactions.

**Supported Tokens:**
- LDAO
- USDC
- USDT
- ETH

## Contract Interactions

### Reading Contract Data

```javascript
import { ethers } from 'ethers';

const contract = new ethers.Contract(
  contractAddress,
  contractABI,
  provider
);

const balance = await contract.balanceOf(userAddress);
```

### Writing to Contracts

```javascript
const signer = provider.getSigner();
const contractWithSigner = contract.connect(signer);

const tx = await contractWithSigner.transfer(recipientAddress, amount);
await tx.wait();
```

## Security

All LinkDAO smart contracts have been:
- ✅ Audited by leading security firms
- ✅ Tested with comprehensive test suites
- ✅ Deployed with multi-sig governance
- ✅ Monitored 24/7 for anomalies

## Contract Addresses

### Base Mainnet
- LDAO Token: `TBD`
- NFT Marketplace: `TBD`
- Governance: `TBD`
- Payment Router: `TBD`

### Base Sepolia (Testnet)
- LDAO Token: `TBD`
- NFT Marketplace: `TBD`
- Governance: `TBD`
- Payment Router: `TBD`

## Further Reading

- [Technical Whitepaper](/api/docs/technical-whitepaper) - Detailed architecture
- [API Reference](/docs/api-reference) - API documentation
- [Security Framework](/docs/security) - Security best practices
