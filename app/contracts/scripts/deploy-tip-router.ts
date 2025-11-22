import { ethers } from "hardhat";
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";

async function main() {
  console.log("Deploying TipRouter...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.getBalance()));

  // Read deployed addresses to get LDAO token and RewardPool addresses
  const addressesPath = join(__dirname, "../deployedAddresses.json");
  let addresses: any = {};
  
  try {
    const existingData = readFileSync(addressesPath, "utf8");
    addresses = JSON.parse(existingData);
  } catch (error) {
    console.log("Warning: Could not read deployedAddresses.json");
  }

  // Get LDAO token address (required for TipRouter)
  const ldaoTokenAddress = addresses.LDAOToken?.address;
  if (!ldaoTokenAddress) {
    console.error("Error: LDAOToken address not found. Please deploy LDAOToken first.");
    process.exit(1);
  }

  // Get RewardPool address (required for TipRouter)
  const rewardPoolAddress = addresses.RewardPool?.address || addresses.EnhancedRewardPool?.address;
  if (!rewardPoolAddress) {
    console.error("Error: RewardPool address not found. Please deploy RewardPool first.");
    process.exit(1);
  }

  console.log("Using LDAO Token address:", ldaoTokenAddress);
  console.log("Using RewardPool address:", rewardPoolAddress);

  // Deploy TipRouter
  const TipRouter = await ethers.getContractFactory("TipRouter");
  const tipRouter = await TipRouter.deploy(ldaoTokenAddress, rewardPoolAddress);
  await tipRouter.deployed();

  console.log("TipRouter deployed to:", tipRouter.address);

  // Save deployment info
  const deploymentInfo = {
    address: tipRouter.address,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    transactionHash: tipRouter.deployTransaction.hash,
    blockNumber: tipRouter.deployTransaction.blockNumber,
    gasUsed: (await tipRouter.deployTransaction.wait()).gasUsed.toString(),
    contractName: "TipRouter",
    constructorArgs: {
      ldaoToken: ldaoTokenAddress,
      rewardPool: rewardPoolAddress
    }
  };

  // Update addresses
  addresses.TipRouter = deploymentInfo;

  // Write updated addresses
  writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log("Deployment info saved to deployedAddresses.json");

  // Test basic functionality
  console.log("Testing basic functionality...");
  
  const ldaoAddress = await tipRouter.ldao();
  console.log("LDAO token address:", ldaoAddress);
  
  const rewardPoolAddr = await tipRouter.rewardPool();
  console.log("Reward pool address:", rewardPoolAddr);
  
  const feeBps = await tipRouter.feeBps();
  console.log("Fee basis points:", feeBps.toString(), "(", feeBps.toNumber() / 100, "%)");

  // Verify contract on Etherscan (if not local network)
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== 31337 && network.chainId !== 1337) {
    console.log("Waiting for block confirmations...");
    await tipRouter.deployTransaction.wait(6);
    
    try {
      await hre.run("verify:verify", {
        address: tipRouter.address,
        constructorArguments: [ldaoTokenAddress, rewardPoolAddress],
      });
      console.log("Contract verified on Etherscan");
    } catch (error) {
      console.log("Verification failed:", error);
    }
  }

  console.log("TipRouter deployment completed successfully!");
  
  return {
    address: tipRouter.address,
    contract: tipRouter
  };
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export default main;