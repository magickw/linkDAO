// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./LDAOTreasuryOptimized.sol";
import "./LDAOToken.sol";

/**
 * @title CharityGovernance
 * @notice Separate contract for charity governance to keep treasury optimized
 */
contract CharityGovernance is Ownable, ReentrancyGuard {
    LDAOTreasuryOptimized public immutable treasury;
    LDAOToken public immutable ldaoToken;
    
    struct CharityProposal {
        address charity;
        uint256 amount;
        string description;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 deadline;
        bool executed;
        mapping(address => bool) hasVoted;
    }
    
    mapping(uint256 => CharityProposal) public proposals;
    mapping(address => bool) public verifiedCharities;
    uint256 public nextProposalId;
    uint256 public votingPeriod = 7 days;
    uint256 public quorum = 1000000 * 1e18; // 1M LDAO
    
    event ProposalCreated(uint256 indexed id, address charity, uint256 amount);
    event VoteCast(uint256 indexed id, address voter, bool support);
    event ProposalExecuted(uint256 indexed id, bool passed);
    
    constructor(address _treasury, address _ldaoToken) Ownable(msg.sender) {
        treasury = LDAOTreasuryOptimized(_treasury);
        ldaoToken = LDAOToken(_ldaoToken);
    }
    
    function createProposal(
        address charity,
        uint256 amount,
        string calldata description
    ) external returns (uint256) {
        require(verifiedCharities[charity], "Charity not verified");
        
        uint256 id = nextProposalId++;
        CharityProposal storage proposal = proposals[id];
        proposal.charity = charity;
        proposal.amount = amount;
        proposal.description = description;
        proposal.deadline = block.timestamp + votingPeriod;
        
        emit ProposalCreated(id, charity, amount);
        return id;
    }
    
    function vote(uint256 proposalId, bool support) external {
        CharityProposal storage proposal = proposals[proposalId];
        require(block.timestamp < proposal.deadline, "Voting ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        
        uint256 votingPower = ldaoToken.balanceOf(msg.sender);
        require(votingPower > 0, "No voting power");
        
        proposal.hasVoted[msg.sender] = true;
        
        if (support) {
            proposal.votesFor += votingPower;
        } else {
            proposal.votesAgainst += votingPower;
        }
        
        emit VoteCast(proposalId, msg.sender, support);
    }
    
    function executeProposal(uint256 proposalId) external {
        CharityProposal storage proposal = proposals[proposalId];
        require(block.timestamp >= proposal.deadline, "Voting active");
        require(!proposal.executed, "Already executed");
        
        uint256 totalVotes = proposal.votesFor + proposal.votesAgainst;
        require(totalVotes >= quorum, "Quorum not met");
        
        bool passed = proposal.votesFor > proposal.votesAgainst;
        proposal.executed = true;
        
        if (passed) {
            // In a real implementation, this would trigger a withdrawal from treasury
            // through timelock or governance mechanism
        }
        
        emit ProposalExecuted(proposalId, passed);
    }
    
    function verifyCharity(address charity) external onlyOwner {
        verifiedCharities[charity] = true;
    }
}