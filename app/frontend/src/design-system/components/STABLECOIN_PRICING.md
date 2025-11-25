# Stablecoin Pricing Component

## Overview

The StablecoinPricing component is a simplified alternative to the DualPricing component, designed specifically for displaying prices in stablecoins (USDC, USDT, DAI, etc.). Since stablecoins are pegged to USD, this component eliminates the complexity of real-time price conversions and provides a clean, straightforward pricing display.

## Benefits

1. **Simplicity**: No need for complex conversion logic or real-time updates
2. **Performance**: Reduced API calls and computational overhead
3. **Reliability**: No dependency on external price feeds or conversion services
4. **User Experience**: Familiar USD-equivalent pricing for users
5. **Cost Efficiency**: Lower gas fees when transacting with stablecoins on L2 networks

## When to Use

Use the StablecoinPricing component when:
- The product price is denominated in a stablecoin (USDC, USDT, DAI, etc.)
- You want to avoid complex crypto-to-fiat conversions
- You're targeting users who prefer stable, predictable pricing
- You're building for cost-conscious users who prefer L2 transactions

Use the DualPricing component when:
- The product price is denominated in volatile cryptocurrencies (ETH, BTC, etc.)
- You need real-time price conversion capabilities
- You want to show both crypto and fiat pricing options

## Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| price | string | required | The price amount (e.g., "25.99") |
| symbol | string | "USDC" | The stablecoin symbol |
| showUsdEquivalent | boolean | true | Whether to show the USD equivalent |
| size | "sm" \| "md" \| "lg" | "md" | The size variant |
| layout | "horizontal" \| "vertical" | "horizontal" | The layout orientation |
| className | string | "" | Additional CSS classes |

## Usage Examples

### Basic Usage
```tsx
<StablecoinPricing
  price="25.99"
  symbol="USDC"
/>
```

### Product Page Pricing
```tsx
<ProductStablecoinPricing
  price="199.99"
  symbol="USDC"
/>
```

### Card Layout
```tsx
<CardStablecoinPricing
  price="49.99"
  symbol="USDT"
/>
```

### Compact Display
```tsx
<CompactStablecoinPricing
  price="9.99"
  symbol="DAI"
  showUsdEquivalent={false}
/>
```

## Integration with Product Components

The ProductCard and ResponsiveProductCard components automatically detect stablecoin currencies and use the appropriate pricing component:

```tsx
// In ProductCard.tsx
{isStablecoin(priceDisplayData.cryptoSymbol) ? (
  <StablecoinPricing
    price={priceDisplayData.crypto}
    symbol={priceDisplayData.cryptoSymbol}
    size="md"
    layout="vertical"
  />
) : (
  <DualPricing
    cryptoPrice={priceDisplayData.crypto}
    cryptoSymbol={priceDisplayData.cryptoSymbol}
    fiatPrice={priceDisplayData.fiat}
    fiatSymbol={priceDisplayData.fiatSymbol}
    size="md"
    layout="vertical"
    realTimeConversion
  />
)}
```

## Supported Stablecoins

The system currently recognizes the following stablecoins:
- USDC (USD Coin)
- USDT (Tether)
- DAI (Dai Stablecoin)
- BUSD (Binance USD)
- FRAX (Frax)

To add support for additional stablecoins, update the `isStablecoin` function in the product components.