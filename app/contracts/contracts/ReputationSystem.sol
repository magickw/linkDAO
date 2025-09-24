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
        mapping(address => bool) hasVoted; // For helpful/unhelpful votes
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

    // Tier thresholds
    uint256[6] public tierThresholds = [0, 50, 200, 500, 1000, 2500];

    // Events
    event ReviewSubmitted(
        uint256 indexed reviewId,
        address indexed reviewer,
        address indexed reviewee,
        uint256 orderId,
        uint8 rating
    );

    event ReviewVerified(
        uint256 indexed reviewId,
        address indexed verifier
    );

    event ReviewDisputed(
        uint256 indexed reviewId,
        address indexed disputer,
        string reason
    );

    event ReputationUpdated(
        address indexed user,
        uint256 oldScore,
        uint256 newScore,
        ReputationTier oldTier,
        ReputationTier newTier
    );

    event HelpfulVoteCast(
        uint256 indexed reviewId,
        address indexed voter,
        bool isHelpful
    );

    event UserSuspended(
        address indexed user,
        uint256 suspensionEndTime,
        string reason
    );

    event ModeratorAdded(
        address indexed moderator,
        address indexed addedBy
    );

    event SuspiciousActivityDetected(
        address indexed user,
        string activityType,
        uint256 count
    );

    // New events for enhanced reputation tracking
    event ReputationScoreDetailsUpdated(
        address indexed user,
        uint256 totalPoints,
        uint256 reviewCount,
        uint256 averageRating,
        uint256 weightedScore,
        uint256 successfulTransactions,
        uint256 timestamp
    );
    
    event SellerMetricsUpdated(
        address indexed seller,
        uint256 totalSales,
        uint256 totalRevenue,
        uint256 averageRating,
        uint256 responseTime,
        uint256 timestamp
    );
    
    // Additional events for comprehensive reputation tracking
    event ReputationDecayApplied(
        address indexed user,
        uint256 decayAmount,
        uint256 newScore,
        uint256 timestamp
    );
    
    event ReputationBoostApplied(
        address indexed user,
        uint256 boostAmount,
        string reason,
        uint256 timestamp
    );
    
    event CommunityModerationAction(
        address indexed moderator,
        address indexed target,
        string action,
        string reason,
        uint256 timestamp
    );
    
    // Modifiers
    modifier onlyModerator() {
        require(verifiedModerators[msg.sender] || msg.sender == owner(), "Not a moderator");
        _;
    }

    modifier notSuspended(address user) {
        require(!reputationScores[user].isSuspended || 
                block.timestamp > reputationScores[user].suspensionEndTime, 
                "User is suspended");
        _;
    }

    modifier validRating(uint8 rating) {
        require(rating >= 1 && rating <= 5, "Rating must be between 1 and 5");
        _;
    }

    modifier reviewExists(uint256 reviewId) {
        require(reviews[reviewId].id != 0, "Review does not exist");
        _;
    }

    constructor() {}

    /**
     * @notice Submit a review for a completed transaction
     * @param reviewee Address being reviewed
     * @param orderId Order ID for verification
     * @param rating Rating from 1-5 stars
     * @param ipfsHash IPFS hash containing review content
     * @param isVerifiedPurchase Whether this is from a verified purchase
     */
    function submitReview(
        address reviewee,
        uint256 orderId,
        uint8 rating,
        string calldata ipfsHash,
        bool isVerifiedPurchase
    ) external validRating(rating) notSuspended(msg.sender) nonReentrant {
        require(msg.sender != reviewee, "Cannot review yourself");
        require(!hasReviewed[msg.sender][reviewee], "Already reviewed this user");
        require(bytes(ipfsHash).length > 0, "IPFS hash required");

        // Anti-gaming: Check review frequency
        ReputationScore storage reviewerScore = reputationScores[msg.sender];
        require(
            block.timestamp >= reviewerScore.lastReviewTimestamp + minReviewInterval,
            "Review submitted too soon"
        );

        // Anti-gaming: Check daily review limit
        uint256 reviewsToday = _getReviewsInLastDay(msg.sender);
        require(reviewsToday < maxReviewsPerDay, "Daily review limit exceeded");

        uint256 reviewId = nextReviewId++;
        
        reviews[reviewId] = Review({
            id: reviewId,
            reviewer: msg.sender,
            reviewee: reviewee,
            orderId: orderId,
            rating: rating,
            ipfsHash: ipfsHash,
            timestamp: block.timestamp,
            status: isVerifiedPurchase ? ReviewStatus.VERIFIED : ReviewStatus.PENDING,
            helpfulVotes: 0,
            unhelpfulVotes: 0,
            isVerifiedPurchase: isVerifiedPurchase,
            reviewerReputationAtTime: reviewerScore.totalPoints
        });

        // Update mappings
        hasReviewed[msg.sender][reviewee] = true;
        userReviews[msg.sender].push(reviewId);
        userReviews[reviewee].push(reviewId);
        
        // Update reviewer's last review timestamp
        reviewerScore.lastReviewTimestamp = block.timestamp;
        
        totalReviews++;

        emit ReviewSubmitted(reviewId, msg.sender, reviewee, orderId, rating);

        // If verified purchase, immediately update reputation
        if (isVerifiedPurchase) {
            _updateReputationFromReview(reviewId);
        }
    }

    /**
     * @notice Verify a pending review (for moderators)
     * @param reviewId ID of the review to verify
     */
    function verifyReview(uint256 reviewId) external onlyModerator reviewExists(reviewId) {
        Review storage review = reviews[reviewId];
        require(review.status == ReviewStatus.PENDING, "Review not pending");

        review.status = ReviewStatus.VERIFIED;
        
        // Award verification reward to reviewer
        _updateReputation(review.reviewer, reviewVerificationReward, "Review verified");
        
        // Update reviewee's reputation based on the review
        _updateReputationFromReview(reviewId);

        emit ReviewVerified(reviewId, msg.sender);
    }

    /**
     * @notice Dispute a review
     * @param reviewId ID of the review to dispute
     * @param reason Reason for the dispute
     */
    function disputeReview(uint256 reviewId, string calldata reason) external reviewExists(reviewId) {
        Review storage review = reviews[reviewId];
        require(
            msg.sender == review.reviewee || verifiedModerators[msg.sender],
            "Not authorized to dispute"
        );
        require(review.status != ReviewStatus.DISPUTED, "Already disputed");

        review.status = ReviewStatus.DISPUTED;

        emit ReviewDisputed(reviewId, msg.sender, reason);
    }

    /**
     * @notice Cast a helpful/unhelpful vote on a review
     * @param reviewId ID of the review
     * @param isHelpful True for helpful, false for unhelpful
     */
    function castHelpfulVote(uint256 reviewId, bool isHelpful) external reviewExists(reviewId) notSuspended(msg.sender) {
        Review storage review = reviews[reviewId];
        require(!review.hasVoted[msg.sender], "Already voted on this review");
        require(msg.sender != review.reviewer, "Cannot vote on own review");

        review.hasVoted[msg.sender] = true;
        
        if (isHelpful) {
            review.helpfulVotes++;
            // Award small reputation boost to reviewer for helpful review
            _updateReputation(review.reviewer, 1, "Helpful review");
        } else {
            review.unhelpfulVotes++;
        }

        emit HelpfulVoteCast(reviewId, msg.sender, isHelpful);

        // Check for suspicious activity (too many unhelpful votes)
        if (!isHelpful && review.unhelpfulVotes > 5) {
            _flagSuspiciousActivity(review.reviewer, "Multiple unhelpful votes");
        }
    }

    /**
     * @notice Calculate weighted reputation score for a user
     * @param user Address of the user
     * @return Weighted reputation score
     */
    function calculateWeightedScore(address user) external view returns (uint256) {
        ReputationScore storage score = reputationScores[user];
        
        if (score.reviewCount == 0) {
            return 0;
        }

        // Base score from total points
        uint256 baseScore = score.totalPoints;
        
        // Weight by review count (more reviews = more reliable)
        uint256 reviewWeight = score.reviewCount > 10 ? 100 : (score.reviewCount * 10);
        
        // Weight by average rating
        uint256 ratingWeight = score.averageRating > 0 ? score.averageRating : 100;
        
        // Penalty for suspicious activity
        uint256 suspiciousPenalty = score.suspiciousActivityCount * 50;
        
        // Calculate weighted score
        uint256 weightedScore = (baseScore * reviewWeight * ratingWeight) / 10000;
        
        // Apply penalty
        if (weightedScore > suspiciousPenalty) {
            weightedScore -= suspiciousPenalty;
        } else {
            weightedScore = 0;
        }
        
        return weightedScore;
    }

    /**
     * @notice Get reputation tier for a user
     * @param user Address of the user
     * @return Reputation tier
     */
    function getReputationTier(address user) external view returns (ReputationTier) {
        uint256 score = reputationScores[user].totalPoints;
        
        for (uint256 i = tierThresholds.length - 1; i > 0; i--) {
            if (score >= tierThresholds[i]) {
                return ReputationTier(i);
            }
        }
        
        return ReputationTier.NEWCOMER;
    }

    /**
     * @notice Get top sellers by reputation
     * @param limit Maximum number of sellers to return
     * @return Array of seller rankings
     */
    function getTopSellers(uint256 limit) external view returns (SellerRanking[] memory) {
        // This is a simplified implementation
        // In production, you'd want to maintain a sorted list or use a more efficient algorithm
        SellerRanking[] memory rankings = new SellerRanking[](limit);
        
        // This would need to be implemented with proper sorting logic
        // For now, returning empty array as placeholder
        return rankings;
    }

    /**
     * @notice Add a verified moderator
     * @param moderator Address to add as moderator
     */
    function addModerator(address moderator) external onlyOwner {
        require(
            reputationScores[moderator].totalPoints >= moderatorMinReputation,
            "Insufficient reputation for moderator role"
        );
        
        verifiedModerators[moderator] = true;
        moderatorReputationThreshold[moderator] = reputationScores[moderator].totalPoints;
        
        emit ModeratorAdded(moderator, msg.sender);
    }

    /**
     * @notice Remove a moderator
     * @param moderator Address to remove as moderator
     */
    function removeModerator(address moderator) external onlyOwner {
        verifiedModerators[moderator] = false;
        delete moderatorReputationThreshold[moderator];
    }

    /**
     * @notice Suspend a user for suspicious activity
     * @param user Address to suspend
     * @param duration Suspension duration in seconds
     * @param reason Reason for suspension
     */
    function suspendUser(address user, uint256 duration, string calldata reason) external onlyModerator {
        ReputationScore storage score = reputationScores[user];
        score.isSuspended = true;
        score.suspensionEndTime = block.timestamp + duration;
        
        emit UserSuspended(user, score.suspensionEndTime, reason);
    }

    /**
     * @notice Get user's review history
     * @param user Address of the user
     * @return Array of review IDs
     */
    function getUserReviews(address user) external view returns (uint256[] memory) {
        return userReviews[user];
    }

    /**
     * @notice Get review details
     * @param reviewId ID of the review
     * @return Review details (excluding mappings)
     */
    function getReview(uint256 reviewId) external view returns (
        uint256 id,
        address reviewer,
        address reviewee,
        uint256 orderId,
        uint8 rating,
        string memory ipfsHash,
        uint256 timestamp,
        ReviewStatus status,
        uint256 helpfulVotes,
        uint256 unhelpfulVotes,
        bool isVerifiedPurchase,
        uint256 reviewerReputationAtTime
    ) {
        Review storage review = reviews[reviewId];
        return (
            review.id,
            review.reviewer,
            review.reviewee,
            review.orderId,
            review.rating,
            review.ipfsHash,
            review.timestamp,
            review.status,
            review.helpfulVotes,
            review.unhelpfulVotes,
            review.isVerifiedPurchase,
            review.reviewerReputationAtTime
        );
    }

    /**
     * @notice Internal function to update reputation from a review
     * @param reviewId ID of the review
     */
    function _updateReputationFromReview(uint256 reviewId) internal {
        Review storage review = reviews[reviewId];
        ReputationScore storage revieweeScore = reputationScores[review.reviewee];
        
        // Calculate points based on rating
        uint256 points = 0;
        if (review.rating == 5) points = 10;
        else if (review.rating == 4) points = 5;
        else if (review.rating == 3) points = 2;
        else if (review.rating == 2) points = 0; // No points for poor ratings
        else if (review.rating == 1) points = 0; // No negative points to prevent gaming
        
        // Bonus for verified purchases
        if (review.isVerifiedPurchase) {
            points += 2;
        }
        
        // Weight by reviewer's reputation
        if (review.reviewerReputationAtTime > 100) {
            points = (points * 120) / 100; // 20% bonus for high-rep reviewers
        }
        
        _updateReputation(review.reviewee, points, "Review received");
        
        // Update average rating
        _updateAverageRating(review.reviewee, review.rating);
    }

    /**
     * @notice Internal function to update user reputation
     * @param user Address of the user
     * @param points Points to add
     * @param reason Reason for the update
     */
    function _updateReputation(address user, uint256 points, string memory reason) internal {
        ReputationScore storage score = reputationScores[user];
        
        uint256 oldScore = score.totalPoints;
        ReputationTier oldTier = score.tier;
        
        score.totalPoints += points;
        score.lastUpdated = block.timestamp;
        
        // Update tier
        ReputationTier newTier = this.getReputationTier(user);
        score.tier = newTier;
        
        // Update weighted score
        score.weightedScore = this.calculateWeightedScore(user);
        
        emit ReputationUpdated(user, oldScore, score.totalPoints, oldTier, newTier);
        
        // Emit detailed reputation score event
        emit ReputationScoreDetailsUpdated(
            user,
            score.totalPoints,
            score.reviewCount,
            score.averageRating,
            score.weightedScore,
            successfulTransactions[user],
            block.timestamp
        );
    }
    
    /**
     * @notice Update seller metrics
     * @param seller Address of the seller
     * @param salesCount Number of sales
     * @param revenue Total revenue
     * @param avgRating Average rating
     * @param avgResponseTime Average response time in seconds
     */
    function updateSellerMetrics(
        address seller,
        uint256 salesCount,
        uint256 revenue,
        uint256 avgRating,
        uint256 avgResponseTime
    ) external onlyOwner {
        totalSales[seller] = salesCount;
        totalRevenue[seller] = revenue;
        successfulTransactions[seller] = salesCount;
        responseTime[seller] = avgResponseTime;
        
        emit SellerMetricsUpdated(
            seller,
            salesCount,
            revenue,
            avgRating,
            avgResponseTime,
            block.timestamp
        );
    }
    
    /**
     * @notice Get seller metrics
     * @param seller Address of the seller
     * @return Total sales, total revenue, average rating, average response time in seconds
     */
    function getSellerMetrics(address seller) external view returns (
        uint256,
        uint256,
        uint256,
        uint256
    ) {
        return (
            totalSales[seller],
            totalRevenue[seller],
            this.calculateWeightedScore(seller),
            responseTime[seller]
        );
    }

    /**
     * @notice Internal function to update average rating
     * @param user Address of the user
     * @param newRating New rating to include
     */
    function _updateAverageRating(address user, uint8 newRating) internal {
        ReputationScore storage score = reputationScores[user];
        
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
     * @notice Internal function to flag suspicious activity
     * @param user Address of the user
     * @param activityType Type of suspicious activity
     */
    function _flagSuspiciousActivity(address user, string memory activityType) internal {
        ReputationScore storage score = reputationScores[user];
        score.suspiciousActivityCount++;
        
        emit SuspiciousActivityDetected(user, activityType, score.suspiciousActivityCount);
        
        // Auto-suspend if threshold exceeded
        if (score.suspiciousActivityCount >= suspiciousActivityThreshold) {
            score.isSuspended = true;
            score.suspensionEndTime = block.timestamp + 7 days; // 7-day suspension
            
            emit UserSuspended(user, score.suspensionEndTime, "Automatic suspension for suspicious activity");
        }
    }

    /**
     * @notice Internal function to get reviews in the last day
     * @param user Address of the user
     * @return Number of reviews in the last 24 hours
     */
    function _getReviewsInLastDay(address user) internal view returns (uint256) {
        uint256[] memory userReviewIds = userReviews[user];
        uint256 count = 0;
        uint256 dayAgo = block.timestamp - 1 days;
        
        for (uint256 i = 0; i < userReviewIds.length; i++) {
            if (reviews[userReviewIds[i]].timestamp > dayAgo) {
                count++;
            }
        }
        
        return count;
    }

    /**
     * @notice Set configuration parameters (DAO only)
     */
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

    function setReviewVerificationReward(uint256 newReward) external onlyOwner {
        reviewVerificationReward = newReward;
    }
    
    /**
     * @notice Apply reputation decay for inactive users
     * @param user Address of the user
     * @param decayAmount Amount to decay
     */
    function applyReputationDecay(address user, uint256 decayAmount) external onlyOwner {
        ReputationScore storage score = reputationScores[user];
        
        if (score.totalPoints > decayAmount) {
            score.totalPoints -= decayAmount;
        } else {
            score.totalPoints = 0;
        }
        
        score.lastUpdated = block.timestamp;
        
        emit ReputationDecayApplied(user, decayAmount, score.totalPoints, block.timestamp);
        
        // Emit detailed reputation score event
        emit ReputationScoreDetailsUpdated(
            user,
            score.totalPoints,
            score.reviewCount,
            score.averageRating,
            score.weightedScore,
            successfulTransactions[user],
            block.timestamp
        );
    }
    
    /**
     * @notice Apply reputation boost for positive actions
     * @param user Address of the user
     * @param boostAmount Amount to boost
     * @param reason Reason for the boost
     */
    function applyReputationBoost(address user, uint256 boostAmount, string calldata reason) external onlyOwner {
        ReputationScore storage score = reputationScores[user];
        score.totalPoints += boostAmount;
        score.lastUpdated = block.timestamp;
        
        emit ReputationBoostApplied(user, boostAmount, reason, block.timestamp);
        
        // Emit detailed reputation score event
        emit ReputationScoreDetailsUpdated(
            user,
            score.totalPoints,
            score.reviewCount,
            score.averageRating,
            score.weightedScore,
            successfulTransactions[user],
            block.timestamp
        );
    }
    
    /**
     * @notice Record community moderation action
     * @param target Address of the user being moderated
     * @param action Type of action taken
     * @param reason Reason for the action
     */
    function recordCommunityModerationAction(
        address target,
        string calldata action,
        string calldata reason
    ) external onlyModerator {
        emit CommunityModerationAction(msg.sender, target, action, reason, block.timestamp);
    }
    
    /**
     * @notice Get reputation score details
     * @param user Address of the user
     * @return ReputationScore structure
     */
    function getReputationScoreDetails(address user) external view returns (ReputationScore memory) {
        return reputationScores[user];
    }
}