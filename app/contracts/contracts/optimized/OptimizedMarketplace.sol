// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title OptimizedMarketplace
 * @dev Gas-optimized marketplace contract with packed structs and batch operations
 */
contract OptimizedMarketplace is ReentrancyGuard, Pausable, Ownable {
    
    // Packed struct to minimize storage slots
    struct PackedListing {
        address seller;          // 20 bytes
        uint96 price;           // 12 bytes (max ~79 billion tokens with 18 decimals)
        uint64 quantity;        // 8 bytes (max ~18 quintillion)
        uint32 createdAt;       // 4 bytes (timestamp until year 2106)
        uint16 categoryId;      // 2 bytes (65k categories)
        uint8 itemType;         // 1 byte (256 item types)
        uint8 listingType;      // 1 byte (256 listing types)
        bool isActive;          // 1 byte
        // Total: 49 bytes (2 storage slots instead of 8+)
    }
    
    // Packed contract state
    struct ContractState {
        uint128 totalListings;   // 16 bytes
        uint64 nextListingId;    // 8 bytes
        uint32 feeBasisPoints;   // 4 bytes
        uint16 maxListingsPerUser; // 2 bytes
        bool isPaused;           // 1 byte
        bool emergencyMode;      // 1 byte
        // Total: 32 bytes (1 storage slot)
    }
    
    ContractState private _state;
    
    // Mappings
    mapping(uint256 => PackedListing) private _listings;
    mapping(address => uint256[]) private _userListings;
    mapping(address => bool) private _supportedTokens;
    
    // Events with indexed parameters for efficient filtering
    event ListingCreated(
        uint256 indexed listingId,
        address indexed seller,
        address indexed tokenAddress,
        uint256 price,
        uint256 quantity
    );
    
    event ItemPurchased(
        uint256 indexed listingId,
        address indexed buyer,
        address indexed seller,
        uint256 quantity,
        uint256 totalPrice
    );
    
    event BatchListingsCreated(
        address indexed seller,
        uint256 indexed startId,
        uint256 count
    );
    
    // Custom errors for gas efficiency
    error InvalidPrice();
    error InvalidQuantity();
    error ListingNotFound();
    error NotSeller();
    error InsufficientQuantity();
    error UnsupportedToken();
    error ArrayLengthMismatch();
    error MaxListingsExceeded();
    
    constructor(uint32 _feeBasisPoints) {
        _state.feeBasisPoints = _feeBasisPoints;
        _state.nextListingId = 1;
        _state.maxListingsPerUser = 1000;
    }
    
    /**
     * @dev Create a single listing (optimized)
     */
    function createListing(
        address tokenAddress,
        uint256 tokenId,
        uint256 price,
        uint256 quantity,
        uint8 itemType,
        uint8 listingType
    ) external whenNotPaused nonReentrant returns (uint256 listingId) {
        if (price == 0) revert InvalidPrice();
        if (quantity == 0) revert InvalidQuantity();
        if (price > type(uint96).max) revert InvalidPrice();
        if (quantity > type(uint64).max) revert InvalidQuantity();
        
        // Check user listing limit
        if (_userListings[msg.sender].length >= _state.maxListingsPerUser) {
            revert MaxListingsExceeded();
        }
        
        listingId = _state.nextListingId;
        
        // Pack listing data efficiently
        _listings[listingId] = PackedListing({
            seller: msg.sender,
            price: uint96(price),
            quantity: uint64(quantity),
            createdAt: uint32(block.timestamp),
            categoryId: 0, // Can be set later
            itemType: itemType,
            listingType: listingType,
            isActive: true
        });
        
        // Update state in single operation
        unchecked {
            _state.nextListingId = uint64(listingId + 1);
            _state.totalListings += 1;
        }
        
        // Add to user listings
        _userListings[msg.sender].push(listingId);
        
        emit ListingCreated(listingId, msg.sender, tokenAddress, price, quantity);
    }
    
    /**
     * @dev Create multiple listings in batch (gas optimized)
     */
    function batchCreateListings(
        address[] calldata tokenAddresses,
        uint256[] calldata tokenIds,
        uint256[] calldata prices,
        uint256[] calldata quantities,
        uint8[] calldata itemTypes,
        uint8[] calldata listingTypes
    ) external whenNotPaused nonReentrant returns (uint256[] memory listingIds) {
        // Validate array lengths
        if (tokenAddresses.length != prices.length || tokenAddresses.length != quantities.length ||
            tokenAddresses.length != itemTypes.length || tokenAddresses.length != listingTypes.length) {
            revert ArrayLengthMismatch();
        }

        if (_userListings[msg.sender].length + tokenAddresses.length > _state.maxListingsPerUser) {
            revert MaxListingsExceeded();
        }

        listingIds = new uint256[](tokenAddresses.length);

        unchecked {
            uint256 startId = _state.nextListingId;
            uint32 timestamp = uint32(block.timestamp);

            for (uint256 i = 0; i < tokenAddresses.length; ++i) {
                if (prices[i] == 0 || quantities[i] == 0) revert InvalidPrice();
                if (prices[i] > type(uint96).max || quantities[i] > type(uint64).max) {
                    revert InvalidPrice();
                }

                uint256 listingId = startId + i;
                listingIds[i] = listingId;

                _listings[listingId] = PackedListing({
                    seller: msg.sender,
                    price: uint96(prices[i]),
                    quantity: uint64(quantities[i]),
                    createdAt: timestamp,
                    categoryId: 0,
                    itemType: itemTypes[i],
                    listingType: listingTypes[i],
                    isActive: true
                });

                _userListings[msg.sender].push(listingId);

                emit ListingCreated(listingId, msg.sender, tokenAddresses[i], prices[i], quantities[i]);
            }

            // Update state once
            _state.nextListingId = uint64(startId + tokenAddresses.length);
            _state.totalListings += uint128(tokenAddresses.length);

            emit BatchListingsCreated(msg.sender, startId, tokenAddresses.length);
        }
    }
    
    /**
     * @dev Purchase item (optimized)
     */
    function purchaseItem(
        uint256 listingId,
        uint256 quantity
    ) external payable whenNotPaused nonReentrant {
        PackedListing storage listing = _listings[listingId];
        
        if (!listing.isActive) revert ListingNotFound();
        if (quantity > listing.quantity) revert InsufficientQuantity();
        
        uint256 totalPrice = uint256(listing.price) * quantity;
        if (msg.value < totalPrice) revert InvalidPrice();
        
        // Update quantity or deactivate listing
        if (quantity == listing.quantity) {
            listing.isActive = false;
            unchecked { _state.totalListings -= 1; }
        } else {
            unchecked { listing.quantity -= uint64(quantity); }
        }
        
        // Transfer payment to seller
        address seller = listing.seller;
        uint256 fee = (totalPrice * _state.feeBasisPoints) / 10000;
        uint256 sellerAmount = totalPrice - fee;
        
        // Use assembly for efficient transfers
        assembly {
            let success := call(gas(), seller, sellerAmount, 0, 0, 0, 0)
            if iszero(success) { revert(0, 0) }
        }
        
        // Refund excess payment
        if (msg.value > totalPrice) {
            assembly {
                let success := call(gas(), caller(), sub(callvalue(), totalPrice), 0, 0, 0, 0)
                if iszero(success) { revert(0, 0) }
            }
        }
        
        emit ItemPurchased(listingId, msg.sender, seller, quantity, totalPrice);
    }
    
    /**
     * @dev Batch purchase multiple items
     */
    function batchPurchaseItems(
        uint256[] calldata listingIds,
        uint256[] calldata quantities
    ) external payable whenNotPaused nonReentrant {
        uint256 length = listingIds.length;
        if (length != quantities.length) revert ArrayLengthMismatch();
        
        uint256 totalRequired = 0;
        
        // Calculate total required payment
        for (uint256 i = 0; i < length;) {
            PackedListing storage listing = _listings[listingIds[i]];
            if (!listing.isActive) revert ListingNotFound();
            if (quantities[i] > listing.quantity) revert InsufficientQuantity();
            
            totalRequired += uint256(listing.price) * quantities[i];
            unchecked { ++i; }
        }
        
        if (msg.value < totalRequired) revert InvalidPrice();
        
        // Process purchases
        for (uint256 i = 0; i < length;) {
            _processPurchase(listingIds[i], quantities[i]);
            unchecked { ++i; }
        }
        
        // Refund excess
        if (msg.value > totalRequired) {
            assembly {
                let success := call(gas(), caller(), sub(callvalue(), totalRequired), 0, 0, 0, 0)
                if iszero(success) { revert(0, 0) }
            }
        }
    }
    
    /**
     * @dev Internal function to process individual purchase
     */
    function _processPurchase(uint256 listingId, uint256 quantity) private {
        PackedListing storage listing = _listings[listingId];
        
        uint256 totalPrice = uint256(listing.price) * quantity;
        
        // Update listing
        if (quantity == listing.quantity) {
            listing.isActive = false;
            unchecked { _state.totalListings -= 1; }
        } else {
            unchecked { listing.quantity -= uint64(quantity); }
        }
        
        // Transfer to seller
        address seller = listing.seller;
        uint256 fee = (totalPrice * _state.feeBasisPoints) / 10000;
        uint256 sellerAmount = totalPrice - fee;
        
        assembly {
            let success := call(gas(), seller, sellerAmount, 0, 0, 0, 0)
            if iszero(success) { revert(0, 0) }
        }
        
        emit ItemPurchased(listingId, msg.sender, seller, quantity, totalPrice);
    }
    
    /**
     * @dev Get listing details (view function optimized)
     */
    function getListing(uint256 listingId) external view returns (
        address seller,
        uint256 price,
        uint256 quantity,
        uint256 createdAt,
        uint256 categoryId,
        uint8 itemType,
        uint8 listingType,
        bool isActive
    ) {
        PackedListing storage listing = _listings[listingId];
        return (
            listing.seller,
            uint256(listing.price),
            uint256(listing.quantity),
            uint256(listing.createdAt),
            uint256(listing.categoryId),
            listing.itemType,
            listing.listingType,
            listing.isActive
        );
    }
    
    /**
     * @dev Get user listings (optimized pagination)
     */
    function getUserListings(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (uint256[] memory listingIds) {
        uint256[] storage userListings = _userListings[user];
        uint256 length = userListings.length;
        
        if (offset >= length) {
            return new uint256[](0);
        }
        
        uint256 end = offset + limit;
        if (end > length) {
            end = length;
        }
        
        uint256 resultLength = end - offset;
        listingIds = new uint256[](resultLength);
        
        for (uint256 i = 0; i < resultLength;) {
            listingIds[i] = userListings[offset + i];
            unchecked { ++i; }
        }
    }
    
    /**
     * @dev Estimate gas for listing creation
     */
    function estimateListingGas(
        uint8 itemType,
        uint8 listingType
    ) external pure returns (uint256 estimatedGas) {
        estimatedGas = 120000; // Base gas
        
        // Additional gas for complex types
        if (listingType > 0) {
            estimatedGas += 20000;
        }
        
        return estimatedGas;
    }
    
    /**
     * @dev Get contract state
     */
    function getContractState() external view returns (
        uint256 totalListings,
        uint256 nextListingId,
        uint256 feeBasisPoints,
        uint256 maxListingsPerUser
    ) {
        return (
            _state.totalListings,
            _state.nextListingId,
            _state.feeBasisPoints,
            _state.maxListingsPerUser
        );
    }
    
    // Admin functions
    function setFeeBasisPoints(uint32 _feeBasisPoints) external onlyOwner {
        require(_feeBasisPoints <= 1000, "Fee too high"); // Max 10%
        _state.feeBasisPoints = _feeBasisPoints;
    }
    
    function setMaxListingsPerUser(uint16 _maxListings) external onlyOwner {
        _state.maxListingsPerUser = _maxListings;
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function emergencyWithdraw() external onlyOwner {
        assembly {
            let success := call(gas(), caller(), selfbalance(), 0, 0, 0, 0)
            if iszero(success) { revert(0, 0) }
        }
    }
}