/**
 * Infrastructure Tests Runner
 * Runs all infrastructure tests for caching, API endpoints, WebSocket, and database operations
 */

import { execSync } from 'child_process';
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
    console.log('🚀 Starting Infrastructure Tests...\n');

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
    console.log(`📋 Running ${testFile}...`);
    const startTime = Date.now();

    try {
      const testPath = path.join(__dirname, testFile);
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

      console.log(`✅ ${testFile} passed (${duration}ms)\n`);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results.push({
        testFile,
        passed: false,
        duration,
        output: error.stdout || '',
        error: error.stderr || error.message
      });

      console.log(`❌ ${testFile} failed (${duration}ms)`);
      console.log(`Error: ${error.message}\n`);
    }
  }

  private printSummary(): void {
    console.log('\n📊 Infrastructure Tests Summary');
    console.log('================================');

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => !r.passed)
        .forEach(result => {
          console.log(`  - ${result.testFile}: ${result.error}`);
        });
    }

    console.log('\n📋 Detailed Results:');
    this.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`  ${status} ${result.testFile} (${result.duration}ms)`);
    });

    if (passed === total) {
      console.log('\n🎉 All infrastructure tests passed!');
      console.log('✨ Infrastructure is ready for production use.');
    } else {
      console.log('\n⚠️  Some infrastructure tests failed.');
      console.log('🔧 Please review and fix the failing tests before proceeding.');
      process.exit(1);
    }
  }

  async runSpecificTest(testName: string): Promise<void> {
    console.log(`🎯 Running specific test: ${testName}`);
    await this.runTest(testName);
    this.printSummary();
  }

  async runCacheTests(): Promise<void> {
    console.log('🗄️  Running Cache Tests...');
    await this.runTest('serviceWorkerCache.test.ts');
    this.printSummary();
  }

  async runApiTests(): Promise<void> {
    console.log('🌐 Running API Tests...');
    await this.runTest('apiEndpoints.integration.test.ts');
    this.printSummary();
  }

  async runWebSocketTests(): Promise<void> {
    console.log('🔌 Running WebSocket Tests...');
    await this.runTest('webSocket.test.ts');
    this.printSummary();
  }

  async runDatabaseTests(): Promise<void> {
    console.log('🗃️  Running Database Tests...');
    await this.runTest('database.test.ts');
    this.printSummary();
  }
}

// CLI interface
if (require.main === module) {
  const runner = new InfrastructureTestRunner();
  const args = process.argv.slice(2);

  if (args.length === 0) {
    runner.runAllTests().catch(console.error);
  } else {
    const command = args[0];
    
    switch (command) {
      case 'cache':
        runner.runCacheTests().catch(console.error);
        break;
      case 'api':
        runner.runApiTests().catch(console.error);
        break;
      case 'websocket':
        runner.runWebSocketTests().catch(console.error);
        break;
      case 'database':
        runner.runDatabaseTests().catch(console.error);
        break;
      default:
        if (command.endsWith('.test.ts')) {
          runner.runSpecificTest(command).catch(console.error);
        } else {
          console.log('Usage: npm run test:infrastructure [cache|api|websocket|database|<test-file>]');
          process.exit(1);
        }
    }
  }
}

export { InfrastructureTestRunner };