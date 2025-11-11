// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../LDAOToken.sol";
import "../LDAOTreasury.sol";
import "../ReputationSystem.sol";

/**
 * @title CharityGovernance
 * @notice Enhanced DAO governance contract with charity-specific proposal types and donation mechanisms
 */
contract CharityGovernance is Ownable, ReentrancyGuard {
    // Import the existing ProposalState from Governance
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
    
    // Extended proposal categories including charity-specific ones
    enum ProposalCategory {
        GENERAL,
        MARKETPLACE_POLICY,
        FEE_STRUCTURE,
        REPUTATION_SYSTEM,
        SECURITY_UPGRADE,
        TOKEN_ECONOMICS,
        CHARITY_DONATION,
        CHARITY_VERIFICATION,
        CHARITY_SUBDAO_CREATION
    }
    
    // Extended proposal structure with charity-specific fields
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
        
        // Charity-specific fields
        address charityRecipient; // Recipient wallet for charity donations
        uint256 donationAmount; // Amount to be donated
        string charityName; // Name of the charity
        string charityDescription; // Description of the charity's mission
        string proofOfVerification; // IPFS hash or other verification data
        bool isVerifiedCharity; // Whether charity is verified
        string impactMetrics; // Expected impact metrics
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
    
    // Target whitelist for execution security
    mapping(address => bool) public authorizedTargets;
    
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
    LDAOTreasury public treasury;
    
    // Events
    event ProposalCreated(
        uint256 id,
        address proposer,
        string title,
        string description,
        uint256 startBlock,
        uint256 endBlock
    );
    
    event CharityProposalCreated(
        uint256 id,
        address proposer,
        string title,
        address charityRecipient,
        uint256 donationAmount,
        string charityName
    );
    
    event VoteCast(address voter, uint256 proposalId, uint8 support, uint256 votes, string reason);
    event ProposalCanceled(uint256 id);
    event ProposalExecuted(uint256 id);
    event ProposalQueued(uint256 id, uint256 executionTime);
    event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate);
    event DelegateVotesChanged(address indexed delegate, uint256 previousBalance, uint256 newBalance);
    event CategoryParametersUpdated(ProposalCategory category, uint256 quorum, uint256 threshold, bool requiresStaking);
    event VotingPowerUpdated(address indexed user, uint256 newVotingPower);
    event DelegationUpdated(address indexed delegator, address indexed delegate, uint256 votingPower);
    event TargetAuthorized(address indexed target);
    event TargetRevoked(address indexed target);
    
    constructor(address _governanceToken, address _treasury) Ownable(msg.sender) {
        require(_governanceToken != address(0), "Invalid token address");
        require(_treasury != address(0), "Invalid treasury address");
        governanceToken = LDAOToken(_governanceToken);
        treasury = LDAOTreasury(_treasury);
        
        // Default parameters
        votingDelay = 1 days / 12; // ~1 day in blocks (assuming 12s blocks)
        votingPeriod = 3 days / 12; // ~3 days in blocks
        quorumVotes = 100000 * 10**18; // 100k tokens
        proposalThreshold = 10000 * 10**18; // 10k tokens
        
        // Initialize category-specific parameters including charity categories
        _initializeCategoryParameters();
    }
    
    /**
     * @dev Initialize category-specific parameters including charity categories
     */
    function _initializeCategoryParameters() internal {
        // Marketplace Policy
        categoryQuorum[ProposalCategory.MARKETPLACE_POLICY] = 200000 * 10**18; // 200k tokens
        categoryThreshold[ProposalCategory.MARKETPLACE_POLICY] = 25000 * 10**18; // 25k tokens
        categoryRequiresStaking[ProposalCategory.MARKETPLACE_POLICY] = true;
        
        // Fee Structure
        categoryQuorum[ProposalCategory.FEE_STRUCTURE] = 500000 * 10**18; // 500k tokens
        categoryThreshold[ProposalCategory.FEE_STRUCTURE] = 50000 * 10**18; // 50k tokens
        categoryRequiresStaking[ProposalCategory.FEE_STRUCTURE] = false;
        
        // Reputation System
        categoryQuorum[ProposalCategory.REPUTATION_SYSTEM] = 300000 * 10**18; // 300k tokens
        categoryThreshold[ProposalCategory.REPUTATION_SYSTEM] = 30000 * 10**18; // 30k tokens
        categoryRequiresStaking[ProposalCategory.REPUTATION_SYSTEM] = false;
        
        // Security Upgrade
        categoryQuorum[ProposalCategory.SECURITY_UPGRADE] = 750000 * 10**18; // 750k tokens
        categoryThreshold[ProposalCategory.SECURITY_UPGRADE] = 75000 * 10**18; // 75k tokens
        categoryRequiresStaking[ProposalCategory.SECURITY_UPGRADE] = true;
        
        // Token Economics
        categoryQuorum[ProposalCategory.TOKEN_ECONOMICS] = 750000 * 10**18; // 750k tokens
        categoryThreshold[ProposalCategory.TOKEN_ECONOMICS] = 75000 * 10**18; // 75k tokens
        categoryRequiresStaking[ProposalCategory.TOKEN_ECONOMICS] = true;
        
        // Charity Donation - Lower threshold to encourage community giving
        categoryQuorum[ProposalCategory.CHARITY_DONATION] = 50000 * 10**18; // 50k tokens
        categoryThreshold[ProposalCategory.CHARITY_DONATION] = 100 * 10**18; // 100 LDAO to propose
        categoryRequiresStaking[ProposalCategory.CHARITY_DONATION] = false; // No staking required to vote
        
        // Charity Verification - Higher threshold due to importance
        categoryQuorum[ProposalCategory.CHARITY_VERIFICATION] = 200000 * 10**18; // 200k tokens
        categoryThreshold[ProposalCategory.CHARITY_VERIFICATION] = 5000 * 10**18; // 5k LDAO to propose
        categoryRequiresStaking[ProposalCategory.CHARITY_VERIFICATION] = true; // Staking required to verify charities
        
        // Charity SubDAO Creation
        categoryQuorum[ProposalCategory.CHARITY_SUBDAO_CREATION] = 300000 * 10**18; // 300k tokens
        categoryThreshold[ProposalCategory.CHARITY_SUBDAO_CREATION] = 10000 * 10**18; // 10k LDAO to propose
        categoryRequiresStaking[ProposalCategory.CHARITY_SUBDAO_CREATION] = true;
    }
    
    /**
     * @dev Create a new general proposal with category
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
        uint256 minStakeToVote = requiresStaking ? 1000 * 10**18 : 0; // 1000 tokens minimum if required
        
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
        
        // Initialize charity-specific fields to default values
        newProposal.charityRecipient = address(0);
        newProposal.donationAmount = 0;
        newProposal.charityName = "";
        newProposal.charityDescription = "";
        newProposal.proofOfVerification = "";
        newProposal.isVerifiedCharity = false;
        newProposal.impactMetrics = "";
        
        emit ProposalCreated(proposalId, msg.sender, title, description, startBlock, endBlock);
        
        return proposalId;
    }
    
    /**
     * @dev Create a new charity donation proposal
     * @param title Proposal title
     * @param description Proposal description
     * @param charityRecipient Address of the charity recipient
     * @param donationAmount Amount to be donated
     * @param charityName Name of the charity
     * @param charityDescription Description of the charity's mission
     * @param proofOfVerification IPFS hash or other verification data
     * @param impactMetrics Expected impact metrics
     */
    function proposeCharityDonation(
        string memory title,
        string memory description,
        address charityRecipient,
        uint256 donationAmount,
        string memory charityName,
        string memory charityDescription,
        string memory proofOfVerification,
        string memory impactMetrics
    ) external returns (uint256) {
        require(charityRecipient != address(0), "Invalid charity recipient");
        require(donationAmount > 0, "Donation amount must be greater than 0");
        require(bytes(charityName).length > 0, "Charity name is required");
        
        // Check proposer has enough voting power
        uint256 proposerVotingPower = _getVotingPower(msg.sender);
        uint256 requiredThreshold = categoryThreshold[ProposalCategory.CHARITY_DONATION];
        require(proposerVotingPower >= requiredThreshold, "Insufficient voting power to propose charity donation");
        
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
        newProposal.category = ProposalCategory.CHARITY_DONATION;
        newProposal.quorum = categoryQuorum[ProposalCategory.CHARITY_DONATION];
        newProposal.executionDelay = executionDelay;
        newProposal.requiresStaking = categoryRequiresStaking[ProposalCategory.CHARITY_DONATION];
        newProposal.minStakeToVote = 0; // No minimum stake to vote on charity proposals
        
        // Charity-specific fields
        newProposal.charityRecipient = charityRecipient;
        newProposal.donationAmount = donationAmount;
        newProposal.charityName = charityName;
        newProposal.charityDescription = charityDescription;
        newProposal.proofOfVerification = proofOfVerification;
        newProposal.isVerifiedCharity = _isCharityVerified(charityRecipient);
        newProposal.impactMetrics = impactMetrics;
        
        // Initialize empty execution parameters (will be set during execution)
        newProposal.targets = new address[](1);
        newProposal.targets[0] = address(treasury);
        newProposal.values = new uint256[](1);
        newProposal.values[0] = 0; // Amount will be set during execution
        newProposal.signatures = new string[](1);
        newProposal.signatures[0] = "disburseCharityFunds(address,uint256)";
        newProposal.calldatas = new bytes[](1);
        newProposal.calldatas[0] = abi.encode(charityRecipient, donationAmount);

        emit ProposalCreated(proposalId, msg.sender, title, description, startBlock, endBlock);
        emit CharityProposalCreated(proposalId, msg.sender, title, charityRecipient, donationAmount, charityName);
        
        return proposalId;
    }
    
    /**
     * @dev Check if a charity is verified
     * @param charityAddress Address of the charity to check
     * @return bool indicating if the charity is verified
     */
    function _isCharityVerified(address charityAddress) internal view returns (bool) {
        // This would integrate with a charity verification system
        // For now, returning false - in a real implementation, this would check
        // against a registry of verified charities
        return false;
    }
    
    /**
     * @dev Authorize a target for proposal execution (owner only)
     * @param target Address to authorize
     */
    function authorizeTarget(address target) external onlyOwner {
        authorizedTargets[target] = true;
        emit TargetAuthorized(target);
    }
    
    /**
     * @dev Revoke authorization for a target (owner only)
     * @param target Address to revoke
     */
    function revokeTarget(address target) external onlyOwner {
        authorizedTargets[target] = false;
        emit TargetRevoked(target);
    }
    
    /**
     * @dev Allow proposer to cancel their own proposal
     * @param proposalId Proposal ID to cancel
     */
    function cancelProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.state == ProposalState.Pending || proposal.state == ProposalState.Active, "Proposal not active");
        require(proposal.proposer == msg.sender || msg.sender == owner(), "Not proposer or owner");
        
        proposal.state = ProposalState.Canceled;
        emit ProposalCanceled(proposalId);
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
        
        // Check proposal is active
        require(proposal.state == ProposalState.Active, "Voting not active");
        require(block.number >= proposal.startBlock, "Voting not started");
        require(block.number <= proposal.endBlock, "Voting ended");
        
        // Check staking requirements if needed
        if (proposal.requiresStaking) {
            uint256 stakedAmount = governanceToken.totalStaked(msg.sender);
            require(stakedAmount >= proposal.minStakeToVote, "Insufficient staked tokens to vote");
        }
        
        // Get voter's voting power
        uint256 votes = _getVotingPower(msg.sender);
        require(votes > 0, "No voting power");
        
        // Check if user has already voted
        require(!proposalVotes[proposalId][msg.sender].hasVoted, "Already voted");
        
        // Record vote
        proposalVotes[proposalId][msg.sender] = Receipt({
            hasVoted: true,
            support: support,
            votes: votes,
            stakingPower: governanceToken.totalStaked(msg.sender)
        });
        
        // Update proposal vote counts
        if (support == 0) {
            proposal.againstVotes += votes;
        } else if (support == 1) {
            proposal.forVotes += votes;
        } else {
            proposal.abstainVotes += votes;
        }
        
        emit VoteCast(msg.sender, proposalId, support, votes, reason);
    }
    
    /**
     * @dev Execute a proposal after it has passed
     * @param proposalId Proposal ID to execute
     */
    function execute(uint256 proposalId) external nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        
        // Check proposal is in correct state
        require(proposal.state == ProposalState.Succeeded || proposal.state == ProposalState.Queued, "Proposal not executable");
        
        // Check execution delay has passed
        if (proposal.state == ProposalState.Queued) {
            require(block.timestamp >= proposal.queuedAt + proposal.executionDelay, "Execution delay not passed");
        }
        
        // Execute proposal actions
        for (uint256 i = 0; i < proposal.targets.length; i++) {
            // Check target is authorized
            require(authorizedTargets[proposal.targets[i]], "Unauthorized target");
            
            // Execute call
            (bool success, ) = proposal.targets[i].call{value: proposal.values[i]}(
                abi.encodePacked(
                    bytes4(keccak256(bytes(proposal.signatures[i]))),
                    proposal.calldatas[i]
                )
            );
            
            require(success, "Execution failed");
        }
        
        // Update proposal state
        proposal.state = ProposalState.Executed;
        emit ProposalExecuted(proposalId);
    }
    
    /**
     * @dev Queue a proposal for execution after it has passed
     * @param proposalId Proposal ID to queue
     */
    function queue(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        
        // Check proposal has succeeded
        require(proposal.state == ProposalState.Succeeded, "Proposal not succeeded");
        
        // Queue proposal
        proposal.state = ProposalState.Queued;
        proposal.queuedAt = block.timestamp;
        
        emit ProposalQueued(proposalId, block.timestamp + proposal.executionDelay);
    }
    
    /**
     * @dev Get voting power for an account
     * @param account Address to get voting power for
     * @return Voting power
     */
    function _getVotingPower(address account) internal view returns (uint256) {
        return governanceToken.votingPower(account);
    }
    
    /**
     * @dev Update category parameters (owner only)
     * @param category The category to update
     * @param quorum New quorum value
     * @param threshold New threshold value
     * @param requiresStaking Whether staking is required
     */
    function updateCategoryParameters(
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
     * @dev Get proposal details
     * @param proposalId ID of the proposal
     * @return Full proposal details
     */
    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }
    
    /**
     * @dev Get vote details for a specific user on a proposal
     * @param proposalId ID of the proposal
     * @param voter Address of the voter
     * @return Vote receipt details
     */
    function getVote(uint256 proposalId, address voter) external view returns (Receipt memory) {
        return proposalVotes[proposalId][voter];
    }
}