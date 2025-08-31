#!/usr/bin/env node

/**
 * Simple script to run the standalone admin configuration tests
 * This avoids compilation errors from the broader codebase
 */

const { execSync } = require('child_process');

console.log('🧪 Running Admin Configuration Standalone Tests...\n');

try {
  const result = execSync('npm test -- adminConfiguration.standalone.test.ts --verbose', {
    stdio: 'inherit',
    cwd: __dirname
  });
  
  console.log('\n✅ All admin configuration tests passed!');
} catch (error) {
  console.error('\n❌ Tests failed:', error.message);
  process.exit(1);
}