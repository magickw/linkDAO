# Base Sepolia Testing Guide

## Overview
This guide covers testing the LinkDAO platform on Base Sepolia testnet before deploying to Base mainnet.

## Prerequisites

### 1. Get Base Sepolia ETH

#### Option A: Alchemy Faucet
1. Visit: https://www.alchemy.com/faucets/base-sepolia
2. Enter your wallet address
3. Click "Send Me ETH"
4. Wait for confirmation (usually 1-2 minutes)

#### Option B: Sepolia Faucet
1. Visit: https://sepoliafaucet.com/
2. Select "Base Sepolia" network
3. Enter your wallet address
4. Complete the captcha
5. Click "Send Me ETH"

#### Option C: Bridge from Ethereum Sepolia
1. Visit: https://bridge.base.org/
2. Select "Sepolia → Base Sepolia"
3. Enter amount to bridge
4. Approve transaction in your wallet

### 2. Configure Wallet

#### MetaMask Setup
1. Open MetaMask extension
2. Click "Add Network"
3. Enter these details:
   - Network Name: Base Sepolia
   - New RPC URL: https://sepolia.base.org
   - Chain ID: 84532
   - Currency Symbol: ETH
   - Block Explorer URL: https://sepolia.basescan.org

#### Alternative: Use Network Switcher
The LinkDAO platform includes an automatic network switcher that will prompt you to add Base Sepolia.

## Testing Checklist

### ✅ 1. Wallet Connection
- [ ] Connect wallet successfully
- [ ] Verify wallet address is correct
- [ ] Check balance display
- [ ] Test wallet disconnection

### ✅ 2. Network Configuration
- [ ] Switch to Base Sepolia network
- [ ] Verify network ID (84532)
- [ ] Check block explorer links work
- [ ] Test network switching

### ✅ 3. Token Operations
- [ ] View LDAO token balance
- [ ] Test token approval
- [ ] Verify token transfer
- [ ] Check token decimals display

### ✅ 4. Staking Functionality
- [ ] Navigate to staking page
- [ ] Select staking tier
- [ ] Enter staking amount
- [ ] Approve LDAO tokens
- [ ] Complete staking transaction
- [ ] Verify staked amount
- [ ] Test unstaking
- [ ] Check rewards calculation

### ✅ 5. Marketplace Operations
- [ ] Create a listing
- [ ] Set price and duration
- [ ] Test buying a listing
- [ ] Verify transaction completion
- [ ] Check order history

### ✅ 6. Governance Features
- [ ] Create a proposal
- [ ] Vote on proposals
- [ ] Check voting power
- [ ] Verify proposal execution

### ✅ 7. Treasury Operations
- [ ] Deposit funds
- [ ] Test withdrawal
- [ ] Check transaction history
- [ ] Verify multi-sig requirements

### ✅ 8. Security Features
- [ ] Run security audit
- [ ] Check phishing protection
- [ ] Verify HTTPS connection
- [ ] Test wallet security

## Test Scenarios

### Scenario 1: New User Onboarding
1. Connect wallet for first time
2. Switch to Base Sepolia
3. Obtain test ETH from faucet
4. Purchase LDAO tokens (if available)
5. Stake tokens
6. Create marketplace listing
7. Vote on governance proposal

### Scenario 2: Power User Workflow
1. Connect hardware wallet
2. Stake large amounts
3. Create multiple listings
4. Participate in governance
5. Use advanced features

### Scenario 3: Error Handling
1. Test with insufficient funds
2. Test with wrong network
3. Test with rejected transactions
4. Test with disconnected wallet

## Common Issues & Solutions

### Issue: "Insufficient funds"
**Solution**: Get more Base Sepolia ETH from the faucet

### Issue: "Wrong network"
**Solution**: Use the network switcher or manually add Base Sepolia

### Issue: "Transaction failed"
**Solution**: 
- Check gas limit
- Verify contract addresses
- Ensure sufficient balance

### Issue: "Contract not deployed"
**Solution**: Verify contracts are deployed to Base Sepolia

## Monitoring Tools

### 1. Base Sepolia Explorer
- URL: https://sepolia.basescan.org
- Use to verify transactions
- Check contract deployments

### 2. MetaMask Activity Tab
- Monitor transaction status
- Check gas usage
- Verify contract interactions

### 3. Console Logs
- Open browser developer tools
- Check for errors
- Monitor network requests

## Performance Metrics

### Expected Gas Costs
- Token approval: ~50,000 gas
- Staking: ~150,000 gas
- Marketplace listing: ~100,000 gas
- Voting: ~60,000 gas

### Transaction Times
- Average: 2-3 seconds
- During congestion: 5-10 seconds

## Test Data

### Sample Wallet Addresses
- Test User 1: 0x742d35Cc6634C0532925a3b844Bc454e4438f44e
- Test User 2: 0x8ba1f109551bD432803012645Hac136c
- Test User 3: 0x5aAeb6053f3E94C9b9A09f33669435E7Ef1BeAed

### Test Amounts
- Small: 0.001 ETH
- Medium: 0.1 ETH
- Large: 1 ETH

## Post-Testing

### 1. Clean Up
- Cancel active listings
- Unstake tokens
- Withdraw funds
- Disconnect wallet

### 2. Documentation
- Record any issues found
- Note successful test cases
- Update test documentation

### 3. Preparation for Mainnet
- Verify all features work
- Check gas costs
- Prepare deployment scripts

## Security Considerations

### 1. Never Use Mainnet Private Keys
- Keep testnet and mainnet separate
- Use different wallets for testing

### 2. Verify Contract Addresses
- Double-check addresses match
- Use official block explorer
- Cross-reference with deployment logs

### 3. Test with Small Amounts
- Start with small test amounts
- Gradually increase for stress testing
- Never test with large amounts

## Troubleshooting

### Transaction Stuck
1. Check transaction hash on block explorer
2. Verify network is correct
3. Check gas price settings
4. Try resetting MetaMask

### Contract Not Found
1. Verify contract address
2. Check network deployment
3. Confirm ABI is correct
4. Check contract verification status

### Balance Not Updating
1. Refresh wallet
2. Check block explorer
3. Verify transaction completion
4. Clear browser cache

## Next Steps

After successful testing on Base Sepolia:
1. Review test results
2. Fix any issues found
3. Prepare for Base mainnet deployment
4. Update documentation with test results

## Resources

- [Base Documentation](https://docs.base.org/)
- [Base Sepolia Explorer](https://sepolia.basescan.org/)
- [MetaMask Documentation](https://docs.metamask.io/)
- [LinkDAO Documentation](https://docs.linkdao.io/)