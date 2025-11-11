// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";

/**
 * @title UpgradeableProxy
 * @dev Base contract for upgradeable implementations using UUPS pattern
 */
abstract contract UpgradeableProxy is 
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable
{
    /// @dev Storage gap for future upgrades
    uint256[50] private __gap;

    // Events
    event UpgradeProposed(address indexed newImplementation, uint256 executeAfter);
    event UpgradeExecuted(address indexed newImplementation);
    event UpgradeCancelled(address indexed proposedImplementation);

    // Upgrade proposal structure
    struct UpgradeProposal {
        address newImplementation;
        uint256 proposedAt;
        uint256 executeAfter;
        bool executed;
        bool cancelled;
        string description;
    }

    // Current upgrade proposal
    UpgradeProposal public currentUpgradeProposal;
    
    // Upgrade timelock (24 hours by default)
    uint256 public upgradeTimelock;
    
    // Minimum timelock (1 hour)
    uint256 public constant MIN_TIMELOCK = 1 hours;
    
    // Maximum timelock (7 days)
    uint256 public constant MAX_TIMELOCK = 7 days;

    // Custom errors
    error UpgradeTimelockNotMet();
    error UpgradeProposalExists();
    error NoUpgradeProposal();
    error UpgradeAlreadyExecuted();
    error UpgradeAlreadyCancelled();
    error InvalidTimelock();
    error InvalidImplementation();

    modifier onlyValidUpgrade() {
        if (currentUpgradeProposal.newImplementation == address(0)) {
            revert NoUpgradeProposal();
        }
        if (currentUpgradeProposal.executed) {
            revert UpgradeAlreadyExecuted();
        }
        if (currentUpgradeProposal.cancelled) {
            revert UpgradeAlreadyCancelled();
        }
        if (block.timestamp < currentUpgradeProposal.executeAfter) {
            revert UpgradeTimelockNotMet();
        }
        _;
    }

    /**
     * @dev Initialize the upgradeable contract
     */
    function __UpgradeableProxy_init(address initialOwner, uint256 _upgradeTimelock) internal onlyInitializing {
        __Ownable_init(initialOwner);
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        if (_upgradeTimelock < MIN_TIMELOCK || _upgradeTimelock > MAX_TIMELOCK) {
            revert InvalidTimelock();
        }
        
        upgradeTimelock = _upgradeTimelock;
    }

    /**
     * @dev Propose an upgrade to a new implementation
     */
    function proposeUpgrade(
        address newImplementation,
        string calldata description
    ) external onlyOwner whenNotPaused {
        if (newImplementation == address(0)) {
            revert InvalidImplementation();
        }
        
        if (currentUpgradeProposal.newImplementation != address(0) && 
            !currentUpgradeProposal.executed && 
            !currentUpgradeProposal.cancelled) {
            revert UpgradeProposalExists();
        }

        uint256 executeAfter = block.timestamp + upgradeTimelock;
        
        currentUpgradeProposal = UpgradeProposal({
            newImplementation: newImplementation,
            proposedAt: block.timestamp,
            executeAfter: executeAfter,
            executed: false,
            cancelled: false,
            description: description
        });

        emit UpgradeProposed(newImplementation, executeAfter);
    }

    /**
     * @dev Execute a proposed upgrade
     */
    function executeUpgrade() external onlyOwner onlyValidUpgrade {
        address newImplementation = currentUpgradeProposal.newImplementation;
        currentUpgradeProposal.executed = true;

        upgradeToAndCall(newImplementation, "");

        emit UpgradeExecuted(newImplementation);
    }

    /**
     * @dev Cancel a proposed upgrade
     */
    function cancelUpgrade() external onlyOwner {
        if (currentUpgradeProposal.newImplementation == address(0)) {
            revert NoUpgradeProposal();
        }
        if (currentUpgradeProposal.executed) {
            revert UpgradeAlreadyExecuted();
        }
        if (currentUpgradeProposal.cancelled) {
            revert UpgradeAlreadyCancelled();
        }

        address proposedImplementation = currentUpgradeProposal.newImplementation;
        currentUpgradeProposal.cancelled = true;
        
        emit UpgradeCancelled(proposedImplementation);
    }

    /**
     * @dev Change the upgrade timelock
     */
    function setUpgradeTimelock(uint256 newTimelock) external onlyOwner {
        if (newTimelock < MIN_TIMELOCK || newTimelock > MAX_TIMELOCK) {
            revert InvalidTimelock();
        }
        
        upgradeTimelock = newTimelock;
    }

    /**
     * @dev Get time remaining until upgrade can be executed
     */
    function timeUntilUpgrade() external view returns (uint256) {
        if (currentUpgradeProposal.newImplementation == address(0) ||
            currentUpgradeProposal.executed ||
            currentUpgradeProposal.cancelled) {
            return 0;
        }
        
        if (block.timestamp >= currentUpgradeProposal.executeAfter) {
            return 0;
        }
        
        return currentUpgradeProposal.executeAfter - block.timestamp;
    }

    /**
     * @dev Check if an upgrade can be executed
     */
    function canExecuteUpgrade() external view returns (bool) {
        return currentUpgradeProposal.newImplementation != address(0) &&
               !currentUpgradeProposal.executed &&
               !currentUpgradeProposal.cancelled &&
               block.timestamp >= currentUpgradeProposal.executeAfter;
    }

    /**
     * @dev Emergency pause function
     */
    function emergencyPause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause function
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Required by UUPSUpgradeable
     */
    function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {
        // Additional authorization logic can be added here
        // For now, only owner can authorize upgrades
    }

    /**
     * @dev Get current implementation address
     */
    function getImplementation() external view returns (address) {
        return ERC1967Utils.getImplementation();
    }

    /**
     * @dev Get upgrade proposal details
     */
    function getUpgradeProposal() external view returns (
        address newImplementation,
        uint256 proposedAt,
        uint256 executeAfter,
        bool executed,
        bool cancelled,
        string memory description
    ) {
        UpgradeProposal memory proposal = currentUpgradeProposal;
        return (
            proposal.newImplementation,
            proposal.proposedAt,
            proposal.executeAfter,
            proposal.executed,
            proposal.cancelled,
            proposal.description
        );
    }
}