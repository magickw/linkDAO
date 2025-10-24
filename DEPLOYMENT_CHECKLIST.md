# LinkDAO Deployment Checklist

## Pre-Deployment Checks

### ✅ Code Changes Made
- [x] Added `NEXT_PUBLIC_WS_URL=wss://linkdao-backend.onrender.com` to frontend `.env.production`
- [x] Verified CORS configuration includes `www.linkdao.io`
- [x] Verified all API routes exist in backend

---

## Backend Deployment (Render.com)

### Step 1: Database Setup
- [ ] Create PostgreSQL database on Render or external provider
- [ ] Copy database connection URL
- [ ] Test database connection

### Step 2: Environment Variables
Add these to Render Dashboard → Your Service → Environment:

**Required:**
```bash
NODE_ENV=production
PORT=10000
DATABASE_URL=<your-postgresql-url>
FRONTEND_URL=https://www.linkdao.io
CORS_ORIGIN=https://www.linkdao.io,https://linkdao.io
JWT_SECRET=<generate-random-string>
```

**API Keys (from your local .env):**
```bash
OPENAI_API_KEY=<from-local-env>
PINECONE_API_KEY=<from-local-env>
IPFS_PROJECT_ID=87bcc6b0da2adb56909c
IPFS_PROJECT_SECRET=<from-local-env>
```

**Smart Contracts:**
```bash
PROFILE_REGISTRY_ADDRESS=0x742d35Cc6335F0652131b4b7d3bde61007c4d8e5
FOLLOW_MODULE_ADDRESS=0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE
PAYMENT_ROUTER_ADDRESS=0xbDA5747bFD65F08deb54cb465eB87D40e51B197E
GOVERNANCE_ADDRESS=0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6
TOKEN_ADDRESS=0x8A791620dd6260079BF849Dc5567aDC3F2FdC318
```

### Step 3: Build Configuration
Verify in Render Dashboard:
- **Build Command:** `cd app/backend && npm install && npm run build`
- **Start Command:** `cd app/backend && npm start`
- **Root Directory:** Leave empty or set to `/`

### Step 4: Deploy
- [ ] Click "Manual Deploy" → "Deploy latest commit"
- [ ] Wait for build to complete (check logs)
- [ ] Verify service is running

### Step 5: Run Database Migrations
If using Prisma or migrations:
```bash
# In Render Shell (Dashboard → Shell):
cd app/backend
npm run db:migrate
```

### Step 6: Test Backend
```bash
# Test health endpoint:
curl https://linkdao-backend.onrender.com/health

# Test API endpoints:
curl https://linkdao-backend.onrender.com/api/communities/trending?limit=10
```

---

## Frontend Deployment (Vercel)

### Step 1: Environment Variables
Add these to Vercel Dashboard → Your Project → Settings → Environment Variables:

**Production:**
```bash
NEXT_PUBLIC_BACKEND_URL=https://linkdao-backend.onrender.com
NEXT_PUBLIC_API_URL=https://linkdao-backend.onrender.com
NEXT_PUBLIC_WS_URL=wss://linkdao-backend.onrender.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=d051afaee33392cccc42e141b9f7697b
NEXT_PUBLIC_BASE_RPC_URL=https://base-mainnet.infura.io/v3/1f6040196b894a6e90ef4842c62503d7
```

### Step 2: Verify Build Settings
In Vercel Dashboard → Settings → General:
- **Framework Preset:** Next.js
- **Root Directory:** `app/frontend`
- **Build Command:** `npm run build`
- **Output Directory:** `.next`

### Step 3: Deploy
- [ ] Go to Deployments tab
- [ ] Click "Redeploy" on latest deployment
- [ ] OR push to main branch to trigger auto-deploy

### Step 4: Test Frontend
- [ ] Visit https://www.linkdao.io
- [ ] Open browser DevTools → Console
- [ ] Verify WebSocket connection succeeds
- [ ] Check Network tab for API calls
- [ ] Test wallet connection

---

## Post-Deployment Verification

### Backend Health Checks
```bash
# Basic health
curl https://linkdao-backend.onrender.com/health

# API endpoints
curl https://linkdao-backend.onrender.com/api/communities/trending?limit=10
curl https://linkdao-backend.onrender.com/api/feed/enhanced?page=1&limit=20&sort=hot
curl https://linkdao-backend.onrender.com/api/governance/proposals/active
```

### Frontend Checks
1. **Open https://www.linkdao.io**
2. **Check Console for:**
   - ✅ No 404 errors on API calls
   - ✅ WebSocket connected successfully
   - ✅ No CORS errors

3. **Test Features:**
   - [ ] Wallet connection
   - [ ] Browse communities
   - [ ] View feed
   - [ ] Real-time updates

### WebSocket Verification
In browser console:
```javascript
// Should see:
"🚀 Triggering auto-login for: <address>"
"✅ WebSocket service initialized"
"🔌 WebSocket ready for real-time updates"
```

---

## Troubleshooting

### Backend Issues

**Error: "Cannot connect to database"**
```bash
# Verify DATABASE_URL is set correctly
# Test connection in Render Shell:
psql $DATABASE_URL
```

**Error: "Module not found"**
```bash
# Clear build cache and redeploy
# In Render: Settings → Clear build cache
```

**Error: "Port already in use"**
```bash
# Verify PORT=10000 is set in environment variables
```

### Frontend Issues

**Error: "WebSocket connection failed"**
- Verify `NEXT_PUBLIC_WS_URL` uses `wss://` (not `ws://`)
- Check Render backend is running
- Verify Render allows WebSocket connections

**Error: "API 404 errors"**
- Verify backend is fully deployed
- Check `NEXT_PUBLIC_API_URL` is correct
- Test backend endpoints directly

**Error: "CORS error"**
- Verify `CORS_ORIGIN` in Render includes your Vercel URL
- Check backend logs for CORS messages

---

## Monitoring

### Render (Backend)
1. Dashboard → Your Service → Logs
2. Look for startup messages:
   - "🚀 LinkDAO Backend running on port 10000"
   - "✅ WebSocket service initialized"
   - "✅ Cache service initialized"

### Vercel (Frontend)
1. Dashboard → Your Project → Analytics
2. Check for:
   - High error rates
   - Failed API calls
   - Performance issues

### Browser DevTools
1. Console: Check for errors
2. Network: Monitor API response codes
3. Application → Service Workers: Verify active

---

## Emergency Rollback

### Render
```bash
# In Dashboard:
1. Go to "Events" tab
2. Find last working deployment
3. Click "Rollback to this deploy"
```

### Vercel
```bash
# In Dashboard:
1. Go to "Deployments" tab
2. Find last working deployment
3. Click "..." → "Promote to Production"
```

---

## Success Criteria

- [ ] Backend health endpoint returns 200 OK
- [ ] Frontend loads without console errors
- [ ] WebSocket connects successfully
- [ ] API calls return valid data (not 404)
- [ ] Wallet connection works
- [ ] No CORS errors in console
- [ ] Feed displays content
- [ ] Real-time updates work

---

## Estimated Timeline

- Backend setup: 30-45 minutes
- Frontend setup: 10-15 minutes
- Testing & verification: 15-20 minutes
- **Total: 1-1.5 hours**

---

## Support Resources

- **Render Docs:** https://render.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **Database Issues:** Check `DEPLOYMENT_FIXES.md` for detailed solutions
- **CORS Issues:** Review `app/backend/src/middleware/corsMiddleware.ts`
