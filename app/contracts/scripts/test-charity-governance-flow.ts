// Script to test the full charity governance flow
// This script will:
// 1. Create a charity donation proposal
// 2. Simulate voting on the proposal
// 3. Queue and execute the proposal
// 4. Verify the donation was made

import { ethers, network } from "hardhat";
import { CharityGovernance, EnhancedLDAOTreasury, LDAOToken, CharityVerificationSystem } from "../typechain-types";

async function testGovernanceFlow() {
  console.log("Starting Charity Governance Flow Test");
  
  // Get signers
  const [owner, proposer, voter1, voter2, voter3, charityRecipient] = await ethers.getSigners();
  
  // Contract addresses from deployedAddresses-sepolia.json
  const charityGovernanceAddress = "0x25b39592AA8da0be424734E0F143E5371396dd61";
  const treasuryAddress = "0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5";
  const ldaoTokenAddress = "0xc9F690B45e33ca909bB9ab97836091673232611B";
  const charityVerificationAddress = "0x4e2F69c11897771e443A3EA03E207DC402496eb0";
  
  // Connect to contracts
  const CharityGovernance = await ethers.getContractFactory("CharityGovernance");
  const charityGovernance = CharityGovernance.attach(charityGovernanceAddress) as CharityGovernance;
  
  const LDAOToken = await ethers.getContractFactory("LDAOToken");
  const ldaoToken = LDAOToken.attach(ldaoTokenAddress) as LDAOToken;
  
  const Treasury = await ethers.getContractFactory("EnhancedLDAOTreasury");
  const treasury = Treasury.attach(treasuryAddress) as EnhancedLDAOTreasury;
  
  const CharityVerification = await ethers.getContractFactory("CharityVerificationSystem");
  const charityVerification = CharityVerification.attach(charityVerificationAddress) as CharityVerificationSystem;
  
  console.log("Connected to contracts");
  
  // Check initial balances
  const initialTreasuryBalance = await ldaoToken.balanceOf(treasuryAddress);
  const initialCharityBalance = await ldaoToken.balanceOf(charityRecipient.address);
  
  console.log(`Initial Treasury Balance: ${ethers.formatEther(initialTreasuryBalance)} LDAO`);
  console.log(`Initial Charity Balance: ${ethers.formatEther(initialCharityBalance)} LDAO`);
  
  // Add charity to verification system (if not already added)
  try {
    console.log("Adding charity to verification system...");
    const addCharityTx = await charityVerification.connect(owner).addCharity(
      charityRecipient.address,
      "Local Food Bank",
      "Providing food assistance to families in need",
      "ipfs://Qm..." // documentation
    );
    await addCharityTx.wait();
    console.log("Charity added to verification system");
    
    // Approve the charity
    const approveCharityTx = await charityVerification.connect(owner).approveCharity(charityRecipient.address);
    await approveCharityTx.wait();
    console.log("Charity approved");
  } catch (error) {
    console.log("Charity may already be added/approved");
  }
  
  // Mint tokens to proposer if needed (for testing)
  const proposerBalance = await ldaoToken.balanceOf(proposer.address);
  console.log(`Proposer LDAO Balance: ${ethers.formatEther(proposerBalance)} LDAO`);
  
  if (proposerBalance < ethers.parseEther("10000")) {
    console.log("Minting tokens to proposer...");
    const mintTx = await ldaoToken.connect(owner).mint(proposer.address, ethers.parseEther("100000"));
    await mintTx.wait();
    console.log("Tokens minted to proposer");
  }
  
  // Create a charity donation proposal
  console.log("Creating charity donation proposal...");
  const proposalTx = await charityGovernance.connect(proposer).proposeCharityDonation(
    "Support Local Food Bank",
    "Proposal to donate to the local food bank to help families in need",
    charityRecipient.address, // charity recipient
    ethers.parseEther("1000"), // donation amount (1000 LDAO)
    "Local Food Bank",
    "Providing food assistance to families in need",
    "ipfs://Qm...", // proof of verification
    "1000 meals provided to families in need" // impact metrics
  );
  
  const proposalReceipt = await proposalTx.wait();
  const proposalId = proposalReceipt?.logs[0].args?.[0] || 1;
  console.log(`Proposal created with ID: ${proposalId}`);
  
  // Get proposal details
  const proposal = await charityGovernance.getProposal(proposalId);
  console.log(`Proposal State: ${proposal.state}`);
  console.log(`Proposal Category: ${proposal.category}`);
  console.log(`Donation Amount: ${ethers.formatEther(proposal.donationAmount)} LDAO`);
  console.log(`Charity Recipient: ${proposal.charityRecipient}`);
  
  // Wait for voting to start (simulate block advancement)
  console.log("Waiting for voting period to start...");
  // In a real scenario, we would wait for the voting delay to pass
  // For testing, we'll just proceed assuming voting has started
  
  // Simulate voting
  console.log("Simulating votes...");
  
  // Mint tokens to voters if needed
  for (const voter of [voter1, voter2, voter3]) {
    const voterBalance = await ldaoToken.balanceOf(voter.address);
    if (voterBalance < ethers.parseEther("10000")) {
      console.log(`Minting tokens to voter ${voter.address}...`);
      const mintTx = await ldaoToken.connect(owner).mint(voter.address, ethers.parseEther("50000"));
      await mintTx.wait();
    }
  }
  
  // Cast votes
  try {
    const vote1Tx = await charityGovernance.connect(voter1).castVote(
      proposalId,
      1, // For vote
      "Supporting local charity"
    );
    await vote1Tx.wait();
    console.log("Vote 1 cast (For)");
    
    const vote2Tx = await charityGovernance.connect(voter2).castVote(
      proposalId,
      1, // For vote
      "Important cause"
    );
    await vote2Tx.wait();
    console.log("Vote 2 cast (For)");
    
    const vote3Tx = await charityGovernance.connect(voter3).castVote(
      proposalId,
      1, // For vote
      "Community support"
    );
    await vote3Tx.wait();
    console.log("Vote 3 cast (For)");
  } catch (error) {
    console.log("Error casting votes:", error);
  }
  
  // Check vote results
  const updatedProposal = await charityGovernance.getProposal(proposalId);
  console.log(`For Votes: ${ethers.formatEther(updatedProposal.forVotes)} LDAO`);
  console.log(`Against Votes: ${ethers.formatEther(updatedProposal.againstVotes)} LDAO`);
  console.log(`Abstain Votes: ${ethers.formatEther(updatedProposal.abstainVotes)} LDAO`);
  
  // Wait for voting to end (simulate)
  console.log("Waiting for voting period to end...");
  // In a real scenario, we would wait for the voting period to pass
  // For testing, we'll just proceed assuming voting has ended
  
  // Check if proposal succeeded
  // In a real contract, there would be a state function to check this
  console.log("Checking proposal result...");
  
  // Queue the proposal for execution (if it succeeded)
  try {
    console.log("Queueing proposal for execution...");
    const queueTx = await charityGovernance.connect(owner).queue(proposalId);
    await queueTx.wait();
    console.log("Proposal queued");
    
    // Check updated proposal state
    const queuedProposal = await charityGovernance.getProposal(proposalId);
    console.log(`Proposal State after queue: ${queuedProposal.state}`);
  } catch (error) {
    console.log("Error queueing proposal:", error);
  }
  
  // Wait for execution delay (simulate)
  console.log("Waiting for execution delay...");
  // In a real scenario, we would wait for the execution delay to pass
  // For testing, we'll just proceed
  
  // Authorize treasury as target (if not already authorized)
  try {
    console.log("Authorizing treasury as target...");
    const authorizeTx = await charityGovernance.connect(owner).authorizeTarget(treasuryAddress);
    await authorizeTx.wait();
    console.log("Treasury authorized as target");
  } catch (error) {
    console.log("Treasury may already be authorized");
  }
  
  // Execute the proposal
  try {
    console.log("Executing proposal...");
    const executeTx = await charityGovernance.connect(owner).execute(proposalId);
    await executeTx.wait();
    console.log("Proposal executed successfully");
    
    // Check updated proposal state
    const executedProposal = await charityGovernance.getProposal(proposalId);
    console.log(`Proposal State after execution: ${executedProposal.state}`);
  } catch (error) {
    console.log("Error executing proposal:", error);
  }
  
  // Check final balances
  const finalTreasuryBalance = await ldaoToken.balanceOf(treasuryAddress);
  const finalCharityBalance = await ldaoToken.balanceOf(charityRecipient.address);
  
  console.log(`Final Treasury Balance: ${ethers.formatEther(finalTreasuryBalance)} LDAO`);
  console.log(`Final Charity Balance: ${ethers.formatEther(finalCharityBalance)} LDAO`);
  
  const treasuryDifference = initialTreasuryBalance - finalTreasuryBalance;
  const charityDifference = finalCharityBalance - initialCharityBalance;
  
  console.log(`Treasury Balance Change: ${ethers.formatEther(treasuryDifference)} LDAO`);
  console.log(`Charity Balance Change: ${ethers.formatEther(charityDifference)} LDAO`);
  
  console.log("Governance Flow Test Completed");
}

// Run the test
testGovernanceFlow()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });