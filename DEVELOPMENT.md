# LinkDAO Development Guide

LinkDAO is a comprehensive Web3-based social platform that integrates social features, DAO governance, and marketplace functionality for physical goods, digital goods, and services.

## 🏗️ Architecture Overview

The platform consists of three main components:

- **Frontend** (`app/frontend/`) - Next.js application with Web3 integration
- **Backend** (`app/backend/`) - Node.js API with Express, Drizzle ORM, and blockchain integration
- **Smart Contracts** (`app/contracts/`) - Solidity contracts for marketplace, governance, and token functionality

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- Git

### One-Command Setup

```bash
npm run setup
```

This will:
- Install all dependencies
- Set up environment files
- Start Docker services (PostgreSQL, Redis, IPFS)
- Initialize the database
- Build smart contracts

### Manual Setup

If you prefer to set up manually:

1. **Install dependencies:**
   ```bash
   npm install
   cd app && npm install
   ```

2. **Start Docker services:**
   ```bash
   npm run docker:up
   ```

3. **Set up environment files:**
   ```bash
   cp app/.env.example app/backend/.env.local
   cp app/.env.example app/frontend/.env.local
   ```

4. **Initialize database:**
   ```bash
   npm run db:push
   ```

5. **Build contracts:**
   ```bash
   npm run build:contracts
   ```

## 🔧 Development Commands

### Core Development
```bash
npm run dev              # Start both frontend and backend
npm run dev:frontend     # Start frontend only (port 3000)
npm run dev:backend      # Start backend only (port 3002)
```

### Building
```bash
npm run build            # Build all components
npm run build:frontend   # Build frontend
npm run build:backend    # Build backend
npm run build:contracts  # Build smart contracts
```

### Testing
```bash
npm run test             # Run all tests
npm run test:frontend    # Run frontend tests
npm run test:backend     # Run backend tests
npm run test:contracts   # Run smart contract tests
```

### Database Management
```bash
npm run db:studio        # Open Drizzle Studio (database GUI)
npm run db:push          # Push schema changes to database
npm run db:migrate       # Run database migrations
```

### Smart Contracts
```bash
npm run deploy:contracts        # Deploy to local network
npm run deploy:contracts:testnet # Deploy to testnet
```

### Docker Services
```bash
npm run docker:up        # Start all Docker services
npm run docker:down      # Stop all Docker services
npm run docker:logs      # View Docker service logs
npm run docker:restart   # Restart Docker services
```

### Maintenance
```bash
npm run clean            # Clean Docker containers and images
npm run reset            # Full reset (clean + setup)
```

## 🌐 Service URLs

When running locally:

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3002
- **IPFS Gateway:** http://localhost:8080
- **IPFS API:** http://localhost:5001
- **Database Studio:** Available via `npm run db:studio`

## 📁 Project Structure

```
linkdao/
├── app/
│   ├── frontend/          # Next.js frontend application
│   │   ├── src/
│   │   │   ├── components/    # React components
│   │   │   ├── pages/         # Next.js pages
│   │   │   ├── hooks/         # Custom React hooks
│   │   │   ├── services/      # API services
│   │   │   └── styles/        # CSS and styling
│   │   ├── package.json
│   │   └── next.config.js
│   │
│   ├── backend/           # Node.js backend API
│   │   ├── src/
│   │   │   ├── controllers/   # API controllers
│   │   │   ├── routes/        # Express routes
│   │   │   ├── services/      # Business logic
│   │   │   ├── models/        # Data models
│   │   │   ├── middleware/    # Express middleware
│   │   │   └── utils/         # Utility functions
│   │   ├── drizzle/           # Database schema and migrations
│   │   └── package.json
│   │
│   └── contracts/         # Smart contracts
│       ├── contracts/         # Solidity contracts
│       ├── scripts/           # Deployment scripts
│       ├── test/              # Contract tests
│       └── hardhat.config.ts
│
├── docker-compose.yml     # Docker services configuration
├── package.json           # Root package.json with workspace scripts
└── setup-dev.js          # Development environment setup script
```

## 🔐 Environment Configuration

### Backend Environment Variables

Key environment variables for the backend (in `app/backend/.env.local`):

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/linkdao

# Authentication
JWT_SECRET=your-jwt-secret

# Services
REDIS_URL=redis://localhost:6379
PORT=3002

# Blockchain
RPC_URL=http://localhost:8545
```

### Frontend Environment Variables

Key environment variables for the frontend (in `app/frontend/.env.local`):

```env
# API
NEXT_PUBLIC_BACKEND_URL=http://localhost:3002
NEXT_PUBLIC_WS_URL=ws://localhost:3002

# IPFS
NEXT_PUBLIC_IPFS_GATEWAY=http://localhost:8080

# Blockchain
NEXT_PUBLIC_CHAIN_ID=31337
```

## 🧪 Testing

The project includes comprehensive testing:

- **Frontend Tests:** Jest + React Testing Library
- **Backend Tests:** Jest + Supertest
- **Smart Contract Tests:** Hardhat + Chai

Run tests with:
```bash
npm run test                    # All tests
npm run test:frontend          # Frontend tests only
npm run test:backend           # Backend tests only
npm run test:contracts         # Smart contract tests only
```

## 🚀 Deployment

### Local Development
Already covered in the setup section above.

### Testnet Deployment
1. Configure testnet RPC URLs in contract environment
2. Deploy contracts: `npm run deploy:contracts:testnet`
3. Update frontend/backend with deployed contract addresses

### Production Deployment
- Frontend: Deploy to Vercel/Netlify
- Backend: Deploy to Railway/Render/AWS
- Database: Use managed PostgreSQL (Neon, Supabase, etc.)
- Contracts: Deploy to mainnet

## 🛠️ Key Features

### Social Platform
- User profiles and authentication
- Social feed with posts and interactions
- Follow/unfollow functionality
- Tipping system with crypto payments

### DAO Governance
- LDAO token for governance
- Proposal creation and voting
- Community-driven decision making
- Reputation system

### Marketplace
- Physical goods marketplace
- Digital goods and NFT trading
- Service marketplace
- Escrow system for secure transactions
- Dispute resolution

### Web3 Integration
- Multi-wallet support (MetaMask, WalletConnect)
- Multi-chain support (Ethereum, Polygon, Arbitrum)
- Smart contract interactions
- IPFS for decentralized storage

## 🐛 Troubleshooting

### Common Issues

1. **Docker services not starting:**
   ```bash
   npm run docker:down
   npm run docker:up
   ```

2. **Database connection issues:**
   ```bash
   npm run db:push
   ```

3. **Port conflicts:**
   - Check if ports 3000, 3002, 5432, 6379, 5001, 8080 are available
   - Stop conflicting services or change ports in configuration

4. **Contract deployment issues:**
   - Ensure local blockchain is running
   - Check contract compilation: `npm run build:contracts`

### Getting Help

- Check the logs: `npm run docker:logs`
- Review environment configuration
- Ensure all prerequisites are installed
- Try a full reset: `npm run reset`

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [RainbowKit Documentation](https://www.rainbowkit.com/docs)
- [Wagmi Documentation](https://wagmi.sh/)