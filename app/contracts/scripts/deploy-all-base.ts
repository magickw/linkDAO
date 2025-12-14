import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Complete Base Mainnet Deployment Plan");
  console.log("=====================================");

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Deployer:", deployerAddress);

  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId);

  // Base mainnet configuration
  const BASE_MAINNET = {
    // Real addresses on Base mainnet
    USDC: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA", // USDC on Base
    ETH_USD_FEED: "0x5498BB86BC934c8D34FDA08E81D444153d0D06aD", // Chainlink ETH/USD on Base
    // Gas price on Base (as of 2024)
    GAS_PRICE: ethers.parseUnits("0.1", "gwei"), // 0.1 gwei typical on Base
  };

  console.log("\n📊 Gas Cost Estimates (Base Mainnet):");
  console.log("Current gas price: ~0.1 gwei");
  console.log("1 ETH = ~1,000,000,000 gwei");
  console.log("Estimated cost per 1M gas: ~0.00001 ETH");

  // Deployment order and estimated costs
  const deployments = [
    {
      name: "LDAOToken",
      gas: 2000000, // 2M gas
      desc: "Core LDAO token"
    },
    {
      name: "MockERC20",
      gas: 1000000, // 1M gas
      desc: "USDC mock for testing (optional on mainnet)"
    },
    {
      name: "MultiSigWallet",
      gas: 1500000, // 1.5M gas
      desc: "Multi-signature wallet"
    },
    {
      name: "Governance",
      gas: 2500000, // 2.5M gas
      desc: "Governance contract"
    },
    {
      name: "LDAOTreasuryOptimized",
      gas: 3000000, // 3M gas (optimized)
      desc: "Main treasury with security fixes"
    },
    {
      name: "CharityGovernance",
      gas: 2500000, // 2.5M gas
      desc: "Charity governance (separate from treasury)"
    },
    {
      name: "ReputationSystem",
      gas: 2000000, // 2M gas
      desc: "Reputation tracking system"
    },
    {
      name: "SocialReputationToken",
      gas: 2500000, // 2.5M gas
      desc: "Tokenized reputation"
    },
    {
      name: "ReputationBridge",
      gas: 1500000, // 1.5M gas
      desc: "Bridge between reputation systems"
    },
    {
      name: "ProfileRegistry",
      gas: 3000000, // 3M gas
      desc: "User profile registry"
    },
    {
      name: "FollowModule",
      gas: 2500000, // 2.5M gas
      desc: "Social follow module"
    },
    {
      name: "TipRouter",
      gas: 2500000, // 2.5M gas
      desc: "Tip routing system"
    },
    {
      name: "PaymentRouter",
      gas: 1500000, // 1.5M gas
      desc: "Payment processing"
    },
    {
      name: "EnhancedEscrow",
      gas: 3000000, // 3M gas
      desc: "Enhanced escrow system"
    },
    {
      name: "DisputeResolution",
      gas: 2500000, // 2.5M gas
      desc: "Dispute resolution"
    },
    {
      name: "Marketplace",
      gas: 4000000, // 4M gas
      desc: "NFT marketplace"
    },
    {
      name: "NFTMarketplace",
      gas: 4000000, // 4M gas
      desc: "NFT marketplace v2"
    },
    {
      name: "NFTCollectionFactory",
      gas: 3000000, // 3M gas
      desc: "NFT collection factory"
    },
    {
      name: "RewardPool",
      gas: 1500000, // 1.5M gas
      desc: "Reward distribution pool"
    },
    {
      name: "SecureBridgeValidator",
      gas: 2500000, // 2.5M gas
      desc: "Bridge security validator"
    },
    {
      name: "CharityMonitor",
      gas: 2000000, // 2M gas
      desc: "Charity monitoring system"
    }
  ];

  // Calculate total estimated cost
  let totalGas = 0;
  console.log("\n📋 Deployment Breakdown:");
  console.log("Contract".padEnd(25) + "Gas (M)".padEnd(10) + "Cost (ETH)".padEnd(15) + "Description");
  console.log("-".repeat(70));

  deployments.forEach(dep => {
    totalGas += dep.gas;
    const cost = BigInt(dep.gas) * BASE_MAINNET.GAS_PRICE / ethers.parseUnits("1", "ether");
    const actualCost = Number(ethers.formatEther(cost));
    const costDisplay = actualCost > 0.0001 ? actualCost.toFixed(6) : "~0.0001";
    console.log(
      dep.name.padEnd(25) +
      (dep.gas / 1000000).toFixed(2).padEnd(10) +
      costDisplay.padEnd(15) +
      dep.desc
    );
  });

  const totalCost = BigInt(totalGas) * BASE_MAINNET.GAS_PRICE / ethers.parseUnits("1", "ether");
  
  console.log("-".repeat(70));
  console.log("TOTAL".padEnd(25) +
    (totalGas / 1000000).toFixed(2).padEnd(10) +
    ethers.formatEther(totalCost).padEnd(15) +
    "All contracts");

  // Add 20% buffer for price fluctuations
  const recommendedETH = totalCost * BigInt(12) / BigInt(10);
  
  console.log("\n💰 Funding Recommendations:");
  console.log("Minimum required:", ethers.formatEther(totalCost), "ETH");
  console.log("With 20% buffer:", ethers.formatEther(recommendedETH), "ETH");
  console.log("In USD (assuming $3000/ETH):", 
    "$" + (parseFloat(ethers.formatEther(recommendedETH)) * 3000).toFixed(2));

  // Check current balance
  try {
    const balance = await deployer.provider.getBalance(deployerAddress);
    console.log("\n💼 Current wallet balance:", ethers.formatEther(balance), "ETH");
    
    if (balance < recommendedETH) {
      const needed = recommendedETH - balance;
      console.log("⚠️  Need additional:", ethers.formatEther(needed), "ETH");
    } else {
      console.log("✅ Sufficient funds for deployment");
    }
  } catch (error) {
    console.log("\n⚠️  Could not fetch balance (wallet not connected to Base)");
  }

  // Create deployment plan
  console.log("\n📝 Deployment Plan:");
  console.log("1. Fund wallet with at least", ethers.formatEther(recommendedETH), "ETH");
  console.log("2. Deploy core contracts first (LDAOToken, MultiSig, Governance)");
  console.log("3. Deploy LDAOTreasuryOptimized with security fixes");
  console.log("4. Deploy supporting contracts");
  console.log("5. Verify all contracts on BaseScan");
  console.log("6. Update frontend with new contract addresses");

  // Save deployment plan
  const deploymentPlan = {
    network: "base-mainnet",
    chainId: "8453",
    estimatedCost: {
      minimum: ethers.formatEther(totalCost),
      recommended: ethers.formatEther(recommendedETH),
      inUSD: (parseFloat(ethers.formatEther(recommendedETH)) * 3000).toFixed(2)
    },
    contracts: deployments,
    gasPrice: ethers.formatUnits(BASE_MAINNET.GAS_PRICE, "gwei"),
    deployer: deployerAddress,
    createdAt: new Date().toISOString()
  };

  const fs = require('fs');
  fs.writeFileSync(
    `deployment-plan-base-mainnet-${Date.now()}.json`,
    JSON.stringify(deploymentPlan, null, 2)
  );

  console.log("\n✅ Deployment plan saved to file");
  console.log("\n🔗 Useful Links:");
  console.log("Base Bridge: https://bridge.base.org/");
  console.log("BaseScan: https://basescan.org/");
  console.log("Base Faucet: https://www.coinbase.com/faucets/base");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });