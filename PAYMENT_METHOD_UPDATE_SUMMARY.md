# Payment Method Update Summary

## Changes Made

### 1. Removed ETH as a Payment Method
- Updated `USER_TIER_CONFIGS` in `config/paymentMethodPrioritization.ts` to remove `PaymentMethodType.NATIVE_ETH` from all user tiers
- Updated `NETWORK_PRIORITIZATION_RULES` to remove ETH from preferred methods for all networks
- Removed ETH payment methods from `SUPPORTED_PAYMENT_METHODS` array
- Disabled ETH in `DEFAULT_PAYMENT_METHOD_CONFIGS` by setting `enabled: false` and `displayOrder: 99`
- Set all gas fee thresholds for ETH to 0 in `DEFAULT_GAS_FEE_THRESHOLDS`

### 2. Prioritized Stablecoins (USDC/USDT) as Default Payment Methods
- Set USDC as the highest priority payment method with `basePriority: 1`
- Set USDT as the second priority payment method with `basePriority: 2`
- Updated user tier configurations to always prefer stablecoins
- Ensured stablecoin prioritization rules are applied in `StablecoinPrioritizationRules.ts`

### 3. Updated Checkout Flow
- Modified `getAvailablePaymentMethods()` in `CheckoutFlow.tsx` to exclude ETH payment methods
- Ensured only stablecoin (USDC/USDT) and fiat payment options are presented to users

## Verification

The changes ensure that:
1. ETH is no longer available as a payment method
2. USDC is the default/recommended payment method
3. USDT is the secondary stablecoin option
4. Fiat (Stripe) remains as a tertiary option
5. All payment method priorities are properly configured

## Testing

To verify these changes:
1. Navigate to the checkout flow
2. Confirm that only USDC, USDT, and fiat payment options are displayed
3. Verify that USDC is recommended as the default payment method
4. Ensure ETH is not available as a payment option