# Troubleshooting Guide and FAQ

## Table of Contents

1. [Common Issues](#common-issues)
2. [Deployment Problems](#deployment-problems)
3. [Transaction Failures](#transaction-failures)
4. [Integration Issues](#integration-issues)
5. [Performance Problems](#performance-problems)
6. [Security Concerns](#security-concerns)
7. [Frequently Asked Questions](#frequently-asked-questions)
8. [Debug Tools](#debug-tools)
9. [Getting Help](#getting-help)

## Common Issues

### 1. Contract Not Deployed

**Problem**: Contract address returns no code or functions fail.

**Symptoms**:
- `Contract not deployed` error
- Function calls return empty responses
- Etherscan shows no contract at address

**Solutions**:
```bash
# Check if contract is deployed
npx hardhat run scripts/check-deployment.ts --network sepolia

# Verify contract address
npx hardhat verify --network sepolia CONTRACT_ADDRESS

# Redeploy if necessary
npx hardhat run scripts/deploy-production.ts --network sepolia
```

**Prevention**:
- Always verify deployment before integration
- Use deployment scripts that check for existing contracts
- Keep deployment addresses in version control

### 2. Wrong Network Configuration

**Problem**: Transactions fail due to network mismatch.

**Symptoms**:
- `ChainId mismatch` errors
- Transactions pending indefinitely
- Contract not found errors

**Solutions**:
```javascript
// Check current network
const network = await provider.getNetwork();
console.log('Current network:', network.name, network.chainId);

// Switch network programmatically
if (network.chainId !== expectedChainId) {
  await window.ethereum.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: `0x${expectedChainId.toString(16)}` }],
  });
}
```

**Prevention**:
- Always validate network before transactions
- Display current network in UI
- Provide network switching functionality

### 3. Insufficient Gas Limit

**Problem**: Transactions fail with "out of gas" error.

**Symptoms**:
- Transaction reverts with gas-related error
- Complex operations fail unexpectedly
- Gas estimation fails

**Solutions**:
```javascript
// Estimate gas with buffer
const gasEstimate = await contract.method.estimateGas(...args);
const gasLimit = gasEstimate * 120n / 100n; // 20% buffer

// Use higher gas limit
const tx = await contract.method(...args, { gasLimit });
```

**Prevention**:
- Always estimate gas before transactions
- Add 10-20% buffer to gas estimates
- Monitor gas usage in tests

### 4. Nonce Issues

**Problem**: Transactions fail due to nonce problems.

**Symptoms**:
- `Nonce too low` or `Nonce too high` errors
- Transactions stuck in pending state
- Replacement transaction underpriced

**Solutions**:
```javascript
// Get current nonce
const nonce = await provider.getTransactionCount(address, 'pending');

// Use specific nonce
const tx = await contract.method(...args, { nonce });

// Reset nonce (MetaMask)
// Settings > Advanced > Reset Account
```

**Prevention**:
- Don't send multiple transactions simultaneously
- Wait for transaction confirmation before sending next
- Use proper nonce management in batch operations

### 5. Token Approval Issues

**Problem**: ERC20 token operations fail due to insufficient allowance.

**Symptoms**:
- `ERC20: insufficient allowance` error
- Token transfers fail
- Marketplace operations fail

**Solutions**:
```javascript
// Check current allowance
const allowance = await token.allowance(owner, spender);
console.log('Current allowance:', ethers.formatEther(allowance));

// Approve tokens
if (allowance < amount) {
  const approveTx = await token.approve(spender, amount);
  await approveTx.wait();
}

// Or approve maximum amount
const maxApproval = ethers.MaxUint256;
await token.approve(spender, maxApproval);
```

**Prevention**:
- Always check allowance before token operations
- Consider using permit() for gasless approvals
- Implement approval UI flows

## Deployment Problems

### 1. Deployment Script Failures

**Problem**: Deployment scripts fail or deploy incorrectly.

**Common Causes**:
- Missing environment variables
- Insufficient account balance
- Network connectivity issues
- Contract compilation errors

**Solutions**:
```bash
# Check environment variables
echo $PRIVATE_KEY
echo $SEPOLIA_RPC_URL

# Check account balance
npx hardhat run scripts/check-balance.ts --network sepolia

# Clean and recompile
npx hardhat clean
npx hardhat compile

# Run deployment with verbose logging
DEBUG=* npx hardhat run scripts/deploy-production.ts --network sepolia
```

### 2. Contract Verification Failures

**Problem**: Contracts fail to verify on Etherscan.

**Solutions**:
```bash
# Verify manually with constructor args
npx hardhat verify --network sepolia CONTRACT_ADDRESS "arg1" "arg2"

# Verify with constructor args file
npx hardhat verify --network sepolia --constructor-args arguments.js CONTRACT_ADDRESS

# Check if already verified
npx hardhat verify --network sepolia CONTRACT_ADDRESS --show-stack-traces
```

### 3. Proxy Deployment Issues

**Problem**: Upgradeable proxy deployment fails.

**Solutions**:
```bash
# Check OpenZeppelin upgrades compatibility
npx hardhat run scripts/validate-upgrade.ts

# Force deploy new implementation
npx hardhat run scripts/force-deploy-implementation.ts

# Check proxy admin
npx hardhat run scripts/check-proxy-admin.ts
```

## Transaction Failures

### 1. Revert Without Reason

**Problem**: Transaction reverts without clear error message.

**Debug Steps**:
```javascript
// Use debug trace to get revert reason
const tx = await contract.method(...args);
try {
  await tx.wait();
} catch (error) {
  // Get detailed error
  const code = await provider.call(tx, tx.blockNumber);
  console.log('Revert reason:', ethers.toUtf8String('0x' + code.substr(138)));
}
```

### 2. Gas Price Too Low

**Problem**: Transaction stuck due to low gas price.

**Solutions**:
```javascript
// Check current gas price
const feeData = await provider.getFeeData();
console.log('Current gas price:', ethers.formatUnits(feeData.gasPrice, 'gwei'));

// Use higher gas price
const tx = await contract.method(...args, {
  gasPrice: feeData.gasPrice * 120n / 100n // 20% higher
});

// Or use EIP-1559
const tx = await contract.method(...args, {
  maxFeePerGas: feeData.maxFeePerGas,
  maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
});
```

### 3. Transaction Replacement

**Problem**: Need to replace stuck transaction.

**Solutions**:
```javascript
// Replace with higher gas price
const replacementTx = await signer.sendTransaction({
  to: originalTx.to,
  value: originalTx.value,
  data: originalTx.data,
  nonce: originalTx.nonce,
  gasPrice: originalTx.gasPrice * 110n / 100n // 10% higher
});

// Cancel transaction (send 0 ETH to self)
const cancelTx = await signer.sendTransaction({
  to: await signer.getAddress(),
  value: 0,
  nonce: originalTx.nonce,
  gasPrice: originalTx.gasPrice * 110n / 100n
});
```

## Integration Issues

### 1. ABI Mismatch

**Problem**: Contract calls fail due to ABI mismatch.

**Symptoms**:
- `Function not found` errors
- Incorrect return values
- Encoding/decoding errors

**Solutions**:
```javascript
// Verify ABI matches deployed contract
const contract = new ethers.Contract(address, abi, provider);
const code = await provider.getCode(address);

// Check function selector
const functionSelector = contract.interface.getFunction('functionName').selector;
console.log('Function selector:', functionSelector);

// Use correct ABI from artifacts
import contractArtifact from './artifacts/Contract.sol/Contract.json';
const correctABI = contractArtifact.abi;
```

### 2. Event Filtering Issues

**Problem**: Event listeners not working or missing events.

**Solutions**:
```javascript
// Check event signature
const eventTopic = contract.interface.getEvent('EventName').topicHash;
console.log('Event topic:', eventTopic);

// Use correct filter
const filter = contract.filters.EventName(param1, param2);
const events = await contract.queryFilter(filter, fromBlock, toBlock);

// Listen for events with error handling
contract.on('EventName', (...args) => {
  try {
    console.log('Event received:', args);
  } catch (error) {
    console.error('Event handling error:', error);
  }
});
```

### 3. Provider Connection Issues

**Problem**: Provider connection fails or disconnects.

**Solutions**:
```javascript
// Check provider connection
const network = await provider.getNetwork();
const blockNumber = await provider.getBlockNumber();
console.log('Connected to:', network.name, 'Block:', blockNumber);

// Handle connection errors
provider.on('error', (error) => {
  console.error('Provider error:', error);
  // Reconnect logic
});

// Use fallback providers
const providers = [
  new ethers.JsonRpcProvider(primaryRPC),
  new ethers.JsonRpcProvider(fallbackRPC)
];
const fallbackProvider = new ethers.FallbackProvider(providers);
```

## Performance Problems

### 1. Slow Transaction Confirmation

**Problem**: Transactions take too long to confirm.

**Solutions**:
- Increase gas price for faster confirmation
- Use EIP-1559 with appropriate priority fee
- Monitor network congestion
- Implement transaction status tracking

```javascript
// Monitor transaction status
const tx = await contract.method(...args);
console.log('Transaction sent:', tx.hash);

// Wait with timeout
const receipt = await Promise.race([
  tx.wait(),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Transaction timeout')), 60000)
  )
]);
```

### 2. High Gas Costs

**Problem**: Operations consume too much gas.

**Solutions**:
- Optimize contract code
- Use batch operations
- Implement gas-efficient patterns
- Consider Layer 2 solutions

```javascript
// Batch multiple operations
const multicall = new ethers.Contract(multicallAddress, multicallABI, signer);
const calls = [
  { target: contract1.address, callData: contract1.interface.encodeFunctionData('method1', [args]) },
  { target: contract2.address, callData: contract2.interface.encodeFunctionData('method2', [args]) }
];
const results = await multicall.aggregate(calls);
```

### 3. RPC Rate Limiting

**Problem**: Too many RPC calls causing rate limits.

**Solutions**:
- Implement request caching
- Use batch RPC calls
- Implement exponential backoff
- Use multiple RPC endpoints

```javascript
// Simple caching implementation
class RPCCache {
  constructor(ttl = 60000) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  async get(key, fetchFn) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }

    const data = await fetchFn();
    this.cache.set(key, { data, timestamp: Date.now() });
    return data;
  }
}
```

## Security Concerns

### 1. Private Key Exposure

**Problem**: Private keys accidentally exposed.

**Immediate Actions**:
1. Stop using the compromised key immediately
2. Transfer all assets to a new address
3. Revoke all approvals from the compromised address
4. Update all systems with new keys

**Prevention**:
- Never commit private keys to version control
- Use environment variables for sensitive data
- Use hardware wallets for production
- Implement key rotation policies

### 2. Smart Contract Vulnerabilities

**Problem**: Security vulnerabilities in deployed contracts.

**Response**:
```bash
# Pause affected contracts
npx hardhat run scripts/emergency-procedures.ts -- pause

# Assess vulnerability impact
npx hardhat run scripts/security-analysis.ts

# Execute emergency procedures if needed
npx hardhat run scripts/emergency-procedures.ts -- full-emergency
```

### 3. Unauthorized Access

**Problem**: Unauthorized access to admin functions.

**Solutions**:
- Implement proper access controls
- Use multi-signature wallets
- Add time delays for sensitive operations
- Monitor admin function calls

## Frequently Asked Questions

### General Questions

**Q: How do I get testnet ETH for testing?**
A: Use faucets like:
- Sepolia: https://sepoliafaucet.com/
- Goerli: https://goerlifaucet.com/
- Or request from community Discord channels

**Q: Why are my transactions failing with "execution reverted"?**
A: Common causes:
- Insufficient balance or allowance
- Contract is paused
- Invalid parameters
- Gas limit too low
- Contract logic conditions not met

**Q: How do I check if a contract is verified on Etherscan?**
A: Visit `https://etherscan.io/address/CONTRACT_ADDRESS` and look for the "Contract" tab with green checkmark.

### Development Questions

**Q: How do I debug failed transactions?**
A: Use these tools:
- Hardhat console for local debugging
- Tenderly for transaction simulation
- Etherscan for transaction details
- Custom debug scripts with detailed logging

**Q: What's the difference between `call` and `send`?**
A: 
- `call`: Read-only operations, no gas cost, returns data
- `send`: State-changing operations, costs gas, returns transaction

**Q: How do I handle contract upgrades?**
A: Follow the upgrade procedures:
1. Deploy new implementation
2. Propose upgrade through governance
3. Wait for timelock period
4. Execute upgrade
5. Verify upgrade success

### Integration Questions

**Q: How do I integrate with MetaMask?**
A: Use the Ethereum provider:
```javascript
if (window.ethereum) {
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
}
```

**Q: How do I handle different wallet types?**
A: Use a wallet connection library like:
- WalletConnect
- Web3Modal
- ConnectKit
- RainbowKit

**Q: How do I optimize for mobile?**
A: Consider:
- Mobile-friendly wallet integration
- Responsive UI design
- Touch-friendly interactions
- Reduced transaction complexity

### Token Questions

**Q: How do I add LDAO token to MetaMask?**
A: Use the token import feature:
```javascript
await window.ethereum.request({
  method: 'wallet_watchAsset',
  params: {
    type: 'ERC20',
    options: {
      address: LDAO_TOKEN_ADDRESS,
      symbol: 'LDAO',
      decimals: 18,
      image: 'https://example.com/ldao-logo.png',
    },
  },
});
```

**Q: Why can't I transfer tokens?**
A: Check:
- Sufficient token balance
- Proper allowance for spender
- Token contract not paused
- Valid recipient address

### Marketplace Questions

**Q: How do I create a listing?**
A: Use the marketplace contract:
```javascript
const tx = await marketplace.createListing(
  tokenAddress, // 0x0 for ETH
  tokenId,      // 0 for fungible tokens
  price,        // in wei
  quantity,     // amount to sell
  listingType   // 0 for fixed price
);
```

**Q: How does the escrow system work?**
A: 
1. Buyer purchases item, funds go to escrow
2. Seller ships item
3. Buyer confirms delivery, funds released to seller
4. If dispute, resolution system handles it

**Q: How are fees calculated?**
A: Current fee structure:
- Marketplace fee: 2.5% of sale price
- Payment processing: Varies by token
- Gas fees: Paid by transaction sender

## Debug Tools

### 1. Hardhat Console

```bash
# Start Hardhat console
npx hardhat console --network sepolia

# In console
const contract = await ethers.getContractAt("ContractName", "0x...");
const result = await contract.someFunction();
console.log(result);
```

### 2. Custom Debug Scripts

```javascript
// scripts/debug-contract.ts
async function debugContract() {
  const contract = await ethers.getContractAt("Marketplace", marketplaceAddress);
  
  // Check contract state
  const listingCount = await contract.listingCount();
  console.log("Total listings:", listingCount.toString());
  
  // Check specific listing
  const listing = await contract.getListing(1);
  console.log("Listing 1:", listing);
  
  // Check events
  const filter = contract.filters.ListingCreated();
  const events = await contract.queryFilter(filter, -100); // Last 100 blocks
  console.log("Recent listings:", events.length);
}

debugContract().catch(console.error);
```

### 3. Transaction Analysis

```javascript
// scripts/analyze-transaction.ts
async function analyzeTransaction(txHash) {
  const tx = await provider.getTransaction(txHash);
  const receipt = await provider.getTransactionReceipt(txHash);
  
  console.log("Transaction:", {
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    value: ethers.formatEther(tx.value),
    gasLimit: tx.gasLimit.toString(),
    gasPrice: ethers.formatUnits(tx.gasPrice, 'gwei'),
    status: receipt.status === 1 ? 'Success' : 'Failed',
    gasUsed: receipt.gasUsed.toString(),
    logs: receipt.logs.length
  });
  
  // Decode logs
  const marketplace = await ethers.getContractAt("Marketplace", marketplaceAddress);
  const decodedLogs = receipt.logs.map(log => {
    try {
      return marketplace.interface.parseLog(log);
    } catch {
      return null;
    }
  }).filter(Boolean);
  
  console.log("Decoded events:", decodedLogs);
}
```

### 4. Network Monitoring

```javascript
// scripts/monitor-network.ts
async function monitorNetwork() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  
  // Monitor new blocks
  provider.on('block', async (blockNumber) => {
    const block = await provider.getBlock(blockNumber);
    console.log(`New block ${blockNumber}: ${block.transactions.length} transactions`);
  });
  
  // Monitor pending transactions
  provider.on('pending', (txHash) => {
    console.log('Pending transaction:', txHash);
  });
  
  // Monitor contract events
  const marketplace = await ethers.getContractAt("Marketplace", marketplaceAddress);
  marketplace.on('*', (event) => {
    console.log('Contract event:', event);
  });
}
```

## Getting Help

### Documentation Resources
- [API Documentation](./API_DOCUMENTATION.md)
- [Integration Guide](./INTEGRATION_GUIDE.md)
- [SDK Documentation](./SDK_DOCUMENTATION.md)
- [Upgrade Procedures](./UPGRADE_PROCEDURES.md)

### Community Support
- **Discord**: [Join our Discord](https://discord.gg/example)
  - #general-help for general questions
  - #technical-support for technical issues
  - #developers for development discussions

- **Forum**: [Community Forum](https://forum.example.com)
  - Search existing topics before posting
  - Use appropriate categories
  - Provide detailed information

- **GitHub**: [GitHub Repository](https://github.com/example/contracts)
  - Check existing issues
  - Use issue templates
  - Provide reproduction steps

### Professional Support
- **Technical Support**: tech-support@example.com
  - Include detailed error messages
  - Provide transaction hashes
  - Specify network and environment

- **Security Issues**: security@example.com
  - Use PGP encryption for sensitive issues
  - Provide detailed vulnerability reports
  - Follow responsible disclosure

- **Bug Reports**: bugs@example.com
  - Include steps to reproduce
  - Provide expected vs actual behavior
  - Include relevant logs and screenshots

### Emergency Support
- **Critical Issues**: emergency@example.com
- **24/7 Hotline**: +1-XXX-XXX-XXXX (for production issues)
- **Emergency Discord**: #emergency-support

### Before Contacting Support

Please gather the following information:
1. **Environment Details**:
   - Network (mainnet, sepolia, localhost)
   - Node.js and npm versions
   - Browser and version (if applicable)
   - Wallet type and version

2. **Error Information**:
   - Complete error messages
   - Transaction hashes (if applicable)
   - Contract addresses involved
   - Steps to reproduce the issue

3. **Code Samples**:
   - Minimal code that reproduces the issue
   - Configuration files (remove sensitive data)
   - Relevant logs and console output

4. **Expected Behavior**:
   - What you expected to happen
   - What actually happened
   - Any workarounds you've tried

This information helps our support team provide faster and more accurate assistance.