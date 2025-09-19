import { expect } from "chai";
import { ethers } from "hardhat";
import { MockERC20 } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("MockERC20", function () {
  let mockToken6: MockERC20; // 6 decimals (USDC-like)
  let mockToken8: MockERC20; // 8 decimals (WBTC-like)
  let mockToken18: MockERC20; // 18 decimals (ETH-like)
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    
    // Deploy tokens with different decimals
    mockToken6 = await MockERC20Factory.deploy("Mock USDC", "MUSDC", 6) as MockERC20;
    mockToken8 = await MockERC20Factory.deploy("Mock WBTC", "MWBTC", 8) as MockERC20;
    mockToken18 = await MockERC20Factory.deploy("Mock DAI", "MDAI", 18) as MockERC20;

    await mockToken6.deployed();
    await mockToken8.deployed();
    await mockToken18.deployed();
  });

  describe("Deployment", function () {
    it("Should deploy with correct name, symbol, and decimals", async function () {
      expect(await mockToken6.name()).to.equal("Mock USDC");
      expect(await mockToken6.symbol()).to.equal("MUSDC");
      expect(await mockToken6.decimals()).to.equal(6);

      expect(await mockToken8.name()).to.equal("Mock WBTC");
      expect(await mockToken8.symbol()).to.equal("MWBTC");
      expect(await mockToken8.decimals()).to.equal(8);

      expect(await mockToken18.name()).to.equal("Mock DAI");
      expect(await mockToken18.symbol()).to.equal("MDAI");
      expect(await mockToken18.decimals()).to.equal(18);
    });

    it("Should start with zero total supply", async function () {
      expect(await mockToken6.totalSupply()).to.equal(0);
      expect(await mockToken8.totalSupply()).to.equal(0);
      expect(await mockToken18.totalSupply()).to.equal(0);
    });
  });

  describe("Minting", function () {
    it("Should allow minting tokens with 6 decimals", async function () {
      const mintAmount = ethers.utils.parseUnits("1000", 6); // 1000 MUSDC
      
      await mockToken6.mint(user1.address, mintAmount);
      
      expect(await mockToken6.balanceOf(user1.address)).to.equal(mintAmount);
      expect(await mockToken6.totalSupply()).to.equal(mintAmount);
    });

    it("Should allow minting tokens with 8 decimals", async function () {
      const mintAmount = ethers.utils.parseUnits("10", 8); // 10 MWBTC
      
      await mockToken8.mint(user1.address, mintAmount);
      
      expect(await mockToken8.balanceOf(user1.address)).to.equal(mintAmount);
      expect(await mockToken8.totalSupply()).to.equal(mintAmount);
    });

    it("Should allow minting tokens with 18 decimals", async function () {
      const mintAmount = ethers.utils.parseUnits("1000", 18); // 1000 MDAI
      
      await mockToken18.mint(user1.address, mintAmount);
      
      expect(await mockToken18.balanceOf(user1.address)).to.equal(mintAmount);
      expect(await mockToken18.totalSupply()).to.equal(mintAmount);
    });

    it("Should allow multiple mints to different addresses", async function () {
      const mintAmount1 = ethers.utils.parseUnits("500", 6);
      const mintAmount2 = ethers.utils.parseUnits("300", 6);
      
      await mockToken6.mint(user1.address, mintAmount1);
      await mockToken6.mint(user2.address, mintAmount2);
      
      expect(await mockToken6.balanceOf(user1.address)).to.equal(mintAmount1);
      expect(await mockToken6.balanceOf(user2.address)).to.equal(mintAmount2);
      expect(await mockToken6.totalSupply()).to.equal(mintAmount1.add(mintAmount2));
    });

    it("Should allow anyone to mint (for testing purposes)", async function () {
      const mintAmount = ethers.utils.parseUnits("100", 6);
      
      // User1 mints tokens
      await mockToken6.connect(user1).mint(user2.address, mintAmount);
      
      expect(await mockToken6.balanceOf(user2.address)).to.equal(mintAmount);
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      // Mint some tokens first
      await mockToken6.mint(user1.address, ethers.utils.parseUnits("1000", 6));
      await mockToken8.mint(user1.address, ethers.utils.parseUnits("10", 8));
      await mockToken18.mint(user1.address, ethers.utils.parseUnits("1000", 18));
    });

    it("Should allow burning tokens with 6 decimals", async function () {
      const burnAmount = ethers.utils.parseUnits("200", 6);
      const initialBalance = await mockToken6.balanceOf(user1.address);
      const initialSupply = await mockToken6.totalSupply();
      
      await mockToken6.burn(user1.address, burnAmount);
      
      expect(await mockToken6.balanceOf(user1.address)).to.equal(initialBalance.sub(burnAmount));
      expect(await mockToken6.totalSupply()).to.equal(initialSupply.sub(burnAmount));
    });

    it("Should allow burning tokens with 8 decimals", async function () {
      const burnAmount = ethers.utils.parseUnits("2", 8);
      const initialBalance = await mockToken8.balanceOf(user1.address);
      const initialSupply = await mockToken8.totalSupply();
      
      await mockToken8.burn(user1.address, burnAmount);
      
      expect(await mockToken8.balanceOf(user1.address)).to.equal(initialBalance.sub(burnAmount));
      expect(await mockToken8.totalSupply()).to.equal(initialSupply.sub(burnAmount));
    });

    it("Should allow burning tokens with 18 decimals", async function () {
      const burnAmount = ethers.utils.parseUnits("100", 18);
      const initialBalance = await mockToken18.balanceOf(user1.address);
      const initialSupply = await mockToken18.totalSupply();
      
      await mockToken18.burn(user1.address, burnAmount);
      
      expect(await mockToken18.balanceOf(user1.address)).to.equal(initialBalance.sub(burnAmount));
      expect(await mockToken18.totalSupply()).to.equal(initialSupply.sub(burnAmount));
    });

    it("Should revert when burning more than balance", async function () {
      const burnAmount = ethers.utils.parseUnits("2000", 6); // More than minted
      
      await expect(
        mockToken6.burn(user1.address, burnAmount)
      ).to.be.revertedWith("ERC20: burn amount exceeds balance");
    });

    it("Should allow anyone to burn (for testing purposes)", async function () {
      const burnAmount = ethers.utils.parseUnits("100", 6);
      const initialBalance = await mockToken6.balanceOf(user1.address);
      
      // User2 burns user1's tokens
      await mockToken6.connect(user2).burn(user1.address, burnAmount);
      
      expect(await mockToken6.balanceOf(user1.address)).to.equal(initialBalance.sub(burnAmount));
    });
  });

  describe("ERC20 Standard Compliance", function () {
    beforeEach(async function () {
      await mockToken6.mint(user1.address, ethers.utils.parseUnits("1000", 6));
    });

    it("Should support standard ERC20 transfers", async function () {
      const transferAmount = ethers.utils.parseUnits("100", 6);
      
      await mockToken6.connect(user1).transfer(user2.address, transferAmount);
      
      expect(await mockToken6.balanceOf(user1.address)).to.equal(ethers.utils.parseUnits("900", 6));
      expect(await mockToken6.balanceOf(user2.address)).to.equal(transferAmount);
    });

    it("Should support approve and transferFrom", async function () {
      const approveAmount = ethers.utils.parseUnits("200", 6);
      const transferAmount = ethers.utils.parseUnits("150", 6);
      
      // User1 approves user2 to spend tokens
      await mockToken6.connect(user1).approve(user2.address, approveAmount);
      
      expect(await mockToken6.allowance(user1.address, user2.address)).to.equal(approveAmount);
      
      // User2 transfers from user1
      await mockToken6.connect(user2).transferFrom(user1.address, user2.address, transferAmount);
      
      expect(await mockToken6.balanceOf(user1.address)).to.equal(ethers.utils.parseUnits("850", 6));
      expect(await mockToken6.balanceOf(user2.address)).to.equal(transferAmount);
      expect(await mockToken6.allowance(user1.address, user2.address)).to.equal(approveAmount.sub(transferAmount));
    });

    it("Should emit Transfer events on mint", async function () {
      const mintAmount = ethers.utils.parseUnits("100", 6);
      
      await expect(mockToken6.mint(user1.address, mintAmount))
        .to.emit(mockToken6, "Transfer")
        .withArgs(ethers.constants.AddressZero, user1.address, mintAmount);
    });

    it("Should emit Transfer events on burn", async function () {
      const burnAmount = ethers.utils.parseUnits("100", 6);
      
      await expect(mockToken6.burn(user1.address, burnAmount))
        .to.emit(mockToken6, "Transfer")
        .withArgs(user1.address, ethers.constants.AddressZero, burnAmount);
    });
  });

  describe("Integration Compatibility", function () {
    it("Should work with different decimal configurations", async function () {
      const tokens = [
        { token: mockToken6, decimals: 6, amount: "1000.123456" },
        { token: mockToken8, decimals: 8, amount: "10.12345678" },
        { token: mockToken18, decimals: 18, amount: "1000.123456789012345678" }
      ];

      for (const { token, decimals, amount } of tokens) {
        const mintAmount = ethers.utils.parseUnits(amount, decimals);
        
        await token.mint(user1.address, mintAmount);
        
        const balance = await token.balanceOf(user1.address);
        expect(balance).to.equal(mintAmount);
        
        const formattedBalance = ethers.utils.formatUnits(balance, decimals);
        expect(formattedBalance).to.equal(amount);
      }
    });

    it("Should handle large amounts correctly", async function () {
      // Test with maximum safe values for different decimals
      const largeAmount6 = ethers.utils.parseUnits("1000000000", 6); // 1B with 6 decimals
      const largeAmount8 = ethers.utils.parseUnits("21000000", 8); // 21M with 8 decimals (like Bitcoin)
      const largeAmount18 = ethers.utils.parseUnits("1000000000", 18); // 1B with 18 decimals

      await mockToken6.mint(user1.address, largeAmount6);
      await mockToken8.mint(user1.address, largeAmount8);
      await mockToken18.mint(user1.address, largeAmount18);

      expect(await mockToken6.balanceOf(user1.address)).to.equal(largeAmount6);
      expect(await mockToken8.balanceOf(user1.address)).to.equal(largeAmount8);
      expect(await mockToken18.balanceOf(user1.address)).to.equal(largeAmount18);
    });
  });
});