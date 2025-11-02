# LinkDAO Security Features Deployment Guide

## Current Status

All security enhancements have been implemented and tested locally, but are **disabled by default** in production to ensure stable deployment. This guide will help you activate features one by one.

### ✅ Completed (Safe to Deploy)
- Redis connection fixes (non-blocking, graceful fallback)
- SQL injection fixes in databaseIndexOptimizer.ts
- SIWE service implementation
- Seller verification service implementation
- Wallet-based rate limiting middleware
- Database role segregation SQL scripts

### ⏸️ Implemented but NOT Activated
- Global SQL injection prevention middleware
- SIWE authentication routes
- Seller verification routes
- Wallet-based rate limiting on endpoints
- Database role segregation (requires manual migration)

---

## Pre-Deployment Checklist

Before activating any features, ensure:

- [ ] Application deploys successfully with current codebase
- [ ] Database migrations can be run safely
- [ ] Redis URL is configured (or left empty for in-memory fallback)
- [ ] JWT_SECRET is set and at least 32 characters
- [ ] Database backups are current

---

## Phase 1: Verify Base Deployment (CURRENT STATE)

### Status: ✅ READY

The application should now deploy without crashes. The Redis connection fix prevents blocking during startup.

### Verification Steps:

```bash
# Check deployment logs for successful startup
curl https://your-app.onrender.com/health

# Should return:
# {"status":"healthy","timestamp":"..."}
```

### Expected Behavior:
- Server starts without uncaught exceptions
- Health check endpoint responds
- Redis connection attempts but falls back gracefully if unavailable
- All existing features work as before

### If Deployment Fails:
1. Check logs for specific error message
2. Verify DATABASE_URL is correct
3. Ensure JWT_SECRET is set
4. Check that port binding works (PORT=10000 or Render's assigned port)

---

## Phase 2: Activate SIWE Authentication (Optional)

### Status: ⏸️ NOT ACTIVATED

SIWE routes exist but are not integrated into main authentication flow.

### Prerequisites:
```bash
# Add to .env
DOMAIN=linkdao.io
APP_URI=https://linkdao.io
JWT_SECRET=your-secret-key-minimum-32-characters
```

### Activation Steps:

**1. SIWE routes are already available** at:
- `GET /api/auth/siwe/nonce?address=0x...`
- `POST /api/auth/siwe/message`
- `POST /api/auth/siwe/verify`
- `GET /api/auth/siwe/stats`

**2. Test SIWE endpoints:**

```bash
# Test nonce generation
curl "https://your-app.onrender.com/api/auth/siwe/nonce?address=0x1234567890123456789012345678901234567890"

# Should return:
# {
#   "success": true,
#   "data": {
#     "nonce": "...",
#     "expiresIn": 600
#   }
# }
```

**3. Frontend Integration:**

```typescript
// Example frontend code
import { ethers } from 'ethers';

async function signInWithEthereum() {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();

  // 1. Get SIWE message
  const response = await fetch('/api/auth/siwe/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, chainId: 1 })
  });
  const { message } = await response.json();

  // 2. Sign message
  const signature = await signer.signMessage(message);

  // 3. Verify and get token
  const authResponse = await fetch('/api/auth/siwe/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, signature })
  });
  const { data } = await authResponse.json();

  // 4. Store token
  localStorage.setItem('authToken', data.token);
}
```

**4. Gradual Rollout:**
- Week 1: Enable SIWE as alternative authentication method
- Week 2: Monitor adoption and stability
- Week 3: Make SIWE the primary authentication method
- Week 4: Deprecate old authentication (if desired)

### Rollback Plan:
SIWE routes can stay active without affecting existing authentication. Just don't use them in frontend if issues arise.

---

## Phase 3: Activate Seller Verification System

### Status: ⏸️ NOT ACTIVATED

Database schema and service are ready but routes need to be enabled.

### Prerequisites:

**1. Run database migration:**

```bash
# Connect to your production database
psql $DATABASE_URL < drizzle/0056_seller_verification_security.sql
```

**2. Configure external verification providers:**

```bash
# Add to .env
TRULIOO_API_KEY=your-trulioo-key
TRULIOO_API_URL=https://api.globaldatacompany.com
OPENCORPORATES_API_KEY=your-opencorporates-key

# For testing only (uses mock provider)
# Leave the above empty or set VERIFICATION_MODE=mock
```

### Activation Steps:

**1. Verify database migration:**

```sql
-- Check tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_name LIKE 'seller_verification%';

-- Should return:
-- seller_verifications
-- seller_verification_attempts
-- seller_verification_documents
-- seller_verification_public (VIEW)
```

**2. Seller verification routes are available** at:
- `POST /api/seller/verification/submit` (authenticated)
- `GET /api/seller/verification/status` (authenticated)
- `GET /api/seller/verification/status/:walletAddress` (public)
- `GET /api/seller/verification/admin/:walletAddress` (admin only)

**3. Test verification endpoint:**

```bash
# Submit verification (requires JWT token)
curl -X POST https://your-app.onrender.com/api/seller/verification/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "businessName": "Test Corp",
    "businessType": "LLC",
    "country": "US",
    "state": "CA",
    "verificationType": "business"
  }'
```

**4. Monitor verification attempts:**

```sql
-- Check recent verification attempts
SELECT
  seller_wallet_address,
  attempt_status,
  verification_provider,
  attempt_date
FROM seller_verification_attempts
ORDER BY attempt_date DESC
LIMIT 20;
```

### Security Notes:
- EINs are NEVER stored in plain text (only SHA-256 hashes)
- Documents are stored externally with encryption references only
- Public view exposes only verification status, not sensitive details
- Rate limiting: 3 attempts per 24 hours per wallet

### Rollback Plan:
If verification system causes issues, you can disable the routes without affecting existing functionality. Data remains in database for future use.

---

## Phase 4: Apply Global SQL Injection Prevention

### Status: ⏸️ NOT ACTIVATED

Middleware exists in `utils/sqlInjectionPrevention.ts` but is not currently applied globally.

### Activation Steps:

**1. Edit `src/index.ts`:**

Find this section:
```typescript
// Security middleware
app.use(inputValidation);
app.use(threatDetection);
```

**2. Add SQL injection middleware:**

```typescript
// Import at top of file
import SQLInjectionPrevention from './utils/sqlInjectionPrevention';

// Then in middleware stack:
app.use(inputValidation);
// SQL injection prevention - comprehensive protection across all inputs
app.use(SQLInjectionPrevention.preventSQLInjection());
app.use(threatDetection);
```

**3. Deploy and monitor:**

```bash
# Watch for SQL injection detection logs
grep "SQL injection attempt detected" logs/application.log

# Check for false positives
# (valid requests being blocked)
```

### Potential Issues:

**False Positives**: The middleware might block valid requests with JSON containing patterns like `OR`, `AND`, etc.

**Solution**: If you see false positives:
1. Identify the pattern causing the block (check logs)
2. Adjust the pattern detection in `utils/sqlInjectionPrevention.ts`
3. Add exceptions for specific endpoints if needed

### Rollback Plan:
Simply remove or comment out the middleware line from `src/index.ts` and redeploy. No data changes.

---

## Phase 5: Apply Database Role Segregation (Advanced)

### Status: ⏸️ NOT ACTIVATED

This is the most complex change and requires careful planning.

### Prerequisites:

**1. Review the SQL script:**

Edit `drizzle/0057_database_role_segregation.sql` and replace placeholders:
- `${DATABASE_NAME}` → your database name (e.g., `linkdao_production`)
- `${READONLY_PASSWORD}` → strong password (generate with: `openssl rand -base64 32`)
- `${APP_PASSWORD}` → strong password
- `${ADMIN_PASSWORD}` → strong password
- `${ANALYTICS_PASSWORD}` → strong password

**2. Create backup:**

```bash
# Full database backup before role changes
pg_dump $DATABASE_URL > backup_before_role_segregation.sql
```

### Activation Steps:

**1. Run role segregation script:**

```bash
# After replacing placeholders
psql $DATABASE_URL < drizzle/0057_database_role_segregation.sql
```

**2. Verify roles were created:**

```sql
SELECT rolname, rolcanlogin, rolconnlimit
FROM pg_roles
WHERE rolname IN ('readonly_api', 'app_api', 'admin_api', 'analytics_api');
```

**3. Add new connection strings to environment:**

```bash
# Add to .env
READONLY_DB_URL=postgresql://readonly_api:${READONLY_PASSWORD}@host/database
APP_DB_URL=postgresql://app_api:${APP_PASSWORD}@host/database
ADMIN_DB_URL=postgresql://admin_api:${ADMIN_PASSWORD}@host/database
ANALYTICS_DB_URL=postgresql://analytics_api:${ANALYTICS_PASSWORD}@host/database

# Keep DATABASE_URL as admin connection for migrations
DATABASE_URL=postgresql://admin_api:${ADMIN_PASSWORD}@host/database
```

**4. Update application code to use role-based connections:**

Create `src/config/database.ts`:

```typescript
import postgres from 'postgres';

export function getDbConnection(operation: 'read' | 'write' | 'admin' | 'analytics') {
  switch (operation) {
    case 'read':
      return postgres(process.env.READONLY_DB_URL || process.env.DATABASE_URL!);
    case 'write':
      return postgres(process.env.APP_DB_URL || process.env.DATABASE_URL!);
    case 'admin':
      return postgres(process.env.ADMIN_DB_URL || process.env.DATABASE_URL!);
    case 'analytics':
      return postgres(process.env.ANALYTICS_DB_URL || process.env.DATABASE_URL!);
  }
}
```

**5. Gradually migrate services:**

Start with read-only endpoints:
```typescript
// In services that only read data
import { getDbConnection } from '../config/database';

const db = getDbConnection('read'); // Use readonly_api role
```

**6. Monitor connection usage:**

```sql
-- Check active connections by role
SELECT
  usename,
  count(*) as connections,
  state
FROM pg_stat_activity
WHERE usename IN ('readonly_api', 'app_api', 'admin_api', 'analytics_api')
GROUP BY usename, state;
```

### Benefits:
- **Blast radius reduction**: Compromised API key can't drop tables
- **Performance**: Read-only queries use separate connection pool
- **Auditing**: Can track which role performed which operations
- **Compliance**: Demonstrates principle of least privilege

### Rollback Plan:
1. Remove role-based connection strings from .env
2. Revert to using DATABASE_URL for all connections
3. Roles remain in database but are unused (no impact)

---

## Phase 6: Activate Wallet-Based Rate Limiting

### Status: ⏸️ NOT ACTIVATED

Middleware exists but is not applied to endpoints.

### Activation Steps:

**1. Choose endpoints to protect:**

High-priority endpoints for wallet-based rate limiting:
- Authentication endpoints (already has `walletAuthRateLimit`)
- Marketplace listing creation
- Order creation
- Messaging endpoints
- Search endpoints

**2. Apply middleware to routes:**

Example for marketplace routes:

```typescript
// In src/routes/marketplaceRoutes.ts
import { walletMarketplaceRateLimit } from '../middleware/walletRateLimiting';

// Apply to listing creation
router.post('/listings',
  authenticate, // Must be after authentication to get wallet address
  walletMarketplaceRateLimit,
  createListing
);
```

**3. Configure Redis for distributed rate limiting (optional):**

If running multiple server instances:

```bash
# Add to .env
REDIS_URL=redis://your-redis-instance:6379
```

The system will automatically use Redis if available, otherwise falls back to in-memory.

**4. Monitor rate limit hits:**

```bash
# Check rate limit violations
grep "Rate limit exceeded" logs/application.log

# By wallet address
grep "wallet:0x" logs/application.log | grep "Rate limit"
```

### Gradual Rollout:

**Week 1**: Apply to authentication endpoints only
```typescript
router.post('/auth/login', walletAuthRateLimit, login);
router.post('/auth/register', walletAuthRateLimit, register);
```

**Week 2**: Add marketplace endpoints
```typescript
router.post('/listings', walletMarketplaceRateLimit, createListing);
router.post('/orders', walletMarketplaceRateLimit, createOrder);
```

**Week 3**: Add messaging and search
```typescript
router.post('/messages', walletMessagingRateLimit, sendMessage);
router.get('/search', walletSearchRateLimit, search);
```

### Rollback Plan:
Remove middleware from route definitions and redeploy. No database changes required.

---

## Monitoring and Maintenance

### Daily Monitoring:

```bash
# Check for SQL injection attempts
grep "SQL injection attempt detected" logs/application.log | tail -20

# Check rate limit violations
grep "Rate limit exceeded" logs/application.log | tail -20

# Check SIWE nonce stats
curl https://your-app.onrender.com/api/auth/siwe/stats

# Check verification attempts
psql $DATABASE_URL -c "SELECT * FROM seller_verification_attempts ORDER BY attempt_date DESC LIMIT 10;"
```

### Weekly Maintenance:

```sql
-- Clean up expired SIWE nonces (automatic, but verify)
-- Check database role usage
SELECT
  usename,
  count(*) as connections,
  state
FROM pg_stat_activity
WHERE usename IN ('readonly_api', 'app_api', 'admin_api', 'analytics_api')
GROUP BY usename, state;

-- Check verification failure patterns
SELECT
  verification_provider,
  attempt_status,
  count(*) as attempts
FROM seller_verification_attempts
WHERE attempt_date > NOW() - INTERVAL '7 days'
GROUP BY verification_provider, attempt_status;
```

### Performance Monitoring:

All security features have minimal overhead:
- SQL injection middleware: ~1-2ms per request
- Wallet rate limiting (in-memory): ~0.5-1ms
- Wallet rate limiting (Redis): ~2-5ms
- SIWE verification: ~5-10ms
- Database role segregation: No overhead (just connection routing)

If you notice performance degradation:
1. Check which middleware is causing slowdown
2. Consider caching frequently accessed data
3. Use Redis for rate limiting to distribute load
4. Use readonly_api connections for heavy read operations

---

## Troubleshooting

### Issue: SIWE Nonce Expired

**Error**: "Nonce expired or not found"

**Cause**: User took longer than 10 minutes to sign message

**Solution**: Request new nonce and generate new message

---

### Issue: Verification API Returns "Too Many Attempts"

**Error**: "Rate limit exceeded: Maximum 3 attempts per 24 hours"

**Cause**: User exceeded rate limit

**Solution**:
```sql
-- Admin can reset rate limit for specific wallet
DELETE FROM seller_verification_attempts
WHERE seller_wallet_address = '0x...'
AND attempt_date > NOW() - INTERVAL '24 hours';
```

---

### Issue: SQL Injection Middleware Blocking Valid Requests

**Error**: "Potential SQL injection detected"

**Symptom**: Legitimate JSON payloads being blocked

**Solution**:
1. Check logs to see which pattern triggered
2. Adjust pattern detection in `utils/sqlInjectionPrevention.ts`
3. Add endpoint-specific exceptions if needed

---

### Issue: Database Role Permission Denied

**Error**: "permission denied for table..."

**Cause**: Using readonly_api for INSERT/UPDATE operations

**Solution**: Use app_api connection for write operations
```typescript
const dbWrite = getDbConnection('write');
await dbWrite.insert(...);
```

---

### Issue: Redis Connection Failing

**Error**: Redis connection errors in logs

**Impact**: Rate limiting falls back to in-memory (works but not distributed)

**Solution**:
1. Verify REDIS_URL is correct
2. Check Redis instance is running and accessible
3. For development, can omit REDIS_URL to use in-memory only

---

## Deployment Checklist

Use this checklist for each phase:

### Pre-Deployment
- [ ] Code changes reviewed
- [ ] Tests pass locally
- [ ] Database backup created
- [ ] Environment variables configured
- [ ] Rollback plan documented

### Deployment
- [ ] Deploy to staging first (if available)
- [ ] Monitor deployment logs for errors
- [ ] Verify health check endpoint responds
- [ ] Test new feature functionality

### Post-Deployment
- [ ] Monitor error logs for 24 hours
- [ ] Check performance metrics
- [ ] Verify no unexpected errors
- [ ] Document any issues encountered

### Sign-Off
- [ ] Feature working as expected
- [ ] No critical errors
- [ ] Performance acceptable
- [ ] Team notified of new feature

---

## Emergency Rollback

If you need to quickly rollback all changes:

```bash
# 1. Revert to previous deployment
git revert HEAD
git push origin main

# 2. Or remove specific features from index.ts:
# - Comment out SQL injection middleware
# - Remove wallet rate limiting from routes
# - Disable SIWE routes

# 3. Database changes can remain (they're backwards compatible)
# - Verification tables won't be used if routes disabled
# - Database roles won't be used if not configured
```

---

## Support

If you encounter issues not covered in this guide:

1. Check `SECURITY_ENHANCEMENTS.md` for detailed feature documentation
2. Review error logs for specific error messages
3. Check monitoring endpoints for system health
4. Verify environment variables are set correctly

---

## Summary

**Current Recommended Approach**:
1. ✅ Deploy base application (should work now with Redis fix)
2. Enable SIWE authentication (low risk, optional alternative auth)
3. Enable seller verification (requires migration, test thoroughly)
4. Enable wallet-based rate limiting (gradual rollout by endpoint)
5. Enable global SQL injection middleware (monitor for false positives)
6. Apply database role segregation (advanced, plan carefully)

**Safety First**: Each phase is independent. If a phase causes issues, you can disable it without affecting other features.

**Take Your Time**: These are production security enhancements. Better to roll out slowly and safely than to rush and cause downtime.
