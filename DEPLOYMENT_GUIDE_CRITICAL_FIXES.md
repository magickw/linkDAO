# Deployment Guide: Critical Frontend-Backend Fixes

## Overview

This guide covers the deployment of critical fixes to resolve the frontend-backend integration issues causing 401 errors, CORS violations, WebSocket failures, and service unavailability.

## Files Modified/Created

### Backend Files Modified:
1. `app/backend/src/middleware/enhancedCorsMiddleware.ts` - Added x-csrf-token to allowed headers
2. `app/backend/src/routes/feedRoutes.ts` - Made enhanced feed endpoint public
3. `app/backend/src/controllers/feedController.ts` - Added graceful fallback for unauthenticated users
4. `app/backend/src/services/communityService.ts` - Improved error handling with fallbacks
5. `app/backend/src/controllers/communityController.ts` - Enhanced error recovery
6. `app/backend/src/routes/communityRoutes.ts` - Added fallback route handling

### New Backend Files Created:
1. `app/backend/src/services/enhancedWebSocketService.ts` - Enhanced WebSocket service
2. `app/backend/src/middleware/intelligentRateLimiting.ts` - Intelligent rate limiting
3. `app/backend/src/services/serviceHealthMonitor.ts` - Service health monitoring
4. `app/backend/src/services/errorRecoveryService.ts` - Error recovery service

## Deployment Steps

### 1. Pre-Deployment Checklist

```bash
# Verify all files are present
ls -la app/backend/src/services/enhancedWebSocketService.ts
ls -la app/backend/src/middleware/intelligentRateLimiting.ts
ls -la app/backend/src/services/serviceHealthMonitor.ts
ls -la app/backend/src/services/errorRecoveryService.ts

# Check for TypeScript compilation errors
cd app/backend
npm run build
```

### 2. Environment Variables

Ensure these environment variables are set:

```bash
# Required
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
NODE_ENV=production

# Optional (for enhanced features)
FRONTEND_URL=https://www.linkdao.io,https://linkdao.io
RATE_LIMIT_REDIS_URL=your_redis_url (optional)
```

### 3. Database Migration

No database migrations are required for these fixes.

### 4. Backend Deployment

```bash
# Install dependencies
cd app/backend
npm install

# Build the application
npm run build

# Start the server
npm start
```

### 5. Integration with Existing Services

#### Update Main Server Index (app/backend/src/index.ts)

Add these imports and middleware:

```typescript
// Add to imports
import { enhancedCorsMiddleware } from './middleware/enhancedCorsMiddleware';
import { intelligentRateLimiter } from './middleware/intelligentRateLimiting';
import { serviceHealthMonitor } from './services/serviceHealthMonitor';
import { errorRecoveryService } from './services/errorRecoveryService';
import { initializeEnhancedWebSocket } from './services/enhancedWebSocketService';

// Replace existing CORS middleware
app.use(enhancedCorsMiddleware.middleware());

// Add intelligent rate limiting
app.use('/api', intelligentRateLimiter.apiRateLimit);
app.use('/api/feed', intelligentRateLimiter.feedRateLimit);
app.use('/api/auth', intelligentRateLimiter.authRateLimit);

// Initialize enhanced WebSocket service
const enhancedWebSocket = initializeEnhancedWebSocket(httpServer);

// Add health monitoring endpoint
app.get('/api/health/detailed', (req, res) => {
  const overallHealth = serviceHealthMonitor.getOverallHealth();
  const serviceStatus = errorRecoveryService.getServiceStatus();
  
  res.json({
    success: true,
    data: {
      overall: overallHealth,
      services: serviceHealthMonitor.getAllServicesHealth(),
      errorRecovery: serviceStatus,
      timestamp: new Date().toISOString()
    }
  });
});
```

### 6. Frontend Updates (Recommended)

Update frontend to handle new response formats:

```typescript
// Handle fallback responses
interface APIResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  fallback?: boolean;
  timestamp?: string;
}

// Update API client to handle fallbacks
const handleAPIResponse = <T>(response: APIResponse<T>) => {
  if (response.fallback) {
    // Show user-friendly message for fallback responses
    console.warn('Service temporarily unavailable:', response.message);
    // You might want to show a toast notification
  }
  return response.data;
};
```

### 7. Monitoring and Verification

#### Health Check Endpoints

```bash
# Basic health check
curl https://api.linkdao.io/health

# Detailed health check
curl https://api.linkdao.io/api/health/detailed

# Service-specific checks
curl https://api.linkdao.io/api/feed/enhanced
curl https://api.linkdao.io/api/communities/trending
```

#### WebSocket Connection Test

```javascript
// Test WebSocket connection
const socket = io('wss://api.linkdao.io', {
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ WebSocket connected successfully');
  
  // Test authentication
  socket.emit('authenticate', {
    walletAddress: '0x...',
    reconnecting: false
  });
});

socket.on('authenticated', (data) => {
  console.log('✅ WebSocket authentication successful:', data);
});

socket.on('connect_error', (error) => {
  console.error('❌ WebSocket connection error:', error);
});
```

### 8. Performance Monitoring

#### Rate Limiting Metrics

```bash
# Check rate limiting stats
curl https://api.linkdao.io/api/health/detailed | jq '.data.errorRecovery'
```

#### Service Health Metrics

```bash
# Monitor service health
curl https://api.linkdao.io/api/health/detailed | jq '.data.services'
```

### 9. Rollback Plan

If issues occur, rollback steps:

1. **Revert CORS changes:**
   ```bash
   git checkout HEAD~1 -- app/backend/src/middleware/enhancedCorsMiddleware.ts
   ```

2. **Revert feed route changes:**
   ```bash
   git checkout HEAD~1 -- app/backend/src/routes/feedRoutes.ts
   git checkout HEAD~1 -- app/backend/src/controllers/feedController.ts
   ```

3. **Remove new services:**
   ```bash
   # Comment out new service imports in index.ts
   # Restart server with previous configuration
   ```

### 10. Post-Deployment Validation

#### Automated Tests

```bash
# Run backend tests
cd app/backend
npm test

# Test specific endpoints
npm run test:integration
```

#### Manual Verification

1. **CORS Headers:**
   ```bash
   curl -H "Origin: https://www.linkdao.io" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: x-csrf-token" \
        -X OPTIONS \
        https://api.linkdao.io/api/feed/enhanced
   ```

2. **Feed Access:**
   ```bash
   # Should work without authentication
   curl https://api.linkdao.io/api/feed/enhanced
   ```

3. **Community Endpoints:**
   ```bash
   # Should return fallback data if service is down
   curl https://api.linkdao.io/api/communities/trending
   ```

### 11. Monitoring Dashboard

Set up monitoring for:

- API response times
- Error rates by endpoint
- WebSocket connection success rates
- Rate limiting hit rates
- Service health status
- Circuit breaker states

### 12. Alerts Configuration

Configure alerts for:

- Service health degradation
- High error rates (>5%)
- WebSocket connection failures
- Rate limiting threshold breaches
- Database connectivity issues

## Expected Improvements

After deployment, you should see:

1. **Reduced 401 Errors:** Feed and community endpoints accessible without auth
2. **No CORS Violations:** x-csrf-token header properly allowed
3. **Better WebSocket Stability:** Enhanced reconnection and error handling
4. **Graceful Degradation:** Fallback responses instead of 503 errors
5. **Intelligent Rate Limiting:** User-tier based limits with better UX

## Support and Troubleshooting

If issues persist after deployment:

1. Check the detailed health endpoint: `/api/health/detailed`
2. Monitor service logs for error patterns
3. Verify environment variables are set correctly
4. Check database connectivity
5. Validate WebSocket CORS configuration

## Success Metrics

- 401 errors reduced by >90%
- CORS errors eliminated
- WebSocket connection success rate >95%
- API response time <2s for 95th percentile
- Service availability >99.5%