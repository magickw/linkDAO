import { ethers } from 'hardhat';

async function main() {
  console.log('Testing Base Sepolia deployment...');
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log('Deploying with account:', deployer.address);
  
  // Check balance
  const balance = await deployer.getBalance();
  console.log('Account balance:', ethers.formatEther(balance), 'ETH');
  
  // Deploy a simple contract to test
  console.log('Deploying Counter contract...');
  const Counter = await ethers.getContractFactory('Counter');
  const counter = await Counter.deploy();
  await counter.deployed();
  
  console.log('Counter deployed to:', counter.address);
  
  // Test interaction
  const initialValue = await counter.x();
  console.log('Initial counter value:', initialValue.toString());
  
  // Increment
  const tx = await counter.inc();
  await tx.wait();
  
  const newValue = await counter.x();
  console.log('New counter value:', newValue.toString());
  
  console.log('✅ Base Sepolia test deployment successful!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });