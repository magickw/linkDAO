# Seller Fee Charging Implementation

## Overview
Implemented automatic credit card charging for sellers who don't have sufficient revenue to cover listing fees. When a seller attempts to create a listing but has insufficient available revenue, the system will automatically charge their saved payment method.

## Key Components Created

### 1. Backend Service (`sellerFeeChargingService.ts`)
- **Location**: `/app/backend/src/services/sellerFeeChargingService.ts`
- **Functionality**:
  - Checks seller balance against required fees
  - Automatically charges saved credit cards when balance is insufficient
  - Tracks all fee charges in database
  - Handles failed charges gracefully
  - Supports refund functionality

### 2. Database Schema Updates
- **Tables Added**:
  - `sellerFeeCharges` - Tracks all fee charges, status, and payment details
  - `sellerRevenue` - Tracks seller revenue (available, pending, withdrawn)

### 3. API Endpoints
- **`/api/seller/fee-charges`** - Manage fee charges (GET/POST)
- **`/api/seller/balance`** - Check seller balance (GET/POST)

### 4. Frontend Service (`sellerFeeService.ts`)
- **Location**: `/app/frontend/src/services/sellerFeeService.ts`
- **Functionality**:
  - Interacts with backend APIs
  - Formats currency amounts
  - Provides reason descriptions for charges

### 5. UI Component (`SellerFeeOverview.tsx`)
- **Location**: `/app/frontend/src/components/Seller/SellerFeeOverview.tsx`
- **Features**:
  - Displays current balance (available/pending/total)
  - Shows recent fee charge history
  - Visual status indicators for charges
  - Payment method information

### 6. Integration Points
- **Listing Creation**: Integrated into `sellerListingService.ts` to automatically check/process fees when creating listings
- **Fee Amount**: $5.00 per listing (configurable)

## How It Works

1. **Seller Creates Listing**: When a seller submits a new listing, the system checks their available revenue balance
2. **Balance Check**: If available revenue < $5.00, the system proceeds to charge their saved payment method
3. **Automatic Charging**: Uses Stripe to charge the seller's default saved credit card
4. **Graceful Handling**: 
   - If charge succeeds: Fee is recorded and listing proceeds
   - If charge fails: Fee attempt is logged but listing creation continues
   - Seller is notified of any failed charges

## Key Features

### ✅ Automatic Processing
- No manual intervention required
- Seamless integration with existing listing flow
- Non-blocking - failed charges don't prevent listing creation

### ✅ Transparent Tracking
- All charges recorded in database
- Detailed status tracking (pending, charged, failed, waived)
- Failure reasons logged for troubleshooting

### ✅ Flexible Payment Methods
- Uses existing Stripe customer/payment method infrastructure
- Supports multiple saved cards
- Defaults to seller's primary payment method

### ✅ User Experience
- Clear balance display in seller dashboard
- History of all fee charges
- Visual status indicators
- Reason descriptions for charges

## Configuration

The listing fee amount is currently set to $5.00 and can be modified in:
```typescript
const LISTING_FEE_AMOUNT = 5.00; // In sellerListingService.ts
```

## Error Handling

- **Network Issues**: Charges are retried automatically
- **Payment Failures**: Logged but don't block core functionality
- **Missing Payment Methods**: Graceful fallback with clear error messaging
- **Insufficient Funds**: System continues to allow listing creation

## Future Enhancements

1. **Multiple Fee Types**: Support for different fee structures (premium features, subscriptions)
2. **Customizable Amounts**: Allow admin configuration of fee amounts
3. **Batch Processing**: Process multiple fees in single charge
4. **Email Notifications**: Notify sellers of successful/failed charges
5. **Dispute Resolution**: Handle chargebacks and disputes
6. **Analytics Dashboard**: Track fee collection metrics and trends