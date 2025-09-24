// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./LinkDAOToken.sol";
import "./EnhancedEscrow.sol";

/**
 * @title LinkDAO Marketplace
 * @notice A decentralized marketplace for buying and selling digital and physical goods with crypto payments
 */
contract Marketplace is ReentrancyGuard, Ownable {
    using Strings for uint256;

    // Enum for item types
    enum ItemType { PHYSICAL, DIGITAL, NFT, SERVICE }
    
    // Enum for listing types
    enum ListingType { FIXED_PRICE, AUCTION }
    
    // Enum for listing status
    enum ListingStatus { ACTIVE, SOLD, CANCELLED, EXPIRED }
    
    // Enum for NFT types
    enum NFTStandard { ERC721, ERC1155 }
    
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
        // NFT specific fields
        NFTStandard nftStandard;
        uint256 tokenId;
        // Auction specific fields
        uint256 reservePrice;
        uint256 minIncrement;
        bool reserveMet;
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
        // Delivery tracking
        string deliveryInfo;
        bool deliveryConfirmed;
    }
    
    // Struct for offer
    struct Offer {
        uint256 id;
        uint256 listingId;
        address buyer;
        uint256 amount;
        uint256 createdAt;
        bool accepted;
    }
    
    // Struct for order
    struct Order {
        uint256 id;
        uint256 listingId;
        address buyer;
        address seller;
        uint256 amount;
        address paymentToken;
        OrderStatus status;
        uint256 createdAt;
        uint256 escrowId;
    }
    
    // Enum for order status
    enum OrderStatus { PENDING, COMPLETED, DISPUTED, REFUNDED }
    
    // Struct for dispute
    struct Dispute {
        uint256 id;
        uint256 orderId;
        address reporter;
        string reason;
        DisputeStatus status;
        uint256 createdAt;
        uint256 resolvedAt;
        string resolution;
        // Evidence tracking
        string[] evidence;
    }
    
    // Enum for dispute status
    enum DisputeStatus { OPEN, IN_REVIEW, RESOLVED, ESCALATED }
    
    // Mapping of listing ID to Listing
    mapping(uint256 => Listing) public listings;
    
    // Mapping of listing ID to bids (for auctions)
    mapping(uint256 => Bid[]) public bids;
    
    // Mapping of escrow ID to Escrow
    mapping(uint256 => Escrow) public escrows;
    
    // New mapping for seller sales metrics
    mapping(address => SellerMetrics) public sellerMetrics;
    
    // New mapping for product listing metrics
    mapping(uint256 => ListingMetrics) public listingMetrics;
    
    // Struct for seller metrics
    struct SellerMetrics {
        uint256 totalSales;
        uint256 totalRevenue;
        uint256 successfulTransactions;
        uint256 averageRating;
        uint256 totalReviews;
        uint256 responseTime; // Average response time in seconds
        uint256 lastUpdated;
    }
    
    // Struct for listing metrics
    struct ListingMetrics {
        uint256 viewCount;
        uint256 favoriteCount;
        uint256 shareCount;
        uint256 lastUpdated;
    }
    
    // Mapping of user address to reputation score
    mapping(address => uint256) public reputationScores;
    
    // Mapping of user address to whether they are DAO approved
    mapping(address => bool) public daoApprovedVendors;
    
    // Mapping of listing ID to offers
    mapping(uint256 => Offer[]) public offers;
    
    // Mapping of order ID to Order
    mapping(uint256 => Order) public orders;
    
    // Mapping of dispute ID to Dispute
    mapping(uint256 => Dispute) public disputes;
    
    // Counter for listing IDs
    uint256 public nextListingId = 1;
    
    // Counter for escrow IDs
    uint256 public nextEscrowId = 1;
    
    // Counter for offer IDs
    uint256 public nextOfferId = 1;
    
    // Counter for order IDs
    uint256 public nextOrderId = 1;
    
    // Counter for dispute IDs
    uint256 public nextDisputeId = 1;
    
    // Platform fee (in basis points, e.g., 100 = 1%)
    uint256 public platformFee = 100;
    
    // Minimum reputation score to be a vendor
    uint256 public minReputationScore = 50;
    
    // Auction extension time (in seconds) - extend auction if bid placed near end
    uint256 public auctionExtensionTime = 5 minutes;
    
    // Reference to EnhancedEscrow contract
    EnhancedEscrow public enhancedEscrow;
    
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
    
    event OfferMade(
        uint256 indexed offerId,
        uint256 indexed listingId,
        address indexed buyer,
        uint256 amount
    );
    
    event OfferAccepted(
        uint256 indexed offerId,
        uint256 indexed listingId,
        address indexed seller,
        address buyer,
        uint256 amount
    );
    
    event DeliveryConfirmed(
        uint256 indexed escrowId,
        string deliveryInfo
    );
    
    event OrderCreated(
        uint256 indexed orderId,
        uint256 listingId,
        address buyer,
        address seller,
        uint256 amount
    );
    
    event OrderStatusUpdated(
        uint256 indexed orderId,
        OrderStatus status
    );
    
    // New events for enhanced sales metrics
    event SalesMetricsUpdated(
        address indexed seller,
        uint256 totalSales,
        uint256 totalRevenue,
        uint256 successfulTransactions,
        uint256 timestamp
    );
    
    event SellerPerformanceUpdated(
        address indexed seller,
        uint256 averageRating,
        uint256 totalReviews,
        uint256 responseTime,
        uint256 timestamp
    );
    
    // Additional events for comprehensive tracking
    event SellerRankingUpdated(
        address indexed seller,
        uint256 rankingScore,
        uint256 totalSales,
        uint256 totalRevenue,
        uint256 reputationScore,
        uint256 timestamp
    );
    
    event ProductListingMetricsUpdated(
        uint256 indexed listingId,
        uint256 viewCount,
        uint256 favoriteCount,
        uint256 shareCount,
        uint256 timestamp
    );
    
    event DisputeCreated(
        uint256 indexed disputeId,
        uint256 orderId,
        address reporter,
        string reason
    );
    
    event DisputeStatusUpdated(
        uint256 indexed disputeId,
        DisputeStatus status
    );
    
    event EvidenceSubmitted(
        uint256 indexed disputeId,
        address submitter,
        string evidence
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
     * @notice Constructor
     */
    constructor() {
        // EnhancedEscrow will be deployed separately and set later
    }
    
    /**
     * @notice Create a new fixed-price listing
     * @param tokenAddress Address of the ERC20 token for payment (address(0) for ETH)
     * @param price Price per item
     * @param quantity Quantity of items
     * @param itemType Type of item being sold
     * @param metadataURI IPFS hash for item metadata
     * @param nftStandard NFT standard (ERC721 or ERC1155) - only for NFT items
     * @param tokenId Token ID - only for NFT items
     */
    function createFixedPriceListing(
        address tokenAddress,
        uint256 price,
        uint256 quantity,
        ItemType itemType,
        string memory metadataURI,
        NFTStandard nftStandard,
        uint256 tokenId
    ) external {
        require(quantity > 0, "Quantity must be greater than 0");
        require(price > 0, "Price must be greater than 0");
        require(bytes(metadataURI).length > 0, "Metadata URI required");
        
        // For NFT items, validate NFT parameters
        if (itemType == ItemType.NFT) {
            require(tokenId > 0, "Token ID required for NFTs");
        }
        
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
            isEscrowed: false,
            nftStandard: nftStandard,
            tokenId: tokenId,
            reservePrice: 0,
            minIncrement: 0,
            reserveMet: false
        });
        
        // For NFT items, transfer NFT to contract
        if (itemType == ItemType.NFT) {
            if (nftStandard == NFTStandard.ERC721) {
                IERC721(listings[listingId].tokenAddress).transferFrom(
                    msg.sender,
                    address(this),
                    tokenId
                );
            } else if (nftStandard == NFTStandard.ERC1155) {
                IERC1155(listings[listingId].tokenAddress).safeTransferFrom(
                    msg.sender,
                    address(this),
                    tokenId,
                    quantity,
                    ""
                );
            }
        }
        
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
     * @param reservePrice Reserve price for the auction (0 if no reserve)
     * @param minIncrement Minimum bid increment
     * @param quantity Quantity of items
     * @param itemType Type of item being sold
     * @param duration Duration of the auction in seconds
     * @param metadataURI IPFS hash for item metadata
     * @param nftStandard NFT standard (ERC721 or ERC1155) - only for NFT items
     * @param tokenId Token ID - only for NFT items
     */
    function createAuctionListing(
        address tokenAddress,
        uint256 startingPrice,
        uint256 reservePrice,
        uint256 minIncrement,
        uint256 quantity,
        ItemType itemType,
        uint256 duration,
        string memory metadataURI,
        NFTStandard nftStandard,
        uint256 tokenId
    ) external {
        require(quantity > 0, "Quantity must be greater than 0");
        require(startingPrice > 0, "Starting price must be greater than 0");
        require(duration > 0, "Duration must be greater than 0");
        require(bytes(metadataURI).length > 0, "Metadata URI required");
        require(minIncrement > 0, "Minimum increment must be greater than 0");
        
        // For NFT items, validate NFT parameters
        if (itemType == ItemType.NFT) {
            require(tokenId > 0, "Token ID required for NFTs");
        }
        
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
            isEscrowed: false,
            nftStandard: nftStandard,
            tokenId: tokenId,
            reservePrice: reservePrice,
            minIncrement: minIncrement,
            reserveMet: false
        });
        
        // For NFT items, transfer NFT to contract
        if (itemType == ItemType.NFT) {
            if (nftStandard == NFTStandard.ERC721) {
                IERC721(listings[listingId].tokenAddress).transferFrom(
                    msg.sender,
                    address(this),
                    tokenId
                );
            } else if (nftStandard == NFTStandard.ERC1155) {
                IERC1155(listings[listingId].tokenAddress).safeTransferFrom(
                    msg.sender,
                    address(this),
                    tokenId,
                    quantity,
                    ""
                );
            }
        }
        
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
        Listing storage listing = listings[listingId];
        
        // For NFT items, transfer NFT back to seller
        if (listing.itemType == ItemType.NFT) {
            if (listing.nftStandard == NFTStandard.ERC721) {
                IERC721(listing.tokenAddress).transferFrom(
                    address(this),
                    msg.sender,
                    listing.tokenId
                );
            } else if (listing.nftStandard == NFTStandard.ERC1155) {
                IERC1155(listing.tokenAddress).safeTransferFrom(
                    address(this),
                    msg.sender,
                    listing.tokenId,
                    listing.quantity,
                    ""
                );
            }
        }
        
        listing.status = ListingStatus.CANCELLED;
        
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
        
        // Transfer item to buyer
        if (listing.itemType == ItemType.NFT) {
            // Transfer NFT to buyer
            if (listing.nftStandard == NFTStandard.ERC721) {
                IERC721(listing.tokenAddress).transferFrom(
                    address(this),
                    msg.sender,
                    listing.tokenId
                );
            } else if (listing.nftStandard == NFTStandard.ERC1155) {
                IERC1155(listing.tokenAddress).safeTransferFrom(
                    address(this),
                    msg.sender,
                    listing.tokenId,
                    quantity,
                    ""
                );
            }
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
        
        // Create order
        uint256 orderId = nextOrderId++;
        orders[orderId] = Order({
            id: orderId,
            listingId: listingId,
            buyer: msg.sender,
            seller: listing.seller,
            amount: totalPrice.toString(),
            paymentToken: listing.tokenAddress,
            status: OrderStatus.PENDING,
            createdAt: block.timestamp,
            escrowId: 0
        });
        
        emit ItemSold(listingId, msg.sender, listing.tokenAddress, totalPrice, quantity);
        emit OrderCreated(orderId, listingId, msg.sender, listing.seller, totalPrice);
        
        // Update seller metrics
        _updateSellerMetrics(listing.seller, totalPrice);
    }
    
    /**
     * @notice Update seller metrics after a sale
     * @param seller Address of the seller
     * @param saleAmount Amount of the sale
     */
    function _updateSellerMetrics(address seller, uint256 saleAmount) internal {
        SellerMetrics storage metrics = sellerMetrics[seller];
        metrics.totalSales += 1;
        metrics.totalRevenue += saleAmount;
        metrics.successfulTransactions += 1;
        metrics.lastUpdated = block.timestamp;
        
        emit SalesMetricsUpdated(
            seller,
            metrics.totalSales,
            metrics.totalRevenue,
            metrics.successfulTransactions,
            block.timestamp
        );
    }
    
    /**
     * @notice Place a bid on an auction
     * @param listingId ID of the auction listing
     */
    function placeBid(uint256 listingId) external payable nonReentrant listingExists(listingId) listingActive(listingId) {
        Listing storage listing = listings[listingId];
        
        require(listing.listingType == ListingType.AUCTION, "Not an auction listing");
        require(block.timestamp < listing.endTime, "Auction ended");
        
        uint256 minBid = listing.highestBid > 0 ? listing.highestBid + listing.minIncrement : listing.price;
        require(msg.value >= minBid, "Bid must meet minimum requirement");
        
        // Check reserve price
        if (listing.reservePrice > 0 && msg.value >= listing.reservePrice) {
            listing.reserveMet = true;
        }
        
        // Anti-sniping: extend auction if bid placed near end
        if (listing.endTime - block.timestamp < auctionExtensionTime) {
            listing.endTime = block.timestamp + auctionExtensionTime;
        }
        
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
        require(block.timestamp >= listing.endTime || (listing.reservePrice > 0 && listing.reserveMet), "Auction not ended or reserve not met");
        require(listing.highestBidder != address(0), "No bids");
        
        // Transfer item to highest bidder
        if (listing.itemType == ItemType.NFT) {
            // Transfer NFT to highest bidder
            if (listing.nftStandard == NFTStandard.ERC721) {
                IERC721(listing.tokenAddress).transferFrom(
                    address(this),
                    listing.highestBidder,
                    listing.tokenId
                );
            } else if (listing.nftStandard == NFTStandard.ERC1155) {
                IERC1155(listing.tokenAddress).safeTransferFrom(
                    address(this),
                    listing.highestBidder,
                    listing.tokenId,
                    listing.quantity,
                    ""
                );
            }
        }
        
        // Transfer funds to seller (minus platform fee)
        uint256 platformFeeAmount = (listing.highestBid * platformFee) / 10000;
        uint256 sellerAmount = listing.highestBid - platformFeeAmount;
        
        payable(listing.seller).transfer(sellerAmount);
        // Platform fee is kept in the contract
        
        // Update listing
        listing.status = ListingStatus.SOLD;
        listing.quantity = 0;
        
        // Create order
        uint256 orderId = nextOrderId++;
        orders[orderId] = Order({
            id: orderId,
            listingId: listingId,
            buyer: listing.highestBidder,
            seller: listing.seller,
            amount: listing.highestBid.toString(),
            paymentToken: listing.tokenAddress,
            status: OrderStatus.PENDING,
            createdAt: block.timestamp,
            escrowId: 0
        });
        
        emit BidAccepted(listingId, listing.seller, listing.highestBidder, listing.highestBid);
        emit OrderCreated(orderId, listingId, listing.highestBidder, listing.seller, listing.highestBid);
        
        // Update seller metrics
        _updateSellerMetrics(listing.seller, listing.highestBid);
    }
    
    /**
     * @notice Make an offer on a listing
     * @param listingId ID of the listing
     * @param amount Offer amount
     */
    function makeOffer(uint256 listingId, uint256 amount) external payable nonReentrant listingExists(listingId) listingActive(listingId) {
        Listing storage listing = listings[listingId];
        
        require(amount > 0, "Offer amount must be greater than 0");
        require(msg.sender != listing.seller, "Cannot make offer on own listing");
        
        // For ETH payments, require correct amount
        if (listing.tokenAddress == address(0)) {
            require(msg.value == amount, "Incorrect ETH amount");
        } else {
            // For ERC20 payments, transfer tokens
            require(msg.value == 0, "No ETH should be sent for ERC20 payments");
            IERC20 token = IERC20(listing.tokenAddress);
            require(token.transferFrom(msg.sender, address(this), amount), "Token transfer failed");
        }
        
        uint256 offerId = nextOfferId++;
        
        offers[listingId].push(Offer({
            id: offerId,
            listingId: listingId,
            buyer: msg.sender,
            amount: amount,
            createdAt: block.timestamp,
            accepted: false
        }));
        
        emit OfferMade(offerId, listingId, msg.sender, amount);
    }
    
    /**
     * @notice Accept an offer
     * @param listingId ID of the listing
     * @param offerId ID of the offer to accept
     */
    function acceptOffer(uint256 listingId, uint256 offerId) external nonReentrant onlySeller(listingId) listingExists(listingId) listingActive(listingId) {
        Listing storage listing = listings[listingId];
        Offer[] storage listingOffers = offers[listingId];
        
        // Find the offer
        uint256 offerIndex = type(uint256).max;
        for (uint256 i = 0; i < listingOffers.length; i++) {
            if (listingOffers[i].id == offerId && !listingOffers[i].accepted) {
                offerIndex = i;
                break;
            }
        }
        
        require(offerIndex != type(uint256).max, "Offer not found or already accepted");
        
        Offer storage offer = listingOffers[offerIndex];
        
        // Transfer item to buyer
        if (listing.itemType == ItemType.NFT) {
            // Transfer NFT to buyer
            if (listing.nftStandard == NFTStandard.ERC721) {
                IERC721(listing.tokenAddress).transferFrom(
                    address(this),
                    offer.buyer,
                    listing.tokenId
                );
            } else if (listing.nftStandard == NFTStandard.ERC1155) {
                IERC1155(listing.tokenAddress).safeTransferFrom(
                    address(this),
                    offer.buyer,
                    listing.tokenId,
                    1, // For offers, assume quantity of 1
                    ""
                );
            }
        }
        
        // Transfer funds to seller (minus platform fee)
        uint256 platformFeeAmount = (offer.amount * platformFee) / 10000;
        uint256 sellerAmount = offer.amount - platformFeeAmount;
        
        if (listing.tokenAddress == address(0)) {
            // ETH payment - refund excess and transfer to seller
            if (offer.amount < msg.value) {
                payable(offer.buyer).transfer(msg.value - offer.amount);
            }
            payable(listing.seller).transfer(sellerAmount);
        } else {
            // ERC20 payment
            IERC20 token = IERC20(listing.tokenAddress);
            require(token.transfer(listing.seller, sellerAmount), "Token transfer to seller failed");
            // Refund excess tokens if any
        }
        
        // Mark offer as accepted
        offer.accepted = true;
        
        // Update listing
        listing.status = ListingStatus.SOLD;
        listing.quantity = listing.quantity > 0 ? listing.quantity - 1 : 0;
        
        // Create order
        uint256 orderId = nextOrderId++;
        orders[orderId] = Order({
            id: orderId,
            listingId: listingId,
            buyer: offer.buyer,
            seller: listing.seller,
            amount: offer.amount.toString(),
            paymentToken: listing.tokenAddress,
            status: OrderStatus.PENDING,
            createdAt: block.timestamp,
            escrowId: 0
        });
        
        emit OfferAccepted(offerId, listingId, msg.sender, offer.buyer, offer.amount);
        emit OrderCreated(orderId, listingId, offer.buyer, listing.seller, offer.amount);
        
        // Update seller metrics
        _updateSellerMetrics(listing.seller, offer.amount);
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
            resolvedAt: 0,
            deliveryInfo: "",
            deliveryConfirmed: false
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
     * @notice Confirm delivery for an escrow
     * @param escrowId ID of the escrow
     * @param deliveryInfo Delivery information
     */
    function confirmDelivery(uint256 escrowId, string calldata deliveryInfo) external onlySeller(listings[escrowId].listingId) {
        Escrow storage escrow = escrows[escrowId];
        
        require(!escrow.disputeOpened, "Dispute opened");
        require(escrow.resolvedAt == 0, "Escrow already resolved");
        
        escrow.deliveryInfo = deliveryInfo;
        escrow.deliveryConfirmed = true;
        
        emit DeliveryConfirmed(escrowId, deliveryInfo);
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
        
        // Create dispute record
        uint256 disputeId = nextDisputeId++;
        disputes[disputeId] = Dispute({
            id: disputeId,
            orderId: 0, // This would be linked to an order in a real implementation
            reporter: msg.sender,
            reason: "Dispute opened",
            status: DisputeStatus.OPEN,
            createdAt: block.timestamp,
            resolvedAt: 0,
            resolution: "",
            evidence: new string[](0)
        });
        
        emit DisputeCreated(disputeId, 0, msg.sender, "Dispute opened");
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
     * @notice Submit evidence for a dispute
     * @param disputeId ID of the dispute
     * @param evidence Evidence information
     */
    function submitEvidence(uint256 disputeId, string calldata evidence) external {
        Dispute storage dispute = disputes[disputeId];
        
        require(dispute.id != 0, "Dispute does not exist");
        require(dispute.status == DisputeStatus.OPEN || dispute.status == DisputeStatus.IN_REVIEW, "Dispute not in correct status");
        
        // Add evidence to dispute
        dispute.evidence.push(evidence);
        
        emit EvidenceSubmitted(disputeId, msg.sender, evidence);
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
     * @notice Set auction extension time
     * @param newTime New auction extension time in seconds
     */
    function setAuctionExtensionTime(uint256 newTime) external onlyDAO {
        auctionExtensionTime = newTime;
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
     * @notice Get offers for a listing
     * @param listingId ID of the listing
     * @return Array of offers
     */
    function getOffers(uint256 listingId) external view returns (Offer[] memory) {
        return offers[listingId];
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
    
    /**
     * @notice Get order by ID
     * @param orderId ID of the order
     * @return Order information
     */
    function getOrder(uint256 orderId) external view returns (Order memory) {
        return orders[orderId];
    }
    
    /**
     * @notice Get dispute by ID
     * @param disputeId ID of the dispute
     * @return Dispute information
     */
    function getDispute(uint256 disputeId) external view returns (Dispute memory) {
        return disputes[disputeId];
    }
    
    /**
     * @notice Update seller performance metrics
     * @param seller Address of the seller
     * @param averageRating Average rating of the seller
     * @param totalReviews Total number of reviews
     * @param responseTime Average response time in seconds
     */
    function updateSellerPerformance(
        address seller,
        uint256 averageRating,
        uint256 totalReviews,
        uint256 responseTime
    ) external {
        // In a real implementation, this would be called by the reputation system
        // For now, we'll allow the contract owner to update
        require(msg.sender == owner(), "Not authorized");
        
        SellerMetrics storage metrics = sellerMetrics[seller];
        metrics.averageRating = averageRating;
        metrics.totalReviews = totalReviews;
        metrics.responseTime = responseTime;
        metrics.lastUpdated = block.timestamp;
        
        emit SellerPerformanceUpdated(
            seller,
            averageRating,
            totalReviews,
            responseTime,
            block.timestamp
        );
    }
    
    /**
     * @notice Get seller metrics
     * @param seller Address of the seller
     * @return Seller metrics
     */
    function getSellerMetrics(address seller) external view returns (SellerMetrics memory) {
        return sellerMetrics[seller];
    }
    
    /**
     * @notice Update listing view count
     * @param listingId ID of the listing
     */
    function updateListingViewCount(uint256 listingId) external {
        listingMetrics[listingId].viewCount += 1;
        listingMetrics[listingId].lastUpdated = block.timestamp;
        
        emit ProductListingMetricsUpdated(
            listingId,
            listingMetrics[listingId].viewCount,
            listingMetrics[listingId].favoriteCount,
            listingMetrics[listingId].shareCount,
            block.timestamp
        );
    }
    
    /**
     * @notice Update listing favorite count
     * @param listingId ID of the listing
     */
    function updateListingFavoriteCount(uint256 listingId) external {
        listingMetrics[listingId].favoriteCount += 1;
        listingMetrics[listingId].lastUpdated = block.timestamp;
        
        emit ProductListingMetricsUpdated(
            listingId,
            listingMetrics[listingId].viewCount,
            listingMetrics[listingId].favoriteCount,
            listingMetrics[listingId].shareCount,
            block.timestamp
        );
    }
    
    /**
     * @notice Update listing share count
     * @param listingId ID of the listing
     */
    function updateListingShareCount(uint256 listingId) external {
        listingMetrics[listingId].shareCount += 1;
        listingMetrics[listingId].lastUpdated = block.timestamp;
        
        emit ProductListingMetricsUpdated(
            listingId,
            listingMetrics[listingId].viewCount,
            listingMetrics[listingId].favoriteCount,
            listingMetrics[listingId].shareCount,
            block.timestamp
        );
    }
    
    /**
     * @notice Get listing metrics
     * @param listingId ID of the listing
     * @return Listing metrics
     */
    function getListingMetrics(uint256 listingId) external view returns (ListingMetrics memory) {
        return listingMetrics[listingId];
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
     * @notice Set auction extension time
     * @param newTime New auction extension time in seconds
     */
    function setAuctionExtensionTime(uint256 newTime) external onlyDAO {
        auctionExtensionTime = newTime;
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
     * @notice Get offers for a listing
     * @param listingId ID of the listing
     * @return Array of offers
     */
    function getOffers(uint256 listingId) external view returns (Offer[] memory) {
        return offers[listingId];
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
    
    /**
     * @notice Get order by ID
     * @param orderId ID of the order
     * @return Order information
     */
    function getOrder(uint256 orderId) external view returns (Order memory) {
        return orders[orderId];
    }
    
    /**
     * @notice Get dispute by ID
     * @param disputeId ID of the dispute
     * @return Dispute information
     */
    function getDispute(uint256 disputeId) external view returns (Dispute memory) {
        return disputes[disputeId];
    }
    
    // Fallback function to receive ETH
    receive() external payable {}
}