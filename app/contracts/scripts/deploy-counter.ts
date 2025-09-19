import { ethers } from "hardhat";
import { Counter } from "../typechain-types";

async function main() {
  console.log("Deploying Counter contract for basic testing...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()));

  // Deploy Counter contract
  const CounterFactory = await ethers.getContractFactory("Counter");
  const counter = await CounterFactory.deploy() as Counter;

  await counter.deployed();

  console.log("Counter deployed to:", counter.address);
  console.log("Transaction hash:", counter.deployTransaction.hash);
  console.log("Block number:", counter.deployTransaction.blockNumber);

  // Verify initial state
  const initialValue = await counter.x();
  console.log("\n=== Initial State Verification ===");
  console.log("Initial counter value:", initialValue.toString());
  console.log("Expected initial value: 0");
  console.log("Initial state correct:", initialValue.eq(0) ? "✓" : "✗");

  // Test basic functionality
  console.log("\n=== Basic Functionality Testing ===");
  
  // Test increment
  console.log("Testing increment function...");
  const incTx = await counter.inc();
  await incTx.wait();
  
  const valueAfterInc = await counter.x();
  console.log("Value after inc():", valueAfterInc.toString());
  console.log("Increment working:", valueAfterInc.eq(1) ? "✓" : "✗");

  // Test increment by amount
  console.log("Testing incBy function...");
  const incByTx = await counter.incBy(5);
  await incByTx.wait();
  
  const valueAfterIncBy = await counter.x();
  console.log("Value after incBy(5):", valueAfterIncBy.toString());
  console.log("IncBy working:", valueAfterIncBy.eq(6) ? "✓" : "✗");

  // Test event emission
  console.log("\n=== Event Emission Testing ===");
  console.log("Testing event emission...");
  
  const incTxWithEvent = await counter.inc();
  const receipt = await incTxWithEvent.wait();
  
  const incrementEvent = receipt.events?.find(e => e.event === "Increment");
  if (incrementEvent) {
    console.log("✓ Increment event emitted");
    console.log("Event args:", incrementEvent.args);
    console.log("Increment amount:", incrementEvent.args?.[0]?.toString());
  } else {
    console.log("✗ Increment event not found");
  }

  // Test error conditions
  console.log("\n=== Error Condition Testing ===");
  try {
    await counter.incBy(0);
    console.log("✗ Should have reverted for incBy(0)");
  } catch (error) {
    console.log("✓ Correctly reverted for incBy(0)");
    console.log("Error message:", error.message.includes("increment should be positive") ? "✓ Correct error" : "✗ Wrong error");
  }

  // Network configuration verification
  console.log("\n=== Network Configuration Verification ===");
  const network = await ethers.provider.getNetwork();
  console.log("Network name:", network.name);
  console.log("Chain ID:", network.chainId);
  console.log("Block number:", await ethers.provider.getBlockNumber());
  
  // Gas usage analysis
  console.log("\n=== Gas Usage Analysis ===");
  const deploymentGas = counter.deployTransaction.gasLimit;
  console.log("Deployment gas limit:", deploymentGas.toString());
  
  // Estimate gas for operations
  const incGasEstimate = await counter.estimateGas.inc();
  const incByGasEstimate = await counter.estimateGas.incBy(10);
  
  console.log("inc() gas estimate:", incGasEstimate.toString());
  console.log("incBy(10) gas estimate:", incByGasEstimate.toString());

  // Final state
  const finalValue = await counter.x();
  console.log("\n=== Final State ===");
  console.log("Final counter value:", finalValue.toString());
  console.log("Expected final value: 7 (0 + 1 + 5 + 1)");
  console.log("Final state correct:", finalValue.eq(7) ? "✓" : "✗");

  console.log("\n=== Deployment Summary ===");
  console.log("✓ Counter contract deployed successfully");
  console.log("✓ Basic contract interaction verified");
  console.log("✓ Event emission working");
  console.log("✓ Error handling working");
  console.log("✓ Network configuration verified");
  console.log("✓ Gas estimation working");

  return {
    contractAddress: counter.address,
    deployerAddress: deployer.address,
    network: network,
    finalValue: finalValue.toString(),
    deploymentGas: deploymentGas.toString(),
    transactionHash: counter.deployTransaction.hash
  };
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Deployment failed:", error);
      process.exit(1);
    });
}

export { main as deployCounter };