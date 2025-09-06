# LinkDAO Deployment Checklist

## Pre-Deployment

- [ ] Update all environment variables in deployment environments
- [ ] Verify all package.json files have `legacyPeerDeps` configuration
- [ ] Check that .npmrc files exist in all directories with `legacy-peer-deps=true`
- [ ] Verify that vercel.json files have `NPM_FLAGS: --legacy-peer-deps`
- [ ] Ensure all .env.example files are up to date
- [ ] Run `npm install --legacy-peer-deps` locally to verify installation
- [ ] Run build commands for all workspaces locally
- [ ] Run tests for all workspaces locally
- [ ] Update contract addresses if contracts were redeployed
- [ ] Verify smart contract deployments on the blockchain
- [ ] Check that all external services (IPFS, Pinecone, etc.) are properly configured

## Frontend Deployment (Vercel)

- [ ] Push latest code to GitHub
- [ ] Connect repository to Vercel
- [ ] Set root directory to `app/frontend`
- [ ] Add all required environment variables:
  - [ ] `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
  - [ ] `NEXT_PUBLIC_BASE_RPC_URL`
  - [ ] `NEXT_PUBLIC_BASE_GOERLI_RPC_URL`
  - [ ] `NEXT_PUBLIC_ADMIN_ADDRESS`
  - [ ] `NEXT_PUBLIC_BACKEND_URL`
  - [ ] `NEXT_PUBLIC_BACKEND_URL`
- [ ] Verify build settings in Vercel dashboard
- [ ] Trigger deployment
- [ ] Monitor deployment logs for errors
- [ ] Test deployed application

## Backend Deployment

- [ ] Choose hosting provider (Render, Railway, Heroku, etc.)
- [ ] Connect repository to hosting provider
- [ ] Set root directory to `app/backend`
- [ ] Set build command to `npm run build`
- [ ] Set start command to `npm start`
- [ ] Add all required environment variables:
  - [ ] `PORT`
  - [ ] `NODE_ENV`
  - [ ] `DATABASE_URL`
  - [ ] `REDIS_URL`
  - [ ] `JWT_SECRET`
  - [ ] `JWT_EXPIRES_IN`
  - [ ] `IPFS_HOST`
  - [ ] `IPFS_PORT`
  - [ ] `IPFS_PROTOCOL`
  - [ ] `PINECONE_API_KEY`
  - [ ] `PINECONE_ENVIRONMENT`
  - [ ] `PINECONE_INDEX_NAME`
  - [ ] `OPENAI_API_KEY`
  - [ ] `BASE_RPC_URL`
  - [ ] `PRIVATE_KEY`
- [ ] Trigger deployment
- [ ] Monitor deployment logs for errors
- [ ] Test API endpoints

## Smart Contract Deployment

- [ ] Update `.env` file in `app/contracts` with wallet private key
- [ ] Verify network configurations
- [ ] Run deployment script: `npm run deploy`
- [ ] Note deployed contract addresses
- [ ] Update frontend and backend with new contract addresses if needed
- [ ] Verify contracts on blockchain explorer
- [ ] Test contract functions

## Post-Deployment

- [ ] Test all application features
- [ ] Verify wallet connections work
- [ ] Test API endpoints
- [ ] Verify smart contract interactions
- [ ] Test marketplace functionality
- [ ] Test social features
- [ ] Test governance features
- [ ] Test admin dashboard
- [ ] Verify real-time updates work
- [ ] Test error handling
- [ ] Verify security measures are in place
- [ ] Set up monitoring and alerting
- [ ] Document deployed versions and addresses
- [ ] Update project documentation with deployment details

## Monitoring and Maintenance

- [ ] Set up uptime monitoring for backend API
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Set up performance monitoring
- [ ] Set up blockchain transaction monitoring
- [ ] Schedule regular dependency updates
- [ ] Schedule security audits
- [ ] Plan for scaling requirements
- [ ] Document rollback procedures