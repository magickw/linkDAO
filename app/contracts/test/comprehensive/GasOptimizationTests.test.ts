import { expect } from "chai";
import { ethers } from "hardhat";
import { TestSuite } from "./TestSuite";

const { parseEther, parseUnits } = ethers;

describe("Gas Optimization Tests and Benchmarks", function () {
  let testSuite: TestSuite;
  let gasReport: Record<string, number> = {};

  before(async function () {
    testSuite = new TestSuite();
    await testSuite.deployAll();
  });

  after(async function () {
    console.log("\n=== GAS USAGE REPORT ===");
    Object.entries(gasReport).forEach(([operation, gas]) => {
      console.log(`${operation}: ${gas.toLocaleString()} gas`);
    });
    console.log("========================\n");
  });

  describe("Token Operations Gas Usage", function () {
    it("Should measure LDAO token transfer gas", async function () {
      const amount = parseEther("100");
      
      const tx = await testSuite.contracts.ldaoToken.connect(testSuite.accounts.user1).transfer(
        testSuite.accounts.user2.address,
        amount
      );
      const receipt = await tx.wait();
      
      gasReport["LDAO Token Transfer"] = receipt.gasUsed.toNumber();
      expect(receipt.gasUsed.toNumber()).to.be.lt(100000); // Should be under 100k gas
    });

    it("Should measure staking gas usage", async function () {
      const stakeAmount = parseEther("1000");
      
      const tx = await testSuite.contracts.ldaoToken.connect(testSuite.accounts.user1).stake(stakeAmount, 90);
      const receipt = await tx.wait();
      
      gasReport["LDAO Token Staking"] = receipt.gasUsed.toNumber();
      expect(receipt.gasUsed.toNumber()).to.be.lt(200000); // Should be under 200k gas
    });

    it("Should measure unstaking gas usage", async function () {
      // First stake
      const stakeAmount = parseEther("500");
      await testSuite.contracts.ldaoToken.connect(testSuite.accounts.user2).stake(stakeAmount, 30);
      
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60 + 1]); // 30 days + 1 second
      await ethers.provider.send("evm_mine", []);
      
      const tx = await testSuite.contracts.ldaoToken.connect(testSuite.accounts.user2).unstake();
      const receipt = await tx.wait();
      
      gasReport["LDAO Token Unstaking"] = receipt.gasUsed.toNumber();
      expect(receipt.gasUsed.toNumber()).to.be.lt(150000); // Should be under 150k gas
    });

    it("Should measure reward claiming gas", async function () {
      // First stake to generate rewards
      const stakeAmount = parseEther("1000");
      await testSuite.contracts.ldaoToken.connect(testSuite.accounts.user3).stake(stakeAmount, 90);
      
      // Fast forward time to generate rewards
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 7 days
      await ethers.provider.send("evm_mine", []);
      
      const tx = await testSuite.contracts.ldaoToken.connect(testSuite.accounts.user3).claimRewards();
      const receipt = await tx.wait();
      
      gasReport["LDAO Reward Claiming"] = receipt.gasUsed.toNumber();
      expect(receipt.gasUsed.toNumber()).to.be.lt(120000); // Should be under 120k gas
    });
  });

  describe("Marketplace Operations Gas Usage", function () {
    it("Should measure listing creation gas", async function () {
      const price = parseEther("1");
      
      const tx = await testSuite.contracts.marketplace.connect(testSuite.accounts.seller).createListing(
        ethers.constants.AddressZero,
        0,
        price,
        1,
        0, // ItemType.PHYSICAL
        0  // ListingType.FIXED_PRICE
      );
      const receipt = await tx.wait();
      
      gasReport["Marketplace Create Listing"] = receipt.gasUsed.toNumber();
      expect(receipt.gasUsed.toNumber()).to.be.lt(200000); // Should be under 200k gas
    });

    it("Should measure item purchase gas", async function () {
      const price = parseEther("1");
      
      // Create listing first
      const listingTx = await testSuite.contracts.marketplace.connect(testSuite.accounts.seller).createListing(
        ethers.constants.AddressZero,
        0,
        price,
        1,
        0,
        0
      );
      const listingReceipt = await listingTx.wait();
      const listingId = listingReceipt.events?.[0]?.args?.listingId;
      
      // Purchase item
      const tx = await testSuite.contracts.marketplace.connect(testSuite.accounts.buyer).purchaseItem(
        listingId,
        1,
        { value: price }
      );
      const receipt = await tx.wait();
      
      gasReport["Marketplace Purchase Item"] = receipt.gasUsed.toNumber();
      expect(receipt.gasUsed.toNumber()).to.be.lt(300000); // Should be under 300k gas
    });

    it("Should measure batch listing creation gas", async function () {
      const prices = [parseEther("1"), parseEther("2"), parseEther("3")];
      const quantities = [1, 1, 1];
      
      let totalGas = 0;
      
      for (let i = 0; i < prices.length; i++) {
        const tx = await testSuite.contracts.marketplace.connect(testSuite.accounts.seller).createListing(
          ethers.constants.AddressZero,
          0,
          prices[i],
          quantities[i],
          0,
          0
        );
        const receipt = await tx.wait();
        totalGas += receipt.gasUsed.toNumber();
      }
      
      gasReport["Marketplace Batch Listings (3x)"] = totalGas;
      const avgGasPerListing = totalGas / prices.length;
      expect(avgGasPerListing).to.be.lt(180000); // Should optimize with batching
    });
  });

  describe("Escrow Operations Gas Usage", function () {
    it("Should measure escrow creation gas", async function () {
      const amount = parseEther("1");
      
      const tx = await testSuite.contracts.enhancedEscrow.connect(testSuite.accounts.buyer).createEscrow(
        testSuite.accounts.seller.address,
        ethers.constants.AddressZero,
        amount,
        86400,
        { value: amount }
      );
      const receipt = await tx.wait();
      
      gasReport["Escrow Creation"] = receipt.gasUsed.toNumber();
      expect(receipt.gasUsed.toNumber()).to.be.lt(250000); // Should be under 250k gas
    });

    it("Should measure delivery confirmation gas", async function () {
      const amount = parseEther("1");
      
      // Create escrow
      const escrowTx = await testSuite.contracts.enhancedEscrow.connect(testSuite.accounts.buyer).createEscrow(
        testSuite.accounts.seller.address,
        ethers.constants.AddressZero,
        amount,
        86400,
        { value: amount }
      );
      const escrowReceipt = await escrowTx.wait();
      const escrowId = escrowReceipt.events?.[0]?.args?.escrowId;
      
      // Confirm delivery
      const tx = await testSuite.contracts.enhancedEscrow.connect(testSuite.accounts.buyer).confirmDelivery(escrowId);
      const receipt = await tx.wait();
      
      gasReport["Escrow Delivery Confirmation"] = receipt.gasUsed.toNumber();
      expect(receipt.gasUsed.toNumber()).to.be.lt(150000); // Should be under 150k gas
    });
  });

  describe("Payment Router Gas Usage", function () {
    it("Should measure ETH payment processing gas", async function () {
      const amount = parseEther("1");
      
      const tx = await testSuite.contracts.paymentRouter.connect(testSuite.accounts.buyer).processPayment(
        ethers.constants.AddressZero,
        amount,
        testSuite.accounts.seller.address,
        { value: amount }
      );
      const receipt = await tx.wait();
      
      gasReport["Payment Router ETH Payment"] = receipt.gasUsed.toNumber();
      expect(receipt.gasUsed.toNumber()).to.be.lt(100000); // Should be under 100k gas
    });

    it("Should measure ERC20 payment processing gas", async function () {
      const amount = parseUnits("100", 6);
      
      // Approve first
      await testSuite.contracts.mockUSDC.connect(testSuite.accounts.buyer).approve(
        testSuite.contracts.paymentRouter.address,
        amount
      );
      
      const tx = await testSuite.contracts.paymentRouter.connect(testSuite.accounts.buyer).processPayment(
        testSuite.contracts.mockUSDC.address,
        amount,
        testSuite.accounts.seller.address
      );
      const receipt = await tx.wait();
      
      gasReport["Payment Router ERC20 Payment"] = receipt.gasUsed.toNumber();
      expect(receipt.gasUsed.toNumber()).to.be.lt(120000); // Should be under 120k gas
    });
  });

  describe("Governance Operations Gas Usage", function () {
    it("Should measure proposal creation gas", async function () {
      const description = "Gas test proposal";
      const targets = [testSuite.contracts.ldaoToken.address];
      const values = [0];
      const calldatas = ["0x"];
      
      const tx = await testSuite.contracts.governance.connect(testSuite.accounts.user1).propose(
        targets, values, calldatas, description
      );
      const receipt = await tx.wait();
      
      gasReport["Governance Proposal Creation"] = receipt.gasUsed.toNumber();
      expect(receipt.gasUsed.toNumber()).to.be.lt(200000); // Should be under 200k gas
    });

    it("Should measure voting gas", async function () {
      const description = "Gas test voting proposal";
      const targets = [testSuite.contracts.ldaoToken.address];
      const values = [0];
      const calldatas = ["0x"];
      
      // Create proposal
      const proposalTx = await testSuite.contracts.governance.connect(testSuite.accounts.user1).propose(
        targets, values, calldatas, description
      );
      const proposalReceipt = await proposalTx.wait();
      const proposalId = proposalReceipt.events?.[0]?.args?.proposalId;
      
      // Fast forward to voting period
      await ethers.provider.send("hardhat_mine", ["0x1C20"]);
      
      // Vote
      const tx = await testSuite.contracts.governance.connect(testSuite.accounts.user1).castVote(proposalId, 1);
      const receipt = await tx.wait();
      
      gasReport["Governance Voting"] = receipt.gasUsed.toNumber();
      expect(receipt.gasUsed.toNumber()).to.be.lt(150000); // Should be under 150k gas
    });
  });

  describe("NFT Operations Gas Usage", function () {
    it("Should measure NFT minting gas", async function () {
      const tokenURI = "ipfs://test-nft-metadata";
      const royaltyBps = 500;
      
      const tx = await testSuite.contracts.nftMarketplace.connect(testSuite.accounts.user1).mintNFT(
        testSuite.accounts.user1.address,
        tokenURI,
        royaltyBps
      );
      const receipt = await tx.wait();
      
      gasReport["NFT Minting"] = receipt.gasUsed.toNumber();
      expect(receipt.gasUsed.toNumber()).to.be.lt(200000); // Should be under 200k gas
    });

    it("Should measure NFT listing gas", async function () {
      const tokenURI = "ipfs://test-nft-metadata";
      const royaltyBps = 500;
      const price = parseEther("1");
      
      // Mint NFT first
      const mintTx = await testSuite.contracts.nftMarketplace.connect(testSuite.accounts.user1).mintNFT(
        testSuite.accounts.user1.address,
        tokenURI,
        royaltyBps
      );
      const mintReceipt = await mintTx.wait();
      const tokenId = mintReceipt.events?.[0]?.args?.tokenId;
      
      // List NFT
      const tx = await testSuite.contracts.nftMarketplace.connect(testSuite.accounts.user1).listNFT(tokenId, price);
      const receipt = await tx.wait();
      
      gasReport["NFT Listing"] = receipt.gasUsed.toNumber();
      expect(receipt.gasUsed.toNumber()).to.be.lt(100000); // Should be under 100k gas
    });

    it("Should measure NFT purchase gas", async function () {
      const tokenURI = "ipfs://test-nft-metadata";
      const royaltyBps = 500;
      const price = parseEther("1");
      
      // Mint and list NFT
      const mintTx = await testSuite.contracts.nftMarketplace.connect(testSuite.accounts.user1).mintNFT(
        testSuite.accounts.user1.address,
        tokenURI,
        royaltyBps
      );
      const mintReceipt = await mintTx.wait();
      const tokenId = mintReceipt.events?.[0]?.args?.tokenId;
      
      await testSuite.contracts.nftMarketplace.connect(testSuite.accounts.user1).listNFT(tokenId, price);
      
      // Purchase NFT
      const tx = await testSuite.contracts.nftMarketplace.connect(testSuite.accounts.buyer).buyNFT(
        tokenId,
        { value: price }
      );
      const receipt = await tx.wait();
      
      gasReport["NFT Purchase"] = receipt.gasUsed.toNumber();
      expect(receipt.gasUsed.toNumber()).to.be.lt(200000); // Should be under 200k gas
    });
  });

  describe("Social Features Gas Usage", function () {
    it("Should measure tipping gas", async function () {
      const tipAmount = parseEther("10");
      const postId = "gas-test-post";
      
      // Approve tip router
      await testSuite.contracts.ldaoToken.connect(testSuite.accounts.user1).approve(
        testSuite.contracts.tipRouter.address,
        tipAmount
      );
      
      const tx = await testSuite.contracts.tipRouter.connect(testSuite.accounts.user1).tip(
        testSuite.accounts.user2.address,
        tipAmount,
        postId
      );
      const receipt = await tx.wait();
      
      gasReport["Social Tipping"] = receipt.gasUsed.toNumber();
      expect(receipt.gasUsed.toNumber()).to.be.lt(150000); // Should be under 150k gas
    });

    it("Should measure following gas", async function () {
      const tx = await testSuite.contracts.followModule.connect(testSuite.accounts.user1).follow(
        testSuite.accounts.user2.address
      );
      const receipt = await tx.wait();
      
      gasReport["Social Following"] = receipt.gasUsed.toNumber();
      expect(receipt.gasUsed.toNumber()).to.be.lt(80000); // Should be under 80k gas
    });

    it("Should measure profile registration gas", async function () {
      const handle = "gastest";
      const metadataURI = "ipfs://gas-test-metadata";
      
      const tx = await testSuite.contracts.profileRegistry.connect(testSuite.accounts.user3).registerProfile(
        handle,
        metadataURI
      );
      const receipt = await tx.wait();
      
      gasReport["Profile Registration"] = receipt.gasUsed.toNumber();
      expect(receipt.gasUsed.toNumber()).to.be.lt(150000); // Should be under 150k gas
    });
  });

  describe("Batch Operations Optimization", function () {
    it("Should measure batch reward distribution gas", async function () {
      const recipients = [
        testSuite.accounts.user1.address,
        testSuite.accounts.user2.address,
        testSuite.accounts.user3.address
      ];
      const amounts = [parseEther("10"), parseEther("20"), parseEther("30")];
      
      // Fund reward pool
      await testSuite.contracts.ldaoToken.connect(testSuite.accounts.treasury).transfer(
        testSuite.contracts.rewardPool.address,
        parseEther("100")
      );
      
      const tx = await testSuite.contracts.rewardPool.distributeRewards(recipients, amounts);
      const receipt = await tx.wait();
      
      gasReport["Batch Reward Distribution (3x)"] = receipt.gasUsed.toNumber();
      const avgGasPerRecipient = receipt.gasUsed.toNumber() / recipients.length;
      expect(avgGasPerRecipient).to.be.lt(50000); // Should be efficient per recipient
    });

    it("Should compare single vs batch operations", async function () {
      // Single operations
      let singleOpGas = 0;
      for (let i = 0; i < 3; i++) {
        const tx = await testSuite.contracts.ldaoToken.connect(testSuite.accounts.treasury).transfer(
          testSuite.accounts.user1.address,
          parseEther("1")
        );
        const receipt = await tx.wait();
        singleOpGas += receipt.gasUsed.toNumber();
      }
      
      gasReport["3x Single Transfers"] = singleOpGas;
      
      // Note: For actual batch operations, you would implement a batch transfer function
      // This is just demonstrating the measurement approach
    });
  });

  describe("Storage Optimization Tests", function () {
    it("Should verify efficient storage packing", async function () {
      // Test that struct packing is working efficiently
      const price = parseEther("1");
      
      const tx = await testSuite.contracts.marketplace.connect(testSuite.accounts.seller).createListing(
        ethers.constants.AddressZero,
        0,
        price,
        1,
        0,
        0
      );
      const receipt = await tx.wait();
      
      // Storage operations should be minimal
      expect(receipt.gasUsed.toNumber()).to.be.lt(200000);
    });

    it("Should measure reputation update gas efficiency", async function () {
      const tx = await testSuite.contracts.reputationSystem.updateReputation(
        testSuite.accounts.user1.address,
        100,
        "Gas test review"
      );
      const receipt = await tx.wait();
      
      gasReport["Reputation Update"] = receipt.gasUsed.toNumber();
      expect(receipt.gasUsed.toNumber()).to.be.lt(100000); // Should be under 100k gas
    });
  });

  describe("Gas Optimization Recommendations", function () {
    it("Should provide gas optimization insights", async function () {
      // This test analyzes the gas report and provides recommendations
      const highGasOperations = Object.entries(gasReport)
        .filter(([_, gas]) => gas > 200000)
        .map(([op, gas]) => ({ operation: op, gas }));
      
      if (highGasOperations.length > 0) {
        console.log("\n=== HIGH GAS OPERATIONS (>200k) ===");
        highGasOperations.forEach(({ operation, gas }) => {
          console.log(`${operation}: ${gas.toLocaleString()} gas - Consider optimization`);
        });
      }
      
      const efficientOperations = Object.entries(gasReport)
        .filter(([_, gas]) => gas < 100000)
        .map(([op, gas]) => ({ operation: op, gas }));
      
      if (efficientOperations.length > 0) {
        console.log("\n=== EFFICIENT OPERATIONS (<100k) ===");
        efficientOperations.forEach(({ operation, gas }) => {
          console.log(`${operation}: ${gas.toLocaleString()} gas - Well optimized`);
        });
      }
    });
  });
});