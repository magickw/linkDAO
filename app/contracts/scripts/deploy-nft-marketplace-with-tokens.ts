import { ethers } from "hardhat";

/**
 * Deploy NFTMarketplace with USDC/USDT support
 *
 * Usage:
 * npx hardhat run scripts/deploy-nft-marketplace-with-tokens.ts --network sepolia
 */
async function main() {
  console.log("🚀 Deploying NFTMarketplace with USDC/USDT support...\n");

  // Get network
  const network = await ethers.provider.getNetwork();
  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);

  // Token addresses for different networks
  const TOKEN_ADDRESSES: Record<string, { usdc: string; usdt: string }> = {
    // Ethereum Mainnet
    "1": {
      usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7"
    },
    // Sepolia Testnet
    "11155111": {
      usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // USDC on Sepolia
      usdt: "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0" // USDT on Sepolia
    },
    // Base Mainnet
    "8453": {
      usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      usdt: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2"
    }
  };

  const chainId = network.chainId.toString();
  let usdcAddress: string;
  let usdtAddress: string;

  if (TOKEN_ADDRESSES[chainId]) {
    usdcAddress = TOKEN_ADDRESSES[chainId].usdc;
    usdtAddress = TOKEN_ADDRESSES[chainId].usdt;
    console.log(`✓ Using existing USDC/USDT addresses for chain ${chainId}`);
  } else {
    // Deploy mock tokens for testing
    console.log("⚠️  No token addresses found for this network. Deploying mock tokens...");

    const MockERC20 = await ethers.getContractFactory("MockERC20");

    const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    await usdc.waitForDeployment();
    usdcAddress = await usdc.getAddress();
    console.log(`✓ Mock USDC deployed at: ${usdcAddress}`);

    const usdt = await MockERC20.deploy("Tether USD", "USDT", 6);
    await usdt.waitForDeployment();
    usdtAddress = await usdt.getAddress();
    console.log(`✓ Mock USDT deployed at: ${usdtAddress}`);
  }

  console.log(`\nToken Addresses:`);
  console.log(`  USDC: ${usdcAddress}`);
  console.log(`  USDT: ${usdtAddress}\n`);

  // Deploy NFTMarketplace
  console.log("Deploying NFTMarketplace...");
  const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
  const marketplace = await NFTMarketplace.deploy(usdcAddress, usdtAddress);
  await marketplace.waitForDeployment();

  const marketplaceAddress = await marketplace.getAddress();
  console.log(`✓ NFTMarketplace deployed at: ${marketplaceAddress}\n`);

  // Verify configuration
  console.log("Verifying configuration...");
  const configuredUSDC = await marketplace.usdcToken();
  const configuredUSDT = await marketplace.usdtToken();
  const platformFee = await marketplace.platformFee();

  console.log(`  USDC Token: ${configuredUSDC} ${configuredUSDC === usdcAddress ? '✓' : '✗'}`);
  console.log(`  USDT Token: ${configuredUSDT} ${configuredUSDT === usdtAddress ? '✓' : '✗'}`);
  console.log(`  Platform Fee: ${platformFee} basis points (${Number(platformFee) / 100}%)\n`);

  // Print deployment summary
  console.log("=" .repeat(80));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=" .repeat(80));
  console.log(`Network:          ${network.name} (${chainId})`);
  console.log(`NFTMarketplace:   ${marketplaceAddress}`);
  console.log(`USDC Token:       ${usdcAddress}`);
  console.log(`USDT Token:       ${usdtAddress}`);
  console.log("=" .repeat(80));

  // Print usage examples
  console.log("\n📝 Usage Examples:\n");

  console.log("1. List NFT for USDC:");
  console.log(`   await marketplace.listNFT(tokenId, ethers.parseUnits("100", 6), duration, 1);`);

  console.log("\n2. Buy NFT with USDC:");
  console.log(`   await usdc.approve(marketplaceAddress, price);`);
  console.log(`   await marketplace.buyNFT(tokenId);`);

  console.log("\n3. Create USDT auction:");
  console.log(`   await marketplace.createAuction(tokenId, startPrice, reservePrice, duration, 2);`);

  console.log("\n4. Place bid with USDT:");
  console.log(`   await usdt.approve(marketplaceAddress, bidAmount);`);
  console.log(`   await marketplace.placeBid(tokenId, bidAmount);`);

  console.log("\n5. Make offer with USDC:");
  console.log(`   await usdc.approve(marketplaceAddress, offerAmount);`);
  console.log(`   await marketplace.makeOffer(tokenId, duration, 1, offerAmount);\n`);

  // Verification instructions
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("🔍 To verify the contract on Etherscan, run:");
    console.log(`npx hardhat verify --network ${network.name} ${marketplaceAddress} ${usdcAddress} ${usdtAddress}\n`);
  }

  return {
    marketplace: marketplaceAddress,
    usdc: usdcAddress,
    usdt: usdtAddress
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
