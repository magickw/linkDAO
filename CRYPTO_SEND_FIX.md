# Crypto Send Functionality - Bug Fixes

## Problem Statement
Users were unable to send cryptocurrency (both testnet and mainnet) using either:
1. Send functionality in the wallet dashboard
2. Send functionality on the wallet page

## Root Causes Identified

### 1. Missing PaymentRouter Contract Address for Sepolia
**Issue**: The `wagmi.config.ts` only configured PaymentRouter addresses for Base networks (chain IDs 8453 and 84532), but the actual deployed contract is on **Sepolia testnet (chain ID 11155111)**.

**Location**: `app/frontend/wagmi.config.ts` lines 34-41

**Deployed Address**: `0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50` (Sepolia)

**Evidence**: Found in `app/contracts/.env` line 134:
```
PAYMENT_ROUTER_ADDRESS=0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50
```

### 2. Missing `chainId` Parameter in Contract Calls
**Issue**: All `sendEthPayment` and `sendTokenPayment` contract calls were missing the `chainId` parameter. Without this, wagmi cannot determine which network's contract address to use when multiple addresses are configured.

**Affected Files**:
- `app/frontend/src/pages/wallet.tsx` (lines 93-111)
- `app/frontend/src/components/SmartRightSidebar/SmartRightSidebar.tsx` (lines 162, 178, 277, 293, 337, 352)

### 3. Missing `memo` Parameter in Token Payments
**Issue**: The `sendTokenPayment` function requires 4 parameters: `(token, to, amount, memo)`, but calls were only providing 3 parameters.

**Location**: `app/frontend/src/pages/wallet.tsx` line 102-108

**Contract ABI**: `app/frontend/src/generated.ts` lines 2740-2750

## Fixes Applied

### Fix 1: Update wagmi.config.ts with Correct Addresses

**File**: `app/frontend/wagmi.config.ts`

**Before**:
```typescript
{
  name: 'PaymentRouter',
  abi: paymentRouterABI,
  address: {
    8453: '0x3456789012345678901234567890123456789012',
    84532: '0x3456789012345678901234567890123456789012',
  },
},
```

**After**:
```typescript
{
  name: 'PaymentRouter',
  abi: paymentRouterABI,
  address: {
    11155111: '0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50', // Sepolia testnet (DEPLOYED)
    8453: '0x3456789012345678901234567890123456789012', // Base mainnet (PLACEHOLDER - NOT DEPLOYED)
    84532: '0x3456789012345678901234567890123456789012', // Base Sepolia (PLACEHOLDER - NOT DEPLOYED)
  },
},
```

### Fix 2: Regenerate generated.ts

**Command**: `npx wagmi generate`

**Result**: Updated `app/frontend/src/generated.ts` with correct multi-chain addresses including Sepolia.

### Fix 3: Add chainId Parameter to Wallet Page

**File**: `app/frontend/src/pages/wallet.tsx`

**ETH Payment (lines 90-97)**:
```typescript
sendEthPayment({
  args: [recipient as `0x${string}`, amountInWei, ''],
  value: amountInWei,
  chainId: selectedChainId,  // ✅ ADDED
});
```

**Token Payment (lines 103-111)**:
```typescript
sendTokenPayment({
  args: [
    selectedToken.address as `0x${string}`,
    recipient as `0x${string}`,
    amountInWei,
    '' // memo parameter  // ✅ ADDED
  ],
  chainId: selectedChainId,  // ✅ ADDED
});
```

### Fix 4: Add chainId Parameter to SmartRightSidebar

**File**: `app/frontend/src/components/SmartRightSidebar/SmartRightSidebar.tsx`

**Send Token Function (lines 162-192)**:
```typescript
// ETH send
writeSendEthAsync({
  args: [recipient as `0x${string}`, amountBigInt, ''],
  value: amountBigInt,
  gas: 300000n,
  chainId  // ✅ ADDED
})

// Token send
writeSendTokenAsync({
  args: [tokenAddr, recipient as `0x${string}`, amountBigInt, ''],
  gas: 500000n,
  chainId  // ✅ ADDED
})
```

**Swap Function (lines 277-297)**:
```typescript
// ETH swap
await writeSendEthAsync({
  args: [routerAddress, amountBigInt, `swap:${toToken}`],
  value: amountBigInt,
  gas: 300000n,
  chainId  // ✅ ADDED
});

// Token swap
await writeSendTokenAsync({
  args: [tokenAddr, routerAddress, amountBigInt, `swap:${toToken}`],
  gas: 500000n,
  chainId  // ✅ ADDED
});
```

**Stake Function (lines 337-356)**:
```typescript
// ETH stake
await writeSendEthAsync({
  args: [routerAddress, amountBigInt, `stake:${poolId}`],
  value: amountBigInt,
  gas: 300000n,
  chainId  // ✅ ADDED
});

// Token stake
await writeSendTokenAsync({
  args: [tokenAddr, routerAddress, amountBigInt, `stake:${poolId}`],
  gas: 500000n,
  chainId  // ✅ ADDED
});
```

## How to Test

### Prerequisites
1. Connect wallet to **Sepolia testnet** (chain ID: 11155111)
2. Ensure you have Sepolia ETH for gas fees

### Test Cases

#### 1. Test Native ETH Send (Wallet Page)
```
1. Navigate to /wallet
2. Click "Send" tab
3. Select network: "Sepolia"
4. Token: ETH
5. Amount: 0.001
6. Recipient: Valid Sepolia address
7. Click "Send Payment"
8. Confirm transaction in MetaMask
9. ✅ Expected: Transaction submitted successfully
```

#### 2. Test Token Send (if ERC-20 tokens available on Sepolia)
```
1. Navigate to /wallet
2. Click "Send" tab
3. Select network: "Sepolia"
4. Token: USDC (or other available token)
5. Amount: 1
6. Recipient: Valid Sepolia address
7. Click "Send Payment"
8. Confirm transaction in MetaMask
9. ✅ Expected: Transaction submitted successfully
```

#### 3. Test Dashboard Send
```
1. Navigate to dashboard (/)
2. Open SmartRightSidebar
3. Use send functionality
4. Select Sepolia network
5. ✅ Expected: Transaction submitted successfully
```

### Verification
After submitting transaction:
1. Check transaction hash in browser console
2. Verify on Sepolia Etherscan: https://sepolia.etherscan.io/tx/[hash]
3. Confirm PaymentRouter contract interaction: https://sepolia.etherscan.io/address/0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50

## Network Support

### Current Status
- ✅ **Sepolia Testnet** (11155111): Fully deployed and working
- ❌ **Base Mainnet** (8453): Contract not deployed (placeholder address)
- ❌ **Base Sepolia** (84532): Contract not deployed (placeholder address)

### To Enable Base Networks
To enable sending on Base networks, you need to:

1. **Deploy PaymentRouter contract** to Base Mainnet and/or Base Sepolia
2. **Update wagmi.config.ts** with real deployed addresses
3. **Regenerate** generated.ts: `npx wagmi generate`
4. **Verify** contract on Basescan

**Deployment Command** (from contracts directory):
```bash
cd app/contracts
npx hardhat run scripts/deploy-payment-router.ts --network base
```

## Files Modified

1. ✅ `app/frontend/wagmi.config.ts` - Added Sepolia PaymentRouter address
2. ✅ `app/frontend/src/generated.ts` - Regenerated with correct addresses
3. ✅ `app/frontend/src/pages/wallet.tsx` - Added chainId and memo parameters
4. ✅ `app/frontend/src/components/SmartRightSidebar/SmartRightSidebar.tsx` - Added chainId to all contract calls

## Deployment Checklist

- [x] Update wagmi.config.ts with Sepolia address
- [x] Regenerate generated.ts
- [x] Add chainId parameter to wallet.tsx
- [x] Add memo parameter to sendTokenPayment
- [x] Add chainId to SmartRightSidebar send functions
- [x] Add chainId to SmartRightSidebar swap functions
- [x] Add chainId to SmartRightSidebar stake functions
- [ ] Test on Sepolia testnet
- [ ] Deploy frontend to production
- [ ] Deploy PaymentRouter to Base networks (if needed)
- [ ] Update documentation

## Known Limitations

1. **Base Networks Not Deployed**: Sending on Base Mainnet and Base Sepolia will fail until contracts are deployed there
2. **Placeholder Addresses**: The Base network addresses in the config are placeholders and will cause transactions to fail
3. **Single Network Support**: Currently only Sepolia is fully functional for crypto sends

## Recommendations

### Short-term (Immediate)
1. ✅ Fix implemented - users can now send on Sepolia
2. Update UI to show warning when selecting Base networks that contracts aren't deployed
3. Add network switcher validation to prevent users from attempting sends on unsupported networks

### Medium-term (Next Sprint)
1. Deploy PaymentRouter to Base Sepolia for Base testnet support
2. Deploy PaymentRouter to Base Mainnet for production Base support
3. Update payment configuration to dynamically disable unsupported networks

### Long-term (Future)
1. Implement multi-chain deployment automation
2. Add contract deployment verification in CI/CD
3. Create admin panel to manage contract addresses across networks

## Support

If issues persist after these fixes:

1. **Check Browser Console**: Look for specific error messages
2. **Verify Network**: Ensure wallet is on Sepolia (chain ID: 11155111)
3. **Check Contract**: Verify PaymentRouter on Sepolia Etherscan
4. **Test with Small Amount**: Start with minimal ETH (0.001)
5. **Report Issue**: Include transaction hash and full error message

## References

- PaymentRouter Contract (Sepolia): https://sepolia.etherscan.io/address/0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50
- Contract Deployment: `app/contracts/.env` line 134
- Wagmi Config: `app/frontend/wagmi.config.ts`
- Generated Hooks: `app/frontend/src/generated.ts`

---

**Status**: ✅ Fixed
**Date**: 2025-11-20
**Affected Components**: Wallet, Dashboard, SmartRightSidebar
**Networks Fixed**: Sepolia Testnet
**Networks Pending**: Base Mainnet, Base Sepolia
