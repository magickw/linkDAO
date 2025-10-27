# LDAO Token Purchase Testing Guide - Sepolia Testnet

## ✅ Critical Bugs Fixed

### 1. **Discount Calculation Bug** ✓
- **Issue**: Discount was divided by 100 instead of 10000 (basis points)
- **Fix**: Changed `discount.toNumber() / 100` to `discount.toNumber() / 10000`
- **Impact**: Discounts now display correctly (e.g., 5% instead of 500%)

### 2. **USDC Decimals Handling** ✓
- **Issue**: Double conversion of USDC amount causing incorrect values
- **Fix**: Proper conversion from 18 decimals to 6 decimals using BigNumber division
- **Impact**: USDC purchases now calculate correct amounts

### 3. **Contract Initialization** ✓
- **Issue**: Contracts initialized once in constructor, never re-initialized when env vars loaded
- **Fix**: Added lazy initialization with `ensureContractsInitialized()` method
- **Impact**: Contracts now properly initialize on first use

### 4. **USDC Approval Flow** ✓
- **Issue**: No allowance check, wasteful approvals, poor UX
- **Fix**: Check existing allowance, only approve if needed, show toast notifications
- **Impact**: Better UX and gas savings

### 5. **Network Validation** ✓
- **Issue**: No check if user is on correct network
- **Fix**: Automatic network detection and switch to Sepolia
- **Impact**: Prevents failed transactions on wrong network

### 6. **Better Modal Integration** ✓
- **Issue**: Simple PurchaseModal used instead of comprehensive LDAOPurchaseModal
- **Fix**: Switched to LDAOPurchaseModal with full wizard flow
- **Impact**: Much better user experience

---

## 📋 Prerequisites

### 1. **MetaMask Setup**
- Install MetaMask browser extension
- Add Sepolia testnet:
  - Network Name: `Sepolia`
  - RPC URL: `https://sepolia.infura.io/v3/YOUR_INFURA_KEY` or `https://rpc.sepolia.org`
  - Chain ID: `11155111`
  - Currency Symbol: `ETH`
  - Block Explorer: `https://sepolia.etherscan.io`

### 2. **Get Sepolia ETH**
Use any of these faucets:
- https://sepoliafaucet.com/
- https://www.alchemy.com/faucets/ethereum-sepolia
- https://faucet.quicknode.com/ethereum/sepolia

Get at least **0.1 Sepolia ETH** for testing.

### 3. **Get Test USDC (MockERC20)**
The mock USDC contract is deployed at:
```
0xA31D2faD2B1Ab84Fb420824A5CF3aB5a272782CC
```

To get test USDC, you'll need to interact with the contract directly or have the deployer send you some.

---

## 🧪 Testing Steps

### **Test 1: ETH Purchase Flow**

1. **Navigate to Token Page**
   ```
   http://localhost:3000/token
   ```

2. **Click "Buy LDAO Tokens"**
   - Modal should open with 4-step wizard
   - Step indicator should show Step 1

3. **Select "Pay with Crypto"**
   - Should highlight the crypto option
   - Click "Continue"

4. **Enter Amount**
   - Try preset amounts: 100, 500, 1000
   - Try custom amount: 2500
   - Verify live price quote updates
   - Check that volume discount appears for large amounts (10,000+)
   - Click "Continue"

5. **Select ETH as Payment Method**
   - ETH option should be highlighted
   - Price quote should show ETH cost
   - Click "Continue"

6. **Review & Confirm**
   - Verify all details are correct
   - Check LDAO amount, ETH cost, discount (if any)
   - Click "Confirm Purchase"

7. **Transaction Processing**
   - If on wrong network, modal should prompt to switch
   - MetaMask should open for transaction approval
   - Approve the transaction
   - Wait for confirmation (~15-30 seconds on Sepolia)

8. **Success State**
   - Success checkmark should appear
   - Transaction hash displayed
   - "View on Etherscan" button should link to **Sepolia** Etherscan
   - Click link to verify transaction on-chain

### **Test 2: USDC Purchase Flow**

1. **Ensure you have test USDC**
   - Add USDC token to MetaMask:
     - Token Address: `0xA31D2faD2B1Ab84Fb420824A5CF3aB5a272782CC`
     - Symbol: `USDC`
     - Decimals: `6`

2. **Follow steps 1-4 from Test 1**

3. **Select USDC as Payment Method**
   - USDC option should be highlighted
   - Price quote should show USDC cost
   - Click "Continue"

4. **Review & Confirm**
   - Click "Confirm Purchase"

5. **Approval Process**
   - First MetaMask popup: **Approve USDC spending**
     - Toast notification: "Please approve USDC spending..."
     - Approve in MetaMask
     - Toast notification: "Waiting for approval confirmation..."
     - Toast notification: "USDC approved! Proceeding with purchase..."

6. **Purchase Transaction**
   - Second MetaMask popup: **Execute purchase**
     - Approve in MetaMask
     - Wait for confirmation

7. **Verify Success**
   - Same as Test 1, step 8

### **Test 3: Network Switch**

1. **Switch to Wrong Network**
   - In MetaMask, switch to Ethereum Mainnet (or any network that isn't Sepolia)

2. **Attempt Purchase**
   - Follow Test 1 steps 1-6
   - Click "Confirm Purchase"

3. **Verify Auto-Switch**
   - Should see message: "Wrong network detected"
   - MetaMask should prompt to switch to Sepolia
   - Approve network switch
   - Transaction should proceed automatically

### **Test 4: Error Handling**

1. **Insufficient ETH**
   - Try to purchase more LDAO than you can afford
   - Should see error message about insufficient funds

2. **Rejected Transaction**
   - Start purchase flow
   - When MetaMask opens, click "Reject"
   - Should see error: "Transaction rejected by user"
   - Should be able to retry

3. **Invalid Amount**
   - Try entering 0 or negative number
   - Try entering very small amount (< 1 LDAO)
   - Should see validation errors

### **Test 5: Quote Updates**

1. **Real-time Quote Refresh**
   - Enter an amount (e.g., 1000 LDAO)
   - Wait for quote to load
   - Leave modal open for 30+ seconds
   - Quote should refresh automatically
   - Look for "Real-time" indicator with green pulse

2. **Quote on Amount Change**
   - Enter different amounts rapidly
   - Quote should update each time
   - Loading state should show during fetch

---

## 🔍 What to Verify On-Chain

After successful purchase, verify on Sepolia Etherscan:

### **For ETH Purchase:**
```
https://sepolia.etherscan.io/tx/YOUR_TX_HASH
```

Check:
- ✓ Status: Success
- ✓ To: `0xeF85C8CcC03320dA32371940b315D563be2585e5` (Treasury)
- ✓ Value: Correct ETH amount sent
- ✓ Token Transfer: LDAO tokens transferred to your address

### **For USDC Purchase:**
```
https://sepolia.etherscan.io/tx/YOUR_TX_HASH
```

Check:
- ✓ Status: Success
- ✓ Two transactions: Approval + Purchase
- ✓ Approval transaction allows Treasury to spend USDC
- ✓ Purchase transaction transfers USDC and receives LDAO

---

## 📊 Expected Behavior Summary

| Feature | Expected Behavior |
|---------|-------------------|
| Modal Opening | LDAOPurchaseModal with 4-step wizard |
| Quote Display | Real-time, updates every 30s |
| Discount | Shows for purchases ≥ threshold |
| Network Check | Auto-detects and switches to Sepolia |
| USDC Approval | Only prompts if allowance insufficient |
| Transaction Status | Shows clear progress messages |
| Success State | Transaction hash + Sepolia Etherscan link |
| Error Handling | Clear error messages, retry option |

---

## 🐛 Known Limitations (Not Fixed Yet)

1. **ETH Price Hardcoded**
   - Treasury contract uses $2000/ETH
   - Should use Chainlink oracle (future enhancement)

2. **Fiat Payments Not Implemented**
   - "Pay with Card" option exists but not functional
   - Need to implement Stripe/MoonPay integration

3. **Earn-to-Own No Backend**
   - Earn opportunities displayed but claiming doesn't work
   - `/api/ldao/claim-earned` endpoint doesn't exist

4. **No Transaction History**
   - Successful purchases not stored
   - No way to view past purchases

---

## 📝 Testing Checklist

Use this checklist during testing:

### ETH Purchase
- [ ] Modal opens correctly
- [ ] Step wizard navigation works
- [ ] Quote displays correctly
- [ ] Volume discount shows (for 10k+ LDAO)
- [ ] Network check/switch works
- [ ] MetaMask opens for approval
- [ ] Transaction confirms on-chain
- [ ] Success state shows correct info
- [ ] Sepolia Etherscan link works
- [ ] LDAO balance increases

### USDC Purchase
- [ ] USDC selection works
- [ ] Allowance check prevents duplicate approvals
- [ ] Approval toast notifications show
- [ ] Two MetaMask prompts (approve + purchase)
- [ ] Both transactions confirm
- [ ] LDAO balance increases
- [ ] USDC balance decreases

### Error Cases
- [ ] Wrong network detected
- [ ] Auto network switch works
- [ ] Manual network switch fallback works
- [ ] Rejected transaction handled gracefully
- [ ] Insufficient balance shows error
- [ ] Invalid amounts show validation
- [ ] Retry after error works

---

## 🚀 Next Steps After Testing

1. **If tests pass on Sepolia:**
   - Document any issues found
   - Prepare mainnet deployment plan
   - Get security audit
   - Deploy Chainlink price feed integration

2. **If tests fail:**
   - Check browser console for errors
   - Verify environment variables are loaded
   - Check network in MetaMask
   - Ensure sufficient test ETH/USDC
   - Review transaction on Sepolia Etherscan

---

## 💡 Pro Tips

1. **Use small amounts first** - Test with 10-100 LDAO before larger purchases
2. **Check gas estimates** - Sepolia gas is free, but verify transactions aren't failing due to gas
3. **Monitor console** - Keep browser DevTools open to see any errors
4. **Clear cache** - If modal doesn't update, try hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)
5. **Multiple wallets** - Test with different wallets to ensure consistency

---

## 📞 Support

If you encounter issues:

1. Check browser console for error messages
2. Verify network is Sepolia (Chain ID: 11155111)
3. Confirm contract addresses in `.env.local` match deployed contracts
4. Check Sepolia Etherscan for transaction details
5. Review this document for expected behavior

---

**Happy Testing! 🎉**
