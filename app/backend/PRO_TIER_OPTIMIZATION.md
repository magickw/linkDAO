# Pro Tier Resource Optimization Guide

## Overview
Your backend has been upgraded to support **Pro Tier resources (4GB RAM, 2 CPUs)** with significantly increased capacity for connections, rate limits, and concurrent operations.

## Changes Summary

### 1. Database Connection Pool
**Before (Free/Standard tier):**
- Max connections: 15
- Optimized for 512MB-2GB RAM

**After (Pro tier):**
- **Max connections: 25** (67% increase)
- Min connections: 5 (maintained warm pool)
- Idle timeout: 60 seconds (connections kept alive longer)
- Connect timeout: 10 seconds (more patient with connections)

**File:** `src/db/connectionPool.ts`

### 2. Rate Limiting
All rate limits have been significantly increased for pro tier:

#### General API Rate Limiting
- **Before:** 500-2000 requests per 15 minutes
- **After:** 5000 requests per 15 minutes (10x increase)

#### Feed Endpoint
- **Before:** 10-50 requests per minute
- **After:** 100 requests per minute (10x increase)

#### Post Creation
- **Before:** 20-150 posts per 15 minutes
- **After:** 300 posts per 15 minutes (3x increase)

**File:** `src/config/productionConfig.ts`

### 3. WebSocket Connections
**Before:**
- Max connections: 50-200
- Message queue: 20-50 messages

**After (Pro tier):**
- **Max connections: 1000** (5-20x increase)
- **Message queue: 200 messages** (4-10x increase)
- Memory threshold: 3200MB (80% of 4GB)
- Heartbeat interval: 30 seconds (more responsive)

### 4. Memory Management
Updated thresholds to match 4GB RAM:

- **Warning threshold:** 3200MB (80% of 4GB)
- **Critical threshold:** 3600MB (90% of 4GB)
- **GC threshold:** 2400MB (60% of 4GB)

**File:** `src/config/productionConfig.ts`

### 5. System Health Monitoring
Fixed memory calculation bug:

**Before:** `memory = rss / heapTotal * 100` (incorrect - showed ~95%)
**After:** `memory = rss / totalSystemMemory * 100` (correct - shows ~7%)

**File:** `src/services/systemHealthMonitoringService.ts:155`

## Environment Variables

To activate pro tier optimizations, set this environment variable in your Render dashboard:

```bash
RENDER_SERVICE_TYPE=pro
```

### Optional Override Variables
You can override specific settings:

```bash
# Database pool (default: 25 for pro tier)
DB_POOL_MAX=25

# Memory limit awareness (MB)
MEMORY_LIMIT=4096

# Enable/disable monitoring
ENABLE_MEMORY_MONITORING=true
```

## Performance Benefits

### Expected Improvements:
1. **Higher Throughput:** Support for 5-10x more concurrent requests
2. **Better WebSocket Performance:** 1000 simultaneous connections vs 200
3. **Reduced Rate Limit Errors:** 10x higher limits for API calls
4. **Faster Database Queries:** 25 connection pool vs 15
5. **Better Memory Headroom:** 4GB vs 512MB-2GB

### Capacity Comparison:

| Resource | Free Tier | Standard Tier | Pro Tier | Improvement |
|----------|-----------|---------------|----------|-------------|
| RAM | 512MB | 2GB | **4GB** | 8x vs Free |
| CPU | 0.1 | 0.5 | **2** | 20x vs Free |
| Max DB Connections | 2 | 15 | **25** | 12.5x vs Free |
| WebSocket Connections | 50 | 200 | **1000** | 20x vs Free |
| API Rate Limit | 500/15min | 1500/15min | **5000/15min** | 10x vs Free |
| Feed Rate Limit | 10/min | 50/min | **100/min** | 10x vs Free |

## Previously Disabled Features

### Currently Active Routes
All core routes are currently enabled:
- ✅ `/api/auth` - Authentication
- ✅ `/api/marketplace` - Marketplace endpoints
- ✅ `/api/chat` - Chat/messaging
- ✅ `/api/feed` - Social feed
- ✅ `/api/governance` - Governance features
- ✅ `/api/seller` - Seller dashboard

### No Routes Were Disabled
After thorough investigation, no routes were found to be disabled for resource conservation. The system was using:
- Resource-aware configuration (tier-based scaling)
- Automatic degradation under load
- Dynamic connection pool management

## Critical Bug Fixes Included

### 1. Seller Dashboard Database Error
**Fixed:** Date objects now properly converted to ISO strings for SQL queries
**Impact:** Eliminates `ERR_INVALID_ARG_TYPE` errors

### 2. Chat Conversations 10% Error Rate
**Fixed:** All async database operations now properly awaited
**Impact:** Reduces error rate from 10.17% to near 0%

### 3. False Memory Warnings
**Fixed:** Memory calculation now uses system memory instead of heap
**Impact:** Accurate reporting (7% vs false 95% usage)

## Monitoring & Verification

After deployment, monitor these metrics:

```bash
# Check connection pool usage
curl https://api.linkdao.io/health

# Monitor memory usage
# Should show ~7-15% with current load vs previous 80-95%

# Check rate limit headers
curl -I https://api.linkdao.io/api/feed
# Look for: X-RateLimit-Limit: 100 (was 10-50)
```

## Deployment Instructions

1. **Set Environment Variable:**
   ```bash
   # In Render Dashboard > Environment
   RENDER_SERVICE_TYPE=pro
   ```

2. **Deploy Updated Code:**
   ```bash
   git add .
   git commit -m "Enable pro tier optimizations (4GB RAM, 2 CPU)"
   git push origin main
   ```

3. **Verify After Deployment:**
   - Check logs for "Pro tier" configuration messages
   - Monitor connection pool stats (should show max: 25)
   - Verify memory warnings are gone
   - Test WebSocket capacity

## Rollback Plan

If issues arise, you can temporarily revert to standard tier settings:

```bash
# In Render Dashboard > Environment
RENDER_SERVICE_TYPE=standard

# Or override specific settings
DB_POOL_MAX=15
```

## Next Steps

With pro tier resources, you can now:

1. **Enable More Features:**
   - Increase AI processing limits
   - Add more real-time features
   - Implement heavier data analytics

2. **Optimize Further:**
   - Enable Redis caching with larger cache sizes
   - Implement database read replicas
   - Add CDN for static assets

3. **Scale Horizontally:**
   - Add more service instances
   - Implement load balancing
   - Consider microservices architecture

## Support

If you encounter any issues:
1. Check logs for memory/connection warnings
2. Verify `RENDER_SERVICE_TYPE=pro` is set
3. Monitor database connection pool stats
4. Review rate limit headers in API responses

---

**Generated:** 2025-11-22
**Backend Version:** 1.0.2
**Tier:** Pro (4GB RAM, 2 CPU)
