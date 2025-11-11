import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { CharityGovernance, CharityVerificationSystem, ProofOfDonationNFT, LDAOToken, EnhancedLDAOTreasury, MultiSigWallet } from "../typechain-types";

const { parseEther } = ethers.utils;

describe("CharityGovernance System", function () {
  let charityGovernance: CharityGovernance;
  let charityVerification: CharityVerificationSystem;
  let proofOfDonationNFT: ProofOfDonationNFT;
  let ldaoToken: LDAOToken;
  let treasury: EnhancedLDAOTreasury;
  let multiSigWallet: MultiSigWallet;
  let owner: SignerWithAddress;
  let proposer: SignerWithAddress;
  let voter1: SignerWithAddress;
  let voter2: SignerWithAddress;
  let voter3: SignerWithAddress;
  let charityRecipient: SignerWithAddress;

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

    // Deploy CharityVerificationSystem
    const CharityVerificationFactory = await ethers.getContractFactory("CharityVerificationSystem");
    charityVerification = await CharityVerificationFactory.deploy(owner.address);
    await charityVerification.deployed();

    // Deploy ProofOfDonationNFT
    const ProofOfDonationNFTFactory = await ethers.getContractFactory("ProofOfDonationNFT");
    proofOfDonationNFT = await ProofOfDonationNFTFactory.deploy(
      "LDAO Proof of Donation",
      "LDAOPoD",
      owner.address
    );
    await proofOfDonationNFT.deployed();

    // Deploy CharityGovernance
    const CharityGovernanceFactory = await ethers.getContractFactory("CharityGovernance");
    charityGovernance = await CharityGovernanceFactory.deploy(
      ldaoToken.address,
      treasury.address
    );
    await charityGovernance.deployed();

    // Mint some tokens for testing
    await ldaoToken.mint(proposer.address, parseEther("100000"));
    await ldaoToken.mint(voter1.address, parseEther("100000"));
    await ldaoToken.mint(voter2.address, parseEther("100000"));
    await ldaoToken.mint(voter3.address, parseEther("100000"));
  });

  describe("Deployment", function () {
    it("Should set the correct initial parameters", async function () {
      expect(await charityGovernance.votingDelay()).to.be.gt(0);
      expect(await charityGovernance.votingPeriod()).to.be.gt(0);
      expect(await charityGovernance.quorumVotes()).to.be.gt(0);
      expect(await charityGovernance.proposalThreshold()).to.be.gt(0);
    });

    it("Should initialize category-specific parameters", async function () {
      // Charity Donation parameters
      expect(await charityGovernance.categoryQuorum(6)).to.equal(parseEther("50000")); // 50k tokens
      expect(await charityGovernance.categoryThreshold(6)).to.equal(parseEther("100")); // 100 LDAO
      expect(await charityGovernance.categoryRequiresStaking(6)).to.equal(false);
      
      // Charity Verification parameters
      expect(await charityGovernance.categoryQuorum(7)).to.equal(parseEther("200000")); // 200k tokens
      expect(await charityGovernance.categoryThreshold(7)).to.equal(parseEther("5000")); // 5k LDAO
      expect(await charityGovernance.categoryRequiresStaking(7)).to.equal(true);
    });
  });

  describe("Proposal Creation", function () {
    it("Should allow creating a general proposal", async function () {
      // Transfer enough tokens to proposer to meet threshold
      await ldaoToken.mint(proposer.address, parseEther("10000"));
      
      const tx = await charityGovernance.connect(proposer).propose(
        "Test Proposal",
        "This is a test proposal",
        0, // GENERAL category
        [],
        [],
        [],
        []
      );
      
      await expect(tx).to.emit(charityGovernance, "ProposalCreated");
    });

    it("Should allow creating a charity donation proposal", async function () {
      // Transfer enough tokens to proposer to meet charity donation threshold
      await ldaoToken.mint(proposer.address, parseEther("10000"));
      
      const tx = await charityGovernance.connect(proposer).proposeCharityDonation(
        "Support Local Food Bank",
        "Proposal to donate to the local food bank",
        charityRecipient.address, // charity recipient
        parseEther("1000"), // donation amount
        "Local Food Bank",
        "Providing food assistance to families in need",
        "ipfs://Qm...", // proof of verification
        "1000 meals provided" // impact metrics
      );
      
      await expect(tx).to.emit(charityGovernance, "CharityProposalCreated");
      await expect(tx).to.emit(charityGovernance, "ProposalCreated");
    });
  });

  describe("Charity Verification", function () {
    it("Should allow adding a charity to the verification system", async function () {
      const tx = await charityVerification.connect(owner).addCharity(
        charityRecipient.address,
        "Local Food Bank",
        "Providing food assistance to families in need",
        "ipfs://Qm..." // documentation
      );
      
      await expect(tx).to.emit(charityVerification, "CharityAdded");
    });

    it("Should allow approving a charity", async function () {
      // Add a charity first
      await charityVerification.connect(owner).addCharity(
        charityRecipient.address,
        "Local Food Bank",
        "Providing food assistance to families in need",
        "ipfs://Qm..."
      );

      // Approve the charity
      const tx = await charityVerification.connect(owner).approveCharity(charityRecipient.address);
      await expect(tx).to.emit(charityVerification, "CharityApproved");
    });
  });

  describe("Proof of Donation NFT", function () {
    it("Should allow recording donations and minting NFTs", async function () {
      const tx = await proofOfDonationNFT.connect(owner).recordDonation(
        voter1.address, // donor
        charityRecipient.address, // charity
        parseEther("100"), // amount
        "Provided 100 meals to families in need" // impact story
      );
      
      await expect(tx).to.emit(proofOfDonationNFT, "DonationRecorded");
    });
  });
});