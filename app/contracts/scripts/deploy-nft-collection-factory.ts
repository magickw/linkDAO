import { ethers } from "hardhat";
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";

async function main() {
  console.log("Deploying NFTCollectionFactory...");

  // Get the contract factory
  const NFTCollectionFactory = await ethers.getContractFactory("NFTCollectionFactory");

  // Deploy the contract
  const nftCollectionFactory = await NFTCollectionFactory.deploy();
  await nftCollectionFactory.deployed();

  console.log("NFTCollectionFactory deployed to:", nftCollectionFactory.address);

  // Save deployment info
  const deploymentInfo = {
    address: nftCollectionFactory.address,
    deployer: (await ethers.getSigners())[0].address,
    deployedAt: new Date().toISOString(),
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    transactionHash: nftCollectionFactory.deployTransaction.hash,
    blockNumber: nftCollectionFactory.deployTransaction.blockNumber,
    gasUsed: (await nftCollectionFactory.deployTransaction.wait()).gasUsed.toString(),
    contractName: "NFTCollectionFactory"
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
  addresses.NFTCollectionFactory = deploymentInfo;

  // Write updated addresses
  writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));

  console.log("Deployment info saved to deployedAddresses.json");

  // Verify contract on Etherscan (if not local network)
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== 31337 && network.chainId !== 1337) {
    console.log("Waiting for block confirmations...");
    await nftCollectionFactory.deployTransaction.wait(6);
    
    try {
      await hre.run("verify:verify", {
        address: nftCollectionFactory.address,
        constructorArguments: [],
      });
      console.log("Contract verified on Etherscan");
    } catch (error) {
      console.log("Verification failed:", error);
    }
  }

  // Test basic functionality
  console.log("Testing basic functionality...");
  
  const creationFee = await nftCollectionFactory.creationFee();
  console.log("Creation fee:", ethers.formatEther(creationFee), "ETH");
  
  const feeRecipient = await nftCollectionFactory.feeRecipient();
  console.log("Fee recipient:", feeRecipient);
  
  const collectionCount = await nftCollectionFactory.getCollectionCount();
  console.log("Total collections:", collectionCount.toString());

  console.log("NFTCollectionFactory deployment completed successfully!");
  
  return {
    address: nftCollectionFactory.address,
    contract: nftCollectionFactory
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