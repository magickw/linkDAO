# 🔴 URGENT: Backend Route Issue Fixed

## Problem Identified

Your Render backend is running `index.production.optimized.js` which **only has admin and marketplace routes**.

It's **missing all these routes** your frontend needs:
- ❌ `/api/communities/*`
- ❌ `/api/feed/*`
- ❌ `/api/profiles/*`
- ❌ `/api/users/*`
- ❌ `/api/governance/*`
- ❌ `/api/posts/*`

## What I Fixed

**Updated `package.json` line 8:**

**Before:**
```json
"start": "node --max-old-space-size=450 --optimize-for-size src/index.production.optimized.js"
```

**After:**
```json
"start": "node --max-old-space-size=1024 --optimize-for-size -r ts-node/register src/index.ts"
```

This makes Render use the **full TypeScript version** which has ALL your routes.

## What You Need To Do

### Step 1: Install ts-node on Render

Add to Render environment variables:
```bash
NPM_CONFIG_PRODUCTION=false
```

This ensures `ts-node` (a devDependency) is installed on Render.

### Step 2: Commit and Push

```bash
cd /Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend
git add package.json
git commit -m "Fix: Use full TypeScript backend with all API routes"
git push origin main
```

### Step 3: Wait for Render to Redeploy

- Render will auto-deploy when it sees the push
- Monitor logs in Render Dashboard
- Wait ~2-3 minutes for deployment

### Step 4: Verify It Works

```bash
# Test the fixed routes:
curl "https://linkdao-backend.onrender.com/api/communities/trending?limit=10"
curl "https://linkdao-backend.onrender.com/api/feed/enhanced?page=1&limit=20&sort=hot"
curl "https://linkdao-backend.onrender.com/api/posts"
```

You should see JSON responses instead of "Cannot GET" errors.

## Alternative: If Memory Is An Issue

If Render complains about memory (since we increased from 450MB to 1024MB), you can:

1. **Upgrade Render plan** (recommended)
2. **Or use the database-only version:**
   ```json
   "start": "node src/index.database.js"
   ```
   (But check if `index.database.js` has all routes first)

## Expected Result

After this fix:
- ✅ All API routes will work
- ✅ Frontend will load data
- ✅ WebSocket will connect
- ✅ No more 404 errors

## Why This Happened

The `index.production.optimized.js` file was created to save memory on Render's free tier (450MB limit), but it only included a subset of routes. The full `index.ts` has all your API routes but needs more memory (1GB).

## Timeline

- Commit & push: 1 minute
- Render redeploy: 2-3 minutes
- **Total: ~5 minutes to fix**

---

**Next:** Commit the change, push to GitHub, and wait for Render to redeploy!
