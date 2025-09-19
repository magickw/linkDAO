# Smart Contract Integration Guide

## Overview

This guide provides step-by-step instructions for integrating with the Web3 marketplace smart contracts. It includes setup instructions, code examples, and best practices for developers building applications on top of the platform.

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Hardhat development environment
- MetaMask or similar Web3 wallet
- Basic knowledge of Ethereum and smart contracts

### Installation

```bash
# Clone the repository
git clone https://github.com/example/web3-marketplace
cd web3-marketplace/app/contracts

# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test
```

### Environment Setup

Create a `.env` file with the following variables:

```env
# Network Configuration
PRIVATE_KEY=your_private_key_here
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_infura_key
MAINNET_RPC_URL=https://mainnet.infura.io/v3/your_infura_key

# Contract Addresses (will be populated after deployment)
LDAO_TOKEN_ADDRESS=
GOVERNANCE_ADDRESS=
MARKETPLACE_ADDRESS=
ESCROW_ADDRESS=
REPUTATION_ADDRESS=
NFT_MARKETPLACE_ADDRESS=

# API Keys
ETHERSCAN_API_KEY=your_etherscan_api_key
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key
```

## Contract Deployment

### Local Development

```bash
# Start local Hardhat node
npx hardhat node

# Deploy contracts to local network
npx hardhat run scripts/deploy-all.ts --network localhost
```

### Testnet Deployment

```bash
# Deploy to Sepolia testnet
npx hardhat run scripts/deploy-production.ts --network sepolia
```

### Mainnet Deployment

```bash
# Deploy to mainnet (requires proper configuration)
npx hardhat run scripts/deploy-production.ts --network mainnet
```

## Frontend Integration

### Web3 Setup

```javascript
// Install required packages
// npm install ethers @metamask/sdk

import { ethers } from 'ethers';
import { MetaMaskSDK } from '@metamask/sdk';

// Initialize MetaMask
const MMSDK = new MetaMaskSDK();
const ethereum = MMSDK.getProvider();

// Create provider and signer
const provider = new ethers.BrowserProvider(ethereum);
const signer = await provider.getSigner();

// Contract addresses (from deployment)
const CONTRACT_ADDRESSES = {
  LDAO_TOKEN: '0x...',
  MARKETPLACE: '0x...',
  ESCROW: '0x...',
  REPUTATION: '0x...',
  NFT_MARKETPLACE: '0x...'
};

// Contract ABIs (import from artifacts)
import LDAOTokenABI from './artifacts/contracts/LDAOToken.sol/LDAOToken.json';
import MarketplaceABI from './artifacts/contracts/Marketplace.sol/Marketplace.json';
```

### Contract Instances

```javascript
// Create contract instances
const ldaoToken = new ethers.Contract(
  CONTRACT_ADDRESSES.LDAO_TOKEN,
  LDAOTokenABI.abi,
  signer
);

const marketplace = new ethers.Contract(
  CONTRACT_ADDRESSES.MARKETPLACE,
  MarketplaceABI.abi,
  signer
);

const reputation = new ethers.Contract(
  CONTRACT_ADDRESSES.REPUTATION,
  ReputationABI.abi,
  signer
);
```

## Common Integration Patterns

### 1. Token Operations

#### Check Token Balance

```javascript
async function getTokenBalance(userAddress) {
  try {
    const balance = await ldaoToken.balanceOf(userAddress);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error('Error getting token balance:', error);
    throw error;
  }
}
```

#### Stake Tokens

```javascript
async function stakeTokens(amount, lockPeriod) {
  try {
    // Convert amount to wei
    const amountWei = ethers.parseEther(amount.toString());
    
    // Check allowance first
    const allowance = await ldaoToken.allowance(
      await signer.getAddress(),
      CONTRACT_ADDRESSES.LDAO_TOKEN
    );
    
    if (allowance < amountWei) {
      // Approve tokens for staking
      const approveTx = await ldaoToken.approve(
        CONTRACT_ADDRESSES.LDAO_TOKEN,
        amountWei
      );
      await approveTx.wait();
    }
    
    // Stake tokens
    const stakeTx = await ldaoToken.stake(amountWei, lockPeriod);
    const receipt = await stakeTx.wait();
    
    // Get stake ID from events
    const stakeEvent = receipt.logs.find(
      log => log.fragment?.name === 'Staked'
    );
    const stakeId = stakeEvent.args.stakeId;
    
    return { stakeId, txHash: receipt.hash };
  } catch (error) {
    console.error('Error staking tokens:', error);
    throw error;
  }
}
```

#### Get Voting Power

```javascript
async function getVotingPower(userAddress) {
  try {
    const votingPower = await ldaoToken.getVotingPower(userAddress);
    return ethers.formatEther(votingPower);
  } catch (error) {
    console.error('Error getting voting power:', error);
    throw error;
  }
}
```

### 2. Marketplace Operations

#### Create Listing

```javascript
async function createListing(tokenAddress, tokenId, price, quantity, listingType) {
  try {
    const priceWei = ethers.parseEther(price.toString());
    
    // If selling an NFT, approve the marketplace first
    if (tokenAddress !== ethers.ZeroAddress) {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function approve(address to, uint256 tokenId)'],
        signer
      );
      
      const approveTx = await tokenContract.approve(
        CONTRACT_ADDRESSES.MARKETPLACE,
        tokenId
      );
      await approveTx.wait();
    }
    
    // Create listing
    const listingTx = await marketplace.createListing(
      tokenAddress,
      tokenId,
      priceWei,
      quantity,
      listingType
    );
    
    const receipt = await listingTx.wait();
    
    // Get listing ID from events
    const listingEvent = receipt.logs.find(
      log => log.fragment?.name === 'ListingCreated'
    );
    const listingId = listingEvent.args.listingId;
    
    return { listingId, txHash: receipt.hash };
  } catch (error) {
    console.error('Error creating listing:', error);
    throw error;
  }
}
```

#### Buy Item

```javascript
async function buyItem(listingId, quantity) {
  try {
    // Get listing details
    const listing = await marketplace.getListing(listingId);
    const totalPrice = listing.price * BigInt(quantity);
    
    // Buy item
    const buyTx = await marketplace.buyItem(listingId, quantity, {
      value: listing.tokenAddress === ethers.ZeroAddress ? totalPrice : 0
    });
    
    const receipt = await buyTx.wait();
    return { txHash: receipt.hash };
  } catch (error) {
    console.error('Error buying item:', error);
    throw error;
  }
}
```

#### Get Listings

```javascript
async function getActiveListings(offset = 0, limit = 20) {
  try {
    const listingCount = await marketplace.listingCount();
    const listings = [];
    
    const start = Math.max(0, Number(listingCount) - offset - limit);
    const end = Math.max(0, Number(listingCount) - offset);
    
    for (let i = start; i < end; i++) {
      try {
        const listing = await marketplace.getListing(i);
        if (listing.status === 0) { // Active status
          listings.push({
            id: i,
            seller: listing.seller,
            tokenAddress: listing.tokenAddress,
            price: ethers.formatEther(listing.price),
            quantity: Number(listing.quantity),
            listingType: Number(listing.listingType)
          });
        }
      } catch (error) {
        // Skip invalid listings
        continue;
      }
    }
    
    return listings.reverse(); // Most recent first
  } catch (error) {
    console.error('Error getting listings:', error);
    throw error;
  }
}
```

### 3. Reputation System

#### Submit Review

```javascript
async function submitReview(userAddress, rating, comment, transactionId) {
  try {
    const reviewTx = await reputation.submitReview(
      userAddress,
      rating,
      comment,
      transactionId
    );
    
    const receipt = await reviewTx.wait();
    return { txHash: receipt.hash };
  } catch (error) {
    console.error('Error submitting review:', error);
    throw error;
  }
}
```

#### Get Reputation Score

```javascript
async function getReputationScore(userAddress) {
  try {
    const reputationData = await reputation.getReputationScore(userAddress);
    
    return {
      score: Number(reputationData.score),
      reviewCount: Number(reputationData.reviewCount),
      averageRating: Number(reputationData.averageRating) / 100, // Convert from scaled value
      tier: Number(reputationData.tier)
    };
  } catch (error) {
    console.error('Error getting reputation score:', error);
    throw error;
  }
}
```

### 4. NFT Operations

#### Mint NFT

```javascript
async function mintNFT(recipientAddress, tokenURI, royaltyBasisPoints) {
  try {
    const mintTx = await nftMarketplace.mintNFT(
      recipientAddress,
      tokenURI,
      royaltyBasisPoints
    );
    
    const receipt = await mintTx.wait();
    
    // Get token ID from events
    const mintEvent = receipt.logs.find(
      log => log.fragment?.name === 'NFTMinted'
    );
    const tokenId = mintEvent.args.tokenId;
    
    return { tokenId, txHash: receipt.hash };
  } catch (error) {
    console.error('Error minting NFT:', error);
    throw error;
  }
}
```

#### List NFT

```javascript
async function listNFT(tokenId, price, listingType) {
  try {
    const priceWei = ethers.parseEther(price.toString());
    
    // Approve NFT marketplace to transfer the NFT
    const approveTx = await nftMarketplace.approve(
      CONTRACT_ADDRESSES.NFT_MARKETPLACE,
      tokenId
    );
    await approveTx.wait();
    
    // List NFT
    const listTx = await nftMarketplace.listNFT(
      tokenId,
      priceWei,
      listingType
    );
    
    const receipt = await listTx.wait();
    
    // Get listing ID from events
    const listEvent = receipt.logs.find(
      log => log.fragment?.name === 'NFTListed'
    );
    const listingId = listEvent.args.listingId;
    
    return { listingId, txHash: receipt.hash };
  } catch (error) {
    console.error('Error listing NFT:', error);
    throw error;
  }
}
```

### 5. Governance Operations

#### Create Proposal

```javascript
async function createProposal(description, category, targetContract, functionCall, parameters) {
  try {
    // Encode function call
    const iface = new ethers.Interface([functionCall]);
    const encodedData = iface.encodeFunctionData(
      functionCall.split('(')[0],
      parameters
    );
    
    // Create proposal
    const proposalTx = await governance.createProposal(
      description,
      category,
      encodedData
    );
    
    const receipt = await proposalTx.wait();
    
    // Get proposal ID from events
    const proposalEvent = receipt.logs.find(
      log => log.fragment?.name === 'ProposalCreated'
    );
    const proposalId = proposalEvent.args.proposalId;
    
    return { proposalId, txHash: receipt.hash };
  } catch (error) {
    console.error('Error creating proposal:', error);
    throw error;
  }
}
```

#### Vote on Proposal

```javascript
async function voteOnProposal(proposalId, support) {
  try {
    const voteTx = await governance.vote(proposalId, support);
    const receipt = await voteTx.wait();
    
    return { txHash: receipt.hash };
  } catch (error) {
    console.error('Error voting on proposal:', error);
    throw error;
  }
}
```

## Event Listening

### Setting Up Event Listeners

```javascript
// Listen for new listings
marketplace.on('ListingCreated', (listingId, seller, price, event) => {
  console.log('New listing created:', {
    listingId: Number(listingId),
    seller,
    price: ethers.formatEther(price),
    txHash: event.log.transactionHash
  });
});

// Listen for purchases
marketplace.on('ItemPurchased', (listingId, buyer, quantity, totalPrice, event) => {
  console.log('Item purchased:', {
    listingId: Number(listingId),
    buyer,
    quantity: Number(quantity),
    totalPrice: ethers.formatEther(totalPrice),
    txHash: event.log.transactionHash
  });
});

// Listen for governance votes
governance.on('VoteCast', (proposalId, voter, support, votingPower, event) => {
  console.log('Vote cast:', {
    proposalId: Number(proposalId),
    voter,
    support,
    votingPower: ethers.formatEther(votingPower),
    txHash: event.log.transactionHash
  });
});
```

### Historical Event Queries

```javascript
async function getRecentListings(fromBlock = 'latest', toBlock = 'latest') {
  try {
    const filter = marketplace.filters.ListingCreated();
    const events = await marketplace.queryFilter(filter, fromBlock, toBlock);
    
    return events.map(event => ({
      listingId: Number(event.args.listingId),
      seller: event.args.seller,
      price: ethers.formatEther(event.args.price),
      blockNumber: event.blockNumber,
      txHash: event.transactionHash
    }));
  } catch (error) {
    console.error('Error querying listing events:', error);
    throw error;
  }
}
```

## Error Handling

### Common Error Patterns

```javascript
async function handleContractCall(contractFunction) {
  try {
    const tx = await contractFunction();
    const receipt = await tx.wait();
    return { success: true, receipt };
  } catch (error) {
    // Handle specific error types
    if (error.code === 'INSUFFICIENT_FUNDS') {
      return { success: false, error: 'Insufficient funds for transaction' };
    } else if (error.code === 'USER_REJECTED') {
      return { success: false, error: 'Transaction rejected by user' };
    } else if (error.message.includes('execution reverted')) {
      // Parse revert reason
      const reason = error.message.match(/execution reverted: (.+)/)?.[1] || 'Unknown error';
      return { success: false, error: `Contract error: ${reason}` };
    } else {
      return { success: false, error: error.message };
    }
  }
}
```

### Transaction Status Monitoring

```javascript
async function waitForTransaction(txHash, confirmations = 1) {
  try {
    const receipt = await provider.waitForTransaction(txHash, confirmations);
    
    if (receipt.status === 1) {
      return { success: true, receipt };
    } else {
      return { success: false, error: 'Transaction failed' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

## Testing Integration

### Unit Tests

```javascript
// test/integration.test.js
const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Integration Tests', function() {
  let marketplace, ldaoToken, reputation;
  let owner, seller, buyer;

  beforeEach(async function() {
    [owner, seller, buyer] = await ethers.getSigners();
    
    // Deploy contracts
    const LDAOToken = await ethers.getContractFactory('LDAOToken');
    ldaoToken = await LDAOToken.deploy();
    
    const Marketplace = await ethers.getContractFactory('Marketplace');
    marketplace = await Marketplace.deploy();
    
    // Initialize contracts
    await ldaoToken.initialize(owner.address);
    await marketplace.initialize(/* parameters */);
  });

  it('Should complete full purchase flow', async function() {
    // Create listing
    const listingTx = await marketplace.connect(seller).createListing(
      ethers.ZeroAddress, // ETH
      0,
      ethers.parseEther('1'),
      1,
      0 // Fixed price
    );
    
    const receipt = await listingTx.wait();
    const listingId = receipt.logs[0].args.listingId;
    
    // Buy item
    await marketplace.connect(buyer).buyItem(listingId, 1, {
      value: ethers.parseEther('1')
    });
    
    // Verify purchase
    const listing = await marketplace.getListing(listingId);
    expect(listing.status).to.equal(2); // Sold status
  });
});
```

### Integration Testing Script

```javascript
// scripts/test-integration.js
async function testIntegration() {
  console.log('Starting integration tests...');
  
  // Test token operations
  await testTokenOperations();
  
  // Test marketplace operations
  await testMarketplaceOperations();
  
  // Test reputation system
  await testReputationSystem();
  
  // Test governance
  await testGovernance();
  
  console.log('Integration tests completed successfully!');
}

async function testTokenOperations() {
  console.log('Testing token operations...');
  
  // Test balance check
  const balance = await getTokenBalance(await signer.getAddress());
  console.log('Token balance:', balance);
  
  // Test staking
  const { stakeId } = await stakeTokens(100, 90 * 24 * 60 * 60);
  console.log('Staked tokens, stake ID:', stakeId);
  
  // Test voting power
  const votingPower = await getVotingPower(await signer.getAddress());
  console.log('Voting power:', votingPower);
}

// Run tests
testIntegration().catch(console.error);
```

## Performance Optimization

### Batch Operations

```javascript
// Batch multiple operations to save gas
async function batchOperations() {
  const multicall = new ethers.Contract(
    MULTICALL_ADDRESS,
    MulticallABI,
    signer
  );
  
  const calls = [
    {
      target: CONTRACT_ADDRESSES.MARKETPLACE,
      callData: marketplace.interface.encodeFunctionData('getListing', [1])
    },
    {
      target: CONTRACT_ADDRESSES.MARKETPLACE,
      callData: marketplace.interface.encodeFunctionData('getListing', [2])
    }
  ];
  
  const results = await multicall.aggregate(calls);
  return results;
}
```

### Caching Strategies

```javascript
// Cache frequently accessed data
class ContractCache {
  constructor() {
    this.cache = new Map();
    this.ttl = 60000; // 1 minute TTL
  }
  
  async get(key, fetchFunction) {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }
    
    const data = await fetchFunction();
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  }
}

const cache = new ContractCache();

// Usage
const reputationScore = await cache.get(
  `reputation:${userAddress}`,
  () => getReputationScore(userAddress)
);
```

## Security Best Practices

### Input Validation

```javascript
function validateAddress(address) {
  if (!ethers.isAddress(address)) {
    throw new Error('Invalid Ethereum address');
  }
}

function validateAmount(amount) {
  if (isNaN(amount) || amount <= 0) {
    throw new Error('Invalid amount');
  }
}
```

### Safe Contract Interactions

```javascript
async function safeContractCall(contract, method, params, options = {}) {
  try {
    // Validate inputs
    validateInputs(params);
    
    // Estimate gas
    const gasEstimate = await contract[method].estimateGas(...params, options);
    const gasLimit = gasEstimate * 120n / 100n; // Add 20% buffer
    
    // Execute transaction
    const tx = await contract[method](...params, {
      ...options,
      gasLimit
    });
    
    return await tx.wait();
  } catch (error) {
    console.error(`Error calling ${method}:`, error);
    throw error;
  }
}
```

## Deployment Checklist

### Pre-deployment

- [ ] All tests passing
- [ ] Security audit completed
- [ ] Gas optimization verified
- [ ] Documentation updated
- [ ] Environment variables configured

### Deployment

- [ ] Deploy to testnet first
- [ ] Verify contract source code
- [ ] Test all major functions
- [ ] Configure initial parameters
- [ ] Transfer ownership to multisig

### Post-deployment

- [ ] Update frontend contract addresses
- [ ] Monitor contract behavior
- [ ] Set up alerting
- [ ] Notify stakeholders
- [ ] Update documentation

## Support and Resources

### Documentation
- [API Documentation](./API_DOCUMENTATION.md)
- [Upgrade Procedures](./UPGRADE_PROCEDURES.md)
- [Security Guidelines](./SECURITY_GUIDELINES.md)

### Tools
- [Hardhat](https://hardhat.org/) - Development environment
- [OpenZeppelin](https://openzeppelin.com/) - Security libraries
- [Etherscan](https://etherscan.io/) - Contract verification

### Community
- Discord: [Join our Discord](https://discord.gg/example)
- Forum: [Community Forum](https://forum.example.com)
- GitHub: [Source Code](https://github.com/example/contracts)

### Support
- Technical Support: tech@example.com
- Bug Reports: bugs@example.com
- Security Issues: security@example.com