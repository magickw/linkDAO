
# 🚨 EMERGENCY CORS FIX DEPLOYMENT INSTRUCTIONS

## Problem
The production backend is sending multiple values in the Access-Control-Allow-Origin header:
'https://www.linkdao.io,https://linkdao.io,https://linkdao.vercel.app,http://localhost:3000'

Browsers only accept ONE value in this header, causing all CORS requests to fail.

## Solution Applied
1. Fixed index.render.ts to properly split FRONTEND_URL into an array
2. Fixed WebSocket services to handle multiple origins correctly  
3. Enabled EMERGENCY_CORS=true to use the emergency CORS middleware

## Deployment Steps

### For Render.com:
1. Go to your Render dashboard
2. Navigate to your backend service
3. Go to Environment tab
4. Add/Update these environment variables:
   - EMERGENCY_CORS=true
   - NODE_ENV=production
5. Redeploy the service

### For Manual Deployment:
1. Set environment variable: export EMERGENCY_CORS=true
2. Restart the backend service
3. Verify CORS headers only contain one origin

## Verification
After deployment, check that API requests return only ONE origin:
```
curl -H "Origin: https://www.linkdao.io" https://api.linkdao.io/health -v
```

Should return:
```
Access-Control-Allow-Origin: https://www.linkdao.io
```

NOT:
```
Access-Control-Allow-Origin: https://www.linkdao.io,https://linkdao.io,...
```

## Files Modified:
- app/backend/src/index.render.ts
- app/backend/src/services/adminWebSocketService.ts  
- app/backend/src/services/websocket/scalableWebSocketManager.ts
- app/backend/.env (added EMERGENCY_CORS=true)
