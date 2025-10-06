import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  testFile: string;
  passed: boolean;
  duration: number;
  coverage?: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  errors?: string[];
}

interface TestSuite {
  name: string;
  description: string;
  testFiles: string[];
  requirements: string[];
}

class MessagingTestRunner {
  private testSuites: TestSuite[] = [
    {
      name: 'Unit Tests - Encryption Service',
      description: 'Tests for message encryption and decryption functionality',
      testFiles: [
        'app/frontend/src/services/__tests__/messageEncryptionService.test.ts'
      ],
      requirements: ['3.1', '3.2', '3.3']
    },
    {
      name: 'Unit Tests - Conversation Management',
      description: 'Tests for conversation management operations',
      testFiles: [
        'app/frontend/src/services/__tests__/conversationManagementService.test.ts'
      ],
      requirements: ['3.1', '3.2']
    },
    {
      name: 'Unit Tests - Offline Message Queue',
      description: 'Tests for offline message queuing and synchronization',
      testFiles: [
        'app/frontend/src/services/__tests__/offlineMessageQueueService.test.ts'
      ],
      requirements: ['3.1', '3.2']
    },
    {
      name: 'Integration Tests - Conversation Workflows',
      description: 'End-to-end tests for complete conversation workflows',
      testFiles: [
        'app/frontend/src/__tests__/integration/messaging/conversationWorkflows.integration.test.tsx'
      ],
      requirements: ['3.1', '3.2', '3.3']
    },
    {
      name: 'Security Tests - Encryption Security',
      description: 'Security tests for encryption and message handling',
      testFiles: [
        'app/frontend/src/__tests__/security/messaging/encryptionSecurity.test.ts'
      ],
      requirements: ['8.1', '8.2']
    },
    {
      name: 'Security Tests - Key Management',
      description: 'Security tests for key management and storage',
      testFiles: [
        'app/frontend/src/__tests__/security/messaging/keyManagementSecurity.test.ts'
      ],
      requirements: ['8.1', '8.2']
    }
  ];

  private results: TestResult[] = [];

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Messaging System Test Suite');
    console.log('=====================================\n');

    const startTime = Date.now();

    for (const suite of this.testSuites) {
      await this.runTestSuite(suite);
    }

    const totalTime = Date.now() - startTime;
    this.generateReport(totalTime);
  }

  private async runTestSuite(suite: TestSuite): Promise<void> {
    console.log(`📋 Running ${suite.name}`);
    console.log(`   ${suite.description}`);
    console.log(`   Requirements: ${suite.requirements.join(', ')}\n`);

    for (const testFile of suite.testFiles) {
      await this.runSingleTest(testFile);
    }

    console.log('');
  }

  private async runSingleTest(testFile: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`   ⏳ Running ${path.basename(testFile)}...`);
      
      // Run Jest with coverage for this specific test file
      const command = `npx jest "${testFile}" --coverage --coverageReporters=json --silent`;
      
      const output = execSync(command, { 
        encoding: 'utf8',
        cwd: process.cwd(),
        timeout: 60000 // 60 second timeout
      });

      const duration = Date.now() - startTime;
      
      // Parse coverage data if available
      let coverage;
      try {
        const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-final.json');
        if (fs.existsSync(coveragePath)) {
          const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
          coverage = this.extractCoverageMetrics(coverageData);
        }
      } catch (e) {
        // Coverage parsing failed, continue without it
      }

      this.results.push({
        testFile,
        passed: true,
        duration,
        coverage
      });

      console.log(`   ✅ ${path.basename(testFile)} - PASSED (${duration}ms)`);
      
      if (coverage) {
        console.log(`      Coverage: ${coverage.statements}% statements, ${coverage.branches}% branches`);
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.results.push({
        testFile,
        passed: false,
        duration,
        errors: [errorMessage]
      });

      console.log(`   ❌ ${path.basename(testFile)} - FAILED (${duration}ms)`);
      console.log(`      Error: ${errorMessage.split('\n')[0]}`);
    }
  }

  private extractCoverageMetrics(coverageData: any): TestResult['coverage'] {
    const files = Object.keys(coverageData);
    if (files.length === 0) return undefined;

    let totalStatements = 0;
    let coveredStatements = 0;
    let totalBranches = 0;
    let coveredBranches = 0;
    let totalFunctions = 0;
    let coveredFunctions = 0;
    let totalLines = 0;
    let coveredLines = 0;

    files.forEach(file => {
      const fileCoverage = coverageData[file];
      
      // Statements
      totalStatements += Object.keys(fileCoverage.s || {}).length;
      coveredStatements += Object.values(fileCoverage.s || {}).filter(count => (count as number) > 0).length;
      
      // Branches
      totalBranches += Object.keys(fileCoverage.b || {}).length;
      coveredBranches += Object.values(fileCoverage.b || {}).filter(branches => 
        (branches as number[]).some(count => count > 0)
      ).length;
      
      // Functions
      totalFunctions += Object.keys(fileCoverage.f || {}).length;
      coveredFunctions += Object.values(fileCoverage.f || {}).filter(count => (count as number) > 0).length;
      
      // Lines
      const lineNumbers = Object.keys(fileCoverage.l || {});
      totalLines += lineNumbers.length;
      coveredLines += lineNumbers.filter(line => fileCoverage.l[line] > 0).length;
    });

    return {
      statements: totalStatements > 0 ? Math.round((coveredStatements / totalStatements) * 100) : 0,
      branches: totalBranches > 0 ? Math.round((coveredBranches / totalBranches) * 100) : 0,
      functions: totalFunctions > 0 ? Math.round((coveredFunctions / totalFunctions) * 100) : 0,
      lines: totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 0,
    };
  }

  private generateReport(totalTime: number): void {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => r.passed === false).length;
    const total = this.results.length;

    console.log('\n📊 Test Results Summary');
    console.log('=======================');
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ${failed > 0 ? '❌' : ''}`);
    console.log(`Success Rate: ${Math.round((passed / total) * 100)}%`);
    console.log(`Total Time: ${totalTime}ms`);

    // Coverage summary
    const coverageResults = this.results.filter(r => r.coverage);
    if (coverageResults.length > 0) {
      const avgCoverage = {
        statements: Math.round(coverageResults.reduce((sum, r) => sum + (r.coverage?.statements || 0), 0) / coverageResults.length),
        branches: Math.round(coverageResults.reduce((sum, r) => sum + (r.coverage?.branches || 0), 0) / coverageResults.length),
        functions: Math.round(coverageResults.reduce((sum, r) => sum + (r.coverage?.functions || 0), 0) / coverageResults.length),
        lines: Math.round(coverageResults.reduce((sum, r) => sum + (r.coverage?.lines || 0), 0) / coverageResults.length),
      };

      console.log('\n📈 Coverage Summary');
      console.log('==================');
      console.log(`Statements: ${avgCoverage.statements}%`);
      console.log(`Branches: ${avgCoverage.branches}%`);
      console.log(`Functions: ${avgCoverage.functions}%`);
      console.log(`Lines: ${avgCoverage.lines}%`);
    }

    // Failed tests details
    const failedTests = this.results.filter(r => !r.passed);
    if (failedTests.length > 0) {
      console.log('\n❌ Failed Tests');
      console.log('===============');
      failedTests.forEach(test => {
        console.log(`${path.basename(test.testFile)}:`);
        test.errors?.forEach(error => {
          console.log(`  - ${error.split('\n')[0]}`);
        });
      });
    }

    // Requirements coverage
    console.log('\n📋 Requirements Coverage');
    console.log('========================');
    const allRequirements = [...new Set(this.testSuites.flatMap(suite => suite.requirements))];
    
    allRequirements.forEach(req => {
      const suitesForReq = this.testSuites.filter(suite => suite.requirements.includes(req));
      const testsForReq = suitesForReq.flatMap(suite => suite.testFiles);
      const passedTestsForReq = testsForReq.filter(testFile => 
        this.results.find(r => r.testFile === testFile)?.passed
      );
      
      const coverage = testsForReq.length > 0 ? Math.round((passedTestsForReq.length / testsForReq.length) * 100) : 0;
      const status = coverage === 100 ? '✅' : coverage > 0 ? '⚠️' : '❌';
      
      console.log(`Requirement ${req}: ${coverage}% ${status}`);
    });

    // Generate JSON report
    this.generateJSONReport(totalTime);

    console.log('\n🎉 Test execution completed!');
    
    if (failed > 0) {
      console.log('⚠️  Some tests failed. Please review the errors above.');
      process.exit(1);
    } else {
      console.log('✨ All tests passed successfully!');
    }
  }

  private generateJSONReport(totalTime: number): void {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.passed).length,
        failed: this.results.filter(r => !r.passed).length,
        totalTime,
        successRate: Math.round((this.results.filter(r => r.passed).length / this.results.length) * 100)
      },
      testSuites: this.testSuites.map(suite => ({
        name: suite.name,
        description: suite.description,
        requirements: suite.requirements,
        results: suite.testFiles.map(testFile => 
          this.results.find(r => r.testFile === testFile)
        )
      })),
      coverage: this.calculateOverallCoverage(),
      requirements: this.calculateRequirementsCoverage()
    };

    const reportPath = path.join(process.cwd(), 'messaging-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }

  private calculateOverallCoverage() {
    const coverageResults = this.results.filter(r => r.coverage);
    if (coverageResults.length === 0) return null;

    return {
      statements: Math.round(coverageResults.reduce((sum, r) => sum + (r.coverage?.statements || 0), 0) / coverageResults.length),
      branches: Math.round(coverageResults.reduce((sum, r) => sum + (r.coverage?.branches || 0), 0) / coverageResults.length),
      functions: Math.round(coverageResults.reduce((sum, r) => sum + (r.coverage?.functions || 0), 0) / coverageResults.length),
      lines: Math.round(coverageResults.reduce((sum, r) => sum + (r.coverage?.lines || 0), 0) / coverageResults.length),
    };
  }

  private calculateRequirementsCoverage() {
    const allRequirements = [...new Set(this.testSuites.flatMap(suite => suite.requirements))];
    
    return allRequirements.map(req => {
      const suitesForReq = this.testSuites.filter(suite => suite.requirements.includes(req));
      const testsForReq = suitesForReq.flatMap(suite => suite.testFiles);
      const passedTestsForReq = testsForReq.filter(testFile => 
        this.results.find(r => r.testFile === testFile)?.passed
      );
      
      return {
        requirement: req,
        coverage: testsForReq.length > 0 ? Math.round((passedTestsForReq.length / testsForReq.length) * 100) : 0,
        totalTests: testsForReq.length,
        passedTests: passedTestsForReq.length
      };
    });
  }
}

// CLI execution
if (require.main === module) {
  const runner = new MessagingTestRunner();
  runner.runAllTests().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

export { MessagingTestRunner };