import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { PaymentRouter, MockERC20 } from "../typechain-types";

const { parseEther, parseUnits, formatEther, formatUnits } = ethers;

describe("PaymentRouter System", function () {
  let paymentRouter: PaymentRouter;
  let mockUSDC: MockERC20;
  let mockUSDT: MockERC20;
  let mockDAI: MockERC20;
  let owner: SignerWithAddress;
  let feeCollector: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let recipient: SignerWithAddress;

  const FEE_BASIS_POINTS = 250; // 2.5%
  const MAX_FEE_BASIS_POINTS = 1000; // 10%

  beforeEach(async function () {
    [owner, feeCollector, user1, user2, recipient] = await ethers.getSigners();

    // Deploy PaymentRouter
    const PaymentRouterFactory = await ethers.getContractFactory("PaymentRouter");
    paymentRouter = await PaymentRouterFactory.deploy(FEE_BASIS_POINTS, feeCollector.address);
    await paymentRouter.deployed();

    // Deploy mock tokens
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    
    mockUSDC = await MockERC20Factory.deploy("Mock USDC", "USDC", 6);
    await mockUSDC.deployed();
    
    mockUSDT = await MockERC20Factory.deploy("Mock USDT", "USDT", 6);
    await mockUSDT.deployed();
    
    mockDAI = await MockERC20Factory.deploy("Mock DAI", "DAI", 18);
    await mockDAI.deployed();

    // Add tokens as supported
    await paymentRouter.setTokenSupported(mockUSDC.address, true);
    await paymentRouter.setTokenSupported(mockUSDT.address, true);
    await paymentRouter.setTokenSupported(mockDAI.address, true);

    // Mint tokens to users for testing
    await mockUSDC.mint(user1.address, parseUnits("1000", 6)); // 1000 USDC
    await mockUSDT.mint(user1.address, parseUnits("1000", 6)); // 1000 USDT
    await mockDAI.mint(user1.address, parseEther("1000")); // 1000 DAI
  });

  describe("Deployment and Configuration", function () {
    it("Should deploy with correct initial configuration", async function () {
      expect(await paymentRouter.feeBasisPoints()).to.equal(FEE_BASIS_POINTS);
      expect(await paymentRouter.feeCollector()).to.equal(feeCollector.address);
      expect(await paymentRouter.owner()).to.equal(owner.address);
    });

    it("Should reject invalid fee collector in constructor", async function () {
      const PaymentRouterFactory = await ethers.getContractFactory("PaymentRouter");
      
      await expect(
        PaymentRouterFactory.deploy(FEE_BASIS_POINTS, ethers.constants.AddressZero)
      ).to.be.revertedWith("Invalid fee collector");
    });

    it("Should have correct supported tokens", async function () {
      expect(await paymentRouter.supportedTokens(mockUSDC.address)).to.be.true;
      expect(await paymentRouter.supportedTokens(mockUSDT.address)).to.be.true;
      expect(await paymentRouter.supportedTokens(mockDAI.address)).to.be.true;
    });
  });

  describe("Token Support Management", function () {
    it("Should allow owner to add supported tokens", async function () {
      const newTokenAddress = ethers.Wallet.createRandom().address;
      
      const tx = await paymentRouter.setTokenSupported(newTokenAddress, true);
      
      await expect(tx)
        .to.emit(paymentRouter, "TokenSupported")
        .withArgs(newTokenAddress, true);
      
      expect(await paymentRouter.supportedTokens(newTokenAddress)).to.be.true;
    });

    it("Should allow owner to remove supported tokens", async function () {
      const tx = await paymentRouter.setTokenSupported(mockUSDC.address, false);
      
      await expect(tx)
        .to.emit(paymentRouter, "TokenSupported")
        .withArgs(mockUSDC.address, false);
      
      expect(await paymentRouter.supportedTokens(mockUSDC.address)).to.be.false;
    });

    it("Should prevent non-owner from managing token support", async function () {
      await expect(
        paymentRouter.connect(user1).setTokenSupported(mockUSDC.address, false)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Fee Structure Configuration", function () {
    it("Should allow owner to update fee", async function () {
      const newFee = 500; // 5%
      
      const tx = await paymentRouter.setFee(newFee);
      
      await expect(tx)
        .to.emit(paymentRouter, "FeeUpdated")
        .withArgs(FEE_BASIS_POINTS, newFee);
      
      expect(await paymentRouter.feeBasisPoints()).to.equal(newFee);
    });

    it("Should prevent setting fee too high", async function () {
      const tooHighFee = 1001; // 10.01%
      
      await expect(
        paymentRouter.setFee(tooHighFee)
      ).to.be.revertedWith("Fee too high");
    });

    it("Should allow setting maximum fee", async function () {
      await paymentRouter.setFee(MAX_FEE_BASIS_POINTS);
      expect(await paymentRouter.feeBasisPoints()).to.equal(MAX_FEE_BASIS_POINTS);
    });

    it("Should prevent non-owner from updating fee", async function () {
      await expect(
        paymentRouter.connect(user1).setFee(500)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner to update fee collector", async function () {
      const newCollector = user2.address;
      
      const tx = await paymentRouter.setFeeCollector(newCollector);
      
      await expect(tx)
        .to.emit(paymentRouter, "FeeCollectorUpdated")
        .withArgs(feeCollector.address, newCollector);
      
      expect(await paymentRouter.feeCollector()).to.equal(newCollector);
    });

    it("Should prevent setting invalid fee collector", async function () {
      await expect(
        paymentRouter.setFeeCollector(ethers.constants.AddressZero)
      ).to.be.revertedWith("Invalid fee collector");
    });
  });

  describe("ETH Payment Processing", function () {
    const paymentAmount = parseEther("1"); // 1 ETH
    const expectedFee = paymentAmount.mul(FEE_BASIS_POINTS).div(10000);
    const expectedNet = paymentAmount.sub(expectedFee);

    it("Should process ETH payments with correct fee distribution", async function () {
      const recipientBalanceBefore = await ethers.provider.getBalance(recipient.address);
      const feeCollectorBalanceBefore = await ethers.provider.getBalance(feeCollector.address);
      
      const tx = await paymentRouter.connect(user1).sendEthPayment(
        recipient.address,
        paymentAmount,
        "Test ETH payment",
        { value: paymentAmount }
      );
      
      await expect(tx)
        .to.emit(paymentRouter, "PaymentSent")
        .withArgs(user1.address, recipient.address, ethers.constants.AddressZero, paymentAmount, expectedFee, "Test ETH payment");
      
      const recipientBalanceAfter = await ethers.provider.getBalance(recipient.address);
      const feeCollectorBalanceAfter = await ethers.provider.getBalance(feeCollector.address);
      
      expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(expectedNet);
      expect(feeCollectorBalanceAfter - feeCollectorBalanceBefore).to.equal(expectedFee);
    });

    it("Should handle zero fee correctly", async function () {
      // Set fee to 0
      await paymentRouter.setFee(0);
      
      const recipientBalanceBefore = await ethers.provider.getBalance(recipient.address);
      const feeCollectorBalanceBefore = await ethers.provider.getBalance(feeCollector.address);
      
      await paymentRouter.connect(user1).sendEthPayment(
        recipient.address,
        paymentAmount,
        "Zero fee payment",
        { value: paymentAmount }
      );
      
      const recipientBalanceAfter = await ethers.provider.getBalance(recipient.address);
      const feeCollectorBalanceAfter = await ethers.provider.getBalance(feeCollector.address);
      
      expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(paymentAmount);
      expect(feeCollectorBalanceAfter - feeCollectorBalanceBefore).to.equal(0);
    });

    it("Should reject invalid recipients", async function () {
      await expect(
        paymentRouter.connect(user1).sendEthPayment(
          ethers.constants.AddressZero,
          paymentAmount,
          "Invalid recipient",
          { value: paymentAmount }
        )
      ).to.be.revertedWith("Invalid recipient");
    });

    it("Should reject zero amount", async function () {
      await expect(
        paymentRouter.connect(user1).sendEthPayment(
          recipient.address,
          0,
          "Zero amount",
          { value: parseEther("1") }
        )
      ).to.be.revertedWith("Invalid amount");
    });

    it("Should reject insufficient ETH", async function () {
      await expect(
        paymentRouter.connect(user1).sendEthPayment(
          recipient.address,
          paymentAmount,
          "Insufficient ETH",
          { value: parseEther("0.5") } // Less than payment amount
        )
      ).to.be.revertedWith("Insufficient ETH");
    });

    it("Should handle exact ETH amount", async function () {
      const tx = await paymentRouter.connect(user1).sendEthPayment(
        recipient.address,
        paymentAmount,
        "Exact amount",
        { value: paymentAmount }
      );
      
      await expect(tx).to.not.be.reverted;
    });
  });

  describe("ERC20 Token Payment Processing", function () {
    const paymentAmount = parseUnits("100", 6); // 100 USDC
    const expectedFee = paymentAmount.mul(FEE_BASIS_POINTS).div(10000);
    const expectedNet = paymentAmount.sub(expectedFee);

    beforeEach(async function () {
      // Approve PaymentRouter to spend user's tokens
      await mockUSDC.connect(user1).approve(paymentRouter.address, parseUnits("1000", 6));
      await mockUSDT.connect(user1).approve(paymentRouter.address, parseUnits("1000", 6));
      await mockDAI.connect(user1).approve(paymentRouter.address, parseEther("1000"));
    });

    it("Should process USDC payments with correct fee distribution", async function () {
      const recipientBalanceBefore = await mockUSDC.balanceOf(recipient.address);
      const feeCollectorBalanceBefore = await mockUSDC.balanceOf(feeCollector.address);
      
      const tx = await paymentRouter.connect(user1).sendTokenPayment(
        mockUSDC.address,
        recipient.address,
        paymentAmount,
        "Test USDC payment"
      );
      
      await expect(tx)
        .to.emit(paymentRouter, "PaymentSent")
        .withArgs(user1.address, recipient.address, mockUSDC.address, paymentAmount, expectedFee, "Test USDC payment");
      
      const recipientBalanceAfter = await mockUSDC.balanceOf(recipient.address);
      const feeCollectorBalanceAfter = await mockUSDC.balanceOf(feeCollector.address);
      
      expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(expectedNet);
      expect(feeCollectorBalanceAfter - feeCollectorBalanceBefore).to.equal(expectedFee);
    });

    it("Should process DAI payments (18 decimals)", async function () {
      const daiPaymentAmount = parseEther("100"); // 100 DAI
      const daiExpectedFee = daiPaymentAmount.mul(FEE_BASIS_POINTS).div(10000);
      const daiExpectedNet = daiPaymentAmount.sub(daiExpectedFee);
      
      const recipientBalanceBefore = await mockDAI.balanceOf(recipient.address);
      const feeCollectorBalanceBefore = await mockDAI.balanceOf(feeCollector.address);
      
      await paymentRouter.connect(user1).sendTokenPayment(
        mockDAI.address,
        recipient.address,
        daiPaymentAmount,
        "Test DAI payment"
      );
      
      const recipientBalanceAfter = await mockDAI.balanceOf(recipient.address);
      const feeCollectorBalanceAfter = await mockDAI.balanceOf(feeCollector.address);
      
      expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(daiExpectedNet);
      expect(feeCollectorBalanceAfter - feeCollectorBalanceBefore).to.equal(daiExpectedFee);
    });

    it("Should reject unsupported tokens", async function () {
      // Deploy a new token that's not supported
      const MockERC20Factory = await ethers.getContractFactory("MockERC20");
      const unsupportedToken = await MockERC20Factory.deploy("Unsupported", "UNSUP", 18);
      await unsupportedToken.deployed();
      
      await expect(
        paymentRouter.connect(user1).sendTokenPayment(
          unsupportedToken.address,
          recipient.address,
          parseEther("100"),
          "Unsupported token"
        )
      ).to.be.revertedWith("Token not supported");
    });

    it("Should reject invalid recipients", async function () {
      await expect(
        paymentRouter.connect(user1).sendTokenPayment(
          mockUSDC.address,
          ethers.constants.AddressZero,
          paymentAmount,
          "Invalid recipient"
        )
      ).to.be.revertedWith("Invalid recipient");
    });

    it("Should reject zero amount", async function () {
      await expect(
        paymentRouter.connect(user1).sendTokenPayment(
          mockUSDC.address,
          recipient.address,
          0,
          "Zero amount"
        )
      ).to.be.revertedWith("Invalid amount");
    });

    it("Should handle insufficient allowance", async function () {
      // Reset approval to insufficient amount
      await mockUSDC.connect(user1).approve(paymentRouter.address, parseUnits("50", 6));
      
      await expect(
        paymentRouter.connect(user1).sendTokenPayment(
          mockUSDC.address,
          recipient.address,
          paymentAmount, // 100 USDC, but only 50 approved
          "Insufficient allowance"
        )
      ).to.be.reverted; // SafeERC20 will revert
    });

    it("Should handle insufficient balance", async function () {
      // Try to send more than user has
      const excessiveAmount = parseUnits("2000", 6); // User only has 1000
      
      await mockUSDC.connect(user1).approve(paymentRouter.address, excessiveAmount);
      
      await expect(
        paymentRouter.connect(user1).sendTokenPayment(
          mockUSDC.address,
          recipient.address,
          excessiveAmount,
          "Insufficient balance"
        )
      ).to.be.reverted; // SafeERC20 will revert
    });
  });

  describe("Fee Calculation Edge Cases", function () {
    it("Should handle very small amounts", async function () {
      const smallAmount = parseUnits("0.01", 6); // 0.01 USDC
      const expectedFee = smallAmount.mul(FEE_BASIS_POINTS).div(10000);
      
      await mockUSDC.connect(user1).approve(paymentRouter.address, smallAmount);
      
      const tx = await paymentRouter.connect(user1).sendTokenPayment(
        mockUSDC.address,
        recipient.address,
        smallAmount,
        "Small amount"
      );
      
      await expect(tx)
        .to.emit(paymentRouter, "PaymentSent")
        .withArgs(user1.address, recipient.address, mockUSDC.address, smallAmount, expectedFee, "Small amount");
    });

    it("Should handle amounts that result in zero fees", async function () {
      // Set a very low fee
      await paymentRouter.setFee(1); // 0.01%
      
      const tinyAmount = parseUnits("0.001", 6); // 0.001 USDC
      const expectedFee = tinyAmount.mul(1).div(10000); // Should be 0
      
      await mockUSDC.connect(user1).approve(paymentRouter.address, tinyAmount);
      
      const feeCollectorBalanceBefore = await mockUSDC.balanceOf(feeCollector.address);
      
      await paymentRouter.connect(user1).sendTokenPayment(
        mockUSDC.address,
        recipient.address,
        tinyAmount,
        "Tiny amount"
      );
      
      const feeCollectorBalanceAfter = await mockUSDC.balanceOf(feeCollector.address);
      
      // Fee should be 0 due to rounding down
      expect(feeCollectorBalanceAfter - feeCollectorBalanceBefore).to.equal(0);
    });

    it("Should handle maximum fee correctly", async function () {
      await paymentRouter.setFee(MAX_FEE_BASIS_POINTS); // 10%
      
      const amount = parseUnits("100", 6);
      const expectedFee = amount.mul(MAX_FEE_BASIS_POINTS).div(10000);
      const expectedNet = amount.sub(expectedFee);
      
      await mockUSDC.connect(user1).approve(paymentRouter.address, amount);
      
      const recipientBalanceBefore = await mockUSDC.balanceOf(recipient.address);
      const feeCollectorBalanceBefore = await mockUSDC.balanceOf(feeCollector.address);
      
      await paymentRouter.connect(user1).sendTokenPayment(
        mockUSDC.address,
        recipient.address,
        amount,
        "Max fee test"
      );
      
      const recipientBalanceAfter = await mockUSDC.balanceOf(recipient.address);
      const feeCollectorBalanceAfter = await mockUSDC.balanceOf(feeCollector.address);
      
      expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(expectedNet);
      expect(feeCollectorBalanceAfter - feeCollectorBalanceBefore).to.equal(expectedFee);
    });
  });

  describe("Emergency Withdrawal Functions", function () {
    beforeEach(async function () {
      // Send some ETH and tokens to the contract for testing withdrawals
      await user1.sendTransaction({
        to: paymentRouter.address,
        value: parseEther("1")
      });
      
      await mockUSDC.mint(paymentRouter.address, parseUnits("100", 6));
    });

    it("Should allow owner to withdraw ETH", async function () {
      const contractBalanceBefore = await ethers.provider.getBalance(paymentRouter.address);
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      
      const tx = await paymentRouter.withdrawEth();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.effectiveGasPrice;
      
      const contractBalanceAfter = await ethers.provider.getBalance(paymentRouter.address);
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      
      expect(contractBalanceAfter).to.equal(0);
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + contractBalanceBefore - gasUsed);
    });

    it("Should allow owner to withdraw tokens", async function () {
      const contractBalanceBefore = await mockUSDC.balanceOf(paymentRouter.address);
      const ownerBalanceBefore = await mockUSDC.balanceOf(owner.address);
      
      await paymentRouter.withdrawToken(mockUSDC.address);
      
      const contractBalanceAfter = await mockUSDC.balanceOf(paymentRouter.address);
      const ownerBalanceAfter = await mockUSDC.balanceOf(owner.address);
      
      expect(contractBalanceAfter).to.equal(0);
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + contractBalanceBefore);
    });

    it("Should prevent non-owner from withdrawing ETH", async function () {
      await expect(
        paymentRouter.connect(user1).withdrawEth()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should prevent non-owner from withdrawing tokens", async function () {
      await expect(
        paymentRouter.connect(user1).withdrawToken(mockUSDC.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Integration Scenarios", function () {
    it("Should handle multiple payments in sequence", async function () {
      await mockUSDC.connect(user1).approve(paymentRouter.address, parseUnits("1000", 6));
      
      const payments = [
        { amount: parseUnits("50", 6), memo: "Payment 1" },
        { amount: parseUnits("75", 6), memo: "Payment 2" },
        { amount: parseUnits("25", 6), memo: "Payment 3" }
      ];

      let totalFees = ethers.BigNumber.from(0);
      let totalNet = ethers.BigNumber.from(0);

      for (const payment of payments) {
        const expectedFee = payment.amount.mul(FEE_BASIS_POINTS).div(10000);
        const expectedNet = payment.amount.sub(expectedFee);

        totalFees = totalFees.add(expectedFee);
        totalNet = totalNet.add(expectedNet);
        
        await paymentRouter.connect(user1).sendTokenPayment(
          mockUSDC.address,
          recipient.address,
          payment.amount,
          payment.memo
        );
      }
      
      const recipientBalance = await mockUSDC.balanceOf(recipient.address);
      const feeCollectorBalance = await mockUSDC.balanceOf(feeCollector.address);
      
      expect(recipientBalance).to.equal(totalNet);
      expect(feeCollectorBalance).to.equal(totalFees);
    });

    it("Should handle mixed ETH and token payments", async function () {
      await mockUSDC.connect(user1).approve(paymentRouter.address, parseUnits("100", 6));
      
      // ETH payment
      const ethAmount = parseEther("0.5");
      await paymentRouter.connect(user1).sendEthPayment(
        recipient.address,
        ethAmount,
        "ETH payment",
        { value: ethAmount }
      );
      
      // Token payment
      const tokenAmount = parseUnits("100", 6);
      await paymentRouter.connect(user1).sendTokenPayment(
        mockUSDC.address,
        recipient.address,
        tokenAmount,
        "Token payment"
      );
      
      // Verify both payments were processed
      const ethBalance = await ethers.provider.getBalance(recipient.address);
      const tokenBalance = await mockUSDC.balanceOf(recipient.address);
      
      expect(ethBalance).to.be.gt(0);
      expect(tokenBalance).to.be.gt(0);
    });
  });
});