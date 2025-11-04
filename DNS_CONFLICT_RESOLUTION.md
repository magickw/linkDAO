# DNS Conflict Resolution Guide

## Problem Discovered

Your domain has **two sets of nameservers** that are giving **different answers**:

### Vercel DNS (ns1.vercel-dns.com):
```
api.linkdao.io → 64.29.17.1 (A record to Vercel) ❌ WRONG
```

### Name.com DNS (ns1cnb.name.com):
```
api.linkdao.io → linkdao-backend.onrender.com (CNAME) ✓ CORRECT
```

This is why:
- Some users get 503 errors (their DNS resolver asks Vercel)
- Some users might get through (their DNS resolver asks Name.com)
- SSL certificate can't be issued (Render sees inconsistent DNS)

---

## Solution 1: Remove Vercel Nameservers (Recommended)

### Step 1: Log into Name.com

1. Go to: https://www.name.com/account/domain
2. Log in with your credentials
3. Click on `linkdao.io` domain

### Step 2: Manage Nameservers

1. Click "Nameservers" tab or section
2. You should see something like:
   ```
   ns1cnb.name.com
   ns2fgv.name.com
   ns3cna.name.com
   ns4cpw.name.com
   ns1.vercel-dns.com
   ns2.vercel-dns.com
   ```

### Step 3: Remove Vercel Nameservers

1. **Delete these:**
   - ns1.vercel-dns.com
   - ns2.vercel-dns.com

2. **Keep these:**
   - ns1cnb.name.com
   - ns2fgv.name.com
   - ns3cna.name.com
   - ns4cpw.name.com

3. Click "Save" or "Update"

### Step 4: Verify DNS Records

1. While in Name.com, click "DNS Records" or "Manage DNS"
2. Verify you have this record:
   ```
   Type: CNAME
   Host: api
   Answer: linkdao-backend.onrender.com
   TTL: 300 or Auto
   ```
3. If it doesn't exist, add it
4. If it's an A record, delete it and create the CNAME

### Step 5: Wait for Propagation

1. **Wait 10-15 minutes** for nameserver change to propagate globally
2. Check DNS resolution:
   ```bash
   dig api.linkdao.io +short
   # Should return: linkdao-backend.onrender.com
   ```

### Step 6: Verify in Render

1. Go to Render Dashboard
2. Navigate to your backend service
3. Go to Settings → Custom Domains
4. Click "Verify" button next to `api.linkdao.io`
5. SSL certificate should issue within 2-5 minutes

---

## Solution 2: Fix Vercel DNS Record (Faster)

If you want to keep Vercel DNS, fix the record there:

### Step 1: Log into Vercel

1. Go to: https://vercel.com/dashboard
2. Select your project (the one for linkdao.io)
3. Click "Settings" → "Domains"

### Step 2: Find DNS Settings

1. Look for DNS management or records section
2. Find the `api` record

### Step 3: Update the Record

**If you see an A record:**
1. Delete it
2. Create new CNAME record:
   ```
   Type: CNAME
   Name: api
   Value: linkdao-backend.onrender.com
   TTL: Auto
   ```

**If you see a CNAME to something else:**
1. Edit it
2. Change target to: `linkdao-backend.onrender.com`

### Step 4: Also Update Name.com

You need consistency! Update Name.com to match:
1. Log into name.com
2. Go to DNS records for linkdao.io
3. Ensure `api` record is identical to Vercel

---

## Solution 3: Use Only Name.com (Simplest)

Remove Vercel from the equation entirely:

### Step 1: Remove Vercel Nameservers

(Follow Solution 1, Steps 1-3)

### Step 2: Manage All DNS in Name.com

1. All future DNS changes in Name.com only
2. Simpler management
3. No conflicts
4. Your frontend stays on Vercel (that's separate from DNS)

---

## Verification Steps

After making changes, verify everything is consistent:

### Check Nameservers:
```bash
dig linkdao.io NS +short

# Should return ONLY Name.com OR ONLY Vercel, not both:
# Good:
ns1cnb.name.com
ns2fgv.name.com
ns3cna.name.com
ns4cpw.name.com

# OR Good:
ns1.vercel-dns.com
ns2.vercel-dns.com

# Bad (mixed):
ns1cnb.name.com
ns1.vercel-dns.com  ← Conflict!
```

### Check DNS Record:
```bash
dig api.linkdao.io +short

# Should return:
linkdao-backend.onrender.com
```

### Check from Different Nameservers:
```bash
# Query Vercel
dig @ns1.vercel-dns.com api.linkdao.io +short

# Query Name.com
dig @ns1cnb.name.com api.linkdao.io +short

# Both should return the SAME answer:
# linkdao-backend.onrender.com
```

### Test SSL:
```bash
curl https://api.linkdao.io/health

# Should return:
# {"status":"healthy",...}
# With no SSL errors
```

---

## Why This Happened

You probably:
1. Registered domain with name.com
2. Added domain to Vercel for your frontend
3. Vercel added their nameservers
4. Now both are active, causing conflicts

**Note**: Having your frontend on Vercel doesn't require Vercel nameservers. You can:
- Use Name.com for DNS
- Point `linkdao.io` and `www.linkdao.io` to Vercel (CNAME)
- Point `api.linkdao.io` to Render (CNAME)
- Everything works!

---

## Recommended Setup

**Use Name.com for ALL DNS:**

```
Nameservers (at name.com):
├── ns1cnb.name.com
├── ns2fgv.name.com
├── ns3cna.name.com
└── ns4cpw.name.com

DNS Records (in name.com):
├── linkdao.io        → CNAME → cname.vercel-dns.com (frontend)
├── www.linkdao.io    → CNAME → cname.vercel-dns.com (frontend)
└── api.linkdao.io    → CNAME → linkdao-backend.onrender.com (backend)
```

This way:
- All DNS in one place (easy to manage)
- No conflicts
- SSL certificates work
- Both Vercel and Render work correctly

---

## Timeline

After removing Vercel nameservers:
- **Nameserver change**: 10-30 minutes to propagate
- **DNS cache clear**: Additional 5-10 minutes
- **SSL certificate**: 2-5 minutes after DNS is stable
- **Total**: 15-45 minutes (usually about 20)

After updating just the DNS record:
- **DNS propagation**: 5-10 minutes (TTL is 300 seconds)
- **SSL certificate**: 2-5 minutes
- **Total**: 7-15 minutes

---

## Quick Checklist

- [ ] Log into name.com
- [ ] Remove Vercel nameservers (or keep only one set)
- [ ] Verify DNS record: `api` → `linkdao-backend.onrender.com`
- [ ] Wait 10-15 minutes
- [ ] Check: `dig api.linkdao.io +short`
- [ ] Go to Render Dashboard
- [ ] Click "Verify" on api.linkdao.io
- [ ] Wait for SSL certificate (2-5 min)
- [ ] Test: `curl https://api.linkdao.io/health`
- [ ] Update frontend to use `https://api.linkdao.io`
- [ ] Done! 🎉

---

## Need More Help?

Share screenshots of:
1. Name.com nameservers page
2. Name.com DNS records page
3. Vercel DNS settings (if using)
4. Render custom domains page

This will help diagnose exactly where the conflict is.
