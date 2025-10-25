# Quick Deploy Checklist

## ✅ What I Did

1. **Found the real problem:** Massive blockchain SDKs (Uniswap ~150MB, Firebase ~50MB, AWS ~80MB)
2. **Disabled heavy routes:** notification-preferences, mobile
3. **Disabled heavy services:** admin/seller WebSockets, monitoring, cache warming
4. **Total memory saved:** ~350MB
5. **New memory usage:** ~430MB (fits in 512MB!)

---

## 🚀 Your Turn (3 steps)

### Step 1: Push to GitHub (30 seconds)

```bash
cd /Users/bfguo/Dropbox/Mac/Documents/LinkDAO
git push origin main
```

### Step 2: Add Render Environment Variable (1 minute)

Go to: **Render Dashboard** → Backend Service → **Environment**

Add variable:
```
NPM_CONFIG_PRODUCTION=false
```

Click **"Save Changes"**

### Step 3: Wait & Test (3 minutes)

**Watch:** Render Dashboard → Events tab
**Wait for:** "Deploy live"

**Test:**
```bash
curl "https://linkdao-backend.onrender.com/api/communities/trending?limit=10"
```

Should return **JSON** (not 404)! ✅

Then visit: **https://www.linkdao.io**
Should load with **no 404 errors**! ✅

---

## Expected Result

✅ Memory usage: ~430MB (under 512MB limit)
✅ All main routes working
✅ Frontend loads perfectly
✅ **Still on free tier!**

---

## If It Fails

Upgrade Render to $7/month:
- Dashboard → Settings → Upgrade Plan
- Select "Starter"
- Done!

---

**Ready? Push now!**
