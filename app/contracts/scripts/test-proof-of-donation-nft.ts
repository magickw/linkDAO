// Script to test ProofOfDonationNFT functionality
// This script will test both soulbound and tradable NFTs

import { ethers } from "hardhat";
import { ProofOfDonationNFT, LDAOToken, CharityGovernance } from "../typechain-types";

async function testNFTFunctionality() {
  console.log("Starting ProofOfDonationNFT Functionality Test");
  
  // Get signers
  const [owner, donor1, donor2, donor3, charityRecipient] = await ethers.getSigners();
  
  // Contract addresses from deployedAddresses-sepolia.json
  const proofOfDonationNFTAddress = "0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4";
  const ldaoTokenAddress = "0xc9F690B45e33ca909bB9ab97836091673232611B";
  const charityGovernanceAddress = "0x25b39592AA8da0be424734E0F143E5371396dd61";
  
  // Connect to contracts
  const ProofOfDonationNFT = await ethers.getContractFactory("ProofOfDonationNFT");
  const proofOfDonationNFT = ProofOfDonationNFT.attach(proofOfDonationNFTAddress) as ProofOfDonationNFT;
  
  console.log("Connected to ProofOfDonationNFT contract");
  
  // Test 1: Mint a soulbound NFT
  console.log("\n=== Test 1: Minting Soulbound NFT ===");
  try {
    const mintTx = await proofOfDonationNFT.connect(owner).mintProofOfDonationNFT(
      donor1.address,           // recipient
      1,                       // proposalId
      charityRecipient.address, // charityRecipient
      ethers.parseEther("100"), // donationAmount
      "Local Food Bank",       // charityName
      "100 meals provided",    // impactMetrics
      true                     // soulbound
    );
    
    const receipt = await mintTx.wait();
    const tokenId = receipt?.logs[0].args?.[0];
    console.log(`Soulbound NFT minted with tokenId: ${tokenId}`);
    
    // Check if NFT is soulbound
    const isSoulbound = await proofOfDonationNFT.isSoulbound(tokenId);
    console.log(`Is NFT soulbound: ${isSoulbound}`);
    
    // Check donation record
    const donationRecord = await proofOfDonationNFT.getDonationRecord(tokenId);
    console.log(`Donation Amount: ${ethers.formatEther(donationRecord.donationAmount)} LDAO`);
    console.log(`Charity Name: ${donationRecord.charityName}`);
    console.log(`Donor: ${donationRecord.donor}`);
    
    // Try to transfer soulbound NFT (should fail)
    console.log("Attempting to transfer soulbound NFT (should fail)...");
    try {
      const transferTx = await proofOfDonationNFT.connect(donor1).transferFrom(
        donor1.address,
        donor2.address,
        tokenId
      );
      await transferTx.wait();
      console.log("ERROR: Soulbound NFT transfer should have failed!");
    } catch (error) {
      console.log("SUCCESS: Soulbound NFT transfer correctly failed");
    }
    
  } catch (error) {
    console.log("Error in Test 1:", error);
  }
  
  // Test 2: Mint a tradable NFT
  console.log("\n=== Test 2: Minting Tradable NFT ===");
  try {
    const mintTx = await proofOfDonationNFT.connect(owner).mintProofOfDonationNFT(
      donor2.address,           // recipient
      2,                       // proposalId
      charityRecipient.address, // charityRecipient
      ethers.parseEther("200"), // donationAmount
      "Animal Shelter",        // charityName
      "50 animals helped",     // impactMetrics
      false                    // soulbound (tradable)
    );
    
    const receipt = await mintTx.wait();
    const tokenId = receipt?.logs[0].args?.[0];
    console.log(`Tradable NFT minted with tokenId: ${tokenId}`);
    
    // Check if NFT is soulbound
    const isSoulbound = await proofOfDonationNFT.isSoulbound(tokenId);
    console.log(`Is NFT soulbound: ${isSoulbound}`);
    
    // Try to transfer tradable NFT (should succeed)
    console.log("Attempting to transfer tradable NFT (should succeed)...");
    try {
      const transferTx = await proofOfDonationNFT.connect(donor2).transferFrom(
        donor2.address,
        donor3.address,
        tokenId
      );
      await transferTx.wait();
      console.log("SUCCESS: Tradable NFT transfer completed");
      
      // Check new owner
      const newOwner = await proofOfDonationNFT.ownerOf(tokenId);
      console.log(`New owner of NFT: ${newOwner}`);
    } catch (error) {
      console.log("ERROR: Tradable NFT transfer failed:", error);
    }
    
  } catch (error) {
    console.log("Error in Test 2:", error);
  }
  
  // Test 3: Batch mint NFTs
  console.log("\n=== Test 3: Batch Minting NFTs ===");
  try {
    const recipients = [donor1.address, donor2.address, donor3.address];
    const batchMintTx = await proofOfDonationNFT.connect(owner).batchMintProofOfDonationNFTs(
      recipients,              // recipients
      3,                       // proposalId
      charityRecipient.address, // charityRecipient
      ethers.parseEther("50"), // donationAmount
      "Community Center",      // charityName
      "Community event funded", // impactMetrics
      true                     // soulbound
    );
    
    await batchMintTx.wait();
    console.log("SUCCESS: Batch minting completed");
    
    // Check if donors received NFTs
    for (let i = 0; i < recipients.length; i++) {
      const hasReceived = await proofOfDonationNFT.hasDonorReceivedNFT(recipients[i], 3);
      console.log(`Donor ${recipients[i]} received NFT for proposal 3: ${hasReceived}`);
    }
    
  } catch (error) {
    console.log("Error in Test 3:", error);
  }
  
  // Test 4: Check token URIs and metadata
  console.log("\n=== Test 4: Checking Token Metadata ===");
  try {
    // Get all tokens owned by donor1
    const donor1Balance = await proofOfDonationNFT.balanceOf(donor1.address);
    console.log(`Donor1 owns ${donor1Balance} NFTs`);
    
    if (donor1Balance > 0) {
      const tokenId = await proofOfDonationNFT.tokenOfOwnerByIndex(donor1.address, 0);
      const tokenURI = await proofOfDonationNFT.tokenURI(tokenId);
      console.log(`Token ${tokenId} URI: ${tokenURI.substring(0, 100)}...`);
      
      // Check if it's soulbound
      const isSoulbound = await proofOfDonationNFT.isSoulbound(tokenId);
      console.log(`Token ${tokenId} is soulbound: ${isSoulbound}`);
    }
    
  } catch (error) {
    console.log("Error in Test 4:", error);
  }
  
  console.log("\nProofOfDonationNFT Functionality Test Completed");
}

// Run the test
testNFTFunctionality()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
