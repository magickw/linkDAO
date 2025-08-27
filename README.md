# LinkDAO

A privacy-respecting social network where identity, money, and governance are native and portable across apps.

## Vision
A privacy-respecting social network where identity, money, and governance are native and portable across apps.

## Core Principles
- User-owned identity & data
- Safe-by-default wallets
- Low fees & fast UX
- Progressive decentralization
- Modular, open components

## Target Users & Core Jobs

### Primary Users
1. **Creators & communities**: publish, tip, sell, crowdfund, govern
2. **Crypto-native users**: social graph + onchain actions in one place
3. **Newcomers**: custodial or "assisted" wallets, stablecoin payments, simple onboarding

## MVP Scope (3–4 months)

### Social Features
- Profiles, follows, posts, comments, likes
- Portable usernames (ENS/handle), Sign-In with Ethereum (EIP-4361)
- Public social graph, optional private DMs

### Wallets & Payments
- Built-in smart accounts (ERC-4337 account abstraction) + passkey/social recovery
- Send & request payments in USDC/USDT/native token; QR & link payments
- Gas abstraction: sponsor gas for common actions; pay fees in stablecoins

### Governance
- Community creation, roles (admin/mod)
- Proposals & votes (off-chain Snapshot-style at MVP)
- Treasury in multisig (Gnosis Safe)

### Safety & Trust
- Basic content moderation, spam prevention, scam/phishing detection

## Technology Stack
- Frontend: Next.js/React, wagmi + viem, WalletConnect, RainbowKit
- Backend: Node.js (NestJS or Fastify), Postgres, Redis
- Smart Contracts: Solidity (OpenZeppelin libraries)
- Infrastructure: IPFS/Arweave for storage, dedicated RPC endpoints