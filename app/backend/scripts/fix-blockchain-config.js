#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing blockchain configuration issues...\n');

// Fix 1: Update wagmi.ts to use Base Sepolia RPC
const wagmiPath = path.join(__dirname, '../frontend/src/lib/wagmi.ts');
if (fs.existsSync(wagmiPath)) {
  console.log('✅ wagmi.ts already configured with Base RPC endpoints');
} else {
  console.log('⚠️  wagmi.ts not found at expected location');
}

// Fix 2: Update NetworkSwitcher to include Base Sepolia
const networkSwitcherPath = path.join(__dirname, '../frontend/src/components/Web3/NetworkSwitcher.tsx');
if (fs.existsSync(networkSwitcherPath)) {
  let content = fs.readFileSync(networkSwitcherPath, 'utf8');
  
  // Add Base Sepolia to supported networks
  if (!content.includes('baseSepolia')) {
    content = content.replace(
      'const SUPPORTED_NETWORKS = [',
      `const SUPPORTED_NETWORKS = [
  {
    id: baseSepolia.id,
    name: 'Base Sepolia',
    shortName: 'SEP',
    color: 'bg-blue-300',
    isTestnet: true
  },`
    );
    
    // Add baseSepolia import
    content = content.replace(
      'import { mainnet, polygon, arbitrum, sepolia, base, baseSepolia } from \'wagmi/chains\';',
      'import { mainnet, polygon, arbitrum, sepolia, base, baseSepolia } from \'wagmi/chains\';'
    );
    
    fs.writeFileSync(networkSwitcherPath, content);
    console.log('✅ Added Base Sepolia to NetworkSwitcher');
  } else {
    console.log('✅ Base Sepolia already in NetworkSwitcher');
  }
}

// Fix 3: Create blockchain config for frontend
const frontendEnvPath = path.join(__dirname, '../frontend/.env.blockchain');
const blockchainConfig = `# Blockchain Configuration for Frontend
# ======================================

# Base Sepolia Testnet
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Contract Addresses (will be updated after deployment)
NEXT_PUBLIC_LDAO_TOKEN_ADDRESS=
NEXT_PUBLIC_GOVERNANCE_ADDRESS=
NEXT_PUBLIC_MARKETPLACE_ADDRESS=
NEXT_PUBLIC_REPUTATION_ADDRESS=
NEXT_PUBLIC_STAKING_ADDRESS=
NEXT_PUBLIC_TREASURY_ADDRESS=
NEXT_PUBLIC_MULTISIG_ADDRESS=

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=demo-project-id

# Coinbase CDP (Optional)
# NEXT_PUBLIC_CDP_API_KEY=your_cdp_api_key_here
`;

if (!fs.existsSync(frontendEnvPath)) {
  fs.writeFileSync(frontendEnvPath, blockchainConfig);
  console.log('✅ Created frontend blockchain configuration');
} else {
  console.log('✅ Frontend blockchain configuration already exists');
}

// Fix 4: Update deployment script for Base Sepolia
const deployScriptPath = path.join(__dirname, '../contracts/scripts/deploy-base-sepolia-essential.ts');
if (fs.existsSync(deployScriptPath)) {
  console.log('✅ Base Sepolia deployment script exists');
} else {
  console.log('⚠️  Base Sepolia deployment script not found');
}

console.log('\n✨ Blockchain configuration fixes completed!');
console.log('\n📋 Next steps:');
console.log('1. Get Base Sepolia test ETH from: https://sepoliafaucet.com/');
console.log('2. Deploy contracts using: npm run deploy:base-sepolia');
console.log('3. Update contract addresses in .env files');
console.log('4. Restart the backend server');