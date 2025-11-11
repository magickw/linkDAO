// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./UpgradeableProxy.sol";

/**
 * @title GovernanceControlledProxy
 * @dev Proxy contract where upgrades are controlled by governance
 */
abstract contract GovernanceControlledProxy is UpgradeableProxy {
    /// @dev Storage gap for future upgrades
    uint256[50] private __gap;

    // Governance contract address
    address public governance;
    
    // Voting period for upgrade proposals (in seconds)
    uint256 public votingPeriod;
    
    // Minimum quorum for upgrade votes (basis points, e.g., 2000 = 20%)
    uint256 public quorumBasisPoints;
    
    // Upgrade vote structure
    struct UpgradeVote {
        uint256 proposalId;
        address proposedImplementation;
        uint256 votingStarted;
        uint256 votingEnds;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 totalVotingPower;
        bool executed;
        bool cancelled;
        string description;
        mapping(address => bool) hasVoted;
        mapping(address => bool) voteChoice; // true = for, false = against
    }
    
    // Current upgrade vote
    mapping(uint256 => UpgradeVote) public upgradeVotes;
    uint256 public currentVoteId;
    
    // Events
    event UpgradeVoteStarted(
        uint256 indexed voteId,
        address indexed proposedImplementation,
        uint256 votingEnds,
        string description
    );
    event VoteCast(uint256 indexed voteId, address indexed voter, bool support, uint256 votingPower);
    event UpgradeVoteExecuted(uint256 indexed voteId, address indexed newImplementation);
    event UpgradeVoteCancelled(uint256 indexed voteId);
    event GovernanceChanged(address indexed oldGovernance, address indexed newGovernance);

    // Custom errors
    error NotGovernance();
    error VoteNotActive();
    error VoteAlreadyActive();
    error AlreadyVoted();
    error VoteNotPassed();
    error InsufficientQuorum();
    error VoteNotEnded();

    modifier onlyGovernance() {
        if (msg.sender != governance) revert NotGovernance();
        _;
    }

    modifier activeVote(uint256 voteId) {
        UpgradeVote storage vote = upgradeVotes[voteId];
        if (block.timestamp < vote.votingStarted || block.timestamp > vote.votingEnds) {
            revert VoteNotActive();
        }
        if (vote.executed || vote.cancelled) {
            revert VoteNotActive();
        }
        _;
    }

    /**
     * @dev Initialize governance-controlled proxy
     */
    function __GovernanceControlledProxy_init(
        address initialOwner,
        address _governance,
        uint256 _upgradeTimelock,
        uint256 _votingPeriod,
        uint256 _quorumBasisPoints
    ) internal onlyInitializing {
        __UpgradeableProxy_init(initialOwner, _upgradeTimelock);
        
        governance = _governance;
        votingPeriod = _votingPeriod;
        quorumBasisPoints = _quorumBasisPoints;
    }

    /**
     * @dev Start a governance vote for an upgrade
     */
    function startUpgradeVote(
        address newImplementation,
        string calldata description
    ) external onlyGovernance returns (uint256 voteId) {
        if (newImplementation == address(0)) {
            revert InvalidImplementation();
        }

        // Check if there's an active vote
        if (currentVoteId > 0) {
            UpgradeVote storage currentVote = upgradeVotes[currentVoteId];
            if (!currentVote.executed && 
                !currentVote.cancelled && 
                block.timestamp <= currentVote.votingEnds) {
                revert VoteAlreadyActive();
            }
        }

        voteId = ++currentVoteId;
        UpgradeVote storage vote = upgradeVotes[voteId];
        
        vote.proposalId = voteId;
        vote.proposedImplementation = newImplementation;
        vote.votingStarted = block.timestamp;
        vote.votingEnds = block.timestamp + votingPeriod;
        vote.description = description;
        
        // Get total voting power from governance contract
        vote.totalVotingPower = _getTotalVotingPower();

        emit UpgradeVoteStarted(voteId, newImplementation, vote.votingEnds, description);
    }

    /**
     * @dev Cast a vote on an upgrade proposal
     */
    function castUpgradeVote(
        uint256 voteId,
        bool support
    ) external activeVote(voteId) {
        UpgradeVote storage vote = upgradeVotes[voteId];
        
        if (vote.hasVoted[msg.sender]) {
            revert AlreadyVoted();
        }

        uint256 votingPower = _getVotingPower(msg.sender);
        require(votingPower > 0, "No voting power");

        vote.hasVoted[msg.sender] = true;
        vote.voteChoice[msg.sender] = support;

        if (support) {
            vote.forVotes += votingPower;
        } else {
            vote.againstVotes += votingPower;
        }

        emit VoteCast(voteId, msg.sender, support, votingPower);
    }

    /**
     * @dev Execute an upgrade after successful vote
     */
    function executeUpgradeVote(uint256 voteId) external {
        UpgradeVote storage vote = upgradeVotes[voteId];
        
        if (block.timestamp <= vote.votingEnds) {
            revert VoteNotEnded();
        }
        
        if (vote.executed || vote.cancelled) {
            revert VoteNotActive();
        }

        // Check if vote passed
        uint256 totalVotes = vote.forVotes + vote.againstVotes;
        uint256 requiredQuorum = (vote.totalVotingPower * quorumBasisPoints) / 10000;
        
        if (totalVotes < requiredQuorum) {
            revert InsufficientQuorum();
        }
        
        if (vote.forVotes <= vote.againstVotes) {
            revert VoteNotPassed();
        }

        vote.executed = true;

        // Execute the upgrade
        upgradeToAndCall(vote.proposedImplementation, "");

        emit UpgradeVoteExecuted(voteId, vote.proposedImplementation);
    }

    /**
     * @dev Cancel an upgrade vote (only governance)
     */
    function cancelUpgradeVote(uint256 voteId) external onlyGovernance {
        UpgradeVote storage vote = upgradeVotes[voteId];
        
        if (vote.executed) {
            revert UpgradeAlreadyExecuted();
        }
        
        vote.cancelled = true;
        
        emit UpgradeVoteCancelled(voteId);
    }

    /**
     * @dev Change governance contract (only current governance)
     */
    function changeGovernance(address newGovernance) external onlyGovernance {
        require(newGovernance != address(0), "Invalid governance address");
        
        address oldGovernance = governance;
        governance = newGovernance;
        
        emit GovernanceChanged(oldGovernance, newGovernance);
    }

    /**
     * @dev Update voting parameters (only governance)
     */
    function updateVotingParameters(
        uint256 newVotingPeriod,
        uint256 newQuorumBasisPoints
    ) external onlyGovernance {
        require(newVotingPeriod >= 1 days && newVotingPeriod <= 30 days, "Invalid voting period");
        require(newQuorumBasisPoints >= 500 && newQuorumBasisPoints <= 5000, "Invalid quorum"); // 5% to 50%
        
        votingPeriod = newVotingPeriod;
        quorumBasisPoints = newQuorumBasisPoints;
    }

    /**
     * @dev Get vote details
     */
    function getUpgradeVote(uint256 voteId) external view returns (
        address proposedImplementation,
        uint256 votingStarted,
        uint256 votingEnds,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 totalVotingPower,
        bool executed,
        bool cancelled,
        string memory description
    ) {
        UpgradeVote storage vote = upgradeVotes[voteId];
        return (
            vote.proposedImplementation,
            vote.votingStarted,
            vote.votingEnds,
            vote.forVotes,
            vote.againstVotes,
            vote.totalVotingPower,
            vote.executed,
            vote.cancelled,
            vote.description
        );
    }

    /**
     * @dev Check if user has voted on a proposal
     */
    function hasVoted(uint256 voteId, address voter) external view returns (bool) {
        return upgradeVotes[voteId].hasVoted[voter];
    }

    /**
     * @dev Get user's vote choice
     */
    function getVoteChoice(uint256 voteId, address voter) external view returns (bool) {
        require(upgradeVotes[voteId].hasVoted[voter], "User has not voted");
        return upgradeVotes[voteId].voteChoice[voter];
    }

    /**
     * @dev Check if vote has passed
     */
    function hasVotePassed(uint256 voteId) external view returns (bool) {
        UpgradeVote storage vote = upgradeVotes[voteId];
        
        if (block.timestamp <= vote.votingEnds) {
            return false;
        }
        
        uint256 totalVotes = vote.forVotes + vote.againstVotes;
        uint256 requiredQuorum = (vote.totalVotingPower * quorumBasisPoints) / 10000;
        
        return totalVotes >= requiredQuorum && vote.forVotes > vote.againstVotes;
    }

    /**
     * @dev Get voting power for an address (to be implemented by governance contract)
     */
    function _getVotingPower(address voter) internal view virtual returns (uint256);

    /**
     * @dev Get total voting power (to be implemented by governance contract)
     */
    function _getTotalVotingPower() internal view virtual returns (uint256);

    /**
     * @dev Override authorization to include governance control
     */
    function _authorizeUpgrade(address newImplementation) internal override {
        // Allow owner for emergency upgrades or governance for normal upgrades
        require(msg.sender == owner() || msg.sender == governance, "Unauthorized upgrade");
    }
}