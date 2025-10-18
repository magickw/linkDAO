import fs from "fs";
import path from "path";

interface GasEstimate {
  contractName: string;
  deploymentGas: number;
  estimatedCost: {
    lowGas: string; // ETH
    mediumGas: string; // ETH
    highGas: string; // ETH
  };
  optimizations: string[];
}

interface OptimizationReport {
  timestamp: string;
  network: string;
  totalContracts: number;
  totalDeploymentGas: number;
  estimatedCosts: {
    lowGas: string;
    mediumGas: string;
    highGas: string;
  };
  contracts: GasEstimate[];
  recommendations: string[];
  optimizationStrategies: string[];
}

class GasOptimizationAnalyzer {
  private gasEstimates: GasEstimate[] = [];
  private gasPrices = {
    low: 20, // gwei
    medium: 50, // gwei
    high: 100 // gwei
  };

  async analyzeDeploymentCosts(): Promise<OptimizationReport> {
    console.log("⛽ Starting Gas Optimization Analysis...");

    // Analyze each contract
    await this.analyzeContractGas("LDAOToken", 2500000);
    await this.analyzeContractGas("Governance", 3200000);
    await this.analyzeContractGas("ReputationSystem", 2800000);
    await this.analyzeContractGas("Marketplace", 4500000);
    await this.analyzeContractGas("EnhancedEscrow", 3500000);
    await this.analyzeContractGas("DisputeResolution", 3000000);
    await this.analyzeContractGas("PaymentRouter", 2200000);
    await this.analyzeContractGas("RewardPool", 2600000);
    await this.analyzeContractGas("NFTMarketplace", 4200000);
    await this.analyzeContractGas("NFTCollectionFactory", 3800000);
    await this.analyzeContractGas("TipRouter", 2400000);
    await this.analyzeContractGas("FollowModule", 2100000);

    return this.generateReport();
  }

  private async analyzeContractGas(contractName: string, estimatedGas: number): Promise<void> {
    console.log(`📊 Analyzing ${contractName}...`);

    const optimizations = this.getOptimizationSuggestions(contractName);
    
    // Calculate costs at different gas prices
    const lowCost = this.calculateCost(estimatedGas, this.gasPrices.low);
    const mediumCost = this.calculateCost(estimatedGas, this.gasPrices.medium);
    const highCost = this.calculateCost(estimatedGas, this.gasPrices.high);

    const gasEstimate: GasEstimate = {
      contractName,
      deploymentGas: estimatedGas,
      estimatedCost: {
        lowGas: lowCost,
        mediumGas: mediumCost,
        highGas: highCost
      },
      optimizations
    };

    this.gasEstimates.push(gasEstimate);
  }

  private calculateCost(gasUsed: number, gasPriceGwei: number): string {
    const gasPriceWei = gasPriceGwei * 1e9;
    const costWei = gasUsed * gasPriceWei;
    const costEth = costWei / 1e18;
    return costEth.toFixed(6);
  }

  private getOptimizationSuggestions(contractName: string): string[] {
    const commonOptimizations = [
      "Use packed structs to reduce storage slots",
      "Optimize loop operations and array access",
      "Use custom errors instead of require strings",
      "Implement efficient access control patterns"
    ];

    const specificOptimizations: { [key: string]: string[] } = {
      "LDAOToken": [
        "Optimize staking calculations",
        "Use bitmap for permission tracking",
        "Batch transfer operations"
      ],
      "Governance": [
        "Optimize proposal storage structure",
        "Use merkle trees for large voter sets",
        "Implement efficient vote counting"
      ],
      "Marketplace": [
        "Optimize listing storage layout",
        "Use events for search indexing",
        "Batch operations for multiple items"
      ],
      "EnhancedEscrow": [
        "Optimize escrow state transitions",
        "Use time-based unlocking patterns",
        "Minimize external calls"
      ],
      "NFTMarketplace": [
        "Optimize metadata storage",
        "Use lazy minting patterns",
        "Implement efficient royalty calculations"
      ]
    };

    return [
      ...commonOptimizations,
      ...(specificOptimizations[contractName] || [])
    ];
  }

  private generateReport(): OptimizationReport {
    const totalGas = this.gasEstimates.reduce((sum, estimate) => sum + estimate.deploymentGas, 0);
    
    const totalLowCost = this.calculateCost(totalGas, this.gasPrices.low);
    const totalMediumCost = this.calculateCost(totalGas, this.gasPrices.medium);
    const totalHighCost = this.calculateCost(totalGas, this.gasPrices.high);

    const recommendations = [
      "Deploy during low network congestion periods",
      "Use CREATE2 for deterministic addresses",
      "Consider proxy patterns for upgradeable contracts",
      "Implement batch deployment scripts",
      "Monitor gas prices and deploy strategically",
      "Use optimized compiler settings",
      "Consider layer 2 deployment for testing",
      "Implement gas-efficient initialization patterns"
    ];

    const optimizationStrategies = [
      "Storage Optimization: Pack structs and use appropriate data types",
      "Function Optimization: Use view/pure functions where possible",
      "Loop Optimization: Minimize iterations and use efficient algorithms",
      "External Call Optimization: Batch calls and minimize cross-contract interactions",
      "Event Optimization: Use indexed parameters efficiently",
      "Modifier Optimization: Inline simple checks to save gas",
      "Library Usage: Use libraries for common functionality",
      "Compiler Optimization: Enable optimizer with appropriate runs setting"
    ];

    return {
      timestamp: new Date().toISOString(),
      network: "mainnet",
      totalContracts: this.gasEstimates.length,
      totalDeploymentGas: totalGas,
      estimatedCosts: {
        lowGas: totalLowCost,
        mediumGas: totalMediumCost,
        highGas: totalHighCost
      },
      contracts: this.gasEstimates,
      recommendations,
      optimizationStrategies
    };
  }

  async saveReport(report: OptimizationReport): Promise<void> {
    const reportPath = path.join(process.cwd(), "gas-optimization-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate markdown report
    const markdownReport = this.generateMarkdownReport(report);
    const markdownPath = path.join(process.cwd(), "gas-optimization-report.md");
    fs.writeFileSync(markdownPath, markdownReport);

    console.log(`\n📄 Gas optimization reports saved:`);
    console.log(`  JSON: ${reportPath}`);
    console.log(`  Markdown: ${markdownPath}`);
  }

  private generateMarkdownReport(report: OptimizationReport): string {
    let markdown = `# Gas Optimization Report\n\n`;
    markdown += `**Generated:** ${report.timestamp}\n`;
    markdown += `**Network:** ${report.network}\n\n`;

    markdown += `## Summary\n\n`;
    markdown += `- **Total Contracts:** ${report.totalContracts}\n`;
    markdown += `- **Total Deployment Gas:** ${report.totalDeploymentGas.toLocaleString()}\n\n`;

    markdown += `### Estimated Deployment Costs\n\n`;
    markdown += `| Gas Price | Cost (ETH) | Cost (USD @ $3000/ETH) |\n`;
    markdown += `|-----------|------------|------------------------|\n`;
    markdown += `| 20 gwei (Low) | ${report.estimatedCosts.lowGas} | $${(parseFloat(report.estimatedCosts.lowGas) * 3000).toFixed(2)} |\n`;
    markdown += `| 50 gwei (Medium) | ${report.estimatedCosts.mediumGas} | $${(parseFloat(report.estimatedCosts.mediumGas) * 3000).toFixed(2)} |\n`;
    markdown += `| 100 gwei (High) | ${report.estimatedCosts.highGas} | $${(parseFloat(report.estimatedCosts.highGas) * 3000).toFixed(2)} |\n\n`;

    markdown += `## Contract Analysis\n\n`;
    for (const contract of report.contracts) {
      markdown += `### ${contract.contractName}\n\n`;
      markdown += `- **Deployment Gas:** ${contract.deploymentGas.toLocaleString()}\n`;
      markdown += `- **Cost Range:** ${contract.estimatedCost.lowGas} - ${contract.estimatedCost.highGas} ETH\n\n`;
      
      if (contract.optimizations.length > 0) {
        markdown += `**Optimization Opportunities:**\n`;
        for (const optimization of contract.optimizations) {
          markdown += `- ${optimization}\n`;
        }
        markdown += `\n`;
      }
    }

    markdown += `## Optimization Strategies\n\n`;
    for (let i = 0; i < report.optimizationStrategies.length; i++) {
      markdown += `${i + 1}. ${report.optimizationStrategies[i]}\n`;
    }

    markdown += `\n## Recommendations\n\n`;
    for (let i = 0; i < report.recommendations.length; i++) {
      markdown += `${i + 1}. ${report.recommendations[i]}\n`;
    }

    return markdown;
  }

  printSummary(report: OptimizationReport): void {
    console.log("\n" + "=".repeat(60));
    console.log("            GAS OPTIMIZATION SUMMARY");
    console.log("=".repeat(60));
    
    console.log(`Total Contracts: ${report.totalContracts}`);
    console.log(`Total Deployment Gas: ${report.totalDeploymentGas.toLocaleString()}`);
    
    console.log("\nEstimated Deployment Costs:");
    console.log(`  Low Gas (20 gwei):    ${report.estimatedCosts.lowGas} ETH`);
    console.log(`  Medium Gas (50 gwei): ${report.estimatedCosts.mediumGas} ETH`);
    console.log(`  High Gas (100 gwei):  ${report.estimatedCosts.highGas} ETH`);
    
    console.log("\nTop Gas Consumers:");
    const sortedContracts = [...report.contracts].sort((a, b) => b.deploymentGas - a.deploymentGas);
    for (let i = 0; i < Math.min(5, sortedContracts.length); i++) {
      const contract = sortedContracts[i];
      console.log(`  ${i + 1}. ${contract.contractName}: ${contract.deploymentGas.toLocaleString()} gas`);
    }
    
    console.log("\nKey Recommendations:");
    for (let i = 0; i < Math.min(5, report.recommendations.length); i++) {
      console.log(`  ${i + 1}. ${report.recommendations[i]}`);
    }
    
    console.log("=".repeat(60));
  }
}

async function main() {
  const analyzer = new GasOptimizationAnalyzer();
  
  try {
    const report = await analyzer.analyzeDeploymentCosts();
    await analyzer.saveReport(report);
    analyzer.printSummary(report);
    
    console.log("\n✅ Gas optimization analysis completed successfully!");
    console.log("💡 Review the generated reports for detailed optimization strategies.");
    
  } catch (error) {
    console.error("❌ Gas optimization analysis failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { GasOptimizationAnalyzer };