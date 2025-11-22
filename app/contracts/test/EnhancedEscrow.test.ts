import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { EnhancedEscrow, LDAOToken, Governance, MockERC20 } from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("EnhancedEscrow", function () {
  let enhancedEscrow: EnhancedEscrow;
  let ldaoToken: LDAOToken;
  let governance: Governance;
  let mockToken: MockERC20;
  let owner: SignerWithAddress;
  let buyer: SignerWithAddress;
  let seller: SignerWithAddress;
  let arbitrator: SignerWithAddress;
  let voter1: SignerWithAddress;
  let voter2: SignerWithAddress;

  const LISTING_ID = 1;
  const ESCROW_AMOUNT = ethers.parseEther("1");
  const HIGH_VALUE_AMOUNT = ethers.parseEther("15000"); // Above threshold
  const PLATFORM_FEE = 100; // 1%

  beforeEach(async function () {
    [owner, buyer, seller, arbitrator, voter1, voter2] = await ethers.getSigners();

    // Deploy LDAOToken
    const LDAOTokenFactory = await ethers.getContractFactory("LDAOToken");
    ldaoToken = await LDAOTokenFactory.deploy(owner.address);
    await ldaoToken.deployed();

    // Deploy Governance
    const GovernanceFactory = await ethers.getContractFactory("Governance");
    governance = await GovernanceFactory.deploy(ldaoToken.address);
    await governance.deployed();

    // Deploy EnhancedEscrow
    const EnhancedEscrowFactory = await ethers.getContractFactory("EnhancedEscrow");
    enhancedEscrow = await EnhancedEscrowFactory.deploy(governance.address);
    await enhancedEscrow.deployed();

    // Deploy MockERC20 for testing
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20Factory.deploy("Test Token", "TEST", 18);
    await mockToken.deployed();

    // Setup initial balances and approvals
    await mockToken.mint(buyer.address, ethers.parseEther("100000"));
    await mockToken.connect(buyer).approve(enhancedEscrow.address, ethers.parseEther("100000"));

    // Set initial reputation scores for testing
    await enhancedEscrow.connect(owner).updateReputationForTesting(voter1.address, 100, "Initial reputation");
    await enhancedEscrow.connect(owner).updateReputationForTesting(voter2.address, 150, "Initial reputation");
  });

  describe("Escrow Creation", function () {
    it("Should create a regular escrow for normal amounts", async function () {
      const tx = await enhancedEscrow.createEscrow(
        LISTING_ID,
        buyer.address,
        seller.address,
        ethers.constants.AddressZero, // ETH
        ESCROW_AMOUNT
      );

      await expect(tx)
        .to.emit(enhancedEscrow, "EscrowCreated")
        .withArgs(1, LISTING_ID, buyer.address, seller.address, ethers.constants.AddressZero, ESCROW_AMOUNT);

      const escrow = await enhancedEscrow.escrows(1);
      expect(escrow.requiresMultiSig).to.be.false;
      expect(escrow.emergencyRefundEnabled).to.be.true;
    });

    it("Should create a multi-sig escrow for high-value amounts", async function () {
      await enhancedEscrow.createEscrow(
        LISTING_ID,
        buyer.address,
        seller.address,
        ethers.constants.AddressZero,
        HIGH_VALUE_AMOUNT
      );

      const escrow = await enhancedEscrow.escrows(1);
      expect(escrow.requiresMultiSig).to.be.true;
      expect(escrow.multiSigThreshold).to.equal(2);
    });

    it("Should calculate platform fee correctly", async function () {
      await enhancedEscrow.createEscrow(
        LISTING_ID,
        buyer.address,
        seller.address,
        ethers.constants.AddressZero,
        ESCROW_AMOUNT
      );

      const escrow = await enhancedEscrow.escrows(1);
      const expectedFee = ESCROW_AMOUNT.mul(PLATFORM_FEE).div(10000);
      expect(escrow.feeAmount).to.equal(expectedFee);
    });
  });

  describe("Fund Locking", function () {
    beforeEach(async function () {
      await enhancedEscrow.createEscrow(
        LISTING_ID,
        buyer.address,
        seller.address,
        ethers.constants.AddressZero,
        ESCROW_AMOUNT
      );
    });

    it("Should lock ETH funds correctly", async function () {
      const tx = await enhancedEscrow.connect(buyer).lockFunds(1, { value: ESCROW_AMOUNT });

      await expect(tx)
        .to.emit(enhancedEscrow, "FundsLocked")
        .withArgs(1, ESCROW_AMOUNT);

      const escrow = await enhancedEscrow.escrows(1);
      expect(escrow.status).to.equal(1); // FUNDS_LOCKED
    });

    it("Should lock ERC20 funds correctly", async function () {
      // Create ERC20 escrow
      await enhancedEscrow.createEscrow(
        LISTING_ID + 1,
        buyer.address,
        seller.address,
        mockToken.address,
        ESCROW_AMOUNT
      );

      const tx = await enhancedEscrow.connect(buyer).lockFunds(2);

      await expect(tx)
        .to.emit(enhancedEscrow, "FundsLocked")
        .withArgs(2, ESCROW_AMOUNT);

      const escrow = await enhancedEscrow.escrows(2);
      expect(escrow.status).to.equal(1); // FUNDS_LOCKED
    });

    it("Should revert with incorrect ETH amount", async function () {
      await expect(
        enhancedEscrow.connect(buyer).lockFunds(1, { value: ESCROW_AMOUNT.div(2) })
      ).to.be.revertedWith("Incorrect ETH amount");
    });
  });

  describe("Delivery Confirmation", function () {
    beforeEach(async function () {
      await enhancedEscrow.createEscrow(
        LISTING_ID,
        buyer.address,
        seller.address,
        ethers.constants.AddressZero,
        ESCROW_AMOUNT
      );
      await enhancedEscrow.connect(buyer).lockFunds(1, { value: ESCROW_AMOUNT });
    });

    it("Should allow seller to confirm delivery", async function () {
      const deliveryInfo = "Tracking: 123456789";
      const tx = await enhancedEscrow.connect(seller).confirmDelivery(1, deliveryInfo);

      await expect(tx)
        .to.emit(enhancedEscrow, "DeliveryConfirmed")
        .withArgs(1, deliveryInfo);

      const escrow = await enhancedEscrow.escrows(1);
      expect(escrow.status).to.equal(2); // DELIVERY_CONFIRMED
      expect(escrow.deliveryInfo).to.equal(deliveryInfo);
    });

    it("Should revert if not seller", async function () {
      await expect(
        enhancedEscrow.connect(buyer).confirmDelivery(1, "Tracking: 123456789")
      ).to.be.revertedWith("Not the seller");
    });

    it("Should revert if funds not locked", async function () {
      await enhancedEscrow.createEscrow(
        LISTING_ID + 1,
        buyer.address,
        seller.address,
        ethers.constants.AddressZero,
        ESCROW_AMOUNT
      );

      await expect(
        enhancedEscrow.connect(seller).confirmDelivery(2, "Tracking: 123456789")
      ).to.be.revertedWith("Funds not locked");
    });
  });

  describe("Regular Escrow Approval", function () {
    beforeEach(async function () {
      await enhancedEscrow.createEscrow(
        LISTING_ID,
        buyer.address,
        seller.address,
        ethers.constants.AddressZero,
        ESCROW_AMOUNT
      );
      await enhancedEscrow.connect(buyer).lockFunds(1, { value: ESCROW_AMOUNT });
      await enhancedEscrow.connect(seller).confirmDelivery(1, "Tracking: 123456789");
    });

    it("Should approve escrow and release funds for regular transactions", async function () {
      const sellerBalanceBefore = await seller.getBalance();
      const expectedFee = ESCROW_AMOUNT.mul(PLATFORM_FEE).div(10000);
      const expectedSellerAmount = ESCROW_AMOUNT.sub(expectedFee);

      const tx = await enhancedEscrow.connect(buyer).approveEscrow(1);

      await expect(tx)
        .to.emit(enhancedEscrow, "EscrowApproved")
        .withArgs(1, buyer.address);

      await expect(tx)
        .to.emit(enhancedEscrow, "EscrowResolved")
        .withArgs(1, 5, buyer.address); // RESOLVED_SELLER_WINS

      const escrow = await enhancedEscrow.escrows(1);
      expect(escrow.status).to.equal(5); // RESOLVED_SELLER_WINS

      // Check seller received correct amount (minus gas costs for the transaction)
      const sellerBalanceAfter = await seller.getBalance();
      expect(sellerBalanceAfter.sub(sellerBalanceBefore)).to.equal(expectedSellerAmount);
    });

    it("Should update reputation scores on successful transaction", async function () {
      const sellerRepBefore = await enhancedEscrow.reputationScores(seller.address);
      const buyerRepBefore = await enhancedEscrow.reputationScores(buyer.address);

      await enhancedEscrow.connect(buyer).approveEscrow(1);

      const sellerRepAfter = await enhancedEscrow.reputationScores(seller.address);
      const buyerRepAfter = await enhancedEscrow.reputationScores(buyer.address);

      expect(sellerRepAfter).to.equal(sellerRepBefore.add(5));
      expect(buyerRepAfter).to.equal(buyerRepBefore.add(2));
    });
  });

  describe("Multi-Signature Escrow", function () {
    beforeEach(async function () {
      await enhancedEscrow.createEscrow(
        LISTING_ID,
        buyer.address,
        seller.address,
        ethers.constants.AddressZero,
        HIGH_VALUE_AMOUNT
      );
      await enhancedEscrow.connect(buyer).lockFunds(1, { value: HIGH_VALUE_AMOUNT });
      await enhancedEscrow.connect(seller).confirmDelivery(1, "Tracking: 123456789");
    });

    it("Should initiate multi-sig process for high-value transactions", async function () {
      const tx = await enhancedEscrow.connect(buyer).approveEscrow(1);

      await expect(tx)
        .to.emit(enhancedEscrow, "MultiSigReleaseInitiated")
        .withArgs(1, buyer.address, 1, 2);

      const escrow = await enhancedEscrow.escrows(1);
      expect(escrow.signatureCount).to.equal(1);
      expect(escrow.hasSignedRelease[buyer.address]).to.be.true;
    });

    it("Should complete multi-sig release when threshold is met", async function () {
      // Buyer approves first
      await enhancedEscrow.connect(buyer).approveEscrow(1);

      // Seller signs to complete multi-sig
      const tx = await enhancedEscrow.connect(seller).signMultiSigRelease(1);

      await expect(tx)
        .to.emit(enhancedEscrow, "MultiSigReleaseInitiated")
        .withArgs(1, seller.address, 2, 2);

      await expect(tx)
        .to.emit(enhancedEscrow, "EscrowResolved")
        .withArgs(1, 5, seller.address); // RESOLVED_SELLER_WINS

      const escrow = await enhancedEscrow.escrows(1);
      expect(escrow.status).to.equal(5); // RESOLVED_SELLER_WINS
      expect(escrow.signatureCount).to.equal(2);
    });

    it("Should revert if trying to sign twice", async function () {
      await enhancedEscrow.connect(buyer).approveEscrow(1);

      await expect(
        enhancedEscrow.connect(buyer).signMultiSigRelease(1)
      ).to.be.revertedWith("Already signed");
    });

    it("Should revert if unauthorized user tries to sign", async function () {
      await enhancedEscrow.connect(buyer).approveEscrow(1);

      await expect(
        enhancedEscrow.connect(arbitrator).signMultiSigRelease(1)
      ).to.be.revertedWith("Not authorized to sign");
    });
  });

  describe("Time Lock Functionality", function () {
    beforeEach(async function () {
      await enhancedEscrow.createEscrow(
        LISTING_ID,
        buyer.address,
        seller.address,
        ethers.constants.AddressZero,
        HIGH_VALUE_AMOUNT
      );
      await enhancedEscrow.connect(buyer).lockFunds(1, { value: HIGH_VALUE_AMOUNT });
      await enhancedEscrow.connect(seller).confirmDelivery(1, "Tracking: 123456789");
    });

    it("Should activate time lock for high-value transactions", async function () {
      const tx = await enhancedEscrow.connect(buyer).activateTimeLock(1);
      const blockTimestamp = await time.latest();
      const expectedUnlockTime = blockTimestamp + 24 * 60 * 60; // 24 hours

      await expect(tx)
        .to.emit(enhancedEscrow, "TimeLockActivated")
        .withArgs(1, expectedUnlockTime);

      const escrow = await enhancedEscrow.escrows(1);
      expect(escrow.timeLockExpiry).to.equal(expectedUnlockTime);
    });

    it("Should execute time-locked release after expiry", async function () {
      // Activate time lock
      await enhancedEscrow.connect(buyer).activateTimeLock(1);

      // Fast forward time by 25 hours
      await time.increase(25 * 60 * 60);

      const tx = await enhancedEscrow.executeTimeLockRelease(1);

      await expect(tx)
        .to.emit(enhancedEscrow, "EscrowResolved")
        .withArgs(1, 5, buyer.address); // RESOLVED_SELLER_WINS

      const escrow = await enhancedEscrow.escrows(1);
      expect(escrow.status).to.equal(5); // RESOLVED_SELLER_WINS
    });

    it("Should revert if time lock not expired", async function () {
      await enhancedEscrow.connect(buyer).activateTimeLock(1);

      await expect(
        enhancedEscrow.executeTimeLockRelease(1)
      ).to.be.revertedWith("Time lock not expired");
    });

    it("Should revert if time lock not activated", async function () {
      await expect(
        enhancedEscrow.executeTimeLockRelease(1)
      ).to.be.revertedWith("Time lock not activated");
    });
  });

  describe("Emergency Refund", function () {
    beforeEach(async function () {
      await enhancedEscrow.createEscrow(
        LISTING_ID,
        buyer.address,
        seller.address,
        ethers.constants.AddressZero,
        ESCROW_AMOUNT
      );
      await enhancedEscrow.connect(buyer).lockFunds(1, { value: ESCROW_AMOUNT });
    });

    it("Should execute emergency refund within window", async function () {
      const buyerBalanceBefore = await buyer.getBalance();

      const tx = await enhancedEscrow.connect(owner).executeEmergencyRefund(1);

      await expect(tx)
        .to.emit(enhancedEscrow, "EmergencyRefundExecuted")
        .withArgs(1, buyer.address, ESCROW_AMOUNT);

      const escrow = await enhancedEscrow.escrows(1);
      expect(escrow.status).to.equal(4); // RESOLVED_BUYER_WINS

      const buyerBalanceAfter = await buyer.getBalance();
      expect(buyerBalanceAfter.sub(buyerBalanceBefore)).to.equal(ESCROW_AMOUNT);
    });

    it("Should revert if emergency refund window expired", async function () {
      // Fast forward time by 8 days (beyond 7-day window)
      await time.increase(8 * 24 * 60 * 60);

      await expect(
        enhancedEscrow.connect(owner).executeEmergencyRefund(1)
      ).to.be.revertedWith("Emergency refund window expired");
    });

    it("Should revert if not DAO", async function () {
      await expect(
        enhancedEscrow.connect(buyer).executeEmergencyRefund(1)
      ).to.be.revertedWith("Not DAO");
    });
  });

  describe("Dispute Resolution", function () {
    beforeEach(async function () {
      await enhancedEscrow.createEscrow(
        LISTING_ID,
        buyer.address,
        seller.address,
        ethers.constants.AddressZero,
        ESCROW_AMOUNT
      );
      await enhancedEscrow.connect(buyer).lockFunds(1, { value: ESCROW_AMOUNT });
      await enhancedEscrow.connect(seller).confirmDelivery(1, "Tracking: 123456789");
    });

    it("Should open dispute", async function () {
      const reason = "Item not as described";
      const tx = await enhancedEscrow.connect(buyer).openDispute(1, reason);

      await expect(tx)
        .to.emit(enhancedEscrow, "DisputeOpened")
        .withArgs(1, buyer.address, reason);

      const escrow = await enhancedEscrow.escrows(1);
      expect(escrow.status).to.equal(3); // DISPUTE_OPENED
    });

    it("Should submit evidence", async function () {
      await enhancedEscrow.connect(buyer).openDispute(1, "Item not as described");

      const evidence = "QmHash123...";
      const tx = await enhancedEscrow.connect(buyer).submitEvidence(1, evidence);

      await expect(tx)
        .to.emit(enhancedEscrow, "EvidenceSubmitted")
        .withArgs(1, buyer.address, evidence);

      const escrow = await enhancedEscrow.escrows(1);
      expect(escrow.evidenceSubmitted).to.equal(evidence);
    });

    it("Should cast vote in community dispute resolution", async function () {
      await enhancedEscrow.connect(buyer).openDispute(1, "Item not as described");

      const tx = await enhancedEscrow.connect(voter1).castVote(1, true); // Vote for buyer

      await expect(tx)
        .to.emit(enhancedEscrow, "VoteCast")
        .withArgs(1, voter1.address, true, 100); // voter1 has 100 reputation

      const escrow = await enhancedEscrow.escrows(1);
      expect(escrow.votesForBuyer).to.equal(100);
      expect(escrow.hasVoted[voter1.address]).to.be.true;
    });

    it("Should resolve dispute by community voting", async function () {
      await enhancedEscrow.connect(buyer).openDispute(1, "Item not as described");

      // Cast votes (need enough voting power to reach quorum)
      await enhancedEscrow.connect(voter1).castVote(1, true); // 100 votes for buyer
      await enhancedEscrow.connect(voter2).castVote(1, false); // 150 votes for seller

      const escrow = await enhancedEscrow.escrows(1);
      expect(escrow.status).to.equal(5); // RESOLVED_SELLER_WINS (seller got more votes)
    });

    it("Should revert if trying to vote twice", async function () {
      await enhancedEscrow.connect(buyer).openDispute(1, "Item not as described");
      await enhancedEscrow.connect(voter1).castVote(1, true);

      await expect(
        enhancedEscrow.connect(voter1).castVote(1, false)
      ).to.be.revertedWith("Already voted");
    });
  });

  describe("Configuration Management", function () {
    it("Should set platform fee", async function () {
      await enhancedEscrow.connect(owner).setPlatformFee(200); // 2%
      expect(await enhancedEscrow.platformFee()).to.equal(200);
    });

    it("Should revert if fee too high", async function () {
      await expect(
        enhancedEscrow.connect(owner).setPlatformFee(1100) // 11%
      ).to.be.revertedWith("Fee too high (max 10%)");
    });

    it("Should set high-value threshold", async function () {
      const newThreshold = ethers.parseEther("20000");
      await enhancedEscrow.connect(owner).setHighValueThreshold(newThreshold);
      expect(await enhancedEscrow.highValueThreshold()).to.equal(newThreshold);
    });

    it("Should set time lock duration", async function () {
      const newDuration = 48 * 60 * 60; // 48 hours
      await enhancedEscrow.connect(owner).setTimeLockDuration(newDuration);
      expect(await enhancedEscrow.timeLockDuration()).to.equal(newDuration);
    });

    it("Should revert if time lock duration invalid", async function () {
      await expect(
        enhancedEscrow.connect(owner).setTimeLockDuration(30 * 60) // 30 minutes (too short)
      ).to.be.revertedWith("Invalid duration");
    });

    it("Should set emergency refund window", async function () {
      const newWindow = 14 * 24 * 60 * 60; // 14 days
      await enhancedEscrow.connect(owner).setEmergencyRefundWindow(newWindow);
      expect(await enhancedEscrow.emergencyRefundWindow()).to.equal(newWindow);
    });

    it("Should revert if emergency refund window invalid", async function () {
      await expect(
        enhancedEscrow.connect(owner).setEmergencyRefundWindow(12 * 60 * 60) // 12 hours (too short)
      ).to.be.revertedWith("Invalid window");
    });
  });

  describe("Access Control", function () {
    it("Should revert if non-DAO tries to set configuration", async function () {
      await expect(
        enhancedEscrow.connect(buyer).setPlatformFee(200)
      ).to.be.revertedWith("Not DAO");
    });

    it("Should revert if non-buyer tries to approve escrow", async function () {
      await enhancedEscrow.createEscrow(
        LISTING_ID,
        buyer.address,
        seller.address,
        ethers.constants.AddressZero,
        ESCROW_AMOUNT
      );
      await enhancedEscrow.connect(buyer).lockFunds(1, { value: ESCROW_AMOUNT });
      await enhancedEscrow.connect(seller).confirmDelivery(1, "Tracking: 123456789");

      await expect(
        enhancedEscrow.connect(seller).approveEscrow(1)
      ).to.be.revertedWith("Not the buyer");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero reputation voters", async function () {
      await enhancedEscrow.createEscrow(
        LISTING_ID,
        buyer.address,
        seller.address,
        ethers.constants.AddressZero,
        ESCROW_AMOUNT
      );
      await enhancedEscrow.connect(buyer).lockFunds(1, { value: ESCROW_AMOUNT });
      await enhancedEscrow.connect(seller).confirmDelivery(1, "Tracking: 123456789");
      await enhancedEscrow.connect(buyer).openDispute(1, "Item not as described");

      await expect(
        enhancedEscrow.connect(arbitrator).castVote(1, true) // arbitrator has 0 reputation
      ).to.be.revertedWith("No voting power");
    });

    it("Should handle escrow that doesn't exist", async function () {
      await expect(
        enhancedEscrow.connect(buyer).lockFunds(999)
      ).to.be.revertedWith("Escrow does not exist");
    });

    it("Should handle reputation score underflow", async function () {
      // This tests the internal _updateReputation function's handling of negative scores
      await enhancedEscrow.createEscrow(
        LISTING_ID,
        buyer.address,
        seller.address,
        ethers.constants.AddressZero,
        ESCROW_AMOUNT
      );
      await enhancedEscrow.connect(buyer).lockFunds(1, { value: ESCROW_AMOUNT });
      await enhancedEscrow.connect(seller).confirmDelivery(1, "Tracking: 123456789");
      await enhancedEscrow.connect(buyer).openDispute(1, "Item not as described");

      // Cast votes to resolve dispute in favor of buyer (seller loses reputation)
      await enhancedEscrow.connect(voter1).castVote(1, true); // 100 votes for buyer
      await enhancedEscrow.connect(voter2).castVote(1, true); // 150 votes for buyer

      // Seller should have lost reputation but not go below 0
      const sellerRep = await enhancedEscrow.reputationScores(seller.address);
      expect(sellerRep).to.equal(0); // Should be 0, not negative
    });
  });
});