/**
 * Infrastructure Tests Runner
 * Runs all infrastructure tests for caching, API endpoints, WebSocket, and database operations
 */

import { execSync } from 'child_process';
import { safeLogger } from '../../utils/safeLogger';
import path from 'path';

interface TestResult {
  testFile: string;
  passed: boolean;
  duration: number;
  output: string;
  error?: string;
}

class InfrastructureTestRunner {
  private results: TestResult[] = [];

  async runAllTests(): Promise<void> {
    safeLogger.info('🚀 Starting Infrastructure Tests...\n');

    const testFiles = [
      'serviceWorkerCache.test.ts',
      'apiEndpoints.integration.test.ts',
      'webSocket.test.ts',
      'database.test.ts'
    ];

    for (const testFile of testFiles) {
      await this.runTest(testFile);
    }

    this.printSummary();
  }

  private async runTest(testFile: string): Promise<void> {
    safeLogger.info(`📋 Running ${testFile}...`);
    const startTime = Date.now();

    try {
      const testPath = path.join(process.cwd(), 'tests/infrastructure', testFile);
      const output = execSync(`npx jest ${testPath} --verbose --detectOpenHandles`, {
        encoding: 'utf8',
        timeout: 60000 // 1 minute timeout
      });

      const duration = Date.now() - startTime;
      
      this.results.push({
        testFile,
        passed: true,
        duration,
        output
      });

      safeLogger.info(`✅ ${testFile} passed (${duration}ms)\n`);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results.push({
        testFile,
        passed: false,
        duration,
        output: error.stdout || '',
        error: error.stderr || error.message
      });

      safeLogger.info(`❌ ${testFile} failed (${duration}ms)`);
      safeLogger.info(`Error: ${error.message}\n`);
    }
  }

  private printSummary(): void {
    safeLogger.info('\n📊 Infrastructure Tests Summary');
    safeLogger.info('================================');

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    safeLogger.info(`Total Tests: ${total}`);
    safeLogger.info(`Passed: ${passed}`);
    safeLogger.info(`Failed: ${failed}`);
    safeLogger.info(`Total Duration: ${totalDuration}ms`);
    safeLogger.info(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      safeLogger.info('\n❌ Failed Tests:');
      this.results
        .filter(r => !r.passed)
        .forEach(result => {
          safeLogger.info(`  - ${result.testFile}: ${result.error}`);
        });
    }

    safeLogger.info('\n📋 Detailed Results:');
    this.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      safeLogger.info(`  ${status} ${result.testFile} (${result.duration}ms)`);
    });

    if (passed === total) {
      safeLogger.info('\n🎉 All infrastructure tests passed!');
      safeLogger.info('✨ Infrastructure is ready for production use.');
    } else {
      safeLogger.info('\n⚠️  Some infrastructure tests failed.');
      safeLogger.info('🔧 Please review and fix the failing tests before proceeding.');
      process.exit(1);
    }
  }

  async runSpecificTest(testName: string): Promise<void> {
    safeLogger.info(`🎯 Running specific test: ${testName}`);
    await this.runTest(testName);
    this.printSummary();
  }

  async runCacheTests(): Promise<void> {
    safeLogger.info('🗄️  Running Cache Tests...');
    await this.runTest('serviceWorkerCache.test.ts');
    this.printSummary();
  }

  async runApiTests(): Promise<void> {
    safeLogger.info('🌐 Running API Tests...');
    await this.runTest('apiEndpoints.integration.test.ts');
    this.printSummary();
  }

  async runWebSocketTests(): Promise<void> {
    safeLogger.info('🔌 Running WebSocket Tests...');
    await this.runTest('webSocket.test.ts');
    this.printSummary();
  }

  async runDatabaseTests(): Promise<void> {
    safeLogger.info('🗃️  Running Database Tests...');
    await this.runTest('database.test.ts');
    this.printSummary();
  }
}

// CLI interface
if (require.main === module) {
  const runner = new InfrastructureTestRunner();
  const args = process.argv.slice(2);

  if (args.length === 0) {
    runner.runAllTests().catch(safeLogger.error);
  } else {
    const command = args[0];
    
    switch (command) {
      case 'cache':
        runner.runCacheTests().catch(safeLogger.error);
        break;
      case 'api':
        runner.runApiTests().catch(safeLogger.error);
        break;
      case 'websocket':
        runner.runWebSocketTests().catch(safeLogger.error);
        break;
      case 'database':
        runner.runDatabaseTests().catch(safeLogger.error);
        break;
      default:
        if (command.endsWith('.test.ts')) {
          runner.runSpecificTest(command).catch(safeLogger.error);
        } else {
          safeLogger.info('Usage: npm run test:infrastructure [cache|api|websocket|database|<test-file>]');
          process.exit(1);
        }
    }
  }
}

export { InfrastructureTestRunner };
