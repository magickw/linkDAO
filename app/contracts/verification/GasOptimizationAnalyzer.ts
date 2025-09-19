import { ethers } from 'ethers';

export interface GasAnalysisResult {
  contractName: string;
  functionAnalysis: FunctionGasAnalysis[];
  optimizationRecommendations: OptimizationRecommendation[];
  totalEstimatedSavings: number;
  riskAssessment: RiskLevel;
}

export interface FunctionGasAnalysis {
  functionName: string;
  averageGas: number;
  maxGas: number;
  minGas: number;
  callCount: number;
  totalGasUsed: number;
  gasEfficiencyRating: 'excellent' | 'good' | 'fair' | 'poor';
  comparedToBaseline: number; // percentage difference from expected baseline
}

export interface OptimizationRecommendation {
  type: 'storage' | 'computation' | 'external_calls' | 'loops' | 'events';
  priority: 'high' | 'medium' | 'low';
  description: string;
  estimatedSavings: number;
  implementationComplexity: 'low' | 'medium' | 'high';
  riskLevel: RiskLevel;
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export class GasOptimizationAnalyzer {
  private provider: ethers.Provider;
  private contracts: Map<string, ethers.Contract> = new Map();
  private gasData: Map<string, FunctionGasData[]> = new Map();
  private analysisResults: GasAnalysisResult[] = [];

  // Gas baselines for common operations (in gas units)
  private readonly GAS_BASELINES = {
    'transfer': 21000,
    'approve': 46000,
    'mint': 70000,
    'burn': 30000,
    'stake': 80000,
    'unstake': 60000,
    'vote': 90000,
    'propose': 120000,
    'createListing': 150000,
    'buyItem': 100000,
    'createEscrow': 120000,
    'releaseEscrow': 80000,
    'submitReview': 90000,
    'follow': 50000,
    'tip': 60000
  };

  constructor(provider: ethers.Provider) {
    this.provider = provider;
  }

  addContract(name: string, address: string, abi: any[]) {
    const contract = new ethers.Contract(address, abi, this.provider);
    this.contracts.set(name, contract);
    this.gasData.set(name, []);
  }

  recordGasUsage(contractName: string, functionName: string, gasUsed: number) {
    const data = this.gasData.get(contractName) || [];
    data.push({
      functionName,
      gasUsed,
      timestamp: new Date()
    });
    this.gasData.set(contractName, data);
  }

  async analyzeAllContracts(): Promise<GasAnalysisResult[]> {
    console.log('Starting gas optimization analysis...');
    this.analysisResults = [];

    for (const [contractName] of this.contracts) {
      const result = await this.analyzeContract(contractName);
      this.analysisResults.push(result);
    }

    return this.analysisResults;
  }

  private async analyzeContract(contractName: string): Promise<GasAnalysisResult> {
    const contract = this.contracts.get(contractName);
    const gasData = this.gasData.get(contractName) || [];

    if (!contract) {
      throw new Error(`Contract ${contractName} not found`);
    }

    // Analyze function gas usage
    const functionAnalysis = this.analyzeFunctionGasUsage(gasData);

    // Generate optimization recommendations
    const recommendations = this.generateOptimizationRecommendations(
      contractName,
      functionAnalysis,
      contract
    );

    // Calculate total estimated savings
    const totalEstimatedSavings = recommendations.reduce(
      (sum, rec) => sum + rec.estimatedSavings,
      0
    );

    // Assess overall risk
    const riskAssessment = this.assessOverallRisk(functionAnalysis, recommendations);

    return {
      contractName,
      functionAnalysis,
      optimizationRecommendations: recommendations,
      totalEstimatedSavings,
      riskAssessment
    };
  }

  private analyzeFunctionGasUsage(gasData: FunctionGasData[]): FunctionGasAnalysis[] {
    const functionMap = new Map<string, number[]>();

    // Group gas usage by function
    for (const data of gasData) {
      const existing = functionMap.get(data.functionName) || [];
      existing.push(data.gasUsed);
      functionMap.set(data.functionName, existing);
    }

    const analysis: FunctionGasAnalysis[] = [];

    for (const [functionName, gasUsages] of functionMap) {
      if (gasUsages.length === 0) continue;

      const averageGas = gasUsages.reduce((sum, gas) => sum + gas, 0) / gasUsages.length;
      const maxGas = Math.max(...gasUsages);
      const minGas = Math.min(...gasUsages);
      const totalGasUsed = gasUsages.reduce((sum, gas) => sum + gas, 0);

      // Compare to baseline
      const baseline = this.getGasBaseline(functionName);
      const comparedToBaseline = baseline > 0 ? ((averageGas - baseline) / baseline) * 100 : 0;

      // Rate efficiency
      const gasEfficiencyRating = this.rateGasEfficiency(averageGas, baseline);

      analysis.push({
        functionName,
        averageGas: Math.round(averageGas),
        maxGas,
        minGas,
        callCount: gasUsages.length,
        totalGasUsed,
        gasEfficiencyRating,
        comparedToBaseline: Math.round(comparedToBaseline)
      });
    }

    return analysis.sort((a, b) => b.totalGasUsed - a.totalGasUsed);
  }

  private getGasBaseline(functionName: string): number {
    // Try exact match first
    if (this.GAS_BASELINES[functionName as keyof typeof this.GAS_BASELINES]) {
      return this.GAS_BASELINES[functionName as keyof typeof this.GAS_BASELINES];
    }

    // Try partial matches
    for (const [baselineName, gas] of Object.entries(this.GAS_BASELINES)) {
      if (functionName.toLowerCase().includes(baselineName.toLowerCase())) {
        return gas;
      }
    }

    // Default baseline based on function complexity
    if (functionName.includes('create') || functionName.includes('deploy')) {
      return 150000;
    } else if (functionName.includes('update') || functionName.includes('set')) {
      return 80000;
    } else if (functionName.includes('get') || functionName.includes('view')) {
      return 0; // View functions don't use gas
    }

    return 50000; // Default baseline
  }

  private rateGasEfficiency(actualGas: number, baseline: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (baseline === 0) return 'excellent'; // View functions

    const ratio = actualGas / baseline;
    
    if (ratio <= 0.8) return 'excellent';
    if (ratio <= 1.2) return 'good';
    if (ratio <= 1.8) return 'fair';
    return 'poor';
  }

  private generateOptimizationRecommendations(
    contractName: string,
    functionAnalysis: FunctionGasAnalysis[],
    contract: ethers.Contract
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Analyze high gas usage functions
    const highGasFunctions = functionAnalysis.filter(
      f => f.gasEfficiencyRating === 'poor' || f.averageGas > 200000
    );

    for (const func of highGasFunctions) {
      recommendations.push(...this.generateFunctionSpecificRecommendations(func));
    }

    // Contract-specific recommendations
    recommendations.push(...this.generateContractSpecificRecommendations(contractName, contract));

    // General optimization recommendations
    recommendations.push(...this.generateGeneralRecommendations(functionAnalysis));

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private generateFunctionSpecificRecommendations(func: FunctionGasAnalysis): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    if (func.averageGas > 300000) {
      recommendations.push({
        type: 'computation',
        priority: 'high',
        description: `Function ${func.functionName} uses excessive gas (${func.averageGas}). Consider breaking into smaller functions or optimizing logic.`,
        estimatedSavings: Math.round(func.averageGas * 0.3),
        implementationComplexity: 'high',
        riskLevel: 'medium'
      });
    }

    if (func.comparedToBaseline > 50) {
      recommendations.push({
        type: 'storage',
        priority: 'medium',
        description: `Function ${func.functionName} is ${func.comparedToBaseline}% above baseline. Review storage operations and data structures.`,
        estimatedSavings: Math.round(func.averageGas * 0.2),
        implementationComplexity: 'medium',
        riskLevel: 'low'
      });
    }

    return recommendations;
  }

  private generateContractSpecificRecommendations(
    contractName: string,
    contract: ethers.Contract
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Token contract optimizations
    if (contractName.includes('Token')) {
      recommendations.push({
        type: 'storage',
        priority: 'medium',
        description: 'Consider using packed structs for token holder data to reduce storage costs.',
        estimatedSavings: 15000,
        implementationComplexity: 'low',
        riskLevel: 'low'
      });
    }

    // Marketplace optimizations
    if (contractName.includes('Marketplace')) {
      recommendations.push({
        type: 'external_calls',
        priority: 'high',
        description: 'Batch multiple marketplace operations to reduce transaction costs for users.',
        estimatedSavings: 50000,
        implementationComplexity: 'medium',
        riskLevel: 'medium'
      });
    }

    // NFT contract optimizations
    if (contractName.includes('NFT')) {
      recommendations.push({
        type: 'storage',
        priority: 'medium',
        description: 'Use IPFS for metadata storage and optimize token URI handling.',
        estimatedSavings: 25000,
        implementationComplexity: 'low',
        riskLevel: 'low'
      });
    }

    return recommendations;
  }

  private generateGeneralRecommendations(functionAnalysis: FunctionGasAnalysis[]): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    const totalGasUsed = functionAnalysis.reduce((sum, f) => sum + f.totalGasUsed, 0);
    const avgGasPerFunction = totalGasUsed / functionAnalysis.length;

    if (avgGasPerFunction > 100000) {
      recommendations.push({
        type: 'computation',
        priority: 'medium',
        description: 'Overall gas usage is high. Consider implementing gas optimization patterns like bit packing and efficient loops.',
        estimatedSavings: Math.round(totalGasUsed * 0.15),
        implementationComplexity: 'medium',
        riskLevel: 'low'
      });
    }

    // Event optimization
    const eventHeavyFunctions = functionAnalysis.filter(f => f.functionName.includes('emit') || f.averageGas > 80000);
    if (eventHeavyFunctions.length > 0) {
      recommendations.push({
        type: 'events',
        priority: 'low',
        description: 'Optimize event emissions by using indexed parameters efficiently and avoiding redundant events.',
        estimatedSavings: 5000,
        implementationComplexity: 'low',
        riskLevel: 'low'
      });
    }

    return recommendations;
  }

  private assessOverallRisk(
    functionAnalysis: FunctionGasAnalysis[],
    recommendations: OptimizationRecommendation[]
  ): RiskLevel {
    const poorFunctions = functionAnalysis.filter(f => f.gasEfficiencyRating === 'poor').length;
    const highRiskRecommendations = recommendations.filter(r => r.riskLevel === 'high').length;
    const criticalGasFunctions = functionAnalysis.filter(f => f.averageGas > 500000).length;

    if (criticalGasFunctions > 0 || highRiskRecommendations > 2) {
      return 'critical';
    } else if (poorFunctions > 3 || highRiskRecommendations > 0) {
      return 'high';
    } else if (poorFunctions > 1) {
      return 'medium';
    }

    return 'low';
  }

  generateOptimizationReport(): string {
    let report = '# Gas Optimization Analysis Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    // Executive Summary
    const totalSavings = this.analysisResults.reduce((sum, r) => sum + r.totalEstimatedSavings, 0);
    const highPriorityRecommendations = this.analysisResults.reduce(
      (sum, r) => sum + r.optimizationRecommendations.filter(rec => rec.priority === 'high').length,
      0
    );

    report += '## Executive Summary\n\n';
    report += `- Total Estimated Gas Savings: ${totalSavings.toLocaleString()} gas\n`;
    report += `- High Priority Recommendations: ${highPriorityRecommendations}\n`;
    report += `- Contracts Analyzed: ${this.analysisResults.length}\n\n`;

    // Contract Analysis
    for (const result of this.analysisResults) {
      report += `## ${result.contractName}\n\n`;
      report += `- **Risk Level**: ${result.riskAssessment.toUpperCase()}\n`;
      report += `- **Estimated Savings**: ${result.totalEstimatedSavings.toLocaleString()} gas\n\n`;

      // Function Analysis
      if (result.functionAnalysis.length > 0) {
        report += '### Function Gas Analysis\n\n';
        report += '| Function | Avg Gas | Efficiency | vs Baseline | Total Usage |\n';
        report += '|----------|---------|------------|-------------|-------------|\n';
        
        for (const func of result.functionAnalysis.slice(0, 10)) { // Top 10 functions
          const efficiency = this.getEfficiencyEmoji(func.gasEfficiencyRating);
          report += `| ${func.functionName} | ${func.averageGas.toLocaleString()} | ${efficiency} ${func.gasEfficiencyRating} | ${func.comparedToBaseline > 0 ? '+' : ''}${func.comparedToBaseline}% | ${func.totalGasUsed.toLocaleString()} |\n`;
        }
        report += '\n';
      }

      // Recommendations
      if (result.optimizationRecommendations.length > 0) {
        report += '### Optimization Recommendations\n\n';
        
        for (const rec of result.optimizationRecommendations) {
          const priority = this.getPriorityEmoji(rec.priority);
          const risk = this.getRiskEmoji(rec.riskLevel);
          
          report += `#### ${priority} ${rec.type.toUpperCase()} - ${rec.priority.toUpperCase()} Priority\n\n`;
          report += `${rec.description}\n\n`;
          report += `- **Estimated Savings**: ${rec.estimatedSavings.toLocaleString()} gas\n`;
          report += `- **Implementation Complexity**: ${rec.implementationComplexity}\n`;
          report += `- **Risk Level**: ${risk} ${rec.riskLevel}\n\n`;
        }
      }
    }

    // Implementation Roadmap
    report += '## Implementation Roadmap\n\n';
    
    const allRecommendations = this.analysisResults.flatMap(r => r.optimizationRecommendations);
    const highPriority = allRecommendations.filter(r => r.priority === 'high');
    const mediumPriority = allRecommendations.filter(r => r.priority === 'medium');
    const lowPriority = allRecommendations.filter(r => r.priority === 'low');

    if (highPriority.length > 0) {
      report += '### Phase 1: High Priority (Immediate)\n\n';
      for (const rec of highPriority) {
        report += `- ${rec.description} (${rec.estimatedSavings.toLocaleString()} gas savings)\n`;
      }
      report += '\n';
    }

    if (mediumPriority.length > 0) {
      report += '### Phase 2: Medium Priority (Next Sprint)\n\n';
      for (const rec of mediumPriority) {
        report += `- ${rec.description} (${rec.estimatedSavings.toLocaleString()} gas savings)\n`;
      }
      report += '\n';
    }

    if (lowPriority.length > 0) {
      report += '### Phase 3: Low Priority (Future)\n\n';
      for (const rec of lowPriority) {
        report += `- ${rec.description} (${rec.estimatedSavings.toLocaleString()} gas savings)\n`;
      }
      report += '\n';
    }

    return report;
  }

  private getEfficiencyEmoji(rating: string): string {
    switch (rating) {
      case 'excellent': return '🟢';
      case 'good': return '🟡';
      case 'fair': return '🟠';
      case 'poor': return '🔴';
      default: return '⚪';
    }
  }

  private getPriorityEmoji(priority: string): string {
    switch (priority) {
      case 'high': return '🚨';
      case 'medium': return '⚠️';
      case 'low': return 'ℹ️';
      default: return '📝';
    }
  }

  private getRiskEmoji(risk: string): string {
    switch (risk) {
      case 'critical': return '💀';
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  }

  getResults(): GasAnalysisResult[] {
    return this.analysisResults;
  }
}

interface FunctionGasData {
  functionName: string;
  gasUsed: number;
  timestamp: Date;
}