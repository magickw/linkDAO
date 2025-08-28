// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Governance is Ownable {
    // Proposal structure
    struct Proposal {
        uint256 id;
        address proposer;
        string title;
        string description;
        uint256 startBlock;
        uint256 endBlock;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 quorum;
        ProposalState state;
        address[] targets;
        uint256[] values;
        string[] signatures;
        bytes[] calldatas;
    }
    
    // Possible proposal states
    enum ProposalState {
        Pending,
        Active,
        Canceled,
        Defeated,
        Succeeded,
        Queued,
        Expired,
        Executed
    }
    
    // Vote structure
    struct Receipt {
        bool hasVoted;
        bool support;
        uint256 votes;
    }
    
    // Mapping of proposals
    mapping(uint256 => Proposal) public proposals;
    
    // Mapping of votes per proposal
    mapping(uint256 => mapping(address => Receipt)) public proposalVotes;
    
    // Mapping of user voting power
    mapping(address => uint256) public votingPower;
    
    // Governance parameters
    uint256 public proposalCount;
    uint256 public votingDelay; // Delay before voting starts (in blocks)
    uint256 public votingPeriod; // Voting duration (in blocks)
    uint256 public quorumVotes; // Minimum votes required
    uint256 public proposalThreshold; // Minimum votes to create proposal
    
    // Token used for governance
    IERC20 public governanceToken;
    
    // Events
    event ProposalCreated(
        uint256 id,
        address proposer,
        string title,
        string description,
        uint256 startBlock,
        uint256 endBlock
    );
    
    event VoteCast(address voter, uint256 proposalId, bool support, uint256 votes, string reason);
    event ProposalCanceled(uint256 id);
    event ProposalExecuted(uint256 id);
    
    constructor(
        address _governanceToken,
        uint256 _votingDelay,
        uint256 _votingPeriod,
        uint256 _quorumVotes,
        uint256 _proposalThreshold
    ) {
        require(_governanceToken != address(0), "Invalid token address");
        governanceToken = IERC20(_governanceToken);
        votingDelay = _votingDelay;
        votingPeriod = _votingPeriod;
        quorumVotes = _quorumVotes;
        proposalThreshold = _proposalThreshold;
    }
    
    /**
     * @dev Create a new proposal
     * @param title Proposal title
     * @param description Proposal description
     * @param targets Target addresses for execution
     * @param values ETH values to send
     * @param signatures Function signatures to call
     * @param calldatas Calldata for function calls
     */
    function propose(
        string memory title,
        string memory description,
        address[] memory targets,
        uint256[] memory values,
        string[] memory signatures,
        bytes[] memory calldatas
    ) external returns (uint256) {
        require(
            governanceToken.balanceOf(msg.sender) >= proposalThreshold,
            "Insufficient voting power to propose"
        );
        
        proposalCount++;
        uint256 proposalId = proposalCount;
        uint256 startBlock = block.number + votingDelay;
        uint256 endBlock = startBlock + votingPeriod;
        
        Proposal storage newProposal = proposals[proposalId];
        newProposal.id = proposalId;
        newProposal.proposer = msg.sender;
        newProposal.title = title;
        newProposal.description = description;
        newProposal.startBlock = startBlock;
        newProposal.endBlock = endBlock;
        newProposal.state = ProposalState.Pending;
        newProposal.targets = targets;
        newProposal.values = values;
        newProposal.signatures = signatures;
        newProposal.calldatas = calldatas;
        newProposal.quorum = quorumVotes;
        
        emit ProposalCreated(proposalId, msg.sender, title, description, startBlock, endBlock);
        
        return proposalId;
    }
    
    /**
     * @dev Cast a vote on a proposal
     * @param proposalId Proposal ID
     * @param support Vote support (true for yes, false for no)
     * @param reason Optional reason for voting
     */
    function castVote(uint256 proposalId, bool support, string memory reason) external {
        Proposal storage proposal = proposals[proposalId];
        require(
            block.number >= proposal.startBlock && block.number <= proposal.endBlock,
            "Voting not active"
        );
        require(proposal.state == ProposalState.Active || proposal.state == ProposalState.Pending, "Invalid proposal state");
        
        // Update proposal state if it's pending
        if (proposal.state == ProposalState.Pending) {
            proposal.state = ProposalState.Active;
        }
        
        uint256 votes = governanceToken.balanceOf(msg.sender);
        require(votes > 0, "No voting power");
        require(!proposalVotes[proposalId][msg.sender].hasVoted, "Already voted");
        
        proposalVotes[proposalId][msg.sender] = Receipt({
            hasVoted: true,
            support: support,
            votes: votes
        });
        
        if (support) {
            proposal.forVotes += votes;
        } else {
            proposal.againstVotes += votes;
        }
        
        emit VoteCast(msg.sender, proposalId, support, votes, reason);
    }
    
    /**
     * @dev Execute a proposal
     * @param proposalId Proposal ID
     */
    function execute(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.state == ProposalState.Succeeded || proposal.state == ProposalState.Queued, "Proposal not executable");
        
        // Check if quorum is met
        require(
            proposal.forVotes >= proposal.quorum,
            "Quorum not reached"
        );
        
        // Check if proposal passed
        require(
            proposal.forVotes > proposal.againstVotes,
            "Proposal failed"
        );
        
        // Execute proposal
        for (uint256 i = 0; i < proposal.targets.length; i++) {
            // Execute the transaction
            (bool success, ) = proposal.targets[i].call{value: proposal.values[i]}(
                abi.encodePacked(
                    bytes4(keccak256(bytes(proposal.signatures[i]))),
                    proposal.calldatas[i]
                )
            );
            
            require(success, "Transaction failed");
        }
        
        proposal.state = ProposalState.Executed;
        emit ProposalExecuted(proposalId);
    }
    
    /**
     * @dev Cancel a proposal
     * @param proposalId Proposal ID
     */
    function cancel(uint256 proposalId) external onlyOwner {
        Proposal storage proposal = proposals[proposalId];
        require(
            proposal.state == ProposalState.Pending || proposal.state == ProposalState.Active,
            "Proposal not active"
        );
        
        proposal.state = ProposalState.Canceled;
        emit ProposalCanceled(proposalId);
    }
    
    /**
     * @dev Get the state of a proposal
     * @param proposalId Proposal ID
     * @return ProposalState Current state of the proposal
     */
    function state(uint256 proposalId) public view returns (ProposalState) {
        Proposal storage proposal = proposals[proposalId];
        
        if (proposal.state == ProposalState.Canceled) {
            return ProposalState.Canceled;
        } else if (block.number < proposal.startBlock) {
            return ProposalState.Pending;
        } else if (block.number <= proposal.endBlock) {
            return ProposalState.Active;
        } else if (proposal.forVotes <= proposal.againstVotes || proposal.forVotes < proposal.quorum) {
            return ProposalState.Defeated;
        } else if (proposal.state == ProposalState.Succeeded) {
            return ProposalState.Succeeded;
        } else if (proposal.state == ProposalState.Queued) {
            return ProposalState.Queued;
        } else if (proposal.state == ProposalState.Executed) {
            return ProposalState.Executed;
        } else {
            return ProposalState.Succeeded;
        }
    }
    
    /**
     * @dev Set voting delay
     * @param newVotingDelay New voting delay in blocks
     */
    function setVotingDelay(uint256 newVotingDelay) external onlyOwner {
        votingDelay = newVotingDelay;
    }
    
    /**
     * @dev Set voting period
     * @param newVotingPeriod New voting period in blocks
     */
    function setVotingPeriod(uint256 newVotingPeriod) external onlyOwner {
        votingPeriod = newVotingPeriod;
    }
    
    /**
     * @dev Set quorum votes
     * @param newQuorumVotes New quorum votes
     */
    function setQuorumVotes(uint256 newQuorumVotes) external onlyOwner {
        quorumVotes = newQuorumVotes;
    }
    
    /**
     * @dev Set proposal threshold
     * @param newProposalThreshold New proposal threshold
     */
    function setProposalThreshold(uint256 newProposalThreshold) external onlyOwner {
        proposalThreshold = newProposalThreshold;
    }
}