// Script to demonstrate SubDAO pilot launch for local charity
// This script shows how to create and interact with a charity SubDAO

import { ethers } from "hardhat";
import { CharitySubDAOFactory, BaseSubDAO } from "../typechain-types";

async function testSubDAOPilot() {
  console.log("Starting SubDAO Pilot Test for Local Charity");
  
  // Get signers
  const [owner, charityAdmin, member1, member2, member3, localCharity] = await ethers.getSigners();
  
  // Contract addresses from deployedAddresses-sepolia.json
  const charitySubDAOFactoryAddress = "0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3";
  const baseSubDAOAddress = "0xAe798cAD6842673999F91150A036D5D5621D62A5";
  
  // Connect to contracts
  const CharitySubDAOFactory = await ethers.getContractFactory("CharitySubDAOFactory");
  const charitySubDAOFactory = CharitySubDAOFactory.attach(charitySubDAOFactoryAddress) as CharitySubDAOFactory;
  
  console.log("Connected to CharitySubDAOFactory contract");
  
  // Get initial state
  const initialSubDAOCount = await charitySubDAOFactory.getTotalSubDAOs();
  console.log(`Initial SubDAO count: ${initialSubDAOCount}`);
  
  // Test 1: Create a local charity SubDAO
  console.log("\n=== Test 1: Creating Local Charity SubDAO ===");
  try {
    // Create a SubDAO for a local charity
    const initialMembers = [charityAdmin.address, member1.address, member2.address];
    const creationStake = ethers.parseEther("10000"); // Minimum required stake
    
    console.log("Creating SubDAO for local food bank...");
    const createTx = await charitySubDAOFactory.connect(owner).createSubDAO(
      "Local Food Bank DAO",     // name
      "San Francisco, CA",       // region
      "Supporting local food banks and addressing food insecurity in the San Francisco Bay Area", // description
      initialMembers,            // initial members
      creationStake              // initial stake
    );
    
    const receipt = await createTx.wait();
    
    // Extract SubDAO ID from event
    const subDAOCreatedEvent = receipt?.logs.find(log => 
      log.topics[0] === ethers.id("SubDAOCreated(uint256,address,string,string,address)")
    );
    
    if (subDAOCreatedEvent) {
      // Decode the event to get the SubDAO ID
      const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
        ["uint256", "address", "string", "string", "address"],
        subDAOCreatedEvent.data
      );
      const subDAOId = decoded[0];
      const subDAOAddress = decoded[1];
      
      console.log(`SubDAO created with ID: ${subDAOId}`);
      console.log(`SubDAO address: ${subDAOAddress}`);
      
      // Get SubDAO info
      const subDAOInfo = await charitySubDAOFactory.getSubDAOInfo(subDAOId);
      console.log(`SubDAO Name: ${subDAOInfo.name}`);
      console.log(`SubDAO Region: ${subDAOInfo.region}`);
      console.log(`SubDAO Description: ${subDAOInfo.description}`);
      console.log(`SubDAO Creator: ${subDAOInfo.creator}`);
      console.log(`SubDAO Active: ${subDAOInfo.isActive}`);
      console.log(`Total Members: ${subDAOInfo.totalMembers}`);
      
      // Connect to the created SubDAO
      const BaseSubDAO = await ethers.getContractFactory("BaseSubDAO");
      const subDAO = BaseSubDAO.attach(subDAOAddress) as BaseSubDAO;
      
      console.log("\n=== Test 2: SubDAO Operations ===");
      
      // Check SubDAO details
      console.log(`SubDAO Name: ${await subDAO.getName()}`);
      console.log(`SubDAO Region: ${await subDAO.getRegion()}`);
      console.log(`SubDAO Description: ${await subDAO.getDescription()}`);
      console.log(`SubDAO Active: ${await subDAO.isActive()}`);
      console.log(`SubDAO Creator: ${await subDAO.getCreator()}`);
      
      // Test 3: Add a new member
      console.log("\nAdding new member to SubDAO...");
      const addMemberTx = await subDAO.connect(charityAdmin).addMember(member3.address);
      await addMemberTx.wait();
      
      console.log(`Member3 is now a member: ${await subDAO.members(member3.address)}`);
      
      // Test 4: Create a charity proposal
      console.log("\nCreating charity proposal...");
      const proposalTx = await subDAO.connect(charityAdmin).createCharityProposal(
        "Donate to Local Food Bank",
        "Proposal to donate to the local food bank to help families in need",
        localCharity.address,
        ethers.parseEther("5000"),
        "SF Community Food Bank",
        "Providing meals to families in need",
        "ipfs://QmCharityVerification",
        "2000 meals provided"
      );
      
      await proposalTx.wait();
      
      console.log(`Total proposals after creation: ${await subDAO.getTotalProposals()}`);
      
      // Test 5: Add another member and make them an admin
      console.log("\nAdding member2 as admin...");
      const addAdminTx = await subDAO.connect(charityAdmin).addAdmin(member2.address);
      await addAdminTx.wait();
      
      console.log(`Member2 is now admin: ${await subDAO.admins(member2.address)}`);
      
      // Test 6: Update SubDAO configuration
      console.log("\nUpdating SubDAO configuration...");
      const updateTx = await subDAO.connect(charityAdmin).updateConfig(
        "Bay Area Food Security DAO",  // new name
        "Bay Area, CA",               // new region
        "Supporting food security initiatives across the Bay Area" // new description
      );
      await updateTx.wait();
      
      console.log(`Updated SubDAO Name: ${await subDAO.getName()}`);
      console.log(`Updated SubDAO Region: ${await subDAO.getRegion()}`);
      console.log(`Updated SubDAO Description: ${await subDAO.getDescription()}`);
      
      console.log("\nSubDAO pilot test completed successfully!");
      
    } else {
      console.log("ERROR: Could not find SubDAOCreated event in transaction receipt");
    }
  } catch (error) {
    console.log("Error in SubDAO pilot test:", error);
  }
  
  // Test 7: Get all SubDAOs
  console.log("\n=== Test 3: Checking All SubDAOs ===");
  try {
    const totalSubDAOs = await charitySubDAOFactory.getTotalSubDAOs();
    console.log(`Total SubDAOs: ${totalSubDAOs}`);
    
    for (let i = 1; i <= totalSubDAOs; i++) {
      try {
        const subDAOInfo = await charitySubDAOFactory.getSubDAOInfo(i);
        console.log(`SubDAO ${i}: ${subDAOInfo.name} in ${subDAOInfo.region}`);
      } catch (error) {
        // SubDAO might not exist if IDs are not sequential
        continue;
      }
    }
  } catch (error) {
    console.log("Error checking SubDAOs:", error);
  }
  
  console.log("\nSubDAO Pilot Test Completed");
}

// Run the test
testSubDAOPilot()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });