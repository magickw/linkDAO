# Database Migrations Summary - Receipt System Enhancement

## Overview

This document summarizes the database migrations created to support the enhanced receipt generation and email sending system for LinkDAO.

## Migration Files Created

### 1. Migration 009: Add Marketplace Receipt Fields
**File:** `app/backend/src/db/migrations/009_add_marketplace_receipt_fields.sql`

**Purpose:** Add missing fields required for marketplace purchase receipts

**Changes:**
- Added `items` (JSONB) - Stores array of order items
- Added `subtotal` (DECIMAL) - Subtotal before fees and taxes
- Added `shipping` (DECIMAL) - Shipping cost
- Added `tax` (DECIMAL) - Tax amount
- Added `sellerName` (VARCHAR) - Seller name
- Created index `idx_payment_receipts_seller_name`

**Impact:** Enables detailed marketplace receipts with itemized breakdowns

---

### 2. Migration 010: Add Buyer Address to Orders
**File:** `app/backend/src/db/migrations/010_add_buyer_address_to_orders.sql`

**Purpose:** Add buyer wallet address to orders table for easier lookup

**Changes:**
- Added `buyerAddress` (VARCHAR 66) - Buyer wallet address
- Created index `idx_orders_buyer_address`
- Populated existing orders with buyer addresses from users table

**Impact:** Eliminates need for JOINs when fetching buyer information for receipts

---

### 3. Migration 011: Add Gold Transaction Fields
**File:** `app/backend/src/db/migrations/011_add_gold_transaction_fields.sql`

**Purpose:** Add fields required for gold purchase receipt generation

**Changes:**
- Added `orderId` (VARCHAR 255, UNIQUE) - Unique order ID
- Added `network` (VARCHAR 50) - Blockchain network (Ethereum, Base, Polygon)
- Added `transactionHash` (VARCHAR 66) - Blockchain transaction hash
- Created indexes:
  - `idx_gold_transaction_network`
  - `idx_gold_transaction_hash`
  - `idx_gold_transaction_order_network`

**Impact:** Enables tracking and receipt generation for gold purchases

---

### 4. Migration 012: Add LDAO Receipt Fields
**File:** `app/backend/src/db/migrations/012_add_ldao_receipt_fields.sql`

**Purpose:** Add LDAO token purchase fields for historical tracking

**Changes:**
- Added `tokensPurchased` (VARCHAR 255) - Number of LDAO tokens purchased
- Added `pricePerToken` (VARCHAR 50) - Price per LDAO token
- Created indexes:
  - `idx_payment_receipts_tokens_purchased`
  - `idx_payment_receipts_price_per_token`
- Populated existing LDAO receipts with values from metadata JSON

**Impact:** Persists LDAO purchase details for historical records and receipts

---

## Schema Updates

### paymentReceipts Table
**New Fields:**
```sql
items              JSONB
subtotal           DECIMAL(20,8)
shipping           DECIMAL(20,8)
tax                DECIMAL(20,8)
sellerName         VARCHAR(255)
tokensPurchased    VARCHAR(255)
pricePerToken      VARCHAR(50)
```

### orders Table
**New Fields:**
```sql
buyerAddress       VARCHAR(66)
```

### goldTransaction Table
**New Fields:**
```sql
orderId            VARCHAR(255) UNIQUE
network            VARCHAR(50)
transactionHash    VARCHAR(66)
```

---

## Drizzle Schema Updates

### Updated Files:
- `app/backend/src/db/schema.ts`

### Changes Made:
1. Updated `paymentReceipts` table definition with 7 new fields
2. Updated `orders` table definition with `buyerAddress` field
3. Updated `goldTransaction` table definition with 3 new fields
4. Added appropriate indexes for all new fields

---

## Migration Runner Script

**File:** `app/backend/scripts/run-receipt-migrations.js`

**Features:**
- Runs all migrations in correct order
- Provides detailed console output with color coding
- Handles "already exists" errors gracefully
- Verifies all fields after migration
- Generates summary report

**Usage:**
```bash
# Set environment variables
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=linkdao
export DB_USER=postgres
export DB_PASSWORD=your_password

# Run migrations
node app/backend/scripts/run-receipt-migrations.js
```

---

## How to Run Migrations

### Option 1: Using Migration Runner (Recommended)
```bash
cd /Users/bfguo/Dropbox/Mac/Documents/LinkDAO
node app/backend/scripts/run-receipt-migrations.js
```

### Option 2: Using psql Directly
```bash
cd /Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend/src/db/migrations

psql -U postgres -d linkdao -f 009_add_marketplace_receipt_fields.sql
psql -U postgres -d linkdao -f 010_add_buyer_address_to_orders.sql
psql -U postgres -d linkdao -f 011_add_gold_transaction_fields.sql
psql -U postgres -d linkdao -f 012_add_ldao_receipt_fields.sql
```

### Option 3: Using Drizzle Kit
```bash
cd /Users/bfguo/Dropbox/Mac/Documents/LinkDAO
npx drizzle-kit push
```

---

## Verification

After running migrations, verify the changes:

```sql
-- Check paymentReceipts table structure
\d paymentReceipts

-- Check orders table structure
\d orders

-- Check goldTransaction table structure
\d gold_transaction

-- Verify all new indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('paymentreceipts', 'orders', 'gold_transaction')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

---

## Rollback Instructions

If you need to rollback the migrations, see the detailed rollback instructions in:
`app/backend/src/db/migrations/README.md`

---

## Impact Assessment

### Database Performance
- **Minimal Impact:** Only adds indexes for better query performance
- **No Data Loss:** All operations are additive (no data deletion)
- **Backward Compatible:** New fields are nullable or have defaults

### Application Performance
- **Improved:** Fewer JOINs needed with buyerAddress field
- **Improved:** Better query performance with new indexes
- **No Breaking Changes:** Existing queries continue to work

### Data Integrity
- **Safe:** Uses `IF NOT EXISTS` clauses
- **Data Migration:** Populates existing records where applicable
- **Unique Constraints:** Prevents duplicate order IDs

---

## Next Steps

1. **Run Migrations:** Execute the migrations using one of the methods above
2. **Verify:** Check that all fields and indexes are created correctly
3. **Test:** Test receipt generation for all three purchase types
4. **Monitor:** Monitor database performance after migration
5. **Backup:** Ensure you have a database backup before running migrations

---

## Support

For issues or questions:
- Check the README in `app/backend/src/db/migrations/`
- Review the migration runner logs
- Consult the Drizzle documentation
- Contact the development team

---

## Files Modified/Created

### Created:
- `app/backend/src/db/migrations/009_add_marketplace_receipt_fields.sql`
- `app/backend/src/db/migrations/010_add_buyer_address_to_orders.sql`
- `app/backend/src/db/migrations/011_add_gold_transaction_fields.sql`
- `app/backend/src/db/migrations/012_add_ldao_receipt_fields.sql`
- `app/backend/src/db/migrations/README.md`
- `app/backend/scripts/run-receipt-migrations.js`
- `MIGRATION_SUMMARY.md` (this file)

### Modified:
- `app/backend/src/db/schema.ts`

---

## Migration Checklist

- [ ] Backup database before running migrations
- [ ] Review migration files for any custom modifications needed
- [ ] Test migrations on staging environment first
- [ ] Run migration runner script
- [ ] Verify all fields are created correctly
- [ ] Verify all indexes are created correctly
- [ ] Test receipt generation for LDAO purchases
- [ ] Test receipt generation for marketplace purchases
- [ ] Test receipt generation for gold purchases
- [ ] Monitor application logs for any errors
- [ ] Monitor database performance metrics
- [ ] Document any issues or deviations from expected behavior

---

**Last Updated:** December 27, 2025
**Version:** 1.0.0
**Status:** Ready for Deployment