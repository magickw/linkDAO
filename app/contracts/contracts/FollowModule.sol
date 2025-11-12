// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

// Interface for ProfileRegistry to check profile visibility
interface IProfileRegistry {
    enum Visibility {
        Public,
        FollowersOnly,
        Private
    }
    
    struct Profile {
        string handle;
        string ens;
        string avatarCid;
        string bioCid;
        string[] socialLinks;
        uint256 createdAt;
        Visibility visibility;
        bool verified;
    }
    
    function profiles(uint256 tokenId) external view returns (Profile memory);
    function primaryProfile(address user) external view returns (uint256);
    function getProfilesByAddress(address user) external view returns (uint256[] memory);
}

contract FollowModule is Ownable {
    // Mapping from user to their followers
    mapping(address => mapping(address => bool)) public follows;
    
    // Mapping for follow requests (for private profiles)
    mapping(address => mapping(address => bool)) public followRequests;

    // Mapping from user to follower count
    mapping(address => uint256) public followerCount;

    // Mapping from user to following count
    mapping(address => uint256) public followingCount;
    
    // Mapping for muted/blocked users
    mapping(address => mapping(address => bool)) public muted;
    
    // Mapping for follow lists/circles
    mapping(address => mapping(string => address[])) public followLists;
    mapping(address => mapping(address => string[])) public userLists;
    
    // Profile registry address for checking profile visibility
    address public profileRegistry;
    
    // Follow tiers
    enum FollowTier {
        Fan,
        Professional,
        CloseFriend
    }
    
    // Mapping for follow tiers
    mapping(address => mapping(address => FollowTier)) public followTiers;

    event Followed(address indexed follower, address indexed following);
    event Unfollowed(address indexed follower, address indexed following);
    event FollowRequested(address indexed follower, address indexed following);
    event FollowRequestAccepted(address indexed follower, address indexed following);
    event FollowRequestRejected(address indexed follower, address indexed following);
    event UserMuted(address indexed user, address indexed mutedUser);
    event UserUnmuted(address indexed user, address indexed unmutedUser);
    event FollowTierSet(address indexed follower, address indexed following, FollowTier tier);

    constructor(address _profileRegistry) Ownable(msg.sender) {
        profileRegistry = _profileRegistry;
    }
    
    /**
     * @dev Set the profile registry address
     * @param _profileRegistry The profile registry contract address
     */
    function setProfileRegistry(address _profileRegistry) public onlyOwner {
        profileRegistry = _profileRegistry;
    }
    
    /**
     * @dev Check if a profile is private
     * @param user The user address
     * @return bool Whether the profile is private
     */
    function isProfilePrivate(address user) internal view returns (bool) {
        if (profileRegistry == address(0)) {
            return false; // If no profile registry, assume public profiles
        }
        
        // Get the user's primary profile
        uint256 primaryTokenId = IProfileRegistry(profileRegistry).primaryProfile(user);
        
        // If no primary profile, check if they have any profiles
        if (primaryTokenId == 0) {
            uint256[] memory tokenIds = IProfileRegistry(profileRegistry).getProfilesByAddress(user);
            if (tokenIds.length > 0) {
                primaryTokenId = tokenIds[0]; // Use first profile if no primary set
            } else {
                return false; // No profiles, assume public
            }
        }
        
        // Get profile visibility
        IProfileRegistry.Profile memory profile = IProfileRegistry(profileRegistry).profiles(primaryTokenId);
        return profile.visibility == IProfileRegistry.Visibility.Private;
    }

    /**
     * @dev Follow a user
     * @param target The address to follow
     */
    function follow(address target) public {
        require(target != address(0), "Invalid address");
        require(target != msg.sender, "Cannot follow yourself");
        require(!follows[msg.sender][target], "Already following");
        require(!muted[msg.sender][target], "User is muted");
        
        // Check if target profile is private
        if (isProfilePrivate(target)) {
            // Submit follow request instead
            followRequests[target][msg.sender] = true;
            emit FollowRequested(msg.sender, target);
            return;
        }
        
        follows[msg.sender][target] = true;
        followerCount[target]++;
        followingCount[msg.sender]++;
        
        emit Followed(msg.sender, target);
    }
    
    /**
     * @dev Request to follow a private user
     * @param target The address to follow
     */
    function requestFollow(address target) public {
        require(target != address(0), "Invalid address");
        require(target != msg.sender, "Cannot follow yourself");
        require(!follows[msg.sender][target], "Already following");
        require(!followRequests[target][msg.sender], "Follow request already sent");
        require(isProfilePrivate(target), "Profile is not private");
        
        followRequests[target][msg.sender] = true;
        emit FollowRequested(msg.sender, target);
    }
    
    /**
     * @dev Accept a follow request
     * @param follower The follower address
     */
    function acceptFollowRequest(address follower) public {
        require(followRequests[msg.sender][follower], "No follow request from this user");
        
        followRequests[msg.sender][follower] = false;
        follows[follower][msg.sender] = true;
        followerCount[msg.sender]++;
        followingCount[follower]++;
        
        emit FollowRequestAccepted(follower, msg.sender);
        emit Followed(follower, msg.sender);
    }
    
    /**
     * @dev Reject a follow request
     * @param follower The follower address
     */
    function rejectFollowRequest(address follower) public {
        require(followRequests[msg.sender][follower], "No follow request from this user");
        
        followRequests[msg.sender][follower] = false;
        emit FollowRequestRejected(follower, msg.sender);
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
     * @dev Mute a user (hide their content)
     * @param target The address to mute
     */
    function muteUser(address target) public {
        require(target != address(0), "Invalid address");
        require(target != msg.sender, "Cannot mute yourself");
        
        muted[msg.sender][target] = true;
        emit UserMuted(msg.sender, target);
    }
    
    /**
     * @dev Unmute a user
     * @param target The address to unmute
     */
    function unmuteUser(address target) public {
        require(target != address(0), "Invalid address");
        require(muted[msg.sender][target], "User not muted");
        
        muted[msg.sender][target] = false;
        emit UserUnmuted(msg.sender, target);
    }
    
    /**
     * @dev Add a user to a follow list
     * @param listName The name of the list
     * @param user The user to add
     */
    function addToFollowList(string memory listName, address user) public {
        require(user != address(0), "Invalid address");
        require(bytes(listName).length > 0, "List name required");
        require(follows[msg.sender][user], "Not following this user");
        
        // Check if user is already in the list
        address[] storage list = followLists[msg.sender][listName];
        bool found = false;
        for (uint i = 0; i < list.length; i++) {
            if (list[i] == user) {
                found = true;
                break;
            }
        }
        
        if (!found) {
            followLists[msg.sender][listName].push(user);
            userLists[msg.sender][user].push(listName);
        }
    }
    
    /**
     * @dev Remove a user from a follow list
     * @param listName The name of the list
     * @param user The user to remove
     */
    function removeFromFollowList(string memory listName, address user) public {
        address[] storage list = followLists[msg.sender][listName];
        for (uint i = 0; i < list.length; i++) {
            if (list[i] == user) {
                // Remove from list
                list[i] = list[list.length - 1];
                list.pop();
                
                // Remove list name from user's lists
                string[] storage lists = userLists[msg.sender][user];
                for (uint j = 0; j < lists.length; j++) {
                    if (keccak256(abi.encodePacked(lists[j])) == keccak256(abi.encodePacked(listName))) {
                        lists[j] = lists[lists.length - 1];
                        lists.pop();
                        break;
                    }
                }
                break;
            }
        }
    }
    
    /**
     * @dev Set follow tier for a user
     * @param target The user to set tier for
     * @param tier The follow tier
     */
    function setFollowTier(address target, FollowTier tier) public {
        require(target != address(0), "Invalid address");
        require(follows[msg.sender][target], "Not following this user");
        
        followTiers[msg.sender][target] = tier;
        emit FollowTierSet(msg.sender, target, tier);
    }
    
    /**
     * @dev Get follow list
     * @param listName The name of the list
     * @return Array of addresses in the list
     */
    function getFollowList(string memory listName) public view returns (address[] memory) {
        return followLists[msg.sender][listName];
    }
    
    /**
     * @dev Get lists for a user
     * @param user The user address
     * @return Array of list names
     */
    function getUserLists(address user) public view returns (string[] memory) {
        return userLists[msg.sender][user];
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
    
    /**
     * @dev Check if user is muted
     * @param user The user address
     * @param mutedUser The potentially muted user
     * @return bool Whether user is muted
     */
    function isMuted(address user, address mutedUser) public view returns (bool) {
        return muted[user][mutedUser];
    }
    
    /**
     * @dev Check if there's a follow request
     * @param follower The follower address
     * @param following The following address
     * @return bool Whether there's a follow request
     */
    function hasFollowRequest(address follower, address following) public view returns (bool) {
        return followRequests[following][follower];
    }
}