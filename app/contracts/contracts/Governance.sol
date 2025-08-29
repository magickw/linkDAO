// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./LDAOToken.sol";

/**
 * @title Governance
 * @notice Enhanced DAO governance contract with staking integration and marketplace-specific features
 */
contract Governance is Ownable, ReentrancyGuard {
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
        uint256 abstainVotes;
        uint256 quorum;
        ProposalState state;
        ProposalCategory category;
        address[] targets;
        uint256[] values;
        string[] signatures;
        bytes[] calldatas;
        uint256 executionDelay; // Delay before execution (for security)
        uint256 queuedAt; // When proposal was queued
        bool requiresStaking; // Whether proposal requires staking to vote
        uint256 minStakeToVote; // Minimum stake required to vote
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
    
    // Proposal categories for marketplace governance
    enum ProposalCategory {
        GENERAL,
        MARKETPLACE_POLICY,
        FEE_STRUCTURE,
        REPUTATION_SYSTEM,
        SECURITY_UPGRADE,
        TOKEN_ECONOMICS
    }
    
    // Vote structure
    struct Receipt {
        bool hasVoted;
        uint8 support; // 0 = against, 1 = for, 2 = abstain
        uint256 votes;
        uint256 stakingPower; // Additional voting power from staking
    }
    
    // Mapping of proposals
    mapping(uint256 => Proposal) public proposals;
    
    // Mapping of votes per proposal
    mapping(uint256 => mapping(address => Receipt)) public proposalVotes;
    
    // Mapping of user voting power
    mapping(address => uint256) public votingPower;
    
    // Mapping of delegates
    mapping(address => address) public delegates;
    mapping(address => uint256) public delegatedVotes;
    
    // Governance parameters
    uint256 public proposalCount;
    uint256 public votingDelay; // Delay before voting starts (in blocks)
    uint256 public votingPeriod; // Voting duration (in blocks)
    uint256 public quorumVotes; // Minimum votes required
    uint256 public proposalThreshold; // Minimum votes to create proposal
    uint256 public executionDelay = 2 days; // Default execution delay
    
    // Category-specific parameters
    mapping(ProposalCategory => uint256) public categoryQuorum;
    mapping(ProposalCategory => uint256) public categoryThreshold;
    mapping(ProposalCategory => bool) public categoryRequiresStaking;
    
    // Token used for governance
    LDAOToken public governanceToken;
    
    // Events
    event ProposalCreated(
        uint256 id,
        address proposer,
        string title,
        string description,
        uint256 startBlock,
        uint256 endBlock
    );
    
    event VoteCast(address voter, uint256 proposalId, uint8 support, uint256 votes, string reason);
    event ProposalCanceled(uint256 id);
    event ProposalExecuted(uint256 id);
    event ProposalQueued(uint256 id, uint256 executionTime);
    event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate);
    event DelegateVotesChanged(address indexed delegate, uint256 previousBalance, uint256 newBalance);
    event CategoryParametersUpdated(ProposalCategory category, uint256 quorum, uint256 threshold, bool requiresStaking);
    
    constructor(address _governanceToken) {
        require(_governanceToken != address(0), "Invalid token address");
        governanceToken = LDAOToken(_governanceToken);
        
        // Default parameters
        votingDelay = 1 days / 12; // ~1 day in blocks (assuming 12s blocks)
        votingPeriod = 3 days / 12; // ~3 days in blocks
        quorumVotes = 100000 * 10**18; // 100k tokens
        proposalThreshold = 10000 * 10**18; // 10k tokens
        
        // Initialize category-specific parameters
        _initializeCategoryParameters();
    }
    
    /**
     * @dev Create a new proposal with category
     * @param title Proposal title
     * @param description Proposal description
     * @param category Proposal category
     * @param targets Target addresses for execution
     * @param values ETH values to send
     * @param signatures Function signatures to call
     * @param calldatas Calldata for function calls
     */
    function propose(
        string memory title,
        string memory description,
        ProposalCategory category,
        address[] memory targets,
        uint256[] memory values,
        string[] memory signatures,
        bytes[] memory calldatas
    ) external returns (uint256) {
        // Check proposer has enough voting power (including staking power)
        uint256 proposerVotingPower = _getVotingPower(msg.sender);
        uint256 requiredThreshold = categoryThreshold[category] > 0 ? 
            categoryThreshold[category] : proposalThreshold;
        
        require(proposerVotingPower >= requiredThreshold, "Insufficient voting power to propose");
        
        proposalCount++;
        uint256 proposalId = proposalCount;
        uint256 startBlock = block.number + votingDelay;
        uint256 endBlock = startBlock + votingPeriod;
        
        // Determine quorum and staking requirements based on category
        uint256 proposalQuorum = categoryQuorum[category] > 0 ? 
            categoryQuorum[category] : quorumVotes;
        bool requiresStaking = categoryRequiresStaking[category];
        uint256 minStakeToVote = requiresStaking ? 1000 * 10**18 : 0; // 1000 tokens minimum
        
        Proposal storage newProposal = proposals[proposalId];
        newProposal.id = proposalId;
        newProposal.proposer = msg.sender;
        newProposal.title = title;
        newProposal.description = description;
        newProposal.startBlock = startBlock;
        newProposal.endBlock = endBlock;
        newProposal.state = ProposalState.Pending;
        newProposal.category = category;
        newProposal.targets = targets;
        newProposal.values = values;
        newProposal.signatures = signatures;
        newProposal.calldatas = calldatas;
        newProposal.quorum = proposalQuorum;
        newProposal.executionDelay = executionDelay;
        newProposal.requiresStaking = requiresStaking;
        newProposal.minStakeToVote = minStakeToVote;
        
        emit ProposalCreated(proposalId, msg.sender, title, description, startBlock, endBlock);
        
        return proposalId;
    }
    
    /**
     * @dev Create a simple proposal (backward compatibility)
     */
    function propose(
        string memory title,
        string memory description,
        address[] memory targets,
        uint256[] memory values,
        string[] memory signatures,
        bytes[] memory calldatas
    ) external returns (uint256) {
        return propose(title, description, ProposalCategory.GENERAL, targets, values, signatures, calldatas);
    }
    
    /**
     * @dev Cast a vote on a proposal with enhanced voting power
     * @param proposalId Proposal ID
     * @param support Vote support (0 = against, 1 = for, 2 = abstain)
     * @param reason Optional reason for voting
     */
    function castVote(uint256 proposalId, uint8 support, string memory reason) external nonReentrant {
        require(support <= 2, "Invalid vote type");
        
        Proposal storage proposal = proposals[proposalId];
        require(
            block.number >= proposal.startBlock && block.number <= proposal.endBlock,
            "Voting not active"
        );
        require(proposal.state == ProposalState.Active || proposal.state == ProposalState.Pending, "Invalid proposal state");
        
        // Check staking requirements
        if (proposal.requiresStaking) {
            require(
                governanceToken.totalStaked(msg.sender) >= proposal.minStakeToVote,
                "Insufficient staking to vote on this proposal"
            );
        }
        
        // Update proposal state if it's pending
        if (proposal.state == ProposalState.Pending) {
            proposal.state = ProposalState.Active;
        }
        
        // Calculate total voting power (tokens + staking bonus)
        uint256 votes = _getVotingPower(msg.sender);
        require(votes > 0, "No voting power");
        require(!proposalVotes[proposalId][msg.sender].hasVoted, "Already voted");
        
        // Get staking power for additional weight
        uint256 stakingPower = governanceToken.totalStaked(msg.sender);
        
        proposalVotes[proposalId][msg.sender] = Receipt({
            hasVoted: true,
            support: support,
            votes: votes,
            stakingPower: stakingPower
        });
        
        // Update vote counts
        if (support == 1) {
            proposal.forVotes += votes;
        } else if (support == 0) {
            proposal.againstVotes += votes;
        } else {
            proposal.abstainVotes += votes;
        }
        
        emit VoteCast(msg.sender, proposalId, support, votes, reason);
    }
    
    /**
     * @dev Cast a vote (backward compatibility)
     */
    function castVote(uint256 proposalId, bool support, string memory reason) external {
        castVote(proposalId, support ? 1 : 0, reason);
    }
    
    /**
     * @dev Delegate voting power to another address
     * @param delegatee Address to delegate to
     */
    function delegate(address delegatee) external {
        address currentDelegate = delegates[msg.sender];
        uint256 delegatorBalance = _getVotingPower(msg.sender);
        
        delegates[msg.sender] = delegatee;
        
        emit DelegateChanged(msg.sender, currentDelegate, delegatee);
        
        _moveDelegates(currentDelegate, delegatee, delegatorBalance);
    }
    
    /**
     * @dev Queue a successful proposal for execution
     * @param proposalId Proposal ID
     */
    function queue(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(state(proposalId) == ProposalState.Succeeded, "Proposal not succeeded");
        
        uint256 executionTime = block.timestamp + proposal.executionDelay;
        proposal.queuedAt = executionTime;
        proposal.state = ProposalState.Queued;
        
        emit ProposalQueued(proposalId, executionTime);
    }
    
    /**
     * @dev Execute a proposal
     * @param proposalId Proposal ID
     */
    function execute(uint256 proposalId) external nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.state == ProposalState.Queued, "Proposal not queued");
        require(block.timestamp >= proposal.queuedAt, "Execution delay not met");
        
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
    
    /**
     * @dev Set execution delay
     * @param newExecutionDelay New execution delay in seconds
     */
    function setExecutionDelay(uint256 newExecutionDelay) external onlyOwner {
        executionDelay = newExecutionDelay;
    }
    
    /**
     * @dev Set category-specific parameters
     * @param category Proposal category
     * @param quorum Quorum for this category
     * @param threshold Proposal threshold for this category
     * @param requiresStaking Whether staking is required for voting
     */
    function setCategoryParameters(
        ProposalCategory category,
        uint256 quorum,
        uint256 threshold,
        bool requiresStaking
    ) external onlyOwner {
        categoryQuorum[category] = quorum;
        categoryThreshold[category] = threshold;
        categoryRequiresStaking[category] = requiresStaking;
        
        emit CategoryParametersUpdated(category, quorum, threshold, requiresStaking);
    }
    
    /**
     * @dev Get voting power including staking bonus
     * @param account Address to check
     * @return Total voting power
     */
    function getVotingPower(address account) external view returns (uint256) {
        return _getVotingPower(account);
    }
    
    /**
     * @dev Get proposal details
     * @param proposalId Proposal ID
     * @return Proposal struct
     */
    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }
    
    /**
     * @dev Get vote receipt for a proposal
     * @param proposalId Proposal ID
     * @param voter Voter address
     * @return Vote receipt
     */
    function getReceipt(uint256 proposalId, address voter) external view returns (Receipt memory) {
        return proposalVotes[proposalId][voter];
    }
    
    /**
     * @dev Internal function to get voting power
     */
    function _getVotingPower(address account) internal view returns (uint256) {
        // Use the enhanced voting power from the token contract
        return governanceToken.votingPower(account);
    }
    
    /**
     * @dev Internal function to move delegate votes
     */
    function _moveDelegates(address srcRep, address dstRep, uint256 amount) internal {
        if (srcRep != dstRep && amount > 0) {
            if (srcRep != address(0)) {
                uint256 srcRepOld = delegatedVotes[srcRep];
                uint256 srcRepNew = srcRepOld - amount;
                delegatedVotes[srcRep] = srcRepNew;
                
                emit DelegateVotesChanged(srcRep, srcRepOld, srcRepNew);
            }
            
            if (dstRep != address(0)) {
                uint256 dstRepOld = delegatedVotes[dstRep];
                uint256 dstRepNew = dstRepOld + amount;
                delegatedVotes[dstRep] = dstRepNew;
                
                emit DelegateVotesChanged(dstRep, dstRepOld, dstRepNew);
            }
        }
    }
    
    /**
     * @dev Initialize category-specific parameters
     */
    function _initializeCategoryParameters() internal {
        // MARKETPLACE_POLICY: Higher quorum, requires staking
        categoryQuorum[ProposalCategory.MARKETPLACE_POLICY] = 200000 * 10**18; // 200k tokens
        categoryThreshold[ProposalCategory.MARKETPLACE_POLICY] = 25000 * 10**18; // 25k tokens
        categoryRequiresStaking[ProposalCategory.MARKETPLACE_POLICY] = true;
        
        // FEE_STRUCTURE: Very high quorum, requires staking
        categoryQuorum[ProposalCategory.FEE_STRUCTURE] = 500000 * 10**18; // 500k tokens
        categoryThreshold[ProposalCategory.FEE_STRUCTURE] = 50000 * 10**18; // 50k tokens
        categoryRequiresStaking[ProposalCategory.FEE_STRUCTURE] = true;
        
        // SECURITY_UPGRADE: Highest quorum, requires staking
        categoryQuorum[ProposalCategory.SECURITY_UPGRADE] = 750000 * 10**18; // 750k tokens
        categoryThreshold[ProposalCategory.SECURITY_UPGRADE] = 100000 * 10**18; // 100k tokens
        categoryRequiresStaking[ProposalCategory.SECURITY_UPGRADE] = true;
        
        // TOKEN_ECONOMICS: Highest quorum, requires staking
        categoryQuorum[ProposalCategory.TOKEN_ECONOMICS] = 750000 * 10**18; // 750k tokens
        categoryThreshold[ProposalCategory.TOKEN_ECONOMICS] = 100000 * 10**18; // 100k tokens
        categoryRequiresStaking[ProposalCategory.TOKEN_ECONOMICS] = true;
        
        // REPUTATION_SYSTEM: Medium quorum, requires staking
        categoryQuorum[ProposalCategory.REPUTATION_SYSTEM] = 300000 * 10**18; // 300k tokens
        categoryThreshold[ProposalCategory.REPUTATION_SYSTEM] = 30000 * 10**18; // 30k tokens
        categoryRequiresStaking[ProposalCategory.REPUTATION_SYSTEM] = true;
        
        // GENERAL: Use default parameters, no staking required
        categoryRequiresStaking[ProposalCategory.GENERAL] = false;
    }
}