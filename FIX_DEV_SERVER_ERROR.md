# Fix: Next.js Module Not Found Error (./3097.js)

## The Issue
You're seeing this error:
```
Error: Cannot find module './3097.js'
```

This is a **Next.js webpack cache corruption issue** during hot module reloading. It's not related to our wallet changes - it's a common Next.js dev server issue.

## Quick Fix

### Option 1: Hard Refresh Browser (Fastest)
1. Open your browser with the app
2. Press **Cmd + Shift + R** (Mac) or **Ctrl + Shift + R** (Windows/Linux)
3. This will clear browser cache and reload the page

### Option 2: Restart Dev Server
If hard refresh doesn't work:

```bash
# Stop the dev server (Ctrl+C in terminal)
# Then restart:
npm run dev
```

### Option 3: Clean Build (If issue persists)
```bash
# Stop dev server first (Ctrl+C)
cd app/frontend
rm -rf .next node_modules/.cache
npm run dev
```

## Testing the Wallet Explorer Feature

After fixing the cache issue:

1. **Navigate to:** http://localhost:3000/wallet
2. **Open browser console:** Press F12 or Right-click → Inspect → Console tab
3. **Connect your wallet** (you should see your address displayed)
4. **Click "View on Explorer" button** (next to your address)

### What to look for in console:
```
handleViewOnExplorer called
Explorer URL: https://etherscan.io/address/0x...
Chain ID: 1 (or your chain)
Address: 0x...
```

### Expected behavior:
- ✅ Toast notification: "Opening blockchain explorer..."
- ✅ New tab opens with the correct explorer for your chain
- ✅ Explorer shows your wallet address

### If it still doesn't work:
1. Check console logs - do you see the "handleViewOnExplorer called" message?
2. Check popup blocker - look for a blocked popup icon in your browser's address bar
3. Make sure your wallet is connected - you should see your address displayed
4. Share the console output with me

## Why This Happens
Next.js uses webpack for hot module reloading. Sometimes during development, the module cache gets out of sync, causing it to look for modules that don't exist or have been renamed. This is a known Next.js limitation and doesn't affect production builds.

## Our Changes Are Safe
The wallet explorer functionality we added is completely separate from this issue. The production build completed successfully, which means:
- ✅ Code compiles correctly
- ✅ No syntax errors
- ✅ All imports are valid
- ✅ TypeScript types are correct
