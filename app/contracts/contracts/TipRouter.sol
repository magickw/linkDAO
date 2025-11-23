// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IX402PaymentHandler {
    function processX402Payment(bytes32 resourceId, uint256 amount) external returns (bytes32);
    function verifyPayment(bytes32 paymentId, bytes32 resourceId) external view returns (bool);
}

contract TipRouter is Ownable, ReentrancyGuard {
    IERC20 public ldao;
    IERC20 public usdc;
    IERC20 public usdt;
    address public rewardPool;
    IX402PaymentHandler public x402Handler;
    uint96 public feeBps = 1000; // 10%
    
    // Payment method enum
    enum PaymentMethod {
        LDAO,
        USDC,
        USDT,
        X402
    }
    
    // Multi-chain USDC addresses
    mapping(uint256 => address) public chainUSDC;
    
    // Subscription tipping
    struct Subscription {
        uint256 amount;
        uint256 interval; // in seconds
        uint256 nextPayment;
        PaymentMethod paymentMethod;
        bool active;
    }
    
    // Mapping of subscriptions (tipper => creator => subscription)
    mapping(address => mapping(address => Subscription)) public subscriptions;
    
    // Mapping of tip timestamps for rate limiting
    mapping(address => uint256) public lastTipTime;
    
    // Tip limits to prevent abuse
    uint256 public minTipAmount = 1e18; // 1 LDAO or equivalent
    uint256 public maxTipAmount = 10000 * 1e18; // 10,000 LDAO or equivalent
    uint256 public tipCooldown = 1 seconds; // Minimum time between tips
    
    // Tiered fee structure
    struct FeeTier {
        uint256 threshold; // in LDAO equivalent
        uint96 feeBps;
    }
    
    FeeTier[] public feeTiers;
    
    // Tip comments
    mapping(bytes32 => string) public tipComments;
    
    event Tipped(
        bytes32 indexed postId,
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 fee,
        PaymentMethod paymentMethod
    );
    event SubscriptionCreated(
        address indexed tipper,
        address indexed creator,
        uint256 amount,
        uint256 interval,
        PaymentMethod paymentMethod
    );
    event SubscriptionCancelled(address indexed tipper, address indexed creator);
    event SubscriptionPayment(
        address indexed tipper,
        address indexed creator,
        uint256 amount,
        uint256 fee,
        PaymentMethod paymentMethod
    );
    event TipCommentAdded(bytes32 indexed postId, address indexed from, address indexed to, string comment);
    event FeeTiersUpdated();
    event TipLimitsUpdated(uint256 minAmount, uint256 maxAmount, uint256 cooldown);
    event PaymentTokensSet(address indexed usdc, address indexed usdt);
    event X402HandlerSet(address indexed handler);
    event ChainUSDCSet(uint256 indexed chainId, address indexed usdc);

    constructor(
        address _ldao,
        address _usdc,
        address _usdt,
        address _rewardPool
    ) Ownable(msg.sender) {
        ldao = IERC20(_ldao);
        usdc = IERC20(_usdc);
        usdt = IERC20(_usdt);
        rewardPool = _rewardPool;
        
        // Initialize default fee tiers
        feeTiers.push(FeeTier(0, 1000)); // 10% for amounts < 100 LDAO
        feeTiers.push(FeeTier(100 * 1e18, 500)); // 5% for amounts >= 100 LDAO
        feeTiers.push(FeeTier(1000 * 1e18, 250)); // 2.5% for amounts >= 1000 LDAO
        
        // Initialize multi-chain USDC addresses
        _initializeChainUSDC();
    }
    
    /**
     * @dev Initialize USDC addresses for major chains
     */
    function _initializeChainUSDC() private {
        chainUSDC[8453] = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913; // Base
        chainUSDC[137] = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174; // Polygon
        chainUSDC[42161] = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831; // Arbitrum
        chainUSDC[10] = 0x7F5c764cBc14f9669B88837ca1490cCa17c31607; // Optimism
        chainUSDC[84532] = 0x036CbD53842c5426634e7929541eC2318f3dCF7e; // Base Sepolia
    }
    
    /**
     * @dev Set x402 payment handler
     */
    function setX402Handler(address _handler) external onlyOwner {
        require(_handler != address(0), "Invalid handler");
        x402Handler = IX402PaymentHandler(_handler);
        emit X402HandlerSet(_handler);
    }
    
    /**
     * @dev Set USDC address for a specific chain
     */
    function setChainUSDC(uint256 chainId, address _usdc) external onlyOwner {
        require(_usdc != address(0), "Invalid USDC address");
        chainUSDC[chainId] = _usdc;
        emit ChainUSDCSet(chainId, _usdc);
    }
    
    /**
     * @dev Set payment tokens
     */
    function setPaymentTokens(address _usdc, address _usdt) external onlyOwner {
        require(_usdc != address(0), "Invalid USDC");
        require(_usdt != address(0), "Invalid USDT");
        usdc = IERC20(_usdc);
        usdt = IERC20(_usdt);
        emit PaymentTokensSet(_usdc, _usdt);
    }

    function setFeeBps(uint96 _bps) external onlyOwner {
        require(_bps <= 2000, "max 20%");
        feeBps = _bps;
    }
    
    /**
     * @dev Set tip limits
     */
    function setTipLimits(uint256 _minTip, uint256 _maxTip, uint256 _cooldown) external onlyOwner {
        require(_minTip > 0, "Min tip must be > 0");
        require(_maxTip > _minTip, "Max tip must be > min tip");
        minTipAmount = _minTip;
        maxTipAmount = _maxTip;
        tipCooldown = _cooldown;
        emit TipLimitsUpdated(_minTip, _maxTip, _cooldown);
    }
    
    /**
     * @dev Update fee tiers
     */
    function setFeeTiers(FeeTier[] memory _feeTiers) external onlyOwner {
        delete feeTiers;
        for (uint i = 0; i < _feeTiers.length; i++) {
            feeTiers.push(_feeTiers[i]);
        }
        emit FeeTiersUpdated();
    }
    
    /**
     * @dev Calculate fee based on amount and fee tiers
     */
    function calculateFee(uint256 amount) public view returns (uint256) {
        uint96 applicableFeeBps = feeTiers[0].feeBps;
        for (uint i = 1; i < feeTiers.length; i++) {
            if (amount >= feeTiers[i].threshold) {
                applicableFeeBps = feeTiers[i].feeBps;
            } else {
                break;
            }
        }
        return (amount * applicableFeeBps) / 10_000;
    }
    
    /**
     * @dev Get payment token based on payment method
     */
    function _getPaymentToken(PaymentMethod method) internal view returns (IERC20) {
        if (method == PaymentMethod.LDAO) return ldao;
        if (method == PaymentMethod.USDC) return usdc;
        if (method == PaymentMethod.USDT) return usdt;
        revert("Invalid payment method");
    }

    /**
     * @dev Tip with specified payment method
     */
    function tip(
        bytes32 postId,
        address creator,
        uint256 amount,
        PaymentMethod paymentMethod
    ) public nonReentrant {
        require(amount >= minTipAmount, "Tip amount too low");
        require(amount <= maxTipAmount, "Tip amount too high");
        require(block.timestamp >= lastTipTime[msg.sender] + tipCooldown, "Tip too frequent");
        
        lastTipTime[msg.sender] = block.timestamp;
        
        uint256 fee = calculateFee(amount);
        uint256 toCreator = amount - fee;
        
        IERC20 token = _getPaymentToken(paymentMethod);
        require(token.transferFrom(msg.sender, creator, toCreator), "transfer fail");
        require(token.transferFrom(msg.sender, rewardPool, fee), "fee fail");
        
        emit Tipped(postId, msg.sender, creator, amount, fee, paymentMethod);
    }
    
    /**
     * @dev Tip with comment
     */
    function tipWithComment(
        bytes32 postId,
        address creator,
        uint256 amount,
        PaymentMethod paymentMethod,
        string memory comment
    ) external nonReentrant {
        tip(postId, creator, amount, paymentMethod);
        tipComments[postId] = comment;
        emit TipCommentAdded(postId, msg.sender, creator, comment);
    }
    
    /**
     * @dev Tip via x402 protocol (for micropayments)
     */
    function tipViaX402(
        bytes32 postId,
        address creator,
        uint256 amount
    ) external nonReentrant returns (bytes32) {
        require(address(x402Handler) != address(0), "X402 handler not set");
        require(amount >= minTipAmount, "Tip amount too low");
        require(amount <= maxTipAmount, "Tip amount too high");
        
        // Create resource ID for this tip
        bytes32 resourceId = keccak256(abi.encodePacked(postId, creator, block.timestamp));
        
        // Process payment through x402
        bytes32 paymentId = x402Handler.processX402Payment(resourceId, amount);
        
        uint256 fee = calculateFee(amount);
        uint256 toCreator = amount - fee;
        
        // Transfer from contract (x402 handler already received funds)
        require(usdc.transfer(creator, toCreator), "transfer fail");
        require(usdc.transfer(rewardPool, fee), "fee fail");
        
        emit Tipped(postId, msg.sender, creator, amount, fee, PaymentMethod.X402);
        
        return paymentId;
    }

    /**
     * @dev Permit + tip in one call (gasless approvals)
     */
    function permitAndTip(
        bytes32 postId,
        address creator,
        uint256 amount,
        PaymentMethod paymentMethod,
        uint256 deadline,
        uint8 v, bytes32 r, bytes32 s
    ) external nonReentrant {
        IERC20 token = _getPaymentToken(paymentMethod);
        ERC20Permit(address(token)).permit(msg.sender, address(this), amount, deadline, v, r, s);
        this.tip(postId, creator, amount, paymentMethod);
    }
    
    /**
     * @dev Create a subscription tip
     */
    function createSubscription(
        address creator,
        uint256 amount,
        uint256 interval,
        PaymentMethod paymentMethod
    ) external nonReentrant {
        require(amount >= minTipAmount, "Subscription amount too low");
        require(amount <= maxTipAmount, "Subscription amount too high");
        require(interval >= 1 days, "Interval too short (min 1 day)");
        require(interval <= 365 days, "Interval too long (max 1 year)");
        
        Subscription storage subscription = subscriptions[msg.sender][creator];
        subscription.amount = amount;
        subscription.interval = interval;
        subscription.nextPayment = block.timestamp + interval;
        subscription.paymentMethod = paymentMethod;
        subscription.active = true;
        
        emit SubscriptionCreated(msg.sender, creator, amount, interval, paymentMethod);
    }
    
    /**
     * @dev Process subscription payment
     */
    function processSubscriptionPayment(address tipper) external nonReentrant {
        Subscription storage subscription = subscriptions[tipper][msg.sender];
        require(subscription.active, "No active subscription");
        require(block.timestamp >= subscription.nextPayment, "Not time for payment");
        
        uint256 amount = subscription.amount;
        uint256 fee = calculateFee(amount);
        uint256 toCreator = amount - fee;
        
        IERC20 token = _getPaymentToken(subscription.paymentMethod);
        require(token.transferFrom(tipper, msg.sender, toCreator), "transfer fail");
        require(token.transferFrom(tipper, rewardPool, fee), "fee fail");
        
        subscription.nextPayment = block.timestamp + subscription.interval;
        
        emit SubscriptionPayment(tipper, msg.sender, amount, fee, subscription.paymentMethod);
    }
    
    /**
     * @dev Cancel subscription
     */
    function cancelSubscription(address creator) external {
        Subscription storage subscription = subscriptions[msg.sender][creator];
        require(subscription.active, "No active subscription");
        
        subscription.active = false;
        emit SubscriptionCancelled(msg.sender, creator);
    }
    
    /**
     * @dev Get subscription info
     */
    function getSubscription(address tipper, address creator) external view returns (Subscription memory) {
        return subscriptions[tipper][creator];
    }
    
    /**
     * @dev Get current chain's USDC address
     */
    function getCurrentChainUSDC() external view returns (address) {
        return chainUSDC[block.chainid];
    }
}