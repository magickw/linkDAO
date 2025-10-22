# CORS Fix Instructions

This document explains how to fix the CORS issues in the LinkDAO application.

## Problem Summary

The application was experiencing CORS (Cross-Origin Resource Sharing) errors when:
1. The frontend on `https://linkdao.io` tried to access external RPC providers like Alchemy
2. The frontend tried to access the backend API on `https://linkdao-backend.onrender.com`
3. Various external services were being accessed directly from the browser

## Solution Overview

We've implemented a multi-layered approach to fix CORS issues:

1. **Backend CORS Configuration**: Updated the backend to allow requests from the frontend domain
2. **Frontend Proxy**: Created proxy endpoints in both frontend and backend to route external requests through our own servers
3. **RPC Request Handling**: Modified the wagmi configuration to use our proxy for RPC requests
4. **Environment Configuration**: Updated environment variables to use proper API keys

## Implementation Details

### 1. Backend Changes

- Updated [app/backend/src/middleware/securityMiddleware.ts](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend/src/middleware/securityMiddleware.ts) to allow all origins in production
- Created [app/backend/src/routes/proxyRoutes.ts](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend/src/routes/proxyRoutes.ts) to proxy external API requests
- Added proxy routes to [app/backend/src/index.ts](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend/src/index.ts)

### 2. Frontend Changes

- Updated [app/frontend/.env](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/frontend/.env) with proper RPC URLs
- Modified [app/frontend/src/lib/wagmi.ts](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/frontend/src/lib/wagmi.ts) to use proxy for RPC requests
- Created [app/frontend/src/pages/api/proxy.ts](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/frontend/src/pages/api/proxy.ts) for frontend proxy
- Created [app/frontend/src/lib/rpcProxy.ts](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/frontend/src/lib/rpcProxy.ts) utility for RPC requests

## Setup Instructions

### 1. Environment Variables

Update your environment variables in both frontend and backend:

**Frontend (.env file):**
```
# Get your Alchemy API key from https://dashboard.alchemy.com/
NEXT_PUBLIC_MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
NEXT_PUBLIC_BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
NEXT_PUBLIC_BASE_GOERLI_RPC_URL=https://base-goerli.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
NEXT_PUBLIC_ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY

# Backend URLs
NEXT_PUBLIC_API_URL=https://linkdao-backend.onrender.com
NEXT_PUBLIC_BACKEND_URL=https://linkdao-backend.onrender.com
```

**Backend (.env file):**
```
# Add your frontend domain to allowed origins
ALLOWED_ORIGINS=http://localhost:3000,https://linkdao.io,https://linkdao.io
```

### 2. Deploy Changes

1. Deploy the updated backend to Render
2. Deploy the updated frontend to Vercel
3. Verify that the CORS errors are resolved

## Testing

After deployment, you should no longer see CORS errors in the browser console. The application should be able to:

1. Connect to wallets without CORS issues
2. Fetch data from the backend API
3. Make RPC calls to blockchain networks
4. Access external services through the proxy

## Additional Notes

- The proxy approach adds a small latency to external requests but completely eliminates CORS issues
- All external API requests are now routed through our own servers, which provides better control and security
- The solution is compatible with both development and production environments