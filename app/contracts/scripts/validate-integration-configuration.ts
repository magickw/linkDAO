import fs from "fs";
import path from "path";

interface ValidationResult {
  category: string;
  test: string;
  status: "pass" | "fail" | "warning";
  details: string;
}

class IntegrationConfigurationValidator {
  private validationResults: ValidationResult[] = [];
  private addresses: Record<string, string> = {};

  async validateConfiguration(): Promise<void> {
    console.log("🔍 Validating Extended Features Integration Configuration...");
    
    await this.loadDeploymentAddresses();
    await this.validateContractAddresses();
    await this.validateIntegrationScripts();
    await this.validateTestSuite();
    await this.validateDocumentation();
  }

  private async loadDeploymentAddresses(): Promise<void> {
    console.log("  📋 Loading deployment addresses...");
    
    const deploymentFile = path.join(__dirname, "..", "deployedAddresses.json");
    if (fs.existsSync(deploymentFile)) {
      try {
        const deployedAddresses = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
        this.addresses = deployedAddresses;
        
        this.validationResults.push({
          category: "Configuration",
          test: "Deployment Addresses File",
          status: "pass",
          details: `Found ${Object.keys(deployedAddresses).length} contract addresses`
        });
      } catch (error) {
        this.validationResults.push({
          category: "Configuration",
          test: "Deployment Addresses File",
          status: "fail",
          details: `Error reading deployment file: ${error}`
        });
      }
    } else {
      this.validationResults.push({
        category: "Configuration",
        test: "Deployment Addresses File",
        status: "warning",
        details: "No deployment addresses file found - contracts need to be deployed"
      });
    }
  }

  private async validateContractAddresses(): Promise<void> {
    console.log("  🔗 Validating contract addresses...");
    
    const requiredContracts = [
      "ldaoToken", "LDAOToken",
      "governance", "Governance",
      "reputationSystem", "ReputationSystem",
      "marketplace", "Marketplace",
      "enhancedEscrow", "EnhancedEscrow",
      "disputeResolution", "DisputeResolution",
      "paymentRouter", "PaymentRouter",
      "nftMarketplace", "NFTMarketplace",
      "nftCollectionFactory", "NFTCollectionFactory",
      "tipRouter", "TipRouter",
      "followModule", "FollowModule",
      "enhancedRewardPool", "EnhancedRewardPool"
    ];

    const foundContracts: string[] = [];
    const missingContracts: string[] = [];

    for (const contract of requiredContracts) {
      if (this.addresses[contract]) {
        foundContracts.push(contract);
      } else {
        missingContracts.push(contract);
      }
    }

    // Remove duplicates (since we check both camelCase and PascalCase)
    const uniqueFound = [...new Set(foundContracts)];
    const uniqueMissing = [...new Set(missingContracts.filter(c => 
      !foundContracts.some(f => f.toLowerCase() === c.toLowerCase())
    ))];

    this.validationResults.push({
      category: "Contracts",
      test: "Required Contract Addresses",
      status: uniqueMissing.length === 0 ? "pass" : uniqueMissing.length < 5 ? "warning" : "fail",
      details: `Found: ${uniqueFound.length}, Missing: ${uniqueMissing.length} (${uniqueMissing.join(", ")})`
    });

    // Validate address format
    for (const [name, address] of Object.entries(this.addresses)) {
      const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(address);
      this.validationResults.push({
        category: "Contracts",
        test: `Address Format: ${name}`,
        status: isValidAddress ? "pass" : "fail",
        details: `Address: ${address}`
      });
    }
  }

  private async validateIntegrationScripts(): Promise<void> {
    console.log("  📜 Validating integration scripts...");
    
    const requiredScripts = [
      "configure-extended-features-integration.ts",
      "configure-interconnections.ts",
      "validate-platform-integration.ts",
      "run-extended-features-integration-tests.sh"
    ];

    for (const script of requiredScripts) {
      const scriptPath = path.join(__dirname, script);
      const exists = fs.existsSync(scriptPath);
      
      if (exists) {
        try {
          const content = fs.readFileSync(scriptPath, "utf8");
          const hasMainFunction = content.includes("async function main()") || content.includes("function main()");
          const hasErrorHandling = content.includes("try") && content.includes("catch");
          
          this.validationResults.push({
            category: "Scripts",
            test: `Integration Script: ${script}`,
            status: hasMainFunction && hasErrorHandling ? "pass" : "warning",
            details: `Exists: ${exists}, Main function: ${hasMainFunction}, Error handling: ${hasErrorHandling}`
          });
        } catch (error) {
          this.validationResults.push({
            category: "Scripts",
            test: `Integration Script: ${script}`,
            status: "warning",
            details: `File exists but could not be read: ${error}`
          });
        }
      } else {
        this.validationResults.push({
          category: "Scripts",
          test: `Integration Script: ${script}`,
          status: "fail",
          details: "Script file not found"
        });
      }
    }
  }

  private async validateTestSuite(): Promise<void> {
    console.log("  🧪 Validating test suite...");
    
    const testFiles = [
      "test/comprehensive/ExtendedFeaturesIntegration.test.ts",
      "test/TipRouter.test.ts",
      "test/FollowModule.test.ts",
      "test/NFTMarketplace.test.ts",
      "test/EnhancedRewardPool.test.ts"
    ];

    for (const testFile of testFiles) {
      const testPath = path.join(__dirname, "..", testFile);
      const exists = fs.existsSync(testPath);
      
      if (exists) {
        try {
          const content = fs.readFileSync(testPath, "utf8");
          const hasDescribeBlocks = (content.match(/describe\(/g) || []).length;
          const hasItBlocks = (content.match(/it\(/g) || []).length;
          const hasExpectStatements = (content.match(/expect\(/g) || []).length;
          
          this.validationResults.push({
            category: "Tests",
            test: `Test File: ${path.basename(testFile)}`,
            status: hasDescribeBlocks > 0 && hasItBlocks > 0 && hasExpectStatements > 0 ? "pass" : "warning",
            details: `Describe blocks: ${hasDescribeBlocks}, It blocks: ${hasItBlocks}, Expect statements: ${hasExpectStatements}`
          });
        } catch (error) {
          this.validationResults.push({
            category: "Tests",
            test: `Test File: ${path.basename(testFile)}`,
            status: "warning",
            details: `File exists but could not be read: ${error}`
          });
        }
      } else {
        this.validationResults.push({
          category: "Tests",
          test: `Test File: ${path.basename(testFile)}`,
          status: "warning",
          details: "Test file not found"
        });
      }
    }
  }

  private async validateDocumentation(): Promise<void> {
    console.log("  📚 Validating documentation...");
    
    // Check if integration report would be generated
    const reportPath = path.join(__dirname, "..", "extended-features-integration-report.json");
    const reportExists = fs.existsSync(reportPath);
    
    this.validationResults.push({
      category: "Documentation",
      test: "Integration Report",
      status: reportExists ? "pass" : "warning",
      details: reportExists ? "Integration report exists" : "Integration report will be generated after running configuration"
    });

    // Check for task completion in tasks.md
    const tasksPath = path.join(__dirname, "..", "..", "..", ".kiro", "specs", "mainnet-deployment-plan", "tasks.md");
    if (fs.existsSync(tasksPath)) {
      try {
        const tasksContent = fs.readFileSync(tasksPath, "utf8");
        const task43Pattern = /4\.3 Configure Extended Features Integration/;
        const hasTask43 = task43Pattern.test(tasksContent);
        
        this.validationResults.push({
          category: "Documentation",
          test: "Task 4.3 Definition",
          status: hasTask43 ? "pass" : "fail",
          details: hasTask43 ? "Task 4.3 found in tasks.md" : "Task 4.3 not found in tasks.md"
        });
      } catch (error) {
        this.validationResults.push({
          category: "Documentation",
          test: "Task 4.3 Definition",
          status: "warning",
          details: `Could not read tasks.md: ${error}`
        });
      }
    } else {
      this.validationResults.push({
        category: "Documentation",
        test: "Task 4.3 Definition",
        status: "warning",
        details: "tasks.md file not found"
      });
    }
  }

  generateValidationReport(): void {
    const report = {
      timestamp: new Date().toISOString(),
      validationResults: this.validationResults,
      summary: {
        totalTests: this.validationResults.length,
        passed: this.validationResults.filter(r => r.status === "pass").length,
        failed: this.validationResults.filter(r => r.status === "fail").length,
        warnings: this.validationResults.filter(r => r.status === "warning").length
      },
      categories: {
        configuration: this.validationResults.filter(r => r.category === "Configuration"),
        contracts: this.validationResults.filter(r => r.category === "Contracts"),
        scripts: this.validationResults.filter(r => r.category === "Scripts"),
        tests: this.validationResults.filter(r => r.category === "Tests"),
        documentation: this.validationResults.filter(r => r.category === "Documentation")
      },
      contractAddresses: this.addresses,
      readinessAssessment: this.assessReadiness()
    };

    const reportFile = path.join(__dirname, "..", "integration-configuration-validation-report.json");
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    console.log("\n📊 Integration Configuration Validation Report Generated:");
    console.log(`  📄 Report file: ${reportFile}`);
    console.log(`  🧪 Total validations: ${report.summary.totalTests}`);
    console.log(`  ✅ Passed: ${report.summary.passed}`);
    console.log(`  ❌ Failed: ${report.summary.failed}`);
    console.log(`  ⚠️  Warnings: ${report.summary.warnings}`);
    console.log(`  ⏰ Timestamp: ${report.timestamp}`);
  }

  private assessReadiness(): {
    overallStatus: "ready" | "needs-work" | "not-ready";
    recommendations: string[];
  } {
    const failedTests = this.validationResults.filter(r => r.status === "fail");
    const warningTests = this.validationResults.filter(r => r.status === "warning");
    
    let overallStatus: "ready" | "needs-work" | "not-ready";
    const recommendations: string[] = [];

    if (failedTests.length === 0 && warningTests.length <= 2) {
      overallStatus = "ready";
      recommendations.push("Configuration is ready for extended features integration");
      recommendations.push("Run the integration configuration script");
      recommendations.push("Execute comprehensive testing");
    } else if (failedTests.length <= 2) {
      overallStatus = "needs-work";
      recommendations.push("Address failed validations before proceeding");
      recommendations.push("Review and fix contract compilation errors");
      recommendations.push("Ensure all required contracts are deployed");
    } else {
      overallStatus = "not-ready";
      recommendations.push("Significant issues detected - major work needed");
      recommendations.push("Fix contract compilation errors first");
      recommendations.push("Deploy missing contracts");
      recommendations.push("Review integration configuration");
    }

    return { overallStatus, recommendations };
  }

  printValidationSummary(): void {
    console.log("\n" + "=".repeat(70));
    console.log("      EXTENDED FEATURES INTEGRATION CONFIGURATION VALIDATION");
    console.log("=".repeat(70));
    
    const categories = ["Configuration", "Contracts", "Scripts", "Tests", "Documentation"];
    
    for (const category of categories) {
      const categoryResults = this.validationResults.filter(r => r.category === category);
      if (categoryResults.length > 0) {
        console.log(`\n📋 ${category.toUpperCase()}:`);
        categoryResults.forEach(result => {
          const status = result.status === "pass" ? "✅" : result.status === "fail" ? "❌" : "⚠️";
          console.log(`  ${status} ${result.test}: ${result.details}`);
        });
      }
    }
    
    const summary = {
      total: this.validationResults.length,
      passed: this.validationResults.filter(r => r.status === "pass").length,
      failed: this.validationResults.filter(r => r.status === "fail").length,
      warnings: this.validationResults.filter(r => r.status === "warning").length
    };
    
    console.log(`\n📈 VALIDATION STATISTICS:`);
    console.log(`  Total validations: ${summary.total}`);
    console.log(`  Passed: ${summary.passed}`);
    console.log(`  Failed: ${summary.failed}`);
    console.log(`  Warnings: ${summary.warnings}`);
    console.log(`  Success rate: ${((summary.passed / summary.total) * 100).toFixed(1)}%`);
    
    const readiness = this.assessReadiness();
    console.log(`\n🎯 READINESS ASSESSMENT: ${readiness.overallStatus.toUpperCase()}`);
    readiness.recommendations.forEach(rec => {
      console.log(`  • ${rec}`);
    });
    
    if (readiness.overallStatus === "ready") {
      console.log("\n✅ CONFIGURATION VALIDATION COMPLETE");
      console.log("   Extended features integration configuration is ready");
      console.log("   All required scripts and tests are in place");
      console.log("   Ready to proceed with integration configuration");
    } else {
      console.log("\n⚠️  CONFIGURATION NEEDS ATTENTION");
      console.log("   Please address the issues identified above");
      console.log("   Re-run validation after making corrections");
    }
    
    console.log("=".repeat(70));
  }
}

async function main() {
  console.log("🔍 Starting Extended Features Integration Configuration Validation...");
  
  const validator = new IntegrationConfigurationValidator();
  
  try {
    // Validate configuration
    await validator.validateConfiguration();
    
    // Generate report
    validator.generateValidationReport();
    
    // Print summary
    validator.printValidationSummary();
    
    console.log("\n✅ Integration configuration validation completed!");
    
  } catch (error) {
    console.error("❌ Integration configuration validation failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { IntegrationConfigurationValidator };