import { ethers, network } from "hardhat";
import { LDAOToken, FixedLDAOTreasury, MultiSigWallet, Governance } from "../typechain-types";

async function main() {
  console.log(`Deploying FixedLDAOTreasury to ${network.name} network...`);

  // Get accounts
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Get contract factories
  const LDAOToken = await ethers.getContractFactory("LDAOToken");
  const FixedLDAOTreasury = await ethers.getContractFactory("FixedLDAOTreasury");
  const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
  const Governance = await ethers.getContractFactory("Governance");

  // Deploy LDAO Token (if not already deployed)
  console.log("Deploying LDAOToken...");
  const ldaoToken: LDAOToken = await LDAOToken.deploy(deployer.address);
  await ldaoToken.waitForDeployment();
  const ldaoTokenAddress = await ldaoToken.getAddress();
  console.log("LDAOToken deployed to:", ldaoTokenAddress);

  // Deploy MultiSigWallet (if not already deployed)
  console.log("Deploying MultiSigWallet...");
  const multiSigWallet: MultiSigWallet = await MultiSigWallet.deploy([deployer.address], 1);
  await multiSigWallet.waitForDeployment();
  const multiSigWalletAddress = await multiSigWallet.getAddress();
  console.log("MultiSigWallet deployed to:", multiSigWalletAddress);

  // Deploy Governance (if not already deployed)
  console.log("Deploying Governance...");
  const governance: Governance = await Governance.deploy(
    ldaoTokenAddress,
    multiSigWalletAddress
  );
  await governance.waitForDeployment();
  const governanceAddress = await governance.getAddress();
  console.log("Governance deployed to:", governanceAddress);

  // Chainlink ETH/USD price feed address for Sepolia
  // https://docs.chain.link/data-feeds/price-feeds/addresses?network=ethereum&page=1&chain=sepolia
  const ethUsdPriceFeedAddress = "0x694AA1769357215DE4FAC081bf1f309aDC325306";

  // Deploy FixedLDAOTreasury with Chainlink price feed
  console.log("Deploying FixedLDAOTreasury with Chainlink price feed...");
  const treasury: FixedLDAOTreasury = await FixedLDAOTreasury.deploy(
    ldaoTokenAddress,
    "0xA31D2faD2B1Ab84Fb420824A5CF3aB5a272782CC", // Mock USDC address from previous deployment
    multiSigWalletAddress,
    governanceAddress,
    ethUsdPriceFeedAddress
  );
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("FixedLDAOTreasury deployed to:", treasuryAddress);

  // Transfer some tokens to treasury for testing
  console.log("Transferring tokens to treasury for testing...");
  const transferAmount = ethers.parseEther("1000000"); // 1M tokens
  await ldaoToken.transfer(treasuryAddress, transferAmount);
  console.log("Transferred", ethers.formatEther(transferAmount), "LDAO tokens to treasury");

  // Verify contracts on Etherscan (if on a live network)
  if (network.name !== "localhost" && network.name !== "hardhat") {
    console.log("Waiting for confirmations before verification...");
    await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute

    try {
      console.log("Verifying LDAOToken...");
      await hre.run("verify:verify", {
        address: ldaoTokenAddress,
        constructorArguments: [treasuryAddress],
      });

      console.log("Verifying MultiSigWallet...");
      await hre.run("verify:verify", {
        address: multiSigWalletAddress,
        constructorArguments: [[deployer.address], 1],
      });

      console.log("Verifying Governance...");
      await hre.run("verify:verify", {
        address: governanceAddress,
        constructorArguments: [ldaoTokenAddress, multiSigWalletAddress],
      });

      console.log("Verifying FixedLDAOTreasury...");
      await hre.run("verify:verify", {
        address: treasuryAddress,
        constructorArguments: [
          ldaoTokenAddress,
          "0xA31D2faD2B1Ab84Fb420824A5CF3aB5a272782CC",
          multiSigWalletAddress,
          governanceAddress,
          ethUsdPriceFeedAddress
        ],
      });
    } catch (error) {
      console.error("Error during verification:", error);
    }
  }

  // Save deployment information
  const deploymentInfo = {
    network: network.name,
    chainId: (network.config.chainId || 0).toString(),
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    contracts: {
      LDAOToken: {
        address: ldaoTokenAddress,
        owner: deployer.address
      },
      MultiSigWallet: {
        address: multiSigWalletAddress,
        owner: deployer.address
      },
      Governance: {
        address: governanceAddress,
        owner: deployer.address
      },
      FixedLDAOTreasury: {
        address: treasuryAddress,
        owner: deployer.address
      }
    }
  };

  console.log("\nDeployment Summary:");
  console.log("===================");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Save to a file
  const fs = require("fs");
  const path = require("path");
  const deploymentFile = path.join(__dirname, `../deployedAddresses-fixed-${network.name}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\nDeployment information saved to: ${deploymentFile}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });