// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./LDAOToken.sol";
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
    
    // Enum for order status
    enum OrderStatus { PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED, DISPUTED }
    
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
        uint256 updatedAt;
        string shippingInfo;
        string trackingNumber;
    }
    
    // Struct for dispute
    struct Dispute {
        uint256 id;
        uint256 orderId;
        address complainant;
        address respondent;
        string reason;
        uint256 createdAt;
        bool resolved;
        address resolver;
        string resolution;
    }

    // State variables
    uint256 public nextListingId = 1;
    uint256 public nextOfferId = 1;
    uint256 public nextOrderId = 1;
    uint256 public nextDisputeId = 1;
    uint256 public platformFeePercentage = 250; // 2.5% (basis points)
    uint256 public constant MAX_PLATFORM_FEE = 1000; // 10% max
    uint256 public constant AUCTION_EXTENSION_TIME = 10 minutes;
    uint256 public minReputationScore = 0;
    
    // Contract references
    LDAOToken public ldaoToken;
    EnhancedEscrow public escrowContract;
    
    // Mappings
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Bid[]) public listingBids;
    mapping(uint256 => Offer[]) public listingOffers;
    mapping(uint256 => Order) public orders;
    mapping(uint256 => Dispute) public disputes;
    mapping(address => uint256[]) public userListings;
    mapping(address => uint256[]) public userOrders;
    mapping(address => uint256) public reputationScores;
    mapping(address => bool) public daoApprovedVendors;
    
    // Events
    event ListingCreated(uint256 indexed listingId, address indexed seller, uint256 price, ItemType itemType);
    event ListingUpdated(uint256 indexed listingId, uint256 newPrice);
    event ListingCancelled(uint256 indexed listingId);
    event BidPlaced(uint256 indexed listingId, address indexed bidder, uint256 amount);
    event AuctionEnded(uint256 indexed listingId, address indexed winner, uint256 amount);
    event OfferMade(uint256 indexed offerId, uint256 indexed listingId, address indexed buyer, uint256 amount);
    event OfferAccepted(uint256 indexed offerId, uint256 indexed listingId);
    event OrderCreated(uint256 indexed orderId, uint256 indexed listingId, address indexed buyer);
    event OrderCreatedWithDiscount(uint256 indexed orderId, uint256 indexed listingId, address indexed buyer, uint256 discountAmount, uint256 discountPercentage);
    event OrderStatusUpdated(uint256 indexed orderId, OrderStatus status);
    event DisputeCreated(uint256 indexed disputeId, uint256 indexed orderId, address indexed complainant);
    event DisputeResolved(uint256 indexed disputeId, string resolution);
    event ReputationUpdated(address indexed user, uint256 newScore);
    
    // Modifiers
    modifier listingExists(uint256 listingId) {
        require(listingId > 0 && listingId < nextListingId, "Listing does not exist");
        _;
    }
    
    modifier onlyListingSeller(uint256 listingId) {
        require(listings[listingId].seller == msg.sender, "Only listing seller can call this function");
        _;
    }
    
    modifier onlyDAO() {
        require(ldaoToken.balanceOf(msg.sender) >= 1000 * 10**18, "Insufficient DAO tokens"); // Simplified DAO check
        _;
    }
    
    modifier hasMinReputation() {
        require(reputationScores[msg.sender] >= minReputationScore, "Insufficient reputation");
        _;
    }

    constructor(address _ldaoToken) Ownable(msg.sender) {
        ldaoToken = LDAOToken(_ldaoToken);
    }

    /**
     * @notice Create a new marketplace listing
     * @param tokenAddress Payment token address (address(0) for ETH)
     * @param price Price in wei or token units
     * @param quantity Quantity available
     * @param itemType Type of item being sold
     * @param listingType Fixed price or auction
     * @param endTime End time for auctions
     * @param metadataURI IPFS hash for item metadata
     * @return listingId ID of the created listing
     */
    function createListing(
        address tokenAddress,
        uint256 price,
        uint256 quantity,
        ItemType itemType,
        ListingType listingType,
        uint256 endTime,
        string calldata metadataURI
    ) external hasMinReputation returns (uint256) {
        require(price > 0, "Price must be greater than 0");
        require(quantity > 0, "Quantity must be greater than 0");
        require(bytes(metadataURI).length > 0, "Metadata URI required");
        
        if (listingType == ListingType.AUCTION) {
            require(endTime > block.timestamp, "End time must be in the future");
        }
        
        uint256 listingId = nextListingId++;
        
        Listing storage listing = listings[listingId];
        listing.id = listingId;
        listing.seller = msg.sender;
        listing.tokenAddress = tokenAddress;
        listing.price = price;
        listing.quantity = quantity;
        listing.itemType = itemType;
        listing.listingType = listingType;
        listing.status = ListingStatus.ACTIVE;
        listing.startTime = block.timestamp;
        listing.endTime = endTime;
        listing.metadataURI = metadataURI;
        
        userListings[msg.sender].push(listingId);
        
        emit ListingCreated(listingId, msg.sender, price, itemType);
        
        return listingId;
    }

    /**
     * @notice Update listing price
     * @param listingId ID of the listing
     * @param newPrice New price
     */
    function updateListingPrice(uint256 listingId, uint256 newPrice) 
        external 
        listingExists(listingId) 
        onlyListingSeller(listingId) 
    {
        require(newPrice > 0, "Price must be greater than 0");
        Listing storage listing = listings[listingId];
        require(listing.status == ListingStatus.ACTIVE, "Listing not active");
        require(listing.listingType == ListingType.FIXED_PRICE, "Cannot update auction price");
        
        listing.price = newPrice;
        
        emit ListingUpdated(listingId, newPrice);
    }

    /**
     * @notice Cancel a listing
     * @param listingId ID of the listing
     */
    function cancelListing(uint256 listingId) 
        external 
        listingExists(listingId) 
        onlyListingSeller(listingId) 
    {
        Listing storage listing = listings[listingId];
        require(listing.status == ListingStatus.ACTIVE, "Listing not active");
        
        if (listing.listingType == ListingType.AUCTION && listing.highestBidder != address(0)) {
            // Refund highest bidder
            _refundBidder(listingId, listing.highestBidder, listing.highestBid);
        }
        
        listing.status = ListingStatus.CANCELLED;
        
        emit ListingCancelled(listingId);
    }

    /**
     * @notice Purchase a listing
     * @param listingId ID of the listing
     * @param quantity Quantity to purchase
     */
    function purchaseListing(uint256 listingId, uint256 quantity) 
        external 
        payable 
        nonReentrant 
        listingExists(listingId) 
        hasMinReputation 
    {
        Listing storage listing = listings[listingId];
        require(listing.status == ListingStatus.ACTIVE, "Listing not active");
        require(listing.listingType == ListingType.FIXED_PRICE, "Not a fixed price listing");
        require(quantity > 0 && quantity <= listing.quantity, "Invalid quantity");
        require(listing.startTime <= block.timestamp, "Listing not started yet");
        
        uint256 totalPrice = listing.price * quantity;
        
        // Apply LDAO payment discount if paying with LDAO tokens
        bool isLDAOPayment = (listing.tokenAddress == address(ldaoToken));
        uint256 discountPercentage = 0;
        
        if (isLDAOPayment) {
            // Get user's discount tier based on LDAO staking
            uint256 userDiscountTier = ldaoToken.getDiscountTier(msg.sender);
            
            // Apply discount based on tier:
            // Tier 0: 0% discount
            // Tier 1: 5% discount
            // Tier 2: 10% discount  
            // Tier 3: 15% discount
            if (userDiscountTier == 1) {
                discountPercentage = 500; // 5% in basis points
            } else if (userDiscountTier == 2) {
                discountPercentage = 1000; // 10% in basis points
            } else if (userDiscountTier == 3) {
                discountPercentage = 1500; // 15% in basis points
            }
            
            // Additional 2% discount for paying with LDAO tokens regardless of staking tier
            discountPercentage += 200; // 2% in basis points
        }
        
        // Apply discount to total price
        uint256 discountAmount = (totalPrice * discountPercentage) / 10000;
        uint256 discountedPrice = totalPrice - discountAmount;
        
        // Calculate platform fee with reduction based on user's staking tier
        uint256 effectiveFeePercentage = platformFeePercentage;
        
        // Reduce platform fee based on user's staking tier
        uint256 userDiscountTier = ldaoToken.getDiscountTier(msg.sender);
        if (userDiscountTier == 1) {
            effectiveFeePercentage = (effectiveFeePercentage * 90) / 100; // 10% fee reduction
        } else if (userDiscountTier == 2) {
            effectiveFeePercentage = (effectiveFeePercentage * 80) / 100; // 20% fee reduction
        } else if (userDiscountTier == 3) {
            effectiveFeePercentage = (effectiveFeePercentage * 70) / 100; // 30% fee reduction
        }
        
        uint256 feeAmount = (discountedPrice * effectiveFeePercentage) / 10000;
        uint256 sellerAmount = discountedPrice - feeAmount;
        
        if (listing.tokenAddress == address(0)) {
            // ETH payment
            require(msg.value == totalPrice, "Incorrect ETH amount");
            
            // Send ETH to seller and platform owner with proper error handling
            (bool sentToSeller, ) = payable(listing.seller).call{value: sellerAmount}("");
            require(sentToSeller, "Failed to send ETH to seller");
            
            (bool sentToOwner, ) = payable(owner()).call{value: feeAmount}("");
            require(sentToOwner, "Failed to send ETH to owner");
        } else {
            // ERC20 token payment
            require(msg.value == 0, "ETH not accepted for token payments");
            IERC20(listing.tokenAddress).transferFrom(msg.sender, address(this), totalPrice);
            IERC20(listing.tokenAddress).transfer(listing.seller, sellerAmount);
            IERC20(listing.tokenAddress).transfer(owner(), feeAmount);
        }
        
        // Update listing
        listing.quantity -= quantity;
        if (listing.quantity == 0) {
            listing.status = ListingStatus.SOLD;
        }
        
        // Create order
        uint256 orderId = nextOrderId++;
        Order storage order = orders[orderId];
        order.id = orderId;
        order.listingId = listingId;
        order.buyer = msg.sender;
        order.seller = listing.seller;
        order.amount = discountedPrice; // Store discounted amount
        order.paymentToken = listing.tokenAddress;
        order.status = OrderStatus.CONFIRMED;
        order.createdAt = block.timestamp;
        order.updatedAt = block.timestamp;
        
        userOrders[msg.sender].push(orderId);
        
        // Emit event with discount information
        emit OrderCreatedWithDiscount(orderId, listingId, msg.sender, discountAmount, discountPercentage);
    }

    /**
     * @notice Place a bid on an auction
     * @param listingId ID of the listing
     */
    function placeBid(uint256 listingId) 
        external 
        payable 
        nonReentrant 
        listingExists(listingId) 
    {
        Listing storage listing = listings[listingId];
        require(listing.status == ListingStatus.ACTIVE, "Listing not active");
        require(listing.listingType == ListingType.AUCTION, "Not an auction");
        require(block.timestamp < listing.endTime, "Auction ended");
        require(msg.sender != listing.seller, "Cannot bid on own auction");
        
        uint256 bidAmount;
        if (listing.tokenAddress == address(0)) {
            bidAmount = msg.value;
        } else {
            require(msg.value == 0, "ETH not accepted for token payments");
            // Get user's staking tier discount for LDAO token payments
            uint256 discountPercentage = 0;
            if (listing.tokenAddress == address(ldaoToken)) {
                uint256 userDiscountTier = ldaoToken.getDiscountTier(msg.sender);
                
                // Apply bid discount based on staking tier
                if (userDiscountTier == 1) {
                    discountPercentage = 200; // 2% discount
                } else if (userDiscountTier == 2) {
                    discountPercentage = 300; // 3% discount
                } else if (userDiscountTier == 3) {
                    discountPercentage = 500; // 5% discount
                }
            }
            
            // Calculate bid amount after discount
            uint256 totalBid = msg.value; // This is the total amount being bid
            uint256 discountAmount = (totalBid * discountPercentage) / 10000;
            bidAmount = totalBid - discountAmount;
        }
        
        require(bidAmount > listing.highestBid, "Bid too low");
        require(bidAmount >= listing.reservePrice, "Bid below reserve price");
        
        // Refund previous highest bidder
        if (listing.highestBidder != address(0)) {
            _refundBidder(listingId, listing.highestBidder, listing.highestBid);
        }
        
        // Update auction state
        listing.highestBid = bidAmount;
        listing.highestBidder = msg.sender;
        
        // Extend auction if bid placed in last 10 minutes
        if (listing.endTime - block.timestamp < AUCTION_EXTENSION_TIME) {
            listing.endTime = block.timestamp + AUCTION_EXTENSION_TIME;
        }
        
        // Store bid
        listingBids[listingId].push(Bid({
            bidder: msg.sender,
            amount: bidAmount,
            timestamp: block.timestamp
        }));
        
        emit BidPlaced(listingId, msg.sender, bidAmount);
    }

    /**
     * @notice Accept the highest bid for an auction
     * @param listingId ID of the listing
     */
    function acceptHighestBid(uint256 listingId) 
        external 
        nonReentrant 
        listingExists(listingId) 
        onlyListingSeller(listingId) 
    {
        Listing storage listing = listings[listingId];
        require(listing.status == ListingStatus.ACTIVE, "Listing not active");
        require(listing.listingType == ListingType.AUCTION, "Not an auction listing");
        require(block.timestamp >= listing.endTime, "Auction not ended yet");
        require(listing.highestBid > 0, "No bids");
        
        address bidder = listing.highestBidder;
        uint256 amount = listing.highestBid;
        
        // Calculate platform fee with reduction based on seller's staking tier
        uint256 effectiveFeePercentage = platformFeePercentage;
        
        // Reduce platform fee based on seller's staking tier
        uint256 sellerDiscountTier = ldaoToken.getDiscountTier(listing.seller);
        if (sellerDiscountTier == 1) {
            effectiveFeePercentage = (effectiveFeePercentage * 90) / 100; // 10% fee reduction
        } else if (sellerDiscountTier == 2) {
            effectiveFeePercentage = (effectiveFeePercentage * 80) / 100; // 20% fee reduction
        } else if (sellerDiscountTier == 3) {
            effectiveFeePercentage = (effectiveFeePercentage * 70) / 100; // 30% fee reduction
        }
        
        uint256 feeAmount = (amount * effectiveFeePercentage) / 10000;
        uint256 sellerAmount = amount - feeAmount;
        
        if (listing.tokenAddress == address(0)) {
            // ETH payment
            // Send ETH to seller and platform owner with proper error handling
            (bool sentToSeller, ) = payable(listing.seller).call{value: sellerAmount}("");
            require(sentToSeller, "Failed to send ETH to seller");
            
            (bool sentToOwner, ) = payable(owner()).call{value: feeAmount}("");
            require(sentToOwner, "Failed to send ETH to owner");
        } else {
            // ERC20 token payment
            IERC20(listing.tokenAddress).transfer(bidder, amount);
            IERC20(listing.tokenAddress).transfer(listing.seller, sellerAmount);
            IERC20(listing.tokenAddress).transfer(owner(), feeAmount);
        }
        
        listing.status = ListingStatus.SOLD;
        
        // Create order
        uint256 orderId = nextOrderId++;
        Order storage order = orders[orderId];
        order.id = orderId;
        order.listingId = listingId;
        order.buyer = bidder;
        order.seller = listing.seller;
        order.amount = amount;
        order.paymentToken = listing.tokenAddress;
        order.status = OrderStatus.CONFIRMED;
        order.createdAt = block.timestamp;
        order.updatedAt = block.timestamp;
        
        userOrders[bidder].push(orderId);
        
        emit AuctionEnded(listingId, bidder, amount);
        emit OrderCreated(orderId, listingId, bidder);
    }

    /**
     * @notice Make an offer on a listing
     * @param listingId ID of the listing
     * @param amount Offer amount
     */
    function makeOffer(uint256 listingId, uint256 amount) 
        external 
        payable 
        nonReentrant 
        listingExists(listingId) 
        returns (uint256) 
    {
        Listing storage listing = listings[listingId];
        require(listing.status == ListingStatus.ACTIVE, "Listing not active");
        require(amount > 0, "Offer amount must be greater than 0");
        require(msg.sender != listing.seller, "Cannot make offer on own listing");
        
        // Handle payment escrow
        if (listing.tokenAddress == address(0)) {
            require(msg.value == amount, "Incorrect ETH amount");
        } else {
            require(msg.value == 0, "ETH not accepted for token payments");
            IERC20(listing.tokenAddress).transferFrom(msg.sender, address(this), amount);
        }
        
        uint256 offerId = nextOfferId++;
        
        listingOffers[listingId].push(Offer({
            id: offerId,
            listingId: listingId,
            buyer: msg.sender,
            amount: amount,
            createdAt: block.timestamp,
            accepted: false
        }));
        
        emit OfferMade(offerId, listingId, msg.sender, amount);
        
        return offerId;
    }

    /**
     * @notice Accept an offer
     * @param offerId ID of the offer
     */
    function acceptOffer(uint256 offerId) external nonReentrant {
        // Find the offer
        Offer memory offerMem;
        uint256 listingId;
        
        // Search for the offer in all listings (inefficient but simple)
        bool found = false;
        for (uint256 i = 1; i < nextListingId; i++) {
            Offer[] storage offers = listingOffers[i];
            for (uint256 j = 0; j < offers.length; j++) {
                if (offers[j].id == offerId) {
                    offerMem = offers[j];
                    listingId = i;
                    found = true;
                    break;
                }
            }
            if (found) break;
        }
        
        require(found, "Offer not found");
        require(!offerMem.accepted, "Offer already accepted");
        
        Listing storage listing = listings[listingId];
        require(listing.status == ListingStatus.ACTIVE, "Listing not active");
        require(listing.seller == msg.sender, "Only seller can accept offer");
        
        uint256 amount = offerMem.amount;
        uint256 feeAmount = (amount * platformFeePercentage) / 10000;
        uint256 sellerAmount = amount - feeAmount;
        
        if (listing.tokenAddress == address(0)) {
            // ETH payment
            // Send ETH to seller and platform owner with proper error handling
            (bool sentToSeller, ) = payable(listing.seller).call{value: sellerAmount}("");
            require(sentToSeller, "Failed to send ETH to seller");
            
            (bool sentToOwner, ) = payable(owner()).call{value: feeAmount}("");
            require(sentToOwner, "Failed to send ETH to owner");
        } else {
            // ERC20 token payment
            IERC20(listing.tokenAddress).transferFrom(offerMem.buyer, address(this), amount);
            IERC20(listing.tokenAddress).transfer(listing.seller, sellerAmount);
            IERC20(listing.tokenAddress).transfer(owner(), feeAmount);
        }
        
        // Update offer and listing
        Offer[] storage offers = listingOffers[listingId];
        for (uint256 j = 0; j < offers.length; j++) {
            if (offers[j].id == offerId) {
                offers[j].accepted = true;
                break;
            }
        }
        listing.status = ListingStatus.SOLD;
        
        // Create order
        uint256 orderId = nextOrderId++;
        Order storage order = orders[orderId];
        order.id = orderId;
        order.listingId = listingId;
        order.buyer = offerMem.buyer;
        order.seller = listing.seller;
        order.amount = amount;
        order.paymentToken = listing.tokenAddress;
        order.status = OrderStatus.CONFIRMED;
        order.createdAt = block.timestamp;
        order.updatedAt = block.timestamp;
        
        userOrders[offerMem.buyer].push(orderId);
        
        emit OfferAccepted(offerId, listingId);
        emit OrderCreated(orderId, listingId, offerMem.buyer);
    }

    // View functions
    function getActiveListings(uint256 start, uint256 count) 
        external 
        view 
        returns (Listing[] memory) 
    {
        uint256 activeCount = 0;
        for (uint256 i = 1; i < nextListingId; i++) {
            if (listings[i].status == ListingStatus.ACTIVE) {
                activeCount++;
            }
        }
        
        uint256 returnCount = count;
        if (start + count > activeCount) {
            returnCount = activeCount > start ? activeCount - start : 0;
        }
        
        Listing[] memory result = new Listing[](returnCount);
        uint256 currentIndex = 0;
        uint256 resultIndex = 0;
        
        for (uint256 i = 1; i < nextListingId && resultIndex < returnCount; i++) {
            if (listings[i].status == ListingStatus.ACTIVE) {
                if (currentIndex >= start) {
                    result[resultIndex] = listings[i];
                    resultIndex++;
                }
                currentIndex++;
            }
        }
        
        return result;
    }

    function getBids(uint256 listingId) external view returns (Bid[] memory) {
        return listingBids[listingId];
    }

    function getOffers(uint256 listingId) external view returns (Offer[] memory) {
        return listingOffers[listingId];
    }

    function getOrder(uint256 orderId) external view returns (Order memory) {
        return orders[orderId];
    }

    function getDispute(uint256 disputeId) external view returns (Dispute memory) {
        return disputes[disputeId];
    }

    // Admin functions
    function setPlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= MAX_PLATFORM_FEE, "Fee too high");
        platformFeePercentage = newFee;
    }

    function updateReputationScore(address user, uint256 score) external onlyDAO {
        reputationScores[user] = score;
        emit ReputationUpdated(user, score);
    }

    function setDAOApprovedVendor(address vendor, bool approved) external onlyDAO {
        daoApprovedVendors[vendor] = approved;
    }

    function setMinReputationScore(uint256 newScore) external onlyDAO {
        minReputationScore = newScore;
    }

    function setAuctionExtensionTime(uint256 newTime) external onlyDAO {
        // Implementation would update the extension time constant
        // For simplicity, not implemented in this example
    }

    function setEscrowContract(address _escrowContract) external onlyOwner {
        escrowContract = EnhancedEscrow(_escrowContract);
    }

    // Internal functions
    function _refundBidder(uint256 listingId, address bidder, uint256 amount) internal {
        Listing storage listing = listings[listingId];
        
        if (listing.tokenAddress == address(0)) {
            payable(bidder).transfer(amount);
        } else {
            IERC20(listing.tokenAddress).transfer(bidder, amount);
        }
    }
    
    /**
     * @notice Refund a bid
     * @param listingId ID of the listing
     * @param bidder Address of the bidder
     */
    function refundBid(uint256 listingId, address bidder) internal {
        Listing storage listing = listings[listingId];
        uint256 amount = listing.highestBid;
        
        if (amount > 0) {
            if (listing.tokenAddress == address(0)) {
                // ETH refund
                (bool sent, ) = payable(bidder).call{value: amount}("");
                require(sent, "Failed to refund ETH to bidder");
            } else {
                // ERC20 token refund
                IERC20(listing.tokenAddress).transfer(bidder, amount);
            }
        }
    }

}