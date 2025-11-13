# NFTMarketplace - USDC/USDT Support

## Overview

The NFTMarketplace contract has been enhanced to support **USDC and USDT** stablecoin payments in addition to ETH. Users can now buy, sell, auction, and make offers on NFTs using their preferred payment method.

## Key Features

### ✅ Multi-Payment Support
- **ETH**: Native Ethereum payments
- **USDC**: USD Coin stablecoin (6 decimals)
- **USDT**: Tether USD stablecoin (6 decimals)

### ✅ Full Marketplace Functionality
All marketplace features support all three payment methods:
- Fixed-price listings
- Auctions with bidding
- Offers on NFTs
- Automatic royalty distribution
- Platform fee collection

### ✅ Secure Payment Handling
- Separate payment flows for ETH and ERC20 tokens
- Proper allowance checks for token transfers
- Refund mechanisms for failed transactions
- Reentrancy protection

---

## Contract Changes

### 1. Payment Method Enum

```solidity
enum PaymentMethod {
    ETH,   // 0
    USDC,  // 1
    USDT   // 2
}
```

### 2. Updated Structs

All marketplace structs now include `paymentMethod`:

```solidity
struct Listing {
    uint256 tokenId;
    address seller;
    uint256 price;
    bool isActive;
    uint256 listedAt;
    uint256 expiresAt;
    PaymentMethod paymentMethod;  // NEW
}

struct Auction {
    // ... existing fields
    PaymentMethod paymentMethod;  // NEW
}

struct Offer {
    // ... existing fields
    PaymentMethod paymentMethod;  // NEW
}
```

### 3. New State Variables

```solidity
IERC20 public usdcToken;  // USDC token contract
IERC20 public usdtToken;  // USDT token contract
```

### 4. Updated Constructor

```solidity
constructor(address _usdcToken, address _usdtToken)
```

The marketplace must be deployed with USDC and USDT addresses.

---

## Usage Guide

### Deploying the Contract

```bash
# Deploy to Sepolia testnet
npx hardhat run scripts/deploy-nft-marketplace-with-tokens.ts --network sepolia

# Deploy to mainnet
npx hardhat run scripts/deploy-nft-marketplace-with-tokens.ts --network mainnet
```

### Token Addresses by Network

**Ethereum Mainnet:**
- USDC: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
- USDT: `0xdAC17F958D2ee523a2206206994597C13D831ec7`

**Sepolia Testnet:**
- USDC: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- USDT: `0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0`

**Base Mainnet:**
- USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- USDT: `0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2`

---

## Frontend Integration Examples

### 1. Listing an NFT for USDC

```typescript
import { ethers } from "ethers";

// List NFT for 100 USDC (6 decimals)
const price = ethers.parseUnits("100", 6);
const duration = 7 * 24 * 60 * 60; // 7 days
const paymentMethod = 1; // USDC

await marketplace.listNFT(
  tokenId,
  price,
  duration,
  paymentMethod
);
```

### 2. Buying an NFT with USDC

```typescript
// Get listing info
const listing = await marketplace.listings(tokenId);
const price = listing.price;

// Approve USDC spending
const usdc = new ethers.Contract(usdcAddress, ERC20_ABI, signer);
await usdc.approve(marketplaceAddress, price);

// Buy NFT
await marketplace.buyNFT(tokenId);
```

### 3. Creating a USDT Auction

```typescript
const startingPrice = ethers.parseUnits("50", 6);
const reservePrice = ethers.parseUnits("75", 6);
const duration = 24 * 60 * 60; // 1 day
const paymentMethod = 2; // USDT

await marketplace.createAuction(
  tokenId,
  startingPrice,
  reservePrice,
  duration,
  paymentMethod
);
```

### 4. Placing a Bid with USDT

```typescript
const bidAmount = ethers.parseUnits("60", 6);

// Approve USDT
const usdt = new ethers.Contract(usdtAddress, ERC20_ABI, signer);
await usdt.approve(marketplaceAddress, bidAmount);

// Place bid
await marketplace.placeBid(tokenId, bidAmount);
```

### 5. Making an Offer with USDC

```typescript
const offerAmount = ethers.parseUnits("80", 6);
const duration = 3 * 24 * 60 * 60; // 3 days
const paymentMethod = 1; // USDC

// Approve USDC
await usdc.approve(marketplaceAddress, offerAmount);

// Make offer
await marketplace.makeOffer(
  tokenId,
  duration,
  paymentMethod,
  offerAmount
);
```

### 6. Accepting an Offer

```typescript
// Accept the first offer
await marketplace.acceptOffer(tokenId, 0);
```

### 7. Canceling an Offer

```typescript
// Cancel your own offer
await marketplace.cancelOffer(tokenId, offerIndex);
```

---

## React Component Example

```tsx
import { useState } from 'react';
import { ethers } from 'ethers';

function BuyNFTWithStablecoin({ tokenId, listing }) {
  const [loading, setLoading] = useState(false);

  const handleBuy = async () => {
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const marketplace = new ethers.Contract(
        MARKETPLACE_ADDRESS,
        MARKETPLACE_ABI,
        signer
      );

      // Determine which token to use
      const isUSDC = listing.paymentMethod === 1;
      const tokenAddress = isUSDC ? USDC_ADDRESS : USDT_ADDRESS;
      const tokenSymbol = isUSDC ? 'USDC' : 'USDT';

      // Get token contract
      const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);

      // Check balance
      const balance = await token.balanceOf(await signer.getAddress());
      if (balance < listing.price) {
        throw new Error(`Insufficient ${tokenSymbol} balance`);
      }

      // Approve token spending
      console.log(`Approving ${tokenSymbol}...`);
      const approveTx = await token.approve(MARKETPLACE_ADDRESS, listing.price);
      await approveTx.wait();

      // Buy NFT
      console.log('Buying NFT...');
      const buyTx = await marketplace.buyNFT(tokenId);
      await buyTx.wait();

      alert('NFT purchased successfully!');
    } catch (error) {
      console.error('Purchase failed:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleBuy} disabled={loading}>
      {loading ? 'Processing...' : `Buy for ${ethers.formatUnits(listing.price, 6)} ${listing.paymentMethod === 1 ? 'USDC' : 'USDT'}`}
    </button>
  );
}
```

---

## Important Notes

### 1. **Decimals**
- USDC and USDT use **6 decimals**, not 18 like ETH
- Always use `ethers.parseUnits(amount, 6)` for token amounts
- Display amounts with `ethers.formatUnits(amount, 6)`

### 2. **Approvals**
- Users must approve the marketplace to spend tokens **before** buying/bidding/offering
- Approval amounts should match or exceed the transaction amount
- Consider implementing unlimited approvals for better UX (with user consent)

### 3. **Gas Costs**
- Token transactions require additional gas compared to ETH
- Two transactions needed: approve + buy (can batch with multicall)

### 4. **Refunds**
- ETH refunds are automatic (sent back immediately)
- Token refunds require explicit withdrawal via `cancelOffer()` or `withdrawExpiredOffer()`

### 5. **Fee Distribution**
- All fees (royalties, platform fees) are distributed in the same currency as the sale
- Royalty recipients receive USDC if NFT sold with USDC, etc.

---

## Admin Functions

### Set Payment Tokens

```solidity
function setPaymentTokens(address _usdcToken, address _usdtToken) external onlyOwner
```

Update USDC and USDT addresses. Only callable by contract owner.

### Withdraw Tokens

If tokens get stuck in the contract, owner can withdraw:

```solidity
// Not yet implemented - would require additional admin function
```

---

## Testing

Run the test suite:

```bash
npx hardhat test test/NFTMarketplace-USDC.test.ts
```

Tests cover:
- ✅ Listing with USDC/USDT
- ✅ Buying with USDC/USDT
- ✅ Auctions with USDC/USDT
- ✅ Offers with USDC/USDT
- ✅ Fee distribution
- ✅ Refunds and cancellations

---

## Migration Guide

### For Existing Deployments

If you have an existing NFTMarketplace deployed:

1. **Deploy new version** with USDC/USDT support
2. **Migrate listings**: Users need to re-list their NFTs on the new contract
3. **Update frontend**: Point to new contract address
4. **Verify on Etherscan** for transparency

### Breaking Changes

⚠️ **IMPORTANT**: The contract constructor signature has changed.

**Old:**
```solidity
constructor() ERC721("Web3Marketplace NFT", "W3MNFT")
```

**New:**
```solidity
constructor(address _usdcToken, address _usdtToken) ERC721("Web3Marketplace NFT", "W3MNFT")
```

### Function Signature Changes

Some functions now require additional parameters:

```solidity
// Old
function listNFT(uint256 tokenId, uint256 price, uint256 duration)

// New
function listNFT(uint256 tokenId, uint256 price, uint256 duration, PaymentMethod paymentMethod)
```

```solidity
// Old
function placeBid(uint256 tokenId) payable

// New
function placeBid(uint256 tokenId, uint256 tokenAmount) payable
```

```solidity
// Old
function makeOffer(uint256 tokenId, uint256 duration) payable

// New
function makeOffer(uint256 tokenId, uint256 duration, PaymentMethod paymentMethod, uint256 tokenAmount) payable
```

---

## Security Considerations

1. **Reentrancy Protection**: All payment functions use `nonReentrant` modifier
2. **Approval Safety**: Always check allowances before token transfers
3. **Balance Checks**: Verify user has sufficient balance before transactions
4. **Payment Validation**: Rejects ETH when expecting tokens and vice versa
5. **Refund Safety**: Proper handling of failed transactions and cancellations

---

## Gas Optimization Tips

1. **Batch Approvals**: Approve larger amounts to reduce approval transactions
2. **Use Multicall**: Combine approve + buy in single transaction (requires multicall contract)
3. **Monitor Gas Prices**: Stablecoin transactions cost more gas than ETH

---

## Support & Questions

For issues or questions:
- GitHub Issues: [Your repo link]
- Documentation: [Your docs link]
- Discord: [Your Discord link]

---

## License

MIT License - See LICENSE file for details
