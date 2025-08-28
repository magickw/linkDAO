// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./LinkDAOToken.sol";
import "./Governance.sol";

/**
 * @title LinkDAO Enhanced Escrow
 * @notice Enhanced escrow contract with automated release, delivery tracking, reputation integration, 
 *         community dispute resolution, and notification system
 */
contract EnhancedEscrow is ReentrancyGuard, Ownable {
    // Enum for escrow status
    enum EscrowStatus { 
        CREATED, 
        FUNDS_LOCKED, 
        DELIVERY_CONFIRMED, 
        DISPUTE_OPENED, 
        RESOLVED_BUYER_WINS, 
        RESOLVED_SELLER_WINS,
        CANCELLED
    }
    
    // Enum for dispute resolution method
    enum DisputeResolutionMethod { 
        AUTOMATIC, 
        COMMUNITY_VOTING, 
        ARBITRATOR 
    }
    
    // Struct for escrow details
    struct Escrow {
        uint256 id;
        uint256 listingId;
        address buyer;
        address seller;
        address tokenAddress; // Address of the ERC20 token (address(0) for ETH)
        uint256 amount;
        uint256 feeAmount; // Platform fee amount
        string deliveryInfo; // Delivery tracking information
        uint256 deliveryDeadline; // Deadline for delivery
        uint256 createdAt;
        uint256 resolvedAt;
        EscrowStatus status;
        DisputeResolutionMethod resolutionMethod;
        // Community voting fields
        uint256 votesForBuyer;
        uint256 votesForSeller;
        uint256 totalVotingPower;
        mapping(address => bool) hasVoted;
        // Arbitrator fields
        address appointedArbitrator;
        string evidenceSubmitted;
    }
    
    // Struct for reputation update
    struct ReputationUpdate {
        address user;
        int256 scoreChange; // Positive for good behavior, negative for bad
        string reason;
        uint256 timestamp;
    }
    
    // Struct for notification
    struct Notification {
        address recipient;
        string message;
        uint256 timestamp;
        bool read;
    }
    
    // Mapping of escrow ID to Escrow
    mapping(uint256 => Escrow) public escrows;
    
    // Mapping of user address to reputation score
    mapping(address => uint256) public reputationScores;
    
    // Mapping of user address to whether they are DAO approved
    mapping(address => bool) public daoApprovedVendors;
    
    // Counter for escrow IDs
    uint256 public nextEscrowId = 1;
    
    // Platform fee (in basis points, e.g., 100 = 1%)
    uint256 public platformFee = 100;
    
    // Minimum reputation score to be a vendor
    uint256 public minReputationScore = 50;
    
    // Delivery deadline (in days)
    uint256 public deliveryDeadlineDays = 14;
    
    // Reference to Governance contract for community voting
    Governance public governance;
    
    // Events
    event EscrowCreated(
        uint256 indexed escrowId,
        uint256 listingId,
        address buyer,
        address seller,
        address tokenAddress,
        uint256 amount
    );
    
    event FundsLocked(
        uint256 indexed escrowId,
        uint256 amount
    );
    
    event DeliveryConfirmed(
        uint256 indexed escrowId,
        string deliveryInfo
    );
    
    event EscrowApproved(
        uint256 indexed escrowId,
        address approver
    );
    
    event EscrowResolved(
        uint256 indexed escrowId,
        EscrowStatus status,
        address resolver
    );
    
    event DisputeOpened(
        uint256 indexed escrowId,
        address opener,
        string reason
    );
    
    event EvidenceSubmitted(
        uint256 indexed escrowId,
        address submitter,
        string evidence
    );
    
    event VoteCast(
        uint256 indexed escrowId,
        address voter,
        bool voteForBuyer,
        uint256 votingPower
    );
    
    event ReputationUpdated(
        address indexed user,
        int256 scoreChange,
        uint256 newScore,
        string reason
    );
    
    event NotificationSent(
        address indexed recipient,
        string message,
        uint256 timestamp
    );
    
    // Modifiers
    modifier onlyBuyer(uint256 escrowId) {
        require(escrows[escrowId].buyer == msg.sender, "Not the buyer");
        _;
    }
    
    modifier onlySeller(uint256 escrowId) {
        require(escrows[escrowId].seller == msg.sender, "Not the seller");
        _;
    }
    
    modifier onlyBuyerOrSeller(uint256 escrowId) {
        require(
            escrows[escrowId].buyer == msg.sender || 
            escrows[escrowId].seller == msg.sender, 
            "Not the buyer or seller"
        );
        _;
    }
    
    modifier onlyArbitrator(uint256 escrowId) {
        require(escrows[escrowId].appointedArbitrator == msg.sender, "Not the arbitrator");
        _;
    }
    
    modifier onlyDAO() {
        // In a real implementation, this would check if the caller is a DAO member
        // For now, we'll allow the contract owner to act as the DAO
        require(msg.sender == owner(), "Not DAO");
        _;
    }
    
    modifier escrowExists(uint256 escrowId) {
        require(escrows[escrowId].id != 0, "Escrow does not exist");
        _;
    }
    
    modifier escrowInStatus(uint256 escrowId, EscrowStatus status) {
        require(escrows[escrowId].status == status, "Escrow not in required status");
        _;
    }
    
    /**
     * @notice Constructor
     * @param governanceAddress Address of the Governance contract
     */
    constructor(address governanceAddress) {
        governance = Governance(governanceAddress);
    }
    
    /**
     * @notice Create a new escrow
     * @param listingId ID of the listing
     * @param buyer Address of the buyer
     * @param seller Address of the seller
     * @param tokenAddress Address of the ERC20 token (address(0) for ETH)
     * @param amount Amount to be escrowed
     * @return ID of the created escrow
     */
    function createEscrow(
        uint256 listingId,
        address buyer,
        address seller,
        address tokenAddress,
        uint256 amount
    ) external onlyOwner returns (uint256) {
        uint256 escrowId = nextEscrowId++;
        
        // Calculate platform fee
        uint256 feeAmount = (amount * platformFee) / 10000;
        
        escrows[escrowId] = Escrow({
            id: escrowId,
            listingId: listingId,
            buyer: buyer,
            seller: seller,
            tokenAddress: tokenAddress,
            amount: amount,
            feeAmount: feeAmount,
            deliveryInfo: "",
            deliveryDeadline: block.timestamp + (deliveryDeadlineDays * 1 days),
            createdAt: block.timestamp,
            resolvedAt: 0,
            status: EscrowStatus.CREATED,
            resolutionMethod: DisputeResolutionMethod.COMMUNITY_VOTING,
            votesForBuyer: 0,
            votesForSeller: 0,
            totalVotingPower: 0,
            appointedArbitrator: address(0)
        });
        
        emit EscrowCreated(escrowId, listingId, buyer, seller, tokenAddress, amount);
        
        // Send notification to buyer and seller
        _sendNotification(buyer, string(abi.encodePacked("Escrow #", _toString(escrowId), " created for your purchase")));
        _sendNotification(seller, string(abi.encodePacked("Escrow #", _toString(escrowId), " created for your sale")));
        
        return escrowId;
    }
    
    /**
     * @notice Lock funds in escrow
     * @param escrowId ID of the escrow
     */
    function lockFunds(uint256 escrowId) external payable escrowExists(escrowId) nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        
        require(escrow.status == EscrowStatus.CREATED, "Escrow not in CREATED status");
        
        // Transfer funds to escrow
        if (escrow.tokenAddress == address(0)) {
            // ETH payment
            require(msg.value == escrow.amount, "Incorrect ETH amount");
        } else {
            // ERC20 payment
            require(msg.value == 0, "No ETH should be sent for ERC20 payments");
            IERC20 token = IERC20(escrow.tokenAddress);
            require(token.transferFrom(msg.sender, address(this), escrow.amount), "Token transfer failed");
        }
        
        escrow.status = EscrowStatus.FUNDS_LOCKED;
        
        emit FundsLocked(escrowId, escrow.amount);
        
        // Send notification to seller
        _sendNotification(escrow.seller, string(abi.encodePacked("Funds locked in escrow #", _toString(escrowId), ". Please ship the item.")));
    }
    
    /**
     * @notice Confirm delivery by seller
     * @param escrowId ID of the escrow
     * @param deliveryInfo Delivery tracking information
     */
    function confirmDelivery(uint256 escrowId, string calldata deliveryInfo) external onlySeller(escrowId) escrowExists(escrowId) {
        Escrow storage escrow = escrows[escrowId];
        
        require(escrow.status == EscrowStatus.FUNDS_LOCKED, "Funds not locked");
        
        escrow.deliveryInfo = deliveryInfo;
        escrow.status = EscrowStatus.DELIVERY_CONFIRMED;
        
        emit DeliveryConfirmed(escrowId, deliveryInfo);
        
        // Send notification to buyer
        _sendNotification(escrow.buyer, string(abi.encodePacked("Delivery confirmed for escrow #", _toString(escrowId), ". Please review and approve.")));
    }
    
    /**
     * @notice Approve escrow by buyer (releases funds to seller)
     * @param escrowId ID of the escrow
     */
    function approveEscrow(uint256 escrowId) external onlyBuyer(escrowId) escrowExists(escrowId) {
        Escrow storage escrow = escrows[escrowId];
        
        require(escrow.status == EscrowStatus.DELIVERY_CONFIRMED, "Delivery not confirmed");
        
        // Release funds to seller
        _releaseFundsToSeller(escrowId);
        
        escrow.status = EscrowStatus.RESOLVED_SELLER_WINS;
        escrow.resolvedAt = block.timestamp;
        
        emit EscrowApproved(escrowId, msg.sender);
        emit EscrowResolved(escrowId, escrow.status, msg.sender);
        
        // Update reputation scores
        _updateReputation(escrow.seller, 5, "Successful transaction");
        _updateReputation(escrow.buyer, 2, "Completed purchase");
        
        // Send notification
        _sendNotification(escrow.seller, string(abi.encodePacked("Escrow #", _toString(escrowId), " approved. Funds released to you.")));
    }
    
    /**
     * @notice Open a dispute
     * @param escrowId ID of the escrow
     * @param reason Reason for dispute
     */
    function openDispute(uint256 escrowId, string calldata reason) external onlyBuyerOrSeller(escrowId) escrowExists(escrowId) {
        Escrow storage escrow = escrows[escrowId];
        
        require(
            escrow.status == EscrowStatus.FUNDS_LOCKED || 
            escrow.status == EscrowStatus.DELIVERY_CONFIRMED, 
            "Cannot open dispute in current status"
        );
        
        escrow.status = EscrowStatus.DISPUTE_OPENED;
        
        emit DisputeOpened(escrowId, msg.sender, reason);
        
        // Send notification to other party and DAO
        if (msg.sender == escrow.buyer) {
            _sendNotification(escrow.seller, string(abi.encodePacked("Dispute opened on escrow #", _toString(escrowId), " by buyer: ", reason)));
        } else {
            _sendNotification(escrow.buyer, string(abi.encodePacked("Dispute opened on escrow #", _toString(escrowId), " by seller: ", reason)));
        }
        _sendNotification(owner(), string(abi.encodePacked("Dispute opened on escrow #", _toString(escrowId), ": ", reason)));
    }
    
    /**
     * @notice Submit evidence for dispute
     * @param escrowId ID of the escrow
     * @param evidence Evidence string (could be IPFS hash)
     */
    function submitEvidence(uint256 escrowId, string calldata evidence) external onlyBuyerOrSeller(escrowId) escrowExists(escrowId) {
        Escrow storage escrow = escrows[escrowId];
        
        require(escrow.status == EscrowStatus.DISPUTE_OPENED, "No dispute opened");
        
        escrow.evidenceSubmitted = evidence;
        
        emit EvidenceSubmitted(escrowId, msg.sender, evidence);
        
        // Send notification to other party
        if (msg.sender == escrow.buyer) {
            _sendNotification(escrow.seller, string(abi.encodePacked("Evidence submitted for escrow #", _toString(escrowId), " by buyer")));
        } else {
            _sendNotification(escrow.buyer, string(abi.encodePacked("Evidence submitted for escrow #", _toString(escrowId), " by seller")));
        }
    }
    
    /**
     * @notice Cast vote in community dispute resolution
     * @param escrowId ID of the escrow
     * @param voteForBuyer True if voting for buyer, false if for seller
     */
    function castVote(uint256 escrowId, bool voteForBuyer) external escrowExists(escrowId) {
        Escrow storage escrow = escrows[escrowId];
        
        require(escrow.status == EscrowStatus.DISPUTE_OPENED, "No dispute opened");
        require(!escrow.hasVoted[msg.sender], "Already voted");
        require(escrow.resolutionMethod == DisputeResolutionMethod.COMMUNITY_VOTING, "Not community voting");
        
        // Get voter's reputation score as voting power
        uint256 votingPower = reputationScores[msg.sender];
        require(votingPower > 0, "No voting power");
        
        // Record vote
        escrow.hasVoted[msg.sender] = true;
        if (voteForBuyer) {
            escrow.votesForBuyer += votingPower;
        } else {
            escrow.votesForSeller += votingPower;
        }
        escrow.totalVotingPower += votingPower;
        
        emit VoteCast(escrowId, msg.sender, voteForBuyer, votingPower);
        
        // Check if voting is complete (simple majority with 10% quorum)
        uint256 quorum = (reputationScores[escrow.buyer] + reputationScores[escrow.seller]) * 10 / 100;
        if (escrow.totalVotingPower >= quorum) {
            _resolveDisputeByVoting(escrowId);
        }
    }
    
    /**
     * @notice Resolve dispute by appointed arbitrator
     * @param escrowId ID of the escrow
     * @param buyerWins True if buyer wins, false if seller wins
     */
    function resolveDisputeByArbitrator(uint256 escrowId, bool buyerWins) external onlyArbitrator(escrowId) escrowExists(escrowId) {
        Escrow storage escrow = escrows[escrowId];
        
        require(escrow.status == EscrowStatus.DISPUTE_OPENED, "No dispute opened");
        require(escrow.resolutionMethod == DisputeResolutionMethod.ARBITRATOR, "Not arbitrator resolution");
        
        _resolveDispute(escrowId, buyerWins);
    }
    
    /**
     * @notice Internal function to release funds to seller
     * @param escrowId ID of the escrow
     */
    function _releaseFundsToSeller(uint256 escrowId) internal {
        Escrow storage escrow = escrows[escrowId];
        
        uint256 sellerAmount = escrow.amount - escrow.feeAmount;
        
        if (escrow.tokenAddress == address(0)) {
            // ETH payment
            payable(escrow.seller).transfer(sellerAmount);
            // Platform fee is kept in the contract
        } else {
            // ERC20 payment
            IERC20 token = IERC20(escrow.tokenAddress);
            require(token.transfer(escrow.seller, sellerAmount), "Token transfer to seller failed");
            // Platform fee is kept in the contract
        }
    }
    
    /**
     * @notice Internal function to refund buyer
     * @param escrowId ID of the escrow
     */
    function _refundBuyer(uint256 escrowId) internal {
        Escrow storage escrow = escrows[escrowId];
        
        if (escrow.tokenAddress == address(0)) {
            // ETH payment
            payable(escrow.buyer).transfer(escrow.amount);
        } else {
            // ERC20 payment
            IERC20 token = IERC20(escrow.tokenAddress);
            require(token.transfer(escrow.buyer, escrow.amount), "Token transfer to buyer failed");
        }
    }
    
    /**
     * @notice Internal function to resolve dispute by voting
     * @param escrowId ID of the escrow
     */
    function _resolveDisputeByVoting(uint256 escrowId) internal {
        Escrow storage escrow = escrows[escrowId];
        
        // Simple majority wins
        bool buyerWins = escrow.votesForBuyer > escrow.votesForSeller;
        _resolveDispute(escrowId, buyerWins);
    }
    
    /**
     * @notice Internal function to resolve dispute
     * @param escrowId ID of the escrow
     * @param buyerWins True if buyer wins, false if seller wins
     */
    function _resolveDispute(uint256 escrowId, bool buyerWins) internal {
        Escrow storage escrow = escrows[escrowId];
        
        escrow.resolvedAt = block.timestamp;
        
        if (buyerWins) {
            // Refund buyer
            _refundBuyer(escrowId);
            escrow.status = EscrowStatus.RESOLVED_BUYER_WINS;
            
            // Update reputation scores
            _updateReputation(escrow.buyer, 3, "Won dispute");
            _updateReputation(escrow.seller, -5, "Lost dispute");
        } else {
            // Release funds to seller
            _releaseFundsToSeller(escrowId);
            escrow.status = EscrowStatus.RESOLVED_SELLER_WINS;
            
            // Update reputation scores
            _updateReputation(escrow.seller, 3, "Won dispute");
            _updateReputation(escrow.buyer, -5, "Lost dispute");
        }
        
        emit EscrowResolved(escrowId, escrow.status, msg.sender);
        
        // Send notifications
        if (buyerWins) {
            _sendNotification(escrow.buyer, string(abi.encodePacked("Dispute resolved in your favor for escrow #", _toString(escrowId))));
            _sendNotification(escrow.seller, string(abi.encodePacked("Dispute resolved against you for escrow #", _toString(escrowId))));
        } else {
            _sendNotification(escrow.seller, string(abi.encodePacked("Dispute resolved in your favor for escrow #", _toString(escrowId))));
            _sendNotification(escrow.buyer, string(abi.encodePacked("Dispute resolved against you for escrow #", _toString(escrowId))));
        }
    }
    
    /**
     * @notice Internal function to update reputation
     * @param user Address of the user
     * @param scoreChange Change in reputation score (positive or negative)
     * @param reason Reason for the change
     */
    function _updateReputation(address user, int256 scoreChange, string memory reason) internal {
        uint256 currentScore = reputationScores[user];
        int256 newScoreInt = int256(currentScore) + scoreChange;
        
        // Ensure score doesn't go below 0
        uint256 newScore = newScoreInt < 0 ? 0 : uint256(newScoreInt);
        
        reputationScores[user] = newScore;
        
        emit ReputationUpdated(user, scoreChange, newScore, reason);
    }
    
    /**
     * @notice Internal function to send notification
     * @param recipient Address of the recipient
     * @param message Notification message
     */
    function _sendNotification(address recipient, string memory message) internal {
        emit NotificationSent(recipient, message, block.timestamp);
        
        // In a real implementation, this would store the notification in a mapping
        // or emit an event that the backend can listen to
    }
    
    /**
     * @notice Internal function to convert uint to string
     * @param value Uint value to convert
     * @return String representation
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
    
    /**
     * @notice Set platform fee
     * @param newFee New platform fee in basis points
     */
    function setPlatformFee(uint256 newFee) external onlyDAO {
        require(newFee <= 1000, "Fee too high (max 10%)"); // Max 10%
        platformFee = newFee;
    }
    
    /**
     * @notice Set minimum reputation score
     * @param newScore New minimum reputation score
     */
    function setMinReputationScore(uint256 newScore) external onlyDAO {
        minReputationScore = newScore;
    }
    
    /**
     * @notice Set delivery deadline days
     * @param days New delivery deadline in days
     */
    function setDeliveryDeadlineDays(uint256 newDays) external onlyDAO {
        deliveryDeadlineDays = newDays;
    }
    
    /**
     * @notice Approve or revoke DAO vendor status
     * @param vendor Address of the vendor
     * @param approved Whether to approve or revoke
     */
    function setDAOApprovedVendor(address vendor, bool approved) external onlyDAO {
        daoApprovedVendors[vendor] = approved;
    }
    
    /**
     * @notice Get escrow details
     * @param escrowId ID of the escrow
     * @return Escrow details
     */
    function getEscrow(uint256 escrowId) external view returns (Escrow memory) {
        return escrows[escrowId];
    }
    
    /**
     * @notice Get user reputation score
     * @param user Address of the user
     * @return Reputation score
     */
    function getReputationScore(address user) external view returns (uint256) {
        return reputationScores[user];
    }
    
    // Fallback function to receive ETH
    receive() external payable {}
}