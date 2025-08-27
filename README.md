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

## AI Integration (Post-MVP)

### Social Layer AI
- AI Companions / Chatbots for personalized experiences
- Community Moderation AI for spam and scam detection
- AI Content Generation for post writing and translation
- AI Matchmaking for friend and community suggestions

### Wallet & Finance AI
- AI Financial Assistant for wallet activity summaries
- AI Transaction Safety for scam detection and risk assessment
- Smart Payments Assistant for automated payments

### DAO Governance AI
- Proposal Summarization in plain English
- Sentiment Analysis for community discussions
- AI Voting Assistant for personalized recommendations
- Multilingual Governance for automatic translation

## Technology Stack
- Frontend: Next.js/React, wagmi + viem, WalletConnect, RainbowKit
- Backend: Node.js (NestJS or Fastify), Postgres, Redis
- Smart Contracts: Solidity (OpenZeppelin libraries)
- Infrastructure: IPFS/Arweave for storage, dedicated RPC endpoints
- AI Services: OpenAI GPT models, Pinecone vector database

## Getting Started

### Prerequisites
- Node.js v16 or higher
- npm v7 or higher
- Git

### Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd linkdao-app
   ```

2. Run the initialization script:
   ```bash
   ./scripts/init.sh
   ```

### AI Services Setup
To enable AI features, you need to set up API keys:

1. **OpenAI API Key**
   - Sign up at [OpenAI Platform](https://platform.openai.com/)
   - Get your API key from the dashboard
   - Add it to `backend/.env`:
     ```
     OPENAI_API_KEY=your_openai_api_key_here
     ```

2. **Pinecone API Key (Optional)**
   - Sign up at [Pinecone](https://www.pinecone.io/)
   - Create an API key and index
   - Add to `backend/.env`:
     ```
     PINECONE_API_KEY=your_pinecone_api_key_here
     PINECONE_ENVIRONMENT=your_pinecone_environment_here
     PINECONE_INDEX_NAME=linkdao
     ```

3. **Start the services**
   ```bash
   # Build the backend
   cd backend
   npm run build
   
   # Start the backend
   npm run dev
   ```

4. **Start the frontend**
   ```bash
   # In a new terminal
   cd frontend
   npm run dev
   ```

### Testing AI Features
Once the services are running:

1. Visit http://localhost:3004 for the frontend
2. Connect your wallet
3. Use the AI chat interface to interact with bots
4. Or test API endpoints directly:
   ```bash
   curl http://localhost:3002/api/ai/bots
   ```

## Documentation
- [Product Specification](PRODUCT_SPEC.md)
- [Technical Architecture](TECHNICAL_ARCHITECTURE.md)
- [Delivery Plan](DELIVERY_PLAN.md)
- [AI Integration Plan](AI_INTEGRATION_PLAN.md)
- [AI Developer Guide](AI_DEVELOPER_GUIDE.md)
- [AI Implementation Summary](AI_IMPLEMENTATION_SUMMARY.md)
- [AI Setup Guide](AI_SETUP_GUIDE.md)