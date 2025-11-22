import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { NFTMarketplace } from "../typechain-types";

describe("NFTMarketplace", function () {
  let nftMarketplace: NFTMarketplace;
  let owner: SignerWithAddress;
  let creator: SignerWithAddress;
  let buyer: SignerWithAddress;
  let other: SignerWithAddress;

  const ROYALTY_PERCENTAGE = 250; // 2.5%
  const PLATFORM_FEE = 250; // 2.5%
  const MAX_ROYALTY = 1000; // 10%

  beforeEach(async function () {
    [owner, creator, buyer, other] = await ethers.getSigners();

    const NFTMarketplaceFactory = await ethers.getContractFactory("NFTMarketplace");
    nftMarketplace = await NFTMarketplaceFactory.deploy();
    await nftMarketplace.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await nftMarketplace.owner()).to.equal(owner.address);
    });

    it("Should set correct platform fee", async function () {
      expect(await nftMarketplace.platformFee()).to.equal(PLATFORM_FEE);
    });

    it("Should set correct max royalty", async function () {
      expect(await nftMarketplace.maxRoyalty()).to.equal(MAX_ROYALTY);
    });
  });

  describe("NFT Minting", function () {
    const tokenURI = "https://ipfs.io/ipfs/QmTest123";
    const contentHash = ethers.keccak256(ethers.toUtf8Bytes("test-content"));
    const metadata = {
      name: "Test NFT",
      description: "A test NFT",
      image: "https://ipfs.io/ipfs/QmImage123",
      animationUrl: "",
      externalUrl: "",
      attributes: ["Color:Blue", "Rarity:Common"],
      creator: ethers.constants.AddressZero, // Will be set in contract
      createdAt: 0, // Will be set in contract
      isVerified: false,
    };

    it("Should mint NFT with correct parameters", async function () {
      const tx = await nftMarketplace.connect(creator).mintNFT(
        creator.address,
        tokenURI,
        ROYALTY_PERCENTAGE,
        contentHash,
        metadata
      );

      const receipt = await tx.wait();
      const event = receipt.events?.find(e => e.event === "NFTMinted");
      
      expect(event).to.not.be.undefined;
      expect(event?.args?.creator).to.equal(creator.address);
      expect(event?.args?.to).to.equal(creator.address);
      expect(event?.args?.tokenURI).to.equal(tokenURI);
      expect(event?.args?.royalty).to.equal(ROYALTY_PERCENTAGE);

      // Check NFT ownership
      expect(await nftMarketplace.ownerOf(0)).to.equal(creator.address);
      
      // Check token URI
      expect(await nftMarketplace.tokenURI(0)).to.equal(tokenURI);
      
      // Check royalty info
      const [royaltyRecipient, royaltyAmount] = await nftMarketplace.royaltyInfo(0, 1000);
      expect(royaltyRecipient).to.equal(creator.address);
      expect(royaltyAmount).to.equal(25); // 2.5% of 1000
    });

    it("Should reject minting with excessive royalty", async function () {
      await expect(
        nftMarketplace.connect(creator).mintNFT(
          creator.address,
          tokenURI,
          1500, // 15% - exceeds max
          contentHash,
          metadata
        )
      ).to.be.revertedWith("Royalty exceeds maximum");
    });

    it("Should reject minting with duplicate content hash", async function () {
      // First mint
      await nftMarketplace.connect(creator).mintNFT(
        creator.address,
        tokenURI,
        ROYALTY_PERCENTAGE,
        contentHash,
        metadata
      );

      // Second mint with same content hash
      await expect(
        nftMarketplace.connect(creator).mintNFT(
          creator.address,
          tokenURI + "2",
          ROYALTY_PERCENTAGE,
          contentHash, // Same content hash
          metadata
        )
      ).to.be.revertedWith("Content already exists");
    });

    it("Should reject minting with empty token URI", async function () {
      await expect(
        nftMarketplace.connect(creator).mintNFT(
          creator.address,
          "", // Empty URI
          ROYALTY_PERCENTAGE,
          contentHash,
          metadata
        )
      ).to.be.revertedWith("Token URI required");
    });
  });

  describe("NFT Listing", function () {
    let tokenId: number;

    beforeEach(async function () {
      const tokenURI = "https://ipfs.io/ipfs/QmTest123";
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("test-content"));
      const metadata = {
        name: "Test NFT",
        description: "A test NFT",
        image: "https://ipfs.io/ipfs/QmImage123",
        animationUrl: "",
        externalUrl: "",
        attributes: ["Color:Blue"],
        creator: ethers.constants.AddressZero,
        createdAt: 0,
        isVerified: false,
      };

      await nftMarketplace.connect(creator).mintNFT(
        creator.address,
        tokenURI,
        ROYALTY_PERCENTAGE,
        contentHash,
        metadata
      );
      tokenId = 0;
    });

    it("Should list NFT for sale", async function () {
      const price = ethers.parseEther("1.0");
      const duration = 86400; // 24 hours

      const tx = await nftMarketplace.connect(creator).listNFT(
        tokenId,
        price,
        duration
      );

      const receipt = await tx.wait();
      const event = receipt.events?.find(e => e.event === "NFTListed");
      
      expect(event).to.not.be.undefined;
      expect(event?.args?.tokenId).to.equal(tokenId);
      expect(event?.args?.seller).to.equal(creator.address);
      expect(event?.args?.price).to.equal(price);

      // Check NFT is transferred to contract
      expect(await nftMarketplace.ownerOf(tokenId)).to.equal(nftMarketplace.address);

      // Check listing details
      const listing = await nftMarketplace.listings(tokenId);
      expect(listing.seller).to.equal(creator.address);
      expect(listing.price).to.equal(price);
      expect(listing.isActive).to.be.true;
    });

    it("Should reject listing by non-owner", async function () {
      const price = ethers.parseEther("1.0");
      const duration = 86400;

      await expect(
        nftMarketplace.connect(buyer).listNFT(tokenId, price, duration)
      ).to.be.revertedWith("Not the owner");
    });

    it("Should reject listing with zero price", async function () {
      const duration = 86400;

      await expect(
        nftMarketplace.connect(creator).listNFT(tokenId, 0, duration)
      ).to.be.revertedWith("Price must be greater than 0");
    });

    it("Should reject listing with zero duration", async function () {
      const price = ethers.parseEther("1.0");

      await expect(
        nftMarketplace.connect(creator).listNFT(tokenId, price, 0)
      ).to.be.revertedWith("Duration must be greater than 0");
    });
  });

  describe("NFT Buying", function () {
    let tokenId: number;
    const price = ethers.parseEther("1.0");

    beforeEach(async function () {
      // Mint NFT
      const tokenURI = "https://ipfs.io/ipfs/QmTest123";
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("test-content"));
      const metadata = {
        name: "Test NFT",
        description: "A test NFT",
        image: "https://ipfs.io/ipfs/QmImage123",
        animationUrl: "",
        externalUrl: "",
        attributes: ["Color:Blue"],
        creator: ethers.constants.AddressZero,
        createdAt: 0,
        isVerified: false,
      };

      await nftMarketplace.connect(creator).mintNFT(
        creator.address,
        tokenURI,
        ROYALTY_PERCENTAGE,
        contentHash,
        metadata
      );
      tokenId = 0;

      // List NFT
      const duration = 86400;
      await nftMarketplace.connect(creator).listNFT(tokenId, price, duration);
    });

    it("Should buy NFT successfully", async function () {
      const creatorBalanceBefore = await creator.getBalance();
      const ownerBalanceBefore = await owner.getBalance();

      const tx = await nftMarketplace.connect(buyer).buyNFT(tokenId, {
        value: price,
      });

      const receipt = await tx.wait();
      const event = receipt.events?.find(e => e.event === "NFTSold");
      
      expect(event).to.not.be.undefined;
      expect(event?.args?.tokenId).to.equal(tokenId);
      expect(event?.args?.seller).to.equal(creator.address);
      expect(event?.args?.buyer).to.equal(buyer.address);
      expect(event?.args?.price).to.equal(price);

      // Check NFT ownership transfer
      expect(await nftMarketplace.ownerOf(tokenId)).to.equal(buyer.address);

      // Check listing is deactivated
      const listing = await nftMarketplace.listings(tokenId);
      expect(listing.isActive).to.be.false;

      // Check payment distribution
      const creatorBalanceAfter = await creator.getBalance();
      const ownerBalanceAfter = await owner.getBalance();

      const royaltyAmount = price.mul(ROYALTY_PERCENTAGE).div(10000);
      const platformFeeAmount = price.mul(PLATFORM_FEE).div(10000);
      const sellerAmount = price.sub(royaltyAmount).sub(platformFeeAmount);

      expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.equal(
        sellerAmount.add(royaltyAmount) // Creator gets both seller amount and royalty
      );
      expect(ownerBalanceAfter.sub(ownerBalanceBefore)).to.equal(platformFeeAmount);
    });

    it("Should reject buying with insufficient payment", async function () {
      const insufficientPrice = ethers.parseEther("0.5");

      await expect(
        nftMarketplace.connect(buyer).buyNFT(tokenId, {
          value: insufficientPrice,
        })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("Should reject buying inactive listing", async function () {
      // Cancel listing first
      await nftMarketplace.connect(creator).cancelListing(tokenId);

      await expect(
        nftMarketplace.connect(buyer).buyNFT(tokenId, {
          value: price,
        })
      ).to.be.revertedWith("NFT not for sale");
    });

    it("Should refund excess payment", async function () {
      const excessPrice = ethers.parseEther("2.0");
      const buyerBalanceBefore = await buyer.getBalance();

      const tx = await nftMarketplace.connect(buyer).buyNFT(tokenId, {
        value: excessPrice,
      });

      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
      const buyerBalanceAfter = await buyer.getBalance();

      // Buyer should only pay the listing price plus gas
      const expectedBalance = buyerBalanceBefore.sub(price).sub(gasUsed);
      expect(buyerBalanceAfter).to.equal(expectedBalance);
    });
  });

  describe("NFT Auctions", function () {
    let tokenId: number;
    const startingPrice = ethers.parseEther("0.5");
    const reservePrice = ethers.parseEther("1.0");
    const duration = 86400; // 24 hours

    beforeEach(async function () {
      // Mint NFT
      const tokenURI = "https://ipfs.io/ipfs/QmTest123";
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("test-content"));
      const metadata = {
        name: "Test NFT",
        description: "A test NFT",
        image: "https://ipfs.io/ipfs/QmImage123",
        animationUrl: "",
        externalUrl: "",
        attributes: ["Color:Blue"],
        creator: ethers.constants.AddressZero,
        createdAt: 0,
        isVerified: false,
      };

      await nftMarketplace.connect(creator).mintNFT(
        creator.address,
        tokenURI,
        ROYALTY_PERCENTAGE,
        contentHash,
        metadata
      );
      tokenId = 0;
    });

    it("Should create auction successfully", async function () {
      const tx = await nftMarketplace.connect(creator).createAuction(
        tokenId,
        startingPrice,
        reservePrice,
        duration
      );

      const receipt = await tx.wait();
      const event = receipt.events?.find(e => e.event === "AuctionCreated");
      
      expect(event).to.not.be.undefined;
      expect(event?.args?.tokenId).to.equal(tokenId);
      expect(event?.args?.seller).to.equal(creator.address);
      expect(event?.args?.startingPrice).to.equal(startingPrice);
      expect(event?.args?.reservePrice).to.equal(reservePrice);

      // Check NFT is transferred to contract
      expect(await nftMarketplace.ownerOf(tokenId)).to.equal(nftMarketplace.address);

      // Check auction details
      const auction = await nftMarketplace.auctions(tokenId);
      expect(auction.seller).to.equal(creator.address);
      expect(auction.startingPrice).to.equal(startingPrice);
      expect(auction.reservePrice).to.equal(reservePrice);
      expect(auction.isActive).to.be.true;
    });

    it("Should place bid successfully", async function () {
      // Create auction
      await nftMarketplace.connect(creator).createAuction(
        tokenId,
        startingPrice,
        reservePrice,
        duration
      );

      const bidAmount = ethers.parseEther("0.8");

      const tx = await nftMarketplace.connect(buyer).placeBid(tokenId, {
        value: bidAmount,
      });

      const receipt = await tx.wait();
      const event = receipt.events?.find(e => e.event === "BidPlaced");
      
      expect(event).to.not.be.undefined;
      expect(event?.args?.tokenId).to.equal(tokenId);
      expect(event?.args?.bidder).to.equal(buyer.address);
      expect(event?.args?.amount).to.equal(bidAmount);

      // Check auction state
      const auction = await nftMarketplace.auctions(tokenId);
      expect(auction.currentBid).to.equal(bidAmount);
      expect(auction.currentBidder).to.equal(buyer.address);
    });

    it("Should reject bid below starting price", async function () {
      await nftMarketplace.connect(creator).createAuction(
        tokenId,
        startingPrice,
        reservePrice,
        duration
      );

      const lowBid = ethers.parseEther("0.3");

      await expect(
        nftMarketplace.connect(buyer).placeBid(tokenId, {
          value: lowBid,
        })
      ).to.be.revertedWith("Bid below starting price");
    });

    it("Should reject bid from seller", async function () {
      await nftMarketplace.connect(creator).createAuction(
        tokenId,
        startingPrice,
        reservePrice,
        duration
      );

      await expect(
        nftMarketplace.connect(creator).placeBid(tokenId, {
          value: startingPrice,
        })
      ).to.be.revertedWith("Seller cannot bid");
    });

    it("Should refund previous bidder when outbid", async function () {
      await nftMarketplace.connect(creator).createAuction(
        tokenId,
        startingPrice,
        reservePrice,
        duration
      );

      const firstBid = ethers.parseEther("0.8");
      const secondBid = ethers.parseEther("1.2");

      // First bid
      await nftMarketplace.connect(buyer).placeBid(tokenId, {
        value: firstBid,
      });

      const buyerBalanceBefore = await buyer.getBalance();

      // Second bid from another user
      await nftMarketplace.connect(other).placeBid(tokenId, {
        value: secondBid,
      });

      const buyerBalanceAfter = await buyer.getBalance();

      // First bidder should be refunded
      expect(buyerBalanceAfter.sub(buyerBalanceBefore)).to.equal(firstBid);
    });

    it("Should end auction successfully with winner", async function () {
      await nftMarketplace.connect(creator).createAuction(
        tokenId,
        startingPrice,
        reservePrice,
        duration
      );

      const bidAmount = ethers.parseEther("1.5"); // Above reserve

      // Place bid
      await nftMarketplace.connect(buyer).placeBid(tokenId, {
        value: bidAmount,
      });

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [duration + 1]);
      await ethers.provider.send("evm_mine", []);

      const creatorBalanceBefore = await creator.getBalance();
      const ownerBalanceBefore = await owner.getBalance();

      const tx = await nftMarketplace.connect(creator).endAuction(tokenId);

      const receipt = await tx.wait();
      const event = receipt.events?.find(e => e.event === "AuctionEnded");
      
      expect(event).to.not.be.undefined;
      expect(event?.args?.tokenId).to.equal(tokenId);
      expect(event?.args?.winner).to.equal(buyer.address);
      expect(event?.args?.winningBid).to.equal(bidAmount);

      // Check NFT ownership transfer
      expect(await nftMarketplace.ownerOf(tokenId)).to.equal(buyer.address);

      // Check payment distribution
      const creatorBalanceAfter = await creator.getBalance();
      const ownerBalanceAfter = await owner.getBalance();

      const royaltyAmount = bidAmount.mul(ROYALTY_PERCENTAGE).div(10000);
      const platformFeeAmount = bidAmount.mul(PLATFORM_FEE).div(10000);
      const sellerAmount = bidAmount.sub(royaltyAmount).sub(platformFeeAmount);

      expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.be.closeTo(
        sellerAmount.add(royaltyAmount), // Creator gets both seller amount and royalty
        ethers.parseEther("0.01") // Allow small gas cost variance
      );
      expect(ownerBalanceAfter.sub(ownerBalanceBefore)).to.equal(platformFeeAmount);
    });
  });

  describe("NFT Offers", function () {
    let tokenId: number;

    beforeEach(async function () {
      // Mint NFT
      const tokenURI = "https://ipfs.io/ipfs/QmTest123";
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("test-content"));
      const metadata = {
        name: "Test NFT",
        description: "A test NFT",
        image: "https://ipfs.io/ipfs/QmImage123",
        animationUrl: "",
        externalUrl: "",
        attributes: ["Color:Blue"],
        creator: ethers.constants.AddressZero,
        createdAt: 0,
        isVerified: false,
      };

      await nftMarketplace.connect(creator).mintNFT(
        creator.address,
        tokenURI,
        ROYALTY_PERCENTAGE,
        contentHash,
        metadata
      );
      tokenId = 0;
    });

    it("Should make offer successfully", async function () {
      const offerAmount = ethers.parseEther("0.8");
      const duration = 86400;

      const tx = await nftMarketplace.connect(buyer).makeOffer(tokenId, duration, {
        value: offerAmount,
      });

      const receipt = await tx.wait();
      const event = receipt.events?.find(e => e.event === "OfferMade");
      
      expect(event).to.not.be.undefined;
      expect(event?.args?.tokenId).to.equal(tokenId);
      expect(event?.args?.buyer).to.equal(buyer.address);
      expect(event?.args?.amount).to.equal(offerAmount);
    });

    it("Should accept offer successfully", async function () {
      const offerAmount = ethers.parseEther("0.8");
      const duration = 86400;

      // Make offer
      await nftMarketplace.connect(buyer).makeOffer(tokenId, duration, {
        value: offerAmount,
      });

      const creatorBalanceBefore = await creator.getBalance();
      const ownerBalanceBefore = await owner.getBalance();

      const tx = await nftMarketplace.connect(creator).acceptOffer(tokenId, 0);

      const receipt = await tx.wait();
      const event = receipt.events?.find(e => e.event === "OfferAccepted");
      
      expect(event).to.not.be.undefined;
      expect(event?.args?.tokenId).to.equal(tokenId);
      expect(event?.args?.seller).to.equal(creator.address);
      expect(event?.args?.buyer).to.equal(buyer.address);
      expect(event?.args?.amount).to.equal(offerAmount);

      // Check NFT ownership transfer
      expect(await nftMarketplace.ownerOf(tokenId)).to.equal(buyer.address);

      // Check payment distribution
      const creatorBalanceAfter = await creator.getBalance();
      const ownerBalanceAfter = await owner.getBalance();

      const royaltyAmount = offerAmount.mul(ROYALTY_PERCENTAGE).div(10000);
      const platformFeeAmount = offerAmount.mul(PLATFORM_FEE).div(10000);
      const sellerAmount = offerAmount.sub(royaltyAmount).sub(platformFeeAmount);

      expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.be.closeTo(
        sellerAmount.add(royaltyAmount), // Creator gets both seller amount and royalty
        ethers.parseEther("0.01") // Allow small gas cost variance
      );
      expect(ownerBalanceAfter.sub(ownerBalanceBefore)).to.equal(platformFeeAmount);
    });

    it("Should reject offer with zero amount", async function () {
      const duration = 86400;

      await expect(
        nftMarketplace.connect(buyer).makeOffer(tokenId, duration, {
          value: 0,
        })
      ).to.be.revertedWith("Offer must be greater than 0");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to verify NFT", async function () {
      // Mint NFT first
      const tokenURI = "https://ipfs.io/ipfs/QmTest123";
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("test-content"));
      const metadata = {
        name: "Test NFT",
        description: "A test NFT",
        image: "https://ipfs.io/ipfs/QmImage123",
        animationUrl: "",
        externalUrl: "",
        attributes: ["Color:Blue"],
        creator: ethers.constants.AddressZero,
        createdAt: 0,
        isVerified: false,
      };

      await nftMarketplace.connect(creator).mintNFT(
        creator.address,
        tokenURI,
        ROYALTY_PERCENTAGE,
        contentHash,
        metadata
      );

      await nftMarketplace.connect(owner).verifyNFT(0);

      const nftMetadata = await nftMarketplace.getNFTMetadata(0);
      expect(nftMetadata.isVerified).to.be.true;
    });

    it("Should allow owner to set platform fee", async function () {
      const newFee = 500; // 5%

      await nftMarketplace.connect(owner).setPlatformFee(newFee);

      expect(await nftMarketplace.platformFee()).to.equal(newFee);
    });

    it("Should reject setting platform fee too high", async function () {
      const highFee = 1500; // 15%

      await expect(
        nftMarketplace.connect(owner).setPlatformFee(highFee)
      ).to.be.revertedWith("Fee too high");
    });

    it("Should allow owner to set platform fee recipient", async function () {
      await nftMarketplace.connect(owner).setPlatformFeeRecipient(other.address);

      expect(await nftMarketplace.platformFeeRecipient()).to.equal(other.address);
    });

    it("Should reject non-owner admin functions", async function () {
      await expect(
        nftMarketplace.connect(creator).setPlatformFee(500)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      await expect(
        nftMarketplace.connect(creator).verifyNFT(0)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("View Functions", function () {
    let tokenId: number;

    beforeEach(async function () {
      const tokenURI = "https://ipfs.io/ipfs/QmTest123";
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("test-content"));
      const metadata = {
        name: "Test NFT",
        description: "A test NFT",
        image: "https://ipfs.io/ipfs/QmImage123",
        animationUrl: "",
        externalUrl: "",
        attributes: ["Color:Blue", "Rarity:Common"],
        creator: ethers.constants.AddressZero,
        createdAt: 0,
        isVerified: false,
      };

      await nftMarketplace.connect(creator).mintNFT(
        creator.address,
        tokenURI,
        ROYALTY_PERCENTAGE,
        contentHash,
        metadata
      );
      tokenId = 0;
    });

    it("Should return NFT metadata", async function () {
      const metadata = await nftMarketplace.getNFTMetadata(tokenId);

      expect(metadata.name).to.equal("Test NFT");
      expect(metadata.description).to.equal("A test NFT");
      expect(metadata.creator).to.equal(creator.address);
      expect(metadata.isVerified).to.be.false;
    });

    it("Should return creator NFTs", async function () {
      const creatorNFTs = await nftMarketplace.getCreatorNFTs(creator.address);

      expect(creatorNFTs).to.have.lengthOf(1);
      expect(creatorNFTs[0]).to.equal(tokenId);
    });

    it("Should return active offers", async function () {
      const offerAmount = ethers.parseEther("0.8");
      const duration = 86400;

      await nftMarketplace.connect(buyer).makeOffer(tokenId, duration, {
        value: offerAmount,
      });

      const offers = await nftMarketplace.getActiveOffers(tokenId);

      expect(offers).to.have.lengthOf(1);
      expect(offers[0].buyer).to.equal(buyer.address);
      expect(offers[0].amount).to.equal(offerAmount);
    });
  });
});