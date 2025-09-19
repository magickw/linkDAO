import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("FollowModule", function () {
  let followModule: Contract;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    const FollowModule = await ethers.getContractFactory("FollowModule");
    followModule = await FollowModule.deploy();
    await followModule.deployed();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await followModule.owner()).to.equal(owner.address);
    });

    it("Should initialize with zero followers and following", async function () {
      expect(await followModule.followerCount(user1.address)).to.equal(0);
      expect(await followModule.followingCount(user1.address)).to.equal(0);
    });
  });

  describe("Follow Functionality", function () {
    it("Should allow user to follow another user", async function () {
      await expect(
        followModule.connect(user1).follow(user2.address)
      ).to.emit(followModule, "Followed")
        .withArgs(user1.address, user2.address);

      expect(await followModule.isFollowing(user1.address, user2.address)).to.be.true;
      expect(await followModule.followerCount(user2.address)).to.equal(1);
      expect(await followModule.followingCount(user1.address)).to.equal(1);
    });

    it("Should prevent following yourself", async function () {
      await expect(
        followModule.connect(user1).follow(user1.address)
      ).to.be.revertedWith("Cannot follow yourself");
    });

    it("Should prevent following zero address", async function () {
      await expect(
        followModule.connect(user1).follow(ethers.constants.AddressZero)
      ).to.be.revertedWith("Invalid address");
    });

    it("Should prevent following the same user twice", async function () {
      await followModule.connect(user1).follow(user2.address);
      
      await expect(
        followModule.connect(user1).follow(user2.address)
      ).to.be.revertedWith("Already following");
    });

    it("Should handle multiple followers correctly", async function () {
      await followModule.connect(user1).follow(user3.address);
      await followModule.connect(user2).follow(user3.address);

      expect(await followModule.followerCount(user3.address)).to.equal(2);
      expect(await followModule.isFollowing(user1.address, user3.address)).to.be.true;
      expect(await followModule.isFollowing(user2.address, user3.address)).to.be.true;
    });

    it("Should handle user following multiple users", async function () {
      await followModule.connect(user1).follow(user2.address);
      await followModule.connect(user1).follow(user3.address);

      expect(await followModule.followingCount(user1.address)).to.equal(2);
      expect(await followModule.isFollowing(user1.address, user2.address)).to.be.true;
      expect(await followModule.isFollowing(user1.address, user3.address)).to.be.true;
    });
  });

  describe("Unfollow Functionality", function () {
    beforeEach(async function () {
      // Set up initial follow relationship
      await followModule.connect(user1).follow(user2.address);
    });

    it("Should allow user to unfollow another user", async function () {
      await expect(
        followModule.connect(user1).unfollow(user2.address)
      ).to.emit(followModule, "Unfollowed")
        .withArgs(user1.address, user2.address);

      expect(await followModule.isFollowing(user1.address, user2.address)).to.be.false;
      expect(await followModule.followerCount(user2.address)).to.equal(0);
      expect(await followModule.followingCount(user1.address)).to.equal(0);
    });

    it("Should prevent unfollowing zero address", async function () {
      await expect(
        followModule.connect(user1).unfollow(ethers.constants.AddressZero)
      ).to.be.revertedWith("Invalid address");
    });

    it("Should prevent unfollowing user not being followed", async function () {
      await expect(
        followModule.connect(user1).unfollow(user3.address)
      ).to.be.revertedWith("Not following");
    });

    it("Should handle unfollowing after multiple follows", async function () {
      // Add more follow relationships
      await followModule.connect(user1).follow(user3.address);
      await followModule.connect(user2).follow(user3.address);

      // Unfollow one user
      await followModule.connect(user1).unfollow(user2.address);

      // Check states
      expect(await followModule.isFollowing(user1.address, user2.address)).to.be.false;
      expect(await followModule.isFollowing(user1.address, user3.address)).to.be.true;
      expect(await followModule.followerCount(user2.address)).to.equal(0);
      expect(await followModule.followerCount(user3.address)).to.equal(2);
      expect(await followModule.followingCount(user1.address)).to.equal(1);
    });
  });

  describe("Follow/Unfollow Cycles", function () {
    it("Should handle follow and unfollow cycles correctly", async function () {
      // Follow
      await followModule.connect(user1).follow(user2.address);
      expect(await followModule.isFollowing(user1.address, user2.address)).to.be.true;
      expect(await followModule.followerCount(user2.address)).to.equal(1);
      expect(await followModule.followingCount(user1.address)).to.equal(1);

      // Unfollow
      await followModule.connect(user1).unfollow(user2.address);
      expect(await followModule.isFollowing(user1.address, user2.address)).to.be.false;
      expect(await followModule.followerCount(user2.address)).to.equal(0);
      expect(await followModule.followingCount(user1.address)).to.equal(0);

      // Follow again
      await followModule.connect(user1).follow(user2.address);
      expect(await followModule.isFollowing(user1.address, user2.address)).to.be.true;
      expect(await followModule.followerCount(user2.address)).to.equal(1);
      expect(await followModule.followingCount(user1.address)).to.equal(1);
    });
  });

  describe("Complex Social Graph", function () {
    it("Should handle complex follow relationships", async function () {
      // Create a complex social graph
      // user1 follows user2 and user3
      // user2 follows user3
      // user3 follows user1
      
      await followModule.connect(user1).follow(user2.address);
      await followModule.connect(user1).follow(user3.address);
      await followModule.connect(user2).follow(user3.address);
      await followModule.connect(user3).follow(user1.address);

      // Check all relationships
      expect(await followModule.isFollowing(user1.address, user2.address)).to.be.true;
      expect(await followModule.isFollowing(user1.address, user3.address)).to.be.true;
      expect(await followModule.isFollowing(user2.address, user3.address)).to.be.true;
      expect(await followModule.isFollowing(user3.address, user1.address)).to.be.true;

      // Check counts
      expect(await followModule.followerCount(user1.address)).to.equal(1); // followed by user3
      expect(await followModule.followerCount(user2.address)).to.equal(1); // followed by user1
      expect(await followModule.followerCount(user3.address)).to.equal(2); // followed by user1 and user2
      
      expect(await followModule.followingCount(user1.address)).to.equal(2); // follows user2 and user3
      expect(await followModule.followingCount(user2.address)).to.equal(1); // follows user3
      expect(await followModule.followingCount(user3.address)).to.equal(1); // follows user1
    });

    it("Should maintain correct counts after partial unfollows", async function () {
      // Set up complex relationships
      await followModule.connect(user1).follow(user2.address);
      await followModule.connect(user1).follow(user3.address);
      await followModule.connect(user2).follow(user3.address);

      // Unfollow one relationship
      await followModule.connect(user1).unfollow(user2.address);

      // Check remaining relationships
      expect(await followModule.isFollowing(user1.address, user2.address)).to.be.false;
      expect(await followModule.isFollowing(user1.address, user3.address)).to.be.true;
      expect(await followModule.isFollowing(user2.address, user3.address)).to.be.true;

      // Check updated counts
      expect(await followModule.followerCount(user2.address)).to.equal(0);
      expect(await followModule.followerCount(user3.address)).to.equal(2);
      expect(await followModule.followingCount(user1.address)).to.equal(1);
      expect(await followModule.followingCount(user2.address)).to.equal(1);
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await followModule.connect(user1).follow(user2.address);
      await followModule.connect(user2).follow(user3.address);
    });

    it("Should correctly report following status", async function () {
      expect(await followModule.isFollowing(user1.address, user2.address)).to.be.true;
      expect(await followModule.isFollowing(user2.address, user3.address)).to.be.true;
      expect(await followModule.isFollowing(user1.address, user3.address)).to.be.false;
      expect(await followModule.isFollowing(user3.address, user1.address)).to.be.false;
    });

    it("Should correctly report follower counts", async function () {
      expect(await followModule.followerCount(user1.address)).to.equal(0);
      expect(await followModule.followerCount(user2.address)).to.equal(1);
      expect(await followModule.followerCount(user3.address)).to.equal(1);
    });

    it("Should correctly report following counts", async function () {
      expect(await followModule.followingCount(user1.address)).to.equal(1);
      expect(await followModule.followingCount(user2.address)).to.equal(1);
      expect(await followModule.followingCount(user3.address)).to.equal(0);
    });
  });
});