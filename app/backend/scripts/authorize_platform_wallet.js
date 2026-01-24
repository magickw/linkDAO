const { ethers } = require('ethers');
const dotenv = require('dotenv');
dotenv.config();

async function authorizePlatformWallet() {
  const rpcUrl = process.env.RPC_URL || 'https://sepolia.drpc.org';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  // Use the owner wallet to authorize the refund wallet
  // In this project, OWNER_PRIVATE_KEY is usually the deployer
  const ownerPrivateKey = process.env.OWNER_PRIVATE_KEY || process.env.REFUND_WALLET_PRIVATE_KEY;
  if (!ownerPrivateKey) {
    console.error('OWNER_PRIVATE_KEY or REFUND_WALLET_PRIVATE_KEY not found');
    return;
  }

  const ownerWallet = new ethers.Wallet(ownerPrivateKey, provider);
  const refundWallet = new ethers.Wallet(process.env.REFUND_WALLET_PRIVATE_KEY, provider);
  
  const escrowAddress = process.env.ENHANCED_ESCROW_CONTRACT_ADDRESS;
  if (!escrowAddress) {
    console.error('ENHANCED_ESCROW_CONTRACT_ADDRESS not found');
    return;
  }

  const abi = [
    "function authorizePlatformAddress(address platformAddress, bool authorized) external",
    "function authorizedPlatformAddresses(address) view returns (bool)"
  ];

  const contract = new ethers.Contract(escrowAddress, abi, ownerWallet);

  try {
    console.log(`Checking if ${refundWallet.address} is authorized...`);
    const isAuthorized = await contract.authorizedPlatformAddresses(refundWallet.address);
    
    if (isAuthorized) {
      console.log('Refund wallet is already authorized');
      return;
    }

    console.log(`Authorizing refund wallet ${refundWallet.address}...`);
    const tx = await contract.authorizePlatformAddress(refundWallet.address, true);
    console.log(`Transaction sent: ${tx.hash}`);
    await tx.wait();
    console.log('Refund wallet authorized successfully');
  } catch (err) {
    console.error('Error authorizing refund wallet:', err);
  }
}

authorizePlatformWallet();
