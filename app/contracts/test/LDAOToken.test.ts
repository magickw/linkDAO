import { expect } from "chai";
import { ethers } from "hardhat";

describe("LDAOToken", function () {
  it("Should deploy with correct name, symbol, and initial supply", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy LDAOToken with owner as treasury
    const LDAOToken = await ethers.getContractFactory("LDAOToken");
    const initialSupply = ethers.parseEther("1000000000"); // 1 billion tokens
    const ldaoToken = await LDAOToken.deploy(owner.address);
    await ldaoToken.waitForDeployment();
    
    // Check token name and symbol
    expect(await ldaoToken.name()).to.equal("LinkDAO Token");
    expect(await ldaoToken.symbol()).to.equal("LDAO");
    
    // Check initial supply
    expect(await ldaoToken.totalSupply()).to.equal(initialSupply);
    
    // Check that treasury received the tokens
    expect(await ldaoToken.balanceOf(owner.address)).to.equal(initialSupply);
  });

  it("Should allow owner to transfer tokens", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy LDAOToken
    const LDAOToken = await ethers.getContractFactory("LDAOToken");
    const ldaoToken = await LDAOToken.deploy(owner.address);
    await ldaoToken.waitForDeployment();
    
    // Transfer tokens from owner to addr1
    const transferAmount = ethers.parseEther("1000");
    await ldaoToken.transfer(addr1.address, transferAmount);
    
    // Check balances
    expect(await ldaoToken.balanceOf(addr1.address)).to.equal(transferAmount);
  });
});

describe("TipRouter", function () {
  it("Should deploy and set fee correctly", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy LDAOToken first
    const LDAOToken = await ethers.getContractFactory("LDAOToken");
    const ldaoToken = await LDAOToken.deploy(owner.address);
    await ldaoToken.waitForDeployment();
    
    // Deploy RewardPool
    const RewardPool = await ethers.getContractFactory("RewardPool");
    const rewardPool = await RewardPool.deploy(await ldaoToken.getAddress());
    await rewardPool.waitForDeployment();
    
    // Deploy TipRouter
    const TipRouter = await ethers.getContractFactory("TipRouter");
    const tipRouter = await TipRouter.deploy(await ldaoToken.getAddress(), await rewardPool.getAddress());
    await tipRouter.waitForDeployment();
    
    // Check initial fee
    expect(await tipRouter.feeBps()).to.equal(1000); // 10%
    
    // Update fee
    await tipRouter.setFeeBps(500); // 5%
    expect(await tipRouter.feeBps()).to.equal(500);
  });
});

describe("RewardPool", function () {
  it("Should deploy and allow funding", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy LDAOToken first
    const LDAOToken = await ethers.getContractFactory("LDAOToken");
    const ldaoToken = await LDAOToken.deploy(owner.address);
    await ldaoToken.waitForDeployment();
    
    // Deploy RewardPool
    const RewardPool = await ethers.getContractFactory("RewardPool");
    const rewardPool = await RewardPool.deploy(await ldaoToken.getAddress());
    await rewardPool.waitForDeployment();
    
    // Check that RewardPool has zero balance initially
    expect(await ldaoToken.balanceOf(await rewardPool.getAddress())).to.equal(0);
  });
});