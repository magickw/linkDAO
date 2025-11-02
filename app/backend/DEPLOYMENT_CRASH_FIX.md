# Deployment Crash Fix Guide

## Issue: Uncaught Exception on Render Deployment

### Symptoms
- Application crashes with "🚨 Uncaught Exception" after database initialization
- Crash occurs around 5-6 seconds after startup
- Memory usage: ~170MB (approaching 280MB limit on Render free tier)
- No specific error details in logs

### Root Causes

1. **Memory Limit Exceeded (Most Likely)**
   - Render free tier: 280MB limit
   - App memory usage: 170-178MB at crash
   - Multiple heavy services loading simultaneously

2. **Missing Error Details**
   - Exception handler wasn't logging full error stack
   - Fixed: Now logs complete error details including stack trace

### Immediate Fixes Applied

#### 1. Enhanced Error Logging
```typescript
// Now logs full error details
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', {
    message: error.message,
    stack: error.stack,
    name: error.name,
    code: (error as any).code
  });
  gracefulShutdown('uncaughtException');
});
```

#### 2. Memory Optimization Already in Place
- WebSocket disabled on Render: ✅
- Admin WebSocket disabled: ✅  
- Seller WebSocket disabled: ✅
- Cache warming disabled: ✅
- Comprehensive monitoring disabled: ✅
- Order event listener disabled: ✅

### Next Steps to Resolve

#### Option 1: Upgrade Render Plan (Recommended)
```
Current: Free tier (512MB RAM, 280MB usable)
Upgrade to: Starter ($7/month, 512MB RAM, ~450MB usable)
```

#### Option 2: Further Memory Optimization

**Disable Additional Heavy Services:**

```typescript
// In src/index.ts, add these disables:

// DISABLED: Performance optimizer (saves ~40MB)
// const performanceOptimizer = new PerformanceOptimizationIntegration(dbPool, {...});
// app.use(performanceOptimizer.optimize());

// DISABLED: Circuit breakers (saves ~20MB)
// Skip circuitBreakerService initialization

// DISABLED: Fallback service (saves ~15MB)
// Skip fallbackService initialization
```

**Lazy Load Heavy Dependencies:**

```typescript
// Load services only when needed
const loadHeavyService = async () => {
  if (process.env.ENABLE_HEAVY_FEATURES === 'true') {
    const { HeavyService } = await import('./services/heavyService');
    return new HeavyService();
  }
  return null;
};
```

#### Option 3: Split Services (Advanced)

Deploy separate services:
1. **Core API** (auth, posts, communities)
2. **Marketplace API** (separate deployment)
3. **Analytics API** (separate deployment)

### Monitoring After Fix

Add these environment variables to track memory:

```bash
# .env
NODE_OPTIONS="--max-old-space-size=280 --optimize-for-size"
ENABLE_MEMORY_MONITORING=true
LOG_MEMORY_USAGE=true
```

### Testing Locally

Test memory usage locally:

```bash
# Run with same memory constraints as Render
node --max-old-space-size=280 --optimize-for-size dist/index.js

# Monitor memory
node --expose-gc --max-old-space-size=280 dist/index.js
```

### Deployment Checklist

Before deploying:
- [ ] Verify all heavy services are disabled on Render
- [ ] Check NODE_OPTIONS in Render environment
- [ ] Confirm database connection string is correct
- [ ] Verify Redis connection (if used)
- [ ] Test with memory constraints locally
- [ ] Review error logs for specific error details

### Environment Variables Required

```bash
# Required
DATABASE_URL=postgresql://...
NODE_ENV=production

# Optional but recommended
RENDER=true
DISABLE_WEBSOCKET=true
DISABLE_CACHE_WARMING=true
DISABLE_MONITORING=true
MAX_MEMORY_MB=280
```

### Quick Fix Commands

```bash
# 1. Rebuild with latest changes
git add .
git commit -m "fix: improve error logging and memory optimization"
git push

# 2. Check Render logs for new error details
render logs --tail

# 3. If still crashing, add more disables
# Edit src/index.ts and disable more services
```

### Success Indicators

After fix, you should see:
```
✅ Database connection established successfully
✅ Database service initialized successfully  
🚀 LinkDAO Backend running on port 10000
📊 Environment: production
```

### If Still Crashing

1. **Check new error logs** - Should now show specific error
2. **Verify memory** - Should stay under 250MB
3. **Check dependencies** - Look for circular imports
4. **Review recent changes** - Revert if needed

### Contact Support

If issue persists after trying all fixes:
1. Share full error stack from new logs
2. Share memory usage graph from Render dashboard
3. List all enabled services
4. Provide environment variable configuration
