# Environment Switching Guide

This document explains how to switch between local development and production environments for the LinkDAO application.

## Local Development Environment

For local development, you should use the following configuration:

### Frontend (.env.local)
```
# WalletConnect Project ID - Get yours at https://cloud.reown.com/
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# RPC URLs
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_BASE_GOERLI_RPC_URL=https://goerli.base.org

# Admin Address (for demo purposes)
NEXT_PUBLIC_ADMIN_ADDRESS=your_admin_address

# Backend API URL - Local development
NEXT_PUBLIC_BACKEND_URL=http://localhost:3002
NEXT_PUBLIC_BACKEND_URL=http://localhost:3002
```

### Backend (.env)
```
# Frontend URL for CORS - Local development
FRONTEND_URL=http://localhost:3000,http://localhost:3001

# Backend URL
BACKEND_URL=http://localhost:3002
```

## Production Environment

For production deployment, use the following configuration:

### Frontend (Vercel Environment Variables)
```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_BASE_GOERLI_RPC_URL=https://goerli.base.org
NEXT_PUBLIC_ADMIN_ADDRESS=your_admin_address
NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com
NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com
```

### Backend (Render Environment Variables)
```
FRONTEND_URL=https://your-frontend-url.com
BACKEND_URL=https://your-backend-url.com
```

## Switching Between Environments

### To Switch to Local Development:

1. Update frontend [.env.local](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/frontend/.env.local):
   ```
   NEXT_PUBLIC_BACKEND_URL=http://localhost:3002
   NEXT_PUBLIC_BACKEND_URL=http://localhost:3002
   ```

2. Update backend [.env](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend/.env):
   ```
   FRONTEND_URL=http://localhost:3000,http://localhost:3001
   ```

3. Start both services:
   ```bash
   # Terminal 1 - Start backend
   cd app/backend
   npm run dev
   
   # Terminal 2 - Start frontend
   cd app/frontend
   npm run dev
   ```

### To Switch to Production:

1. Update frontend environment variables in Vercel dashboard:
   ```
   NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com
   NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com
   ```

2. Update backend environment variables in Render dashboard:
   ```
   FRONTEND_URL=https://your-frontend-url.com
   ```

## Troubleshooting

### CORS Issues
If you encounter CORS issues, ensure that:
1. The `FRONTEND_URL` environment variable in the backend includes all allowed origins
2. The frontend is using the correct backend URL
3. Both services are running and accessible

### WebSocket Connection Issues
If WebSocket connections fail:
1. Verify that the backend URL in the frontend configuration is correct
2. Check that the backend server supports WebSocket connections
3. Ensure that firewall settings allow WebSocket traffic

### API Connection Issues
If API calls fail:
1. Verify that the `NEXT_PUBLIC_BACKEND_URL` points to the correct backend API endpoint
2. Check that the backend server is running
3. Ensure that CORS is properly configured

## Best Practices

1. **Environment Isolation**: Keep local and production configurations separate
2. **Secrets Management**: Never commit sensitive information to version control
3. **Testing**: Always test configuration changes in a development environment first
4. **Documentation**: Keep this guide updated when making environment changes