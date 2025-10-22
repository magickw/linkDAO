# Dashboard Issues Fix Documentation

This document explains the issues identified in the LinkDAO dashboard and the fixes implemented to resolve them.

## Issues Identified

### 1. CORS Errors
```
Access to fetch at 'https://linkdao-backend.onrender.com/api/posts/feed?forUser=0xCf4363d84f4A48486dD414011aB71ee7811eDD55' from origin 'http://localhost:3000' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

### 2. Backend 500 Error
```
linkdao-backend.onrender.com/api/profiles/address/0xCf4363d84f4A48486dD414011aB71ee7811eDD55:1  Failed to load resource: the server responded with a status of 500 ()
```

### 3. WebSocket Connection Failures
```
WebSocket connection to 'wss://linkdao-backend.onrender.com/socket.io/?EIO=4&transport=websocket' failed:
```

### 4. DNS Resolution Error
```
300:1  Failed to load resource: net::ERR_NAME_NOT_RESOLVED
```

## Root Causes and Solutions

### 1. CORS Configuration Fix

#### Problem
The backend was only configured to allow requests from the production frontend URL (`https://linkdao.io`) but not from localhost development URLs (`http://localhost:3000`).

#### Solution
Updated the CORS configuration in the backend to allow multiple origins:

1. Modified [app/backend/src/index.ts](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend/src/index.ts) to parse the `FRONTEND_URL` environment variable as a comma-separated list
2. Explicitly added localhost URLs (`http://localhost:3000`, `http://localhost:3001`) to the allowed origins
3. Maintained the production URL for deployed environments

#### Code Changes
```typescript
// Configure CORS to allow multiple origins
const frontendUrls = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : [];
const allowedOrigins = [
  ...frontendUrls,
  "http://localhost:3000",
  "http://localhost:3001",
  "https://linkdao.io"
];

const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
};
```

### 2. WebSocket Configuration Fix

#### Problem
WebSocket connections were failing due to the same CORS restrictions.

#### Solution
Applied the same multi-origin CORS configuration to the Socket.IO server:

```typescript
// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"]
  }
});
```

### 3. Environment Variables Update

#### Problem
The `FRONTEND_URL` environment variable was not properly configured for multiple origins.

#### Solution
Updated [app/backend/.env](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend/.env) to include multiple origins:

```
# Frontend URL for CORS - allowing multiple origins
FRONTEND_URL=http://localhost:3000,http://localhost:3001,https://linkdao.io
```

## Testing the Fixes

To verify that all issues have been resolved:

1. Restart the backend server:
   ```bash
   cd app/backend
   npm run dev
   ```

2. Access the dashboard at `http://localhost:3000/dashboard` or `http://localhost:3001/dashboard`

3. Verify that:
   - API requests to the backend are successful (no CORS errors)
   - WebSocket connections are established
   - Profile and feed data loads correctly
   - No 500 server errors appear

## Additional Notes

### WebSocket Service Implementation
The frontend WebSocket service ([webSocketService.ts](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/frontend/src/services/webSocketService.ts)) uses the `NEXT_PUBLIC_BACKEND_URL` environment variable to connect to the backend:

```typescript
// Get the backend URL from environment variables
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002';
```

Make sure this is properly configured in your frontend [.env.local](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/frontend/.env.local) file:
```
NEXT_PUBLIC_BACKEND_URL=https://linkdao-backend.onrender.com
```

For local development, you might want to change this to:
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:3002
```

### Notification System
The [NotificationSystem.tsx](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/frontend/src/components/NotificationSystem.tsx) component uses the [useWebSocket](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/frontend/src/hooks/useWebSocket.ts) hook to receive real-time notifications. With the CORS fixes, this should now work properly.

## Future Considerations

1. For production deployments, ensure that the `FRONTEND_URL` environment variable only includes trusted origins
2. Monitor for any new CORS-related issues as the application evolves
3. Consider implementing more sophisticated CORS policies based on the environment (development vs. production)
4. Test WebSocket functionality thoroughly in different network conditions