// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title OptimizedLDAOToken
 * @dev Gas-optimized LDAO token with packed structs and batch operations
 */
contract OptimizedLDAOToken is ERC20, ERC20Permit, Ownable, ReentrancyGuard {
    
    // Packed staking info to minimize storage slots
    struct PackedStakeInfo {
        uint128 amount;          // 16 bytes (max ~340 trillion tokens)
        uint64 stakingStartTime; // 8 bytes (timestamp until year 584 billion)
        uint32 lockPeriod;       // 4 bytes (max ~136 years in seconds)
        uint16 rewardRate;       // 2 bytes (max 655.35% in basis points)
        uint8 tierId;           // 1 byte (256 tiers)
        bool isActive;          // 1 byte
        // Total: 32 bytes (1 storage slot)
    }
    
    // Packed staking tier info
    struct PackedStakingTier {
        uint128 minStakeAmount;  // 16 bytes
        uint64 lockPeriod;       // 8 bytes
        uint32 rewardRate;       // 4 bytes (basis points)
        uint16 votingMultiplier; // 2 bytes
        bool isActive;           // 1 byte
        bool isPremium;          // 1 byte
        // Total: 32 bytes (1 storage slot)
    }
    
    // Packed contract state
    struct ContractState {
        uint128 totalStaked;     // 16 bytes
        uint64 totalStakers;     // 8 bytes
        uint32 premiumThreshold; // 4 bytes
        uint16 maxTiers;         // 2 bytes
        bool stakingEnabled;     // 1 byte
        bool rewardsEnabled;     // 1 byte
        // Total: 32 bytes (1 storage slot)
    }
    
    ContractState private _state;
    
    // Mappings
    mapping(address => PackedStakeInfo) private _stakes;
    mapping(uint8 => PackedStakingTier) private _stakingTiers;
    mapping(address => uint256) private _lastRewardClaim;
    mapping(address => uint256) private _totalRewardsClaimed;
    
    // Events with indexed parameters
    event Staked(
        address indexed user,
        uint256 indexed amount,
        uint256 indexed tierId,
        uint256 lockPeriod
    );
    
    event Unstaked(
        address indexed user,
        uint256 indexed amount,
        uint256 reward
    );
    
    event RewardsClaimed(
        address indexed user,
        uint256 indexed amount,
        uint256 timestamp
    );
    
    event BatchStakeCompleted(
        address indexed user,
        uint256 totalAmount,
        uint256 count
    );
    
    // Custom errors
    error StakingDisabled();
    error InvalidAmount();
    error InvalidTier();
    error StakeNotFound();
    error StakeLocked();
    error InsufficientBalance();
    error ArrayLengthMismatch();
    error RewardsDisabled();
    
    constructor(address treasury) 
        ERC20("LinkDAO Token", "LDAO") 
        ERC20Permit("LinkDAO Token") 
    {
        _mint(treasury, 1_000_000_000 * 10**decimals()); // 1 billion tokens
        
        // Initialize state
        _state.premiumThreshold = uint32(1000 * 10**decimals()); // 1000 tokens
        _state.maxTiers = 4;
        _state.stakingEnabled = true;
        _state.rewardsEnabled = true;
        
        // Initialize staking tiers (packed efficiently)
        _stakingTiers[1] = PackedStakingTier({
            minStakeAmount: uint128(100 * 10**decimals()),
            lockPeriod: 30 days,
            rewardRate: 500, // 5% APR
            votingMultiplier: 100, // 1x
            isActive: true,
            isPremium: false
        });
        
        _stakingTiers[2] = PackedStakingTier({
            minStakeAmount: uint128(500 * 10**decimals()),
            lockPeriod: 90 days,
            rewardRate: 800, // 8% APR
            votingMultiplier: 150, // 1.5x
            isActive: true,
            isPremium: false
        });
        
        _stakingTiers[3] = PackedStakingTier({
            minStakeAmount: uint128(1000 * 10**decimals()),
            lockPeriod: 180 days,
            rewardRate: 1200, // 12% APR
            votingMultiplier: 200, // 2x
            isActive: true,
            isPremium: true
        });
        
        _stakingTiers[4] = PackedStakingTier({
            minStakeAmount: uint128(5000 * 10**decimals()),
            lockPeriod: 365 days,
            rewardRate: 1800, // 18% APR
            votingMultiplier: 300, // 3x
            isActive: true,
            isPremium: true
        });
    }
    
    /**
     * @dev Stake tokens (optimized)
     */
    function stake(uint256 amount, uint8 tierId) external nonReentrant {
        if (!_state.stakingEnabled) revert StakingDisabled();
        if (amount == 0) revert InvalidAmount();
        if (tierId == 0 || tierId > _state.maxTiers) revert InvalidTier();
        if (amount > type(uint128).max) revert InvalidAmount();
        
        PackedStakingTier storage tier = _stakingTiers[tierId];
        if (!tier.isActive || amount < tier.minStakeAmount) revert InvalidTier();
        
        PackedStakeInfo storage userStake = _stakes[msg.sender];
        
        // If user already has a stake, claim rewards first
        if (userStake.isActive) {
            _claimRewards(msg.sender);
        }
        
        // Transfer tokens
        _transfer(msg.sender, address(this), amount);
        
        // Update or create stake
        if (!userStake.isActive) {
            unchecked { _state.totalStakers += 1; }
        } else {
            unchecked { _state.totalStaked -= userStake.amount; }
        }
        
        userStake.amount = uint128(amount);
        userStake.stakingStartTime = uint64(block.timestamp);
        userStake.lockPeriod = tier.lockPeriod;
        userStake.rewardRate = tier.rewardRate;
        userStake.tierId = tierId;
        userStake.isActive = true;
        
        unchecked { _state.totalStaked += uint128(amount); }
        
        _lastRewardClaim[msg.sender] = block.timestamp;
        
        emit Staked(msg.sender, amount, tierId, tier.lockPeriod);
    }
    
    /**
     * @dev Batch stake multiple amounts
     */
    function batchStake(
        uint256[] calldata amounts,
        uint8[] calldata tierIds
    ) external nonReentrant {
        if (!_state.stakingEnabled) revert StakingDisabled();
        uint256 length = amounts.length;
        if (length != tierIds.length) revert ArrayLengthMismatch();
        
        uint256 totalAmount = 0;
        
        // Validate all stakes first
        for (uint256 i = 0; i < length;) {
            if (amounts[i] == 0) revert InvalidAmount();
            if (tierIds[i] == 0 || tierIds[i] > _state.maxTiers) revert InvalidTier();
            if (amounts[i] > type(uint128).max) revert InvalidAmount();
            
            PackedStakingTier storage tier = _stakingTiers[tierIds[i]];
            if (!tier.isActive || amounts[i] < tier.minStakeAmount) revert InvalidTier();
            
            totalAmount += amounts[i];
            unchecked { ++i; }
        }
        
        if (balanceOf(msg.sender) < totalAmount) revert InsufficientBalance();
        
        // Process all stakes
        for (uint256 i = 0; i < length;) {
            _processBatchStake(amounts[i], tierIds[i]);
            unchecked { ++i; }
        }
        
        emit BatchStakeCompleted(msg.sender, totalAmount, length);
    }
    
    /**
     * @dev Internal function to process individual stake in batch
     */
    function _processBatchStake(uint256 amount, uint8 tierId) private {
        PackedStakingTier storage tier = _stakingTiers[tierId];
        
        // For batch operations, we create separate stake entries
        // This is a simplified version - in practice, you might want to aggregate
        _transfer(msg.sender, address(this), amount);
        
        // Update state
        unchecked { 
            _state.totalStaked += uint128(amount);
            if (!_stakes[msg.sender].isActive) {
                _state.totalStakers += 1;
            }
        }
        
        // Update user stake (simplified - overwrites previous)
        _stakes[msg.sender] = PackedStakeInfo({
            amount: uint128(amount),
            stakingStartTime: uint64(block.timestamp),
            lockPeriod: tier.lockPeriod,
            rewardRate: tier.rewardRate,
            tierId: tierId,
            isActive: true
        });
        
        _lastRewardClaim[msg.sender] = block.timestamp;
        
        emit Staked(msg.sender, amount, tierId, tier.lockPeriod);
    }
    
    /**
     * @dev Unstake tokens (optimized)
     */
    function unstake() external nonReentrant {
        PackedStakeInfo storage userStake = _stakes[msg.sender];
        if (!userStake.isActive) revert StakeNotFound();
        
        uint256 lockEndTime = userStake.stakingStartTime + userStake.lockPeriod;
        if (block.timestamp < lockEndTime) revert StakeLocked();
        
        uint256 stakedAmount = userStake.amount;
        uint256 reward = _calculateReward(msg.sender);
        
        // Update state
        userStake.isActive = false;
        unchecked {
            _state.totalStaked -= uint128(stakedAmount);
            _state.totalStakers -= 1;
        }
        
        // Transfer tokens back
        _transfer(address(this), msg.sender, stakedAmount);
        
        // Mint rewards if any
        if (reward > 0 && _state.rewardsEnabled) {
            _mint(msg.sender, reward);
            _totalRewardsClaimed[msg.sender] += reward;
        }
        
        emit Unstaked(msg.sender, stakedAmount, reward);
    }
    
    /**
     * @dev Claim rewards without unstaking
     */
    function claimRewards() external nonReentrant {
        if (!_state.rewardsEnabled) revert RewardsDisabled();
        _claimRewards(msg.sender);
    }
    
    /**
     * @dev Internal reward claiming
     */
    function _claimRewards(address user) private {
        PackedStakeInfo storage userStake = _stakes[user];
        if (!userStake.isActive) return;
        
        uint256 reward = _calculateReward(user);
        if (reward == 0) return;
        
        _lastRewardClaim[user] = block.timestamp;
        _totalRewardsClaimed[user] += reward;
        
        _mint(user, reward);
        
        emit RewardsClaimed(user, reward, block.timestamp);
    }
    
    /**
     * @dev Calculate pending rewards (optimized)
     */
    function _calculateReward(address user) private view returns (uint256) {
        PackedStakeInfo storage userStake = _stakes[user];
        if (!userStake.isActive) return 0;
        
        uint256 lastClaim = _lastRewardClaim[user];
        if (lastClaim == 0) lastClaim = userStake.stakingStartTime;
        
        uint256 timeStaked = block.timestamp - lastClaim;
        if (timeStaked == 0) return 0;
        
        // Calculate reward: (amount * rate * time) / (10000 * 365 days)
        uint256 reward = (uint256(userStake.amount) * userStake.rewardRate * timeStaked) / (10000 * 365 days);
        
        return reward;
    }
    
    /**
     * @dev Get voting power (optimized)
     */
    function getVotingPower(address user) external view returns (uint256) {
        uint256 balance = balanceOf(user);
        PackedStakeInfo storage userStake = _stakes[user];
        
        if (!userStake.isActive) return balance;
        
        PackedStakingTier storage tier = _stakingTiers[userStake.tierId];
        uint256 stakedVotingPower = (uint256(userStake.amount) * tier.votingMultiplier) / 100;
        
        return balance + stakedVotingPower;
    }
    
    /**
     * @dev Check if user is premium member
     */
    function isPremiumMember(address user) external view returns (bool) {
        PackedStakeInfo storage userStake = _stakes[user];
        if (!userStake.isActive) return false;
        
        PackedStakingTier storage tier = _stakingTiers[userStake.tierId];
        return tier.isPremium;
    }
    
    /**
     * @dev Get stake info
     */
    function getStakeInfo(address user) external view returns (
        uint256 amount,
        uint256 stakingStartTime,
        uint256 lockPeriod,
        uint256 rewardRate,
        uint8 tierId,
        bool isActive,
        uint256 pendingRewards
    ) {
        PackedStakeInfo storage userStake = _stakes[user];
        return (
            userStake.amount,
            userStake.stakingStartTime,
            userStake.lockPeriod,
            userStake.rewardRate,
            userStake.tierId,
            userStake.isActive,
            _calculateReward(user)
        );
    }
    
    /**
     * @dev Get staking tier info
     */
    function getStakingTier(uint8 tierId) external view returns (
        uint256 minStakeAmount,
        uint256 lockPeriod,
        uint256 rewardRate,
        uint256 votingMultiplier,
        bool isActive,
        bool isPremium
    ) {
        PackedStakingTier storage tier = _stakingTiers[tierId];
        return (
            tier.minStakeAmount,
            tier.lockPeriod,
            tier.rewardRate,
            tier.votingMultiplier,
            tier.isActive,
            tier.isPremium
        );
    }
    
    /**
     * @dev Get contract state
     */
    function getContractState() external view returns (
        uint256 totalStaked,
        uint256 totalStakers,
        uint256 premiumThreshold,
        bool stakingEnabled,
        bool rewardsEnabled
    ) {
        return (
            _state.totalStaked,
            _state.totalStakers,
            _state.premiumThreshold,
            _state.stakingEnabled,
            _state.rewardsEnabled
        );
    }
    
    /**
     * @dev Batch transfer (gas optimized)
     */
    function batchTransfer(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external returns (bool) {
        uint256 length = recipients.length;
        if (length != amounts.length) revert ArrayLengthMismatch();
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < length;) {
            totalAmount += amounts[i];
            unchecked { ++i; }
        }
        
        if (balanceOf(msg.sender) < totalAmount) revert InsufficientBalance();
        
        for (uint256 i = 0; i < length;) {
            _transfer(msg.sender, recipients[i], amounts[i]);
            unchecked { ++i; }
        }
        
        return true;
    }
    
    /**
     * @dev Estimate gas for staking
     */
    function estimateStakingGas(uint8 tierId) external view returns (uint256) {
        uint256 baseGas = 120000;
        
        // Additional gas for new stakers
        if (!_stakes[msg.sender].isActive) {
            baseGas += 20000;
        }
        
        // Additional gas for premium tiers
        if (tierId > 2) {
            baseGas += 10000;
        }
        
        return baseGas;
    }
    
    // Admin functions
    function setStakingEnabled(bool enabled) external onlyOwner {
        _state.stakingEnabled = enabled;
    }
    
    function setRewardsEnabled(bool enabled) external onlyOwner {
        _state.rewardsEnabled = enabled;
    }
    
    function updateStakingTier(
        uint8 tierId,
        uint128 minStakeAmount,
        uint64 lockPeriod,
        uint32 rewardRate,
        uint16 votingMultiplier,
        bool isActive,
        bool isPremium
    ) external onlyOwner {
        require(tierId > 0 && tierId <= _state.maxTiers, "Invalid tier");
        
        _stakingTiers[tierId] = PackedStakingTier({
            minStakeAmount: minStakeAmount,
            lockPeriod: lockPeriod,
            rewardRate: rewardRate,
            votingMultiplier: votingMultiplier,
            isActive: isActive,
            isPremium: isPremium
        });
    }
    
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            payable(owner()).transfer(amount);
        } else {
            IERC20(token).transfer(owner(), amount);
        }
    }
}