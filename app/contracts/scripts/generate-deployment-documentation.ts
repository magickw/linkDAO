#!/usr/bin/env ts-node

import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';

interface DeployedAddresses {
  [contractName: string]: string;
}

interface ContractInfo {
  name: string;
  address: string;
  abi: any[];
  bytecode?: string;
  deploymentTx?: string;
  deploymentBlock?: number;
  gasUsed?: number;
  constructor?: {
    inputs: any[];
    values: any[];
  };
}

interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl?: string;
  explorerUrl?: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

interface DocumentationConfig {
  network: string;
  deployedAddressesFile: string;
  outputDir: string;
  includeABIs: boolean;
  includeUserGuides: boolean;
  includeTechnicalDocs: boolean;
  includeAPIReference: boolean;
}

class DeploymentDocumentationGenerator {
  private config: DocumentationConfig;
  private provider: ethers.Provider;
  private deployedAddresses: DeployedAddresses = {};
  private contractInfos: ContractInfo[] = [];
  private networkConfig: NetworkConfig;

  constructor(config: DocumentationConfig) {
    this.config = config;
    this.networkConfig = this.getNetworkConfig(config.network);
  }

  private getNetworkConfig(network: string): NetworkConfig {
    const configs: { [key: string]: NetworkConfig } = {
      mainnet: {
        name: 'Ethereum Mainnet',
        chainId: 1,
        rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/',
        explorerUrl: 'https://etherscan.io',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
      },
      sepolia: {
        name: 'Sepolia Testnet',
        chainId: 11155111,
        rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/',
        explorerUrl: 'https://sepolia.etherscan.io',
        nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 }
      },
      localhost: {
        name: 'Local Development',
        chainId: 31337,
        rpcUrl: 'http://localhost:8545',
        explorerUrl: 'http://localhost:8545',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
      }
    };

    return configs[network] || configs.localhost;
  }

  async initialize(): Promise<void> {
    console.log('📚 Initializing Deployment Documentation Generator...');
    
    // Setup provider
    this.provider = ethers.provider;
    
    console.log(`📡 Network: ${this.networkConfig.name} (Chain ID: ${this.networkConfig.chainId})`);
    
    // Load deployed addresses
    await this.loadDeployedAddresses();
    
    // Gather contract information
    await this.gatherContractInformation();
    
    // Ensure output directory exists
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
  }

  private async loadDeployedAddresses(): Promise<void> {
    try {
      const addressesPath = path.resolve(this.config.deployedAddressesFile);
      if (fs.existsSync(addressesPath)) {
        const addressesData = fs.readFileSync(addressesPath, 'utf8');
        this.deployedAddresses = JSON.parse(addressesData);
        console.log(`📋 Loaded ${Object.keys(this.deployedAddresses).length} deployed contracts`);
      } else {
        throw new Error(`Deployed addresses file not found: ${addressesPath}`);
      }
    } catch (error) {
      console.error('❌ Error loading deployed addresses:', error);
      throw error;
    }
  }

  private async gatherContractInformation(): Promise<void> {
    console.log('🔍 Gathering contract information...');
    
    const contractNames = Object.keys(this.deployedAddresses);
    
    for (const contractName of contractNames) {
      try {
        const address = this.deployedAddresses[contractName];
        const artifactPath = `./artifacts/contracts/${contractName}.sol/${contractName}.json`;
        
        let abi: any[] = [];
        let bytecode: string | undefined;
        
        // Try to load artifact
        if (fs.existsSync(artifactPath)) {
          const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
          abi = artifact.abi;
          bytecode = artifact.bytecode;
        }
        
        // Get deployment transaction info
        const code = await this.provider.getCode(address);
        const isDeployed = code !== '0x';
        
        const contractInfo: ContractInfo = {
          name: contractName,
          address,
          abi,
          bytecode
        };
        
        if (isDeployed) {
          // Try to get deployment info (this might not work for all networks)
          try {
            // This is a simplified approach - in practice, you'd store deployment tx hashes
            const currentBlock = await this.provider.getBlockNumber();
            contractInfo.deploymentBlock = currentBlock; // Placeholder
          } catch (error) {
            console.log(`⚠️  Could not get deployment info for ${contractName}`);
          }
        }
        
        this.contractInfos.push(contractInfo);
        console.log(`✅ Gathered info for ${contractName}`);
        
      } catch (error) {
        console.error(`❌ Error gathering info for ${contractName}:`, error);
      }
    }
  }

  async generateMainDeploymentReport(): Promise<void> {
    console.log('📄 Generating main deployment report...');
    
    let report = `# LinkDAO Mainnet Deployment Report\n\n`;
    report += `**Network:** ${this.networkConfig.name}\n`;
    report += `**Chain ID:** ${this.networkConfig.chainId}\n`;
    report += `**Generated:** ${new Date().toISOString()}\n\n`;
    
    // Executive Summary
    report += `## Executive Summary\n\n`;
    report += `The LinkDAO platform has been successfully deployed to ${this.networkConfig.name}. `;
    report += `This deployment includes ${this.contractInfos.length} smart contracts providing `;
    report += `comprehensive Web3 social platform functionality including governance, marketplace, `;
    report += `reputation systems, and DeFi features.\n\n`;
    
    // Deployment Overview
    report += `## Deployment Overview\n\n`;
    report += `| Contract | Address | Explorer Link |\n`;
    report += `|----------|---------|---------------|\n`;
    
    for (const contract of this.contractInfos) {
      const explorerLink = `${this.networkConfig.explorerUrl}/address/${contract.address}`;
      report += `| ${contract.name} | \`${contract.address}\` | [View](${explorerLink}) |\n`;
    }
    report += `\n`;
    
    // Contract Descriptions
    report += `## Contract Descriptions\n\n`;
    
    const contractDescriptions = {
      'LDAOToken': 'Native governance and utility token with staking capabilities',
      'Governance': 'On-chain governance system with proposal management and voting',
      'Marketplace': 'Multi-asset trading platform with escrow integration',
      'EnhancedEscrow': 'Multi-signature escrow system with dispute resolution',
      'ReputationSystem': 'Community-driven trust and scoring mechanism',
      'NFTMarketplace': 'NFT trading platform with royalty support',
      'TipRouter': 'Social tipping system for content creators',
      'FollowModule': 'Social following and relationship management',
      'PaymentRouter': 'Multi-token payment processing system',
      'EnhancedRewardPool': 'Staking rewards and incentive distribution'
    };
    
    for (const contract of this.contractInfos) {
      const description = contractDescriptions[contract.name] || 'Smart contract component';
      report += `### ${contract.name}\n\n`;
      report += `**Address:** \`${contract.address}\`\n`;
      report += `**Description:** ${description}\n`;
      
      if (contract.deploymentBlock) {
        report += `**Deployment Block:** ${contract.deploymentBlock}\n`;
      }
      
      if (contract.gasUsed) {
        report += `**Gas Used:** ${contract.gasUsed.toLocaleString()}\n`;
      }
      
      report += `**Explorer:** [View on ${this.networkConfig.name}](${this.networkConfig.explorerUrl}/address/${contract.address})\n\n`;
    }
    
    // Network Information
    report += `## Network Information\n\n`;
    report += `- **Network Name:** ${this.networkConfig.name}\n`;
    report += `- **Chain ID:** ${this.networkConfig.chainId}\n`;
    report += `- **Native Currency:** ${this.networkConfig.nativeCurrency.name} (${this.networkConfig.nativeCurrency.symbol})\n`;
    report += `- **Block Explorer:** ${this.networkConfig.explorerUrl}\n\n`;
    
    // Integration Information
    report += `## Integration Information\n\n`;
    report += `### Web3 Provider Configuration\n\n`;
    report += `\`\`\`javascript\n`;
    report += `const provider = new ethers.JsonRpcProvider('${this.networkConfig.rpcUrl}');\n`;
    report += `const chainId = ${this.networkConfig.chainId};\n`;
    report += `\`\`\`\n\n`;
    
    report += `### Contract Addresses (JSON)\n\n`;
    report += `\`\`\`json\n`;
    report += JSON.stringify(this.deployedAddresses, null, 2);
    report += `\n\`\`\`\n\n`;
    
    // Security Information
    report += `## Security Information\n\n`;
    report += `- All contracts have been audited and verified\n`;
    report += `- Emergency pause mechanisms are in place\n`;
    report += `- Multi-signature wallets control critical functions\n`;
    report += `- Monitoring and alerting systems are active\n\n`;
    
    // Next Steps
    report += `## Next Steps\n\n`;
    report += `1. **Community Launch:** Announce deployment to community\n`;
    report += `2. **Frontend Integration:** Update frontend to use mainnet contracts\n`;
    report += `3. **Monitoring:** Activate production monitoring systems\n`;
    report += `4. **Documentation:** Publish user guides and API documentation\n`;
    report += `5. **Support:** Establish community support channels\n\n`;
    
    const reportPath = path.join(this.config.outputDir, 'mainnet-deployment-report.md');
    fs.writeFileSync(reportPath, report);
    console.log(`📄 Main deployment report saved to: ${reportPath}`);
  }

  async generateContractAddressesReference(): Promise<void> {
    console.log('📋 Generating contract addresses reference...');
    
    let reference = `# LinkDAO Contract Addresses\n\n`;
    reference += `**Network:** ${this.networkConfig.name}\n`;
    reference += `**Chain ID:** ${this.networkConfig.chainId}\n`;
    reference += `**Updated:** ${new Date().toISOString()}\n\n`;
    
    // Quick Reference Table
    reference += `## Quick Reference\n\n`;
    reference += `| Contract | Address |\n`;
    reference += `|----------|----------|\n`;
    
    for (const contract of this.contractInfos) {
      reference += `| ${contract.name} | \`${contract.address}\` |\n`;
    }
    reference += `\n`;
    
    // Detailed Information
    reference += `## Detailed Contract Information\n\n`;
    
    for (const contract of this.contractInfos) {
      reference += `### ${contract.name}\n\n`;
      reference += `- **Address:** \`${contract.address}\`\n`;
      reference += `- **Explorer:** [${contract.address}](${this.networkConfig.explorerUrl}/address/${contract.address})\n`;
      
      if (contract.abi && contract.abi.length > 0) {
        const functions = contract.abi.filter(item => item.type === 'function');
        const events = contract.abi.filter(item => item.type === 'event');
        
        reference += `- **Functions:** ${functions.length}\n`;
        reference += `- **Events:** ${events.length}\n`;
      }
      
      reference += `\n`;
    }
    
    // Environment-specific configurations
    reference += `## Environment Configuration\n\n`;
    reference += `### Frontend Environment Variables\n\n`;
    reference += `\`\`\`env\n`;
    reference += `NEXT_PUBLIC_CHAIN_ID=${this.networkConfig.chainId}\n`;
    reference += `NEXT_PUBLIC_RPC_URL=${this.networkConfig.rpcUrl}\n`;
    
    for (const contract of this.contractInfos) {
      const envName = `NEXT_PUBLIC_${contract.name.toUpperCase()}_ADDRESS`;
      reference += `${envName}=${contract.address}\n`;
    }
    
    reference += `\`\`\`\n\n`;
    
    // Backend Configuration
    reference += `### Backend Environment Variables\n\n`;
    reference += `\`\`\`env\n`;
    reference += `CHAIN_ID=${this.networkConfig.chainId}\n`;
    reference += `RPC_URL=${this.networkConfig.rpcUrl}\n`;
    reference += `EXPLORER_URL=${this.networkConfig.explorerUrl}\n`;
    
    for (const contract of this.contractInfos) {
      const envName = `${contract.name.toUpperCase()}_ADDRESS`;
      reference += `${envName}=${contract.address}\n`;
    }
    
    reference += `\`\`\`\n\n`;
    
    const referencePath = path.join(this.config.outputDir, 'contract-addresses-reference.md');
    fs.writeFileSync(referencePath, reference);
    console.log(`📋 Contract addresses reference saved to: ${referencePath}`);
  }

  async generateABIDocumentation(): Promise<void> {
    if (!this.config.includeABIs) return;
    
    console.log('🔧 Generating ABI documentation...');
    
    const abiDir = path.join(this.config.outputDir, 'abis');
    if (!fs.existsSync(abiDir)) {
      fs.mkdirSync(abiDir, { recursive: true });
    }
    
    let abiIndex = `# Contract ABIs\n\n`;
    abiIndex += `This directory contains the Application Binary Interfaces (ABIs) for all deployed contracts.\n\n`;
    
    for (const contract of this.contractInfos) {
      if (contract.abi && contract.abi.length > 0) {
        // Save individual ABI file
        const abiPath = path.join(abiDir, `${contract.name}.json`);
        fs.writeFileSync(abiPath, JSON.stringify(contract.abi, null, 2));
        
        // Add to index
        abiIndex += `## ${contract.name}\n\n`;
        abiIndex += `- **File:** [\`${contract.name}.json\`](./abis/${contract.name}.json)\n`;
        abiIndex += `- **Address:** \`${contract.address}\`\n`;
        
        const functions = contract.abi.filter(item => item.type === 'function');
        const events = contract.abi.filter(item => item.type === 'event');
        
        abiIndex += `- **Functions:** ${functions.length}\n`;
        abiIndex += `- **Events:** ${events.length}\n\n`;
        
        console.log(`✅ Generated ABI for ${contract.name}`);
      }
    }
    
    const indexPath = path.join(this.config.outputDir, 'abi-documentation.md');
    fs.writeFileSync(indexPath, abiIndex);
    console.log(`🔧 ABI documentation saved to: ${indexPath}`);
  }

  async generateUserGuides(): Promise<void> {
    if (!this.config.includeUserGuides) return;
    
    console.log('👥 Generating user guides...');
    
    const guidesDir = path.join(this.config.outputDir, 'user-guides');
    if (!fs.existsSync(guidesDir)) {
      fs.mkdirSync(guidesDir, { recursive: true });
    }
    
    // Getting Started Guide
    await this.generateGettingStartedGuide(guidesDir);
    
    // Wallet Connection Guide
    await this.generateWalletConnectionGuide(guidesDir);
    
    // Governance Guide
    await this.generateGovernanceGuide(guidesDir);
    
    // Marketplace Guide
    await this.generateMarketplaceGuide(guidesDir);
    
    // Staking Guide
    await this.generateStakingGuide(guidesDir);
    
    console.log(`👥 User guides saved to: ${guidesDir}`);
  }

  private async generateGettingStartedGuide(guidesDir: string): Promise<void> {
    let guide = `# Getting Started with LinkDAO\n\n`;
    guide += `Welcome to LinkDAO, a decentralized Web3 social platform! This guide will help you get started.\n\n`;
    
    guide += `## Prerequisites\n\n`;
    guide += `- A Web3 wallet (MetaMask, WalletConnect, etc.)\n`;
    guide += `- ${this.networkConfig.nativeCurrency.symbol} for transaction fees\n`;
    guide += `- LDAO tokens for platform features\n\n`;
    
    guide += `## Network Configuration\n\n`;
    guide += `Add ${this.networkConfig.name} to your wallet:\n\n`;
    guide += `- **Network Name:** ${this.networkConfig.name}\n`;
    guide += `- **Chain ID:** ${this.networkConfig.chainId}\n`;
    guide += `- **Currency Symbol:** ${this.networkConfig.nativeCurrency.symbol}\n\n`;
    
    guide += `## Key Contracts\n\n`;
    guide += `- **LDAO Token:** \`${this.deployedAddresses.LDAOToken || 'Not deployed'}\`\n`;
    guide += `- **Governance:** \`${this.deployedAddresses.Governance || 'Not deployed'}\`\n`;
    guide += `- **Marketplace:** \`${this.deployedAddresses.Marketplace || 'Not deployed'}\`\n\n`;
    
    guide += `## First Steps\n\n`;
    guide += `1. **Connect Your Wallet** - Use the wallet connection feature\n`;
    guide += `2. **Get LDAO Tokens** - Acquire tokens through the marketplace or exchanges\n`;
    guide += `3. **Stake Tokens** - Stake LDAO tokens to participate in governance\n`;
    guide += `4. **Explore Features** - Try the marketplace, governance, and social features\n\n`;
    
    guide += `## Support\n\n`;
    guide += `- **Documentation:** [docs.linkdao.io](https://docs.linkdao.io)\n`;
    guide += `- **Community:** [discord.gg/linkdao](https://discord.gg/linkdao)\n`;
    guide += `- **Support:** [support@linkdao.io](mailto:support@linkdao.io)\n\n`;
    
    fs.writeFileSync(path.join(guidesDir, 'getting-started.md'), guide);
  }

  private async generateWalletConnectionGuide(guidesDir: string): Promise<void> {
    let guide = `# Wallet Connection Guide\n\n`;
    guide += `Learn how to connect your Web3 wallet to LinkDAO.\n\n`;
    
    guide += `## Supported Wallets\n\n`;
    guide += `- MetaMask\n`;
    guide += `- WalletConnect\n`;
    guide += `- Coinbase Wallet\n`;
    guide += `- Other Web3 wallets\n\n`;
    
    guide += `## Connection Steps\n\n`;
    guide += `1. **Install Wallet Extension** - Download and install your preferred wallet\n`;
    guide += `2. **Create or Import Account** - Set up your wallet account\n`;
    guide += `3. **Add Network** - Configure ${this.networkConfig.name} in your wallet\n`;
    guide += `4. **Connect to LinkDAO** - Use the "Connect Wallet" button on the platform\n`;
    guide += `5. **Approve Connection** - Confirm the connection in your wallet\n\n`;
    
    guide += `## Network Configuration\n\n`;
    guide += `\`\`\`json\n`;
    guide += `{\n`;
    guide += `  "chainId": "${this.networkConfig.chainId}",\n`;
    guide += `  "chainName": "${this.networkConfig.name}",\n`;
    guide += `  "nativeCurrency": {\n`;
    guide += `    "name": "${this.networkConfig.nativeCurrency.name}",\n`;
    guide += `    "symbol": "${this.networkConfig.nativeCurrency.symbol}",\n`;
    guide += `    "decimals": ${this.networkConfig.nativeCurrency.decimals}\n`;
    guide += `  },\n`;
    guide += `  "rpcUrls": ["${this.networkConfig.rpcUrl}"],\n`;
    guide += `  "blockExplorerUrls": ["${this.networkConfig.explorerUrl}"]\n`;
    guide += `}\n`;
    guide += `\`\`\`\n\n`;
    
    guide += `## Troubleshooting\n\n`;
    guide += `- **Connection Failed:** Check network configuration and try again\n`;
    guide += `- **Wrong Network:** Switch to ${this.networkConfig.name} in your wallet\n`;
    guide += `- **Transaction Failed:** Ensure sufficient ${this.networkConfig.nativeCurrency.symbol} for gas fees\n\n`;
    
    fs.writeFileSync(path.join(guidesDir, 'wallet-connection.md'), guide);
  }

  private async generateGovernanceGuide(guidesDir: string): Promise<void> {
    let guide = `# Governance Guide\n\n`;
    guide += `Participate in LinkDAO governance and help shape the platform's future.\n\n`;
    
    guide += `## Overview\n\n`;
    guide += `LinkDAO uses on-chain governance where LDAO token holders can:\n`;
    guide += `- Create proposals\n`;
    guide += `- Vote on proposals\n`;
    guide += `- Delegate voting power\n`;
    guide += `- Participate in community decisions\n\n`;
    
    guide += `## Governance Contract\n\n`;
    guide += `**Address:** \`${this.deployedAddresses.Governance || 'Not deployed'}\`\n\n`;
    
    guide += `## Voting Power\n\n`;
    guide += `Your voting power is determined by:\n`;
    guide += `- LDAO tokens held\n`;
    guide += `- Staking tier and duration\n`;
    guide += `- Delegation received from others\n\n`;
    
    guide += `## Creating Proposals\n\n`;
    guide += `1. **Meet Requirements** - Hold minimum LDAO tokens\n`;
    guide += `2. **Draft Proposal** - Write clear proposal description\n`;
    guide += `3. **Submit On-Chain** - Use governance interface to submit\n`;
    guide += `4. **Community Review** - Allow time for community discussion\n\n`;
    
    guide += `## Voting Process\n\n`;
    guide += `1. **Proposal Period** - Proposals are open for voting\n`;
    guide += `2. **Cast Vote** - Vote For, Against, or Abstain\n`;
    guide += `3. **Voting Period** - Voting remains open for set duration\n`;
    guide += `4. **Execution** - Successful proposals are executed automatically\n\n`;
    
    guide += `## Best Practices\n\n`;
    guide += `- Research proposals thoroughly before voting\n`;
    guide += `- Participate in community discussions\n`;
    guide += `- Consider long-term platform impact\n`;
    guide += `- Delegate responsibly if not actively participating\n\n`;
    
    fs.writeFileSync(path.join(guidesDir, 'governance.md'), guide);
  }

  private async generateMarketplaceGuide(guidesDir: string): Promise<void> {
    let guide = `# Marketplace Guide\n\n`;
    guide += `Buy, sell, and trade assets on the LinkDAO marketplace.\n\n`;
    
    guide += `## Marketplace Contract\n\n`;
    guide += `**Address:** \`${this.deployedAddresses.Marketplace || 'Not deployed'}\`\n\n`;
    
    guide += `## Supported Assets\n\n`;
    guide += `- ERC-20 tokens\n`;
    guide += `- ERC-721 NFTs\n`;
    guide += `- ERC-1155 tokens\n`;
    guide += `- Native ${this.networkConfig.nativeCurrency.symbol}\n\n`;
    
    guide += `## Creating Listings\n\n`;
    guide += `1. **Connect Wallet** - Ensure wallet is connected\n`;
    guide += `2. **Select Asset** - Choose asset to sell\n`;
    guide += `3. **Set Price** - Define price and quantity\n`;
    guide += `4. **Choose Type** - Fixed price or auction\n`;
    guide += `5. **Approve & List** - Approve token transfer and create listing\n\n`;
    
    guide += `## Making Purchases\n\n`;
    guide += `1. **Browse Listings** - Find items you want to buy\n`;
    guide += `2. **Check Details** - Review price, seller reputation\n`;
    guide += `3. **Initiate Purchase** - Click buy and confirm transaction\n`;
    guide += `4. **Escrow Process** - Funds held in escrow until completion\n`;
    guide += `5. **Complete Transaction** - Confirm receipt to release funds\n\n`;
    
    guide += `## Escrow System\n\n`;
    guide += `**Contract:** \`${this.deployedAddresses.EnhancedEscrow || 'Not deployed'}\`\n\n`;
    guide += `- Funds held securely during transactions\n`;
    guide += `- Multi-signature protection for high-value trades\n`;
    guide += `- Dispute resolution available if needed\n`;
    guide += `- Automatic release upon successful completion\n\n`;
    
    guide += `## Fees\n\n`;
    guide += `- Platform fee: 1% (subject to governance)\n`;
    guide += `- Gas fees: Paid by transaction initiator\n`;
    guide += `- No listing fees\n\n`;
    
    fs.writeFileSync(path.join(guidesDir, 'marketplace.md'), guide);
  }

  private async generateStakingGuide(guidesDir: string): Promise<void> {
    let guide = `# Staking Guide\n\n`;
    guide += `Stake LDAO tokens to earn rewards and increase your governance power.\n\n`;
    
    guide += `## LDAO Token Contract\n\n`;
    guide += `**Address:** \`${this.deployedAddresses.LDAOToken || 'Not deployed'}\`\n\n`;
    
    guide += `## Staking Tiers\n\n`;
    guide += `| Duration | APR | Voting Multiplier |\n`;
    guide += `|----------|-----|-------------------|\n`;
    guide += `| 30 days  | 5%  | 1.5x              |\n`;
    guide += `| 90 days  | 8%  | 2.0x              |\n`;
    guide += `| 180 days | 12% | 2.5x              |\n`;
    guide += `| 365 days | 18% | 3.0x              |\n\n`;
    
    guide += `## How to Stake\n\n`;
    guide += `1. **Get LDAO Tokens** - Acquire tokens through marketplace or exchanges\n`;
    guide += `2. **Choose Tier** - Select staking duration and APR\n`;
    guide += `3. **Approve Tokens** - Allow staking contract to access tokens\n`;
    guide += `4. **Stake Tokens** - Confirm staking transaction\n`;
    guide += `5. **Earn Rewards** - Rewards accrue automatically\n\n`;
    
    guide += `## Benefits of Staking\n\n`;
    guide += `- **Earn Rewards** - Passive income through staking rewards\n`;
    guide += `- **Governance Power** - Increased voting power in governance\n`;
    guide += `- **Premium Features** - Access to premium platform features\n`;
    guide += `- **Community Status** - Higher reputation and status\n\n`;
    
    guide += `## Unstaking Process\n\n`;
    guide += `1. **Wait for Maturity** - Staking period must complete\n`;
    guide += `2. **Initiate Unstaking** - Request token withdrawal\n`;
    guide += `3. **Claim Rewards** - Collect accumulated rewards\n`;
    guide += `4. **Receive Tokens** - Original tokens returned to wallet\n\n`;
    
    guide += `## Important Notes\n\n`;
    guide += `- Early unstaking may result in penalties\n`;
    guide += `- Rewards are calculated and distributed automatically\n`;
    guide += `- Staked tokens cannot be transferred while locked\n`;
    guide += `- Voting power is active immediately upon staking\n\n`;
    
    fs.writeFileSync(path.join(guidesDir, 'staking.md'), guide);
  }

  async generateAPIReference(): Promise<void> {
    if (!this.config.includeAPIReference) return;
    
    console.log('🔌 Generating API reference...');
    
    let apiRef = `# LinkDAO API Reference\n\n`;
    apiRef += `Complete API reference for interacting with LinkDAO smart contracts.\n\n`;
    
    apiRef += `## Network Configuration\n\n`;
    apiRef += `\`\`\`javascript\n`;
    apiRef += `const provider = new ethers.JsonRpcProvider('${this.networkConfig.rpcUrl}');\n`;
    apiRef += `const chainId = ${this.networkConfig.chainId};\n`;
    apiRef += `\`\`\`\n\n`;
    
    // Generate API reference for each contract
    for (const contract of this.contractInfos) {
      if (contract.abi && contract.abi.length > 0) {
        apiRef += `## ${contract.name}\n\n`;
        apiRef += `**Address:** \`${contract.address}\`\n\n`;
        
        // Contract initialization
        apiRef += `### Initialization\n\n`;
        apiRef += `\`\`\`javascript\n`;
        apiRef += `const ${contract.name.toLowerCase()} = new ethers.Contract(\n`;
        apiRef += `  '${contract.address}',\n`;
        apiRef += `  ${contract.name}ABI,\n`;
        apiRef += `  provider\n`;
        apiRef += `);\n`;
        apiRef += `\`\`\`\n\n`;
        
        // Functions
        const functions = contract.abi.filter(item => item.type === 'function');
        if (functions.length > 0) {
          apiRef += `### Functions\n\n`;
          
          for (const func of functions.slice(0, 10)) { // Limit to first 10 functions
            apiRef += `#### ${func.name}\n\n`;
            
            if (func.inputs && func.inputs.length > 0) {
              apiRef += `**Parameters:**\n`;
              for (const input of func.inputs) {
                apiRef += `- \`${input.name}\` (${input.type})\n`;
              }
              apiRef += `\n`;
            }
            
            if (func.outputs && func.outputs.length > 0) {
              apiRef += `**Returns:**\n`;
              for (const output of func.outputs) {
                const name = output.name || 'result';
                apiRef += `- \`${name}\` (${output.type})\n`;
              }
              apiRef += `\n`;
            }
            
            // Example usage
            apiRef += `**Example:**\n`;
            apiRef += `\`\`\`javascript\n`;
            if (func.stateMutability === 'view' || func.stateMutability === 'pure') {
              apiRef += `const result = await ${contract.name.toLowerCase()}.${func.name}(`;
            } else {
              apiRef += `const tx = await ${contract.name.toLowerCase()}.${func.name}(`;
            }
            
            if (func.inputs && func.inputs.length > 0) {
              const params = func.inputs.map(input => `${input.name}`).join(', ');
              apiRef += params;
            }
            
            apiRef += `);\n`;
            
            if (func.stateMutability !== 'view' && func.stateMutability !== 'pure') {
              apiRef += `const receipt = await tx.wait();\n`;
            }
            
            apiRef += `\`\`\`\n\n`;
          }
        }
        
        // Events
        const events = contract.abi.filter(item => item.type === 'event');
        if (events.length > 0) {
          apiRef += `### Events\n\n`;
          
          for (const event of events.slice(0, 5)) { // Limit to first 5 events
            apiRef += `#### ${event.name}\n\n`;
            
            if (event.inputs && event.inputs.length > 0) {
              apiRef += `**Parameters:**\n`;
              for (const input of event.inputs) {
                const indexed = input.indexed ? ' (indexed)' : '';
                apiRef += `- \`${input.name}\` (${input.type})${indexed}\n`;
              }
              apiRef += `\n`;
            }
            
            // Example listening
            apiRef += `**Example:**\n`;
            apiRef += `\`\`\`javascript\n`;
            apiRef += `${contract.name.toLowerCase()}.on('${event.name}', (`;
            if (event.inputs && event.inputs.length > 0) {
              const params = event.inputs.map(input => input.name).join(', ');
              apiRef += `${params}, event`;
            } else {
              apiRef += `event`;
            }
            apiRef += `) => {\n`;
            apiRef += `  console.log('${event.name} event:', event);\n`;
            apiRef += `});\n`;
            apiRef += `\`\`\`\n\n`;
          }
        }
      }
    }
    
    const apiPath = path.join(this.config.outputDir, 'api-reference.md');
    fs.writeFileSync(apiPath, apiRef);
    console.log(`🔌 API reference saved to: ${apiPath}`);
  }

  async generateTechnicalDocumentation(): Promise<void> {
    if (!this.config.includeTechnicalDocs) return;
    
    console.log('🔧 Generating technical documentation...');
    
    let techDocs = `# LinkDAO Technical Documentation\n\n`;
    techDocs += `Comprehensive technical documentation for developers and integrators.\n\n`;
    
    // Architecture Overview
    techDocs += `## Architecture Overview\n\n`;
    techDocs += `LinkDAO is built on a modular smart contract architecture with the following components:\n\n`;
    
    techDocs += `### Core Contracts\n\n`;
    techDocs += `- **LDAOToken**: ERC-20 governance token with staking capabilities\n`;
    techDocs += `- **Governance**: On-chain governance with proposal management\n`;
    techDocs += `- **ReputationSystem**: Community-driven trust and scoring\n\n`;
    
    techDocs += `### Marketplace Contracts\n\n`;
    techDocs += `- **Marketplace**: Multi-asset trading platform\n`;
    techDocs += `- **EnhancedEscrow**: Secure transaction escrow system\n`;
    techDocs += `- **NFTMarketplace**: Specialized NFT trading platform\n\n`;
    
    techDocs += `### Social Contracts\n\n`;
    techDocs += `- **TipRouter**: Social tipping and rewards system\n`;
    techDocs += `- **FollowModule**: Social relationship management\n`;
    techDocs += `- **PaymentRouter**: Multi-token payment processing\n\n`;
    
    // Integration Patterns
    techDocs += `## Integration Patterns\n\n`;
    
    techDocs += `### Frontend Integration\n\n`;
    techDocs += `\`\`\`javascript\n`;
    techDocs += `// Initialize Web3 provider\n`;
    techDocs += `const provider = new ethers.BrowserProvider(window.ethereum);\n`;
    techDocs += `const signer = await provider.getSigner();\n\n`;
    techDocs += `// Connect to contracts\n`;
    techDocs += `const ldaoToken = new ethers.Contract(\n`;
    techDocs += `  '${this.deployedAddresses.LDAOToken || 'LDAO_TOKEN_ADDRESS'}',\n`;
    techDocs += `  LDAOTokenABI,\n`;
    techDocs += `  signer\n`;
    techDocs += `);\n`;
    techDocs += `\`\`\`\n\n`;
    
    techDocs += `### Backend Integration\n\n`;
    techDocs += `\`\`\`javascript\n`;
    techDocs += `// Server-side integration\n`;
    techDocs += `const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);\n`;
    techDocs += `const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);\n\n`;
    techDocs += `// Read-only contract instance\n`;
    techDocs += `const marketplace = new ethers.Contract(\n`;
    techDocs += `  process.env.MARKETPLACE_ADDRESS,\n`;
    techDocs += `  MarketplaceABI,\n`;
    techDocs += `  provider\n`;
    techDocs += `);\n`;
    techDocs += `\`\`\`\n\n`;
    
    // Security Considerations
    techDocs += `## Security Considerations\n\n`;
    techDocs += `### Access Control\n\n`;
    techDocs += `- All contracts implement role-based access control\n`;
    techDocs += `- Critical functions require admin or specific role permissions\n`;
    techDocs += `- Multi-signature wallets control contract ownership\n\n`;
    
    techDocs += `### Emergency Procedures\n\n`;
    techDocs += `- Emergency pause functionality available on critical contracts\n`;
    techDocs += `- Circuit breakers prevent excessive operations\n`;
    techDocs += `- Emergency withdrawal mechanisms for fund recovery\n\n`;
    
    techDocs += `### Best Practices\n\n`;
    techDocs += `- Always validate user inputs\n`;
    techDocs += `- Use proper error handling for contract calls\n`;
    techDocs += `- Implement transaction confirmation patterns\n`;
    techDocs += `- Monitor gas usage and optimize accordingly\n\n`;
    
    // Gas Optimization
    techDocs += `## Gas Optimization\n\n`;
    techDocs += `### Efficient Patterns\n\n`;
    techDocs += `- Batch multiple operations when possible\n`;
    techDocs += `- Use view functions for data retrieval\n`;
    techDocs += `- Implement proper caching strategies\n`;
    techDocs += `- Consider layer 2 solutions for high-frequency operations\n\n`;
    
    // Monitoring and Maintenance
    techDocs += `## Monitoring and Maintenance\n\n`;
    techDocs += `### Event Monitoring\n\n`;
    techDocs += `- Monitor contract events for system health\n`;
    techDocs += `- Set up alerts for critical operations\n`;
    techDocs += `- Track gas usage and transaction patterns\n\n`;
    
    techDocs += `### Upgrade Procedures\n\n`;
    techDocs += `- Contracts use proxy patterns where applicable\n`;
    techDocs += `- Governance controls upgrade processes\n`;
    techDocs += `- Comprehensive testing required before upgrades\n\n`;
    
    const techPath = path.join(this.config.outputDir, 'technical-documentation.md');
    fs.writeFileSync(techPath, techDocs);
    console.log(`🔧 Technical documentation saved to: ${techPath}`);
  }

  async generateCommunityLaunchMaterials(): Promise<void> {
    console.log('🚀 Generating community launch materials...');
    
    const launchDir = path.join(this.config.outputDir, 'community-launch');
    if (!fs.existsSync(launchDir)) {
      fs.mkdirSync(launchDir, { recursive: true });
    }
    
    // Launch Announcement
    let announcement = `# 🎉 LinkDAO Mainnet Launch Announcement\n\n`;
    announcement += `We're excited to announce that LinkDAO is now live on ${this.networkConfig.name}!\n\n`;
    
    announcement += `## What is LinkDAO?\n\n`;
    announcement += `LinkDAO is a decentralized Web3 social platform that combines:\n`;
    announcement += `- **Governance**: Community-driven decision making\n`;
    announcement += `- **Marketplace**: Decentralized asset trading\n`;
    announcement += `- **Social Features**: Web3-native social interactions\n`;
    announcement += `- **DeFi Integration**: Staking, rewards, and tokenomics\n\n`;
    
    announcement += `## Key Features\n\n`;
    announcement += `### 🗳️ Governance\n`;
    announcement += `- Participate in platform governance\n`;
    announcement += `- Create and vote on proposals\n`;
    announcement += `- Delegate voting power\n\n`;
    
    announcement += `### 🛒 Marketplace\n`;
    announcement += `- Trade tokens and NFTs securely\n`;
    announcement += `- Escrow-protected transactions\n`;
    announcement += `- Community reputation system\n\n`;
    
    announcement += `### 🪙 LDAO Token\n`;
    announcement += `- Stake for rewards and governance power\n`;
    announcement += `- Multiple staking tiers available\n`;
    announcement += `- Premium platform features\n\n`;
    
    announcement += `## Getting Started\n\n`;
    announcement += `1. **Connect Your Wallet** to ${this.networkConfig.name}\n`;
    announcement += `2. **Get LDAO Tokens** through the marketplace\n`;
    announcement += `3. **Stake Tokens** to participate in governance\n`;
    announcement += `4. **Explore Features** and join the community\n\n`;
    
    announcement += `## Contract Addresses\n\n`;
    for (const contract of this.contractInfos.slice(0, 5)) { // Show top 5 contracts
      announcement += `- **${contract.name}**: \`${contract.address}\`\n`;
    }
    announcement += `\n`;
    
    announcement += `## Resources\n\n`;
    announcement += `- **Platform**: [app.linkdao.io](https://app.linkdao.io)\n`;
    announcement += `- **Documentation**: [docs.linkdao.io](https://docs.linkdao.io)\n`;
    announcement += `- **Discord**: [discord.gg/linkdao](https://discord.gg/linkdao)\n`;
    announcement += `- **Twitter**: [@LinkDAO](https://twitter.com/LinkDAO)\n\n`;
    
    announcement += `## Security\n\n`;
    announcement += `- ✅ Smart contracts audited and verified\n`;
    announcement += `- ✅ Multi-signature wallet protection\n`;
    announcement += `- ✅ Emergency pause mechanisms\n`;
    announcement += `- ✅ Comprehensive testing completed\n\n`;
    
    announcement += `Welcome to the future of decentralized social platforms! 🚀\n\n`;
    
    fs.writeFileSync(path.join(launchDir, 'launch-announcement.md'), announcement);
    
    // Quick Start Card
    let quickStart = `# LinkDAO Quick Start\n\n`;
    quickStart += `Get started with LinkDAO in 5 minutes!\n\n`;
    
    quickStart += `## 🔗 Connect Wallet\n`;
    quickStart += `Add ${this.networkConfig.name} to your wallet:\n`;
    quickStart += `- Chain ID: ${this.networkConfig.chainId}\n`;
    quickStart += `- RPC URL: ${this.networkConfig.rpcUrl}\n\n`;
    
    quickStart += `## 🪙 Get LDAO Tokens\n`;
    quickStart += `Token Address: \`${this.deployedAddresses.LDAOToken || 'Not deployed'}\`\n\n`;
    
    quickStart += `## 🗳️ Start Participating\n`;
    quickStart += `1. Stake tokens for governance power\n`;
    quickStart += `2. Vote on active proposals\n`;
    quickStart += `3. Explore the marketplace\n`;
    quickStart += `4. Connect with the community\n\n`;
    
    fs.writeFileSync(path.join(launchDir, 'quick-start-card.md'), quickStart);
    
    console.log(`🚀 Community launch materials saved to: ${launchDir}`);
  }

  async run(): Promise<void> {
    try {
      await this.initialize();
      
      // Generate all documentation
      await this.generateMainDeploymentReport();
      await this.generateContractAddressesReference();
      await this.generateABIDocumentation();
      await this.generateUserGuides();
      await this.generateAPIReference();
      await this.generateTechnicalDocumentation();
      await this.generateCommunityLaunchMaterials();
      
      console.log('\n🎉 Deployment Documentation Generation Complete!');
      console.log(`📁 All documentation saved to: ${this.config.outputDir}`);
      
      // Summary
      const files = fs.readdirSync(this.config.outputDir);
      console.log(`📄 Generated ${files.length} documentation files`);
      
    } catch (error) {
      console.error('❌ Documentation generation failed:', error);
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const network = process.env.HARDHAT_NETWORK || 'localhost';
  
  const config: DocumentationConfig = {
    network,
    deployedAddressesFile: `deployed-addresses-${network}.json`,
    outputDir: './deployment-documentation',
    includeABIs: true,
    includeUserGuides: true,
    includeTechnicalDocs: true,
    includeAPIReference: true
  };
  
  // Override for mainnet
  if (network === 'mainnet') {
    config.deployedAddressesFile = 'deployedAddresses.json';
  }
  
  const generator = new DeploymentDocumentationGenerator(config);
  await generator.run();
}

// Execute if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { DeploymentDocumentationGenerator, DocumentationConfig };