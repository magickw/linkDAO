# DEX Integration Update

## Overview
This document describes the updates made to the DEX service to integrate with real Uniswap and SushiSwap contracts instead of using simulated implementations.

## Changes Made

### 1. Added Contract ABIs
- Created `UniswapRouterABI.ts` with the complete Uniswap V2 router ABI
- Created `SushiSwapRouterABI.ts` with the complete SushiSwap router ABI

### 2. Updated DEX Service Implementation
- Replaced simulated quote calculations with real contract calls to `getAmountsOut`
- Implemented proper token decimal handling for different tokens (ETH, USDC, USDT, DAI, LDAO)
- Added real swap execution using `swapExactTokensForTokens`
- Implemented token approval functionality using ERC20 `approve` method
- Added proper error handling with the existing web3 error handler

### 3. Token Information
Updated the token information to include:
- LDAO token address: `0xc9F690B45e33ca909bB9ab97836091673232611B`
- Proper decimal places for each token (e.g., USDC and USDT use 6 decimals)
- Token path construction for swaps

### 4. Gas Estimation
- Added real gas estimation using contract `estimateGas` methods
- Fallback to default gas values when estimation fails

## Key Improvements

### Real-Time Pricing
The service now fetches real-time prices from Uniswap and SushiSwap instead of using hardcoded exchange rates.

### Accurate Fee Calculations
Fees are now calculated based on actual DEX operations rather than simulated values.

### Multi-Token Support
The service properly handles different token decimals, making it compatible with tokens like USDC and USDT that use 6 decimals instead of 18.

### Error Handling
Comprehensive error handling with proper user feedback through the existing web3 error handler.

## Usage Examples

### Getting Swap Quotes
```typescript
const quotes = await dexService.getSwapQuotes('ETH', 'LDAO', '1.0', 0.5);
```

### Approving Token Spending
```typescript
const result = await dexService.approveToken('ETH', UNISWAP_ROUTER_ADDRESS, '1.0');
```

### Executing a Swap
```typescript
const result = await dexService.swapOnUniswap('ETH', 'LDAO', '1.0', '1000.0', deadline);
```

## Testing
Added unit tests to verify the functionality of the updated service.

## Impact
These changes resolve the issue where users were seeing incorrect LDAO token purchase rates. The system now provides accurate, real-time pricing from the actual DEX contracts.