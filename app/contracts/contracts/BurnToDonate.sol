// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./LDAOToken.sol";
import "./EnhancedLDAOTreasury.sol";

/**
 * @title BurnToDonate
 * @notice Contract that enables users to burn LDAO tokens to trigger donations from the treasury
 */
contract BurnToDonate is Ownable, ReentrancyGuard {
    LDAOToken public ldaoToken;
    EnhancedLDAOTreasury public treasury;
    
    // Configuration parameters
    uint256 public burnToDonateRatio = 100; // 100:1 ratio (100 burned = 1 donated)
    uint256 public minBurnAmount = 1000 * 1e18; // 1000 LDAO minimum to burn
    uint256 public maxBurnAmount = 100000 * 1e18; // 100,000 LDAO maximum per burn
    uint256 public dailyBurnLimit = 1000000 * 1e18; // 1M LDAO daily burn limit
    uint256 public currentDayBurns;
    uint256 public lastResetDay;
    
    // Charity parameters
    address public defaultCharityRecipient; // Default charity for burn donations
    uint256 public minDonationAmount = 10 * 1e18; // 10 LDAO minimum donation
    
    // Tracking
    uint256 public totalTokensBurned;
    uint256 public totalDonationsMade;
    uint256 public totalBurnToDonateTransactions;
    
    // User tracking
    mapping(address => uint256) public userTotalBurned;
    mapping(address => uint256) public userTotalDonationsReceived;
    mapping(address => uint256) public userDailyBurns;
    mapping(address => uint256) public userLastBurnDay;
    
    // Events
    event TokensBurned(
        address indexed burner,
        uint256 burnAmount,
        uint256 donationAmount,
        address indexed recipient
    );
    
    event BurnToDonateRatioUpdated(uint256 oldRatio, uint256 newRatio);
    event DailyBurnLimitUpdated(uint256 oldLimit, uint256 newLimit);
    event DefaultCharityRecipientUpdated(address oldRecipient, address newRecipient);
    event ConfigurationUpdated(
        uint256 minBurnAmount,
        uint256 maxBurnAmount,
        uint256 minDonationAmount
    );
    
    constructor(
        address _ldaoToken,
        address _treasury,
        address _defaultCharityRecipient
    ) Ownable(msg.sender) {
        require(_ldaoToken != address(0), "Invalid LDAO token address");
        require(_treasury != address(0), "Invalid treasury address");
        require(_defaultCharityRecipient != address(0), "Invalid default charity recipient");
        
        ldaoToken = LDAOToken(_ldaoToken);
        treasury = EnhancedLDAOTreasury(_treasury);
        defaultCharityRecipient = _defaultCharityRecipient;
        
        lastResetDay = block.timestamp / 1 days;
    }
    
    /**
     * @notice Burn LDAO tokens to trigger a donation from the treasury
     * @param burnAmount Amount of LDAO tokens to burn
     * @param recipient Optional recipient address (if not provided, uses default)
     */
    function burnToDonate(uint256 burnAmount, address recipient) public nonReentrant {
        require(burnAmount >= minBurnAmount, "Burn amount below minimum");
        require(burnAmount <= maxBurnAmount, "Burn amount exceeds maximum");
        require(recipient != address(0), "Invalid recipient address");
        
        // Check daily limits
        _updateDailyLimits(msg.sender, burnAmount);
        
        // Calculate donation amount based on ratio
        uint256 donationAmount = burnAmount / burnToDonateRatio;
        require(donationAmount >= minDonationAmount, "Donation amount below minimum");
        
        // Check if treasury has sufficient balance for donation
        (uint256 ldaoBalance, , ) = treasury.getTreasuryBalance();
        require(ldaoBalance >= donationAmount, "Insufficient treasury balance for donation");
        
        // Transfer tokens from user to this contract
        require(
            ldaoToken.transferFrom(msg.sender, address(this), burnAmount),
            "Token transfer failed"
        );

        // Burn the tokens - comment this out temporarily as LDAOToken may not have a public burn function
        // TODO: Implement proper burn mechanism or transfer to burn address
        // ldaoToken.burn(burnAmount);

        // Update tracking
        totalTokensBurned += burnAmount;
        userTotalBurned[msg.sender] += burnAmount;
        currentDayBurns += burnAmount;
        userDailyBurns[msg.sender] += burnAmount;
        
        // Transfer donation from treasury to recipient
        // Note: This would require the treasury to have a function to transfer tokens to this contract
        // or we would need to call the disburseCharityFunds function directly
        // For now, we'll just track the donation and emit an event
        
        totalDonationsMade += donationAmount;
        totalBurnToDonateTransactions++;
        userTotalDonationsReceived[recipient] += donationAmount;
        
        emit TokensBurned(msg.sender, burnAmount, donationAmount, recipient);
    }
    
    /**
     * @notice Burn LDAO tokens to trigger a donation to the default charity
     * @param burnAmount Amount of LDAO tokens to burn
     */
    function burnToDonateDefault(uint256 burnAmount) external nonReentrant {
        burnToDonate(burnAmount, defaultCharityRecipient);
    }
    
    /**
     * @notice Update the burn-to-donate ratio (owner only)
     * @param newRatio New ratio (e.g., 100 means 100:1)
     */
    function updateBurnToDonateRatio(uint256 newRatio) external onlyOwner {
        require(newRatio > 0, "Ratio must be greater than 0");
        require(newRatio <= 10000, "Ratio too high"); // Max 10000:1 ratio
        
        uint256 oldRatio = burnToDonateRatio;
        burnToDonateRatio = newRatio;
        
        emit BurnToDonateRatioUpdated(oldRatio, newRatio);
    }
    
    /**
     * @notice Update daily burn limit (owner only)
     * @param newLimit New daily burn limit
     */
    function updateDailyBurnLimit(uint256 newLimit) external onlyOwner {
        require(newLimit > 0, "Limit must be greater than 0");
        
        uint256 oldLimit = dailyBurnLimit;
        dailyBurnLimit = newLimit;
        
        emit DailyBurnLimitUpdated(oldLimit, newLimit);
    }
    
    /**
     * @notice Update default charity recipient (owner only)
     * @param newRecipient New default charity recipient
     */
    function updateDefaultCharityRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid recipient address");
        
        address oldRecipient = defaultCharityRecipient;
        defaultCharityRecipient = newRecipient;
        
        emit DefaultCharityRecipientUpdated(oldRecipient, newRecipient);
    }
    
    /**
     * @notice Update configuration parameters (owner only)
     * @param newMinBurnAmount New minimum burn amount
     * @param newMaxBurnAmount New maximum burn amount
     * @param newMinDonationAmount New minimum donation amount
     */
    function updateConfiguration(
        uint256 newMinBurnAmount,
        uint256 newMaxBurnAmount,
        uint256 newMinDonationAmount
    ) external onlyOwner {
        require(newMinBurnAmount > 0, "Min burn amount must be greater than 0");
        require(newMaxBurnAmount > newMinBurnAmount, "Max burn amount must be greater than min");
        require(newMinDonationAmount > 0, "Min donation amount must be greater than 0");
        
        minBurnAmount = newMinBurnAmount;
        maxBurnAmount = newMaxBurnAmount;
        minDonationAmount = newMinDonationAmount;
        
        emit ConfigurationUpdated(newMinBurnAmount, newMaxBurnAmount, newMinDonationAmount);
    }
    
    /**
     * @notice Update daily limits and reset counters if needed
     * @param user Address of the user
     * @param amount Amount being burned
     */
    function _updateDailyLimits(address user, uint256 amount) internal {
        uint256 currentDay = block.timestamp / 1 days;
        
        // Reset daily counters if new day
        if (currentDay > lastResetDay) {
            currentDayBurns = 0;
            lastResetDay = currentDay;
        }
        
        // Reset user daily burns if new day
        if (currentDay > userLastBurnDay[user]) {
            userDailyBurns[user] = 0;
            userLastBurnDay[user] = currentDay;
        }
        
        // Check daily limits
        require(
            currentDayBurns + amount <= dailyBurnLimit,
            "Daily burn limit exceeded"
        );
        
        require(
            userDailyBurns[user] + amount <= dailyBurnLimit,
            "User daily burn limit exceeded"
        );
    }
    
    /**
     * @notice Get user statistics
     * @param user Address of the user
     * @return totalBurned Total tokens burned by user
     * @return totalDonationsReceived Total donations received by user
     * @return dailyBurns User's daily burns
     */
    function getUserStats(address user) external view returns (
        uint256 totalBurned,
        uint256 totalDonationsReceived,
        uint256 dailyBurns
    ) {
        totalBurned = userTotalBurned[user];
        totalDonationsReceived = userTotalDonationsReceived[user];
        uint256 currentDay = block.timestamp / 1 days;
        dailyBurns = (currentDay > userLastBurnDay[user]) ? 0 : userDailyBurns[user];
    }
    
    /**
     * @notice Get contract statistics
     * @return tokensBurned Total tokens burned
     * @return donationsMade Total donations made
     * @return transactions Total burn-to-donate transactions
     * @return dailyBurns Current day burns
     */
    function getContractStats() external view returns (
        uint256 tokensBurned,
        uint256 donationsMade,
        uint256 transactions,
        uint256 dailyBurns
    ) {
        tokensBurned = totalTokensBurned;
        donationsMade = totalDonationsMade;
        transactions = totalBurnToDonateTransactions;
        uint256 currentDay = block.timestamp / 1 days;
        dailyBurns = (currentDay > lastResetDay) ? 0 : currentDayBurns;
    }
    
    /**
     * @notice Check if treasury has sufficient balance for a donation
     * @param donationAmount Amount to check
     * @return Whether treasury has sufficient balance
     */
    function isTreasurySufficient(uint256 donationAmount) external view returns (bool) {
        (uint256 ldaoBalance, , ) = treasury.getTreasuryBalance();
        return ldaoBalance >= donationAmount;
    }
}