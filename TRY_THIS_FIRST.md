# 🚀 Try This First (Free Tier Solution)

I've configured the backend to use **ts-node with 450MB memory limit** instead of 1024MB.

This might work on Render's free tier!

## Quick Steps (2 minutes)

### 1. Update Render Environment Variables

Go to **Render Dashboard** → Your Backend Service → **Environment**

Add these two variables:
```bash
NPM_CONFIG_PRODUCTION=false
NODE_OPTIONS=--max-old-space-size=450
```

### 2. Commit & Push

```bash
cd /Users/bfguo/Dropbox/Mac/Documents/LinkDAO

git add app/backend/package.json
git commit -m "Fix: Use ts-node with 450MB memory limit for Render free tier"
git push origin main
```

### 3. Watch Render Deploy

- Go to Render Dashboard → Events tab
- Watch for "Deploy live" (2-3 minutes)
- **Check logs for either:**
  - ✅ "🚀 LinkDAO Backend running on port 10000"
  - ❌ "Ran out of memory"

### 4. Test

```bash
curl "https://linkdao-backend.onrender.com/api/communities/trending?limit=10"
```

---

## If It Still Fails (Memory Error)

You have 3 options in `MEMORY_SOLUTION.md`:

1. **Upgrade Render ($7/month)** ← Recommended
2. **Fix TypeScript errors & compile**
3. **Use different hosting (Railway, Fly.io)**

---

## What Changed

**package.json line 8:**
```json
"start": "node --max-old-space-size=450 --optimize-for-size -r ts-node/register src/index.ts"
```

This uses:
- `--max-old-space-size=450` - Limit memory to 450MB
- `--optimize-for-size` - Optimize for memory over speed
- `-r ts-node/register` - Run TypeScript directly
- `src/index.ts` - Full backend with ALL routes

---

## Success Criteria

After deployment:
- ✅ No "out of memory" error in Render logs
- ✅ Backend starts: "🚀 LinkDAO Backend running"
- ✅ API calls return JSON (not 404)
- ✅ Frontend loads data at www.linkdao.io

---

**Let's try this first!** If it works, you save $7/month. If not, upgrade is simple.
