import { expect } from "chai";
import { ethers } from "hardhat";
import { TestSuite } from "./TestSuite";

const { parseEther, parseUnits } = ethers.utils;

describe("Comprehensive Unit Tests", function () {
  let testSuite: TestSuite;

  before(async function () {
    testSuite = new TestSuite();
    await testSuite.deployAll();
  });

  describe("LDAOToken Unit Tests", function () {
    it("Should have correct initial parameters", async function () {
      expect(await testSuite.contracts.ldaoToken!.name()).to.equal("LinkDAO Token");
      expect(await testSuite.contracts.ldaoToken!.symbol()).to.equal("LDAO");
      expect(await testSuite.contracts.ldaoToken!.decimals()).to.equal(18);
      expect(await testSuite.contracts.ldaoToken!.totalSupply()).to.equal(parseEther("1000000000"));
    });

    it("Should handle staking correctly", async function () {
      const stakeAmount = parseEther("1000");
      await testSuite.contracts.ldaoToken.connect(testSuite.accounts.user1).stake(stakeAmount, 90);
      
      const stakeInfo = await testSuite.contracts.ldaoToken.getStakeInfo(testSuite.accounts.user1.address);
      expect(stakeInfo.amount).to.equal(stakeAmount);
      expect(stakeInfo.lockPeriod).to.equal(90 * 24 * 60 * 60);
    });

    it("Should calculate voting power correctly", async function () {
      const balance = parseEther("1000");
      const votingPower = await testSuite.contracts.ldaoToken.getVotingPower(testSuite.accounts.user1.address);
      expect(votingPower).to.be.gt(balance); // Should be higher due to staking multiplier
    });

    it("Should handle premium membership", async function () {
      const isPremium = await testSuite.contracts.ldaoToken.isPremiumMember(testSuite.accounts.user1.address);
      expect(isPremium).to.be.true; // User1 has staked tokens
    });
  });

  describe("Governance Unit Tests", function () {
    it("Should create proposals correctly", async function () {
      const description = "Test proposal";
      const targets = [testSuite.contracts.ldaoToken.address];
      const values = [0];
      const calldatas = ["0x"];
      
      await expect(
        testSuite.contracts.governance.connect(testSuite.accounts.user1).propose(
          targets, values, calldatas, description
        )
      ).to.emit(testSuite.contracts.governance, "ProposalCreated");
    });

    it("Should handle voting correctly", async function () {
      // Create a proposal first
      const description = "Test voting proposal";
      const targets = [testSuite.contracts.ldaoToken.address];
      const values = [0];
      const calldatas = ["0x"];
      
      const tx = await testSuite.contracts.governance.connect(testSuite.accounts.user1).propose(
        targets, values, calldatas, description
      );
      const receipt = await tx.wait();
      const proposalId = receipt.events?.[0]?.args?.proposalId;
      
      // Fast forward to voting period
      await ethers.provider.send("hardhat_mine", ["0x1C20"]); // Mine blocks
      
      await expect(
        testSuite.contracts.governance.connect(testSuite.accounts.user1).castVote(proposalId, 1)
      ).to.emit(testSuite.contracts.governance, "VoteCast");
    });
  });

  describe("ReputationSystem Unit Tests", function () {
    it("Should initialize with correct parameters", async function () {
      const tierThresholds = await testSuite.contracts.reputationSystem.getTierThresholds();
      expect(tierThresholds.length).to.be.gt(0);
    });

    it("Should handle reputation updates", async function () {
      await testSuite.contracts.reputationSystem.updateReputation(
        testSuite.accounts.user1.address,
        100,
        "Test review"
      );
      
      const reputation = await testSuite.contracts.reputationSystem.getReputation(testSuite.accounts.user1.address);
      expect(reputation.totalPoints).to.equal(100);
    });

    it("Should detect suspicious activity", async function () {
      // Simulate multiple rapid reviews
      for (let i = 0; i < 5; i++) {
        await testSuite.contracts.reputationSystem.updateReputation(
          testSuite.accounts.user2.address,
          50,
          `Rapid review ${i}`
        );
      }
      
      const isSuspicious = await testSuite.contracts.reputationSystem.isSuspiciousActivity(
        testSuite.accounts.user2.address
      );
      expect(isSuspicious).to.be.true;
    });
  });

  describe("ProfileRegistry Unit Tests", function () {
    it("Should register profiles correctly", async function () {
      const handle = "testuser";
      const metadataURI = "ipfs://test-metadata";
      
      await expect(
        testSuite.contracts.profileRegistry.connect(testSuite.accounts.user1).registerProfile(
          handle, metadataURI
        )
      ).to.emit(testSuite.contracts.profileRegistry, "ProfileRegistered");
    });

    it("Should prevent duplicate handles", async function () {
      const handle = "duplicatetest";
      const metadataURI = "ipfs://test-metadata";
      
      await testSuite.contracts.profileRegistry.connect(testSuite.accounts.user1).registerProfile(
        handle, metadataURI
      );
      
      await expect(
        testSuite.contracts.profileRegistry.connect(testSuite.accounts.user2).registerProfile(
          handle, metadataURI
        )
      ).to.be.revertedWith("Handle already taken");
    });
  });

  describe("PaymentRouter Unit Tests", function () {
    it("Should process ETH payments correctly", async function () {
      const amount = parseEther("1");
      const recipient = testSuite.accounts.seller.address;
      
      await expect(
        testSuite.contracts.paymentRouter.connect(testSuite.accounts.buyer).processPayment(
          ethers.constants.AddressZero, // ETH
          amount,
          recipient,
          { value: amount }
        )
      ).to.emit(testSuite.contracts.paymentRouter, "PaymentProcessed");
    });

    it("Should process ERC20 payments correctly", async function () {
      const amount = parseUnits("100", 6);
      const recipient = testSuite.accounts.seller.address;
      
      // Approve payment router
      await testSuite.contracts.mockUSDC.connect(testSuite.accounts.buyer).approve(
        testSuite.contracts.paymentRouter.address,
        amount
      );
      
      await expect(
        testSuite.contracts.paymentRouter.connect(testSuite.accounts.buyer).processPayment(
          testSuite.contracts.mockUSDC.address,
          amount,
          recipient
        )
      ).to.emit(testSuite.contracts.paymentRouter, "PaymentProcessed");
    });

    it("Should calculate fees correctly", async function () {
      const amount = parseEther("100");
      const expectedFee = amount.mul(250).div(10000); // 2.5%
      
      const fee = await testSuite.contracts.paymentRouter.calculateFee(amount);
      expect(fee).to.equal(expectedFee);
    });
  });

  describe("EnhancedEscrow Unit Tests", function () {
    it("Should create escrow correctly", async function () {
      const amount = parseEther("1");
      const seller = testSuite.accounts.seller.address;
      
      await expect(
        testSuite.contracts.enhancedEscrow.connect(testSuite.accounts.buyer).createEscrow(
          seller,
          ethers.constants.AddressZero, // ETH
          amount,
          86400, // 1 day timeout
          { value: amount }
        )
      ).to.emit(testSuite.contracts.enhancedEscrow, "EscrowCreated");
    });

    it("Should handle delivery confirmation", async function () {
      const amount = parseEther("1");
      const seller = testSuite.accounts.seller.address;
      
      const tx = await testSuite.contracts.enhancedEscrow.connect(testSuite.accounts.buyer).createEscrow(
        seller,
        ethers.constants.AddressZero,
        amount,
        86400,
        { value: amount }
      );
      const receipt = await tx.wait();
      const escrowId = receipt.events?.[0]?.args?.escrowId;
      
      await expect(
        testSuite.contracts.enhancedEscrow.connect(testSuite.accounts.buyer).confirmDelivery(escrowId)
      ).to.emit(testSuite.contracts.enhancedEscrow, "DeliveryConfirmed");
    });
  });

  describe("DisputeResolution Unit Tests", function () {
    it("Should create disputes correctly", async function () {
      const escrowId = 1;
      const evidence = "Test evidence";
      
      await expect(
        testSuite.contracts.disputeResolution.connect(testSuite.accounts.buyer).createDispute(
          escrowId,
          evidence
        )
      ).to.emit(testSuite.contracts.disputeResolution, "DisputeCreated");
    });

    it("Should handle arbitrator applications", async function () {
      await expect(
        testSuite.contracts.disputeResolution.connect(testSuite.accounts.arbitrator).applyAsArbitrator()
      ).to.emit(testSuite.contracts.disputeResolution, "ArbitratorApplicationSubmitted");
    });
  });

  describe("Marketplace Unit Tests", function () {
    it("Should create listings correctly", async function () {
      const price = parseEther("1");
      const quantity = 1;
      
      await expect(
        testSuite.contracts.marketplace.connect(testSuite.accounts.seller).createListing(
          ethers.constants.AddressZero, // ETH
          0, // tokenId (not used for ETH)
          price,
          quantity,
          0, // ItemType.PHYSICAL
          0  // ListingType.FIXED_PRICE
        )
      ).to.emit(testSuite.contracts.marketplace, "ListingCreated");
    });

    it("Should handle purchases correctly", async function () {
      const price = parseEther("1");
      const quantity = 1;
      
      // Create listing first
      const tx = await testSuite.contracts.marketplace.connect(testSuite.accounts.seller).createListing(
        ethers.constants.AddressZero,
        0,
        price,
        quantity,
        0,
        0
      );
      const receipt = await tx.wait();
      const listingId = receipt.events?.[0]?.args?.listingId;
      
      await expect(
        testSuite.contracts.marketplace.connect(testSuite.accounts.buyer).purchaseItem(
          listingId,
          quantity,
          { value: price }
        )
      ).to.emit(testSuite.contracts.marketplace, "ItemPurchased");
    });
  });

  describe("NFTMarketplace Unit Tests", function () {
    it("Should mint NFTs correctly", async function () {
      const tokenURI = "ipfs://test-nft-metadata";
      const royaltyBps = 500; // 5%
      
      await expect(
        testSuite.contracts.nftMarketplace.connect(testSuite.accounts.user1).mintNFT(
          testSuite.accounts.user1.address,
          tokenURI,
          royaltyBps
        )
      ).to.emit(testSuite.contracts.nftMarketplace, "NFTMinted");
    });

    it("Should list NFTs for sale", async function () {
      const tokenURI = "ipfs://test-nft-metadata";
      const royaltyBps = 500;
      const price = parseEther("1");
      
      // Mint NFT first
      const mintTx = await testSuite.contracts.nftMarketplace.connect(testSuite.accounts.user1).mintNFT(
        testSuite.accounts.user1.address,
        tokenURI,
        royaltyBps
      );
      const mintReceipt = await mintTx.wait();
      const tokenId = mintReceipt.events?.[0]?.args?.tokenId;
      
      await expect(
        testSuite.contracts.nftMarketplace.connect(testSuite.accounts.user1).listNFT(
          tokenId,
          price
        )
      ).to.emit(testSuite.contracts.nftMarketplace, "NFTListed");
    });
  });

  describe("TipRouter Unit Tests", function () {
    it("Should process tips correctly", async function () {
      const tipAmount = parseEther("10");
      const postId = "test-post-123";
      
      // Approve tip router to spend tokens
      await testSuite.contracts.ldaoToken.connect(testSuite.accounts.user1).approve(
        testSuite.contracts.tipRouter.address,
        tipAmount
      );
      
      await expect(
        testSuite.contracts.tipRouter.connect(testSuite.accounts.user1).tip(
          testSuite.accounts.user2.address,
          tipAmount,
          postId
        )
      ).to.emit(testSuite.contracts.tipRouter, "TipSent");
    });

    it("Should distribute fees to reward pool", async function () {
      const tipAmount = parseEther("100");
      const postId = "test-post-456";
      
      const initialRewardPoolBalance = await testSuite.contracts.ldaoToken.balanceOf(
        testSuite.contracts.rewardPool.address
      );
      
      await testSuite.contracts.ldaoToken.connect(testSuite.accounts.user1).approve(
        testSuite.contracts.tipRouter.address,
        tipAmount
      );
      
      await testSuite.contracts.tipRouter.connect(testSuite.accounts.user1).tip(
        testSuite.accounts.user2.address,
        tipAmount,
        postId
      );
      
      const finalRewardPoolBalance = await testSuite.contracts.ldaoToken.balanceOf(
        testSuite.contracts.rewardPool.address
      );
      
      expect(finalRewardPoolBalance).to.be.gt(initialRewardPoolBalance);
    });
  });

  describe("FollowModule Unit Tests", function () {
    it("Should handle following correctly", async function () {
      await expect(
        testSuite.contracts.followModule.connect(testSuite.accounts.user1).follow(
          testSuite.accounts.user2.address
        )
      ).to.emit(testSuite.contracts.followModule, "Followed");
    });

    it("Should track follower counts", async function () {
      await testSuite.contracts.followModule.connect(testSuite.accounts.user1).follow(
        testSuite.accounts.user2.address
      );
      
      const followerCount = await testSuite.contracts.followModule.getFollowerCount(
        testSuite.accounts.user2.address
      );
      expect(followerCount).to.equal(1);
    });

    it("Should handle unfollowing", async function () {
      await testSuite.contracts.followModule.connect(testSuite.accounts.user1).follow(
        testSuite.accounts.user2.address
      );
      
      await expect(
        testSuite.contracts.followModule.connect(testSuite.accounts.user1).unfollow(
          testSuite.accounts.user2.address
        )
      ).to.emit(testSuite.contracts.followModule, "Unfollowed");
    });
  });

  describe("RewardPool Unit Tests", function () {
    it("Should handle reward distribution", async function () {
      const rewardAmount = parseEther("1000");
      
      // Fund reward pool
      await testSuite.contracts.ldaoToken.connect(testSuite.accounts.treasury).transfer(
        testSuite.contracts.rewardPool.address,
        rewardAmount
      );
      
      await expect(
        testSuite.contracts.rewardPool.distributeRewards([testSuite.accounts.user1.address], [rewardAmount])
      ).to.emit(testSuite.contracts.rewardPool, "RewardsDistributed");
    });

    it("Should handle reward claims", async function () {
      const rewardAmount = parseEther("100");
      
      // Set up reward for user
      await testSuite.contracts.ldaoToken.connect(testSuite.accounts.treasury).transfer(
        testSuite.contracts.rewardPool.address,
        rewardAmount
      );
      
      await testSuite.contracts.rewardPool.distributeRewards(
        [testSuite.accounts.user1.address], 
        [rewardAmount]
      );
      
      await expect(
        testSuite.contracts.rewardPool.connect(testSuite.accounts.user1).claimRewards()
      ).to.emit(testSuite.contracts.rewardPool, "RewardsClaimed");
    });
  });
});