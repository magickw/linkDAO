// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
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
    AggregatorV3Interface public immutable ethUsdPriceFeed; // Chainlink ETH/USD price feed
    
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
    
    // Timelock for critical operations
    struct TimelockRequest {
        address target;
        uint256 value;
        bytes data;
        uint256 timestamp;
        uint256 delay;
        bool executed;
        string operationType;
    }
    
    mapping(bytes32 => TimelockRequest) public timelockRequests;
    uint256 public constant TIMELOCK_DELAY = 48 hours; // 48 hour delay for critical operations
    uint256 public constant EMERGENCY_TIMELOCK_DELAY = 24 hours; // 24 hour delay for emergencies
    
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
    
    // Charity governance structures
    struct CharityVerificationProposal {
        uint256 proposalId;
        address charityAddress;
        string name;
        string description;
        string ipfsHash; // Documentation
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        bool passed;
        mapping(address => bool) hasVoted;
    }
    
    struct CharityDisbursementProposal {
        uint256 proposalId;
        address recipient;
        uint256 amount;
        string description;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        bool passed;
        mapping(address => bool) hasVoted;
    }
    
    // Governance mappings
    mapping(uint256 => CharityVerificationProposal) public charityVerificationProposals;
    mapping(uint256 => CharityDisbursementProposal) public charityDisbursementProposals;
    mapping(address => uint256) public charityVotes; // Track voting power for charity proposals
    uint256 public nextCharityProposalId = 1;
    
    // Governance parameters
    uint256 public charityVotingPeriod = 7 days;
    uint256 public charityQuorum = 1000000 * 1e18; // 1M LDAO tokens quorum
    uint256 public charityApprovalThreshold = 51; // 51% approval required
    uint256 public minCharityVerificationStake = 10000 * 1e18; // 10k LDAO min to propose
    uint256 public maxCharityDisbursement = 100000 * 1e18; // 100k LDAO max per proposal
    uint256 public dailyCharityDisbursementLimit = 500000 * 1e18; // 500k LDAO daily limit
    uint256 public currentDayCharityDisbursements;
    uint256 public lastCharityDisbursementDay;
    
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
    
    // Timelock events
    event TimelockRequestCreated(
        bytes32 indexed requestId,
        address indexed target,
        string operationType,
        uint256 executableTime
    );
    event TimelockRequestExecuted(bytes32 indexed requestId);
    event TimelockRequestCancelled(bytes32 indexed requestId);
    
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
    
    // Charity governance events
    event CharityVerificationProposalCreated(
        uint256 indexed proposalId,
        address indexed charityAddress,
        string name,
        uint256 endTime
    );
    event CharityVerificationVoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 votingPower
    );
    event CharityVerificationProposalExecuted(
        uint256 indexed proposalId,
        bool passed,
        uint256 votesFor,
        uint256 votesAgainst
    );
    event CharityDisbursementProposalCreated(
        uint256 indexed proposalId,
        address indexed recipient,
        uint256 amount,
        uint256 endTime
    );
    event CharityDisbursementVoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 votingPower
    );
    event CharityDisbursementProposalExecuted(
        uint256 indexed proposalId,
        bool passed,
        uint256 votesFor,
        uint256 votesAgainst
    );

    constructor(
        address _ldaoToken,
        address _usdcToken,
        address payable _multiSigWallet,
        address _governance,
        address _ethUsdPriceFeed
    ) Ownable(msg.sender) {
        ldaoToken = LDAOToken(_ldaoToken);
        usdcToken = IERC20(_usdcToken);
        multiSigWallet = MultiSigWallet(_multiSigWallet);
        governance = Governance(_governance);
        ethUsdPriceFeed = AggregatorV3Interface(_ethUsdPriceFeed);
        
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
     * @notice Emergency withdraw LDAO (requires timelock)
     * @param amount Amount to withdraw
     * @param recipient Recipient address
     */
    function emergencyWithdrawLDAO(uint256 amount, address recipient) external onlyOwner {
        // Create timelock request for emergency withdrawal
        bytes32 requestId = keccak256(abi.encodePacked(
            block.timestamp,
            "EMERGENCY_WITHDRAW",
            amount,
            recipient
        ));
        
        require(timelockRequests[requestId].timestamp == 0, "Request already exists");
        
        timelockRequests[requestId] = TimelockRequest({
            target: address(ldaoToken),
            value: 0,
            data: abi.encodeWithSignature("transfer(address,uint256)", recipient, amount),
            timestamp: block.timestamp,
            delay: EMERGENCY_TIMELOCK_DELAY,
            executed: false,
            operationType: "EMERGENCY_WITHDRAW"
        });
        
        emit TimelockRequestCreated(
            requestId,
            address(ldaoToken),
            "EMERGENCY_WITHDRAW",
            block.timestamp + EMERGENCY_TIMELOCK_DELAY
        );
    }

    /**
     * @notice Execute a timelocked request
     * @param requestId The ID of the request to execute
     */
    function executeTimelockRequest(bytes32 requestId) external onlyOwner {
        TimelockRequest storage request = timelockRequests[requestId];
        require(request.timestamp > 0, "Request does not exist");
        require(!request.executed, "Request already executed");
        require(block.timestamp >= request.timestamp + request.delay, "Timelock not expired");
        
        request.executed = true;
        
        // Execute the call
        (bool success, ) = request.target.call{value: request.value}(request.data);
        require(success, "Execution failed");
        
        emit TimelockRequestExecuted(requestId);
    }

    /**
     * @notice Cancel a timelocked request
     * @param requestId The ID of the request to cancel
     */
    function cancelTimelockRequest(bytes32 requestId) external onlyOwner {
        TimelockRequest storage request = timelockRequests[requestId];
        require(request.timestamp > 0, "Request does not exist");
        require(!request.executed, "Request already executed");
        
        request.executed = true; // Mark as executed to prevent reuse
        
        emit TimelockRequestCancelled(requestId);
    }

    /**
     * @notice Check if a timelock request is ready to execute
     * @param requestId The ID of the request
     * @return ready Whether the request is ready to execute
     */
    function isTimelockReady(bytes32 requestId) external view returns (bool ready) {
        TimelockRequest storage request = timelockRequests[requestId];
        if (request.timestamp == 0 || request.executed) {
            return false;
        }
        return block.timestamp >= request.timestamp + request.delay;
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

    function _getETHPrice() internal view returns (uint256) {
        // Get latest price data from Chainlink oracle
        (, int256 price, , , ) = ethUsdPriceFeed.latestRoundData();
        
        // Chainlink ETH/USD price feed has 8 decimals
        // Convert to 18 decimals for consistency
        require(price > 0, "Invalid ETH price");
        return uint256(price) * 1e10;
    }

    // View functions
    function getTreasuryBalance() external view returns (uint256 ldaoBalance, uint256 ethBalance, uint256 usdcBalance) {
        ldaoBalance = ldaoToken.balanceOf(address(this));
        ethBalance = address(this).balance;
        usdcBalance = usdcToken.balanceOf(address(this));
    }

    /**
     * @notice Get current ETH price from oracle
     * @return ethPrice Current ETH price in USD (18 decimals)
     */
    function getETHPrice() external view returns (uint256 ethPrice) {
        return _getETHPrice();
    }

    /**
     * @notice Update ETH/USD price feed (owner only)
     * @param newPriceFeed Address of the new price feed contract
     */
    function updateEthUsdPriceFeed(address newPriceFeed) external onlyOwner {
        require(newPriceFeed != address(0), "Invalid price feed address");
        // Note: Since ethUsdPriceFeed is immutable, this would need to be implemented
        // via a proxy pattern in production. For now, this is a placeholder.
        // In a real upgrade scenario, deploy a new contract with the new price feed.
        revert("Use proxy upgrade to change price feed");
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
    
    // Charity-specific functions
    
    /**
     * @notice Direct disbursement to verified charity (with limits)
     * @param recipient Address of the charity recipient
     * @param amount Amount of LDAO tokens to disburse
     * @param description Description of the donation
     * @return donationId ID of the created donation record
     */
    function disburseCharityFunds(
        address recipient,
        uint256 amount,
        string calldata description
    ) external nonReentrant returns (uint256) {
        require(recipient != address(0), "Invalid recipient address");
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= maxCharityDisbursement, "Amount exceeds maximum limit");
        require(verifiedCharities[recipient], "Recipient must be a verified charity");
        require(amount >= minCharityDonationAmount, "Amount below minimum charity donation");
        
        // Check daily limit
        _checkDailyCharityLimit(amount);
        
        // Check that the treasury has sufficient balance
        require(ldaoToken.balanceOf(address(this)) >= amount, "Insufficient treasury balance");
        
        // Multi-sig check for charity disbursements
        bytes32 transactionHash = keccak256(abi.encodePacked(
            "CHARITY_DONATION",
            recipient,
            amount,
            block.timestamp
        ));
        
        require(!executedTransactions[transactionHash], "Transaction already executed");
        executedTransactions[transactionHash] = true;
        
        uint256 donationId = nextCharityDonationId++;
        
        // Create donation record
        CharityDonation storage newDonation = charityDonations[donationId];
        newDonation.id = donationId;
        newDonation.recipient = recipient;
        newDonation.amount = amount;
        newDonation.timestamp = block.timestamp;
        newDonation.description = description;
        newDonation.proposalId = 0; // Direct disbursement
        newDonation.isVerified = false;
        newDonation.verificationReceipt = "";
        
        // Transfer tokens to recipient
        require(
            ldaoToken.transfer(recipient, amount),
            "LDAO transfer failed"
        );
        
        // Update charity fund stats
        charityFund.totalDisbursed = charityFund.totalDisbursed + amount;
        if (charityFund.availableBalance >= amount) {
            charityFund.availableBalance = charityFund.availableBalance - amount;
        }
        
        // Update recipient's donation history
        charityDonationsHistory[recipient].push(donationId);
        
        emit CharityDisbursement(donationId, recipient, amount, 0, description);
        
        return donationId;
    }
    
    /**
     * @notice Create a proposal for charity disbursement (governance)
     * @param recipient Address of the charity recipient
     * @param amount Amount of LDAO tokens to disburse
     * @param description Description of the donation
     * @return proposalId ID of the created proposal
     */
    function proposeCharityDisbursement(
        address recipient,
        uint256 amount,
        string calldata description
    ) external returns (uint256) {
        require(recipient != address(0), "Invalid recipient address");
        require(amount > 0 && amount <= maxCharityDisbursement * 2, "Invalid amount");
        require(verifiedCharities[recipient], "Recipient must be a verified charity");
        require(ldaoToken.balanceOf(address(this)) >= amount, "Insufficient treasury balance");
        
        uint256 proposalId = nextCharityProposalId++;
        
        CharityDisbursementProposal storage proposal = charityDisbursementProposals[proposalId];
        proposal.proposalId = proposalId;
        proposal.recipient = recipient;
        proposal.amount = amount;
        proposal.description = description;
        proposal.startTime = block.timestamp;
        proposal.endTime = block.timestamp + charityVotingPeriod;
        
        emit CharityDisbursementProposalCreated(proposalId, recipient, amount, proposal.endTime);
        
        return proposalId;
    }
    
    /**
     * @notice Vote on a charity disbursement proposal
     * @param proposalId ID of the proposal
     * @param support Whether to support the proposal
     */
    function voteCharityDisbursement(uint256 proposalId, bool support) external {
        CharityDisbursementProposal storage proposal = charityDisbursementProposals[proposalId];
        require(proposal.proposalId != 0, "Proposal does not exist");
        require(block.timestamp < proposal.endTime, "Voting period ended");
        require(!proposal.executed, "Proposal already executed");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        
        uint256 votingPower = ldaoToken.balanceOf(msg.sender);
        require(votingPower > 0, "No voting power");
        
        proposal.hasVoted[msg.sender] = true;
        
        if (support) {
            proposal.votesFor += votingPower;
        } else {
            proposal.votesAgainst += votingPower;
        }
        
        emit CharityDisbursementVoteCast(proposalId, msg.sender, support, votingPower);
    }
    
    /**
     * @notice Execute a charity disbursement proposal after voting ends
     * @param proposalId ID of the proposal
     */
    function executeCharityDisbursement(uint256 proposalId) external nonReentrant {
        CharityDisbursementProposal storage proposal = charityDisbursementProposals[proposalId];
        require(proposal.proposalId != 0, "Proposal does not exist");
        require(block.timestamp >= proposal.endTime, "Voting period not ended");
        require(!proposal.executed, "Proposal already executed");
        
        uint256 totalVotes = proposal.votesFor + proposal.votesAgainst;
        require(totalVotes >= charityQuorum, "Quorum not reached");
        
        bool passed = (proposal.votesFor * 100) / totalVotes >= charityApprovalThreshold;
        proposal.passed = passed;
        proposal.executed = true;
        
        if (passed) {
            // Check daily limit
            _checkDailyCharityLimit(proposal.amount);
            
            uint256 donationId = nextCharityDonationId++;
            
            // Create donation record
            CharityDonation storage newDonation = charityDonations[donationId];
            newDonation.id = donationId;
            newDonation.recipient = proposal.recipient;
            newDonation.amount = proposal.amount;
            newDonation.timestamp = block.timestamp;
            newDonation.description = proposal.description;
            newDonation.proposalId = proposalId;
            newDonation.isVerified = false;
            newDonation.verificationReceipt = "";
            
            // Transfer tokens
            require(
                ldaoToken.transfer(proposal.recipient, proposal.amount),
                "LDAO transfer failed"
            );
            
            // Update stats
            charityFund.totalDisbursed = charityFund.totalDisbursed + proposal.amount;
            if (charityFund.availableBalance >= proposal.amount) {
                charityFund.availableBalance = charityFund.availableBalance - proposal.amount;
            }
            
            charityDonationsHistory[proposal.recipient].push(donationId);
            
            emit CharityDisbursement(donationId, proposal.recipient, proposal.amount, proposalId, proposal.description);
        }
        
        emit CharityDisbursementProposalExecuted(proposalId, passed, proposal.votesFor, proposal.votesAgainst);
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
     * @notice Create a proposal to verify a charity address (governance)
     * @param charityAddress Address of the charity to verify
     * @param name Name of the charity
     * @param description Description of the charity
     * @param ipfsHash IPFS hash of charity documentation
     * @return proposalId ID of the created proposal
     */
    function proposeCharityVerification(
        address charityAddress,
        string calldata name,
        string calldata description,
        string calldata ipfsHash
    ) external returns (uint256) {
        require(charityAddress != address(0), "Invalid charity address");
        require(bytes(name).length > 0, "Name required");
        require(bytes(description).length > 0, "Description required");
        require(ldaoToken.balanceOf(msg.sender) >= minCharityVerificationStake, "Insufficient stake to propose");
        
        uint256 proposalId = nextCharityProposalId++;
        
        CharityVerificationProposal storage proposal = charityVerificationProposals[proposalId];
        proposal.proposalId = proposalId;
        proposal.charityAddress = charityAddress;
        proposal.name = name;
        proposal.description = description;
        proposal.ipfsHash = ipfsHash;
        proposal.startTime = block.timestamp;
        proposal.endTime = block.timestamp + charityVotingPeriod;
        
        emit CharityVerificationProposalCreated(proposalId, charityAddress, name, proposal.endTime);
        
        return proposalId;
    }
    
    /**
     * @notice Vote on a charity verification proposal
     * @param proposalId ID of the proposal
     * @param support Whether to support the proposal
     */
    function voteCharityVerification(uint256 proposalId, bool support) external {
        CharityVerificationProposal storage proposal = charityVerificationProposals[proposalId];
        require(proposal.proposalId != 0, "Proposal does not exist");
        require(block.timestamp < proposal.endTime, "Voting period ended");
        require(!proposal.executed, "Proposal already executed");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        
        uint256 votingPower = ldaoToken.balanceOf(msg.sender);
        require(votingPower > 0, "No voting power");
        
        proposal.hasVoted[msg.sender] = true;
        
        if (support) {
            proposal.votesFor += votingPower;
        } else {
            proposal.votesAgainst += votingPower;
        }
        
        emit CharityVerificationVoteCast(proposalId, msg.sender, support, votingPower);
    }
    
    /**
     * @notice Execute a charity verification proposal after voting ends
     * @param proposalId ID of the proposal
     */
    function executeCharityVerification(uint256 proposalId) external {
        CharityVerificationProposal storage proposal = charityVerificationProposals[proposalId];
        require(proposal.proposalId != 0, "Proposal does not exist");
        require(block.timestamp >= proposal.endTime, "Voting period not ended");
        require(!proposal.executed, "Proposal already executed");
        
        uint256 totalVotes = proposal.votesFor + proposal.votesAgainst;
        require(totalVotes >= charityQuorum, "Quorum not reached");
        
        bool passed = (proposal.votesFor * 100) / totalVotes >= charityApprovalThreshold;
        proposal.passed = passed;
        proposal.executed = true;
        
        if (passed && !verifiedCharities[proposal.charityAddress]) {
            verifiedCharities[proposal.charityAddress] = true;
            charityFund.charityCount = charityFund.charityCount + 1;
            emit CharityVerified(proposal.charityAddress, true);
        } else if (!passed && verifiedCharities[proposal.charityAddress]) {
            // Only unverify if proposal explicitly rejects and had enough votes
            verifiedCharities[proposal.charityAddress] = false;
            if (charityFund.charityCount > 0) {
                charityFund.charityCount = charityFund.charityCount - 1;
            }
            emit CharityVerified(proposal.charityAddress, false);
        }
        
        emit CharityVerificationProposalExecuted(proposalId, passed, proposal.votesFor, proposal.votesAgainst);
    }
    
    /**
     * @notice Legacy function - only owner can verify in emergency (time-locked)
     * @param charityAddress Address of the charity
     * @param verify Whether to verify or unverify
     */
    function verifyCharity(address charityAddress, bool verify) external onlyOwner {
        require(block.timestamp > (lastCharityDisbursementDay + 90 days), "Emergency verification time-locked");
        require(charityAddress != address(0), "Invalid charity address");
        
        verifiedCharities[charityAddress] = verify;
        if (verify && !verifiedCharities[charityAddress]) {
            charityFund.charityCount = charityFund.charityCount + 1;
        } else if (!verify && charityFund.charityCount > 0) {
            charityFund.charityCount = charityFund.charityCount - 1;
        }
        
        emit CharityVerified(charityAddress, verify);
    }
    
    /**
     * @notice Get charity donation details
     * @param donationId ID of the donation
     * @return donation Charity donation details
     */
    function getCharityDonation(uint256 donationId) external view returns (CharityDonation memory) {
        require(donationId > 0 && donationId < nextCharityDonationId, "Invalid donation ID");
        return charityDonations[donationId];
    }
    
    /**
     * @notice Get charity donations history for an address
     * @param charityAddress Address of the charity
     * @return donationIds Array of donation IDs
     */
    function getCharityDonationsHistory(address charityAddress) external view returns (uint256[] memory) {
        return charityDonationsHistory[charityAddress];
    }
    
    /**
     * @notice Get charity fund information
     * @return totalDisbursed Total amount disbursed
     * @return totalReceived Total amount received
     * @return availableBalance Available balance for donations
     * @return charityCount Number of verified charities
     */
    function getCharityFund() external view returns (
        uint256 totalDisbursed,
        uint256 totalReceived,
        uint256 availableBalance,
        uint256 charityCount
    ) {
        return (
            charityFund.totalDisbursed,
            charityFund.totalReceived,
            charityFund.availableBalance,
            charityFund.charityCount
        );
    }
    
    /**
     * @notice Check if an address is a verified charity
     * @param charityAddress Address to check
     * @return isVerified Whether the address is verified
     */
    function isCharityVerified(address charityAddress) external view returns (bool) {
        return verifiedCharities[charityAddress];
    }
    
    /**
     * @notice Update charity fund allocation (with safeguards)
     * @param newAllocation New allocation amount
     */
    function updateCharityFundAllocation(uint256 newAllocation) external onlyOwner {
        uint256 totalSupply = ldaoToken.totalSupply();
        require(newAllocation <= totalSupply / 10, "Allocation cannot exceed 10% of total supply"); // Max 10%
        require(newAllocation >= charityFundAllocation / 2, "Cannot reduce by more than 50%");
        
        charityFundAllocation = newAllocation;
        charityFund.availableBalance = newAllocation; // Update available balance
        
        emit CharityFundUpdated(newAllocation, newAllocation);
    }
    
    /**
     * @notice Update charity governance parameters
     * @param _votingPeriod New voting period in seconds
     * @param _quorum New quorum amount
     * @param _approvalThreshold New approval threshold (percentage)
     */
    function updateCharityGovernanceParams(
        uint256 _votingPeriod,
        uint256 _quorum,
        uint256 _approvalThreshold
    ) external onlyOwner {
        require(_votingPeriod >= 1 days && _votingPeriod <= 30 days, "Invalid voting period");
        require(_approvalThreshold >= 51 && _approvalThreshold <= 90, "Invalid threshold");
        
        charityVotingPeriod = _votingPeriod;
        charityQuorum = _quorum;
        charityApprovalThreshold = _approvalThreshold;
    }
    
    // Internal helper function
    function _checkDailyCharityLimit(uint256 amount) internal {
        uint256 currentDay = block.timestamp / 1 days;
        
        if (currentDay > lastCharityDisbursementDay) {
            currentDayCharityDisbursements = 0;
            lastCharityDisbursementDay = currentDay;
        }
        
        require(
            currentDayCharityDisbursements + amount <= dailyCharityDisbursementLimit,
            "Daily charity limit exceeded"
        );
        
        currentDayCharityDisbursements += amount;
    }
    
    /**
     * @notice Update minimum charity donation amount
     * @param newMinimum New minimum amount
     */
    function updateMinCharityDonationAmount(uint256 newMinimum) external onlyOwner {
        minCharityDonationAmount = newMinimum;
    }
}