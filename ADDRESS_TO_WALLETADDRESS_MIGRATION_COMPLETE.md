# Address to WalletAddress Migration - Complete

## Overview
Successfully completed the migration from the single `address` field to separate `walletAddress` and `physicalAddress` fields to support marketplace logistics while maintaining clear separation between wallet addresses and physical addresses.

## Changes Made

### 1. Database Schema Updates (`app/backend/drizzle/schema.ts`)

#### Users Table
- **Renamed**: `address` → `walletAddress` (with proper column name `wallet_address`)
- **Added Physical Address Fields**:
  - `physicalStreet` (`physical_street`)
  - `physicalCity` (`physical_city`) 
  - `physicalState` (`physical_state`)
  - `physicalPostalCode` (`physical_postal_code`)
  - `physicalCountry` (`physical_country`)
  - `physicalAddressType` (`physical_address_type`) - 'shipping' or 'billing'
  - `physicalIsDefault` (`physical_is_default`) - boolean flag

#### Reputations Table
- **Renamed**: `address` → `walletAddress` (with proper column name `wallet_address`)

#### Orders Table
- **Added Shipping Address Fields**:
  - `shippingStreet` (`shipping_street`)
  - `shippingCity` (`shipping_city`)
  - `shippingState` (`shipping_state`)
  - `shippingPostalCode` (`shipping_postal_code`)
  - `shippingCountry` (`shipping_country`)
  - `shippingName` (`shipping_name`)
  - `shippingPhone` (`shipping_phone`)

### 2. Model Updates

#### UserProfile Model (`app/backend/src/models/UserProfile.ts`)
- ✅ Already properly implemented with `walletAddress` and `PhysicalAddress` interface

#### Marketplace Models (`app/backend/src/models/Marketplace.ts`)
- ✅ Already using `walletAddress` fields throughout
- **Enhanced**: Added `shippingAddress` field to `MarketplaceOrder` interface

#### Validation Schema (`app/backend/src/models/validation.ts`)
- ✅ Already properly implemented with `walletAddress` validation
- **Added**: `shippingAddressSchema` for order shipping validation
- **Enhanced**: `createOrderSchema` now includes optional `shippingAddress`

### 3. Test Updates (`app/backend/tests/userProfileService.test.ts`)
- **Fixed**: All test inputs now use `walletAddress` instead of `address`
- **Fixed**: All test assertions now check `walletAddress` field

### 4. Database Migration Scripts
- **Created**: `address_to_wallet_address_migration.sql` - Forward migration
- **Created**: `rollback_address_migration.sql` - Rollback migration

## Database Services Status
- ✅ `databaseService.ts` - Already using correct `walletAddress` field names
- ✅ `redisService.ts` - Uses parameter names (no changes needed)
- ✅ Other services - Using correct field references

## Migration Benefits

### 1. Clear Separation of Concerns
- **Wallet Address**: Used for blockchain transactions and identity
- **Physical Address**: Used for marketplace logistics and shipping

### 2. Enhanced Marketplace Support
- Orders can now capture detailed shipping information
- Users can store default physical addresses
- Support for both shipping and billing address types

### 3. Backward Compatibility
- Migration scripts ensure smooth transition
- Rollback capability if needed
- All existing functionality preserved

## Next Steps

### 1. Run Database Migration
```bash
# Apply the migration
psql -d your_database -f app/backend/drizzle/migrations/address_to_wallet_address_migration.sql

# If rollback needed
psql -d your_database -f app/backend/drizzle/migrations/rollback_address_migration.sql
```

### 2. Update Frontend Components
- Update any frontend components that reference the old `address` field
- Implement UI for physical address management
- Add shipping address forms for marketplace orders

### 3. API Endpoint Updates
- Verify all API endpoints use the new field names
- Update API documentation
- Test all marketplace and user profile endpoints

## Validation

### Schema Validation
- ✅ Wallet addresses: Ethereum address format (42 chars, 0x prefix)
- ✅ Physical addresses: Required fields with length limits
- ✅ Shipping addresses: Complete address validation for orders

### Data Integrity
- ✅ Unique constraints on wallet addresses
- ✅ Proper foreign key relationships maintained
- ✅ Indexes for performance optimization

## Files Modified
1. `app/backend/drizzle/schema.ts` - Database schema updates
2. `app/backend/src/models/Marketplace.ts` - Added shipping address to orders
3. `app/backend/src/models/validation.ts` - Added shipping address validation
4. `app/backend/tests/userProfileService.test.ts` - Updated test field names
5. `app/backend/drizzle/migrations/address_to_wallet_address_migration.sql` - Forward migration
6. `app/backend/drizzle/migrations/rollback_address_migration.sql` - Rollback migration

## Status: ✅ COMPLETE
The migration is ready for deployment. All code changes have been made and migration scripts are prepared.