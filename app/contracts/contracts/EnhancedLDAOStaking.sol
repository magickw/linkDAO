// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title EnhancedLDAOStaking
 * @notice Enhanced staking contract with flexible/fixed terms, auto-compounding, and premium member benefits
 */
contract EnhancedLDAOStaking is Ownable, ReentrancyGuard, Pausable {
    IERC20 public immutable ldaoToken;
    
    // Enhanced staking structures
    struct StakePosition {
        uint256 amount;
        uint256 startTime;
        uint256 lockPeriod; // 0 for flexible staking
        uint256 aprRate; // basis points (e.g., 500 = 5%)
        uint256 lastRewardClaim;
        uint256 accumulatedRewards;
        bool isActive;
        bool isAutoCompound;
        bool isFixedTerm;
        uint256 tierId;
    }
    
    struct StakingTier {
        string name;
        uint256 lockPeriod; // 0 for flexible
        uint256 baseAprRate; // basis points
        uint256 premiumBonusRate; // additional APR for premium members
        uint256 minStakeAmount;
        uint256 maxStakeAmount; // 0 for unlimited
        bool isActive;
        bool allowsAutoCompound;
        uint256 earlyWithdrawalPenalty; // basis points
    }
    
    struct UserStakingInfo {
        uint256 totalStaked;
        uint256 totalRewards;
        uint256 activePositions;
        bool isPremiumMember;
        uint256 premiumMemberSince;
        uint256 lastActivityTime;
    }
    
    // Mappings
    mapping(address => StakePosition[]) public userStakes;
    mapping(address => UserStakingInfo) public userInfo;
    mapping(uint256 => StakingTier) public stakingTiers;
    mapping(address => bool) public premiumMembers;
    mapping(address => uint256) public votingPower;
    
    // State variables
    uint256 public totalStakedSupply;
    uint256 public rewardPool;
    uint256 public nextTierId = 1;
    uint256 public premiumMemberThreshold = 1000 * 10**18; // 1000 LDAO
    uint256 public emergencyWithdrawalPenalty = 2500; // 25%
    
    // Auto-compound settings
    uint256 public autoCompoundThreshold = 10 * 10**18; // 10 LDAO minimum
    uint256 public autoCompoundFee = 100; // 1% fee
    
    // Events
    event Staked(
        address indexed user, 
        uint256 amount, 
        uint256 tierId, 
        uint256 positionIndex,
        bool isAutoCompound
    );
    event Unstaked(
        address indexed user, 
        uint256 amount, 
        uint256 positionIndex,
        uint256 penalty
    );
    event RewardsClaimed(address indexed user, uint256 amount, uint256 positionIndex);
    event AutoCompounded(address indexed user, uint256 positionIndex, uint256 rewardAmount);
    event PartialUnstaked(
        address indexed user, 
        uint256 positionIndex, 
        uint256 amount, 
        uint256 penalty
    );
    event EmergencyUnstaked(address indexed user, uint256 positionIndex, uint256 penalty);
    event PremiumMembershipGranted(address indexed user);
    event PremiumMembershipRevoked(address indexed user);
    event StakingTierCreated(uint256 indexed tierId, string name);
    event StakingTierUpdated(uint256 indexed tierId);
    
    constructor(address _ldaoToken, address _owner) Ownable(_owner) {
        ldaoToken = IERC20(_ldaoToken);
        
        // Initialize default enhanced staking tiers
        _createStakingTier(
            "Flexible Staking",
            0, // No lock period
            500, // 5% base APR
            200, // 2% premium bonus
            100 * 10**18, // Min 100 LDAO
            0, // No max limit
            true, // Allow auto-compound
            0 // No early withdrawal penalty for flexible
        );
        
        _createStakingTier(
            "Short Term Fixed",
            30 days,
            800, // 8% base APR
            300, // 3% premium bonus
            500 * 10**18, // Min 500 LDAO
            0,
            true,
            1000 // 10% early withdrawal penalty
        );
        
        _createStakingTier(
            "Medium Term Fixed",
            90 days,
            1200, // 12% base APR
            400, // 4% premium bonus
            1000 * 10**18, // Min 1000 LDAO
            0,
            true,
            1500 // 15% early withdrawal penalty
        );
        
        _createStakingTier(
            "Long Term Fixed",
            180 days,
            1600, // 16% base APR
            500, // 5% premium bonus
            2000 * 10**18, // Min 2000 LDAO
            0,
            true,
            2000 // 20% early withdrawal penalty
        );
        
        _createStakingTier(
            "Premium Long Term",
            365 days,
            2000, // 20% base APR
            800, // 8% premium bonus
            5000 * 10**18, // Min 5000 LDAO
            0,
            true,
            2500 // 25% early withdrawal penalty
        );
    }
    
    /**
     * @notice Stake tokens with enhanced options
     */
    function stake(
        uint256 amount,
        uint256 tierId,
        bool autoCompound
    ) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(ldaoToken.balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        StakingTier storage tier = stakingTiers[tierId];
        require(tier.isActive, "Staking tier not active");
        require(amount >= tier.minStakeAmount, "Amount below minimum for tier");
        require(tier.maxStakeAmount == 0 || amount <= tier.maxStakeAmount, "Amount exceeds maximum");
        require(!autoCompound || tier.allowsAutoCompound, "Auto-compound not allowed for this tier");
        
        // Transfer tokens to contract
        require(ldaoToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        // Calculate APR rate (base + premium bonus if applicable)
        uint256 aprRate = tier.baseAprRate;
        if (premiumMembers[msg.sender]) {
            aprRate += tier.premiumBonusRate;
        }
        
        // Create stake position
        userStakes[msg.sender].push(StakePosition({
            amount: amount,
            startTime: block.timestamp,
            lockPeriod: tier.lockPeriod,
            aprRate: aprRate,
            lastRewardClaim: block.timestamp,
            accumulatedRewards: 0,
            isActive: true,
            isAutoCompound: autoCompound,
            isFixedTerm: tier.lockPeriod > 0,
            tierId: tierId
        }));
        
        // Update user info
        UserStakingInfo storage info = userInfo[msg.sender];
        info.totalStaked += amount;
        info.activePositions++;
        info.lastActivityTime = block.timestamp;
        
        // Update totals
        totalStakedSupply += amount;
        
        // Update voting power and premium status
        _updateVotingPower(msg.sender);
        _updatePremiumMembership(msg.sender);
        
        uint256 positionIndex = userStakes[msg.sender].length - 1;
        emit Staked(msg.sender, amount, tierId, positionIndex, autoCompound);
    }
    
    /**
     * @notice Unstake tokens from a specific position
     */
    function unstake(uint256 positionIndex) external nonReentrant {
        require(positionIndex < userStakes[msg.sender].length, "Invalid position index");
        
        StakePosition storage position = userStakes[msg.sender][positionIndex];
        require(position.isActive, "Position not active");
        
        uint256 penalty = 0;
        bool isEarlyWithdrawal = false;
        
        // Check if it's early withdrawal for fixed-term staking
        if (position.isFixedTerm && 
            block.timestamp < position.startTime + position.lockPeriod) {
            isEarlyWithdrawal = true;
            StakingTier storage tier = stakingTiers[position.tierId];
            penalty = (position.amount * tier.earlyWithdrawalPenalty) / 10000;
        }
        
        uint256 amount = position.amount;
        
        // Claim any pending rewards first
        _claimPositionRewards(msg.sender, positionIndex);
        
        // Mark position as inactive
        position.isActive = false;
        
        // Update user info
        UserStakingInfo storage info = userInfo[msg.sender];
        info.totalStaked -= amount;
        info.activePositions--;
        info.lastActivityTime = block.timestamp;
        
        // Update totals
        totalStakedSupply -= amount;
        
        // Calculate withdrawal amount after penalty
        uint256 withdrawAmount = amount - penalty;
        
        // Transfer tokens back to user
        require(ldaoToken.transfer(msg.sender, withdrawAmount), "Transfer failed");
        
        // Add penalty to reward pool if applicable
        if (penalty > 0) {
            rewardPool += penalty;
        }
        
        // Update voting power and premium status
        _updateVotingPower(msg.sender);
        _updatePremiumMembership(msg.sender);
        
        emit Unstaked(msg.sender, amount, positionIndex, penalty);
    }
    
    /**
     * @notice Partial unstaking with penalty calculation
     */
    function partialUnstake(uint256 positionIndex, uint256 amount) external nonReentrant {
        require(positionIndex < userStakes[msg.sender].length, "Invalid position index");
        require(amount > 0, "Amount must be greater than 0");
        
        StakePosition storage position = userStakes[msg.sender][positionIndex];
        require(position.isActive, "Position not active");
        require(amount < position.amount, "Use unstake for full withdrawal");
        require(amount <= position.amount / 2, "Cannot withdraw more than 50% partially");
        
        // Check minimum remaining amount
        StakingTier storage tier = stakingTiers[position.tierId];
        require(position.amount - amount >= tier.minStakeAmount, "Remaining amount below minimum");
        
        uint256 penalty = 0;
        
        // Calculate penalty for partial withdrawal
        if (position.isFixedTerm) {
            // Higher penalty for partial withdrawal from fixed-term positions
            penalty = (amount * (tier.earlyWithdrawalPenalty + 500)) / 10000; // +5% additional penalty
        } else {
            // Small penalty for flexible staking partial withdrawal
            penalty = (amount * 250) / 10000; // 2.5% penalty
        }
        
        // Update position
        position.amount -= amount;
        
        // Update user info
        UserStakingInfo storage info = userInfo[msg.sender];
        info.totalStaked -= amount;
        info.lastActivityTime = block.timestamp;
        
        // Update totals
        totalStakedSupply -= amount;
        
        // Calculate withdrawal amount after penalty
        uint256 withdrawAmount = amount - penalty;
        
        // Transfer tokens back to user
        require(ldaoToken.transfer(msg.sender, withdrawAmount), "Transfer failed");
        
        // Add penalty to reward pool
        if (penalty > 0) {
            rewardPool += penalty;
        }
        
        // Update voting power
        _updateVotingPower(msg.sender);
        _updatePremiumMembership(msg.sender);
        
        emit PartialUnstaked(msg.sender, positionIndex, amount, penalty);
    }
    
    /**
     * @notice Emergency unstaking with higher penalty
     */
    function emergencyUnstake(uint256 positionIndex) external nonReentrant {
        require(positionIndex < userStakes[msg.sender].length, "Invalid position index");
        
        StakePosition storage position = userStakes[msg.sender][positionIndex];
        require(position.isActive, "Position not active");
        
        uint256 amount = position.amount;
        uint256 penalty = (amount * emergencyWithdrawalPenalty) / 10000;
        
        // Mark position as inactive
        position.isActive = false;
        
        // Update user info
        UserStakingInfo storage info = userInfo[msg.sender];
        info.totalStaked -= amount;
        info.activePositions--;
        info.lastActivityTime = block.timestamp;
        
        // Update totals
        totalStakedSupply -= amount;
        
        // Calculate withdrawal amount after penalty
        uint256 withdrawAmount = amount - penalty;
        
        // Transfer tokens back to user
        require(ldaoToken.transfer(msg.sender, withdrawAmount), "Transfer failed");
        
        // Add penalty to reward pool
        rewardPool += penalty;
        
        // Update voting power and premium status
        _updateVotingPower(msg.sender);
        _updatePremiumMembership(msg.sender);
        
        emit EmergencyUnstaked(msg.sender, positionIndex, penalty);
    }
    
    /**
     * @notice Claim rewards for a specific position
     */
    function claimRewards(uint256 positionIndex) external nonReentrant {
        _claimPositionRewards(msg.sender, positionIndex);
    }
    
    /**
     * @notice Claim all available rewards
     */
    function claimAllRewards() external nonReentrant {
        uint256 totalRewards = 0;
        
        for (uint256 i = 0; i < userStakes[msg.sender].length; i++) {
            if (userStakes[msg.sender][i].isActive) {
                uint256 rewards = _calculatePositionRewards(msg.sender, i);
                if (rewards > 0) {
                    userStakes[msg.sender][i].lastRewardClaim = block.timestamp;
                    userStakes[msg.sender][i].accumulatedRewards += rewards;
                    totalRewards += rewards;
                }
            }
        }
        
        if (totalRewards > 0) {
            require(rewardPool >= totalRewards, "Insufficient reward pool");
            rewardPool -= totalRewards;
            userInfo[msg.sender].totalRewards += totalRewards;
            
            require(ldaoToken.transfer(msg.sender, totalRewards), "Transfer failed");
            
            emit RewardsClaimed(msg.sender, totalRewards, type(uint256).max);
        }
    }
    
    /**
     * @notice Auto-compound rewards for positions that have it enabled
     */
    function autoCompound(address user, uint256 positionIndex) external nonReentrant {
        require(positionIndex < userStakes[user].length, "Invalid position index");
        
        StakePosition storage position = userStakes[user][positionIndex];
        require(position.isActive, "Position not active");
        require(position.isAutoCompound, "Auto-compound not enabled");
        
        uint256 rewards = _calculatePositionRewards(user, positionIndex);
        require(rewards >= autoCompoundThreshold, "Rewards below threshold");
        
        // Calculate fee
        uint256 fee = (rewards * autoCompoundFee) / 10000;
        uint256 compoundAmount = rewards - fee;
        
        // Update position
        position.amount += compoundAmount;
        position.lastRewardClaim = block.timestamp;
        position.accumulatedRewards += rewards;
        
        // Update user info
        userInfo[user].totalStaked += compoundAmount;
        userInfo[user].totalRewards += rewards;
        
        // Update totals
        totalStakedSupply += compoundAmount;
        
        // Add fee to reward pool
        if (fee > 0) {
            rewardPool += fee;
        }
        
        // Update voting power
        _updateVotingPower(user);
        
        emit AutoCompounded(user, positionIndex, rewards);
    }
    
    /**
     * @notice Batch auto-compound for multiple users (can be called by anyone)
     */
    function batchAutoCompound(address[] calldata users, uint256[] calldata positionIndexes) external {
        require(users.length == positionIndexes.length, "Array length mismatch");
        
        for (uint256 i = 0; i < users.length; i++) {
            try this.autoCompound(users[i], positionIndexes[i]) {
                // Success - continue to next
            } catch {
                // Skip failed auto-compounds
                continue;
            }
        }
    }
    
    /**
     * @notice Get user's total staking information
     */
    function getUserStakingInfo(address user) external view returns (
        uint256 totalStaked,
        uint256 totalRewards,
        uint256 activePositions,
        bool isPremiumMember,
        uint256 totalClaimableRewards
    ) {
        UserStakingInfo storage info = userInfo[user];
        
        uint256 claimableRewards = 0;
        for (uint256 i = 0; i < userStakes[user].length; i++) {
            if (userStakes[user][i].isActive) {
                claimableRewards += _calculatePositionRewards(user, i);
            }
        }
        
        return (
            info.totalStaked,
            info.totalRewards,
            info.activePositions,
            info.isPremiumMember,
            claimableRewards
        );
    }
    
    /**
     * @notice Get user's stake positions
     */
    function getUserStakePositions(address user) external view returns (StakePosition[] memory) {
        return userStakes[user];
    }
    
    /**
     * @notice Calculate rewards for a specific position
     */
    function calculatePositionRewards(address user, uint256 positionIndex) external view returns (uint256) {
        return _calculatePositionRewards(user, positionIndex);
    }
    
    // Admin functions
    
    /**
     * @notice Create new staking tier
     */
    function createStakingTier(
        string memory name,
        uint256 lockPeriod,
        uint256 baseAprRate,
        uint256 premiumBonusRate,
        uint256 minStakeAmount,
        uint256 maxStakeAmount,
        bool allowsAutoCompound,
        uint256 earlyWithdrawalPenalty
    ) external onlyOwner {
        _createStakingTier(
            name,
            lockPeriod,
            baseAprRate,
            premiumBonusRate,
            minStakeAmount,
            maxStakeAmount,
            allowsAutoCompound,
            earlyWithdrawalPenalty
        );
    }
    
    /**
     * @notice Update staking tier
     */
    function updateStakingTier(
        uint256 tierId,
        string memory name,
        uint256 lockPeriod,
        uint256 baseAprRate,
        uint256 premiumBonusRate,
        uint256 minStakeAmount,
        uint256 maxStakeAmount,
        bool isActive,
        bool allowsAutoCompound,
        uint256 earlyWithdrawalPenalty
    ) external onlyOwner {
        require(tierId > 0 && tierId < nextTierId, "Invalid tier ID");
        
        StakingTier storage tier = stakingTiers[tierId];
        tier.name = name;
        tier.lockPeriod = lockPeriod;
        tier.baseAprRate = baseAprRate;
        tier.premiumBonusRate = premiumBonusRate;
        tier.minStakeAmount = minStakeAmount;
        tier.maxStakeAmount = maxStakeAmount;
        tier.isActive = isActive;
        tier.allowsAutoCompound = allowsAutoCompound;
        tier.earlyWithdrawalPenalty = earlyWithdrawalPenalty;
        
        emit StakingTierUpdated(tierId);
    }
    
    /**
     * @notice Add tokens to reward pool
     */
    function addToRewardPool(uint256 amount) external onlyOwner {
        require(ldaoToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        rewardPool += amount;
    }
    
    /**
     * @notice Set premium member threshold
     */
    function setPremiumMemberThreshold(uint256 threshold) external onlyOwner {
        premiumMemberThreshold = threshold;
    }
    
    /**
     * @notice Set auto-compound parameters
     */
    function setAutoCompoundParams(uint256 threshold, uint256 fee) external onlyOwner {
        require(fee <= 1000, "Fee too high"); // Max 10%
        autoCompoundThreshold = threshold;
        autoCompoundFee = fee;
    }
    
    /**
     * @notice Emergency pause
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // Internal functions
    
    function _createStakingTier(
        string memory name,
        uint256 lockPeriod,
        uint256 baseAprRate,
        uint256 premiumBonusRate,
        uint256 minStakeAmount,
        uint256 maxStakeAmount,
        bool allowsAutoCompound,
        uint256 earlyWithdrawalPenalty
    ) internal {
        stakingTiers[nextTierId] = StakingTier({
            name: name,
            lockPeriod: lockPeriod,
            baseAprRate: baseAprRate,
            premiumBonusRate: premiumBonusRate,
            minStakeAmount: minStakeAmount,
            maxStakeAmount: maxStakeAmount,
            isActive: true,
            allowsAutoCompound: allowsAutoCompound,
            earlyWithdrawalPenalty: earlyWithdrawalPenalty
        });
        
        emit StakingTierCreated(nextTierId, name);
        nextTierId++;
    }
    
    function _claimPositionRewards(address user, uint256 positionIndex) internal {
        require(positionIndex < userStakes[user].length, "Invalid position index");
        
        StakePosition storage position = userStakes[user][positionIndex];
        require(position.isActive, "Position not active");
        
        uint256 rewards = _calculatePositionRewards(user, positionIndex);
        
        if (rewards > 0) {
            require(rewardPool >= rewards, "Insufficient reward pool");
            
            position.lastRewardClaim = block.timestamp;
            position.accumulatedRewards += rewards;
            rewardPool -= rewards;
            userInfo[user].totalRewards += rewards;
            
            require(ldaoToken.transfer(user, rewards), "Transfer failed");
            
            emit RewardsClaimed(user, rewards, positionIndex);
        }
    }
    
    function _calculatePositionRewards(address user, uint256 positionIndex) internal view returns (uint256) {
        StakePosition storage position = userStakes[user][positionIndex];
        
        if (!position.isActive) {
            return 0;
        }
        
        uint256 timeStaked = block.timestamp - position.lastRewardClaim;
        uint256 annualReward = (position.amount * position.aprRate) / 10000;
        uint256 reward = (annualReward * timeStaked) / 365 days;
        
        return reward;
    }
    
    function _updateVotingPower(address user) internal {
        uint256 tokenBalance = ldaoToken.balanceOf(user);
        uint256 stakedAmount = userInfo[user].totalStaked;
        
        // Base voting power = token balance + 2x staked tokens
        uint256 newVotingPower = tokenBalance + (stakedAmount * 2);
        
        // Premium members get additional 50% voting power bonus
        if (premiumMembers[user]) {
            newVotingPower = (newVotingPower * 150) / 100;
        }
        
        votingPower[user] = newVotingPower;
    }
    
    function _updatePremiumMembership(address user) internal {
        bool wasPremium = premiumMembers[user];
        bool isPremium = userInfo[user].totalStaked >= premiumMemberThreshold;
        
        if (isPremium && !wasPremium) {
            premiumMembers[user] = true;
            userInfo[user].isPremiumMember = true;
            userInfo[user].premiumMemberSince = block.timestamp;
            emit PremiumMembershipGranted(user);
        } else if (!isPremium && wasPremium) {
            premiumMembers[user] = false;
            userInfo[user].isPremiumMember = false;
            userInfo[user].premiumMemberSince = 0;
            emit PremiumMembershipRevoked(user);
        }
    }
}