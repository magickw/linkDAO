# Manual Security Fixes Guide

## Quick Start

### Option 1: Automated Script (Recommended)
```bash
cd app/backend
chmod +x scripts/apply-security-fixes.sh
./scripts/apply-security-fixes.sh
```

This will:
- ✅ Add CSRF protection to all routes
- ✅ Replace console.log/error with safeLogger
- ✅ Add validation imports to controllers
- ✅ Create backup of all changes

### Option 2: Manual Fixes

## 1. Fix SQL Injection (CRITICAL)

### Before (Vulnerable):
```typescript
const query = `SELECT * FROM users WHERE address = '${address}'`;
const result = await db.query(query);
```

### After (Secure):
```typescript
import { createQueryBuilder } from '../utils/queryBuilder';

const qb = createQueryBuilder();
const query = `SELECT * FROM users WHERE address = ${qb.addParam(address)}`;
const result = await db.query(query, qb.getParams());
```

### Using Query Builder:
```typescript
const qb = createQueryBuilder();

// WHERE clause
const where = qb.buildWhere({ address, status: 'active' });
const query = `SELECT * FROM users ${where}`;
await db.query(query, qb.getParams());

// IN clause
const inClause = qb.buildIn('id', [1, 2, 3]);
const query = `SELECT * FROM users WHERE ${inClause}`;
await db.query(query, qb.getParams());

// LIKE clause
const like = qb.buildLike('name', searchTerm, 'both');
const query = `SELECT * FROM users WHERE ${like}`;
await db.query(query, qb.getParams());

// ORDER BY and LIMIT
const orderBy = qb.buildOrderBy('created_at', 'DESC');
const limit = qb.buildLimit(10, 0);
const query = `SELECT * FROM users ${orderBy} ${limit}`;
await db.query(query, qb.getParams());
```

## 2. Add CSRF Protection to Routes

### Before:
```typescript
import { Router } from 'express';
const router = Router();

router.post('/endpoint', controller.method);
router.put('/endpoint/:id', controller.update);
router.delete('/endpoint/:id', controller.delete);
```

### After:
```typescript
import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
const router = Router();

router.post('/endpoint', csrfProtection, controller.method);
router.put('/endpoint/:id', csrfProtection, controller.update);
router.delete('/endpoint/:id', csrfProtection, controller.delete);
```

## 3. Replace Console Logging

### Before:
```typescript
console.log('User action:', userInput);
console.error('Error occurred:', error);
console.warn('Warning:', data);
```

### After:
```typescript
import { safeLogger } from '../utils/safeLogger';

safeLogger.info('User action', { input: userInput });
safeLogger.error('Error occurred', { error });
safeLogger.warn('Warning', { data });
```

## 4. Add Input Validation to Controllers

### Before:
```typescript
async getUser(req: Request, res: Response) {
  const { address } = req.params;
  const user = await service.getUser(address);
  res.json(user);
}
```

### After:
```typescript
import { sanitizeWalletAddress } from '../utils/inputSanitization';

async getUser(req: Request, res: Response) {
  const { address } = req.params;
  const sanitizedAddress = sanitizeWalletAddress(address);
  const user = await service.getUser(sanitizedAddress);
  res.json(user);
}
```

### Common Validations:
```typescript
import {
  sanitizeWalletAddress,
  sanitizeEmail,
  sanitizeString,
  sanitizeNumber,
  sanitizeURL
} from '../utils/inputSanitization';

// Wallet address
const address = sanitizeWalletAddress(req.params.address);

// Email
const email = sanitizeEmail(req.body.email);

// String with max length
const name = sanitizeString(req.body.name, 100);

// Number with min/max
const amount = sanitizeNumber(req.body.amount, 0, 1000000);

// URL
const website = sanitizeURL(req.body.website);
```

## 5. Critical Files to Fix Immediately

### SQL Injection Priority:
1. **databaseService.ts** (20 queries)
   - Lines: 972-1021, 1024-1033, 1036-1047, etc.
   - Replace all string concatenation with parameterized queries

2. **analyticsService.ts** (12 queries)
   - Lines: 326-338, 362-376, 505-510, etc.
   - Use QueryBuilder for complex queries

3. **userJourneyService.ts** (9 queries)
   - Lines: 101-112, 138-185, 228-271, etc.
   - Add parameterization to all queries

4. **sellerErrorTrackingService.ts** (14 queries)
   - Lines: 143-159, 161-169, 171-187, etc.
   - Use QueryBuilder for WHERE clauses

5. **cohortAnalysisService.ts** (7 queries)
   - Lines: 159-165, 226-233, 244-250, etc.
   - Parameterize date range queries

### CSRF Protection Priority:
```bash
# Add to these route files:
src/routes/adminDashboardRoutes.ts
src/routes/advancedTradingRoutes.ts
src/routes/aiInsightsRoutes.ts
src/routes/fiatPaymentRoutes.ts
src/routes/realTimeNotificationRoutes.ts
src/routes/userPreferenceRoutes.ts
src/routes/advancedModerationWorkflowsRoutes.ts
src/routes/securityThreatDetectionRoutes.ts
src/routes/dataOperationMonitoringRoutes.ts
src/routes/sellerPerformanceRoutes.ts
```

### Input Validation Priority:
```bash
# Add to these controllers:
src/controllers/kycController.ts
src/controllers/ldaoAcquisitionController.ts
src/controllers/sellerPerformanceController.ts
src/controllers/communitySubscriptionController.ts
src/controllers/communityController.ts
src/controllers/reputationController.ts
```

## 6. Testing After Fixes

### Test CSRF Protection:
```bash
# Get CSRF token
curl http://localhost:3000/api/csrf-token \
  -H "x-session-id: test-session-123"

# Use token in request
curl -X POST http://localhost:3000/api/endpoint \
  -H "x-session-id: test-session-123" \
  -H "x-csrf-token: <token-from-above>" \
  -H "Content-Type: application/json" \
  -d '{"data": "value"}'
```

### Test Input Validation:
```typescript
// Should work
sanitizeWalletAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');

// Should throw error
try {
  sanitizeWalletAddress('invalid-address');
} catch (e) {
  console.log('Validation working:', e.message);
}
```

### Test SQL Injection Prevention:
```typescript
// Before: Vulnerable to SQL injection
const malicious = "'; DROP TABLE users; --";
const query = `SELECT * FROM users WHERE name = '${malicious}'`;

// After: Safe with parameterization
const qb = createQueryBuilder();
const query = `SELECT * FROM users WHERE name = ${qb.addParam(malicious)}`;
// Query becomes: SELECT * FROM users WHERE name = $1
// Params: ["'; DROP TABLE users; --"]
// Database treats it as literal string, not SQL
```

## 7. Verification Checklist

After applying fixes, verify:

- [ ] All route files have CSRF protection on POST/PUT/DELETE/PATCH
- [ ] No console.log/error/warn in production code
- [ ] All controllers validate user input
- [ ] All database queries use parameterization
- [ ] All wallet addresses are validated
- [ ] All numeric inputs have min/max validation
- [ ] All string inputs have length limits
- [ ] All URLs are validated
- [ ] All email addresses are validated
- [ ] Backup created before changes

## 8. Common Errors and Solutions

### Error: "Cannot find module '../utils/safeLogger'"
**Solution**: Ensure safeLogger.ts exists in src/utils/

### Error: "csrfProtection is not defined"
**Solution**: Add import: `import { csrfProtection } from '../middleware/csrfProtection';`

### Error: "CSRF validation failed"
**Solution**: Get CSRF token from `/api/csrf-token` and include in request headers

### Error: "Invalid wallet address format"
**Solution**: Ensure address is valid Ethereum address (0x + 40 hex chars)

## 9. Rollback Instructions

If issues occur:

```bash
# Restore from backup
cd app/backend
LATEST_BACKUP=$(ls -t backups/ | head -1)
cp -r "backups/$LATEST_BACKUP/src" .

# Or use git
git checkout src/
```

## 10. Next Steps

1. Run automated script
2. Review git diff
3. Fix TypeScript errors
4. Test all endpoints
5. Run security scan again
6. Deploy to staging
7. Monitor for issues
8. Deploy to production
