# 🚨 Emergency Production Fixes Guide

## Critical Issues Addressed

Based on your backend logs showing:
- **Memory Usage**: 93.2-93.3% (CRITICAL)
- **Error Rate**: 43.4-56% (SEVERE)
- **Database Connections**: 105/100 (EXCEEDED THRESHOLD)
- **Performance**: Multiple critical alerts

## Immediate Actions Required

### 1. Apply Emergency Fixes (IMMEDIATE)

```bash
# Navigate to backend directory
cd app/backend

# Apply all emergency fixes
npm run emergency-fixes

# Start monitoring
npm run monitor
```

### 2. Check System Health

```bash
# Check current health status
npm run health

# Or manually check
curl -s http://localhost:10000/emergency-health | jq .
```

### 3. Manual Emergency Actions (If Automated Fixes Fail)

#### Memory Emergency Cleanup
```bash
# Trigger memory cleanup
curl -X POST http://localhost:10000/emergency-memory-cleanup

# Force garbage collection (if process accessible)
kill -USR2 <backend-pid>
```

#### Database Emergency Cleanup
```bash
# Trigger database cleanup
curl -X POST http://localhost:10000/emergency-db-cleanup

# Manual connection cleanup (PostgreSQL)
psql $DATABASE_URL -c "
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' 
AND query_start < NOW() - INTERVAL '30 seconds';
"
```

## What the Emergency Fixes Do

### 1. Memory Management
- **Aggressive garbage collection**: Forces GC when memory > 85%
- **Cache clearing**: Removes non-essential cached data
- **Connection pool reduction**: Reduces DB pool size by 50%
- **Memory monitoring**: 10-second interval checks

### 2. Database Optimization
- **Connection limits**: Reduces max connections to 50
- **Idle timeout**: 5-second timeout for idle connections
- **Query optimization**: Adds emergency indexes
- **Connection tracking**: Monitors and auto-releases connections

### 3. Error Rate Reduction
- **Circuit breakers**: Enables for all external services
- **Rate limiting**: Reduces limits by 50%
- **Graceful degradation**: Disables non-essential features
- **Emergency mode**: Blocks non-critical requests

### 4. Performance Optimization
- **Response compression**: Enables aggressive compression
- **Feature disabling**: Turns off analytics, recommendations
- **Query optimization**: Emergency database indexes
- **Request prioritization**: Essential endpoints only

## Monitoring and Alerts

### Real-time Monitoring
The production monitor (`npm run monitor`) checks every 30 seconds:
- Process status
- Memory usage
- Database connections
- Response times
- Error rates

### Automatic Actions
- **Memory > 95%**: Triggers memory cleanup
- **DB connections > 90**: Forces connection cleanup
- **Status = critical**: Applies all emergency fixes
- **Response time > 10s**: Considers service restart

### Health Check Endpoints
- `GET /emergency-health`: Comprehensive health status
- `POST /emergency-memory-cleanup`: Force memory cleanup
- `POST /emergency-db-cleanup`: Force DB cleanup

## Emergency Mode Features

When error rate > 50%, the system automatically:

### Blocks Non-Essential Requests
- `/api/analytics/*`
- `/api/recommendations/*`
- `/api/search/*`
- `/api/feed/trending`
- `/api/notifications/*`

### Allows Essential Requests
- `/health`
- `/api/auth/*`
- `/api/session/*`
- `/api/emergency/*`

### Reduces Resource Usage
- Disables real-time updates
- Stops background jobs
- Disables analytics tracking
- Enables cache-only mode

## Configuration Files Updated

### New Services
- `emergencyProductionFixes.ts`: Main fix orchestrator
- `optimizedDatabaseManager.ts`: Enhanced DB connection management
- `memoryManager.ts`: Aggressive memory monitoring
- `emergencyMiddleware.ts`: Request filtering and error tracking

### New Scripts
- `apply-emergency-fixes.ts`: Applies all fixes
- `production-monitor.ts`: Continuous monitoring
- `emergency-health` endpoint: Health checking

### Package.json Scripts Added
```json
{
  "emergency-fixes": "ts-node scripts/apply-emergency-fixes.ts",
  "monitor": "ts-node scripts/production-monitor.ts",
  "health": "curl -s http://localhost:10000/emergency-health | jq ."
}
```

## Expected Results

After applying fixes, you should see:
- **Memory usage**: < 85%
- **Error rate**: < 10%
- **DB connections**: < 80
- **Response time**: < 2 seconds

## Recovery Process

1. **Apply fixes**: `npm run emergency-fixes`
2. **Monitor**: `npm run monitor` (in separate terminal)
3. **Verify**: `npm run health` (check status)
4. **Wait**: Allow 5-10 minutes for stabilization
5. **Gradual recovery**: Features re-enable automatically as metrics improve

## If Issues Persist

### Restart Service
```bash
# Kill existing processes
pkill -f "node.*src/index"

# Start with optimized settings
npm run start:optimized
```

### Database Maintenance
```bash
# Analyze and vacuum
psql $DATABASE_URL -c "ANALYZE; VACUUM;"

# Check for blocking queries
psql $DATABASE_URL -c "
SELECT pid, query, state, query_start 
FROM pg_stat_activity 
WHERE state != 'idle' 
ORDER BY query_start;
"
```

### Scale Resources (If Possible)
- Increase memory allocation
- Add more database connections
- Enable horizontal scaling

## Prevention

### Regular Monitoring
- Set up alerts for memory > 80%
- Monitor DB connections > 70
- Track error rates > 20%

### Optimization
- Regular database maintenance
- Cache optimization
- Code profiling for memory leaks

### Capacity Planning
- Monitor growth trends
- Plan resource scaling
- Implement auto-scaling

## Support

If emergency fixes don't resolve the issues:
1. Check logs: `tail -f /var/log/linkdao/app.log`
2. Monitor resources: `htop`, `iostat`
3. Database analysis: Check slow queries and locks
4. Consider temporary service degradation vs full restart

---

**⚠️ IMPORTANT**: These fixes are designed for immediate crisis response. Plan for proper scaling and optimization once the emergency is resolved.