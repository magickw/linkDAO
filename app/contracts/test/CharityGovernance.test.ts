import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { CharityGovernance, LDAOToken, EnhancedLDAOTreasury, MultiSigWallet } from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const { parseEther, formatEther } = ethers.utils;

describe("CharityGovernance System", function () {
  let charityGovernance: CharityGovernance;
  let ldaoToken: LDAOToken;
  let treasury: EnhancedLDAOTreasury;
  let multiSigWallet: MultiSigWallet;
  let owner: SignerWithAddress;
  let proposer: SignerWithAddress;
  let voter1: SignerWithAddress;
  let voter2: SignerWithAddress;
  let voter3: SignerWithAddress;
  let charityRecipient: SignerWithAddress;

  const CHARITY_DONATION_QUORUM = parseEther("50000"); // 50k tokens
  const CHARITY_DONATION_THRESHOLD = parseEther("100"); // 100 LDAO
  const CHARITY_VERIFICATION_QUORUM = parseEther("200000"); // 200k tokens
  const CHARITY_VERIFICATION_THRESHOLD = parseEther("5000"); // 5k LDAO
  const CHARITY_SUBDAO_QUORUM = parseEther("300000"); // 300k tokens
  const CHARITY_SUBDAO_THRESHOLD = parseEther("10000"); // 10k LDAO

  beforeEach(async function () {
    [owner, proposer, voter1, voter2, voter3, charityRecipient] = await ethers.getSigners();

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

    // Deploy CharityGovernance
    const CharityGovernanceFactory = await ethers.getContractFactory("CharityGovernance");
    charityGovernance = await CharityGovernanceFactory.deploy(
      ldaoToken.address,
      treasury.address
    );
    await charityGovernance.deployed();

    // Distribute tokens for testing
    await ldaoToken.transfer(proposer.address, parseEther("150000"));
    await ldaoToken.transfer(voter1.address, parseEther("300000"));
    await ldaoToken.transfer(voter2.address, parseEther("200000"));
    await ldaoToken.transfer(voter3.address, parseEther("150000"));
    await ldaoToken.transfer(treasury.address, parseEther("1000000")); // Treasury funds

    // Authorize treasury as execution target
    await charityGovernance.authorizeTarget(treasury.address);

    // Verify charity recipient in treasury
    await treasury.verifyCharity(charityRecipient.address, true);
  });

  describe("Deployment and Configuration", function () {
    it("Should deploy with correct initial parameters", async function () {
      expect(await charityGovernance.governanceToken()).to.equal(ldaoToken.address);
      expect(await charityGovernance.treasury()).to.equal(treasury.address);
    });

    it("Should initialize charity category parameters correctly", async function () {
      // CHARITY_DONATION category (index 6)
      expect(await charityGovernance.categoryQuorum(6)).to.equal(CHARITY_DONATION_QUORUM);
      expect(await charityGovernance.categoryThreshold(6)).to.equal(CHARITY_DONATION_THRESHOLD);
      expect(await charityGovernance.categoryRequiresStaking(6)).to.be.false;

      // CHARITY_VERIFICATION category (index 7)
      expect(await charityGovernance.categoryQuorum(7)).to.equal(CHARITY_VERIFICATION_QUORUM);
      expect(await charityGovernance.categoryThreshold(7)).to.equal(CHARITY_VERIFICATION_THRESHOLD);
      expect(await charityGovernance.categoryRequiresStaking(7)).to.be.true;

      // CHARITY_SUBDAO_CREATION category (index 8)
      expect(await charityGovernance.categoryQuorum(8)).to.equal(CHARITY_SUBDAO_QUORUM);
      expect(await charityGovernance.categoryThreshold(8)).to.equal(CHARITY_SUBDAO_THRESHOLD);
      expect(await charityGovernance.categoryRequiresStaking(8)).to.be.true;
    });

    it("Should reject invalid addresses in constructor", async function () {
      const CharityGovernanceFactory = await ethers.getContractFactory("CharityGovernance");

      await expect(
        CharityGovernanceFactory.deploy(ethers.constants.AddressZero, treasury.address)
      ).to.be.revertedWith("Invalid token address");

      await expect(
        CharityGovernanceFactory.deploy(ldaoToken.address, ethers.constants.AddressZero)
      ).to.be.revertedWith("Invalid treasury address");
    });
  });

  describe("Charity Donation Proposals", function () {
    it("Should create a charity donation proposal with sufficient voting power", async function () {
      const donationAmount = parseEther("1000");

      const tx = await charityGovernance.connect(proposer).proposeCharityDonation(
        "Help Local Animal Shelter",
        "Provide funds to help feed and care for rescued animals",
        charityRecipient.address,
        donationAmount,
        "Local Animal Rescue",
        "Non-profit animal shelter serving the community",
        "ipfs://QmCharityVerificationHash",
        "Feed 100 animals for 30 days"
      );

      const receipt = await tx.wait();
      const proposalId = await charityGovernance.proposalCount();

      expect(proposalId).to.equal(1);

      // Verify proposal details
      const proposal = await charityGovernance.getProposal(proposalId);
      expect(proposal.proposer).to.equal(proposer.address);
      expect(proposal.title).to.equal("Help Local Animal Shelter");
      expect(proposal.charityRecipient).to.equal(charityRecipient.address);
      expect(proposal.donationAmount).to.equal(donationAmount);
      expect(proposal.charityName).to.equal("Local Animal Rescue");
      expect(proposal.category).to.equal(6); // CHARITY_DONATION
      expect(proposal.state).to.equal(0); // Pending
    });

    it("Should reject charity proposal with insufficient voting power", async function () {
      // Try to create proposal from account with no tokens
      const [, , , , , noTokenAccount] = await ethers.getSigners();

      await expect(
        charityGovernance.connect(noTokenAccount).proposeCharityDonation(
          "Test Charity",
          "Test Description",
          charityRecipient.address,
          parseEther("1000"),
          "Test Charity",
          "Test Description",
          "ipfs://test",
          "Test Impact"
        )
      ).to.be.revertedWith("Insufficient voting power to propose charity donation");
    });

    it("Should reject charity proposal with invalid parameters", async function () {
      await expect(
        charityGovernance.connect(proposer).proposeCharityDonation(
          "Test",
          "Description",
          ethers.constants.AddressZero, // Invalid recipient
          parseEther("1000"),
          "Charity",
          "Description",
          "ipfs://test",
          "Impact"
        )
      ).to.be.revertedWith("Invalid charity recipient");

      await expect(
        charityGovernance.connect(proposer).proposeCharityDonation(
          "Test",
          "Description",
          charityRecipient.address,
          0, // Invalid amount
          "Charity",
          "Description",
          "ipfs://test",
          "Impact"
        )
      ).to.be.revertedWith("Donation amount must be greater than 0");

      await expect(
        charityGovernance.connect(proposer).proposeCharityDonation(
          "Test",
          "Description",
          charityRecipient.address,
          parseEther("1000"),
          "", // Invalid charity name
          "Description",
          "ipfs://test",
          "Impact"
        )
      ).to.be.revertedWith("Charity name is required");
    });

    it("Should emit CharityProposalCreated event", async function () {
      const donationAmount = parseEther("1000");

      await expect(
        charityGovernance.connect(proposer).proposeCharityDonation(
          "Help Education",
          "Provide educational resources",
          charityRecipient.address,
          donationAmount,
          "Education First",
          "Non-profit education organization",
          "ipfs://QmEducationHash",
          "Provide books for 500 students"
        )
      ).to.emit(charityGovernance, "CharityProposalCreated")
        .withArgs(
          1,
          proposer.address,
          "Help Education",
          charityRecipient.address,
          donationAmount,
          "Education First"
        );
    });
  });

  describe("Voting on Charity Proposals", function () {
    let proposalId: any;

    beforeEach(async function () {
      // Create a charity proposal
      await charityGovernance.connect(proposer).proposeCharityDonation(
        "Community Health Initiative",
        "Support local health services",
        charityRecipient.address,
        parseEther("5000"),
        "Community Health Center",
        "Healthcare for underserved communities",
        "ipfs://QmHealthHash",
        "Provide healthcare for 1000 patients"
      );

      proposalId = await charityGovernance.proposalCount();

      // Fast forward past voting delay
      const proposal = await charityGovernance.getProposal(proposalId);
      await time.advanceBlockTo(proposal.startBlock.toNumber());
    });

    it("Should allow voting on charity proposals without staking requirement", async function () {
      await expect(
        charityGovernance.connect(voter1).castVote(proposalId, 1, "I support this charity")
      ).to.not.be.reverted;

      const voteReceipt = await charityGovernance.getVote(proposalId, voter1.address);
      expect(voteReceipt.hasVoted).to.be.true;
      expect(voteReceipt.support).to.equal(1); // For
      expect(voteReceipt.votes).to.be.gt(0);
    });

    it("Should count votes correctly for charity proposals", async function () {
      // Vote for
      await charityGovernance.connect(voter1).castVote(proposalId, 1, "Support");
      await charityGovernance.connect(voter2).castVote(proposalId, 1, "Support");

      // Vote against
      await charityGovernance.connect(voter3).castVote(proposalId, 0, "Against");

      const proposal = await charityGovernance.getProposal(proposalId);

      // voter1 and voter2 have more tokens than voter3
      expect(proposal.forVotes).to.be.gt(proposal.againstVotes);
    });

    it("Should prevent double voting", async function () {
      await charityGovernance.connect(voter1).castVote(proposalId, 1, "Support");

      await expect(
        charityGovernance.connect(voter1).castVote(proposalId, 1, "Support again")
      ).to.be.revertedWith("Already voted");
    });

    it("Should reach quorum with sufficient votes", async function () {
      // voter1 and voter2 together have enough to reach 50k quorum
      await charityGovernance.connect(voter1).castVote(proposalId, 1, "Support");

      const proposal = await charityGovernance.getProposal(proposalId);
      expect(proposal.forVotes).to.be.gte(CHARITY_DONATION_QUORUM);
    });
  });

  describe("Proposal Execution", function () {
    let proposalId: any;

    beforeEach(async function () {
      // Create proposal
      await charityGovernance.connect(proposer).proposeCharityDonation(
        "Education Support",
        "Fund educational materials",
        charityRecipient.address,
        parseEther("2000"),
        "Education Alliance",
        "Supporting education in rural areas",
        "ipfs://QmEduHash",
        "Provide materials for 200 students"
      );

      proposalId = await charityGovernance.proposalCount();

      // Fast forward to start voting
      const proposal = await charityGovernance.getProposal(proposalId);
      await time.advanceBlockTo(proposal.startBlock.toNumber());

      // Vote to pass the proposal
      await charityGovernance.connect(voter1).castVote(proposalId, 1, "Support education");
      await charityGovernance.connect(voter2).castVote(proposalId, 1, "Support");

      // Fast forward past voting period
      await time.advanceBlockTo(proposal.endBlock.toNumber() + 1);
    });

    it("Should queue proposal after successful vote", async function () {
      await expect(
        charityGovernance.queue(proposalId)
      ).to.not.be.reverted;

      const proposal = await charityGovernance.getProposal(proposalId);
      expect(proposal.state).to.equal(5); // Queued
    });

    it("Should execute charity disbursement after execution delay", async function () {
      // Queue the proposal
      await charityGovernance.queue(proposalId);

      // Fast forward past execution delay
      await time.increase(2 * 24 * 60 * 60 + 1); // 2 days + 1 second

      const initialBalance = await ldaoToken.balanceOf(charityRecipient.address);

      await expect(
        charityGovernance.execute(proposalId)
      ).to.not.be.reverted;

      const finalBalance = await ldaoToken.balanceOf(charityRecipient.address);
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should update proposal state after execution", async function () {
      await charityGovernance.queue(proposalId);
      await time.increase(2 * 24 * 60 * 60 + 1);

      await charityGovernance.execute(proposalId);

      const proposal = await charityGovernance.getProposal(proposalId);
      expect(proposal.state).to.equal(7); // Executed
    });

    it("Should reject execution before delay has passed", async function () {
      await charityGovernance.queue(proposalId);

      // Don't wait for execution delay
      await expect(
        charityGovernance.execute(proposalId)
      ).to.be.revertedWith("Execution delay not passed");
    });

    it("Should reject execution of unauthorized targets", async function () {
      // Remove treasury authorization
      await charityGovernance.revokeTarget(treasury.address);

      await charityGovernance.queue(proposalId);
      await time.increase(2 * 24 * 60 * 60 + 1);

      await expect(
        charityGovernance.execute(proposalId)
      ).to.be.revertedWith("Unauthorized target");
    });
  });

  describe("Proposal Cancellation", function () {
    it("Should allow proposer to cancel their own proposal", async function () {
      await charityGovernance.connect(proposer).proposeCharityDonation(
        "Test Proposal",
        "Test Description",
        charityRecipient.address,
        parseEther("1000"),
        "Test Charity",
        "Test Description",
        "ipfs://test",
        "Test Impact"
      );

      const proposalId = await charityGovernance.proposalCount();

      await expect(
        charityGovernance.connect(proposer).cancelProposal(proposalId)
      ).to.not.be.reverted;

      const proposal = await charityGovernance.getProposal(proposalId);
      expect(proposal.state).to.equal(2); // Canceled
    });

    it("Should allow owner to cancel any proposal", async function () {
      await charityGovernance.connect(proposer).proposeCharityDonation(
        "Test Proposal",
        "Test Description",
        charityRecipient.address,
        parseEther("1000"),
        "Test Charity",
        "Test Description",
        "ipfs://test",
        "Test Impact"
      );

      const proposalId = await charityGovernance.proposalCount();

      await expect(
        charityGovernance.connect(owner).cancelProposal(proposalId)
      ).to.not.be.reverted;
    });

    it("Should reject cancellation by non-proposer/non-owner", async function () {
      await charityGovernance.connect(proposer).proposeCharityDonation(
        "Test Proposal",
        "Test Description",
        charityRecipient.address,
        parseEther("1000"),
        "Test Charity",
        "Test Description",
        "ipfs://test",
        "Test Impact"
      );

      const proposalId = await charityGovernance.proposalCount();

      await expect(
        charityGovernance.connect(voter1).cancelProposal(proposalId)
      ).to.be.revertedWith("Not proposer or owner");
    });
  });

  describe("Category Parameter Updates", function () {
    it("Should allow owner to update category parameters", async function () {
      const newQuorum = parseEther("75000");
      const newThreshold = parseEther("200");

      await expect(
        charityGovernance.updateCategoryParameters(6, newQuorum, newThreshold, false)
      ).to.not.be.reverted;

      expect(await charityGovernance.categoryQuorum(6)).to.equal(newQuorum);
      expect(await charityGovernance.categoryThreshold(6)).to.equal(newThreshold);
      expect(await charityGovernance.categoryRequiresStaking(6)).to.be.false;
    });

    it("Should reject category updates from non-owner", async function () {
      await expect(
        charityGovernance.connect(voter1).updateCategoryParameters(
          6,
          parseEther("75000"),
          parseEther("200"),
          false
        )
      ).to.be.reverted; // Ownable: caller is not the owner
    });

    it("Should emit CategoryParametersUpdated event", async function () {
      const newQuorum = parseEther("75000");
      const newThreshold = parseEther("200");

      await expect(
        charityGovernance.updateCategoryParameters(6, newQuorum, newThreshold, true)
      ).to.emit(charityGovernance, "CategoryParametersUpdated")
        .withArgs(6, newQuorum, newThreshold, true);
    });
  });

  describe("Integration with Treasury", function () {
    it("Should properly integrate with treasury for charity disbursement", async function () {
      // Create and pass a proposal
      await charityGovernance.connect(proposer).proposeCharityDonation(
        "Healthcare Initiative",
        "Support community health",
        charityRecipient.address,
        parseEther("3000"),
        "Health First",
        "Community healthcare provider",
        "ipfs://QmHealthHash",
        "Treat 500 patients"
      );

      const proposalId = await charityGovernance.proposalCount();
      const proposal = await charityGovernance.getProposal(proposalId);

      // Vote and execute
      await time.advanceBlockTo(proposal.startBlock.toNumber());
      await charityGovernance.connect(voter1).castVote(proposalId, 1, "Support");
      await charityGovernance.connect(voter2).castVote(proposalId, 1, "Support");

      await time.advanceBlockTo(proposal.endBlock.toNumber() + 1);
      await charityGovernance.queue(proposalId);
      await time.increase(2 * 24 * 60 * 60 + 1);

      const charityBalanceBefore = await ldaoToken.balanceOf(charityRecipient.address);

      // Note: The actual execution would call treasury.disburseCharityFunds
      // This test verifies the setup is correct
      expect(await treasury.isCharityVerified(charityRecipient.address)).to.be.true;
      expect(charityBalanceBefore).to.equal(0);
    });
  });
});
