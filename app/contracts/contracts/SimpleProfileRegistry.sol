// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SimpleProfileRegistry is ERC721, Ownable {
    // Counter for token IDs
    uint256 private _tokenIds;
    
    // Mapping from address to token ID
    mapping(address => uint256) public addressToTokenId;
    
    struct Profile {
        string handle;
        string avatarCid;
        uint256 createdAt;
    }
    
    // Mapping from token ID to profile data
    mapping(uint256 => Profile) public profiles;
    
    event ProfileCreated(
        address indexed owner,
        uint256 indexed tokenId,
        string handle,
        uint256 createdAt
    );
    
    constructor() ERC721("SimpleProfile", "SP") {}
    
    /**
     * @dev Creates a new profile for the caller
     */
    function createProfile(string memory handle, string memory avatarCid) public returns (uint256) {
        require(bytes(handle).length > 0, "Handle required");
        require(addressToTokenId[msg.sender] == 0, "Profile exists");
        
        _tokenIds++;
        uint256 newTokenId = _tokenIds;
        
        _safeMint(msg.sender, newTokenId);
        
        addressToTokenId[msg.sender] = newTokenId;
        
        profiles[newTokenId] = Profile({
            handle: handle,
            avatarCid: avatarCid,
            createdAt: block.timestamp
        });
        
        emit ProfileCreated(msg.sender, newTokenId, handle, block.timestamp);
        
        return newTokenId;
    }
    
    /**
     * @dev Gets profile data by address
     */
    function getProfileByAddress(address user) public view returns (Profile memory) {
        uint256 tokenId = addressToTokenId[user];
        return profiles[tokenId];
    }
}