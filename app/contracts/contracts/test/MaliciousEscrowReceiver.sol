// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MaliciousEscrowReceiver
 * @notice Test contract that attempts reentrancy attacks on EnhancedEscrow
 */
contract MaliciousEscrowReceiver {
    address public escrowContract;
    uint256 public attackCount;
    uint256 public receivedCount;
    uint256 public bondReceivedCount;
    bool public attacking;

    constructor(address _escrowContract) {
        escrowContract = _escrowContract;
        attacking = false;
    }

    /**
     * @notice Receive ETH and attempt reentrancy
     */
    receive() external payable {
        receivedCount++;
        
        // Attempt reentrancy only on first call
        if (attacking && attackCount == 0) {
            attackCount++;
            // Try to call confirmDelivery again (should fail)
            try IEnhancedEscrow(escrowContract).confirmDelivery(0, "Reentrancy attempt") {
                // If this succeeds, the contract is vulnerable
                revert("REENTRANCY_SUCCESSFUL");
            } catch {
                // Expected to fail - reentrancy prevented
            }
        }
    }

    /**
     * @notice Enable attacking mode
     */
    function enableAttack() external {
        attacking = true;
    }

    /**
     * @notice Disable attacking mode
     */
    function disableAttack() external {
        attacking = false;
    }

    /**
     * @notice Open dispute with bond (for testing bond reentrancy)
     */
    function openDisputeWithBond(uint256 escrowId) external payable {
        bondReceivedCount++;
        IEnhancedEscrow(escrowContract).openDispute{value: msg.value}(escrowId);
    }

    /**
     * @notice Helper to create escrow and lock funds
     */
    function createEscrowAndLockFunds(
        address seller, 
        address tokenAddress, 
        uint256 amount, 
        uint256 deliveryDeadline,
        uint8 resolutionMethod,
        uint256 totalAmount
    ) external payable returns (uint256) {
        uint256 escrowId = IEnhancedEscrow(escrowContract).createEscrow(
            1, // listingId
            seller,
            tokenAddress,
            amount,
            deliveryDeadline,
            resolutionMethod
        );
        
        IEnhancedEscrow(escrowContract).lockFunds{value: totalAmount}(escrowId);
        return escrowId;
    }

    /**
     * @notice Reset counters
     */
    function reset() external {
        attackCount = 0;
        receivedCount = 0;
        bondReceivedCount = 0;
        attacking = false;
    }
}

/**
 * @notice Minimal interface for testing
 */
interface IEnhancedEscrow {
    function confirmDelivery(uint256 escrowId, string memory deliveryInfo) external;
    function openDispute(uint256 escrowId) external payable;
    function createEscrow(
        uint256 listingId,
        address seller,
        address tokenAddress,
        uint256 amount,
        uint256 deliveryDeadline,
        uint8 resolutionMethod
    ) external returns (uint256);
    function lockFunds(uint256 escrowId) external payable;
}
