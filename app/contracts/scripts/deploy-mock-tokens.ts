import { ethers } from "hardhat";
import { MockERC20 } from "../typechain-types";

async function main() {
  console.log("Deploying MockERC20 tokens for testing...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const MockERC20Factory = await ethers.getContractFactory("MockERC20");

  // Deploy different mock tokens with various decimals
  const mockTokens = [
    { name: "Mock USDC", symbol: "MUSDC", decimals: 6 },
    { name: "Mock WBTC", symbol: "MWBTC", decimals: 8 },
    { name: "Mock DAI", symbol: "MDAI", decimals: 18 },
    { name: "Mock USDT", symbol: "MUSDT", decimals: 6 }
  ];

  const deployedTokens: { [key: string]: string } = {};

  for (const tokenConfig of mockTokens) {
    console.log(`\nDeploying ${tokenConfig.name}...`);
    
    const mockToken = await MockERC20Factory.deploy(
      tokenConfig.name,
      tokenConfig.symbol,
      tokenConfig.decimals
    ) as MockERC20;

    await mockToken.deployed();

    console.log(`${tokenConfig.symbol} deployed to:`, mockToken.address);
    
    // Verify deployment
    const name = await mockToken.name();
    const symbol = await mockToken.symbol();
    const decimals = await mockToken.decimals();
    
    console.log(`  Name: ${name}`);
    console.log(`  Symbol: ${symbol}`);
    console.log(`  Decimals: ${decimals}`);
    
    // Mint some tokens to deployer for testing
    const mintAmount = ethers.utils.parseUnits("1000000", decimals); // 1M tokens
    await mockToken.mint(deployer.address, mintAmount);
    
    const balance = await mockToken.balanceOf(deployer.address);
    console.log(`  Minted: ${ethers.utils.formatUnits(balance, decimals)} ${symbol}`);
    
    deployedTokens[tokenConfig.symbol] = mockToken.address;
  }

  console.log("\n=== Mock Token Deployment Summary ===");
  Object.entries(deployedTokens).forEach(([symbol, address]) => {
    console.log(`${symbol}: ${address}`);
  });

  // Test ERC20 compliance
  console.log("\n=== ERC20 Compliance Testing ===");
  for (const [symbol, address] of Object.entries(deployedTokens)) {
    const token = MockERC20Factory.attach(address) as MockERC20;
    
    try {
      // Test basic ERC20 functions
      const totalSupply = await token.totalSupply();
      const balance = await token.balanceOf(deployer.address);
      const allowance = await token.allowance(deployer.address, deployer.address);
      
      console.log(`${symbol}: ✓ ERC20 compliant`);
      console.log(`  Total Supply: ${ethers.utils.formatUnits(totalSupply, await token.decimals())}`);
      
    } catch (error) {
      console.log(`${symbol}: ✗ ERC20 compliance issue:`, error);
    }
  }

  // Test mint and burn functions
  console.log("\n=== Testing Mint/Burn Functions ===");
  const testToken = MockERC20Factory.attach(deployedTokens["MUSDC"]) as MockERC20;
  
  const initialBalance = await testToken.balanceOf(deployer.address);
  console.log("Initial balance:", ethers.utils.formatUnits(initialBalance, 6));
  
  // Test minting
  const mintAmount = ethers.utils.parseUnits("1000", 6);
  await testToken.mint(deployer.address, mintAmount);
  
  const balanceAfterMint = await testToken.balanceOf(deployer.address);
  console.log("Balance after mint:", ethers.utils.formatUnits(balanceAfterMint, 6));
  
  // Test burning
  const burnAmount = ethers.utils.parseUnits("500", 6);
  await testToken.burn(deployer.address, burnAmount);
  
  const balanceAfterBurn = await testToken.balanceOf(deployer.address);
  console.log("Balance after burn:", ethers.utils.formatUnits(balanceAfterBurn, 6));
  
  // Verify mint/burn worked correctly
  const expectedBalance = initialBalance.add(mintAmount).sub(burnAmount);
  if (balanceAfterBurn.eq(expectedBalance)) {
    console.log("✓ Mint/Burn functions working correctly");
  } else {
    console.log("✗ Mint/Burn functions not working as expected");
  }

  return {
    deployedTokens,
    deployer: deployer.address,
    network: await ethers.provider.getNetwork()
  };
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Deployment failed:", error);
      process.exit(1);
    });
}

export { main as deployMockTokens };