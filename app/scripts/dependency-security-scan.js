#!/usr/bin/env node

/**
 * Dependency Security Scanner
 * 
 * Scans the dependency tree for known vulnerable packages and generates a detailed report
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure we're in the correct directory
const projectRoot = path.join(__dirname, '..');
process.chdir(projectRoot);

console.log('🔍 Scanning dependencies for security issues...');

try {
  // Run npm audit with detailed output
  const auditOutput = execSync('npm audit --json', { 
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore']
  });
  
  const auditData = JSON.parse(auditOutput);
  
  // Generate detailed report
  const detailedReport = {
    timestamp: new Date().toISOString(),
    summary: {
      vulnerabilities: auditData.metadata.vulnerabilities,
      dependencies: auditData.metadata.dependencies,
      devDependencies: auditData.metadata.devDependencies,
      optionalDependencies: auditData.metadata.optionalDependencies,
      totalDependencies: auditData.metadata.dependencies + auditData.metadata.devDependencies
    },
    vulnerablePackages: []
  };
  
  // Process advisories
  Object.keys(auditData.advisories || {}).forEach(key => {
    const advisory = auditData.advisories[key];
    
    // Find affected paths
    const affectedPaths = [];
    if (advisory.findings && advisory.findings.length > 0) {
      advisory.findings.forEach(finding => {
        if (finding.paths && finding.paths.length > 0) {
          affectedPaths.push(...finding.paths);
        }
      });
    }
    
    detailedReport.vulnerablePackages.push({
      id: advisory.id,
      title: advisory.title,
      severity: advisory.severity,
      module_name: advisory.module_name,
      vulnerable_versions: advisory.vulnerable_versions,
      patched_versions: advisory.patched_versions,
      recommendation: advisory.recommendation,
      url: advisory.url,
      findings: advisory.findings,
      affected_paths: affectedPaths.slice(0, 10), // Limit to first 10 paths
      cwe: advisory.cwe || [],
      cvss: advisory.cvss
    });
  });
  
  // Sort by severity
  detailedReport.vulnerablePackages.sort((a, b) => {
    const severityOrder = { critical: 4, high: 3, moderate: 2, low: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });
  
  // Save detailed report
  const detailedReportPath = path.join(projectRoot, 'detailed-security-report.json');
  fs.writeFileSync(detailedReportPath, JSON.stringify(detailedReport, null, 2));
  
  // Generate summary report
  const summaryReport = {
    timestamp: detailedReport.timestamp,
    totalVulnerabilities: detailedReport.summary.vulnerabilities.total,
    critical: detailedReport.summary.vulnerabilities.critical,
    high: detailedReport.summary.vulnerabilities.high,
    moderate: detailedReport.summary.vulnerabilities.moderate,
    low: detailedReport.summary.vulnerabilities.low,
    vulnerablePackages: detailedReport.vulnerablePackages.map(pkg => ({
      name: pkg.module_name,
      severity: pkg.severity,
      title: pkg.title,
      recommendation: pkg.recommendation
    }))
  };
  
  // Save summary report
  const summaryReportPath = path.join(projectRoot, 'security-summary-report.json');
  fs.writeFileSync(summaryReportPath, JSON.stringify(summaryReport, null, 2));
  
  console.log(`✅ Security scan completed.`);
  console.log(`📊 Total vulnerabilities: ${summaryReport.totalVulnerabilities}`);
  console.log(`🔴 Critical: ${summaryReport.critical}`);
  console.log(`🟠 High: ${summaryReport.high}`);
  console.log(`🟡 Moderate: ${summaryReport.moderate}`);
  console.log(`🟢 Low: ${summaryReport.low}`);
  console.log(`\n📁 Reports saved:`);
  console.log(`   Detailed: ${detailedReportPath}`);
  console.log(`   Summary: ${summaryReportPath}`);
  
  // If critical vulnerabilities found, show them
  if (summaryReport.critical > 0) {
    console.log('\n🚨 CRITICAL VULNERABILITIES DETECTED:');
    detailedReport.vulnerablePackages
      .filter(pkg => pkg.severity === 'critical')
      .forEach(pkg => {
        console.log(`   - ${pkg.module_name}: ${pkg.title}`);
        console.log(`     Recommendation: ${pkg.recommendation}`);
        console.log(`     More info: ${pkg.url}`);
      });
  }
  
  // Show high severity vulnerabilities
  if (summaryReport.high > 0) {
    console.log('\n🟠 HIGH SEVERITY VULNERABILITIES:');
    detailedReport.vulnerablePackages
      .filter(pkg => pkg.severity === 'high')
      .forEach(pkg => {
        console.log(`   - ${pkg.module_name}: ${pkg.title}`);
      });
  }
  
} catch (error) {
  if (error.stdout && error.stdout.includes('"auditReportVersion"')) {
    // This means npm audit found vulnerabilities, which is expected
    try {
      const auditData = JSON.parse(error.stdout);
      
      // Generate detailed report
      const detailedReport = {
        timestamp: new Date().toISOString(),
        summary: {
          vulnerabilities: auditData.metadata.vulnerabilities,
          dependencies: auditData.metadata.dependencies,
          devDependencies: auditData.metadata.devDependencies,
          optionalDependencies: auditData.metadata.optionalDependencies,
          totalDependencies: auditData.metadata.dependencies + auditData.metadata.devDependencies
        },
        vulnerablePackages: []
      };
      
      // Process advisories
      Object.keys(auditData.advisories || {}).forEach(key => {
        const advisory = auditData.advisories[key];
        
        // Find affected paths
        const affectedPaths = [];
        if (advisory.findings && advisory.findings.length > 0) {
          advisory.findings.forEach(finding => {
            if (finding.paths && finding.paths.length > 0) {
              affectedPaths.push(...finding.paths);
            }
          });
        }
        
        detailedReport.vulnerablePackages.push({
          id: advisory.id,
          title: advisory.title,
          severity: advisory.severity,
          module_name: advisory.module_name,
          vulnerable_versions: advisory.vulnerable_versions,
          patched_versions: advisory.patched_versions,
          recommendation: advisory.recommendation,
          url: advisory.url,
          findings: advisory.findings,
          affected_paths: affectedPaths.slice(0, 10), // Limit to first 10 paths
          cwe: advisory.cwe || [],
          cvss: advisory.cvss
        });
      });
      
      // Sort by severity
      detailedReport.vulnerablePackages.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, moderate: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });
      
      // Save detailed report
      const detailedReportPath = path.join(projectRoot, 'detailed-security-report.json');
      fs.writeFileSync(detailedReportPath, JSON.stringify(detailedReport, null, 2));
      
      // Generate summary report
      const summaryReport = {
        timestamp: detailedReport.timestamp,
        totalVulnerabilities: detailedReport.summary.vulnerabilities.total,
        critical: detailedReport.summary.vulnerabilities.critical,
        high: detailedReport.summary.vulnerabilities.high,
        moderate: detailedReport.summary.vulnerabilities.moderate,
        low: detailedReport.summary.vulnerabilities.low,
        vulnerablePackages: detailedReport.vulnerablePackages.map(pkg => ({
          name: pkg.module_name,
          severity: pkg.severity,
          title: pkg.title,
          recommendation: pkg.recommendation
        }))
      };
      
      // Save summary report
      const summaryReportPath = path.join(projectRoot, 'security-summary-report.json');
      fs.writeFileSync(summaryReportPath, JSON.stringify(summaryReport, null, 2));
      
      console.log(`✅ Security scan completed.`);
      console.log(`📊 Total vulnerabilities: ${summaryReport.totalVulnerabilities}`);
      console.log(`🔴 Critical: ${summaryReport.critical}`);
      console.log(`🟠 High: ${summaryReport.high}`);
      console.log(`🟡 Moderate: ${summaryReport.moderate}`);
      console.log(`🟢 Low: ${summaryReport.low}`);
      console.log(`\n📁 Reports saved:`);
      console.log(`   Detailed: ${detailedReportPath}`);
      console.log(`   Summary: ${summaryReportPath}`);
      
      // If critical vulnerabilities found, show them
      if (summaryReport.critical > 0) {
        console.log('\n🚨 CRITICAL VULNERABILITIES DETECTED:');
        detailedReport.vulnerablePackages
          .filter(pkg => pkg.severity === 'critical')
          .forEach(pkg => {
            console.log(`   - ${pkg.module_name}: ${pkg.title}`);
            console.log(`     Recommendation: ${pkg.recommendation}`);
            console.log(`     More info: ${pkg.url}`);
          });
      }
      
      // Show high severity vulnerabilities
      if (summaryReport.high > 0) {
        console.log('\n🟠 HIGH SEVERITY VULNERABILITIES:');
        detailedReport.vulnerablePackages
          .filter(pkg => pkg.severity === 'high')
          .forEach(pkg => {
            console.log(`   - ${pkg.module_name}: ${pkg.title}`);
          });
      }
    } catch (parseError) {
      console.error('❌ Error parsing audit output:', parseError);
      process.exit(1);
    }
  } else {
    console.error('❌ Error running security scan:', error.message);
    process.exit(1);
  }
}