# Render Deployment Memory Fix Checklist

## Pre-Deployment Steps

### 1. Environment Variables
Set these in your Render dashboard:

```bash
NODE_OPTIONS=--max-old-space-size=1400 --optimize-for-size --gc-interval=100
NODE_ENV=production
PORT=10000
```

### 2. Build Command
Update your Render build command to:
```bash
npm install --no-audit --prefer-offline && npm run build
```

### 3. Start Command
Update your Render start command to:
```bash
npm run start:production:direct
```

## Deployment Process

### Phase 1: Memory-Optimized Build
1. The build script will first attempt memory-optimized TypeScript compilation
2. Uses `tsconfig.production.json` with memory optimizations
3. Sets aggressive memory limits and garbage collection

### Phase 2: Chunked Compilation (Fallback)
If Phase 1 fails:
1. Compiles TypeScript in smaller chunks
2. Requires `jq` to be available (usually is on Render)
3. Takes longer but uses less memory

### Phase 3: Standalone JavaScript (Emergency Fallback)
If both above fail:
1. Uses pre-compiled JavaScript server
2. Provides basic functionality
3. Allows service to stay online while fixing issues

## Monitoring Deployment

### Success Indicators
- ✅ Build completes without memory errors
- ✅ `dist/index.js` file is created
- ✅ Server starts and responds to health checks
- ✅ `/health` endpoint returns status "ok"

### Failure Indicators
- ❌ "JavaScript heap out of memory" errors
- ❌ Build process killed by system
- ❌ No `dist/index.js` file created
- ❌ Server fails to start

## Post-Deployment Verification

### 1. Health Check
```bash
curl https://your-app.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-06T23:14:12.257Z",
  "uptime": 18.36,
  "memory": {...},
  "version": "1.0.1",
  "mode": "production" // or "standalone" if fallback was used
}
```

### 2. Basic API Test
```bash
curl https://your-app.onrender.com/
```

### 3. Memory Usage
Monitor memory usage in Render dashboard:
- Should stay under 1.5GB for standard plan
- Watch for memory leaks over time

## Troubleshooting

### If Build Still Fails
1. **Check Render logs** for specific error messages
2. **Try manual build** locally with same Node version
3. **Reduce dependencies** temporarily
4. **Contact Render support** for memory limit increase

### If Standalone Mode is Used
1. **Limited functionality** - only basic endpoints work
2. **Upgrade Render plan** for more memory
3. **Optimize codebase** to reduce memory usage
4. **Consider code splitting** or microservices

### Memory Optimization Tips
1. **Remove unused dependencies** from package.json
2. **Exclude test files** from TypeScript compilation
3. **Use dynamic imports** for large modules
4. **Consider lazy loading** for non-critical features

## Render Plan Recommendations

| Plan | Memory | Suitable For |
|------|--------|--------------|
| Free | 512MB | Development only |
| Starter | 512MB | Small apps |
| Standard | 2GB | **Recommended for LinkDAO** |
| Pro | 4GB+ | Large applications |

## Emergency Procedures

### If Service Goes Down
1. **Immediate**: Deploy with `npm run build:fallback`
2. **Short-term**: Investigate memory usage patterns
3. **Long-term**: Optimize or upgrade plan

### Rollback Process
1. Revert to last known working commit
2. Use previous build artifacts if available
3. Deploy standalone mode as temporary measure

## Success Metrics

After successful deployment, monitor:
- ✅ Build time < 5 minutes
- ✅ Memory usage < 1.5GB
- ✅ Response time < 500ms
- ✅ Zero memory-related crashes
- ✅ All API endpoints functional

## Next Steps

1. **Monitor** memory usage for 24-48 hours
2. **Optimize** code to reduce memory footprint
3. **Consider** upgrading Render plan if needed
4. **Document** any additional optimizations made