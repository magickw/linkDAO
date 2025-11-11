// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title LDAOBridge
 * @notice Cross-chain bridge for LDAO tokens with lock/mint mechanism
 * @dev Supports bridging between Ethereum, Polygon, and Arbitrum
 */
contract LDAOBridge is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    // Supported chains
    enum ChainId {
        ETHEREUM,
        POLYGON,
        ARBITRUM
    }

    // Bridge transaction status
    enum BridgeStatus {
        PENDING,
        COMPLETED,
        FAILED,
        CANCELLED
    }

    // Bridge transaction structure
    struct BridgeTransaction {
        address user;
        uint256 amount;
        ChainId sourceChain;
        ChainId destinationChain;
        uint256 nonce;
        uint256 timestamp;
        BridgeStatus status;
        bytes32 txHash;
        uint256 fee;
    }

    // Validator structure
    struct Validator {
        address validatorAddress;
        bool isActive;
        uint256 stake;
        uint256 validatedTransactions;
        uint256 lastActivity;
    }

    // Chain configuration
    struct ChainConfig {
        bool isSupported;
        uint256 minBridgeAmount;
        uint256 maxBridgeAmount;
        uint256 baseFee;
        uint256 feePercentage; // in basis points
        address tokenAddress;
        bool isLockChain; // true for lock, false for mint
    }

    // State variables
    IERC20 public immutable ldaoToken;
    uint256 public bridgeNonce;
    uint256 public totalLocked;
    uint256 public totalBridged;
    uint256 public validatorThreshold = 3; // Minimum validators required
    uint256 public constant MAX_VALIDATORS = 10;
    uint256 public constant VALIDATOR_STAKE_REQUIRED = 10000 * 10**18; // 10,000 LDAO
    uint256 public constant BRIDGE_TIMEOUT = 24 hours;

    // Mappings
    mapping(uint256 => BridgeTransaction) public bridgeTransactions;
    mapping(address => bool) public validators;
    mapping(address => Validator) public validatorInfo;
    mapping(uint256 => ChainConfig) public chainConfigs;
    mapping(bytes32 => bool) public processedTransactions;
    mapping(address => uint256) public userNonces;
    mapping(uint256 => mapping(address => bool)) public validatorSignatures;
    mapping(uint256 => uint256) public validatorCount;

    // Fee collection
    mapping(address => uint256) public collectedFees;
    uint256 public totalFeesCollected;

    // Events
    event BridgeInitiated(
        uint256 indexed nonce,
        address indexed user,
        uint256 amount,
        ChainId sourceChain,
        ChainId destinationChain,
        uint256 fee
    );
    
    event BridgeCompleted(
        uint256 indexed nonce,
        address indexed user,
        uint256 amount,
        bytes32 txHash
    );
    
    event BridgeFailed(
        uint256 indexed nonce,
        address indexed user,
        string reason
    );
    
    event ValidatorAdded(address indexed validator, uint256 stake);
    event ValidatorRemoved(address indexed validator);
    event ValidatorSigned(uint256 indexed nonce, address indexed validator);
    event ChainConfigUpdated(ChainId indexed chainId, bool isSupported);
    event FeesWithdrawn(address indexed recipient, uint256 amount);
    event EmergencyWithdraw(address indexed token, uint256 amount);

    constructor(
        address _ldaoToken,
        address _owner
    ) Ownable(_owner) {
        require(_ldaoToken != address(0), "Invalid token address");
        require(_owner != address(0), "Invalid owner address");

        ldaoToken = IERC20(_ldaoToken);
        
        // Initialize chain configurations
        _initializeChainConfigs();
    }

    /**
     * @notice Initialize a bridge transaction
     * @param amount Amount of tokens to bridge
     * @param destinationChain Target chain for bridging
     */
    function initiateBridge(
        uint256 amount,
        ChainId destinationChain
    ) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(destinationChain != ChainId.ETHEREUM, "Cannot bridge to same chain");
        
        ChainConfig memory sourceConfig = chainConfigs[uint256(ChainId.ETHEREUM)];
        ChainConfig memory destConfig = chainConfigs[uint256(destinationChain)];
        
        require(sourceConfig.isSupported && destConfig.isSupported, "Chain not supported");
        require(amount >= sourceConfig.minBridgeAmount, "Amount below minimum");
        require(amount <= sourceConfig.maxBridgeAmount, "Amount above maximum");
        
        // Calculate fees
        uint256 fee = _calculateBridgeFee(amount, destinationChain);
        uint256 totalAmount = amount + fee;
        
        require(ldaoToken.balanceOf(msg.sender) >= totalAmount, "Insufficient balance");
        
        // Transfer tokens to bridge contract (lock mechanism)
        ldaoToken.safeTransferFrom(msg.sender, address(this), totalAmount);
        
        // Create bridge transaction
        uint256 nonce = ++bridgeNonce;
        bridgeTransactions[nonce] = BridgeTransaction({
            user: msg.sender,
            amount: amount,
            sourceChain: ChainId.ETHEREUM,
            destinationChain: destinationChain,
            nonce: nonce,
            timestamp: block.timestamp,
            status: BridgeStatus.PENDING,
            txHash: bytes32(0),
            fee: fee
        });
        
        // Update state
        totalLocked += amount;
        collectedFees[address(ldaoToken)] += fee;
        totalFeesCollected += fee;
        userNonces[msg.sender] = nonce;
        
        emit BridgeInitiated(nonce, msg.sender, amount, ChainId.ETHEREUM, destinationChain, fee);
    }

    /**
     * @notice Complete a bridge transaction (validators only)
     * @param nonce Bridge transaction nonce
     * @param txHash Transaction hash from destination chain
     */
    function completeBridge(
        uint256 nonce,
        bytes32 txHash
    ) external nonReentrant {
        require(validators[msg.sender], "Not a validator");
        require(validatorInfo[msg.sender].isActive, "Validator not active");
        require(!validatorSignatures[nonce][msg.sender], "Already signed");
        
        BridgeTransaction storage transaction = bridgeTransactions[nonce];
        require(transaction.status == BridgeStatus.PENDING, "Transaction not pending");
        require(block.timestamp <= transaction.timestamp + BRIDGE_TIMEOUT, "Transaction expired");
        
        // Record validator signature
        validatorSignatures[nonce][msg.sender] = true;
        validatorCount[nonce]++;
        validatorInfo[msg.sender].validatedTransactions++;
        validatorInfo[msg.sender].lastActivity = block.timestamp;
        
        emit ValidatorSigned(nonce, msg.sender);
        
        // Check if we have enough validator signatures
        if (validatorCount[nonce] >= validatorThreshold) {
            transaction.status = BridgeStatus.COMPLETED;
            transaction.txHash = txHash;
            totalBridged += transaction.amount;
            
            emit BridgeCompleted(nonce, transaction.user, transaction.amount, txHash);
        }
    }

    /**
     * @notice Fail a bridge transaction (validators only)
     * @param nonce Bridge transaction nonce
     * @param reason Reason for failure
     */
    function failBridge(
        uint256 nonce,
        string calldata reason
    ) external nonReentrant {
        require(validators[msg.sender], "Not a validator");
        require(validatorInfo[msg.sender].isActive, "Validator not active");
        
        BridgeTransaction storage transaction = bridgeTransactions[nonce];
        require(transaction.status == BridgeStatus.PENDING, "Transaction not pending");
        
        // Refund tokens to user
        uint256 refundAmount = transaction.amount + transaction.fee;
        ldaoToken.safeTransfer(transaction.user, refundAmount);
        
        // Update state
        transaction.status = BridgeStatus.FAILED;
        totalLocked -= transaction.amount;
        collectedFees[address(ldaoToken)] -= transaction.fee;
        totalFeesCollected -= transaction.fee;
        
        emit BridgeFailed(nonce, transaction.user, reason);
    }

    /**
     * @notice Cancel a bridge transaction (user only, within timeout)
     * @param nonce Bridge transaction nonce
     */
    function cancelBridge(uint256 nonce) external nonReentrant {
        BridgeTransaction storage transaction = bridgeTransactions[nonce];
        require(transaction.user == msg.sender, "Not transaction owner");
        require(transaction.status == BridgeStatus.PENDING, "Transaction not pending");
        require(block.timestamp > transaction.timestamp + BRIDGE_TIMEOUT, "Cannot cancel yet");
        
        // Refund tokens to user
        uint256 refundAmount = transaction.amount + transaction.fee;
        ldaoToken.safeTransfer(msg.sender, refundAmount);
        
        // Update state
        transaction.status = BridgeStatus.CANCELLED;
        totalLocked -= transaction.amount;
        collectedFees[address(ldaoToken)] -= transaction.fee;
        totalFeesCollected -= transaction.fee;
    }

    /**
     * @notice Add a new validator
     * @param validatorAddress Address of the validator
     */
    function addValidator(address validatorAddress) external onlyOwner {
        require(validatorAddress != address(0), "Invalid validator address");
        require(!validators[validatorAddress], "Validator already exists");
        require(_getActiveValidatorCount() < MAX_VALIDATORS, "Max validators reached");
        
        // Require validator to stake tokens
        require(
            ldaoToken.balanceOf(validatorAddress) >= VALIDATOR_STAKE_REQUIRED,
            "Insufficient stake"
        );
        
        ldaoToken.safeTransferFrom(validatorAddress, address(this), VALIDATOR_STAKE_REQUIRED);
        
        validators[validatorAddress] = true;
        validatorInfo[validatorAddress] = Validator({
            validatorAddress: validatorAddress,
            isActive: true,
            stake: VALIDATOR_STAKE_REQUIRED,
            validatedTransactions: 0,
            lastActivity: block.timestamp
        });
        
        emit ValidatorAdded(validatorAddress, VALIDATOR_STAKE_REQUIRED);
    }

    /**
     * @notice Remove a validator
     * @param validatorAddress Address of the validator
     */
    function removeValidator(address validatorAddress) external onlyOwner {
        require(validators[validatorAddress], "Validator does not exist");
        require(_getActiveValidatorCount() > validatorThreshold, "Cannot remove, below threshold");
        
        Validator storage validator = validatorInfo[validatorAddress];
        validator.isActive = false;
        
        // Return staked tokens
        ldaoToken.safeTransfer(validatorAddress, validator.stake);
        
        emit ValidatorRemoved(validatorAddress);
    }

    /**
     * @notice Update chain configuration
     * @param chainId Chain ID to update
     * @param config New chain configuration
     */
    function updateChainConfig(
        ChainId chainId,
        ChainConfig calldata config
    ) external onlyOwner {
        chainConfigs[uint256(chainId)] = config;
        emit ChainConfigUpdated(chainId, config.isSupported);
    }

    /**
     * @notice Update validator threshold
     * @param newThreshold New validator threshold
     */
    function updateValidatorThreshold(uint256 newThreshold) external onlyOwner {
        require(newThreshold > 0, "Threshold must be greater than 0");
        require(newThreshold <= _getActiveValidatorCount(), "Threshold too high");
        validatorThreshold = newThreshold;
    }

    /**
     * @notice Withdraw collected fees
     * @param recipient Address to receive fees
     * @param amount Amount to withdraw
     */
    function withdrawFees(address recipient, uint256 amount) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        require(amount <= collectedFees[address(ldaoToken)], "Insufficient fees");
        
        collectedFees[address(ldaoToken)] -= amount;
        ldaoToken.safeTransfer(recipient, amount);
        
        emit FeesWithdrawn(recipient, amount);
    }

    /**
     * @notice Emergency withdraw (owner only)
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(token != address(0), "Invalid token address");
        IERC20(token).safeTransfer(owner(), amount);
        emit EmergencyWithdraw(token, amount);
    }

    /**
     * @notice Pause bridge operations
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause bridge operations
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Get bridge transaction details
     * @param nonce Transaction nonce
     * @return Bridge transaction details
     */
    function getBridgeTransaction(uint256 nonce) external view returns (BridgeTransaction memory) {
        return bridgeTransactions[nonce];
    }

    /**
     * @notice Get validator information
     * @param validatorAddress Validator address
     * @return Validator information
     */
    function getValidatorInfo(address validatorAddress) external view returns (Validator memory) {
        return validatorInfo[validatorAddress];
    }

    /**
     * @notice Get chain configuration
     * @param chainId Chain ID
     * @return Chain configuration
     */
    function getChainConfig(ChainId chainId) external view returns (ChainConfig memory) {
        return chainConfigs[uint256(chainId)];
    }

    /**
     * @notice Calculate bridge fee
     * @param amount Amount to bridge
     * @param destinationChain Destination chain
     * @return Total fee
     */
    function calculateBridgeFee(
        uint256 amount,
        ChainId destinationChain
    ) external view returns (uint256) {
        return _calculateBridgeFee(amount, destinationChain);
    }

    /**
     * @notice Get active validator count
     * @return Number of active validators
     */
    function getActiveValidatorCount() external view returns (uint256) {
        return _getActiveValidatorCount();
    }

    /**
     * @notice Internal function to calculate bridge fee
     */
    function _calculateBridgeFee(
        uint256 amount,
        ChainId destinationChain
    ) internal view returns (uint256) {
        ChainConfig memory config = chainConfigs[uint256(destinationChain)];
        uint256 percentageFee = (amount * config.feePercentage) / 10000;
        return config.baseFee + percentageFee;
    }

    /**
     * @notice Internal function to get active validator count
     */
    function _getActiveValidatorCount() internal view returns (uint256) {
        uint256 count = 0;
        // Note: In a real implementation, we'd maintain a list of validator addresses
        // For now, this is a placeholder that would need to be implemented properly
        return count;
    }

    /**
     * @notice Initialize chain configurations
     */
    function _initializeChainConfigs() internal {
        // Ethereum (source chain - lock mechanism)
        chainConfigs[uint256(ChainId.ETHEREUM)] = ChainConfig({
            isSupported: true,
            minBridgeAmount: 10 * 10**18, // 10 LDAO
            maxBridgeAmount: 1000000 * 10**18, // 1M LDAO
            baseFee: 1 * 10**18, // 1 LDAO
            feePercentage: 50, // 0.5%
            tokenAddress: address(ldaoToken),
            isLockChain: true
        });

        // Polygon (destination chain - mint mechanism)
        chainConfigs[uint256(ChainId.POLYGON)] = ChainConfig({
            isSupported: true,
            minBridgeAmount: 10 * 10**18,
            maxBridgeAmount: 1000000 * 10**18,
            baseFee: 1 * 10**18,
            feePercentage: 50,
            tokenAddress: address(0), // To be set when deployed
            isLockChain: false
        });

        // Arbitrum (destination chain - mint mechanism)
        chainConfigs[uint256(ChainId.ARBITRUM)] = ChainConfig({
            isSupported: true,
            minBridgeAmount: 10 * 10**18,
            maxBridgeAmount: 1000000 * 10**18,
            baseFee: 1 * 10**18,
            feePercentage: 50,
            tokenAddress: address(0), // To be set when deployed
            isLockChain: false
        });
    }
}