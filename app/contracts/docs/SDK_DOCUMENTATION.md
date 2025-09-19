# Web3 Marketplace SDK Documentation

## Overview

The Web3 Marketplace SDK provides a high-level JavaScript/TypeScript interface for interacting with the smart contracts. It abstracts away the complexity of direct contract interactions and provides a developer-friendly API.

## Installation

```bash
npm install @web3-marketplace/sdk
# or
yarn add @web3-marketplace/sdk
```

## Quick Start

```javascript
import { MarketplaceSDK } from '@web3-marketplace/sdk';

// Initialize SDK
const sdk = new MarketplaceSDK({
  network: 'sepolia', // or 'mainnet'
  provider: window.ethereum, // or any ethers provider
  contracts: {
    // Contract addresses will be auto-loaded for known networks
    // Or provide custom addresses
  }
});

// Connect wallet
await sdk.connect();

// Use SDK methods
const listings = await sdk.marketplace.getActiveListings();
const userReputation = await sdk.reputation.getScore(userAddress);
```

## SDK Architecture

### Core Classes

- `MarketplaceSDK` - Main SDK class
- `TokenManager` - LDAO token operations
- `MarketplaceManager` - Marketplace operations
- `ReputationManager` - Reputation system
- `GovernanceManager` - DAO governance
- `NFTManager` - NFT marketplace
- `SocialManager` - Social features

### Configuration

```javascript
const config = {
  network: 'mainnet', // 'mainnet', 'sepolia', 'localhost'
  provider: provider, // Ethers provider
  signer: signer, // Optional: will be derived from provider
  contracts: {
    // Optional: override contract addresses
    ldaoToken: '0x...',
    marketplace: '0x...',
    // ... other contracts
  },
  options: {
    gasMultiplier: 1.2, // Gas estimation multiplier
    confirmations: 1, // Number of confirmations to wait
    timeout: 60000, // Transaction timeout in ms
  }
};

const sdk = new MarketplaceSDK(config);
```

## API Reference

### MarketplaceSDK

#### Constructor

```javascript
new MarketplaceSDK(config: SDKConfig)
```

#### Methods

##### `connect()`
Connects to the user's wallet and initializes the SDK.

```javascript
await sdk.connect();
```

##### `disconnect()`
Disconnects from the wallet.

```javascript
sdk.disconnect();
```

##### `isConnected()`
Checks if the SDK is connected to a wallet.

```javascript
const connected = sdk.isConnected();
```

##### `getAddress()`
Gets the connected wallet address.

```javascript
const address = await sdk.getAddress();
```

##### `getNetwork()`
Gets the current network information.

```javascript
const network = await sdk.getNetwork();
// Returns: { name: 'sepolia', chainId: 11155111 }
```

### TokenManager

Access via `sdk.token`

#### Methods

##### `getBalance(address?: string)`
Gets LDAO token balance for an address.

```javascript
const balance = await sdk.token.getBalance();
// Returns balance in LDAO tokens (not wei)
```

##### `transfer(to: string, amount: number)`
Transfers LDAO tokens to another address.

```javascript
const result = await sdk.token.transfer(recipientAddress, 100);
// Returns: { txHash: string, success: boolean }
```

##### `stake(amount: number, lockPeriod: number)`
Stakes LDAO tokens for voting power and rewards.

```javascript
const result = await sdk.token.stake(1000, 90); // 1000 tokens for 90 days
// Returns: { stakeId: number, txHash: string }
```

##### `unstake(stakeId: number)`
Unstakes tokens after lock period.

```javascript
const result = await sdk.token.unstake(stakeId);
// Returns: { amount: number, txHash: string }
```

##### `claimRewards(stakeId: number)`
Claims staking rewards.

```javascript
const result = await sdk.token.claimRewards(stakeId);
// Returns: { rewards: number, txHash: string }
```

##### `getStakeInfo(stakeId: number)`
Gets information about a stake.

```javascript
const stakeInfo = await sdk.token.getStakeInfo(stakeId);
// Returns: StakeInfo object
```

##### `getVotingPower(address?: string)`
Gets voting power for an address.

```javascript
const votingPower = await sdk.token.getVotingPower();
```

##### `getAllStakes(address?: string)`
Gets all stakes for an address.

```javascript
const stakes = await sdk.token.getAllStakes();
// Returns: StakeInfo[]
```

### MarketplaceManager

Access via `sdk.marketplace`

#### Methods

##### `createListing(params: CreateListingParams)`
Creates a new marketplace listing.

```javascript
const result = await sdk.marketplace.createListing({
  tokenAddress: '0x...', // or null for ETH
  tokenId: 0, // for NFTs
  price: 1.5, // in ETH or token units
  quantity: 1,
  listingType: 'fixed', // 'fixed' or 'auction'
  metadata: {
    title: 'My Item',
    description: 'Item description',
    images: ['ipfs://...']
  }
});
// Returns: { listingId: number, txHash: string }
```

##### `buyItem(listingId: number, quantity: number)`
Purchases an item from a listing.

```javascript
const result = await sdk.marketplace.buyItem(listingId, 1);
// Returns: { escrowId: number, txHash: string }
```

##### `createOffer(listingId: number, price: number, quantity: number, expiration: Date)`
Creates an offer on a listing.

```javascript
const result = await sdk.marketplace.createOffer(
  listingId,
  0.8, // offer price
  1, // quantity
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // expires in 7 days
);
// Returns: { offerId: number, txHash: string }
```

##### `acceptOffer(offerId: number)`
Accepts an offer (seller only).

```javascript
const result = await sdk.marketplace.acceptOffer(offerId);
// Returns: { txHash: string }
```

##### `getListing(listingId: number)`
Gets detailed information about a listing.

```javascript
const listing = await sdk.marketplace.getListing(listingId);
// Returns: Listing object
```

##### `getActiveListings(params?: ListingQuery)`
Gets active marketplace listings.

```javascript
const listings = await sdk.marketplace.getActiveListings({
  offset: 0,
  limit: 20,
  category: 'electronics',
  minPrice: 0.1,
  maxPrice: 10,
  seller: '0x...'
});
// Returns: Listing[]
```

##### `getUserListings(address?: string)`
Gets listings created by a user.

```javascript
const userListings = await sdk.marketplace.getUserListings();
// Returns: Listing[]
```

##### `searchListings(query: string, filters?: SearchFilters)`
Searches listings by text and filters.

```javascript
const results = await sdk.marketplace.searchListings('gaming laptop', {
  category: 'electronics',
  priceRange: [500, 2000]
});
// Returns: Listing[]
```

### ReputationManager

Access via `sdk.reputation`

#### Methods

##### `getScore(address: string)`
Gets reputation score for a user.

```javascript
const reputation = await sdk.reputation.getScore(userAddress);
// Returns: {
//   score: number,
//   reviewCount: number,
//   averageRating: number,
//   tier: 'newcomer' | 'bronze' | 'silver' | 'gold' | 'platinum'
// }
```

##### `submitReview(params: ReviewParams)`
Submits a review for a user.

```javascript
const result = await sdk.reputation.submitReview({
  userAddress: sellerAddress,
  rating: 5,
  comment: 'Great seller, fast shipping!',
  transactionId: listingId
});
// Returns: { txHash: string }
```

##### `getReviews(address: string, params?: ReviewQuery)`
Gets reviews for a user.

```javascript
const reviews = await sdk.reputation.getReviews(userAddress, {
  offset: 0,
  limit: 10,
  sortBy: 'newest'
});
// Returns: Review[]
```

##### `canReview(userAddress: string, transactionId: number)`
Checks if current user can review another user for a transaction.

```javascript
const canReview = await sdk.reputation.canReview(sellerAddress, listingId);
// Returns: boolean
```

### GovernanceManager

Access via `sdk.governance`

#### Methods

##### `createProposal(params: ProposalParams)`
Creates a governance proposal.

```javascript
const result = await sdk.governance.createProposal({
  title: 'Reduce Marketplace Fees',
  description: 'Proposal to reduce marketplace fees from 2.5% to 2%',
  category: 'marketplace',
  actions: [{
    target: marketplaceAddress,
    function: 'setFeeBasisPoints',
    parameters: [200] // 2%
  }]
});
// Returns: { proposalId: number, txHash: string }
```

##### `vote(proposalId: number, support: boolean)`
Votes on a proposal.

```javascript
const result = await sdk.governance.vote(proposalId, true); // vote in favor
// Returns: { txHash: string }
```

##### `executeProposal(proposalId: number)`
Executes a successful proposal.

```javascript
const result = await sdk.governance.executeProposal(proposalId);
// Returns: { txHash: string }
```

##### `getProposal(proposalId: number)`
Gets detailed information about a proposal.

```javascript
const proposal = await sdk.governance.getProposal(proposalId);
// Returns: Proposal object
```

##### `getActiveProposals()`
Gets all active proposals.

```javascript
const proposals = await sdk.governance.getActiveProposals();
// Returns: Proposal[]
```

##### `getUserVotes(address?: string)`
Gets voting history for a user.

```javascript
const votes = await sdk.governance.getUserVotes();
// Returns: Vote[]
```

### NFTManager

Access via `sdk.nft`

#### Methods

##### `mint(params: MintParams)`
Mints a new NFT.

```javascript
const result = await sdk.nft.mint({
  to: recipientAddress,
  metadata: {
    name: 'My NFT',
    description: 'A unique digital asset',
    image: 'ipfs://...',
    attributes: [
      { trait_type: 'Color', value: 'Blue' },
      { trait_type: 'Rarity', value: 'Rare' }
    ]
  },
  royalty: 5 // 5% royalty
});
// Returns: { tokenId: number, txHash: string }
```

##### `list(tokenId: number, price: number, listingType: string)`
Lists an NFT for sale.

```javascript
const result = await sdk.nft.list(tokenId, 2.5, 'fixed');
// Returns: { listingId: number, txHash: string }
```

##### `buy(listingId: number)`
Purchases an NFT.

```javascript
const result = await sdk.nft.buy(listingId);
// Returns: { txHash: string }
```

##### `createAuction(tokenId: number, startingPrice: number, duration: number)`
Creates an auction for an NFT.

```javascript
const result = await sdk.nft.createAuction(
  tokenId,
  1.0, // starting price
  7 * 24 * 60 * 60 // 7 days
);
// Returns: { auctionId: number, txHash: string }
```

##### `placeBid(auctionId: number, amount: number)`
Places a bid on an NFT auction.

```javascript
const result = await sdk.nft.placeBid(auctionId, 1.5);
// Returns: { txHash: string }
```

##### `getTokenMetadata(tokenId: number)`
Gets metadata for an NFT.

```javascript
const metadata = await sdk.nft.getTokenMetadata(tokenId);
// Returns: NFTMetadata object
```

##### `getUserNFTs(address?: string)`
Gets NFTs owned by a user.

```javascript
const nfts = await sdk.nft.getUserNFTs();
// Returns: NFT[]
```

### SocialManager

Access via `sdk.social`

#### Methods

##### `follow(userAddress: string)`
Follows a user.

```javascript
const result = await sdk.social.follow(userAddress);
// Returns: { txHash: string }
```

##### `unfollow(userAddress: string)`
Unfollows a user.

```javascript
const result = await sdk.social.unfollow(userAddress);
// Returns: { txHash: string }
```

##### `isFollowing(follower: string, followee: string)`
Checks if one user is following another.

```javascript
const isFollowing = await sdk.social.isFollowing(userA, userB);
// Returns: boolean
```

##### `getFollowers(address: string)`
Gets followers for a user.

```javascript
const followers = await sdk.social.getFollowers(userAddress);
// Returns: string[] (addresses)
```

##### `getFollowing(address: string)`
Gets users that a user is following.

```javascript
const following = await sdk.social.getFollowing(userAddress);
// Returns: string[] (addresses)
```

##### `tip(creatorAddress: string, amount: number, postId?: number)`
Tips a creator with LDAO tokens.

```javascript
const result = await sdk.social.tip(creatorAddress, 10, postId);
// Returns: { txHash: string }
```

##### `getTipHistory(address?: string)`
Gets tipping history for a user.

```javascript
const tips = await sdk.social.getTipHistory();
// Returns: Tip[]
```

## Event Handling

### Event Listeners

```javascript
// Listen for marketplace events
sdk.marketplace.on('ListingCreated', (event) => {
  console.log('New listing:', event);
});

sdk.marketplace.on('ItemPurchased', (event) => {
  console.log('Item purchased:', event);
});

// Listen for governance events
sdk.governance.on('ProposalCreated', (event) => {
  console.log('New proposal:', event);
});

sdk.governance.on('VoteCast', (event) => {
  console.log('Vote cast:', event);
});

// Listen for social events
sdk.social.on('Followed', (event) => {
  console.log('User followed:', event);
});

sdk.social.on('TipSent', (event) => {
  console.log('Tip sent:', event);
});
```

### Event Filtering

```javascript
// Get historical events
const recentListings = await sdk.marketplace.getEvents('ListingCreated', {
  fromBlock: 'latest',
  toBlock: 'latest',
  filters: {
    seller: userAddress
  }
});
```

## Error Handling

### Error Types

```javascript
import { 
  SDKError, 
  ContractError, 
  NetworkError, 
  ValidationError 
} from '@web3-marketplace/sdk';

try {
  await sdk.marketplace.buyItem(listingId, 1);
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Invalid input:', error.message);
  } else if (error instanceof ContractError) {
    console.log('Contract error:', error.reason);
  } else if (error instanceof NetworkError) {
    console.log('Network error:', error.message);
  } else {
    console.log('Unknown error:', error);
  }
}
```

### Error Recovery

```javascript
// Automatic retry for network errors
const result = await sdk.marketplace.buyItem(listingId, 1, {
  retries: 3,
  retryDelay: 1000
});

// Custom error handling
sdk.on('error', (error) => {
  console.error('SDK Error:', error);
  // Handle error (show notification, retry, etc.)
});
```

## Utilities

### Address Utilities

```javascript
import { AddressUtils } from '@web3-marketplace/sdk';

// Validate Ethereum address
const isValid = AddressUtils.isValid(address);

// Format address for display
const formatted = AddressUtils.format(address); // 0x1234...5678

// Check if address is zero address
const isZero = AddressUtils.isZero(address);
```

### Token Utilities

```javascript
import { TokenUtils } from '@web3-marketplace/sdk';

// Format token amounts
const formatted = TokenUtils.format(amount, decimals); // "1,234.56"

// Parse token amounts
const parsed = TokenUtils.parse("1234.56", 18); // BigNumber

// Convert between units
const wei = TokenUtils.toWei("1.5"); // "1500000000000000000"
const ether = TokenUtils.fromWei("1500000000000000000"); // "1.5"
```

### IPFS Utilities

```javascript
import { IPFSUtils } from '@web3-marketplace/sdk';

// Upload to IPFS
const hash = await IPFSUtils.upload(file);

// Upload JSON metadata
const metadataHash = await IPFSUtils.uploadJSON({
  name: "My NFT",
  description: "A unique digital asset",
  image: imageHash
});

// Get content from IPFS
const content = await IPFSUtils.get(hash);
```

## React Hooks

### Installation

```bash
npm install @web3-marketplace/react-hooks
```

### Usage

```javascript
import { 
  useMarketplaceSDK,
  useTokenBalance,
  useListings,
  useReputation,
  useGovernance
} from '@web3-marketplace/react-hooks';

function MyComponent() {
  const sdk = useMarketplaceSDK();
  const { balance, loading } = useTokenBalance();
  const { listings, refresh } = useListings();
  const { reputation } = useReputation(userAddress);
  
  return (
    <div>
      <p>Token Balance: {balance} LDAO</p>
      <p>Reputation Score: {reputation?.score}</p>
      {listings.map(listing => (
        <div key={listing.id}>
          {listing.title} - {listing.price} ETH
        </div>
      ))}
    </div>
  );
}
```

### Available Hooks

- `useMarketplaceSDK()` - Access SDK instance
- `useTokenBalance(address?)` - Get token balance
- `useListings(filters?)` - Get marketplace listings
- `useReputation(address)` - Get reputation data
- `useGovernance()` - Get governance data
- `useNFTs(address?)` - Get user's NFTs
- `useSocial(address?)` - Get social data
- `useTransaction(txHash)` - Track transaction status

## TypeScript Support

### Type Definitions

```typescript
import { 
  MarketplaceSDK,
  Listing,
  ReputationScore,
  Proposal,
  NFTMetadata,
  StakeInfo
} from '@web3-marketplace/sdk';

// SDK is fully typed
const sdk: MarketplaceSDK = new MarketplaceSDK(config);

// All return types are typed
const listings: Listing[] = await sdk.marketplace.getActiveListings();
const reputation: ReputationScore = await sdk.reputation.getScore(address);
const proposal: Proposal = await sdk.governance.getProposal(proposalId);
```

### Custom Types

```typescript
interface CustomListingFilters {
  category?: string;
  priceRange?: [number, number];
  seller?: string;
  featured?: boolean;
}

const listings = await sdk.marketplace.getActiveListings({
  ...customFilters,
  limit: 20
});
```

## Examples

### Complete Marketplace App

```javascript
import { MarketplaceSDK } from '@web3-marketplace/sdk';

class MarketplaceApp {
  constructor() {
    this.sdk = new MarketplaceSDK({
      network: 'sepolia',
      provider: window.ethereum
    });
  }

  async init() {
    await this.sdk.connect();
    this.setupEventListeners();
    await this.loadData();
  }

  setupEventListeners() {
    this.sdk.marketplace.on('ListingCreated', this.onNewListing.bind(this));
    this.sdk.marketplace.on('ItemPurchased', this.onItemPurchased.bind(this));
  }

  async loadData() {
    const [listings, balance, reputation] = await Promise.all([
      this.sdk.marketplace.getActiveListings({ limit: 50 }),
      this.sdk.token.getBalance(),
      this.sdk.reputation.getScore(await this.sdk.getAddress())
    ]);

    this.updateUI({ listings, balance, reputation });
  }

  async createListing(itemData) {
    try {
      const result = await this.sdk.marketplace.createListing({
        tokenAddress: null, // ETH
        price: itemData.price,
        quantity: 1,
        listingType: 'fixed',
        metadata: {
          title: itemData.title,
          description: itemData.description,
          images: itemData.images
        }
      });

      console.log('Listing created:', result.listingId);
      return result;
    } catch (error) {
      console.error('Failed to create listing:', error);
      throw error;
    }
  }

  async buyItem(listingId) {
    try {
      const result = await this.sdk.marketplace.buyItem(listingId, 1);
      console.log('Item purchased:', result.txHash);
      return result;
    } catch (error) {
      console.error('Failed to buy item:', error);
      throw error;
    }
  }

  onNewListing(event) {
    console.log('New listing created:', event);
    this.loadData(); // Refresh listings
  }

  onItemPurchased(event) {
    console.log('Item purchased:', event);
    this.loadData(); // Refresh data
  }
}

// Initialize app
const app = new MarketplaceApp();
app.init().catch(console.error);
```

### NFT Marketplace Integration

```javascript
class NFTMarketplace {
  constructor(sdk) {
    this.sdk = sdk;
  }

  async mintAndList(metadata, price) {
    try {
      // Upload metadata to IPFS
      const metadataHash = await this.sdk.ipfs.uploadJSON(metadata);
      
      // Mint NFT
      const mintResult = await this.sdk.nft.mint({
        to: await this.sdk.getAddress(),
        metadata: `ipfs://${metadataHash}`,
        royalty: 5 // 5% royalty
      });

      // List NFT for sale
      const listResult = await this.sdk.nft.list(
        mintResult.tokenId,
        price,
        'fixed'
      );

      return {
        tokenId: mintResult.tokenId,
        listingId: listResult.listingId,
        txHashes: [mintResult.txHash, listResult.txHash]
      };
    } catch (error) {
      console.error('Failed to mint and list NFT:', error);
      throw error;
    }
  }

  async createAuctionWithBidding(tokenId, startingPrice, duration) {
    // Create auction
    const auction = await this.sdk.nft.createAuction(
      tokenId,
      startingPrice,
      duration
    );

    // Set up bid monitoring
    this.sdk.nft.on('BidPlaced', (event) => {
      if (event.auctionId === auction.auctionId) {
        console.log('New bid:', event.amount);
        this.updateAuctionUI(event);
      }
    });

    return auction;
  }
}
```

## Migration Guide

### From Direct Contract Calls

```javascript
// Before (direct contract calls)
const marketplace = new ethers.Contract(address, abi, signer);
const tx = await marketplace.createListing(
  tokenAddress,
  tokenId,
  ethers.parseEther(price.toString()),
  quantity,
  listingType
);
const receipt = await tx.wait();

// After (using SDK)
const result = await sdk.marketplace.createListing({
  tokenAddress,
  tokenId,
  price, // SDK handles conversion
  quantity,
  listingType: 'fixed'
});
```

### From Web3.js

```javascript
// Before (Web3.js)
const web3 = new Web3(window.ethereum);
const contract = new web3.eth.Contract(abi, address);
const result = await contract.methods.createListing(...args).send({
  from: account,
  gas: 200000
});

// After (SDK)
const result = await sdk.marketplace.createListing({
  // parameters
});
```

## Performance Tips

### Batch Operations

```javascript
// Use batch operations when possible
const results = await sdk.batch([
  () => sdk.marketplace.getListing(1),
  () => sdk.marketplace.getListing(2),
  () => sdk.marketplace.getListing(3)
]);
```

### Caching

```javascript
// Enable caching for frequently accessed data
const sdk = new MarketplaceSDK({
  // ... config
  cache: {
    enabled: true,
    ttl: 60000, // 1 minute
    maxSize: 1000
  }
});
```

### Connection Pooling

```javascript
// Reuse SDK instance across components
const sdk = new MarketplaceSDK(config);

// Export singleton
export default sdk;
```

## Troubleshooting

### Common Issues

1. **Connection Issues**
   ```javascript
   // Check if wallet is connected
   if (!sdk.isConnected()) {
     await sdk.connect();
   }
   ```

2. **Network Mismatch**
   ```javascript
   // Check network
   const network = await sdk.getNetwork();
   if (network.chainId !== expectedChainId) {
     await sdk.switchNetwork(expectedChainId);
   }
   ```

3. **Insufficient Gas**
   ```javascript
   // Increase gas multiplier
   const sdk = new MarketplaceSDK({
     // ... config
     options: {
       gasMultiplier: 1.5 // 50% buffer
     }
   });
   ```

### Debug Mode

```javascript
// Enable debug logging
const sdk = new MarketplaceSDK({
  // ... config
  debug: true
});

// Or set log level
sdk.setLogLevel('debug');
```

## Support

### Documentation
- [API Reference](./API_DOCUMENTATION.md)
- [Integration Guide](./INTEGRATION_GUIDE.md)
- [Examples Repository](https://github.com/example/sdk-examples)

### Community
- [Discord](https://discord.gg/example)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/web3-marketplace-sdk)
- [GitHub Discussions](https://github.com/example/sdk/discussions)

### Support
- SDK Issues: [GitHub Issues](https://github.com/example/sdk/issues)
- Feature Requests: [Feature Request Form](https://example.com/feature-request)
- Security Issues: security@example.com