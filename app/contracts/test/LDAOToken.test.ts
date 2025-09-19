import { expect } from "chai";
import { ethers } from "hardhat";
import { LDAOToken } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("LDAOToken", function () {
  let ldaoToken: LDAOToken;
  let owner: SignerWithAddress;
  let treasury: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const INITIAL_SUPPLY = ethers.utils.parseEther("1000000000"); // 1 billion tokens
  const PREMIUM_THRESHOLD = ethers.utils.parseEther("1000"); // 1000 tokens

  beforeEach(async function () {
    [owner, treasury, user1, user2] = await ethers.getSigners();

    const LDAOTokenFactory = await ethers.getContractFactory("LDAOToken");
    ldaoToken = await LDAOTokenFactory.deploy(treasury.address) as LDAOToken;
    await ldaoToken.deployed();
  });

  describe("Deployment", function () {
    it("Should deploy with correct initial supply", async function () {
      const totalSupply = await ldaoToken.totalSupply();
      expect(totalSupply).to.equal(INITIAL_SUPPLY);
    });

    it("Should mint initial supply to treasury", async function () {
      const treasuryBalance = await ldaoToken.balanceOf(treasury.address);
      expect(treasuryBalance).to.equal(INITIAL_SUPPLY);
    });

    it("Should set correct token name and symbol", async function () {
      expect(await ldaoToken.name()).to.equal("LinkDAO Token");
      expect(await ldaoToken.symbol()).to.equal("LDAO");
    });

    it("Should initialize staking tiers correctly", async function () {
      // Check tier 1 (30 days, 5% APR)
      const tier1 = await ldaoToken.stakingTiers(1);
      expect(tier1.lockPeriod).to.equal(30 * 24 * 60 * 60); // 30 days in seconds
      expect(tier1.rewardRate).to.equal(500); // 5% in basis points
      expect(tier1.minStakeAmount).to.equal(ethers.utils.parseEther("100"));
      expect(tier1.isActive).to.be.true;

      // Check tier 4 (365 days, 18% APR)
      const tier4 = await ldaoToken.stakingTiers(4);
      expect(tier4.lockPeriod).to.equal(365 * 24 * 60 * 60); // 365 days in seconds
      expect(tier4.rewardRate).to.equal(1800); // 18% in basis points
      expect(tier4.minStakeAmount).to.equal(ethers.utils.parseEther("5000"));
      expect(tier4.isActive).to.be.true;
    });
  });

  describe("Staking Functionality", function () {
    beforeEach(async function () {
      // Transfer some tokens to user1 for testing
      await ldaoToken.connect(treasury).transfer(user1.address, ethers.utils.parseEther("10000"));
    });

    it("Should allow users to stake tokens", async function () {
      const stakeAmount = ethers.utils.parseEther("1000");
      
      await ldaoToken.connect(user1).stake(stakeAmount, 1);
      
      const userStakes = await ldaoToken.getUserStakes(user1.address);
      expect(userStakes.length).to.equal(1);
      expect(userStakes[0].amount).to.equal(stakeAmount);
      expect(userStakes[0].isActive).to.be.true;
      
      const totalStaked = await ldaoToken.totalStaked(user1.address);
      expect(totalStaked).to.equal(stakeAmount);
    });

    it("Should update voting power when staking", async function () {
      const stakeAmount = ethers.utils.parseEther("1000");
      const initialBalance = await ldaoToken.balanceOf(user1.address);
      
      await ldaoToken.connect(user1).stake(stakeAmount, 1);
      
      const votingPower = await ldaoToken.votingPower(user1.address);
      const expectedVotingPower = initialBalance.sub(stakeAmount).add(stakeAmount.mul(2));
      expect(votingPower).to.equal(expectedVotingPower);
    });

    it("Should grant premium membership for sufficient staking", async function () {
      const stakeAmount = ethers.utils.parseEther("1000");
      
      expect(await ldaoToken.hasPremiumMembership(user1.address)).to.be.false;
      
      await ldaoToken.connect(user1).stake(stakeAmount, 1);
      
      expect(await ldaoToken.hasPremiumMembership(user1.address)).to.be.true;
    });

    it("Should set correct discount tier based on staking amount", async function () {
      // Test tier 1 (5% discount for 1000+ tokens)
      await ldaoToken.connect(user1).stake(ethers.utils.parseEther("1000"), 1);
      expect(await ldaoToken.getDiscountTier(user1.address)).to.equal(1);
      
      // Transfer more tokens and test tier 2
      await ldaoToken.connect(treasury).transfer(user1.address, ethers.utils.parseEther("10000"));
      await ldaoToken.connect(user1).stake(ethers.utils.parseEther("4000"), 2);
      expect(await ldaoToken.getDiscountTier(user1.address)).to.equal(2);
    });

    it("Should prevent staking below minimum amount", async function () {
      const stakeAmount = ethers.utils.parseEther("50"); // Below 100 minimum for tier 1
      
      await expect(
        ldaoToken.connect(user1).stake(stakeAmount, 1)
      ).to.be.revertedWith("Amount below minimum for tier");
    });

    it("Should prevent staking with inactive tier", async function () {
      // Deactivate tier 1
      await ldaoToken.connect(owner).updateStakingTier(1, 30 * 24 * 60 * 60, 500, ethers.utils.parseEther("100"), false);
      
      await expect(
        ldaoToken.connect(user1).stake(ethers.utils.parseEther("1000"), 1)
      ).to.be.revertedWith("Staking tier not active");
    });
  });

  describe("Unstaking Functionality", function () {
    beforeEach(async function () {
      await ldaoToken.connect(treasury).transfer(user1.address, ethers.utils.parseEther("10000"));
      await ldaoToken.connect(user1).stake(ethers.utils.parseEther("1000"), 1);
    });

    it("Should prevent unstaking before lock period", async function () {
      await expect(
        ldaoToken.connect(user1).unstake(0)
      ).to.be.revertedWith("Stake still locked");
    });

    it("Should allow unstaking after lock period", async function () {
      // Fast forward time by 31 days
      await ethers.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);
      
      const initialBalance = await ldaoToken.balanceOf(user1.address);
      
      await ldaoToken.connect(user1).unstake(0);
      
      const finalBalance = await ldaoToken.balanceOf(user1.address);
      expect(finalBalance).to.be.gt(initialBalance); // Should include rewards
      
      const userStakes = await ldaoToken.getUserStakes(user1.address);
      expect(userStakes[0].isActive).to.be.false;
    });
  });

  describe("Rewards System", function () {
    beforeEach(async function () {
      await ldaoToken.connect(treasury).transfer(user1.address, ethers.utils.parseEther("10000"));
      await ldaoToken.connect(user1).stake(ethers.utils.parseEther("1000"), 1);
    });

    it("Should calculate rewards correctly", async function () {
      // Fast forward time by 30 days
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);
      
      const rewards = await ldaoToken.getTotalStakeRewards(user1.address);
      expect(rewards).to.be.gt(0);
      
      // Approximate calculation: 1000 tokens * 5% APR * 30/365 days
      const expectedRewards = ethers.utils.parseEther("1000").mul(500).div(10000).mul(30).div(365);
      expect(rewards).to.be.closeTo(expectedRewards, ethers.utils.parseEther("1"));
    });

    it("Should allow claiming rewards", async function () {
      // Fast forward time by 30 days
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);
      
      const initialBalance = await ldaoToken.balanceOf(user1.address);
      
      await ldaoToken.connect(user1).claimAllStakeRewards();
      
      const finalBalance = await ldaoToken.balanceOf(user1.address);
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should allow claiming activity rewards", async function () {
      const initialBalance = await ldaoToken.balanceOf(user1.address);
      
      await ldaoToken.connect(user1).claimActivityReward();
      
      const finalBalance = await ldaoToken.balanceOf(user1.address);
      expect(finalBalance).to.be.gt(initialBalance);
      
      // Should be on cooldown
      await expect(
        ldaoToken.connect(user1).claimActivityReward()
      ).to.be.revertedWith("Activity reward on cooldown");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to create new staking tiers", async function () {
      await ldaoToken.connect(owner).createStakingTier(
        60 * 24 * 60 * 60, // 60 days
        1000, // 10% APR
        ethers.utils.parseEther("2000") // 2000 tokens minimum
      );
      
      const tier5 = await ldaoToken.stakingTiers(5);
      expect(tier5.lockPeriod).to.equal(60 * 24 * 60 * 60);
      expect(tier5.rewardRate).to.equal(1000);
      expect(tier5.minStakeAmount).to.equal(ethers.utils.parseEther("2000"));
      expect(tier5.isActive).to.be.true;
    });

    it("Should allow owner to update existing tiers", async function () {
      await ldaoToken.connect(owner).updateStakingTier(
        1,
        45 * 24 * 60 * 60, // 45 days
        600, // 6% APR
        ethers.utils.parseEther("200"), // 200 tokens minimum
        true
      );
      
      const tier1 = await ldaoToken.stakingTiers(1);
      expect(tier1.lockPeriod).to.equal(45 * 24 * 60 * 60);
      expect(tier1.rewardRate).to.equal(600);
      expect(tier1.minStakeAmount).to.equal(ethers.utils.parseEther("200"));
    });

    it("Should allow owner to add to reward pool", async function () {
      const addAmount = ethers.utils.parseEther("1000");
      const initialRewardPool = await ldaoToken.rewardPool();
      
      await ldaoToken.connect(treasury).approve(ldaoToken.address, addAmount);
      await ldaoToken.connect(treasury).addToRewardPool(addAmount);
      
      const finalRewardPool = await ldaoToken.rewardPool();
      expect(finalRewardPool).to.equal(initialRewardPool.add(addAmount));
    });

    it("Should prevent non-owners from admin functions", async function () {
      await expect(
        ldaoToken.connect(user1).createStakingTier(60 * 24 * 60 * 60, 1000, ethers.utils.parseEther("2000"))
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("ERC20 Permit Functionality", function () {
    it("Should support ERC20 permit", async function () {
      const domain = {
        name: await ldaoToken.name(),
        version: "1",
        chainId: await ethers.provider.getNetwork().then(n => n.chainId),
        verifyingContract: ldaoToken.address
      };

      // This test verifies that the permit functionality is available
      // Full permit testing would require signature generation
      expect(await ldaoToken.DOMAIN_SEPARATOR()).to.not.equal("0x0000000000000000000000000000000000000000000000000000000000000000");
    });
  });
});