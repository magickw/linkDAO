import { ethers } from "hardhat";
import { writeFileSync } from "fs";

async function main() {
  console.log("Starting minimal core contract deployment...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const deployedContracts: any = {};

  try {
    // Deploy LDAOToken first
    console.log("\n1. Deploying LDAOToken...");
    const LDAOToken = await ethers.getContractFactory("LDAOToken");
    const ldaoToken = await LDAOToken.deploy(deployer.address); // Use deployer as treasury
    await ldaoToken.deployed();
    deployedContracts.LDAOToken = ldaoToken.address;
    console.log("LDAOToken deployed to:", ldaoToken.address);

    // Deploy Counter (simple test contract)
    console.log("\n2. Deploying Counter...");
    const Counter = await ethers.getContractFactory("Counter");
    const counter = await Counter.deploy();
    await counter.deployed();
    deployedContracts.Counter = counter.address;
    console.log("Counter deployed to:", counter.address);

    // Deploy ReputationSystem
    console.log("\n3. Deploying ReputationSystem...");
    const ReputationSystem = await ethers.getContractFactory("ReputationSystem");
    const reputationSystem = await ReputationSystem.deploy();
    await reputationSystem.deployed();
    deployedContracts.ReputationSystem = reputationSystem.address;
    console.log("ReputationSystem deployed to:", reputationSystem.address);

    // Deploy Governance
    console.log("\n4. Deploying Governance...");
    const Governance = await ethers.getContractFactory("Governance");
    const governance = await Governance.deploy(ldaoToken.address);
    await governance.deployed();
    deployedContracts.Governance = governance.address;
    console.log("Governance deployed to:", governance.address);

    // Deploy EnhancedEscrow
    console.log("\n6. Deploying EnhancedEscrow...");
    const EnhancedEscrow = await ethers.getContractFactory("EnhancedEscrow");
    const escrow = await EnhancedEscrow.deploy(ldaoToken.address, governance.address);
    await escrow.deployed();
    deployedContracts.EnhancedEscrow = escrow.address;
    console.log("EnhancedEscrow deployed to:", escrow.address);

    // Deploy Marketplace
    console.log("\n7. Deploying Marketplace...");
    const Marketplace = await ethers.getContractFactory("Marketplace");
    const marketplace = await Marketplace.deploy(ldaoToken.address);
    await marketplace.deployed();
    deployedContracts.Marketplace = marketplace.address;
    console.log("Marketplace deployed to:", marketplace.address);

    // Save deployment addresses
    const deploymentInfo = {
      network: await ethers.provider.getNetwork(),
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: deployedContracts
    };

    writeFileSync(
      `deployments-${deploymentInfo.network.name}-${Date.now()}.json`,
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("\n✅ Core contracts deployed successfully!");
    console.log("Deployment addresses saved to deployments file");
    console.log("\nDeployed contracts:");
    Object.entries(deployedContracts).forEach(([name, address]) => {
      console.log(`${name}: ${address}`);
    });

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });