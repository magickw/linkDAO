import { ethers } from 'ethers';
import { EventEmitter } from 'events';

export interface ParameterConfig {
  contractName: string;
  parameterName: string;
  currentValue: any;
  recommendedValue: any;
  valueType: 'uint256' | 'address' | 'bool' | 'bytes32' | 'string';
  category: 'fee' | 'timeout' | 'threshold' | 'limit' | 'rate' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  impact: string;
  riskLevel: 'low' | 'medium' | 'high';
  lastUpdated: Date;
  proposalId?: string;
}

export interface UsagePattern {
  contractName: string;
  functionName: string;
  callCount: number;
  averageGasUsed: number;
  successRate: number;
  errorRate: number;
  averageValue: bigint;
  timeframe: string;
  timestamp: Date;
}

export interface TuningRecommendation {
  id: string;
  contractName: string;
  parameterName: string;
  currentValue: any;
  recommendedValue: any;
  confidence: number; // 0-100
  expectedImpact: string;
  basedOnData: UsagePattern[];
  createdAt: Date;
  status: 'pending' | 'approved' | 'rejected' | 'implemented';
}

export class ParameterTuningSystem extends EventEmitter {
  private provider: ethers.Provider;
  private signer: ethers.Signer;
  private contracts: Map<string, ethers.Contract> = new Map();
  private usagePatterns: Map<string, UsagePattern[]> = new Map();
  private parameterConfigs: Map<string, ParameterConfig> = new Map();
  private recommendations: Map<string, TuningRecommendation> = new Map();
  private analysisInterval: NodeJS.Timeout | null = null;

  constructor(provider: ethers.Provider, signer: ethers.Signer) {
    super();
    this.provider = provider;
    this.signer = signer;
  }

  addContract(name: string, address: string, abi: any[]) {
    const contract = new ethers.Contract(address, abi, this.signer);
    this.contracts.set(name, contract);
    this.usagePatterns.set(name, []);
    
    // Setup parameter monitoring
    this.setupParameterMonitoring(name, contract);
  }

  private setupParameterMonitoring(name: string, contract: ethers.Contract) {
    // Define parameters to monitor for each contract type
    const parameterMappings = this.getParameterMappings(name);
    
    for (const [paramName, config] of parameterMappings) {
      const key = `${name}-${paramName}`;
      this.parameterConfigs.set(key, {
        contractName: name,
        parameterName: paramName,
        currentValue: null,
        recommendedValue: null,
        valueType: config.type,
        category: config.category,
        priority: config.priority,
        reason: '',
        impact: '',
        riskLevel: 'low',
        lastUpdated: new Date()
      });
    }
  }

  private getParameterMappings(contractName: string): Map<string, any> {
    const mappings = new Map();

    switch (contractName) {
      case 'LDAOToken':
        mappings.set('stakingRewardRate', { type: 'uint256', category: 'rate', priority: 'medium' });
        mappings.set('maxStakingAmount', { type: 'uint256', category: 'limit', priority: 'low' });
        break;
        
      case 'Governance':
        mappings.set('votingDelay', { type: 'uint256', category: 'timeout', priority: 'high' });
        mappings.set('votingPeriod', { type: 'uint256', category: 'timeout', priority: 'high' });
        mappings.set('quorum', { type: 'uint256', category: 'threshold', priority: 'critical' });
        break;
        
      case 'Marketplace':
        mappings.set('platformFee', { type: 'uint256', category: 'fee', priority: 'high' });
        mappings.set('maxListingDuration', { type: 'uint256', category: 'timeout', priority: 'medium' });
        mappings.set('minListingPrice', { type: 'uint256', category: 'limit', priority: 'low' });
        break;
        
      case 'EnhancedEscrow':
        mappings.set('defaultTimeout', { type: 'uint256', category: 'timeout', priority: 'high' });
        mappings.set('maxEscrowAmount', { type: 'uint256', category: 'limit', priority: 'medium' });
        break;
        
      case 'ReputationSystem':
        mappings.set('maxReviewsPerDay', { type: 'uint256', category: 'limit', priority: 'medium' });
        mappings.set('reputationDecayRate', { type: 'uint256', category: 'rate', priority: 'low' });
        break;
        
      case 'NFTMarketplace':
        mappings.set('maxRoyaltyPercentage', { type: 'uint256', category: 'limit', priority: 'medium' });
        mappings.set('mintingFee', { type: 'uint256', category: 'fee', priority: 'low' });
        break;
    }

    return mappings;
  }

  recordUsagePattern(
    contractName: string,
    functionName: string,
    gasUsed: number,
    success: boolean,
    value: bigint = 0n
  ) {
    const patterns = this.usagePatterns.get(contractName) || [];
    
    // Find existing pattern for this function in the current hour
    const currentHour = new Date();
    currentHour.setMinutes(0, 0, 0);
    
    let pattern = patterns.find(p => 
      p.functionName === functionName && 
      p.timestamp.getTime() === currentHour.getTime()
    );

    if (!pattern) {
      pattern = {
        contractName,
        functionName,
        callCount: 0,
        averageGasUsed: 0,
        successRate: 0,
        errorRate: 0,
        averageValue: 0n,
        timeframe: 'hourly',
        timestamp: currentHour
      };
      patterns.push(pattern);
    }

    // Update pattern
    const totalCalls = pattern.callCount + 1;
    pattern.averageGasUsed = (pattern.averageGasUsed * pattern.callCount + gasUsed) / totalCalls;
    pattern.averageValue = (pattern.averageValue * BigInt(pattern.callCount) + value) / BigInt(totalCalls);
    pattern.callCount = totalCalls;
    
    if (success) {
      pattern.successRate = (pattern.successRate * (totalCalls - 1) + 1) / totalCalls;
    } else {
      pattern.errorRate = (pattern.errorRate * (totalCalls - 1) + 1) / totalCalls;
    }

    this.usagePatterns.set(contractName, patterns);
  }

  async analyzeUsagePatterns(): Promise<TuningRecommendation[]> {
    console.log('Analyzing usage patterns for parameter tuning...');
    
    const newRecommendations: TuningRecommendation[] = [];

    for (const [contractName, patterns] of this.usagePatterns) {
      const contractRecommendations = await this.analyzeContractPatterns(contractName, patterns);
      newRecommendations.push(...contractRecommendations);
    }

    // Store new recommendations
    for (const rec of newRecommendations) {
      this.recommendations.set(rec.id, rec);
      this.emit('recommendationGenerated', rec);
    }

    return newRecommendations;
  }

  private async analyzeContractPatterns(
    contractName: string,
    patterns: UsagePattern[]
  ): Promise<TuningRecommendation[]> {
    const recommendations: TuningRecommendation[] = [];
    const contract = this.contracts.get(contractName);
    
    if (!contract) return recommendations;

    // Analyze different aspects based on contract type
    switch (contractName) {
      case 'Marketplace':
        recommendations.push(...await this.analyzeMarketplacePatterns(contract, patterns));
        break;
      case 'Governance':
        recommendations.push(...await this.analyzeGovernancePatterns(contract, patterns));
        break;
      case 'EnhancedEscrow':
        recommendations.push(...await this.analyzeEscrowPatterns(contract, patterns));
        break;
      case 'ReputationSystem':
        recommendations.push(...await this.analyzeReputationPatterns(contract, patterns));
        break;
    }

    return recommendations;
  }

  private async analyzeMarketplacePatterns(
    contract: ethers.Contract,
    patterns: UsagePattern[]
  ): Promise<TuningRecommendation[]> {
    const recommendations: TuningRecommendation[] = [];

    try {
      // Analyze platform fee based on usage
      const currentFee = await contract.platformFee();
      const listingPatterns = patterns.filter(p => p.functionName === 'createListing');
      const buyingPatterns = patterns.filter(p => p.functionName === 'buyItem');

      if (listingPatterns.length > 0 && buyingPatterns.length > 0) {
        const avgListingValue = this.calculateAverageValue(listingPatterns);
        const avgBuyingValue = this.calculateAverageValue(buyingPatterns);
        const listingSuccessRate = this.calculateAverageSuccessRate(listingPatterns);

        // If success rate is low and fees are high, recommend reduction
        if (listingSuccessRate < 0.8 && currentFee > 250) { // 2.5%
          recommendations.push({
            id: `marketplace-fee-${Date.now()}`,
            contractName: 'Marketplace',
            parameterName: 'platformFee',
            currentValue: currentFee.toString(),
            recommendedValue: Math.max(100, Number(currentFee) - 50).toString(), // Reduce by 0.5%
            confidence: 75,
            expectedImpact: 'Increase listing success rate by reducing platform fees',
            basedOnData: listingPatterns,
            createdAt: new Date(),
            status: 'pending'
          });
        }

        // If volume is very high, consider increasing fees
        if (listingSuccessRate > 0.95 && avgBuyingValue > ethers.parseEther('1')) {
          recommendations.push({
            id: `marketplace-fee-increase-${Date.now()}`,
            contractName: 'Marketplace',
            parameterName: 'platformFee',
            currentValue: currentFee.toString(),
            recommendedValue: Math.min(500, Number(currentFee) + 25).toString(), // Increase by 0.25%
            confidence: 60,
            expectedImpact: 'Optimize revenue from high-value transactions',
            basedOnData: buyingPatterns,
            createdAt: new Date(),
            status: 'pending'
          });
        }
      }

      // Analyze listing duration
      const currentMaxDuration = await contract.maxListingDuration();
      const expiredListings = patterns.filter(p => p.functionName === 'expireListing');
      
      if (expiredListings.length > listingPatterns.length * 0.3) { // 30% expiration rate
        recommendations.push({
          id: `marketplace-duration-${Date.now()}`,
          contractName: 'Marketplace',
          parameterName: 'maxListingDuration',
          currentValue: currentMaxDuration.toString(),
          recommendedValue: (Number(currentMaxDuration) * 1.5).toString(), // Increase by 50%
          confidence: 80,
          expectedImpact: 'Reduce listing expiration rate',
          basedOnData: expiredListings,
          createdAt: new Date(),
          status: 'pending'
        });
      }

    } catch (error) {
      console.error('Error analyzing marketplace patterns:', error);
    }

    return recommendations;
  }

  private async analyzeGovernancePatterns(
    contract: ethers.Contract,
    patterns: UsagePattern[]
  ): Promise<TuningRecommendation[]> {
    const recommendations: TuningRecommendation[] = [];

    try {
      const currentQuorum = await contract.quorum(0);
      const votingPatterns = patterns.filter(p => p.functionName === 'castVote');
      const proposalPatterns = patterns.filter(p => p.functionName === 'propose');

      // If voting participation is low, consider reducing quorum
      if (votingPatterns.length > 0) {
        const avgParticipation = this.calculateAverageSuccessRate(votingPatterns);
        
        if (avgParticipation < 0.3 && currentQuorum > ethers.parseEther('1000000')) {
          recommendations.push({
            id: `governance-quorum-${Date.now()}`,
            contractName: 'Governance',
            parameterName: 'quorum',
            currentValue: currentQuorum.toString(),
            recommendedValue: (currentQuorum * 80n / 100n).toString(), // Reduce by 20%
            confidence: 70,
            expectedImpact: 'Increase governance participation by lowering quorum',
            basedOnData: votingPatterns,
            createdAt: new Date(),
            status: 'pending'
          });
        }
      }

      // Analyze voting period based on proposal completion rates
      const currentVotingPeriod = await contract.votingPeriod();
      if (proposalPatterns.length > 0) {
        const completionRate = this.calculateAverageSuccessRate(proposalPatterns);
        
        if (completionRate < 0.5) {
          recommendations.push({
            id: `governance-period-${Date.now()}`,
            contractName: 'Governance',
            parameterName: 'votingPeriod',
            currentValue: currentVotingPeriod.toString(),
            recommendedValue: (Number(currentVotingPeriod) * 1.5).toString(), // Increase by 50%
            confidence: 65,
            expectedImpact: 'Improve proposal completion rate with longer voting period',
            basedOnData: proposalPatterns,
            createdAt: new Date(),
            status: 'pending'
          });
        }
      }

    } catch (error) {
      console.error('Error analyzing governance patterns:', error);
    }

    return recommendations;
  }

  private async analyzeEscrowPatterns(
    contract: ethers.Contract,
    patterns: UsagePattern[]
  ): Promise<TuningRecommendation[]> {
    const recommendations: TuningRecommendation[] = [];

    try {
      const currentTimeout = await contract.defaultTimeout();
      const escrowPatterns = patterns.filter(p => p.functionName === 'createEscrow');
      const releasePatterns = patterns.filter(p => p.functionName === 'releaseEscrow');
      const timeoutPatterns = patterns.filter(p => p.functionName === 'timeoutEscrow');

      // If many escrows are timing out, consider increasing timeout
      if (timeoutPatterns.length > escrowPatterns.length * 0.2) { // 20% timeout rate
        recommendations.push({
          id: `escrow-timeout-${Date.now()}`,
          contractName: 'EnhancedEscrow',
          parameterName: 'defaultTimeout',
          currentValue: currentTimeout.toString(),
          recommendedValue: (Number(currentTimeout) * 1.3).toString(), // Increase by 30%
          confidence: 85,
          expectedImpact: 'Reduce escrow timeout rate',
          basedOnData: timeoutPatterns,
          createdAt: new Date(),
          status: 'pending'
        });
      }

      // If escrows are released very quickly, consider reducing timeout
      if (releasePatterns.length > 0 && timeoutPatterns.length < escrowPatterns.length * 0.05) { // <5% timeout
        const avgReleaseTime = this.estimateAverageReleaseTime(releasePatterns);
        if (avgReleaseTime < Number(currentTimeout) * 0.3) { // Released in <30% of timeout period
          recommendations.push({
            id: `escrow-timeout-reduce-${Date.now()}`,
            contractName: 'EnhancedEscrow',
            parameterName: 'defaultTimeout',
            currentValue: currentTimeout.toString(),
            recommendedValue: Math.max(86400, Number(currentTimeout) * 0.8).toString(), // Reduce by 20%, min 1 day
            confidence: 70,
            expectedImpact: 'Optimize escrow efficiency with shorter timeout',
            basedOnData: releasePatterns,
            createdAt: new Date(),
            status: 'pending'
          });
        }
      }

    } catch (error) {
      console.error('Error analyzing escrow patterns:', error);
    }

    return recommendations;
  }

  private async analyzeReputationPatterns(
    contract: ethers.Contract,
    patterns: UsagePattern[]
  ): Promise<TuningRecommendation[]> {
    const recommendations: TuningRecommendation[] = [];

    try {
      const currentMaxReviews = await contract.maxReviewsPerDay();
      const reviewPatterns = patterns.filter(p => p.functionName === 'submitReview');

      // If review submission rate is hitting the limit, consider increasing
      const dailyReviewAttempts = reviewPatterns.reduce((sum, p) => sum + p.callCount, 0);
      const avgDailyReviews = dailyReviewAttempts / Math.max(1, reviewPatterns.length);

      if (avgDailyReviews > Number(currentMaxReviews) * 0.8) { // Using 80% of limit
        recommendations.push({
          id: `reputation-reviews-${Date.now()}`,
          contractName: 'ReputationSystem',
          parameterName: 'maxReviewsPerDay',
          currentValue: currentMaxReviews.toString(),
          recommendedValue: Math.min(20, Number(currentMaxReviews) + 2).toString(), // Increase by 2, max 20
          confidence: 75,
          expectedImpact: 'Allow more reviews to improve reputation accuracy',
          basedOnData: reviewPatterns,
          createdAt: new Date(),
          status: 'pending'
        });
      }

    } catch (error) {
      console.error('Error analyzing reputation patterns:', error);
    }

    return recommendations;
  }

  private calculateAverageValue(patterns: UsagePattern[]): bigint {
    if (patterns.length === 0) return 0n;
    
    const total = patterns.reduce((sum, p) => sum + p.averageValue * BigInt(p.callCount), 0n);
    const totalCalls = patterns.reduce((sum, p) => sum + p.callCount, 0);
    
    return totalCalls > 0 ? total / BigInt(totalCalls) : 0n;
  }

  private calculateAverageSuccessRate(patterns: UsagePattern[]): number {
    if (patterns.length === 0) return 0;
    
    const totalSuccessRate = patterns.reduce((sum, p) => sum + p.successRate * p.callCount, 0);
    const totalCalls = patterns.reduce((sum, p) => sum + p.callCount, 0);
    
    return totalCalls > 0 ? totalSuccessRate / totalCalls : 0;
  }

  private estimateAverageReleaseTime(patterns: UsagePattern[]): number {
    // This is a simplified estimation - in reality, you'd track actual release times
    return patterns.reduce((sum, p) => sum + p.averageGasUsed, 0) / patterns.length;
  }

  async implementRecommendation(recommendationId: string): Promise<boolean> {
    const recommendation = this.recommendations.get(recommendationId);
    if (!recommendation) {
      throw new Error(`Recommendation ${recommendationId} not found`);
    }

    const contract = this.contracts.get(recommendation.contractName);
    if (!contract) {
      throw new Error(`Contract ${recommendation.contractName} not found`);
    }

    try {
      console.log(`Implementing recommendation: ${recommendation.parameterName} = ${recommendation.recommendedValue}`);

      // This would typically go through governance for critical parameters
      if (this.isCriticalParameter(recommendation.parameterName)) {
        console.log('Critical parameter - creating governance proposal');
        recommendation.status = 'pending';
        // Create governance proposal here
        return false;
      }

      // For non-critical parameters, implement directly if authorized
      const functionName = `set${recommendation.parameterName.charAt(0).toUpperCase() + recommendation.parameterName.slice(1)}`;
      
      if (contract.interface.hasFunction(functionName)) {
        const tx = await contract[functionName](recommendation.recommendedValue);
        await tx.wait();
        
        recommendation.status = 'implemented';
        this.emit('recommendationImplemented', recommendation);
        
        console.log(`Successfully implemented recommendation ${recommendationId}`);
        return true;
      } else {
        console.warn(`Function ${functionName} not found in contract`);
        return false;
      }

    } catch (error) {
      console.error(`Failed to implement recommendation ${recommendationId}:`, error);
      recommendation.status = 'rejected';
      return false;
    }
  }

  private isCriticalParameter(parameterName: string): boolean {
    const criticalParams = ['quorum', 'votingPeriod', 'platformFee', 'maxEscrowAmount'];
    return criticalParams.includes(parameterName);
  }

  startAnalysis(intervalHours: number = 24) {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
    }

    this.analysisInterval = setInterval(() => {
      this.analyzeUsagePatterns();
    }, intervalHours * 60 * 60 * 1000);

    console.log(`Parameter tuning analysis started (every ${intervalHours} hours)`);
  }

  stopAnalysis() {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
    console.log('Parameter tuning analysis stopped');
  }

  getRecommendations(status?: string): TuningRecommendation[] {
    const recommendations = Array.from(this.recommendations.values());
    
    if (status) {
      return recommendations.filter(r => r.status === status);
    }
    
    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  generateTuningReport(): string {
    let report = '# Parameter Tuning Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    const recommendations = this.getRecommendations();
    const pendingRecs = recommendations.filter(r => r.status === 'pending');
    const implementedRecs = recommendations.filter(r => r.status === 'implemented');

    report += '## Summary\n\n';
    report += `- Total Recommendations: ${recommendations.length}\n`;
    report += `- Pending: ${pendingRecs.length}\n`;
    report += `- Implemented: ${implementedRecs.length}\n`;
    report += `- Average Confidence: ${(recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendations.length).toFixed(1)}%\n\n`;

    // Pending recommendations
    if (pendingRecs.length > 0) {
      report += '## Pending Recommendations\n\n';
      
      for (const rec of pendingRecs.sort((a, b) => b.confidence - a.confidence)) {
        report += `### ${rec.contractName}.${rec.parameterName}\n\n`;
        report += `- **Current Value**: ${rec.currentValue}\n`;
        report += `- **Recommended Value**: ${rec.recommendedValue}\n`;
        report += `- **Confidence**: ${rec.confidence}%\n`;
        report += `- **Expected Impact**: ${rec.expectedImpact}\n`;
        report += `- **Based on**: ${rec.basedOnData.length} usage patterns\n\n`;
      }
    }

    // Implementation history
    if (implementedRecs.length > 0) {
      report += '## Implementation History\n\n';
      
      for (const rec of implementedRecs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())) {
        report += `- **${rec.contractName}.${rec.parameterName}**: ${rec.currentValue} → ${rec.recommendedValue} (${rec.createdAt.toDateString()})\n`;
      }
      report += '\n';
    }

    return report;
  }
}