import { expect } from "chai";
import { ethers } from "hardhat";
import { NFTMarketplace } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("NFTMarketplace - USDC/USDT Support", function () {
  let marketplace: NFTMarketplace;
  let mockUSDC: any;
  let mockUSDT: any;
  let owner: SignerWithAddress;
  let seller: SignerWithAddress;
  let buyer: SignerWithAddress;

  const USDC_DECIMALS = 6;
  const INITIAL_BALANCE = ethers.parseUnits("10000", USDC_DECIMALS); // 10,000 USDC/USDT

  beforeEach(async function () {
    [owner, seller, buyer] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for USDC and USDT
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockUSDC = await MockERC20.deploy("USD Coin", "USDC", USDC_DECIMALS);
    mockUSDT = await MockERC20.deploy("Tether USD", "USDT", USDC_DECIMALS);

    // Deploy NFTMarketplace with USDC and USDT addresses
    const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
    marketplace = await NFTMarketplace.deploy(
      await mockUSDC.getAddress(),
      await mockUSDT.getAddress()
    );

    // Mint tokens to seller and buyer
    await mockUSDC.mint(seller.address, INITIAL_BALANCE);
    await mockUSDC.mint(buyer.address, INITIAL_BALANCE);
    await mockUSDT.mint(seller.address, INITIAL_BALANCE);
    await mockUSDT.mint(buyer.address, INITIAL_BALANCE);
  });

  describe("Payment Token Setup", function () {
    it("Should have USDC and USDT tokens set", async function () {
      expect(await marketplace.usdcToken()).to.equal(await mockUSDC.getAddress());
      expect(await marketplace.usdtToken()).to.equal(await mockUSDT.getAddress());
    });

    it("Should allow owner to update payment tokens", async function () {
      const newMockUSDC = await (await ethers.getContractFactory("MockERC20")).deploy("New USDC", "USDC", 6);
      const newMockUSDT = await (await ethers.getContractFactory("MockERC20")).deploy("New USDT", "USDT", 6);

      await marketplace.setPaymentTokens(
        await newMockUSDC.getAddress(),
        await newMockUSDT.getAddress()
      );

      expect(await marketplace.usdcToken()).to.equal(await newMockUSDC.getAddress());
      expect(await marketplace.usdtToken()).to.equal(await newMockUSDT.getAddress());
    });
  });

  describe("Listing NFTs with USDC/USDT", function () {
    let tokenId: number;

    beforeEach(async function () {
      // Mint an NFT
      const metadata = {
        name: "Test NFT",
        description: "A test NFT",
        image: "ipfs://test",
        animationUrl: "",
        externalUrl: "",
        attributes: [],
        creator: seller.address,
        createdAt: 0,
        isVerified: false
      };

      const tx = await marketplace.connect(seller).mintNFT(
        seller.address,
        "ipfs://test-uri",
        250, // 2.5% royalty
        ethers.id("test-content-hash"),
        metadata
      );

      const receipt = await tx.wait();
      tokenId = 0; // First token
    });

    it("Should list NFT with USDC payment method", async function () {
      const price = ethers.parseUnits("100", USDC_DECIMALS); // 100 USDC
      const duration = 7 * 24 * 60 * 60; // 7 days

      await marketplace.connect(seller).listNFT(
        tokenId,
        price,
        duration,
        1 // PaymentMethod.USDC
      );

      const listing = await marketplace.listings(tokenId);
      expect(listing.price).to.equal(price);
      expect(listing.paymentMethod).to.equal(1); // USDC
      expect(listing.isActive).to.be.true;
    });

    it("Should list NFT with USDT payment method", async function () {
      const price = ethers.parseUnits("100", USDC_DECIMALS);
      const duration = 7 * 24 * 60 * 60;

      await marketplace.connect(seller).listNFT(
        tokenId,
        price,
        duration,
        2 // PaymentMethod.USDT
      );

      const listing = await marketplace.listings(tokenId);
      expect(listing.paymentMethod).to.equal(2); // USDT
    });
  });

  describe("Buying NFTs with USDC", function () {
    let tokenId: number;
    const price = ethers.parseUnits("100", USDC_DECIMALS);

    beforeEach(async function () {
      // Mint and list NFT
      const metadata = {
        name: "Test NFT",
        description: "A test NFT",
        image: "ipfs://test",
        animationUrl: "",
        externalUrl: "",
        attributes: [],
        creator: seller.address,
        createdAt: 0,
        isVerified: false
      };

      await marketplace.connect(seller).mintNFT(
        seller.address,
        "ipfs://test-uri",
        250,
        ethers.id("test-content-hash"),
        metadata
      );

      tokenId = 0;

      await marketplace.connect(seller).listNFT(
        tokenId,
        price,
        7 * 24 * 60 * 60,
        1 // USDC
      );
    });

    it("Should buy NFT with USDC", async function () {
      // Approve marketplace to spend USDC
      await mockUSDC.connect(buyer).approve(await marketplace.getAddress(), price);

      const buyerBalanceBefore = await mockUSDC.balanceOf(buyer.address);
      const sellerBalanceBefore = await mockUSDC.balanceOf(seller.address);

      // Buy NFT
      await marketplace.connect(buyer).buyNFT(tokenId);

      // Check NFT ownership transferred
      expect(await marketplace.ownerOf(tokenId)).to.equal(buyer.address);

      // Check USDC was transferred
      const buyerBalanceAfter = await mockUSDC.balanceOf(buyer.address);
      expect(buyerBalanceBefore - buyerBalanceAfter).to.equal(price);

      // Seller should receive payment minus fees (2.5% platform + 2.5% royalty = 5%)
      const sellerBalanceAfter = await mockUSDC.balanceOf(seller.address);
      const expectedSellerPayment = (price * 95n) / 100n; // 95% of price
      expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(expectedSellerPayment);
    });

    it("Should reject ETH payment for USDC listings", async function () {
      await expect(
        marketplace.connect(buyer).buyNFT(tokenId, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("ETH not accepted for token payments");
    });
  });

  describe("Auctions with USDC/USDT", function () {
    let tokenId: number;
    const startingPrice = ethers.parseUnits("50", USDC_DECIMALS);

    beforeEach(async function () {
      const metadata = {
        name: "Test NFT",
        description: "A test NFT",
        image: "ipfs://test",
        animationUrl: "",
        externalUrl: "",
        attributes: [],
        creator: seller.address,
        createdAt: 0,
        isVerified: false
      };

      await marketplace.connect(seller).mintNFT(
        seller.address,
        "ipfs://test-uri",
        250,
        ethers.id("test-auction-hash"),
        metadata
      );

      tokenId = 0;
    });

    it("Should create auction with USDC", async function () {
      await marketplace.connect(seller).createAuction(
        tokenId,
        startingPrice,
        startingPrice,
        24 * 60 * 60, // 1 day
        1 // USDC
      );

      const auction = await marketplace.auctions(tokenId);
      expect(auction.startingPrice).to.equal(startingPrice);
      expect(auction.paymentMethod).to.equal(1);
      expect(auction.isActive).to.be.true;
    });

    it("Should place bid with USDC", async function () {
      await marketplace.connect(seller).createAuction(
        tokenId,
        startingPrice,
        startingPrice,
        24 * 60 * 60,
        1 // USDC
      );

      const bidAmount = ethers.parseUnits("60", USDC_DECIMALS);

      // Approve and place bid
      await mockUSDC.connect(buyer).approve(await marketplace.getAddress(), bidAmount);
      await marketplace.connect(buyer).placeBid(tokenId, bidAmount);

      const auction = await marketplace.auctions(tokenId);
      expect(auction.currentBid).to.equal(bidAmount);
      expect(auction.currentBidder).to.equal(buyer.address);
    });
  });

  describe("Offers with USDC/USDT", function () {
    let tokenId: number;

    beforeEach(async function () {
      const metadata = {
        name: "Test NFT",
        description: "A test NFT",
        image: "ipfs://test",
        animationUrl: "",
        externalUrl: "",
        attributes: [],
        creator: seller.address,
        createdAt: 0,
        isVerified: false
      };

      await marketplace.connect(seller).mintNFT(
        seller.address,
        "ipfs://test-uri",
        250,
        ethers.id("test-offer-hash"),
        metadata
      );

      tokenId = 0;
    });

    it("Should make offer with USDC", async function () {
      const offerAmount = ethers.parseUnits("75", USDC_DECIMALS);
      const duration = 3 * 24 * 60 * 60; // 3 days

      // Approve and make offer
      await mockUSDC.connect(buyer).approve(await marketplace.getAddress(), offerAmount);
      await marketplace.connect(buyer).makeOffer(
        tokenId,
        duration,
        1, // USDC
        offerAmount
      );

      const offers = await marketplace.getActiveOffers(tokenId);
      expect(offers.length).to.equal(1);
      expect(offers[0].amount).to.equal(offerAmount);
      expect(offers[0].paymentMethod).to.equal(1);
    });

    it("Should accept USDC offer", async function () {
      const offerAmount = ethers.parseUnits("75", USDC_DECIMALS);
      const duration = 3 * 24 * 60 * 60;

      // Make offer
      await mockUSDC.connect(buyer).approve(await marketplace.getAddress(), offerAmount);
      await marketplace.connect(buyer).makeOffer(tokenId, duration, 1, offerAmount);

      const sellerBalanceBefore = await mockUSDC.balanceOf(seller.address);

      // Accept offer
      await marketplace.connect(seller).acceptOffer(tokenId, 0);

      // Check NFT transferred
      expect(await marketplace.ownerOf(tokenId)).to.equal(buyer.address);

      // Check seller received USDC
      const sellerBalanceAfter = await mockUSDC.balanceOf(seller.address);
      const expectedPayment = (offerAmount * 95n) / 100n; // After fees
      expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(expectedPayment);
    });

    it("Should cancel USDC offer", async function () {
      const offerAmount = ethers.parseUnits("75", USDC_DECIMALS);
      const duration = 3 * 24 * 60 * 60;

      // Make offer
      await mockUSDC.connect(buyer).approve(await marketplace.getAddress(), offerAmount);
      await marketplace.connect(buyer).makeOffer(tokenId, duration, 1, offerAmount);

      const buyerBalanceBefore = await mockUSDC.balanceOf(buyer.address);

      // Cancel offer
      await marketplace.connect(buyer).cancelOffer(tokenId, 0);

      // Check refund
      const buyerBalanceAfter = await mockUSDC.balanceOf(buyer.address);
      expect(buyerBalanceAfter - buyerBalanceBefore).to.equal(offerAmount);
    });
  });
});
