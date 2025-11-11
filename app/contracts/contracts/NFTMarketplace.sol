// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title NFTMarketplace
 * @notice A comprehensive NFT marketplace with minting, trading, and royalty distribution
 */
contract NFTMarketplace is ERC721, ERC721URIStorage, ERC721Royalty, Ownable, ReentrancyGuard {
    
    uint256 private _tokenIdCounter;
    
    // Struct for NFT metadata
    struct NFTMetadata {
        string name;
        string description;
        string image;
        string animationUrl;
        string externalUrl;
        string[] attributes;
        address creator;
        uint256 createdAt;
        bool isVerified;
    }
    
    // Struct for marketplace listing
    struct Listing {
        uint256 tokenId;
        address seller;
        uint256 price;
        bool isActive;
        uint256 listedAt;
        uint256 expiresAt;
    }
    
    // Struct for auction
    struct Auction {
        uint256 tokenId;
        address seller;
        uint256 startingPrice;
        uint256 reservePrice;
        uint256 currentBid;
        address currentBidder;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        mapping(address => uint256) bids;
        address[] bidders;
    }
    
    // Struct for offer
    struct Offer {
        uint256 tokenId;
        address buyer;
        uint256 amount;
        uint256 expiresAt;
        bool isActive;
    }
    
    // Mappings
    mapping(uint256 => NFTMetadata) public nftMetadata;
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Auction) public auctions;
    mapping(uint256 => Offer[]) public offers;
    mapping(address => uint256[]) public creatorNFTs;
    mapping(address => uint256) public creatorRoyalties; // basis points (e.g., 250 = 2.5%)
    mapping(bytes32 => bool) public usedHashes; // Prevent duplicate content
    
    // Platform settings
    uint256 public platformFee = 250; // 2.5% in basis points
    address public platformFeeRecipient;
    uint256 public maxRoyalty = 1000; // 10% max royalty
    
    // Events
    event NFTMinted(
        uint256 indexed tokenId,
        address indexed creator,
        address indexed to,
        string tokenURI,
        uint256 royalty
    );
    
    event NFTListed(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price,
        uint256 expiresAt
    );
    
    event NFTSold(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 price
    );
    
    event AuctionCreated(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 startingPrice,
        uint256 reservePrice,
        uint256 endTime
    );
    
    event BidPlaced(
        uint256 indexed tokenId,
        address indexed bidder,
        uint256 amount
    );
    
    event AuctionEnded(
        uint256 indexed tokenId,
        address indexed winner,
        uint256 winningBid
    );
    
    event OfferMade(
        uint256 indexed tokenId,
        address indexed buyer,
        uint256 amount,
        uint256 expiresAt
    );
    
    event OfferAccepted(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 amount
    );
    
    event RoyaltyPaid(
        uint256 indexed tokenId,
        address indexed creator,
        uint256 amount
    );
    
    constructor() ERC721("Web3Marketplace NFT", "W3MNFT") Ownable(msg.sender) {
        platformFeeRecipient = msg.sender;
    }
    
    /**
     * @notice Mint a new NFT with metadata and royalty settings
     * @param to Address to mint the NFT to
     * @param _tokenURI IPFS URI for the NFT metadata
     * @param royalty Royalty percentage in basis points (e.g., 250 = 2.5%)
     * @param contentHash Hash of the NFT content to prevent duplicates
     */
    function mintNFT(
        address to,
        string memory _tokenURI,
        uint256 royalty,
        bytes32 contentHash,
        NFTMetadata memory metadata
    ) external returns (uint256) {
        require(royalty <= maxRoyalty, "Royalty exceeds maximum");
        require(!usedHashes[contentHash], "Content already exists");
        require(bytes(_tokenURI).length > 0, "Token URI required");
        
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        // Mark content hash as used
        usedHashes[contentHash] = true;
        
        // Store metadata
        metadata.creator = msg.sender;
        metadata.createdAt = block.timestamp;
        metadata.isVerified = false; // Can be verified later by platform
        nftMetadata[tokenId] = metadata;
        
        // Add to creator's NFT list
        creatorNFTs[msg.sender].push(tokenId);
        
        // Set royalty
        if (royalty > 0) {
            _setTokenRoyalty(tokenId, msg.sender, uint96(royalty));
            creatorRoyalties[msg.sender] = royalty;
        }
        
        // Mint the NFT
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, _tokenURI);
        
        emit NFTMinted(tokenId, msg.sender, to, _tokenURI, royalty);
        
        return tokenId;
    }
    
    /**
     * @notice List an NFT for sale at a fixed price
     * @param tokenId The NFT token ID
     * @param price Sale price in wei
     * @param duration Duration of the listing in seconds
     */
    function listNFT(
        uint256 tokenId,
        uint256 price,
        uint256 duration
    ) external {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(price > 0, "Price must be greater than 0");
        require(duration > 0, "Duration must be greater than 0");
        require(!listings[tokenId].isActive, "Already listed");
        
        // Transfer NFT to contract
        _transfer(msg.sender, address(this), tokenId);
        
        // Create listing
        listings[tokenId] = Listing({
            tokenId: tokenId,
            seller: msg.sender,
            price: price,
            isActive: true,
            listedAt: block.timestamp,
            expiresAt: block.timestamp + duration
        });
        
        emit NFTListed(tokenId, msg.sender, price, block.timestamp + duration);
    }
    
    /**
     * @notice Buy an NFT that's listed for sale
     * @param tokenId The NFT token ID
     */
    function buyNFT(uint256 tokenId) external payable nonReentrant {
        Listing storage listing = listings[tokenId];
        
        require(listing.isActive, "NFT not for sale");
        require(block.timestamp <= listing.expiresAt, "Listing expired");
        require(msg.value >= listing.price, "Insufficient payment");
        
        address seller = listing.seller;
        uint256 price = listing.price;
        
        // Deactivate listing
        listing.isActive = false;
        
        // Calculate fees and royalties
        (address royaltyRecipient, uint256 royaltyAmount) = royaltyInfo(tokenId, price);
        uint256 platformFeeAmount = (price * platformFee) / 10000;
        uint256 sellerAmount = price - royaltyAmount - platformFeeAmount;
        
        // Transfer NFT to buyer
        _transfer(address(this), msg.sender, tokenId);
        
        // Distribute payments
        if (royaltyAmount > 0 && royaltyRecipient != address(0)) {
            payable(royaltyRecipient).transfer(royaltyAmount);
            emit RoyaltyPaid(tokenId, royaltyRecipient, royaltyAmount);
        }
        
        payable(platformFeeRecipient).transfer(platformFeeAmount);
        payable(seller).transfer(sellerAmount);
        
        // Refund excess payment
        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }
        
        emit NFTSold(tokenId, seller, msg.sender, price);
    }
    
    /**
     * @notice Create an auction for an NFT
     * @param tokenId The NFT token ID
     * @param startingPrice Starting bid price
     * @param reservePrice Reserve price (minimum to sell)
     * @param duration Auction duration in seconds
     */
    function createAuction(
        uint256 tokenId,
        uint256 startingPrice,
        uint256 reservePrice,
        uint256 duration
    ) external {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(startingPrice > 0, "Starting price must be greater than 0");
        require(duration > 0, "Duration must be greater than 0");
        require(!auctions[tokenId].isActive, "Auction already active");
        
        // Transfer NFT to contract
        _transfer(msg.sender, address(this), tokenId);
        
        // Create auction
        Auction storage auction = auctions[tokenId];
        auction.tokenId = tokenId;
        auction.seller = msg.sender;
        auction.startingPrice = startingPrice;
        auction.reservePrice = reservePrice;
        auction.currentBid = 0;
        auction.currentBidder = address(0);
        auction.startTime = block.timestamp;
        auction.endTime = block.timestamp + duration;
        auction.isActive = true;
        
        emit AuctionCreated(tokenId, msg.sender, startingPrice, reservePrice, block.timestamp + duration);
    }
    
    /**
     * @notice Place a bid on an auction
     * @param tokenId The NFT token ID
     */
    function placeBid(uint256 tokenId) external payable nonReentrant {
        Auction storage auction = auctions[tokenId];
        
        require(auction.isActive, "Auction not active");
        require(block.timestamp <= auction.endTime, "Auction ended");
        require(msg.value >= auction.startingPrice, "Bid below starting price");
        require(msg.value > auction.currentBid, "Bid too low");
        require(msg.sender != auction.seller, "Seller cannot bid");
        
        // Refund previous bidder
        if (auction.currentBidder != address(0)) {
            payable(auction.currentBidder).transfer(auction.currentBid);
        }
        
        // Update auction
        auction.currentBid = msg.value;
        auction.currentBidder = msg.sender;
        auction.bids[msg.sender] = msg.value;
        auction.bidders.push(msg.sender);
        
        // Extend auction if bid placed in last 10 minutes
        if (auction.endTime - block.timestamp < 600) {
            auction.endTime = block.timestamp + 600;
        }
        
        emit BidPlaced(tokenId, msg.sender, msg.value);
    }
    
    /**
     * @notice End an auction and transfer NFT to winner
     * @param tokenId The NFT token ID
     */
    function endAuction(uint256 tokenId) external nonReentrant {
        Auction storage auction = auctions[tokenId];
        
        require(auction.isActive, "Auction not active");
        require(block.timestamp > auction.endTime, "Auction still active");
        
        auction.isActive = false;
        
        if (auction.currentBidder != address(0) && auction.currentBid >= auction.reservePrice) {
            // Auction successful
            address seller = auction.seller;
            address winner = auction.currentBidder;
            uint256 winningBid = auction.currentBid;
            
            // Calculate fees and royalties
            (address royaltyRecipient, uint256 royaltyAmount) = royaltyInfo(tokenId, winningBid);
            uint256 platformFeeAmount = (winningBid * platformFee) / 10000;
            uint256 sellerAmount = winningBid - royaltyAmount - platformFeeAmount;
            
            // Transfer NFT to winner
            _transfer(address(this), winner, tokenId);
            
            // Distribute payments
            if (royaltyAmount > 0 && royaltyRecipient != address(0)) {
                payable(royaltyRecipient).transfer(royaltyAmount);
                emit RoyaltyPaid(tokenId, royaltyRecipient, royaltyAmount);
            }
            
            payable(platformFeeRecipient).transfer(platformFeeAmount);
            payable(seller).transfer(sellerAmount);
            
            emit AuctionEnded(tokenId, winner, winningBid);
        } else {
            // Auction failed - return NFT to seller
            _transfer(address(this), auction.seller, tokenId);
            
            // Refund highest bidder if any
            if (auction.currentBidder != address(0)) {
                payable(auction.currentBidder).transfer(auction.currentBid);
            }
            
            emit AuctionEnded(tokenId, address(0), 0);
        }
    }
    
    /**
     * @notice Make an offer on an NFT
     * @param tokenId The NFT token ID
     * @param duration Offer duration in seconds
     */
    function makeOffer(uint256 tokenId, uint256 duration) external payable {
        require(msg.value > 0, "Offer must be greater than 0");
        require(duration > 0, "Duration must be greater than 0");
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        offers[tokenId].push(Offer({
            tokenId: tokenId,
            buyer: msg.sender,
            amount: msg.value,
            expiresAt: block.timestamp + duration,
            isActive: true
        }));
        
        emit OfferMade(tokenId, msg.sender, msg.value, block.timestamp + duration);
    }
    
    /**
     * @notice Accept an offer on an NFT
     * @param tokenId The NFT token ID
     * @param offerIndex Index of the offer to accept
     */
    function acceptOffer(uint256 tokenId, uint256 offerIndex) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(offerIndex < offers[tokenId].length, "Invalid offer index");
        
        Offer storage offer = offers[tokenId][offerIndex];
        require(offer.isActive, "Offer not active");
        require(block.timestamp <= offer.expiresAt, "Offer expired");
        
        address buyer = offer.buyer;
        uint256 amount = offer.amount;
        
        // Deactivate offer
        offer.isActive = false;
        
        // Calculate fees and royalties
        (address royaltyRecipient, uint256 royaltyAmount) = royaltyInfo(tokenId, amount);
        uint256 platformFeeAmount = (amount * platformFee) / 10000;
        uint256 sellerAmount = amount - royaltyAmount - platformFeeAmount;
        
        // Transfer NFT to buyer
        _transfer(msg.sender, buyer, tokenId);
        
        // Distribute payments
        if (royaltyAmount > 0 && royaltyRecipient != address(0)) {
            payable(royaltyRecipient).transfer(royaltyAmount);
            emit RoyaltyPaid(tokenId, royaltyRecipient, royaltyAmount);
        }
        
        payable(platformFeeRecipient).transfer(platformFeeAmount);
        payable(msg.sender).transfer(sellerAmount);
        
        emit OfferAccepted(tokenId, msg.sender, buyer, amount);
    }
    
    /**
     * @notice Cancel a listing
     * @param tokenId The NFT token ID
     */
    function cancelListing(uint256 tokenId) external {
        Listing storage listing = listings[tokenId];
        require(listing.seller == msg.sender, "Not the seller");
        require(listing.isActive, "Listing not active");
        
        listing.isActive = false;
        _transfer(address(this), msg.sender, tokenId);
    }
    
    /**
     * @notice Get NFT metadata
     * @param tokenId The NFT token ID
     */
    function getNFTMetadata(uint256 tokenId) external view returns (NFTMetadata memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return nftMetadata[tokenId];
    }
    
    /**
     * @notice Get creator's NFTs
     * @param creator Creator address
     */
    function getCreatorNFTs(address creator) external view returns (uint256[] memory) {
        return creatorNFTs[creator];
    }
    
    /**
     * @notice Get active offers for an NFT
     * @param tokenId The NFT token ID
     */
    function getActiveOffers(uint256 tokenId) external view returns (Offer[] memory) {
        Offer[] memory allOffers = offers[tokenId];
        uint256 activeCount = 0;
        
        // Count active offers
        for (uint256 i = 0; i < allOffers.length; i++) {
            if (allOffers[i].isActive && block.timestamp <= allOffers[i].expiresAt) {
                activeCount++;
            }
        }
        
        // Create array of active offers
        Offer[] memory activeOffers = new Offer[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allOffers.length; i++) {
            if (allOffers[i].isActive && block.timestamp <= allOffers[i].expiresAt) {
                activeOffers[index] = allOffers[i];
                index++;
            }
        }
        
        return activeOffers;
    }
    
    /**
     * @notice Verify an NFT (platform admin only)
     * @param tokenId The NFT token ID
     */
    function verifyNFT(uint256 tokenId) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        nftMetadata[tokenId].isVerified = true;
    }
    
    /**
     * @notice Set platform fee (owner only)
     * @param _platformFee New platform fee in basis points
     */
    function setPlatformFee(uint256 _platformFee) external onlyOwner {
        require(_platformFee <= 1000, "Fee too high"); // Max 10%
        platformFee = _platformFee;
    }
    
    /**
     * @notice Set platform fee recipient (owner only)
     * @param _recipient New fee recipient address
     */
    function setPlatformFeeRecipient(address _recipient) external onlyOwner {
        require(_recipient != address(0), "Invalid address");
        platformFeeRecipient = _recipient;
    }
    
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage, ERC721Royalty) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}