import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("LDAO Bridge", function () {
  // Fixture for deploying contracts
  async function deployBridgeFixture() {
    const [owner, user1, user2, validator1, validator2, validator3] = await ethers.getSigners();

    // Deploy LDAO Token
    const LDAOToken = await ethers.getContractFactory("LDAOToken");
    const ldaoToken = await LDAOToken.deploy(owner.address);
    await ldaoToken.waitForDeployment();

    // Deploy Bridge Validator
    const BridgeValidator = await ethers.getContractFactory("BridgeValidator");
    const bridgeValidator = await BridgeValidator.deploy(owner.address);
    await bridgeValidator.waitForDeployment();

    // Deploy LDAO Bridge
    const LDAOBridge = await ethers.getContractFactory("LDAOBridge");
    const ldaoBridge = await LDAOBridge.deploy(await ldaoToken.getAddress(), owner.address);
    await ldaoBridge.waitForDeployment();

    // Deploy Bridge Token for destination chain
    const LDAOBridgeToken = await ethers.getContractFactory("LDAOBridgeToken");
    const ldaoBridgeToken = await LDAOBridgeToken.deploy(
      "Bridged LinkDAO Token",
      "bLDAO",
      await ldaoBridge.getAddress(),
      owner.address
    );
    await ldaoBridgeToken.waitForDeployment();

    // Setup initial state
    const initialSupply = ethers.parseEther("1000000"); // 1M tokens for testing
    await ldaoToken.transfer(user1.address, initialSupply);
    await ldaoToken.transfer(user2.address, initialSupply);

    // Setup validators
    const stakeAmount = ethers.parseEther("10000");
    
    // Transfer stake amounts to validators
    await ldaoToken.transfer(validator1.address, stakeAmount);
    await ldaoToken.transfer(validator2.address, stakeAmount);
    await ldaoToken.transfer(validator3.address, stakeAmount);

    // Approve and add validators
    await ldaoToken.connect(validator1).approve(await bridgeValidator.getAddress(), stakeAmount);
    await ldaoToken.connect(validator2).approve(await bridgeValidator.getAddress(), stakeAmount);
    await ldaoToken.connect(validator3).approve(await bridgeValidator.getAddress(), stakeAmount);

    await bridgeValidator.addValidator(validator1.address, stakeAmount);
    await bridgeValidator.addValidator(validator2.address, stakeAmount);
    await bridgeValidator.addValidator(validator3.address, stakeAmount);

    return {
      ldaoToken,
      ldaoBridge,
      bridgeValidator,
      ldaoBridgeToken,
      owner,
      user1,
      user2,
      validator1,
      validator2,
      validator3
    };
  }

  describe("Deployment", function () {
    it("Should deploy with correct initial state", async function () {
      const { ldaoBridge, ldaoToken, owner } = await loadFixture(deployBridgeFixture);

      expect(await ldaoBridge.ldaoToken()).to.equal(await ldaoToken.getAddress());
      expect(await ldaoBridge.owner()).to.equal(owner.address);
      expect(await ldaoBridge.bridgeNonce()).to.equal(0);
      expect(await ldaoBridge.totalLocked()).to.equal(0);
      expect(await ldaoBridge.totalBridged()).to.equal(0);
      expect(await ldaoBridge.validatorThreshold()).to.equal(3);
    });

    it("Should initialize chain configurations", async function () {
      const { ldaoBridge } = await loadFixture(deployBridgeFixture);

      // Check Ethereum config (ChainId.ETHEREUM = 0)
      const ethConfig = await ldaoBridge.getChainConfig(0);
      expect(ethConfig.isSupported).to.be.true;
      expect(ethConfig.minBridgeAmount).to.equal(ethers.parseEther("10"));
      expect(ethConfig.maxBridgeAmount).to.equal(ethers.parseEther("1000000"));
      expect(ethConfig.isLockChain).to.be.true;

      // Check Polygon config (ChainId.POLYGON = 1)
      const polygonConfig = await ldaoBridge.getChainConfig(1);
      expect(polygonConfig.isSupported).to.be.true;
      expect(polygonConfig.isLockChain).to.be.false;
    });
  });

  describe("Bridge Initiation", function () {
    it("Should initiate bridge transaction successfully", async function () {
      const { ldaoBridge, ldaoToken, user1 } = await loadFixture(deployBridgeFixture);

      const bridgeAmount = ethers.parseEther("100");
      const destinationChain = 1; // Polygon

      // Approve bridge contract
      await ldaoToken.connect(user1).approve(await ldaoBridge.getAddress(), ethers.parseEther("200"));

      // Calculate expected fee
      const expectedFee = await ldaoBridge.calculateBridgeFee(bridgeAmount, destinationChain);

      await expect(ldaoBridge.connect(user1).initiateBridge(bridgeAmount, destinationChain))
        .to.emit(ldaoBridge, "BridgeInitiated")
        .withArgs(1, user1.address, bridgeAmount, 0, destinationChain, expectedFee);

      // Check bridge transaction
      const bridgeTx = await ldaoBridge.getBridgeTransaction(1);
      expect(bridgeTx.user).to.equal(user1.address);
      expect(bridgeTx.amount).to.equal(bridgeAmount);
      expect(bridgeTx.sourceChain).to.equal(0); // Ethereum
      expect(bridgeTx.destinationChain).to.equal(destinationChain);
      expect(bridgeTx.status).to.equal(0); // PENDING

      // Check state updates
      expect(await ldaoBridge.totalLocked()).to.equal(bridgeAmount);
      expect(await ldaoBridge.bridgeNonce()).to.equal(1);
    });

    it("Should reject bridge with insufficient balance", async function () {
      const { ldaoBridge, user1 } = await loadFixture(deployBridgeFixture);

      const bridgeAmount = ethers.parseEther("2000000"); // More than user balance
      const destinationChain = 1;

      await expect(
        ldaoBridge.connect(user1).initiateBridge(bridgeAmount, destinationChain)
      ).to.be.revertedWith("Insufficient balance");
    });

    it("Should reject bridge below minimum amount", async function () {
      const { ldaoBridge, ldaoToken, user1 } = await loadFixture(deployBridgeFixture);

      const bridgeAmount = ethers.parseEther("5"); // Below minimum of 10
      const destinationChain = 1;

      await ldaoToken.connect(user1).approve(await ldaoBridge.getAddress(), bridgeAmount);

      await expect(
        ldaoBridge.connect(user1).initiateBridge(bridgeAmount, destinationChain)
      ).to.be.revertedWith("Amount below minimum");
    });

    it("Should reject bridge above maximum amount", async function () {
      const { ldaoBridge, ldaoToken, user1 } = await loadFixture(deployBridgeFixture);

      const bridgeAmount = ethers.parseEther("2000000"); // Above maximum of 1M
      const destinationChain = 1;

      // Give user enough tokens
      await ldaoToken.transfer(user1.address, bridgeAmount);
      await ldaoToken.connect(user1).approve(await ldaoBridge.getAddress(), bridgeAmount.mul(2));

      await expect(
        ldaoBridge.connect(user1).initiateBridge(bridgeAmount, destinationChain)
      ).to.be.revertedWith("Amount above maximum");
    });
  });

  describe("Bridge Completion", function () {
    it("Should complete bridge with sufficient validator signatures", async function () {
      const { ldaoBridge, ldaoToken, user1, validator1, validator2, validator3 } = await loadFixture(deployBridgeFixture);

      const bridgeAmount = ethers.parseEther("100");
      const destinationChain = 1;

      // Initiate bridge
      await ldaoToken.connect(user1).approve(await ldaoBridge.getAddress(), ethers.parseEther("200"));
      await ldaoBridge.connect(user1).initiateBridge(bridgeAmount, destinationChain);

      const txHash = ethers.keccak256(ethers.toUtf8Bytes("test-tx-hash"));

      // Complete bridge with validators
      await expect(ldaoBridge.connect(validator1).completeBridge(1, txHash))
        .to.emit(ldaoBridge, "ValidatorSigned")
        .withArgs(1, validator1.address);

      await expect(ldaoBridge.connect(validator2).completeBridge(1, txHash))
        .to.emit(ldaoBridge, "ValidatorSigned")
        .withArgs(1, validator2.address);

      await expect(ldaoBridge.connect(validator3).completeBridge(1, txHash))
        .to.emit(ldaoBridge, "BridgeCompleted")
        .withArgs(1, user1.address, bridgeAmount, txHash);

      // Check final state
      const bridgeTx = await ldaoBridge.getBridgeTransaction(1);
      expect(bridgeTx.status).to.equal(1); // COMPLETED
      expect(bridgeTx.txHash).to.equal(txHash);
      expect(await ldaoBridge.totalBridged()).to.equal(bridgeAmount);
    });

    it("Should reject completion from non-validator", async function () {
      const { ldaoBridge, ldaoToken, user1, user2 } = await loadFixture(deployBridgeFixture);

      const bridgeAmount = ethers.parseEther("100");
      const destinationChain = 1;

      // Initiate bridge
      await ldaoToken.connect(user1).approve(await ldaoBridge.getAddress(), ethers.parseEther("200"));
      await ldaoBridge.connect(user1).initiateBridge(bridgeAmount, destinationChain);

      const txHash = ethers.keccak256(ethers.toUtf8Bytes("test-tx-hash"));

      await expect(
        ldaoBridge.connect(user2).completeBridge(1, txHash)
      ).to.be.revertedWith("Not a validator");
    });

    it("Should reject duplicate validator signatures", async function () {
      const { ldaoBridge, ldaoToken, user1, validator1 } = await loadFixture(deployBridgeFixture);

      const bridgeAmount = ethers.parseEther("100");
      const destinationChain = 1;

      // Initiate bridge
      await ldaoToken.connect(user1).approve(await ldaoBridge.getAddress(), ethers.parseEther("200"));
      await ldaoBridge.connect(user1).initiateBridge(bridgeAmount, destinationChain);

      const txHash = ethers.keccak256(ethers.toUtf8Bytes("test-tx-hash"));

      // First signature should succeed
      await ldaoBridge.connect(validator1).completeBridge(1, txHash);

      // Second signature from same validator should fail
      await expect(
        ldaoBridge.connect(validator1).completeBridge(1, txHash)
      ).to.be.revertedWith("Already signed");
    });
  });

  describe("Bridge Failure and Cancellation", function () {
    it("Should allow validator to fail bridge and refund user", async function () {
      const { ldaoBridge, ldaoToken, user1, validator1 } = await loadFixture(deployBridgeFixture);

      const bridgeAmount = ethers.parseEther("100");
      const destinationChain = 1;
      const initialBalance = await ldaoToken.balanceOf(user1.address);

      // Initiate bridge
      await ldaoToken.connect(user1).approve(await ldaoBridge.getAddress(), ethers.parseEther("200"));
      await ldaoBridge.connect(user1).initiateBridge(bridgeAmount, destinationChain);

      const balanceAfterBridge = await ldaoToken.balanceOf(user1.address);

      // Fail bridge
      await expect(ldaoBridge.connect(validator1).failBridge(1, "Test failure"))
        .to.emit(ldaoBridge, "BridgeFailed")
        .withArgs(1, user1.address, "Test failure");

      // Check refund
      const finalBalance = await ldaoToken.balanceOf(user1.address);
      expect(finalBalance).to.equal(initialBalance);

      // Check bridge transaction status
      const bridgeTx = await ldaoBridge.getBridgeTransaction(1);
      expect(bridgeTx.status).to.equal(2); // FAILED
    });

    it("Should allow user to cancel expired bridge", async function () {
      const { ldaoBridge, ldaoToken, user1 } = await loadFixture(deployBridgeFixture);

      const bridgeAmount = ethers.parseEther("100");
      const destinationChain = 1;
      const initialBalance = await ldaoToken.balanceOf(user1.address);

      // Initiate bridge
      await ldaoToken.connect(user1).approve(await ldaoBridge.getAddress(), ethers.parseEther("200"));
      await ldaoBridge.connect(user1).initiateBridge(bridgeAmount, destinationChain);

      // Fast forward time beyond timeout
      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]); // 24 hours + 1 second
      await ethers.provider.send("evm_mine", []);

      // Cancel bridge
      await ldaoBridge.connect(user1).cancelBridge(1);

      // Check refund
      const finalBalance = await ldaoToken.balanceOf(user1.address);
      expect(finalBalance).to.equal(initialBalance);

      // Check bridge transaction status
      const bridgeTx = await ldaoBridge.getBridgeTransaction(1);
      expect(bridgeTx.status).to.equal(3); // CANCELLED
    });

    it("Should reject early cancellation", async function () {
      const { ldaoBridge, ldaoToken, user1 } = await loadFixture(deployBridgeFixture);

      const bridgeAmount = ethers.parseEther("100");
      const destinationChain = 1;

      // Initiate bridge
      await ldaoToken.connect(user1).approve(await ldaoBridge.getAddress(), ethers.parseEther("200"));
      await ldaoBridge.connect(user1).initiateBridge(bridgeAmount, destinationChain);

      // Try to cancel immediately
      await expect(
        ldaoBridge.connect(user1).cancelBridge(1)
      ).to.be.revertedWith("Cannot cancel yet");
    });
  });

  describe("Validator Management", function () {
    it("Should add validator successfully", async function () {
      const { ldaoBridge, ldaoToken, owner, user1 } = await loadFixture(deployBridgeFixture);

      const stakeAmount = ethers.parseEther("10000");
      await ldaoToken.transfer(user1.address, stakeAmount);
      await ldaoToken.connect(user1).approve(await ldaoBridge.getAddress(), stakeAmount);

      await expect(ldaoBridge.connect(owner).addValidator(user1.address))
        .to.emit(ldaoBridge, "ValidatorAdded")
        .withArgs(user1.address, stakeAmount);

      expect(await ldaoBridge.validators(user1.address)).to.be.true;
    });

    it("Should remove validator successfully", async function () {
      const { ldaoBridge, owner, validator1 } = await loadFixture(deployBridgeFixture);

      await expect(ldaoBridge.connect(owner).removeValidator(validator1.address))
        .to.emit(ldaoBridge, "ValidatorRemoved")
        .withArgs(validator1.address);

      const validatorInfo = await ldaoBridge.getValidatorInfo(validator1.address);
      expect(validatorInfo.isActive).to.be.false;
    });

    it("Should update validator threshold", async function () {
      const { ldaoBridge, owner } = await loadFixture(deployBridgeFixture);

      await ldaoBridge.connect(owner).updateValidatorThreshold(2);
      expect(await ldaoBridge.validatorThreshold()).to.equal(2);
    });

    it("Should reject threshold higher than validator count", async function () {
      const { ldaoBridge, owner } = await loadFixture(deployBridgeFixture);

      await expect(
        ldaoBridge.connect(owner).updateValidatorThreshold(10)
      ).to.be.revertedWith("Threshold too high");
    });
  });

  describe("Fee Management", function () {
    it("Should calculate bridge fees correctly", async function () {
      const { ldaoBridge } = await loadFixture(deployBridgeFixture);

      const amount = ethers.parseEther("1000");
      const destinationChain = 1; // Polygon

      const fee = await ldaoBridge.calculateBridgeFee(amount, destinationChain);
      
      // Base fee (1 LDAO) + percentage fee (0.5% of 1000 = 5 LDAO) = 6 LDAO
      const expectedFee = ethers.parseEther("1").add(ethers.parseEther("5"));
      expect(fee).to.equal(expectedFee);
    });

    it("Should allow owner to withdraw fees", async function () {
      const { ldaoBridge, ldaoToken, user1, validator1, validator2, validator3, owner } = await loadFixture(deployBridgeFixture);

      const bridgeAmount = ethers.parseEther("100");
      const destinationChain = 1;

      // Initiate and complete bridge to collect fees
      await ldaoToken.connect(user1).approve(await ldaoBridge.getAddress(), ethers.parseEther("200"));
      await ldaoBridge.connect(user1).initiateBridge(bridgeAmount, destinationChain);

      const txHash = ethers.keccak256(ethers.toUtf8Bytes("test-tx-hash"));
      await ldaoBridge.connect(validator1).completeBridge(1, txHash);
      await ldaoBridge.connect(validator2).completeBridge(1, txHash);
      await ldaoBridge.connect(validator3).completeBridge(1, txHash);

      const fee = await ldaoBridge.calculateBridgeFee(bridgeAmount, destinationChain);
      const initialOwnerBalance = await ldaoToken.balanceOf(owner.address);

      // Withdraw fees
      await expect(ldaoBridge.connect(owner).withdrawFees(owner.address, fee))
        .to.emit(ldaoBridge, "FeesWithdrawn")
        .withArgs(owner.address, fee);

      const finalOwnerBalance = await ldaoToken.balanceOf(owner.address);
      expect(finalOwnerBalance.sub(initialOwnerBalance)).to.equal(fee);
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow owner to pause and unpause", async function () {
      const { ldaoBridge, owner } = await loadFixture(deployBridgeFixture);

      await ldaoBridge.connect(owner).pause();
      expect(await ldaoBridge.paused()).to.be.true;

      await ldaoBridge.connect(owner).unpause();
      expect(await ldaoBridge.paused()).to.be.false;
    });

    it("Should reject bridge initiation when paused", async function () {
      const { ldaoBridge, ldaoToken, user1, owner } = await loadFixture(deployBridgeFixture);

      await ldaoBridge.connect(owner).pause();

      const bridgeAmount = ethers.parseEther("100");
      const destinationChain = 1;

      await ldaoToken.connect(user1).approve(await ldaoBridge.getAddress(), ethers.parseEther("200"));

      await expect(
        ldaoBridge.connect(user1).initiateBridge(bridgeAmount, destinationChain)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should allow emergency withdraw", async function () {
      const { ldaoBridge, ldaoToken, owner } = await loadFixture(deployBridgeFixture);

      const withdrawAmount = ethers.parseEther("100");
      
      // Transfer some tokens to bridge contract
      await ldaoToken.transfer(await ldaoBridge.getAddress(), withdrawAmount);

      const initialOwnerBalance = await ldaoToken.balanceOf(owner.address);

      await expect(ldaoBridge.connect(owner).emergencyWithdraw(await ldaoToken.getAddress(), withdrawAmount))
        .to.emit(ldaoBridge, "EmergencyWithdraw")
        .withArgs(await ldaoToken.getAddress(), withdrawAmount);

      const finalOwnerBalance = await ldaoToken.balanceOf(owner.address);
      expect(finalOwnerBalance.sub(initialOwnerBalance)).to.equal(withdrawAmount);
    });
  });

  describe("Chain Configuration", function () {
    it("Should update chain configuration", async function () {
      const { ldaoBridge, owner } = await loadFixture(deployBridgeFixture);

      const newConfig = {
        isSupported: true,
        minBridgeAmount: ethers.parseEther("20"),
        maxBridgeAmount: ethers.parseEther("500000"),
        baseFee: ethers.parseEther("2"),
        feePercentage: 100, // 1%
        tokenAddress: ethers.ZeroAddress,
        isLockChain: false
      };

      await expect(ldaoBridge.connect(owner).updateChainConfig(1, newConfig))
        .to.emit(ldaoBridge, "ChainConfigUpdated")
        .withArgs(1, true);

      const updatedConfig = await ldaoBridge.getChainConfig(1);
      expect(updatedConfig.minBridgeAmount).to.equal(newConfig.minBridgeAmount);
      expect(updatedConfig.baseFee).to.equal(newConfig.baseFee);
      expect(updatedConfig.feePercentage).to.equal(newConfig.feePercentage);
    });
  });
});