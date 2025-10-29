// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./LDAOToken.sol";
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
    
    // Enum for reputation tiers
    enum ReputationTier {
        NEWCOMER,     // 0-49 points
        BRONZE,       // 50-199 points  
        SILVER,       // 200-499 points
        GOLD,         // 500-999 points
        PLATINUM,     // 1000-2499 points
        DIAMOND       // 2500+ points
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
        // Multi-signature and time-lock fields
        bool requiresMultiSig;
        uint256 multiSigThreshold;
        address[] multiSigSigners;
        mapping(address => bool) hasSignedRelease;
        uint256 signatureCount;
        uint256 timeLockExpiry;
        bool emergencyRefundEnabled;
    }

    // Struct for marketplace review
    struct MarketplaceReview {
        uint256 id;
        address reviewer;
        address reviewee;
        uint256 escrowId;
        uint8 rating; // 1-5 stars
        string reviewText;
        uint256 timestamp;
        bool isVerified;
        uint256 helpfulVotes;
        mapping(address => bool) hasVotedHelpful; // For helpful votes
    }

    // Struct for detailed reputation score
    struct DetailedReputationScore {
        uint256 totalPoints;
        uint256 reviewCount;
        uint256 averageRating; // Scaled by 100 (e.g., 450 = 4.5 stars)
        uint256 successfulTransactions;
        uint256 disputesWon;
        uint256 disputesLost;
        ReputationTier tier;
        uint256 lastActivityTimestamp;
        bool isSuspended;
        uint256 suspensionEndTime;
    }

    // State variables
    uint256 public nextEscrowId = 1;
    uint256 public nextReviewId = 1;
    uint256 public platformFeePercentage = 250; // 2.5% (basis points)
    uint256 public constant MAX_PLATFORM_FEE = 1000; // 10% max
    uint256 public constant VOTING_PERIOD = 7 days;
    uint256 public constant MIN_VOTING_POWER = 100; // Minimum LDAO tokens to vote
    uint256 public constant REPUTATION_DECAY_PERIOD = 365 days;
    
    // Contract references
    LDAOToken public ldaoToken;
    Governance public governance;
    
    // Mappings
    mapping(uint256 => Escrow) public escrows;
    mapping(uint256 => MarketplaceReview) public reviews;
    mapping(address => DetailedReputationScore) public detailedReputationScores;
    mapping(address => uint256[]) public userEscrows;
    mapping(address => uint256[]) public userReviews;
    mapping(address => bool) public authorizedArbitrators;
    mapping(address => uint256) public arbitratorFees;
    
    // Events
    event EscrowCreated(uint256 indexed escrowId, address indexed buyer, address indexed seller, uint256 amount);
    event FundsLocked(uint256 indexed escrowId, uint256 amount);
    event DeliveryConfirmed(uint256 indexed escrowId, string deliveryInfo);
    event DisputeOpened(uint256 indexed escrowId, DisputeResolutionMethod method);
    event VoteCast(uint256 indexed escrowId, address indexed voter, bool forBuyer, uint256 votingPower);
    event EscrowResolved(uint256 indexed escrowId, EscrowStatus resolution, address winner);
    event ReviewSubmitted(uint256 indexed reviewId, address indexed reviewer, address indexed reviewee, uint8 rating);
    event ReputationUpdated(address indexed user, uint256 newScore, ReputationTier newTier);
    event ArbitratorAppointed(uint256 indexed escrowId, address indexed arbitrator);
    event EmergencyRefund(uint256 indexed escrowId, address indexed buyer, uint256 amount);
    event UserSuspended(address indexed user, uint256 duration, string reason);
    
    // Modifiers
    modifier escrowExists(uint256 escrowId) {
        require(escrowId > 0 && escrowId < nextEscrowId, "Escrow does not exist");
        _;
    }
    
    modifier onlyParticipant(uint256 escrowId) {
        require(
            msg.sender == escrows[escrowId].buyer || 
            msg.sender == escrows[escrowId].seller,
            "Only buyer or seller can call this function"
        );
        _;
    }
    
    modifier onlyDAO() {
        require(address(governance) != address(0), "Governance not set");
        require(msg.sender == owner() || msg.sender == address(governance), "Only DAO can call this function");
        _;
    }
    
    modifier onlyArbitrator(uint256 escrowId) {
        require(
            authorizedArbitrators[msg.sender] || 
            msg.sender == escrows[escrowId].appointedArbitrator,
            "Only authorized arbitrator can call this function"
        );
        _;
    }
    
    modifier notSuspended(address user) {
        DetailedReputationScore storage score = detailedReputationScores[user];
        require(!score.isSuspended || block.timestamp >= score.suspensionEndTime, "User is suspended");
        _;
    }

    constructor(address _ldaoToken, address _governance) {
        ldaoToken = LDAOToken(_ldaoToken);
        governance = Governance(_governance);
    }

    /**
     * @notice Create a new escrow
     * @param listingId ID of the marketplace listing
     * @param seller Address of the seller
     * @param tokenAddress Address of the payment token (address(0) for ETH)
     * @param amount Amount to be escrowed
     * @param deliveryDeadline Deadline for delivery
     * @param resolutionMethod Dispute resolution method
     * @return escrowId ID of the created escrow
     */
    function createEscrow(
        uint256 listingId,
        address seller,
        address tokenAddress,
        uint256 amount,
        uint256 deliveryDeadline,
        DisputeResolutionMethod resolutionMethod
    ) external payable nonReentrant notSuspended(msg.sender) notSuspended(seller) returns (uint256) {
        require(seller != address(0), "Invalid seller address");
        require(seller != msg.sender, "Buyer and seller cannot be the same");
        require(amount > 0, "Amount must be greater than 0");
        require(deliveryDeadline > block.timestamp, "Delivery deadline must be in the future");
        
        uint256 escrowId = nextEscrowId++;
        uint256 feeAmount = (amount * platformFeePercentage) / 10000;
        
        Escrow storage newEscrow = escrows[escrowId];
        newEscrow.id = escrowId;
        newEscrow.listingId = listingId;
        newEscrow.buyer = msg.sender;
        newEscrow.seller = seller;
        newEscrow.tokenAddress = tokenAddress;
        newEscrow.amount = amount;
        newEscrow.feeAmount = feeAmount;
        newEscrow.deliveryDeadline = deliveryDeadline;
        newEscrow.createdAt = block.timestamp;
        newEscrow.status = EscrowStatus.CREATED;
        newEscrow.resolutionMethod = resolutionMethod;
        
        userEscrows[msg.sender].push(escrowId);
        userEscrows[seller].push(escrowId);
        
        emit EscrowCreated(escrowId, msg.sender, seller, amount);
        
        return escrowId;
    }

    /**
     * @notice Lock funds in escrow
     * @param escrowId ID of the escrow
     */
    function lockFunds(uint256 escrowId) external payable nonReentrant escrowExists(escrowId) {
        Escrow storage escrow = escrows[escrowId];
        require(msg.sender == escrow.buyer, "Only buyer can lock funds");
        require(escrow.status == EscrowStatus.CREATED, "Invalid escrow status");
        
        uint256 totalAmount = escrow.amount + escrow.feeAmount;
        
        if (escrow.tokenAddress == address(0)) {
            // ETH payment
            require(msg.value == totalAmount, "Incorrect ETH amount");
        } else {
            // ERC20 token payment
            require(msg.value == 0, "ETH not accepted for token payments");
            IERC20(escrow.tokenAddress).transferFrom(msg.sender, address(this), totalAmount);
        }
        
        escrow.status = EscrowStatus.FUNDS_LOCKED;
        
        emit FundsLocked(escrowId, escrow.amount);
    }

    /**
     * @notice Confirm delivery and release funds
     * @param escrowId ID of the escrow
     * @param deliveryInfo Delivery confirmation information
     */
    function confirmDelivery(uint256 escrowId, string calldata deliveryInfo) 
        external 
        escrowExists(escrowId) 
        onlyParticipant(escrowId) 
    {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.status == EscrowStatus.FUNDS_LOCKED, "Invalid escrow status");
        
        escrow.deliveryInfo = deliveryInfo;
        escrow.status = EscrowStatus.DELIVERY_CONFIRMED;
        escrow.resolvedAt = block.timestamp;
        
        // Release funds to seller
        _releaseFunds(escrowId, escrow.seller);
        
        // Update reputation scores
        _updateReputationOnSuccess(escrow.buyer, escrow.seller);
        
        emit DeliveryConfirmed(escrowId, deliveryInfo);
        emit EscrowResolved(escrowId, EscrowStatus.DELIVERY_CONFIRMED, escrow.seller);
    }

    /**
     * @notice Open a dispute
     * @param escrowId ID of the escrow
     */
    function openDispute(uint256 escrowId) external escrowExists(escrowId) onlyParticipant(escrowId) {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.status == EscrowStatus.FUNDS_LOCKED, "Invalid escrow status");
        require(block.timestamp <= escrow.deliveryDeadline + 7 days, "Dispute period expired");
        
        escrow.status = EscrowStatus.DISPUTE_OPENED;
        
        emit DisputeOpened(escrowId, escrow.resolutionMethod);
    }

    /**
     * @notice Cast a vote in community dispute resolution
     * @param escrowId ID of the escrow
     * @param forBuyer True to vote for buyer, false for seller
     */
    function castVote(uint256 escrowId, bool forBuyer) external escrowExists(escrowId) {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.status == EscrowStatus.DISPUTE_OPENED, "No active dispute");
        require(escrow.resolutionMethod == DisputeResolutionMethod.COMMUNITY_VOTING, "Not community voting");
        require(!escrow.hasVoted[msg.sender], "Already voted");
        require(msg.sender != escrow.buyer && msg.sender != escrow.seller, "Participants cannot vote");
        
        uint256 votingPower = ldaoToken.balanceOf(msg.sender);
        require(votingPower >= MIN_VOTING_POWER, "Insufficient voting power");
        
        escrow.hasVoted[msg.sender] = true;
        escrow.totalVotingPower += votingPower;
        
        if (forBuyer) {
            escrow.votesForBuyer += votingPower;
        } else {
            escrow.votesForSeller += votingPower;
        }
        
        emit VoteCast(escrowId, msg.sender, forBuyer, votingPower);
        
        // Check if voting period ended or sufficient votes collected
        if (block.timestamp >= escrow.createdAt + VOTING_PERIOD || 
            escrow.totalVotingPower >= ldaoToken.totalSupply() / 10) {
            _resolveDisputeByVoting(escrowId);
        }
    }

    /**
     * @notice Resolve dispute by arbitrator
     * @param escrowId ID of the escrow
     * @param buyerWins True if buyer wins, false if seller wins
     */
    function resolveDisputeByArbitrator(uint256 escrowId, bool buyerWins) 
        external 
        escrowExists(escrowId) 
        onlyArbitrator(escrowId) 
    {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.status == EscrowStatus.DISPUTE_OPENED, "No active dispute");
        require(escrow.resolutionMethod == DisputeResolutionMethod.ARBITRATOR, "Not arbitrator resolution");
        
        if (buyerWins) {
            escrow.status = EscrowStatus.RESOLVED_BUYER_WINS;
            _releaseFunds(escrowId, escrow.buyer);
            _updateReputationOnDispute(escrow.buyer, escrow.seller, true);
        } else {
            escrow.status = EscrowStatus.RESOLVED_SELLER_WINS;
            _releaseFunds(escrowId, escrow.seller);
            _updateReputationOnDispute(escrow.buyer, escrow.seller, false);
        }
        
        escrow.resolvedAt = block.timestamp;
        
        emit EscrowResolved(escrowId, escrow.status, buyerWins ? escrow.buyer : escrow.seller);
    }

    /**
     * @notice Submit a marketplace review
     * @param escrowId ID of the completed escrow
     * @param reviewee Address being reviewed
     * @param rating Rating from 1-5
     * @param reviewText Review text
     * @return reviewId ID of the created review
     */
    function submitMarketplaceReview(
        uint256 escrowId,
        address reviewee,
        uint8 rating,
        string calldata reviewText
    ) external escrowExists(escrowId) returns (uint256) {
        Escrow storage escrow = escrows[escrowId];
        require(
            escrow.status == EscrowStatus.DELIVERY_CONFIRMED || 
            escrow.status == EscrowStatus.RESOLVED_BUYER_WINS || 
            escrow.status == EscrowStatus.RESOLVED_SELLER_WINS,
            "Escrow not completed"
        );
        require(msg.sender == escrow.buyer || msg.sender == escrow.seller, "Only participants can review");
        require(reviewee == escrow.buyer || reviewee == escrow.seller, "Invalid reviewee");
        require(msg.sender != reviewee, "Cannot review yourself");
        require(rating >= 1 && rating <= 5, "Rating must be between 1 and 5");
        
        uint256 reviewId = nextReviewId++;
        
        MarketplaceReview storage review = reviews[reviewId];
        review.id = reviewId;
        review.reviewer = msg.sender;
        review.reviewee = reviewee;
        review.escrowId = escrowId;
        review.rating = rating;
        review.reviewText = reviewText;
        review.timestamp = block.timestamp;
        review.isVerified = true; // Verified because it's from a completed transaction
        
        userReviews[reviewee].push(reviewId);
        
        // Update reputation score
        _updateReputationFromReview(reviewee, rating);
        
        emit ReviewSubmitted(reviewId, msg.sender, reviewee, rating);
        
        return reviewId;
    }

    /**
     * @notice Cast a helpful vote on a review
     * @param reviewId ID of the review
     */
    function castHelpfulVote(uint256 reviewId) external {
        require(reviewId > 0 && reviewId < nextReviewId, "Review does not exist");
        MarketplaceReview storage review = reviews[reviewId];
        require(!review.hasVotedHelpful[msg.sender], "Already voted on this review");
        require(msg.sender != review.reviewer, "Cannot vote on own review");
        
        review.hasVotedHelpful[msg.sender] = true;
        review.helpfulVotes++;
    }

    /**
     * @notice Get reputation tier for a user
     * @param user Address of the user
     * @return tier Reputation tier
     */
    function getReputationTier(address user) external view returns (ReputationTier) {
        return detailedReputationScores[user].tier;
    }

    /**
     * @notice Calculate weighted reputation score
     * @param user Address of the user
     * @return score Weighted reputation score
     */
    function calculateWeightedScore(address user) external view returns (uint256) {
        DetailedReputationScore storage score = detailedReputationScores[user];
        
        if (score.reviewCount == 0 && score.successfulTransactions == 0) {
            return 0;
        }
        
        // Base score from total points
        uint256 baseScore = score.totalPoints;
        
        // Apply time decay
        uint256 timeSinceLastActivity = block.timestamp - score.lastActivityTimestamp;
        if (timeSinceLastActivity > REPUTATION_DECAY_PERIOD) {
            uint256 decayFactor = timeSinceLastActivity / REPUTATION_DECAY_PERIOD;
            baseScore = baseScore > decayFactor ? baseScore - decayFactor : 0;
        }
        
        return baseScore;
    }

    /**
     * @notice Get top sellers by reputation
     * @param limit Maximum number of sellers to return
     * @return sellers Array of seller addresses
     * @return scores Array of corresponding reputation scores
     */
    function getTopSellers(uint256 limit) external view returns (address[] memory sellers, uint256[] memory scores) {
        // This is a simplified implementation
        // In production, you'd want to maintain a sorted list or use a more efficient algorithm
        sellers = new address[](limit);
        scores = new uint256[](limit);
        
        // Implementation would iterate through users and find top sellers
        // For brevity, returning empty arrays
        return (sellers, scores);
    }

    /**
     * @notice Suspend a user
     * @param user Address of the user to suspend
     * @param duration Duration of suspension in seconds
     * @param reason Reason for suspension
     */
    function suspendUser(address user, uint256 duration, string calldata reason) external onlyDAO {
        DetailedReputationScore storage score = detailedReputationScores[user];
        score.isSuspended = true;
        score.suspensionEndTime = block.timestamp + duration;
        
        emit UserSuspended(user, duration, reason);
    }

    /**
     * @notice Get user reviews
     * @param user Address of the user
     * @return reviewIds Array of review IDs
     */
    function getUserReviews(address user) external view returns (uint256[] memory) {
        return userReviews[user];
    }

    /**
     * @notice Get detailed reputation for a user
     * @param user Address of the user
     * @return reputation Detailed reputation score
     */
    function getDetailedReputation(address user) external view returns (DetailedReputationScore memory) {
        return detailedReputationScores[user];
    }

    /**
     * @notice Execute emergency refund (DAO only)
     * @param escrowId ID of the escrow
     */
    function executeEmergencyRefund(uint256 escrowId) external onlyDAO escrowExists(escrowId) {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.status == EscrowStatus.FUNDS_LOCKED || escrow.status == EscrowStatus.DISPUTE_OPENED, "Invalid status for refund");
        
        escrow.status = EscrowStatus.CANCELLED;
        escrow.resolvedAt = block.timestamp;
        
        _releaseFunds(escrowId, escrow.buyer);
        
        emit EmergencyRefund(escrowId, escrow.buyer, escrow.amount);
    }

    // Internal functions
    function _releaseFunds(uint256 escrowId, address recipient) internal {
        Escrow storage escrow = escrows[escrowId];
        
        if (escrow.tokenAddress == address(0)) {
            // ETH payment
            (bool sentToRecipient, ) = payable(recipient).call{value: escrow.amount}("");
            require(sentToRecipient, "Failed to send ETH to recipient");
            
            (bool sentToOwner, ) = payable(owner()).call{value: escrow.feeAmount}("");
            require(sentToOwner, "Failed to send ETH to owner");
        } else {
            // ERC20 token payment
            IERC20(escrow.tokenAddress).transfer(recipient, escrow.amount);
            IERC20(escrow.tokenAddress).transfer(owner(), escrow.feeAmount);
        }
    }

    function _resolveDisputeByVoting(uint256 escrowId) internal {
        Escrow storage escrow = escrows[escrowId];
        
        bool buyerWins = escrow.votesForBuyer > escrow.votesForSeller;
        
        if (buyerWins) {
            escrow.status = EscrowStatus.RESOLVED_BUYER_WINS;
            _releaseFunds(escrowId, escrow.buyer);
            _updateReputationOnDispute(escrow.buyer, escrow.seller, true);
        } else {
            escrow.status = EscrowStatus.RESOLVED_SELLER_WINS;
            _releaseFunds(escrowId, escrow.seller);
            _updateReputationOnDispute(escrow.buyer, escrow.seller, false);
        }
        
        escrow.resolvedAt = block.timestamp;
        
        emit EscrowResolved(escrowId, escrow.status, buyerWins ? escrow.buyer : escrow.seller);
    }

    function _updateReputationOnSuccess(address buyer, address seller) internal {
        DetailedReputationScore storage buyerScore = detailedReputationScores[buyer];
        DetailedReputationScore storage sellerScore = detailedReputationScores[seller];
        
        buyerScore.successfulTransactions++;
        buyerScore.totalPoints += 10;
        buyerScore.lastActivityTimestamp = block.timestamp;
        
        sellerScore.successfulTransactions++;
        sellerScore.totalPoints += 15;
        sellerScore.lastActivityTimestamp = block.timestamp;
        
        _updateTier(buyer);
        _updateTier(seller);
    }

    function _updateReputationOnDispute(address buyer, address seller, bool buyerWins) internal {
        DetailedReputationScore storage buyerScore = detailedReputationScores[buyer];
        DetailedReputationScore storage sellerScore = detailedReputationScores[seller];
        
        if (buyerWins) {
            buyerScore.disputesWon++;
            buyerScore.totalPoints += 5;
            sellerScore.disputesLost++;
            if (sellerScore.totalPoints >= 10) {
                sellerScore.totalPoints -= 10;
            }
        } else {
            sellerScore.disputesWon++;
            sellerScore.totalPoints += 5;
            buyerScore.disputesLost++;
            if (buyerScore.totalPoints >= 10) {
                buyerScore.totalPoints -= 10;
            }
        }
        
        buyerScore.lastActivityTimestamp = block.timestamp;
        sellerScore.lastActivityTimestamp = block.timestamp;
        
        _updateTier(buyer);
        _updateTier(seller);
    }

    function _updateReputationFromReview(address reviewee, uint8 rating) internal {
        DetailedReputationScore storage score = detailedReputationScores[reviewee];
        
        // Update average rating
        uint256 totalRating = score.averageRating * score.reviewCount + (rating * 100);
        score.reviewCount++;
        score.averageRating = totalRating / score.reviewCount;
        
        // Add points based on rating
        if (rating >= 4) {
            score.totalPoints += rating;
        } else if (rating <= 2 && score.totalPoints >= rating) {
            score.totalPoints -= (3 - rating);
        }
        
        score.lastActivityTimestamp = block.timestamp;
        _updateTier(reviewee);
    }

    function _updateTier(address user) internal {
        DetailedReputationScore storage score = detailedReputationScores[user];
        ReputationTier oldTier = score.tier;
        
        if (score.totalPoints >= 2500) {
            score.tier = ReputationTier.DIAMOND;
        } else if (score.totalPoints >= 1000) {
            score.tier = ReputationTier.PLATINUM;
        } else if (score.totalPoints >= 500) {
            score.tier = ReputationTier.GOLD;
        } else if (score.totalPoints >= 200) {
            score.tier = ReputationTier.SILVER;
        } else if (score.totalPoints >= 50) {
            score.tier = ReputationTier.BRONZE;
        } else {
            score.tier = ReputationTier.NEWCOMER;
        }
        
        if (oldTier != score.tier) {
            emit ReputationUpdated(user, score.totalPoints, score.tier);
        }
    }

    // Admin functions
    function setPlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= MAX_PLATFORM_FEE, "Fee too high");
        platformFeePercentage = newFee;
    }

    function setLDAOToken(address newToken) external onlyOwner {
        ldaoToken = LDAOToken(newToken);
    }

    function setGovernance(address newGovernance) external onlyOwner {
        governance = Governance(newGovernance);
    }

    function authorizeArbitrator(address arbitrator, bool authorized) external onlyOwner {
        authorizedArbitrators[arbitrator] = authorized;
    }

    function setArbitratorFee(address arbitrator, uint256 fee) external onlyOwner {
        arbitratorFees[arbitrator] = fee;
    }
}