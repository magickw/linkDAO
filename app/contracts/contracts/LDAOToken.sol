// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title LDAOToken
 * @notice Enhanced ERC-20 token with staking mechanisms and marketplace utility features
 */
contract LDAOToken is ERC20Permit, Ownable, ReentrancyGuard {
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    
    // Staking structures
    struct StakeInfo {
        uint256 amount;
        uint256 stakingStartTime;
        uint256 lockPeriod; // in seconds
        uint256 rewardRate; // basis points (e.g., 500 = 5%)
        uint256 lastRewardClaim;
        bool isActive;
    }
    
    // Staking tiers with different lock periods and rewards
    struct StakingTier {
        uint256 lockPeriod; // in seconds
        uint256 rewardRate; // annual reward rate in basis points
        uint256 minStakeAmount;
        bool isActive;
    }
    
    // Mappings
    mapping(address => StakeInfo[]) public userStakes;
    mapping(address => uint256) public totalStaked;
    mapping(address => uint256) public votingPower; // Enhanced voting power from staking
    mapping(uint256 => StakingTier) public stakingTiers;
    
    // Staking parameters
    uint256 public totalStakedSupply;
    uint256 public rewardPool;
    uint256 public nextTierId = 1;
    
    // Marketplace utility features
    mapping(address => bool) public premiumMembers; // Premium membership through staking
    mapping(address => uint256) public discountTier; // Discount tier based on staking
    mapping(address => uint256) public lastActivityReward; // Last marketplace activity reward
    
    // Constants
    uint256 public constant PREMIUM_MEMBERSHIP_THRESHOLD = 1000 * 10**18; // 1000 tokens
    uint256 public constant MAX_DISCOUNT_TIER = 3; // 0-3 discount tiers
    uint256 public constant ACTIVITY_REWARD_COOLDOWN = 1 days;
    
    // Events
    event Staked(address indexed user, uint256 amount, uint256 tierId, uint256 stakeIndex);
    event Unstaked(address indexed user, uint256 amount, uint256 stakeIndex);
    event RewardsClaimed(address indexed user, uint256 amount);
    event StakingTierCreated(uint256 indexed tierId, uint256 lockPeriod, uint256 rewardRate);
    event PremiumMembershipGranted(address indexed user);
    event PremiumMembershipRevoked(address indexed user);
    event ActivityRewardClaimed(address indexed user, uint256 amount);
    event VotingPowerUpdated(address indexed user, uint256 newVotingPower);
    
    constructor(address treasury) 
        ERC20("LinkDAO Token", "LDAO") 
        ERC20Permit("LinkDAO Token")
        Ownable()
    {
        _mint(treasury, INITIAL_SUPPLY);
        
        // Initialize default staking tiers
        _createStakingTier(30 days, 500, 100 * 10**18); // 30 days, 5% APR, min 100 tokens
        _createStakingTier(90 days, 800, 500 * 10**18); // 90 days, 8% APR, min 500 tokens  
        _createStakingTier(180 days, 1200, 1000 * 10**18); // 180 days, 12% APR, min 1000 tokens
        _createStakingTier(365 days, 1800, 5000 * 10**18); // 365 days, 18% APR, min 5000 tokens
        
        // Set initial reward pool (10% of total supply)
        rewardPool = INITIAL_SUPPLY / 10;
    }
    
    /**
     * @notice Stake tokens for a specific tier
     * @param amount Amount of tokens to stake
     * @param tierId Staking tier ID
     */
    function stake(uint256 amount, uint256 tierId) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        StakingTier storage tier = stakingTiers[tierId];
        require(tier.isActive, "Staking tier not active");
        require(amount >= tier.minStakeAmount, "Amount below minimum for tier");
        
        // Transfer tokens to contract
        _transfer(msg.sender, address(this), amount);
        
        // Create stake record
        userStakes[msg.sender].push(StakeInfo({
            amount: amount,
            stakingStartTime: block.timestamp,
            lockPeriod: tier.lockPeriod,
            rewardRate: tier.rewardRate,
            lastRewardClaim: block.timestamp,
            isActive: true
        }));
        
        // Update totals
        totalStaked[msg.sender] += amount;
        totalStakedSupply += amount;
        
        // Update voting power (staked tokens get 2x voting power)
        _updateVotingPower(msg.sender);
        
        // Check for premium membership
        _updatePremiumMembership(msg.sender);
        
        // Update discount tier
        _updateDiscountTier(msg.sender);
        
        uint256 stakeIndex = userStakes[msg.sender].length - 1;
        emit Staked(msg.sender, amount, tierId, stakeIndex);
    }
    
    /**
     * @notice Unstake tokens from a specific stake
     * @param stakeIndex Index of the stake to unstake
     */
    function unstake(uint256 stakeIndex) external nonReentrant {
        require(stakeIndex < userStakes[msg.sender].length, "Invalid stake index");
        
        StakeInfo storage stakeInfo = userStakes[msg.sender][stakeIndex];
        require(stakeInfo.isActive, "Stake not active");
        require(
            block.timestamp >= stakeInfo.stakingStartTime + stakeInfo.lockPeriod,
            "Stake still locked"
        );
        
        uint256 amount = stakeInfo.amount;
        
        // Claim any pending rewards first
        _claimStakeRewards(msg.sender, stakeIndex);
        
        // Mark stake as inactive
        stakeInfo.isActive = false;
        
        // Update totals
        totalStaked[msg.sender] -= amount;
        totalStakedSupply -= amount;
        
        // Transfer tokens back to user
        _transfer(address(this), msg.sender, amount);
        
        // Update voting power
        _updateVotingPower(msg.sender);
        
        // Update premium membership
        _updatePremiumMembership(msg.sender);
        
        // Update discount tier
        _updateDiscountTier(msg.sender);
        
        emit Unstaked(msg.sender, amount, stakeIndex);
    }
    
    /**
     * @notice Claim staking rewards for a specific stake
     * @param stakeIndex Index of the stake to claim rewards for
     */
    function claimStakeRewards(uint256 stakeIndex) external nonReentrant {
        _claimStakeRewards(msg.sender, stakeIndex);
    }
    
    /**
     * @notice Claim all available staking rewards
     */
    function claimAllStakeRewards() external nonReentrant {
        uint256 totalRewards = 0;
        
        for (uint256 i = 0; i < userStakes[msg.sender].length; i++) {
            if (userStakes[msg.sender][i].isActive) {
                uint256 rewards = _calculateStakeRewards(msg.sender, i);
                if (rewards > 0) {
                    userStakes[msg.sender][i].lastRewardClaim = block.timestamp;
                    totalRewards += rewards;
                }
            }
        }
        
        if (totalRewards > 0) {
            require(rewardPool >= totalRewards, "Insufficient reward pool");
            rewardPool -= totalRewards;
            _mint(msg.sender, totalRewards);
            
            emit RewardsClaimed(msg.sender, totalRewards);
        }
    }
    
    /**
     * @notice Claim marketplace activity rewards
     */
    function claimActivityReward() external nonReentrant {
        require(
            block.timestamp >= lastActivityReward[msg.sender] + ACTIVITY_REWARD_COOLDOWN,
            "Activity reward on cooldown"
        );
        require(totalStaked[msg.sender] > 0, "Must be staking to claim activity rewards");
        
        // Calculate reward based on staking amount and tier
        uint256 baseReward = 10 * 10**18; // 10 tokens base
        uint256 stakingMultiplier = (totalStaked[msg.sender] / (1000 * 10**18)) + 1; // +1 per 1000 staked
        uint256 reward = baseReward * stakingMultiplier;
        
        // Cap the reward
        if (reward > 100 * 10**18) {
            reward = 100 * 10**18; // Max 100 tokens
        }
        
        lastActivityReward[msg.sender] = block.timestamp;
        
        require(rewardPool >= reward, "Insufficient reward pool");
        rewardPool -= reward;
        _mint(msg.sender, reward);
        
        emit ActivityRewardClaimed(msg.sender, reward);
    }
    
    /**
     * @notice Get user's total staking rewards
     * @param user Address of the user
     * @return Total claimable rewards
     */
    function getTotalStakeRewards(address user) external view returns (uint256) {
        uint256 totalRewards = 0;
        
        for (uint256 i = 0; i < userStakes[user].length; i++) {
            if (userStakes[user][i].isActive) {
                totalRewards += _calculateStakeRewards(user, i);
            }
        }
        
        return totalRewards;
    }
    
    /**
     * @notice Get user's staking information
     * @param user Address of the user
     * @return Array of stake information
     */
    function getUserStakes(address user) external view returns (StakeInfo[] memory) {
        return userStakes[user];
    }
    
    /**
     * @notice Get user's discount tier based on staking
     * @param user Address of the user
     * @return Discount tier (0-3)
     */
    function getDiscountTier(address user) external view returns (uint256) {
        return discountTier[user];
    }
    
    /**
     * @notice Check if user has premium membership
     * @param user Address of the user
     * @return True if user has premium membership
     */
    function hasPremiumMembership(address user) external view returns (bool) {
        return premiumMembers[user];
    }
    
    /**
     * @notice Create a new staking tier (owner only)
     * @param lockPeriod Lock period in seconds
     * @param rewardRate Annual reward rate in basis points
     * @param minStakeAmount Minimum stake amount for this tier
     */
    function createStakingTier(
        uint256 lockPeriod,
        uint256 rewardRate,
        uint256 minStakeAmount
    ) external onlyOwner {
        _createStakingTier(lockPeriod, rewardRate, minStakeAmount);
    }
    
    /**
     * @notice Update staking tier (owner only)
     * @param tierId Tier ID to update
     * @param lockPeriod New lock period
     * @param rewardRate New reward rate
     * @param minStakeAmount New minimum stake amount
     * @param isActive Whether tier is active
     */
    function updateStakingTier(
        uint256 tierId,
        uint256 lockPeriod,
        uint256 rewardRate,
        uint256 minStakeAmount,
        bool isActive
    ) external onlyOwner {
        require(tierId > 0 && tierId < nextTierId, "Invalid tier ID");
        
        stakingTiers[tierId] = StakingTier({
            lockPeriod: lockPeriod,
            rewardRate: rewardRate,
            minStakeAmount: minStakeAmount,
            isActive: isActive
        });
    }
    
    /**
     * @notice Add tokens to reward pool (owner only)
     * @param amount Amount to add to reward pool
     */
    function addToRewardPool(uint256 amount) external onlyOwner {
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        _transfer(msg.sender, address(this), amount);
        rewardPool += amount;
    }
    
    /**
     * @notice Internal function to create staking tier
     */
    function _createStakingTier(
        uint256 lockPeriod,
        uint256 rewardRate,
        uint256 minStakeAmount
    ) internal {
        stakingTiers[nextTierId] = StakingTier({
            lockPeriod: lockPeriod,
            rewardRate: rewardRate,
            minStakeAmount: minStakeAmount,
            isActive: true
        });
        
        emit StakingTierCreated(nextTierId, lockPeriod, rewardRate);
        nextTierId++;
    }
    
    /**
     * @notice Internal function to claim stake rewards
     */
    function _claimStakeRewards(address user, uint256 stakeIndex) internal {
        require(stakeIndex < userStakes[user].length, "Invalid stake index");
        
        StakeInfo storage stakeInfo = userStakes[user][stakeIndex];
        require(stakeInfo.isActive, "Stake not active");
        
        uint256 rewards = _calculateStakeRewards(user, stakeIndex);
        
        if (rewards > 0) {
            require(rewardPool >= rewards, "Insufficient reward pool");
            
            stakeInfo.lastRewardClaim = block.timestamp;
            rewardPool -= rewards;
            _mint(user, rewards);
            
            emit RewardsClaimed(user, rewards);
        }
    }
    
    /**
     * @notice Internal function to calculate stake rewards
     */
    function _calculateStakeRewards(address user, uint256 stakeIndex) internal view returns (uint256) {
        StakeInfo storage stakeInfo = userStakes[user][stakeIndex];
        
        if (!stakeInfo.isActive) {
            return 0;
        }
        
        uint256 timeStaked = block.timestamp - stakeInfo.lastRewardClaim;
        uint256 annualReward = (stakeInfo.amount * stakeInfo.rewardRate) / 10000;
        uint256 reward = (annualReward * timeStaked) / 365 days;
        
        return reward;
    }
    
    /**
     * @notice Internal function to update voting power
     */
    function _updateVotingPower(address user) internal {
        // Base voting power = token balance + 2x staked tokens
        uint256 newVotingPower = balanceOf(user) + (totalStaked[user] * 2);
        votingPower[user] = newVotingPower;
        
        emit VotingPowerUpdated(user, newVotingPower);
    }
    
    /**
     * @notice Internal function to update premium membership
     */
    function _updatePremiumMembership(address user) internal {
        bool wasPremium = premiumMembers[user];
        bool isPremium = totalStaked[user] >= PREMIUM_MEMBERSHIP_THRESHOLD;
        
        if (isPremium && !wasPremium) {
            premiumMembers[user] = true;
            emit PremiumMembershipGranted(user);
        } else if (!isPremium && wasPremium) {
            premiumMembers[user] = false;
            emit PremiumMembershipRevoked(user);
        }
    }
    
    /**
     * @notice Internal function to update discount tier
     */
    function _updateDiscountTier(address user) internal {
        uint256 stakedAmount = totalStaked[user];
        uint256 newTier = 0;
        
        if (stakedAmount >= 10000 * 10**18) {
            newTier = 3; // 15% discount
        } else if (stakedAmount >= 5000 * 10**18) {
            newTier = 2; // 10% discount
        } else if (stakedAmount >= 1000 * 10**18) {
            newTier = 1; // 5% discount
        }
        
        discountTier[user] = newTier;
    }
    
    /**
     * @notice Override transfer to update voting power
     */
    function _afterTokenTransfer(address from, address to, uint256 amount) internal override {
        super._afterTokenTransfer(from, to, amount);
        
        if (from != address(0)) {
            _updateVotingPower(from);
        }
        if (to != address(0)) {
            _updateVotingPower(to);
        }
    }
}