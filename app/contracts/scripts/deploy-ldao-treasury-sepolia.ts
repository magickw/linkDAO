import { ethers } from "hardhat";
import { LDAOTreasury, MultiSigWallet } from "../typechain-types";
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log("🚀 Deploying LDAO Treasury to Sepolia...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.getBalance()), "ETH");

  // Load existing deployed addresses
  const deployedAddressesPath = path.join(__dirname, '../deployedAddresses-sepolia.json');
  const deployedAddresses = JSON.parse(fs.readFileSync(deployedAddressesPath, 'utf8'));

  const ldaoTokenAddress = deployedAddresses.contracts.LDAOToken.address;
  const usdcAddress = deployedAddresses.contracts.MockERC20.address; // Using MockERC20 as USDC

  console.log("📝 Using existing contracts:");
  console.log("LDAO Token:", ldaoTokenAddress);
  console.log("USDC Token:", usdcAddress);

  // Deploy MultiSigWallet first
  console.log("📝 Deploying MultiSigWallet...");
  const MultiSigWalletFactory = await ethers.getContractFactory("MultiSigWallet");

  // Use deployer as the only owner for simplicity on testnet
  const multiSigOwners = [
    deployer.address,
    "0x0000000000000000000000000000000000000001", // Placeholder address 1
    "0x0000000000000000000000000000000000000002"  // Placeholder address 2
  ];

  const multiSigWallet: MultiSigWallet = await MultiSigWalletFactory.deploy(
    multiSigOwners,
    2, // Require 2 confirmations
    3600 // 1 hour time delay
  );
  await multiSigWallet.deployed();
  console.log("✅ MultiSigWallet deployed to:", multiSigWallet.address);

  // Deploy LDAO Treasury
  console.log("📝 Deploying LDAO Treasury...");
  const LDAOTreasuryFactory = await ethers.getContractFactory("LDAOTreasury");
  const ldaoTreasury: LDAOTreasury = await LDAOTreasuryFactory.deploy(
    ldaoTokenAddress,
    usdcAddress,
    multiSigWallet.address
  );
  await ldaoTreasury.deployed();
  console.log("✅ LDAO Treasury deployed to:", ldaoTreasury.address);

  // Get LDAO token contract instance
  const ldaoToken = await ethers.getContractAt("LDAOToken", ldaoTokenAddress);

  // Transfer LDAO tokens to treasury for sales
  const treasuryAllocation = ethers.parseEther("100000000"); // 100M LDAO for sales
  console.log("📝 Transferring LDAO tokens to treasury...");
  
  const currentBalance = await ldaoToken.balanceOf(deployer.address);
  console.log("Deployer LDAO balance:", ethers.formatEther(currentBalance));

  if (currentBalance.gte(treasuryAllocation)) {
    const transferTx = await ldaoToken.transfer(ldaoTreasury.address, treasuryAllocation);
    await transferTx.wait();
    console.log("✅ Transferred 100M LDAO tokens to treasury");
  } else {
    console.log("⚠️  Insufficient LDAO balance for full allocation. Transferring available balance...");
    if (currentBalance.gt(0)) {
      const transferTx = await ldaoToken.transfer(ldaoTreasury.address, currentBalance);
      await transferTx.wait();
      console.log("✅ Transferred", ethers.formatEther(currentBalance), "LDAO tokens to treasury");
    }
  }

  // Verify treasury balance
  const treasuryBalance = await ldaoToken.balanceOf(ldaoTreasury.address);
  console.log("Treasury LDAO balance:", ethers.formatEther(treasuryBalance));

  // Set initial configuration
  console.log("📝 Configuring treasury settings...");
  
  // Update purchase limits
  await ldaoTreasury.updatePurchaseLimits(
    ethers.parseEther("10"), // Min 10 LDAO
    ethers.parseEther("1000000") // Max 1M LDAO
  );

  // Update circuit breaker parameters
  await ldaoTreasury.updateCircuitBreakerParams(
    ethers.parseEther("10000000"), // 10M LDAO daily limit
    ethers.parseEther("5000000")   // 5M LDAO emergency threshold
  );

  // Activate sales
  await ldaoTreasury.setSalesActive(true);
  console.log("✅ Treasury configured and sales activated");

  // Display deployment summary
  console.log("\n🎉 Deployment Summary:");
  console.log("====================");
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId);
  console.log("Deployer:", deployer.address);
  console.log("LDAO Token:", ldaoTokenAddress);
  console.log("USDC Token:", usdcAddress);
  console.log("MultiSig Wallet:", multiSigWallet.address);
  console.log("LDAO Treasury:", ldaoTreasury.address);
  console.log("Treasury Balance:", ethers.formatEther(treasuryBalance), "LDAO");

  // Get initial quote
  const sampleAmount = ethers.parseEther("1000"); // 1000 LDAO
  const quote = await ldaoTreasury.getQuote(sampleAmount);
  
  console.log("\n💰 Sample Quote (1000 LDAO):");
  console.log("USD Cost:", ethers.formatEther(quote.usdAmount));
  console.log("ETH Cost:", ethers.formatEther(quote.ethAmount));
  console.log("USDC Cost:", ethers.formatUnits(quote.usdcAmount, 6));
  console.log("Discount:", quote.discount.toNumber() / 100, "%");

  // Test circuit breaker status
  const circuitBreakerStatus = await ldaoTreasury.getCircuitBreakerStatus();
  console.log("\n🔒 Circuit Breaker Status:");
  console.log("Daily Limit:", ethers.formatEther(circuitBreakerStatus.dailyLimit), "LDAO");
  console.log("Emergency Threshold:", ethers.formatEther(circuitBreakerStatus.emergencyThreshold), "LDAO");
  console.log("Current Volume:", ethers.formatEther(circuitBreakerStatus.currentVolume), "LDAO");
  console.log("Near Emergency:", circuitBreakerStatus.nearEmergencyThreshold);

  // Update the deployed addresses file
  deployedAddresses.contracts.MultiSigWallet = {
    address: multiSigWallet.address,
    owner: deployer.address,
    deploymentTx: multiSigWallet.deployTransaction.hash
  };

  deployedAddresses.contracts.LDAOTreasury = {
    address: ldaoTreasury.address,
    owner: deployer.address,
    deploymentTx: ldaoTreasury.deployTransaction.hash
  };

  // Update deployment timestamp
  deployedAddresses.deployedAt = new Date().toISOString();

  // Write updated addresses back to file
  fs.writeFileSync(deployedAddressesPath, JSON.stringify(deployedAddresses, null, 2));
  console.log("\n📄 Updated deployed addresses file");

  // Verification instructions
  console.log("\n🔍 Verification Commands:");
  console.log("========================");
  console.log(`npx hardhat verify --network sepolia ${multiSigWallet.address} "[${multiSigOwners.map(addr => `"${addr}"`).join(',')}]" 2 3600`);
  console.log(`npx hardhat verify --network sepolia ${ldaoTreasury.address} ${ldaoTokenAddress} ${usdcAddress} ${multiSigWallet.address}`);

  console.log("\n✨ LDAO Treasury deployment to Sepolia completed successfully!");
  console.log("\n📋 Next Steps:");
  console.log("1. Verify contracts on Etherscan using the commands above");
  console.log("2. Test token purchases using the frontend interface");
  console.log("3. Monitor treasury operations through the admin dashboard");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });