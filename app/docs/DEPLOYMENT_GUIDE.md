# LinkDAO Deployment Guide

This guide provides instructions for deploying the LinkDAO application to production environments.

## Prerequisites

1. Node.js >= 18.0.0
2. npm >= 8.0.0
3. Vercel account (for frontend deployment)
4. Hosting provider for backend (e.g., Render, Railway, Heroku)
5. Base network wallet with ETH for contract deployment

## Environment Variables

Before deploying, make sure to set the following environment variables in your deployment environments:

### Frontend (.env.local)

```bash
# WalletConnect Project ID - Get yours at https://cloud.reown.com/
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# RPC URLs
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_BASE_GOERLI_RPC_URL=https://goerli.base.org

# Admin Address (for demo purposes)
NEXT_PUBLIC_ADMIN_ADDRESS=your_admin_address

# Backend API URL - Update this to your actual backend URL when deploying
NEXT_PUBLIC_API_URL=https://your-backend-url.com/api
NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com
```

### Backend (.env)

The backend .env file contains many configuration options. Here are the key ones you need to configure for deployment:

```bash
# Server Configuration
PORT=3002
NODE_ENV=production

# Database Configuration
# For PostgreSQL, use a connection string like:
# DATABASE_URL=postgresql://username:password@host:port/database
# For deployment, you can use services like Supabase, Render PostgreSQL, or Heroku Postgres
DATABASE_URL=your_database_url

# Redis Configuration
# For deployment, you can use services like Upstash, Render Redis, or Heroku Redis
REDIS_URL=your_redis_url

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h

# IPFS Configuration
IPFS_HOST=ipfs.infura.io
IPFS_PORT=5001
IPFS_PROTOCOL=https

# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_pinecone_environment
PINECONE_INDEX_NAME=your_pinecone_index_name

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Blockchain Configuration
RPC_URL=https://mainnet.base.org
# For contract deployments, you'll also need:
# PRIVATE_KEY=your_private_key
```

For a complete list of environment variables, refer to the `app/backend/.env` file.

## Deployment Steps

### 1. Frontend Deployment (Vercel)

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

Additionally, `.npmrc` files have been added to all directories to ensure the `legacy-peer-deps` flag is always used during installation.

### 2. Backend Deployment

You can deploy the backend to any Node.js hosting provider. Here's an example using Render:

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set the root directory to `app/backend`
4. Set the build command to `npm run build`
5. Set the start command to `npm start`
6. Add the environment variables
7. Deploy

For Render specifically, you may need to set the Node.js version in the service settings to ensure compatibility.

### 3. Smart Contract Deployment

1. Update the `.env` file in the `contracts` directory with your wallet private key
2. Run the deployment script:

```bash
cd app/contracts
npm run deploy
```

3. Note the deployed contract addresses and update the frontend and backend configurations accordingly

## Troubleshooting

### Dependency Conflicts

If you encounter dependency conflicts during deployment, the `legacyPeerDeps` configuration should resolve them. This has been added to:
1. All package.json files as `npm.legacyPeerDeps: true`
2. All .npmrc files as `legacy-peer-deps=true`

### Vercel Build Issues

If you encounter build issues with Vercel, make sure:
1. The root directory is set to `app/frontend`
2. Environment variables are properly configured
3. The `NPM_FLAGS: --legacy-peer-deps` is set in vercel.json

### API Connection Issues

If the frontend cannot connect to the backend:
1. Verify the `NEXT_PUBLIC_API_URL` is correctly set
2. Ensure the backend is running and accessible
3. Check CORS configuration in the backend

### Render Deployment Issues

If you encounter issues with Render deployment:
1. Make sure to set the correct root directory (`app/backend`)
2. Set the build command to `npm run build`
3. Set the start command to `npm start`
4. Ensure environment variables are properly configured
5. Check that the Node.js version is compatible (>=18.0.0)

## Monitoring and Maintenance

1. Set up monitoring for your backend API
2. Monitor blockchain transaction fees
3. Regularly update dependencies
4. Perform security audits