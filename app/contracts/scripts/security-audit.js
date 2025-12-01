#!/usr/bin/env node

/**
 * Security Audit Script for X402PaymentHandler
 * 
 * This script performs comprehensive security analysis including:
 * - Slither static analysis
 * - Gas optimization checks
 * - Reentrancy analysis
 * - Access control verification
 * - Integer overflow/underflow checks
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class SecurityAuditor {
  constructor() {
    this.contractPath = 'contracts/X402PaymentHandler.sol';
    this.reportPath = 'security-audit-report.json';
    this.issues = [];
    this.warnings = [];
    this.optimizations = [];
  }

  async runFullAudit() {
    console.log('🔍 Starting Security Audit for X402PaymentHandler...\n');

    try {
      await this.runSlitherAnalysis();
      await this.analyzeGasUsage();
      await this.checkAccessControls();
      await this.validateIntegerOperations();
      await this.checkEventEmissions();
      await this.generateReport();
      
      console.log('✅ Security audit completed successfully!');
      console.log(`📄 Report saved to: ${this.reportPath}`);
    } catch (error) {
      console.error('❌ Security audit failed:', error.message);
      process.exit(1);
    }
  }

  async runSlitherAnalysis() {
    console.log('🔬 Running Slither static analysis...');
    
    try {
      // Run slither with specific filters for X402PaymentHandler
      const output = execSync(
        `npx hardhat compile && slither ${this.contractPath} --json slither-report.json --filter-paths "node_modules/" --exclude naming-convention,external-function`,
        { encoding: 'utf8', timeout: 60000 }
      );
      
      if (fs.existsSync('slither-report.json')) {
        const slitherReport = JSON.parse(fs.readFileSync('slither-report.json', 'utf8'));
        this.processSlitherResults(slitherReport);
        fs.unlinkSync('slither-report.json'); // Clean up
      }
      
      console.log('✅ Slither analysis completed');
    } catch (error) {
      // Slither might find issues but still exit with error code
      if (fs.existsSync('slither-report.json')) {
        const slitherReport = JSON.parse(fs.readFileSync('slither-report.json', 'utf8'));
        this.processSlitherResults(slitherReport);
        fs.unlinkSync('slither-report.json');
        console.log('✅ Slither analysis completed with findings');
      } else {
        throw new Error('Slither analysis failed');
      }
    }
  }

  processSlitherResults(report) {
    if (report.results && report.results.detectors) {
      report.results.detectors.forEach(detector => {
        const issue = {
          type: detector.check,
          severity: detector.impact,
          description: detector.description,
          confidence: detector.confidence,
          elements: detector.elements || []
        };
        
        if (detector.impact === 'high' || detector.impact === 'medium') {
          this.issues.push(issue);
        } else {
          this.warnings.push(issue);
        }
      });
    }
  }

  async analyzeGasUsage() {
    console.log('⛽ Analyzing gas usage patterns...');
    
    // Check for potential gas optimizations
    const contractSource = fs.readFileSync(this.contractPath, 'utf8');
    
    // Check for storage optimizations
    if (contractSource.includes('mapping(') && contractSource.includes('struct')) {
      this.optimizations.push({
        type: 'gas',
        description: 'Consider using packed structs to reduce storage costs',
        potentialSavings: '15-30% per storage slot'
      });
    }
    
    // Check for loop optimizations
    if (contractSource.includes('for (') && contractSource.includes('.length')) {
      this.optimizations.push({
        type: 'gas',
        description: 'Consider caching array lengths in loops',
        potentialSavings: '3 gas per iteration'
      });
    }
    
    console.log('✅ Gas usage analysis completed');
  }

  async checkAccessControls() {
    console.log('🔒 Analyzing access controls...');
    
    const contractSource = fs.readFileSync(this.contractPath, 'utf8');
    
    // Check for proper access controls
    const criticalFunctions = [
      'confirmPayment',
      'markPaymentFailed',
      'refundPayment',
      'updateTipRouter',
      'pause',
      'unpause'
    ];
    
    criticalFunctions.forEach(func => {
      const regex = new RegExp(`function\\s+${func}\\s*\\([^)]*\\)\\s*([^\\n]*)`, 'i');
      const match = contractSource.match(regex);
      
      if (match && !match[1].includes('onlyOwner') && !match[1].includes('onlyTipRouter')) {
        this.issues.push({
          type: 'access-control',
          severity: 'high',
          description: `Function ${func} lacks proper access control`,
          recommendation: 'Add appropriate modifier (onlyOwner or onlyTipRouter)'
        });
      }
    });
    
    console.log('✅ Access control analysis completed');
  }

  async validateIntegerOperations() {
    console.log('🔢 Validating integer operations...');
    
    const contractSource = fs.readFileSync(this.contractPath, 'utf8');
    
    // Check for potential overflow/underflow
    if (contractSource.includes('uint256') && contractSource.includes('+') || contractSource.includes('-')) {
      // Solidity 0.8+ has built-in overflow protection, but we should check explicit handling
      if (!contractSource.includes('SafeMath') && !contractSource.includes('unchecked')) {
        this.optimizations.push({
          type: 'security',
          description: 'Consider using unchecked blocks for verified safe operations',
          benefit: 'Gas savings on arithmetic operations'
        });
      }
    }
    
    console.log('✅ Integer operations validation completed');
  }

  async checkEventEmissions() {
    console.log('📡 Checking event emissions...');
    
    const contractSource = fs.readFileSync(this.contractPath, 'utf8');
    
    // Check for critical state changes that should emit events
    const criticalStateChanges = [
      { pattern: 'status = PaymentStatus.Completed', event: 'PaymentCompleted' },
      { pattern: 'status = PaymentStatus.Failed', event: 'PaymentFailed' },
      { pattern: 'status = PaymentStatus.Refunded', event: 'PaymentRefunded' }
    ];
    
    criticalStateChanges.forEach(({ pattern, event }) => {
      if (contractSource.includes(pattern) && !contractSource.includes(`emit ${event}`)) {
        this.warnings.push({
          type: 'event',
          severity: 'medium',
          description: `State change detected without corresponding ${event} event`,
          recommendation: 'Add event emission for transparency'
        });
      }
    });
    
    console.log('✅ Event emissions check completed');
  }

  async generateReport() {
    console.log('📊 Generating security audit report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      contract: this.contractPath,
      summary: {
        totalIssues: this.issues.length,
        totalWarnings: this.warnings.length,
        totalOptimizations: this.optimizations.length,
        securityScore: this.calculateSecurityScore()
      },
      issues: this.issues,
      warnings: this.warnings,
      optimizations: this.optimizations,
      recommendations: this.generateRecommendations()
    };
    
    fs.writeFileSync(this.reportPath, JSON.stringify(report, null, 2));
    
    // Print summary
    console.log('\n📋 Audit Summary:');
    console.log(`   Issues: ${this.issues.length}`);
    console.log(`   Warnings: ${this.warnings.length}`);
    console.log(`   Optimizations: ${this.optimizations.length}`);
    console.log(`   Security Score: ${report.summary.securityScore}/100`);
  }

  calculateSecurityScore() {
    let score = 100;
    
    // Deduct points for issues
    this.issues.forEach(issue => {
      if (issue.severity === 'high') score -= 20;
      else if (issue.severity === 'medium') score -= 10;
      else score -= 5;
    });
    
    // Deduct fewer points for warnings
    this.warnings.forEach(warning => {
      if (warning.severity === 'medium') score -= 5;
      else score -= 2;
    });
    
    return Math.max(0, score);
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.issues.length > 0) {
      recommendations.push('IMMEDIATE: Address all high and medium severity issues before deployment');
    }
    
    if (this.warnings.length > 0) {
      recommendations.push('RECOMMENDED: Review and address warnings to improve code quality');
    }
    
    if (this.optimizations.length > 0) {
      recommendations.push('OPTIONAL: Implement gas optimizations for cost efficiency');
    }
    
    recommendations.push('ALWAYS: Conduct third-party security audit before mainnet deployment');
    recommendations.push('ALWAYS: Test extensively on testnet with real scenarios');
    
    return recommendations;
  }
}

// Run the audit
if (require.main === module) {
  const auditor = new SecurityAuditor();
  auditor.runFullAudit().catch(console.error);
}

module.exports = SecurityAuditor;