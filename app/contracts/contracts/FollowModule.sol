// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract FollowModule is Ownable {
    // Mapping from user to their followers
    mapping(address => mapping(address => bool)) public follows;

    // Mapping from user to follower count
    mapping(address => uint256) public followerCount;

    // Mapping from user to following count
    mapping(address => uint256) public followingCount;

    event Followed(address indexed follower, address indexed following);
    event Unfollowed(address indexed follower, address indexed following);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Follow a user
     * @param target The address to follow
     */
    function follow(address target) public {
        require(target != address(0), "Invalid address");
        require(target != msg.sender, "Cannot follow yourself");
        require(!follows[msg.sender][target], "Already following");
        
        follows[msg.sender][target] = true;
        followerCount[target]++;
        followingCount[msg.sender]++;
        
        emit Followed(msg.sender, target);
    }
    
    /**
     * @dev Unfollow a user
     * @param target The address to unfollow
     */
    function unfollow(address target) public {
        require(target != address(0), "Invalid address");
        require(follows[msg.sender][target], "Not following");
        
        follows[msg.sender][target] = false;
        followerCount[target]--;
        followingCount[msg.sender]--;
        
        emit Unfollowed(msg.sender, target);
    }
    
    /**
     * @dev Check if user A follows user B
     * @param follower The follower address
     * @param following The following address
     * @return bool Whether follower follows following
     */
    function isFollowing(address follower, address following) public view returns (bool) {
        return follows[follower][following];
    }
}