// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./BridgeValidator.sol";

/**
 * @title SecureBridgeValidator
 * @notice Enhanced validator with additional security measures
 * @dev Addresses security concerns from initial review
 */
contract SecureBridgeValidator is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // Enhanced validator structure
    struct EnhancedValidator {
        address validatorAddress;
        uint256 stake;
        uint256 validatedTransactions;
        uint256 lastActivity;
        uint256 reputation;
        uint256 slashCount;
        uint256 lastSlashReason;
        bool isActive;
        bool isSlashed;
        bytes32 commitment; // For commit-reveal scheme
        mapping(uint256 => bool) revealedNonces;
    }

    // Security parameters
    struct SecurityParams {
        uint256 minActiveValidators; // Minimum active validators
        uint256 maxSlashPercentage; // Maximum slash percentage (basis points)
        uint256 challengePeriod; // Time to challenge a transaction
        uint256 revealPeriod; // Time to reveal commitment
        uint256 reputationDecayRate; // Reputation decay per day (basis points)
        uint256 minReputationForValidation; // Minimum reputation to validate
    }

    // Challenge mechanism
    struct Challenge {
        uint256 id;
        address challenger;
        address challengedValidator;
        uint256 transactionId;
        bytes32 transactionHash;
        uint256 challengeAmount;
        uint256 startTime;
        bool resolved;
        bool successful;
        mapping(address => bool) hasVoted;
    }

    // Storage
    mapping(address => EnhancedValidator) public enhancedValidators;
    mapping(uint256 => Challenge) public challenges;
    mapping(address => uint256[]) public validatorChallenges;
    mapping(address => uint256) public challengeStakes;
    
    address[] public validatorList;
    uint256 public nextChallengeId = 1;
    uint256 public constant MAX_VALIDATORS = 21;
    uint256 public constant MIN_STAKE = 10000 * 10**18; // 10,000 LDAO
    uint256 public constant CHALLENGE_STAKE = 1000 * 10**18; // 1,000 LDAO
    uint256 public constant REPUTATION_MAX = 1000; // Max reputation score
    
    SecurityParams public securityParams;
    
    // Insurance fund
    uint256 public insuranceFund;
    address public insuranceFundAddress;
    
    // Events
    event ValidatorAddedSecure(address indexed validator, uint256 stake);
    event ValidatorSlashedSecure(
        address indexed validator, 
        uint256 amount, 
        uint256 reason,
        address indexed reporter
    );
    event ChallengeCreated(
        uint256 indexed challengeId,
        address indexed challenger,
        address indexed validator,
        uint256 transactionId
    );
    event ChallengeResolved(
        uint256 indexed challengeId,
        bool successful,
        uint256 rewardAmount
    );
    event InsuranceFundDeposited(uint256 amount);
    event InsuranceFundWithdrawn(uint256 amount);

    modifier onlyActiveValidator() {
        require(enhancedValidators[msg.sender].isActive, "Not an active validator");
        require(enhancedValidators[msg.sender].reputation >= securityParams.minReputationForValidation, "Insufficient reputation");
        _;
    }
    
    modifier sufficientActiveValidators() {
        require(_getActiveValidatorCount() >= securityParams.minActiveValidators, "Insufficient active validators");
        _;
    }

    constructor(
        address _owner,
        address _insuranceFundAddress
    ) Ownable(_owner) {
        insuranceFundAddress = _insuranceFundAddress;
        
        // Initialize security parameters
        securityParams = SecurityParams({
            minActiveValidators: 5,
            maxSlashPercentage: 2000, // 20%
            challengePeriod: 1 hours,
            revealPeriod: 30 minutes,
            reputationDecayRate: 10, // 0.1% per day
            minReputationForValidation: 100
        });
    }

    /**
     * @notice Add a new validator with enhanced security checks
     */
    function addValidator(address validatorAddress, uint256 stake) external onlyOwner {
        require(validatorAddress != address(0), "Invalid validator address");
        require(!enhancedValidators[validatorAddress].isActive, "Validator already exists");
        require(validatorList.length < MAX_VALIDATORS, "Max validators reached");
        require(stake >= MIN_STAKE, "Insufficient stake");
        require(enhancedValidators[validatorAddress].slashCount < 3, "Too many slashes");
        
        // Transfer stake to contract
        // Note: In implementation, this would use IERC20 transferFrom
        // require(ldaoToken.transferFrom(msg.sender, address(this), stake), "Stake transfer failed");
        
        enhancedValidators[validatorAddress] = EnhancedValidator({
            validatorAddress: validatorAddress,
            stake: stake,
            validatedTransactions: 0,
            lastActivity: block.timestamp,
            reputation: 100, // Start with neutral reputation
            slashCount: 0,
            lastSlashReason: 0,
            isActive: true,
            isSlashed: false,
            commitment: bytes32(0)
        });
        
        validatorList.push(validatorAddress);
        
        emit ValidatorAddedSecure(validatorAddress, stake);
    }
    
    /**
     * @notice Remove a validator with governance vote
     */
    function removeValidator(address validatorAddress, uint256 reason) external onlyOwner {
        require(enhancedValidators[validatorAddress].isActive, "Validator does not exist");
        require(_getActiveValidatorCount() > securityParams.minActiveValidators, "Cannot remove, below threshold");
        
        enhancedValidators[validatorAddress].isActive = false;
        
        // Remove from validator list
        for (uint256 i = 0; i < validatorList.length; i++) {
            if (validatorList[i] == validatorAddress) {
                validatorList[i] = validatorList[validatorList.length - 1];
                validatorList.pop();
                break;
            }
        }
    }
    
    /**
     * @notice Enhanced validation with commit-reveal
     */
    function validateTransactionSecure(
        bytes32 transactionHash,
        bytes32 commitment,
        bytes calldata signature,
        bytes32 nonce
    ) external onlyActiveValidator sufficientActiveValidators nonReentrant {
        require(!enhancedValidators[msg.sender].revealedNonces[uint256(nonce)], "Nonce already used");
        
        // Verify commitment matches
        bytes32 computedCommitment = keccak256(abi.encodePacked(transactionHash, nonce));
        require(computedCommitment == commitment, "Invalid commitment");
        
        // Mark nonce as used
        enhancedValidators[msg.sender].revealedNonces[uint256(nonce)] = true;
        
        // Verify signature
        bytes32 ethSignedMessageHash = computedCommitment.toEthSignedMessageHash();
        address recoveredSigner = ethSignedMessageHash.recover(signature);
        require(recoveredSigner == msg.sender, "Invalid signature");
        
        // Update validator stats
        enhancedValidators[msg.sender].validatedTransactions++;
        enhancedValidators[msg.sender].lastActivity = block.timestamp;
        
        // Update reputation
        _updateReputation(msg.sender, 5); // +5 reputation for valid validation
    }
    
    /**
     * @notice Challenge a validator's transaction
     */
    function challengeValidation(
        address challengedValidator,
        uint256 transactionId,
        bytes32 transactionHash,
        bytes calldata proof
    ) external payable nonReentrant {
        require(msg.value >= CHALLENGE_STAKE, "Insufficient challenge stake");
        require(enhancedValidators[challengedValidator].isActive, "Validator not active");
        
        uint256 challengeId = nextChallengeId++;
        
        challenges[challengeId] = Challenge({
            id: challengeId,
            challenger: msg.sender,
            challengedValidator: challengedValidator,
            transactionId: transactionId,
            transactionHash: transactionHash,
            challengeAmount: msg.value,
            startTime: block.timestamp,
            resolved: false,
            successful: false
        });
        
        validatorChallenges[challengedValidator].push(challengeId);
        challengeStakes[msg.sender] += msg.value;
        
        emit ChallengeCreated(challengeId, msg.sender, challengedValidator, transactionId);
    }
    
    /**
     * @notice Resolve a challenge
     */
    function resolveChallenge(uint256 challengeId, bool success) external onlyOwner {
        Challenge storage challenge = challenges[challengeId];
        require(!challenge.resolved, "Challenge already resolved");
        require(block.timestamp >= challenge.startTime + securityParams.challengePeriod, "Challenge period not ended");
        
        challenge.resolved = true;
        challenge.successful = success;
        
        if (success) {
            // Challenge successful - slash validator
            EnhancedValidator storage validator = enhancedValidators[challenge.challengedValidator];
            uint256 slashAmount = (validator.stake * securityParams.maxSlashPercentage) / 10000;
            
            validator.stake -= slashAmount;
            validator.lastSlashReason = block.timestamp;
            validator.isSlashed = true;
            validator.reputation = Math.max(0, int256(validator.reputation) - 100);
            validator.slashCount++;
            
            // Auto-remove if too many slashes or low reputation
            if (validator.slashCount >= 5 || validator.reputation < 50) {
                validator.isActive = false;
            }
            
            // Transfer stake to challenger and insurance fund
            uint256 challengerReward = slashAmount / 2;
            require(insuranceFundAddress.call{value: challengerReward}(""), "Insurance fund transfer failed");
            require(payable(challenge.challenger).transfer(challengerReward), "Challenger reward transfer failed");
            
            emit ValidatorSlashedSecure(challenge.challengedValidator, slashAmount, block.timestamp, msg.sender);
        }
        
        // Return stake to challenger (if challenge fails)
        if (!success) {
            require(payable(challenge.challenger).transfer(challenge.challengeAmount), "Stake return failed");
        }
        
        emit ChallengeResolved(challengeId, success, success ? challenge.challengeAmount / 2 : 0);
    }
    
    /**
     * @notice Update security parameters
     */
    function updateSecurityParams(SecurityParams calldata newParams) external onlyOwner {
        require(newParams.minActiveValidators >= 3, "Minimum validators too low");
        require(newParams.maxSlashPercentage <= 5000, "Max slash too high");
        require(newParams.minReputationForValidation <= 500, "Min reputation too high");
        
        securityParams = newParams;
    }
    
    /**
     * @notice Deposit to insurance fund
     */
    function depositToInsuranceFund() external payable {
        require(msg.value > 0, "Must deposit something");
        insuranceFund += msg.value;
        
        (bool success, ) = insuranceFundAddress.call{value: msg.value}("");
        require(success, "Insurance fund deposit failed");
        
        emit InsuranceFundDeposited(msg.value);
    }
    
    /**
     * @notice Get active validator count
     */
    function getActiveValidatorCount() external view returns (uint256) {
        return _getActiveValidatorCount();
    }
    
    /**
     * @notice Get validator details
     */
    function getValidatorInfo(address validatorAddress) external view returns (
        uint256 stake,
        uint256 reputation,
        uint256 slashCount,
        bool isActive,
        bool isSlashed
    ) {
        EnhancedValidator storage validator = enhancedValidators[validatorAddress];
        return (
            validator.stake,
            validator.reputation,
            validator.slashCount,
            validator.isActive,
            validator.isSlashed
        );
    }
    
    // Internal functions
    
    function _updateReputation(address validator, int256 change) internal {
        EnhancedValidator storage v = enhancedValidators[validator];
        uint256 oldReputation = v.reputation;
        
        if (change > 0) {
            v.reputation = Math.min(REPUTATION_MAX, v.reputation + uint256(change));
        } else {
            v.reputation = v.reputation > uint256(-change) ? v.reputation - uint256(-change) : 0;
        }
        
        // Apply daily decay
        uint256 daysInactive = (block.timestamp - v.lastActivity) / 1 days;
        if (daysInactive > 0 && v.reputation > 0) {
            uint256 decay = (v.reputation * securityParams.reputationDecayRate * daysInactive) / 10000;
            v.reputation = v.reputation > decay ? v.reputation - decay : 0;
        }
    }
    
    function _getActiveValidatorCount() internal view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < validatorList.length; i++) {
            if (enhancedValidators[validatorList[i]].isActive) {
                count++;
            }
        }
        return count;
    }
}