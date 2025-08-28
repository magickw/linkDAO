// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./LinkDAOToken.sol";

/**
 * @title LinkDAO Marketplace
 * @notice A decentralized marketplace for buying and selling digital and physical goods with crypto payments
 */
contract Marketplace is ReentrancyGuard, Ownable {
    // Enum for item types
    enum ItemType { PHYSICAL, DIGITAL, NFT, SERVICE }
    
    // Enum for listing types
    enum ListingType { FIXED_PRICE, AUCTION }
    
    // Enum for listing status
    enum ListingStatus { ACTIVE, SOLD, CANCELLED, EXPIRED }
    
    // Struct for marketplace listing
    struct Listing {
        uint256 id;
        address seller;
        address tokenAddress; // Address of the ERC20 token used for payment (address(0) for ETH)
        uint256 price; // Price in wei or token units
        uint256 quantity;
        ItemType itemType;
        ListingType listingType;
        ListingStatus status;
        uint256 startTime;
        uint256 endTime; // For auctions
        uint256 highestBid;
        address highestBidder;
        string metadataURI; // IPFS hash for item metadata
        bool isEscrowed;
    }
    
    // Struct for bid
    struct Bid {
        address bidder;
        uint256 amount;
        uint256 timestamp;
    }
    
    // Struct for escrow
    struct Escrow {
        uint256 listingId;
        address buyer;
        address seller;
        uint256 amount;
        bool buyerApproved;
        bool sellerApproved;
        bool disputeOpened;
        address resolver; // DAO appointed resolver
        uint256 createdAt;
        uint256 resolvedAt;
    }
    
    // Mapping of listing ID to Listing
    mapping(uint256 => Listing) public listings;
    
    // Mapping of listing ID to bids (for auctions)
    mapping(uint256 => Bid[]) public bids;
    
    // Mapping of escrow ID to Escrow
    mapping(uint256 => Escrow) public escrows;
    
    // Mapping of user address to reputation score
    mapping(address => uint256) public reputationScores;
    
    // Mapping of user address to whether they are DAO approved
    mapping(address => bool) public daoApprovedVendors;
    
    // Counter for listing IDs
    uint256 public nextListingId = 1;
    
    // Counter for escrow IDs
    uint256 public nextEscrowId = 1;
    
    // Platform fee (in basis points, e.g., 100 = 1%)
    uint256 public platformFee = 100;
    
    // Minimum reputation score to be a vendor
    uint256 public minReputationScore = 50;
    
    // Events
    event ListingCreated(
        uint256 indexed listingId,
        address indexed seller,
        address tokenAddress,
        uint256 price,
        uint256 quantity,
        ItemType itemType,
        ListingType listingType,
        uint256 startTime,
        uint256 endTime,
        string metadataURI
    );
    
    event ListingUpdated(
        uint256 indexed listingId,
        uint256 newPrice,
        uint256 newQuantity
    );
    
    event ListingCancelled(uint256 indexed listingId);
    
    event ItemSold(
        uint256 indexed listingId,
        address indexed buyer,
        address tokenAddress,
        uint256 price,
        uint256 quantity
    );
    
    event BidPlaced(
        uint256 indexed listingId,
        address indexed bidder,
        uint256 amount
    );
    
    event BidAccepted(
        uint256 indexed listingId,
        address indexed seller,
        address indexed buyer,
        uint256 amount
    );
    
    event EscrowCreated(
        uint256 indexed escrowId,
        uint256 listingId,
        address buyer,
        address seller,
        uint256 amount
    );
    
    event EscrowApproved(
        uint256 indexed escrowId,
        address approver
    );
    
    event EscrowResolved(
        uint256 indexed escrowId,
        address resolver,
        bool buyerWins
    );
    
    event ReputationUpdated(
        address indexed user,
        uint256 newScore
    );
    
    event VendorApproved(
        address indexed vendor,
        bool approved
    );
    
    // Modifiers
    modifier onlySeller(uint256 listingId) {
        require(listings[listingId].seller == msg.sender, "Not the seller");
        _;
    }
    
    modifier onlyBuyer(uint256 escrowId) {
        require(escrows[escrowId].buyer == msg.sender, "Not the buyer");
        _;
    }
    
    modifier onlySellerOrBuyer(uint256 escrowId) {
        require(
            escrows[escrowId].buyer == msg.sender || 
            escrows[escrowId].seller == msg.sender, 
            "Not the buyer or seller"
        );
        _;
    }
    
    modifier onlyDAO() {
        // In a real implementation, this would check if the caller is a DAO member
        // For now, we'll allow the contract owner to act as the DAO
        require(msg.sender == owner(), "Not DAO");
        _;
    }
    
    modifier onlyResolver(uint256 escrowId) {
        require(escrows[escrowId].resolver == msg.sender, "Not the resolver");
        _;
    }
    
    modifier listingExists(uint256 listingId) {
        require(listings[listingId].id != 0, "Listing does not exist");
        _;
    }
    
    modifier listingActive(uint256 listingId) {
        require(listings[listingId].status == ListingStatus.ACTIVE, "Listing not active");
        _;
    }
    
    /**
     * @notice Create a new fixed-price listing
     * @param tokenAddress Address of the ERC20 token for payment (address(0) for ETH)
     * @param price Price per item
     * @param quantity Quantity of items
     * @param itemType Type of item being sold
     * @param metadataURI IPFS hash for item metadata
     */
    function createFixedPriceListing(
        address tokenAddress,
        uint256 price,
        uint256 quantity,
        ItemType itemType,
        string memory metadataURI
    ) external {
        require(quantity > 0, "Quantity must be greater than 0");
        require(price > 0, "Price must be greater than 0");
        require(bytes(metadataURI).length > 0, "Metadata URI required");
        
        // Check if seller has minimum reputation or is DAO approved
        require(
            reputationScores[msg.sender] >= minReputationScore || 
            daoApprovedVendors[msg.sender],
            "Insufficient reputation or not DAO approved"
        );
        
        uint256 listingId = nextListingId++;
        
        listings[listingId] = Listing({
            id: listingId,
            seller: msg.sender,
            tokenAddress: tokenAddress,
            price: price,
            quantity: quantity,
            itemType: itemType,
            listingType: ListingType.FIXED_PRICE,
            status: ListingStatus.ACTIVE,
            startTime: block.timestamp,
            endTime: 0, // Not used for fixed price
            highestBid: 0,
            highestBidder: address(0),
            metadataURI: metadataURI,
            isEscrowed: false
        });
        
        emit ListingCreated(
            listingId,
            msg.sender,
            tokenAddress,
            price,
            quantity,
            itemType,
            ListingType.FIXED_PRICE,
            block.timestamp,
            0,
            metadataURI
        );
    }
    
    /**
     * @notice Create a new auction listing
     * @param tokenAddress Address of the ERC20 token for payment (address(0) for ETH)
     * @param startingPrice Starting price for the auction
     * @param quantity Quantity of items
     * @param itemType Type of item being sold
     * @param duration Duration of the auction in seconds
     * @param metadataURI IPFS hash for item metadata
     */
    function createAuctionListing(
        address tokenAddress,
        uint256 startingPrice,
        uint256 quantity,
        ItemType itemType,
        uint256 duration,
        string memory metadataURI
    ) external {
        require(quantity > 0, "Quantity must be greater than 0");
        require(startingPrice > 0, "Starting price must be greater than 0");
        require(duration > 0, "Duration must be greater than 0");
        require(bytes(metadataURI).length > 0, "Metadata URI required");
        
        // Check if seller has minimum reputation or is DAO approved
        require(
            reputationScores[msg.sender] >= minReputationScore || 
            daoApprovedVendors[msg.sender],
            "Insufficient reputation or not DAO approved"
        );
        
        uint256 listingId = nextListingId++;
        uint256 endTime = block.timestamp + duration;
        
        listings[listingId] = Listing({
            id: listingId,
            seller: msg.sender,
            tokenAddress: tokenAddress,
            price: startingPrice,
            quantity: quantity,
            itemType: itemType,
            listingType: ListingType.AUCTION,
            status: ListingStatus.ACTIVE,
            startTime: block.timestamp,
            endTime: endTime,
            highestBid: 0,
            highestBidder: address(0),
            metadataURI: metadataURI,
            isEscrowed: false
        });
        
        emit ListingCreated(
            listingId,
            msg.sender,
            tokenAddress,
            startingPrice,
            quantity,
            itemType,
            ListingType.AUCTION,
            block.timestamp,
            endTime,
            metadataURI
        );
    }
    
    /**
     * @notice Update a listing's price and quantity
     * @param listingId ID of the listing to update
     * @param newPrice New price for the listing
     * @param newQuantity New quantity for the listing
     */
    function updateListing(
        uint256 listingId,
        uint256 newPrice,
        uint256 newQuantity
    ) external onlySeller(listingId) listingExists(listingId) listingActive(listingId) {
        require(newPrice > 0, "Price must be greater than 0");
        require(newQuantity > 0, "Quantity must be greater than 0");
        
        listings[listingId].price = newPrice;
        listings[listingId].quantity = newQuantity;
        
        emit ListingUpdated(listingId, newPrice, newQuantity);
    }
    
    /**
     * @notice Cancel a listing
     * @param listingId ID of the listing to cancel
     */
    function cancelListing(uint256 listingId) external onlySeller(listingId) listingExists(listingId) listingActive(listingId) {
        listings[listingId].status = ListingStatus.CANCELLED;
        
        emit ListingCancelled(listingId);
    }
    
    /**
     * @notice Buy a fixed-price item
     * @param listingId ID of the listing to buy
     * @param quantity Quantity to buy
     */
    function buyFixedPriceItem(uint256 listingId, uint256 quantity) external payable nonReentrant listingExists(listingId) listingActive(listingId) {
        Listing storage listing = listings[listingId];
        
        require(listing.listingType == ListingType.FIXED_PRICE, "Not a fixed price listing");
        require(quantity > 0 && quantity <= listing.quantity, "Invalid quantity");
        
        uint256 totalPrice = listing.price * quantity;
        
        // Transfer payment
        if (listing.tokenAddress == address(0)) {
            // ETH payment
            require(msg.value == totalPrice, "Incorrect ETH amount");
        } else {
            // ERC20 payment
            require(msg.value == 0, "No ETH should be sent for ERC20 payments");
            IERC20 token = IERC20(listing.tokenAddress);
            require(token.transferFrom(msg.sender, address(this), totalPrice), "Token transfer failed");
        }
        
        // Update listing
        listing.quantity -= quantity;
        if (listing.quantity == 0) {
            listing.status = ListingStatus.SOLD;
        }
        
        // Transfer funds to seller (minus platform fee)
        uint256 platformFeeAmount = (totalPrice * platformFee) / 10000;
        uint256 sellerAmount = totalPrice - platformFeeAmount;
        
        if (listing.tokenAddress == address(0)) {
            // ETH payment
            payable(listing.seller).transfer(sellerAmount);
            // Platform fee is kept in the contract
        } else {
            // ERC20 payment
            IERC20 token = IERC20(listing.tokenAddress);
            require(token.transfer(listing.seller, sellerAmount), "Token transfer to seller failed");
            // Platform fee is kept in the contract
        }
        
        emit ItemSold(listingId, msg.sender, listing.tokenAddress, totalPrice, quantity);
    }
    
    /**
     * @notice Place a bid on an auction
     * @param listingId ID of the auction listing
     */
    function placeBid(uint256 listingId) external payable nonReentrant listingExists(listingId) listingActive(listingId) {
        Listing storage listing = listings[listingId];
        
        require(listing.listingType == ListingType.AUCTION, "Not an auction listing");
        require(block.timestamp < listing.endTime, "Auction ended");
        require(msg.value > listing.highestBid, "Bid must be higher than current highest bid");
        
        // Refund previous highest bidder
        if (listing.highestBidder != address(0)) {
            payable(listing.highestBidder).transfer(listing.highestBid);
        }
        
        // Record new bid
        listing.highestBid = msg.value;
        listing.highestBidder = msg.sender;
        
        // Add to bids array
        bids[listingId].push(Bid({
            bidder: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp
        }));
        
        emit BidPlaced(listingId, msg.sender, msg.value);
    }
    
    /**
     * @notice Accept the highest bid on an auction
     * @param listingId ID of the auction listing
     */
    function acceptHighestBid(uint256 listingId) external nonReentrant onlySeller(listingId) listingExists(listingId) listingActive(listingId) {
        Listing storage listing = listings[listingId];
        
        require(listing.listingType == ListingType.AUCTION, "Not an auction listing");
        require(block.timestamp >= listing.endTime, "Auction not ended");
        require(listing.highestBidder != address(0), "No bids");
        
        // Transfer funds to seller (minus platform fee)
        uint256 platformFeeAmount = (listing.highestBid * platformFee) / 10000;
        uint256 sellerAmount = listing.highestBid - platformFeeAmount;
        
        payable(listing.seller).transfer(sellerAmount);
        // Platform fee is kept in the contract
        
        // Update listing
        listing.status = ListingStatus.SOLD;
        listing.quantity = 0;
        
        emit BidAccepted(listingId, listing.seller, listing.highestBidder, listing.highestBid);
    }
    
    /**
     * @notice Create an escrow for a transaction
     * @param listingId ID of the listing
     */
    function createEscrow(uint256 listingId) external payable nonReentrant listingExists(listingId) listingActive(listingId) {
        Listing storage listing = listings[listingId];
        
        require(!listing.isEscrowed, "Already escrowed");
        
        uint256 totalPrice = listing.price;
        if (listing.listingType == ListingType.AUCTION) {
            totalPrice = listing.highestBid;
        }
        
        // For fixed price listings, the buyer pays the price
        // For auctions, the highest bidder has already paid
        if (listing.listingType == ListingType.FIXED_PRICE) {
            require(msg.value == totalPrice, "Incorrect payment amount");
        }
        
        uint256 escrowId = nextEscrowId++;
        
        escrows[escrowId] = Escrow({
            listingId: listingId,
            buyer: listing.listingType == ListingType.AUCTION ? listing.highestBidder : msg.sender,
            seller: listing.seller,
            amount: totalPrice,
            buyerApproved: false,
            sellerApproved: false,
            disputeOpened: false,
            resolver: address(0),
            createdAt: block.timestamp,
            resolvedAt: 0
        });
        
        listing.isEscrowed = true;
        
        emit EscrowCreated(escrowId, listingId, escrows[escrowId].buyer, listing.seller, totalPrice);
    }
    
    /**
     * @notice Approve an escrow (both buyer and seller must approve)
     * @param escrowId ID of the escrow
     */
    function approveEscrow(uint256 escrowId) external onlySellerOrBuyer(escrowId) {
        Escrow storage escrow = escrows[escrowId];
        
        require(!escrow.disputeOpened, "Dispute opened");
        require(escrow.resolvedAt == 0, "Escrow already resolved");
        
        if (msg.sender == escrow.buyer) {
            escrow.buyerApproved = true;
            emit EscrowApproved(escrowId, msg.sender);
        } else if (msg.sender == escrow.seller) {
            escrow.sellerApproved = true;
            emit EscrowApproved(escrowId, msg.sender);
        }
        
        // If both approved, release funds
        if (escrow.buyerApproved && escrow.sellerApproved) {
            _releaseEscrowFunds(escrowId);
        }
    }
    
    /**
     * @notice Open a dispute on an escrow
     * @param escrowId ID of the escrow
     */
    function openDispute(uint256 escrowId) external onlySellerOrBuyer(escrowId) {
        Escrow storage escrow = escrows[escrowId];
        
        require(!escrow.disputeOpened, "Dispute already opened");
        require(escrow.resolvedAt == 0, "Escrow already resolved");
        
        escrow.disputeOpened = true;
        // In a real implementation, a DAO would appoint a resolver
        escrow.resolver = owner(); // For now, owner acts as resolver
        
        // Emit event
    }
    
    /**
     * @notice Resolve a dispute (only resolver can call)
     * @param escrowId ID of the escrow
     * @param buyerWins Whether the buyer wins the dispute
     */
    function resolveDispute(uint256 escrowId, bool buyerWins) external onlyResolver(escrowId) {
        Escrow storage escrow = escrows[escrowId];
        
        require(escrow.disputeOpened, "No dispute opened");
        require(escrow.resolvedAt == 0, "Escrow already resolved");
        
        escrow.resolvedAt = block.timestamp;
        
        if (buyerWins) {
            // Refund buyer
            payable(escrow.buyer).transfer(escrow.amount);
        } else {
            // Pay seller
            uint256 platformFeeAmount = (escrow.amount * platformFee) / 10000;
            uint256 sellerAmount = escrow.amount - platformFeeAmount;
            payable(escrow.seller).transfer(sellerAmount);
            // Platform fee is kept in the contract
        }
        
        emit EscrowResolved(escrowId, msg.sender, buyerWins);
    }
    
    /**
     * @notice Internal function to release escrow funds
     * @param escrowId ID of the escrow
     */
    function _releaseEscrowFunds(uint256 escrowId) internal {
        Escrow storage escrow = escrows[escrowId];
        
        // Pay seller
        uint256 platformFeeAmount = (escrow.amount * platformFee) / 10000;
        uint256 sellerAmount = escrow.amount - platformFeeAmount;
        payable(escrow.seller).transfer(sellerAmount);
        // Platform fee is kept in the contract
        
        escrow.resolvedAt = block.timestamp;
        
        // Update listing status
        listings[escrow.listingId].status = ListingStatus.SOLD;
    }
    
    /**
     * @notice Update user reputation score
     * @param user Address of the user
     * @param score New reputation score
     */
    function updateReputationScore(address user, uint256 score) external onlyDAO {
        reputationScores[user] = score;
        emit ReputationUpdated(user, score);
    }
    
    /**
     * @notice Approve or revoke DAO vendor status
     * @param vendor Address of the vendor
     * @param approved Whether to approve or revoke
     */
    function setDAOApprovedVendor(address vendor, bool approved) external onlyDAO {
        daoApprovedVendors[vendor] = approved;
        emit VendorApproved(vendor, approved);
    }
    
    /**
     * @notice Set platform fee
     * @param newFee New platform fee in basis points
     */
    function setPlatformFee(uint256 newFee) external onlyDAO {
        require(newFee <= 1000, "Fee too high (max 10%)"); // Max 10%
        platformFee = newFee;
    }
    
    /**
     * @notice Set minimum reputation score
     * @param newScore New minimum reputation score
     */
    function setMinReputationScore(uint256 newScore) external onlyDAO {
        minReputationScore = newScore;
    }
    
    /**
     * @notice Get bids for an auction listing
     * @param listingId ID of the listing
     * @return Array of bids
     */
    function getBids(uint256 listingId) external view returns (Bid[] memory) {
        return bids[listingId];
    }
    
    /**
     * @notice Get active listings with pagination
     * @param start Start index
     * @param count Number of listings to return
     * @return Array of active listings
     */
    function getActiveListings(uint256 start, uint256 count) external view returns (Listing[] memory) {
        // In a real implementation, this would be more efficient
        // For now, we'll just return a simple array
        Listing[] memory result = new Listing[](count);
        uint256 resultIndex = 0;
        
        for (uint256 i = start; i < start + count && i < nextListingId; i++) {
            if (listings[i].status == ListingStatus.ACTIVE) {
                result[resultIndex] = listings[i];
                resultIndex++;
            }
        }
        
        return result;
    }
    
    // Fallback function to receive ETH
    receive() external payable {}
}