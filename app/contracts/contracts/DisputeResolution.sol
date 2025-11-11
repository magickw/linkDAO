// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./Governance.sol";
import "./ReputationSystem.sol";

/**
 * @title DisputeResolution
 * @notice Comprehensive dispute resolution system with automated arbitration,
 *         community voting, and DAO governance escalation
 */
contract DisputeResolution is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    // Enums
    enum DisputeStatus {
        CREATED,
        EVIDENCE_SUBMISSION,
        ARBITRATION_PENDING,
        COMMUNITY_VOTING,
        DAO_ESCALATION,
        RESOLVED,
        CANCELLED
    }

    enum DisputeType {
        PRODUCT_NOT_RECEIVED,
        PRODUCT_NOT_AS_DESCRIBED,
        DAMAGED_PRODUCT,
        UNAUTHORIZED_TRANSACTION,
        SELLER_MISCONDUCT,
        BUYER_MISCONDUCT,
        OTHER
    }

    enum ResolutionMethod {
        AUTOMATED,
        COMMUNITY_ARBITRATOR,
        DAO_GOVERNANCE
    }

    enum VerdictType {
        FAVOR_BUYER,
        FAVOR_SELLER,
        PARTIAL_REFUND,
        NO_FAULT
    }

    // Structs
    struct Dispute {
        uint256 id;
        uint256 escrowId;
        address initiator;
        address respondent;
        DisputeType disputeType;
        string description;
        DisputeStatus status;
        ResolutionMethod resolutionMethod;
        uint256 createdAt;
        uint256 evidenceDeadline;
        uint256 votingDeadline;
        uint256 resolvedAt;
        VerdictType verdict;
        uint256 refundAmount;
        address resolver;
        bool escalatedToDAO;
    }

    struct Evidence {
        uint256 disputeId;
        address submitter;
        string evidenceType; // "text", "image", "document", "video"
        string ipfsHash;
        string description;
        uint256 timestamp;
        bool verified;
    }

    struct ArbitratorApplication {
        address applicant;
        string qualifications;
        uint256 reputationScore;
        uint256 casesHandled;
        uint256 successRate; // Percentage * 100
        bool approved;
        uint256 appliedAt;
    }

    struct CommunityVote {
        address voter;
        VerdictType verdict;
        uint256 votingPower;
        string reasoning;
        uint256 timestamp;
    }

    struct DisputeAnalytics {
        uint256 totalDisputes;
        uint256 resolvedDisputes;
        uint256 averageResolutionTime;
        mapping(DisputeType => uint256) disputesByType;
        mapping(VerdictType => uint256) verdictsByType;
        mapping(address => uint256) arbitratorSuccessRates;
    }

    // State variables
    mapping(uint256 => Dispute) public disputes;
    mapping(uint256 => Evidence[]) public disputeEvidence;
    mapping(uint256 => CommunityVote[]) public disputeVotes;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(address => ArbitratorApplication) public arbitratorApplications;
    mapping(address => bool) public approvedArbitrators;
    mapping(uint256 => address) public assignedArbitrators;
    
    DisputeAnalytics public analytics;
    
    // Contract references
    Governance public governance;
    ReputationSystem public reputationSystem;
    
    // Configuration
    uint256 public evidenceSubmissionPeriod = 3 days;
    uint256 public communityVotingPeriod = 2 days;
    uint256 public minimumVotingPower = 100;
    uint256 public arbitratorMinReputation = 500;
    uint256 public daoEscalationThreshold = 1000; // Value in USD equivalent
    
    // Counters
    uint256 public nextDisputeId = 1;
    
    // Events
    event DisputeCreated(
        uint256 indexed disputeId,
        uint256 indexed escrowId,
        address indexed initiator,
        address respondent,
        DisputeType disputeType
    );
    
    event EvidenceSubmitted(
        uint256 indexed disputeId,
        address indexed submitter,
        string evidenceType,
        string ipfsHash
    );
    
    event ArbitratorAssigned(
        uint256 indexed disputeId,
        address indexed arbitrator
    );
    
    event CommunityVoteCast(
        uint256 indexed disputeId,
        address indexed voter,
        VerdictType verdict,
        uint256 votingPower
    );
    
    event DisputeResolved(
        uint256 indexed disputeId,
        VerdictType verdict,
        uint256 refundAmount,
        address resolver
    );
    
    event DisputeEscalated(
        uint256 indexed disputeId,
        ResolutionMethod fromMethod,
        ResolutionMethod toMethod
    );
    
    event ArbitratorApplicationSubmitted(
        address indexed applicant,
        uint256 reputationScore
    );
    
    event ArbitratorApproved(
        address indexed arbitrator
    );

    // Modifiers
    modifier onlyDisputeParty(uint256 disputeId) {
        require(
            disputes[disputeId].initiator == msg.sender ||
            disputes[disputeId].respondent == msg.sender,
            "Not a dispute party"
        );
        _;
    }
    
    modifier onlyAssignedArbitrator(uint256 disputeId) {
        require(
            assignedArbitrators[disputeId] == msg.sender,
            "Not assigned arbitrator"
        );
        _;
    }
    
    modifier disputeExists(uint256 disputeId) {
        require(disputes[disputeId].id != 0, "Dispute does not exist");
        _;
    }
    
    modifier inStatus(uint256 disputeId, DisputeStatus status) {
        require(disputes[disputeId].status == status, "Invalid dispute status");
        _;
    }

    constructor(
        address _governance,
        address _reputationSystem
    ) Ownable(msg.sender) {
        governance = Governance(_governance);
        reputationSystem = ReputationSystem(_reputationSystem);
    }

    /**
     * @notice Create a new dispute
     */
    function createDispute(
        uint256 escrowId,
        address respondent,
        DisputeType disputeType,
        string calldata description
    ) external returns (uint256) {
        uint256 disputeId = nextDisputeId++;
        
        disputes[disputeId] = Dispute({
            id: disputeId,
            escrowId: escrowId,
            initiator: msg.sender,
            respondent: respondent,
            disputeType: disputeType,
            description: description,
            status: DisputeStatus.CREATED,
            resolutionMethod: _determineResolutionMethod(escrowId),
            createdAt: block.timestamp,
            evidenceDeadline: block.timestamp + evidenceSubmissionPeriod,
            votingDeadline: 0,
            resolvedAt: 0,
            verdict: VerdictType.NO_FAULT,
            refundAmount: 0,
            resolver: address(0),
            escalatedToDAO: false
        });
        
        // Update analytics
        analytics.totalDisputes++;
        analytics.disputesByType[disputeType]++;
        
        emit DisputeCreated(disputeId, escrowId, msg.sender, respondent, disputeType);
        
        // Automatically move to evidence submission phase
        disputes[disputeId].status = DisputeStatus.EVIDENCE_SUBMISSION;
        
        return disputeId;
    }

    /**
     * @notice Submit evidence for a dispute
     */
    function submitEvidence(
        uint256 disputeId,
        string calldata evidenceType,
        string calldata ipfsHash,
        string calldata description
    ) external disputeExists(disputeId) onlyDisputeParty(disputeId) inStatus(disputeId, DisputeStatus.EVIDENCE_SUBMISSION) {
        require(block.timestamp <= disputes[disputeId].evidenceDeadline, "Evidence submission period ended");
        
        Evidence memory evidence = Evidence({
            disputeId: disputeId,
            submitter: msg.sender,
            evidenceType: evidenceType,
            ipfsHash: ipfsHash,
            description: description,
            timestamp: block.timestamp,
            verified: false
        });
        
        disputeEvidence[disputeId].push(evidence);
        
        emit EvidenceSubmitted(disputeId, msg.sender, evidenceType, ipfsHash);
    }

    /**
     * @notice Proceed to arbitration after evidence submission
     */
    function proceedToArbitration(uint256 disputeId) external disputeExists(disputeId) {
        Dispute storage dispute = disputes[disputeId];
        require(
            dispute.status == DisputeStatus.EVIDENCE_SUBMISSION,
            "Not in evidence submission phase"
        );
        require(
            block.timestamp > dispute.evidenceDeadline,
            "Evidence submission period not ended"
        );
        
        if (dispute.resolutionMethod == ResolutionMethod.AUTOMATED) {
            _resolveAutomatically(disputeId);
        } else if (dispute.resolutionMethod == ResolutionMethod.COMMUNITY_ARBITRATOR) {
            _assignArbitrator(disputeId);
        } else {
            _escalateToDAO(disputeId);
        }
    }

    /**
     * @notice Cast community vote on dispute
     */
    function castCommunityVote(
        uint256 disputeId,
        VerdictType verdict,
        string calldata reasoning
    ) external disputeExists(disputeId) inStatus(disputeId, DisputeStatus.COMMUNITY_VOTING) {
        require(!hasVoted[disputeId][msg.sender], "Already voted");
        require(block.timestamp <= disputes[disputeId].votingDeadline, "Voting period ended");
        
        uint256 votingPower = reputationSystem.getReputationScore(msg.sender).totalPoints;
        require(votingPower >= minimumVotingPower, "Insufficient voting power");
        
        CommunityVote memory vote = CommunityVote({
            voter: msg.sender,
            verdict: verdict,
            votingPower: votingPower,
            reasoning: reasoning,
            timestamp: block.timestamp
        });
        
        disputeVotes[disputeId].push(vote);
        hasVoted[disputeId][msg.sender] = true;
        
        emit CommunityVoteCast(disputeId, msg.sender, verdict, votingPower);
        
        // Check if voting threshold is met
        _checkVotingCompletion(disputeId);
    }

    /**
     * @notice Resolve dispute as assigned arbitrator
     */
    function resolveAsArbitrator(
        uint256 disputeId,
        VerdictType verdict,
        uint256 refundAmount,
        string calldata reasoning
    ) external disputeExists(disputeId) onlyAssignedArbitrator(disputeId) {
        require(
            disputes[disputeId].status == DisputeStatus.ARBITRATION_PENDING,
            "Not in arbitration phase"
        );
        
        _resolveDispute(disputeId, verdict, refundAmount, msg.sender);
        
        // Update arbitrator success rate
        // This would be implemented based on feedback from parties
    }

    /**
     * @notice Apply to become an arbitrator
     */
    function applyForArbitrator(string calldata qualifications) external {
        uint256 reputationScore = reputationSystem.getReputationScore(msg.sender).totalPoints;
        require(reputationScore >= arbitratorMinReputation, "Insufficient reputation");
        require(arbitratorApplications[msg.sender].applicant == address(0), "Already applied");
        
        arbitratorApplications[msg.sender] = ArbitratorApplication({
            applicant: msg.sender,
            qualifications: qualifications,
            reputationScore: reputationScore,
            casesHandled: 0,
            successRate: 0,
            approved: false,
            appliedAt: block.timestamp
        });
        
        emit ArbitratorApplicationSubmitted(msg.sender, reputationScore);
    }

    /**
     * @notice Approve arbitrator application (DAO only)
     */
    function approveArbitrator(address applicant) external onlyOwner {
        require(arbitratorApplications[applicant].applicant != address(0), "No application found");
        require(!arbitratorApplications[applicant].approved, "Already approved");
        
        arbitratorApplications[applicant].approved = true;
        approvedArbitrators[applicant] = true;
        
        emit ArbitratorApproved(applicant);
    }

    /**
     * @notice Get dispute details
     */
    function getDispute(uint256 disputeId) external view returns (Dispute memory) {
        return disputes[disputeId];
    }

    /**
     * @notice Get dispute evidence
     */
    function getDisputeEvidence(uint256 disputeId) external view returns (Evidence[] memory) {
        return disputeEvidence[disputeId];
    }

    /**
     * @notice Get dispute votes
     */
    function getDisputeVotes(uint256 disputeId) external view returns (CommunityVote[] memory) {
        return disputeVotes[disputeId];
    }

    /**
     * @notice Get dispute analytics
     */
    function getDisputeAnalytics() external view returns (
        uint256 totalDisputes,
        uint256 resolvedDisputes,
        uint256 averageResolutionTime
    ) {
        return (
            analytics.totalDisputes,
            analytics.resolvedDisputes,
            analytics.averageResolutionTime
        );
    }

    // Internal functions
    function _determineResolutionMethod(uint256 escrowId) internal view returns (ResolutionMethod) {
        // Logic to determine resolution method based on escrow value, parties' reputation, etc.
        // For now, default to community arbitrator
        return ResolutionMethod.COMMUNITY_ARBITRATOR;
    }

    function _assignArbitrator(uint256 disputeId) internal {
        // Simple arbitrator selection - in production, this would be more sophisticated
        address[] memory availableArbitrators = _getAvailableArbitrators();
        require(availableArbitrators.length > 0, "No available arbitrators");
        
        // For simplicity, assign the first available arbitrator
        address selectedArbitrator = availableArbitrators[0];
        assignedArbitrators[disputeId] = selectedArbitrator;
        disputes[disputeId].status = DisputeStatus.ARBITRATION_PENDING;
        
        emit ArbitratorAssigned(disputeId, selectedArbitrator);
    }

    function _getAvailableArbitrators() internal view returns (address[] memory) {
        // This would return a list of available arbitrators
        // For now, return empty array - would be implemented with proper arbitrator management
        return new address[](0);
    }

    function _resolveAutomatically(uint256 disputeId) internal {
        // Automated resolution logic based on evidence and patterns
        // For now, default to no fault
        _resolveDispute(disputeId, VerdictType.NO_FAULT, 0, address(this));
    }

    function _escalateToDAO(uint256 disputeId) internal {
        disputes[disputeId].status = DisputeStatus.DAO_ESCALATION;
        disputes[disputeId].escalatedToDAO = true;
        
        emit DisputeEscalated(disputeId, disputes[disputeId].resolutionMethod, ResolutionMethod.DAO_GOVERNANCE);
    }

    function _checkVotingCompletion(uint256 disputeId) internal {
        // Check if enough votes have been cast to reach a decision
        CommunityVote[] memory votes = disputeVotes[disputeId];
        
        if (votes.length >= 5) { // Minimum 5 votes
            _tallyVotes(disputeId);
        }
    }

    function _tallyVotes(uint256 disputeId) internal {
        CommunityVote[] memory votes = disputeVotes[disputeId];
        
        uint256[4] memory verdictCounts; // Index corresponds to VerdictType enum
        uint256[4] memory verdictPowers;
        
        for (uint256 i = 0; i < votes.length; i++) {
            uint256 verdictIndex = uint256(votes[i].verdict);
            verdictCounts[verdictIndex]++;
            verdictPowers[verdictIndex] += votes[i].votingPower;
        }
        
        // Find verdict with highest voting power
        uint256 maxPower = 0;
        VerdictType winningVerdict = VerdictType.NO_FAULT;
        
        for (uint256 i = 0; i < 4; i++) {
            if (verdictPowers[i] > maxPower) {
                maxPower = verdictPowers[i];
                winningVerdict = VerdictType(i);
            }
        }
        
        _resolveDispute(disputeId, winningVerdict, 0, address(this));
    }

    function _resolveDispute(
        uint256 disputeId,
        VerdictType verdict,
        uint256 refundAmount,
        address resolver
    ) internal {
        disputes[disputeId].status = DisputeStatus.RESOLVED;
        disputes[disputeId].verdict = verdict;
        disputes[disputeId].refundAmount = refundAmount;
        disputes[disputeId].resolver = resolver;
        disputes[disputeId].resolvedAt = block.timestamp;
        
        // Update analytics
        analytics.resolvedDisputes++;
        analytics.verdictsByType[verdict]++;
        
        uint256 resolutionTime = block.timestamp - disputes[disputeId].createdAt;
        analytics.averageResolutionTime = 
            (analytics.averageResolutionTime * (analytics.resolvedDisputes - 1) + resolutionTime) / 
            analytics.resolvedDisputes;
        
        emit DisputeResolved(disputeId, verdict, refundAmount, resolver);
    }
}