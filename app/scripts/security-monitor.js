#!/usr/bin/env node

/**
 * Security Monitoring Script
 * 
 * This script monitors for security vulnerabilities in the project dependencies
 * and generates reports for tracking purposes.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure we're in the correct directory
const projectRoot = path.join(__dirname, '..');
process.chdir(projectRoot);

console.log('🔍 Running security audit...');

try {
  // Run npm audit and capture output
  const auditOutput = execSync('npm audit --json', { 
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore']
  });
  
  const auditData = JSON.parse(auditOutput);
  
  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    vulnerabilities: {
      total: auditData.metadata.vulnerabilities.total,
      low: auditData.metadata.vulnerabilities.low,
      moderate: auditData.metadata.vulnerabilities.moderate,
      high: auditData.metadata.vulnerabilities.high,
      critical: auditData.metadata.vulnerabilities.critical
    },
    advisories: []
  };
  
  // Extract advisory information
  Object.keys(auditData.advisories || {}).forEach(key => {
    const advisory = auditData.advisories[key];
    report.advisories.push({
      id: advisory.id,
      title: advisory.title,
      severity: advisory.severity,
      vulnerable_versions: advisory.vulnerable_versions,
      patched_versions: advisory.patched_versions,
      recommendation: advisory.recommendation
    });
  });
  
  // Save report
  const reportPath = path.join(projectRoot, 'security-audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`✅ Security audit completed. Report saved to ${reportPath}`);
  console.log(`📊 Vulnerabilities found: ${report.vulnerabilities.total}`);
  console.log(`🔴 Critical: ${report.vulnerabilities.critical}`);
  console.log(`🟠 High: ${report.vulnerabilities.high}`);
  console.log(`🟡 Moderate: ${report.vulnerabilities.moderate}`);
  console.log(`🟢 Low: ${report.vulnerabilities.low}`);
  
  // If critical vulnerabilities found, exit with error code
  if (report.vulnerabilities.critical > 0) {
    console.log('🚨 CRITICAL VULNERABILITIES DETECTED!');
    process.exit(1);
  }
} catch (error) {
  if (error.stdout && error.stdout.includes('"auditReportVersion"')) {
    // This means npm audit found vulnerabilities
    try {
      const auditData = JSON.parse(error.stdout);
      
      // Generate report even when vulnerabilities are found
      const report = {
        timestamp: new Date().toISOString(),
        vulnerabilities: {
          total: auditData.metadata.vulnerabilities.total,
          low: auditData.metadata.vulnerabilities.low,
          moderate: auditData.metadata.vulnerabilities.moderate,
          high: auditData.metadata.vulnerabilities.high,
          critical: auditData.metadata.vulnerabilities.critical
        },
        advisories: []
      };
      
      // Extract advisory information
      Object.keys(auditData.advisories || {}).forEach(key => {
        const advisory = auditData.advisories[key];
        report.advisories.push({
          id: advisory.id,
          title: advisory.title,
          severity: advisory.severity,
          vulnerable_versions: advisory.vulnerable_versions,
          patched_versions: advisory.patched_versions,
          recommendation: advisory.recommendation
        });
      });
      
      // Save report
      const reportPath = path.join(projectRoot, 'security-audit-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      
      console.log(`✅ Security audit completed. Report saved to ${reportPath}`);
      console.log(`📊 Vulnerabilities found: ${report.vulnerabilities.total}`);
      console.log(`🔴 Critical: ${report.vulnerabilities.critical}`);
      console.log(`🟠 High: ${report.vulnerabilities.high}`);
      console.log(`🟡 Moderate: ${report.vulnerabilities.moderate}`);
      console.log(`🟢 Low: ${report.vulnerabilities.low}`);
      
      // If critical vulnerabilities found, exit with error code
      if (report.vulnerabilities.critical > 0) {
        console.log('🚨 CRITICAL VULNERABILITIES DETECTED!');
        process.exit(1);
      }
    } catch (parseError) {
      console.error('❌ Error parsing audit output:', parseError);
      process.exit(1);
    }
  } else {
    console.error('❌ Error running security audit:', error.message);
    process.exit(1);
  }
}