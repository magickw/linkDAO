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
    
    // Enum for reputation tiers
    enum ReputationTier {
        NEWCOMER,     // 0-49 points
        BRONZE,       // 50-199 points  
        SILVER,       // 200-499 points
        GOLD,         // 500-999 points
        PLATINUM,     // 1000-2499 points
        DIAMOND       // 2500+ points
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
        mapping(address => bool) hasVoted; // For helpful votes
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
        uint256 suspiciousActivityCount;
        bool isSuspended;
        uint256 suspensionEndTime;
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
    
    // Mapping of user address to reputation score (legacy - kept for compatibility)
    mapping(address => uint256) public reputationScores;
    
    // Mapping of user address to detailed reputation score
    mapping(address => DetailedReputationScore) public detailedReputationScores;
    
    // Mapping of review ID to review
    mapping(uint256 => MarketplaceReview) public marketplaceReviews;
    
    // Mapping of user to their review IDs
    mapping(address => uint256[]) public userReviews;
    
    // Mapping to prevent duplicate reviews between same users
    mapping(address => mapping(address => bool)) public hasReviewedUser;
    
    // Mapping of user address to whether they are DAO approved
    mapping(address => bool) public daoApprovedVendors;
    
    // Counter for escrow IDs
    uint256 public nextEscrowId = 1;
    
    // Counter for review IDs
    uint256 public nextReviewId = 1;
    
    // Platform fee (in basis points, e.g., 100 = 1%)
    uint256 public platformFee = 100;
    
    // Minimum reputation score to be a vendor
    uint256 public minReputationScore = 50;
    
    // Delivery deadline (in days)
    uint256 public deliveryDeadlineDays = 14;
    
    // High-value transaction threshold for multi-sig requirement
    uint256 public highValueThreshold = 10000 * 10**18; // 10,000 tokens/ETH
    
    // Time lock duration for high-value transactions (in seconds)
    uint256 public timeLockDuration = 24 hours;
    
    // Emergency refund window (in seconds)
    uint256 public emergencyRefundWindow = 7 days;
    
    // Reputation tier thresholds
    uint256[6] public tierThresholds = [0, 50, 200, 500, 1000, 2500];
    
    // Anti-gaming parameters
    uint256 public maxReviewsPerUser = 1; // Max reviews between same users
    uint256 public minTimeBetweenReviews = 1 hours; // Minimum time between reviews
    uint256 public suspiciousActivityThreshold = 5; // Threshold for auto-suspension
    
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
    
    event MultiSigReleaseInitiated(
        uint256 indexed escrowId,
        address indexed signer,
        uint256 signatureCount,
        uint256 threshold
    );
    
    event TimeLockActivated(
        uint256 indexed escrowId,
        uint256 unlockTime
    );
    
    event EmergencyRefundExecuted(
        uint256 indexed escrowId,
        address indexed refundee,
        uint256 amount
    );
    
    event MarketplaceReviewSubmitted(
        uint256 indexed reviewId,
        address indexed reviewer,
        address indexed reviewee,
        uint256 escrowId,
        uint8 rating
    );
    
    event ReputationTierUpdated(
        address indexed user,
        ReputationTier oldTier,
        ReputationTier newTier
    );
    
    event HelpfulVoteCast(
        uint256 indexed reviewId,
        address indexed voter
    );
    
    // New events for enhanced tracking
    event DetailedReputationUpdated(
        address indexed user,
        uint256 totalPoints,
        uint256 reviewCount,
        uint256 averageRating,
        uint256 successfulTransactions,
        uint256 disputesWon,
        uint256 disputesLost,
        uint256 timestamp
    );
    
    event EscrowSalesMetricsUpdated(
        address indexed seller,
        uint256 totalSales,
        uint256 totalRevenue,
        uint256 timestamp
    );
    
    // Additional events for comprehensive tracking
    event EscrowPerformanceUpdated(
        uint256 indexed escrowId,
        address indexed seller,
        uint256 deliveryTime,
        uint256 responseTime,
        uint256 timestamp
    );
    
    event CommunityVotingResults(
        uint256 indexed escrowId,
        uint256 votesForBuyer,
        uint256 votesForSeller,
        uint256 totalVotingPower,
        bool buyerWins,
        uint256 timestamp
    );
    
    event ArbitratorAssigned(
        uint256 indexed escrowId,
        address indexed arbitrator,
        uint256 timestamp
    );
    
    event SuspiciousActivityDetected(
        address indexed user,
        string activityType,
        uint256 count
    );
    
    event UserSuspended(
        address indexed user,
        uint256 suspensionEndTime,
        string reason
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
        
        // Determine if multi-sig is required for high-value transactions
        bool requiresMultiSig = amount >= highValueThreshold;
        uint256 multiSigThreshold = requiresMultiSig ? 2 : 0; // Require 2 signatures for high-value
        
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
            appointedArbitrator: address(0),
            requiresMultiSig: requiresMultiSig,
            multiSigThreshold: multiSigThreshold,
            multiSigSigners: new address[](0),
            signatureCount: 0,
            timeLockExpiry: 0,
            emergencyRefundEnabled: true
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
        
        emit EscrowApproved(escrowId, msg.sender);
        
        // Check if multi-sig is required
        if (escrow.requiresMultiSig) {
            // For high-value transactions, initiate multi-sig process
            escrow.hasSignedRelease[msg.sender] = true;
            escrow.signatureCount = 1;
            
            emit MultiSigReleaseInitiated(escrowId, msg.sender, escrow.signatureCount, escrow.multiSigThreshold);
            
            // Send notification to seller to sign
            _sendNotification(escrow.seller, string(abi.encodePacked("Buyer approved escrow #", _toString(escrowId), ". Please sign to release funds (multi-sig required).")));
            
            // If threshold is already met (shouldn't happen with threshold 2), execute release
            if (escrow.signatureCount >= escrow.multiSigThreshold) {
                _executeRelease(escrowId);
            }
        } else {
            // For regular transactions, release immediately
            _executeRelease(escrowId);
        }
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
     * @notice Sign multi-signature release for high-value transactions
     * @param escrowId ID of the escrow
     */
    function signMultiSigRelease(uint256 escrowId) external escrowExists(escrowId) {
        Escrow storage escrow = escrows[escrowId];
        
        require(escrow.requiresMultiSig, "Multi-sig not required for this escrow");
        require(escrow.status == EscrowStatus.DELIVERY_CONFIRMED, "Delivery not confirmed");
        require(!escrow.hasSignedRelease[msg.sender], "Already signed");
        
        // Check if signer is authorized (buyer, seller, or DAO member)
        bool isAuthorized = msg.sender == escrow.buyer || 
                           msg.sender == escrow.seller || 
                           msg.sender == owner();
        require(isAuthorized, "Not authorized to sign");
        
        escrow.hasSignedRelease[msg.sender] = true;
        escrow.signatureCount++;
        
        emit MultiSigReleaseInitiated(escrowId, msg.sender, escrow.signatureCount, escrow.multiSigThreshold);
        
        // Check if threshold is met
        if (escrow.signatureCount >= escrow.multiSigThreshold) {
            _executeRelease(escrowId);
        }
    }
    
    /**
     * @notice Activate time lock for high-value transactions
     * @param escrowId ID of the escrow
     */
    function activateTimeLock(uint256 escrowId) external onlyBuyerOrSeller(escrowId) escrowExists(escrowId) {
        Escrow storage escrow = escrows[escrowId];
        
        require(escrow.status == EscrowStatus.DELIVERY_CONFIRMED, "Delivery not confirmed");
        require(escrow.amount >= highValueThreshold, "Not a high-value transaction");
        require(escrow.timeLockExpiry == 0, "Time lock already activated");
        
        escrow.timeLockExpiry = block.timestamp + timeLockDuration;
        
        emit TimeLockActivated(escrowId, escrow.timeLockExpiry);
        
        // Send notification
        _sendNotification(escrow.buyer, string(abi.encodePacked("Time lock activated for escrow #", _toString(escrowId), ". Funds will be released after ", _toString(timeLockDuration / 3600), " hours.")));
        _sendNotification(escrow.seller, string(abi.encodePacked("Time lock activated for escrow #", _toString(escrowId), ". Funds will be released after ", _toString(timeLockDuration / 3600), " hours.")));
    }
    
    /**
     * @notice Execute time-locked release
     * @param escrowId ID of the escrow
     */
    function executeTimeLockRelease(uint256 escrowId) external escrowExists(escrowId) {
        Escrow storage escrow = escrows[escrowId];
        
        require(escrow.timeLockExpiry > 0, "Time lock not activated");
        require(block.timestamp >= escrow.timeLockExpiry, "Time lock not expired");
        require(escrow.status == EscrowStatus.DELIVERY_CONFIRMED, "Delivery not confirmed");
        
        _executeRelease(escrowId);
    }
    
    /**
     * @notice Resolve an escrow dispute
     * @param escrowId ID of the escrow
     * @param buyerWins Whether the buyer wins the dispute
     * @param evidence Evidence for the resolution
     */
    function resolveDispute(
        uint256 escrowId,
        bool buyerWins,
        string calldata evidence
    ) external onlyArbitrator(escrowId) {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.status == EscrowStatus.DISPUTE_OPENED, "Dispute not opened");
        
        escrow.status = buyerWins ? EscrowStatus.RESOLVED_BUYER_WINS : EscrowStatus.RESOLVED_SELLER_WINS;
        escrow.resolvedAt = block.timestamp;
        escrow.evidenceSubmitted = evidence;
        
        // Update dispute records
        if (buyerWins) {
            detailedReputationScores[escrow.seller].disputesLost += 1;
            detailedReputationScores[escrow.buyer].disputesWon += 1;
        } else {
            detailedReputationScores[escrow.seller].disputesWon += 1;
            detailedReputationScores[escrow.buyer].disputesLost += 1;
        }
        
        // Release funds
        if (buyerWins) {
            _releaseFundsToBuyer(escrowId);
        } else {
            _releaseFundsToSeller(escrowId);
        }
        
        emit EscrowResolved(escrowId, escrow.status, msg.sender);
    }
    
    /**
     * @notice Submit a marketplace review after escrow completion
     * @param escrowId ID of the completed escrow
     * @param reviewee Address being reviewed (buyer or seller)
     * @param rating Rating from 1-5 stars
     * @param reviewText Review text content
     */
    function submitMarketplaceReview(
        uint256 escrowId,
        address reviewee,
        uint8 rating,
        string calldata reviewText
    ) external escrowExists(escrowId) {
        Escrow storage escrow = escrows[escrowId];
        
        require(
            escrow.status == EscrowStatus.RESOLVED_SELLER_WINS || 
            escrow.status == EscrowStatus.RESOLVED_BUYER_WINS,
            "Escrow not completed"
        );
        require(
            msg.sender == escrow.buyer || msg.sender == escrow.seller,
            "Not authorized to review"
        );
        require(reviewee == escrow.buyer || reviewee == escrow.seller, "Invalid reviewee");
        require(msg.sender != reviewee, "Cannot review yourself");
        require(rating >= 1 && rating <= 5, "Rating must be between 1 and 5");
        require(!hasReviewedUser[msg.sender][reviewee], "Already reviewed this user");
        
        // Anti-gaming: Check time since last review
        DetailedReputationScore storage reviewerScore = detailedReputationScores[msg.sender];
        require(
            block.timestamp >= reviewerScore.lastActivityTimestamp + minTimeBetweenReviews,
            "Review submitted too soon"
        );
        
        uint256 reviewId = nextReviewId++;
        
        marketplaceReviews[reviewId] = MarketplaceReview({
            id: reviewId,
            reviewer: msg.sender,
            reviewee: reviewee,
            escrowId: escrowId,
            rating: rating,
            reviewText: reviewText,
            timestamp: block.timestamp,
            isVerified: true, // Auto-verified since it's from completed escrow
            helpfulVotes: 0
        });
        
        // Update mappings
        hasReviewedUser[msg.sender][reviewee] = true;
        userReviews[reviewee].push(reviewId);
        
        // Update reviewer's last activity
        reviewerScore.lastActivityTimestamp = block.timestamp;
        
        emit MarketplaceReviewSubmitted(reviewId, msg.sender, reviewee, escrowId, rating);
        
        // Update reviewee's reputation based on the review
        _updateReputationFromReview(reviewId);
    }
    
    /**
     * @notice Cast a helpful vote on a review
     * @param reviewId ID of the review
     */
    function castHelpfulVote(uint256 reviewId) external {
        MarketplaceReview storage review = marketplaceReviews[reviewId];
        require(review.id != 0, "Review does not exist");
        require(!review.hasVoted[msg.sender], "Already voted on this review");
        require(msg.sender != review.reviewer, "Cannot vote on own review");
        
        review.hasVoted[msg.sender] = true;
        review.helpfulVotes++;
        
        emit HelpfulVoteCast(reviewId, msg.sender);
        
        // Award small reputation boost to reviewer for helpful review
        _updateDetailedReputation(review.reviewer, 1, "Helpful review received");
    }
    
    /**
     * @notice Get reputation tier for a user
     * @param user Address of the user
     * @return Reputation tier
     */
    function getReputationTier(address user) external view returns (ReputationTier) {
        uint256 score = detailedReputationScores[user].totalPoints;
        
        for (uint256 i = tierThresholds.length - 1; i > 0; i--) {
            if (score >= tierThresholds[i]) {
                return ReputationTier(i);
            }
        }
        
        return ReputationTier.NEWCOMER;
    }
    
    /**
     * @notice Calculate weighted reputation score
     * @param user Address of the user
     * @return Weighted reputation score
     */
    function calculateWeightedScore(address user) external view returns (uint256) {
        DetailedReputationScore storage score = detailedReputationScores[user];
        
        if (score.reviewCount == 0 && score.successfulTransactions == 0) {
            return 0;
        }
        
        // Base score from total points
        uint256 baseScore = score.totalPoints;
        
        // Weight by transaction success rate
        uint256 totalTransactions = score.successfulTransactions + score.disputesLost;
        uint256 successRate = totalTransactions > 0 ? 
            (score.successfulTransactions * 100) / totalTransactions : 100;
        
        // Weight by average rating (if has reviews)
        uint256 ratingWeight = score.reviewCount > 0 ? score.averageRating : 500; // Default to 5.0 if no reviews
        
        // Penalty for suspicious activity
        uint256 suspiciousPenalty = score.suspiciousActivityCount * 50;
        
        // Calculate weighted score
        uint256 weightedScore = (baseScore * successRate * ratingWeight) / 50000; // Normalize
        
        // Apply penalty
        if (weightedScore > suspiciousPenalty) {
            weightedScore -= suspiciousPenalty;
        } else {
            weightedScore = 0;
        }
        
        return weightedScore;
    }
    
    /**
     * @notice Get seller rankings (top sellers by weighted score)
     * @param limit Maximum number of sellers to return
     * @return Arrays of seller addresses and their weighted scores
     */
    function getTopSellers(uint256 limit) external view returns (address[] memory sellers, uint256[] memory scores) {
        // This is a simplified implementation
        // In production, you'd want to maintain a sorted list or use off-chain indexing
        sellers = new address[](limit);
        scores = new uint256[](limit);
        
        // Placeholder implementation - would need proper sorting logic
        return (sellers, scores);
    }
    
    /**
     * @notice Suspend a user for suspicious activity
     * @param user Address to suspend
     * @param duration Suspension duration in seconds
     * @param reason Reason for suspension
     */
    function suspendUser(address user, uint256 duration, string calldata reason) external onlyDAO {
        DetailedReputationScore storage score = detailedReputationScores[user];
        score.isSuspended = true;
        score.suspensionEndTime = block.timestamp + duration;
        
        emit UserSuspended(user, score.suspensionEndTime, reason);
    }
    
    /**
     * @notice Get user's review history
     * @param user Address of the user
     * @return Array of review IDs for the user
     */
    function getUserReviews(address user) external view returns (uint256[] memory) {
        return userReviews[user];
    }
    
    /**
     * @notice Get detailed reputation information
     * @param user Address of the user
     * @return Detailed reputation score struct
     */
    function getDetailedReputation(address user) external view returns (DetailedReputationScore memory) {
        return detailedReputationScores[user];
    }

    /**
     * @notice Execute emergency refund within the emergency window
     * @param escrowId ID of the escrow
     */
    function executeEmergencyRefund(uint256 escrowId) external onlyDAO escrowExists(escrowId) {
        Escrow storage escrow = escrows[escrowId];
        
        require(escrow.emergencyRefundEnabled, "Emergency refund not enabled");
        require(block.timestamp <= escrow.createdAt + emergencyRefundWindow, "Emergency refund window expired");
        require(
            escrow.status == EscrowStatus.FUNDS_LOCKED || 
            escrow.status == EscrowStatus.DELIVERY_CONFIRMED ||
            escrow.status == EscrowStatus.DISPUTE_OPENED, 
            "Cannot execute emergency refund in current status"
        );
        
        // Refund buyer
        _refundBuyer(escrowId);
        
        escrow.status = EscrowStatus.RESOLVED_BUYER_WINS;
        escrow.resolvedAt = block.timestamp;
        
        emit EmergencyRefundExecuted(escrowId, escrow.buyer, escrow.amount);
        emit EscrowResolved(escrowId, escrow.status, msg.sender);
        
        // Send notifications
        _sendNotification(escrow.buyer, string(abi.encodePacked("Emergency refund executed for escrow #", _toString(escrowId))));
        _sendNotification(escrow.seller, string(abi.encodePacked("Emergency refund executed for escrow #", _toString(escrowId))));
    }
    
    /**
     * @notice Internal function to execute release (handles both regular and multi-sig releases)
     * @param escrowId ID of the escrow
     */
    function _executeRelease(uint256 escrowId) internal {
        Escrow storage escrow = escrows[escrowId];
        
        // Release funds to seller
        _releaseFundsToSeller(escrowId);
        
        escrow.status = EscrowStatus.RESOLVED_SELLER_WINS;
        escrow.resolvedAt = block.timestamp;
        
        emit EscrowResolved(escrowId, escrow.status, msg.sender);
        
        // Update reputation scores
        _updateReputation(escrow.seller, 5, "Successful transaction");
        _updateReputation(escrow.buyer, 2, "Completed purchase");
        
        // Send notification
        _sendNotification(escrow.seller, string(abi.encodePacked("Escrow #", _toString(escrowId), " completed. Funds released to you.")));
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
     * @notice Internal function to release funds to buyer
     * @param escrowId ID of the escrow
     */
    function _releaseFundsToBuyer(uint256 escrowId) internal {
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
     * @notice Internal function to update user reputation
     * @param user Address of the user
     * @param scoreChange Change in reputation score (positive or negative)
     * @param reason Reason for the update
     */
    function _updateReputation(address user, int256 scoreChange, string memory reason) internal {
        DetailedReputationScore storage score = detailedReputationScores[user];
        
        int256 newScore = int256(score.totalPoints) + scoreChange;
        if (newScore < 0) {
            score.totalPoints = 0;
        } else {
            score.totalPoints = uint256(newScore);
        }
        
        score.lastActivityTimestamp = block.timestamp;
        
        // Update tier
        ReputationTier newTier = _getReputationTier(score.totalPoints);
        ReputationTier oldTier = score.tier;
        score.tier = newTier;
        
        emit ReputationUpdated(user, scoreChange, score.totalPoints, reason);
        
        if (oldTier != newTier) {
            emit ReputationTierUpdated(user, oldTier, newTier);
        }
        
        // Emit detailed reputation event
        emit DetailedReputationUpdated(
            user,
            score.totalPoints,
            score.reviewCount,
            score.averageRating,
            score.successfulTransactions,
            score.disputesWon,
            score.disputesLost,
            block.timestamp
        );
    }
    
    /**
     * @notice Internal function to get reputation tier based on points
     * @param points Reputation points
     * @return Reputation tier
     */
    function _getReputationTier(uint256 points) internal view returns (ReputationTier) {
        for (uint256 i = tierThresholds.length - 1; i > 0; i--) {
            if (points >= tierThresholds[i]) {
                return ReputationTier(i);
            }
        }
        return ReputationTier.NEWCOMER;
    }
    
    /**
     * @notice Update sales metrics for a seller
     * @param seller Address of the seller
     * @param amount Sale amount
     */
    function _updateSalesMetrics(address seller, uint256 amount) internal {
        DetailedReputationScore storage score = detailedReputationScores[seller];
        score.successfulTransactions += 1;
        // In a real implementation, you would track total sales and revenue separately
        // For now, we'll use successfulTransactions as a proxy
        
        emit EscrowSalesMetricsUpdated(
            seller,
            score.successfulTransactions,
            amount,
            block.timestamp
        );
    }
    
    /**
     * @notice Update escrow performance metrics
     * @param escrowId ID of the escrow
     * @param deliveryTime Time taken for delivery
     * @param responseTime Time taken to respond
     */
    function updateEscrowPerformance(
        uint256 escrowId,
        uint256 deliveryTime,
        uint256 responseTime
    ) external onlyOwner {
        Escrow storage escrow = escrows[escrowId];
        
        emit EscrowPerformanceUpdated(
            escrowId,
            escrow.seller,
            deliveryTime,
            responseTime,
            block.timestamp
        );
    }
    
    /**
     * @notice Record community voting results
     * @param escrowId ID of the escrow
     * @param votesForBuyer Votes for buyer
     * @param votesForSeller Votes for seller
     * @param totalVotingPower Total voting power
     * @param buyerWins Whether buyer wins
     */
    function recordCommunityVotingResults(
        uint256 escrowId,
        uint256 votesForBuyer,
        uint256 votesForSeller,
        uint256 totalVotingPower,
        bool buyerWins
    ) external onlyOwner {
        emit CommunityVotingResults(
            escrowId,
            votesForBuyer,
            votesForSeller,
            totalVotingPower,
            buyerWins,
            block.timestamp
        );
    }
    
    /**
     * @notice Assign arbitrator to escrow
     * @param escrowId ID of the escrow
     * @param arbitrator Address of the arbitrator
     */
    function assignArbitrator(uint256 escrowId, address arbitrator) external onlyOwner {
        escrows[escrowId].appointedArbitrator = arbitrator;
        
        emit ArbitratorAssigned(escrowId, arbitrator, block.timestamp);
    }
    
    /**
     * @notice Submit a marketplace review
     * @param escrowId ID of the completed escrow
     * @param reviewee Address being reviewed (buyer or seller)
     * @param rating Rating from 1-5 stars
     * @param reviewText Review text content
     */
    function submitMarketplaceReview(
        uint256 escrowId,
        address reviewee,
        uint8 rating,
        string calldata reviewText
    ) external escrowExists(escrowId) {
        Escrow storage escrow = escrows[escrowId];
        
        require(
            escrow.status == EscrowStatus.RESOLVED_SELLER_WINS || 
            escrow.status == EscrowStatus.RESOLVED_BUYER_WINS,
            "Escrow not completed"
        );
        require(
            msg.sender == escrow.buyer || msg.sender == escrow.seller,
            "Not authorized to review"
        );
        require(reviewee == escrow.buyer || reviewee == escrow.seller, "Invalid reviewee");
        require(msg.sender != reviewee, "Cannot review yourself");
        require(rating >= 1 && rating <= 5, "Rating must be between 1 and 5");
        require(!hasReviewedUser[msg.sender][reviewee], "Already reviewed this user");
        
        // Anti-gaming: Check time since last review
        DetailedReputationScore storage reviewerScore = detailedReputationScores[msg.sender];
        require(
            block.timestamp >= reviewerScore.lastActivityTimestamp + minTimeBetweenReviews,
            "Review submitted too soon"
        );
        
        uint256 reviewId = nextReviewId++;
        
        marketplaceReviews[reviewId] = MarketplaceReview({
            id: reviewId,
            reviewer: msg.sender,
            reviewee: reviewee,
            escrowId: escrowId,
            rating: rating,
            reviewText: reviewText,
            timestamp: block.timestamp,
            isVerified: true, // Auto-verified since it's from completed escrow
            helpfulVotes: 0
        });
        
        // Update mappings
        hasReviewedUser[msg.sender][reviewee] = true;
        userReviews[reviewee].push(reviewId);
        
        // Update reviewer's last activity
        reviewerScore.lastActivityTimestamp = block.timestamp;
        
        emit MarketplaceReviewSubmitted(reviewId, msg.sender, reviewee, escrowId, rating);
        
        // Update reviewee's reputation based on the review
        _updateReputationFromReview(reviewId);
    }
    
    /**
     * @notice Cast a helpful vote on a review
     * @param reviewId ID of the review
     */
    function castHelpfulVote(uint256 reviewId) external {
        MarketplaceReview storage review = marketplaceReviews[reviewId];
        require(review.id != 0, "Review does not exist");
        require(!review.hasVoted[msg.sender], "Already voted on this review");
        require(msg.sender != review.reviewer, "Cannot vote on own review");
        
        review.hasVoted[msg.sender] = true;
        review.helpfulVotes++;
        
        emit HelpfulVoteCast(reviewId, msg.sender);
        
        // Award small reputation boost to reviewer for helpful review
        _updateDetailedReputation(review.reviewer, 1, "Helpful review received");
    }
    
    /**
     * @notice Get reputation tier for a user
     * @param user Address of the user
     * @return Reputation tier
     */
    function getReputationTier(address user) external view returns (ReputationTier) {
        uint256 score = detailedReputationScores[user].totalPoints;
        
        for (uint256 i = tierThresholds.length - 1; i > 0; i--) {
            if (score >= tierThresholds[i]) {
                return ReputationTier(i);
            }
        }
        
        return ReputationTier.NEWCOMER;
    }
    
    /**
     * @notice Calculate weighted reputation score
     * @param user Address of the user
     * @return Weighted reputation score
     */
    function calculateWeightedScore(address user) external view returns (uint256) {
        DetailedReputationScore storage score = detailedReputationScores[user];
        
        if (score.reviewCount == 0 && score.successfulTransactions == 0) {
            return 0;
        }
        
        // Base score from total points
        uint256 baseScore = score.totalPoints;
        
        // Weight by transaction success rate
        uint256 totalTransactions = score.successfulTransactions + score.disputesLost;
        uint256 successRate = totalTransactions > 0 ? 
            (score.successfulTransactions * 100) / totalTransactions : 100;
        
        // Weight by average rating (if has reviews)
        uint256 ratingWeight = score.reviewCount > 0 ? score.averageRating : 500; // Default to 5.0 if no reviews
        
        // Penalty for suspicious activity
        uint256 suspiciousPenalty = score.suspiciousActivityCount * 50;
        
        // Calculate weighted score
        uint256 weightedScore = (baseScore * successRate * ratingWeight) / 50000; // Normalize
        
        // Apply penalty
        if (weightedScore > suspiciousPenalty) {
            weightedScore -= suspiciousPenalty;
        } else {
            weightedScore = 0;
        }
        
        return weightedScore;
    }
    
    /**
     * @notice Get seller rankings (top sellers by weighted score)
     * @param limit Maximum number of sellers to return
     * @return Arrays of seller addresses and their weighted scores
     */
    function getTopSellers(uint256 limit) external view returns (address[] memory sellers, uint256[] memory scores) {
        // This is a simplified implementation
        // In production, you'd want to maintain a sorted list or use off-chain indexing
        sellers = new address[](limit);
        scores = new uint256[](limit);
        
        // Placeholder implementation - would need proper sorting logic
        return (sellers, scores);
    }
    
    /**
     * @notice Suspend a user for suspicious activity
     * @param user Address to suspend
     * @param duration Suspension duration in seconds
     * @param reason Reason for suspension
     */
    function suspendUser(address user, uint256 duration, string calldata reason) external onlyDAO {
        DetailedReputationScore storage score = detailedReputationScores[user];
        score.isSuspended = true;
        score.suspensionEndTime = block.timestamp + duration;
        
        emit UserSuspended(user, score.suspensionEndTime, reason);
    }
    
    /**
     * @notice Get user's review history
     * @param user Address of the user
     * @return Array of review IDs for the user
     */
    function getUserReviews(address user) external view returns (uint256[] memory) {
        return userReviews[user];
    }
    
    /**
     * @notice Get detailed reputation information
     * @param user Address of the user
     * @return Detailed reputation score struct
     */
    function getDetailedReputation(address user) external view returns (DetailedReputationScore memory) {
        return detailedReputationScores[user];
    }

    /**
     * @notice Execute emergency refund within the emergency window
     * @param escrowId ID of the escrow
     */
    function executeEmergencyRefund(uint256 escrowId) external onlyDAO escrowExists(escrowId) {
        Escrow storage escrow = escrows[escrowId];
        
        require(escrow.emergencyRefundEnabled, "Emergency refund not enabled");
        require(block.timestamp <= escrow.createdAt + emergencyRefundWindow, "Emergency refund window expired");
        require(
            escrow.status == EscrowStatus.FUNDS_LOCKED || 
            escrow.status == EscrowStatus.DELIVERY_CONFIRMED ||
            escrow.status == EscrowStatus.DISPUTE_OPENED, 
            "Cannot execute emergency refund in current status"
        );
        
        // Refund buyer
        _refundBuyer(escrowId);
        
        escrow.status = EscrowStatus.RESOLVED_BUYER_WINS;
        escrow.resolvedAt = block.timestamp;
        
        emit EmergencyRefundExecuted(escrowId, escrow.buyer, escrow.amount);
        emit EscrowResolved(escrowId, escrow.status, msg.sender);
        
        // Send notifications
        _sendNotification(escrow.buyer, string(abi.encodePacked("Emergency refund executed for escrow #", _toString(escrowId))));
        _sendNotification(escrow.seller, string(abi.encodePacked("Emergency refund executed for escrow #", _toString(escrowId))));
    }
    
    /**
     * @notice Internal function to update detailed reputation
     * @param user Address of the user
     * @param scoreChange Change in reputation score (positive or negative)
     * @param reason Reason for the change
     */
    function _updateDetailedReputation(address user, int256 scoreChange, string memory reason) internal {
        DetailedReputationScore storage score = detailedReputationScores[user];
        
        ReputationTier oldTier = score.tier;
        uint256 oldScore = score.totalPoints;
        
        // Update total points
        int256 newScoreInt = int256(score.totalPoints) + scoreChange;
        score.totalPoints = newScoreInt < 0 ? 0 : uint256(newScoreInt);
        
        // Update tier
        ReputationTier newTier = this.getReputationTier(user);
        score.tier = newTier;
        
        // Update last activity
        score.lastActivityTimestamp = block.timestamp;
        
        // Track transaction outcomes
        if (keccak256(bytes(reason)) == keccak256(bytes("Successful transaction")) ||
            keccak256(bytes(reason)) == keccak256(bytes("Won dispute"))) {
            score.successfulTransactions++;
        } else if (keccak256(bytes(reason)) == keccak256(bytes("Lost dispute"))) {
            score.disputesLost++;
        }
        
        // Emit tier update if changed
        if (oldTier != newTier) {
            emit ReputationTierUpdated(user, oldTier, newTier);
        }
        
        // Check for suspicious activity patterns
        _checkSuspiciousActivity(user, reason);
    }
    
    /**
     * @notice Internal function to update reputation from a marketplace review
     * @param reviewId ID of the review
     */
    function _updateReputationFromReview(uint256 reviewId) internal {
        MarketplaceReview storage review = marketplaceReviews[reviewId];
        DetailedReputationScore storage revieweeScore = detailedReputationScores[review.reviewee];
        
        // Calculate points based on rating
        uint256 points = 0;
        if (review.rating == 5) points = 10;
        else if (review.rating == 4) points = 5;
        else if (review.rating == 3) points = 2;
        else if (review.rating == 2) points = 0;
        else if (review.rating == 1) points = 0; // No negative points to prevent gaming
        
        // Update detailed reputation
        _updateDetailedReputation(review.reviewee, int256(points), "Review received");
        
        // Update average rating
        _updateAverageRating(review.reviewee, review.rating);
    }
    
    /**
     * @notice Internal function to update average rating
     * @param user Address of the user
     * @param newRating New rating to include
     */
    function _updateAverageRating(address user, uint8 newRating) internal {
        DetailedReputationScore storage score = detailedReputationScores[user];
        
        if (score.reviewCount == 0) {
            score.averageRating = newRating * 100;
        } else {
            // Calculate new average (scaled by 100)
            uint256 totalRating = (score.averageRating * score.reviewCount) + (newRating * 100);
            score.averageRating = totalRating / (score.reviewCount + 1);
        }
        
        score.reviewCount++;
    }
    
    /**
     * @notice Internal function to check for suspicious activity
     * @param user Address of the user
     * @param reason Reason for the reputation change
     */
    function _checkSuspiciousActivity(address user, string memory reason) internal {
        DetailedReputationScore storage score = detailedReputationScores[user];
        
        // Check for rapid reputation changes (potential gaming)
        if (block.timestamp < score.lastActivityTimestamp + 1 hours) {
            score.suspiciousActivityCount++;
            
            emit SuspiciousActivityDetected(user, "Rapid activity", score.suspiciousActivityCount);
            
            // Auto-suspend if threshold exceeded
            if (score.suspiciousActivityCount >= suspiciousActivityThreshold) {
                score.isSuspended = true;
                score.suspensionEndTime = block.timestamp + 7 days;
                
                emit UserSuspended(user, score.suspensionEndTime, "Automatic suspension for suspicious activity");
            }
        }
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
     * @param newDays New delivery deadline in days
     */
    function setDeliveryDeadlineDays(uint256 newDays) external onlyDAO {
        deliveryDeadlineDays = newDays;
    }
    
    /**
     * @notice Set high-value transaction threshold
     * @param newThreshold New threshold for multi-sig requirement
     */
    function setHighValueThreshold(uint256 newThreshold) external onlyDAO {
        highValueThreshold = newThreshold;
    }
    
    /**
     * @notice Set time lock duration
     * @param newDuration New time lock duration in seconds
     */
    function setTimeLockDuration(uint256 newDuration) external onlyDAO {
        require(newDuration >= 1 hours && newDuration <= 7 days, "Invalid duration");
        timeLockDuration = newDuration;
    }
    
    /**
     * @notice Set emergency refund window
     * @param newWindow New emergency refund window in seconds
     */
    function setEmergencyRefundWindow(uint256 newWindow) external onlyDAO {
        require(newWindow >= 1 days && newWindow <= 30 days, "Invalid window");
        emergencyRefundWindow = newWindow;
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
    
    /**
     * @notice Update reputation (for testing purposes only)
     * @param user Address of the user
     * @param scoreChange Change in reputation score
     * @param reason Reason for the change
     */
    function updateReputationForTesting(address user, int256 scoreChange, string memory reason) external onlyDAO {
        _updateReputation(user, scoreChange, reason);
    }
    
    /**
     * @notice Set reputation tier thresholds
     * @param newThresholds Array of 6 threshold values for tiers
     */
    function setTierThresholds(uint256[6] calldata newThresholds) external onlyDAO {
        tierThresholds = newThresholds;
    }
    
    /**
     * @notice Set anti-gaming parameters
     */
    function setMinTimeBetweenReviews(uint256 newTime) external onlyDAO {
        minTimeBetweenReviews = newTime;
    }
    
    function setSuspiciousActivityThreshold(uint256 newThreshold) external onlyDAO {
        suspiciousActivityThreshold = newThreshold;
    }

    // Fallback function to receive ETH
    receive() external payable {}
}