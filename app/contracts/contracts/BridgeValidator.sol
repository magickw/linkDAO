// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title BridgeValidator
 * @notice Validator consensus mechanism for cross-chain bridge
 * @dev Manages validator signatures and consensus for bridge transactions
 */
contract BridgeValidator is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // Validator structure
    struct Validator {
        address validatorAddress;
        bool isActive;
        uint256 stake;
        uint256 validatedTransactions;
        uint256 lastActivity;
        uint256 reputation; // 0-100 reputation score
    }

    // Validation request structure
    struct ValidationRequest {
        bytes32 txHash;
        address user;
        uint256 amount;
        uint256 sourceChain;
        uint256 destinationChain;
        uint256 timestamp;
        bool isCompleted;
        uint256 validatorCount;
        mapping(address => bool) hasValidated;
    }

    // State variables
    mapping(address => Validator) public validators;
    mapping(bytes32 => ValidationRequest) public validationRequests;
    mapping(address => bool) public isValidator;
    
    address[] public validatorList;
    uint256 public validatorThreshold = 3;
    uint256 public constant MAX_VALIDATORS = 21;
    uint256 public constant MIN_STAKE = 10000 * 10**18; // 10,000 LDAO
    uint256 public constant VALIDATION_TIMEOUT = 24 hours;
    uint256 public constant MIN_REPUTATION = 50;
    
    // Slashing parameters
    uint256 public constant SLASH_PERCENTAGE = 1000; // 10% in basis points
    uint256 public constant REWARD_PERCENTAGE = 100; // 1% in basis points
    
    // Events
    event ValidatorAdded(address indexed validator, uint256 stake);
    event ValidatorRemoved(address indexed validator, string reason);
    event ValidationRequested(bytes32 indexed txHash, address indexed user, uint256 amount);
    event ValidationCompleted(bytes32 indexed txHash, uint256 validatorCount);
    event ValidatorSlashed(address indexed validator, uint256 amount, string reason);
    event ValidatorRewarded(address indexed validator, uint256 amount);
    event ReputationUpdated(address indexed validator, uint256 oldReputation, uint256 newReputation);
    event ThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);

    constructor(address _owner) Ownable() {
        require(_owner != address(0), "Invalid owner address");
        _transferOwnership(_owner);
    }

    /**
     * @notice Add a new validator
     * @param validatorAddress Address of the validator
     * @param stake Amount of tokens staked
     */
    function addValidator(address validatorAddress, uint256 stake) external onlyOwner {
        require(validatorAddress != address(0), "Invalid validator address");
        require(!isValidator[validatorAddress], "Validator already exists");
        require(validatorList.length < MAX_VALIDATORS, "Max validators reached");
        require(stake >= MIN_STAKE, "Insufficient stake");

        validators[validatorAddress] = Validator({
            validatorAddress: validatorAddress,
            isActive: true,
            stake: stake,
            validatedTransactions: 0,
            lastActivity: block.timestamp,
            reputation: 100 // Start with perfect reputation
        });

        isValidator[validatorAddress] = true;
        validatorList.push(validatorAddress);

        emit ValidatorAdded(validatorAddress, stake);
    }

    /**
     * @notice Remove a validator
     * @param validatorAddress Address of the validator
     * @param reason Reason for removal
     */
    function removeValidator(address validatorAddress, string calldata reason) external onlyOwner {
        require(isValidator[validatorAddress], "Validator does not exist");
        require(validatorList.length > validatorThreshold, "Cannot remove, below threshold");

        validators[validatorAddress].isActive = false;
        isValidator[validatorAddress] = false;

        // Remove from validator list
        for (uint256 i = 0; i < validatorList.length; i++) {
            if (validatorList[i] == validatorAddress) {
                validatorList[i] = validatorList[validatorList.length - 1];
                validatorList.pop();
                break;
            }
        }

        emit ValidatorRemoved(validatorAddress, reason);
    }

    /**
     * @notice Request validation for a bridge transaction
     * @param txHash Transaction hash to validate
     * @param user User address
     * @param amount Amount being bridged
     * @param sourceChain Source chain ID
     * @param destinationChain Destination chain ID
     */
    function requestValidation(
        bytes32 txHash,
        address user,
        uint256 amount,
        uint256 sourceChain,
        uint256 destinationChain
    ) external {
        require(txHash != bytes32(0), "Invalid transaction hash");
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be greater than 0");
        require(!validationRequests[txHash].isCompleted, "Already validated");

        ValidationRequest storage request = validationRequests[txHash];
        request.txHash = txHash;
        request.user = user;
        request.amount = amount;
        request.sourceChain = sourceChain;
        request.destinationChain = destinationChain;
        request.timestamp = block.timestamp;
        request.isCompleted = false;
        request.validatorCount = 0;

        emit ValidationRequested(txHash, user, amount);
    }

    /**
     * @notice Validate a bridge transaction
     * @param txHash Transaction hash to validate
     * @param signature Validator's signature
     */
    function validateTransaction(
        bytes32 txHash,
        bytes calldata signature
    ) external nonReentrant {
        require(isValidator[msg.sender], "Not a validator");
        require(validators[msg.sender].isActive, "Validator not active");
        require(validators[msg.sender].reputation >= MIN_REPUTATION, "Reputation too low");
        
        ValidationRequest storage request = validationRequests[txHash];
        require(!request.isCompleted, "Already completed");
        require(!request.hasValidated[msg.sender], "Already validated");
        require(block.timestamp <= request.timestamp + VALIDATION_TIMEOUT, "Validation expired");

        // Verify signature
        bytes32 messageHash = keccak256(abi.encodePacked(
            txHash,
            request.user,
            request.amount,
            request.sourceChain,
            request.destinationChain
        ));
        
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedMessageHash.recover(signature);
        require(recoveredSigner == msg.sender, "Invalid signature");

        // Record validation
        request.hasValidated[msg.sender] = true;
        request.validatorCount++;
        
        // Update validator stats
        validators[msg.sender].validatedTransactions++;
        validators[msg.sender].lastActivity = block.timestamp;
        
        // Increase reputation for active participation
        _updateReputation(msg.sender, 1);

        // Check if threshold reached
        if (request.validatorCount >= validatorThreshold) {
            request.isCompleted = true;
            
            // Reward validators who participated
            _rewardValidators(txHash);
            
            emit ValidationCompleted(txHash, request.validatorCount);
        }
    }

    /**
     * @notice Slash a validator for malicious behavior
     * @param validatorAddress Address of the validator to slash
     * @param reason Reason for slashing
     */
    function slashValidator(
        address validatorAddress,
        string calldata reason
    ) external onlyOwner {
        require(isValidator[validatorAddress], "Validator does not exist");
        
        Validator storage validator = validators[validatorAddress];
        uint256 slashAmount = (validator.stake * SLASH_PERCENTAGE) / 10000;
        
        validator.stake -= slashAmount;
        
        // Decrease reputation significantly
        _updateReputation(validatorAddress, -10);
        
        // If stake falls below minimum or reputation too low, deactivate
        if (validator.stake < MIN_STAKE || validator.reputation < MIN_REPUTATION) {
            validator.isActive = false;
        }
        
        emit ValidatorSlashed(validatorAddress, slashAmount, reason);
    }

    /**
     * @notice Update validator threshold
     * @param newThreshold New threshold value
     */
    function updateThreshold(uint256 newThreshold) external onlyOwner {
        require(newThreshold > 0, "Threshold must be greater than 0");
        require(newThreshold <= getActiveValidatorCount(), "Threshold too high");
        
        uint256 oldThreshold = validatorThreshold;
        validatorThreshold = newThreshold;
        
        emit ThresholdUpdated(oldThreshold, newThreshold);
    }

    /**
     * @notice Get active validator count
     * @return Number of active validators
     */
    function getActiveValidatorCount() public view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < validatorList.length; i++) {
            if (validators[validatorList[i]].isActive) {
                count++;
            }
        }
        return count;
    }

    /**
     * @notice Get validator information
     * @param validatorAddress Validator address
     * @return Validator information
     */
    function getValidatorInfo(address validatorAddress) external view returns (Validator memory) {
        return validators[validatorAddress];
    }

    /**
     * @notice Get validation request information
     * @param txHash Transaction hash
     * @return Basic validation request info (without mapping)
     */
    function getValidationRequest(bytes32 txHash) external view returns (
        bytes32,
        address,
        uint256,
        uint256,
        uint256,
        uint256,
        bool,
        uint256
    ) {
        ValidationRequest storage request = validationRequests[txHash];
        return (
            request.txHash,
            request.user,
            request.amount,
            request.sourceChain,
            request.destinationChain,
            request.timestamp,
            request.isCompleted,
            request.validatorCount
        );
    }

    /**
     * @notice Check if validator has validated a specific transaction
     * @param txHash Transaction hash
     * @param validatorAddress Validator address
     * @return True if validator has validated
     */
    function hasValidated(bytes32 txHash, address validatorAddress) external view returns (bool) {
        return validationRequests[txHash].hasValidated[validatorAddress];
    }

    /**
     * @notice Get all active validators
     * @return Array of active validator addresses
     */
    function getActiveValidators() external view returns (address[] memory) {
        uint256 activeCount = getActiveValidatorCount();
        address[] memory activeValidators = new address[](activeCount);
        
        uint256 index = 0;
        for (uint256 i = 0; i < validatorList.length; i++) {
            if (validators[validatorList[i]].isActive) {
                activeValidators[index] = validatorList[i];
                index++;
            }
        }
        
        return activeValidators;
    }

    /**
     * @notice Internal function to update validator reputation
     * @param validatorAddress Validator address
     * @param change Reputation change (positive or negative)
     */
    function _updateReputation(address validatorAddress, int256 change) internal {
        Validator storage validator = validators[validatorAddress];
        uint256 oldReputation = validator.reputation;
        
        if (change > 0) {
            uint256 increase = uint256(change);
            validator.reputation = validator.reputation + increase > 100 
                ? 100 
                : validator.reputation + increase;
        } else {
            uint256 decrease = uint256(-change);
            validator.reputation = validator.reputation < decrease 
                ? 0 
                : validator.reputation - decrease;
        }
        
        emit ReputationUpdated(validatorAddress, oldReputation, validator.reputation);
    }

    /**
     * @notice Internal function to reward validators
     * @param txHash Transaction hash
     */
    function _rewardValidators(bytes32 txHash) internal {
        ValidationRequest storage request = validationRequests[txHash];
        uint256 rewardAmount = (request.amount * REWARD_PERCENTAGE) / 10000;
        uint256 rewardPerValidator = rewardAmount / request.validatorCount;
        
        for (uint256 i = 0; i < validatorList.length; i++) {
            address validatorAddr = validatorList[i];
            if (request.hasValidated[validatorAddr]) {
                validators[validatorAddr].stake += rewardPerValidator;
                emit ValidatorRewarded(validatorAddr, rewardPerValidator);
            }
        }
    }
}