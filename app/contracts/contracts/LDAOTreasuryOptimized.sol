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
 * @title LDAOTreasuryOptimized
 * @notice Optimized Treasury contract for LDAO token sales (<24KB)
 * @dev Split core functionality from charity governance to reduce size
 */
contract LDAOTreasuryOptimized is Ownable, ReentrancyGuard, Pausable {
    // State variables - Optimized storage layout
    LDAOToken public immutable ldaoToken;
    IERC20 public immutable usdcToken;
    MultiSigWallet public immutable multiSigWallet;
    Governance public immutable governance;
    AggregatorV3Interface public immutable ethUsdPriceFeed;
    
    // Packed storage for efficiency
    struct PurchaseLimits {
        uint128 maxPurchase;
        uint128 minPurchase;
        uint128 dailyLimit;
        uint128 emergencyThreshold;
    }
    
    struct PricingParams {
        uint128 basePrice;
        uint128 maxMultiplier;
        uint32 priceUpdateInterval;
        uint32 lastPriceUpdate;
    }
    
    // Core state variables
    PurchaseLimits public limits;
    PricingParams public pricing;
    uint256 public ldaoPriceInUSD = 1e16; // $0.01
    uint256 public totalSold;
    uint256 public totalRevenue;
    
    // Dynamic pricing
    uint256 public demandMultiplier = 1e18;
    
    // Circuit breaker
    uint256 public currentDayPurchases;
    uint256 public lastResetDay;
    
    // KYC and whitelist
    mapping(address => bool) public kycApproved;
    mapping(address => bool) public whitelist;
    mapping(address => uint256) public purchaseHistory;
    
    // Sales control
    bool public salesActive = true;
    bool public kycRequired = false;
    
    // Timelock for critical operations
    struct TimelockRequest {
        address target;
        uint256 value;
        bytes32 dataHash;
        uint256 timestamp;
        uint256 delay;
        bool executed;
    }
    
    mapping(bytes32 => TimelockRequest) public timelockRequests;
    uint256 public constant TIMELOCK_DELAY = 48 hours;
    uint256 public constant EMERGENCY_TIMELOCK_DELAY = 24 hours;
    
    // Events
    event LDAOPurchased(
        address indexed buyer,
        uint256 ldaoAmount,
        uint256 usdAmount,
        uint256 ethAmount,
        string paymentMethod
    );
    event PriceUpdated(uint256 oldPrice, uint256 newPrice);
    event KYCStatusUpdated(address indexed user, bool approved);
    event SalesStatusUpdated(bool active);
    event FundsWithdrawn(address indexed token, uint256 amount, address recipient);
    event TimelockRequestCreated(bytes32 indexed requestId, uint256 executableTime);
    event TimelockRequestExecuted(bytes32 indexed requestId);
    
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
        
        // Initialize limits
        limits = PurchaseLimits({
            maxPurchase: uint128(1000000 * 1e18), // 1M LDAO
            minPurchase: uint128(10 * 1e18),       // 10 LDAO
            dailyLimit: uint128(10000000 * 1e18), // 10M LDAO
            emergencyThreshold: uint128(5000000 * 1e18) // 5M LDAO
        });
        
        // Initialize pricing
        pricing = PricingParams({
            basePrice: uint128(1e16),           // $0.01
            maxMultiplier: uint128(5e18),       // 5x
            priceUpdateInterval: uint32(1 hours),
            lastPriceUpdate: uint32(block.timestamp)
        });
        
        lastResetDay = block.timestamp / 1 days;
    }
    
    /**
     * @notice Purchase LDAO tokens with ETH
     */
    function purchaseWithETH(uint256 ldaoAmount) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
    {
        require(salesActive, "Sales not active");
        require(ldaoAmount >= limits.minPurchase, "Below minimum");
        require(ldaoAmount <= limits.maxPurchase, "Exceeds maximum");
        
        _checkCircuitBreaker(ldaoAmount);
        _updateDailyLimits(msg.sender, ldaoAmount);
        
        if (kycRequired) {
            require(kycApproved[msg.sender], "KYC required");
        }
        
        uint256 finalPrice = _calculatePrice(ldaoAmount);
        uint256 usdAmount = (ldaoAmount * finalPrice) / 1e18;
        uint256 ethPrice = _getETHPrice();
        uint256 requiredETH = (usdAmount * 1e18) / ethPrice;
        
        require(msg.value >= requiredETH, "Insufficient ETH");
        
        require(
            ldaoToken.transfer(msg.sender, ldaoAmount),
            "Transfer failed"
        );
        
        totalSold += ldaoAmount;
        totalRevenue += usdAmount;
        purchaseHistory[msg.sender] += ldaoAmount;
        
        if (msg.value > requiredETH) {
            payable(msg.sender).transfer(msg.value - requiredETH);
        }
        
        emit LDAOPurchased(msg.sender, ldaoAmount, usdAmount, requiredETH, "ETH");
    }
    
    /**
     * @notice Purchase LDAO tokens with USDC
     */
    function purchaseWithUSDC(uint256 ldaoAmount) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        require(salesActive, "Sales not active");
        require(ldaoAmount >= limits.minPurchase, "Below minimum");
        require(ldaoAmount <= limits.maxPurchase, "Exceeds maximum");
        
        _checkCircuitBreaker(ldaoAmount);
        _updateDailyLimits(msg.sender, ldaoAmount);
        
        if (kycRequired) {
            require(kycApproved[msg.sender], "KYC required");
        }
        
        uint256 finalPrice = _calculatePrice(ldaoAmount);
        uint256 usdAmount = (ldaoAmount * finalPrice) / 1e18;
        uint256 usdcAmount = usdAmount / 1e12; // Convert to 6 decimals
        
        require(
            usdcToken.transferFrom(msg.sender, address(this), usdcAmount),
            "USDC transfer failed"
        );
        
        require(
            ldaoToken.transfer(msg.sender, ldaoAmount),
            "Transfer failed"
        );
        
        totalSold += ldaoAmount;
        totalRevenue += usdAmount;
        purchaseHistory[msg.sender] += ldaoAmount;
        
        emit LDAOPurchased(msg.sender, ldaoAmount, usdAmount, 0, "USDC");
    }
    
    /**
     * @notice Emergency withdrawal with timelock (replaces direct withdrawal)
     */
    function emergencyWithdrawLDAO(uint256 amount, address recipient) external onlyOwner {
        bytes32 requestId = keccak256(abi.encodePacked(
            block.timestamp,
            "EMERGENCY_WITHDRAW",
            amount,
            recipient
        ));
        
        require(timelockRequests[requestId].timestamp == 0, "Request exists");
        
        timelockRequests[requestId] = TimelockRequest({
            target: address(ldaoToken),
            value: 0,
            dataHash: keccak256(abi.encodePacked("transfer", recipient, amount)),
            timestamp: block.timestamp,
            delay: EMERGENCY_TIMELOCK_DELAY,
            executed: false
        });
        
        emit TimelockRequestCreated(requestId, block.timestamp + EMERGENCY_TIMELOCK_DELAY);
    }
    
    /**
     * @notice Execute timelocked request
     */
    function executeTimelockRequest(bytes32 requestId) external onlyOwner {
        TimelockRequest storage request = timelockRequests[requestId];
        require(request.timestamp > 0, "Request not found");
        require(!request.executed, "Already executed");
        require(block.timestamp >= request.timestamp + request.delay, "Timelock active");
        
        request.executed = true;
        
        bytes memory data = abi.encodeWithSignature(
            "transfer(address,uint256)",
            msg.sender,
            request.value
        );
        
        (bool success, ) = request.target.call{value: request.value}(data);
        require(success, "Execution failed");
        
        emit TimelockRequestExecuted(requestId);
    }
    
    // Internal functions
    function _getETHPrice() internal view returns (uint256) {
        (, int256 price, , , ) = ethUsdPriceFeed.latestRoundData();
        require(price > 0, "Invalid price");
        return uint256(price) * 1e10; // Convert from 8 to 18 decimals
    }
    
    function _calculatePrice(uint256 ldaoAmount) internal view returns (uint256) {
        uint256 dynamicPrice = (pricing.basePrice * demandMultiplier) / 1e18;
        uint256 maxPrice = (pricing.basePrice * pricing.maxMultiplier) / 1e18;
        return dynamicPrice > maxPrice ? maxPrice : dynamicPrice;
    }
    
    function _checkCircuitBreaker(uint256 ldaoAmount) internal view {
        require(
            currentDayPurchases + ldaoAmount <= limits.emergencyThreshold,
            "Emergency threshold"
        );
        require(
            currentDayPurchases + ldaoAmount <= limits.dailyLimit,
            "Daily limit"
        );
    }
    
    function _updateDailyLimits(address buyer, uint256 ldaoAmount) internal {
        uint256 currentDay = block.timestamp / 1 days;
        
        if (currentDay > lastResetDay) {
            currentDayPurchases = 0;
            lastResetDay = currentDay;
        }
        
        currentDayPurchases += ldaoAmount;
    }
    
    // Owner functions
    function updateLDAOPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Invalid price");
        uint256 oldPrice = pricing.basePrice;
        pricing.basePrice = uint128(newPrice);
        ldaoPriceInUSD = _calculatePrice(newPrice);
        emit PriceUpdated(oldPrice, newPrice);
    }
    
    function setSalesActive(bool active) external onlyOwner {
        salesActive = active;
        emit SalesStatusUpdated(active);
    }
    
    function emergencyPause(string calldata reason) external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function updateKYCStatus(address user, bool approved) external onlyOwner {
        kycApproved[user] = approved;
        emit KYCStatusUpdated(user, approved);
    }
    
    function withdrawETH(uint256 amount, address payable recipient) external onlyOwner {
        require(amount > 0, "Invalid amount");
        require(address(this).balance >= amount, "Insufficient balance");
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Transfer failed");
        emit FundsWithdrawn(address(0), amount, recipient);
    }
    
    function withdrawToken(address token, uint256 amount, address recipient) external onlyOwner {
        require(token != address(ldaoToken), "Cannot withdraw LDAO");
        require(amount > 0, "Invalid amount");
        require(IERC20(token).balanceOf(address(this)) >= amount, "Insufficient balance");
        IERC20(token).transfer(recipient, amount);
        emit FundsWithdrawn(token, amount, recipient);
    }
    
    // View functions
    function getQuote(uint256 ldaoAmount) 
        external 
        view 
        returns (uint256 usdAmount, uint256 ethAmount, uint256 usdcAmount) 
    {
        uint256 finalPrice = _calculatePrice(ldaoAmount);
        usdAmount = (ldaoAmount * finalPrice) / 1e18;
        
        uint256 ethPrice = _getETHPrice();
        ethAmount = (usdAmount * 1e18) / ethPrice;
        usdcAmount = usdAmount / 1e12;
    }
    
    function getTreasuryBalance() 
        external 
        view 
        returns (uint256 ldaoBalance, uint256 ethBalance, uint256 usdcBalance) 
    {
        ldaoBalance = ldaoToken.balanceOf(address(this));
        ethBalance = address(this).balance;
        usdcBalance = usdcToken.balanceOf(address(this));
    }
    
    function getETHPrice() external view returns (uint256) {
        return _getETHPrice();
    }
}