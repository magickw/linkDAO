import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("TipRouter", function () {
  let tipRouter: Contract;
  let ldaoToken: Contract;
  let rewardPool: Contract;
  let owner: SignerWithAddress;
  let creator: SignerWithAddress;
  let tipper: SignerWithAddress;

  beforeEach(async function () {
    [owner, creator, tipper] = await ethers.getSigners();

    // Deploy mock LDAO token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    ldaoToken = await MockERC20.deploy("LinkDAO Token", "LDAO", 18);
    await ldaoToken.deployed();

    // Deploy mock reward pool (simple contract to receive tokens)
    const MockRewardPool = await ethers.getContractFactory("MockERC20");
    rewardPool = await MockRewardPool.deploy("Reward Pool", "POOL", 18);
    await rewardPool.deployed();

    // Deploy TipRouter
    const TipRouter = await ethers.getContractFactory("TipRouter");
    tipRouter = await TipRouter.deploy(ldaoToken.address, rewardPool.address);
    await tipRouter.deployed();

    // Mint tokens to tipper
    await ldaoToken.mint(tipper.address, ethers.parseEther("1000"));
  });

  describe("Deployment", function () {
    it("Should set the correct LDAO token address", async function () {
      expect(await tipRouter.ldao()).to.equal(ldaoToken.address);
    });

    it("Should set the correct reward pool address", async function () {
      expect(await tipRouter.rewardPool()).to.equal(rewardPool.address);
    });

    it("Should set initial fee to 10%", async function () {
      expect(await tipRouter.feeBps()).to.equal(1000); // 10% in basis points
    });

    it("Should set the correct owner", async function () {
      expect(await tipRouter.owner()).to.equal(owner.address);
    });
  });

  describe("Fee Management", function () {
    it("Should allow owner to update fee", async function () {
      await tipRouter.connect(owner).setFeeBps(500); // 5%
      expect(await tipRouter.feeBps()).to.equal(500);
    });

    it("Should prevent setting fee above 20%", async function () {
      await expect(
        tipRouter.connect(owner).setFeeBps(2500) // 25%
      ).to.be.revertedWith("max 20%");
    });

    it("Should prevent non-owner from updating fee", async function () {
      await expect(
        tipRouter.connect(tipper).setFeeBps(500)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Tipping Functionality", function () {
    beforeEach(async function () {
      // Approve TipRouter to spend tipper's tokens
      await ldaoToken.connect(tipper).approve(tipRouter.address, ethers.parseEther("100"));
    });

    it("Should allow tipping with correct fee distribution", async function () {
      const tipAmount = ethers.parseEther("10");
      const expectedFee = tipAmount.mul(1000).div(10000); // 10% fee
      const expectedToCreator = tipAmount.sub(expectedFee);

      const postId = ethers.keccak256(ethers.toUtf8Bytes("test-post-1"));

      await expect(
        tipRouter.connect(tipper).tip(postId, creator.address, tipAmount)
      ).to.emit(tipRouter, "Tipped")
        .withArgs(postId, tipper.address, creator.address, tipAmount, expectedFee);

      // Check balances
      expect(await ldaoToken.balanceOf(creator.address)).to.equal(expectedToCreator);
      expect(await ldaoToken.balanceOf(rewardPool.address)).to.equal(expectedFee);
    });

    it("Should fail if insufficient allowance", async function () {
      const tipAmount = ethers.parseEther("200"); // More than approved
      const postId = ethers.keccak256(ethers.toUtf8Bytes("test-post-1"));

      await expect(
        tipRouter.connect(tipper).tip(postId, creator.address, tipAmount)
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });

    it("Should fail if insufficient balance", async function () {
      // Approve large amount but tipper doesn't have enough tokens
      await ldaoToken.connect(tipper).approve(tipRouter.address, ethers.parseEther("2000"));
      
      const tipAmount = ethers.parseEther("1500"); // More than balance
      const postId = ethers.keccak256(ethers.toUtf8Bytes("test-post-1"));

      await expect(
        tipRouter.connect(tipper).tip(postId, creator.address, tipAmount)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("Should handle zero fee correctly", async function () {
      // Set fee to 0%
      await tipRouter.connect(owner).setFeeBps(0);

      const tipAmount = ethers.parseEther("10");
      const postId = ethers.keccak256(ethers.toUtf8Bytes("test-post-1"));

      await tipRouter.connect(tipper).tip(postId, creator.address, tipAmount);

      // All amount should go to creator
      expect(await ldaoToken.balanceOf(creator.address)).to.equal(tipAmount);
      expect(await ldaoToken.balanceOf(rewardPool.address)).to.equal(0);
    });

    it("Should handle maximum fee correctly", async function () {
      // Set fee to 20% (maximum)
      await tipRouter.connect(owner).setFeeBps(2000);

      const tipAmount = ethers.parseEther("10");
      const expectedFee = tipAmount.mul(2000).div(10000); // 20% fee
      const expectedToCreator = tipAmount.sub(expectedFee);
      const postId = ethers.keccak256(ethers.toUtf8Bytes("test-post-1"));

      await tipRouter.connect(tipper).tip(postId, creator.address, tipAmount);

      expect(await ldaoToken.balanceOf(creator.address)).to.equal(expectedToCreator);
      expect(await ldaoToken.balanceOf(rewardPool.address)).to.equal(expectedFee);
    });
  });

  describe("Permit and Tip Functionality", function () {
    it("Should support permit and tip in one transaction", async function () {
      // This test verifies the function exists and can be called
      // Full permit testing would require signature generation
      const tipAmount = ethers.parseEther("10");
      const postId = ethers.keccak256(ethers.toUtf8Bytes("test-post-1"));
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      // This will fail due to invalid signature, but verifies the function exists
      await expect(
        tipRouter.connect(tipper).permitAndTip(
          postId,
          creator.address,
          tipAmount,
          deadline,
          27, // v
          "0x0000000000000000000000000000000000000000000000000000000000000000", // r
          "0x0000000000000000000000000000000000000000000000000000000000000000"  // s
        )
      ).to.be.reverted; // Will fail due to invalid signature, but function exists
    });
  });

  describe("Multiple Tips", function () {
    beforeEach(async function () {
      await ldaoToken.connect(tipper).approve(tipRouter.address, ethers.parseEther("100"));
    });

    it("Should handle multiple tips correctly", async function () {
      const tipAmount1 = ethers.parseEther("5");
      const tipAmount2 = ethers.parseEther("3");
      const postId1 = ethers.keccak256(ethers.toUtf8Bytes("test-post-1"));
      const postId2 = ethers.keccak256(ethers.toUtf8Bytes("test-post-2"));

      await tipRouter.connect(tipper).tip(postId1, creator.address, tipAmount1);
      await tipRouter.connect(tipper).tip(postId2, creator.address, tipAmount2);

      const totalTipped = tipAmount1.add(tipAmount2);
      const totalFee = totalTipped.mul(1000).div(10000); // 10% fee
      const totalToCreator = totalTipped.sub(totalFee);

      expect(await ldaoToken.balanceOf(creator.address)).to.equal(totalToCreator);
      expect(await ldaoToken.balanceOf(rewardPool.address)).to.equal(totalFee);
    });

    it("Should handle tips to different creators", async function () {
      const [, , , creator2] = await ethers.getSigners();
      
      const tipAmount = ethers.parseEther("10");
      const expectedFee = tipAmount.mul(1000).div(10000); // 10% fee
      const expectedToCreator = tipAmount.sub(expectedFee);
      
      const postId1 = ethers.keccak256(ethers.toUtf8Bytes("test-post-1"));
      const postId2 = ethers.keccak256(ethers.toUtf8Bytes("test-post-2"));

      await tipRouter.connect(tipper).tip(postId1, creator.address, tipAmount);
      await tipRouter.connect(tipper).tip(postId2, creator2.address, tipAmount);

      // Each creator should receive the same amount
      expect(await ldaoToken.balanceOf(creator.address)).to.equal(expectedToCreator);
      expect(await ldaoToken.balanceOf(creator2.address)).to.equal(expectedToCreator);
      
      // Reward pool should receive fees from both tips
      expect(await ldaoToken.balanceOf(rewardPool.address)).to.equal(expectedFee.mul(2));
    });
  });
});