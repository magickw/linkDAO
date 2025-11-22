import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { EnhancedEscrow, LDAOToken, Governance } from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Enhanced Reputation System", function () {
  let enhancedEscrow: EnhancedEscrow;
  let ldaoToken: LDAOToken;
  let governance: Governance;
  let owner: SignerWithAddress;
  let buyer: SignerWithAddress;
  let seller: SignerWithAddress;
  let reviewer1: SignerWithAddress;
  let reviewer2: SignerWithAddress;

  const LISTING_ID = 1;
  const ESCROW_AMOUNT = ethers.parseEther("1");

  beforeEach(async function () {
    [owner, buyer, seller, reviewer1, reviewer2] = await ethers.getSigners();

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
  });

  describe("Marketplace Review System", function () {
    beforeEach(async function () {
      // Create and complete an escrow for testing reviews
      await enhancedEscrow.createEscrow(
        LISTING_ID,
        buyer.address,
        seller.address,
        ethers.constants.AddressZero,
        ESCROW_AMOUNT
      );
      await enhancedEscrow.connect(buyer).lockFunds(1, { value: ESCROW_AMOUNT });
      await enhancedEscrow.connect(seller).confirmDelivery(1, "Tracking: 123456789");
      await enhancedEscrow.connect(buyer).approveEscrow(1);
    });

    it("Should allow buyer to review seller after escrow completion", async function () {
      const rating = 5;
      const reviewText = "Excellent seller, fast shipping!";

      const tx = await enhancedEscrow.connect(buyer).submitMarketplaceReview(
        1, // escrowId
        seller.address, // reviewee
        rating,
        reviewText
      );

      await expect(tx)
        .to.emit(enhancedEscrow, "MarketplaceReviewSubmitted")
        .withArgs(1, buyer.address, seller.address, 1, rating);

      // Check review was stored correctly
      const review = await enhancedEscrow.marketplaceReviews(1);
      expect(review.reviewer).to.equal(buyer.address);
      expect(review.reviewee).to.equal(seller.address);
      expect(review.rating).to.equal(rating);
      expect(review.reviewText).to.equal(reviewText);
      expect(review.isVerified).to.be.true;
    });

    it("Should allow seller to review buyer after escrow completion", async function () {
      const rating = 4;
      const reviewText = "Good buyer, paid promptly";

      await enhancedEscrow.connect(seller).submitMarketplaceReview(
        1, // escrowId
        buyer.address, // reviewee
        rating,
        reviewText
      );

      const review = await enhancedEscrow.marketplaceReviews(1);
      expect(review.reviewer).to.equal(seller.address);
      expect(review.reviewee).to.equal(buyer.address);
      expect(review.rating).to.equal(rating);
    });

    it("Should update reviewee's reputation based on review rating", async function () {
      const sellerRepBefore = await enhancedEscrow.getDetailedReputation(seller.address);
      
      await enhancedEscrow.connect(buyer).submitMarketplaceReview(
        1,
        seller.address,
        5, // 5-star rating should give 10 points
        "Excellent!"
      );

      const sellerRepAfter = await enhancedEscrow.getDetailedReputation(seller.address);
      expect(sellerRepAfter.totalPoints).to.be.gt(sellerRepBefore.totalPoints);
      expect(sellerRepAfter.reviewCount).to.equal(1);
      expect(sellerRepAfter.averageRating).to.equal(500); // 5.0 * 100
    });

    it("Should prevent duplicate reviews between same users", async function () {
      await enhancedEscrow.connect(buyer).submitMarketplaceReview(
        1,
        seller.address,
        5,
        "First review"
      );

      await expect(
        enhancedEscrow.connect(buyer).submitMarketplaceReview(
          1,
          seller.address,
          4,
          "Second review"
        )
      ).to.be.revertedWith("Already reviewed this user");
    });

    it("Should prevent self-reviews", async function () {
      await expect(
        enhancedEscrow.connect(buyer).submitMarketplaceReview(
          1,
          buyer.address, // Trying to review themselves
          5,
          "Self review"
        )
      ).to.be.revertedWith("Cannot review yourself");
    });

    it("Should prevent reviews on incomplete escrows", async function () {
      // Create a new escrow that's not completed
      await enhancedEscrow.createEscrow(
        LISTING_ID + 1,
        buyer.address,
        seller.address,
        ethers.constants.AddressZero,
        ESCROW_AMOUNT
      );

      await expect(
        enhancedEscrow.connect(buyer).submitMarketplaceReview(
          2, // New escrow ID
          seller.address,
          5,
          "Premature review"
        )
      ).to.be.revertedWith("Escrow not completed");
    });

    it("Should validate rating range", async function () {
      await expect(
        enhancedEscrow.connect(buyer).submitMarketplaceReview(
          1,
          seller.address,
          0, // Invalid rating
          "Invalid rating"
        )
      ).to.be.revertedWith("Rating must be between 1 and 5");

      await expect(
        enhancedEscrow.connect(buyer).submitMarketplaceReview(
          1,
          seller.address,
          6, // Invalid rating
          "Invalid rating"
        )
      ).to.be.revertedWith("Rating must be between 1 and 5");
    });
  });

  describe("Helpful Vote System", function () {
    beforeEach(async function () {
      // Create and complete escrow, then submit a review
      await enhancedEscrow.createEscrow(
        LISTING_ID,
        buyer.address,
        seller.address,
        ethers.constants.AddressZero,
        ESCROW_AMOUNT
      );
      await enhancedEscrow.connect(buyer).lockFunds(1, { value: ESCROW_AMOUNT });
      await enhancedEscrow.connect(seller).confirmDelivery(1, "Tracking: 123456789");
      await enhancedEscrow.connect(buyer).approveEscrow(1);
      
      await enhancedEscrow.connect(buyer).submitMarketplaceReview(
        1,
        seller.address,
        5,
        "Great seller!"
      );
    });

    it("Should allow users to cast helpful votes on reviews", async function () {
      const tx = await enhancedEscrow.connect(reviewer1).castHelpfulVote(1);

      await expect(tx)
        .to.emit(enhancedEscrow, "HelpfulVoteCast")
        .withArgs(1, reviewer1.address);

      const review = await enhancedEscrow.marketplaceReviews(1);
      expect(review.helpfulVotes).to.equal(1);
    });

    it("Should prevent duplicate helpful votes", async function () {
      await enhancedEscrow.connect(reviewer1).castHelpfulVote(1);

      await expect(
        enhancedEscrow.connect(reviewer1).castHelpfulVote(1)
      ).to.be.revertedWith("Already voted on this review");
    });

    it("Should prevent reviewers from voting on their own reviews", async function () {
      await expect(
        enhancedEscrow.connect(buyer).castHelpfulVote(1) // Buyer trying to vote on their own review
      ).to.be.revertedWith("Cannot vote on own review");
    });

    it("Should award reputation points to reviewer for helpful votes", async function () {
      const reviewerRepBefore = await enhancedEscrow.getDetailedReputation(buyer.address);
      
      await enhancedEscrow.connect(reviewer1).castHelpfulVote(1);
      
      const reviewerRepAfter = await enhancedEscrow.getDetailedReputation(buyer.address);
      expect(reviewerRepAfter.totalPoints).to.be.gt(reviewerRepBefore.totalPoints);
    });
  });

  describe("Reputation Tier System", function () {
    it("Should start users at NEWCOMER tier", async function () {
      const tier = await enhancedEscrow.getReputationTier(buyer.address);
      expect(tier).to.equal(0); // NEWCOMER
    });

    it("Should upgrade tier when reaching thresholds", async function () {
      // Give user enough points for BRONZE tier (50 points)
      await enhancedEscrow.connect(owner).updateReputationForTesting(
        buyer.address,
        50,
        "Testing tier upgrade"
      );

      const tier = await enhancedEscrow.getReputationTier(buyer.address);
      expect(tier).to.equal(1); // BRONZE
    });

    it("Should emit tier update events", async function () {
      const tx = await enhancedEscrow.connect(owner).updateReputationForTesting(
        buyer.address,
        50,
        "Testing tier upgrade"
      );

      await expect(tx)
        .to.emit(enhancedEscrow, "ReputationTierUpdated")
        .withArgs(buyer.address, 0, 1); // NEWCOMER to BRONZE
    });

    it("Should calculate correct tiers for all thresholds", async function () {
      const testCases = [
        { points: 0, expectedTier: 0 },    // NEWCOMER
        { points: 50, expectedTier: 1 },   // BRONZE
        { points: 200, expectedTier: 2 },  // SILVER
        { points: 500, expectedTier: 3 },  // GOLD
        { points: 1000, expectedTier: 4 }, // PLATINUM
        { points: 2500, expectedTier: 5 }  // DIAMOND
      ];

      for (const testCase of testCases) {
        await enhancedEscrow.connect(owner).updateReputationForTesting(
          reviewer1.address,
          testCase.points,
          "Testing"
        );
        
        const tier = await enhancedEscrow.getReputationTier(reviewer1.address);
        expect(tier).to.equal(testCase.expectedTier);
        
        // Reset for next test
        await enhancedEscrow.connect(owner).updateReputationForTesting(
          reviewer1.address,
          -testCase.points,
          "Reset"
        );
      }
    });
  });

  describe("Weighted Score Calculation", function () {
    it("Should return 0 for users with no activity", async function () {
      const weightedScore = await enhancedEscrow.calculateWeightedScore(buyer.address);
      expect(weightedScore).to.equal(0);
    });

    it("Should calculate weighted score based on multiple factors", async function () {
      // Set up user with some reputation data
      await enhancedEscrow.connect(owner).updateReputationForTesting(
        seller.address,
        100,
        "Base reputation"
      );

      // Complete a transaction to add to success rate
      await enhancedEscrow.createEscrow(
        LISTING_ID,
        buyer.address,
        seller.address,
        ethers.constants.AddressZero,
        ESCROW_AMOUNT
      );
      await enhancedEscrow.connect(buyer).lockFunds(1, { value: ESCROW_AMOUNT });
      await enhancedEscrow.connect(seller).confirmDelivery(1, "Tracking: 123456789");
      await enhancedEscrow.connect(buyer).approveEscrow(1);

      const weightedScore = await enhancedEscrow.calculateWeightedScore(seller.address);
      expect(weightedScore).to.be.gt(0);
    });

    it("Should penalize users with suspicious activity", async function () {
      // Set up user with reputation
      await enhancedEscrow.connect(owner).updateReputationForTesting(
        seller.address,
        100,
        "Base reputation"
      );

      const scoreBefore = await enhancedEscrow.calculateWeightedScore(seller.address);

      // Simulate suspicious activity by directly updating the count
      // (In real scenario, this would be detected automatically)
      const detailedRep = await enhancedEscrow.getDetailedReputation(seller.address);
      
      // Add suspicious activity through rapid reputation changes
      for (let i = 0; i < 6; i++) {
        await enhancedEscrow.connect(owner).updateReputationForTesting(
          seller.address,
          1,
          "Rapid change"
        );
        await time.increase(30 * 60); // 30 minutes between changes
      }

      const scoreAfter = await enhancedEscrow.calculateWeightedScore(seller.address);
      expect(scoreAfter).to.be.lt(scoreBefore);
    });
  });

  describe("Anti-Gaming Mechanisms", function () {
    it("Should enforce minimum time between reviews", async function () {
      // Complete first escrow and review
      await enhancedEscrow.createEscrow(
        LISTING_ID,
        buyer.address,
        seller.address,
        ethers.constants.AddressZero,
        ESCROW_AMOUNT
      );
      await enhancedEscrow.connect(buyer).lockFunds(1, { value: ESCROW_AMOUNT });
      await enhancedEscrow.connect(seller).confirmDelivery(1, "Tracking: 123456789");
      await enhancedEscrow.connect(buyer).approveEscrow(1);
      
      await enhancedEscrow.connect(buyer).submitMarketplaceReview(
        1,
        seller.address,
        5,
        "First review"
      );

      // Try to submit another review too soon (with different seller)
      await enhancedEscrow.createEscrow(
        LISTING_ID + 1,
        buyer.address,
        reviewer1.address, // Different seller
        ethers.constants.AddressZero,
        ESCROW_AMOUNT
      );
      await enhancedEscrow.connect(buyer).lockFunds(2, { value: ESCROW_AMOUNT });
      await enhancedEscrow.connect(reviewer1).confirmDelivery(2, "Tracking: 987654321");
      await enhancedEscrow.connect(buyer).approveEscrow(2);

      await expect(
        enhancedEscrow.connect(buyer).submitMarketplaceReview(
          2,
          reviewer1.address,
          4,
          "Second review too soon"
        )
      ).to.be.revertedWith("Review submitted too soon");
    });

    it("Should detect and flag suspicious activity", async function () {
      // Rapid reputation changes should trigger suspicious activity detection
      for (let i = 0; i < 6; i++) {
        const tx = await enhancedEscrow.connect(owner).updateReputationForTesting(
          seller.address,
          10,
          "Rapid change"
        );

        if (i >= 4) { // After 5th change, should detect suspicious activity
          await expect(tx)
            .to.emit(enhancedEscrow, "SuspiciousActivityDetected")
            .withArgs(seller.address, "Rapid activity", i + 1);
        }
      }
    });

    it("Should auto-suspend users with excessive suspicious activity", async function () {
      // Trigger enough suspicious activity to cause auto-suspension
      for (let i = 0; i < 5; i++) {
        await enhancedEscrow.connect(owner).updateReputationForTesting(
          seller.address,
          1,
          "Suspicious change"
        );
      }

      const detailedRep = await enhancedEscrow.getDetailedReputation(seller.address);
      expect(detailedRep.isSuspended).to.be.true;
      expect(detailedRep.suspensionEndTime).to.be.gt(0);
    });
  });

  describe("User Suspension System", function () {
    it("Should allow DAO to suspend users", async function () {
      const suspensionDuration = 7 * 24 * 60 * 60; // 7 days
      const reason = "Violation of terms";

      const tx = await enhancedEscrow.connect(owner).suspendUser(
        seller.address,
        suspensionDuration,
        reason
      );

      await expect(tx)
        .to.emit(enhancedEscrow, "UserSuspended")
        .withArgs(seller.address, await time.latest() + suspensionDuration, reason);

      const detailedRep = await enhancedEscrow.getDetailedReputation(seller.address);
      expect(detailedRep.isSuspended).to.be.true;
    });

    it("Should prevent non-DAO from suspending users", async function () {
      await expect(
        enhancedEscrow.connect(buyer).suspendUser(
          seller.address,
          7 * 24 * 60 * 60,
          "Unauthorized suspension"
        )
      ).to.be.revertedWith("Not DAO");
    });
  });

  describe("Configuration Management", function () {
    it("Should allow DAO to update tier thresholds", async function () {
      const newThresholds: [number, number, number, number, number, number] = [0, 100, 300, 600, 1200, 3000];
      
      await enhancedEscrow.connect(owner).setTierThresholds(newThresholds);
      
      // Test that new thresholds are applied
      await enhancedEscrow.connect(owner).updateReputationForTesting(
        buyer.address,
        100,
        "Testing new thresholds"
      );
      
      const tier = await enhancedEscrow.getReputationTier(buyer.address);
      expect(tier).to.equal(1); // Should be BRONZE with new threshold
    });

    it("Should allow DAO to update anti-gaming parameters", async function () {
      const newMinTime = 2 * 60 * 60; // 2 hours
      await enhancedEscrow.connect(owner).setMinTimeBetweenReviews(newMinTime);
      
      const newThreshold = 10;
      await enhancedEscrow.connect(owner).setSuspiciousActivityThreshold(newThreshold);
      
      // These would be tested by checking the actual behavior changes
      // For brevity, just checking the functions don't revert
    });

    it("Should prevent non-DAO from updating configuration", async function () {
      const newThresholds: [number, number, number, number, number, number] = [0, 100, 300, 600, 1200, 3000];
      
      await expect(
        enhancedEscrow.connect(buyer).setTierThresholds(newThresholds)
      ).to.be.revertedWith("Not DAO");
    });
  });

  describe("Data Retrieval Functions", function () {
    beforeEach(async function () {
      // Set up some test data
      await enhancedEscrow.createEscrow(
        LISTING_ID,
        buyer.address,
        seller.address,
        ethers.constants.AddressZero,
        ESCROW_AMOUNT
      );
      await enhancedEscrow.connect(buyer).lockFunds(1, { value: ESCROW_AMOUNT });
      await enhancedEscrow.connect(seller).confirmDelivery(1, "Tracking: 123456789");
      await enhancedEscrow.connect(buyer).approveEscrow(1);
      
      await enhancedEscrow.connect(buyer).submitMarketplaceReview(
        1,
        seller.address,
        5,
        "Great seller!"
      );
    });

    it("Should return user's review history", async function () {
      const sellerReviews = await enhancedEscrow.getUserReviews(seller.address);
      expect(sellerReviews.length).to.equal(1);
      expect(sellerReviews[0]).to.equal(1); // Review ID
    });

    it("Should return detailed reputation information", async function () {
      const detailedRep = await enhancedEscrow.getDetailedReputation(seller.address);
      
      expect(detailedRep.reviewCount).to.equal(1);
      expect(detailedRep.averageRating).to.equal(500); // 5.0 * 100
      expect(detailedRep.successfulTransactions).to.be.gt(0);
      expect(detailedRep.tier).to.be.gte(0);
    });

    it("Should return empty data for users with no activity", async function () {
      const detailedRep = await enhancedEscrow.getDetailedReputation(reviewer1.address);
      
      expect(detailedRep.totalPoints).to.equal(0);
      expect(detailedRep.reviewCount).to.equal(0);
      expect(detailedRep.successfulTransactions).to.equal(0);
      expect(detailedRep.tier).to.equal(0); // NEWCOMER
    });
  });

  describe("Integration with Existing Escrow System", function () {
    it("Should maintain backward compatibility with legacy reputation functions", async function () {
      // Test that old reputation functions still work
      const oldRepBefore = await enhancedEscrow.reputationScores(seller.address);
      
      await enhancedEscrow.connect(owner).updateReputationForTesting(
        seller.address,
        50,
        "Legacy test"
      );
      
      const oldRepAfter = await enhancedEscrow.reputationScores(seller.address);
      expect(oldRepAfter).to.be.gt(oldRepBefore);
      
      // Check that detailed reputation was also updated
      const detailedRep = await enhancedEscrow.getDetailedReputation(seller.address);
      expect(detailedRep.totalPoints).to.equal(oldRepAfter);
    });

    it("Should update reputation correctly during escrow completion", async function () {
      const sellerRepBefore = await enhancedEscrow.getDetailedReputation(seller.address);
      const buyerRepBefore = await enhancedEscrow.getDetailedReputation(buyer.address);
      
      // Complete an escrow transaction
      await enhancedEscrow.createEscrow(
        LISTING_ID,
        buyer.address,
        seller.address,
        ethers.constants.AddressZero,
        ESCROW_AMOUNT
      );
      await enhancedEscrow.connect(buyer).lockFunds(1, { value: ESCROW_AMOUNT });
      await enhancedEscrow.connect(seller).confirmDelivery(1, "Tracking: 123456789");
      await enhancedEscrow.connect(buyer).approveEscrow(1);
      
      const sellerRepAfter = await enhancedEscrow.getDetailedReputation(seller.address);
      const buyerRepAfter = await enhancedEscrow.getDetailedReputation(buyer.address);
      
      expect(sellerRepAfter.totalPoints).to.be.gt(sellerRepBefore.totalPoints);
      expect(buyerRepAfter.totalPoints).to.be.gt(buyerRepBefore.totalPoints);
      expect(sellerRepAfter.successfulTransactions).to.be.gt(sellerRepBefore.successfulTransactions);
    });
  });
});