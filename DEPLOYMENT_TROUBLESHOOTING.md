# LinkDAO Deployment Troubleshooting Guide

## Current Issues Identified

Based on the console logs, you're experiencing several critical issues:

### 1. 503 Service Unavailable Errors
**Symptoms:**
- Backend API returning 503 status codes
- "Failed to load resource: the server responded with a status of 503 ()"

**Possible Causes:**
- Backend server is down or crashed
- Database connection issues preventing server startup
- Memory/resource limits exceeded on hosting platform
- Health check failures

**Solutions:**

#### Immediate Fix - Deploy Minimal Version
```bash
# In app/backend directory
cp src/index.minimal.ts src/index.ts
npm run build
# Redeploy to your hosting platform
```

#### Check Server Logs
1. Access your Render.com dashboard
2. Go to your backend service
3. Check the "Logs" tab for error messages
4. Look for startup errors or crash logs

#### Verify Environment Variables
Ensure these are set in your deployment:
```
NODE_ENV=production
PORT=10000
DATABASE_URL=your_database_connection_string
```

### 2. CORS Policy Violations
**Symptoms:**
- "Access to fetch at 'https://linkdao-backend.onrender.com/api/posts/feed' from origin 'https://linkdao.io' has been blocked by CORS policy"

**Current Fix Applied:**
The CORS configuration in your backend should allow your frontend domain. If still failing, the minimal version uses permissive CORS settings.

### 3. Rate Limiting Issues
**Symptoms:**
- "Rate limit exceeded for: GET:https://..."
- Multiple requests being blocked

**Solutions:**
- The rate limiting might be too aggressive for your current usage
- Consider temporarily disabling or increasing limits during debugging

## Step-by-Step Recovery Process

### Step 1: Deploy Minimal Backend
1. Replace your main index.ts with the minimal version:
   ```bash
   cd app/backend
   cp src/index.minimal.ts src/index.ts
   ```

2. Update package.json scripts if needed:
   ```json
   {
     "scripts": {
       "start": "node dist/index.js",
       "build": "tsc"
     }
   }
   ```

3. Redeploy to Render.com

### Step 2: Verify Basic Connectivity
1. Test the health endpoint: `https://linkdao-backend.onrender.com/health`
2. Test the ping endpoint: `https://linkdao-backend.onrender.com/ping`
3. Test a basic API endpoint: `https://linkdao-backend.onrender.com/api/posts/feed`

### Step 3: Check Frontend Configuration
Ensure your frontend is pointing to the correct backend URL:
```typescript
// In your frontend API configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://linkdao-backend.onrender.com'
  : 'http://localhost:3001';
```

### Step 4: Gradually Restore Features
Once the minimal version is working:
1. Add back database connectivity
2. Add back authentication
3. Add back full API routes
4. Test each addition

## Render.com Specific Issues

### Free Tier Limitations
- Services spin down after 15 minutes of inactivity
- Cold start can take 30+ seconds
- Limited memory and CPU

### Solutions:
1. **Keep-Alive Service**: Set up a simple ping service to prevent spin-down
2. **Upgrade Plan**: Consider upgrading to a paid plan for better reliability
3. **Health Check Optimization**: Ensure health checks don't fail during cold starts

## Database Connection Issues

### Common Problems:
- Connection string format issues
- Database server not accessible
- Connection pool exhaustion

### Debug Steps:
1. Test database connection separately:
   ```bash
   npm run diagnostics
   ```

2. Check connection string format:
   ```
   postgresql://username:password@host:port/database
   ```

3. Verify database server is running and accessible

## Frontend Service Worker Issues

### Problems Identified:
- Service worker caching failed requests
- Rate limiting affecting cached responses

### Solutions:
1. **Clear Service Worker Cache**:
   ```javascript
   // In browser console
   navigator.serviceWorker.getRegistrations().then(function(registrations) {
     for(let registration of registrations) {
       registration.unregister();
     }
   });
   ```

2. **Update Service Worker Logic**:
   - Don't cache failed responses (5xx errors)
   - Implement proper retry logic
   - Add better error handling

## Monitoring and Alerting

### Set Up Basic Monitoring:
1. **Uptime Monitoring**: Use services like UptimeRobot or Pingdom
2. **Error Tracking**: Implement Sentry or similar
3. **Performance Monitoring**: Add basic metrics collection

### Health Check Improvements:
```typescript
// Enhanced health check
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: await checkDatabaseHealth(),
    version: process.env.npm_package_version
  };
  
  const statusCode = health.database === 'connected' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

## Emergency Contacts and Resources

### Render.com Support:
- Documentation: https://render.com/docs
- Status Page: https://status.render.com
- Support: https://render.com/support

### Vercel Support:
- Documentation: https://vercel.com/docs
- Status Page: https://www.vercel-status.com
- Support: https://vercel.com/support

## Quick Recovery Commands

```bash
# Check if backend is responding
curl -I https://linkdao-backend.onrender.com/health

# Test CORS
curl -H "Origin: https://linkdao.io" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://linkdao-backend.onrender.com/api/posts/feed

# Deploy minimal version
cd app/backend
cp src/index.minimal.ts src/index.ts
npm run build
git add .
git commit -m "Deploy minimal backend for debugging"
git push origin main
```

## Prevention Strategies

1. **Implement Proper Health Checks**: Ensure health endpoints don't depend on external services
2. **Graceful Degradation**: Allow service to start even if some components fail
3. **Better Error Handling**: Catch and handle errors gracefully
4. **Resource Management**: Monitor memory usage and implement limits
5. **Staging Environment**: Test deployments in staging before production

## Next Steps

1. Deploy the minimal backend version immediately
2. Verify basic connectivity is restored
3. Check server logs for root cause analysis
4. Gradually restore features while monitoring stability
5. Implement better monitoring and alerting

Remember: The goal is to get the service back online quickly, then investigate and fix the root cause.