# Vercel Frontend Deployment Guide

## Current Issue
Getting 404 errors because Vercel is trying to deploy the entire monorepo instead of just the frontend.

## Solution: Configure Root Directory in Vercel Dashboard

### Step 1: Update Vercel Project Settings
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your LinkDAO project
3. Navigate to **Settings** → **General**
4. Scroll to **Build & Output Settings**
5. Configure the following:

```
Root Directory: app/frontend
Build Command: npm run build  
Output Directory: .next
Install Command: npm install --legacy-peer-deps
```

### Step 2: Environment Variables
Ensure these are set in Vercel dashboard under **Settings** → **Environment Variables**:

```
NEXT_PUBLIC_BACKEND_URL=https://linkdao-backend.onrender.com
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_BASE_GOERLI_RPC_URL=https://goerli.base.org
```

### Step 3: Redeploy
1. Save the settings
2. Go to **Deployments** tab
3. Click **Redeploy** on the latest deployment
4. Or push a new commit to trigger deployment

## Alternative: Deploy Frontend as Separate Project

If the above doesn't work, create a new Vercel project:

```bash
cd app/frontend
npx vercel --prod
```

This will create a separate deployment just for the frontend.

## Why This Fixes the 404

The 404 error occurs because:
1. Vercel builds from the repository root
2. It can't find the Next.js pages in the root directory
3. The pages are actually in `app/frontend/src/pages/`

By setting the Root Directory to `app/frontend`, Vercel will:
1. Build from the correct directory
2. Find all the Next.js pages and components
3. Serve the application properly

## Verification

After deployment, check:
- [ ] Homepage loads at your Vercel URL
- [ ] Navigation between pages works
- [ ] No 404 errors on direct page access
- [ ] API calls work (check browser console)

## Files to Keep

Keep these files as they are:
- `app/frontend/vercel.json` ✅
- `app/frontend/package.json` ✅
- `app/frontend/next.config.js` ✅

Remove:
- Root `vercel.json` ❌ (Already removed)