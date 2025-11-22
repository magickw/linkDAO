import { expect } from "chai";
import { ethers } from "hardhat";
import { Marketplace, LinkDAOToken } from "../typechain-types";

describe("Marketplace", function () {
  let marketplace: Marketplace;
  let token: LinkDAOToken;
  let owner: any;
  let seller: any;
  let buyer: any;
  let addr1: any;
  let addr2: any;

  beforeEach(async function () {
    [owner, seller, buyer, addr1, addr2] = await ethers.getSigners();

    // Deploy LinkDAOToken
    const LinkDAOTokenFactory = await ethers.getContractFactory("LinkDAOToken");
    token = await LinkDAOTokenFactory.deploy();
    await token.deployed();

    // Deploy Marketplace
    const MarketplaceFactory = await ethers.getContractFactory("Marketplace");
    marketplace = await MarketplaceFactory.deploy();
    await marketplace.deployed();

    // Mint some tokens for testing
    await token.mint(seller.address, ethers.parseEther("1000"));
    await token.mint(buyer.address, ethers.parseEther("1000"));
  });

  describe("Fixed Price Listings", function () {
    it("Should create a fixed price listing", async function () {
      // Approve marketplace to spend seller's tokens
      await token.connect(seller).approve(marketplace.address, ethers.parseEther("100"));

      // Set seller reputation score
      await marketplace.connect(owner).updateReputationScore(seller.address, 100);

      // Create listing
      await expect(marketplace.connect(seller).createFixedPriceListing(
        token.address,
        ethers.parseEther("10"),
        5,
        1, // DIGITAL
        "ipfs://test-metadata"
      )).to.emit(marketplace, "ListingCreated");

      // Check listing was created
      const listing = await marketplace.listings(1);
      expect(listing.seller).to.equal(seller.address);
      expect(listing.price).to.equal(ethers.parseEther("10"));
      expect(listing.quantity).to.equal(5);
    });

    it("Should not create listing without sufficient reputation", async function () {
      // Try to create listing without sufficient reputation
      await expect(marketplace.connect(seller).createFixedPriceListing(
        token.address,
        ethers.parseEther("10"),
        5,
        1, // DIGITAL
        "ipfs://test-metadata"
      )).to.be.revertedWith("Insufficient reputation or not DAO approved");
    });

    it("Should buy a fixed price item", async function () {
      // Set seller reputation score
      await marketplace.connect(owner).updateReputationScore(seller.address, 100);

      // Create listing
      await token.connect(seller).approve(marketplace.address, ethers.parseEther("100"));
      await marketplace.connect(seller).createFixedPriceListing(
        token.address,
        ethers.parseEther("10"),
        5,
        1, // DIGITAL
        "ipfs://test-metadata"
      );

      // Buyer approves marketplace to spend tokens
      await token.connect(buyer).approve(marketplace.address, ethers.parseEther("100"));

      // Buy item
      await expect(marketplace.connect(buyer).buyFixedPriceItem(1, 2))
        .to.emit(marketplace, "ItemSold");

      // Check quantities updated
      const listing = await marketplace.listings(1);
      expect(listing.quantity).to.equal(3);
    });
  });

  describe("Auction Listings", function () {
    it("Should create an auction listing", async function () {
      // Set seller reputation score
      await marketplace.connect(owner).updateReputationScore(seller.address, 100);

      // Create auction listing
      await expect(marketplace.connect(seller).createAuctionListing(
        token.address,
        ethers.parseEther("10"),
        1,
        1, // DIGITAL
        86400, // 1 day
        "ipfs://test-metadata"
      )).to.emit(marketplace, "ListingCreated");

      // Check listing was created
      const listing = await marketplace.listings(1);
      expect(listing.seller).to.equal(seller.address);
      expect(listing.price).to.equal(ethers.parseEther("10"));
      expect(listing.listingType).to.equal(1); // AUCTION
    });

    it("Should place a bid on an auction", async function () {
      // Set seller reputation score
      await marketplace.connect(owner).updateReputationScore(seller.address, 100);

      // Create auction listing
      await marketplace.connect(seller).createAuctionListing(
        ethers.ZeroAddress, // ETH
        ethers.parseEther("10"),
        1,
        1, // DIGITAL
        86400, // 1 day
        "ipfs://test-metadata"
      );

      // Place bid
      await expect(marketplace.connect(buyer).placeBid(1, { value: ethers.parseEther("15") }))
        .to.emit(marketplace, "BidPlaced");

      // Check highest bid updated
      const listing = await marketplace.listings(1);
      expect(listing.highestBid).to.equal(ethers.parseEther("15"));
      expect(listing.highestBidder).to.equal(buyer.address);
    });
  });

  describe("Reputation System", function () {
    it("Should update user reputation score", async function () {
      await expect(marketplace.connect(owner).updateReputationScore(seller.address, 150))
        .to.emit(marketplace, "ReputationUpdated");

      const score = await marketplace.reputationScores(seller.address);
      expect(score).to.equal(150);
    });

    it("Should only allow DAO to update reputation", async function () {
      await expect(marketplace.connect(seller).updateReputationScore(seller.address, 150))
        .to.be.revertedWith("Not DAO");
    });
  });

  describe("DAO Approved Vendors", function () {
    it("Should approve vendor as DAO", async function () {
      await expect(marketplace.connect(owner).setDAOApprovedVendor(seller.address, true))
        .to.emit(marketplace, "VendorApproved");

      const isApproved = await marketplace.daoApprovedVendors(seller.address);
      expect(isApproved).to.be.true;
    });

    it("Should allow approved vendor to create listing without reputation", async function () {
      // Approve vendor
      await marketplace.connect(owner).setDAOApprovedVendor(seller.address, true);

      // Create listing without reputation
      await token.connect(seller).approve(marketplace.address, ethers.parseEther("100"));
      await expect(marketplace.connect(seller).createFixedPriceListing(
        token.address,
        ethers.parseEther("10"),
        5,
        1, // DIGITAL
        "ipfs://test-metadata"
      )).to.emit(marketplace, "ListingCreated");
    });
  });
});