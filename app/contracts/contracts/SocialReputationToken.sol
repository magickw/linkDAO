// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract SocialReputationToken is ERC20, Ownable, Pausable {
    // Mapping of user reputation scores
    mapping(address => uint256) public reputationScores;
    
    // Addresses of integrated contracts
    address public profileRegistry;
    address public followModule;
    address public tipRouter;
    address public reputationBridge; // Bridge contract for decentralized validation
    
    // Access control
    mapping(address => bool) public authorizedUpdaters;
    uint256 public constant MAX_REPUTATION_SCORE = 1000000 * 1e18; // 1M max reputation
    
    // Reputation multipliers
    uint256 public constant PROFILE_MULTIPLIER = 10;
    uint256 public constant FOLLOW_MULTIPLIER = 1;
    uint256 public constant TIP_MULTIPLIER = 5;
    uint256 public constant TIP_RECEIVE_MULTIPLIER = 2;
    
    // Events
    event ReputationUpdated(address indexed user, uint256 score, uint256 tokenBalance);
    event ContractsUpdated(address profileRegistry, address followModule, address tipRouter);

    constructor(address _profileRegistry, address _followModule, address _tipRouter) 
        ERC20("LinkDAO Reputation", "LREP") 
        Ownable(msg.sender) 
    {
        profileRegistry = _profileRegistry;
        followModule = _followModule;
        tipRouter = _tipRouter;
    }
    
    /**
     * @dev Update contract addresses
     * @param _profileRegistry Profile registry address
     * @param _followModule Follow module address
     * @param _tipRouter Tip router address
     */
    function updateContracts(address _profileRegistry, address _followModule, address _tipRouter) external onlyOwner {
        profileRegistry = _profileRegistry;
        followModule = _followModule;
        tipRouter = _tipRouter;
        emit ContractsUpdated(_profileRegistry, _followModule, _tipRouter);
    }
    
    /**
     * @dev Calculate reputation score for a user
     * @param user The user address
     * @return score The calculated reputation score
     */
    function calculateReputation(address user) public view returns (uint256) {
        // This would integrate with the other contracts to get:
        // 1. Profile count * PROFILE_MULTIPLIER
        // 2. Follower count * FOLLOW_MULTIPLIER
        // 3. Total tips sent * TIP_MULTIPLIER
        // 4. Total tips received * TIP_RECEIVE_MULTIPLIER
        
        // For now, we'll use a simplified calculation
        return reputationScores[user];
    }
    
    /**
     * @dev Update reputation score for a user (requires authorization)
     * @param user The user address
     * @param score The new reputation score
     */
    function updateReputation(address user, uint256 score) external whenNotPaused {
        require(
            msg.sender == owner() || 
            msg.sender == reputationBridge || 
            authorizedUpdaters[msg.sender],
            "Not authorized to update reputation"
        );
        require(score <= MAX_REPUTATION_SCORE, "Reputation score exceeds maximum");
        
        uint256 oldScore = reputationScores[user];
        reputationScores[user] = score;
        
        // Mint new tokens if score increased
        if (score > oldScore) {
            _mint(user, score - oldScore);
        }
        // Burn tokens if score decreased
        else if (score < oldScore) {
            _burn(user, oldScore - score);
        }
        
        emit ReputationUpdated(user, score, balanceOf(user));
    }
    
    /**
     * @dev Batch update reputation scores (requires authorization)
     * @param users Array of user addresses
     * @param scores Array of reputation scores
     */
    function batchUpdateReputation(address[] memory users, uint256[] memory scores) external whenNotPaused {
        require(
            msg.sender == owner() || 
            msg.sender == reputationBridge || 
            authorizedUpdaters[msg.sender],
            "Not authorized to update reputation"
        );
        require(users.length == scores.length, "Array length mismatch");
        require(users.length <= 100, "Batch size too large");
        
        for (uint i = 0; i < users.length; i++) {
            require(scores[i] <= MAX_REPUTATION_SCORE, "Reputation score exceeds maximum");
            
            uint256 oldScore = reputationScores[users[i]];
            reputationScores[users[i]] = scores[i];
            
            // Mint new tokens if score increased
            if (scores[i] > oldScore) {
                _mint(users[i], scores[i] - oldScore);
            }
            // Burn tokens if score decreased
            else if (scores[i] < oldScore) {
                _burn(users[i], oldScore - scores[i]);
            }
            
            emit ReputationUpdated(users[i], scores[i], balanceOf(users[i]));
        }
    }
    
    /**
     * @dev Get reputation score for a user
     * @param user The user address
     * @return score The reputation score
     */
    function getReputation(address user) external view returns (uint256) {
        return reputationScores[user];
    }
    
    /**
     * @dev Set authorized updater (owner only)
     * @param updater Address to authorize
     * @param authorized Whether to authorize or revoke
     */
    function setAuthorizedUpdater(address updater, bool authorized) external onlyOwner {
        authorizedUpdaters[updater] = authorized;
    }
    
    /**
     * @dev Set reputation bridge address (owner only)
     * @param bridge Address of the ReputationBridge contract
     */
    function setReputationBridge(address bridge) external onlyOwner {
        reputationBridge = bridge;
    }
    
    /**
     * @dev Emergency pause reputation updates (owner only)
     */
    function emergencyPause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause reputation updates (owner only)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}