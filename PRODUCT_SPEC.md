# LinkDAO Product Specification

## 1. Product Overview

LinkDAO is a web3-based social platform that combines social networking with native cryptocurrency wallets and DAO governance capabilities. The platform emphasizes user ownership of identity and data, while providing a seamless experience for both crypto-native users and newcomers.

## 2. Key Features

### 2.1 Social Features
- **User Profiles**: Customizable profiles with avatars, bios, and portable usernames
- **Social Graph**: Follow system with public feeds and optional private messaging
- **Content Creation**: Posts, comments, and reactions (likes)
- **Identity Management**: ENS/handle integration and Sign-In with Ethereum (EIP-4337)

### 2.2 Wallet & Payments
- **Smart Accounts**: ERC-4337 account abstraction with passkey/social recovery
- **Multi-Asset Support**: USDC, USDT, and native token transfers
- **Payment Methods**: Direct transfers, QR codes, and payment links
- **Gas Abstraction**: Sponsored transactions for common actions

### 2.3 Governance
- **Community Creation**: Form DAOs with customizable roles (admin, moderator)
- **Proposal System**: Off-chain voting (Snapshot-style) with multisig execution
- **Treasury Management**: Gnosis Safe integration for community funds

### 2.4 Security & Trust
- **Content Moderation**: Automated and community-based moderation systems
- **Scam Protection**: Phishing detection and transaction simulation
- **Spam Prevention**: Rate limiting and sybil resistance mechanisms

## 3. Technical Architecture

### 3.1 Blockchain Layer
- **Base Chain**: L2 rollup (Optimistic or ZK) on Ethereum
- **Recommended Networks**: Base, Arbitrum, Optimism, or Polygon zkEVM
- **Chain-Agnostic Design**: Modular architecture to support multiple chains

### 3.2 Smart Contract Modules
- **ProfileRegistry**: Maps addresses to profile NFTs/metadata
- **FollowModule**: Handles follow relationships (ERC-721 follow NFTs)
- **PostModule**: Manages post creation and metadata storage
- **PaymentRouter**: Facilitates multi-token payments and split payouts
- **Governor + Timelock**: OpenZeppelin Governor with timelock execution

### 3.3 Off-Chain Components
- **Indexer**: The Graph or custom indexer for blockchain events
- **Metadata Service**: IPFS/Arweave storage with data mirroring
- **API Gateway**: REST/GraphQL interface with caching layer
- **Search Service**: OpenSearch/Meilisearch for content discovery
- **Notifications**: Push service for on-chain and app events

## 4. Data Model

### 4.1 Core Entities

```typescript
interface UserProfile {
  address: string;
  handle: string;
  ens: string;
  avatarCid: string;
  bioCid: string;
  createdAt: Date;
}

interface Post {
  id: string;
  author: string;
  parentId: string | null;
  contentCid: string;
  mediaCids: string[];
  tags: string[];
  createdAt: Date;
  onchainRef: string;
}

interface Follow {
  follower: string;
  following: string;
  createdAt: Date;
}

interface Payment {
  txHash: string;
  from: string;
  to: string;
  token: string;
  amount: string;
  memo: string;
  createdAt: Date;
  status: string;
}

interface Proposal {
  id: string;
  titleCid: string;
  bodyCid: string;
  startBlock: number;
  endBlock: number;
  choices: string[];
  tally: Record<string, number>;
  status: string;
}
```

## 5. Wallet Strategy

### 5.1 Default Wallet
- **Smart Accounts**: ERC-4337 account abstraction
- **Authentication**: Passkey login (WebAuthn)
- **Features**: Gas sponsorship, session keys, spending limits, recovery flows

### 5.2 Recovery Options
- Guardian social recovery
- Email/passkey backup
- Optional custodial escrow for newcomers

### 5.3 Security UX
- Transaction simulation
- Clear signing prompts
- Allowlist for known contracts
- Phishing warnings

## 6. Payments & Fees

### 6.1 Supported Assets
- **Primary**: USDC
- **Secondary**: USDT, DAI
- **Native Tokens**: Optional (not required for fees)

### 6.2 Gas Policy
- Sponsor social actions (follows, posts, comments)
- Require user gas for high-value transfers
- Allow fee payment in USDC

### 6.3 Compliance
- Large transfers or off-ramp require KYC
- Sanctions screening
- Transaction monitoring