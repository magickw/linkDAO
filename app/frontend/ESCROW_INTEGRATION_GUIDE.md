# Escrow Contract Integration Guide

**Date:** October 31, 2025
**Phase:** Phase 2 - Escrow & Security
**Status:** Integration Ready - Configuration Required

---

## Overview

The marketplace now integrates with the EnhancedEscrow smart contract for secure, trustless payments. This provides buyer protection, automated delivery confirmation, and dispute resolution.

## What's Been Implemented

### 1. Escrow Contract Service (`src/services/escrowContractService.ts`)

Complete frontend integration for the EnhancedEscrow contract with:

**Core Features:**
- Create escrow deposits
- Lock funds in escrow
- Confirm delivery and release funds
- Open and manage disputes
- Get escrow status and details

**Safety Features:**
- User-friendly error handling with `PaymentError`
- Transaction simulation before execution
- Automatic fee calculation
- ERC20 token approval handling
- Network validation

**Key Functions:**
```typescript
// Create a new escrow
await escrowService.createEscrow({
  listingId: 123n,
  seller: '0x...',
  tokenAddress: '0x...',
  amount: parseUnits('100', 6), // 100 USDC
  deliveryDeadline: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
  resolutionMethod: DisputeResolutionMethod.COMMUNITY_VOTING
});

// Lock funds in escrow
await escrowService.lockFunds(escrowId, amount, isNative);

// Confirm delivery
await escrowService.confirmDelivery(escrowId, 'Package delivered successfully');

// Open dispute
await escrowService.openDispute(escrowId);

// Get escrow details
const details = await escrowService.getEscrowDetails(escrowId);
```

### 2. Escrow Configuration (`src/config/escrowConfig.ts`)

Centralized configuration for escrow contract addresses across networks:

**Supported Networks:**
- Ethereum Mainnet (1)
- Sepolia Testnet (11155111) ← **YOU ARE HERE**
- Polygon (137)
- Arbitrum One (42161)
- Base (8453)
- Base Sepolia (84532)

**Helper Functions:**
```typescript
// Get address for a network
const address = getEscrowAddress(chainId);

// Check if deployed
const isDeployed = isEscrowDeployed(chainId);

// Get all deployed chains
const chains = getDeployedChains();

// Get network name
const name = getNetworkName(chainId);
```

### 3. Enhanced Escrow ABI

Complete ABI definition for interacting with the smart contract:
- Read functions: `escrows()`, `platformFeePercentage()`
- Write functions: `createEscrow()`, `lockFunds()`, `confirmDelivery()`, `openDispute()`
- Events: `EscrowCreated`, `FundsLocked`, `DeliveryConfirmed`, `DisputeOpened`

---

## Required Configuration

### Step 1: Update Escrow Contract Address

After deploying the EnhancedEscrow contract to Sepolia testnet, update the configuration:

**File:** `src/config/escrowConfig.ts`

```typescript
export const ESCROW_CONTRACT_CONFIG: Record<number, EscrowConfig> = {
  // ...

  // Sepolia Testnet
  11155111: {
    address: 'YOUR_DEPLOYED_CONTRACT_ADDRESS_HERE' as Address, // <-- UPDATE THIS
    deployedAt: new Date().toISOString(),
    verified: false
  },

  // ...
};
```

**How to get the address:**
1. After running deployment script, check the output
2. Or check the deployment artifacts
3. Or check Sepolia Etherscan for your deployer address transactions

Example:
```typescript
address: '0x5FbDB2315678afecb367f032d93F642f64180aa3' as Address,
```

### Step 2: Verify Contract on Etherscan (Recommended)

Verifying the contract allows users to see the source code and interact with it directly:

```bash
# From contracts directory
npx hardhat verify --network sepolia YOUR_CONTRACT_ADDRESS LDAO_TOKEN_ADDRESS GOVERNANCE_ADDRESS
```

After verification, update the config:
```typescript
verified: true
```

### Step 3: Update Block Number (Optional)

For better event filtering, note the deployment block:

```typescript
blockNumber: 12345678 // Block number where contract was deployed
```

---

## Integration with Payment Flow

### Current Payment Flow (Direct Transfer)
```
User → Approve Payment → Transfer to Seller → Done
❌ No buyer protection
❌ No dispute resolution
❌ Trust required
```

### New Escrow Flow (Secure)
```
User → Create Escrow → Lock Funds in Escrow →
Seller Ships → Buyer Confirms → Funds Released to Seller
✅ Buyer protection
✅ Automated dispute resolution
✅ Trustless transactions
```

### Escrow States

1. **CREATED (0)** - Escrow created, waiting for funds
2. **FUNDS_LOCKED (1)** - Funds deposited, waiting for delivery
3. **DELIVERY_CONFIRMED (2)** - Delivery confirmed, funds released
4. **DISPUTE_OPENED (3)** - Dispute active, resolution pending
5. **RESOLVED_BUYER_WINS (4)** - Dispute resolved in favor of buyer
6. **RESOLVED_SELLER_WINS (5)** - Dispute resolved in favor of seller
7. **CANCELLED (6)** - Escrow cancelled, funds refunded

---

## Testing on Sepolia Testnet

### Prerequisites

1. **MetaMask** with Sepolia network configured
2. **Sepolia ETH** from faucet:
   - https://sepoliafaucet.com/
   - https://www.alchemy.com/faucets/ethereum-sepolia

3. **Test USDC** (if using ERC20):
   - Deploy MockERC20 or use existing testnet USDC
   - Mint tokens to your test address

### Test Scenario 1: Happy Path

```typescript
// 1. Create escrow
const escrowService = new EscrowContractService(publicClient, walletClient);
const escrowId = await escrowService.createEscrow({
  listingId: 1n,
  seller: '0xSellerAddress...',
  tokenAddress: '0x0000000000000000000000000000000000000000', // ETH
  amount: parseEther('0.01'), // 0.01 ETH
  deliveryDeadline: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
  resolutionMethod: DisputeResolutionMethod.AUTOMATIC
});

console.log('Escrow created:', escrowId);

// 2. Lock funds (as buyer)
await escrowService.lockFunds(escrowId, parseEther('0.01'), true);
console.log('Funds locked');

// 3. Wait for "delivery"...

// 4. Confirm delivery (as buyer)
await escrowService.confirmDelivery(escrowId, 'Package received in good condition');
console.log('Delivery confirmed, funds released to seller');

// 5. Check final status
const status = await escrowService.getEscrowStatus(escrowId);
console.log('Final status:', EscrowStatus[status]); // DELIVERY_CONFIRMED
```

### Test Scenario 2: Dispute Flow

```typescript
// 1-2. Create escrow and lock funds (same as above)

// 3. Open dispute (as buyer or seller)
await escrowService.openDispute(escrowId);
console.log('Dispute opened');

// 4. If using community voting, token holders can vote
// (Requires LDAO tokens)

// 5. Check resolution
const details = await escrowService.getEscrowDetails(escrowId);
console.log('Dispute status:', details);
```

### Test Scenario 3: ERC20 Payment

```typescript
// 1. Approve token spending
await escrowService.approveTokenSpending(
  USDC_SEPOLIA.address,
  parseUnits('100', 6) // 100 USDC
);

// 2. Create escrow with ERC20
const escrowId = await escrowService.createEscrow({
  listingId: 1n,
  seller: '0xSellerAddress...',
  tokenAddress: USDC_SEPOLIA.address,
  amount: parseUnits('100', 6),
  deliveryDeadline: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
  resolutionMethod: DisputeResolutionMethod.COMMUNITY_VOTING
});

// 3. Lock funds (no ETH value needed for ERC20)
await escrowService.lockFunds(escrowId, parseUnits('100', 6), false);

// ... rest of flow
```

---

## Frontend Integration Examples

### Example 1: Checkout with Escrow

```typescript
// In CheckoutFlow or similar component
import { EscrowContractService, DisputeResolutionMethod } from '@/services/escrowContractService';

const handleCryptoPayment = async () => {
  try {
    // Initialize escrow service
    const escrowService = new EscrowContractService(publicClient, walletClient);

    // Create escrow
    const escrowId = await escrowService.createEscrow({
      listingId: BigInt(order.listingId),
      seller: order.sellerAddress as Address,
      tokenAddress: selectedToken.address as Address,
      amount: paymentAmount,
      deliveryDeadline: Math.floor(Date.now() / 1000) + (order.deliveryDays * 24 * 60 * 60),
      resolutionMethod: DisputeResolutionMethod.COMMUNITY_VOTING
    });

    // Approve tokens if ERC20
    if (!selectedToken.isNative) {
      await escrowService.approveTokenSpending(
        selectedToken.address as Address,
        paymentAmount
      );
    }

    // Lock funds
    const txHash = await escrowService.lockFunds(
      escrowId,
      paymentAmount,
      selectedToken.isNative
    );

    // Save escrow ID with order
    await saveOrderEscrowId(order.id, escrowId.toString(), txHash);

    // Show success
    toast.success('Payment secured in escrow!');
    navigate(`/orders/${order.id}`);

  } catch (error) {
    // PaymentError handling already built in
    console.error('Escrow payment failed:', error);
  }
};
```

### Example 2: Order Confirmation Page

```typescript
// In OrderDetailsPage
const OrderEscrowStatus = ({ escrowId }: { escrowId: bigint }) => {
  const [details, setDetails] = useState<EscrowDetails | null>(null);

  useEffect(() => {
    const loadEscrowDetails = async () => {
      const escrowService = new EscrowContractService(publicClient, walletClient);
      const escrowDetails = await escrowService.getEscrowDetails(escrowId);
      setDetails(escrowDetails);
    };

    loadEscrowDetails();
    // Poll for updates every 30 seconds
    const interval = setInterval(loadEscrowDetails, 30000);
    return () => clearInterval(interval);
  }, [escrowId]);

  if (!details) return <LoadingSpinner />;

  return (
    <div className="escrow-status">
      <h3>Payment Status</h3>
      <StatusBadge status={details.status} />

      {details.status === EscrowStatus.FUNDS_LOCKED && (
        <button onClick={handleConfirmDelivery}>
          Confirm Delivery
        </button>
      )}

      {details.status === EscrowStatus.FUNDS_LOCKED && (
        <button onClick={handleOpenDispute}>
          Open Dispute
        </button>
      )}
    </div>
  );
};
```

### Example 3: Confirm Delivery Button

```typescript
const handleConfirmDelivery = async () => {
  try {
    const escrowService = new EscrowContractService(publicClient, walletClient);

    const txHash = await escrowService.confirmDelivery(
      escrowId,
      `Order #${order.id} delivered successfully on ${new Date().toISOString()}`
    );

    toast.success('Delivery confirmed! Funds released to seller.');

    // Update order status
    await updateOrderStatus(order.id, 'delivered');

  } catch (error) {
    console.error('Failed to confirm delivery:', error);
    toast.error('Failed to confirm delivery. Please try again.');
  }
};
```

---

## Security Considerations

### ✅ Implemented

1. **Transaction Simulation** - All transactions are simulated before execution
2. **Error Handling** - Comprehensive error messages with recovery options
3. **Network Validation** - Checks if escrow is deployed before attempting transactions
4. **Fee Calculation** - Automatically calculates platform fees
5. **Token Approval** - Handles ERC20 approvals securely

### ⚠️ Important Notes

1. **Private Keys** - Never expose private keys in frontend code
2. **Amount Validation** - Always validate amounts before creating escrow
3. **Deadline Validation** - Ensure delivery deadline is in the future
4. **Address Validation** - Validate seller address before escrow creation
5. **Network Checks** - Ensure user is on correct network

### 🔐 Smart Contract Security

The EnhancedEscrow contract includes:
- ReentrancyGuard protection
- Ownable access control
- Reputation-based suspension system
- Multi-signature support
- Time-lock mechanisms
- Emergency refund capabilities

---

## Monitoring & Analytics

### Events to Monitor

```typescript
// Listen for escrow events
const unwatch = publicClient.watchContractEvent({
  address: escrowAddress,
  abi: ENHANCED_ESCROW_ABI,
  eventName: 'EscrowCreated',
  onLogs: (logs) => {
    logs.forEach(log => {
      console.log('New escrow:', log.args);
      // Send notification, update UI, etc.
    });
  }
});
```

### Metrics to Track

1. **Escrow Creation Rate** - Number of escrows created per day
2. **Completion Rate** - % of escrows that reach DELIVERY_CONFIRMED
3. **Dispute Rate** - % of escrows that enter dispute
4. **Average Resolution Time** - Time from FUNDS_LOCKED to final state
5. **Platform Fees Collected** - Total fees earned

---

## Troubleshooting

### Issue: "Escrow contract not deployed on this network"

**Solution:** Update `src/config/escrowConfig.ts` with the correct contract address for your network.

### Issue: "Insufficient funds for transaction"

**Solution:**
- Check wallet balance includes both payment amount AND platform fee
- For ERC20, ensure token approval is sufficient
- For ETH, ensure enough ETH for gas fees

### Issue: "Transaction simulation failed"

**Solution:**
- Check if contract is paused
- Verify all parameters are correct
- Ensure delivery deadline is in the future
- Check if user is suspended (reputation system)

### Issue: "Cannot confirm delivery"

**Solution:**
- Only buyer or seller can confirm delivery
- Escrow must be in FUNDS_LOCKED state
- Check wallet connection

---

## Next Steps

### Immediate Tasks

1. **✅ Complete:** Escrow contract service created
2. **✅ Complete:** Configuration file created
3. **🔄 In Progress:** Integration documentation
4. **⏳ Pending:** Update CryptoPaymentService to use escrow
5. **⏳ Pending:** Add escrow UI to checkout flow
6. **⏳ Pending:** Test on Sepolia testnet

### After Configuration

1. Update `ESCROW_CONTRACT_CONFIG` with deployed address
2. Test escrow creation on Sepolia
3. Test full payment flow with escrow
4. Integrate escrow status into order pages
5. Add escrow-related UI components
6. Set up event monitoring

### Future Enhancements

1. **Automated Delivery Confirmation** - Integration with shipping APIs
2. **Multi-Signature Release** - Require multiple parties to approve
3. **Partial Releases** - Release funds in stages
4. **Escrow Extensions** - Allow deadline extensions by mutual agreement
5. **Reputation Integration** - Display user reputation in checkout

---

## Resources

### Smart Contract
- **Contract:** `app/contracts/contracts/EnhancedEscrow.sol`
- **Tests:** `app/contracts/test/EnhancedEscrow.test.js`
- **Deployment:** `app/contracts/scripts/deploy-marketplace.js`

### Frontend Integration
- **Service:** `src/services/escrowContractService.ts`
- **Config:** `src/config/escrowConfig.ts`
- **Error Handler:** `src/services/paymentErrorHandler.ts`

### External Resources
- [Viem Documentation](https://viem.sh/)
- [wagmi Documentation](https://wagmi.sh/)
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Sepolia Etherscan](https://sepolia.etherscan.io/)

---

## Support

If you encounter issues:

1. Check console for error messages
2. Verify contract address in config
3. Ensure wallet has sufficient funds
4. Check network connection
5. Review transaction on Sepolia Etherscan

For additional help, refer to the [Payment Integration Fixes](./PAYMENT_INTEGRATION_FIXES.md) document.

---

**Last Updated:** October 31, 2025
**Status:** ✅ Integration Ready - Awaiting Contract Address Configuration
