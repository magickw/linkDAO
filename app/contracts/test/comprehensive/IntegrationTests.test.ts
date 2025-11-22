import { expect } from "chai";
import { ethers } from "hardhat";
import { TestSuite } from "./TestSuite";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const { parseEther, parseUnits } = ethers;

describe("Comprehensive Integration Tests", function () {
  let testSuite: TestSuite;

  before(async function () {
    testSuite = new TestSuite();
    await testSuite.deployAll();
  });

  describe("Complete Marketplace Transaction Flow", function () {
    it("Should handle end-to-end marketplace transaction with escrow", async function () {
      const price = parseEther("1");
      const quantity = 1;
      
      // Step 1: Seller creates listing
      const listingTx = await testSuite.contracts.marketplace.connect(testSuite.accounts.seller).createListing(
        ethers.constants.AddressZero, // ETH
        0,
        price,
        quantity,
        0, // ItemType.PHYSICAL
        0  // ListingType.FIXED_PRICE
      );
      const listingReceipt = await listingTx.wait();
      const listingId = listingReceipt.events?.[0]?.args?.listingId;
      
      // Step 2: Buyer purchases item (creates escrow)
      const purchaseTx = await testSuite.contracts.marketplace.connect(testSuite.accounts.buyer).purchaseItem(
        listingId,
        quantity,
        { value: price }
      );
      const purchaseReceipt = await purchaseTx.wait();
      const escrowId = purchaseReceipt.events?.find(e => e.event === "EscrowCreated")?.args?.escrowId;
      
      // Step 3: Buyer confirms delivery
      await testSuite.contracts.enhancedEscrow.connect(testSuite.accounts.buyer).confirmDelivery(escrowId);
      
      // Step 4: Verify seller received payment
      const escrowInfo = await testSuite.contracts.enhancedEscrow.getEscrow(escrowId);
      expect(escrowInfo.status).to.equal(2); // EscrowStatus.COMPLETED
    });

    it("Should handle dispute resolution workflow", async function () {
      const price = parseEther("1");
      const quantity = 1;
      
      // Create listing and purchase
      const listingTx = await testSuite.contracts.marketplace.connect(testSuite.accounts.seller).createListing(
        ethers.constants.AddressZero,
        0,
        price,
        quantity,
        0,
        0
      );
      const listingReceipt = await listingTx.wait();
      const listingId = listingReceipt.events?.[0]?.args?.listingId;
      
      const purchaseTx = await testSuite.contracts.marketplace.connect(testSuite.accounts.buyer).purchaseItem(
        listingId,
        quantity,
        { value: price }
      );
      const purchaseReceipt = await purchaseTx.wait();
      const escrowId = purchaseReceipt.events?.find(e => e.event === "EscrowCreated")?.args?.escrowId;
      
      // Create dispute
      const disputeTx = await testSuite.contracts.disputeResolution.connect(testSuite.accounts.buyer).createDispute(
        escrowId,
        "Item not as described"
      );
      const disputeReceipt = await disputeTx.wait();
      const disputeId = disputeReceipt.events?.[0]?.args?.disputeId;
      
      // Apply as arbitrator
      await testSuite.contracts.disputeResolution.connect(testSuite.accounts.arbitrator).applyAsArbitrator();
      
      // Approve arbitrator (as owner)
      await testSuite.contracts.disputeResolution.approveArbitrator(testSuite.accounts.arbitrator.address);
      
      // Assign arbitrator to dispute
      await testSuite.contracts.disputeResolution.assignArbitrator(disputeId, testSuite.accounts.arbitrator.address);
      
      // Resolve dispute in favor of buyer
      await testSuite.contracts.disputeResolution.connect(testSuite.accounts.arbitrator).resolveDispute(
        disputeId,
        1, // Resolution.REFUND_BUYER
        "Buyer was correct"
      );
      
      // Verify dispute resolution
      const disputeInfo = await testSuite.contracts.disputeResolution.getDispute(disputeId);
      expect(disputeInfo.status).to.equal(2); // DisputeStatus.RESOLVED
    });
  });

  describe("Governance and Staking Integration", function () {
    it("Should handle governance proposal with staking requirements", async function () {
      const stakeAmount = parseEther("10000");
      
      // User stakes tokens for voting power
      await testSuite.contracts.ldaoToken.connect(testSuite.accounts.user1).stake(stakeAmount, 180);
      
      // Create governance proposal
      const description = "Integration test proposal";
      const targets = [testSuite.contracts.ldaoToken.address];
      const values = [0];
      const calldatas = ["0x"];
      
      const proposalTx = await testSuite.contracts.governance.connect(testSuite.accounts.user1).propose(
        targets, values, calldatas, description
      );
      const proposalReceipt = await proposalTx.wait();
      const proposalId = proposalReceipt.events?.[0]?.args?.proposalId;
      
      // Fast forward to voting period
      await ethers.provider.send("hardhat_mine", ["0x1C20"]);
      
      // Vote on proposal
      await testSuite.contracts.governance.connect(testSuite.accounts.user1).castVote(proposalId, 1);
      
      // Verify voting power includes staking bonus
      const votingPower = await testSuite.contracts.ldaoToken.getVotingPower(testSuite.accounts.user1.address);
      expect(votingPower).to.be.gt(stakeAmount); // Should be higher due to staking multiplier
    });

    it("Should integrate reputation with marketplace transactions", async function () {
      const price = parseEther("0.5");
      
      // Complete a successful transaction
      const listingTx = await testSuite.contracts.marketplace.connect(testSuite.accounts.seller).createListing(
        ethers.constants.AddressZero,
        0,
        price,
        1,
        0,
        0
      );
      const listingReceipt = await listingTx.wait();
      const listingId = listingReceipt.events?.[0]?.args?.listingId;
      
      const purchaseTx = await testSuite.contracts.marketplace.connect(testSuite.accounts.buyer).purchaseItem(
        listingId,
        1,
        { value: price }
      );
      const purchaseReceipt = await purchaseTx.wait();
      const escrowId = purchaseReceipt.events?.find(e => e.event === "EscrowCreated")?.args?.escrowId;
      
      await testSuite.contracts.enhancedEscrow.connect(testSuite.accounts.buyer).confirmDelivery(escrowId);
      
      // Update reputation based on successful transaction
      await testSuite.contracts.reputationSystem.updateReputation(
        testSuite.accounts.seller.address,
        100,
        "Successful transaction"
      );
      
      // Verify reputation update
      const reputation = await testSuite.contracts.reputationSystem.getReputation(testSuite.accounts.seller.address);
      expect(reputation.totalPoints).to.equal(100);
    });
  });

  describe("NFT Marketplace Integration", function () {
    it("Should handle NFT creation, listing, and sale workflow", async function () {
      const tokenURI = "ipfs://test-nft-metadata";
      const royaltyBps = 500; // 5%
      const price = parseEther("2");
      
      // Step 1: Mint NFT
      const mintTx = await testSuite.contracts.nftMarketplace.connect(testSuite.accounts.user1).mintNFT(
        testSuite.accounts.user1.address,
        tokenURI,
        royaltyBps
      );
      const mintReceipt = await mintTx.wait();
      const tokenId = mintReceipt.events?.[0]?.args?.tokenId;
      
      // Step 2: List NFT for sale
      await testSuite.contracts.nftMarketplace.connect(testSuite.accounts.user1).listNFT(tokenId, price);
      
      // Step 3: Buy NFT
      await testSuite.contracts.nftMarketplace.connect(testSuite.accounts.buyer).buyNFT(
        tokenId,
        { value: price }
      );
      
      // Step 4: Verify ownership transfer
      const newOwner = await testSuite.contracts.nftMarketplace.ownerOf(tokenId);
      expect(newOwner).to.equal(testSuite.accounts.buyer.address);
    });

    it("Should handle NFT collection creation and minting", async function () {
      const collectionName = "Test Collection";
      const collectionSymbol = "TEST";
      const maxSupply = 1000;
      const mintPrice = parseEther("0.1");
      
      // Create collection
      const createTx = await testSuite.contracts.nftCollectionFactory.connect(testSuite.accounts.user1).createCollection(
        collectionName,
        collectionSymbol,
        maxSupply,
        mintPrice,
        testSuite.accounts.user1.address // royalty recipient
      );
      const createReceipt = await createTx.wait();
      const collectionAddress = createReceipt.events?.[0]?.args?.collectionAddress;
      
      // Verify collection creation
      expect(collectionAddress).to.not.equal(ethers.constants.AddressZero);
      
      const collections = await testSuite.contracts.nftCollectionFactory.getUserCollections(testSuite.accounts.user1.address);
      expect(collections.length).to.equal(1);
      expect(collections[0]).to.equal(collectionAddress);
    });
  });

  describe("Social Features Integration", function () {
    it("Should handle tipping with reward pool distribution", async function () {
      const tipAmount = parseEther("100");
      const postId = "integration-test-post";
      
      // Check initial balances
      const initialCreatorBalance = await testSuite.contracts.ldaoToken.balanceOf(testSuite.accounts.user2.address);
      const initialRewardPoolBalance = await testSuite.contracts.ldaoToken.balanceOf(testSuite.contracts.rewardPool.address);
      
      // Approve and send tip
      await testSuite.contracts.ldaoToken.connect(testSuite.accounts.user1).approve(
        testSuite.contracts.tipRouter.address,
        tipAmount
      );
      
      await testSuite.contracts.tipRouter.connect(testSuite.accounts.user1).tip(
        testSuite.accounts.user2.address,
        tipAmount,
        postId
      );
      
      // Verify tip distribution
      const finalCreatorBalance = await testSuite.contracts.ldaoToken.balanceOf(testSuite.accounts.user2.address);
      const finalRewardPoolBalance = await testSuite.contracts.ldaoToken.balanceOf(testSuite.contracts.rewardPool.address);
      
      expect(finalCreatorBalance).to.be.gt(initialCreatorBalance);
      expect(finalRewardPoolBalance).to.be.gt(initialRewardPoolBalance);
    });

    it("Should integrate following with profile system", async function () {
      const handle1 = "user1handle";
      const handle2 = "user2handle";
      const metadataURI = "ipfs://profile-metadata";
      
      // Register profiles
      await testSuite.contracts.profileRegistry.connect(testSuite.accounts.user1).registerProfile(handle1, metadataURI);
      await testSuite.contracts.profileRegistry.connect(testSuite.accounts.user2).registerProfile(handle2, metadataURI);
      
      // Follow user
      await testSuite.contracts.followModule.connect(testSuite.accounts.user1).follow(testSuite.accounts.user2.address);
      
      // Verify following relationship
      const isFollowing = await testSuite.contracts.followModule.isFollowing(
        testSuite.accounts.user1.address,
        testSuite.accounts.user2.address
      );
      expect(isFollowing).to.be.true;
      
      const followerCount = await testSuite.contracts.followModule.getFollowerCount(testSuite.accounts.user2.address);
      expect(followerCount).to.equal(1);
    });
  });

  describe("Payment Router Integration", function () {
    it("Should handle multi-token payments with fee distribution", async function () {
      const ethAmount = parseEther("1");
      const usdcAmount = parseUnits("100", 6);
      
      const initialFeeCollectorETH = await ethers.provider.getBalance(testSuite.accounts.feeCollector.address);
      const initialFeeCollectorUSDC = await testSuite.contracts.mockUSDC.balanceOf(testSuite.accounts.feeCollector.address);
      
      // Process ETH payment
      await testSuite.contracts.paymentRouter.connect(testSuite.accounts.buyer).processPayment(
        ethers.constants.AddressZero,
        ethAmount,
        testSuite.accounts.seller.address,
        { value: ethAmount }
      );
      
      // Process USDC payment
      await testSuite.contracts.mockUSDC.connect(testSuite.accounts.buyer).approve(
        testSuite.contracts.paymentRouter.address,
        usdcAmount
      );
      
      await testSuite.contracts.paymentRouter.connect(testSuite.accounts.buyer).processPayment(
        testSuite.contracts.mockUSDC.address,
        usdcAmount,
        testSuite.accounts.seller.address
      );
      
      // Verify fee collection
      const finalFeeCollectorETH = await ethers.provider.getBalance(testSuite.accounts.feeCollector.address);
      const finalFeeCollectorUSDC = await testSuite.contracts.mockUSDC.balanceOf(testSuite.accounts.feeCollector.address);
      
      expect(finalFeeCollectorETH).to.be.gt(initialFeeCollectorETH);
      expect(finalFeeCollectorUSDC).to.be.gt(initialFeeCollectorUSDC);
    });
  });

  describe("Cross-Contract Event Emission", function () {
    it("Should emit proper events for off-chain indexing", async function () {
      const price = parseEther("0.5");
      
      // Create and complete a transaction, checking all events
      const listingTx = await testSuite.contracts.marketplace.connect(testSuite.accounts.seller).createListing(
        ethers.constants.AddressZero,
        0,
        price,
        1,
        0,
        0
      );
      
      // Verify ListingCreated event
      await expect(listingTx).to.emit(testSuite.contracts.marketplace, "ListingCreated");
      
      const listingReceipt = await listingTx.wait();
      const listingId = listingReceipt.events?.[0]?.args?.listingId;
      
      const purchaseTx = await testSuite.contracts.marketplace.connect(testSuite.accounts.buyer).purchaseItem(
        listingId,
        1,
        { value: price }
      );
      
      // Verify multiple events in purchase transaction
      await expect(purchaseTx)
        .to.emit(testSuite.contracts.marketplace, "ItemPurchased")
        .and.to.emit(testSuite.contracts.enhancedEscrow, "EscrowCreated");
    });
  });

  describe("Emergency and Edge Cases", function () {
    it("Should handle emergency pause scenarios", async function () {
      // Pause marketplace
      await testSuite.contracts.marketplace.pause();
      
      // Verify operations are paused
      await expect(
        testSuite.contracts.marketplace.connect(testSuite.accounts.seller).createListing(
          ethers.constants.AddressZero,
          0,
          parseEther("1"),
          1,
          0,
          0
        )
      ).to.be.revertedWith("Pausable: paused");
      
      // Unpause and verify operations resume
      await testSuite.contracts.marketplace.unpause();
      
      await expect(
        testSuite.contracts.marketplace.connect(testSuite.accounts.seller).createListing(
          ethers.constants.AddressZero,
          0,
          parseEther("1"),
          1,
          0,
          0
        )
      ).to.emit(testSuite.contracts.marketplace, "ListingCreated");
    });

    it("Should handle timeout scenarios in escrow", async function () {
      const price = parseEther("1");
      const shortTimeout = 1; // 1 second
      
      // Create escrow with short timeout
      const escrowTx = await testSuite.contracts.enhancedEscrow.connect(testSuite.accounts.buyer).createEscrow(
        testSuite.accounts.seller.address,
        ethers.constants.AddressZero,
        price,
        shortTimeout,
        { value: price }
      );
      const escrowReceipt = await escrowTx.wait();
      const escrowId = escrowReceipt.events?.[0]?.args?.escrowId;
      
      // Fast forward time past timeout
      await time.increase(shortTimeout + 1);
      
      // Verify timeout refund is available
      await expect(
        testSuite.contracts.enhancedEscrow.connect(testSuite.accounts.buyer).refundAfterTimeout(escrowId)
      ).to.emit(testSuite.contracts.enhancedEscrow, "EscrowRefunded");
    });
  });
});