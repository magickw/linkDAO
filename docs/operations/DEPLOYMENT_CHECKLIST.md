# LinkDAO Backend Deployment Checklist

## Pre-Deployment Checklist

### 1. Code Validation
- [ ] TypeScript compilation successful (`npm run build`)
- [ ] JavaScript syntax validation (`node -c src/index.production.optimized.js`)
- [ ] All required API endpoints implemented
- [ ] No duplicate server declarations
- [ ] Proper error handling in place

### 2. Environment Configuration
- [ ] `DATABASE_URL` environment variable set
- [ ] `REDIS_URL` environment variable set
- [ ] `NODE_ENV` set to `production`
- [ ] `PORT` set to `10000`
- [ ] `JWT_SECRET` configured with secure random string
- [ ] CORS origins properly configured

### 3. Performance Optimization
- [ ] Memory monitoring enabled
- [ ] Garbage collection exposed (`--expose-gc`)
- [ ] Memory limits set (`--max-old-space-size=1536`)
- [ ] Rate limiting appropriately configured
- [ ] WebSocket support enabled

### 4. Security Configuration
- [ ] HTTPS/SSL properly configured
- [ ] CORS settings secure but functional
- [ ] Rate limiting prevents abuse
- [ ] Input validation in place

### 5. Monitoring & Logging
- [ ] Health check endpoint functional (`/health`)
- [ ] Error logging implemented
- [ ] Performance metrics collection enabled
- [ ] Memory usage monitoring in place

## Deployment Steps

### 1. Local Testing
```bash
# Build the application
npm run build

# Test syntax
node -c src/index.production.optimized.js

# Test server startup
node --max-old-space-size=1536 --expose-gc src/index.production.optimized.js
```

### 2. Verify API Endpoints
```bash
# Test health check
curl http://localhost:10000/health

# Test key API endpoints
curl http://localhost:10000/api/feed/enhanced
curl http://localhost:10000/api/communities/trending
```

### 3. Check WebSocket Connection
- Use a WebSocket client to test connection to `ws://localhost:10000`

### 4. Deploy to Render
- Push changes to main branch
- Monitor deployment logs
- Verify health check endpoint

### 5. Post-Deployment Verification
- [ ] Application starts without errors
- [ ] Health check returns 200 OK
- [ ] API endpoints return proper responses
- [ ] WebSocket connections work
- [ ] Database connections established
- [ ] Redis connections established
- [ ] Memory usage within acceptable limits
- [ ] No rate limiting errors for normal usage

## Common Post-Deployment Issues

### 1. 503 Service Unavailable
**Check:**
- Database connection
- Redis connection
- Environment variables
- Server startup logs

### 2. 404 Not Found
**Check:**
- API route implementations
- Route path matching
- Frontend-backend API compatibility

### 3. High Memory Usage
**Check:**
- Memory monitoring logs
- Garbage collection settings
- Data structure cleanup
- Memory leak prevention

### 4. Rate Limiting Errors
**Check:**
- Rate limiting configuration
- Traffic patterns
- Endpoint-specific limits

### 5. WebSocket Connection Failures
**Check:**
- WebSocket server initialization
- CORS settings
- Network connectivity
- Firewall settings

## Rollback Procedure

If deployment fails:

1. **Immediate Actions:**
   - Check deployment logs
   - Verify health check endpoint
   - Check server startup logs

2. **Rollback Steps:**
   - Revert to previous working commit
   - Redeploy previous version
   - Monitor for issues

3. **Investigation:**
   - Analyze error logs
   - Identify root cause
   - Implement fix
   - Test locally
   - Redeploy fixed version

## Monitoring Checklist

After successful deployment:

- [ ] Health check endpoint responsive
- [ ] API endpoints functional
- [ ] WebSocket connections working
- [ ] Database queries successful
- [ ] Redis cache operations working
- [ ] Memory usage stable
- [ ] No rate limiting errors
- [ ] Error rates within acceptable limits
- [ ] Response times acceptable

This checklist ensures a smooth and successful deployment of the LinkDAO backend.