// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./LDAOToken.sol";
import "./Governance.sol";

/**
 * @title LinkDAO Enhanced Escrow
 * @notice Enhanced escrow contract with automated release, delivery tracking, reputation integration,
 *         community dispute resolution, notification system, and NFT atomic swap support
 */
contract EnhancedEscrow is ReentrancyGuard, Ownable, IERC721Receiver, IERC1155Receiver {
    // Enum for escrow status
    enum EscrowStatus {
        CREATED,
        FUNDS_LOCKED,
        NFT_DEPOSITED,      // New: NFT deposited by seller
        READY_FOR_RELEASE,  // New: Both funds and NFT are in escrow
        DELIVERY_CONFIRMED,
        DISPUTE_OPENED,
        RESOLVED_BUYER_WINS,
        RESOLVED_SELLER_WINS,
        CANCELLED
    }

    // Enum for NFT standard
    enum NFTStandard {
        NONE,       // Not an NFT escrow
        ERC721,
        ERC1155
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
        // NFT fields for atomic swap
        NFTStandard nftStandard;
        address nftContractAddress;
        uint256 nftTokenId;
        uint256 nftAmount;          // For ERC1155 (always 1 for ERC721)
        bool nftDeposited;
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
    uint256 public constant DEADLINE_GRACE_PERIOD = 3 days; // Grace period after deadline before auto-refund
    uint256 public constant EMERGENCY_REFUND_DELAY = 24 hours; // Time lock for emergency actions

    // Dispute bond configuration
    uint256 public disputeBondPercentage = 500; // 5% of escrow amount (basis points)
    uint256 public constant MIN_DISPUTE_BOND = 0.01 ether; // Minimum bond amount
    uint256 public constant MAX_DISPUTE_BOND_PERCENTAGE = 2000; // Maximum 20% of escrow amount
    bool public disputeBondRequired = true; // Whether bonds are required

    // Platform default arbiter - CRITICAL: Never use buyer or seller as arbiter
    address public platformArbiter;
    
    // Cross-chain support
    uint256 public chainId;
    mapping(uint256 => uint256) public escrowChainId;
    
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

    // Dispute bond mappings
    mapping(uint256 => uint256) public disputeBonds; // escrowId => bond amount deposited

    mapping(uint256 => address) public disputeInitiator; // escrowId => who opened the dispute
    mapping(uint256 => uint256) public emergencyRefundTimelocks; // escrowId => timestamp when refund can be executed
    mapping(address => bool) public authorizedPlatformAddresses;
    
    // Events
    event EscrowCreated(uint256 indexed escrowId, address indexed buyer, address indexed seller, uint256 amount);
    event FundsLocked(uint256 indexed escrowId, uint256 amount);
    event NFTDeposited(uint256 indexed escrowId, address indexed nftContract, uint256 tokenId, NFTStandard standard);
    event NFTTransferred(uint256 indexed escrowId, address indexed to, address nftContract, uint256 tokenId);
    event EscrowReadyForRelease(uint256 indexed escrowId);
    event DeliveryConfirmed(uint256 indexed escrowId, string deliveryInfo);
    event DisputeOpened(uint256 indexed escrowId, DisputeResolutionMethod method);
    event VoteCast(uint256 indexed escrowId, address indexed voter, bool forBuyer, uint256 votingPower);
    event EscrowResolved(uint256 indexed escrowId, EscrowStatus resolution, address winner);
    event ReviewSubmitted(uint256 indexed reviewId, address indexed reviewer, address indexed reviewee, uint8 rating);
    event ReputationUpdated(address indexed user, uint256 newScore, ReputationTier newTier);
    event ArbitratorAppointed(uint256 indexed escrowId, address indexed arbitrator);
    event EmergencyRefund(uint256 indexed escrowId, address indexed buyer, uint256 amount);
    event EmergencyRefundInitiated(uint256 indexed escrowId, uint256 executionTime);
    event DeadlineRefund(uint256 indexed escrowId, address indexed buyer, uint256 amount, string reason);
    event PlatformArbiterUpdated(address indexed oldArbiter, address indexed newArbiter);
    event DisputeBondDeposited(uint256 indexed escrowId, address indexed depositor, uint256 amount);
    event DisputeBondRefunded(uint256 indexed escrowId, address indexed recipient, uint256 amount);
    event DisputeBondForfeited(uint256 indexed escrowId, address indexed loser, uint256 amount, address indexed winner);
    event DisputeBondConfigUpdated(uint256 newPercentage, bool required);
    event UserSuspended(address indexed user, uint256 duration, string reason);
    event PlatformAddressAuthorized(address indexed platformAddress, bool authorized);
    
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
    
    modifier onlySameChain(uint256 escrowId) {
        require(escrowChainId[escrowId] == chainId, "Escrow not on this chain");
        _;
    }

    modifier onlySeller(uint256 escrowId) {
        require(msg.sender == escrows[escrowId].seller, "Only seller can call this function");
        _;
    }

    constructor(address _ldaoToken, address _governance, address _platformArbiter) Ownable(msg.sender) {
        require(_platformArbiter != address(0), "Platform arbiter cannot be zero address");
        ldaoToken = LDAOToken(_ldaoToken);
        governance = Governance(_governance);
        platformArbiter = _platformArbiter;
        chainId = block.chainid;
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
        return _createEscrow(listingId, seller, tokenAddress, amount, deliveryDeadline, resolutionMethod, false, 0, 0);
    }
    
    /**
     * @notice Create a new escrow with multi-signature and time-lock requirements
     * @param listingId ID of the marketplace listing
     * @param seller Address of the seller
     * @param tokenAddress Address of the payment token (address(0) for ETH)
     * @param amount Amount to be escrowed
     * @param deliveryDeadline Deadline for delivery
     * @param resolutionMethod Dispute resolution method
     * @param requiresMultiSig Whether multi-signature is required
     * @param multiSigThreshold Number of signatures required to release funds
     * @param timeLockDuration Duration of time-lock in seconds
     * @return escrowId ID of the created escrow
     */
    function createEscrowWithSecurity(
        uint256 listingId,
        address seller,
        address tokenAddress,
        uint256 amount,
        uint256 deliveryDeadline,
        DisputeResolutionMethod resolutionMethod,
        bool requiresMultiSig,
        uint256 multiSigThreshold,
        uint256 timeLockDuration
    ) external payable nonReentrant notSuspended(msg.sender) notSuspended(seller) returns (uint256) {
        return _createEscrow(listingId, seller, tokenAddress, amount, deliveryDeadline, resolutionMethod, requiresMultiSig, multiSigThreshold, timeLockDuration);
    }
    
    /**
     * @notice Internal function to create a new escrow
     * @param listingId ID of the marketplace listing
     * @param seller Address of the seller
     * @param tokenAddress Address of the payment token (address(0) for ETH)
     * @param amount Amount to be escrowed
     * @param deliveryDeadline Deadline for delivery
     * @param resolutionMethod Dispute resolution method
     * @param requiresMultiSig Whether multi-signature is required
     * @param multiSigThreshold Number of signatures required to release funds
     * @param timeLockDuration Duration of time-lock in seconds
     * @return escrowId ID of the created escrow
     */
    function _createEscrow(
        uint256 listingId,
        address seller,
        address tokenAddress,
        uint256 amount,
        uint256 deliveryDeadline,
        DisputeResolutionMethod resolutionMethod,
        bool requiresMultiSig,
        uint256 multiSigThreshold,
        uint256 timeLockDuration
    ) internal returns (uint256) {
        require(seller != address(0), "Invalid seller address");
        require(seller != msg.sender, "Buyer and seller cannot be the same");
        require(amount > 0, "Amount must be greater than 0");
        require(deliveryDeadline > block.timestamp, "Delivery deadline must be in the future");
        
        // Validate multi-signature parameters
        if (requiresMultiSig) {
            require(multiSigThreshold > 0, "Multi-sig threshold must be greater than 0");
            require(multiSigThreshold <= 2, "Multi-sig threshold cannot exceed 2");
        }
        
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
        
        // Cross-chain support
        escrowChainId[escrowId] = chainId;

        // CRITICAL: Always set arbitrator to platform arbiter, never to buyer/seller
        if (resolutionMethod == DisputeResolutionMethod.ARBITRATOR) {
            newEscrow.appointedArbitrator = platformArbiter;
            emit ArbitratorAppointed(escrowId, platformArbiter);
        }

        // Set security features
        newEscrow.requiresMultiSig = requiresMultiSig;
        newEscrow.multiSigThreshold = requiresMultiSig ? multiSigThreshold : 0;
        
        // Set time-lock expiry if duration is specified
        if (timeLockDuration > 0) {
            newEscrow.timeLockExpiry = block.timestamp + timeLockDuration;
        }
        
        userEscrows[msg.sender].push(escrowId);
        userEscrows[seller].push(escrowId);
        
        emit EscrowCreated(escrowId, msg.sender, seller, amount);
        
        return escrowId;
    }

    /**
     * @notice Lock funds in escrow
     * @param escrowId ID of the escrow
     */
    function lockFunds(uint256 escrowId) external payable nonReentrant escrowExists(escrowId) onlySameChain(escrowId) {
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
    function confirmDelivery(uint256 escrowId, string memory deliveryInfo) 
        external 
        escrowExists(escrowId) 
        onlyParticipant(escrowId) 
        onlySameChain(escrowId)
    {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.status == EscrowStatus.FUNDS_LOCKED, "Invalid escrow status");
        
        // If multi-signature is required, record the signature instead of releasing funds
        if (escrow.requiresMultiSig) {
            _addSignature(escrowId);
            
            // Check if we have enough signatures
            if (escrow.signatureCount >= escrow.multiSigThreshold) {
                _finalizeDeliveryConfirmation(escrowId, deliveryInfo);
            } else {
                // Just store the delivery info for now
                escrow.deliveryInfo = deliveryInfo;
                emit DeliveryConfirmed(escrowId, deliveryInfo);
            }
        } else {
            // Standard delivery confirmation
            _finalizeDeliveryConfirmation(escrowId, deliveryInfo);
        }
    }
    
    /**
     * @notice Add a signature for multi-signature escrow
     * @param escrowId ID of the escrow
     */
    function addSignature(uint256 escrowId) external escrowExists(escrowId) onlyParticipant(escrowId) onlySameChain(escrowId) {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.requiresMultiSig, "Multi-signature not required for this escrow");
        require(escrow.status == EscrowStatus.FUNDS_LOCKED, "Invalid escrow status");
        require(!escrow.hasSignedRelease[msg.sender], "Already signed");
        
        _addSignature(escrowId);
        
        // Check if we have enough signatures to finalize
        if (escrow.signatureCount >= escrow.multiSigThreshold) {
            _finalizeDeliveryConfirmation(escrowId, escrow.deliveryInfo);
        }
    }
    
    /**
     * @notice Internal function to add a signature
     * @param escrowId ID of the escrow
     */
    function _addSignature(uint256 escrowId) internal {
        Escrow storage escrow = escrows[escrowId];
        escrow.hasSignedRelease[msg.sender] = true;
        escrow.signatureCount++;
    }
    
    /**
     * @notice Finalize delivery confirmation and release funds
     * @param escrowId ID of the escrow
     * @param deliveryInfo Delivery confirmation information
     */
    function _finalizeDeliveryConfirmation(uint256 escrowId, string memory deliveryInfo) internal {
        Escrow storage escrow = escrows[escrowId];
        
        // CHECKS: Validate time-lock if applicable
        if (escrow.timeLockExpiry > 0) {
            require(block.timestamp >= escrow.timeLockExpiry, "Time lock not expired");
        }
        
        // EFFECTS: Update all state BEFORE external calls
        escrow.deliveryInfo = deliveryInfo;
        escrow.status = EscrowStatus.DELIVERY_CONFIRMED;
        escrow.resolvedAt = block.timestamp;
        
        // Update reputation scores (state changes only, no external calls)
        _updateReputationOnSuccess(escrow.buyer, escrow.seller);
        
        // Emit events before external calls
        emit DeliveryConfirmed(escrowId, deliveryInfo);
        emit EscrowResolved(escrowId, EscrowStatus.DELIVERY_CONFIRMED, escrow.seller);
        
        // INTERACTIONS: External calls LAST
        _releaseFunds(escrowId, escrow.seller);
    }

    /**
     * @notice Calculate required dispute bond for an escrow
     * @param escrowId ID of the escrow
     * @return bondAmount The required bond amount
     */
    function calculateDisputeBond(uint256 escrowId) public view escrowExists(escrowId) returns (uint256 bondAmount) {
        Escrow storage escrow = escrows[escrowId];
        bondAmount = (escrow.amount * disputeBondPercentage) / 10000;

        // Ensure minimum bond
        if (bondAmount < MIN_DISPUTE_BOND) {
            bondAmount = MIN_DISPUTE_BOND;
        }

        return bondAmount;
    }

    /**
     * @notice Open a dispute (requires bond deposit)
     * @param escrowId ID of the escrow
     */
    function openDispute(uint256 escrowId) external payable escrowExists(escrowId) onlyParticipant(escrowId) onlySameChain(escrowId) {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.status == EscrowStatus.FUNDS_LOCKED, "Invalid escrow status");
        require(block.timestamp <= escrow.deliveryDeadline + 7 days, "Dispute period expired");

        // Handle dispute bond if required
        if (disputeBondRequired) {
            uint256 requiredBond = calculateDisputeBond(escrowId);
            require(msg.value >= requiredBond, "Insufficient dispute bond");

            // Store bond info
            disputeBonds[escrowId] = msg.value;
            disputeInitiator[escrowId] = msg.sender;

            // Refund excess
            if (msg.value > requiredBond) {
                (bool refunded, ) = payable(msg.sender).call{value: msg.value - requiredBond}("");
                require(refunded, "Failed to refund excess bond");
                disputeBonds[escrowId] = requiredBond;
            }

            emit DisputeBondDeposited(escrowId, msg.sender, disputeBonds[escrowId]);
        } else {
            disputeInitiator[escrowId] = msg.sender;
        }

        escrow.status = EscrowStatus.DISPUTE_OPENED;

        emit DisputeOpened(escrowId, escrow.resolutionMethod);
    }
    
    /**
     * @notice Automatically resolve a dispute after the voting period
     * @param escrowId ID of the escrow
     */
    function autoResolveDispute(uint256 escrowId) external escrowExists(escrowId) onlySameChain(escrowId) {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.status == EscrowStatus.DISPUTE_OPENED, "No active dispute");
        require(escrow.resolutionMethod == DisputeResolutionMethod.COMMUNITY_VOTING, "Not community voting");
        require(block.timestamp >= escrow.createdAt + VOTING_PERIOD, "Voting period not expired");
        
        // Automatically resolve the dispute based on votes
        _resolveDisputeByVoting(escrowId);
    }

    /**
     * @notice Cast a vote in community dispute resolution
     * @param escrowId ID of the escrow
     * @param forBuyer True to vote for buyer, false for seller
     */
    function castVote(uint256 escrowId, bool forBuyer) external escrowExists(escrowId) onlySameChain(escrowId) {
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
        onlySameChain(escrowId)
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

        // Handle dispute bond distribution
        _handleDisputeBondDistribution(escrowId, buyerWins);

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
        string memory reviewText
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
    function suspendUser(address user, uint256 duration, string memory reason) external onlyDAO {
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
     * @notice Get the chain ID where an escrow was created
     * @param escrowId ID of the escrow
     * @return chainId Chain ID where escrow was created
     */
    function getEscrowChainId(uint256 escrowId) external view escrowExists(escrowId) returns (uint256) {
        return escrowChainId[escrowId];
    }

    /**
     * @notice Initiate emergency refund (DAO only) - Step 1
     * @param escrowId ID of the escrow
     */
    function initiateEmergencyRefund(uint256 escrowId) external onlyDAO escrowExists(escrowId) {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.status == EscrowStatus.FUNDS_LOCKED || escrow.status == EscrowStatus.DISPUTE_OPENED, "Invalid status for refund");
        
        uint256 executionTime = block.timestamp + EMERGENCY_REFUND_DELAY;
        emergencyRefundTimelocks[escrowId] = executionTime;
        
        emit EmergencyRefundInitiated(escrowId, executionTime);
    }

    /**
     * @notice Execute emergency refund (DAO only) - Step 2
     * @param escrowId ID of the escrow
     */
    function executeEmergencyRefund(uint256 escrowId) external onlyDAO escrowExists(escrowId) {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.status == EscrowStatus.FUNDS_LOCKED || escrow.status == EscrowStatus.DISPUTE_OPENED, "Invalid status for refund");
        
        // Time-lock check
        require(emergencyRefundTimelocks[escrowId] > 0, "Refund not initiated");
        require(block.timestamp >= emergencyRefundTimelocks[escrowId], "Time lock active");
        
        // Clear timelock to prevent re-use (though status change handles this too)
        delete emergencyRefundTimelocks[escrowId];
        
        escrow.status = EscrowStatus.CANCELLED;
        escrow.resolvedAt = block.timestamp;
        
        _releaseFunds(escrowId, escrow.buyer);
        
        emit EmergencyRefund(escrowId, escrow.buyer, escrow.amount);
    }

    // Internal functions
    function _releaseFunds(uint256 escrowId, address recipient) internal {
        Escrow storage escrow = escrows[escrowId];
        
        // Cache values to memory
        uint256 amount = escrow.amount;
        uint256 fee = escrow.feeAmount;
        address token = escrow.tokenAddress;
        
        // Zero out storage (Effects)
        // This prevents reentrancy attacks where a malicious contract calls back 
        // into this function before state is updated
        escrow.amount = 0;
        escrow.feeAmount = 0;
        
        // Interactions
        if (token == address(0)) {
            // ETH payment
            if (amount > 0) {
                (bool sentToRecipient, ) = payable(recipient).call{value: amount}("");
                require(sentToRecipient, "Failed to send ETH to recipient");
            }
            
            if (fee > 0) {
                (bool sentToOwner, ) = payable(owner()).call{value: fee}("");
                require(sentToOwner, "Failed to send ETH to owner");
            }
        } else {
            // ERC20 token payment
            if (amount > 0) {
                IERC20(token).transfer(recipient, amount);
            }
            if (fee > 0) {
                IERC20(token).transfer(owner(), fee);
            }
        }
    }

    function _resolveDisputeByVoting(uint256 escrowId) internal {
        Escrow storage escrow = escrows[escrowId];

        bool buyerWins = escrow.votesForBuyer > escrow.votesForSeller;

        // EFFECTS: Update all state BEFORE external calls
        if (buyerWins) {
            escrow.status = EscrowStatus.RESOLVED_BUYER_WINS;
        } else {
            escrow.status = EscrowStatus.RESOLVED_SELLER_WINS;
        }

        escrow.resolvedAt = block.timestamp;
        
        // Update reputation (state changes only, no external calls)
        _updateReputationOnDispute(escrow.buyer, escrow.seller, buyerWins);

        // Emit event before external calls
        emit EscrowResolved(escrowId, escrow.status, buyerWins ? escrow.buyer : escrow.seller);

        // INTERACTIONS: External calls LAST
        if (buyerWins) {
            _releaseFunds(escrowId, escrow.buyer);
        } else {
            _releaseFunds(escrowId, escrow.seller);
        }

        // Handle dispute bond distribution (contains external calls)
        _handleDisputeBondDistribution(escrowId, buyerWins);
    }

    /**
     * @notice Handle dispute bond distribution after resolution
     * @param escrowId ID of the escrow
     * @param buyerWins Whether the buyer won the dispute
     */
    function _handleDisputeBondDistribution(uint256 escrowId, bool buyerWins) internal {
        uint256 bondAmount = disputeBonds[escrowId];
        if (bondAmount == 0) return;

        Escrow storage escrow = escrows[escrowId];
        address initiator = disputeInitiator[escrowId];
        bool initiatorWon = (initiator == escrow.buyer && buyerWins) ||
                           (initiator == escrow.seller && !buyerWins);

        // EFFECTS: Clear bond data BEFORE external calls to prevent reentrancy
        disputeBonds[escrowId] = 0;
        disputeInitiator[escrowId] = address(0);

        // INTERACTIONS: External calls LAST
        if (initiatorWon) {
            // Refund bond to winner (dispute initiator)
            (bool sent, ) = payable(initiator).call{value: bondAmount}("");
            require(sent, "Failed to refund bond");
            emit DisputeBondRefunded(escrowId, initiator, bondAmount);
        } else {
            // Bond forfeited - give to the winner
            address winner = buyerWins ? escrow.buyer : escrow.seller;
            (bool sent, ) = payable(winner).call{value: bondAmount}("");
            require(sent, "Failed to transfer forfeited bond");
        }
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

    /**
     * @notice Set platform arbiter address
     * @param newArbiter Address of the new platform arbiter
     */
    function setPlatformArbiter(address newArbiter) external onlyOwner {
        require(newArbiter != address(0), "Arbiter cannot be zero address");
        address oldArbiter = platformArbiter;
        platformArbiter = newArbiter;
        emit PlatformArbiterUpdated(oldArbiter, newArbiter);
    }

    /**
     * @notice Authorize or deauthorize a platform address
     * @param platformAddress Address to authorize/deauthorize
     * @param authorized Whether the address is authorized
     */
    function authorizePlatformAddress(address platformAddress, bool authorized) external onlyOwner {
        require(platformAddress != address(0), "Invalid platform address");
        authorizedPlatformAddresses[platformAddress] = authorized;
        emit PlatformAddressAuthorized(platformAddress, authorized);
    }

    /**
     * @notice Configure dispute bond settings
     * @param newPercentage New bond percentage in basis points (e.g., 500 = 5%)
     * @param required Whether bonds are required
     */
    function setDisputeBondConfig(uint256 newPercentage, bool required) external onlyOwner {
        require(newPercentage <= MAX_DISPUTE_BOND_PERCENTAGE, "Percentage too high");
        disputeBondPercentage = newPercentage;
        disputeBondRequired = required;
        emit DisputeBondConfigUpdated(newPercentage, required);
    }

    /**
     * @notice Get dispute bond configuration
     * @return percentage Current bond percentage in basis points
     * @return minBond Minimum bond amount
     * @return required Whether bonds are required
     */
    function getDisputeBondConfig() external view returns (uint256 percentage, uint256 minBond, bool required) {
        return (disputeBondPercentage, MIN_DISPUTE_BOND, disputeBondRequired);
    }

    // ==================== AUTOMATIC TIMEOUT ENFORCEMENT ====================

    /**
     * @notice Check if escrow is eligible for deadline refund
     * @param escrowId ID of the escrow
     * @return eligible Whether the escrow is eligible for deadline refund
     * @return reason The reason for eligibility or ineligibility
     */
    function isEligibleForDeadlineRefund(uint256 escrowId) public view escrowExists(escrowId) returns (bool eligible, string memory reason) {
        Escrow storage escrow = escrows[escrowId];

        // Must be in a state where funds are locked
        if (escrow.status != EscrowStatus.FUNDS_LOCKED &&
            escrow.status != EscrowStatus.NFT_DEPOSITED &&
            escrow.status != EscrowStatus.CREATED) {
            return (false, "Escrow not in refundable status");
        }

        // Deadline must have passed plus grace period
        if (block.timestamp <= escrow.deliveryDeadline + DEADLINE_GRACE_PERIOD) {
            return (false, "Deadline grace period not expired");
        }

        return (true, "Eligible for deadline refund");
    }

    /**
     * @notice Claim refund after delivery deadline has passed
     * @dev Can be called by buyer or any keeper/automated service
     * @param escrowId ID of the escrow
     */
    function claimDeadlineRefund(uint256 escrowId) external nonReentrant escrowExists(escrowId) onlySameChain(escrowId) {
        Escrow storage escrow = escrows[escrowId];

        (bool eligible, string memory reason) = isEligibleForDeadlineRefund(escrowId);
        require(eligible, reason);

        // Check if funds were actually locked
        bool fundsLocked = escrow.status == EscrowStatus.FUNDS_LOCKED ||
                          escrow.status == EscrowStatus.NFT_DEPOSITED ||
                          (escrow.nftStandard != NFTStandard.NONE && escrow.status == EscrowStatus.CREATED);

        escrow.status = EscrowStatus.CANCELLED;
        escrow.resolvedAt = block.timestamp;

        // Return NFT to seller if it was deposited
        if (escrow.nftDeposited) {
            _transferNFT(escrowId, escrow.seller);
        }

        // Return funds to buyer if they were locked
        if (fundsLocked && escrow.status != EscrowStatus.CREATED) {
            _releaseFunds(escrowId, escrow.buyer);
        }

        emit DeadlineRefund(escrowId, escrow.buyer, escrow.amount, "Delivery deadline exceeded");
    }

    /**
     * @notice Refund buyer (called by seller or authorized platform address)
     * @param escrowId ID of the escrow
     */
    function refundBuyer(uint256 escrowId) external nonReentrant escrowExists(escrowId) onlySameChain(escrowId) {
        Escrow storage escrow = escrows[escrowId];
        
        require(
            msg.sender == escrow.seller || 
            authorizedPlatformAddresses[msg.sender] || 
            msg.sender == owner(),
            "Not authorized to refund"
        );
        
        require(
            escrow.status != EscrowStatus.CANCELLED &&
            escrow.status != EscrowStatus.DELIVERY_CONFIRMED &&
            escrow.status != EscrowStatus.RESOLVED_BUYER_WINS &&
            escrow.status != EscrowStatus.RESOLVED_SELLER_WINS,
            "Invalid status for refund"
        );

        // Funds are locked if in these states
        bool fundsLocked = (
            escrow.status == EscrowStatus.FUNDS_LOCKED ||
            escrow.status == EscrowStatus.READY_FOR_RELEASE ||
            escrow.status == EscrowStatus.DISPUTE_OPENED
        );

        escrow.status = EscrowStatus.CANCELLED;
        escrow.resolvedAt = block.timestamp;

        // Return NFT to seller if deposited
        if (escrow.nftDeposited) {
            _transferNFT(escrowId, escrow.seller);
        }

        // Return funds to buyer if locked
        if (fundsLocked) {
             _releaseFunds(escrowId, escrow.buyer);
        }

        emit EscrowResolved(escrowId, EscrowStatus.CANCELLED, escrow.buyer);
    }

    /**
     * @notice Claim refund after delivery deadline for NFT escrow
     * @param escrowId ID of the escrow
     */
    function claimNFTDeadlineRefund(uint256 escrowId) external nonReentrant escrowExists(escrowId) onlySameChain(escrowId) {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.nftStandard != NFTStandard.NONE, "Not an NFT escrow");

        (bool eligible, string memory reason) = isEligibleForDeadlineRefund(escrowId);
        require(eligible, reason);

        escrow.status = EscrowStatus.CANCELLED;
        escrow.resolvedAt = block.timestamp;

        // Return NFT to seller if deposited
        if (escrow.nftDeposited) {
            _transferNFT(escrowId, escrow.seller);
        }

        // Return funds to buyer
        if (escrow.status == EscrowStatus.FUNDS_LOCKED ||
            escrow.status == EscrowStatus.NFT_DEPOSITED ||
            escrow.status == EscrowStatus.READY_FOR_RELEASE) {
            _releaseFunds(escrowId, escrow.buyer);
        }

        emit DeadlineRefund(escrowId, escrow.buyer, escrow.amount, "NFT delivery deadline exceeded");
    }

    /**
     * @notice Get remaining time until deadline refund is available
     * @param escrowId ID of the escrow
     * @return timeRemaining Seconds until refund is available (0 if already available)
     */
    function getTimeUntilDeadlineRefund(uint256 escrowId) external view escrowExists(escrowId) returns (uint256 timeRemaining) {
        Escrow storage escrow = escrows[escrowId];
        uint256 refundAvailableAt = escrow.deliveryDeadline + DEADLINE_GRACE_PERIOD;

        if (block.timestamp >= refundAvailableAt) {
            return 0;
        }

        return refundAvailableAt - block.timestamp;
    }

    // ==================== NFT ATOMIC SWAP FUNCTIONS ====================

    /**
     * @notice Create a new escrow for NFT purchase with atomic swap
     * @param listingId ID of the marketplace listing
     * @param seller Address of the seller (NFT owner)
     * @param tokenAddress Address of the payment token (address(0) for ETH)
     * @param amount Payment amount
     * @param deliveryDeadline Deadline for NFT deposit and confirmation
     * @param resolutionMethod Dispute resolution method
     * @param nftStandard The NFT standard (ERC721 or ERC1155)
     * @param nftContractAddress Address of the NFT contract
     * @param nftTokenId Token ID of the NFT
     * @param nftAmount Amount of NFTs (for ERC1155, always 1 for ERC721)
     * @return escrowId ID of the created escrow
     */
    function createNFTEscrow(
        uint256 listingId,
        address seller,
        address tokenAddress,
        uint256 amount,
        uint256 deliveryDeadline,
        DisputeResolutionMethod resolutionMethod,
        NFTStandard nftStandard,
        address nftContractAddress,
        uint256 nftTokenId,
        uint256 nftAmount
    ) external payable nonReentrant notSuspended(msg.sender) notSuspended(seller) returns (uint256) {
        require(seller != address(0), "Invalid seller address");
        require(seller != msg.sender, "Buyer and seller cannot be the same");
        require(amount > 0, "Amount must be greater than 0");
        require(deliveryDeadline > block.timestamp, "Delivery deadline must be in the future");
        require(nftStandard != NFTStandard.NONE, "NFT standard must be specified");
        require(nftContractAddress != address(0), "Invalid NFT contract address");
        require(nftAmount > 0, "NFT amount must be greater than 0");

        // For ERC721, amount must be 1
        if (nftStandard == NFTStandard.ERC721) {
            require(nftAmount == 1, "ERC721 amount must be 1");
        }

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

        // Set NFT details
        newEscrow.nftStandard = nftStandard;
        newEscrow.nftContractAddress = nftContractAddress;
        newEscrow.nftTokenId = nftTokenId;
        newEscrow.nftAmount = nftAmount;
        newEscrow.nftDeposited = false;

        // Cross-chain support
        escrowChainId[escrowId] = chainId;

        // CRITICAL: Always set arbitrator to platform arbiter, never to buyer/seller
        if (resolutionMethod == DisputeResolutionMethod.ARBITRATOR) {
            newEscrow.appointedArbitrator = platformArbiter;
            emit ArbitratorAppointed(escrowId, platformArbiter);
        }

        userEscrows[msg.sender].push(escrowId);
        userEscrows[seller].push(escrowId);

        emit EscrowCreated(escrowId, msg.sender, seller, amount);

        return escrowId;
    }

    /**
     * @notice Deposit NFT into escrow (called by seller)
     * @param escrowId ID of the escrow
     */
    function depositNFT(uint256 escrowId)
        external
        nonReentrant
        escrowExists(escrowId)
        onlySeller(escrowId)
        onlySameChain(escrowId)
    {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.nftStandard != NFTStandard.NONE, "Not an NFT escrow");
        require(!escrow.nftDeposited, "NFT already deposited");
        require(
            escrow.status == EscrowStatus.CREATED || escrow.status == EscrowStatus.FUNDS_LOCKED,
            "Invalid escrow status for NFT deposit"
        );

        // Transfer NFT from seller to this contract
        if (escrow.nftStandard == NFTStandard.ERC721) {
            IERC721(escrow.nftContractAddress).safeTransferFrom(
                msg.sender,
                address(this),
                escrow.nftTokenId
            );
        } else if (escrow.nftStandard == NFTStandard.ERC1155) {
            IERC1155(escrow.nftContractAddress).safeTransferFrom(
                msg.sender,
                address(this),
                escrow.nftTokenId,
                escrow.nftAmount,
                ""
            );
        }

        escrow.nftDeposited = true;

        // Update status based on whether funds are already locked
        if (escrow.status == EscrowStatus.FUNDS_LOCKED) {
            escrow.status = EscrowStatus.READY_FOR_RELEASE;
            emit EscrowReadyForRelease(escrowId);
        } else {
            escrow.status = EscrowStatus.NFT_DEPOSITED;
        }

        emit NFTDeposited(escrowId, escrow.nftContractAddress, escrow.nftTokenId, escrow.nftStandard);
    }

    /**
     * @notice Lock funds in NFT escrow (overload for NFT escrows)
     * @param escrowId ID of the escrow
     */
    function lockFundsForNFT(uint256 escrowId) external payable nonReentrant escrowExists(escrowId) onlySameChain(escrowId) {
        Escrow storage escrow = escrows[escrowId];
        require(msg.sender == escrow.buyer, "Only buyer can lock funds");
        require(escrow.nftStandard != NFTStandard.NONE, "Use lockFunds for non-NFT escrows");
        require(
            escrow.status == EscrowStatus.CREATED || escrow.status == EscrowStatus.NFT_DEPOSITED,
            "Invalid escrow status"
        );

        uint256 totalAmount = escrow.amount + escrow.feeAmount;

        if (escrow.tokenAddress == address(0)) {
            // ETH payment
            require(msg.value == totalAmount, "Incorrect ETH amount");
        } else {
            // ERC20 token payment
            require(msg.value == 0, "ETH not accepted for token payments");
            IERC20(escrow.tokenAddress).transferFrom(msg.sender, address(this), totalAmount);
        }

        // Update status based on whether NFT is already deposited
        if (escrow.nftDeposited) {
            escrow.status = EscrowStatus.READY_FOR_RELEASE;
            emit EscrowReadyForRelease(escrowId);
        } else {
            escrow.status = EscrowStatus.FUNDS_LOCKED;
        }

        emit FundsLocked(escrowId, escrow.amount);
    }

    /**
     * @notice Confirm NFT delivery and execute atomic swap
     * @param escrowId ID of the escrow
     * @param deliveryInfo Delivery confirmation information
     */
    function confirmNFTDelivery(uint256 escrowId, string memory deliveryInfo)
        external
        escrowExists(escrowId)
        onlySameChain(escrowId)
    {
        Escrow storage escrow = escrows[escrowId];
        require(msg.sender == escrow.buyer, "Only buyer can confirm NFT delivery");
        require(escrow.nftStandard != NFTStandard.NONE, "Not an NFT escrow");
        require(escrow.status == EscrowStatus.READY_FOR_RELEASE, "Escrow not ready for release");

        escrow.deliveryInfo = deliveryInfo;
        escrow.status = EscrowStatus.DELIVERY_CONFIRMED;
        escrow.resolvedAt = block.timestamp;

        // Execute atomic swap: NFT to buyer, funds to seller
        _transferNFT(escrowId, escrow.buyer);
        _releaseFunds(escrowId, escrow.seller);

        // Update reputation scores
        _updateReputationOnSuccess(escrow.buyer, escrow.seller);

        emit DeliveryConfirmed(escrowId, deliveryInfo);
        emit EscrowResolved(escrowId, EscrowStatus.DELIVERY_CONFIRMED, escrow.seller);
    }

    /**
     * @notice Internal function to transfer NFT
     * @param escrowId ID of the escrow
     * @param recipient Address to receive the NFT
     */
    function _transferNFT(uint256 escrowId, address recipient) internal {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.nftDeposited, "NFT not deposited");

        if (escrow.nftStandard == NFTStandard.ERC721) {
            IERC721(escrow.nftContractAddress).safeTransferFrom(
                address(this),
                recipient,
                escrow.nftTokenId
            );
        } else if (escrow.nftStandard == NFTStandard.ERC1155) {
            IERC1155(escrow.nftContractAddress).safeTransferFrom(
                address(this),
                recipient,
                escrow.nftTokenId,
                escrow.nftAmount,
                ""
            );
        }

        emit NFTTransferred(escrowId, recipient, escrow.nftContractAddress, escrow.nftTokenId);
    }

    /**
     * @notice Resolve NFT dispute - returns NFT to seller or transfers to buyer
     * @param escrowId ID of the escrow
     * @param buyerWins True if buyer wins, false if seller wins
     */
    function resolveNFTDisputeByArbitrator(uint256 escrowId, bool buyerWins)
        external
        escrowExists(escrowId)
        onlyArbitrator(escrowId)
        onlySameChain(escrowId)
    {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.status == EscrowStatus.DISPUTE_OPENED, "No active dispute");
        require(escrow.nftStandard != NFTStandard.NONE, "Use resolveDisputeByArbitrator for non-NFT escrows");
        require(escrow.resolutionMethod == DisputeResolutionMethod.ARBITRATOR, "Not arbitrator resolution");

        if (buyerWins) {
            escrow.status = EscrowStatus.RESOLVED_BUYER_WINS;
            // Buyer gets both NFT and refund
            if (escrow.nftDeposited) {
                _transferNFT(escrowId, escrow.buyer);
            }
            _releaseFunds(escrowId, escrow.buyer);
            _updateReputationOnDispute(escrow.buyer, escrow.seller, true);
        } else {
            escrow.status = EscrowStatus.RESOLVED_SELLER_WINS;
            // Seller gets NFT back and payment
            if (escrow.nftDeposited) {
                _transferNFT(escrowId, escrow.seller);
            }
            _releaseFunds(escrowId, escrow.seller);
            _updateReputationOnDispute(escrow.buyer, escrow.seller, false);
        }

        escrow.resolvedAt = block.timestamp;

        emit EscrowResolved(escrowId, escrow.status, buyerWins ? escrow.buyer : escrow.seller);
    }

    /**
     * @notice Open dispute for NFT escrow
     * @param escrowId ID of the escrow
     */
    function openNFTDispute(uint256 escrowId) external escrowExists(escrowId) onlyParticipant(escrowId) onlySameChain(escrowId) {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.nftStandard != NFTStandard.NONE, "Use openDispute for non-NFT escrows");
        require(
            escrow.status == EscrowStatus.FUNDS_LOCKED ||
            escrow.status == EscrowStatus.NFT_DEPOSITED ||
            escrow.status == EscrowStatus.READY_FOR_RELEASE,
            "Invalid escrow status for dispute"
        );
        require(block.timestamp <= escrow.deliveryDeadline + 7 days, "Dispute period expired");

        escrow.status = EscrowStatus.DISPUTE_OPENED;

        emit DisputeOpened(escrowId, escrow.resolutionMethod);
    }

    /**
     * @notice Emergency refund for NFT escrow (DAO only)
     * @param escrowId ID of the escrow
     */
    function executeNFTEmergencyRefund(uint256 escrowId) external onlyDAO escrowExists(escrowId) {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.nftStandard != NFTStandard.NONE, "Use executeEmergencyRefund for non-NFT escrows");
        require(
            escrow.status == EscrowStatus.FUNDS_LOCKED ||
            escrow.status == EscrowStatus.NFT_DEPOSITED ||
            escrow.status == EscrowStatus.READY_FOR_RELEASE ||
            escrow.status == EscrowStatus.DISPUTE_OPENED,
            "Invalid status for refund"
        );

        escrow.status = EscrowStatus.CANCELLED;
        escrow.resolvedAt = block.timestamp;

        // Return NFT to seller if deposited
        if (escrow.nftDeposited) {
            _transferNFT(escrowId, escrow.seller);
        }

        // Return funds to buyer if locked
        if (escrow.status == EscrowStatus.FUNDS_LOCKED ||
            escrow.status == EscrowStatus.READY_FOR_RELEASE) {
            _releaseFunds(escrowId, escrow.buyer);
        }

        emit EmergencyRefund(escrowId, escrow.buyer, escrow.amount);
    }

    /**
     * @notice Get NFT escrow details
     * @param escrowId ID of the escrow
     * @return nftStandard The NFT standard
     * @return nftContractAddress The NFT contract address
     * @return nftTokenId The token ID
     * @return nftAmount The amount (for ERC1155)
     * @return nftDeposited Whether the NFT has been deposited
     */
    function getNFTEscrowDetails(uint256 escrowId)
        external
        view
        escrowExists(escrowId)
        returns (
            NFTStandard nftStandard,
            address nftContractAddress,
            uint256 nftTokenId,
            uint256 nftAmount,
            bool nftDeposited
        )
    {
        Escrow storage escrow = escrows[escrowId];
        return (
            escrow.nftStandard,
            escrow.nftContractAddress,
            escrow.nftTokenId,
            escrow.nftAmount,
            escrow.nftDeposited
        );
    }

    // ==================== ERC721/ERC1155 RECEIVER IMPLEMENTATIONS ====================

    /**
     * @notice Handle ERC721 token reception
     * @dev Implementation of IERC721Receiver
     */
    function onERC721Received(
        address /* operator */,
        address /* from */,
        uint256 /* tokenId */,
        bytes calldata /* data */
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    /**
     * @notice Handle ERC1155 single token reception
     * @dev Implementation of IERC1155Receiver
     */
    function onERC1155Received(
        address /* operator */,
        address /* from */,
        uint256 /* id */,
        uint256 /* value */,
        bytes calldata /* data */
    ) external pure override returns (bytes4) {
        return IERC1155Receiver.onERC1155Received.selector;
    }

    /**
     * @notice Handle ERC1155 batch token reception
     * @dev Implementation of IERC1155Receiver
     */
    function onERC1155BatchReceived(
        address /* operator */,
        address /* from */,
        uint256[] calldata /* ids */,
        uint256[] calldata /* values */,
        bytes calldata /* data */
    ) external pure override returns (bytes4) {
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    /**
     * @notice Check if contract supports an interface
     * @dev Implementation of ERC165
     */
    function supportsInterface(bytes4 interfaceId) public pure override(IERC165) returns (bool) {
        return
            interfaceId == type(IERC721Receiver).interfaceId ||
            interfaceId == type(IERC1155Receiver).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }
}