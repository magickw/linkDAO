# 🚨 URGENT: Backend Service Recovery Guide

## Current Crisis Status
Your Render backend service is **COMPLETELY DOWN** with multiple critical issues:

- ❌ **503 Service Unavailable** - Backend service crashed/not running
- ❌ **Rate limiting exceeded** - Too many failed requests
- ❌ **Service won't start** - Likely configuration or code errors
- ❌ **All API endpoints failing** - No data can be fetched

## IMMEDIATE EMERGENCY ACTIONS (Do This NOW)

### Step 1: Check Render Service Status (2 minutes)
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Find your `linkdao-backend` service
3. Check the status indicator - it's likely showing "Failed" or "Build Failed"
4. Click on the service to see detailed logs

### Step 2: Check Recent Logs (3 minutes)
1. In your service dashboard, click **"Logs"**
2. Look for the most recent error messages
3. Common critical errors to look for:
   ```
   Error: Cannot find module
   SyntaxError: Unexpected token
   Error: listen EADDRINUSE :::10000
   TypeError: Cannot read property
   Process exited with code 1
   ```

### Step 3: Emergency Service Restart (1 minute)
1. In your service dashboard, click **"Manual Deploy"**
2. Select **"Deploy latest commit"**
3. Wait 5-10 minutes for deployment
4. If it fails again, proceed to Step 4

### Step 4: Emergency Backend Replacement (5 minutes)
Since your current backend is broken, deploy the fixed version immediately:

1. **Update Start Command**:
   - Go to **Settings** → **Build & Deploy**
   - Change **Start Command** to: `node src/index.fixed.js`
   - Click **"Save Changes"**

2. **Verify Environment Variables**:
   ```
   NODE_ENV=production
   PORT=10000
   FRONTEND_URL=https://linkdao.vercel.app
   CORS_ORIGIN=https://linkdao.vercel.app,https://linkdao-git-main.vercel.app
   ```

3. **Deploy Fixed Backend**:
   - Click **"Manual Deploy"** → **"Deploy latest commit"**

### Step 5: Monitor Recovery (5 minutes)
1. Watch the deployment logs in real-time
2. Look for successful startup messages:
   ```
   Server running on port 10000
   Database connected successfully
   CORS configured for production
   ```
3. Test health endpoint: `https://linkdao-backend.onrender.com/health`

## CRITICAL DEBUGGING CHECKLIST

### If Service Still Won't Start:
- [ ] Check if `src/index.fixed.js` exists in your repository
- [ ] Verify all dependencies are in `package.json`
- [ ] Ensure no syntax errors in the code
- [ ] Check if port 10000 is correctly configured
- [ ] Verify database connection strings are valid

### If Service Starts But Still 503:
- [ ] Check if health endpoint responds: `/health`
- [ ] Verify CORS headers are present
- [ ] Test a simple endpoint: `/api/health`
- [ ] Check if database queries are working
- [ ] Monitor memory usage (might be out of memory)

### If Rate Limiting Issues:
- [ ] Wait 30 minutes for rate limits to reset
- [ ] Check if too many requests are being made
- [ ] Verify frontend isn't in infinite retry loops
- [ ] Consider upgrading Render plan for higher limits

## EMERGENCY CONTACT INFORMATION

### Render Support:
- **Status Page**: https://status.render.com
- **Support**: https://render.com/support
- **Community**: https://community.render.com

### Quick Recovery Commands:
```bash
# Test if backend is responding
curl https://linkdao-backend.onrender.com/health

# Test CORS headers
curl -H "Origin: https://linkdao.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://linkdao-backend.onrender.com/api/health
```

## EXPECTED RECOVERY TIMELINE

- **Immediate (0-5 min)**: Service restart attempt
- **Short-term (5-15 min)**: Deploy fixed backend
- **Medium-term (15-30 min)**: Full service recovery
- **Long-term (30+ min)**: Rate limit reset and stability

## POST-RECOVERY ACTIONS

Once the backend is back online:

1. **Test Critical Endpoints**:
   - `/health` - Service health
   - `/api/health` - API health
   - `/marketplace/listings` - Core functionality
   - `/marketplace/seller/profile/{address}` - User data

2. **Monitor for Stability**:
   - Check logs for any recurring errors
   - Monitor response times
   - Verify all API endpoints work
   - Test frontend connectivity

3. **Implement Monitoring**:
   - Set up health check alerts
   - Monitor service uptime
   - Track error rates
   - Set up log aggregation

## PREVENTION MEASURES

To prevent this from happening again:

1. **Health Monitoring**: Set up automated health checks
2. **Error Alerting**: Get notified when service goes down
3. **Backup Strategy**: Have a backup deployment ready
4. **Load Testing**: Test service under load
5. **Resource Monitoring**: Monitor memory and CPU usage

---

## 🆘 IF ALL ELSE FAILS

If you cannot recover the service:

1. **Create New Service**:
   - Deploy `src/index.fixed.js` as a new Render service
   - Update frontend `NEXT_PUBLIC_BACKEND_URL` to new URL
   - Redeploy frontend on Vercel

2. **Temporary Workaround**:
   - Enable mock data mode in frontend
   - Use local backend for development
   - Consider alternative hosting (Railway, Fly.io)

**Time is critical - your users cannot access any functionality right now!**