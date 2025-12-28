# Database Migrations for Receipt System Enhancement

This directory contains migrations to support the enhanced receipt generation and email sending system.

## Migration Files

### 009_add_marketplace_receipt_fields.sql
**Purpose:** Add missing fields to paymentReceipts table for marketplace purchases

**Fields Added:**
- `items` (JSONB) - Array of order items
- `subtotal` (DECIMAL) - Subtotal before fees and taxes
- `shipping` (DECIMAL) - Shipping cost
- `tax` (DECIMAL) - Tax amount
- `sellerName` (VARCHAR) - Seller name

**Indexes Created:**
- `idx_payment_receipts_seller_name`

### 010_add_buyer_address_to_orders.sql
**Purpose:** Add buyer wallet address to orders table

**Fields Added:**
- `buyerAddress` (VARCHAR 66) - Buyer wallet address

**Indexes Created:**
- `idx_orders_buyer_address`

**Data Migration:** Populates existing orders with buyer addresses from users table

### 011_add_gold_transaction_fields.sql
**Purpose:** Add missing fields to goldTransaction table for receipt generation

**Fields Added:**
- `orderId` (VARCHAR 255, UNIQUE) - Unique order ID
- `network` (VARCHAR 50) - Blockchain network
- `transactionHash` (VARCHAR 66) - Blockchain transaction hash

**Indexes Created:**
- `idx_gold_transaction_network`
- `idx_gold_transaction_hash`
- `idx_gold_transaction_order_network`

### 012_add_ldao_receipt_fields.sql
**Purpose:** Add LDAO token purchase fields to paymentReceipts table

**Fields Added:**
- `tokensPurchased` (VARCHAR 255) - Number of LDAO tokens purchased
- `pricePerToken` (VARCHAR 50) - Price per LDAO token

**Indexes Created:**
- `idx_payment_receipts_tokens_purchased`
- `idx_payment_receipts_price_per_token`

**Data Migration:** Populates existing LDAO receipts with values from metadata JSON

## Running Migrations

### Using psql directly:
```bash
psql -U your_username -d your_database -f 009_add_marketplace_receipt_fields.sql
psql -U your_username -d your_database -f 010_add_buyer_address_to_orders.sql
psql -U your_username -d your_database -f 011_add_gold_transaction_fields.sql
psql -U your_username -d your_database -f 012_add_ldao_receipt_fields.sql
```

### Using Drizzle (recommended):
```bash
npx drizzle-kit push
```

### Using a migration runner script:
```bash
node scripts/run-migrations.js
```

## Rollback Instructions

If you need to rollback these migrations:

```sql
-- Rollback migration 012
ALTER TABLE paymentReceipts DROP COLUMN IF EXISTS tokensPurchased;
ALTER TABLE paymentReceipts DROP COLUMN IF EXISTS pricePerToken;
DROP INDEX IF EXISTS idx_payment_receipts_tokens_purchased;
DROP INDEX IF EXISTS idx_payment_receipts_price_per_token;

-- Rollback migration 011
ALTER TABLE goldTransaction DROP COLUMN IF EXISTS orderId;
ALTER TABLE goldTransaction DROP COLUMN IF EXISTS network;
ALTER TABLE goldTransaction DROP COLUMN IF EXISTS transactionHash;
DROP INDEX IF EXISTS idx_gold_transaction_network;
DROP INDEX IF EXISTS idx_gold_transaction_hash;
DROP INDEX IF EXISTS idx_gold_transaction_order_network;

-- Rollback migration 010
ALTER TABLE orders DROP COLUMN IF EXISTS buyerAddress;
DROP INDEX IF EXISTS idx_orders_buyer_address;

-- Rollback migration 009
ALTER TABLE paymentReceipts DROP COLUMN IF EXISTS items;
ALTER TABLE paymentReceipts DROP COLUMN IF EXISTS subtotal;
ALTER TABLE paymentReceipts DROP COLUMN IF EXISTS shipping;
ALTER TABLE paymentReceipts DROP COLUMN IF EXISTS tax;
ALTER TABLE paymentReceipts DROP COLUMN IF EXISTS sellerName;
DROP INDEX IF EXISTS idx_payment_receipts_seller_name;
```

## Verification

After running migrations, verify the schema changes:

```sql
-- Check paymentReceipts table
\d paymentReceipts

-- Check orders table
\d orders

-- Check goldTransaction table
\d goldTransaction

-- Verify indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('paymentreceipts', 'orders', 'gold_transaction')
  AND indexname LIKE 'idx_%';
```

## Impact Analysis

### Affected Tables:
1. **paymentReceipts** - 7 new fields added
2. **orders** - 1 new field added
3. **goldTransaction** - 3 new fields added

### Affected Services:
1. **LDAOAcquisitionService** - Now persists tokensPurchased and pricePerToken
2. **OrderPaymentIntegrationService** - Now persists items, subtotal, shipping, tax, sellerName
3. **GoldPurchaseRoutes** - Now persists orderId, network, transactionHash
4. **ReceiptService** - Updated to handle new fields
5. **EmailService** - Uses new fields for receipt emails

### Performance Impact:
- Minimal - Only indexes added for better query performance
- No data loss or corruption risk
- Backward compatible (all new fields are nullable or have defaults)

## Notes

- All migrations use `IF NOT EXISTS` clauses for safe re-running
- Data migration is included for existing records where applicable
- Indexes are created for optimal query performance
- Comments are added for documentation purposes

## Dependencies

These migrations depend on:
- Migration 005 (receipts table creation)
- Migration 006-008 (any intermediate migrations)

Order of execution matters! Run in numerical order.