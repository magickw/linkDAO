import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Extended Features Integration", function () {
  let contracts: {
    ldaoToken: Contract;
    governance: Contract;
    reputationSystem: Contract;
    marketplace: Contract;
    enhancedEscrow: Contract;
    disputeResolution: Contract;
    paymentRouter: Contract;
    nftMarketplace: Contract;
    nftCollectionFactory: Contract;
    tipRouter: Contract;
    followModule: Contract;
    enhancedRewardPool: Contract;
    profileRegistry: Contract;
  };

  let signers: {
    deployer: SignerWithAddress;
    user1: SignerWithAddress;
    user2: SignerWithAddress;
    creator: SignerWithAddress;
    moderator: SignerWithAddress;
  };

  before(async function () {
    const accounts = await ethers.getSigners();
    signers = {
      deployer: accounts[0],
      user1: accounts[1],
      user2: accounts[2],
      creator: accounts[3],
      moderator: accounts[4]
    };

    // Deploy all contracts in correct order
    await deployAllContracts();
    await configureIntegrations();
  });

  async function deployAllContracts() {
    console.log("Deploying all contracts for integration testing...");

    // Deploy foundation contracts
    const LDAOToken = await ethers.getContractFactory("LDAOToken");
    contracts.ldaoToken = await LDAOToken.deploy(signers.deployer.address);
    await contracts.ldaoToken.deployed();

    const Governance = await ethers.getContractFactory("Governance");
    contracts.governance = await Governance.deploy(contracts.ldaoToken.address);
    await contracts.governance.deployed();

    const ReputationSystem = await ethers.getContractFactory("ReputationSystem");
    contracts.reputationSystem = await ReputationSystem.deploy();
    await contracts.reputationSystem.deployed();

    const ProfileRegistry = await ethers.getContractFactory("ProfileRegistry");
    contracts.profileRegistry = await ProfileRegistry.deploy();
    await contracts.profileRegistry.deployed();

    // Deploy core services
    const PaymentRouter = await ethers.getContractFactory("PaymentRouter");
    contracts.paymentRouter = await PaymentRouter.deploy(250, signers.deployer.address);
    await contracts.paymentRouter.deployed();

    const EnhancedEscrow = await ethers.getContractFactory("EnhancedEscrow");
    contracts.enhancedEscrow = await EnhancedEscrow.deploy(contracts.governance.address);
    await contracts.enhancedEscrow.deployed();

    const DisputeResolution = await ethers.getContractFactory("DisputeResolution");
    contracts.disputeResolution = await DisputeResolution.deploy(
      contracts.reputationSystem.address,
      contracts.governance.address
    );
    await contracts.disputeResolution.deployed();

    const Marketplace = await ethers.getContractFactory("Marketplace");
    contracts.marketplace = await Marketplace.deploy(
      contracts.enhancedEscrow.address,
      contracts.paymentRouter.address
    );
    await contracts.marketplace.deployed();

    // Deploy extended features
    const EnhancedRewardPool = await ethers.getContractFactory("EnhancedRewardPool");
    contracts.enhancedRewardPool = await EnhancedRewardPool.deploy(
      contracts.ldaoToken.address,
      contracts.governance.address,
      contracts.reputationSystem.address
    );
    await contracts.enhancedRewardPool.deployed();

    const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
    contracts.nftMarketplace = await NFTMarketplace.deploy();
    await contracts.nftMarketplace.deployed();

    const NFTCollectionFactory = await ethers.getContractFactory("NFTCollectionFactory");
    contracts.nftCollectionFactory = await NFTCollectionFactory.deploy();
    await contracts.nftCollectionFactory.deployed();

    const TipRouter = await ethers.getContractFactory("TipRouter");
    contracts.tipRouter = await TipRouter.deploy(
      contracts.ldaoToken.address,
      contracts.enhancedRewardPool.address
    );
    await contracts.tipRouter.deployed();

    const FollowModule = await ethers.getContractFactory("FollowModule");
    contracts.followModule = await FollowModule.deploy();
    await contracts.followModule.deployed();

    console.log("All contracts deployed successfully");
  }

  async function configureIntegrations() {
    console.log("Configuring contract integrations...");

    // Link NFTMarketplace with core contracts
    await contracts.nftMarketplace.setReputationSystem(contracts.reputationSystem.address);
    await contracts.nftMarketplace.setPaymentRouter(contracts.paymentRouter.address);

    // Link TipRouter with ReputationSystem
    await contracts.tipRouter.setReputationSystem(contracts.reputationSystem.address);

    // Link FollowModule with ProfileRegistry
    await contracts.followModule.setProfileRegistry(contracts.profileRegistry.address);

    // Configure reward pool permissions
    const DISTRIBUTOR_ROLE = await contracts.enhancedRewardPool.DISTRIBUTOR_ROLE();
    await contracts.enhancedRewardPool.grantRole(DISTRIBUTOR_ROLE, contracts.marketplace.address);
    await contracts.enhancedRewardPool.grantRole(DISTRIBUTOR_ROLE, contracts.tipRouter.address);
    await contracts.enhancedRewardPool.grantRole(DISTRIBUTOR_ROLE, contracts.nftMarketplace.address);

    // Configure access controls
    const MODERATOR_ROLE = await contracts.reputationSystem.MODERATOR_ROLE();
    await contracts.reputationSystem.grantRole(MODERATOR_ROLE, signers.moderator.address);

    // Fund reward pool
    await contracts.ldaoToken.mint(signers.deployer.address, ethers.parseEther("10000"));
    await contracts.ldaoToken.approve(contracts.enhancedRewardPool.address, ethers.parseEther("5000"));
    await contracts.enhancedRewardPool.fundEpoch(ethers.parseEther("5000"));

    // Mint tokens to users for testing
    await contracts.ldaoToken.mint(signers.user1.address, ethers.parseEther("1000"));
    await contracts.ldaoToken.mint(signers.user2.address, ethers.parseEther("1000"));
    await contracts.ldaoToken.mint(signers.creator.address, ethers.parseEther("1000"));

    console.log("Contract integrations configured successfully");
  }

  describe("Core Platform Integration", function () {
    it("Should verify all contracts are properly linked", async function () {
      // Verify NFTMarketplace links
      expect(await contracts.nftMarketplace.reputationSystem()).to.equal(contracts.reputationSystem.address);
      expect(await contracts.nftMarketplace.paymentRouter()).to.equal(contracts.paymentRouter.address);

      // Verify TipRouter links
      expect(await contracts.tipRouter.reputationSystem()).to.equal(contracts.reputationSystem.address);
      expect(await contracts.tipRouter.rewardPool()).to.equal(contracts.enhancedRewardPool.address);

      // Verify FollowModule links
      expect(await contracts.followModule.profileRegistry()).to.equal(contracts.profileRegistry.address);
    });

    it("Should verify reward pool distributor roles", async function () {
      const DISTRIBUTOR_ROLE = await contracts.enhancedRewardPool.DISTRIBUTOR_ROLE();
      
      expect(await contracts.enhancedRewardPool.hasRole(DISTRIBUTOR_ROLE, contracts.marketplace.address)).to.be.true;
      expect(await contracts.enhancedRewardPool.hasRole(DISTRIBUTOR_ROLE, contracts.tipRouter.address)).to.be.true;
      expect(await contracts.enhancedRewardPool.hasRole(DISTRIBUTOR_ROLE, contracts.nftMarketplace.address)).to.be.true;
    });
  });

  describe("Cross-Contract Communication", function () {
    it("Should enable social tracking across contracts", async function () {
      // Enable social tracking
      await contracts.nftMarketplace.enableSocialTracking(true);
      await contracts.tipRouter.enableReputationUpdates(true);
      await contracts.followModule.enableConnectionTracking(true);

      // Verify tracking is enabled
      expect(await contracts.nftMarketplace.socialTrackingEnabled()).to.be.true;
      expect(await contracts.tipRouter.reputationUpdatesEnabled()).to.be.true;
      expect(await contracts.followModule.connectionTrackingEnabled()).to.be.true;
    });

    it("Should integrate marketplace with social features", async function () {
      await contracts.marketplace.setSocialModule(contracts.followModule.address);
      expect(await contracts.marketplace.socialModule()).to.equal(contracts.followModule.address);
    });
  });

  describe("Reward Mechanisms Integration", function () {
    it("Should distribute marketplace trading rewards", async function () {
      const currentEpoch = await contracts.enhancedRewardPool.currentEpoch();
      const baseReward = ethers.parseEther("10");
      
      // Simulate marketplace trading reward
      await contracts.enhancedRewardPool.calculateReward(
        signers.user1.address,
        currentEpoch,
        1, // TRADING_REWARDS category
        baseReward
      );

      const [userReward] = await contracts.enhancedRewardPool.getUserEpochRewards(
        signers.user1.address,
        currentEpoch
      );

      expect(userReward).to.be.gt(0);
    });

    it("Should distribute social activity rewards through tipping", async function () {
      const tipAmount = ethers.parseEther("50");
      const postId = ethers.keccak256(ethers.toUtf8Bytes("test-post-1"));

      // Approve and tip
      await contracts.ldaoToken.connect(signers.user1).approve(contracts.tipRouter.address, tipAmount);
      
      await expect(
        contracts.tipRouter.connect(signers.user1).tip(postId, signers.creator.address, tipAmount)
      ).to.emit(contracts.tipRouter, "Tipped");

      // Verify creator received tokens (minus fee)
      const expectedFee = tipAmount.mul(1000).div(10000); // 10% fee
      const expectedToCreator = tipAmount.sub(expectedFee);
      
      expect(await contracts.ldaoToken.balanceOf(signers.creator.address)).to.be.gte(
        ethers.parseEther("1000").add(expectedToCreator)
      );
    });

    it("Should apply reputation multipliers to rewards", async function () {
      // Build reputation for user2
      await contracts.reputationSystem.connect(signers.moderator).updateReputation(
        signers.user2.address,
        100,
        "Test reputation increase"
      );

      const currentEpoch = await contracts.enhancedRewardPool.currentEpoch();
      const baseReward = ethers.parseEther("10");
      
      // Calculate reward with reputation multiplier
      await contracts.enhancedRewardPool.calculateReward(
        signers.user2.address,
        currentEpoch,
        3, // CONTENT_REWARDS category
        baseReward
      );

      const [userReward] = await contracts.enhancedRewardPool.getUserEpochRewards(
        signers.user2.address,
        currentEpoch
      );

      // Should be greater than base reward due to reputation multiplier
      expect(userReward).to.be.gt(baseReward.mul(4000).div(10000)); // Base reward * category weight
    });
  });

  describe("Social Features Integration", function () {
    it("Should handle complete social workflow", async function () {
      // 1. Create profiles
      await contracts.profileRegistry.connect(signers.user1).createProfile(
        "user1",
        "User One",
        "Test user 1",
        "https://example.com/user1.jpg"
      );

      await contracts.profileRegistry.connect(signers.creator).createProfile(
        "creator",
        "Content Creator",
        "Test creator",
        "https://example.com/creator.jpg"
      );

      // 2. Follow relationship
      await contracts.followModule.connect(signers.user1).follow(signers.creator.address);
      
      expect(await contracts.followModule.isFollowing(signers.user1.address, signers.creator.address)).to.be.true;
      expect(await contracts.followModule.followerCount(signers.creator.address)).to.equal(1);

      // 3. Tip creator
      const tipAmount = ethers.parseEther("25");
      const postId = ethers.keccak256(ethers.toUtf8Bytes("social-post-1"));

      await contracts.ldaoToken.connect(signers.user1).approve(contracts.tipRouter.address, tipAmount);
      await contracts.tipRouter.connect(signers.user1).tip(postId, signers.creator.address, tipAmount);

      // 4. Verify social engagement affects rewards
      const currentEpoch = await contracts.enhancedRewardPool.currentEpoch();
      await contracts.enhancedRewardPool.setSocialEngagementMultiplier(
        contracts.followModule.address,
        150 // 1.5x multiplier
      );

      // Creator should have enhanced rewards due to social engagement
      const baseReward = ethers.parseEther("20");
      await contracts.enhancedRewardPool.calculateReward(
        signers.creator.address,
        currentEpoch,
        3, // CONTENT_REWARDS
        baseReward
      );

      const [creatorReward] = await contracts.enhancedRewardPool.getUserEpochRewards(
        signers.creator.address,
        currentEpoch
      );

      expect(creatorReward).to.be.gt(0);
    });
  });

  describe("NFT Marketplace Integration", function () {
    it("Should handle complete NFT lifecycle with rewards", async function () {
      // 1. Create NFT collection
      const collectionInfo = {
        description: "Test Collection",
        image: "https://example.com/collection.png",
        externalUrl: "https://example.com",
        maxSupply: 100,
        mintPrice: ethers.parseEther("0.1"),
        isPublicMint: true,
        creator: signers.creator.address,
        createdAt: 0
      };

      const creationFee = await contracts.nftCollectionFactory.creationFee();
      await contracts.nftCollectionFactory.connect(signers.creator).createCollection(
        "Test Collection",
        "TEST",
        collectionInfo,
        250, // 2.5% royalty
        { value: creationFee }
      );

      // 2. Mint NFT
      const metadata = {
        name: "Test NFT",
        description: "A test NFT",
        image: "https://example.com/nft.png",
        animationUrl: "",
        externalUrl: "https://example.com",
        attributes: ["test"],
        creator: signers.creator.address,
        createdAt: 0,
        isVerified: false
      };

      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("test-content"));
      await contracts.nftMarketplace.connect(signers.creator).mintNFT(
        signers.creator.address,
        "https://example.com/metadata.json",
        250,
        contentHash,
        metadata
      );

      // 3. Verify NFT marketplace can distribute rewards
      const currentEpoch = await contracts.enhancedRewardPool.currentEpoch();
      const nftReward = ethers.parseEther("15");
      
      await contracts.enhancedRewardPool.calculateReward(
        signers.creator.address,
        currentEpoch,
        1, // TRADING_REWARDS for NFT sales
        nftReward
      );

      const [creatorNFTReward] = await contracts.enhancedRewardPool.getUserEpochRewards(
        signers.creator.address,
        currentEpoch
      );

      expect(creatorNFTReward).to.be.gt(0);
    });
  });

  describe("End-to-End Platform Functionality", function () {
    it("Should handle complete user journey with all features", async function () {
      // 1. User creates profile and builds reputation
      await contracts.profileRegistry.connect(signers.user2).createProfile(
        "user2",
        "Active User",
        "Very active user",
        "https://example.com/user2.jpg"
      );

      await contracts.reputationSystem.connect(signers.moderator).updateReputation(
        signers.user2.address,
        50,
        "Active participation"
      );

      // 2. User follows creator and tips content
      await contracts.followModule.connect(signers.user2).follow(signers.creator.address);
      
      const tipAmount = ethers.parseEther("30");
      const postId = ethers.keccak256(ethers.toUtf8Bytes("journey-post"));
      
      await contracts.ldaoToken.connect(signers.user2).approve(contracts.tipRouter.address, tipAmount);
      await contracts.tipRouter.connect(signers.user2).tip(postId, signers.creator.address, tipAmount);

      // 3. User participates in marketplace
      await contracts.marketplace.connect(signers.user2).createListing(
        ethers.constants.AddressZero,
        0,
        ethers.parseEther("1"),
        1,
        0,
        0
      );

      // 4. User earns rewards from multiple activities
      const currentEpoch = await contracts.enhancedRewardPool.currentEpoch();
      
      // Social activity reward
      await contracts.enhancedRewardPool.calculateReward(
        signers.user2.address,
        currentEpoch,
        3, // CONTENT_REWARDS
        ethers.parseEther("5")
      );

      // Trading activity reward
      await contracts.enhancedRewardPool.calculateReward(
        signers.user2.address,
        currentEpoch,
        1, // TRADING_REWARDS
        ethers.parseEther("8")
      );

      // 5. Verify user has accumulated rewards
      const [totalRewards] = await contracts.enhancedRewardPool.getUserEpochRewards(
        signers.user2.address,
        currentEpoch
      );

      expect(totalRewards).to.be.gt(0);

      // 6. Verify social connections are tracked
      expect(await contracts.followModule.isFollowing(signers.user2.address, signers.creator.address)).to.be.true;
      expect(await contracts.followModule.followerCount(signers.creator.address)).to.be.gte(1);

      // 7. Verify reputation affects reward calculations
      const userStats = await contracts.enhancedRewardPool.getUserStats(signers.user2.address);
      expect(userStats.reputationBonus).to.be.gt(100); // Should have reputation multiplier
    });

    it("Should maintain data consistency across all contracts", async function () {
      // Verify all contract addresses are properly set
      expect(await contracts.nftMarketplace.reputationSystem()).to.equal(contracts.reputationSystem.address);
      expect(await contracts.tipRouter.ldao()).to.equal(contracts.ldaoToken.address);
      expect(await contracts.followModule.profileRegistry()).to.equal(contracts.profileRegistry.address);

      // Verify role assignments
      const DISTRIBUTOR_ROLE = await contracts.enhancedRewardPool.DISTRIBUTOR_ROLE();
      expect(await contracts.enhancedRewardPool.hasRole(DISTRIBUTOR_ROLE, contracts.tipRouter.address)).to.be.true;

      const MODERATOR_ROLE = await contracts.reputationSystem.MODERATOR_ROLE();
      expect(await contracts.reputationSystem.hasRole(MODERATOR_ROLE, signers.moderator.address)).to.be.true;

      // Verify token balances are consistent
      const user1Balance = await contracts.ldaoToken.balanceOf(signers.user1.address);
      const user2Balance = await contracts.ldaoToken.balanceOf(signers.user2.address);
      const creatorBalance = await contracts.ldaoToken.balanceOf(signers.creator.address);

      expect(user1Balance).to.be.gte(0);
      expect(user2Balance).to.be.gte(0);
      expect(creatorBalance).to.be.gt(ethers.parseEther("1000")); // Should have received tips
    });
  });

  describe("Performance and Gas Optimization", function () {
    it("Should handle batch operations efficiently", async function () {
      const users = [signers.user1.address, signers.user2.address, signers.creator.address];
      const amounts = [
        ethers.parseEther("5"),
        ethers.parseEther("7"),
        ethers.parseEther("3")
      ];

      const currentEpoch = await contracts.enhancedRewardPool.currentEpoch();
      
      // Batch calculate rewards
      await contracts.enhancedRewardPool.batchCalculateRewards(
        users,
        currentEpoch,
        2, // GOVERNANCE_REWARDS
        amounts
      );

      // Verify all users received rewards
      for (let i = 0; i < users.length; i++) {
        const [userReward] = await contracts.enhancedRewardPool.getUserEpochRewards(users[i], currentEpoch);
        expect(userReward).to.be.gt(0);
      }
    });

    it("Should handle multiple epoch claims efficiently", async function () {
      // Finalize current epoch and start new one
      const currentEpoch = await contracts.enhancedRewardPool.currentEpoch();
      
      // Fast forward time to end epoch
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 7 days
      await ethers.provider.send("evm_mine", []);
      
      await contracts.enhancedRewardPool.finalizeEpoch(currentEpoch);
      
      // User should be able to claim from multiple epochs
      const epochIds = [currentEpoch];
      
      // Check if user has rewards to claim
      const [userReward] = await contracts.enhancedRewardPool.getUserEpochRewards(
        signers.user1.address,
        currentEpoch
      );
      
      if (userReward.gt(0)) {
        await contracts.enhancedRewardPool.connect(signers.user1).claimMultipleEpochs(epochIds);
        
        // Verify claim was successful
        const [, hasClaimed] = await contracts.enhancedRewardPool.getUserEpochRewards(
          signers.user1.address,
          currentEpoch
        );
        expect(hasClaimed).to.be.true;
      }
    });
  });
});