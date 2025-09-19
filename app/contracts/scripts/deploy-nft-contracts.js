const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting NFT contracts deployment...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()));

  const deploymentResults = {};

  try {
    // Deploy NFTCollectionFactory
    console.log("\n1. Deploying NFTCollectionFactory...");
    const NFTCollectionFactory = await ethers.getContractFactory("NFTCollectionFactory");
    const nftCollectionFactory = await NFTCollectionFactory.deploy();
    await nftCollectionFactory.deployed();
    
    console.log("NFTCollectionFactory deployed to:", nftCollectionFactory.address);
    
    deploymentResults.NFTCollectionFactory = {
      address: nftCollectionFactory.address,
      deployer: deployer.address,
      deployedAt: new Date().toISOString(),
      transactionHash: nftCollectionFactory.deployTransaction.hash,
      gasUsed: (await nftCollectionFactory.deployTransaction.wait()).gasUsed.toString()
    };

    // Test NFTCollectionFactory basic functionality
    console.log("Testing NFTCollectionFactory...");
    const creationFee = await nftCollectionFactory.creationFee();
    console.log("Creation fee:", ethers.utils.formatEther(creationFee), "ETH");
    
    const feeRecipient = await nftCollectionFactory.feeRecipient();
    console.log("Fee recipient:", feeRecipient);

    // Deploy NFTMarketplace
    console.log("\n2. Deploying NFTMarketplace...");
    const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
    const nftMarketplace = await NFTMarketplace.deploy();
    await nftMarketplace.deployed();
    
    console.log("NFTMarketplace deployed to:", nftMarketplace.address);
    
    deploymentResults.NFTMarketplace = {
      address: nftMarketplace.address,
      deployer: deployer.address,
      deployedAt: new Date().toISOString(),
      transactionHash: nftMarketplace.deployTransaction.hash,
      gasUsed: (await nftMarketplace.deployTransaction.wait()).gasUsed.toString()
    };

    // Test NFTMarketplace basic functionality
    console.log("Testing NFTMarketplace...");
    const name = await nftMarketplace.name();
    const symbol = await nftMarketplace.symbol();
    console.log("NFT Collection Name:", name);
    console.log("NFT Collection Symbol:", symbol);
    
    const platformFee = await nftMarketplace.platformFee();
    console.log("Platform fee:", platformFee.toString(), "basis points");

    // Test collection creation
    console.log("\n3. Testing collection creation...");
    const collectionInfo = {
      description: "Test Collection for Deployment",
      image: "https://example.com/image.png",
      externalUrl: "https://example.com",
      maxSupply: 1000,
      mintPrice: ethers.utils.parseEther("0.1"),
      isPublicMint: true,
      creator: deployer.address,
      createdAt: 0
    };

    const tx = await nftCollectionFactory.createCollection(
      "Test Collection",
      "TEST",
      collectionInfo,
      250, // 2.5% royalty
      { value: creationFee }
    );

    const receipt = await tx.wait();
    console.log("Collection created successfully!");
    console.log("Transaction hash:", receipt.transactionHash);

    const collectionCount = await nftCollectionFactory.getCollectionCount();
    console.log("Total collections:", collectionCount.toString());

    // Test NFT minting in marketplace
    console.log("\n4. Testing NFT minting...");
    const metadata = {
      name: "Test NFT",
      description: "A test NFT for deployment verification",
      image: "https://example.com/nft.png",
      animationUrl: "",
      externalUrl: "https://example.com",
      attributes: ["trait1", "trait2"],
      creator: deployer.address,
      createdAt: 0,
      isVerified: false
    };

    const contentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-content-1"));
    const mintTx = await nftMarketplace.mintNFT(
      deployer.address,
      "https://example.com/metadata/1.json",
      250, // 2.5% royalty
      contentHash,
      metadata
    );

    const mintReceipt = await mintTx.wait();
    console.log("NFT minted successfully!");
    console.log("Mint transaction hash:", mintReceipt.transactionHash);

    // Save deployment results
    const addressesPath = path.join(__dirname, "../deployedAddresses.json");
    let addresses = {};
    
    try {
      const existingData = fs.readFileSync(addressesPath, "utf8");
      addresses = JSON.parse(existingData);
    } catch (error) {
      console.log("Creating new deployedAddresses.json file");
    }

    // Update addresses with new deployments
    Object.assign(addresses, deploymentResults);

    fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
    console.log("\nDeployment info saved to deployedAddresses.json");

    console.log("\n=== NFT Contracts Deployment Summary ===");
    console.log("NFTCollectionFactory:", deploymentResults.NFTCollectionFactory.address);
    console.log("NFTMarketplace:", deploymentResults.NFTMarketplace.address);
    console.log("Total gas used:", 
      (BigInt(deploymentResults.NFTCollectionFactory.gasUsed) + 
       BigInt(deploymentResults.NFTMarketplace.gasUsed)).toString()
    );
    console.log("Deployment completed successfully!");

  } catch (error) {
    console.error("Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });