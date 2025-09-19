// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./Governance.sol";
import "./ReputationSystem.sol";

/**
 * @title EnhancedRewardPool
 * @notice Community reward system with epoch-based funding and automatic distribution
 */
contract EnhancedRewardPool is Ownable, ReentrancyGuard {
    using SafeMath for uint256;

    // Structs
    struct Epoch {
        uint256 id;
        uint256 startTime;
        uint256 endTime;
        uint256 totalFunding;
        uint256 totalRewards;
        uint256 participantCount;
        bool finalized;
        mapping(address => uint256) userRewards;
        mapping(address => bool) hasClaimed;
    }

    struct UserStats {
        uint256 totalEarned;
        uint256 totalClaimed;
        uint256 lastClaimEpoch;
        uint256 participationCount;
        uint256 reputationBonus;
    }

    struct RewardCategory {
        string name;
        uint256 weight; // Percentage of total rewards (basis points)
        bool active;
        uint256 totalDistributed;
    }

    // State variables
    IERC20 public immutable ldaoToken;
    Governance public governance;
    ReputationSystem public reputationSystem;
    
    mapping(uint256 => Epoch) public epochs;
    mapping(address => UserStats) public userStats;
    mapping(uint256 => RewardCategory) public rewardCategories;
    
    uint256 public currentEpoch;
    uint256 public epochDuration = 7 days; // 1 week epochs
    uint256 public nextEpochId = 1;
    uint256 public totalPoolBalance;
    uint256 public minimumFunding = 1000 * 10**18; // 1000 LDAO minimum
    uint256 public reputationMultiplier = 150; // 1.5x max multiplier for high reputation
    uint256 public nextCategoryId = 1;
    
    // Reward categories
    uint256 public constant TRADING_REWARDS = 1;
    uint256 public constant GOVERNANCE_REWARDS = 2;
    uint256 public constant CONTENT_REWARDS = 3;
    uint256 public constant REFERRAL_REWARDS = 4;
    uint256 public constant STAKING_REWARDS = 5;
    
    // Events
    event EpochStarted(uint256 indexed epochId, uint256 startTime, uint256 endTime);
    event EpochFinalized(uint256 indexed epochId, uint256 totalRewards, uint256 participantCount);
    event Funded(uint256 indexed epochId, address indexed funder, uint256 amount);
    event RewardCalculated(uint256 indexed epochId, address indexed user, uint256 amount, uint256 category);
    event RewardClaimed(address indexed user, uint256 indexed epochId, uint256 amount);
    event CategoryAdded(uint256 indexed categoryId, string name, uint256 weight);
    event CategoryUpdated(uint256 indexed categoryId, uint256 newWeight, bool active);
    event GovernanceParameterUpdated(string parameter, uint256 oldValue, uint256 newValue);
    
    // Modifiers
    modifier onlyGovernance() {
        require(msg.sender == address(governance) || msg.sender == owner(), "Not authorized");
        _;
    }
    
    modifier epochExists(uint256 epochId) {
        require(epochId > 0 && epochId < nextEpochId, "Epoch does not exist");
        _;
    }
    
    modifier epochActive(uint256 epochId) {
        require(
            block.timestamp >= epochs[epochId].startTime && 
            block.timestamp <= epochs[epochId].endTime,
            "Epoch not active"
        );
        _;
    }
    
    modifier epochFinalized(uint256 epochId) {
        require(epochs[epochId].finalized, "Epoch not finalized");
        _;
    }

    constructor(
        address _ldaoToken,
        address _governance,
        address _reputationSystem
    ) {
        ldaoToken = IERC20(_ldaoToken);
        governance = Governance(_governance);
        reputationSystem = ReputationSystem(_reputationSystem);
        
        // Initialize default reward categories
        _initializeRewardCategories();
        
        // Start first epoch
        _startNewEpoch();
    }

    /**
     * @notice Fund the current epoch
     * @param amount Amount of LDAO tokens to fund
     */
    function fundEpoch(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(currentEpoch > 0, "No active epoch");
        
        require(
            ldaoToken.transferFrom(msg.sender, address(this), amount),
            "Token transfer failed"
        );
        
        epochs[currentEpoch].totalFunding = epochs[currentEpoch].totalFunding.add(amount);
        totalPoolBalance = totalPoolBalance.add(amount);
        
        emit Funded(currentEpoch, msg.sender, amount);
    }

    /**
     * @notice Calculate and distribute rewards for a user in a specific category
     * @param user User address
     * @param epochId Epoch ID
     * @param category Reward category
     * @param baseAmount Base reward amount before multipliers
     */
    function calculateReward(
        address user,
        uint256 epochId,
        uint256 category,
        uint256 baseAmount
    ) external onlyGovernance epochExists(epochId) {
        require(baseAmount > 0, "Base amount must be greater than 0");
        require(rewardCategories[category].active, "Category not active");
        
        // Apply reputation multiplier
        uint256 reputationScore = reputationSystem.getReputationScore(user);
        uint256 multiplier = _calculateReputationMultiplier(reputationScore);
        uint256 finalAmount = baseAmount.mul(multiplier).div(100);
        
        // Apply category weight
        uint256 categoryWeight = rewardCategories[category].weight;
        finalAmount = finalAmount.mul(categoryWeight).div(10000);
        
        // Update epoch data
        epochs[epochId].userRewards[user] = epochs[epochId].userRewards[user].add(finalAmount);
        epochs[epochId].totalRewards = epochs[epochId].totalRewards.add(finalAmount);
        
        // Update category stats
        rewardCategories[category].totalDistributed = rewardCategories[category].totalDistributed.add(finalAmount);
        
        // Update user stats
        userStats[user].totalEarned = userStats[user].totalEarned.add(finalAmount);
        userStats[user].reputationBonus = multiplier;
        
        emit RewardCalculated(epochId, user, finalAmount, category);
    }

    /**
     * @notice Batch calculate rewards for multiple users
     * @param users Array of user addresses
     * @param epochId Epoch ID
     * @param category Reward category
     * @param baseAmounts Array of base reward amounts
     */
    function batchCalculateRewards(
        address[] calldata users,
        uint256 epochId,
        uint256 category,
        uint256[] calldata baseAmounts
    ) external onlyGovernance epochExists(epochId) {
        require(users.length == baseAmounts.length, "Array length mismatch");
        require(users.length <= 100, "Batch size too large"); // Gas limit protection
        
        for (uint256 i = 0; i < users.length; i++) {
            if (baseAmounts[i] > 0) {
                // Apply reputation multiplier
                uint256 reputationScore = reputationSystem.getReputationScore(users[i]);
                uint256 multiplier = _calculateReputationMultiplier(reputationScore);
                uint256 finalAmount = baseAmounts[i].mul(multiplier).div(100);
                
                // Apply category weight
                uint256 categoryWeight = rewardCategories[category].weight;
                finalAmount = finalAmount.mul(categoryWeight).div(10000);
                
                // Update epoch data
                epochs[epochId].userRewards[users[i]] = epochs[epochId].userRewards[users[i]].add(finalAmount);
                epochs[epochId].totalRewards = epochs[epochId].totalRewards.add(finalAmount);
                
                // Update user stats
                userStats[users[i]].totalEarned = userStats[users[i]].totalEarned.add(finalAmount);
                userStats[users[i]].reputationBonus = multiplier;
                
                emit RewardCalculated(epochId, users[i], finalAmount, category);
            }
        }
        
        // Update category stats
        uint256 totalCategoryRewards = 0;
        for (uint256 i = 0; i < baseAmounts.length; i++) {
            totalCategoryRewards = totalCategoryRewards.add(baseAmounts[i]);
        }
        rewardCategories[category].totalDistributed = rewardCategories[category].totalDistributed.add(totalCategoryRewards);
    }

    /**
     * @notice Claim rewards for a specific epoch
     * @param epochId Epoch ID to claim rewards from
     */
    function claimRewards(uint256 epochId) external nonReentrant epochExists(epochId) epochFinalized(epochId) {
        require(!epochs[epochId].hasClaimed[msg.sender], "Already claimed");
        
        uint256 rewardAmount = epochs[epochId].userRewards[msg.sender];
        require(rewardAmount > 0, "No rewards to claim");
        require(totalPoolBalance >= rewardAmount, "Insufficient pool balance");
        
        epochs[epochId].hasClaimed[msg.sender] = true;
        userStats[msg.sender].totalClaimed = userStats[msg.sender].totalClaimed.add(rewardAmount);
        userStats[msg.sender].lastClaimEpoch = epochId;
        totalPoolBalance = totalPoolBalance.sub(rewardAmount);
        
        require(ldaoToken.transfer(msg.sender, rewardAmount), "Token transfer failed");
        
        emit RewardClaimed(msg.sender, epochId, rewardAmount);
    }

    /**
     * @notice Claim rewards from multiple epochs
     * @param epochIds Array of epoch IDs to claim from
     */
    function claimMultipleEpochs(uint256[] calldata epochIds) external nonReentrant {
        require(epochIds.length <= 10, "Too many epochs"); // Gas limit protection
        
        uint256 totalClaimAmount = 0;
        
        for (uint256 i = 0; i < epochIds.length; i++) {
            uint256 epochId = epochIds[i];
            require(epochId > 0 && epochId < nextEpochId, "Invalid epoch");
            require(epochs[epochId].finalized, "Epoch not finalized");
            require(!epochs[epochId].hasClaimed[msg.sender], "Already claimed");
            
            uint256 rewardAmount = epochs[epochId].userRewards[msg.sender];
            if (rewardAmount > 0) {
                epochs[epochId].hasClaimed[msg.sender] = true;
                totalClaimAmount = totalClaimAmount.add(rewardAmount);
                emit RewardClaimed(msg.sender, epochId, rewardAmount);
            }
        }
        
        require(totalClaimAmount > 0, "No rewards to claim");
        require(totalPoolBalance >= totalClaimAmount, "Insufficient pool balance");
        
        userStats[msg.sender].totalClaimed = userStats[msg.sender].totalClaimed.add(totalClaimAmount);
        userStats[msg.sender].lastClaimEpoch = epochIds[epochIds.length - 1];
        totalPoolBalance = totalPoolBalance.sub(totalClaimAmount);
        
        require(ldaoToken.transfer(msg.sender, totalClaimAmount), "Token transfer failed");
    }

    /**
     * @notice Finalize an epoch and start a new one
     * @param epochId Epoch ID to finalize
     */
    function finalizeEpoch(uint256 epochId) external onlyGovernance epochExists(epochId) {
        require(!epochs[epochId].finalized, "Epoch already finalized");
        require(block.timestamp > epochs[epochId].endTime, "Epoch not ended");
        
        epochs[epochId].finalized = true;
        
        // Count participants
        // Note: This would be done off-chain in practice for gas efficiency
        
        emit EpochFinalized(epochId, epochs[epochId].totalRewards, epochs[epochId].participantCount);
        
        // Start new epoch if current
        if (epochId == currentEpoch) {
            _startNewEpoch();
        }
    }

    /**
     * @notice Add a new reward category
     * @param name Category name
     * @param weight Category weight in basis points
     */
    function addRewardCategory(string calldata name, uint256 weight) external onlyGovernance {
        require(weight <= 10000, "Weight cannot exceed 100%");
        
        uint256 categoryId = nextCategoryId++;
        rewardCategories[categoryId] = RewardCategory({
            name: name,
            weight: weight,
            active: true,
            totalDistributed: 0
        });
        
        emit CategoryAdded(categoryId, name, weight);
    }

    /**
     * @notice Update reward category
     * @param categoryId Category ID
     * @param newWeight New weight in basis points
     * @param active Whether category is active
     */
    function updateRewardCategory(
        uint256 categoryId,
        uint256 newWeight,
        bool active
    ) external onlyGovernance {
        require(categoryId > 0 && categoryId < nextCategoryId, "Invalid category");
        require(newWeight <= 10000, "Weight cannot exceed 100%");
        
        rewardCategories[categoryId].weight = newWeight;
        rewardCategories[categoryId].active = active;
        
        emit CategoryUpdated(categoryId, newWeight, active);
    }

    /**
     * @notice Update governance parameters
     * @param parameter Parameter name
     * @param newValue New parameter value
     */
    function updateGovernanceParameter(string calldata parameter, uint256 newValue) external onlyGovernance {
        bytes32 paramHash = keccak256(abi.encodePacked(parameter));
        uint256 oldValue;
        
        if (paramHash == keccak256(abi.encodePacked("epochDuration"))) {
            require(newValue >= 1 days && newValue <= 30 days, "Invalid epoch duration");
            oldValue = epochDuration;
            epochDuration = newValue;
        } else if (paramHash == keccak256(abi.encodePacked("minimumFunding"))) {
            oldValue = minimumFunding;
            minimumFunding = newValue;
        } else if (paramHash == keccak256(abi.encodePacked("reputationMultiplier"))) {
            require(newValue >= 100 && newValue <= 300, "Invalid multiplier range");
            oldValue = reputationMultiplier;
            reputationMultiplier = newValue;
        } else {
            revert("Invalid parameter");
        }
        
        emit GovernanceParameterUpdated(parameter, oldValue, newValue);
    }

    /**
     * @notice Get user rewards for a specific epoch
     * @param user User address
     * @param epochId Epoch ID
     * @return reward amount and claim status
     */
    function getUserEpochRewards(address user, uint256 epochId) external view returns (uint256, bool) {
        return (epochs[epochId].userRewards[user], epochs[epochId].hasClaimed[user]);
    }

    /**
     * @notice Get epoch information
     * @param epochId Epoch ID
     * @return Epoch details
     */
    function getEpochInfo(uint256 epochId) external view returns (
        uint256 id,
        uint256 startTime,
        uint256 endTime,
        uint256 totalFunding,
        uint256 totalRewards,
        uint256 participantCount,
        bool finalized
    ) {
        Epoch storage epoch = epochs[epochId];
        return (
            epoch.id,
            epoch.startTime,
            epoch.endTime,
            epoch.totalFunding,
            epoch.totalRewards,
            epoch.participantCount,
            epoch.finalized
        );
    }

    /**
     * @notice Get reward category information
     * @param categoryId Category ID
     * @return Category details
     */
    function getRewardCategory(uint256 categoryId) external view returns (
        string memory name,
        uint256 weight,
        bool active,
        uint256 totalDistributed
    ) {
        RewardCategory storage category = rewardCategories[categoryId];
        return (category.name, category.weight, category.active, category.totalDistributed);
    }

    /**
     * @notice Get user statistics
     * @param user User address
     * @return User stats
     */
    function getUserStats(address user) external view returns (
        uint256 totalEarned,
        uint256 totalClaimed,
        uint256 lastClaimEpoch,
        uint256 participationCount,
        uint256 reputationBonus
    ) {
        UserStats storage stats = userStats[user];
        return (
            stats.totalEarned,
            stats.totalClaimed,
            stats.lastClaimEpoch,
            stats.participationCount,
            stats.reputationBonus
        );
    }

    /**
     * @notice Emergency withdraw function (governance only)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(uint256 amount) external onlyGovernance {
        require(amount <= totalPoolBalance, "Insufficient balance");
        totalPoolBalance = totalPoolBalance.sub(amount);
        require(ldaoToken.transfer(owner(), amount), "Transfer failed");
    }

    // Internal functions
    function _startNewEpoch() internal {
        uint256 epochId = nextEpochId++;
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime.add(epochDuration);
        
        epochs[epochId].id = epochId;
        epochs[epochId].startTime = startTime;
        epochs[epochId].endTime = endTime;
        epochs[epochId].totalFunding = 0;
        epochs[epochId].totalRewards = 0;
        epochs[epochId].participantCount = 0;
        epochs[epochId].finalized = false;
        
        currentEpoch = epochId;
        
        emit EpochStarted(epochId, startTime, endTime);
    }

    function _calculateReputationMultiplier(uint256 reputationScore) internal view returns (uint256) {
        if (reputationScore == 0) return 100; // 1.0x multiplier
        
        // Linear scaling: 100 (1.0x) to reputationMultiplier (1.5x default)
        // Based on reputation tiers from ReputationSystem
        if (reputationScore >= 1000) return reputationMultiplier; // EXPERT tier
        if (reputationScore >= 500) return 100 + ((reputationMultiplier - 100) * 80 / 100); // TRUSTED tier
        if (reputationScore >= 200) return 100 + ((reputationMultiplier - 100) * 60 / 100); // ESTABLISHED tier
        if (reputationScore >= 50) return 100 + ((reputationMultiplier - 100) * 40 / 100); // VERIFIED tier
        if (reputationScore >= 10) return 100 + ((reputationMultiplier - 100) * 20 / 100); // BRONZE tier
        
        return 100; // NEWCOMER tier
    }

    function _initializeRewardCategories() internal {
        // Trading rewards - 40% of total rewards
        rewardCategories[TRADING_REWARDS] = RewardCategory({
            name: "Trading",
            weight: 4000,
            active: true,
            totalDistributed: 0
        });
        
        // Governance rewards - 20% of total rewards
        rewardCategories[GOVERNANCE_REWARDS] = RewardCategory({
            name: "Governance",
            weight: 2000,
            active: true,
            totalDistributed: 0
        });
        
        // Content rewards - 20% of total rewards
        rewardCategories[CONTENT_REWARDS] = RewardCategory({
            name: "Content",
            weight: 2000,
            active: true,
            totalDistributed: 0
        });
        
        // Referral rewards - 10% of total rewards
        rewardCategories[REFERRAL_REWARDS] = RewardCategory({
            name: "Referral",
            weight: 1000,
            active: true,
            totalDistributed: 0
        });
        
        // Staking rewards - 10% of total rewards
        rewardCategories[STAKING_REWARDS] = RewardCategory({
            name: "Staking",
            weight: 1000,
            active: true,
            totalDistributed: 0
        });
        
        nextCategoryId = 6; // Next available category ID
    }
}