// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/Governance.sol";
import "../contracts/LDAOToken.sol";
import "../contracts/ReputationSystem.sol";
import "../contracts/LDAOTreasury.sol";
import "../contracts/security/MultiSigWallet.sol";

contract MultisigIntegrationTest is Test {
    LDAOToken token;
    ReputationSystem reputationSystem;
    LDAOTreasury treasury;
    MultiSigWallet multiSigWallet;
    Governance governance;
    
    address[] owners;
    address owner1 = address(0x1);
    address owner2 = address(0x2);
    address owner3 = address(0x3);
    
    function setUp() public {
        // Deploy LDAO token
        token = new LDAOToken();
        
        // Deploy reputation system
        reputationSystem = new ReputationSystem();
        
        // Deploy multisig wallet with 3 owners
        owners = new address[](3);
        owners[0] = owner1;
        owners[1] = owner2;
        owners[2] = owner3;
        multiSigWallet = new MultiSigWallet(owners, 2, 1 hours);
        
        // Deploy treasury
        treasury = new LDAOTreasury(
            address(token),
            address(0xUsdc), // Using a mock address for USDC
            payable(address(multiSigWallet)),
            address(governance) // This will be updated after governance is deployed
        );
        
        // Deploy governance contract
        governance = new Governance(
            address(token),
            address(reputationSystem),
            address(treasury),
            address(multiSigWallet)
        );
        
        // Update treasury to point to the actual governance contract
        treasury.updateGovernance(address(governance));
    }
    
    function testMultisigTransactionCreation() public {
        // Test that governance can create multisig transactions
        address target = address(0x500);
        bytes memory data = abi.encodeWithSignature("testFunction()");
        
        vm.prank(owner1);
        uint256 transactionId = governance.createMultisigTransaction(
            target,
            1 ether,
            data,
            "Test multisig transaction"
        );
        
        // Check transaction was created
        assertEq(transactionId, 0);
        
        // Check transaction details
        (
            address txTarget,
            uint256 value,
            bytes memory txData,
            bool executed,
            uint256 confirmations,
            uint256 createdAt,
            uint256 executeAfter,
            string memory description
        ) = multiSigWallet.getTransaction(0);
        
        assertEq(txTarget, target);
        assertEq(value, 1 ether);
        assertEq(keccak256(txData), keccak256(data));
        assertFalse(executed);
        assertEq(confirmations, 1); // Auto-confirmed by submitter
        assertEq(description, "Test multisig transaction");
    }
    
    function testGovernanceProposalWithMultisig() public {
        // Test creating a governance proposal that requires multisig execution
        address proposer = address(0x600);
        
        // Give proposer enough tokens to create a treasury management proposal
        vm.prank(address(0x5));
        token.mint(proposer, 200000 * 10**18);
        
        // Create targets and data for treasury operation
        address[] memory targets = new address[](1);
        targets[0] = address(treasury);
        
        uint256[] memory values = new uint256[](1);
        values[0] = 0;
        
        string[] memory signatures = new string[](1);
        signatures[0] = "testFunction";
        
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encode();
        
        // Create proposal
        vm.prank(proposer);
        uint256 proposalId = governance.propose(
            "Treasury Management Proposal",
            "This proposal manages treasury operations",
            Governance.ProposalCategory.TREASURY_MANAGEMENT,
            targets,
            values,
            signatures,
            calldatas
        );
        
        // Check proposal was created
        assertEq(proposalId, 1);
    }
}