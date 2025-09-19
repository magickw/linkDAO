import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

export class TestRunner {
  private testResults: Record<string, any> = {};
  private coverageThreshold = 90; // 90% minimum coverage

  async runAllTests(): Promise<void> {
    console.log("🚀 Starting Comprehensive Test Suite...\n");

    try {
      // Run unit tests
      await this.runUnitTests();
      
      // Run integration tests
      await this.runIntegrationTests();
      
      // Run security tests
      await this.runSecurityTests();
      
      // Run gas optimization tests
      await this.runGasTests();
      
      // Generate coverage report
      await this.generateCoverageReport();
      
      // Generate final report
      await this.generateFinalReport();
      
    } catch (error) {
      console.error("❌ Test suite failed:", error);
      process.exit(1);
    }
  }

  private async runUnitTests(): Promise<void> {
    console.log("📋 Running Unit Tests...");
    try {
      const { stdout, stderr } = await execAsync("npx hardhat test test/comprehensive/UnitTests.test.ts");
      this.testResults.unitTests = {
        status: "passed",
        output: stdout,
        errors: stderr
      };
      console.log("✅ Unit Tests Passed\n");
    } catch (error) {
      this.testResults.unitTests = {
        status: "failed",
        error: error
      };
      console.log("❌ Unit Tests Failed\n");
      throw error;
    }
  }

  private async runIntegrationTests(): Promise<void> {
    console.log("🔗 Running Integration Tests...");
    try {
      const { stdout, stderr } = await execAsync("npx hardhat test test/comprehensive/IntegrationTests.test.ts");
      this.testResults.integrationTests = {
        status: "passed",
        output: stdout,
        errors: stderr
      };
      console.log("✅ Integration Tests Passed\n");
    } catch (error) {
      this.testResults.integrationTests = {
        status: "failed",
        error: error
      };
      console.log("❌ Integration Tests Failed\n");
      throw error;
    }
  }

  private async runSecurityTests(): Promise<void> {
    console.log("🔒 Running Security Tests...");
    try {
      const { stdout, stderr } = await execAsync("npx hardhat test test/comprehensive/SecurityTests.test.ts");
      this.testResults.securityTests = {
        status: "passed",
        output: stdout,
        errors: stderr
      };
      console.log("✅ Security Tests Passed\n");
    } catch (error) {
      this.testResults.securityTests = {
        status: "failed",
        error: error
      };
      console.log("❌ Security Tests Failed\n");
      throw error;
    }
  }

  private async runGasTests(): Promise<void> {
    console.log("⛽ Running Gas Optimization Tests...");
    try {
      const { stdout, stderr } = await execAsync("REPORT_GAS=true npx hardhat test test/comprehensive/GasOptimizationTests.test.ts");
      this.testResults.gasTests = {
        status: "passed",
        output: stdout,
        errors: stderr
      };
      console.log("✅ Gas Optimization Tests Passed\n");
    } catch (error) {
      this.testResults.gasTests = {
        status: "failed",
        error: error
      };
      console.log("❌ Gas Optimization Tests Failed\n");
      throw error;
    }
  }

  private async generateCoverageReport(): Promise<void> {
    console.log("📊 Generating Coverage Report...");
    try {
      const { stdout, stderr } = await execAsync("npx hardhat coverage");
      
      // Parse coverage results
      const coverageData = await this.parseCoverageResults();
      this.testResults.coverage = coverageData;
      
      if (coverageData.totalCoverage < this.coverageThreshold) {
        console.log(`⚠️  Coverage ${coverageData.totalCoverage}% is below threshold ${this.coverageThreshold}%`);
      } else {
        console.log(`✅ Coverage ${coverageData.totalCoverage}% meets threshold\n`);
      }
    } catch (error) {
      console.log("❌ Coverage generation failed:", error);
      this.testResults.coverage = { error: error };
    }
  }

  private async parseCoverageResults(): Promise<any> {
    try {
      const coveragePath = path.join(process.cwd(), "coverage", "coverage-summary.json");
      if (fs.existsSync(coveragePath)) {
        const coverageData = JSON.parse(fs.readFileSync(coveragePath, "utf8"));
        return {
          totalCoverage: coverageData.total.lines.pct,
          statements: coverageData.total.statements.pct,
          branches: coverageData.total.branches.pct,
          functions: coverageData.total.functions.pct,
          lines: coverageData.total.lines.pct
        };
      }
    } catch (error) {
      console.log("Could not parse coverage results:", error);
    }
    return { totalCoverage: 0, error: "Could not parse coverage" };
  }

  private async generateFinalReport(): Promise<void> {
    console.log("📄 Generating Final Test Report...\n");
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        unitTests: this.testResults.unitTests?.status || "not run",
        integrationTests: this.testResults.integrationTests?.status || "not run",
        securityTests: this.testResults.securityTests?.status || "not run",
        gasTests: this.testResults.gasTests?.status || "not run",
        coverage: this.testResults.coverage?.totalCoverage || 0
      },
      details: this.testResults,
      recommendations: this.generateRecommendations()
    };

    // Save report to file
    const reportPath = path.join(process.cwd(), "test-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Print summary
    this.printSummary(report);
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.testResults.coverage?.totalCoverage < this.coverageThreshold) {
      recommendations.push(`Increase test coverage from ${this.testResults.coverage.totalCoverage}% to at least ${this.coverageThreshold}%`);
    }
    
    if (this.testResults.securityTests?.status !== "passed") {
      recommendations.push("Address security test failures before deployment");
    }
    
    if (this.testResults.gasTests?.status === "passed") {
      recommendations.push("Review gas optimization report for potential improvements");
    }
    
    return recommendations;
  }

  private printSummary(report: any): void {
    console.log("=".repeat(60));
    console.log("                    TEST SUMMARY");
    console.log("=".repeat(60));
    console.log(`Unit Tests:        ${this.getStatusEmoji(report.summary.unitTests)} ${report.summary.unitTests}`);
    console.log(`Integration Tests: ${this.getStatusEmoji(report.summary.integrationTests)} ${report.summary.integrationTests}`);
    console.log(`Security Tests:    ${this.getStatusEmoji(report.summary.securityTests)} ${report.summary.securityTests}`);
    console.log(`Gas Tests:         ${this.getStatusEmoji(report.summary.gasTests)} ${report.summary.gasTests}`);
    console.log(`Coverage:          ${this.getCoverageEmoji(report.summary.coverage)} ${report.summary.coverage}%`);
    console.log("=".repeat(60));
    
    if (report.recommendations.length > 0) {
      console.log("\n📋 RECOMMENDATIONS:");
      report.recommendations.forEach((rec: string, index: number) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }
    
    console.log(`\n📄 Full report saved to: test-report.json`);
    console.log("=".repeat(60));
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case "passed": return "✅";
      case "failed": return "❌";
      default: return "⚠️";
    }
  }

  private getCoverageEmoji(coverage: number): string {
    if (coverage >= this.coverageThreshold) return "✅";
    if (coverage >= 70) return "⚠️";
    return "❌";
  }

  async runStaticAnalysis(): Promise<void> {
    console.log("🔍 Running Static Analysis...");
    
    try {
      // Run Slither if available
      try {
        const { stdout } = await execAsync("slither . --json slither-report.json");
        console.log("✅ Slither analysis completed");
        this.testResults.slither = { status: "completed", output: stdout };
      } catch (error) {
        console.log("⚠️  Slither not available or failed");
        this.testResults.slither = { status: "not available" };
      }
      
      // Run Solhint
      try {
        const { stdout } = await execAsync("npx solhint 'contracts/**/*.sol'");
        console.log("✅ Solhint analysis completed");
        this.testResults.solhint = { status: "completed", output: stdout };
      } catch (error) {
        console.log("⚠️  Solhint analysis found issues");
        this.testResults.solhint = { status: "issues found", error: error };
      }
      
    } catch (error) {
      console.log("❌ Static analysis failed:", error);
    }
  }

  async runPerformanceBenchmarks(): Promise<void> {
    console.log("🏃 Running Performance Benchmarks...");
    
    try {
      // Run gas reporter
      const { stdout } = await execAsync("REPORT_GAS=true npx hardhat test --grep 'gas'");
      
      // Parse gas report
      const gasReport = this.parseGasReport(stdout);
      this.testResults.performance = gasReport;
      
      console.log("✅ Performance benchmarks completed");
    } catch (error) {
      console.log("❌ Performance benchmarks failed:", error);
      this.testResults.performance = { error: error };
    }
  }

  private parseGasReport(output: string): any {
    // Parse gas reporter output
    const gasLines = output.split('\n').filter(line => line.includes('gas'));
    const gasData: Record<string, number> = {};
    
    gasLines.forEach(line => {
      const match = line.match(/(\w+).*?(\d+)\s+gas/);
      if (match) {
        gasData[match[1]] = parseInt(match[2]);
      }
    });
    
    return gasData;
  }
}

// CLI runner
if (require.main === module) {
  const runner = new TestRunner();
  
  async function main() {
    await runner.runStaticAnalysis();
    await runner.runPerformanceBenchmarks();
    await runner.runAllTests();
  }
  
  main().catch(console.error);
}