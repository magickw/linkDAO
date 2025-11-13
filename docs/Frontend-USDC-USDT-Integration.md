# Frontend Integration Guide: USDC/USDT Marketplace Payments

## Overview

This guide shows how to integrate the new USDC/USDT payment support into your marketplace frontend.

## Files Created

### 1. **tokenService.ts** - Core Token Service
Location: `/app/frontend/src/services/tokenService.ts`

Handles all ERC20 token interactions:
- Balance checks
- Token approvals
- Amount formatting (6 decimals for USDC/USDT)
- Multi-network support

### 2. **PaymentMethodSelector.tsx** - Payment Method Component
Location: `/app/frontend/src/components/Marketplace/PaymentMethodSelector.tsx`

Reusable component for selecting payment method with:
- Balance display
- Insufficient balance warnings
- Visual indicators for each currency
- Real-time balance checks

### 3. **BuyNFTModal.tsx** - Buy NFT with Tokens
Location: `/app/frontend/src/components/Marketplace/BuyNFTModal.tsx`

Complete buy flow with:
- Automatic token approval handling
- Step-by-step process (approve → purchase)
- Transaction status tracking
- Error handling

### 4. **ListNFTModal.tsx** - List NFT with Payment Choice
Location: `/app/frontend/src/components/Marketplace/ListNFTModal.tsx`

Seller interface for:
- Choosing payment method (ETH, USDC, or USDT)
- Setting price in selected currency
- Duration selection
- NFT approval for marketplace

---

## Quick Start Integration

### Step 1: Import Components

```tsx
import { tokenService, PaymentMethod } from '@/services/tokenService';
import PaymentMethodSelector from '@/components/Marketplace/PaymentMethodSelector';
import BuyNFTModal from '@/components/Marketplace/BuyNFTModal';
import ListNFTModal from '@/components/Marketplace/ListNFTModal';
```

### Step 2: Add to Your Marketplace Page

```tsx
import React, { useState } from 'react';

const MarketplacePage = () => {
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState(null);

  const handleBuyClick = (nft) => {
    setSelectedNFT(nft);
    setShowBuyModal(true);
  };

  return (
    <div>
      {/* Your NFT grid */}
      {nfts.map((nft) => (
        <NFTCard
          key={nft.tokenId}
          nft={nft}
          onBuyClick={() => handleBuyClick(nft)}
        />
      ))}

      {/* Buy Modal */}
      {showBuyModal && selectedNFT && (
        <BuyNFTModal
          isOpen={showBuyModal}
          onClose={() => setShowBuyModal(false)}
          nft={{
            tokenId: selectedNFT.tokenId,
            name: selectedNFT.name,
            image: selectedNFT.image,
            price: selectedNFT.price,
            paymentMethod: selectedNFT.paymentMethod,
            seller: selectedNFT.seller
          }}
          marketplaceAddress={MARKETPLACE_ADDRESS}
          onSuccess={() => {
            // Refresh NFT data
            refetchNFTs();
          }}
        />
      )}
    </div>
  );
};
```

---

## NFT Card with Payment Method Display

```tsx
const NFTCard = ({ nft, onBuyClick }) => {
  const [tokenInfo, setTokenInfo] = useState(null);

  useEffect(() => {
    loadTokenInfo();
  }, [nft.paymentMethod]);

  const loadTokenInfo = async () => {
    const info = await tokenService.getTokenInfo(nft.paymentMethod);
    setTokenInfo(info);
  };

  const getPaymentIcon = (method) => {
    switch (method) {
      case PaymentMethod.ETH:
        return '⟠';
      case PaymentMethod.USDC:
        return '$';
      case PaymentMethod.USDT:
        return '₮';
      default:
        return '?';
    }
  };

  const getPaymentColor = (method) => {
    switch (method) {
      case PaymentMethod.ETH:
        return 'bg-purple-100 text-purple-800';
      case PaymentMethod.USDC:
        return 'bg-blue-100 text-blue-800';
      case PaymentMethod.USDT:
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <img src={nft.image} alt={nft.name} className="w-full h-64 object-cover" />

      <div className="p-4">
        <h3 className="font-semibold text-lg">{nft.name}</h3>

        {/* Price with payment method badge */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center space-x-2">
            <span className={`
              px-2 py-1 rounded-full text-xs font-medium
              ${getPaymentColor(nft.paymentMethod)}
            `}>
              {getPaymentIcon(nft.paymentMethod)} {tokenInfo?.symbol}
            </span>
            <span className="text-xl font-bold">
              {nft.price}
            </span>
          </div>

          <button
            onClick={onBuyClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## Configuration

### 1. Set Marketplace Address

Create a config file:

```tsx
// src/config/contracts.ts
export const CONTRACTS = {
  marketplace: {
    1: '0x...', // Mainnet
    11155111: '0x...', // Sepolia
    8453: '0x...' // Base
  }
};

export const getMarketplaceAddress = async () => {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const network = await provider.getNetwork();
  return CONTRACTS.marketplace[network.chainId];
};
```

### 2. Update Environment Variables

```env
# .env.local
NEXT_PUBLIC_MARKETPLACE_ADDRESS_MAINNET=0x...
NEXT_PUBLIC_MARKETPLACE_ADDRESS_SEPOLIA=0x...
NEXT_PUBLIC_MARKETPLACE_ADDRESS_BASE=0x...
```

---

## Backend API Integration

### Fetch Listings with Payment Method

```tsx
// services/marketplaceApi.ts
export interface NFTListing {
  tokenId: number;
  name: string;
  image: string;
  price: string;
  paymentMethod: PaymentMethod;
  seller: string;
  listedAt: number;
  expiresAt: number;
}

export const fetchMarketplaceListings = async (): Promise<NFTListing[]> => {
  const response = await fetch('/api/marketplace/listings');
  const data = await response.json();

  return data.map((listing: any) => ({
    tokenId: listing.tokenId,
    name: listing.metadata.name,
    image: listing.metadata.image,
    price: ethers.formatUnits(
      listing.price,
      listing.paymentMethod === 0 ? 18 : 6 // ETH = 18, USDC/USDT = 6
    ),
    paymentMethod: listing.paymentMethod,
    seller: listing.seller,
    listedAt: listing.listedAt,
    expiresAt: listing.expiresAt
  }));
};
```

---

## Common Patterns

### 1. Check User Balance Before Buy

```tsx
const handleBuyClick = async (nft) => {
  try {
    const tokenInfo = await tokenService.getTokenInfo(nft.paymentMethod);
    const priceBigInt = tokenService.parseAmount(nft.price, tokenInfo.decimals);

    const { hasBalance, balance } = await tokenService.checkBalance(
      nft.paymentMethod,
      priceBigInt
    );

    if (!hasBalance) {
      toast.error(
        `Insufficient balance. You have ${tokenService.formatAmount(balance, tokenInfo.decimals)} ${tokenInfo.symbol}`
      );
      return;
    }

    setSelectedNFT(nft);
    setShowBuyModal(true);
  } catch (error) {
    toast.error('Failed to check balance');
  }
};
```

### 2. Display Formatted Prices

```tsx
const formatPrice = (price: string, paymentMethod: PaymentMethod) => {
  // Price is already formatted from API
  // Just add proper symbol
  const symbols = {
    [PaymentMethod.ETH]: 'ETH',
    [PaymentMethod.USDC]: 'USDC',
    [PaymentMethod.USDT]: 'USDT'
  };

  return `${price} ${symbols[paymentMethod]}`;
};
```

### 3. Filter by Payment Method

```tsx
const PaymentMethodFilter = ({ onFilterChange }) => {
  const [selectedMethods, setSelectedMethods] = useState([
    PaymentMethod.ETH,
    PaymentMethod.USDC,
    PaymentMethod.USDT
  ]);

  const toggleMethod = (method) => {
    const newMethods = selectedMethods.includes(method)
      ? selectedMethods.filter(m => m !== method)
      : [...selectedMethods, method];

    setSelectedMethods(newMethods);
    onFilterChange(newMethods);
  };

  return (
    <div className="flex space-x-2">
      {[PaymentMethod.ETH, PaymentMethod.USDC, PaymentMethod.USDT].map(method => (
        <button
          key={method}
          onClick={() => toggleMethod(method)}
          className={`
            px-4 py-2 rounded-lg border-2 transition
            ${selectedMethods.includes(method)
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200'
            }
          `}
        >
          {method === PaymentMethod.ETH && '⟠ ETH'}
          {method === PaymentMethod.USDC && '$ USDC'}
          {method === PaymentMethod.USDT && '₮ USDT'}
        </button>
      ))}
    </div>
  );
};
```

---

## Testing Checklist

- [ ] User can list NFT with USDC
- [ ] User can list NFT with USDT
- [ ] User can list NFT with ETH
- [ ] Buyer sees correct payment method badge
- [ ] Buyer can purchase with USDC (with approval)
- [ ] Buyer can purchase with USDT (with approval)
- [ ] Buyer can purchase with ETH (no approval needed)
- [ ] Insufficient balance warning shows correctly
- [ ] Token approval transaction completes
- [ ] Purchase transaction completes after approval
- [ ] Transaction hashes link to Etherscan
- [ ] Error messages are user-friendly
- [ ] Loading states show during transactions
- [ ] Success messages display correctly

---

## Troubleshooting

### Issue: "Insufficient allowance" error

**Solution:** The approval transaction may not have completed. Check:
1. Transaction was confirmed on blockchain
2. Approval amount is sufficient
3. User didn't cancel the transaction

### Issue: Prices showing incorrectly

**Solution:** Ensure proper decimal handling:
```tsx
// Correct
const price = ethers.formatUnits(priceBigInt, 6); // USDC/USDT

// Incorrect
const price = ethers.formatEther(priceBigInt); // Wrong for USDC
```

### Issue: Token addresses not found

**Solution:** Check network and add token addresses:
```tsx
// Add network support in tokenService.ts
const TOKEN_ADDRESSES: Record<number, { usdc: string; usdt: string }> = {
  // Add your network ID
  31337: { // Hardhat
    usdc: '0x...',
    usdt: '0x...'
  }
};
```

---

## Next Steps

1. **Update Backend API** to return payment method in listing responses
2. **Add Analytics** to track which payment methods are most popular
3. **Implement Filters** to allow users to filter by payment method
4. **Add Price Conversion** to show USD equivalent for all prices
5. **Create Admin Panel** to update token addresses if needed

---

## Support

For questions or issues, refer to:
- `/docs/NFTMarketplace-USDC-USDT-Guide.md` - Smart contract documentation
- `/app/frontend/src/services/tokenService.ts` - Token service implementation
- `/app/frontend/src/components/Marketplace/*` - UI components

---

**Last Updated:** 2025-01-12
