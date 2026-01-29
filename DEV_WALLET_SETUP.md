# Development Wallet Setup

## Quick Start for Testing

If you're testing on a simulator or don't have wallet apps installed, use the dev mock wallet:

```bash
# Set environment variable and start
EXPO_PUBLIC_DEV_MODE=true npm start

# OR
EXPO_PUBLIC_MOCK_WALLET=true npm start
```

## What Happens

1. The "Dev Mock (Testing)" wallet option appears at the top of the wallet provider list
2. Click it to connect instantly (no app required)
3. Uses test address: `0x742d35Cc6634C0532925a3b844Bc5e8f5a7a3f9D`
4. Generates mock signatures for message signing
5. All authentication flow works normally

## Real Wallet Testing

### On Physical iOS Device

1. **MetaMask Mobile**
   - Install from App Store
   - Currently disabled due to SDK v0.3.12 issues
   - (Alternative: Use WalletConnect below)

2. **WalletConnect**
   - Install any WalletConnect-compatible wallet (Rainbow, Trust, etc.)
   - Click "WalletConnect" option
   - Scan QR code with wallet app
   - Approve connection in wallet

3. **Trust Wallet**
   - Install from App Store
   - Click "Trust Wallet" option
   - Opens Trust Wallet app to approve

### On Physical Android Device

Same process as iOS for compatible wallet apps.

## Environment Setup

### .env.example (for reference)
```
# Enable mock wallet for development
EXPO_PUBLIC_DEV_MODE=true
# OR
EXPO_PUBLIC_MOCK_WALLET=true
```

Add to your `.env.local` or `.env` file if using a local setup.

## Troubleshooting

**"Dev Mock (Testing)" option not showing?**
- Make sure `EXPO_PUBLIC_DEV_MODE=true` or `EXPO_PUBLIC_MOCK_WALLET=true` is set
- Restart the dev server after changing environment variables

**Wallet connection still failing on physical device?**
- Ensure the wallet app is installed
- Try closing and reopening your app
- Check that wallet is enabled in system settings

**MetaMask not working?**
- Known issue with v0.3.12 - WalletConnect is the recommended alternative
- See https://github.com/MetaMask/metamask-sdk for updates

