// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title NFTMarketplace
 * @notice A comprehensive NFT marketplace with minting, trading, and royalty distribution
 */
contract NFTMarketplace is ERC721, ERC721URIStorage, ERC721Royalty, Ownable, ReentrancyGuard {

    uint256 private _tokenIdCounter;

    // Payment method enum
    enum PaymentMethod {
        ETH,
        USDC,
        USDT
    }

    // Supported payment tokens
    IERC20 public usdcToken;
    IERC20 public usdtToken;

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
        PaymentMethod paymentMethod;
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
        PaymentMethod paymentMethod;
        mapping(address => uint256) bids;
        address[] bidders;
        // Commit-reveal auction properties
        mapping(address => bytes32) bidCommitments;  // Commitment to bid amount
        mapping(address => uint256) revealedBids;    // Revealed bid amounts
        bool bidsRevealed;                          // Whether all bids have been revealed
        uint256 revealPeriodEnd;                    // End time for bid reveal period
    }
    
    // Struct for offer
    struct Offer {
        uint256 tokenId;
        address buyer;
        uint256 amount;
        uint256 expiresAt;
        bool isActive;
        PaymentMethod paymentMethod;
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
        uint256 expiresAt,
        PaymentMethod paymentMethod
    );

    event NFTSold(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 price,
        PaymentMethod paymentMethod
    );

    event AuctionCreated(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 startingPrice,
        uint256 reservePrice,
        uint256 endTime,
        PaymentMethod paymentMethod
    );

    event BidPlaced(
        uint256 indexed tokenId,
        address indexed bidder,
        uint256 amount,
        PaymentMethod paymentMethod
    );

    event AuctionEnded(
        uint256 indexed tokenId,
        address indexed winner,
        uint256 winningBid,
        PaymentMethod paymentMethod
    );

    event OfferMade(
        uint256 indexed tokenId,
        address indexed buyer,
        uint256 amount,
        uint256 expiresAt,
        PaymentMethod paymentMethod
    );

    event OfferAccepted(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 amount,
        PaymentMethod paymentMethod
    );
    
    event RoyaltyPaid(
        uint256 indexed tokenId,
        address indexed creator,
        uint256 amount
    );

    event PaymentTokensSet(address indexed usdc, address indexed usdt);

    constructor(address _usdcToken, address _usdtToken) ERC721("Web3Marketplace NFT", "W3MNFT") Ownable(msg.sender) {
        platformFeeRecipient = msg.sender;
        usdcToken = IERC20(_usdcToken);
        usdtToken = IERC20(_usdtToken);
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
     * @param price Sale price (in wei for ETH, or token units for USDC/USDT)
     * @param duration Duration of the listing in seconds
     * @param paymentMethod Payment method (ETH, USDC, or USDT)
     */
    function listNFT(
        uint256 tokenId,
        uint256 price,
        uint256 duration,
        PaymentMethod paymentMethod
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
            expiresAt: block.timestamp + duration,
            paymentMethod: paymentMethod
        });

        emit NFTListed(tokenId, msg.sender, price, block.timestamp + duration, paymentMethod);
    }
    
    /**
     * @notice Buy an NFT that's listed for sale
     * @param tokenId The NFT token ID
     */
    function buyNFT(uint256 tokenId) external payable nonReentrant {
        Listing storage listing = listings[tokenId];

        require(listing.isActive, "NFT not for sale");
        require(block.timestamp <= listing.expiresAt, "Listing expired");

        address seller = listing.seller;
        uint256 price = listing.price;
        PaymentMethod paymentMethod = listing.paymentMethod;

        // Deactivate listing
        listing.isActive = false;

        // Calculate fees and royalties
        (address royaltyRecipient, uint256 royaltyAmount) = royaltyInfo(tokenId, price);
        uint256 platformFeeAmount;
        unchecked {
            platformFeeAmount = (price * platformFee) / 10000;
        }
        uint256 totalDeductions = royaltyAmount + platformFeeAmount;
        uint256 sellerAmount;
        if (totalDeductions <= price) {
            sellerAmount = price - totalDeductions;
        } else {
            sellerAmount = 0; // No seller amount if deductions exceed price
        }

        // Transfer NFT to buyer
        _transfer(address(this), msg.sender, tokenId);

        // Handle payment based on payment method
        if (paymentMethod == PaymentMethod.ETH) {
            require(msg.value >= price, "Insufficient ETH payment");

            // Distribute ETH payments
            if (royaltyAmount > 0 && royaltyRecipient != address(0)) {
                (bool royaltySent, ) = payable(royaltyRecipient).call{value: royaltyAmount}("");
                require(royaltySent, "Royalty payment failed");
                emit RoyaltyPaid(tokenId, royaltyRecipient, royaltyAmount);
            }

            (bool feeSent, ) = payable(platformFeeRecipient).call{value: platformFeeAmount}("");
            require(feeSent, "Platform fee transfer failed");

            (bool sellerSent, ) = payable(seller).call{value: sellerAmount}("");
            require(sellerSent, "Seller payment failed");

            // Refund excess ETH
            if (msg.value > price) {
                (bool excessSent, ) = payable(msg.sender).call{value: msg.value - price}("");
                require(excessSent, "Excess ETH refund failed");
            }
        } else {
            require(msg.value == 0, "ETH not accepted for token payments");

            IERC20 paymentToken = paymentMethod == PaymentMethod.USDC ? usdcToken : usdtToken;
            require(address(paymentToken) != address(0), "Payment token not set");

            // Transfer tokens from buyer to contract first
            require(
                paymentToken.transferFrom(msg.sender, address(this), price),
                "Token transfer from buyer failed"
            );

            // Distribute token payments
            if (royaltyAmount > 0 && royaltyRecipient != address(0)) {
                require(
                    paymentToken.transfer(royaltyRecipient, royaltyAmount),
                    "Royalty payment failed"
                );
                emit RoyaltyPaid(tokenId, royaltyRecipient, royaltyAmount);
            }

            require(
                paymentToken.transfer(platformFeeRecipient, platformFeeAmount),
                "Platform fee payment failed"
            );

            require(
                paymentToken.transfer(seller, sellerAmount),
                "Seller payment failed"
            );
        }

        emit NFTSold(tokenId, seller, msg.sender, price, paymentMethod);
    }
    
    /**
     * @notice Create an auction for an NFT
     * @param tokenId The NFT token ID
     * @param startingPrice Starting bid price
     * @param reservePrice Reserve price (minimum to sell)
     * @param duration Auction duration in seconds
     * @param paymentMethod Payment method (ETH, USDC, or USDT)
     */
    function createAuction(
        uint256 tokenId,
        uint256 startingPrice,
        uint256 reservePrice,
        uint256 duration,
        PaymentMethod paymentMethod
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
        auction.paymentMethod = paymentMethod;
        
        // Set up commit-reveal properties
        // Reveal period is 20% of auction duration or 1 hour minimum
        uint256 revealPeriod = duration / 5;
        if (revealPeriod < 1 hours) {
            revealPeriod = 1 hours;
        }
        auction.revealPeriodEnd = block.timestamp + duration + revealPeriod;
        auction.bidsRevealed = false;

        emit AuctionCreated(tokenId, msg.sender, startingPrice, reservePrice, block.timestamp + duration, paymentMethod);
    }
    
    /**
     * @notice Commit a bid to an auction (front-running resistant)
     * @param tokenId The NFT token ID
     * @param bidAmount The bid amount (hidden until reveal)
     * @param salt Random salt to prevent bid guessing
     */
    function commitBid(uint256 tokenId, uint256 bidAmount, uint256 salt) external payable {
        Auction storage auction = auctions[tokenId];

        require(auction.isActive, "Auction not active");
        require(block.timestamp <= auction.endTime, "Auction ended");
        require(msg.sender != auction.seller, "Seller cannot bid");
        require(bidAmount > 0, "Bid amount must be greater than 0");
        
        // Create commitment (bidAmount + salt + bidder address)
        bytes32 commitment = keccak256(abi.encodePacked(bidAmount, salt, msg.sender));
        
        // Store the commitment
        auction.bidCommitments[msg.sender] = commitment;
        
        // Lock funds based on payment method
        if (auction.paymentMethod == PaymentMethod.ETH) {
            require(msg.value >= bidAmount, "Insufficient ETH sent");
            // Note: ETH is already locked in the contract by msg.value
        } else {
            IERC20 paymentToken = auction.paymentMethod == PaymentMethod.USDC ? usdcToken : usdtToken;
            require(address(paymentToken) != address(0), "Payment token not set");
            
            // Transfer tokens from bidder to contract as lock
            require(
                paymentToken.transferFrom(msg.sender, address(this), bidAmount),
                "Token transfer failed"
            );
        }
        
        emit BidPlaced(tokenId, msg.sender, bidAmount, auction.paymentMethod);
    }
    
    /**
     * @notice Reveal a committed bid
     * @param tokenId The NFT token ID
     * @param bidAmount The original bid amount
     * @param salt The salt used for the commitment
     */
    function revealBid(uint256 tokenId, uint256 bidAmount, uint256 salt) external nonReentrant {
        Auction storage auction = auctions[tokenId];

        require(auction.isActive, "Auction not active");
        require(block.timestamp <= auction.revealPeriodEnd, "Reveal period ended");
        require(msg.sender != auction.seller, "Seller cannot bid");
        
        // Verify the commitment
        bytes32 expectedCommitment = keccak256(abi.encodePacked(bidAmount, salt, msg.sender));
        require(auction.bidCommitments[msg.sender] == expectedCommitment, "Invalid commitment");
        
        // Check bid amount
        require(bidAmount >= auction.startingPrice, "Bid below starting price");
        
        // Get the highest current bid amount
        uint256 currentHighestBid = auction.currentBid;
        
        // If this is a higher bid than the current highest, update the auction
        if (bidAmount > currentHighestBid) {
            // Refund previous highest bidder if exists
            address previousBidder = auction.currentBidder;
            uint256 previousBid = currentHighestBid;
            
            if (previousBidder != address(0)) {
                _refundBidder(tokenId, previousBidder, previousBid);
            }
            
            // Update auction state
            auction.currentBid = bidAmount;
            auction.currentBidder = msg.sender;
            auction.revealedBids[msg.sender] = bidAmount;
            
            // Add bidder to bidders list if not already there
            bool bidderExists = false;
            for (uint256 i = 0; i < auction.bidders.length; i++) {
                if (auction.bidders[i] == msg.sender) {
                    bidderExists = true;
                    break;
                }
            }
            if (!bidderExists) {
                auction.bidders.push(msg.sender);
            }
        } else {
            // Bid is not winning, just record it
            auction.revealedBids[msg.sender] = bidAmount;
            
            // Refund the bid since it's not winning
            _refundBidder(tokenId, msg.sender, bidAmount);
        }
        
        // Extend auction if bid placed in last 10 minutes of auction (not reveal period)
        if (block.timestamp <= auction.endTime && auction.endTime >= block.timestamp && auction.endTime - block.timestamp < 600) {
            uint256 newEndTime = block.timestamp + 600;
            // Check for overflow
            if (newEndTime > block.timestamp) {
                auction.endTime = newEndTime;
            }
        }
        
        emit BidPlaced(tokenId, msg.sender, bidAmount, auction.paymentMethod);
    }
    
    /**
     * @notice Place a bid on an auction (ETH or ERC20 tokens)
     * @param tokenId The NFT token ID
     * @param tokenAmount Amount of tokens to bid (only for ERC20 auctions, ignored for ETH)
     * @dev This function is kept for backward compatibility but should use commit/reveal pattern
     */
    function placeBid(uint256 tokenId, uint256 tokenAmount) external payable nonReentrant {
        Auction storage auction = auctions[tokenId];

        require(auction.isActive, "Auction not active");
        require(block.timestamp <= auction.endTime, "Auction ended");
        require(msg.sender != auction.seller, "Seller cannot bid");

        // Update auction first to prevent reentrancy
        uint256 previousBid = auction.currentBid;
        address previousBidder = auction.currentBidder;
        
        uint256 bidAmount;
        PaymentMethod paymentMethod = auction.paymentMethod;

        if (paymentMethod == PaymentMethod.ETH) {
            bidAmount = msg.value;
            require(bidAmount >= auction.startingPrice, "Bid below starting price");
            require(bidAmount > auction.currentBid, "Bid too low");

            // Update auction state before external calls
            auction.currentBid = bidAmount;
            auction.currentBidder = msg.sender;
            auction.bids[msg.sender] = bidAmount;
            auction.bidders.push(msg.sender);

            // Refund previous bidder in ETH
            if (previousBidder != address(0)) {
                (bool sent, ) = payable(previousBidder).call{value: previousBid}("");
                require(sent, "Previous bidder refund failed");
            }
        } else {
            require(msg.value == 0, "ETH not accepted for token auctions");
            bidAmount = tokenAmount;
            require(bidAmount >= auction.startingPrice, "Bid below starting price");
            require(bidAmount > auction.currentBid, "Bid too low");

            IERC20 paymentToken = paymentMethod == PaymentMethod.USDC ? usdcToken : usdtToken;
            require(address(paymentToken) != address(0), "Payment token not set");

            // Update auction state before external calls
            auction.currentBid = bidAmount;
            auction.currentBidder = msg.sender;
            auction.bids[msg.sender] = bidAmount;
            auction.bidders.push(msg.sender);

            // Transfer new bid tokens from bidder to contract
            require(
                paymentToken.transferFrom(msg.sender, address(this), bidAmount),
                "Token transfer failed"
            );

            // Refund previous bidder in tokens
            if (previousBidder != address(0)) {
                require(
                    paymentToken.transfer(previousBidder, previousBid),
                    "Previous bidder refund failed"
                );
            }
        }

        // Extend auction if bid placed in last 10 minutes
        if (auction.endTime >= block.timestamp && auction.endTime - block.timestamp < 600) {
            uint256 newEndTime = block.timestamp + 600;
            // Check for overflow
            if (newEndTime > block.timestamp) {
                auction.endTime = newEndTime;
            }
        }

        emit BidPlaced(tokenId, msg.sender, bidAmount, paymentMethod);
    }
    
    /**
     * @notice End an auction and transfer NFT to winner
     * @param tokenId The NFT token ID
     */
    function endAuction(uint256 tokenId) external nonReentrant {
        Auction storage auction = auctions[tokenId];

        require(auction.isActive, "Auction not active");
        // Allow ending after either auction end time OR reveal period end
        require(block.timestamp > auction.endTime || block.timestamp > auction.revealPeriodEnd, "Auction still active");

        auction.isActive = false;
        PaymentMethod paymentMethod = auction.paymentMethod;

        if (auction.currentBidder != address(0) && auction.currentBid >= auction.reservePrice) {
            // Auction successful
            address seller = auction.seller;
            address winner = auction.currentBidder;
            uint256 winningBid = auction.currentBid;

            // Calculate fees and royalties
            (address royaltyRecipient, uint256 royaltyAmount) = royaltyInfo(tokenId, winningBid);
            uint256 platformFeeAmount;
            unchecked {
                platformFeeAmount = (winningBid * platformFee) / 10000;
            }
            uint256 totalDeductions = royaltyAmount + platformFeeAmount;
            uint256 sellerAmount;
            if (totalDeductions <= winningBid) {
                sellerAmount = winningBid - totalDeductions;
            } else {
                sellerAmount = 0; // No seller amount if deductions exceed bid
            }

            // Transfer NFT to winner
            _transfer(address(this), winner, tokenId);

            // Distribute payments based on payment method
            if (paymentMethod == PaymentMethod.ETH) {
                // Distribute ETH payments
                if (royaltyAmount > 0 && royaltyRecipient != address(0)) {
                    payable(royaltyRecipient).transfer(royaltyAmount);
                    emit RoyaltyPaid(tokenId, royaltyRecipient, royaltyAmount);
                }

                payable(platformFeeRecipient).transfer(platformFeeAmount);
                payable(seller).transfer(sellerAmount);
            } else {
                // Distribute token payments
                IERC20 paymentToken = paymentMethod == PaymentMethod.USDC ? usdcToken : usdtToken;

                if (royaltyAmount > 0 && royaltyRecipient != address(0)) {
                    require(
                        paymentToken.transfer(royaltyRecipient, royaltyAmount),
                        "Royalty payment failed"
                    );
                    emit RoyaltyPaid(tokenId, royaltyRecipient, royaltyAmount);
                }

                require(
                    paymentToken.transfer(platformFeeRecipient, platformFeeAmount),
                    "Platform fee payment failed"
                );

                require(
                    paymentToken.transfer(seller, sellerAmount),
                    "Seller payment failed"
                );
            }

            emit AuctionEnded(tokenId, winner, winningBid, paymentMethod);
        } else {
            // Auction failed - return NFT to seller
            _transfer(address(this), auction.seller, tokenId);

            // Refund all bidders whose funds are locked
            for (uint256 i = 0; i < auction.bidders.length; i++) {
                address bidder = auction.bidders[i];
                uint256 bidAmount = auction.bids[bidder];
                
                if (bidAmount > 0) {
                    if (auction.paymentMethod == PaymentMethod.ETH) {
                        (bool sent, ) = payable(bidder).call{value: bidAmount}("");
                        require(sent, "Bidder refund failed");
                    } else {
                        IERC20 paymentToken = auction.paymentMethod == PaymentMethod.USDC ? usdcToken : usdtToken;
                        require(
                            paymentToken.transfer(bidder, bidAmount),
                            "Bidder refund failed"
                        );
                    }
                }
            }

            emit AuctionEnded(tokenId, address(0), 0, paymentMethod);
        }
    }
    
    /**
     * @notice Make an offer on an NFT
     * @param tokenId The NFT token ID
     * @param duration Offer duration in seconds
     * @param paymentMethod Payment method (ETH, USDC, or USDT)
     * @param tokenAmount Amount of tokens to offer (only for ERC20 offers, ignored for ETH)
     */
    function makeOffer(
        uint256 tokenId,
        uint256 duration,
        PaymentMethod paymentMethod,
        uint256 tokenAmount
    ) external payable {
        require(duration > 0, "Duration must be greater than 0");
        require(_ownerOf(tokenId) != address(0), "Token does not exist");

        uint256 offerAmount;

        if (paymentMethod == PaymentMethod.ETH) {
            require(msg.value > 0, "Offer must be greater than 0");
            offerAmount = msg.value;
        } else {
            require(msg.value == 0, "ETH not accepted for token offers");
            require(tokenAmount > 0, "Token amount must be greater than 0");
            offerAmount = tokenAmount;

            IERC20 paymentToken = paymentMethod == PaymentMethod.USDC ? usdcToken : usdtToken;
            require(address(paymentToken) != address(0), "Payment token not set");

            // Transfer tokens from offerer to contract
            require(
                paymentToken.transferFrom(msg.sender, address(this), offerAmount),
                "Token transfer failed"
            );
        }

        offers[tokenId].push(Offer({
            tokenId: tokenId,
            buyer: msg.sender,
            amount: offerAmount,
            expiresAt: block.timestamp + duration,
            isActive: true,
            paymentMethod: paymentMethod
        }));

        emit OfferMade(tokenId, msg.sender, offerAmount, block.timestamp + duration, paymentMethod);
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
        PaymentMethod paymentMethod = offer.paymentMethod;

        // Deactivate offer
        offer.isActive = false;

        // Calculate fees and royalties
        (address royaltyRecipient, uint256 royaltyAmount) = royaltyInfo(tokenId, amount);
        uint256 platformFeeAmount;
        unchecked {
            platformFeeAmount = (amount * platformFee) / 10000;
        }
        uint256 totalDeductions = royaltyAmount + platformFeeAmount;
        uint256 sellerAmount;
        if (totalDeductions <= amount) {
            sellerAmount = amount - totalDeductions;
        } else {
            sellerAmount = 0; // No seller amount if deductions exceed amount
        }

        // Transfer NFT to buyer
        _transfer(msg.sender, buyer, tokenId);

        // Distribute payments based on payment method
        if (paymentMethod == PaymentMethod.ETH) {
            // Distribute ETH payments
            if (royaltyAmount > 0 && royaltyRecipient != address(0)) {
                (bool royaltySent, ) = payable(royaltyRecipient).call{value: royaltyAmount}("");
                require(royaltySent, "Royalty payment failed");
                emit RoyaltyPaid(tokenId, royaltyRecipient, royaltyAmount);
            }

            (bool feeSent, ) = payable(platformFeeRecipient).call{value: platformFeeAmount}("");
            require(feeSent, "Platform fee transfer failed");

            (bool sellerSent, ) = payable(msg.sender).call{value: sellerAmount}("");
            require(sellerSent, "Seller payment failed");
        } else {
            // Distribute token payments
            IERC20 paymentToken = paymentMethod == PaymentMethod.USDC ? usdcToken : usdtToken;

            if (royaltyAmount > 0 && royaltyRecipient != address(0)) {
                require(
                    paymentToken.transfer(royaltyRecipient, royaltyAmount),
                    "Royalty payment failed"
                );
                emit RoyaltyPaid(tokenId, royaltyRecipient, royaltyAmount);
            }

            require(
                paymentToken.transfer(platformFeeRecipient, platformFeeAmount),
                "Platform fee payment failed"
            );

            require(
                paymentToken.transfer(msg.sender, sellerAmount),
                "Seller payment failed"
            );
        }

        emit OfferAccepted(tokenId, msg.sender, buyer, amount, paymentMethod);
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
        uint256 maxOffers = 100; // Limit to prevent DoS
        
        // Count active offers
        for (uint256 i = 0; i < allOffers.length && i < maxOffers; i++) {
            if (allOffers[i].isActive && block.timestamp <= allOffers[i].expiresAt) {
                activeCount++;
            }
        }
        
        // Limit activeCount to maxOffers
        if (activeCount > maxOffers) {
            activeCount = maxOffers;
        }
        
        // Create array of active offers
        Offer[] memory activeOffers = new Offer[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allOffers.length && index < activeCount && i < maxOffers; i++) {
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

    /**
     * @notice Set payment token addresses (owner only)
     * @param _usdcToken USDC token address
     * @param _usdtToken USDT token address
     */
    function setPaymentTokens(address _usdcToken, address _usdtToken) external onlyOwner {
        require(_usdcToken != address(0), "Invalid USDC address");
        require(_usdtToken != address(0), "Invalid USDT address");
        usdcToken = IERC20(_usdcToken);
        usdtToken = IERC20(_usdtToken);
        emit PaymentTokensSet(_usdcToken, _usdtToken);
    }

    /**
     * @notice Cancel an offer (offer creator only)
     * @param tokenId The NFT token ID
     * @param offerIndex Index of the offer to cancel
     */
    function cancelOffer(uint256 tokenId, uint256 offerIndex) external nonReentrant {
        require(offerIndex < offers[tokenId].length, "Invalid offer index");

        Offer storage offer = offers[tokenId][offerIndex];
        require(offer.buyer == msg.sender, "Not the offer creator");
        require(offer.isActive, "Offer not active");

        uint256 amount = offer.amount;
        PaymentMethod paymentMethod = offer.paymentMethod;

        // Deactivate offer
        offer.isActive = false;

        // Refund the offer amount
        if (paymentMethod == PaymentMethod.ETH) {
            (bool sent, ) = payable(msg.sender).call{value: amount}("");
            require(sent, "Offer refund failed");
        } else {
            IERC20 paymentToken = paymentMethod == PaymentMethod.USDC ? usdcToken : usdtToken;
            require(
                paymentToken.transfer(msg.sender, amount),
                "Refund failed"
            );
        }
    }

    /**
     * @notice Withdraw expired offers (offer creator only)
     * @param tokenId The NFT token ID
     * @param offerIndex Index of the offer to withdraw
     */
    function withdrawExpiredOffer(uint256 tokenId, uint256 offerIndex) external nonReentrant {
        require(offerIndex < offers[tokenId].length, "Invalid offer index");

        Offer storage offer = offers[tokenId][offerIndex];
        require(offer.buyer == msg.sender, "Not the offer creator");
        require(offer.isActive, "Offer not active");
        require(block.timestamp > offer.expiresAt, "Offer not expired");

        uint256 amount = offer.amount;
        PaymentMethod paymentMethod = offer.paymentMethod;

        // Deactivate offer
        offer.isActive = false;

        // Refund the offer amount
        if (paymentMethod == PaymentMethod.ETH) {
            (bool sent, ) = payable(msg.sender).call{value: amount}("");
            require(sent, "Offer refund failed");
        } else {
            IERC20 paymentToken = paymentMethod == PaymentMethod.USDC ? usdcToken : usdtToken;
            require(
                paymentToken.transfer(msg.sender, amount),
                "Refund failed"
            );
        }
    }
    
    /**
     * @notice Refund a bidder
     * @param tokenId The NFT token ID
     * @param bidder The bidder address
     * @param amount The amount to refund
     */
    function _refundBidder(uint256 tokenId, address bidder, uint256 amount) internal {
        Auction storage auction = auctions[tokenId];
        
        if (auction.paymentMethod == PaymentMethod.ETH) {
            (bool sent, ) = payable(bidder).call{value: amount}("");
            require(sent, "Bidder refund failed");
        } else {
            IERC20 paymentToken = auction.paymentMethod == PaymentMethod.USDC ? usdcToken : usdtToken;
            require(
                paymentToken.transfer(bidder, amount),
                "Bidder refund failed"
            );
        }
    }
    
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage, ERC721Royalty) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}