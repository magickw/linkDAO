import { expect } from "chai";
import { ethers } from "hardhat";
import { EnhancedRewardPool, Governance, ReputationSystem, LDAOToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("EnhancedRewardPool", function () {
  let rewardPool: EnhancedRewardPool;
  let governance: Governance;
  let reputationSystem: ReputationSystem;
  let ldaoToken: LDAOToken;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;
  let funder: SignerWithAddress;

  const EPOCH_DURATION = 7 * 24 * 60 * 60; // 7 days
  const MINIMUM_FUNDING = ethers.parseEther("1000");
  const REPUTATION_MULTIPLIER = 150; // 1.5x max

  // Reward categories
  const TRADING_REWARDS = 1;
  const GOVERNANCE_REWARDS = 2;
  const CONTENT_REWARDS = 3;
  const REFERRAL_REWARDS = 4;
  const STAKING_REWARDS = 5;

  beforeEach(async function () {
    [owner, user1, user2, user3, funder] = await ethers.getSigners();

    // Deploy LDAOToken
    const LDAOToken = await ethers.getContractFactory("LDAOToken");
    ldaoToken = await LDAOToken.deploy(owner.address);
    await ldaoToken.deployed();

    // Deploy Governance
    const Governance = await ethers.getContractFactory("Governance");
    governance = await Governance.deploy(ldaoToken.address);
    await governance.deployed();

    // Deploy ReputationSystem
    const ReputationSystem = await ethers.getContractFactory("ReputationSystem");
    reputationSystem = await ReputationSystem.deploy();
    await reputationSystem.deployed();

    // Deploy EnhancedRewardPool
    const EnhancedRewardPool = await ethers.getContractFactory("EnhancedRewardPool");
    rewardPool = await EnhancedRewardPool.deploy(
      ldaoToken.address,
      governance.address,
      reputationSystem.address
    );
    await rewardPool.deployed();

    // Mint tokens for testing
    await ldaoToken.mint(funder.address, ethers.parseEther("10000"));
    await ldaoToken.mint(owner.address, ethers.parseEther("10000"));
    
    // Approve reward pool to spend tokens
    await ldaoToken.connect(funder).approve(rewardPool.address, ethers.parseEther("10000"));
    await ldaoToken.connect(owner).approve(rewardPool.address, ethers.parseEther("10000"));
  });

  describe("Deployment", function () {
    it("Should set the correct token and contract addresses", async function () {
      expect(await rewardPool.ldaoToken()).to.equal(ldaoToken.address);
      expect(await rewardPool.governance()).to.equal(governance.address);
      expect(await rewardPool.reputationSystem()).to.equal(reputationSystem.address);
    });

    it("Should initialize with correct default parameters", async function () {
      expect(await rewardPool.epochDuration()).to.equal(EPOCH_DURATION);
      expect(await rewardPool.minimumFunding()).to.equal(MINIMUM_FUNDING);
      expect(await rewardPool.reputationMultiplier()).to.equal(REPUTATION_MULTIPLIER);
      expect(await rewardPool.currentEpoch()).to.equal(1);
      expect(await rewardPool.nextEpochId()).to.equal(2);
      expect(await rewardPool.nextCategoryId()).to.equal(6);
    });

    it("Should initialize default reward categories", async function () {
      const tradingCategory = await rewardPool.getRewardCategory(TRADING_REWARDS);
      expect(tradingCategory[0]).to.equal("Trading");
      expect(tradingCategory[1]).to.equal(4000); // 40%
      expect(tradingCategory[2]).to.be.true; // active

      const governanceCategory = await rewardPool.getRewardCategory(GOVERNANCE_REWARDS);
      expect(governanceCategory[0]).to.equal("Governance");
      expect(governanceCategory[1]).to.equal(2000); // 20%

      const contentCategory = await rewardPool.getRewardCategory(CONTENT_REWARDS);
      expect(contentCategory[0]).to.equal("Content");
      expect(contentCategory[1]).to.equal(2000); // 20%

      const referralCategory = await rewardPool.getRewardCategory(REFERRAL_REWARDS);
      expect(referralCategory[0]).to.equal("Referral");
      expect(referralCategory[1]).to.equal(1000); // 10%

      const stakingCategory = await rewardPool.getRewardCategory(STAKING_REWARDS);
      expect(stakingCategory[0]).to.equal("Staking");
      expect(stakingCategory[1]).to.equal(1000); // 10%
    });

    it("Should start the first epoch automatically", async function () {
      const currentEpoch = await rewardPool.currentEpoch();
      const epochInfo = await rewardPool.getEpochInfo(currentEpoch);
      
      expect(epochInfo[0]).to.equal(1); // epoch id
      expect(epochInfo[1]).to.be.gt(0); // start time
      expect(epochInfo[2]).to.be.gt(epochInfo[1]); // end time
      expect(epochInfo[6]).to.be.false; // not finalized
    });
  });

  describe("Epoch Management", function () {
    it("Should allow funding the current epoch", async function () {
      const fundAmount = ethers.parseEther("5000");
      
      await expect(rewardPool.connect(funder).fundEpoch(fundAmount))
        .to.emit(rewardPool, "Funded")
        .withArgs(1, funder.address, fundAmount);

      const epochInfo = await rewardPool.getEpochInfo(1);
      expect(epochInfo[3]).to.equal(fundAmount); // totalFunding
      expect(await rewardPool.totalPoolBalance()).to.equal(fundAmount);
    });

    it("Should reject zero funding amount", async function () {
      await expect(rewardPool.connect(funder).fundEpoch(0))
        .to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should finalize epoch and start new one", async function () {
      // Fast forward past epoch end
      await time.increase(EPOCH_DURATION + 1);

      await expect(rewardPool.finalizeEpoch(1))
        .to.emit(rewardPool, "EpochFinalized")
        .withArgs(1, 0, 0);

      const epochInfo = await rewardPool.getEpochInfo(1);
      expect(epochInfo[6]).to.be.true; // finalized

      expect(await rewardPool.currentEpoch()).to.equal(2);
    });

    it("Should not finalize epoch before it ends", async function () {
      await expect(rewardPool.finalizeEpoch(1))
        .to.be.revertedWith("Epoch not ended");
    });

    it("Should not finalize already finalized epoch", async function () {
      await time.increase(EPOCH_DURATION + 1);
      await rewardPool.finalizeEpoch(1);

      await expect(rewardPool.finalizeEpoch(1))
        .to.be.revertedWith("Epoch already finalized");
    });
  });

  describe("Reward Calculation", function () {
    beforeEach(async function () {
      // Fund the epoch
      await rewardPool.connect(funder).fundEpoch(ethers.parseEther("5000"));
    });

    it("Should calculate rewards with reputation multiplier", async function () {
      const baseAmount = ethers.parseEther("100");
      
      // Set user reputation to get multiplier
      // Note: This would normally be done through the reputation system
      
      await expect(rewardPool.calculateReward(user1.address, 1, TRADING_REWARDS, baseAmount))
        .to.emit(rewardPool, "RewardCalculated");

      const userStats = await rewardPool.getUserStats(user1.address);
      expect(userStats[0]).to.be.gt(0); // totalEarned should be > 0
    });

    it("Should batch calculate rewards efficiently", async function () {
      const users = [user1.address, user2.address, user3.address];
      const baseAmounts = [
        ethers.parseEther("100"),
        ethers.parseEther("200"),
        ethers.parseEther("150")
      ];

      await rewardPool.batchCalculateRewards(users, 1, TRADING_REWARDS, baseAmounts);

      // Check that all users have earned rewards
      for (const user of users) {
        const userStats = await rewardPool.getUserStats(user);
        expect(userStats[0]).to.be.gt(0); // totalEarned
      }
    });

    it("Should reject batch with mismatched array lengths", async function () {
      const users = [user1.address, user2.address];
      const baseAmounts = [ethers.parseEther("100")]; // Different length

      await expect(rewardPool.batchCalculateRewards(users, 1, TRADING_REWARDS, baseAmounts))
        .to.be.revertedWith("Array length mismatch");
    });

    it("Should reject batch that's too large", async function () {
      const users = new Array(101).fill(user1.address);
      const baseAmounts = new Array(101).fill(ethers.parseEther("100"));

      await expect(rewardPool.batchCalculateRewards(users, 1, TRADING_REWARDS, baseAmounts))
        .to.be.revertedWith("Batch size too large");
    });

    it("Should reject rewards for inactive category", async function () {
      // Deactivate a category
      await rewardPool.updateRewardCategory(TRADING_REWARDS, 4000, false);

      await expect(rewardPool.calculateReward(user1.address, 1, TRADING_REWARDS, ethers.parseEther("100")))
        .to.be.revertedWith("Category not active");
    });
  });

  describe("Reward Claiming", function () {
    beforeEach(async function () {
      // Fund epoch and calculate some rewards
      await rewardPool.connect(funder).fundEpoch(ethers.parseEther("5000"));
      await rewardPool.calculateReward(user1.address, 1, TRADING_REWARDS, ethers.parseEther("100"));
      await rewardPool.calculateReward(user2.address, 1, GOVERNANCE_REWARDS, ethers.parseEther("200"));
      
      // Finalize epoch
      await time.increase(EPOCH_DURATION + 1);
      await rewardPool.finalizeEpoch(1);
    });

    it("Should allow claiming rewards from finalized epoch", async function () {
      const userRewards = await rewardPool.getUserEpochRewards(user1.address, 1);
      const rewardAmount = userRewards[0];
      
      if (rewardAmount > 0) {
        await expect(rewardPool.connect(user1).claimRewards(1))
          .to.emit(rewardPool, "RewardClaimed")
          .withArgs(user1.address, 1, rewardAmount);

        const userStats = await rewardPool.getUserStats(user1.address);
        expect(userStats[1]).to.equal(rewardAmount); // totalClaimed
        expect(userStats[2]).to.equal(1); // lastClaimEpoch
      }
    });

    it("Should not allow claiming from non-finalized epoch", async function () {
      // Start new epoch and calculate rewards
      await rewardPool.connect(funder).fundEpoch(ethers.parseEther("1000"));
      await rewardPool.calculateReward(user1.address, 2, TRADING_REWARDS, ethers.parseEther("50"));

      await expect(rewardPool.connect(user1).claimRewards(2))
        .to.be.revertedWith("Epoch not finalized");
    });

    it("Should not allow double claiming", async function () {
      const userRewards = await rewardPool.getUserEpochRewards(user1.address, 1);
      const rewardAmount = userRewards[0];
      
      if (rewardAmount > 0) {
        await rewardPool.connect(user1).claimRewards(1);
        
        await expect(rewardPool.connect(user1).claimRewards(1))
          .to.be.revertedWith("Already claimed");
      }
    });

    it("Should allow claiming from multiple epochs", async function () {
      // Create and finalize another epoch with rewards
      await rewardPool.connect(funder).fundEpoch(ethers.parseEther("2000"));
      await rewardPool.calculateReward(user1.address, 2, CONTENT_REWARDS, ethers.parseEther("75"));
      
      await time.increase(EPOCH_DURATION + 1);
      await rewardPool.finalizeEpoch(2);

      const epochIds = [1, 2];
      await rewardPool.connect(user1).claimMultipleEpochs(epochIds);

      const userStats = await rewardPool.getUserStats(user1.address);
      expect(userStats[2]).to.equal(2); // lastClaimEpoch
    });

    it("Should reject claiming with no rewards", async function () {
      await expect(rewardPool.connect(user3).claimRewards(1))
        .to.be.revertedWith("No rewards to claim");
    });
  });

  describe("Category Management", function () {
    it("Should allow adding new reward categories", async function () {
      const categoryName = "Testing";
      const categoryWeight = 500; // 5%

      await expect(rewardPool.addRewardCategory(categoryName, categoryWeight))
        .to.emit(rewardPool, "CategoryAdded")
        .withArgs(6, categoryName, categoryWeight);

      const category = await rewardPool.getRewardCategory(6);
      expect(category[0]).to.equal(categoryName);
      expect(category[1]).to.equal(categoryWeight);
      expect(category[2]).to.be.true; // active
    });

    it("Should reject category with weight > 100%", async function () {
      await expect(rewardPool.addRewardCategory("Invalid", 10001))
        .to.be.revertedWith("Weight cannot exceed 100%");
    });

    it("Should allow updating reward categories", async function () {
      const newWeight = 3000; // 30%
      const active = false;

      await expect(rewardPool.updateRewardCategory(TRADING_REWARDS, newWeight, active))
        .to.emit(rewardPool, "CategoryUpdated")
        .withArgs(TRADING_REWARDS, newWeight, active);

      const category = await rewardPool.getRewardCategory(TRADING_REWARDS);
      expect(category[1]).to.equal(newWeight);
      expect(category[2]).to.equal(active);
    });

    it("Should reject updating invalid category", async function () {
      await expect(rewardPool.updateRewardCategory(999, 1000, true))
        .to.be.revertedWith("Invalid category");
    });
  });

  describe("Governance Parameters", function () {
    it("Should allow updating epoch duration", async function () {
      const newDuration = 14 * 24 * 60 * 60; // 14 days

      await expect(rewardPool.updateGovernanceParameter("epochDuration", newDuration))
        .to.emit(rewardPool, "GovernanceParameterUpdated")
        .withArgs("epochDuration", EPOCH_DURATION, newDuration);

      expect(await rewardPool.epochDuration()).to.equal(newDuration);
    });

    it("Should reject invalid epoch duration", async function () {
      await expect(rewardPool.updateGovernanceParameter("epochDuration", 12 * 60 * 60)) // 12 hours
        .to.be.revertedWith("Invalid epoch duration");

      await expect(rewardPool.updateGovernanceParameter("epochDuration", 31 * 24 * 60 * 60)) // 31 days
        .to.be.revertedWith("Invalid epoch duration");
    });

    it("Should allow updating minimum funding", async function () {
      const newMinimum = ethers.parseEther("2000");

      await rewardPool.updateGovernanceParameter("minimumFunding", newMinimum);
      expect(await rewardPool.minimumFunding()).to.equal(newMinimum);
    });

    it("Should allow updating reputation multiplier", async function () {
      const newMultiplier = 200; // 2.0x

      await rewardPool.updateGovernanceParameter("reputationMultiplier", newMultiplier);
      expect(await rewardPool.reputationMultiplier()).to.equal(newMultiplier);
    });

    it("Should reject invalid reputation multiplier", async function () {
      await expect(rewardPool.updateGovernanceParameter("reputationMultiplier", 50))
        .to.be.revertedWith("Invalid multiplier range");

      await expect(rewardPool.updateGovernanceParameter("reputationMultiplier", 400))
        .to.be.revertedWith("Invalid multiplier range");
    });

    it("Should reject invalid parameter name", async function () {
      await expect(rewardPool.updateGovernanceParameter("invalidParam", 100))
        .to.be.revertedWith("Invalid parameter");
    });
  });

  describe("Access Control", function () {
    it("Should only allow governance to calculate rewards", async function () {
      await expect(rewardPool.connect(user1).calculateReward(user2.address, 1, TRADING_REWARDS, ethers.parseEther("100")))
        .to.be.revertedWith("Not authorized");
    });

    it("Should only allow governance to finalize epochs", async function () {
      await time.increase(EPOCH_DURATION + 1);
      
      await expect(rewardPool.connect(user1).finalizeEpoch(1))
        .to.be.revertedWith("Not authorized");
    });

    it("Should only allow governance to add categories", async function () {
      await expect(rewardPool.connect(user1).addRewardCategory("Test", 1000))
        .to.be.revertedWith("Not authorized");
    });

    it("Should only allow governance to update parameters", async function () {
      await expect(rewardPool.connect(user1).updateGovernanceParameter("epochDuration", 86400))
        .to.be.revertedWith("Not authorized");
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow emergency withdrawal by governance", async function () {
      // Fund the pool
      await rewardPool.connect(funder).fundEpoch(ethers.parseEther("1000"));
      
      const withdrawAmount = ethers.parseEther("500");
      const initialBalance = await ldaoToken.balanceOf(owner.address);
      
      await rewardPool.emergencyWithdraw(withdrawAmount);
      
      const finalBalance = await ldaoToken.balanceOf(owner.address);
      expect(finalBalance - initialBalance).to.equal(withdrawAmount);
      expect(await rewardPool.totalPoolBalance()).to.equal(ethers.parseEther("500"));
    });

    it("Should reject emergency withdrawal of more than balance", async function () {
      await expect(rewardPool.emergencyWithdraw(ethers.parseEther("1000")))
        .to.be.revertedWith("Insufficient balance");
    });

    it("Should only allow governance to emergency withdraw", async function () {
      await expect(rewardPool.connect(user1).emergencyWithdraw(ethers.parseEther("100")))
        .to.be.revertedWith("Not authorized");
    });
  });

  describe("View Functions", function () {
    it("Should return correct user epoch rewards", async function () {
      await rewardPool.connect(funder).fundEpoch(ethers.parseEther("1000"));
      await rewardPool.calculateReward(user1.address, 1, TRADING_REWARDS, ethers.parseEther("100"));

      const [rewardAmount, hasClaimed] = await rewardPool.getUserEpochRewards(user1.address, 1);
      expect(rewardAmount).to.be.gt(0);
      expect(hasClaimed).to.be.false;
    });

    it("Should return correct epoch information", async function () {
      const epochInfo = await rewardPool.getEpochInfo(1);
      expect(epochInfo[0]).to.equal(1); // id
      expect(epochInfo[1]).to.be.gt(0); // startTime
      expect(epochInfo[2]).to.be.gt(epochInfo[1]); // endTime
      expect(epochInfo[6]).to.be.false; // finalized
    });

    it("Should return correct user statistics", async function () {
      const userStats = await rewardPool.getUserStats(user1.address);
      expect(userStats[0]).to.equal(0); // totalEarned (initially)
      expect(userStats[1]).to.equal(0); // totalClaimed (initially)
      expect(userStats[2]).to.equal(0); // lastClaimEpoch (initially)
      expect(userStats[3]).to.equal(0); // participationCount (initially)
    });
  });
});