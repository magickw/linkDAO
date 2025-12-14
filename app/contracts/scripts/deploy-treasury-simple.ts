import { ethers } from "hardhat";

async function main() {
  console.log("Deploying Updated LDAOTreasury...");
  
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Deployer:", deployerAddress);

  // Existing contracts
  const LDAOTOKEN = "0xc9F690B45e33ca909bB9ab97836091673232611B";
  const USDC = "0xA31D2faD2B1Ab84Fb420824A5CF3aB5a272782CC";
  const MULTISIG = "0xA0bD2057F45Deb2553745B5ddbB6e2AB80cFCE98";
  const GOVERNANCE = "0x27a78A860445DFFD9073aFd7065dd421487c0F8A";
  const CHAINLINK_FEED = "0x694AA1769357215DE4FAC081bf1f309aDC325306";

  // Deploy LDAOTreasury
  const Treasury = await ethers.getContractFactory("LDAOTreasury");
  const treasury = await Treasury.deploy(
    LDAOTOKEN,
    USDC,
    MULTISIG,
    GOVERNANCE,
    CHAINLINK_FEED
  );
  
  const address = await treasury.getAddress();
  console.log("LDAOTreasury deployed to:", address);
  
  // Verify Chainlink integration
  const ethPrice = await treasury.getETHPrice();
  console.log("ETH Price:", ethers.formatEther(ethPrice));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });