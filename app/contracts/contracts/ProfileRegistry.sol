// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract ProfileRegistry is ERC721, ERC721Enumerable, Ownable {
    using Strings for uint256;

    // Mapping from address to token ID
    mapping(address => uint256) public addressToTokenId;
    
    // Mapping from token ID to profile data
    mapping(uint256 => Profile) public profiles;
    
    // Mapping from handle to token ID
    mapping(string => uint256) public handleToTokenId;
    
    // Counter for token IDs
    uint256 private _tokenIds;
    
    struct Profile {
        string handle;
        string ens;
        string avatarCid;
        string bioCid;
        uint256 createdAt;
    }
    
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
    
    constructor() ERC721("LinkDAOProfile", "LDP") Ownable() {}
    
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
        require(addressToTokenId[msg.sender] == 0, "Profile already exists");
        require(handleToTokenId[handle] == 0, "Handle already taken");
        
        _tokenIds++;
        uint256 newTokenId = _tokenIds;
        
        _safeMint(msg.sender, newTokenId);
        
        addressToTokenId[msg.sender] = newTokenId;
        handleToTokenId[handle] = newTokenId;
        
        profiles[newTokenId] = Profile({
            handle: handle,
            ens: ens,
            avatarCid: avatarCid,
            bioCid: bioCid,
            createdAt: block.timestamp
        });
        
        emit ProfileCreated(msg.sender, newTokenId, handle, block.timestamp);
        
        return newTokenId;
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
     * @dev Gets profile data by address
     * @param user The address of the user
     * @return Profile struct
     */
    function getProfileByAddress(address user) public view returns (Profile memory) {
        uint256 tokenId = addressToTokenId[user];
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
    
    // The following functions are overrides required by Solidity.
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
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