// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./LDAOToken.sol";

contract EnhancedLDAOTreasury is Ownable, ReentrancyGuard, Pausable {
    LDAOToken public ldaoToken;
    IERC20 public usdcToken;
    
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
    
    // Pricing tiers based on volume
    struct PricingTier {
        uint256 threshold; // LDAO amount threshold
        uint256 discountBps; // Discount in basis points (100 = 1%)
        bool active;
    }
    
    mapping(uint256 => PricingTier) public pricingTiers;
    uint256 public nextTierId = 1;
    
    // Charity-specific structures
    struct CharityDonation {
        uint256 id;
        address recipient;
        uint256 amount;
        uint256 timestamp;
        string description;
        uint256 proposalId; // Link to governance proposal
        bool isVerified;
        string verificationReceipt; // IPFS hash of receipt
    }
    
    struct CharityFund {
        uint256 totalDisbursed;
        uint256 totalReceived;
        uint256 availableBalance; // For future donations
        uint256 charityCount;
    }
    
    // Charity mappings and counters
    mapping(uint256 => CharityDonation) public charityDonations;
    mapping(address => bool) public verifiedCharities;
    mapping(address => uint256[]) public charityDonationsHistory;
    uint256 public nextCharityDonationId = 1;
    CharityFund public charityFund;
    
    // Charity-specific parameters
    uint256 public minCharityDonationAmount = 100 * 1e18; // 100 LDAO minimum for charity donations
    uint256 public charityFundAllocation = 0; // Amount allocated for charity disbursements
    
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
    
    // Charity-specific events
    event CharityDisbursement(
        uint256 indexed donationId,
        address indexed recipient,
        uint256 amount,
        uint256 proposalId,
        string description
    );
    event CharityFundUpdated(uint256 newAllocation, uint256 availableBalance);
    event CharityVerified(address indexed charityAddress, bool verified);
    event CharityDonationVerified(uint256 indexed donationId, string receiptHash);

    constructor(
        address _ldaoToken,
        address _usdcToken
    ) Ownable(msg.sender) {
        ldaoToken = LDAOToken(_ldaoToken);
        usdcToken = IERC20(_usdcToken);
        
        // Initialize timestamps
        lastResetDay = block.timestamp / 1 days;
        lastPriceUpdate = block.timestamp;
        
        // Initialize default pricing tiers
        _addPricingTier(100000 * 1e18, 500); // 100k LDAO: 5% discount
        _addPricingTier(500000 * 1e18, 1000); // 500k LDAO: 10% discount
        _addPricingTier(1000000 * 1e18, 1500); // 1M LDAO: 15% discount
    }

    /**
     * @notice Disburse funds to a charity recipient
     * @param recipient Address of the charity recipient
     * @param amount Amount of LDAO tokens to disburse
     * @param description Description of the donation
     * @param proposalId ID of the governance proposal that approved this donation
     * @return donationId ID of the created donation record
     */
    function disburseCharityFunds(
        address recipient,
        uint256 amount,
        string calldata description,
        uint256 proposalId
    ) external nonReentrant returns (uint256) {
        require(recipient != address(0), "Invalid recipient address");
        require(amount > 0, "Amount must be greater than 0");
        require(verifiedCharities[recipient], "Recipient must be a verified charity");
        require(amount >= minCharityDonationAmount, "Amount below minimum charity donation");
        
        // Check that the treasury has sufficient balance
        require(ldaoToken.balanceOf(address(this)) >= amount, "Insufficient treasury balance");
        
        uint256 donationId = nextCharityDonationId++;
        
        // Create donation record
        CharityDonation storage newDonation = charityDonations[donationId];
        newDonation.id = donationId;
        newDonation.recipient = recipient;
        newDonation.amount = amount;
        newDonation.timestamp = block.timestamp;
        newDonation.description = description;
        newDonation.proposalId = proposalId;
        newDonation.isVerified = false;
        newDonation.verificationReceipt = "";
        
        // Transfer tokens to recipient
        require(
            ldaoToken.transfer(recipient, amount),
            "LDAO transfer failed"
        );
        
        // Update charity fund stats
        charityFund.totalDisbursed = charityFund.totalDisbursed + amount;
        charityFund.availableBalance = charityFund.availableBalance - amount;
        
        // Update recipient's donation history
        charityDonationsHistory[recipient].push(donationId);
        
        emit CharityDisbursement(donationId, recipient, amount, proposalId, description);
        
        return donationId;
    }
    
    /**
     * @notice Verify that a charity received their donation
     * @param donationId ID of the donation to verify
     * @param receiptHash IPFS hash of the donation receipt
     */
    function verifyCharityDonation(
        uint256 donationId,
        string calldata receiptHash
    ) external onlyOwner {
        require(donationId > 0 && donationId < nextCharityDonationId, "Invalid donation ID");
        require(bytes(receiptHash).length > 0, "Receipt hash required");
        
        CharityDonation storage donation = charityDonations[donationId];
        require(!donation.isVerified, "Donation already verified");
        
        donation.isVerified = true;
        donation.verificationReceipt = receiptHash;
        
        emit CharityDonationVerified(donationId, receiptHash);
    }
    
    /**
     * @notice Verify a charity address for donations
     * @param charityAddress Address of the charity to verify
     * @param verify Whether to verify or unverify the charity
     */
    function verifyCharity(address charityAddress, bool verify) external onlyOwner {
        require(charityAddress != address(0), "Invalid charity address");
        
        verifiedCharities[charityAddress] = verify;
        if (verify) {
            charityFund.charityCount = charityFund.charityCount + 1;
        }
        
        emit CharityVerified(charityAddress, verify);
    }

    /**
     * @notice Purchase LDAO tokens with ETH
     * @param ldaoAmount Amount of LDAO tokens to purchase
     */
    function purchaseWithETH(uint256 ldaoAmount) external payable nonReentrant {
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
        uint256 usdAmount = (ldaoAmount * finalPrice) / 1e18;
        
        // Get ETH price from oracle (simplified - use Chainlink in production)
        uint256 ethPriceInUSD = _getETHPrice();
        uint256 requiredETH = (usdAmount * 1e18) / ethPriceInUSD;
        
        require(msg.value >= requiredETH, "Insufficient ETH sent");
        
        // Transfer LDAO tokens
        require(
            ldaoToken.transfer(msg.sender, ldaoAmount),
            "LDAO transfer failed"
        );
        
        // Update statistics
        totalSold += ldaoAmount;
        totalRevenue += usdAmount;
        purchaseHistory[msg.sender] += ldaoAmount;
        
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
    function purchaseWithUSDC(uint256 ldaoAmount) external nonReentrant {
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
        uint256 usdAmount = (ldaoAmount * finalPrice) / 1e18;
        
        // Convert to USDC amount (6 decimals)
        uint256 usdcAmount = usdAmount / 1e12;
        
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
        
        // Update statistics
        totalSold += ldaoAmount;
        totalRevenue += usdAmount;
        purchaseHistory[msg.sender] += ldaoAmount;
        
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
        usdAmount = (ldaoAmount * finalPrice) / 1e18;
        
        uint256 ethPriceInUSD = _getETHPrice();
        ethAmount = (usdAmount * 1e18) / ethPriceInUSD;
        usdcAmount = usdAmount / 1e12;
        
        // Calculate discount percentage
        uint256 basePrice = (ldaoAmount * ldaoPriceInUSD) / 1e18;
        if (basePrice > usdAmount) {
            discount = ((basePrice - usdAmount) * 10000) / basePrice; // In basis points
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
        require(amount <= address(this).balance, "Insufficient balance");
        recipient.transfer(amount);
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
        IERC20(token).transfer(recipient, amount);
        emit FundsWithdrawn(token, amount, recipient);
    }

    /**
     * @notice Emergency withdraw LDAO (owner only)
     * @param amount Amount to withdraw
     * @param recipient Recipient address
     */
    function emergencyWithdrawLDAO(uint256 amount, address recipient) external onlyOwner {
        ldaoToken.transfer(recipient, amount);
        emit FundsWithdrawn(address(ldaoToken), amount, recipient);
    }

    // Internal functions
    function _calculateFinalPrice(uint256 ldaoAmount) internal view returns (uint256) {
        uint256 dynamicPrice = _getDynamicPrice();
        uint256 discount = _getVolumeDiscount(ldaoAmount);
        
        if (discount > 0) {
            uint256 discountAmount = (dynamicPrice * discount) / 10000;
            return dynamicPrice - discountAmount;
        }
        
        return dynamicPrice;
    }
    
    function _getDynamicPrice() internal view returns (uint256) {
        uint256 adjustedPrice = (basePriceInUSD * demandMultiplier) / 1e18;
        uint256 maxPrice = (basePriceInUSD * maxPriceMultiplier) / 1e18;
        
        return adjustedPrice > maxPrice ? maxPrice : adjustedPrice;
    }
    
    function _updateDynamicPricing() internal {
        if (block.timestamp >= lastPriceUpdate + priceUpdateInterval) {
            // Calculate demand based on recent sales volume
            uint256 recentVolume = currentDayPurchases;
            uint256 targetVolume = dailyPurchaseLimit / 10; // 10% of daily limit as target
            
            if (recentVolume > targetVolume) {
                // Increase price due to high demand
                uint256 demandRatio = (recentVolume * 1e18) / targetVolume;
        demandMultiplier = (demandMultiplier * demandRatio) / 1e18;
                
                // Cap the multiplier
                if (demandMultiplier > maxPriceMultiplier) {
                    demandMultiplier = maxPriceMultiplier;
                }
            } else if (recentVolume < targetVolume / 2) {
                // Decrease price due to low demand
                demandMultiplier = (demandMultiplier * 95) / 100; // 5% decrease
                
                // Floor at 1.0
                if (demandMultiplier < 1e18) {
                    demandMultiplier = 1e18;
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
        
        for (uint256 i = 1; i < nextTierId; i++) {
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
    
    // Charity-specific view functions
    function getCharityDonation(uint256 donationId) external view returns (CharityDonation memory) {
        return charityDonations[donationId];
    }
    
    function getCharityDonationsHistory(address charityAddress) external view returns (uint256[] memory) {
        return charityDonationsHistory[charityAddress];
    }
    
    function getCharityFund() external view returns (uint256, uint256, uint256, uint256) {
        return (
            charityFund.totalDisbursed,
            charityFund.totalReceived,
            charityFund.availableBalance,
            charityFund.charityCount
        );
    }
    
    function isCharityVerified(address charityAddress) external view returns (bool) {
        return verifiedCharities[charityAddress];
    }
    
    // Function to update charity fund allocation
    function updateCharityFundAllocation(uint256 newAllocation) external onlyOwner {
        charityFundAllocation = newAllocation;
        charityFund.availableBalance = newAllocation; // Update available balance
        
        emit CharityFundUpdated(newAllocation, newAllocation);
    }
}