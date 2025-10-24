# Quick Fix Commands - Copy & Paste

## The Issue
Your backend on Render is using `index.production.optimized.js` which only has admin/marketplace routes. It's missing all the routes your frontend needs (communities, feed, profiles, governance, posts).

## The Fix (3 Steps)

### Step 1: Add Environment Variable to Render

**Go to:** Render Dashboard → Your Backend Service → Environment

**Add this variable:**
```
NPM_CONFIG_PRODUCTION=false
```

This ensures `ts-node` is installed (it's currently a devDependency).

### Step 2: Commit & Push the Fix

```bash
cd /Users/bfguo/Dropbox/Mac/Documents/LinkDAO

git add app/backend/package.json
git commit -m "Fix: Use full TypeScript backend with all API routes

- Changed start script to use index.ts instead of index.production.optimized.js
- Increased memory to 1024MB to support all routes
- This fixes all 404 errors on API endpoints"

git push origin main
```

### Step 3: Wait for Render to Redeploy

1. **Watch Render Dashboard** → Your Service → "Events" tab
2. **Wait ~2-3 minutes** for "Build succeeded" and "Deploy live"
3. **Check logs** for: "🚀 LinkDAO Backend...running on port 10000"

### Step 4: Test It Works

Open your terminal and run:

```bash
# Test communities endpoint
curl "https://linkdao-backend.onrender.com/api/communities/trending?limit=10"

# Test feed endpoint
curl "https://linkdao-backend.onrender.com/api/feed/enhanced?page=1&limit=20&sort=hot"

# Test posts endpoint
curl "https://linkdao-backend.onrender.com/api/posts"
```

**Expected:** JSON responses (not "Cannot GET" HTML errors)

### Step 5: Test Your Frontend

1. Open https://www.linkdao.io
2. Open DevTools → Console
3. Look for **NO MORE 404 ERRORS**
4. Feed should load with data

## If You See Memory Errors

If Render logs show "out of memory", you have 2 options:

**Option A: Upgrade Render Plan** (Recommended)
- Go to Render Dashboard → Your Service → Settings
- Upgrade from Free to Starter ($7/month)
- This gives you more memory

**Option B: Use Database Version**
If you want to stay on free tier, edit `package.json` line 8:
```json
"start": "node src/index.database.js"
```
(But verify `index.database.js` has all routes first)

## Timeline

- Step 1 (Add env var): 30 seconds
- Step 2 (Commit & push): 1 minute
- Step 3 (Render redeploy): 2-3 minutes
- **Total: ~5 minutes**

## What Changed

**File:** `app/backend/package.json` line 8

**Before:**
```json
"start": "node --max-old-space-size=450 --optimize-for-size src/index.production.optimized.js"
```

**After:**
```json
"start": "node --max-old-space-size=1024 --optimize-for-size -r ts-node/register src/index.ts"
```

This uses the full TypeScript file (`index.ts`) with ALL your routes, instead of the stripped-down optimized version.

---

**Ready to go!** Just follow the 4 steps above.
