// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title ReputationSystem
 * @notice A comprehensive reputation system with weighted scoring, anti-gaming mechanisms,
 *         and community moderation for the Web3 marketplace
 */
contract ReputationSystem is ReentrancyGuard, Ownable {
    using ECDSA for bytes32;

    // Enum for reputation tiers
    enum ReputationTier {
        NEWCOMER,     // 0-49 points
        BRONZE,       // 50-199 points  
        SILVER,       // 200-499 points
        GOLD,         // 500-999 points
        PLATINUM,     // 1000-2499 points
        DIAMOND       // 2500+ points
    }

    // Enum for review status
    enum ReviewStatus {
        PENDING,
        VERIFIED,
        DISPUTED,
        REJECTED
    }

    // Struct for individual review
    struct Review {
        uint256 id;
        address reviewer;
        address reviewee;
        uint256 orderId;
        uint8 rating; // 1-5 stars
        string ipfsHash; // IPFS hash for review content
        uint256 timestamp;
        ReviewStatus status;
        uint256 helpfulVotes;
        uint256 unhelpfulVotes;
        bool isVerifiedPurchase;
        uint256 reviewerReputationAtTime; // Reviewer's reputation when review was made
    }

    // Struct for reputation score details
    struct ReputationScore {
        uint256 totalPoints;
        uint256 reviewCount;
        uint256 averageRating; // Scaled by 100 (e.g., 450 = 4.5 stars)
        uint256 weightedScore;
        uint256 lastUpdated;
        ReputationTier tier;
        // Anti-gaming metrics
        uint256 suspiciousActivityCount;
        uint256 lastReviewTimestamp;
        bool isSuspended;
        uint256 suspensionEndTime;
    }

    // Struct for seller ranking
    struct SellerRanking {
        address seller;
        uint256 score;
        uint256 salesCount;
        uint256 averageRating;
        ReputationTier tier;
    }

    // Mappings
    mapping(address => ReputationScore) public reputationScores;
    mapping(uint256 => Review) public reviews;
    mapping(address => mapping(address => bool)) public hasReviewed; // reviewer => reviewee => bool
    mapping(address => uint256[]) public userReviews; // user => review IDs
    mapping(address => bool) public verifiedModerators;
    mapping(address => uint256) public moderatorReputationThreshold;
    mapping(uint256 => mapping(address => bool)) public reviewHasVoted; // reviewId => voter => hasVoted

    // New mappings for enhanced reputation tracking
    mapping(address => uint256) public successfulTransactions;
    mapping(address => uint256) public totalSales;
    mapping(address => uint256) public totalRevenue;
    mapping(address => uint256) public responseTime; // Average response time in seconds
    
    // Counters
    uint256 public nextReviewId = 1;
    uint256 public totalReviews = 0;

    // Configuration parameters
    uint256 public minReviewInterval = 1 hours; // Minimum time between reviews from same user
    uint256 public maxReviewsPerDay = 10; // Maximum reviews per user per day
    uint256 public suspiciousActivityThreshold = 5; // Threshold for suspicious activity
    uint256 public moderatorMinReputation = 500; // Minimum reputation to become moderator
    uint256 public reviewVerificationReward = 5; // Points for verified reviews
    uint256 public helpfulVoteWeight = 2; // Weight for helpful votes

    // Events
    event ReviewSubmitted(uint256 indexed reviewId, address indexed reviewer, address indexed reviewee, uint8 rating);
    event ReviewVerified(uint256 indexed reviewId, address indexed moderator);
    event ReputationUpdated(address indexed user, uint256 newScore, ReputationTier newTier);
    event SuspiciousActivityDetected(address indexed user, string reason);
    event UserSuspended(address indexed user, uint256 duration, string reason);
    event ModeratorAdded(address indexed moderator);
    event ModeratorRemoved(address indexed moderator);
    event HelpfulVoteCast(uint256 indexed reviewId, address indexed voter, bool isHelpful);

    // Modifiers
    modifier reviewExists(uint256 reviewId) {
        require(reviewId > 0 && reviewId < nextReviewId, "Review does not exist");
        _;
    }

    modifier onlyModerator() {
        require(verifiedModerators[msg.sender], "Only verified moderators can call this function");
        _;
    }

    modifier notSuspended(address user) {
        ReputationScore storage score = reputationScores[user];
        require(!score.isSuspended || block.timestamp >= score.suspensionEndTime, "User is suspended");
        _;
    }

    constructor() {}

    /**
     * @notice Submit a review for a completed transaction
     * @param reviewee Address being reviewed
     * @param orderId ID of the completed order
     * @param rating Rating from 1-5
     * @param ipfsHash IPFS hash containing review details
     * @param isVerifiedPurchase Whether this is from a verified purchase
     * @return reviewId ID of the created review
     */
    function submitReview(
        address reviewee,
        uint256 orderId,
        uint8 rating,
        string calldata ipfsHash,
        bool isVerifiedPurchase
    ) external nonReentrant notSuspended(msg.sender) returns (uint256) {
        require(reviewee != address(0), "Invalid reviewee address");
        require(reviewee != msg.sender, "Cannot review yourself");
        require(rating >= 1 && rating <= 5, "Rating must be between 1 and 5");
        require(bytes(ipfsHash).length > 0, "IPFS hash required");
        require(!hasReviewed[msg.sender][reviewee], "Already reviewed this user");

        // Anti-gaming: Check review frequency
        ReputationScore storage reviewerScore = reputationScores[msg.sender];
        require(
            block.timestamp >= reviewerScore.lastReviewTimestamp + minReviewInterval,
            "Review submitted too soon"
        );

        uint256 reviewId = nextReviewId++;
        
        Review storage review = reviews[reviewId];
        review.id = reviewId;
        review.reviewer = msg.sender;
        review.reviewee = reviewee;
        review.orderId = orderId;
        review.rating = rating;
        review.ipfsHash = ipfsHash;
        review.timestamp = block.timestamp;
        review.status = isVerifiedPurchase ? ReviewStatus.VERIFIED : ReviewStatus.PENDING;
        review.isVerifiedPurchase = isVerifiedPurchase;
        review.reviewerReputationAtTime = reviewerScore.totalPoints;

        // Update mappings
        hasReviewed[msg.sender][reviewee] = true;
        userReviews[reviewee].push(reviewId);
        totalReviews++;

        // Update reviewer's last review timestamp
        reviewerScore.lastReviewTimestamp = block.timestamp;

        // Update reviewee's reputation
        _updateReputation(reviewee, rating, isVerifiedPurchase);

        emit ReviewSubmitted(reviewId, msg.sender, reviewee, rating);

        return reviewId;
    }

    /**
     * @notice Cast a helpful/unhelpful vote on a review
     * @param reviewId ID of the review
     * @param isHelpful True for helpful, false for unhelpful
     */
    function castHelpfulVote(uint256 reviewId, bool isHelpful) external reviewExists(reviewId) notSuspended(msg.sender) {
        Review storage review = reviews[reviewId];
        require(!reviewHasVoted[reviewId][msg.sender], "Already voted on this review");
        require(msg.sender != review.reviewer, "Cannot vote on own review");

        reviewHasVoted[reviewId][msg.sender] = true;
        
        if (isHelpful) {
            review.helpfulVotes++;
            // Award small reputation boost to reviewer for helpful review
            _updateReputationPoints(review.reviewer, 1, "Helpful review");
        } else {
            review.unhelpfulVotes++;
        }

        emit HelpfulVoteCast(reviewId, msg.sender, isHelpful);
    }

    /**
     * @notice Verify a review (moderator only)
     * @param reviewId ID of the review
     */
    function verifyReview(uint256 reviewId) external reviewExists(reviewId) onlyModerator {
        Review storage review = reviews[reviewId];
        require(review.status == ReviewStatus.PENDING, "Review not pending verification");

        review.status = ReviewStatus.VERIFIED;
        
        // Award verification reward to reviewer
        _updateReputationPoints(review.reviewer, reviewVerificationReward, "Review verified");

        emit ReviewVerified(reviewId, msg.sender);
    }

    /**
     * @notice Get reputation score for a user
     * @param user Address of the user
     * @return score Reputation score details
     */
    function getReputationScore(address user) external view returns (ReputationScore memory) {
        return reputationScores[user];
    }

    /**
     * @notice Get review details
     * @param reviewId ID of the review
     * @return review Review details
     */
    function getReview(uint256 reviewId) external view reviewExists(reviewId) returns (Review memory) {
        return reviews[reviewId];
    }

    /**
     * @notice Get user reviews
     * @param user Address of the user
     * @return reviewIds Array of review IDs for the user
     */
    function getUserReviews(address user) external view returns (uint256[] memory) {
        return userReviews[user];
    }

    /**
     * @notice Calculate weighted reputation score
     * @param user Address of the user
     * @return weightedScore Calculated weighted score
     */
    function calculateWeightedScore(address user) external view returns (uint256) {
        ReputationScore storage score = reputationScores[user];
        
        if (score.reviewCount == 0) {
            return 0;
        }

        // Base score from total points
        uint256 baseScore = score.totalPoints;
        
        // Apply time decay (reputation decays over time without activity)
        uint256 timeSinceLastUpdate = block.timestamp - score.lastUpdated;
        uint256 decayFactor = timeSinceLastUpdate / (365 days); // Decay over 1 year
        
        if (decayFactor > 0 && baseScore > decayFactor) {
            baseScore -= decayFactor;
        }

        // Weight by review count and average rating
        uint256 reviewWeight = score.reviewCount > 10 ? 10 : score.reviewCount;
        uint256 ratingWeight = score.averageRating > 300 ? score.averageRating : 300; // Minimum 3.0 rating weight

        return (baseScore * reviewWeight * ratingWeight) / (10 * 500); // Normalize
    }

    /**
     * @notice Get top sellers by reputation
     * @param limit Maximum number of sellers to return
     * @return rankings Array of seller rankings
     */
    function getTopSellers(uint256 limit) external view returns (SellerRanking[] memory) {
        // This is a simplified implementation
        // In production, you'd want to maintain a sorted list or use a more efficient algorithm
        SellerRanking[] memory rankings = new SellerRanking[](limit);
        
        // For demonstration, returning empty array
        // Real implementation would iterate through users and sort by reputation
        return rankings;
    }

    /**
     * @notice Suspend a user (owner only)
     * @param user Address of the user to suspend
     * @param duration Duration of suspension in seconds
     * @param reason Reason for suspension
     */
    function suspendUser(address user, uint256 duration, string calldata reason) external onlyOwner {
        ReputationScore storage score = reputationScores[user];
        score.isSuspended = true;
        score.suspensionEndTime = block.timestamp + duration;

        emit UserSuspended(user, duration, reason);
    }

    /**
     * @notice Add a verified moderator (owner only)
     * @param moderator Address of the moderator
     */
    function addModerator(address moderator) external onlyOwner {
        require(reputationScores[moderator].totalPoints >= moderatorMinReputation, "Insufficient reputation");
        verifiedModerators[moderator] = true;
        emit ModeratorAdded(moderator);
    }

    /**
     * @notice Remove a moderator (owner only)
     * @param moderator Address of the moderator
     */
    function removeModerator(address moderator) external onlyOwner {
        verifiedModerators[moderator] = false;
        emit ModeratorRemoved(moderator);
    }

    /**
     * @notice Record a successful transaction
     * @param user Address of the user
     * @param amount Transaction amount
     */
    function recordSuccessfulTransaction(address user, uint256 amount) external onlyOwner {
        successfulTransactions[user]++;
        totalSales[user]++;
        totalRevenue[user] += amount;
        
        // Award points for successful transaction
        _updateReputationPoints(user, 10, "Successful transaction");
    }

    // Internal functions
    function _updateReputation(address user, uint8 rating, bool isVerifiedPurchase) internal {
        ReputationScore storage score = reputationScores[user];
        
        // Calculate new average rating
        uint256 totalRating = score.averageRating * score.reviewCount + (rating * 100);
        score.reviewCount++;
        score.averageRating = totalRating / score.reviewCount;
        
        // Award points based on rating
        uint256 points = 0;
        if (rating >= 4) {
            points = rating * 2; // Bonus for good ratings
        } else if (rating >= 3) {
            points = rating;
        }
        // No points for ratings below 3
        
        // Bonus for verified purchases
        if (isVerifiedPurchase) {
            points += 2;
        }
        
        score.totalPoints += points;
        score.lastUpdated = block.timestamp;
        
        // Update tier
        _updateTier(user);
        
        emit ReputationUpdated(user, score.totalPoints, score.tier);
    }

    function _updateReputationPoints(address user, uint256 points, string memory reason) internal {
        ReputationScore storage score = reputationScores[user];
        score.totalPoints += points;
        score.lastUpdated = block.timestamp;
        
        _updateTier(user);
        
        emit ReputationUpdated(user, score.totalPoints, score.tier);
    }

    function _updateTier(address user) internal {
        ReputationScore storage score = reputationScores[user];
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
    function setMinReviewInterval(uint256 newInterval) external onlyOwner {
        minReviewInterval = newInterval;
    }

    function setMaxReviewsPerDay(uint256 newMax) external onlyOwner {
        maxReviewsPerDay = newMax;
    }

    function setSuspiciousActivityThreshold(uint256 newThreshold) external onlyOwner {
        suspiciousActivityThreshold = newThreshold;
    }

    function setModeratorMinReputation(uint256 newMin) external onlyOwner {
        moderatorMinReputation = newMin;
    }
}