# LinkDAO Vercel Deployment Guide

## Overview
This guide explains how to deploy the LinkDAO frontend application to Vercel.

## Prerequisites
1. A Vercel account (https://vercel.com)
2. The LinkDAO repository
3. A WalletConnect Project ID (get one at https://cloud.reown.com/)

## Deployment Steps

### 1. Prepare the Frontend for Deployment

#### Environment Variables
Before deploying, ensure you have the correct environment variables in your Vercel project:

1. `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` - Your WalletConnect project ID
2. `NEXT_PUBLIC_API_URL` - Your backend API URL (e.g., https://your-backend.vercel.app/api)
3. `NEXT_PUBLIC_BASE_RPC_URL` - Base mainnet RPC URL
4. `NEXT_PUBLIC_BASE_GOERLI_RPC_URL` - Base testnet RPC URL
5. `NEXT_PUBLIC_ADMIN_ADDRESS` - Admin wallet address for demo purposes

#### Update Configuration
Make sure your [next.config.js](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/frontend/next.config.js) file is properly configured:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  },
}

module.exports = nextConfig
```

### 2. Deploy to Vercel

#### Option 1: Deploy via Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Click "New Project"
3. Import your LinkDAO repository
4. Set the root directory to `app/frontend`
5. Configure the environment variables as listed above
6. Click "Deploy"

#### Option 2: Deploy via Vercel CLI
1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Navigate to the frontend directory:
   ```bash
   cd app/frontend
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. Follow the prompts to configure your project

### 3. Configure Build Settings

In your Vercel project settings, ensure the following build settings:

- **Build Command**: `next build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Development Command**: `next dev --port $PORT`

### 4. Environment Variables Configuration

In your Vercel project, go to Settings > Environment Variables and add:

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Your WalletConnect project ID | Production & Preview |
| `NEXT_PUBLIC_API_URL` | Your backend API URL | Production & Preview |
| `NEXT_PUBLIC_BASE_RPC_URL` | `https://mainnet.base.org` | Production & Preview |
| `NEXT_PUBLIC_BASE_GOERLI_RPC_URL` | `https://goerli.base.org` | Production & Preview |
| `NEXT_PUBLIC_ADMIN_ADDRESS` | Your admin wallet address | Production & Preview |

### 5. Backend Deployment

Note that the backend needs to be deployed separately. You can deploy it to Vercel, Render, or any other Node.js hosting provider.

When deploying the backend, make sure to:
1. Set the proper environment variables
2. Configure CORS to allow requests from your frontend domain
3. Set up proper security measures (JWT secrets, etc.)

### 6. Post-Deployment Configuration

After deployment, you may need to:

1. Update the backend URL in your frontend environment variables
2. Verify that all API endpoints are working correctly
3. Test wallet connectivity and transactions
4. Check that all pages load properly

## Troubleshooting

### Common Issues

1. **WalletConnect Connection Issues**
   - Ensure `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set correctly
   - Check that your WalletConnect project is configured for the correct network

2. **API Connection Issues**
   - Verify that `NEXT_PUBLIC_API_URL` points to your deployed backend
   - Ensure CORS is properly configured on your backend

3. **Build Failures**
   - Check that all dependencies are correctly installed
   - Ensure Node.js version is compatible (>=18.0.0)

### Checking Deployment Status

You can check your deployment status by:
1. Going to your Vercel dashboard
2. Selecting your project
3. Viewing the deployment logs

## Additional Notes

- The frontend is configured to run on port 3000 locally, but Vercel will automatically assign a port
- Make sure your backend is deployed and accessible from the internet
- For production deployments, consider using a custom domain
- Ensure proper security measures are in place for your backend API