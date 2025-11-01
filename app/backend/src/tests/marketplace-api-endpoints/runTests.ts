#!/usr/bin/env ts-node

/**
 * Test Runner for Marketplace API Endpoints
 * 
 * This script runs the comprehensive test suite for marketplace API endpoints
 * including unit tests, integration tests, and end-to-end tests.
 */

import { execSync } from 'child_process';
import { safeLogger } from '../utils/safeLogger';
import path from 'path';

const testDir = path.join(__dirname);

interface TestSuite {
  name: string;
  pattern: string;
  description: string;
}

const testSuites: TestSuite[] = [
  {
    name: 'Unit Tests',
    pattern: '**/*.unit.test.ts',
    description: 'Service layer unit tests with mocked dependencies'
  },
  {
    name: 'Integration Tests', 
    pattern: '**/*.integration.test.ts',
    description: 'API endpoint integration tests'
  },
  {
    name: 'End-to-End Tests',
    pattern: '**/*.e2e.test.ts',
    description: 'Complete user workflow tests'
  }
];

function runTestSuite(suite: TestSuite, verbose: boolean = false): boolean {
  safeLogger.info(`\n🧪 Running ${suite.name}...`);
  safeLogger.info(`📝 ${suite.description}`);
  safeLogger.info('─'.repeat(60));

  try {
    const jestCommand = [
      'npx jest',
      `--testPathPattern="${testDir}/${suite.pattern}"`,
      '--verbose',
      '--coverage',
      '--detectOpenHandles',
      '--forceExit',
      verbose ? '--verbose' : '--silent'
    ].join(' ');

    execSync(jestCommand, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '../../../..') // Go to backend root
    });

    safeLogger.info(`✅ ${suite.name} completed successfully`);
    return true;
  } catch (error) {
    safeLogger.error(`❌ ${suite.name} failed`);
    if (verbose) {
      safeLogger.error(error);
    }
    return false;
  }
}

function runAllTests(options: { verbose?: boolean; suite?: string } = {}): void {
  safeLogger.info('🚀 Marketplace API Endpoints Test Suite');
  safeLogger.info('═'.repeat(60));
  
  const startTime = Date.now();
  let passedSuites = 0;
  let totalSuites = 0;

  // Filter test suites if specific suite requested
  const suitesToRun = options.suite 
    ? testSuites.filter(suite => suite.name.toLowerCase().includes(options.suite!.toLowerCase()))
    : testSuites;

  if (suitesToRun.length === 0) {
    safeLogger.error(`❌ No test suites found matching: ${options.suite}`);
    process.exit(1);
  }

  for (const suite of suitesToRun) {
    totalSuites++;
    if (runTestSuite(suite, options.verbose)) {
      passedSuites++;
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  safeLogger.info('\n' + '═'.repeat(60));
  safeLogger.info('📊 Test Results Summary');
  safeLogger.info('─'.repeat(60));
  safeLogger.info(`✅ Passed: ${passedSuites}/${totalSuites} test suites`);
  safeLogger.info(`⏱️  Duration: ${duration}s`);

  if (passedSuites === totalSuites) {
    safeLogger.info('🎉 All tests passed!');
    process.exit(0);
  } else {
    safeLogger.info('💥 Some tests failed!');
    process.exit(1);
  }
}

function showHelp(): void {
  safeLogger.info(`
🧪 Marketplace API Endpoints Test Runner

Usage:
  npm run test:marketplace-api              # Run all tests
  npm run test:marketplace-api -- --unit    # Run only unit tests
  npm run test:marketplace-api -- --integration # Run only integration tests
  npm run test:marketplace-api -- --e2e     # Run only end-to-end tests
  npm run test:marketplace-api -- --verbose # Run with verbose output
  npm run test:marketplace-api -- --help    # Show this help

Available Test Suites:
${testSuites.map(suite => `  • ${suite.name}: ${suite.description}`).join('\n')}

Examples:
  ts-node runTests.ts --unit --verbose
  ts-node runTests.ts --integration
  ts-node runTests.ts --e2e
`);
}

// Parse command line arguments
function parseArgs(): { verbose: boolean; suite?: string; help: boolean } {
  const args = process.argv.slice(2);
  
  return {
    verbose: args.includes('--verbose') || args.includes('-v'),
    help: args.includes('--help') || args.includes('-h'),
    suite: args.find(arg => ['--unit', '--integration', '--e2e'].includes(arg))?.replace('--', '')
  };
}

// Main execution
if (require.main === module) {
  const options = parseArgs();
  
  if (options.help) {
    showHelp();
    process.exit(0);
  }

  runAllTests(options);
}

export { runTestSuite, runAllTests };
