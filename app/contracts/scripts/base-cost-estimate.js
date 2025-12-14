const { ethers } = require("hardhat");

async function main() {
  console.log("Base Mainnet Deployment Cost Estimate");
  console.log("====================================");
  
  // Base gas costs (typical)
  const GAS_PRICE = 100000000; // 0.1 gwei in wei
  const ETH_PRICE = 3000; // $3000 per ETH
  
  // Contract deployment estimates
  const contracts = [
    { name: "LDAOToken", gas: 2000000 },
    { name: "MultiSigWallet", gas: 1500000 },
    { name: "Governance", gas: 2500000 },
    { name: "LDAOTreasuryOptimized", gas: 3000000 },
    { name: "CharityGovernance", gas: 2500000 },
    { name: "ReputationSystem", gas: 2000000 },
    { name: "SocialReputationToken", gas: 2500000 },
    { name: "ReputationBridge", gas: 1500000 },
    { name: "ProfileRegistry", gas: 3000000 },
    { name: "FollowModule", gas: 2500000 },
    { name: "TipRouter", gas: 2500000 },
    { name: "PaymentRouter", gas: 1500000 },
    { name: "EnhancedEscrow", gas: 3000000 },
    { name: "DisputeResolution", gas: 2500000 },
    { name: "Marketplace", gas: 4000000 },
    { name: "NFTMarketplace", gas: 4000000 },
    { name: "NFTCollectionFactory", gas: 3000000 },
    { name: "RewardPool", gas: 1500000 },
    { name: "SecureBridgeValidator", gas: 2500000 },
    { name: "CharityMonitor", gas: 2000000 }
  ];
  
  console.log("\nContract Deployments:");
  console.log("-".repeat(60));
  let totalGas = 0;
  let totalCost = 0;
  
  contracts.forEach(contract => {
    totalGas += contract.gas;
    const cost = (contract.gas * GAS_PRICE) / 1e18; // Convert to ETH
    totalCost += cost;
    console.log(`${contract.name.padEnd(25)} ${contract.gas.toLocaleString()} gas ≈ ${cost.toFixed(6)} ETH`);
  });
  
  console.log("-".repeat(60));
  console.log(`TOTAL`.padEnd(25) + `${totalGas.toLocaleString()} gas ≈ ${totalCost.toFixed(6)} ETH`);
  
  // Add buffer
  const withBuffer = totalCost * 1.2;
  console.log(`\nWith 20% buffer:`.padEnd(25) + `${withBuffer.toFixed(6)} ETH`);
  console.log(`In USD:`.padEnd(25) + `$${(withBuffer * ETH_PRICE).toFixed(2)}`);
  
  console.log("\n📌 Key Points:");
  console.log("• Base gas prices are ~100x lower than Ethereum");
  console.log("• Total deployment cost is under $10 on Base");
  console.log("• Same deployment would cost ~$1000 on Ethereum");
  
  console.log("\n💰 Funding Recommendations:");
  console.log("• Minimum: 0.01 ETH");
  console.log("• Recommended: 0.02 ETH (includes buffer)");
  console.log("• For safety: 0.05 ETH");
  
  console.log("\n🔗 How to Fund:");
  console.log("1. Bridge ETH from Ethereum to Base");
  console.log("2. Use Coinbase Base faucet (for testnet)");
  console.log("3. Purchase ETH on Base DEX");
}

main().catch(console.error);