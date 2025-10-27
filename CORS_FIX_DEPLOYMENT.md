# CORS Fix - Deployment Instructions

## Problem
The production backend on Render was rejecting requests from `https://www.linkdao.io` because it wasn't included in the CORS allowed origins list. Users couldn't access the admin dashboard or any API endpoints.

## Solution
Updated CORS configuration to include `www.linkdao.io` subdomain.

---

## Changes Made

### 1. Updated Environment Configuration
**File:** `app/backend/.env.render`

Added `https://www.linkdao.io` to CORS_ORIGIN:
```env
CORS_ORIGIN=https://linkdao.io,https://www.linkdao.io,https://linkdao-git-main.vercel.app,https://linkdao-frontend.vercel.app
```

### 2. Fixed CORS Middleware
**File:** `app/backend/src/middleware/corsMiddleware.ts`

Updated to read `CORS_ORIGIN` environment variable (in addition to `CORS_ALLOWED_ORIGINS`):
```typescript
const corsOrigins = process.env.CORS_ORIGIN || process.env.CORS_ALLOWED_ORIGINS || '';
const additionalOrigins = corsOrigins.split(',').map(o => o.trim()).filter(Boolean);
```

---

## Deployment Steps

### On Render.com

1. **Navigate to Service**
   - Go to https://dashboard.render.com
   - Select the `linkdao-backend` service

2. **Update Environment Variable**
   - Click on "Environment" tab in the left sidebar
   - Find the `CORS_ORIGIN` variable
   - Update its value to:
     ```
     https://linkdao.io,https://www.linkdao.io,https://linkdao-git-main.vercel.app,https://linkdao-frontend.vercel.app
     ```
   - Click "Save Changes"

3. **Deploy Updated Code**
   - Render will automatically redeploy when you push to main
   - Or manually trigger a deployment from the "Manual Deploy" menu

4. **Wait for Deployment**
   - Deployment typically takes 3-5 minutes
   - Watch the deployment logs for any errors

---

## Verification

### 1. Check CORS Headers

**Open Browser DevTools:**
```
1. Navigate to https://www.linkdao.io/admin-login
2. Open DevTools (F12)
3. Go to Network tab
4. Trigger an API request (e.g., wallet connect)
5. Click on the request in the Network tab
6. Check Response Headers
```

**Expected Header:**
```
Access-Control-Allow-Origin: https://www.linkdao.io
```

### 2. Test Admin Login

**Steps:**
```
1. Go to https://www.linkdao.io/admin-login
2. Click "Connect Wallet"
3. Connect your wallet: 0xEe034b53D4cCb101b2a4faec27708be507197350
4. Sign the authentication message
5. Should redirect to /admin dashboard
```

**Expected Result:**
- ✅ No CORS errors in console
- ✅ API requests succeed
- ✅ Successfully authenticated
- ✅ Redirected to admin dashboard

### 3. Test API Endpoints

**Using curl:**
```bash
# Test preflight (OPTIONS request)
curl -X OPTIONS https://linkdao-backend.onrender.com/api/profiles/address/0xEe034b53D4cCb101b2a4faec27708be507197350 \
  -H "Origin: https://www.linkdao.io" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

**Expected Response:**
```
< HTTP/2 200
< access-control-allow-origin: https://www.linkdao.io
< access-control-allow-methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
< access-control-allow-headers: Origin, X-Requested-With, Content-Type, Accept, Authorization
< access-control-allow-credentials: true
```

---

## Troubleshooting

### Issue: Still Getting CORS Errors

**Solution 1: Clear Browser Cache**
```
1. Open DevTools (F12)
2. Right-click the reload button
3. Select "Empty Cache and Hard Reload"
```

**Solution 2: Check Render Environment Variables**
```
1. Go to Render dashboard
2. Navigate to Environment tab
3. Verify CORS_ORIGIN is set correctly
4. Check that NODE_ENV=production
```

**Solution 3: Check Deployment Logs**
```
1. Go to Render dashboard → Logs tab
2. Look for CORS-related errors
3. Verify backend started successfully
4. Check for any middleware errors
```

### Issue: Backend Not Reading Environment Variable

**Check Render Logs:**
```bash
# Look for CORS configuration on startup
# Should show: "CORS configured for production with origins: ..."
```

**If not showing:**
```
1. Verify .env.render is committed to repository
2. Ensure corsMiddleware is properly imported in index.ts
3. Check that corsMiddleware is applied before routes
```

### Issue: Admin Dashboard Still Not Accessible

**Check User Role:**
```sql
-- Verify your user has admin role
SELECT id, wallet_address, role, permissions 
FROM users 
WHERE wallet_address = '0xEe034b53D4cCb101b2a4faec27708be507197350';
```

**Expected Result:**
```
role: super_admin
permissions: ["*"]
```

**If not admin, run:**
```bash
cd app/backend
npx ts-node src/scripts/createAdminUser.ts 0xEe034b53D4cCb101b2a4faec27708be507197350 super_admin
```

---

## Additional Notes

### Supported Origins

The backend now accepts requests from:
- `https://linkdao.io` (apex domain)
- `https://www.linkdao.io` (www subdomain)
- `https://linkdao-git-main.vercel.app` (Vercel preview)
- `https://linkdao-frontend.vercel.app` (Vercel production)

### Development Origins

In development mode, the backend automatically allows:
- `http://localhost:3000`
- `http://localhost:3001`
- `http://localhost:8080`
- `http://127.0.0.1:*` (any port)

### Security Considerations

1. **Origin Validation**: Backend strictly validates origin headers
2. **Credentials**: CORS configured with `credentials: true` for cookie/session support
3. **Headers**: Only specific headers are allowed (Authorization, Content-Type, etc.)
4. **Methods**: Only safe methods are allowed (GET, POST, PUT, DELETE, PATCH, OPTIONS)

### Monitoring

**Check CORS Logs:**
```
# Render Dashboard → Logs tab
# Look for:
- "CORS origin blocked" (indicates rejected origins)
- "CORS configured for production" (indicates successful setup)
```

**Monitor Failed Requests:**
```
# Check for 403 Forbidden responses
# These indicate CORS policy violations
```

---

## Rollback Plan

If issues occur after deployment:

### 1. Revert Environment Variable
```
Go to Render → Environment tab
Change CORS_ORIGIN back to:
https://linkdao.io,https://linkdao-git-main.vercel.app,https://linkdao-frontend.vercel.app
```

### 2. Revert Code Changes
```bash
cd /Users/bfguo/Dropbox/Mac/Documents/LinkDAO
git revert HEAD
git push origin main
```

### 3. Emergency Hotfix
```bash
# If immediate fix needed, update directly on Render:
# 1. Go to Settings → Environment
# 2. Add temporary wildcard (NOT RECOMMENDED FOR LONG-TERM):
CORS_ORIGIN=*

# Then fix properly and redeploy
```

---

## Success Criteria

✅ **CORS Fix Successful When:**
1. No CORS errors in browser console
2. API requests from www.linkdao.io succeed
3. Admin login works without issues
4. All API endpoints accessible from production frontend
5. Preflight OPTIONS requests return proper headers

---

## Timeline

- **Code Changes:** Committed in commit `[hash]`
- **Deployment:** Takes 3-5 minutes on Render
- **Propagation:** Immediate after deployment completes
- **Testing:** 5-10 minutes to verify all endpoints

---

## Contact

If issues persist after following these steps:
1. Check Render deployment logs
2. Verify environment variables are saved
3. Test with curl to isolate browser vs server issues
4. Check that backend service is running (not crashed)

---

**Status:** ✅ Ready for Deployment  
**Priority:** HIGH (Blocking production access)  
**Impact:** Fixes admin dashboard access for all users  
**Rollback Risk:** LOW (only environment variable changes)
