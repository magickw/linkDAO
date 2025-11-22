const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=== Phase 4: Extended Features Deployment ===");
  console.log("Deploying NFT marketplace infrastructure and social features...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.getBalance()));

  const deploymentResults = {};

  // Read existing addresses
  const addressesPath = path.join(__dirname, "../deployedAddresses.json");
  let addresses = {};
  
  try {
    const existingData = fs.readFileSync(addressesPath, "utf8");
    addresses = JSON.parse(existingData);
  } catch (error) {
    console.log("Warning: Could not read deployedAddresses.json");
  }

  try {
    // Task 4: Deploy NFT marketplace infrastructure
    console.log("\n=== Task 4: Deploy NFT marketplace infrastructure ===");

    // Deploy NFTMarketplace
    console.log("\n1. Deploying NFTMarketplace...");
    const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
    const nftMarketplace = await NFTMarketplace.deploy();
    await nftMarketplace.deployed();
    
    console.log("NFTMarketplace deployed to:", nftMarketplace.address);
    
    deploymentResults.NFTMarketplace = {
      address: nftMarketplace.address,
      deployer: deployer.address,
      deployedAt: new Date().toISOString(),
      transactionHash: nftMarketplace.deployTransaction.hash,
      gasUsed: (await nftMarketplace.deployTransaction.wait()).gasUsed.toString(),
      contractName: "NFTMarketplace"
    };

    // Test NFTMarketplace
    console.log("Testing NFTMarketplace...");
    const name = await nftMarketplace.name();
    const symbol = await nftMarketplace.symbol();
    const platformFee = await nftMarketplace.platformFee();
    console.log("- Name:", name);
    console.log("- Symbol:", symbol);
    console.log("- Platform fee:", platformFee.toString(), "basis points");

    // Task 4.1: Implement NFT collection factory
    console.log("\n=== Task 4.1: Implement NFT collection factory ===");

    console.log("\n2. Deploying NFTCollectionFactory...");
    const NFTCollectionFactory = await ethers.getContractFactory("NFTCollectionFactory");
    const nftCollectionFactory = await NFTCollectionFactory.deploy();
    await nftCollectionFactory.deployed();
    
    console.log("NFTCollectionFactory deployed to:", nftCollectionFactory.address);
    
    deploymentResults.NFTCollectionFactory = {
      address: nftCollectionFactory.address,
      deployer: deployer.address,
      deployedAt: new Date().toISOString(),
      transactionHash: nftCollectionFactory.deployTransaction.hash,
      gasUsed: (await nftCollectionFactory.deployTransaction.wait()).gasUsed.toString(),
      contractName: "NFTCollectionFactory"
    };

    // Test NFTCollectionFactory
    console.log("Testing NFTCollectionFactory...");
    const creationFee = await nftCollectionFactory.creationFee();
    const feeRecipient = await nftCollectionFactory.feeRecipient();
    console.log("- Creation fee:", ethers.formatEther(creationFee), "ETH");
    console.log("- Fee recipient:", feeRecipient);

    // Test collection creation
    console.log("Testing collection creation...");
    const collectionInfo = {
      description: "Test Collection for Phase 4",
      image: "https://example.com/image.png",
      externalUrl: "https://example.com",
      maxSupply: 1000,
      mintPrice: ethers.parseEther("0.1"),
      isPublicMint: true,
      creator: deployer.address,
      createdAt: 0
    };

    const createTx = await nftCollectionFactory.createCollection(
      "Phase4 Test Collection",
      "P4TEST",
      collectionInfo,
      250, // 2.5% royalty
      { value: creationFee }
    );

    const createReceipt = await createTx.wait();
    console.log("- Collection created successfully!");
    console.log("- Transaction hash:", createReceipt.transactionHash);

    const collectionCount = await nftCollectionFactory.getCollectionCount();
    console.log("- Total collections:", collectionCount.toString());

    // Task 4.2: Build social tipping system
    console.log("\n=== Task 4.2: Build social tipping system ===");

    // Get required addresses for TipRouter
    const ldaoTokenAddress = addresses.LDAOToken?.address;
    const rewardPoolAddress = addresses.RewardPool?.address || addresses.EnhancedRewardPool?.address;

    if (!ldaoTokenAddress) {
      console.log("Warning: LDAOToken address not found. TipRouter deployment skipped.");
      console.log("Please deploy LDAOToken first, then run TipRouter deployment separately.");
    } else if (!rewardPoolAddress) {
      console.log("Warning: RewardPool address not found. TipRouter deployment skipped.");
      console.log("Please deploy RewardPool first, then run TipRouter deployment separately.");
    } else {
      console.log("\n3. Deploying TipRouter...");
      console.log("Using LDAO Token address:", ldaoTokenAddress);
      console.log("Using RewardPool address:", rewardPoolAddress);

      const TipRouter = await ethers.getContractFactory("TipRouter");
      const tipRouter = await TipRouter.deploy(ldaoTokenAddress, rewardPoolAddress);
      await tipRouter.deployed();
      
      console.log("TipRouter deployed to:", tipRouter.address);
      
      deploymentResults.TipRouter = {
        address: tipRouter.address,
        deployer: deployer.address,
        deployedAt: new Date().toISOString(),
        transactionHash: tipRouter.deployTransaction.hash,
        gasUsed: (await tipRouter.deployTransaction.wait()).gasUsed.toString(),
        contractName: "TipRouter",
        constructorArgs: {
          ldaoToken: ldaoTokenAddress,
          rewardPool: rewardPoolAddress
        }
      };

      // Test TipRouter
      console.log("Testing TipRouter...");
      const ldaoAddr = await tipRouter.ldao();
      const rewardPoolAddr = await tipRouter.rewardPool();
      const feeBps = await tipRouter.feeBps();
      console.log("- LDAO token address:", ldaoAddr);
      console.log("- Reward pool address:", rewardPoolAddr);
      console.log("- Fee basis points:", feeBps.toString(), "(", feeBps.toNumber() / 100, "%)");
    }

    // Task 4.3: Implement social connection features
    console.log("\n=== Task 4.3: Implement social connection features ===");

    console.log("\n4. Deploying FollowModule...");
    const FollowModule = await ethers.getContractFactory("FollowModule");
    const followModule = await FollowModule.deploy();
    await followModule.deployed();
    
    console.log("FollowModule deployed to:", followModule.address);
    
    deploymentResults.FollowModule = {
      address: followModule.address,
      deployer: deployer.address,
      deployedAt: new Date().toISOString(),
      transactionHash: followModule.deployTransaction.hash,
      gasUsed: (await followModule.deployTransaction.wait()).gasUsed.toString(),
      contractName: "FollowModule"
    };

    // Test FollowModule
    console.log("Testing FollowModule...");
    const owner = await followModule.owner();
    console.log("- Contract owner:", owner);
    console.log("- Follow functionality ready for use");

    // Test NFT minting in marketplace
    console.log("\n=== Testing NFT Lifecycle ===");
    console.log("Testing NFT minting in marketplace...");
    
    const metadata = {
      name: "Phase 4 Test NFT",
      description: "A test NFT for Phase 4 deployment verification",
      image: "https://example.com/nft.png",
      animationUrl: "",
      externalUrl: "https://example.com",
      attributes: ["phase4", "test"],
      creator: deployer.address,
      createdAt: 0,
      isVerified: false
    };

    const contentHash = ethers.keccak256(ethers.toUtf8Bytes("phase4-test-content"));
    const mintTx = await nftMarketplace.mintNFT(
      deployer.address,
      "https://example.com/metadata/phase4-test.json",
      250, // 2.5% royalty
      contentHash,
      metadata
    );

    const mintReceipt = await mintTx.wait();
    console.log("- NFT minted successfully!");
    console.log("- Mint transaction hash:", mintReceipt.transactionHash);

    // Update addresses with new deployments
    Object.assign(addresses, deploymentResults);
    fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
    console.log("\nDeployment info saved to deployedAddresses.json");

    // Calculate total gas used
    const totalGasUsed = Object.values(deploymentResults).reduce((total, deployment) => {
      return total + BigInt(deployment.gasUsed);
    }, BigInt(0));

    console.log("\n=== Phase 4 Deployment Summary ===");
    console.log("NFTMarketplace:", deploymentResults.NFTMarketplace.address);
    console.log("NFTCollectionFactory:", deploymentResults.NFTCollectionFactory.address);
    if (deploymentResults.TipRouter) {
      console.log("TipRouter:", deploymentResults.TipRouter.address);
    } else {
      console.log("TipRouter: Skipped (missing dependencies)");
    }
    console.log("FollowModule:", deploymentResults.FollowModule.address);
    console.log("Total gas used:", totalGasUsed.toString());
    console.log("\n=== Phase 4 Extended Features Deployment Completed Successfully! ===");

    // Mark tasks as completed
    console.log("\n=== Task Completion Status ===");
    console.log("✓ Task 4: Deploy NFT marketplace infrastructure - COMPLETED");
    console.log("✓ Task 4.1: Implement NFT collection factory - COMPLETED");
    console.log(deploymentResults.TipRouter ? "✓" : "⚠", "Task 4.2: Build social tipping system -", deploymentResults.TipRouter ? "COMPLETED" : "PARTIALLY COMPLETED");
    console.log("✓ Task 4.3: Implement social connection features - COMPLETED");

    if (!deploymentResults.TipRouter) {
      console.log("\nNote: TipRouter deployment was skipped due to missing dependencies.");
      console.log("Please ensure LDAOToken and RewardPool are deployed, then run:");
      console.log("npx hardhat run scripts/deploy-tip-router.ts --network <network>");
    }

  } catch (error) {
    console.error("Phase 4 deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });