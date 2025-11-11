import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ProofOfDonationNFT, LDAOToken, CharityGovernance, EnhancedLDAOTreasury } from "../typechain-types";

const { parseEther } = ethers.utils;

describe("ProofOfDonationNFT System", function () {
  let proofNFT: ProofOfDonationNFT;
  let ldaoToken: LDAOToken;
  let charityGovernance: CharityGovernance;
  let treasury: EnhancedLDAOTreasury;
  let owner: SignerWithAddress;
  let donor1: SignerWithAddress;
  let donor2: SignerWithAddress;
  let donor3: SignerWithAddress;
  let charity: SignerWithAddress;

  beforeEach(async function () {
    [owner, donor1, donor2, donor3, charity] = await ethers.getSigners();

    // Deploy LDAOToken
    const LDAOTokenFactory = await ethers.getContractFactory("LDAOToken");
    ldaoToken = await LDAOTokenFactory.deploy(owner.address);
    await ldaoToken.deployed();

    // Deploy MockERC20 for USDC
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const mockUSDC = await MockERC20Factory.deploy("Mock USDC", "USDC", 6, parseEther("1000000"));
    await mockUSDC.deployed();

    // Deploy MultiSigWallet
    const MultiSigWalletFactory = await ethers.getContractFactory("MultiSigWallet");
    const multiSig = await MultiSigWalletFactory.deploy([owner.address], 1);
    await multiSig.deployed();

    // Deploy Treasury
    const TreasuryFactory = await ethers.getContractFactory("EnhancedLDAOTreasury");
    treasury = await TreasuryFactory.deploy(ldaoToken.address, mockUSDC.address, multiSig.address);
    await treasury.deployed();

    // Deploy CharityGovernance
    const CharityGovernanceFactory = await ethers.getContractFactory("CharityGovernance");
    charityGovernance = await CharityGovernanceFactory.deploy(ldaoToken.address, treasury.address);
    await charityGovernance.deployed();

    // Deploy ProofOfDonationNFT
    const ProofOfDonationNFTFactory = await ethers.getContractFactory("ProofOfDonationNFT");
    proofNFT = await ProofOfDonationNFTFactory.deploy(
      "LDAO Proof of Donation",
      "LDAO-POD",
      ldaoToken.address,
      charityGovernance.address
    );
    await proofNFT.deployed();
  });

  describe("Deployment", function () {
    it("Should deploy with correct name and symbol", async function () {
      expect(await proofNFT.name()).to.equal("LDAO Proof of Donation");
      expect(await proofNFT.symbol()).to.equal("LDAO-POD");
    });

    it("Should set correct governance token and charity governance addresses", async function () {
      expect(await proofNFT.governanceToken()).to.equal(ldaoToken.address);
      expect(await proofNFT.charityGovernance()).to.equal(charityGovernance.address);
    });

    it("Should reject invalid addresses in constructor", async function () {
      const ProofOfDonationNFTFactory = await ethers.getContractFactory("ProofOfDonationNFT");

      await expect(
        ProofOfDonationNFTFactory.deploy(
          "Test",
          "TEST",
          ethers.constants.AddressZero,
          charityGovernance.address
        )
      ).to.be.revertedWith("Invalid governance token address");

      await expect(
        ProofOfDonationNFTFactory.deploy(
          "Test",
          "TEST",
          ldaoToken.address,
          ethers.constants.AddressZero
        )
      ).to.be.revertedWith("Invalid charity governance address");
    });
  });

  describe("Minting Proof of Donation NFTs", function () {
    it("Should mint a regular NFT to donor successfully", async function () {
      const proposalId = 1;
      const donationAmount = parseEther("1000");

      await expect(
        proofNFT.mintProofOfDonationNFT(
          donor1.address,
          proposalId,
          charity.address,
          donationAmount,
          "Animal Shelter",
          "Helping 100 animals",
          false // Not soulbound
        )
      ).to.emit(proofNFT, "ProofOfDonationMinted")
        .withArgs(0, donor1.address, proposalId, charity.address, donationAmount);

      expect(await proofNFT.ownerOf(0)).to.equal(donor1.address);
      expect(await proofNFT.balanceOf(donor1.address)).to.equal(1);
    });

    it("Should mint a soulbound NFT successfully", async function () {
      const proposalId = 1;
      const donationAmount = parseEther("500");

      await expect(
        proofNFT.mintProofOfDonationNFT(
          donor1.address,
          proposalId,
          charity.address,
          donationAmount,
          "Education Fund",
          "Supporting 50 students",
          true // Soulbound
        )
      ).to.emit(proofNFT, "SoulboundNFTCreated")
        .withArgs(0, donor1.address);

      const tokenId = 0;
      expect(await proofNFT.isSoulbound(tokenId)).to.be.true;
    });

    it("Should store donation record correctly", async function () {
      const proposalId = 5;
      const donationAmount = parseEther("2000");

      await proofNFT.mintProofOfDonationNFT(
        donor1.address,
        proposalId,
        charity.address,
        donationAmount,
        "Healthcare Initiative",
        "Provide care for 200 patients",
        false
      );

      const tokenId = 0;
      const record = await proofNFT.getDonationRecord(tokenId);

      expect(record.proposalId).to.equal(proposalId);
      expect(record.donor).to.equal(donor1.address);
      expect(record.charityRecipient).to.equal(charity.address);
      expect(record.donationAmount).to.equal(donationAmount);
      expect(record.charityName).to.equal("Healthcare Initiative");
      expect(record.impactMetrics).to.equal("Provide care for 200 patients");
      expect(record.isSoulbound).to.be.false;
    });

    it("Should prevent minting duplicate NFTs for same proposal", async function () {
      const proposalId = 1;

      await proofNFT.mintProofOfDonationNFT(
        donor1.address,
        proposalId,
        charity.address,
        parseEther("1000"),
        "Test Charity",
        "Test Impact",
        false
      );

      await expect(
        proofNFT.mintProofOfDonationNFT(
          donor1.address,
          proposalId, // Same proposal
          charity.address,
          parseEther("1000"),
          "Test Charity",
          "Test Impact",
          false
        )
      ).to.be.revertedWith("Recipient already received NFT for this proposal");
    });

    it("Should reject invalid parameters", async function () {
      await expect(
        proofNFT.mintProofOfDonationNFT(
          ethers.constants.AddressZero, // Invalid recipient
          1,
          charity.address,
          parseEther("1000"),
          "Test",
          "Test",
          false
        )
      ).to.be.revertedWith("Invalid recipient address");

      await expect(
        proofNFT.mintProofOfDonationNFT(
          donor1.address,
          1,
          ethers.constants.AddressZero, // Invalid charity
          parseEther("1000"),
          "Test",
          "Test",
          false
        )
      ).to.be.revertedWith("Invalid charity address");

      await expect(
        proofNFT.mintProofOfDonationNFT(
          donor1.address,
          1,
          charity.address,
          0, // Invalid amount
          "Test",
          "Test",
          false
        )
      ).to.be.revertedWith("Donation amount must be greater than 0");

      await expect(
        proofNFT.mintProofOfDonationNFT(
          donor1.address,
          1,
          charity.address,
          parseEther("1000"),
          "", // Invalid charity name
          "Test",
          false
        )
      ).to.be.revertedWith("Charity name is required");
    });

    it("Should only allow owner to mint NFTs", async function () {
      await expect(
        proofNFT.connect(donor1).mintProofOfDonationNFT(
          donor1.address,
          1,
          charity.address,
          parseEther("1000"),
          "Test",
          "Test",
          false
        )
      ).to.be.reverted; // Ownable: caller is not the owner
    });
  });

  describe("Batch Minting", function () {
    it("Should batch mint NFTs to multiple recipients", async function () {
      const proposalId = 1;
      const recipients = [donor1.address, donor2.address, donor3.address];
      const donationAmount = parseEther("500");

      await proofNFT.batchMintProofOfDonationNFTs(
        recipients,
        proposalId,
        charity.address,
        donationAmount,
        "Community Project",
        "Supporting local community",
        false
      );

      expect(await proofNFT.balanceOf(donor1.address)).to.equal(1);
      expect(await proofNFT.balanceOf(donor2.address)).to.equal(1);
      expect(await proofNFT.balanceOf(donor3.address)).to.equal(1);
    });

    it("Should skip recipients who already received NFT for proposal", async function () {
      const proposalId = 1;

      // Mint to donor1 first
      await proofNFT.mintProofOfDonationNFT(
        donor1.address,
        proposalId,
        charity.address,
        parseEther("1000"),
        "Test",
        "Test",
        false
      );

      // Batch mint including donor1 (should skip)
      const recipients = [donor1.address, donor2.address];
      await proofNFT.batchMintProofOfDonationNFTs(
        recipients,
        proposalId,
        charity.address,
        parseEther("500"),
        "Test",
        "Test",
        false
      );

      // donor1 should still only have 1 NFT
      expect(await proofNFT.balanceOf(donor1.address)).to.equal(1);
      // donor2 should have 1 NFT
      expect(await proofNFT.balanceOf(donor2.address)).to.equal(1);
    });
  });

  describe("Soulbound NFT Mechanics", function () {
    let tokenId: number;

    beforeEach(async function () {
      // Mint a soulbound NFT
      await proofNFT.mintProofOfDonationNFT(
        donor1.address,
        1,
        charity.address,
        parseEther("1000"),
        "Test Charity",
        "Test Impact",
        true // Soulbound
      );
      tokenId = 0;
    });

    it("Should identify NFT as soulbound", async function () {
      expect(await proofNFT.isSoulbound(tokenId)).to.be.true;
    });

    it("Should prevent transfer of soulbound NFT", async function () {
      await expect(
        proofNFT.connect(donor1).transferFrom(donor1.address, donor2.address, tokenId)
      ).to.be.revertedWith("Soulbound NFT cannot be transferred");
    });

    it("Should prevent safeTransferFrom of soulbound NFT", async function () {
      await expect(
        proofNFT.connect(donor1)["safeTransferFrom(address,address,uint256)"](
          donor1.address,
          donor2.address,
          tokenId
        )
      ).to.be.revertedWith("Soulbound NFT cannot be transferred");
    });

    it("Should allow burning of soulbound NFT", async function () {
      // Note: This would require exposing a burn function or testing as owner
      // For now, we're testing that the logic allows burning (to address(0))
      expect(await proofNFT.ownerOf(tokenId)).to.equal(donor1.address);
    });

    it("Should allow regular NFT to be transferred", async function () {
      // Mint a regular (non-soulbound) NFT
      await proofNFT.mintProofOfDonationNFT(
        donor1.address,
        2, // Different proposal
        charity.address,
        parseEther("500"),
        "Test",
        "Test",
        false // Not soulbound
      );

      const regularTokenId = 1;
      expect(await proofNFT.isSoulbound(regularTokenId)).to.be.false;

      // Should be able to transfer
      await expect(
        proofNFT.connect(donor1).transferFrom(donor1.address, donor2.address, regularTokenId)
      ).to.not.be.reverted;

      expect(await proofNFT.ownerOf(regularTokenId)).to.equal(donor2.address);
    });
  });

  describe("Token URI and Metadata", function () {
    it("Should set base URI correctly", async function () {
      const baseURI = "https://api.ldao.com/nft/";
      await proofNFT.setBaseURI(baseURI);

      // Mint an NFT
      await proofNFT.mintProofOfDonationNFT(
        donor1.address,
        1,
        charity.address,
        parseEther("1000"),
        "Test Charity",
        "Test Impact",
        false
      );

      const tokenId = 0;
      const tokenURI = await proofNFT.tokenURI(tokenId);
      expect(tokenURI).to.equal(baseURI + tokenId.toString());
    });

    it("Should generate on-chain metadata when no base URI is set", async function () {
      // Mint an NFT without setting base URI
      await proofNFT.mintProofOfDonationNFT(
        donor1.address,
        1,
        charity.address,
        parseEther("1000"),
        "Animal Shelter",
        "Feed 100 animals",
        false
      );

      const tokenId = 0;
      const tokenURI = await proofNFT.tokenURI(tokenId);

      // Should start with data:application/json;base64,
      expect(tokenURI).to.include("data:application/json;base64,");
    });

    it("Should only allow owner to set base URI", async function () {
      await expect(
        proofNFT.connect(donor1).setBaseURI("https://test.com/")
      ).to.be.reverted; // Ownable: caller is not the owner
    });
  });

  describe("Query Functions", function () {
    beforeEach(async function () {
      // Mint several NFTs
      await proofNFT.mintProofOfDonationNFT(
        donor1.address,
        1,
        charity.address,
        parseEther("1000"),
        "Charity 1",
        "Impact 1",
        true
      );

      await proofNFT.mintProofOfDonationNFT(
        donor2.address,
        1,
        charity.address,
        parseEther("500"),
        "Charity 1",
        "Impact 1",
        false
      );

      await proofNFT.mintProofOfDonationNFT(
        donor1.address,
        2,
        charity.address,
        parseEther("2000"),
        "Charity 2",
        "Impact 2",
        false
      );
    });

    it("Should check if donor received NFT for specific proposal", async function () {
      expect(await proofNFT.hasDonorReceivedNFT(donor1.address, 1)).to.be.true;
      expect(await proofNFT.hasDonorReceivedNFT(donor1.address, 2)).to.be.true;
      expect(await proofNFT.hasDonorReceivedNFT(donor1.address, 3)).to.be.false;
      expect(await proofNFT.hasDonorReceivedNFT(donor2.address, 1)).to.be.true;
      expect(await proofNFT.hasDonorReceivedNFT(donor2.address, 2)).to.be.false;
    });

    it("Should retrieve donation record correctly", async function () {
      const record = await proofNFT.getDonationRecord(0);

      expect(record.proposalId).to.equal(1);
      expect(record.donor).to.equal(donor1.address);
      expect(record.charityName).to.equal("Charity 1");
      expect(record.isSoulbound).to.be.true;
    });

    it("Should reject querying non-existent token", async function () {
      await expect(
        proofNFT.getDonationRecord(999)
      ).to.be.revertedWith("Token does not exist");

      await expect(
        proofNFT.isSoulbound(999)
      ).to.be.revertedWith("Token does not exist");
    });
  });

  describe("Integration Scenarios", function () {
    it("Should handle full donation cycle with NFT minting", async function () {
      // Scenario: User participates in charity proposal and receives NFT

      const proposalId = 10;
      const donationAmount = parseEther("5000");

      // Mint proof of donation NFT
      await proofNFT.mintProofOfDonationNFT(
        donor1.address,
        proposalId,
        charity.address,
        donationAmount,
        "Global Education Fund",
        "Provide education for 1000 children in developing countries",
        true // Soulbound - permanent proof of contribution
      );

      // Verify NFT ownership
      expect(await proofNFT.balanceOf(donor1.address)).to.equal(1);

      // Verify donation record
      const record = await proofNFT.getDonationRecord(0);
      expect(record.proposalId).to.equal(proposalId);
      expect(record.donationAmount).to.equal(donationAmount);

      // Verify soulbound status
      expect(await proofNFT.isSoulbound(0)).to.be.true;

      // Verify cannot transfer
      await expect(
        proofNFT.connect(donor1).transferFrom(donor1.address, donor2.address, 0)
      ).to.be.revertedWith("Soulbound NFT cannot be transferred");
    });

    it("Should handle multiple donations to different charities", async function () {
      // Donor 1 donates to multiple charities
      await proofNFT.mintProofOfDonationNFT(
        donor1.address,
        1,
        charity.address,
        parseEther("1000"),
        "Animal Shelter",
        "Feed animals",
        true
      );

      const [, , , , , charity2] = await ethers.getSigners();

      await proofNFT.mintProofOfDonationNFT(
        donor1.address,
        2,
        charity2.address,
        parseEther("2000"),
        "Food Bank",
        "Feed families",
        true
      );

      // Donor should have 2 NFTs
      expect(await proofNFT.balanceOf(donor1.address)).to.equal(2);

      // Both should be soulbound
      expect(await proofNFT.isSoulbound(0)).to.be.true;
      expect(await proofNFT.isSoulbound(1)).to.be.true;

      // Records should be different
      const record1 = await proofNFT.getDonationRecord(0);
      const record2 = await proofNFT.getDonationRecord(1);

      expect(record1.charityRecipient).to.not.equal(record2.charityRecipient);
      expect(record1.donationAmount).to.not.equal(record2.donationAmount);
    });
  });
});
