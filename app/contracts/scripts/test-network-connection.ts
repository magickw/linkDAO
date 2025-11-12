import { ethers } from 'hardhat';

async function main() {
  console.log('Testing connection to Base Sepolia network...');
  
  const provider = ethers.provider;
  const network = await provider.getNetwork();
  
  console.log('Network name:', network.name);
  console.log('Chain ID:', network.chainId);
  
  const [signer] = await ethers.getSigners();
  console.log('Signer address:', signer.address);
  
  const balance = await provider.getBalance(signer.address);
  console.log('Balance:', ethers.utils.formatEther(balance), 'ETH');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });