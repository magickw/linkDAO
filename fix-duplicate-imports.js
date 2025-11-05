#!/usr/bin/env node

/**
 * Fix Duplicate Import Errors
 * Clean up duplicate imports in index.ts
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing duplicate import errors...');

// Fix index.ts duplicate imports
const indexPath = path.join(__dirname, 'app/backend/src/index.ts');
let indexContent = fs.readFileSync(indexPath, 'utf8');

// Remove duplicate emergency CORS imports
const emergencyCorsImportRegex = /import { emergencyCorsMiddleware, emergencyPreflightHandler, emergencyCorsHeaders } from '\.\/middleware\/emergencyCorsMiddleware';\s*/g;
const matches = indexContent.match(emergencyCorsImportRegex);
if (matches && matches.length > 1) {
  // Keep only the first occurrence
  let firstFound = false;
  indexContent = indexContent.replace(emergencyCorsImportRegex, (match) => {
    if (!firstFound) {
      firstFound = true;
      return match;
    }
    return '';
  });
}

// Remove duplicate emergency health routes imports
const emergencyHealthImportRegex = /import emergencyHealthRoutes from '\.\/routes\/emergencyHealthRoutes';\s*/g;
const healthMatches = indexContent.match(emergencyHealthImportRegex);
if (healthMatches && healthMatches.length > 1) {
  // Keep only the first occurrence
  let firstFound = false;
  indexContent = indexContent.replace(emergencyHealthImportRegex, (match) => {
    if (!firstFound) {
      firstFound = true;
      return match;
    }
    return '';
  });
}

fs.writeFileSync(indexPath, indexContent);
console.log('✅ Fixed duplicate imports in index.ts');

// Fix serviceHealthMonitor.ts timeout issues
const serviceHealthMonitorPath = path.join(__dirname, 'app/backend/src/services/serviceHealthMonitor.ts');
if (fs.existsSync(serviceHealthMonitorPath)) {
  let serviceHealthContent = fs.readFileSync(serviceHealthMonitorPath, 'utf8');
  
  // Add timeout property to service registrations
  serviceHealthContent = serviceHealthContent.replace(
    /this\.registerService\(\{\s*name: '([^']+)',\s*checkFunction: ([^,]+),\s*interval: (\d+),\s*retryAttempts: (\d+),\s*criticalService: true\s*\}\);/g,
    `this.registerService({
      name: '$1',
      checkFunction: $2,
      interval: $3,
      retryAttempts: $4,
      timeout: 5000,
      criticalService: true
    });`
  );
  
  fs.writeFileSync(serviceHealthMonitorPath, serviceHealthContent);
  console.log('✅ Fixed serviceHealthMonitor timeout properties');
}

console.log('\n🎉 Duplicate import errors fixed!');
console.log('🚀 Try building again: cd app/backend && npm run build');