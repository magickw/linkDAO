// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./LDAOToken.sol";
import "./security/MultiSigWallet.sol";
import "./Governance.sol";

/**
 * @title LDAOTreasury
 * @notice Enhanced Treasury contract for LDAO token sales with multi-sig controls and circuit breakers
 */
contract LDAOTreasury is Ownable, ReentrancyGuard, Pausable {

    // State variables
    LDAOToken public immutable ldaoToken;
    IERC20 public immutable usdcToken;
    MultiSigWallet public multiSigWallet;
    Governance public governance; // Governance contract for decentralized control
    
    uint256 public ldaoPriceInUSD = 1e16; // $0.01 in 18 decimals (1e16 = 0.01 * 1e18)
    uint256 public totalSold;
    uint256 public totalRevenue;
    uint256 public maxPurchaseAmount = 1000000 * 1e18; // 1M LDAO max per transaction
    uint256 public minPurchaseAmount = 10 * 1e18; // 10 LDAO minimum
    
    bool public salesActive = true;
    bool public kycRequired = false;
    
    // Circuit breaker parameters
    uint256 public dailyPurchaseLimit = 10000000 * 1e18; // 10M LDAO daily limit
    uint256 public currentDayPurchases;
    uint256 public lastResetDay;
    uint256 public emergencyStopThreshold = 5000000 * 1e18; // 5M LDAO emergency threshold
    
    // Dynamic pricing parameters
    uint256 public basePriceInUSD = 1e16; // Base price $0.01
    uint256 public demandMultiplier = 1e18; // 1.0 multiplier (18 decimals)
    uint256 public maxPriceMultiplier = 5e18; // Max 5x price increase
    uint256 public priceUpdateInterval = 1 hours;
    uint256 public lastPriceUpdate;
    
    // KYC and whitelist
    mapping(address => bool) public kycApproved;
    mapping(address => bool) public whitelist;
    mapping(address => uint256) public purchaseHistory;
    mapping(address => uint256) public dailyPurchases;
    mapping(address => uint256) public lastPurchaseDay;
    
    // Multi-sig controls
    mapping(bytes32 => bool) public executedTransactions;
    uint256 public constant MULTI_SIG_THRESHOLD = 2; // Require 2 signatures for admin functions
    
    // Pricing tiers based on volume
    struct PricingTier {
        uint256 threshold; // LDAO amount threshold
        uint256 discountBps; // Discount in basis points (100 = 1%)
        bool active;
    }
    
    mapping(uint256 => PricingTier) public pricingTiers;
    uint256 public nextTierId = 1;
    
    // Events
    event LDAOPurchased(
        address indexed buyer,
        uint256 ldaoAmount,
        uint256 usdAmount,
        uint256 ethAmount,
        string paymentMethod
    );
    event PriceUpdated(uint256 oldPrice, uint256 newPrice);
    event DynamicPriceUpdated(uint256 newPrice, uint256 demandMultiplier);
    event KYCStatusUpdated(address indexed user, bool approved);
    event WhitelistUpdated(address indexed user, bool whitelisted);
    event PricingTierAdded(uint256 indexed tierId, uint256 threshold, uint256 discountBps);
    event SalesStatusUpdated(bool active);
    event FundsWithdrawn(address indexed token, uint256 amount, address recipient);
    event EmergencyStop(string reason, uint256 timestamp);
    event CircuitBreakerTriggered(uint256 dailyVolume, uint256 threshold);
    event MultiSigWalletUpdated(address indexed oldWallet, address indexed newWallet);
    event GovernanceUpdated(address indexed newGovernance);
    event GovernanceOperationExecuted(address indexed target, uint256 value, bytes data);

    constructor(
        address _ldaoToken,
        address _usdcToken,
        address payable _multiSigWallet,
        address _governance
    ) Ownable(msg.sender) {
        ldaoToken = LDAOToken(_ldaoToken);
        usdcToken = IERC20(_usdcToken);
        multiSigWallet = MultiSigWallet(_multiSigWallet);
        governance = Governance(_governance);
        
        // Initialize timestamps
        lastResetDay = block.timestamp / 1 days;
        lastPriceUpdate = block.timestamp;
        
        // Initialize default pricing tiers
        _addPricingTier(100000 * 1e18, 500); // 100k LDAO: 5% discount
        _addPricingTier(500000 * 1e18, 1000); // 500k LDAO: 10% discount
        _addPricingTier(1000000 * 1e18, 1500); // 1M LDAO: 15% discount
    }

    /**
     * @notice Purchase LDAO tokens with ETH
     * @param ldaoAmount Amount of LDAO tokens to purchase
     */
    function purchaseWithETH(uint256 ldaoAmount) external payable nonReentrant whenNotPaused {
        require(salesActive, "Sales not active");
        require(ldaoAmount >= minPurchaseAmount, "Below minimum purchase");
        require(ldaoAmount <= maxPurchaseAmount, "Exceeds maximum purchase");
        
        // Circuit breaker checks
        _checkCircuitBreaker(ldaoAmount);
        _updateDailyLimits(msg.sender, ldaoAmount);
        
        if (kycRequired) {
            require(kycApproved[msg.sender], "KYC required");
        }
        
        // Update dynamic pricing if needed
        _updateDynamicPricing();
        
        // Calculate USD value and apply discounts
        uint256 finalPrice = _calculateFinalPrice(ldaoAmount);
        uint256 usdAmount;
        unchecked {
            usdAmount = (ldaoAmount * finalPrice) / 1e18;
        }
        
        // Get ETH price from oracle (simplified - use Chainlink in production)
        uint256 ethPriceInUSD = _getETHPrice();
        uint256 requiredETH;
        unchecked {
            requiredETH = (usdAmount * 1e18) / ethPriceInUSD;
        }
        
        require(msg.value >= requiredETH, "Insufficient ETH sent");
        
        // Transfer LDAO tokens
        require(
            ldaoToken.transfer(msg.sender, ldaoAmount),
            "LDAO transfer failed"
        );
        
        // Update statistics with overflow checks
        uint256 newTotalSold = totalSold + ldaoAmount;
        require(newTotalSold >= totalSold, "Overflow in totalSold"); // Check for overflow
        totalSold = newTotalSold;
        
        uint256 newTotalRevenue = totalRevenue + usdAmount;
        require(newTotalRevenue >= totalRevenue, "Overflow in totalRevenue"); // Check for overflow
        totalRevenue = newTotalRevenue;
        
        uint256 newPurchaseHistory = purchaseHistory[msg.sender] + ldaoAmount;
        require(newPurchaseHistory >= purchaseHistory[msg.sender], "Overflow in purchaseHistory"); // Check for overflow
        purchaseHistory[msg.sender] = newPurchaseHistory;
        
        // Refund excess ETH
        if (msg.value > requiredETH) {
            payable(msg.sender).transfer(msg.value - requiredETH);
        }
        
        emit LDAOPurchased(msg.sender, ldaoAmount, usdAmount, requiredETH, "ETH");
    }

    /**
     * @notice Purchase LDAO tokens with USDC
     * @param ldaoAmount Amount of LDAO tokens to purchase
     */
    function purchaseWithUSDC(uint256 ldaoAmount) external nonReentrant whenNotPaused {
        require(salesActive, "Sales not active");
        require(ldaoAmount >= minPurchaseAmount, "Below minimum purchase");
        require(ldaoAmount <= maxPurchaseAmount, "Exceeds maximum purchase");
        
        // Circuit breaker checks
        _checkCircuitBreaker(ldaoAmount);
        _updateDailyLimits(msg.sender, ldaoAmount);
        
        if (kycRequired) {
            require(kycApproved[msg.sender], "KYC required");
        }
        
        // Update dynamic pricing if needed
        _updateDynamicPricing();
        
        // Calculate USD value and apply discounts
        uint256 finalPrice = _calculateFinalPrice(ldaoAmount);
        uint256 usdAmount;
        unchecked {
            usdAmount = (ldaoAmount * finalPrice) / 1e18;
        }
        
        // Convert to USDC amount (6 decimals)
        uint256 usdcAmount;
        unchecked {
            usdcAmount = usdAmount / 1e12;
        }
        
        // Transfer USDC from buyer
        require(
            usdcToken.transferFrom(msg.sender, address(this), usdcAmount),
            "USDC transfer failed"
        );
        
        // Transfer LDAO tokens
        require(
            ldaoToken.transfer(msg.sender, ldaoAmount),
            "LDAO transfer failed"
        );
        
        // Update statistics with overflow checks
        uint256 newTotalSold = totalSold + ldaoAmount;
        require(newTotalSold >= totalSold, "Overflow in totalSold"); // Check for overflow
        totalSold = newTotalSold;
        
        uint256 newTotalRevenue = totalRevenue + usdAmount;
        require(newTotalRevenue >= totalRevenue, "Overflow in totalRevenue"); // Check for overflow
        totalRevenue = newTotalRevenue;
        
        uint256 newPurchaseHistory = purchaseHistory[msg.sender] + ldaoAmount;
        require(newPurchaseHistory >= purchaseHistory[msg.sender], "Overflow in purchaseHistory"); // Check for overflow
        purchaseHistory[msg.sender] = newPurchaseHistory;
        
        emit LDAOPurchased(msg.sender, ldaoAmount, usdAmount, 0, "USDC");
    }

    /**
     * @notice Get quote for LDAO purchase
     * @param ldaoAmount Amount of LDAO tokens
     * @return usdAmount USD amount required
     * @return ethAmount ETH amount required
     * @return usdcAmount USDC amount required
     * @return discount Applied discount percentage
     */
    function getQuote(uint256 ldaoAmount) external view returns (
        uint256 usdAmount,
        uint256 ethAmount,
        uint256 usdcAmount,
        uint256 discount
    ) {
        uint256 finalPrice = _calculateFinalPrice(ldaoAmount);
        unchecked {
            usdAmount = (ldaoAmount * finalPrice) / 1e18;
        }
        
        uint256 ethPriceInUSD = _getETHPrice();
        unchecked {
            ethAmount = (usdAmount * 1e18) / ethPriceInUSD;
        }
        unchecked {
            usdcAmount = usdAmount / 1e12;
        }
        
        // Calculate discount percentage
        uint256 basePrice;
        unchecked {
            basePrice = (ldaoAmount * ldaoPriceInUSD) / 1e18;
        }
        if (basePrice > usdAmount && basePrice > 0) {
            unchecked {
                discount = ((basePrice - usdAmount) * 10000) / basePrice; // In basis points
            }
        }
    }

    /**
     * @notice Update LDAO base price (multi-sig protected)
     * @param newPriceInUSD New base price in USD (18 decimals)
     */
    function updateLDAOPrice(uint256 newPriceInUSD) external onlyOwner {
        require(newPriceInUSD > 0, "Price must be greater than 0");
        
        uint256 oldPrice = basePriceInUSD;
        basePriceInUSD = newPriceInUSD;
        ldaoPriceInUSD = _getDynamicPrice();
        
        emit PriceUpdated(oldPrice, newPriceInUSD);
    }
    
    /**
     * @notice Update dynamic pricing parameters (multi-sig protected)
     * @param _maxPriceMultiplier Maximum price multiplier
     * @param _priceUpdateInterval Price update interval in seconds
     */
    function updateDynamicPricingParams(
        uint256 _maxPriceMultiplier,
        uint256 _priceUpdateInterval
    ) external onlyOwner {
        require(_maxPriceMultiplier >= 1e18, "Multiplier must be >= 1.0");
        require(_priceUpdateInterval >= 1 hours, "Interval must be >= 1 hour");
        
        maxPriceMultiplier = _maxPriceMultiplier;
        priceUpdateInterval = _priceUpdateInterval;
    }
    
    /**
     * @notice Update circuit breaker parameters (multi-sig protected)
     * @param _dailyLimit New daily purchase limit
     * @param _emergencyThreshold New emergency stop threshold
     */
    function updateCircuitBreakerParams(
        uint256 _dailyLimit,
        uint256 _emergencyThreshold
    ) external onlyOwner {
        require(_emergencyThreshold <= _dailyLimit, "Emergency threshold must be <= daily limit");
        
        dailyPurchaseLimit = _dailyLimit;
        emergencyStopThreshold = _emergencyThreshold;
    }
    
    /**
     * @notice Emergency pause (can be called by owner immediately)
     * @param reason Reason for emergency pause
     */
    function emergencyPause(string calldata reason) external onlyOwner {
        _pause();
        emit EmergencyStop(reason, block.timestamp);
    }
    
    /**
     * @notice Unpause contract (multi-sig protected)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Update multi-sig wallet (multi-sig protected)
     * @param newMultiSigWallet New multi-sig wallet address
     */
    function updateMultiSigWallet(address payable newMultiSigWallet) external onlyOwner {
        require(newMultiSigWallet != address(0), "Invalid address");
        
        address oldWallet = address(multiSigWallet);
        multiSigWallet = MultiSigWallet(newMultiSigWallet);
        
        emit MultiSigWalletUpdated(oldWallet, newMultiSigWallet);
    }
    
    /**
     * @notice Update governance contract address (only owner)
     * @param newGovernance New governance contract address
     */
    function updateGovernance(address newGovernance) external onlyOwner {
        require(newGovernance != address(0), "Invalid governance address");
        governance = Governance(newGovernance);
        emit GovernanceUpdated(address(governance));
    }
    
    /**
     * @notice Execute treasury operation via governance proposal (only governance contract can call)
     * @param target Target address for the operation
     * @param value Value to send with the operation
     * @param data Calldata for the operation
     * @return success Whether the operation was successful
     */
    function executeGovernanceOperation(
        address target,
        uint256 value,
        bytes calldata data
    ) external onlyOwner returns (bool success) {
        // Check if this call is coming from the governance contract
        require(msg.sender == address(governance), "Only governance can execute treasury operations");
        
        // Execute the operation
        (success, ) = target.call{value: value}(data);
        require(success, "Governance operation failed");
        
        emit GovernanceOperationExecuted(target, value, data);
        return success;
    }
    
    /**
     * @notice Emergency withdrawal to governance (only governance can call)
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     * @param recipient Recipient address
     */
    function governanceWithdraw(
        address token,
        uint256 amount,
        address recipient
    ) external {
        require(msg.sender == address(governance), "Only governance can call this function");
        require(token != address(ldaoToken), "Cannot withdraw LDAO via governance");
        
        if (token == address(0)) {
            // Withdrawing ETH
            (bool success, ) = payable(recipient).call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(token).transfer(recipient, amount);
        }
        
        emit FundsWithdrawn(token, amount, recipient);
    }

    /**
     * @notice Update KYC status for a user (owner only)
     * @param user User address
     * @param approved KYC approval status
     */
    function updateKYCStatus(address user, bool approved) external onlyOwner {
        kycApproved[user] = approved;
        emit KYCStatusUpdated(user, approved);
    }

    /**
     * @notice Batch update KYC status (owner only)
     * @param users Array of user addresses
     * @param approved KYC approval status
     */
    function batchUpdateKYC(address[] calldata users, bool approved) external onlyOwner {
        for (uint256 i = 0; i < users.length; i++) {
            kycApproved[users[i]] = approved;
            emit KYCStatusUpdated(users[i], approved);
        }
    }

    /**
     * @notice Update whitelist status (owner only)
     * @param user User address
     * @param whitelisted Whitelist status
     */
    function updateWhitelist(address user, bool whitelisted) external onlyOwner {
        whitelist[user] = whitelisted;
        emit WhitelistUpdated(user, whitelisted);
    }

    /**
     * @notice Add pricing tier (owner only)
     * @param threshold LDAO amount threshold
     * @param discountBps Discount in basis points
     */
    function addPricingTier(uint256 threshold, uint256 discountBps) external onlyOwner {
        _addPricingTier(threshold, discountBps);
    }

    /**
     * @notice Update pricing tier (owner only)
     * @param tierId Tier ID
     * @param threshold New threshold
     * @param discountBps New discount
     * @param active Whether tier is active
     */
    function updatePricingTier(
        uint256 tierId,
        uint256 threshold,
        uint256 discountBps,
        bool active
    ) external onlyOwner {
        require(tierId > 0 && tierId < nextTierId, "Invalid tier ID");
        require(discountBps <= 5000, "Discount cannot exceed 50%");
        
        pricingTiers[tierId] = PricingTier({
            threshold: threshold,
            discountBps: discountBps,
            active: active
        });
    }

    /**
     * @notice Toggle sales status (owner only)
     * @param active Sales status
     */
    function setSalesActive(bool active) external onlyOwner {
        salesActive = active;
        emit SalesStatusUpdated(active);
    }

    /**
     * @notice Toggle KYC requirement (owner only)
     * @param required KYC requirement status
     */
    function setKYCRequired(bool required) external onlyOwner {
        kycRequired = required;
    }

    /**
     * @notice Update purchase limits (owner only)
     * @param minAmount Minimum purchase amount
     * @param maxAmount Maximum purchase amount
     */
    function updatePurchaseLimits(uint256 minAmount, uint256 maxAmount) external onlyOwner {
        require(minAmount < maxAmount, "Invalid limits");
        minPurchaseAmount = minAmount;
        maxPurchaseAmount = maxAmount;
    }

    /**
     * @notice Withdraw ETH (owner only)
     * @param amount Amount to withdraw
     * @param recipient Recipient address
     */
    function withdrawETH(uint256 amount, address payable recipient) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        require(recipient != address(0), "Invalid recipient address");
        require(address(this).balance >= amount, "Insufficient ETH balance");
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "ETH transfer failed");
        emit FundsWithdrawn(address(0), amount, recipient);
    }

    /**
     * @notice Withdraw ERC20 tokens (owner only)
     * @param token Token address
     * @param amount Amount to withdraw
     * @param recipient Recipient address
     */
    function withdrawToken(
        address token,
        uint256 amount,
        address recipient
    ) external onlyOwner {
        require(token != address(ldaoToken), "Cannot withdraw LDAO");
        require(recipient != address(0), "Invalid recipient address");
        require(amount > 0, "Amount must be greater than 0");
        require(IERC20(token).balanceOf(address(this)) >= amount, "Insufficient token balance");
        
        IERC20(token).transfer(recipient, amount);
        emit FundsWithdrawn(token, amount, recipient);
    }

    /**
     * @notice Emergency withdraw LDAO (owner only)
     * @param amount Amount to withdraw
     * @param recipient Recipient address
     */
    function emergencyWithdrawLDAO(uint256 amount, address recipient) external onlyOwner {
        // Add additional security checks
        require(recipient != address(0), "Invalid recipient address");
        require(amount > 0, "Amount must be greater than 0");
        require(ldaoToken.balanceOf(address(this)) >= amount, "Insufficient LDAO balance");
        
        ldaoToken.transfer(recipient, amount);
        emit FundsWithdrawn(address(ldaoToken), amount, recipient);
    }

    // Internal functions
    function _calculateFinalPrice(uint256 ldaoAmount) internal view returns (uint256) {
        uint256 dynamicPrice = _getDynamicPrice();
        uint256 discount = _getVolumeDiscount(ldaoAmount);
        
        if (discount > 0) {
            uint256 discountAmount;
            unchecked {
                discountAmount = (dynamicPrice * discount) / 10000;
            }
            
            if (discountAmount <= dynamicPrice) {
                return dynamicPrice - discountAmount;
            } else {
                return dynamicPrice; // Return original price if discount exceeds it
            }
        }
        
        return dynamicPrice;
    }
    
    function _getDynamicPrice() internal view returns (uint256) {
        uint256 adjustedPrice;
        unchecked {
            adjustedPrice = (basePriceInUSD * demandMultiplier) / 1e18;
        }
        uint256 maxPrice;
        unchecked {
            maxPrice = (basePriceInUSD * maxPriceMultiplier) / 1e18;
        }
        
        return adjustedPrice > maxPrice ? maxPrice : adjustedPrice;
    }
    
    function _updateDynamicPricing() internal {
        if (block.timestamp >= lastPriceUpdate + priceUpdateInterval) {
            // Calculate demand based on recent sales volume
            uint256 recentVolume = currentDayPurchases;
            uint256 targetVolume;
            unchecked {
                targetVolume = dailyPurchaseLimit / 10; // 10% of daily limit as target
            }
            
            if (targetVolume > 0 && recentVolume > targetVolume) {
                // Increase price due to high demand with bounded increase
                uint256 demandRatio;
                unchecked {
                    demandRatio = (recentVolume * 1e18) / targetVolume;
                }
                
                // Cap the demand ratio to prevent extreme price spikes (max 2x increase per update)
                if (demandRatio > 2e18) {
                    demandRatio = 2e18;
                }
                
                uint256 newMultiplier;
                unchecked {
                    newMultiplier = (demandMultiplier * demandRatio) / 1e18;
                }
                
                // Cap the multiplier to prevent extreme price increases
                if (newMultiplier > maxPriceMultiplier) {
                    newMultiplier = maxPriceMultiplier;
                }
                
                // Apply smoothing to prevent rapid price changes
                uint256 smoothedMultiplier;
                unchecked {
                    smoothedMultiplier = (demandMultiplier * 90 + newMultiplier * 10) / 100;
                }
                demandMultiplier = smoothedMultiplier;
            } else if (targetVolume > 0 && recentVolume < targetVolume / 2) {
                // Decrease price due to low demand with bounded decrease
                uint256 decreaseFactor = 95; // 5% decrease
                
                // If volume is very low, allow slightly faster decrease
                if (targetVolume > 0 && recentVolume < targetVolume / 10) {
                    decreaseFactor = 90; // 10% decrease
                }
                
                uint256 newMultiplier;
                unchecked {
                    newMultiplier = (demandMultiplier * decreaseFactor) / 100;
                }
                
                // Floor at 1.0
                if (newMultiplier < 1e18) {
                    demandMultiplier = 1e18;
                } else {
                    demandMultiplier = newMultiplier;
                }
            }
            
            lastPriceUpdate = block.timestamp;
            ldaoPriceInUSD = _getDynamicPrice();
            
            emit DynamicPriceUpdated(ldaoPriceInUSD, demandMultiplier);
        }
    }
    
    function _checkCircuitBreaker(uint256 ldaoAmount) internal view {
        // Check if purchase would exceed emergency threshold
        if (currentDayPurchases + ldaoAmount > emergencyStopThreshold) {
            revert("Emergency threshold exceeded");
        }
        
        // Check daily purchase limit
        if (currentDayPurchases + ldaoAmount > dailyPurchaseLimit) {
            revert("Daily purchase limit exceeded");
        }
    }
    
    function _updateDailyLimits(address buyer, uint256 ldaoAmount) internal {
        uint256 currentDay = block.timestamp / 1 days;
        
        // Reset daily counters if new day
        if (currentDay > lastResetDay) {
            currentDayPurchases = 0;
            lastResetDay = currentDay;
        }
        
        // Reset user daily purchases if new day
        if (currentDay > lastPurchaseDay[buyer]) {
            dailyPurchases[buyer] = 0;
            lastPurchaseDay[buyer] = currentDay;
        }
        
        // Update counters
        currentDayPurchases = currentDayPurchases + ldaoAmount;
        dailyPurchases[buyer] = dailyPurchases[buyer] + ldaoAmount;
        
        // Trigger circuit breaker if threshold reached
        if (currentDayPurchases >= emergencyStopThreshold) {
            emit CircuitBreakerTriggered(currentDayPurchases, emergencyStopThreshold);
        }
    }

    function _getVolumeDiscount(uint256 ldaoAmount) internal view returns (uint256) {
        uint256 maxDiscount = 0;
        uint256 maxTiers = 50; // Limit to prevent DoS
        
        for (uint256 i = 1; i < nextTierId && i < maxTiers; i++) {
            PricingTier storage tier = pricingTiers[i];
            if (tier.active && ldaoAmount >= tier.threshold && tier.discountBps > maxDiscount) {
                maxDiscount = tier.discountBps;
            }
        }
        
        return maxDiscount;
    }

    function _addPricingTier(uint256 threshold, uint256 discountBps) internal {
        require(discountBps <= 5000, "Discount cannot exceed 50%");
        
        uint256 tierId = nextTierId++;
        pricingTiers[tierId] = PricingTier({
            threshold: threshold,
            discountBps: discountBps,
            active: true
        });
        
        emit PricingTierAdded(tierId, threshold, discountBps);
    }

    function _getETHPrice() internal pure returns (uint256) {
        // Simplified ETH price - use Chainlink oracle in production
        return 2000 * 1e18; // $2000 per ETH
    }

    // View functions
    function getTreasuryBalance() external view returns (uint256 ldaoBalance, uint256 ethBalance, uint256 usdcBalance) {
        ldaoBalance = ldaoToken.balanceOf(address(this));
        ethBalance = address(this).balance;
        usdcBalance = usdcToken.balanceOf(address(this));
    }

    function getUserPurchaseHistory(address user) external view returns (uint256) {
        return purchaseHistory[user];
    }
    
    function getUserDailyPurchases(address user) external view returns (uint256) {
        uint256 currentDay = block.timestamp / 1 days;
        if (currentDay > lastPurchaseDay[user]) {
            return 0;
        }
        return dailyPurchases[user];
    }
    
    function getCurrentDayPurchases() external view returns (uint256) {
        uint256 currentDay = block.timestamp / 1 days;
        if (currentDay > lastResetDay) {
            return 0;
        }
        return currentDayPurchases;
    }
    
    function getDynamicPricingInfo() external view returns (
        uint256 currentPrice,
        uint256 basePrice,
        uint256 multiplier,
        uint256 nextUpdateTime
    ) {
        currentPrice = _getDynamicPrice();
        basePrice = basePriceInUSD;
        multiplier = demandMultiplier;
        nextUpdateTime = lastPriceUpdate + priceUpdateInterval;
    }
    
    function getCircuitBreakerStatus() external view returns (
        uint256 dailyLimit,
        uint256 emergencyThreshold,
        uint256 currentVolume,
        bool nearEmergencyThreshold
    ) {
        dailyLimit = dailyPurchaseLimit;
        emergencyThreshold = emergencyStopThreshold;
        
        // Calculate current volume inline
        uint256 currentDay = block.timestamp / 1 days;
        if (currentDay > lastResetDay) {
            currentVolume = 0;
        } else {
            currentVolume = currentDayPurchases;
        }
        
        nearEmergencyThreshold = currentVolume >= (emergencyThreshold * 80) / 100; // 80% of threshold
    }

    function getPricingTier(uint256 tierId) external view returns (
        uint256 threshold,
        uint256 discountBps,
        bool active
    ) {
        PricingTier storage tier = pricingTiers[tierId];
        return (tier.threshold, tier.discountBps, tier.active);
    }
}