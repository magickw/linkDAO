# Wallet Page - View on Explorer Fix

## Changes Made

### 1. Updated `handleViewOnExplorer` Function
**Location:** `/app/frontend/src/pages/wallet.tsx` (lines 111-133)

The function now includes:
- **Better error handling** with try-catch block
- **Console logging** to help debug issues
- **Toast notifications** to provide user feedback
- **Simpler window.open** call without additional parameters that might cause issues

### 2. Explorer URL Mapping
The `getExplorerUrl` function maps chain IDs to their respective block explorers:

| Chain ID | Network | Explorer URL |
|----------|---------|-------------|
| 1 | Ethereum Mainnet | https://etherscan.io |
| 5 | Goerli Testnet | https://goerli.etherscan.io |
| 11155111 | Sepolia Testnet | https://sepolia.etherscan.io |
| 137 | Polygon | https://polygonscan.com |
| 80001 | Mumbai Testnet | https://mumbai.polygonscan.com |
| 8453 | Base | https://basescan.org |
| 84532 | Base Sepolia | https://sepolia.basescan.org |

## How to Test

1. **Connect your wallet** on the `/wallet` page
2. **Check the browser console** (F12 or Right-click → Inspect → Console)
3. **Click the "View on Explorer" button**
4. **Look for console logs** showing:
   - "handleViewOnExplorer called"
   - Explorer URL
   - Chain ID
   - Wallet address

## Troubleshooting

### Issue: Button doesn't do anything
**Check:**
1. Open browser console (F12) and look for logs
2. Check if you have a popup blocker enabled
3. Verify your wallet is connected (you should see an address displayed)

### Issue: Wrong explorer opens
**Check:**
1. Look at the console log for "Chain ID"
2. Verify you're connected to the correct network in your wallet
3. If using an unsupported chain, it will default to Etherscan

### Issue: Popup blocked
**Solution:**
1. Allow popups for localhost (or your domain)
2. You should see a toast notification saying "Opening blockchain explorer..."
3. Check your browser's popup blocker icon (usually near the address bar)

## Testing Checklist

- [ ] Wallet is connected
- [ ] Console logs show correct address
- [ ] Console logs show correct chain ID
- [ ] Click "View on Explorer" button
- [ ] New tab opens with correct explorer
- [ ] Explorer shows your wallet address
- [ ] Transaction links also work in the transaction history table

## Code Reference

```typescript
const handleViewOnExplorer = () => {
  console.log('handleViewOnExplorer called');

  if (!address) {
    console.log('No address found');
    addToast('No wallet address found', 'error');
    return;
  }

  const explorerUrl = getExplorerUrl('address', address);
  console.log('Explorer URL:', explorerUrl);
  console.log('Chain ID:', chainId);
  console.log('Address:', address);

  try {
    window.open(explorerUrl, '_blank');
    addToast('Opening blockchain explorer...', 'success');
  } catch (error) {
    console.error('Error opening explorer:', error);
    addToast('Failed to open explorer. Please check your popup blocker.', 'error');
  }
};
```
