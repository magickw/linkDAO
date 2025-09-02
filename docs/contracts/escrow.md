# MarketplaceEscrow Contract Documentation

## Overview

The MarketplaceEscrow contract handles secure order processing with automated escrow functionality. It ensures buyer protection and seller payment guarantees through smart contract automation.

## Contract Address

| Network | Address | Verified |
|---------|---------|----------|
| Ethereum Mainnet | `0x1234567890abcdef1234567890abcdef12345678` | ✅ |
| Polygon | `0xabcdef1234567890abcdef1234567890abcdef12` | ✅ |
| Arbitrum | `0x234567890abcdef1234567890abcdef1234567890` | ✅ |

## Contract Interface

```solidity
interface IMarketplaceEscrow {
    struct Order {
        uint256 orderId;
        address buyer;
        address seller;
        uint256 amount;
        address token;
        OrderStatus status;
        uint256 createdAt;
        uint256 deliveryDeadline;
        bytes32 productHash;
        uint256 disputeDeadline;
    }
    
    enum OrderStatus {
        Created,
        Paid,
        Shipped,
        Delivered,
        Disputed,
        Completed,
        Cancelled,
        Refunded
    }
    
    // Events
    event OrderCreated(uint256 indexed orderId, address indexed buyer, address indexed seller, uint256 amount);
    event PaymentReleased(uint256 indexed orderId, address indexed seller, uint256 amount);
    event DisputeInitiated(uint256 indexed orderId, address indexed initiator, string reason);
    event OrderCancelled(uint256 indexed orderId, address indexed canceller);
    event EmergencyRefund(uint256 indexed orderId, address indexed buyer, uint256 amount);
    
    // Core Functions
    function createOrder(
        address seller,
        uint256 amount,
        address token,
        uint256 deliveryDeadline,
        bytes32 productHash
    ) external payable returns (uint256 orderId);
    
    function confirmDelivery(uint256 orderId) external;
    function initiateDispute(uint256 orderId, string calldata reason) external;
    function resolveDispute(uint256 orderId, bool favorBuyer, string calldata resolution) external;
    function emergencyRefund(uint256 orderId) external;
    function cancelOrder(uint256 orderId) external;
    
    // View Functions
    function getOrder(uint256 orderId) external view returns (Order memory);
    function getOrdersByBuyer(address buyer) external view returns (uint256[] memory);
    function getOrdersBySeller(address seller) external view returns (uint256[] memory);
    function calculateFees(uint256 amount) external view returns (uint256 platformFee, uint256 sellerAmount);
}
```

## Usage Examples

### Creating an Order

```javascript
import { ethers } from 'ethers';
import { MarketplaceEscrow__factory } from './typechain';

// Initialize contract
const provider = new ethers.providers.JsonRpcProvider('https://mainnet.infura.io/v3/YOUR-PROJECT-ID');
const signer = provider.getSigner();
const escrowContract = MarketplaceEscrow__factory.connect(
    '0x1234567890abcdef1234567890abcdef12345678',
    signer
);

// Create order
async function createOrder(productDetails) {
    const deliveryDeadline = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7 days
    const productHash = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(JSON.stringify(productDetails))
    );
    
    const tx = await escrowContract.createOrder(
        productDetails.sellerAddress,
        ethers.utils.parseEther(productDetails.price),
        ethers.constants.AddressZero, // ETH payment
        deliveryDeadline,
        productHash,
        {
            value: ethers.utils.parseEther(productDetails.price)
        }
    );
    
    const receipt = await tx.wait();
    const orderCreatedEvent = receipt.events?.find(e => e.event === 'OrderCreated');
    const orderId = orderCreatedEvent?.args?.orderId;
    
    return {
        orderId: orderId.toString(),
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
    };
}

// Example usage
const order = await createOrder({
    sellerAddress: '0x5678901234abcdef5678901234abcdef56789012',
    price: '0.1',
    title: 'Digital Art NFT',
    description: 'Unique digital artwork'
});

console.log('Order created:', order);
```

### Confirming Delivery

```javascript
async function confirmDelivery(orderId) {
    // Only the buyer can confirm delivery
    const tx = await escrowContract.confirmDelivery(orderId);
    const receipt = await tx.wait();
    
    console.log('Delivery confirmed, payment released to seller');
    return receipt.transactionHash;
}

// Example usage
await confirmDelivery(12345);
```

### Handling Disputes

```javascript
async function initiateDispute(orderId, reason) {
    const tx = await escrowContract.initiateDispute(orderId, reason);
    const receipt = await tx.wait();
    
    console.log('Dispute initiated:', receipt.transactionHash);
    return receipt.transactionHash;
}

// Example usage
await initiateDispute(12345, 'Product not as described');
```

### ERC-20 Token Payments

```javascript
import { ERC20__factory } from './typechain';

async function createOrderWithToken(productDetails, tokenAddress) {
    // First approve the escrow contract to spend tokens
    const tokenContract = ERC20__factory.connect(tokenAddress, signer);
    const amount = ethers.utils.parseUnits(productDetails.price, 18); // Assuming 18 decimals
    
    const approveTx = await tokenContract.approve(escrowContract.address, amount);
    await approveTx.wait();
    
    // Create order with token payment
    const deliveryDeadline = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);
    const productHash = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(JSON.stringify(productDetails))
    );
    
    const tx = await escrowContract.createOrder(
        productDetails.sellerAddress,
        amount,
        tokenAddress,
        deliveryDeadline,
        productHash
        // No value field for ERC-20 payments
    );
    
    const receipt = await tx.wait();
    return receipt;
}

// Example with USDC
await createOrderWithToken({
    sellerAddress: '0x5678901234abcdef5678901234abcdef56789012',
    price: '100', // 100 USDC
    title: 'Physical Product'
}, '0xA0b86a33E6441c8C06DD2c2b4b2B3c4B5C6D7E8F'); // USDC contract address
```

## Event Monitoring

### Real-time Order Tracking

```javascript
// Listen for order events
escrowContract.on('OrderCreated', (orderId, buyer, seller, amount, event) => {
    console.log('New order:', {
        orderId: orderId.toString(),
        buyer,
        seller,
        amount: ethers.utils.formatEther(amount),
        transactionHash: event.transactionHash
    });
});

escrowContract.on('PaymentReleased', (orderId, seller, amount, event) => {
    console.log('Payment released:', {
        orderId: orderId.toString(),
        seller,
        amount: ethers.utils.formatEther(amount),
        transactionHash: event.transactionHash
    });
});

escrowContract.on('DisputeInitiated', (orderId, initiator, reason, event) => {
    console.log('Dispute initiated:', {
        orderId: orderId.toString(),
        initiator,
        reason,
        transactionHash: event.transactionHash
    });
});
```

### Historical Data Queries

```javascript
// Get all orders for a specific buyer
async function getBuyerOrders(buyerAddress) {
    const filter = escrowContract.filters.OrderCreated(null, buyerAddress, null, null);
    const events = await escrowContract.queryFilter(filter, 0, 'latest');
    
    return events.map(event => ({
        orderId: event.args.orderId.toString(),
        seller: event.args.seller,
        amount: ethers.utils.formatEther(event.args.amount),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
    }));
}

// Get payment history for a seller
async function getSellerPayments(sellerAddress) {
    const filter = escrowContract.filters.PaymentReleased(null, sellerAddress, null);
    const events = await escrowContract.queryFilter(filter, 0, 'latest');
    
    return events.map(event => ({
        orderId: event.args.orderId.toString(),
        amount: ethers.utils.formatEther(event.args.amount),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
    }));
}
```

## Security Features

### Multi-signature Protection

For high-value transactions (>10 ETH), the contract requires multi-signature approval:

```javascript
// Check if order requires multi-sig
async function requiresMultiSig(amount) {
    const threshold = ethers.utils.parseEther('10');
    return amount.gte(threshold);
}

// Multi-sig order creation (for high-value items)
async function createMultiSigOrder(productDetails, signers) {
    if (await requiresMultiSig(ethers.utils.parseEther(productDetails.price))) {
        // Collect signatures from multiple parties
        const signatures = await collectSignatures(productDetails, signers);
        
        const tx = await escrowContract.createMultiSigOrder(
            productDetails.sellerAddress,
            ethers.utils.parseEther(productDetails.price),
            ethers.constants.AddressZero,
            deliveryDeadline,
            productHash,
            signatures,
            { value: ethers.utils.parseEther(productDetails.price) }
        );
        
        return tx.wait();
    }
}
```

### Time-locked Releases

```javascript
// Emergency refund after deadline
async function emergencyRefund(orderId) {
    const order = await escrowContract.getOrder(orderId);
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Can only refund after dispute deadline has passed
    if (currentTime > order.disputeDeadline) {
        const tx = await escrowContract.emergencyRefund(orderId);
        return tx.wait();
    } else {
        throw new Error('Emergency refund not yet available');
    }
}
```

## Gas Optimization

### Estimated Gas Costs

| Function | Estimated Gas | Cost (50 gwei) |
|----------|---------------|----------------|
| createOrder | 150,000 | ~$3.00 |
| confirmDelivery | 80,000 | ~$1.60 |
| initiateDispute | 100,000 | ~$2.00 |
| resolveDispute | 120,000 | ~$2.40 |

### Gas Optimization Tips

```javascript
// Batch operations to save gas
async function batchConfirmDeliveries(orderIds) {
    const calls = orderIds.map(id => 
        escrowContract.interface.encodeFunctionData('confirmDelivery', [id])
    );
    
    // Use multicall contract for batch execution
    const multicallTx = await multicallContract.aggregate(calls);
    return multicallTx.wait();
}

// Estimate gas before transaction
async function estimateGasForOrder(productDetails) {
    const gasEstimate = await escrowContract.estimateGas.createOrder(
        productDetails.sellerAddress,
        ethers.utils.parseEther(productDetails.price),
        ethers.constants.AddressZero,
        deliveryDeadline,
        productHash,
        { value: ethers.utils.parseEther(productDetails.price) }
    );
    
    // Add 20% buffer
    const gasLimit = gasEstimate.mul(120).div(100);
    
    return {
        estimate: gasEstimate.toString(),
        recommended: gasLimit.toString()
    };
}
```

## Error Handling

### Common Errors and Solutions

```javascript
try {
    await escrowContract.createOrder(/* parameters */);
} catch (error) {
    if (error.code === 'INSUFFICIENT_FUNDS') {
        console.error('Insufficient funds for transaction');
    } else if (error.message.includes('Order already exists')) {
        console.error('Duplicate order detected');
    } else if (error.message.includes('Invalid seller address')) {
        console.error('Seller address is invalid');
    } else if (error.message.includes('Delivery deadline too short')) {
        console.error('Delivery deadline must be at least 24 hours');
    } else {
        console.error('Unknown error:', error.message);
    }
}
```

### Transaction Retry Logic

```javascript
async function createOrderWithRetry(productDetails, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const tx = await escrowContract.createOrder(/* parameters */);
            return await tx.wait();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        }
    }
}
```

## Testing

### Unit Tests

```javascript
describe('MarketplaceEscrow', function () {
    let escrow, buyer, seller, token;
    
    beforeEach(async function () {
        [buyer, seller] = await ethers.getSigners();
        
        const EscrowFactory = await ethers.getContractFactory('MarketplaceEscrow');
        escrow = await EscrowFactory.deploy();
        await escrow.deployed();
    });
    
    it('should create order correctly', async function () {
        const amount = ethers.utils.parseEther('1');
        const deadline = Math.floor(Date.now() / 1000) + 86400;
        const productHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test'));
        
        const tx = await escrow.connect(buyer).createOrder(
            seller.address,
            amount,
            ethers.constants.AddressZero,
            deadline,
            productHash,
            { value: amount }
        );
        
        const receipt = await tx.wait();
        const event = receipt.events.find(e => e.event === 'OrderCreated');
        
        expect(event.args.buyer).to.equal(buyer.address);
        expect(event.args.seller).to.equal(seller.address);
        expect(event.args.amount).to.equal(amount);
    });
    
    it('should release payment on delivery confirmation', async function () {
        // Create order first
        const orderId = await createTestOrder();
        
        // Confirm delivery
        await escrow.connect(buyer).confirmDelivery(orderId);
        
        // Check that payment was released
        const order = await escrow.getOrder(orderId);
        expect(order.status).to.equal(OrderStatus.Completed);
    });
});
```

## Integration Checklist

- [ ] Contract addresses configured for target network
- [ ] Event listeners set up for order tracking
- [ ] Error handling implemented for all contract calls
- [ ] Gas estimation and optimization in place
- [ ] Multi-signature setup for high-value transactions
- [ ] Emergency procedures documented and tested
- [ ] Monitoring and alerting configured
- [ ] Backup and recovery procedures established

## Support

For technical support with the MarketplaceEscrow contract:

- **Documentation**: [Full Contract Docs](https://docs.web3marketplace.com/contracts/escrow)
- **GitHub Issues**: [Report Issues](https://github.com/web3marketplace/contracts/issues)
- **Discord**: [Developer Support](https://discord.gg/web3marketplace-dev)
- **Email**: contracts@web3marketplace.com