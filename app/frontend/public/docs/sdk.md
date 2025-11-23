# SDK Documentation

## LinkDAO JavaScript/TypeScript SDK

The LinkDAO SDK provides a comprehensive set of tools for integrating LinkDAO functionality into your applications.

## Installation

```bash
npm install @linkdao/sdk
# or
yarn add @linkdao/sdk
```

## Quick Start

```typescript
import { LinkDAOClient } from '@linkdao/sdk';

const client = new LinkDAOClient({
  network: 'base-mainnet',
  apiKey: 'your-api-key'
});
```

## Core Modules

### Authentication

```typescript
// Connect wallet
const { user, token } = await client.auth.connect(walletAddress);

// Get current user
const currentUser = await client.auth.getCurrentUser();
```

### Marketplace

```typescript
// List products
const products = await client.marketplace.getProducts({
  category: 'nft',
  limit: 20
});

// Create listing
const listing = await client.marketplace.createListing({
  title: 'My NFT',
  price: '100',
  currency: 'USDC'
});
```

### Governance

```typescript
// Get proposals
const proposals = await client.governance.getProposals();

// Vote on proposal
await client.governance.vote(proposalId, 'for');
```

### Communities

```typescript
// Create community
const community = await client.communities.create({
  name: 'My DAO',
  description: 'A community for...'
});

// Join community
await client.communities.join(communityId);
```

## API Reference

Full API documentation available at [API Reference](/docs/api-reference).

## Examples

Check out our [GitHub repository](https://github.com/linkdao/sdk-examples) for complete examples.

## Support

- Discord: #sdk-support
- Email: sdk@linkdao.io
- GitHub Issues: [Report bugs](https://github.com/linkdao/sdk/issues)
