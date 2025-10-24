# Deployment Fixes for LinkDAO

## Issues Identified from Console Logs

### 1. ✅ FIXED: WebSocket Connection Failure
**Problem:** WebSocket trying to connect to `ws://localhost:10000` instead of production backend
```
WebSocket connection to 'ws://localhost:10000/socket.io/?EIO=4&transport=websocket' failed
```

**Solution:** Added `NEXT_PUBLIC_WS_URL` to `.env.production`:
```bash
NEXT_PUBLIC_WS_URL=wss://linkdao-backend.onrender.com
```

**Location:** `app/frontend/.env.production:5`

---

### 2. ✅ VERIFIED: CORS Configuration
**Status:** CORS is already configured correctly in `app/backend/src/middleware/corsMiddleware.ts`

Production origins include:
- `https://linkdao.io`
- `https://www.linkdao.io` ✓
- `https://app.linkdao.io`
- `https://marketplace.linkdao.io`

**Render Environment Variables Needed:**
Add to Render dashboard:
```bash
CORS_ORIGIN=https://www.linkdao.io,https://linkdao.io,https://linkdao.vercel.app
```

---

### 3. ⚠️ API Route 404 Errors

Several API endpoints returning 404:

#### Missing/Not Implemented Routes:
1. `/api/communities/trending?limit=10` - Route exists but controller might be missing
2. `/api/profiles/address/:address` - Route exists at line 11 of userProfileRoutes.ts
3. `/api/users/:address/memberships` - Need to verify this route
4. `/api/feed/enhanced` - Route exists at line 20 of feedRoutes.ts
5. `/api/governance/proposals/active` - Route exists at line 7 of governanceRoutes.ts
6. `/api/analytics/track/event` - Route exists at line 89 of analyticsRoutes.ts
7. `/api/posts` - Route exists in postRoutes.ts

**Issue:** These routes exist in the codebase but are returning 404, suggesting:
- Controllers might not be properly implemented
- Database is not connected
- Routes not properly mounted in production build

---

### 4. ⚠️ External API Rate Limiting

Service worker is hitting rate limits on:
- `ip-api.com/json/` - 403 Forbidden (rate limited)
- `api.ipify.org/?format=json` - Rate limited
- `api.coingecko.com/api/v3/simple/price` - Rate limited

**Recommendation:** Implement server-side caching for these calls or remove client-side geolocation features

---

### 5. ⚠️ Authentication Issues

```javascript
Signing error: TypeError: Cannot read properties of undefined (reading 'raw')
```

**Issue:** Auto-login failing - MetaMask wallet connection issue
**Location:** Likely in wallet authentication flow

---

## Required Actions for Deployment

### A. Frontend (Vercel) - Already Deployed ✓

1. **Environment Variables** (Add to Vercel Dashboard):
```bash
NEXT_PUBLIC_BACKEND_URL=https://linkdao-backend.onrender.com
NEXT_PUBLIC_API_URL=https://linkdao-backend.onrender.com
NEXT_PUBLIC_WS_URL=wss://linkdao-backend.onrender.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=d051afaee33392cccc42e141b9f7697b
```

2. **Redeploy** after adding environment variables

### B. Backend (Render) - Needs Configuration

1. **Environment Variables** (Add to Render Dashboard):

```bash
# Server Configuration
NODE_ENV=production
PORT=10000

# Frontend URLs for CORS
FRONTEND_URL=https://www.linkdao.io
CORS_ORIGIN=https://www.linkdao.io,https://linkdao.io,https://linkdao.vercel.app
ALLOWED_ORIGINS=https://www.linkdao.io,https://linkdao.io,https://linkdao.vercel.app

# Backend URL
BACKEND_URL=https://linkdao-backend.onrender.com

# Database (Required!)
DATABASE_URL=postgresql://username:password@host:port/database

# Redis Cache (Optional but recommended)
REDIS_URL=redis://host:port
REDIS_ENABLED=true

# JWT Secret
JWT_SECRET=<generate-a-secure-secret>
JWT_EXPIRES_IN=24h

# API Keys (from your .env)
OPENAI_API_KEY=<your-key>
PINECONE_API_KEY=<your-key>
IPFS_PROJECT_ID=87bcc6b0da2adb56909c
IPFS_PROJECT_SECRET=<your-secret>

# Smart Contract Addresses
PROFILE_REGISTRY_ADDRESS=0x742d35Cc6335F0652131b4b7d3bde61007c4d8e5
FOLLOW_MODULE_ADDRESS=0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE
PAYMENT_ROUTER_ADDRESS=0xbDA5747bFD65F08deb54cb465eB87D40e51B197E
GOVERNANCE_ADDRESS=0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6
TOKEN_ADDRESS=0x8A791620dd6260079BF849Dc5567aDC3F2FdC318
```

2. **Database Setup**:
   - Option 1: Add PostgreSQL add-on in Render
   - Option 2: Use external service (Supabase, Neon, etc.)
   - Run migrations after database is connected

3. **Build Configuration** in Render:
   - Build Command: `cd app/backend && npm install && npm run build`
   - Start Command: `cd app/backend && npm start`

---

## Database Migration Required

The 404 errors suggest the database is not initialized. You need to:

1. **Set up PostgreSQL database** on Render or external service
2. **Run database migrations**:
```bash
cd app/backend
npm run db:migrate
# or
npx prisma migrate deploy
```

3. **Seed initial data** (if applicable):
```bash
npm run db:seed
```

---

## Service Worker Optimization

The service worker is causing excessive external API calls. Consider:

1. **Remove or optimize geolocation calls** in `app/frontend/public/sw.js`
2. **Add longer cache durations** for external API responses
3. **Consider server-side geolocation** using Vercel's geo headers

---

## Testing After Deployment

### 1. WebSocket Connection
Open browser console on https://www.linkdao.io and verify:
```javascript
// Should see successful connection
"✅ WebSocket service initialized"
"🔌 WebSocket ready for real-time updates"
```

### 2. API Connectivity
Test these endpoints directly:
```bash
curl https://linkdao-backend.onrender.com/health
curl https://linkdao-backend.onrender.com/api/communities/trending?limit=10
curl https://linkdao-backend.onrender.com/api/feed/enhanced?page=1&limit=20
```

### 3. Authentication Flow
- Connect wallet on frontend
- Verify signature request appears
- Check for successful authentication

---

## Priority Order

1. **🔴 CRITICAL**: Set up PostgreSQL database on Render
2. **🔴 CRITICAL**: Add environment variables to Render
3. **🔴 CRITICAL**: Redeploy backend with database connection
4. **🟡 HIGH**: Redeploy frontend with updated .env.production
5. **🟡 HIGH**: Test WebSocket connection
6. **🟢 MEDIUM**: Optimize service worker caching
7. **🟢 MEDIUM**: Fix authentication auto-login

---

## Quick Start Commands

### Frontend (Vercel)
```bash
# Already configured in .env.production
# Just redeploy from Vercel dashboard or:
vercel --prod
```

### Backend (Render)
```bash
# After adding environment variables in Render dashboard:
# 1. Trigger manual deploy
# 2. Or push to main branch (if auto-deploy enabled)

# To test locally first:
cd app/backend
npm install
npm run build
npm start
```

---

## Monitoring

After deployment, monitor:
1. **Render Logs**: Check for startup errors
2. **Browser Console**: Verify WebSocket connection
3. **Network Tab**: Check API response codes
4. **Vercel Analytics**: Monitor errors and performance

---

## Common Issues & Solutions

### Issue: "Cannot connect to database"
**Solution**: Verify `DATABASE_URL` is set correctly in Render environment variables

### Issue: "CORS error"
**Solution**: Verify `CORS_ORIGIN` includes your Vercel deployment URL

### Issue: "WebSocket connection failed"
**Solution**: Render might need WebSocket support enabled (should be automatic on Standard+ plans)

### Issue: "404 on all API routes"
**Solution**: Check that build succeeded and `npm start` is using the compiled output

---

## Next Steps

1. Add PostgreSQL database to Render
2. Configure environment variables in Render dashboard
3. Trigger Render deployment
4. Add environment variables to Vercel (if not already set)
5. Redeploy Vercel frontend
6. Test the application end-to-end
7. Monitor logs for any remaining issues

---

## Contact & Support

If issues persist:
1. Check Render logs: Dashboard → Your Service → Logs
2. Check Vercel logs: Dashboard → Your Project → Deployments → Logs
3. Review browser console for client-side errors
4. Check Network tab for failed requests
