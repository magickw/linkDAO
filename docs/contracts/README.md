# Smart Contract Documentation

The Web3 Marketplace uses a suite of smart contracts to handle escrow, reputation, governance, and NFT functionality.

## 📋 Contract Overview

| Contract | Address | Network | Purpose |
|----------|---------|---------|---------|
| MarketplaceEscrow | `0x1234...` | Ethereum | Order escrow and payment handling |
| ReputationSystem | `0x5678...` | Ethereum | User reputation and review management |
| PlatformToken | `0x9abc...` | Ethereum | Platform governance token |
| NFTMarketplace | `0xdef0...` | Ethereum | NFT trading and royalties |
| GovernanceDAO | `0x2468...` | Ethereum | Community governance |

## 🔗 Contract Addresses

### Mainnet (Ethereum)
```javascript
const contracts = {
  escrow: '0x1234567890abcdef1234567890abcdef12345678',
  reputation: '0x5678901234abcdef5678901234abcdef56789012',
  token: '0x9abcdef01234567890abcdef01234567890abcdef',
  nftMarketplace: '0xdef0123456789abcdef0123456789abcdef012345',
  governance: '0x2468ace013579bdf2468ace013579bdf2468ace0'
};
```

### Polygon
```javascript
const contracts = {
  escrow: '0xabcdef1234567890abcdef1234567890abcdef12',
  reputation: '0x567890abcdef1234567890abcdef1234567890ab',
  token: '0x1234567890abcdef1234567890abcdef12345678',
  nftMarketplace: '0x890abcdef1234567890abcdef1234567890abcde',
  governance: '0xdef1234567890abcdef1234567890abcdef12345'
};
```

### Arbitrum
```javascript
const contracts = {
  escrow: '0x234567890abcdef1234567890abcdef1234567890',
  reputation: '0x67890abcdef1234567890abcdef1234567890abc',
  token: '0xabcdef1234567890abcdef1234567890abcdef12',
  nftMarketplace: '0x4567890abcdef1234567890abcdef1234567890a',
  governance: '0x890abcdef1234567890abcdef1234567890abcde'
};
```

## 📖 Contract Documentation

### Core Contracts
- [MarketplaceEscrow](./escrow.md) - Order escrow and payment processing
- [ReputationSystem](./reputation.md) - User reputation and reviews
- [PlatformToken](./token.md) - Governance and utility token
- [NFTMarketplace](./nft-marketplace.md) - NFT trading platform
- [GovernanceDAO](./governance.md) - Community governance

### Utility Contracts
- [PaymentRouter](./payment-router.md) - Multi-token payment handling
- [DisputeResolution](./dispute-resolution.md) - Automated dispute handling
- [RewardPool](./reward-pool.md) - User incentive distribution

## 🛠 Integration Guide

### Basic Setup

```javascript
import { ethers } from 'ethers';
import { MarketplaceEscrow__factory } from './typechain';

// Connect to provider
const provider = new ethers.providers.JsonRpcProvider('https://mainnet.infura.io/v3/YOUR-PROJECT-ID');
const signer = provider.getSigner();

// Initialize contract
const escrowContract = MarketplaceEscrow__factory.connect(
  '0x1234567890abcdef1234567890abcdef12345678',
  signer
);
```

### Creating an Order

```javascript
async function createOrder(productDetails, buyerAddress, sellerAddress) {
  const tx = await escrowContract.createOrder(
    sellerAddress,
    ethers.utils.parseEther(productDetails.price),
    productDetails.tokenAddress, // ETH = 0x0000000000000000000000000000000000000000
    Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days delivery deadline
    ethers.utils.keccak256(ethers.utils.toUtf8Bytes(productDetails.hash)),
    {
      value: ethers.utils.parseEther(productDetails.price) // For ETH payments
    }
  );
  
  const receipt = await tx.wait();
  const orderCreatedEvent = receipt.events?.find(e => e.event === 'OrderCreated');
  const orderId = orderCreatedEvent?.args?.orderId;
  
  return { orderId, transactionHash: receipt.transactionHash };
}
```

### Confirming Delivery

```javascript
async function confirmDelivery(orderId) {
  const tx = await escrowContract.confirmDelivery(orderId);
  const receipt = await tx.wait();
  
  return receipt.transactionHash;
}
```

### Submitting a Review

```javascript
async function submitReview(revieweeAddress, rating, ipfsHash, orderId) {
  const reputationContract = ReputationSystem__factory.connect(
    '0x5678901234abcdef5678901234abcdef56789012',
    signer
  );
  
  const tx = await reputationContract.submitReview(
    revieweeAddress,
    rating, // 1-5
    ipfsHash, // IPFS hash of review content
    orderId
  );
  
  const receipt = await tx.wait();
  return receipt.transactionHash;
}
```

## 🔍 Event Monitoring

### Listening to Order Events

```javascript
// Listen for new orders
escrowContract.on('OrderCreated', (orderId, buyer, seller, event) => {
  console.log('New order created:', {
    orderId: orderId.toString(),
    buyer,
    seller,
    blockNumber: event.blockNumber,
    transactionHash: event.transactionHash
  });
});

// Listen for payment releases
escrowContract.on('PaymentReleased', (orderId, seller, amount, event) => {
  console.log('Payment released:', {
    orderId: orderId.toString(),
    seller,
    amount: ethers.utils.formatEther(amount),
    transactionHash: event.transactionHash
  });
});

// Listen for disputes
escrowContract.on('DisputeInitiated', (orderId, initiator, event) => {
  console.log('Dispute initiated:', {
    orderId: orderId.toString(),
    initiator,
    transactionHash: event.transactionHash
  });
});
```

### Historical Event Queries

```javascript
// Get all orders for a specific buyer
const orderFilter = escrowContract.filters.OrderCreated(null, buyerAddress, null);
const orders = await escrowContract.queryFilter(orderFilter, 0, 'latest');

// Get payment history for a seller
const paymentFilter = escrowContract.filters.PaymentReleased(null, sellerAddress, null);
const payments = await escrowContract.queryFilter(paymentFilter, 0, 'latest');
```

## 🧪 Testing Contracts

### Local Development

```javascript
// Using Hardhat for local testing
import { ethers } from 'hardhat';

describe('MarketplaceEscrow', function () {
  let escrow, token, buyer, seller;
  
  beforeEach(async function () {
    [buyer, seller] = await ethers.getSigners();
    
    const EscrowFactory = await ethers.getContractFactory('MarketplaceEscrow');
    escrow = await EscrowFactory.deploy();
    await escrow.deployed();
  });
  
  it('Should create order correctly', async function () {
    const tx = await escrow.connect(buyer).createOrder(
      seller.address,
      ethers.utils.parseEther('1'),
      ethers.constants.AddressZero,
      Math.floor(Date.now() / 1000) + 86400,
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test-product')),
      { value: ethers.utils.parseEther('1') }
    );
    
    const receipt = await tx.wait();
    expect(receipt.events[0].event).to.equal('OrderCreated');
  });
});
```

## 🔒 Security Considerations

### Access Control

All contracts implement role-based access control:

```solidity
// Only order participants can confirm delivery
modifier onlyOrderParticipant(uint256 orderId) {
    Order memory order = orders[orderId];
    require(
        msg.sender == order.buyer || msg.sender == order.seller,
        "Not authorized"
    );
    _;
}
```

### Reentrancy Protection

```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract MarketplaceEscrow is ReentrancyGuard {
    function confirmDelivery(uint256 orderId) external nonReentrant {
        // Safe external calls
    }
}
```

### Emergency Functions

```solidity
// Emergency pause functionality
function emergencyPause() external onlyOwner {
    _pause();
}

// Emergency fund recovery (with timelock)
function emergencyWithdraw(uint256 orderId) external {
    require(block.timestamp > orders[orderId].emergencyWithdrawTime, "Too early");
    // Withdraw logic
}
```

## 📊 Gas Optimization

### Estimated Gas Costs

| Function | Gas Cost | USD (50 gwei) |
|----------|----------|---------------|
| createOrder | ~150,000 | $3.00 |
| confirmDelivery | ~80,000 | $1.60 |
| submitReview | ~120,000 | $2.40 |
| initiateDispute | ~100,000 | $2.00 |

### Optimization Tips

1. **Batch Operations**: Use multicall for multiple operations
2. **Layer 2**: Deploy on Polygon/Arbitrum for lower costs
3. **Gas Estimation**: Always estimate gas before transactions

```javascript
// Estimate gas before transaction
const gasEstimate = await escrowContract.estimateGas.createOrder(
  sellerAddress,
  amount,
  tokenAddress,
  deadline,
  productHash,
  { value: amount }
);

// Add 20% buffer
const gasLimit = gasEstimate.mul(120).div(100);
```

## 🔄 Upgrade Patterns

Contracts use OpenZeppelin's upgradeable pattern:

```javascript
// Upgrade contract (admin only)
const newImplementation = await upgrades.upgradeProxy(
  proxyAddress,
  NewContractFactory
);
```

## 📞 Support

- **Contract Verification**: All contracts are verified on Etherscan
- **Bug Bounty**: Report vulnerabilities to security@web3marketplace.com
- **Developer Chat**: Join our Discord for technical support