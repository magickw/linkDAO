import { expect } from "chai";
import { ethers } from "hardhat";

describe("Enhanced Social Features", function () {
  let profileRegistry: any;
  let followModule: any;
  let tipRouter: any;
  let socialReputationToken: any;
  let ldaoToken: any;
  let rewardPool: any;
  
  let owner: any;
  let addr1: any;
  let addr2: any;
  let addr3: any;
  
  const minTipAmount = ethers.parseEther("1"); // 1 LDAO
  const maxTipAmount = ethers.parseEther("10000"); // 10,000 LDAO

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    
    // Deploy mock LDAO token
    const LDAOToken = await ethers.getContractFactory("LDAOToken");
    ldaoToken = await LDAOToken.deploy();
    await ldaoToken.waitForDeployment();
    
    // Mint tokens to test accounts
    await ldaoToken.mint(addr1.address, ethers.parseEther("10000"));
    await ldaoToken.mint(addr2.address, ethers.parseEther("10000"));
    await ldaoToken.mint(addr3.address, ethers.parseEther("10000"));
    
    // Deploy mock reward pool
    const RewardPool = await ethers.getContractFactory("RewardPool");
    rewardPool = await RewardPool.deploy(
      await ldaoToken.getAddress(),
      owner.address // governance
    );
    await rewardPool.waitForDeployment();
    
    // Deploy enhanced ProfileRegistry
    const ProfileRegistry = await ethers.getContractFactory("ProfileRegistry");
    profileRegistry = await ProfileRegistry.deploy();
    await profileRegistry.waitForDeployment();
    
    // Deploy enhanced FollowModule
    const FollowModule = await ethers.getContractFactory("FollowModule");
    followModule = await FollowModule.deploy(await profileRegistry.getAddress());
    await followModule.waitForDeployment();
    
    // Deploy enhanced TipRouter
    const TipRouter = await ethers.getContractFactory("TipRouter");
    tipRouter = await TipRouter.deploy(
      await ldaoToken.getAddress(),
      await rewardPool.getAddress()
    );
    await tipRouter.waitForDeployment();
    
    // Deploy SocialReputationToken
    const SocialReputationToken = await ethers.getContractFactory("SocialReputationToken");
    socialReputationToken = await SocialReputationToken.deploy(
      await profileRegistry.getAddress(),
      await followModule.getAddress(),
      await tipRouter.getAddress()
    );
    await socialReputationToken.waitForDeployment();
  });

  describe("ProfileRegistry", function () {
    it("Should allow creating multiple profiles per address", async function () {
      // Create first profile
      await profileRegistry.connect(addr1).createProfile(
        "user1",
        "user1.eth",
        "QmAvatar1",
        "QmBio1"
      );
      
      // Create second profile
      await profileRegistry.connect(addr1).createProfile(
        "user1-professional",
        "user1-professional.eth",
        "QmAvatar2",
        "QmBio2"
      );
      
      // Get all profiles for addr1
      const profiles = await profileRegistry.getProfilesByAddress(addr1.address);
      expect(profiles.length).to.equal(2);
    });
    
    it("Should allow setting primary profile", async function () {
      // Create profiles
      await profileRegistry.connect(addr1).createProfile(
        "user1",
        "user1.eth",
        "QmAvatar1",
        "QmBio1"
      );
      
      await profileRegistry.connect(addr1).createProfile(
        "user1-professional",
        "user1-professional.eth",
        "QmAvatar2",
        "QmBio2"
      );
      
      const profiles = await profileRegistry.getProfilesByAddress(addr1.address);
      const secondProfileId = profiles[1];
      
      // Set second profile as primary
      await profileRegistry.connect(addr1).setPrimaryProfile(secondProfileId);
      
      const primaryProfile = await profileRegistry.primaryProfile(addr1.address);
      expect(primaryProfile).to.equal(secondProfileId);
    });
    
    it("Should allow setting profile visibility", async function () {
      // Create profile
      await profileRegistry.connect(addr1).createProfile(
        "user1",
        "user1.eth",
        "QmAvatar1",
        "QmBio1"
      );
      
      const profiles = await profileRegistry.getProfilesByAddress(addr1.address);
      const profileId = profiles[0];
      
      // Set visibility to Private (2)
      await profileRegistry.connect(addr1).setProfileVisibility(profileId, 2);
      
      const profile = await profileRegistry.profiles(profileId);
      expect(profile.visibility).to.equal(2);
    });
    
    it("Should allow adding social links", async function () {
      // Create profile
      await profileRegistry.connect(addr1).createProfile(
        "user1",
        "user1.eth",
        "QmAvatar1",
        "QmBio1"
      );
      
      const profiles = await profileRegistry.getProfilesByAddress(addr1.address);
      const profileId = profiles[0];
      
      // Add social link
      await profileRegistry.connect(addr1).setSocialLink(
        profileId,
        "twitter",
        "https://twitter.com/user1"
      );
      
      const twitterLink = await profileRegistry.getSocialLink(profileId, "twitter");
      expect(twitterLink).to.equal("https://twitter.com/user1");
    });
  });

  describe("FollowModule", function () {
    it("Should allow following and unfollowing", async function () {
      // addr1 follows addr2
      await followModule.connect(addr1).follow(addr2.address);
      
      // Check follow status
      expect(await followModule.isFollowing(addr1.address, addr2.address)).to.be.true;
      expect(await followModule.followerCount(addr2.address)).to.equal(1);
      expect(await followModule.followingCount(addr1.address)).to.equal(1);
      
      // addr1 unfollows addr2
      await followModule.connect(addr1).unfollow(addr2.address);
      
      // Check unfollow status
      expect(await followModule.isFollowing(addr1.address, addr2.address)).to.be.false;
      expect(await followModule.followerCount(addr2.address)).to.equal(0);
      expect(await followModule.followingCount(addr1.address)).to.equal(0);
    });
    
    it("Should allow muting and unmuting users", async function () {
      // addr1 mutes addr2
      await followModule.connect(addr1).muteUser(addr2.address);
      
      // Check mute status
      expect(await followModule.isMuted(addr1.address, addr2.address)).to.be.true;
      
      // addr1 unmutes addr2
      await followModule.connect(addr1).unmuteUser(addr2.address);
      
      // Check unmute status
      expect(await followModule.isMuted(addr1.address, addr2.address)).to.be.false;
    });
    
    it("Should allow creating and managing follow lists", async function () {
      // addr1 follows addr2
      await followModule.connect(addr1).follow(addr2.address);
      
      // Add addr2 to "Friends" list
      await followModule.connect(addr1).addToFollowList("Friends", addr2.address);
      
      // Get the list
      const friendsList = await followModule.getFollowList("Friends");
      expect(friendsList.length).to.equal(1);
      expect(friendsList[0]).to.equal(addr2.address);
      
      // Get user's lists
      const userLists = await followModule.getUserLists(addr2.address);
      expect(userLists.length).to.equal(1);
      expect(userLists[0]).to.equal("Friends");
    });
    
    it("Should allow setting follow tiers", async function () {
      // addr1 follows addr2
      await followModule.connect(addr1).follow(addr2.address);
      
      // Set follow tier to CloseFriend (2)
      await followModule.connect(addr1).setFollowTier(addr2.address, 2);
      
      const tier = await followModule.followTiers(addr1.address, addr2.address);
      expect(tier).to.equal(2);
    });
  });

  describe("TipRouter", function () {
    beforeEach(async function () {
      // Approve TipRouter to spend tokens
      await ldaoToken.connect(addr1).approve(await tipRouter.getAddress(), ethers.parseEther("10000"));
      await ldaoToken.connect(addr2).approve(await tipRouter.getAddress(), ethers.parseEther("10000"));
    });
    
    it("Should allow standard tipping", async function () {
      const postId = ethers.encodeBytes32String("post1");
      const tipAmount = ethers.parseEther("10"); // 10 LDAO
      
      // addr1 tips addr2
      await expect(tipRouter.connect(addr1).tip(postId, addr2.address, tipAmount))
        .to.emit(tipRouter, "Tipped")
        .withArgs(postId, addr1.address, addr2.address, tipAmount, ethers.parseEther("1")); // 10% fee
      
      // Check balances
      const fee = tipAmount / 10n; // 10%
      const creatorAmount = tipAmount - fee;
      
      expect(await ldaoToken.balanceOf(addr2.address)).to.equal(ethers.parseEther("10000") + creatorAmount);
      expect(await ldaoToken.balanceOf(await rewardPool.getAddress())).to.equal(fee);
    });
    
    it("Should allow tipping with comments", async function () {
      const postId = ethers.encodeBytes32String("post1");
      const tipAmount = ethers.parseEther("10");
      const comment = "Great post!";
      
      await expect(tipRouter.connect(addr1).tipWithComment(postId, addr2.address, tipAmount, comment))
        .to.emit(tipRouter, "TipCommentAdded")
        .withArgs(postId, addr1.address, addr2.address, comment);
    });
    
    it("Should enforce tip limits", async function () {
      const postId = ethers.encodeBytes32String("post1");
      
      // Try to tip below minimum
      await expect(tipRouter.connect(addr1).tip(postId, addr2.address, ethers.parseEther("0.5")))
        .to.be.revertedWith("Tip amount too low");
        
      // Try to tip above maximum
      await expect(tipRouter.connect(addr1).tip(postId, addr2.address, ethers.parseEther("15000")))
        .to.be.revertedWith("Tip amount too high");
    });
    
    it("Should allow creating and managing subscriptions", async function () {
      const subscriptionAmount = ethers.parseEther("10");
      const interval = 30 * 24 * 60 * 60; // 30 days
      
      // Create subscription
      await expect(tipRouter.connect(addr1).createSubscription(addr2.address, subscriptionAmount, interval))
        .to.emit(tipRouter, "SubscriptionCreated")
        .withArgs(addr1.address, addr2.address, subscriptionAmount, interval);
      
      // Check subscription
      const subscription = await tipRouter.getSubscription(addr1.address, addr2.address);
      expect(subscription.amount).to.equal(subscriptionAmount);
      expect(subscription.interval).to.equal(interval);
      expect(subscription.active).to.be.true;
      
      // Cancel subscription
      await expect(tipRouter.connect(addr1).cancelSubscription(addr2.address))
        .to.emit(tipRouter, "SubscriptionCancelled")
        .withArgs(addr1.address, addr2.address);
    });
    
    it("Should support tiered fee structure", async function () {
      // Update fee tiers
      const feeTiers = [
        { threshold: 0, feeBps: 1000 }, // 10% for amounts < 100 LDAO
        { threshold: ethers.parseEther("100"), feeBps: 500 }, // 5% for amounts >= 100 LDAO
        { threshold: ethers.parseEther("1000"), feeBps: 250 } // 2.5% for amounts >= 1000 LDAO
      ];
      
      await tipRouter.setFeeTiers(feeTiers);
      
      // Test different tip amounts
      const postId = ethers.encodeBytes32String("post1");
      
      // Small tip (10 LDAO) - should have 10% fee
      let tipAmount = ethers.parseEther("10");
      let expectedFee = tipAmount * 1000n / 10000n;
      expect(await tipRouter.calculateFee(tipAmount)).to.equal(expectedFee);
      
      // Medium tip (500 LDAO) - should have 5% fee
      tipAmount = ethers.parseEther("500");
      expectedFee = tipAmount * 500n / 10000n;
      expect(await tipRouter.calculateFee(tipAmount)).to.equal(expectedFee);
      
      // Large tip (2000 LDAO) - should have 2.5% fee
      tipAmount = ethers.parseEther("2000");
      expectedFee = tipAmount * 250n / 10000n;
      expect(await tipRouter.calculateFee(tipAmount)).to.equal(expectedFee);
    });
  });

  describe("SocialReputationToken", function () {
    it("Should allow updating reputation scores", async function () {
      const reputationScore = 100;
      
      // Update reputation for addr1
      await socialReputationToken.updateReputation(addr1.address, reputationScore);
      
      // Check reputation
      expect(await socialReputationToken.getReputation(addr1.address)).to.equal(reputationScore);
      expect(await socialReputationToken.balanceOf(addr1.address)).to.equal(reputationScore);
    });
    
    it("Should allow batch updating reputation scores", async function () {
      const users = [addr1.address, addr2.address, addr3.address];
      const scores = [100, 200, 300];
      
      // Batch update
      await socialReputationToken.batchUpdateReputation(users, scores);
      
      // Check reputations
      for (let i = 0; i < users.length; i++) {
        expect(await socialReputationToken.getReputation(users[i])).to.equal(scores[i]);
        expect(await socialReputationToken.balanceOf(users[i])).to.equal(scores[i]);
      }
    });
    
    it("Should have correct token details", async function () {
      expect(await socialReputationToken.name()).to.equal("LinkDAO Reputation");
      expect(await socialReputationToken.symbol()).to.equal("LREP");
    });
  });
});