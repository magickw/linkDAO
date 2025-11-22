// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TipRouter is Ownable, ReentrancyGuard {
    IERC20 public ldao;
    address public rewardPool;
    uint96 public feeBps = 1000; // 10%
    
    // Subscription tipping
    struct Subscription {
        uint256 amount;
        uint256 interval; // in seconds
        uint256 nextPayment;
        bool active;
    }
    
    // Mapping of subscriptions (tipper => creator => subscription)
    mapping(address => mapping(address => Subscription)) public subscriptions;
    
    // Mapping of tip timestamps for rate limiting
    mapping(address => uint256) public lastTipTime;
    
    // Tip limits to prevent abuse
    uint256 public minTipAmount = 1e18; // 1 LDAO
    uint256 public maxTipAmount = 10000 * 1e18; // 10,000 LDAO
    uint256 public tipCooldown = 1 seconds; // Minimum time between tips
    
    // Tiered fee structure
    struct FeeTier {
        uint256 threshold; // in LDAO
        uint96 feeBps;
    }
    
    FeeTier[] public feeTiers;
    
    // Tip comments
    mapping(bytes32 => string) public tipComments;
    
    event Tipped(bytes32 indexed postId, address indexed from, address indexed to, uint256 amount, uint256 fee);
    event SubscriptionCreated(address indexed tipper, address indexed creator, uint256 amount, uint256 interval);
    event SubscriptionCancelled(address indexed tipper, address indexed creator);
    event SubscriptionPayment(address indexed tipper, address indexed creator, uint256 amount, uint256 fee);
    event TipCommentAdded(bytes32 indexed postId, address indexed from, address indexed to, string comment);
    event FeeTiersUpdated();
    event TipLimitsUpdated(uint256 minAmount, uint256 maxAmount, uint256 cooldown);

    constructor(address _ldao, address _rewardPool) Ownable(msg.sender) {
        ldao = IERC20(_ldao);
        rewardPool = _rewardPool;
        
        // Initialize default fee tiers
        feeTiers.push(FeeTier(0, 1000)); // 10% for amounts < 100 LDAO
        feeTiers.push(FeeTier(100 * 1e18, 500)); // 5% for amounts >= 100 LDAO
        feeTiers.push(FeeTier(1000 * 1e18, 250)); // 2.5% for amounts >= 1000 LDAO
    }

    function setFeeBps(uint96 _bps) external onlyOwner {
        require(_bps <= 2000, "max 20%");
        feeBps = _bps;
    }
    
    /**
     * @dev Set tip limits
     * @param _minTip Minimum tip amount
     * @param _maxTip Maximum tip amount
     * @param _cooldown Minimum time between tips
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
     * @param _feeTiers New fee tiers
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
     * @param amount The tip amount
     * @return fee The calculated fee
     */
    function calculateFee(uint256 amount) public view returns (uint256) {
        // Find applicable fee tier
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

    // Standard ERC20 flow (user must approve TipRouter to spend LDAO)
    function tip(bytes32 postId, address creator, uint256 amount) public nonReentrant {
        require(amount >= minTipAmount, "Tip amount too low");
        require(amount <= maxTipAmount, "Tip amount too high");
        require(block.timestamp >= lastTipTime[msg.sender] + tipCooldown, "Tip too frequent");
        
        lastTipTime[msg.sender] = block.timestamp;
        
        uint256 fee = calculateFee(amount);
        uint256 toCreator = amount - fee;
        require(ldao.transferFrom(msg.sender, creator, toCreator), "transfer fail");
        require(ldao.transferFrom(msg.sender, rewardPool, fee), "fee fail");
        emit Tipped(postId, msg.sender, creator, amount, fee);
    }
    
    /**
     * @dev Tip with comment
     * @param postId The post ID
     * @param creator The creator address
     * @param amount The tip amount
     * @param comment The comment
     */
    function tipWithComment(bytes32 postId, address creator, uint256 amount, string memory comment) external nonReentrant {
        tip(postId, creator, amount);
        tipComments[postId] = comment;
        emit TipCommentAdded(postId, msg.sender, creator, comment);
    }

    // Permit + tip in one call (gasless approvals)
    function permitAndTip(
        bytes32 postId,
        address creator,
        uint256 amount,
        uint256 deadline,
        uint8 v, bytes32 r, bytes32 s
    ) external nonReentrant {
        ERC20Permit(address(ldao)).permit(msg.sender, address(this), amount, deadline, v, r, s);
        this.tip(postId, creator, amount);
    }
    
    /**
     * @dev Create a subscription tip
     * @param creator The creator address
     * @param amount The subscription amount
     * @param interval The payment interval in seconds
     */
    function createSubscription(address creator, uint256 amount, uint256 interval) external nonReentrant {
        require(amount >= minTipAmount, "Subscription amount too low");
        require(amount <= maxTipAmount, "Subscription amount too high");
        require(interval >= 1 days, "Interval too short (min 1 day)");
        require(interval <= 365 days, "Interval too long (max 1 year)");
        
        Subscription storage subscription = subscriptions[msg.sender][creator];
        subscription.amount = amount;
        subscription.interval = interval;
        subscription.nextPayment = block.timestamp + interval;
        subscription.active = true;
        
        emit SubscriptionCreated(msg.sender, creator, amount, interval);
    }
    
    /**
     * @dev Process subscription payment
     * @param tipper The tipper address
     */
    function processSubscriptionPayment(address tipper) external nonReentrant {
        Subscription storage subscription = subscriptions[tipper][msg.sender];
        require(subscription.active, "No active subscription");
        require(block.timestamp >= subscription.nextPayment, "Not time for payment");
        
        uint256 amount = subscription.amount;
        uint256 fee = calculateFee(amount);
        uint256 toCreator = amount - fee;
        
        require(ldao.transferFrom(tipper, msg.sender, toCreator), "transfer fail");
        require(ldao.transferFrom(tipper, rewardPool, fee), "fee fail");
        
        subscription.nextPayment = block.timestamp + subscription.interval;
        
        emit SubscriptionPayment(tipper, msg.sender, amount, fee);
    }
    
    /**
     * @dev Cancel subscription
     * @param creator The creator address
     */
    function cancelSubscription(address creator) external {
        Subscription storage subscription = subscriptions[msg.sender][creator];
        require(subscription.active, "No active subscription");
        
        subscription.active = false;
        emit SubscriptionCancelled(msg.sender, creator);
    }
    
    /**
     * @dev Get subscription info
     * @param tipper The tipper address
     * @param creator The creator address
     * @return Subscription struct
     */
    function getSubscription(address tipper, address creator) external view returns (Subscription memory) {
        return subscriptions[tipper][creator];
    }
}