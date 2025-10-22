# Payment Method Prioritization User Guide

## Overview

The Payment Method Prioritization system automatically orders payment methods during checkout to provide you with the most cost-effective and convenient payment options. The system considers real-time gas fees, your payment preferences, and network availability to ensure the best payment experience.

## How It Works

### Automatic Prioritization

When you initiate checkout, the system automatically:

1. **Prioritizes Stablecoins First**: USDC and other stablecoins are shown first when available, offering price stability and typically lower transaction costs
2. **Shows Fiat Payment Second**: Credit card and bank payments appear as the second option, avoiding cryptocurrency complexity
3. **Lists ETH as Fallback**: ETH payments are available but deprioritized when gas fees are high

### Smart Cost Analysis

The system continuously monitors:
- **Real-time gas fees** from multiple sources (Etherscan, Alchemy, Infura)
- **Exchange rates** for accurate cost comparisons
- **Network congestion** to predict transaction times
- **Total transaction costs** including all fees

## Payment Method Behavior

### Stablecoin Payments (USDC, USDT)

**When Prioritized:**
- You have sufficient stablecoin balance
- Network supports the stablecoin
- Lower overall transaction costs than alternatives

**Benefits:**
- Price stability (no volatility risk)
- Typically lower gas fees than ETH
- Faster transaction confirmation

**What You'll See:**
- Green "Recommended" badge
- Total cost breakdown
- Estimated confirmation time

### Fiat Payments (Credit Card, Bank Transfer)

**When Prioritized:**
- High cryptocurrency gas fees
- No sufficient crypto balance
- User preference for traditional payments

**Benefits:**
- No gas fees
- Familiar payment process
- Instant confirmation
- Consumer protection

**What You'll See:**
- "No Gas Fees" indicator
- Local currency pricing
- Stripe secure payment processing

### ETH Payments

**When Available:**
- As a fallback option
- When gas fees are reasonable (below $50 threshold)
- When other methods are unavailable

**What You'll See:**
- Gas fee warnings when costs are high
- Total transaction cost breakdown
- Confirmation prompts for expensive transactions

## Understanding Cost Indicators

### Cost Comparison Display

Each payment method shows:
- **Base Cost**: The item price
- **Transaction Fees**: Gas fees, processing fees
- **Total Cost**: Complete amount you'll pay
- **Estimated Time**: Expected confirmation time

### Warning Indicators

- 🔴 **High Gas Fee Warning**: ETH transaction costs exceed $50
- 🟡 **Network Congestion**: Slower than usual confirmation times
- 🟢 **Recommended**: Most cost-effective option available

## Customizing Your Experience

### Payment Preferences

The system learns from your choices:
- **Frequently Used Methods**: Appear higher in the list
- **Avoided Methods**: Receive lower priority
- **Network Preferences**: Remembered for future transactions

### Manual Override

You can always:
- Select any available payment method
- Override system recommendations
- Set maximum gas fee thresholds
- Choose preferred networks

## Network-Specific Behavior

### Ethereum Mainnet
- Full payment method support
- Real-time gas fee monitoring
- Stablecoin prioritization active

### Polygon
- Lower gas fees for all methods
- USDC prioritization maintained
- Faster transaction confirmation

### Other Networks
- Network-specific token availability
- Automatic fallback suggestions
- Cross-network compatibility checks

## Troubleshooting Common Issues

### "Payment Method Unavailable"

**Possible Causes:**
- Insufficient balance in selected token
- Network doesn't support the payment method
- Temporary service unavailability

**Solutions:**
1. Check your wallet balance
2. Switch to a supported network
3. Try an alternative payment method
4. Wait and retry if service is temporarily down

### High Gas Fee Warnings

**When This Happens:**
- Ethereum network congestion
- Complex smart contract interactions
- Peak usage times

**Your Options:**
1. **Wait**: Gas fees typically decrease during off-peak hours
2. **Switch Networks**: Use Polygon or other L2 solutions
3. **Use Fiat**: Avoid gas fees entirely with credit card payment
4. **Use Stablecoins**: Often have lower gas requirements than ETH

### Payment Method Not Showing

**Check These Items:**
- Wallet connection status
- Network compatibility
- Sufficient balance for transaction + fees
- Browser wallet extension is active

### Transaction Taking Too Long

**Normal Wait Times:**
- Ethereum: 1-5 minutes
- Polygon: 10-30 seconds
- Fiat: Instant confirmation

**If Delayed:**
1. Check network status on block explorers
2. Verify transaction wasn't dropped
3. Consider increasing gas price for faster confirmation

## Best Practices

### For Cost Savings
1. **Use Stablecoins**: USDC typically offers the best balance of cost and convenience
2. **Monitor Gas Fees**: Avoid peak hours (US business hours) when possible
3. **Consider Fiat**: For small purchases, credit card fees might be lower than gas fees
4. **Use L2 Networks**: Polygon and other Layer 2 solutions offer significant savings

### For Speed
1. **Fiat Payments**: Instant confirmation for immediate access
2. **Polygon Network**: Faster blockchain confirmations
3. **Higher Gas Prices**: Pay more for faster Ethereum transactions

### For Security
1. **Verify Amounts**: Always check total costs before confirming
2. **Use Trusted Networks**: Stick to well-established blockchain networks
3. **Check Addresses**: Verify recipient addresses in your wallet
4. **Keep Records**: Save transaction hashes for your records

## Getting Help

### In-App Support
- Hover over any payment method for detailed information
- Click "Why is this recommended?" for explanation
- Use the help icon (?) for contextual guidance

### Common Questions
- **Q: Why isn't my preferred payment method first?**
  A: The system prioritizes cost-effectiveness. Your preference is considered but may be overridden by significant cost differences.

- **Q: Can I disable automatic prioritization?**
  A: Currently, prioritization is always active, but you can always manually select any available payment method.

- **Q: Why do costs change during checkout?**
  A: Gas fees and exchange rates fluctuate in real-time. The system updates costs every 30 seconds to ensure accuracy.

### Contact Support
If you encounter issues not covered in this guide:
1. Check the troubleshooting section above
2. Visit our help center
3. Contact support with your transaction details

## Privacy and Data

### What We Track
- Payment method selections (to learn preferences)
- Transaction success/failure rates
- Cost comparison effectiveness

### What We Don't Track
- Specific transaction amounts
- Personal financial information
- Wallet addresses or private keys

All preference data is encrypted and stored securely, and you can reset your preferences at any time in your account settings.