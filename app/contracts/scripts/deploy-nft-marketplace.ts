import { ethers } from "hardhat";
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";

async function main() {
  console.log("Deploying NFTMarketplace...");

  // Get the contract factory
  const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");

  // Deploy the contract
  const nftMarketplace = await NFTMarketplace.deploy();
  await nftMarketplace.deployed();

  console.log("NFTMarketplace deployed to:", nftMarketplace.address);

  // Save deployment info
  const deploymentInfo = {
    address: nftMarketplace.address,
    deployer: (await ethers.getSigners())[0].address,
    deployedAt: new Date().toISOString(),
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    transactionHash: nftMarketplace.deployTransaction.hash,
    blockNumber: nftMarketplace.deployTransaction.blockNumber,
    gasUsed: (await nftMarketplace.deployTransaction.wait()).gasUsed.toString(),
    contractName: "NFTMarketplace"
  };

  // Read existing addresses file or create new one
  const addressesPath = join(__dirname, "../deployedAddresses.json");
  let addresses: any = {};
  
  try {
    const existingData = readFileSync(addressesPath, "utf8");
    addresses = JSON.parse(existingData);
  } catch (error) {
    console.log("Creating new deployedAddresses.json file");
  }

  // Update addresses
  addresses.NFTMarketplace = deploymentInfo;

  // Write updated addresses
  writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));

  console.log("Deployment info saved to deployedAddresses.json");

  // Verify contract on Etherscan (if not local network)
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== 31337 && network.chainId !== 1337) {
    console.log("Waiting for block confirmations...");
    await nftMarketplace.deployTransaction.wait(6);
    
    try {
      await hre.run("verify:verify", {
        address: nftMarketplace.address,
        constructorArguments: [],
      });
      console.log("Contract verified on Etherscan");
    } catch (error) {
      console.log("Verification failed:", error);
    }
  }

  // Test basic functionality
  console.log("Testing basic functionality...");
  
  const name = await nftMarketplace.name();
  const symbol = await nftMarketplace.symbol();
  console.log("NFT Collection Name:", name);
  console.log("NFT Collection Symbol:", symbol);
  
  const platformFee = await nftMarketplace.platformFee();
  console.log("Platform fee:", platformFee.toString(), "basis points");
  
  const platformFeeRecipient = await nftMarketplace.platformFeeRecipient();
  console.log("Platform fee recipient:", platformFeeRecipient);
  
  const maxRoyalty = await nftMarketplace.maxRoyalty();
  console.log("Max royalty:", maxRoyalty.toString(), "basis points");

  console.log("NFTMarketplace deployment completed successfully!");
  
  return {
    address: nftMarketplace.address,
    contract: nftMarketplace
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