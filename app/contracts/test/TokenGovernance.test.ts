import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { LDAOToken, Governance } from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Enhanced Token and Governance System", function () {
  let ldaoToken: LDAOToken;
  let governance: Governance;
  let owner: SignerWithAddress;
  let treasury: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;
  let delegate: SignerWithAddress;

  const INITIAL_SUPPLY = ethers.utils.parseEther("1000000000"); // 1 billion tokens
  const STAKE_AMOUNT = ethers.utils.parseEther("1000"); // 1000 tokens
  const LARGE_STAKE = ethers.utils.parseEther("10000"); // 10000 tokens

  beforeEach(async function () {
    [owner, treasury, user1, user2, user3, delegate] = await ethers.getSigners();

    // Deploy LDAOToken
    const LDAOTokenFactory = await ethers.getContractFactory("LDAOToken");
    ldaoToken = await LDAOTokenFactory.deploy(treasury.address);
    await ldaoToken.deployed();

    // Deploy Governance
    const GovernanceFactory = await ethers.getContractFactory("Governance");
    governance = await GovernanceFactory.deploy(ldaoToken.address);
    await governance.deployed();

    // Distribute tokens for testing
    await ldaoToken.connect(treasury).transfer(user1.address, ethers.utils.parseEther("100000"));
    await ldaoToken.connect(treasury).transfer(user2.address, ethers.utils.parseEther("100000"));
    await ldaoToken.connect(treasury).transfer(user3.address, ethers.utils.parseEther("100000"));
    await ldaoToken.connect(treasury).transfer(delegate.address, ethers.utils.parseEther("100000"));
  });

  describe("Enhanced Token Staking System", function () {
    describe("Staking Tiers", function () {
      it("Should have default staking tiers initialized", async function () {
        const tier1 = await ldaoToken.stakingTiers(1);
        expect(tier1.lockPeriod).to.equal(30 * 24 * 60 * 60); // 30 days
        expect(tier1.rewardRate).to.equal(500); // 5%
        expect(tier1.isActive).to.be.true;

        const tier4 = await ldaoToken.stakingTiers(4);
        expect(tier4.lockPeriod).to.equal(365 * 24 * 60 * 60); // 365 days
        expect(tier4.rewardRate).to.equal(1800); // 18%
      });

      it("Should allow owner to create new staking tiers", async function () {
        const lockPeriod = 60 * 24 * 60 * 60; // 60 days
        const rewardRate = 1000; // 10%
        const minStakeAmount = ethers.utils.parseEther("2000");

        const tx = await ldaoToken.connect(owner).createStakingTier(
          lockPeriod,
          rewardRate,
          minStakeAmount
        );

        await expect(tx)
          .to.emit(ldaoToken, "StakingTierCreated")
          .withArgs(5, lockPeriod, rewardRate);

        const newTier = await ldaoToken.stakingTiers(5);
        expect(newTier.lockPeriod).to.equal(lockPeriod);
        expect(newTier.rewardRate).to.equal(rewardRate);
        expect(newTier.minStakeAmount).to.equal(minStakeAmount);
      });
    });

    describe("Token Staking", function () {
      it("Should allow users to stake tokens", async function () {
        const tx = await ldaoToken.connect(user1).stake(STAKE_AMOUNT, 1);

        await expect(tx)
          .to.emit(ldaoToken, "Staked")
          .withArgs(user1.address, STAKE_AMOUNT, 1, 0);

        const userStakes = await ldaoToken.getUserStakes(user1.address);
        expect(userStakes.length).to.equal(1);
        expect(userStakes[0].amount).to.equal(STAKE_AMOUNT);
        expect(userStakes[0].isActive).to.be.true;

        const totalStaked = await ldaoToken.totalStaked(user1.address);
        expect(totalStaked).to.equal(STAKE_AMOUNT);
      });

      it("Should update voting power when staking", async function () {
        const votingPowerBefore = await ldaoToken.votingPower(user1.address);
        
        await ldaoToken.connect(user1).stake(STAKE_AMOUNT, 1);
        
        const votingPowerAfter = await ldaoToken.votingPower(user1.address);
        // Voting power = balance + 2x staked amount
        const expectedVotingPower = (await ldaoToken.balanceOf(user1.address)).add(STAKE_AMOUNT.mul(2));
        expect(votingPowerAfter).to.equal(expectedVotingPower);
      });

      it("Should grant premium membership for large stakes", async function () {
        const premiumThreshold = await ldaoToken.PREMIUM_MEMBERSHIP_THRESHOLD();
        
        await ldaoToken.connect(user1).stake(premiumThreshold, 3);
        
        const hasPremium = await ldaoToken.hasPremiumMembership(user1.address);
        expect(hasPremium).to.be.true;
      });

      it("Should update discount tier based on staking amount", async function () {
        await ldaoToken.connect(user1).stake(LARGE_STAKE, 3);
        
        const discountTier = await ldaoToken.getDiscountTier(user1.address);
        expect(discountTier).to.be.gt(0);
      });

      it("Should prevent staking below minimum for tier", async function () {
        const tier3 = await ldaoToken.stakingTiers(3);
        const belowMinimum = tier3.minStakeAmount.sub(1);
        
        await expect(
          ldaoToken.connect(user1).stake(belowMinimum, 3)
        ).to.be.revertedWith("Amount below minimum for tier");
      });
    });

    describe("Reward System", function () {
      beforeEach(async function () {
        await ldaoToken.connect(user1).stake(STAKE_AMOUNT, 1);
      });

      it("Should calculate staking rewards correctly", async function () {
        // Fast forward time by 30 days
        await time.increase(30 * 24 * 60 * 60);
        
        const rewards = await ldaoToken.getTotalStakeRewards(user1.address);
        expect(rewards).to.be.gt(0);
      });

      it("Should allow claiming staking rewards", async function () {
        // Fast forward time by 30 days
        await time.increase(30 * 24 * 60 * 60);
        
        const balanceBefore = await ldaoToken.balanceOf(user1.address);
        const rewards = await ldaoToken.getTotalStakeRewards(user1.address);
        
        const tx = await ldaoToken.connect(user1).claimAllStakeRewards();
        
        await expect(tx)
          .to.emit(ldaoToken, "RewardsClaimed")
          .withArgs(user1.address, rewards);
        
        const balanceAfter = await ldaoToken.balanceOf(user1.address);
        expect(balanceAfter.sub(balanceBefore)).to.equal(rewards);
      });

      it("Should allow claiming activity rewards", async function () {
        const balanceBefore = await ldaoToken.balanceOf(user1.address);
        
        const tx = await ldaoToken.connect(user1).claimActivityReward();
        
        await expect(tx)
          .to.emit(ldaoToken, "ActivityRewardClaimed");
        
        const balanceAfter = await ldaoToken.balanceOf(user1.address);
        expect(balanceAfter).to.be.gt(balanceBefore);
      });

      it("Should enforce activity reward cooldown", async function () {
        await ldaoToken.connect(user1).claimActivityReward();
        
        await expect(
          ldaoToken.connect(user1).claimActivityReward()
        ).to.be.revertedWith("Activity reward on cooldown");
      });
    });

    describe("Unstaking", function () {
      beforeEach(async function () {
        await ldaoToken.connect(user1).stake(STAKE_AMOUNT, 1);
      });

      it("Should prevent unstaking before lock period", async function () {
        await expect(
          ldaoToken.connect(user1).unstake(0)
        ).to.be.revertedWith("Stake still locked");
      });

      it("Should allow unstaking after lock period", async function () {
        // Fast forward past lock period (30 days)
        await time.increase(31 * 24 * 60 * 60);
        
        const balanceBefore = await ldaoToken.balanceOf(user1.address);
        
        const tx = await ldaoToken.connect(user1).unstake(0);
        
        await expect(tx)
          .to.emit(ldaoToken, "Unstaked")
          .withArgs(user1.address, STAKE_AMOUNT, 0);
        
        const balanceAfter = await ldaoToken.balanceOf(user1.address);
        expect(balanceAfter.sub(balanceBefore)).to.equal(STAKE_AMOUNT);
        
        const totalStaked = await ldaoToken.totalStaked(user1.address);
        expect(totalStaked).to.equal(0);
      });

      it("Should update voting power when unstaking", async function () {
        // Fast forward past lock period
        await time.increase(31 * 24 * 60 * 60);
        
        await ldaoToken.connect(user1).unstake(0);
        
        const votingPower = await ldaoToken.votingPower(user1.address);
        const expectedVotingPower = await ldaoToken.balanceOf(user1.address);
        expect(votingPower).to.equal(expectedVotingPower);
      });
    });
  });

  describe("Enhanced Governance System", function () {
    beforeEach(async function () {
      // Stake tokens to get voting power
      await ldaoToken.connect(user1).stake(LARGE_STAKE, 3);
      await ldaoToken.connect(user2).stake(LARGE_STAKE, 3);
    });

    describe("Proposal Creation", function () {
      it("Should create proposals with categories", async function () {
        const title = "Test Marketplace Policy";
        const description = "A test proposal for marketplace policy";
        const category = 1; // MARKETPLACE_POLICY
        
        const tx = await governance.connect(user1).propose(
          title,
          description,
          category,
          [], // targets
          [], // values
          [], // signatures
          []  // calldatas
        );
        
        await expect(tx)
          .to.emit(governance, "ProposalCreated");
        
        const proposal = await governance.getProposal(1);
        expect(proposal.title).to.equal(title);
        expect(proposal.category).to.equal(category);
      });

      it("Should enforce category-specific thresholds", async function () {
        // Try to create a security upgrade proposal without enough voting power
        await expect(
          governance.connect(user3).propose( // user3 has no staking
            "Security Upgrade",
            "Test security upgrade",
            4, // SECURITY_UPGRADE
            [], [], [], []
          )
        ).to.be.revertedWith("Insufficient voting power to propose");
      });

      it("Should create general proposals with lower threshold", async function () {
        const tx = await governance.connect(user1).propose(
          "General Proposal",
          "A general proposal",
          0, // GENERAL
          [], [], [], []
        );
        
        await expect(tx).to.emit(governance, "ProposalCreated");
      });
    });

    describe("Enhanced Voting", function () {
      let proposalId: number;

      beforeEach(async function () {
        const tx = await governance.connect(user1).propose(
          "Test Proposal",
          "A test proposal",
          0, // GENERAL
          [], [], [], []
        );
        const receipt = await tx.wait();
        proposalId = 1;
        
        // Fast forward to voting period
        await time.advanceBlock();
      });

      it("Should cast votes with enhanced voting power", async function () {
        const votingPower = await ldaoToken.votingPower(user1.address);
        
        const tx = await governance.connect(user1).castVote(proposalId, 1, "Supporting this proposal");
        
        await expect(tx)
          .to.emit(governance, "VoteCast")
          .withArgs(user1.address, proposalId, 1, votingPower, "Supporting this proposal");
        
        const proposal = await governance.getProposal(proposalId);
        expect(proposal.forVotes).to.equal(votingPower);
      });

      it("Should support abstain votes", async function () {
        const tx = await governance.connect(user1).castVote(proposalId, 2, "Abstaining");
        
        const proposal = await governance.getProposal(proposalId);
        expect(proposal.abstainVotes).to.be.gt(0);
      });

      it("Should enforce staking requirements for certain proposals", async function () {
        // Create a proposal that requires staking
        const stakingProposalTx = await governance.connect(user1).propose(
          "Fee Structure Change",
          "Change marketplace fees",
          2, // FEE_STRUCTURE
          [], [], [], []
        );
        
        // Try to vote without sufficient staking
        await expect(
          governance.connect(user3).castVote(2, 1, "Supporting")
        ).to.be.revertedWith("Insufficient staking to vote on this proposal");
      });
    });

    describe("Delegation System", function () {
      it("Should allow delegating voting power", async function () {
        const tx = await governance.connect(user1).delegate(delegate.address);
        
        await expect(tx)
          .to.emit(governance, "DelegateChanged")
          .withArgs(user1.address, ethers.constants.AddressZero, delegate.address);
        
        const delegatedVotes = await governance.delegatedVotes(delegate.address);
        expect(delegatedVotes).to.be.gt(0);
      });

      it("Should update delegated votes when delegation changes", async function () {
        await governance.connect(user1).delegate(delegate.address);
        
        const tx = await governance.connect(user1).delegate(user2.address);
        
        await expect(tx)
          .to.emit(governance, "DelegateVotesChanged");
      });
    });

    describe("Proposal Execution", function () {
      let proposalId: number;

      beforeEach(async function () {
        // Create a proposal
        const tx = await governance.connect(user1).propose(
          "Test Execution",
          "A test proposal for execution",
          0, // GENERAL
          [], [], [], []
        );
        proposalId = 1;
        
        // Fast forward to voting period and vote
        await time.advanceBlock();
        await governance.connect(user1).castVote(proposalId, 1, "Supporting");
        await governance.connect(user2).castVote(proposalId, 1, "Supporting");
        
        // Fast forward past voting period
        const proposal = await governance.getProposal(proposalId);
        const blocksToAdvance = proposal.endBlock.sub(await ethers.provider.getBlockNumber()).toNumber();
        for (let i = 0; i < blocksToAdvance + 1; i++) {
          await time.advanceBlock();
        }
      });

      it("Should queue successful proposals", async function () {
        const tx = await governance.queue(proposalId);
        
        await expect(tx)
          .to.emit(governance, "ProposalQueued");
        
        const proposal = await governance.getProposal(proposalId);
        expect(proposal.state).to.equal(5); // QUEUED
      });

      it("Should execute queued proposals after delay", async function () {
        await governance.queue(proposalId);
        
        // Fast forward past execution delay
        await time.increase(2 * 24 * 60 * 60 + 1); // 2 days + 1 second
        
        const tx = await governance.execute(proposalId);
        
        await expect(tx)
          .to.emit(governance, "ProposalExecuted");
        
        const proposal = await governance.getProposal(proposalId);
        expect(proposal.state).to.equal(7); // EXECUTED
      });

      it("Should prevent execution before delay", async function () {
        await governance.queue(proposalId);
        
        await expect(
          governance.execute(proposalId)
        ).to.be.revertedWith("Execution delay not met");
      });
    });

    describe("Category-Specific Governance", function () {
      it("Should have different quorum requirements for different categories", async function () {
        const generalQuorum = await governance.quorumVotes();
        const feeStructureQuorum = await governance.categoryQuorum(2); // FEE_STRUCTURE
        
        expect(feeStructureQuorum).to.be.gt(generalQuorum);
      });

      it("Should allow owner to update category parameters", async function () {
        const newQuorum = ethers.utils.parseEther("1000000");
        const newThreshold = ethers.utils.parseEther("100000");
        
        const tx = await governance.connect(owner).setCategoryParameters(
          1, // MARKETPLACE_POLICY
          newQuorum,
          newThreshold,
          true
        );
        
        await expect(tx)
          .to.emit(governance, "CategoryParametersUpdated");
        
        const updatedQuorum = await governance.categoryQuorum(1);
        expect(updatedQuorum).to.equal(newQuorum);
      });
    });

    describe("Governance Configuration", function () {
      it("Should allow owner to update governance parameters", async function () {
        const newDelay = 3 * 24 * 60 * 60; // 3 days
        
        await governance.connect(owner).setExecutionDelay(newDelay);
        
        const updatedDelay = await governance.executionDelay();
        expect(updatedDelay).to.equal(newDelay);
      });

      it("Should prevent non-owner from updating parameters", async function () {
        await expect(
          governance.connect(user1).setExecutionDelay(1000)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });
    });
  });

  describe("Integration Tests", function () {
    it("Should integrate staking rewards with governance participation", async function () {
      // Stake tokens
      await ldaoToken.connect(user1).stake(LARGE_STAKE, 4); // Long-term stake
      
      // Create and vote on proposal
      await governance.connect(user1).propose(
        "Integration Test",
        "Testing integration",
        0, [], [], [], []
      );
      
      await time.advanceBlock();
      await governance.connect(user1).castVote(1, 1, "Testing");
      
      // Fast forward time to accumulate rewards
      await time.increase(30 * 24 * 60 * 60);
      
      // Claim rewards
      const balanceBefore = await ldaoToken.balanceOf(user1.address);
      await ldaoToken.connect(user1).claimAllStakeRewards();
      const balanceAfter = await ldaoToken.balanceOf(user1.address);
      
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("Should maintain voting power consistency across token transfers", async function () {
      await ldaoToken.connect(user1).stake(STAKE_AMOUNT, 1);
      
      const votingPowerBefore = await ldaoToken.votingPower(user1.address);
      
      // Transfer some tokens
      const transferAmount = ethers.utils.parseEther("1000");
      await ldaoToken.connect(user1).transfer(user2.address, transferAmount);
      
      const votingPowerAfter = await ldaoToken.votingPower(user1.address);
      
      // Voting power should decrease by the transferred amount
      expect(votingPowerBefore.sub(votingPowerAfter)).to.equal(transferAmount);
    });

    it("Should handle complex governance scenarios", async function () {
      // Multiple users stake different amounts
      await ldaoToken.connect(user1).stake(ethers.utils.parseEther("5000"), 3);
      await ldaoToken.connect(user2).stake(ethers.utils.parseEther("10000"), 4);
      await ldaoToken.connect(user3).stake(ethers.utils.parseEther("2000"), 2);
      
      // Create a high-stakes proposal
      const proposalTx = await governance.connect(user2).propose(
        "Major Platform Upgrade",
        "Significant changes to platform",
        4, // SECURITY_UPGRADE
        [], [], [], []
      );
      
      // Vote with different preferences
      await time.advanceBlock();
      await governance.connect(user1).castVote(1, 1, "Supporting upgrade");
      await governance.connect(user2).castVote(1, 1, "Strongly supporting");
      await governance.connect(user3).castVote(1, 0, "Against this change");
      
      const proposal = await governance.getProposal(1);
      expect(proposal.forVotes).to.be.gt(proposal.againstVotes);
    });
  });
});