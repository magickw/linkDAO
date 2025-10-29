#!/usr/bin/env node

/**
 * Package Update Checker Script
 * 
 * This script checks for available updates to packages that are currently
 * vulnerable but have no fixes available, to monitor when fixes are released.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Packages to monitor for updates
const packagesToMonitor = [
  '@uniswap/v3-periphery',
  '@uniswap/smart-order-router',
  '@uniswap/v3-sdk',
  '@walletconnect/sign-client',
  '@walletconnect/universal-provider',
  '@reown/appkit'
];

console.log('🔍 Checking for package updates...');

const updateReport = {
  timestamp: new Date().toISOString(),
  packages: []
};

packagesToMonitor.forEach(pkg => {
  try {
    console.log(`Checking ${pkg}...`);
    
    // Get current installed version
    const listOutput = execSync(`npm list ${pkg} --depth=0`, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    
    const currentVersionMatch = listOutput.match(/(\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?)/);
    const currentVersion = currentVersionMatch ? currentVersionMatch[1] : 'unknown';
    
    // Get latest available version
    const viewOutput = execSync(`npm view ${pkg} version`, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    
    const latestVersion = viewOutput.trim();
    
    const isUpdateAvailable = currentVersion !== latestVersion && latestVersion !== 'unknown';
    
    updateReport.packages.push({
      name: pkg,
      currentVersion,
      latestVersion,
      updateAvailable: isUpdateAvailable
    });
    
    if (isUpdateAvailable) {
      console.log(`🆕 Update available for ${pkg}: ${currentVersion} → ${latestVersion}`);
    } else {
      console.log(`✅ ${pkg} is up to date (${currentVersion})`);
    }
  } catch (error) {
    console.error(`❌ Error checking ${pkg}:`, error.message);
    updateReport.packages.push({
      name: pkg,
      currentVersion: 'error',
      latestVersion: 'error',
      updateAvailable: false,
      error: error.message
    });
  }
});

// Save report
const projectRoot = path.join(__dirname, '..');
const reportPath = path.join(projectRoot, 'package-update-report.json');
fs.writeFileSync(reportPath, JSON.stringify(updateReport, null, 2));

console.log(`\n✅ Update check completed. Report saved to ${reportPath}`);

// Show summary
const updatesAvailable = updateReport.packages.filter(pkg => pkg.updateAvailable);
if (updatesAvailable.length > 0) {
  console.log('\n🆕 Updates available:');
  updatesAvailable.forEach(pkg => {
    console.log(`  ${pkg.name}: ${pkg.currentVersion} → ${pkg.latestVersion}`);
  });
} else {
  console.log('\n✅ All monitored packages are up to date.');
}