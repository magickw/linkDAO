# LinkDAO Render Deployment Fixes

This document specifically addresses the deployment issues encountered when deploying to Render, which were similar to the Vercel deployment issues.

## Problem

The Render deployment was failing with the following error:

```
npm error code ERESOLVE
npm error ERESOLVE unable to resolve dependency tree
npm error While resolving: @linkdao/contracts@0.1.0
npm error Found: @nomicfoundation/hardhat-chai-matchers@2.1.0
npm error Could not resolve dependency:
npm error peer @nomicfoundation/hardhat-chai-matchers@"^1.0.0" from @nomicfoundation/hardhat-toolbox@2.0.2
```

This is the same dependency conflict issue we encountered with Vercel deployments.

## Solution Implemented

We implemented multiple layers of fixes to ensure the `legacy-peer-deps` flag is respected in all environments:

### 1. Package.json Configuration

Added `legacyPeerDeps` configuration to all package.json files:
- `/app/package.json` (root)
- `/app/frontend/package.json`
- `/app/backend/package.json`
- `/app/contracts/package.json`
- `/app/mobile/package.json`

### 2. .npmrc Files

Created `.npmrc` files in all directories to ensure the `legacy-peer-deps` flag is always used:
- `/app/.npmrc`
- `/app/frontend/.npmrc`
- `/app/backend/.npmrc`
- `/app/contracts/.npmrc`
- `/app/mobile/.npmrc`

Each file contains:
```
legacy-peer-deps=true
```

### 3. Manual Configuration

Set the npm configuration manually:
```bash
npm config set legacy-peer-deps true
```

## Render-Specific Deployment Instructions

For Render deployment, follow these specific steps:

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set the root directory to `app/backend`
4. Set the build command to `npm run build`
5. Set the start command to `npm start`
6. Add all required environment variables:
   - `PORT` (Render automatically sets this)
   - `NODE_ENV=production`
   - `DATABASE_URL` (PostgreSQL connection string)
   - `REDIS_URL` (Redis connection string)
   - `JWT_SECRET` (Random string for JWT signing)
   - `JWT_EXPIRES_IN=24h`
   - `IPFS_HOST=ipfs.infura.io`
   - `IPFS_PORT=5001`
   - `IPFS_PROTOCOL=https`
   - `PINECONE_API_KEY` (Your Pinecone API key)
   - `PINECONE_ENVIRONMENT` (Your Pinecone environment)
   - `PINECONE_INDEX_NAME=linkdao`
   - `OPENAI_API_KEY` (Your OpenAI API key)
   - `RPC_URL=https://mainnet.base.org`
   - `PRIVATE_KEY` (Your wallet private key for contract deployments)

7. In the "Advanced" section, you may need to set the Node.js version to ensure compatibility (>=18.0.0)

## Database and Redis Configuration for Render

Render provides integrated database services. For the easiest setup:

1. Create a PostgreSQL database from the Render dashboard
2. Create a Redis instance from the Render dashboard
3. Render will automatically provide connection strings for both
4. Copy these connection strings to your environment variables:
   - `DATABASE_URL` for PostgreSQL
   - `REDIS_URL` for Redis

## Why These Fixes Work

1. **Multiple Redundancy**: We've implemented the `legacy-peer-deps` configuration in multiple places:
   - package.json files
   - .npmrc files
   - Manual npm configuration

2. **Environment Consistency**: The .npmrc files ensure that the configuration is respected in all environments, including CI/CD pipelines and deployment platforms.

3. **Industry Standard Approach**: The `legacy-peer-deps` flag is a widely accepted solution for dependency conflicts in the blockchain development community.

## Verification

We've verified that the fixes work by:
1. Setting the npm configuration manually
2. Running `npm install` successfully without dependency conflicts
3. Ensuring all workspaces can be installed and built correctly

## Additional Notes for Render

1. Render may have specific Node.js versions available. Make sure to select a version >= 18.0.0 for compatibility with our project.

2. Render automatically sets the `PORT` environment variable, so you don't need to explicitly set it unless your application requires a specific port.

3. If you encounter any issues with the build process, you can enable more verbose logging in the Render dashboard to troubleshoot.

4. Make sure your Render service has enough memory and CPU resources allocated, especially for the build process which can be resource-intensive.

5. For database migrations, you may need to run them manually or as part of your build process depending on your setup.