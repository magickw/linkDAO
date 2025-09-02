# 🚀 LinkDAO Contract Deployment Checklist

## ✅ **Prerequisites Complete**
- [x] MetaMask connected via WalletConnect
- [x] Base Sepolia network selected
- [x] Testnet ETH available
- [x] Remix IDE ready

## 📝 **Deployment Order & Addresses**

### 1. ProfileRegistry
- [ ] Compiled successfully
- [ ] Deployed via WalletConnect
- [ ] **Address**: `_________________________`
- [ ] Verified on BaseScan

### 2. FollowModule  
- [ ] Compiled successfully
- [ ] Deployed via WalletConnect
- [ ] **Address**: `_________________________`
- [ ] Verified on BaseScan

### 3. LDAOToken
- [ ] Compiled successfully
- [ ] Constructor: Treasury address = `your_wallet_address`
- [ ] Deployed via WalletConnect
- [ ] **Address**: `_________________________`
- [ ] Verified on BaseScan

### 4. PaymentRouter
- [ ] Compiled successfully
- [ ] Constructor: feeBasisPoints = `250`, feeCollector = `your_wallet_address`
- [ ] Deployed via WalletConnect
- [ ] **Address**: `_________________________`
- [ ] Verified on BaseScan

### 5. Governance
- [ ] Compiled successfully  
- [ ] Constructor: LDAOToken address from step 3
- [ ] Deployed via WalletConnect
- [ ] **Address**: `_________________________`
- [ ] Verified on BaseScan

## 🔧 **Post-Deployment Configuration**

### PaymentRouter Configuration
- [ ] Call `setTokenSupported(LDAOToken_address, true)`
- [ ] Transaction confirmed on Base Sepolia

## 📋 **Final Environment Variables**

Update your `/app/backend/.env`:
```bash
# Replace with your actual deployed addresses
PROFILE_REGISTRY_ADDRESS=
FOLLOW_MODULE_ADDRESS=
PAYMENT_ROUTER_ADDRESS=
GOVERNANCE_ADDRESS=
TOKEN_ADDRESS=
```

## 🔗 **Verification Links**
- ProfileRegistry: https://sepolia.basescan.org/address/YOUR_ADDRESS
- FollowModule: https://sepolia.basescan.org/address/YOUR_ADDRESS
- LDAOToken: https://sepolia.basescan.org/address/YOUR_ADDRESS
- PaymentRouter: https://sepolia.basescan.org/address/YOUR_ADDRESS
- Governance: https://sepolia.basescan.org/address/YOUR_ADDRESS

## ✅ **Success Criteria**
- [ ] All 5 contracts deployed successfully
- [ ] All contracts verified on BaseScan
- [ ] Environment variables updated
- [ ] Backend/Frontend can connect to contracts
- [ ] Basic contract functions tested