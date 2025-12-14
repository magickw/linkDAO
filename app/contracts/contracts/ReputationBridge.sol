// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ReputationSystem.sol";
import "./SocialReputationToken.sol";

/**
 * @title ReputationBridge
 * @notice Bridges ReputationSystem scores with SocialReputationToken minting
 * @dev Converts reputation tiers to token rewards with anti-gaming mechanisms
 */
contract ReputationBridge is Ownable, ReentrancyGuard {
    // Contracts
    ReputationSystem public immutable reputationSystem;
    SocialReputationToken public immutable socialReputationToken;
    
    // Tier to token mapping (based on ReputationSystem tiers)
    mapping(ReputationSystem.ReputationTier => uint256) public tierTokenRewards;
    
    // User tracking
    mapping(address => uint256) public lastClaimedTier;
    mapping(address => uint256) public lastClaimTime;
    mapping(address => bool) public hasClaimed;
    
    // Cooldown period to prevent gaming (30 days)
    uint256 public constant CLAIM_COOLDOWN = 30 days;
    
    // Minimum tier required to claim tokens
    ReputationSystem.ReputationTier public minimumClaimTier = ReputationSystem.ReputationTier.BRONZE;
    
    // Events
    event TokensClaimed(
        address indexed user,
        ReputationSystem.ReputationTier tier,
        uint256 tokenAmount,
        uint256 reputationScore
    );
    event TierRewardUpdated(
        ReputationSystem.ReputationTier tier,
        uint256 oldReward,
        uint256 newReward
    );
    event MinimumTierUpdated(
        ReputationSystem.ReputationTier oldTier,
        ReputationSystem.ReputationTier newTier
    );
    
    constructor(
        address _reputationSystem,
        address _socialReputationToken
    ) Ownable(msg.sender) {
        reputationSystem = ReputationSystem(_reputationSystem);
        socialReputationToken = SocialReputationToken(_socialReputationToken);
        
        // Initialize tier rewards
        _initializeTierRewards();
    }
    
    /**
     * @notice Claim reputation tokens based on current tier
     * @dev Can only claim once per tier and must respect cooldown
     */
    function claimReputationTokens() external nonReentrant {
        require(!hasClaimed[msg.sender] || _canClaimAgain(msg.sender), "Claim not allowed");
        
        // Get current reputation score
        (,ReputationSystem.ReputationTier currentTier) = _getCurrentReputationInfo(msg.sender);
        
        // Check minimum tier requirement
        require(uint256(currentTier) >= uint256(minimumClaimTier), "Below minimum tier");
        
        // Check if tier upgrade
        require(uint256(currentTier) > lastClaimedTier[msg.sender], "No tier upgrade");
        
        // Calculate token reward
        uint256 tokenAmount = tierTokenRewards[currentTier];
        require(tokenAmount > 0, "No reward for this tier");
        
        // Update tracking
        lastClaimedTier[msg.sender] = uint256(currentTier);
        lastClaimTime[msg.sender] = block.timestamp;
        hasClaimed[msg.sender] = true;
        
        // Mint tokens
        socialReputationToken.updateReputation(msg.sender, tokenAmount);
        
        emit TokensClaimed(msg.sender, currentTier, tokenAmount, 0);
    }
    
    /**
     * @notice Batch claim for multiple users (admin only)
     * @param users Array of user addresses
     */
    function batchClaimReputationTokens(address[] calldata users) external onlyOwner {
        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            
            (,ReputationSystem.ReputationTier currentTier) = _getCurrentReputationInfo(user);
            
            if (uint256(currentTier) >= uint256(minimumClaimTier) &&
                uint256(currentTier) > lastClaimedTier[user] &&
                _canClaimAgain(user)) {
                
                uint256 tokenAmount = tierTokenRewards[currentTier];
                if (tokenAmount > 0) {
                    lastClaimedTier[user] = uint256(currentTier);
                    lastClaimTime[user] = block.timestamp;
                    hasClaimed[user] = true;
                    
                    socialReputationToken.updateReputation(user, tokenAmount);
                    
                    emit TokensClaimed(user, currentTier, tokenAmount, 0);
                }
            }
        }
    }
    
    /**
     * @notice Update token reward for a tier
     * @param tier The reputation tier
     * @param reward Amount of tokens to reward
     */
    function updateTierReward(
        ReputationSystem.ReputationTier tier,
        uint256 reward
    ) external onlyOwner {
        uint256 oldReward = tierTokenRewards[tier];
        tierTokenRewards[tier] = reward;
        
        emit TierRewardUpdated(tier, oldReward, reward);
    }
    
    /**
     * @notice Update minimum claim tier
     * @param newMinimumTier New minimum tier for claiming
     */
    function updateMinimumClaimTier(ReputationSystem.ReputationTier newMinimumTier) external onlyOwner {
        ReputationSystem.ReputationTier oldTier = minimumClaimTier;
        minimumClaimTier = newMinimumTier;
        
        emit MinimumTierUpdated(oldTier, newMinimumTier);
    }
    
    /**
     * @notice Get user's claim status
     * @param user User address
     * @return canClaim Whether user can claim
     * @return currentTier User's current reputation tier
     * @return nextReward Next reward amount available
     */
    function getClaimStatus(address user) external view returns (
        bool canClaim,
        ReputationSystem.ReputationTier currentTier,
        uint256 nextReward
    ) {
        (uint256 score, ReputationSystem.ReputationTier tier) = _getCurrentReputationInfo(user);
        
        canClaim = _canClaimAgain(user) && 
                  uint256(tier) >= uint256(minimumClaimTier) &&
                  uint256(tier) > lastClaimedTier[user];
        
        currentTier = tier;
        nextReward = tierTokenRewards[tier];
    }
    
    /**
     * @notice Get user's reputation info
     * @param user User address
     * @return score Reputation score
     * @return tier Reputation tier
     */
    function getUserReputation(address user) external view returns (
        uint256 score,
        ReputationSystem.ReputationTier tier
    ) {
        return _getCurrentReputationInfo(user);
    }
    
    // Internal functions
    
    function _initializeTierRewards() internal {
        tierTokenRewards[ReputationSystem.ReputationTier.NEWCOMER] = 0;
        tierTokenRewards[ReputationSystem.ReputationTier.BRONZE] = 100 * 10**18;    // 100 LREP
        tierTokenRewards[ReputationSystem.ReputationTier.SILVER] = 500 * 10**18;    // 500 LREP
        tierTokenRewards[ReputationSystem.ReputationTier.GOLD] = 2000 * 10**18;     // 2000 LREP
        tierTokenRewards[ReputationSystem.ReputationTier.PLATINUM] = 5000 * 10**18;  // 5000 LREP
        tierTokenRewards[ReputationSystem.ReputationTier.DIAMOND] = 10000 * 10**18;  // 10000 LREP
    }
    
    function _getCurrentReputationInfo(address user) internal view returns (
        uint256 score,
        ReputationSystem.ReputationTier tier
    ) {
        ReputationSystem.ReputationScore memory rs = reputationSystem.getReputationScore(user);
        return (rs.totalPoints, rs.tier);
    }
    
    function _canClaimAgain(address user) internal view returns (bool) {
        if (!hasClaimed[user]) return true;
        
        return block.timestamp >= lastClaimTime[user] + CLAIM_COOLDOWN;
    }
}