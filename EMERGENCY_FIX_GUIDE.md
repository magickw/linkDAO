# CORS and CSP Emergency Fix Guide

## Quick Fix Applied

This emergency fix has been applied to resolve CORS and CSP issues:

### 1. Environment Variables Updated
- NEXT_PUBLIC_API_URL=http://localhost:10000
- NEXT_PUBLIC_WS_URL=ws://localhost:10000
- CORS_ORIGIN includes localhost:3000

### 2. CSP Policy Relaxed (Development Only)
- Added localhost:10000 to connect-src
- Added 127.0.0.1:* to connect-src
- Added API endpoints for Web3Modal and CoinGecko

### 3. CORS Configuration Enhanced
- Allows all localhost origins in development
- Includes all necessary headers for Web3 operations
- Supports credentials for session management

## Manual Steps Required

### 1. Start Backend Server
```bash
cd app/backend
npm install
npm run dev
```

### 2. Verify Backend is Running
```bash
node check-backend-health.js
```

### 3. Start Frontend
```bash
npm run dev
```

## Troubleshooting

### Backend Not Starting
1. Check port 10000 is available: `lsof -i :10000`
2. Install dependencies: `cd app/backend && npm install`
3. Check environment variables in app/backend/.env

### CORS Still Blocked
1. Clear browser cache and cookies
2. Try incognito/private browsing mode
3. Check browser console for specific error messages

### CSP Violations
1. Restart the development server
2. Clear Next.js cache: `rm -rf .next`
3. Check browser developer tools for CSP errors

## Files Modified
- deploy.config.js (CSP policy)
- next.config.js (API rewrites)
- Environment files (.env.local)

## Revert Changes
To revert these emergency changes:
1. Restore original CSP policy in deploy.config.js
2. Remove emergency environment variables
3. Delete temporary files: emergency-cors.js, dev-csp-override.js

## Production Deployment
These changes are for development only. Production deployment should use:
- Strict CSP policy
- Specific CORS origins
- HTTPS endpoints only
