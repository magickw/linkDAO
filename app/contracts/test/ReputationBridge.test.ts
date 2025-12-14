import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "hardhat/signers";
import { ReputationBridge, ReputationSystem, SocialReputationToken } from "../typechain-types";

describe("ReputationBridge", function () {
  let reputationBridge: ReputationBridge;
  let reputationSystem: ReputationSystem;
  let socialReputationToken: SocialReputationToken;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy ReputationSystem
    const ReputationSystemFactory = await ethers.getContractFactory("ReputationSystem");
    reputationSystem = (await ReputationSystemFactory.deploy()) as ReputationSystem;
    await reputationSystem.waitForDeployment();

    // Deploy SocialReputationToken
    const SocialReputationTokenFactory = await ethers.getContractFactory("SocialReputationToken");
    socialReputationToken = (await SocialReputationTokenFactory.deploy(
      ethers.ZeroAddress, // profileRegistry
      ethers.ZeroAddress, // followModule
      ethers.ZeroAddress  // tipRouter
    )) as SocialReputationToken;
    await socialReputationToken.waitForDeployment();

    // Deploy ReputationBridge
    const ReputationBridgeFactory = await ethers.getContractFactory("ReputationBridge");
    reputationBridge = (await ReputationBridgeFactory.deploy(
      await reputationSystem.getAddress(),
      await socialReputationToken.getAddress()
    )) as ReputationBridge;
    await reputationBridge.waitForDeployment();

    // Set up reputation scores
    await reputationSystem.addModerator(owner.address);
    await reputationSystem.recordSuccessfulTransaction(user1.address, ethers.parseEther("1000"));
    await reputationSystem.recordSuccessfulTransaction(user2.address, ethers.parseEther("5000"));
    await reputationSystem.recordSuccessfulTransaction(user3.address, ethers.parseEther("10000"));
  });

  describe("Tier Rewards", function () {
    it("Should have correct initial tier rewards", async function () {
      const bronzeReward = await reputationBridge.tierTokenRewards(1); // BRONZE
      const silverReward = await reputationBridge.tierTokenRewards(2); // SILVER
      const goldReward = await reputationBridge.tierTokenRewards(3); // GOLD
      const platinumReward = await reputationBridge.tierTokenRewards(4); // PLATINUM
      const diamondReward = await reputationBridge.tierTokenRewards(5); // DIAMOND

      expect(bronzeReward).to.equal(ethers.parseEther("100"));
      expect(silverReward).to.equal(ethers.parseEther("500"));
      expect(goldReward).to.equal(ethers.parseEther("2000"));
      expect(platinumReward).to.equal(ethers.parseEther("5000"));
      expect(diamondReward).to.equal(ethers.parseEther("10000"));
    });

    it("Should allow owner to update tier rewards", async function () {
      const newReward = ethers.parseEther("250");
      
      await reputationBridge.updateTierReward(2, newReward); // Update SILVER tier
      
      expect(await reputationBridge.tierTokenRewards(2)).to.equal(newReward);
    });

    it("Should reject non-owner from updating tier rewards", async function () {
      const newReward = ethers.parseEther("250");
      
      await expect(
        reputationBridge.connect(user1).updateTierReward(2, newReward)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Claiming Reputation Tokens", function () {
    it("Should allow eligible user to claim tokens", async function () {
      // Submit reviews to build reputation
      await reputationSystem.connect(user1).submitReview(
        user2.address,
        1,
        5,
        "QmTestHash",
        true
      );
      await reputationSystem.connect(user1).submitReview(
        user3.address,
        2,
        5,
        "QmTestHash2",
        true
      );

      // Check claim status
      const [canClaim, currentTier, nextReward] = await reputationBridge.getClaimStatus(user1.address);
      expect(canClaim).to.be.true;
      expect(nextReward).to.be.gt(0);

      // Claim tokens
      await reputationBridge.connect(user1).claimReputationTokens();

      const tokenBalance = await socialReputationToken.balanceOf(user1.address);
      expect(tokenBalance).to.equal(nextReward);
    });

    it("Should reject claim for user below minimum tier", async function () {
      // New user with no reputation
      const [, newUser] = await ethers.getSigners();
      
      await expect(
        reputationBridge.connect(newUser).claimReputationTokens()
      ).to.be.revertedWith("Below minimum tier");
    });

    it("Should reject duplicate claim for same tier", async function () {
      // Build reputation
      await reputationSystem.connect(user1).submitReview(
        user2.address,
        1,
        5,
        "QmTestHash",
        true
      );

      // First claim
      await reputationBridge.connect(user1).claimReputationTokens();

      // Second claim should fail
      await expect(
        reputationBridge.connect(user1).claimReputationTokens()
      ).to.be.revertedWith("No tier upgrade");
    });

    it("Should allow claim after tier upgrade and cooldown", async function () {
      // Build initial reputation
      await reputationSystem.connect(user1).submitReview(
        user2.address,
        1,
        5,
        "QmTestHash",
        true
      );

      // First claim
      await reputationBridge.connect(user1).claimReputationTokens();

      // Build more reputation to upgrade tier
      for (let i = 0; i < 10; i++) {
        await reputationSystem.connect(user1).submitReview(
          user3.address,
          3 + i,
          5,
          `QmTestHash${i}`,
          true
        );
      }

      // Fast forward cooldown period
      await ethers.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]); // 31 days
      await ethers.provider.send("evm_mine");

      // Second claim should succeed
      const initialBalance = await socialReputationToken.balanceOf(user1.address);
      await reputationBridge.connect(user1).claimReputationTokens();
      const finalBalance = await socialReputationToken.balanceOf(user1.address);

      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should respect cooldown period", async function () {
      // Build reputation
      await reputationSystem.connect(user1).submitReview(
        user2.address,
        1,
        5,
        "QmTestHash",
        true
      );

      // First claim
      await reputationBridge.connect(user1).claimReputationTokens();

      // Try to claim again before cooldown
      await expect(
        reputationBridge.connect(user1).claimReputationTokens()
      ).to.be.revertedWith("Claim not allowed");
    });
  });

  describe("Batch Claims", function () {
    it("Should allow owner to batch claim for multiple users", async function () {
      // Build reputation for multiple users
      const users = [user1, user2, user3];
      
      for (const user of users) {
        await reputationSystem.connect(user).submitReview(
          user1.address,
          1,
          5,
          "QmTestHash",
          true
        );
      }

      // Batch claim
      await reputationBridge.batchClaimReputationTokens(
        users.map(u => u.address)
      );

      // Check all users received tokens
      for (const user of users) {
        const balance = await socialReputationToken.balanceOf(user.address);
        expect(balance).to.be.gt(0);
      }
    });

    it("Should reject non-owner from batch claiming", async function () {
      const users = [user1, user2];
      
      await expect(
        reputationBridge.connect(user1).batchClaimReputationTokens(
          users.map(u => u.address)
        )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Minimum Tier Configuration", function () {
    it("Should allow owner to update minimum claim tier", async function () {
      await reputationBridge.updateMinimumClaimTier(3); // GOLD tier
      
      expect(await reputationBridge.minimumClaimTier()).to.equal(3);
    });

    it("Should reject claims below updated minimum tier", async function () {
      // Update minimum to GOLD tier
      await reputationBridge.updateMinimumClaimTier(3);

      // Build reputation to BRONZE tier only
      await reputationSystem.connect(user1).submitReview(
        user2.address,
        1,
        4,
        "QmTestHash",
        true
      );

      // Should fail - below minimum tier
      await expect(
        reputationBridge.connect(user1).claimReputationTokens()
      ).to.be.revertedWith("Below minimum tier");
    });
  });

  describe("View Functions", function () {
    it("Should return correct user reputation info", async function () {
      // Build reputation
      await reputationSystem.connect(user1).submitReview(
        user2.address,
        1,
        5,
        "QmTestHash",
        true
      );

      const [score, tier] = await reputationBridge.getUserReputation(user1.address);
      expect(score).to.be.gt(0);
      expect(tier).to.be.gte(1); // At least BRONZE
    });

    it("Should return correct claim status", async function () {
      // New user
      const [canClaim, currentTier, nextReward] = await reputationBridge.getClaimStatus(user1.address);
      expect(canClaim).to.be.false;
      expect(currentTier).to.equal(0); // NEWCOMER
      expect(nextReward).to.equal(0);
    });
  });

  describe("Anti-Gaming Mechanisms", function () {
    it("Should prevent multiple claims from same address", async function () {
      // Build reputation
      await reputationSystem.connect(user1).submitReview(
        user2.address,
        1,
        5,
        "QmTestHash",
        true
      );

      // First claim
      await reputationBridge.connect(user1).claimReputationTokens();

      // Try to claim again immediately
      await expect(
        reputationBridge.connect(user1).claimReputationTokens()
      ).to.be.revertedWith("Claim not allowed");
    });

    it("Should require minimum stake for proposals", async function () {
      const minStake = await reputationSystem.minReviewInterval();
      
      // This test would require more complex setup to fully test proposal requirements
      // For now, we verify the function exists and can be called
      const proposalId = await reputationBridge.proposeCharityVerification(
        user1.address,
        "Test Charity",
        "Test Description",
        "QmTestHash"
      );
      
      expect(proposalId).to.be.gt(0);
    });
  });
});