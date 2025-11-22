import { ethers } from "hardhat";
import { LDAOToken, LDAOTreasury } from "../typechain-types";

async function main() {
  console.log("🚀 Deploying LDAO Treasury System...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Get existing LDAO token address or deploy new one
  let ldaoTokenAddress = process.env.LDAO_TOKEN_ADDRESS;
  let ldaoToken: LDAOToken;

  if (!ldaoTokenAddress) {
    console.log("📝 Deploying LDAO Token...");
    const LDAOTokenFactory = await ethers.getContractFactory("LDAOToken");
    ldaoToken = await LDAOTokenFactory.deploy(deployer.address);
    await ldaoToken.deployed();
    ldaoTokenAddress = ldaoToken.address;
    console.log("✅ LDAO Token deployed to:", ldaoTokenAddress);
  } else {
    console.log("📝 Using existing LDAO Token at:", ldaoTokenAddress);
    ldaoToken = await ethers.getContractAt("LDAOToken", ldaoTokenAddress);
  }

  // Deploy mock USDC for testing (or use existing)
  let usdcAddress = process.env.USDC_ADDRESS;
  if (!usdcAddress) {
    console.log("📝 Deploying Mock USDC...");
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const mockUSDC = await MockERC20Factory.deploy(
      "USD Coin",
      "USDC",
      6, // 6 decimals for USDC
      ethers.parseUnits("1000000", 6) // 1M USDC
    );
    await mockUSDC.deployed();
    usdcAddress = mockUSDC.address;
    console.log("✅ Mock USDC deployed to:", usdcAddress);
  }

  // Deploy LDAO Treasury
  console.log("📝 Deploying LDAO Treasury...");
  const LDAOTreasuryFactory = await ethers.getContractFactory("LDAOTreasury");
  const ldaoTreasury: LDAOTreasury = await LDAOTreasuryFactory.deploy(
    ldaoTokenAddress,
    usdcAddress
  );
  await ldaoTreasury.deployed();
  console.log("✅ LDAO Treasury deployed to:", ldaoTreasury.address);

  // Transfer LDAO tokens to treasury for sales
  const treasuryAllocation = ethers.parseEther("100000000"); // 100M LDAO for sales
  console.log("📝 Transferring LDAO tokens to treasury...");
  
  const transferTx = await ldaoToken.transfer(ldaoTreasury.address, treasuryAllocation);
  await transferTx.wait();
  console.log("✅ Transferred 100M LDAO tokens to treasury");

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

  // Activate sales
  await ldaoTreasury.setSalesActive(true);
  console.log("✅ Treasury configured and sales activated");

  // Display deployment summary
  console.log("\n🎉 Deployment Summary:");
  console.log("====================");
  console.log("LDAO Token:", ldaoTokenAddress);
  console.log("USDC Token:", usdcAddress);
  console.log("LDAO Treasury:", ldaoTreasury.address);
  console.log("Deployer:", deployer.address);
  console.log("Treasury Balance:", ethers.formatEther(treasuryBalance), "LDAO");

  // Get initial quote
  const sampleAmount = ethers.parseEther("1000"); // 1000 LDAO
  const [usdAmount, ethAmount, usdcAmount, discount] = await ldaoTreasury.getQuote(sampleAmount);
  
  console.log("\n💰 Sample Quote (1000 LDAO):");
  console.log("USD Cost:", ethers.formatEther(usdAmount));
  console.log("ETH Cost:", ethers.formatEther(ethAmount));
  console.log("USDC Cost:", ethers.formatUnits(usdcAmount, 6));
  console.log("Discount:", discount.toNumber() / 100, "%");

  // Save deployment addresses
  const deploymentInfo = {
    network: await ethers.provider.getNetwork(),
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      LDAOToken: {
        address: ldaoTokenAddress,
        description: "Main LDAO governance token"
      },
      USDCToken: {
        address: usdcAddress,
        description: "USDC token for payments"
      },
      LDAOTreasury: {
        address: ldaoTreasury.address,
        description: "Treasury for LDAO token sales"
      }
    },
    configuration: {
      initialPrice: "0.01 USD per LDAO",
      treasuryAllocation: "100,000,000 LDAO",
      minPurchase: "10 LDAO",
      maxPurchase: "1,000,000 LDAO",
      salesActive: true
    }
  };

  // Write deployment info to file
  const fs = require('fs');
  const path = require('path');
  
  const deploymentPath = path.join(__dirname, '../deployed-addresses-treasury.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n📄 Deployment info saved to:", deploymentPath);

  // Verification instructions
  console.log("\n🔍 Verification Commands:");
  console.log("========================");
  console.log(`npx hardhat verify --network ${(await ethers.provider.getNetwork()).name} ${ldaoTreasury.address} ${ldaoTokenAddress} ${usdcAddress}`);

  console.log("\n✨ LDAO Treasury deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });