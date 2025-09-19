import { expect } from "chai";
import { ethers } from "hardhat";
import { Counter } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Counter", function () {
  let counter: Counter;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();

    const CounterFactory = await ethers.getContractFactory("Counter");
    counter = await CounterFactory.deploy() as Counter;
    await counter.deployed();
  });

  describe("Deployment", function () {
    it("Should deploy with initial value of 0", async function () {
      expect(await counter.x()).to.equal(0);
    });

    it("Should be deployed to a valid address", async function () {
      expect(counter.address).to.not.equal(ethers.constants.AddressZero);
      expect(counter.address).to.match(/^0x[a-fA-F0-9]{40}$/);
    });
  });

  describe("Increment Function", function () {
    it("Should increment by 1", async function () {
      await counter.inc();
      expect(await counter.x()).to.equal(1);
    });

    it("Should increment multiple times", async function () {
      await counter.inc();
      await counter.inc();
      await counter.inc();
      expect(await counter.x()).to.equal(3);
    });

    it("Should emit Increment event with correct value", async function () {
      await expect(counter.inc())
        .to.emit(counter, "Increment")
        .withArgs(1);
    });

    it("Should work when called by different accounts", async function () {
      await counter.connect(owner).inc();
      await counter.connect(user1).inc();
      expect(await counter.x()).to.equal(2);
    });
  });

  describe("IncrementBy Function", function () {
    it("Should increment by specified amount", async function () {
      await counter.incBy(5);
      expect(await counter.x()).to.equal(5);
    });

    it("Should increment by large amounts", async function () {
      await counter.incBy(1000);
      expect(await counter.x()).to.equal(1000);
    });

    it("Should work with multiple calls", async function () {
      await counter.incBy(3);
      await counter.incBy(7);
      expect(await counter.x()).to.equal(10);
    });

    it("Should emit Increment event with correct value", async function () {
      await expect(counter.incBy(42))
        .to.emit(counter, "Increment")
        .withArgs(42);
    });

    it("Should revert when increment is 0", async function () {
      await expect(counter.incBy(0))
        .to.be.revertedWith("incBy: increment should be positive");
    });

    it("Should work when called by different accounts", async function () {
      await counter.connect(owner).incBy(10);
      await counter.connect(user1).incBy(20);
      expect(await counter.x()).to.equal(30);
    });
  });

  describe("Combined Operations", function () {
    it("Should handle mixed inc() and incBy() calls", async function () {
      await counter.inc(); // x = 1
      await counter.incBy(5); // x = 6
      await counter.inc(); // x = 7
      await counter.incBy(3); // x = 10
      
      expect(await counter.x()).to.equal(10);
    });

    it("Should maintain state across multiple transactions", async function () {
      // First transaction block
      await counter.inc();
      await counter.incBy(2);
      
      // Second transaction block
      await counter.inc();
      await counter.incBy(4);
      
      expect(await counter.x()).to.equal(8);
    });
  });

  describe("Event Emission", function () {
    it("Should emit events for all increment operations", async function () {
      const tx1 = await counter.inc();
      const tx2 = await counter.incBy(5);
      
      await expect(tx1).to.emit(counter, "Increment").withArgs(1);
      await expect(tx2).to.emit(counter, "Increment").withArgs(5);
    });

    it("Should emit events with correct parameters for large increments", async function () {
      const largeIncrement = 999999;
      await expect(counter.incBy(largeIncrement))
        .to.emit(counter, "Increment")
        .withArgs(largeIncrement);
    });
  });

  describe("Gas Usage", function () {
    it("Should have reasonable gas costs for inc()", async function () {
      const gasEstimate = await counter.estimateGas.inc();
      expect(gasEstimate.toNumber()).to.be.lessThan(50000); // Should be much less
    });

    it("Should have reasonable gas costs for incBy()", async function () {
      const gasEstimate = await counter.estimateGas.incBy(100);
      expect(gasEstimate.toNumber()).to.be.lessThan(50000); // Should be much less
    });

    it("Should have consistent gas usage regardless of increment amount", async function () {
      const gasEstimate1 = await counter.estimateGas.incBy(1);
      const gasEstimate100 = await counter.estimateGas.incBy(100);
      const gasEstimate1000 = await counter.estimateGas.incBy(1000);
      
      // Gas usage should be very similar regardless of increment amount
      expect(Math.abs(gasEstimate1.toNumber() - gasEstimate100.toNumber())).to.be.lessThan(1000);
      expect(Math.abs(gasEstimate100.toNumber() - gasEstimate1000.toNumber())).to.be.lessThan(1000);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle maximum safe integer increments", async function () {
      // Test with a large but safe number
      const largeIncrement = ethers.BigNumber.from("1000000000000000000"); // 1e18
      await counter.incBy(largeIncrement);
      expect(await counter.x()).to.equal(largeIncrement);
    });

    it("Should maintain precision with large numbers", async function () {
      const increment1 = ethers.BigNumber.from("123456789");
      const increment2 = ethers.BigNumber.from("987654321");
      
      await counter.incBy(increment1);
      await counter.incBy(increment2);
      
      const expected = increment1.add(increment2);
      expect(await counter.x()).to.equal(expected);
    });

    it("Should handle rapid successive calls", async function () {
      // Simulate rapid calls
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(counter.inc());
      }
      
      await Promise.all(promises);
      expect(await counter.x()).to.equal(10);
    });
  });

  describe("State Persistence", function () {
    it("Should maintain state between different function calls", async function () {
      await counter.inc();
      const value1 = await counter.x();
      
      await counter.incBy(5);
      const value2 = await counter.x();
      
      expect(value1).to.equal(1);
      expect(value2).to.equal(6);
    });

    it("Should maintain state when called from different accounts", async function () {
      await counter.connect(owner).inc();
      await counter.connect(user1).incBy(3);
      await counter.connect(owner).inc();
      
      expect(await counter.x()).to.equal(5);
    });
  });

  describe("Contract Verification", function () {
    it("Should be a valid contract deployment", async function () {
      // Check that the contract has code
      const code = await ethers.provider.getCode(counter.address);
      expect(code).to.not.equal("0x");
      expect(code.length).to.be.greaterThan(2); // More than just "0x"
    });

    it("Should have the expected interface", async function () {
      // Check that all expected functions exist
      expect(typeof counter.inc).to.equal("function");
      expect(typeof counter.incBy).to.equal("function");
      expect(typeof counter.x).to.equal("function");
    });

    it("Should support the expected events", async function () {
      const filter = counter.filters.Increment();
      expect(filter).to.not.be.undefined;
      expect(filter.topics).to.not.be.undefined;
    });
  });
});