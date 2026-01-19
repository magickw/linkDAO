import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "hardhat/signers";
import { LDAOTreasury, LDAOToken, MockERC20, MultiSigWallet, Governance } from "../typechain-types";

describe("LDAOTreasury - Charity Functions", function () {
  let treasury: LDAOTreasury;
  let ldaoToken: LDAOToken;
  let usdcToken: MockERC20;
  let multiSigWallet: MultiSigWallet;
  let governance: Governance;
  let owner: SignerWithAddress;
  let charity: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  beforeEach(async function () {
    [owner, charity, user1, user2, user3] = await ethers.getSigners();

    // Deploy LDAO Token
    const LDAOTokenFactory = await ethers.getContractFactory("LDAOToken");
    ldaoToken = (await LDAOTokenFactory.deploy(owner.address)) as LDAOToken;
    await ldaoToken.waitForDeployment();

    // Deploy Mock USDC
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    usdcToken = (await MockERC20Factory.deploy("USDC", "USDC", 6)) as MockERC20;
    await usdcToken.waitForDeployment();

    // Deploy MultiSigWallet
    const MultiSigWalletFactory = await ethers.getContractFactory("MultiSigWallet");
    multiSigWallet = (await MultiSigWalletFactory.deploy(
      [owner.address],
      1,
      0 // timeDelay
    )) as MultiSigWallet;
    await multiSigWallet.waitForDeployment();

    // Deploy Governance
    const GovernanceFactory = await ethers.getContractFactory("Governance");
    governance = (await GovernanceFactory.deploy(
      await ldaoToken.getAddress(),
      owner.address, // Mock ReputationSystem
      owner.address, // Mock Treasury
      await multiSigWallet.getAddress()
    )) as Governance;
    await governance.waitForDeployment();

    // Deploy Treasury
    const TreasuryFactory = await ethers.getContractFactory("LDAOTreasury");
    treasury = (await TreasuryFactory.deploy(
      await ldaoToken.getAddress(),
      await usdcToken.getAddress(),
      await multiSigWallet.getAddress(),
      await governance.getAddress(),
      owner.address // Mock price feed
    )) as LDAOTreasury;
    await treasury.waitForDeployment();

    // Transfer tokens to treasury
    const treasuryBalance = ethers.parseEther("1000000");
    await ldaoToken.transfer(await treasury.getAddress(), treasuryBalance);

    // Set up charity verification threshold
    await treasury.updateMinCharityDonationAmount(ethers.parseEther("100"));
  });

  describe("Charity Governance", function () {
    it("Should create charity verification proposal", async function () {
      const proposalTx = await treasury.proposeCharityVerification(
        charity.address,
        "Test Charity",
        "A test charity organization",
        "QmTestHash"
      );

      const receipt = await proposalTx.wait();
      const event = receipt?.events?.find(e => e.event === "CharityVerificationProposalCreated");

      expect(event).to.not.be.undefined;
      expect(event?.args?.charityAddress).to.equal(charity.address);
      expect(event?.args?.name).to.equal("Test Charity");
    });

    it("Should vote on charity verification proposal", async function () {
      // Create proposal
      const proposalTx = await treasury.proposeCharityVerification(
        charity.address,
        "Test Charity",
        "A test charity organization",
        "QmTestHash"
      );
      const receipt = await proposalTx.wait();
      const proposalId = receipt?.events?.find(e => e.event === "CharityVerificationProposalCreated")?.args?.proposalId;

      // Vote
      await treasury.connect(user1).voteCharityVerification(proposalId, true);

      const proposal = await treasury.charityVerificationProposals(proposalId);
      expect(proposal.votesFor).to.be.gt(0);
    });

    it("Should execute successful charity verification", async function () {
      // Create proposal
      const proposalTx = await treasury.proposeCharityVerification(
        charity.address,
        "Test Charity",
        "A test charity organization",
        "QmTestHash"
      );
      const receipt = await proposalTx.wait();
      const proposalId = receipt?.events?.find(e => e.event === "CharityVerificationProposalCreated")?.args?.proposalId;

      // Vote with multiple users
      await treasury.connect(user1).voteCharityVerification(proposalId, true);
      await treasury.connect(user2).voteCharityVerification(proposalId, true);
      await treasury.connect(user3).voteCharityVerification(proposalId, true);

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days
      await ethers.provider.send("evm_mine");

      // Execute
      await treasury.executeCharityVerification(proposalId);

      expect(await treasury.isCharityVerified(charity.address)).to.be.true;
    });

    it("Should reject proposal without quorum", async function () {
      // Create proposal
      const proposalTx = await treasury.proposeCharityVerification(
        charity.address,
        "Test Charity",
        "A test charity organization",
        "QmTestHash"
      );
      const receipt = await proposalTx.wait();
      const proposalId = receipt?.events?.find(e => e.event === "CharityVerificationProposalCreated")?.args?.proposalId;

      // Only one vote (not enough for quorum)
      await treasury.connect(user1).voteCharityVerification(proposalId, true);

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");

      // Execute
      await treasury.executeCharityVerification(proposalId);

      expect(await treasury.isCharityVerified(charity.address)).to.be.false;
    });
  });

  describe("Charity Disbursement", function () {
    beforeEach(async function () {
      // Verify charity through governance
      const proposalTx = await treasury.proposeCharityVerification(
        charity.address,
        "Test Charity",
        "A test charity organization",
        "QmTestHash"
      );
      const receipt = await proposalTx.wait();
      const proposalId = receipt?.events?.find(e => e.event === "CharityVerificationProposalCreated")?.args?.proposalId;

      await treasury.connect(user1).voteCharityVerification(proposalId, true);
      await treasury.connect(user2).voteCharityVerification(proposalId, true);
      await treasury.connect(user3).voteCharityVerification(proposalId, true);

      await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");

      await treasury.executeCharityVerification(proposalId);
    });

    it("Should disburse funds to verified charity", async function () {
      const disbursementAmount = ethers.parseEther("1000");

      const tx = await treasury.disburseCharityFunds(
        charity.address,
        disbursementAmount,
        "Test donation"
      );

      const receipt = await tx.wait();
      const event = receipt?.events?.find(e => e.event === "CharityDisbursement");

      expect(event).to.not.be.undefined;
      expect(event?.args?.recipient).to.equal(charity.address);
      expect(event?.args?.amount).to.equal(disbursementAmount);

      const charityBalance = await ldaoToken.balanceOf(charity.address);
      expect(charityBalance).to.equal(disbursementAmount);
    });

    it("Should reject disbursement to unverified charity", async function () {
      const unverifiedCharity = user3;

      await expect(
        treasury.disburseCharityFunds(
          unverifiedCharity.address,
          ethers.parseEther("1000"),
          "Test donation"
        )
      ).to.be.revertedWith("Recipient must be a verified charity");
    });

    it("Should enforce minimum donation amount", async function () {
      const smallAmount = ethers.parseEther("50"); // Below minimum of 100

      await expect(
        treasury.disburseCharityFunds(
          charity.address,
          smallAmount,
          "Test donation"
        )
      ).to.be.revertedWith("Amount below minimum charity donation");
    });

    it("Should enforce maximum disbursement limit", async function () {
      const largeAmount = ethers.parseEther("200000"); // Above max of 100k

      await expect(
        treasury.disburseCharityFunds(
          charity.address,
          largeAmount,
          "Test donation"
        )
      ).to.be.revertedWith("Amount exceeds maximum limit");
    });

    it("Should enforce daily disbursement limit", async function () {
      const dailyLimit = await treasury.dailyCharityDisbursementLimit();
      const firstAmount = dailyLimit / 2;
      const secondAmount = dailyLimit / 2 + ethers.parseEther("1");

      // First disbursement should succeed
      await treasury.disburseCharityFunds(
        charity.address,
        firstAmount,
        "First donation"
      );

      // Second disbursement should fail
      await expect(
        treasury.disburseCharityFunds(
          charity.address,
          secondAmount,
          "Second donation"
        )
      ).to.be.revertedWith("Daily charity limit exceeded");
    });

    it("Should create and execute charity disbursement proposal", async function () {
      const disbursementAmount = ethers.parseEther("50000");

      // Create proposal
      const proposalTx = await treasury.proposeCharityDisbursement(
        charity.address,
        disbursementAmount,
        "Governed donation"
      );
      const receipt = await proposalTx.wait();
      const proposalId = receipt?.events?.find(e => e.event === "CharityDisbursementProposalCreated")?.args?.proposalId;

      // Vote
      await treasury.connect(user1).voteCharityDisbursement(proposalId, true);
      await treasury.connect(user2).voteCharityDisbursement(proposalId, true);
      await treasury.connect(user3).voteCharityDisbursement(proposalId, true);

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");

      // Execute
      await treasury.executeCharityDisbursement(proposalId);

      const charityBalance = await ldaoToken.balanceOf(charity.address);
      expect(charityBalance).to.equal(disbursementAmount);
    });
  });

  describe("Charity Fund Management", function () {
    it("Should update charity fund allocation within limits", async function () {
      const totalSupply = await ldaoToken.totalSupply();
      const maxAllocation = totalSupply / 10; // 10% of total supply
      const newAllocation = maxAllocation / 2; // 5% of total supply

      await treasury.updateCharityFundAllocation(newAllocation);

      const fund = await treasury.getCharityFund();
      expect(fund.availableBalance).to.equal(newAllocation);
    });

    it("Should reject allocation above 10% of total supply", async function () {
      const totalSupply = await ldaoToken.totalSupply();
      const excessiveAllocation = totalSupply / 5n; // 20% of total supply

      await expect(
        treasury.updateCharityFundAllocation(excessiveAllocation)
      ).to.be.revertedWith("Allocation cannot exceed 10% of total supply");
    });

    it("Should reject reduction by more than 50%", async function () {
      const currentAllocation = ethers.parseEther("100000");
      await treasury.updateCharityFundAllocation(currentAllocation);

      const reducedAllocation = currentAllocation / 3n; // 66% reduction

      await expect(
        treasury.updateCharityFundAllocation(reducedAllocation)
      ).to.be.revertedWith("Cannot reduce by more than 50%");
    });

    it("Should update governance parameters", async function () {
      const newVotingPeriod = 14 * 24 * 60 * 60; // 14 days
      const newQuorum = ethers.parseEther("2000000");
      const newThreshold = 75; // 75%

      await treasury.updateCharityGovernanceParams(
        newVotingPeriod,
        newQuorum,
        newThreshold
      );

      expect(await treasury.charityVotingPeriod()).to.equal(newVotingPeriod);
      expect(await treasury.charityQuorum()).to.equal(newQuorum);
      expect(await treasury.charityApprovalThreshold()).to.equal(newThreshold);
    });

    it("Should reject invalid governance parameters", async function () {
      const invalidVotingPeriod = 12 * 60 * 60; // 12 hours (too short)

      await expect(
        treasury.updateCharityGovernanceParams(
          invalidVotingPeriod,
          ethers.parseEther("1000000"),
          51
        )
      ).to.be.revertedWith("Invalid voting period");
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow emergency verification after time-lock", async function () {
      // Fast forward 91 days
      await ethers.provider.send("evm_increaseTime", [91 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");

      await treasury.verifyCharity(charity.address, true);
      expect(await treasury.isCharityVerified(charity.address)).to.be.true;
    });

    it("Should reject emergency verification before time-lock", async function () {
      // Only 10 days passed (less than 90)
      await ethers.provider.send("evm_increaseTime", [10 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");

      await expect(
        treasury.verifyCharity(charity.address, true)
      ).to.be.revertedWith("Emergency verification time-locked");
    });
  });
});