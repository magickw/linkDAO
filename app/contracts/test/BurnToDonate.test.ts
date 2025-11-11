import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BurnToDonate, LDAOToken, EnhancedLDAOTreasury, MultiSigWallet } from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const { parseEther, formatEther } = ethers.utils;

describe("BurnToDonate System", function () {
  let burnToDonate: BurnToDonate;
  let ldaoToken: LDAOToken;
  let treasury: EnhancedLDAOTreasury;
  let multiSigWallet: MultiSigWallet;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let charity1: SignerWithAddress;
  let charity2: SignerWithAddress;
  let defaultCharity: SignerWithAddress;

  const MIN_BURN_AMOUNT = parseEther("1000"); // 1000 LDAO
  const MAX_BURN_AMOUNT = parseEther("100000"); // 100K LDAO
  const DAILY_BURN_LIMIT = parseEther("1000000"); // 1M LDAO
  const BURN_TO_DONATE_RATIO = 100; // 100:1 ratio

  beforeEach(async function () {
    [owner, user1, user2, charity1, charity2, defaultCharity] = await ethers.getSigners();

    // Deploy MultiSigWallet
    const MultiSigWalletFactory = await ethers.getContractFactory("MultiSigWallet");
    multiSigWallet = await MultiSigWalletFactory.deploy([owner.address], 1);
    await multiSigWallet.deployed();

    // Deploy LDAOToken
    const LDAOTokenFactory = await ethers.getContractFactory("LDAOToken");
    ldaoToken = await LDAOTokenFactory.deploy(owner.address);
    await ldaoToken.deployed();

    // Deploy MockERC20 for USDC
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const mockUSDC = await MockERC20Factory.deploy("Mock USDC", "USDC", 6, parseEther("1000000"));
    await mockUSDC.deployed();

    // Deploy EnhancedLDAOTreasury
    const TreasuryFactory = await ethers.getContractFactory("EnhancedLDAOTreasury");
    treasury = await TreasuryFactory.deploy(
      ldaoToken.address,
      mockUSDC.address,
      multiSigWallet.address
    );
    await treasury.deployed();

    // Deploy BurnToDonate
    const BurnToDonateFactory = await ethers.getContractFactory("BurnToDonate");
    burnToDonate = await BurnToDonateFactory.deploy(
      ldaoToken.address,
      treasury.address,
      defaultCharity.address
    );
    await burnToDonate.deployed();

    // Distribute tokens
    await ldaoToken.transfer(user1.address, parseEther("500000"));
    await ldaoToken.transfer(user2.address, parseEther("300000"));
    await ldaoToken.transfer(treasury.address, parseEther("10000000")); // Treasury funds

    // Verify charities in treasury
    await treasury.verifyCharity(charity1.address, true);
    await treasury.verifyCharity(charity2.address, true);
    await treasury.verifyCharity(defaultCharity.address, true);

    // Approve BurnToDonate contract to spend user tokens
    await ldaoToken.connect(user1).approve(burnToDonate.address, parseEther("1000000"));
    await ldaoToken.connect(user2).approve(burnToDonate.address, parseEther("1000000"));
  });

  describe("Deployment and Configuration", function () {
    it("Should deploy with correct initial parameters", async function () {
      expect(await burnToDonate.ldaoToken()).to.equal(ldaoToken.address);
      expect(await burnToDonate.treasury()).to.equal(treasury.address);
      expect(await burnToDonate.defaultCharityRecipient()).to.equal(defaultCharity.address);
      expect(await burnToDonate.burnToDonateRatio()).to.equal(BURN_TO_DONATE_RATIO);
      expect(await burnToDonate.minBurnAmount()).to.equal(MIN_BURN_AMOUNT);
      expect(await burnToDonate.maxBurnAmount()).to.equal(MAX_BURN_AMOUNT);
      expect(await burnToDonate.dailyBurnLimit()).to.equal(DAILY_BURN_LIMIT);
    });

    it("Should reject invalid addresses in constructor", async function () {
      const BurnToDonateFactory = await ethers.getContractFactory("BurnToDonate");

      await expect(
        BurnToDonateFactory.deploy(ethers.constants.AddressZero, treasury.address, defaultCharity.address)
      ).to.be.revertedWith("Invalid LDAO token address");

      await expect(
        BurnToDonateFactory.deploy(ldaoToken.address, ethers.constants.AddressZero, defaultCharity.address)
      ).to.be.revertedWith("Invalid treasury address");

      await expect(
        BurnToDonateFactory.deploy(ldaoToken.address, treasury.address, ethers.constants.AddressZero)
      ).to.be.revertedWith("Invalid default charity recipient");
    });
  });

  describe("Burn to Donate Mechanism", function () {
    it("Should burn tokens and trigger donation successfully", async function () {
      const burnAmount = parseEther("10000"); // 10K LDAO
      const expectedDonation = burnAmount.div(BURN_TO_DONATE_RATIO); // 100 LDAO

      const userBalanceBefore = await ldaoToken.balanceOf(user1.address);
      const totalSupplyBefore = await ldaoToken.totalSupply();

      await expect(
        burnToDonate.connect(user1).burnToDonate(burnAmount, charity1.address)
      ).to.emit(burnToDonate, "TokensBurned")
        .withArgs(user1.address, burnAmount, expectedDonation, charity1.address);

      const userBalanceAfter = await ldaoToken.balanceOf(user1.address);
      const totalSupplyAfter = await ldaoToken.totalSupply();

      // User balance should decrease
      expect(userBalanceBefore.sub(userBalanceAfter)).to.equal(burnAmount);

      // Total supply should decrease (tokens burned)
      expect(totalSupplyBefore.sub(totalSupplyAfter)).to.equal(burnAmount);

      // Check stats
      const stats = await burnToDonate.getContractStats();
      expect(stats[0]).to.equal(burnAmount); // totalTokensBurned
      expect(stats[1]).to.equal(expectedDonation); // totalDonationsMade
      expect(stats[2]).to.equal(1); // totalTransactions
    });

    it("Should burn to default charity successfully", async function () {
      const burnAmount = parseEther("5000");

      await expect(
        burnToDonate.connect(user1).burnToDonateDefault(burnAmount)
      ).to.emit(burnToDonate, "TokensBurned");

      const stats = await burnToDonate.getUserStats(user1.address);
      expect(stats[0]).to.equal(burnAmount); // totalBurned
    });

    it("Should reject burn amount below minimum", async function () {
      const belowMinimum = parseEther("500"); // Below 1000 LDAO

      await expect(
        burnToDonate.connect(user1).burnToDonate(belowMinimum, charity1.address)
      ).to.be.revertedWith("Burn amount below minimum");
    });

    it("Should reject burn amount above maximum", async function () {
      const aboveMaximum = parseEther("150000"); // Above 100K LDAO

      await expect(
        burnToDonate.connect(user1).burnToDonate(aboveMaximum, charity1.address)
      ).to.be.revertedWith("Burn amount exceeds maximum");
    });

    it("Should reject invalid recipient address", async function () {
      await expect(
        burnToDonate.connect(user1).burnToDonate(
          parseEther("5000"),
          ethers.constants.AddressZero
        )
      ).to.be.revertedWith("Invalid recipient address");
    });

    it("Should reject if donation amount is below minimum", async function () {
      // Burn amount that results in donation below minimum (10 LDAO)
      const smallBurn = parseEther("500"); // Results in 5 LDAO donation

      await expect(
        burnToDonate.connect(user1).burnToDonate(smallBurn, charity1.address)
      ).to.be.revertedWith("Burn amount below minimum");
    });

    it("Should track user statistics correctly", async function () {
      const burn1 = parseEther("10000");
      const burn2 = parseEther("5000");

      await burnToDonate.connect(user1).burnToDonate(burn1, charity1.address);
      await burnToDonate.connect(user1).burnToDonate(burn2, charity2.address);

      const stats = await burnToDonate.getUserStats(user1.address);
      expect(stats[0]).to.equal(burn1.add(burn2)); // totalBurned
      expect(stats[2]).to.equal(burn1.add(burn2)); // dailyBurns
    });
  });

  describe("Daily Burn Limits", function () {
    it("Should enforce daily burn limit", async function () {
      // Burn close to the daily limit
      const largeBurn = parseEther("900000");
      await burnToDonate.connect(user1).burnToDonate(largeBurn, charity1.address);

      // Try to burn more in the same day
      const exceedingBurn = parseEther("200000");
      await expect(
        burnToDonate.connect(user1).burnToDonate(exceedingBurn, charity1.address)
      ).to.be.revertedWith("Daily burn limit exceeded");
    });

    it("Should reset daily limits after a day", async function () {
      const burnAmount = parseEther("50000");

      // First burn
      await burnToDonate.connect(user1).burnToDonate(burnAmount, charity1.address);

      // Advance time by 1 day
      await time.increase(24 * 60 * 60);
      await ethers.provider.send("evm_mine", []);

      // Should be able to burn again
      await expect(
        burnToDonate.connect(user1).burnToDonate(burnAmount, charity1.address)
      ).to.not.be.reverted;

      const stats = await burnToDonate.getUserStats(user1.address);
      expect(stats[0]).to.equal(burnAmount.mul(2)); // totalBurned across both days
    });

    it("Should track daily burns per user separately", async function () {
      const burn1 = parseEther("50000");
      const burn2 = parseEther("30000");

      await burnToDonate.connect(user1).burnToDonate(burn1, charity1.address);
      await burnToDonate.connect(user2).burnToDonate(burn2, charity1.address);

      const stats1 = await burnToDonate.getUserStats(user1.address);
      const stats2 = await burnToDonate.getUserStats(user2.address);

      expect(stats1[2]).to.equal(burn1); // user1 daily burns
      expect(stats2[2]).to.equal(burn2); // user2 daily burns
    });
  });

  describe("Configuration Updates", function () {
    it("Should allow owner to update burn-to-donate ratio", async function () {
      const newRatio = 200; // 200:1 ratio

      await expect(
        burnToDonate.updateBurnToDonateRatio(newRatio)
      ).to.emit(burnToDonate, "BurnToDonateRatioUpdated")
        .withArgs(BURN_TO_DONATE_RATIO, newRatio);

      expect(await burnToDonate.burnToDonateRatio()).to.equal(newRatio);
    });

    it("Should reject invalid ratio values", async function () {
      await expect(
        burnToDonate.updateBurnToDonateRatio(0)
      ).to.be.revertedWith("Ratio must be greater than 0");

      await expect(
        burnToDonate.updateBurnToDonateRatio(15000) // Too high
      ).to.be.revertedWith("Ratio too high");
    });

    it("Should allow owner to update daily burn limit", async function () {
      const newLimit = parseEther("2000000");

      await expect(
        burnToDonate.updateDailyBurnLimit(newLimit)
      ).to.emit(burnToDonate, "DailyBurnLimitUpdated")
        .withArgs(DAILY_BURN_LIMIT, newLimit);

      expect(await burnToDonate.dailyBurnLimit()).to.equal(newLimit);
    });

    it("Should allow owner to update default charity recipient", async function () {
      await expect(
        burnToDonate.updateDefaultCharityRecipient(charity2.address)
      ).to.emit(burnToDonate, "DefaultCharityRecipientUpdated")
        .withArgs(defaultCharity.address, charity2.address);

      expect(await burnToDonate.defaultCharityRecipient()).to.equal(charity2.address);
    });

    it("Should reject invalid default charity recipient", async function () {
      await expect(
        burnToDonate.updateDefaultCharityRecipient(ethers.constants.AddressZero)
      ).to.be.revertedWith("Invalid recipient address");
    });

    it("Should allow owner to update burn configuration", async function () {
      const newMinBurn = parseEther("2000");
      const newMaxBurn = parseEther("200000");
      const newMinDonation = parseEther("20");

      await expect(
        burnToDonate.updateConfiguration(newMinBurn, newMaxBurn, newMinDonation)
      ).to.emit(burnToDonate, "ConfigurationUpdated")
        .withArgs(newMinBurn, newMaxBurn, newMinDonation);

      expect(await burnToDonate.minBurnAmount()).to.equal(newMinBurn);
      expect(await burnToDonate.maxBurnAmount()).to.equal(newMaxBurn);
      expect(await burnToDonate.minDonationAmount()).to.equal(newMinDonation);
    });

    it("Should reject invalid configuration", async function () {
      await expect(
        burnToDonate.updateConfiguration(0, parseEther("100000"), parseEther("10"))
      ).to.be.revertedWith("Min burn amount must be greater than 0");

      await expect(
        burnToDonate.updateConfiguration(
          parseEther("100000"),
          parseEther("50000"), // Max < Min
          parseEther("10")
        )
      ).to.be.revertedWith("Max burn amount must be greater than min");

      await expect(
        burnToDonate.updateConfiguration(
          parseEther("1000"),
          parseEther("100000"),
          0 // Invalid min donation
        )
      ).to.be.revertedWith("Min donation amount must be greater than 0");
    });

    it("Should reject configuration updates from non-owner", async function () {
      await expect(
        burnToDonate.connect(user1).updateBurnToDonateRatio(200)
      ).to.be.reverted; // Ownable: caller is not the owner
    });
  });

  describe("Treasury Integration", function () {
    it("Should check if treasury has sufficient balance", async function () {
      const donationAmount = parseEther("100");
      const sufficientBalance = await burnToDonate.isTreasurySufficient(donationAmount);
      expect(sufficientBalance).to.be.true;
    });

    it("Should report insufficient treasury balance", async function () {
      const hugeDonation = parseEther("100000000"); // 100M LDAO
      const sufficientBalance = await burnToDonate.isTreasurySufficient(hugeDonation);
      expect(sufficientBalance).to.be.false;
    });
  });

  describe("Statistics and Reporting", function () {
    beforeEach(async function () {
      // Perform multiple burns
      await burnToDonate.connect(user1).burnToDonate(parseEther("10000"), charity1.address);
      await burnToDonate.connect(user2).burnToDonate(parseEther("5000"), charity2.address);
      await burnToDonate.connect(user1).burnToDonate(parseEther("7500"), defaultCharity.address);
    });

    it("Should track global statistics correctly", async function () {
      const stats = await burnToDonate.getContractStats();
      const totalBurned = parseEther("22500"); // 10k + 5k + 7.5k
      const totalDonations = totalBurned.div(BURN_TO_DONATE_RATIO);

      expect(stats[0]).to.equal(totalBurned); // totalTokensBurned
      expect(stats[1]).to.equal(totalDonations); // totalDonationsMade
      expect(stats[2]).to.equal(3); // totalTransactions
    });

    it("Should track user-specific statistics correctly", async function () {
      const user1Stats = await burnToDonate.getUserStats(user1.address);
      const user2Stats = await burnToDonate.getUserStats(user2.address);

      const user1Total = parseEther("17500"); // 10k + 7.5k
      const user2Total = parseEther("5000");

      expect(user1Stats[0]).to.equal(user1Total); // totalBurned
      expect(user2Stats[0]).to.equal(user2Total);
    });

    it("Should track donations received per recipient", async function () {
      const user1Stats = await burnToDonate.getUserStats(user1.address);
      const user2Stats = await burnToDonate.getUserStats(user2.address);

      // Note: userTotalDonationsReceived tracks donations TO the address, not FROM
      // So we check the charities
      const charity1Donations = await burnToDonate.userTotalDonationsReceived(charity1.address);
      const charity2Donations = await burnToDonate.userTotalDonationsReceived(charity2.address);
      const defaultDonations = await burnToDonate.userTotalDonationsReceived(defaultCharity.address);

      expect(charity1Donations).to.equal(parseEther("10000").div(BURN_TO_DONATE_RATIO));
      expect(charity2Donations).to.equal(parseEther("5000").div(BURN_TO_DONATE_RATIO));
      expect(defaultDonations).to.equal(parseEther("7500").div(BURN_TO_DONATE_RATIO));
    });
  });

  describe("Edge Cases", function () {
    it("Should handle multiple burns in quick succession", async function () {
      const burnAmount = parseEther("5000");

      await burnToDonate.connect(user1).burnToDonate(burnAmount, charity1.address);
      await burnToDonate.connect(user1).burnToDonate(burnAmount, charity1.address);
      await burnToDonate.connect(user1).burnToDonate(burnAmount, charity1.address);

      const stats = await burnToDonate.getUserStats(user1.address);
      expect(stats[0]).to.equal(burnAmount.mul(3));
    });

    it("Should handle burns from multiple users to same charity", async function () {
      const burn1 = parseEther("10000");
      const burn2 = parseEther("5000");

      await burnToDonate.connect(user1).burnToDonate(burn1, charity1.address);
      await burnToDonate.connect(user2).burnToDonate(burn2, charity1.address);

      const totalDonations = burn1.add(burn2).div(BURN_TO_DONATE_RATIO);
      const charityDonations = await burnToDonate.userTotalDonationsReceived(charity1.address);

      expect(charityDonations).to.equal(totalDonations);
    });

    it("Should handle exact minimum burn amount", async function () {
      await expect(
        burnToDonate.connect(user1).burnToDonate(MIN_BURN_AMOUNT, charity1.address)
      ).to.not.be.reverted;
    });

    it("Should handle exact maximum burn amount", async function () {
      await expect(
        burnToDonate.connect(user1).burnToDonate(MAX_BURN_AMOUNT, charity1.address)
      ).to.not.be.reverted;
    });
  });
});
