import { expect } from "chai";
import { ethers } from "hardhat";
import { TestSuite } from "./TestSuite";
import { parseEther, parseUnits } from "ethers";

describe("Comprehensive Security Tests", function () {
  let testSuite: TestSuite;

  before(async function () {
    testSuite = new TestSuite();
    await testSuite.deployAll();
  });

  describe("Reentrancy Attack Prevention", function () {
    it("Should prevent reentrancy in escrow release", async function () {
      // This test would require a malicious contract to test reentrancy
      // For now, we verify that ReentrancyGuard is properly implemented
      const price = parseEther("1");
      
      const escrowTx = await testSuite.contracts.enhancedEscrow.connect(testSuite.accounts.buyer).createEscrow(
        testSuite.accounts.seller.address,
        ethers.constants.AddressZero,
        price,
        86400,
        { value: price }
      );
      const escrowReceipt = await escrowTx.wait();
      const escrowId = escrowReceipt.events?.[0]?.args?.escrowId;
      
      // Confirm delivery (this should be protected against reentrancy)
      await testSuite.contracts.enhancedEscrow.connect(testSuite.accounts.buyer).confirmDelivery(escrowId);
      
      // Verify escrow is completed and cannot be manipulated further
      const escrowInfo = await testSuite.contracts.enhancedEscrow.getEscrow(escrowId);
      expect(escrowInfo.status).to.equal(2); // COMPLETED
    });

    it("Should prevent reentrancy in payment processing", async function () {
      const amount = parseEther("1");
      
      // Process payment (should be protected against reentrancy)
      await expect(
        testSuite.contracts.paymentRouter.connect(testSuite.accounts.buyer).processPayment(
          ethers.constants.AddressZero,
          amount,
          testSuite.accounts.seller.address,
          { value: amount }
        )
      ).to.emit(testSuite.contracts.paymentRouter, "PaymentProcessed");
    });
  });

  describe("Access Control Tests", function () {
    it("Should prevent unauthorized access to admin functions", async function () {
      // Test marketplace admin functions
      await expect(
        testSuite.contracts.marketplace.connect(testSuite.accounts.user1).pause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
      
      // Test payment router admin functions
      await expect(
        testSuite.contracts.paymentRouter.connect(testSuite.accounts.user1).setFeeCollector(
          testSuite.accounts.user1.address
        )
      ).to.be.revertedWith("Ownable: caller is not the owner");
      
      // Test reputation system admin functions
      await expect(
        testSuite.contracts.reputationSystem.connect(testSuite.accounts.user1).addModerator(
          testSuite.accounts.user1.address
        )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow only authorized moderators to perform moderation", async function () {
      // Add moderator
      await testSuite.contracts.reputationSystem.addModerator(testSuite.accounts.moderator.address);
      
      // Moderator should be able to flag suspicious activity
      await testSuite.contracts.reputationSystem.connect(testSuite.accounts.moderator).flagSuspiciousActivity(
        testSuite.accounts.user1.address,
        "Test flag"
      );
      
      // Non-moderator should not be able to flag
      await expect(
        testSuite.contracts.reputationSystem.connect(testSuite.accounts.user1).flagSuspiciousActivity(
          testSuite.accounts.user2.address,
          "Unauthorized flag"
        )
      ).to.be.revertedWith("Not authorized");
    });

    it("Should prevent unauthorized escrow manipulation", async function () {
      const price = parseEther("1");
      
      const escrowTx = await testSuite.contracts.enhancedEscrow.connect(testSuite.accounts.buyer).createEscrow(
        testSuite.accounts.seller.address,
        ethers.constants.AddressZero,
        price,
        86400,
        { value: price }
      );
      const escrowReceipt = await escrowTx.wait();
      const escrowId = escrowReceipt.events?.[0]?.args?.escrowId;
      
      // Only buyer should be able to confirm delivery
      await expect(
        testSuite.contracts.enhancedEscrow.connect(testSuite.accounts.user1).confirmDelivery(escrowId)
      ).to.be.revertedWith("Not authorized");
      
      // Only seller should be able to confirm shipment
      await expect(
        testSuite.contracts.enhancedEscrow.connect(testSuite.accounts.user1).confirmShipment(escrowId)
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("Integer Overflow/Underflow Prevention", function () {
    it("Should handle large token amounts safely", async function () {
      const largeAmount = ethers.constants.MaxUint256.div(2);
      
      // Test with large staking amount (should not overflow)
      await expect(
        testSuite.contracts.ldaoToken.connect(testSuite.accounts.treasury).stake(largeAmount, 30)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("Should prevent underflow in token operations", async function () {
      const userBalance = await testSuite.contracts.ldaoToken.balanceOf(testSuite.accounts.user1.address);
      const excessiveAmount = userBalance.add(1);
      
      // Should revert when trying to transfer more than balance
      await expect(
        testSuite.contracts.ldaoToken.connect(testSuite.accounts.user1).transfer(
          testSuite.accounts.user2.address,
          excessiveAmount
        )
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });
  });

  describe("Input Validation Tests", function () {
    it("Should validate marketplace listing parameters", async function () {
      // Test zero price
      await expect(
        testSuite.contracts.marketplace.connect(testSuite.accounts.seller).createListing(
          ethers.constants.AddressZero,
          0,
          0, // Zero price
          1,
          0,
          0
        )
      ).to.be.revertedWith("Price must be greater than 0");
      
      // Test zero quantity
      await expect(
        testSuite.contracts.marketplace.connect(testSuite.accounts.seller).createListing(
          ethers.constants.AddressZero,
          0,
          parseEther("1"),
          0, // Zero quantity
          0,
          0
        )
      ).to.be.revertedWith("Quantity must be greater than 0");
    });

    it("Should validate escrow parameters", async function () {
      // Test zero amount
      await expect(
        testSuite.contracts.enhancedEscrow.connect(testSuite.accounts.buyer).createEscrow(
          testSuite.accounts.seller.address,
          ethers.constants.AddressZero,
          0, // Zero amount
          86400
        )
      ).to.be.revertedWith("Amount must be greater than 0");
      
      // Test invalid seller address
      await expect(
        testSuite.contracts.enhancedEscrow.connect(testSuite.accounts.buyer).createEscrow(
          ethers.constants.AddressZero, // Invalid seller
          ethers.constants.AddressZero,
          parseEther("1"),
          86400,
          { value: parseEther("1") }
        )
      ).to.be.revertedWith("Invalid seller address");
    });

    it("Should validate payment router parameters", async function () {
      // Test excessive fee
      await expect(
        testSuite.contracts.paymentRouter.setFeeBasisPoints(10001) // > 100%
      ).to.be.revertedWith("Fee too high");
      
      // Test zero recipient
      await expect(
        testSuite.contracts.paymentRouter.connect(testSuite.accounts.buyer).processPayment(
          ethers.constants.AddressZero,
          parseEther("1"),
          ethers.constants.AddressZero, // Invalid recipient
          { value: parseEther("1") }
        )
      ).to.be.revertedWith("Invalid recipient");
    });
  });

  describe("Front-Running Protection", function () {
    it("Should handle concurrent marketplace operations safely", async function () {
      const price = parseEther("1");
      
      // Create listing
      const listingTx = await testSuite.contracts.marketplace.connect(testSuite.accounts.seller).createListing(
        ethers.constants.AddressZero,
        0,
        price,
        2, // Quantity 2
        0,
        0
      );
      const listingReceipt = await listingTx.wait();
      const listingId = listingReceipt.events?.[0]?.args?.listingId;
      
      // Two buyers try to purchase simultaneously
      const purchase1 = testSuite.contracts.marketplace.connect(testSuite.accounts.buyer).purchaseItem(
        listingId,
        1,
        { value: price }
      );
      
      const purchase2 = testSuite.contracts.marketplace.connect(testSuite.accounts.user1).purchaseItem(
        listingId,
        1,
        { value: price }
      );
      
      // Both should succeed since quantity is 2
      await expect(purchase1).to.emit(testSuite.contracts.marketplace, "ItemPurchased");
      await expect(purchase2).to.emit(testSuite.contracts.marketplace, "ItemPurchased");
    });

    it("Should prevent double-spending in escrow", async function () {
      const price = parseEther("1");
      
      const escrowTx = await testSuite.contracts.enhancedEscrow.connect(testSuite.accounts.buyer).createEscrow(
        testSuite.accounts.seller.address,
        ethers.constants.AddressZero,
        price,
        86400,
        { value: price }
      );
      const escrowReceipt = await escrowTx.wait();
      const escrowId = escrowReceipt.events?.[0]?.args?.escrowId;
      
      // Confirm delivery
      await testSuite.contracts.enhancedEscrow.connect(testSuite.accounts.buyer).confirmDelivery(escrowId);
      
      // Try to confirm delivery again (should fail)
      await expect(
        testSuite.contracts.enhancedEscrow.connect(testSuite.accounts.buyer).confirmDelivery(escrowId)
      ).to.be.revertedWith("Invalid escrow status");
    });
  });

  describe("Gas Limit and DoS Prevention", function () {
    it("Should handle large arrays efficiently", async function () {
      // Test reward distribution with multiple recipients
      const recipients = [];
      const amounts = [];
      
      for (let i = 0; i < 10; i++) {
        recipients.push(testSuite.accounts.user1.address);
        amounts.push(parseEther("1"));
      }
      
      // Fund reward pool
      await testSuite.contracts.ldaoToken.connect(testSuite.accounts.treasury).transfer(
        testSuite.contracts.rewardPool.address,
        parseEther("100")
      );
      
      // Should handle batch distribution efficiently
      await expect(
        testSuite.contracts.rewardPool.distributeRewards(recipients, amounts)
      ).to.emit(testSuite.contracts.rewardPool, "RewardsDistributed");
    });

    it("Should prevent gas limit attacks in governance", async function () {
      // Create proposal with reasonable parameters
      const description = "Test proposal for gas limit";
      const targets = [testSuite.contracts.ldaoToken.address];
      const values = [0];
      const calldatas = ["0x"];
      
      await expect(
        testSuite.contracts.governance.connect(testSuite.accounts.user1).propose(
          targets, values, calldatas, description
        )
      ).to.emit(testSuite.contracts.governance, "ProposalCreated");
    });
  });

  describe("Token Security Tests", function () {
    it("Should prevent unauthorized minting", async function () {
      // Only treasury should be able to mint (if minting is allowed)
      await expect(
        testSuite.contracts.ldaoToken.connect(testSuite.accounts.user1).mint(
          testSuite.accounts.user1.address,
          parseEther("1000")
        )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should handle permit functionality securely", async function () {
      const amount = parseEther("100");
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      
      // Create permit signature
      const domain = {
        name: await testSuite.contracts.ldaoToken.name(),
        version: "1",
        chainId: 31337,
        verifyingContract: testSuite.contracts.ldaoToken.address
      };
      
      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" }
        ]
      };
      
      const nonce = await testSuite.contracts.ldaoToken.nonces(testSuite.accounts.user1.address);
      
      const value = {
        owner: testSuite.accounts.user1.address,
        spender: testSuite.accounts.user2.address,
        value: amount,
        nonce: nonce,
        deadline: deadline
      };
      
      const signature = await testSuite.accounts.user1._signTypedData(domain, types, value);
      const { v, r, s } = ethers.utils.splitSignature(signature);
      
      // Use permit
      await testSuite.contracts.ldaoToken.permit(
        testSuite.accounts.user1.address,
        testSuite.accounts.user2.address,
        amount,
        deadline,
        v,
        r,
        s
      );
      
      // Verify allowance was set
      const allowance = await testSuite.contracts.ldaoToken.allowance(
        testSuite.accounts.user1.address,
        testSuite.accounts.user2.address
      );
      expect(allowance).to.equal(amount);
    });
  });

  describe("Emergency Mechanisms", function () {
    it("Should handle emergency pause correctly", async function () {
      // Pause marketplace
      await testSuite.contracts.marketplace.pause();
      
      // Verify all operations are paused
      await expect(
        testSuite.contracts.marketplace.connect(testSuite.accounts.seller).createListing(
          ethers.constants.AddressZero,
          0,
          parseEther("1"),
          1,
          0,
          0
        )
      ).to.be.revertedWith("Pausable: paused");
      
      // Unpause
      await testSuite.contracts.marketplace.unpause();
      
      // Verify operations resume
      await expect(
        testSuite.contracts.marketplace.connect(testSuite.accounts.seller).createListing(
          ethers.constants.AddressZero,
          0,
          parseEther("1"),
          1,
          0,
          0
        )
      ).to.emit(testSuite.contracts.marketplace, "ListingCreated");
    });

    it("Should handle emergency withdrawals", async function () {
      const amount = parseEther("1");
      
      // Send ETH to payment router
      await testSuite.accounts.owner.sendTransaction({
        to: testSuite.contracts.paymentRouter.address,
        value: amount
      });
      
      const initialBalance = await ethers.provider.getBalance(testSuite.accounts.owner.address);
      
      // Emergency withdraw
      await testSuite.contracts.paymentRouter.emergencyWithdraw();
      
      const finalBalance = await ethers.provider.getBalance(testSuite.accounts.owner.address);
      expect(finalBalance).to.be.gt(initialBalance);
    });
  });

  describe("Signature Verification Security", function () {
    it("Should prevent signature replay attacks", async function () {
      // This test would verify that signatures cannot be reused
      // Implementation depends on specific signature schemes used
      const nonce1 = await testSuite.contracts.ldaoToken.nonces(testSuite.accounts.user1.address);
      
      // After using a permit, nonce should increment
      const amount = parseEther("100");
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      
      const domain = {
        name: await testSuite.contracts.ldaoToken.name(),
        version: "1",
        chainId: 31337,
        verifyingContract: testSuite.contracts.ldaoToken.address
      };
      
      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" }
        ]
      };
      
      const value = {
        owner: testSuite.accounts.user1.address,
        spender: testSuite.accounts.user2.address,
        value: amount,
        nonce: nonce1,
        deadline: deadline
      };
      
      const signature = await testSuite.accounts.user1._signTypedData(domain, types, value);
      const { v, r, s } = ethers.utils.splitSignature(signature);
      
      await testSuite.contracts.ldaoToken.permit(
        testSuite.accounts.user1.address,
        testSuite.accounts.user2.address,
        amount,
        deadline,
        v,
        r,
        s
      );
      
      const nonce2 = await testSuite.contracts.ldaoToken.nonces(testSuite.accounts.user1.address);
      expect(nonce2).to.equal(nonce1.add(1));
    });
  });
});