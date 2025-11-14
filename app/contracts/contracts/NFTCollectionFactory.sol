// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title NFTCollection
 * @notice Individual NFT collection contract
 */
contract NFTCollection is ERC721, ERC721URIStorage, ERC721Royalty, Ownable {

    uint256 private _tokenIdCounter;
    
    struct CollectionInfo {
        string description;
        string image;
        string externalUrl;
        uint256 maxSupply;
        uint256 mintPrice;
        bool isPublicMint;
        address creator;
        uint256 createdAt;
    }
    
    CollectionInfo public collectionInfo;
    mapping(address => bool) public whitelist;
    mapping(uint256 => string) private _tokenURIs;
    
    event NFTMinted(uint256 indexed tokenId, address indexed to, string tokenURI);
    event WhitelistUpdated(address indexed user, bool whitelisted);
    
    constructor(
        string memory name,
        string memory symbol,
        CollectionInfo memory _collectionInfo,
        uint256 royalty
    ) ERC721(name, symbol) Ownable(msg.sender) {
        collectionInfo = _collectionInfo;
        collectionInfo.creator = msg.sender;
        collectionInfo.createdAt = block.timestamp;
        
        if (royalty > 0) {
            _setDefaultRoyalty(msg.sender, uint96(royalty));
        }
        
        _transferOwnership(msg.sender);
    }
    
    function mint(address to, string memory _tokenURI) external payable returns (uint256) {
        require(
            collectionInfo.isPublicMint || whitelist[msg.sender] || msg.sender == owner(),
            "Not authorized to mint"
        );
        require(
            collectionInfo.maxSupply == 0 || _tokenIdCounter < collectionInfo.maxSupply,
            "Max supply reached"
        );
        require(msg.value >= collectionInfo.mintPrice, "Insufficient payment");

        uint256 tokenId = _tokenIdCounter++;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, _tokenURI);

        // Send payment to creator
        if (msg.value > 0) {
            (bool sent, ) = payable(collectionInfo.creator).call{value: msg.value}("");
            require(sent, "Payment to creator failed");
        }

        emit NFTMinted(tokenId, to, _tokenURI);
        return tokenId;
    }
    
    function updateWhitelist(address user, bool whitelisted) external onlyOwner {
        whitelist[user] = whitelisted;
        emit WhitelistUpdated(user, whitelisted);
    }
    
    function updateMintPrice(uint256 newPrice) external onlyOwner {
        collectionInfo.mintPrice = newPrice;
    }
    
    function togglePublicMint() external onlyOwner {
        collectionInfo.isPublicMint = !collectionInfo.isPublicMint;
    }
    
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }
    
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage, ERC721Royalty) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}

/**
 * @title NFTCollectionFactory
 * @notice Factory contract for creating NFT collections
 */
contract NFTCollectionFactory is Ownable {
    struct CollectionData {
        address collectionAddress;
        address creator;
        string name;
        string symbol;
        uint256 createdAt;
        bool isVerified;
    }
    
    mapping(address => CollectionData[]) public creatorCollections;
    mapping(address => bool) public verifiedCollections;
    CollectionData[] public allCollections;
    
    uint256 public creationFee = 0.01 ether;
    address public feeRecipient;
    
    event CollectionCreated(
        address indexed collectionAddress,
        address indexed creator,
        string name,
        string symbol
    );
    
    event CollectionVerified(address indexed collectionAddress);
    
    constructor() Ownable(msg.sender) {
        feeRecipient = msg.sender;
    }
    
    function createCollection(
        string memory name,
        string memory symbol,
        NFTCollection.CollectionInfo memory collectionInfo,
        uint256 royalty
    ) external payable returns (address) {
        require(msg.value >= creationFee, "Insufficient creation fee");
        require(bytes(name).length > 0, "Name required");
        require(bytes(symbol).length > 0, "Symbol required");
        require(royalty <= 1000, "Royalty too high"); // Max 10%
        
        NFTCollection collection = new NFTCollection(
            name,
            symbol,
            collectionInfo,
            royalty
        );
        
        address collectionAddress = address(collection);
        
        CollectionData memory newCollection = CollectionData({
            collectionAddress: collectionAddress,
            creator: msg.sender,
            name: name,
            symbol: symbol,
            createdAt: block.timestamp,
            isVerified: false
        });
        
        creatorCollections[msg.sender].push(newCollection);
        allCollections.push(newCollection);
        
        // Send fee to recipient
        if (msg.value > 0) {
            (bool sent, ) = payable(feeRecipient).call{value: msg.value}("");
            require(sent, "Fee transfer failed");
        }
        
        emit CollectionCreated(collectionAddress, msg.sender, name, symbol);
        
        return collectionAddress;
    }
    
    function verifyCollection(address collectionAddress) external onlyOwner {
        require(collectionAddress != address(0), "Invalid address");
        verifiedCollections[collectionAddress] = true;
        
        // Update verification status in collections array
        for (uint256 i = 0; i < allCollections.length; i++) {
            if (allCollections[i].collectionAddress == collectionAddress) {
                allCollections[i].isVerified = true;
                break;
            }
        }
        
        emit CollectionVerified(collectionAddress);
    }
    
    function getCreatorCollections(address creator) external view returns (CollectionData[] memory) {
        return creatorCollections[creator];
    }
    
    function getAllCollections() external view returns (CollectionData[] memory) {
        return allCollections;
    }
    
    function getCollectionCount() external view returns (uint256) {
        return allCollections.length;
    }
    
    function setCreationFee(uint256 newFee) external onlyOwner {
        creationFee = newFee;
    }
    
    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid address");
        feeRecipient = newRecipient;
    }
}