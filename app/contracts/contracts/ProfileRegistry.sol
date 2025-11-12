// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract ProfileRegistry is ERC721, ERC721Enumerable, Ownable {
    using Strings for uint256;

    // Mapping from address to token IDs (supporting multiple profiles per address)
    mapping(address => uint256[]) public addressToTokenIds;
    
    // Mapping from address to primary profile token ID
    mapping(address => uint256) public primaryProfile;
    
    // Mapping from token ID to profile data
    mapping(uint256 => Profile) public profiles;
    
    // Mapping from handle to token ID
    mapping(string => uint256) public handleToTokenId;
    
    // Counter for token IDs
    uint256 private _tokenIds;
    
    // Profile visibility settings
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
        string[] socialLinks; // New: Social media links
        uint256 createdAt;
        Visibility visibility; // New: Profile visibility
        bool verified; // New: Verification status
    }
    
    // Social links mapping (token ID => platform => URL)
    mapping(uint256 => mapping(string => string)) public socialLinks;
    
    event ProfileCreated(
        address indexed owner,
        uint256 indexed tokenId,
        string handle,
        uint256 createdAt
    );
    
    event ProfileUpdated(
        uint256 indexed tokenId,
        string handle,
        string avatarCid,
        string bioCid
    );
    
    event PrimaryProfileChanged(
        address indexed owner,
        uint256 indexed tokenId
    );
    
    event ProfileVisibilityChanged(
        uint256 indexed tokenId,
        Visibility visibility
    );
    
    constructor() ERC721("LinkDAOProfile", "LDP") Ownable(msg.sender) {}

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    /**
     * @dev Creates a new profile for the caller
     * @param handle The user's handle
     * @param ens The user's ENS name (optional)
     * @param avatarCid IPFS CID for avatar image
     * @param bioCid IPFS CID for bio content
     */
    function createProfile(
        string memory handle,
        string memory ens,
        string memory avatarCid,
        string memory bioCid
    ) public returns (uint256) {
        require(bytes(handle).length > 0, "Handle is required");
        require(handleToTokenId[handle] == 0, "Handle already taken");
        
        _tokenIds++;
        uint256 newTokenId = _tokenIds;
        
        _safeMint(msg.sender, newTokenId);
        
        // Add to user's profile list
        addressToTokenIds[msg.sender].push(newTokenId);
        
        // Set as primary if it's the first profile
        if (addressToTokenIds[msg.sender].length == 1) {
            primaryProfile[msg.sender] = newTokenId;
        }
        
        handleToTokenId[handle] = newTokenId;
        
        profiles[newTokenId] = Profile({
            handle: handle,
            ens: ens,
            avatarCid: avatarCid,
            bioCid: bioCid,
            socialLinks: new string[](0),
            createdAt: block.timestamp,
            visibility: Visibility.Public,
            verified: false
        });
        
        emit ProfileCreated(msg.sender, newTokenId, handle, block.timestamp);
        
        return newTokenId;
    }
    
    /**
     * @dev Sets a profile as the primary profile for an address
     * @param tokenId The token ID of the profile to set as primary
     */
    function setPrimaryProfile(uint256 tokenId) public {
        require(_ownerOf(tokenId) == msg.sender, "Not owner");
        primaryProfile[msg.sender] = tokenId;
        emit PrimaryProfileChanged(msg.sender, tokenId);
    }
    
    /**
     * @dev Updates profile visibility
     * @param tokenId The token ID of the profile to update
     * @param visibility The new visibility setting
     */
    function setProfileVisibility(uint256 tokenId, Visibility visibility) public {
        require(_ownerOf(tokenId) == msg.sender, "Not owner");
        profiles[tokenId].visibility = visibility;
        emit ProfileVisibilityChanged(tokenId, visibility);
    }
    
    /**
     * @dev Adds or updates a social link for a profile
     * @param tokenId The token ID of the profile
     * @param platform The social platform (e.g., "twitter", "discord")
     * @param url The URL to the profile
     */
    function setSocialLink(uint256 tokenId, string memory platform, string memory url) public {
        require(_ownerOf(tokenId) == msg.sender, "Not owner");
        socialLinks[tokenId][platform] = url;
    }
    
    /**
     * @dev Gets a social link for a profile
     * @param tokenId The token ID of the profile
     * @param platform The social platform
     * @return The URL to the profile
     */
    function getSocialLink(uint256 tokenId, string memory platform) public view returns (string memory) {
        return socialLinks[tokenId][platform];
    }
    
    /**
     * @dev Updates an existing profile
     * @param tokenId The token ID of the profile to update
     * @param avatarCid IPFS CID for avatar image
     * @param bioCid IPFS CID for bio content
     */
    function updateProfile(
        uint256 tokenId,
        string memory avatarCid,
        string memory bioCid
    ) public {
        require(_ownerOf(tokenId) == msg.sender || getApproved(tokenId) == msg.sender || isApprovedForAll(_ownerOf(tokenId), msg.sender), "Not owner or approved");
        
        Profile storage profile = profiles[tokenId];
        profile.avatarCid = avatarCid;
        profile.bioCid = bioCid;
        
        emit ProfileUpdated(tokenId, profile.handle, avatarCid, bioCid);
    }
    
    /**
     * @dev Updates the ENS name for a profile
     * @param tokenId The token ID of the profile to update
     * @param ens The new ENS name
     */
    function updateEns(uint256 tokenId, string memory ens) public {
        require(_ownerOf(tokenId) == msg.sender || getApproved(tokenId) == msg.sender || isApprovedForAll(_ownerOf(tokenId), msg.sender), "Not owner or approved");
        profiles[tokenId].ens = ens;
    }
    
    /**
     * @dev Gets all profile token IDs for an address
     * @param user The address of the user
     * @return Array of token IDs
     */
    function getProfilesByAddress(address user) public view returns (uint256[] memory) {
        return addressToTokenIds[user];
    }
    
    /**
     * @dev Gets profile data by address (primary profile)
     * @param user The address of the user
     * @return Profile struct
     */
    function getProfileByAddress(address user) public view returns (Profile memory) {
        uint256 tokenId = primaryProfile[user];
        if (tokenId == 0) {
            // Fallback to first profile if no primary set
            uint256[] memory tokens = addressToTokenIds[user];
            if (tokens.length > 0) {
                tokenId = tokens[0];
            }
        }
        return profiles[tokenId];
    }
    
    /**
     * @dev Gets profile data by handle
     * @param handle The handle of the user
     * @return Profile struct
     */
    function getProfileByHandle(string memory handle) public view returns (Profile memory) {
        uint256 tokenId = handleToTokenId[handle];
        return profiles[tokenId];
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}