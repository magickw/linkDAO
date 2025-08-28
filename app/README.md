# LinkDAO Application

This is the main application repository for LinkDAO, a web3-based social platform with native cryptocurrency wallets and DAO governance.

## Project Structure

```
app/
├── contracts/          # Smart contracts (Solidity)
├── frontend/           # Web application (Next.js/React)
├── backend/            # API and services (Node.js)
├── mobile/             # Mobile application (React Native)
├── docs/               # Documentation
└── scripts/            # Deployment and utility scripts
```

## Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Docker (for local development)

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development servers:
   ```bash
   npm run dev
   ```

3. For contract development:
   ```bash
   npm run deploy:contracts
   ```

## Workspaces

This project uses npm workspaces to manage multiple packages:

- `frontend`: Web application
- `backend`: API and services
- `contracts`: Smart contracts
- `mobile`: Mobile application

## Data Storage Architecture

It's important to understand the current data storage architecture:

### Current Implementation (In-Memory Storage)

The application currently uses in-memory storage for all data:
- User profiles
- Social posts
- Marketplace listings, bids, and escrow transactions
- Follow relationships

This means all data is lost when the application restarts. This is suitable for demonstration purposes but should be enhanced for production use.

### Pinecone Usage

Pinecone is used only for AI services:
- Retrieval Augmented Generation (RAG) for AI bots
- Content moderation and analysis
- NOT used for user authentication or general data storage

### Drizzle ORM + PostgreSQL (New)

We've integrated Drizzle ORM with PostgreSQL for production-ready data persistence:
- Type-safe database operations
- Schema migrations
- Support for pgvector extension for AI embeddings
- See [DRIZZLE_INTEGRATION.md](docs/DRIZZLE_INTEGRATION.md) for details

For production deployment, see [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) for detailed schema information and implementation guidance.

## Deployment

### Frontend Deployment (Vercel)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set the root directory to `app/frontend`
4. Add the environment variables to Vercel
5. Deploy

The `legacyPeerDeps` configuration has been added to resolve dependency conflicts:
- Root package.json
- Frontend package.json
- Backend package.json
- Contracts package.json
- Mobile package.json

### Backend Deployment (Render and other platforms)

1. Choose a hosting provider (Render, Railway, Heroku, etc.)
2. Connect your GitHub repository
3. Set the root directory to `app/backend`
4. Set the build command to `npm run build`
5. Set the start command to `npm start`
6. Add the environment variables from `app/backend/.env`
7. Deploy

For Render specifically:
- Set the root directory to `app/backend`
- Set build command to `npm run build`
- Set start command to `npm start`
- Configure environment variables as needed from `app/backend/.env`

### Smart Contract Deployment

1. Update the `.env` file in the `contracts` directory with your wallet private key
2. Run the deployment script:

```bash
cd app/contracts
npm run deploy
```

3. Note the deployed contract addresses and update the frontend and backend configurations accordingly

For detailed deployment instructions, see:
- [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) - Comprehensive deployment guide
- [RENDER_DEPLOYMENT_FIXES.md](docs/RENDER_DEPLOYMENT_FIXES.md) - Specific fixes for Render deployment issues
- [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) - Database schema for production deployment
- [DRIZZLE_INTEGRATION.md](docs/DRIZZLE_INTEGRATION.md) - Drizzle ORM integration details

## Troubleshooting

If you encounter dependency conflicts during deployment, the `legacyPeerDeps` configuration should resolve them. This has been added to all package.json files and .npmrc files to ensure consistency across all environments.