# 🚀 Render Standard 2GB RAM Optimization

## Overview
Updated configurations to take advantage of your Render Standard plan's 2GB RAM allocation while maintaining optimal performance and stability.

## Memory Allocation Strategy (2GB Total)

### Recommended Distribution:
- **Node.js Heap**: 1.5GB (1536MB) - 75% of available RAM
- **Redis Cache**: 256MB - 12.5% of available RAM  
- **Database Connections**: 20 max connections
- **System/OS**: ~250MB - remaining for system processes

## Updated Configurations

### 1. Production Environment (`.env.production`)
```bash
NODE_OPTIONS=--max-old-space-size=1536 --expose-gc
DB_POOL_MAX=20
DB_POOL_MIN=5
REDIS_MAX_MEMORY=256mb
# All features enabled
DISABLE_ANALYTICS=false
DISABLE_BACKGROUND_JOBS=false
DISABLE_REAL_TIME_UPDATES=false
```

### 2. Memory Monitoring Thresholds
- **Warning**: 75% (1.5GB used)
- **Critical**: 90% (1.8GB used)
- **Emergency**: 95% (1.9GB used)

### 3. Database Optimization
- **Connection Pool**: 5-20 connections (vs previous 1-5)
- **Idle Timeout**: 30 seconds (vs previous 5 seconds)
- **Connection Timeout**: 10 seconds

### 4. Redis Configuration
- **Max Memory**: 256MB (vs previous 64MB)
- **Eviction Policy**: allkeys-lru
- **Persistence**: Optimized for memory usage

## Startup Scripts

### Production Startup
```bash
./scripts/start-production-2gb.sh
```

### Optimized Startup (if issues occur)
```bash
./scripts/start-optimized.sh
```

### Emergency Mode (if memory issues persist)
```bash
./scripts/emergency-restart.sh
```

## Performance Benefits with 2GB

### ✅ **Re-enabled Features:**
- Real-time analytics and tracking
- Background job processing
- WebSocket real-time updates
- Advanced caching strategies
- Full marketplace functionality

### ✅ **Improved Capacity:**
- 4x more database connections (20 vs 5)
- 4x larger Redis cache (256MB vs 64MB)
- 3x larger Node.js heap (1.5GB vs 512MB)
- Better request handling capacity

### ✅ **Enhanced Stability:**
- More conservative memory thresholds
- Better garbage collection with --expose-gc
- Improved connection pooling
- Reduced risk of OOM errors

## Monitoring Commands

### Check Memory Usage
```bash
# Monitor memory in real-time
node scripts/memory-monitor.js

# Check current status
curl http://localhost:3001/health

# System memory info
free -h
```

### Performance Monitoring
```bash
# Check process memory
ps aux | grep node

# Monitor database connections
# (Check your database dashboard)

# Redis memory usage
redis-cli info memory
```

## Deployment Commands

### For Render Deployment
```bash
# Use the production-optimized startup
npm run start:production

# Or if you have build step
npm run build && npm run start:production
```

### Environment Variables for Render
Set these in your Render dashboard:
```
NODE_OPTIONS=--max-old-space-size=1536 --expose-gc
NODE_ENV=production
DB_POOL_MAX=20
REDIS_MAX_MEMORY=256mb
```

## Troubleshooting

### If Memory Issues Still Occur:
1. **Check for memory leaks** in application code
2. **Use emergency mode** temporarily: `./scripts/emergency-restart.sh`
3. **Monitor specific services** causing high memory usage
4. **Consider code optimizations** for memory-intensive operations

### Performance Optimization Tips:
1. **Enable response caching** for frequently accessed data
2. **Use database query optimization** with proper indexes
3. **Implement pagination** for large data sets
4. **Use streaming** for large file operations
5. **Monitor and optimize** slow database queries

## Expected Performance

### With 2GB RAM you should see:
- **Stable memory usage** around 60-75% under normal load
- **No emergency memory cleanups** during regular operation
- **Full feature availability** without degraded mode
- **Better response times** due to larger caches
- **Higher concurrent user capacity**

---

**🎉 Your Render Standard plan provides excellent headroom for LinkDAO's backend operations!**