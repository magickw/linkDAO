#!/usr/bin/env node

/**
 * Simplified Security Audit Script for X402PaymentHandler
 * Performs manual security analysis when Slither is not available
 */

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
      await this.analyzeContractSource();
      await this.checkAccessControls();
      await this.validateIntegerOperations();
      await this.checkEventEmissions();
      await this.analyzeGasUsage();
      await this.generateReport();
      
      console.log('✅ Security audit completed successfully!');
      console.log(`📄 Report saved to: ${this.reportPath}`);
    } catch (error) {
      console.error('❌ Security audit failed:', error.message);
      process.exit(1);
    }
  }

  async analyzeContractSource() {
    console.log('📄 Analyzing contract source code...');
    
    if (!fs.existsSync(this.contractPath)) {
      throw new Error(`Contract file not found: ${this.contractPath}`);
    }
    
    const contractSource = fs.readFileSync(this.contractPath, 'utf8');
    
    // Check for security patterns
    this.checkSecurityPatterns(contractSource);
    console.log('✅ Source code analysis completed');
  }

  checkSecurityPatterns(source) {
    // Check for reentrancy protection
    if (source.includes('payable') || source.includes('call')) {
      const hasReentrancyGuard = source.includes('nonReentrant');
      if (!hasReentrancyGuard) {
        this.issues.push({
          type: 'reentrancy',
          severity: 'high',
          description: 'External calls detected without reentrancy protection',
          location: 'Contract functions',
          recommendation: 'Add nonReentrant modifier to functions with external calls'
        });
      }
    }

    // Check for proper access control
    const criticalFunctions = ['confirmPayment', 'markPaymentFailed', 'refundPayment'];
    criticalFunctions.forEach(func => {
      const funcRegex = new RegExp(`function\\s+${func}`, 'i');
      if (funcRegex.test(source)) {
        const hasAccessControl = source.includes('onlyOwner') || source.includes('onlyTipRouter');
        if (!hasAccessControl) {
          this.issues.push({
            type: 'access-control',
            severity: 'high',
            description: `Critical function ${func} lacks access control`,
            recommendation: 'Add appropriate access control modifier'
          });
        }
      }
    });

    // Check for proper event emission
    const stateChanges = [
      { pattern: 'status = PaymentStatus.Completed', event: 'PaymentCompleted' },
      { pattern: 'status = PaymentStatus.Failed', event: 'PaymentFailed' }
    ];

    stateChanges.forEach(({ pattern, event }) => {
      if (source.includes(pattern) && !source.includes(`emit ${event}`)) {
        this.warnings.push({
          type: 'event',
          severity: 'medium',
          description: `Missing event emission for ${event}`,
          recommendation: 'Add event emission for transparency'
        });
      }
    });
  }

  async checkAccessControls() {
    console.log('🔒 Analyzing access controls...');
    
    const source = fs.readFileSync(this.contractPath, 'utf8');
    
    // Verify inheritance chain
    const hasOwnable = source.includes('is Ownable');
    const hasPausable = source.includes('is Pausable');
    
    if (!hasOwnable) {
      this.issues.push({
        type: 'access-control',
        severity: 'high',
        description: 'Contract does not inherit from Ownable',
        recommendation: 'Add Ownable inheritance for proper access control'
      });
    }

    if (!hasPausable) {
      this.warnings.push({
        type: 'access-control',
        severity: 'medium',
        description: 'Contract does not have pause functionality',
        recommendation: 'Consider adding Pausable for emergency stops'
      });
    }

    console.log('✅ Access control analysis completed');
  }

  async validateIntegerOperations() {
    console.log('🔢 Validating integer operations...');
    
    const source = fs.readFileSync(this.contractPath, 'utf8');
    
    // Check for SafeMath usage (older Solidity versions)
    const usesSafeMath = source.includes('SafeMath');
    const usesSolidity8 = source.includes('pragma solidity ^0.8.');
    
    if (!usesSolidity8 && !usesSafeMath) {
      this.warnings.push({
        type: 'integer-overflow',
        severity: 'medium',
        description: 'Potential integer overflow/underflow risk',
        recommendation: 'Use Solidity 0.8+ or SafeMath library'
      });
    }

    console.log('✅ Integer operations validation completed');
  }

  async checkEventEmissions() {
    console.log('📡 Checking event emissions...');
    
    const source = fs.readFileSync(this.contractPath, 'utf8');
    
    // Verify all critical operations emit events
    const requiredEvents = [
      'PaymentProcessed',
      'PaymentCompleted', 
      'PaymentFailed',
      'PaymentRefunded'
    ];

    requiredEvents.forEach(event => {
      if (!source.includes(`event ${event}`)) {
        this.issues.push({
          type: 'event',
          severity: 'medium',
          description: `Missing required event: ${event}`,
          recommendation: 'Add event for proper off-chain monitoring'
        });
      }
    });

    console.log('✅ Event emissions check completed');
  }

  async analyzeGasUsage() {
    console.log('⛽ Analyzing gas usage patterns...');
    
    const source = fs.readFileSync(this.contractPath, 'utf8');
    
    // Check for storage optimizations
    if (source.includes('struct') && source.includes('uint256')) {
      this.optimizations.push({
        type: 'gas',
        description: 'Consider using smaller uint types where possible',
        potentialSavings: 'Up to 50% per storage slot'
      });
    }

    // Check for loop optimizations
    if (source.includes('for(') && source.includes('.length')) {
      this.optimizations.push({
        type: 'gas',
        description: 'Cache array length in loops to reduce gas costs',
        potentialSavings: '3 gas per iteration'
      });
    }

    // Check for unnecessary storage operations
    if (source.includes('storage') && source.includes('memory')) {
      this.optimizations.push({
        type: 'gas',
        description: 'Use memory instead of storage for temporary variables',
        potentialSavings: 'Significant for complex operations'
      });
    }

    console.log('✅ Gas usage analysis completed');
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
      recommendations: this.generateRecommendations(),
      nextSteps: [
        'Address all high-severity issues before deployment',
        'Review warnings for potential improvements',
        'Consider gas optimizations for cost efficiency',
        'Conduct third-party security audit',
        'Test extensively on testnet'
      ]
    };
    
    fs.writeFileSync(this.reportPath, JSON.stringify(report, null, 2));
    
    // Print summary
    console.log('\n📋 Audit Summary:');
    console.log(`   Critical Issues: ${this.issues.filter(i => i.severity === 'high').length}`);
    console.log(`   Other Issues: ${this.issues.filter(i => i.severity !== 'high').length}`);
    console.log(`   Warnings: ${this.warnings.length}`);
    console.log(`   Optimizations: ${this.optimizations.length}`);
    console.log(`   Security Score: ${report.summary.securityScore}/100`);
    
    if (this.issues.length > 0) {
      console.log('\n⚠️  Critical Issues Found:');
      this.issues.forEach(issue => {
        console.log(`   - ${issue.description}`);
      });
    }
  }

  calculateSecurityScore() {
    let score = 100;
    
    // Deduct points for issues
    this.issues.forEach(issue => {
      if (issue.severity === 'high') score -= 25;
      else if (issue.severity === 'medium') score -= 15;
      else score -= 10;
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
      recommendations.push('IMMEDIATE: Address all critical security issues before production deployment');
    }
    
    if (this.warnings.length > 0) {
      recommendations.push('RECOMMENDED: Review warnings to improve contract security and maintainability');
    }
    
    if (this.optimizations.length > 0) {
      recommendations.push('OPTIONAL: Implement gas optimizations for cost efficiency');
    }
    
    recommendations.push('REQUIRED: Conduct third-party security audit before mainnet deployment');
    recommendations.push('REQUIRED: Comprehensive testing on testnet with real scenarios');
    recommendations.push('REQUIRED: Implement monitoring and alerting for production');
    
    return recommendations;
  }
}

// Run the audit
if (require.main === module) {
  const auditor = new SecurityAuditor();
  auditor.runFullAudit().catch(console.error);
}

module.exports = SecurityAuditor;