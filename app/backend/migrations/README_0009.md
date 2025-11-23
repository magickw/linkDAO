# Migration 0009: User Monitoring System

## Overview

This migration creates a comprehensive user monitoring and analytics system for LinkDAO, enabling tracking of user behavior, blockchain transactions, marketplace purchases, wallet activity, risk assessment, and audit logging.

## Tables Created

### 1. **user_behavior_logs**
Tracks frontend user interactions and events.

**Use Cases:**
- Analytics and user behavior analysis
- Session tracking and user journey mapping
- A/B testing and feature usage metrics
- Performance monitoring (page load times, interaction delays)

**Key Fields:**
- `event_type`: VIEW_PRODUCT, CLICK_BUTTON, SEARCH, ADD_TO_CART, etc.
- `metadata`: JSON with event-specific details
- `session_id`: Track user sessions across pages
- `path`: URL path where event occurred

**Example Events:**
```javascript
// Product view
{
  event_type: 'VIEW_PRODUCT',
  metadata: { product_id: '123', category: 'NFT', duration_ms: 5000 },
  path: '/marketplace/product/123'
}

// Search query
{
  event_type: 'SEARCH',
  metadata: { query: 'web3 art', results_count: 42, filters: ['price_asc'] },
  path: '/search'
}
```

### 2. **user_transactions**
Tracks on-chain blockchain transactions linked to users.

**Use Cases:**
- Transaction history and portfolio tracking
- Token balance calculations
- Compliance and KYC verification
- Fraud detection (unusual transaction patterns)

**Key Fields:**
- `tx_hash`: Unique blockchain transaction hash (66 chars)
- `event_type`: TRANSFER, SWAP, MINT, BURN, STAKE, UNSTAKE, etc.
- `amount`: Precise token amount (30 digits, 18 decimals)
- `status`: pending, confirmed, failed

**Supported Chains:**
- Ethereum Mainnet
- Sepolia (testnet)
- Can be extended to Polygon, Arbitrum, etc.

### 3. **purchases**
Tracks marketplace purchase transactions.

**Use Cases:**
- Order management and fulfillment
- Revenue analytics and seller payouts
- Dispute resolution
- Escrow tracking

**Key Fields:**
- `buyer_id`, `seller_id`: Link to user accounts
- `product_id`: Marketplace product reference
- `escrow_id`: Smart contract escrow identifier
- `status`: pending, completed, disputed, refunded, cancelled
- `dispute_status`: Dispute resolution tracking

**Purchase Flow:**
```
1. pending -> Buyer initiates purchase
2. escrow_created -> Funds locked in smart contract
3. completed -> Seller confirms delivery, escrow released
4. disputed -> Issue raised, admin intervention needed
5. refunded -> Escrow returned to buyer
```

### 4. **wallet_activity**
Tracks raw blockchain wallet events.

**Use Cases:**
- Wallet monitoring and alerts
- Multi-wallet user tracking
- Airdrop eligibility verification
- Suspicious activity detection

**Key Fields:**
- `wallet_address`: Ethereum address (can be linked to user or anonymous)
- `activity_type`: TRANSFER_IN, TRANSFER_OUT, VOTE, STAKE, CONTRACT_INTERACTION
- `user_id`: Optional link if wallet ownership is known
- `chain_id`: Network identifier (1 = Mainnet, 11155111 = Sepolia)

**Use Case Example:**
```sql
-- Find all wallets that voted on governance proposals
SELECT wallet_address, COUNT(*) as vote_count
FROM wallet_activity
WHERE activity_type = 'VOTE'
GROUP BY wallet_address
ORDER BY vote_count DESC;
```

### 5. **risk_flags**
Stores security risk assessments and flags.

**Use Cases:**
- Fraud prevention
- Sybil attack detection
- Account security monitoring
- Compliance reporting

**Key Fields:**
- `flag_type`: High Transaction Velocity, Suspicious Wallet Cluster, Multiple Failed Logins, etc.
- `severity`: low, medium, high, critical
- `score`: Numerical risk contribution (cumulative)
- `status`: active, resolved, ignored

**Flag Types:**
- **High Transaction Velocity**: Many transactions in short time
- **Suspicious Wallet Cluster**: Multiple wallets with coordinated behavior
- **Rapid Balance Changes**: Large deposits/withdrawals
- **Blacklisted Address**: Known scammer/hacker wallet
- **Multiple Failed Logins**: Brute force attempt detection
- **Unusual Geographic Activity**: Access from unexpected locations

**Risk Scoring:**
```javascript
// Example risk calculation
const totalRiskScore = await db
  .select({ total: sql`SUM(score)` })
  .from(riskFlags)
  .where(eq(riskFlags.userId, userId))
  .where(eq(riskFlags.status, 'active'));

if (totalRiskScore > 75) {
  // Require additional verification
} else if (totalRiskScore > 50) {
  // Add transaction limits
} else if (totalRiskScore > 25) {
  // Monitor closely
}
```

### 6. **audit_logs**
Immutable audit trail of critical actions.

**Use Cases:**
- Compliance and regulatory reporting
- Security incident investigation
- Admin action tracking
- Data breach forensics

**Key Fields:**
- `action`: CREATE_USER, UPDATE_PRODUCT, DELETE_POST, ADMIN_LOGIN, etc.
- `resource_type`, `resource_id`: What was affected
- `payload`: JSON with before/after values
- **Note**: No `updated_at` - records are immutable

**Critical Actions to Log:**
- User account creation/deletion
- Admin privilege changes
- Product listing/delisting
- Payment processing
- Dispute resolutions
- Data exports
- Configuration changes

## Indexes Created

24 indexes for optimal query performance:

### Performance Optimizations:
- **Time-based queries**: All tables indexed by `timestamp`/`created_at`
- **User lookups**: All tables with user references indexed by `user_id`
- **Transaction tracking**: `tx_hash` unique index for fast lookups
- **Wallet monitoring**: `wallet_address` index for real-time alerts
- **Risk analysis**: Composite index on `(resource_type, resource_id)` for audit logs

## Triggers

3 automatic timestamp update triggers:
- `user_transactions.updated_at`
- `purchases.updated_at`
- `risk_flags.updated_at`

These ensure accurate modification tracking without manual updates.

## Constraints

5 validation constraints:
1. **risk_severity**: Must be 'low', 'medium', 'high', or 'critical'
2. **risk_status**: Must be 'active', 'resolved', or 'ignored'
3. **purchase_status**: Must be 'pending', 'completed', 'disputed', 'refunded', or 'cancelled'
4. **transaction_status**: Must be 'pending', 'confirmed', or 'failed'
5. **purchase_price_positive**: Price must be > 0

## Migration Instructions

### Prerequisites

1. **Backup your database first!**
```bash
pg_dump -h localhost -U postgres -d linkdao > backup_$(date +%Y%m%d_%H%M%S).sql
```

2. **Ensure users and products tables exist** (this migration depends on them)

### Running the Migration

#### Option 1: Using psql (Recommended)
```bash
psql -h localhost -U postgres -d linkdao -f migrations/0009_create_user_monitoring_system.sql
```

#### Option 2: Using Node.js/Drizzle
```typescript
import { sql } from 'drizzle-orm';
import { db } from './db';
import fs from 'fs';

const migrationSQL = fs.readFileSync(
  './migrations/0009_create_user_monitoring_system.sql',
  'utf-8'
);

await db.execute(sql.raw(migrationSQL));
console.log('Migration 0009 completed successfully');
```

#### Option 3: Using Drizzle Kit
```bash
# Generate migration
npx drizzle-kit generate:pg

# Apply migration
npx drizzle-kit push:pg
```

### Verification

Run these queries to verify success:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'user_behavior_logs',
    'user_transactions',
    'purchases',
    'wallet_activity',
    'risk_flags',
    'audit_logs'
  );

-- Check row counts (should be 0 initially)
SELECT
  (SELECT COUNT(*) FROM user_behavior_logs) as behavior_logs,
  (SELECT COUNT(*) FROM user_transactions) as transactions,
  (SELECT COUNT(*) FROM purchases) as purchases,
  (SELECT COUNT(*) FROM wallet_activity) as wallet_activity,
  (SELECT COUNT(*) FROM risk_flags) as risk_flags,
  (SELECT COUNT(*) FROM audit_logs) as audit_logs;
```

## Rollback

If you need to undo this migration:

```sql
-- Uncomment and run the rollback section in the migration file
-- OR run this:
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS risk_flags CASCADE;
DROP TABLE IF EXISTS wallet_activity CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS user_transactions CASCADE;
DROP TABLE IF EXISTS user_behavior_logs CASCADE;
```

## Usage Examples

### Track User Behavior
```typescript
import { db } from './db';
import { userBehaviorLogs } from './schema';

// Log a product view
await db.insert(userBehaviorLogs).values({
  userId: user.id,
  eventType: 'VIEW_PRODUCT',
  metadata: JSON.stringify({
    productId: '123',
    category: 'NFT',
    duration_ms: 5000
  }),
  sessionId: req.sessionID,
  path: '/marketplace/product/123',
  ipAddress: req.ip,
  userAgent: req.headers['user-agent']
});
```

### Track Blockchain Transaction
```typescript
import { userTransactions } from './schema';

// Log a token transfer
await db.insert(userTransactions).values({
  userId: user.id,
  txHash: '0x1234...',
  chain: 'ethereum',
  eventType: 'TRANSFER',
  token: 'LDAO',
  amount: '100.5',
  status: 'pending',
  blockNumber: 12345678
});
```

### Create Purchase Record
```typescript
import { purchases } from './schema';

// Create a marketplace purchase
const purchase = await db.insert(purchases).values({
  buyerId: buyer.id,
  sellerId: seller.id,
  productId: product.id,
  price: '0.05',
  currency: 'ETH',
  escrowId: 'escrow_abc123',
  status: 'pending',
  metadata: JSON.stringify({
    shipping_address: '...',
    notes: '...'
  })
}).returning();
```

### Flag Risky Behavior
```typescript
import { riskFlags } from './schema';

// Create a risk flag
await db.insert(riskFlags).values({
  userId: user.id,
  flagType: 'High Transaction Velocity',
  severity: 'high',
  description: 'User made 50 transactions in 1 hour',
  score: 35,
  status: 'active',
  metadata: JSON.stringify({
    transaction_count: 50,
    time_window_minutes: 60,
    avg_amount: '0.1 ETH'
  })
});

// Calculate total risk score
const { total } = await db
  .select({ total: sql`COALESCE(SUM(score), 0)` })
  .from(riskFlags)
  .where(and(
    eq(riskFlags.userId, user.id),
    eq(riskFlags.status, 'active')
  ))
  .then(res => res[0]);

if (total > 75) {
  // Require KYC verification
  await requireKYC(user.id);
}
```

### Create Audit Log
```typescript
import { auditLogs } from './schema';

// Log admin action
await db.insert(auditLogs).values({
  userId: admin.id,
  action: 'DELETE_PRODUCT',
  resourceType: 'product',
  resourceId: product.id,
  payload: JSON.stringify({
    reason: 'Violates ToS',
    product_name: product.name,
    seller_id: product.sellerId
  }),
  ipAddress: req.ip,
  userAgent: req.headers['user-agent']
});
```

## Analytics Queries

### Most Viewed Products
```sql
SELECT
  metadata->>'product_id' as product_id,
  COUNT(*) as views
FROM user_behavior_logs
WHERE event_type = 'VIEW_PRODUCT'
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY metadata->>'product_id'
ORDER BY views DESC
LIMIT 10;
```

### User Transaction Summary
```sql
SELECT
  user_id,
  COUNT(*) as total_transactions,
  SUM(amount) as total_volume,
  COUNT(DISTINCT DATE(timestamp)) as active_days
FROM user_transactions
WHERE status = 'confirmed'
  AND timestamp > NOW() - INTERVAL '30 days'
GROUP BY user_id
ORDER BY total_volume DESC;
```

### High-Risk Users
```sql
SELECT
  u.id,
  u.wallet_address,
  SUM(rf.score) as total_risk_score,
  COUNT(*) as flag_count,
  MAX(rf.severity) as max_severity
FROM users u
JOIN risk_flags rf ON u.id = rf.user_id
WHERE rf.status = 'active'
GROUP BY u.id, u.wallet_address
HAVING SUM(rf.score) > 50
ORDER BY total_risk_score DESC;
```

## Performance Considerations

### Data Retention

For high-traffic applications, consider implementing data archival:

```sql
-- Archive old behavior logs (older than 90 days)
CREATE TABLE user_behavior_logs_archive (LIKE user_behavior_logs);

INSERT INTO user_behavior_logs_archive
SELECT * FROM user_behavior_logs
WHERE created_at < NOW() - INTERVAL '90 days';

DELETE FROM user_behavior_logs
WHERE created_at < NOW() - INTERVAL '90 days';
```

### Partitioning (For Large Datasets)

Consider table partitioning for tables with millions of rows:

```sql
-- Example: Partition user_behavior_logs by month
CREATE TABLE user_behavior_logs_2024_01 PARTITION OF user_behavior_logs
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

## Security Notes

1. **PII Protection**: `user_behavior_logs` contains IP addresses - ensure GDPR compliance
2. **Audit Log Immutability**: Never UPDATE or DELETE audit_logs (use application-level permissions)
3. **Risk Flags**: Implement role-based access control for viewing/resolving flags
4. **Transaction Privacy**: Consider encryption for sensitive `metadata` fields

## Dependencies

- PostgreSQL 12+ (for `gen_random_uuid()`)
- Existing tables: `users`, `products`
- Optional: `pg_cron` extension for automated archival

## Next Steps

After running this migration:

1. ✅ Create service classes for each table
2. ✅ Implement event tracking in frontend
3. ✅ Set up blockchain listener for transaction tracking
4. ✅ Create risk scoring algorithm
5. ✅ Build admin dashboard for monitoring
6. ✅ Set up data archival cron jobs
7. ✅ Configure alerting for high-risk flags

## Support

For issues or questions:
- Check the migration logs in PostgreSQL
- Review constraint violations
- Verify foreign key dependencies exist
- Ensure sufficient database privileges

---

**Migration Version**: 0009
**Created**: 2025-11-23
**Author**: Generated from schema.ts
**Status**: Ready for production
