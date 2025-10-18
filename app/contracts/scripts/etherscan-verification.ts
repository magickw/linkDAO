import { ethers } from 'ethers';
import { run } from 'hardhat';
import fs from 'fs';
import path from 'path';

export interface ContractVerificationConfig {
  contractName: string;
  address: string;
  constructorArgs: any[];
  libraries?: { [key: string]: string };
}

export interface VerificationResult {
  contractName: string;
  address: string;
  verified: boolean;
  etherscanUrl: string;
  error?: string;
  verificationId?: string;
}

export class EtherscanVerifier {
  private network: string;
  private apiKey: string;
  private baseUrl: string;

  constructor(network: string = 'mainnet', apiKey?: string) {
    this.network = network;
    this.apiKey = apiKey || process.env.ETHERSCAN_API_KEY || '';
    
    // Set base URL based on network
    switch (network) {
      case 'mainnet':
        this.baseUrl = 'https://etherscan.io';
        break;
      case 'sepolia':
        this.baseUrl = 'https://sepolia.etherscan.io';
        break;
      case 'goerli':
        this.baseUrl = 'https://goerli.etherscan.io';
        break;
      default:
        this.baseUrl = 'https://etherscan.io';
    }

    if (!this.apiKey) {
      console.warn('⚠️ No Etherscan API key provided. Verification may fail.');
    }
  }

  async verifyContract(config: ContractVerificationConfig): Promise<VerificationResult> {
    const result: VerificationResult = {
      contractName: config.contractName,
      address: config.address,
      verified: false,
      etherscanUrl: `${this.baseUrl}/address/${config.address}#code`
    };

    try {
      console.log(`🔍 Verifying ${config.contractName} at ${config.address}...`);

      // Check if already verified
      const isAlreadyVerified = await this.isContractVerified(config.address);
      if (isAlreadyVerified) {
        console.log(`✅ ${config.contractName} is already verified`);
        result.verified = true;
        return result;
      }

      // Attempt verification using Hardhat
      await run('verify:verify', {
        address: config.address,
        constructorArguments: config.constructorArgs,
        libraries: config.libraries || {}
      });

      result.verified = true;
      console.log(`✅ Successfully verified ${config.contractName}`);

    } catch (error: any) {
      console.error(`❌ Failed to verify ${config.contractName}:`, error.message);
      result.error = error.message;
      
      // Check if it's already verified (common error)
      if (error.message.includes('already verified') || error.message.includes('Already Verified')) {
        result.verified = true;
        console.log(`✅ ${config.contractName} was already verified`);
      }
    }

    return result;
  }

  async verifyAllContracts(contractsConfig: ContractVerificationConfig[]): Promise<VerificationResult[]> {
    console.log(`🚀 Starting verification of ${contractsConfig.length} contracts on ${this.network}...\n`);

    const results: VerificationResult[] = [];
    
    for (const config of contractsConfig) {
      const result = await this.verifyContract(config);
      results.push(result);
      
      // Add delay between verifications to avoid rate limiting
      await this.delay(2000);
    }

    return results;
  }

  async isContractVerified(address: string): Promise<boolean> {
    try {
      // Use Etherscan API to check verification status
      const response = await fetch(
        `${this.baseUrl.replace('https://', 'https://api.')}/api?module=contract&action=getsourcecode&address=${address}&apikey=${this.apiKey}`
      );
      
      const data = await response.json();
      
      if (data.status === '1' && data.result && data.result[0]) {
        return data.result[0].SourceCode !== '';
      }
      
      return false;
    } catch (error) {
      console.warn(`⚠️ Could not check verification status for ${address}:`, error);
      return false;
    }
  }

  async generateContractAddressDocumentation(results: VerificationResult[]): Promise<string> {
    let doc = '# Contract Addresses and Verification Status\n\n';
    doc += `**Network**: ${this.network}\n`;
    doc += `**Generated**: ${new Date().toISOString()}\n\n`;

    doc += '## Verified Contracts\n\n';
    doc += '| Contract | Address | Status | Etherscan |\n';
    doc += '|----------|---------|--------|----------|\n';

    for (const result of results) {
      const status = result.verified ? '✅ Verified' : '❌ Failed';
      const etherscanLink = `[View](${result.etherscanUrl})`;
      
      doc += `| ${result.contractName} | \`${result.address}\` | ${status} | ${etherscanLink} |\n`;
    }

    doc += '\n## Contract ABIs\n\n';
    doc += 'The following ABIs are publicly accessible on Etherscan:\n\n';

    for (const result of results.filter(r => r.verified)) {
      doc += `### ${result.contractName}\n\n`;
      doc += `**Address**: \`${result.address}\`\n`;
      doc += `**ABI**: Available at ${result.etherscanUrl}\n\n`;
    }

    // Add integration examples
    doc += '## Integration Examples\n\n';
    doc += '### Web3.js\n\n';
    doc += '```javascript\n';
    doc += 'const Web3 = require(\'web3\');\n';
    doc += 'const web3 = new Web3(\'https://mainnet.infura.io/v3/YOUR-PROJECT-ID\');\n\n';
    
    for (const result of results.filter(r => r.verified).slice(0, 3)) {
      doc += `// ${result.contractName}\n`;
      doc += `const ${result.contractName.toLowerCase()}Contract = new web3.eth.Contract(\n`;
      doc += `  ${result.contractName.toUpperCase()}_ABI, // Get from Etherscan\n`;
      doc += `  '${result.address}'\n`;
      doc += ');\n\n';
    }
    doc += '```\n\n';

    doc += '### Ethers.js\n\n';
    doc += '```javascript\n';
    doc += 'const { ethers } = require(\'ethers\');\n';
    doc += 'const provider = new ethers.providers.JsonRpcProvider(\'https://mainnet.infura.io/v3/YOUR-PROJECT-ID\');\n\n';
    
    for (const result of results.filter(r => r.verified).slice(0, 3)) {
      doc += `// ${result.contractName}\n`;
      doc += `const ${result.contractName.toLowerCase()}Contract = new ethers.Contract(\n`;
      doc += `  '${result.address}',\n`;
      doc += `  ${result.contractName.toUpperCase()}_ABI, // Get from Etherscan\n`;
      doc += `  provider\n`;
      doc += ');\n\n';
    }
    doc += '```\n\n';

    return doc;
  }

  generateVerificationReport(results: VerificationResult[]): string {
    const totalContracts = results.length;
    const verifiedContracts = results.filter(r => r.verified).length;
    const failedContracts = results.filter(r => !r.verified);

    let report = '# Contract Verification Report\n\n';
    report += `**Network**: ${this.network}\n`;
    report += `**Total Contracts**: ${totalContracts}\n`;
    report += `**Successfully Verified**: ${verifiedContracts}\n`;
    report += `**Failed Verifications**: ${failedContracts.length}\n`;
    report += `**Success Rate**: ${((verifiedContracts / totalContracts) * 100).toFixed(1)}%\n\n`;

    if (verifiedContracts === totalContracts) {
      report += '✅ **All contracts successfully verified!**\n\n';
    } else {
      report += '⚠️ **Some contracts failed verification**\n\n';
    }

    // Successful verifications
    if (verifiedContracts > 0) {
      report += '## ✅ Successfully Verified Contracts\n\n';
      for (const result of results.filter(r => r.verified)) {
        report += `- **${result.contractName}**: [${result.address}](${result.etherscanUrl})\n`;
      }
      report += '\n';
    }

    // Failed verifications
    if (failedContracts.length > 0) {
      report += '## ❌ Failed Verifications\n\n';
      for (const result of failedContracts) {
        report += `- **${result.contractName}** (${result.address}): ${result.error || 'Unknown error'}\n`;
      }
      report += '\n';

      report += '### Troubleshooting Failed Verifications\n\n';
      report += '1. **Check Constructor Arguments**: Ensure constructor arguments match deployment\n';
      report += '2. **Verify Compiler Settings**: Check Solidity version and optimization settings\n';
      report += '3. **Library Dependencies**: Ensure all library addresses are correct\n';
      report += '4. **Network Issues**: Retry verification after some time\n';
      report += '5. **Manual Verification**: Use Etherscan web interface as fallback\n\n';
    }

    return report;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Load contract configurations from deployment data
export function loadContractConfigurations(deploymentDataPath: string): ContractVerificationConfig[] {
  try {
    const deploymentData = JSON.parse(fs.readFileSync(deploymentDataPath, 'utf8'));
    const configs: ContractVerificationConfig[] = [];

    // Core contracts with their constructor arguments
    const contractConfigs = {
      'LDAOToken': {
        constructorArgs: [
          'LinkDAO Token',
          'LDAO',
          ethers.parseEther('1000000000'), // 1B tokens
          deploymentData.treasury || deploymentData.LDAOToken // treasury address
        ]
      },
      'Governance': {
        constructorArgs: [
          deploymentData.LDAOToken,
          300, // voting delay (5 minutes)
          1800, // voting period (30 minutes)
          ethers.parseEther('1000') // proposal threshold
        ]
      },
      'ReputationSystem': {
        constructorArgs: [
          deploymentData.LDAOToken
        ]
      },
      'Marketplace': {
        constructorArgs: [
          deploymentData.LDAOToken,
          100 // 1% platform fee
        ]
      },
      'EnhancedEscrow': {
        constructorArgs: [
          deploymentData.LDAOToken,
          deploymentData.Marketplace
        ]
      },
      'DisputeResolution': {
        constructorArgs: [
          deploymentData.LDAOToken,
          deploymentData.EnhancedEscrow
        ]
      },
      'NFTMarketplace': {
        constructorArgs: [
          deploymentData.LDAOToken,
          250 // 2.5% royalty fee
        ]
      },
      'PaymentRouter': {
        constructorArgs: [
          deploymentData.LDAOToken
        ]
      },
      'EnhancedRewardPool': {
        constructorArgs: [
          deploymentData.LDAOToken,
          deploymentData.ReputationSystem
        ]
      }
    };

    // Create configurations for deployed contracts
    for (const [contractName, address] of Object.entries(deploymentData)) {
      if (typeof address === 'string' && address.startsWith('0x') && contractConfigs[contractName]) {
        configs.push({
          contractName,
          address,
          constructorArgs: contractConfigs[contractName].constructorArgs
        });
      }
    }

    return configs;
  } catch (error) {
    console.error('Error loading contract configurations:', error);
    return [];
  }
}

// Main execution function
export async function executeContractVerification() {
  const network = process.env.HARDHAT_NETWORK || 'mainnet';
  const deploymentDataPath = process.env.DEPLOYMENT_DATA_PATH || './deployedAddresses.json';
  const outputDir = process.env.VERIFICATION_OUTPUT_DIR || './verification-reports';

  console.log(`🔍 Starting contract verification on ${network}...\n`);

  try {
    // Load contract configurations
    const contractConfigs = loadContractConfigurations(deploymentDataPath);
    
    if (contractConfigs.length === 0) {
      throw new Error('No contract configurations found. Check deployment data.');
    }

    console.log(`📋 Found ${contractConfigs.length} contracts to verify`);

    // Initialize verifier
    const verifier = new EtherscanVerifier(network);

    // Verify all contracts
    const results = await verifier.verifyAllContracts(contractConfigs);

    // Generate reports
    const verificationReport = verifier.generateVerificationReport(results);
    const addressDocumentation = await verifier.generateContractAddressDocumentation(results);

    // Save reports
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    fs.writeFileSync(
      path.join(outputDir, `contract-verification-${timestamp}.md`),
      verificationReport
    );

    fs.writeFileSync(
      path.join(outputDir, `contract-addresses-${timestamp}.md`),
      addressDocumentation
    );

    fs.writeFileSync(
      path.join(outputDir, `verification-results-${timestamp}.json`),
      JSON.stringify(results, null, 2)
    );

    console.log(`\n📄 Reports saved to ${outputDir}`);

    // Summary
    const verifiedCount = results.filter(r => r.verified).length;
    const totalCount = results.length;

    console.log(`\n📊 Verification Summary:`);
    console.log(`✅ Verified: ${verifiedCount}/${totalCount}`);
    console.log(`📈 Success Rate: ${((verifiedCount / totalCount) * 100).toFixed(1)}%`);

    if (verifiedCount === totalCount) {
      console.log('\n🎉 All contracts successfully verified!');
    } else {
      console.log('\n⚠️ Some contracts failed verification. Check the report for details.');
    }

    return results;

  } catch (error) {
    console.error('❌ Contract verification failed:', error);
    throw error;
  }
}

// CLI execution
if (require.main === module) {
  executeContractVerification()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}