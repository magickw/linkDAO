// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title X402PaymentHandler
 * @dev Implementation of x402 payment protocol handler for marketplace transactions
 * This contract processes x402 payments and integrates with the TipRouter contract
 */
contract X402PaymentHandler is Ownable, ReentrancyGuard, Pausable {
    
    // Payment status enum
    enum PaymentStatus {
        Pending,
        Completed,
        Failed,
        Refunded
    }
    
    // Payment structure
    struct Payment {
        bytes32 id;
        bytes32 resourceId;
        address payer;
        uint256 amount;
        PaymentStatus status;
        uint256 timestamp;
        uint256 completedAt;
        string offchainTransactionId; // Reference to Coinbase x402 transaction
    }
    
    // Events
    event PaymentProcessed(
        bytes32 indexed paymentId,
        bytes32 indexed resourceId,
        address indexed payer,
        uint256 amount,
        string offchainTransactionId
    );
    
    event PaymentCompleted(
        bytes32 indexed paymentId,
        uint256 completedAt
    );
    
    event PaymentFailed(
        bytes32 indexed paymentId,
        string reason
    );
    
    event PaymentRefunded(
        bytes32 indexed paymentId,
        uint256 refundedAt
    );
    
    event HandlerUpdated(address indexed newHandler);
    
    // State variables
    mapping(bytes32 => Payment) public payments;
    mapping(bytes32 => bool) public processedPaymentIds;
    
    address public tipRouter;
    uint256 public minPaymentAmount = 0.01 ether; // Minimum payment amount
    
    // Modifiers
    modifier onlyTipRouter() {
        require(msg.sender == tipRouter, "X402PaymentHandler: Only TipRouter can call this function");
        _;
    }
    
    modifier validPaymentAmount(uint256 amount) {
        require(amount >= minPaymentAmount, "X402PaymentHandler: Amount below minimum");
        _;
    }
    
    constructor(address _tipRouter) Ownable(msg.sender) {
        require(_tipRouter != address(0), "X402PaymentHandler: TipRouter cannot be zero address");
        tipRouter = _tipRouter;
    }
    
    /**
     * @dev Process an x402 payment (called by TipRouter)
     * @param resourceId The ID of the resource being paid for (e.g., post ID, creator address)
     * @param amount The payment amount in wei
     * @return paymentId The unique payment identifier
     */
    function processX402Payment(bytes32 resourceId, uint256 amount) 
        external 
        onlyTipRouter 
        nonReentrant 
        whenNotPaused 
        validPaymentAmount(amount) 
        returns (bytes32) 
    {
        // Generate unique payment ID
        bytes32 paymentId = keccak256(abi.encodePacked(
            resourceId,
            msg.sender,
            amount,
            block.timestamp,
            block.prevrandao
        ));
        
        // Ensure payment ID is unique
        require(!processedPaymentIds[paymentId], "X402PaymentHandler: Payment ID already exists");
        
        // Create payment record
        payments[paymentId] = Payment({
            id: paymentId,
            resourceId: resourceId,
            payer: tx.origin, // The original user who initiated the transaction
            amount: amount,
            status: PaymentStatus.Pending,
            timestamp: block.timestamp,
            completedAt: 0,
            offchainTransactionId: "" // Will be set when off-chain payment is confirmed
        });
        
        // Mark payment ID as processed
        processedPaymentIds[paymentId] = true;
        
        emit PaymentProcessed(
            paymentId,
            resourceId,
            tx.origin,
            amount,
            "" // Off-chain transaction ID to be set later
        );
        
        return paymentId;
    }
    
    /**
     * @dev Confirm payment completion after off-chain x402 processing
     * @param paymentId The payment ID to confirm
     * @param offchainTransactionId The Coinbase x402 transaction ID
     */
    function confirmPayment(bytes32 paymentId, string calldata offchainTransactionId) 
        external 
        onlyOwner 
        nonReentrant 
    {
        Payment storage payment = payments[paymentId];
        require(payment.id != bytes32(0), "X402PaymentHandler: Payment not found");
        require(payment.status == PaymentStatus.Pending, "X402PaymentHandler: Payment not pending");
        
        payment.status = PaymentStatus.Completed;
        payment.completedAt = block.timestamp;
        payment.offchainTransactionId = offchainTransactionId;
        
        emit PaymentCompleted(paymentId, block.timestamp);
    }
    
    /**
     * @dev Mark payment as failed
     * @param paymentId The payment ID to mark as failed
     * @param reason The reason for failure
     */
    function markPaymentFailed(bytes32 paymentId, string calldata reason) 
        external 
        onlyOwner 
        nonReentrant 
    {
        Payment storage payment = payments[paymentId];
        require(payment.id != bytes32(0), "X402PaymentHandler: Payment not found");
        require(payment.status == PaymentStatus.Pending, "X402PaymentHandler: Payment not pending");
        
        payment.status = PaymentStatus.Failed;
        
        emit PaymentFailed(paymentId, reason);
    }
    
    /**
     * @dev Refund a payment
     * @param paymentId The payment ID to refund
     */
    function refundPayment(bytes32 paymentId) 
        external 
        onlyOwner 
        nonReentrant 
    {
        Payment storage payment = payments[paymentId];
        require(payment.id != bytes32(0), "X402PaymentHandler: Payment not found");
        require(payment.status == PaymentStatus.Completed, "X402PaymentHandler: Payment not completed");
        
        payment.status = PaymentStatus.Refunded;
        
        emit PaymentRefunded(paymentId, block.timestamp);
    }
    
    /**
     * @dev Verify a payment (view function for external checks)
     * @param paymentId The payment ID to verify
     * @param resourceId The expected resource ID
     * @return valid Whether the payment is valid and completed
     */
    function verifyPayment(bytes32 paymentId, bytes32 resourceId) 
        external 
        view 
        returns (bool) 
    {
        Payment memory payment = payments[paymentId];
        return payment.id != bytes32(0) && 
               payment.resourceId == resourceId && 
               payment.status == PaymentStatus.Completed;
    }
    
    /**
     * @dev Get payment details
     * @param paymentId The payment ID to query
     * @return payment The payment details
     */
    function getPayment(bytes32 paymentId) 
        external 
        view 
        returns (Payment memory) 
    {
        return payments[paymentId];
    }
    
    /**
     * @dev Update TipRouter address
     * @param newTipRouter The new TipRouter address
     */
    function updateTipRouter(address newTipRouter) 
        external 
        onlyOwner 
    {
        require(newTipRouter != address(0), "X402PaymentHandler: New TipRouter cannot be zero address");
        tipRouter = newTipRouter;
        emit HandlerUpdated(newTipRouter);
    }
    
    /**
     * @dev Update minimum payment amount
     * @param newMinAmount The new minimum payment amount
     */
    function updateMinPaymentAmount(uint256 newMinAmount) 
        external 
        onlyOwner 
    {
        require(newMinAmount > 0, "X402PaymentHandler: Minimum amount must be greater than 0");
        minPaymentAmount = newMinAmount;
    }
    
    /**
     * @dev Pause the contract (emergency function)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Emergency function to extract stuck funds (if any)
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}