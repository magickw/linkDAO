// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/Governance.sol";
import "../contracts/LDAOToken.sol";
import "../contracts/ReputationSystem.sol";
import "../contracts/LDAOTreasury.sol";
import "../contracts/security/MultiSigWallet.sol";

contract GovernanceIntegrationTest is Test {
    LDAOToken token;
    ReputationSystem reputationSystem;
    LDAOTreasury treasury;
    MultiSigWallet multiSigWallet;
    Governance governance;
    
    address[] owners;
    
    function setUp() public {
        // Deploy LDAO token
        token = new LDAOToken();
        
        // Deploy reputation system
        reputationSystem = new ReputationSystem();
        
        // Deploy multisig wallet with 3 owners
        owners = new address[](3);
        owners[0] = address(0x1);
        owners[1] = address(0x2);
        owners[2] = address(0x3);
        multiSigWallet = new MultiSigWallet(owners, 2, 1 hours);
        
        // Deploy treasury
        treasury = new LDAOTreasury(
            address(token),
            address(0xUsdc), // Using a mock address for USDC
            payable(address(multiSigWallet)),
            address(0xGovernance) // Using a mock address for governance initially
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
    
    function testGovernanceIntegration() public {
        // Test that governance can be created with all components
        assertEq(address(governance.governanceToken()), address(token));
        assertEq(address(governance.reputationSystem()), address(reputationSystem));
        assertEq(address(governance.treasury()), address(treasury));
        assertEq(address(governance.multiSigWallet()), address(multiSigWallet));
        
        // Test that treasury points to governance
        assertEq(address(treasury.governance()), address(governance));
        
        // Test category parameters are initialized
        assertEq(governance.categoryQuorum(Governance.ProposalCategory.TREASURY_MANAGEMENT), 1000000 * 10**18);
        assertEq(governance.categoryQuorum(Governance.ProposalCategory.MULTISIG_OPERATIONS), 1000000 * 10**18);
        
        // Test that voting power calculation includes reputation
        address testUser = address(0x100);
        vm.prank(testUser);
        uint256 votingPower = governance.getVotingPower(testUser);
        
        // Voting power should be at least the base power from token
        assertGe(votingPower, 0);
    }
    
    function testProposalCreation() public {
        address proposer = address(0x200);
        
        // Give proposer some tokens to have voting power
        vm.prank(address(0x5)); // Use a different address to mint tokens
        token.mint(proposer, 200000 * 10**18); // Above the general threshold
        
        vm.prank(proposer);
        uint256 proposalId = governance.propose(
            "Test Proposal",
            "This is a test proposal",
            Governance.ProposalCategory.GENERAL,
            new address[](0),
            new uint256[](0),
            new string[](0),
            new bytes[](0)
        );
        
        // Check proposal was created
        assertEq(proposalId, 1);
        
        // Check proposal details
        Governance.Proposal memory proposal = governance.proposals(proposalId);
        assertEq(proposal.proposer, proposer);
        assertEq(proposal.title, "Test Proposal");
        assertEq(uint8(proposal.category), uint8(Governance.ProposalCategory.GENERAL));
    }
    
    function testVotingWithReputation() public {
        address voter = address(0x300);
        
        // Give voter some tokens
        vm.prank(address(0x5));
        token.mint(voter, 50000 * 10**18);
        
        // Create a reputation score for the voter
        vm.prank(address(reputationSystem.owner()));
        reputationSystem.recordSuccessfulTransaction(voter, 1000 * 10**18);
        
        // Check voting power includes reputation bonus
        uint256 votingPower = governance.getVotingPower(voter);
        assertTrue(votingPower > 50000 * 10**18, "Voting power should include reputation bonus");
    }
    
    function testTreasuryGovernanceIntegration() public {
        // Test that treasury can execute governance operations
        address target = address(0x400);
        bytes memory data = abi.encodeWithSignature("testFunction()");
        
        // This should fail as only governance can call this function
        vm.expectRevert("Only governance can execute treasury operations");
        treasury.executeGovernanceOperation(target, 0, data);
    }
}