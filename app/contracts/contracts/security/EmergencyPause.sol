// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title EmergencyPause
 * @dev Enhanced emergency pause mechanism with role-based access and time delays
 */
contract EmergencyPause is Pausable, AccessControl, ReentrancyGuard {
    
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    
    // Emergency pause settings
    struct EmergencySettings {
        uint256 pauseDelay;          // Delay before pause takes effect (except emergency)
        uint256 unpauseDelay;        // Delay before unpause takes effect
        uint256 maxPauseDuration;    // Maximum time contract can remain paused
        bool emergencyPauseEnabled;  // Whether emergency pause is enabled
    }
    
    EmergencySettings public emergencySettings;
    
    // Pause requests
    struct PauseRequest {
        address requester;
        uint256 requestTime;
        uint256 effectiveTime;
        bool isEmergency;
        bool executed;
        string reason;
    }
    
    struct UnpauseRequest {
        address requester;
        uint256 requestTime;
        uint256 effectiveTime;
        bool executed;
        string reason;
    }
    
    mapping(uint256 => PauseRequest) public pauseRequests;
    mapping(uint256 => UnpauseRequest) public unpauseRequests;
    
    uint256 public pauseRequestCount;
    uint256 public unpauseRequestCount;
    uint256 public pausedAt;
    
    // Events
    event PauseRequested(
        uint256 indexed requestId,
        address indexed requester,
        uint256 effectiveTime,
        bool isEmergency,
        string reason
    );
    
    event UnpauseRequested(
        uint256 indexed requestId,
        address indexed requester,
        uint256 effectiveTime,
        string reason
    );
    
    event EmergencyPauseExecuted(address indexed executor, string reason);
    event PauseExecuted(uint256 indexed requestId, address indexed executor);
    event UnpauseExecuted(uint256 indexed requestId, address indexed executor);
    event EmergencySettingsUpdated(EmergencySettings newSettings);
    
    // Custom errors
    error PauseDelayNotMet();
    error UnpauseDelayNotMet();
    error MaxPauseDurationExceeded();
    error EmergencyPauseDisabled();
    error RequestAlreadyExecuted();
    error InvalidRequest();
    error UnauthorizedOperation();
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(EMERGENCY_ROLE, msg.sender);
        _grantRole(GUARDIAN_ROLE, msg.sender);
        
        // Default settings
        emergencySettings = EmergencySettings({
            pauseDelay: 1 hours,
            unpauseDelay: 24 hours,
            maxPauseDuration: 7 days,
            emergencyPauseEnabled: true
        });
    }
    
    /**
     * @dev Request a pause with delay (non-emergency)
     */
    function requestPause(string calldata reason) external onlyRole(PAUSER_ROLE) {
        require(!paused(), "Already paused");
        
        uint256 requestId = pauseRequestCount++;
        uint256 effectiveTime = block.timestamp + emergencySettings.pauseDelay;
        
        pauseRequests[requestId] = PauseRequest({
            requester: msg.sender,
            requestTime: block.timestamp,
            effectiveTime: effectiveTime,
            isEmergency: false,
            executed: false,
            reason: reason
        });
        
        emit PauseRequested(requestId, msg.sender, effectiveTime, false, reason);
    }
    
    /**
     * @dev Execute emergency pause immediately
     */
    function emergencyPause(string calldata reason) external onlyRole(EMERGENCY_ROLE) {
        if (!emergencySettings.emergencyPauseEnabled) revert EmergencyPauseDisabled();
        require(!paused(), "Already paused");
        
        pausedAt = block.timestamp;
        _pause();
        
        emit EmergencyPauseExecuted(msg.sender, reason);
    }
    
    /**
     * @dev Execute a scheduled pause request
     */
    function executePause(uint256 requestId) external onlyRole(PAUSER_ROLE) {
        PauseRequest storage request = pauseRequests[requestId];
        
        if (request.executed) revert RequestAlreadyExecuted();
        if (block.timestamp < request.effectiveTime) revert PauseDelayNotMet();
        if (request.requester == address(0)) revert InvalidRequest();
        
        require(!paused(), "Already paused");
        
        request.executed = true;
        pausedAt = block.timestamp;
        _pause();
        
        emit PauseExecuted(requestId, msg.sender);
    }
    
    /**
     * @dev Request unpause with delay
     */
    function requestUnpause(string calldata reason) external onlyRole(PAUSER_ROLE) {
        require(paused(), "Not paused");
        
        // Check if max pause duration exceeded
        if (block.timestamp > pausedAt + emergencySettings.maxPauseDuration) {
            revert MaxPauseDurationExceeded();
        }
        
        uint256 requestId = unpauseRequestCount++;
        uint256 effectiveTime = block.timestamp + emergencySettings.unpauseDelay;
        
        unpauseRequests[requestId] = UnpauseRequest({
            requester: msg.sender,
            requestTime: block.timestamp,
            effectiveTime: effectiveTime,
            executed: false,
            reason: reason
        });
        
        emit UnpauseRequested(requestId, msg.sender, effectiveTime, reason);
    }
    
    /**
     * @dev Execute a scheduled unpause request
     */
    function executeUnpause(uint256 requestId) external onlyRole(PAUSER_ROLE) {
        UnpauseRequest storage request = unpauseRequests[requestId];
        
        if (request.executed) revert RequestAlreadyExecuted();
        if (block.timestamp < request.effectiveTime) revert UnpauseDelayNotMet();
        if (request.requester == address(0)) revert InvalidRequest();
        
        require(paused(), "Not paused");
        
        request.executed = true;
        pausedAt = 0;
        _unpause();
        
        emit UnpauseExecuted(requestId, msg.sender);
    }
    
    /**
     * @dev Guardian override for emergency unpause
     */
    function guardianUnpause(string calldata reason) external onlyRole(GUARDIAN_ROLE) {
        require(paused(), "Not paused");
        
        // Check if max pause duration exceeded - guardians can override
        if (block.timestamp > pausedAt + emergencySettings.maxPauseDuration) {
            pausedAt = 0;
            _unpause();
            emit EmergencyPauseExecuted(msg.sender, string(abi.encodePacked("Guardian override: ", reason)));
            return;
        }
        
        revert UnauthorizedOperation();
    }
    
    /**
     * @dev Update emergency settings
     */
    function updateEmergencySettings(
        uint256 _pauseDelay,
        uint256 _unpauseDelay,
        uint256 _maxPauseDuration,
        bool _emergencyPauseEnabled
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_pauseDelay <= 24 hours, "Pause delay too long");
        require(_unpauseDelay <= 7 days, "Unpause delay too long");
        require(_maxPauseDuration <= 30 days, "Max pause duration too long");
        
        emergencySettings = EmergencySettings({
            pauseDelay: _pauseDelay,
            unpauseDelay: _unpauseDelay,
            maxPauseDuration: _maxPauseDuration,
            emergencyPauseEnabled: _emergencyPauseEnabled
        });
        
        emit EmergencySettingsUpdated(emergencySettings);
    }
    
    /**
     * @dev Get pause request details
     */
    function getPauseRequest(uint256 requestId) external view returns (
        address requester,
        uint256 requestTime,
        uint256 effectiveTime,
        bool isEmergency,
        bool executed,
        string memory reason
    ) {
        PauseRequest storage request = pauseRequests[requestId];
        return (
            request.requester,
            request.requestTime,
            request.effectiveTime,
            request.isEmergency,
            request.executed,
            request.reason
        );
    }
    
    /**
     * @dev Get unpause request details
     */
    function getUnpauseRequest(uint256 requestId) external view returns (
        address requester,
        uint256 requestTime,
        uint256 effectiveTime,
        bool executed,
        string memory reason
    ) {
        UnpauseRequest storage request = unpauseRequests[requestId];
        return (
            request.requester,
            request.requestTime,
            request.effectiveTime,
            request.executed,
            request.reason
        );
    }
    
    /**
     * @dev Check if pause can be executed
     */
    function canExecutePause(uint256 requestId) external view returns (bool) {
        PauseRequest storage request = pauseRequests[requestId];
        return !request.executed && 
               block.timestamp >= request.effectiveTime && 
               request.requester != address(0) &&
               !paused();
    }
    
    /**
     * @dev Check if unpause can be executed
     */
    function canExecuteUnpause(uint256 requestId) external view returns (bool) {
        UnpauseRequest storage request = unpauseRequests[requestId];
        return !request.executed && 
               block.timestamp >= request.effectiveTime && 
               request.requester != address(0) &&
               paused() &&
               block.timestamp <= pausedAt + emergencySettings.maxPauseDuration;
    }
    
    /**
     * @dev Get time remaining until pause can be executed
     */
    function timeUntilPauseExecution(uint256 requestId) external view returns (uint256) {
        PauseRequest storage request = pauseRequests[requestId];
        if (block.timestamp >= request.effectiveTime) return 0;
        return request.effectiveTime - block.timestamp;
    }
    
    /**
     * @dev Get time remaining until unpause can be executed
     */
    function timeUntilUnpauseExecution(uint256 requestId) external view returns (uint256) {
        UnpauseRequest storage request = unpauseRequests[requestId];
        if (block.timestamp >= request.effectiveTime) return 0;
        return request.effectiveTime - block.timestamp;
    }
    
    /**
     * @dev Check if contract has been paused too long
     */
    function isPausedTooLong() external view returns (bool) {
        if (!paused() || pausedAt == 0) return false;
        return block.timestamp > pausedAt + emergencySettings.maxPauseDuration;
    }
    
    /**
     * @dev Get time remaining before max pause duration exceeded
     */
    function timeUntilMaxPauseDuration() external view returns (uint256) {
        if (!paused() || pausedAt == 0) return 0;
        uint256 maxTime = pausedAt + emergencySettings.maxPauseDuration;
        if (block.timestamp >= maxTime) return 0;
        return maxTime - block.timestamp;
    }
    
    /**
     * @dev Cancel a pending pause request
     */
    function cancelPauseRequest(uint256 requestId) external {
        PauseRequest storage request = pauseRequests[requestId];
        
        // Only requester or admin can cancel
        require(
            msg.sender == request.requester || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized to cancel"
        );
        require(!request.executed, "Request already executed");
        require(request.requester != address(0), "Invalid request");
        
        delete pauseRequests[requestId];
    }
    
    /**
     * @dev Cancel a pending unpause request
     */
    function cancelUnpauseRequest(uint256 requestId) external {
        UnpauseRequest storage request = unpauseRequests[requestId];
        
        // Only requester or admin can cancel
        require(
            msg.sender == request.requester || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized to cancel"
        );
        require(!request.executed, "Request already executed");
        require(request.requester != address(0), "Invalid request");
        
        delete unpauseRequests[requestId];
    }
}