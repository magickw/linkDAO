# Setting Up Custom Domain for Backend

## Current Configuration
- **Frontend**: `https://www.linkdao.io/`
- **Backend**: `https://linkdao-backend.onrender.com`

## Recommended Configuration
- **Frontend**: `https://www.linkdao.io/`
- **Backend**: `https://api.linkdao.io/`

## Benefits of Custom Backend Domain

1. **Same-Origin Benefits**
   - Cookies work seamlessly (no `SameSite` issues)
   - CSRF protection is more reliable
   - No CORS preflight for many requests
   - Better session management

2. **Security**
   - Single SSL certificate for `*.linkdao.io`
   - Consistent security policies
   - Better origin validation

3. **Professional**
   - Cleaner URLs in frontend code
   - Better for API documentation
   - Easier to remember and share

4. **Flexibility**
   - Can add more subdomains later
   - Easy to switch hosting providers
   - Better for microservices architecture

---

## Step-by-Step Setup Guide

### Step 1: Choose Your Backend Subdomain

Options:
- `api.linkdao.io` (recommended - clear and standard)
- `backend.linkdao.io`
- `app-api.linkdao.io`

We'll use `api.linkdao.io` in this guide.

---

### Step 2: Configure DNS (Where you bought linkdao.io)

Add a CNAME record in your DNS provider (e.g., GoDaddy, Namecheap, Cloudflare):

```
Type:  CNAME
Name:  api
Value: linkdao-backend.onrender.com
TTL:   Auto or 3600
```

**Important**:
- Use `api` as the name (not `api.linkdao.io`)
- Point to `linkdao-backend.onrender.com` (without https://)
- DNS propagation can take 5 minutes to 48 hours

#### Verify DNS Configuration

After adding the record, verify it propagated:

```bash
# Check DNS resolution
dig api.linkdao.io

# Or use nslookup
nslookup api.linkdao.io

# Expected output should show CNAME pointing to linkdao-backend.onrender.com
```

---

### Step 3: Configure Custom Domain in Render

1. **Log in to Render Dashboard**
   - Go to https://dashboard.render.com/
   - Select your `linkdao-backend` service

2. **Add Custom Domain**
   - Go to "Settings" tab
   - Scroll to "Custom Domains" section
   - Click "Add Custom Domain"
   - Enter: `api.linkdao.io`
   - Click "Verify"

3. **Wait for SSL Certificate**
   - Render automatically provisions an SSL certificate via Let's Encrypt
   - This usually takes 2-5 minutes
   - Status will change from "Pending" to "Active"

4. **Verify Custom Domain Works**
   ```bash
   # Test the custom domain
   curl https://api.linkdao.io/health

   # Should return same response as:
   curl https://linkdao-backend.onrender.com/health
   ```

---

### Step 4: Update Backend Environment Variables

Update your `.env` file in the backend:

```bash
# OLD
BACKEND_URL=https://linkdao-backend.onrender.com

# NEW
BACKEND_URL=https://api.linkdao.io
```

Also update `FRONTEND_URL` to be consistent:

```bash
FRONTEND_URL=https://www.linkdao.io,https://linkdao.io
```

**Redeploy Backend** after changing environment variables in Render:
1. Go to Render Dashboard → Environment tab
2. Update `BACKEND_URL` to `https://api.linkdao.io`
3. Click "Save Changes"
4. Render will automatically redeploy

---

### Step 5: Update CORS Configuration

The CORS configuration in `src/middleware/corsMiddleware.ts` is already set up well. Just verify these origins are included:

```typescript
// Line 59-66 in production config
allowedOrigins: [
  'https://www.linkdao.io',
  'https://linkdao.io',
  'https://linkdao.vercel.app',
  'https://linkdao-*.vercel.app',
  'https://*.vercel.app',
  // Keep the old URL for transition period
  'https://linkdao-backend.onrender.com'
]
```

**After DNS propagates and domain works**, you can optionally remove the old Render URL.

---

### Step 6: Update Frontend API Configuration

Update your frontend to use the new backend URL:

**Location**: `frontend/.env.production` or similar

```bash
# OLD
NEXT_PUBLIC_API_URL=https://linkdao-backend.onrender.com

# NEW
NEXT_PUBLIC_API_URL=https://api.linkdao.io
```

**Then redeploy your frontend** on Vercel.

---

### Step 7: Update Security Headers

Update the CSRF protection in `src/middleware/securityEnhancementsMiddleware.ts`:

The current configuration (lines 42-49) should be updated to:

```typescript
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://www.linkdao.io',
  'https://linkdao.io',
  'https://api.linkdao.io',  // Add this
  'https://linkdao.vercel.app',
  'http://localhost:3000',
  'http://localhost:10000'
].filter(Boolean);
```

---

## Transition Strategy (Recommended)

To avoid breaking existing users during migration:

### Phase 1: Add Custom Domain (Keep Both)
1. Set up DNS and Render custom domain
2. Keep both URLs working simultaneously
3. Update frontend to use new URL
4. Monitor for 1-2 weeks

### Phase 2: Gradual Migration
1. Deploy frontend with new URL
2. Keep old URL in CORS for 1 week
3. Monitor logs for any requests still using old URL

### Phase 3: Remove Old URL
1. After confirming no traffic on old URL
2. Remove old URL from CORS config
3. Update all documentation

---

## Testing Checklist

After setup, test these scenarios:

### 1. Basic Connectivity
```bash
# Health check
curl https://api.linkdao.io/health

# Should return 200 OK
```

### 2. CORS from Frontend
```bash
# From browser console on www.linkdao.io
fetch('https://api.linkdao.io/api/feed/enhanced?page=1&limit=20&sort=hot&timeRange=day')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

### 3. Authenticated Requests
- Test login flow
- Test creating a post
- Test profile loading

### 4. WebSocket Connection
```javascript
// Test WebSocket on new domain
const ws = new WebSocket('wss://api.linkdao.io/socket.io/?EIO=4&transport=websocket');
ws.onopen = () => console.log('Connected to api.linkdao.io');
```

---

## DNS Configuration Examples

### Cloudflare
```
Type: CNAME
Name: api
Target: linkdao-backend.onrender.com
Proxy status: DNS only (gray cloud, not orange)
TTL: Auto
```

**Important**: Turn OFF Cloudflare proxy initially (gray cloud) to avoid SSL conflicts with Render's certificate.

### GoDaddy
```
Type: CNAME
Host: api
Points to: linkdao-backend.onrender.com
TTL: 1 Hour
```

### Namecheap
```
Type: CNAME Record
Host: api
Value: linkdao-backend.onrender.com
TTL: Automatic
```

---

## Troubleshooting

### DNS Not Resolving
```bash
# Check if DNS propagated
dig api.linkdao.io +short

# Expected: linkdao-backend.onrender.com or Render's IP
```

**Solution**: Wait for DNS propagation (up to 48 hours, usually 5-30 minutes)

### SSL Certificate Issues
**Symptom**: "Your connection is not private" error

**Solutions**:
1. Wait for Render to provision certificate (2-5 minutes)
2. If using Cloudflare, turn proxy OFF initially
3. Check Render dashboard for certificate status

### CORS Errors After Migration
**Symptom**: "Origin not allowed by CORS policy"

**Solution**: Verify CORS config includes new domain
```bash
# Check current CORS config
curl -H "Origin: https://www.linkdao.io" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS https://api.linkdao.io/api/posts
```

### WebSocket Connection Fails
**Symptom**: "WebSocket connection failed"

**Solution**: Ensure Render service has WebSocket support enabled (Web Services have it by default)

---

## Cost Implications

**Good News**: Adding a custom domain to Render is **FREE** on all plans!

- ✅ Free SSL certificate (Let's Encrypt)
- ✅ Automatic renewal
- ✅ No additional hosting costs
- ✅ Same performance as `.onrender.com` domain

---

## Rollback Plan

If something goes wrong, you can quickly rollback:

1. **Immediate Rollback** (Frontend only)
   ```bash
   # Revert frontend environment variable
   NEXT_PUBLIC_API_URL=https://linkdao-backend.onrender.com
   # Redeploy frontend
   ```

2. **Keep Old URL Working**
   - Don't remove old Render URL from CORS
   - Both domains work simultaneously
   - No downtime

3. **Remove Custom Domain from Render**
   - Go to Render Dashboard → Settings → Custom Domains
   - Click "Remove" next to `api.linkdao.io`

---

## Post-Setup Optimizations

After custom domain is working:

### 1. Add Security Headers
Update CSP to include new domain:
```typescript
connectSrc: ["'self'", "https://api.linkdao.io", "wss://api.linkdao.io"]
```

### 2. Update Documentation
- API documentation
- Developer guides
- Integration examples

### 3. Monitor Performance
- Check Render metrics dashboard
- Monitor response times
- Watch for any SSL handshake delays

### 4. Set Up Monitoring
```bash
# Add uptime monitoring for new domain
# Services: UptimeRobot, Pingdom, StatusCake (free tiers available)
```

---

## Alternative: Subdirectory Instead of Subdomain

Instead of `api.linkdao.io`, you could use `www.linkdao.io/api`:

**Pros**:
- Truly same-origin (no CORS at all!)
- Simpler cookie management

**Cons**:
- Requires proxy setup in Vercel
- More complex routing
- May impact frontend performance

**Vercel Configuration** (if you choose this route):
```javascript
// vercel.json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://linkdao-backend.onrender.com/api/:path*"
    }
  ]
}
```

---

## Next Steps

1. ✅ Choose subdomain: `api.linkdao.io` (recommended)
2. ✅ Add CNAME DNS record
3. ✅ Wait for DNS propagation (5-30 min)
4. ✅ Add custom domain in Render
5. ✅ Wait for SSL certificate (2-5 min)
6. ✅ Update backend environment variables
7. ✅ Update frontend environment variables
8. ✅ Test all endpoints
9. ✅ Deploy frontend changes
10. ✅ Monitor for 1-2 weeks
11. ✅ Remove old URL from CORS (optional)

---

## Support

If you encounter issues:

1. **DNS Issues**: Contact your domain registrar
2. **Render Issues**: Check Render status page or support
3. **SSL Issues**: Usually auto-resolve in 5-10 minutes
4. **CORS Issues**: Review CORS configuration in code

---

## Quick Reference

| What | Old | New |
|------|-----|-----|
| Backend URL | `https://linkdao-backend.onrender.com` | `https://api.linkdao.io` |
| WebSocket | `wss://linkdao-backend.onrender.com` | `wss://api.linkdao.io` |
| Health Check | `https://linkdao-backend.onrender.com/health` | `https://api.linkdao.io/health` |
| API Docs | `https://linkdao-backend.onrender.com/api/docs` | `https://api.linkdao.io/api/docs` |

**Frontend**: No change - stays at `https://www.linkdao.io`
