const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");
  
  // Get contract factory
  const Treasury = await ethers.getContractFactory("LDAOTreasury");
  
  // Deployment parameters
  const params = [
    "0xc9F690B45e33ca909bB9ab97836091673232611B", // LDAOToken
    "0xA31D2faD2B1Ab84Fb420824A5CF3aB5a272782CC", // USDC (Mock)
    "0xA0bD2057F45Deb2553745B5ddbB6e2AB80cFCE98", // MultiSigWallet
    "0x27a78A860445DFFD9073aFd7065dd421487c0F8A", // Governance
    "0x694AA1769357215DE4FAC081bf1f309aDC325306"  // Chainlink ETH/USD Feed
  ];
  
  console.log("Deploying LDAOTreasury...");
  const treasury = await Treasury.deploy(...params, {
    gasLimit: 8000000
  });
  
  console.log("Transaction hash:", treasury.deploymentTransaction().hash);
  console.log("Waiting for deployment...");
  
  await treasury.waitForDeployment();
  const address = await treasury.getAddress();
  
  console.log("✅ LDAOTreasury deployed to:", address);
  
  // Verify deployment
  const ethPrice = await treasury.getETHPrice();
  console.log("ETH Price from oracle:", ethers.formatEther(ethPrice), "USD");
  
  console.log("\nDeployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });