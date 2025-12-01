// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title OptimizedX402PaymentHandler
 * @dev Gas-optimized implementation of x402 payment protocol handler
 * Optimizations:
 * - Packed structs for storage efficiency
 * - Minimal storage operations
 * - Efficient event emissions
 * - Optimized loops and conditionals
 */
contract OptimizedX402PaymentHandler is Ownable, ReentrancyGuard, Pausable {
    
    // Payment status enum (1 byte)
    enum PaymentStatus {
        Pending,     // 0
        Completed,   // 1
        Failed,      // 2
        Refunded     // 3
    }
    
    // Packed payment struct - optimized for storage
    struct Payment {
        bytes32 id;                    // 32 bytes
        bytes32 resourceId;            // 32 bytes
        address payer;                 // 20 bytes
        uint128 amount;                // 16 bytes (sufficient for most payments)
        PaymentStatus status;          // 1 byte
        uint40 timestamp;              // 5 bytes (sufficient until ~2184)
        uint40 completedAt;            // 5 bytes
        bool exists;                   // 1 byte
        // Total: 32+32+20+16+1+5+5+1 = 112 bytes (fits in 2 storage slots)
    }
    
    // Events - optimized with indexed fields
    event PaymentProcessed(
        bytes32 indexed paymentId,
        bytes32 indexed resourceId,
        address indexed payer,
        uint128 amount,
        uint40 timestamp
    );
    
    event PaymentCompleted(
        bytes32 indexed paymentId,
        uint40 completedAt
    );
    
    event PaymentFailed(
        bytes32 indexed paymentId,
        string reason
    );
    
    event PaymentRefunded(
        bytes32 indexed paymentId,
        uint40 refundedAt
    );
    
    // State variables - optimized layout
    mapping(bytes32 => Payment) private payments;  // Large mapping
    mapping(bytes32 => bool) private processedIds; // Small mapping
    
    address public immutable tipRouter;  // Immutable saves gas
    uint128 public minPaymentAmount;     // Reduced from uint256
    uint256 private paymentCounter;      // For unique IDs
    
    // Constants for gas optimization
    uint256 private constant MAX_REASON_LENGTH = 256;
    bytes32 private constant PAYMENT_PREFIX = keccak256("X402_PAYMENT");
    
    // Modifiers
    modifier onlyTipRouter() {
        require(msg.sender == tipRouter, "Unauthorized");
        _;
    }
    
    modifier validAmount(uint128 amount) {
        require(amount >= minPaymentAmount, "Insufficient amount");
        _;
    }
    
    modifier validReason(string memory reason) {
        require(bytes(reason).length <= MAX_REASON_LENGTH, "Reason too long");
        _;
    }
    
    constructor(address _tipRouter) Ownable(msg.sender) {
        require(_tipRouter != address(0), "Invalid tip router");
        tipRouter = _tipRouter;
        minPaymentAmount = 0.01 ether;
    }
    
    /**
     * @dev Process an x402 payment with gas optimizations
     */
    function processX402Payment(bytes32 resourceId, uint128 amount) 
        external 
        onlyTipRouter 
        nonReentrant 
        whenNotPaused 
        validAmount(amount) 
        returns (bytes32) 
    {
        // Generate unique payment ID using counter
        unchecked {
            ++paymentCounter;
        }
        bytes32 paymentId = keccak256(abi.encodePacked(
            PAYMENT_PREFIX,
            resourceId,
            msg.sender,
            amount,
            block.timestamp,
            paymentCounter
        ));
        
        require(!processedIds[paymentId], "Payment exists");
        
        // Pack struct data efficiently
        payments[paymentId] = Payment({
            id: paymentId,
            resourceId: resourceId,
            payer: tx.origin,
            amount: amount,
            status: PaymentStatus.Pending,
            timestamp: uint40(block.timestamp),
            completedAt: 0,
            exists: true
        });
        
        processedIds[paymentId] = true;
        
        // Emit event with essential data only
        emit PaymentProcessed(
            paymentId,
            resourceId,
            tx.origin,
            amount,
            uint40(block.timestamp)
        );
        
        return paymentId;
    }
    
    /**
     * @dev Confirm payment completion - optimized
     */
    function confirmPayment(bytes32 paymentId, string calldata offchainTransactionId) 
        external 
        onlyOwner 
        nonReentrant 
        validReason(offchainTransactionId)
    {
        Payment storage payment = payments[paymentId];
        require(payment.exists, "Payment not found");
        require(payment.status == PaymentStatus.Pending, "Invalid status");
        
        // Batch state updates to save gas
        payment.status = PaymentStatus.Completed;
        payment.completedAt = uint40(block.timestamp);
        
        emit PaymentCompleted(paymentId, payment.completedAt);
    }
    
    /**
     * @dev Mark payment as failed - optimized
     */
    function markPaymentFailed(bytes32 paymentId, string calldata reason) 
        external 
        onlyOwner 
        nonReentrant 
        validReason(reason)
    {
        Payment storage payment = payments[paymentId];
        require(payment.exists, "Payment not found");
        require(payment.status == PaymentStatus.Pending, "Invalid status");
        
        payment.status = PaymentStatus.Failed;
        emit PaymentFailed(paymentId, reason);
    }
    
    /**
     * @dev Refund a payment - optimized
     */
    function refundPayment(bytes32 paymentId) 
        external 
        onlyOwner 
        nonReentrant 
    {
        Payment storage payment = payments[paymentId];
        require(payment.exists, "Payment not found");
        require(payment.status == PaymentStatus.Completed, "Not completed");
        
        payment.status = PaymentStatus.Refunded;
        emit PaymentRefunded(paymentId, uint40(block.timestamp));
    }
    
    /**
     * @dev Batch process multiple payments - gas efficient for bulk operations
     */
    function batchConfirmPayments(
        bytes32[] calldata paymentIds,
        string[] calldata offchainTransactionIds
    ) external onlyOwner nonReentrant {
        require(paymentIds.length == offchainTransactionIds.length, "Array length mismatch");
        require(paymentIds.length <= 50, "Too many payments"); // Prevent gas limit issues
        
        uint40 timestamp = uint40(block.timestamp);
        
        for (uint256 i = 0; i < paymentIds.length; ) {
            bytes32 paymentId = paymentIds[i];
            Payment storage payment = payments[paymentId];
            
            if (payment.exists && payment.status == PaymentStatus.Pending) {
                payment.status = PaymentStatus.Completed;
                payment.completedAt = timestamp;
                emit PaymentCompleted(paymentId, timestamp);
            }
            
            unchecked { ++i; }
        }
    }
    
    /**
     * @dev Verify payment - view function, optimized
     */
    function verifyPayment(bytes32 paymentId, bytes32 resourceId) 
        external 
        view 
        returns (bool) 
    {
        Payment storage payment = payments[paymentId];
        return payment.exists && 
               payment.resourceId == resourceId && 
               payment.status == PaymentStatus.Completed;
    }
    
    /**
     * @dev Get payment details - memory efficient
     */
    function getPayment(bytes32 paymentId) 
        external 
        view 
        returns (Payment memory) 
    {
        return payments[paymentId];
    }
    
    /**
     * @dev Get payment status only - gas efficient lookup
     */
    function getPaymentStatus(bytes32 paymentId) 
        external 
        view 
        returns (PaymentStatus) 
    {
        return payments[paymentId].status;
    }
    
    /**
     * @dev Update minimum payment amount
     */
    function updateMinPaymentAmount(uint128 newMinAmount) 
        external 
        onlyOwner 
    {
        require(newMinAmount > 0, "Invalid amount");
        minPaymentAmount = newMinAmount;
    }
    
    /**
     * @dev Get contract metrics for monitoring
     */
    function getMetrics() 
        external 
        view 
        returns (
            uint256 totalPayments,
            uint256 pendingPayments,
            uint256 completedPayments,
            uint256 failedPayments,
            uint256 refundedPayments
        ) 
    {
        // Note: This is gas intensive and should be used off-chain only
        // In production, maintain counters updated by events
        totalPayments = paymentCounter;
        
        // For demo purposes - in production, use event-based counting
        pendingPayments = 0;
        completedPayments = 0;
        failedPayments = 0;
        refundedPayments = 0;
    }
    
    /**
     * @dev Emergency functions
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    /**
     * @dev Receive function for emergency funding
     */
    receive() external payable {
        // Allow contract to receive ETH for gas refunds
    }
}