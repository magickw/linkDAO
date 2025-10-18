import fs from "fs";
import path from "path";

interface SecurityIssue {
  severity: "Critical" | "High" | "Medium" | "Low" | "Info";
  title: string;
  description: string;
  file: string;
  line?: number;
  recommendation: string;
  category: string;
}

interface SecurityReport {
  timestamp: string;
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  infoIssues: number;
  issues: SecurityIssue[];
  recommendations: string[];
  toolsUsed: string[];
}

class SimpleSecurityAnalyzer {
  private issues: SecurityIssue[] = [];
  private toolsUsed: string[] = [];

  async runBasicAnalysis(): Promise<SecurityReport> {
    console.log("🔒 Starting Basic Security Analysis...");
    
    // Run basic security checks
    await this.checkContractFiles();
    await this.checkAccessControl();
    await this.checkReentrancyProtection();
    await this.checkInputValidation();
    await this.generateManualReviewItems();
    
    return this.generateReport();
  }

  private async checkContractFiles(): Promise<void> {
    console.log("📁 Checking contract files...");
    
    const contractFiles = this.getContractFiles();
    this.toolsUsed.push("File Analysis");
    
    if (contractFiles.length === 0) {
      this.issues.push({
        severity: "Critical",
        title: "No Contract Files Found",
        description: "No Solidity contract files found in contracts directory",
        file: "N/A",
        recommendation: "Ensure contract files are present and properly structured",
        category: "File Structure"
      });
      return;
    }

    console.log(`✅ Found ${contractFiles.length} contract files`);
    
    // Check for common security patterns in each file
    for (const file of contractFiles) {
      await this.analyzeContractFile(file);
    }
  }

  private async analyzeContractFile(filePath: string): Promise<void> {
    const content = fs.readFileSync(filePath, "utf8");
    const fileName = path.basename(filePath);
    
    // Check for SPDX license
    if (!content.includes("SPDX-License-Identifier")) {
      this.issues.push({
        severity: "Low",
        title: "Missing SPDX License",
        description: "Contract missing SPDX license identifier",
        file: fileName,
        recommendation: "Add SPDX license identifier at the top of the file",
        category: "Code Quality"
      });
    }
    
    // Check for pragma version
    if (!content.includes("pragma solidity")) {
      this.issues.push({
        severity: "Medium",
        title: "Missing Pragma Statement",
        description: "Contract missing Solidity version pragma",
        file: fileName,
        recommendation: "Add pragma solidity version statement",
        category: "Code Quality"
      });
    }
    
    // Check for potential reentrancy issues
    if (content.includes(".call(") && !content.includes("nonReentrant")) {
      this.issues.push({
        severity: "High",
        title: "Potential Reentrancy Vulnerability",
        description: "Contract uses .call() without reentrancy protection",
        file: fileName,
        recommendation: "Add ReentrancyGuard and use nonReentrant modifier",
        category: "Reentrancy"
      });
    }
    
    // Check for access control
    if (content.includes("onlyOwner") && !content.includes("import") && !content.includes("Ownable")) {
      this.issues.push({
        severity: "Medium",
        title: "Missing Access Control Import",
        description: "Contract uses onlyOwner but may not import Ownable",
        file: fileName,
        recommendation: "Ensure proper import of OpenZeppelin Ownable contract",
        category: "Access Control"
      });
    }
    
    // Check for unchecked external calls
    if (content.includes(".transfer(") || content.includes(".send(")) {
      this.issues.push({
        severity: "Medium",
        title: "Deprecated Transfer Methods",
        description: "Contract uses .transfer() or .send() which have gas limitations",
        file: fileName,
        recommendation: "Use .call() with proper error handling instead",
        category: "External Calls"
      });
    }
    
    // Check for proper error handling
    if (content.includes("require(") && !content.includes("revert")) {
      // This is actually good - using require statements
    } else if (!content.includes("require(") && !content.includes("revert")) {
      this.issues.push({
        severity: "Low",
        title: "Limited Error Handling",
        description: "Contract may lack proper error handling",
        file: fileName,
        recommendation: "Add appropriate require statements and error handling",
        category: "Input Validation"
      });
    }
  }

  private async checkAccessControl(): Promise<void> {
    console.log("🔐 Checking access control patterns...");
    
    const contractFiles = this.getContractFiles();
    
    for (const file of contractFiles) {
      const content = fs.readFileSync(file, "utf8");
      const fileName = path.basename(file);
      
      // Check for functions without access control
      const functionMatches = content.match(/function\s+\w+\s*\([^)]*\)\s+external/g);
      if (functionMatches) {
        for (const match of functionMatches) {
          if (!match.includes("view") && !match.includes("pure")) {
            // This is a state-changing external function
            const functionName = match.match(/function\s+(\w+)/)?.[1];
            if (functionName && !content.includes(`${functionName}`) || 
                (!content.includes("onlyOwner") && !content.includes("onlyRole"))) {
              this.issues.push({
                severity: "Medium",
                title: "External Function Without Access Control",
                description: `External function ${functionName} may need access control`,
                file: fileName,
                recommendation: "Consider adding appropriate access control modifiers",
                category: "Access Control"
              });
            }
          }
        }
      }
    }
    
    this.toolsUsed.push("Access Control Analysis");
  }

  private async checkReentrancyProtection(): Promise<void> {
    console.log("🔄 Checking reentrancy protection...");
    
    const contractFiles = this.getContractFiles();
    
    for (const file of contractFiles) {
      const content = fs.readFileSync(file, "utf8");
      const fileName = path.basename(file);
      
      // Check for external calls without reentrancy protection
      if (content.includes(".call(") || content.includes(".delegatecall(")) {
        if (!content.includes("nonReentrant") && !content.includes("ReentrancyGuard")) {
          this.issues.push({
            severity: "High",
            title: "Missing Reentrancy Protection",
            description: "Contract makes external calls without reentrancy protection",
            file: fileName,
            recommendation: "Import ReentrancyGuard and use nonReentrant modifier",
            category: "Reentrancy"
          });
        }
      }
    }
    
    this.toolsUsed.push("Reentrancy Analysis");
  }

  private async checkInputValidation(): Promise<void> {
    console.log("✅ Checking input validation...");
    
    const contractFiles = this.getContractFiles();
    
    for (const file of contractFiles) {
      const content = fs.readFileSync(file, "utf8");
      const fileName = path.basename(file);
      
      // Check for address validation
      if (content.includes("address") && !content.includes("require(") && !content.includes("!= address(0)")) {
        this.issues.push({
          severity: "Medium",
          title: "Missing Address Validation",
          description: "Contract may not validate address parameters",
          file: fileName,
          recommendation: "Add validation to check for zero address",
          category: "Input Validation"
        });
      }
    }
    
    this.toolsUsed.push("Input Validation Analysis");
  }

  private async generateManualReviewItems(): Promise<void> {
    console.log("📋 Generating manual review items...");
    
    this.issues.push({
      severity: "Info",
      title: "Manual Review Required: Business Logic",
      description: "Complex business logic requires manual review",
      file: "All Contracts",
      recommendation: "Conduct thorough manual review of business logic",
      category: "Manual Review"
    });
    
    this.issues.push({
      severity: "Info",
      title: "Manual Review Required: Economic Model",
      description: "Token economics and incentive mechanisms need review",
      file: "Token Contracts",
      recommendation: "Review economic model for potential exploits",
      category: "Manual Review"
    });
    
    this.issues.push({
      severity: "Info",
      title: "External Audit Recommended",
      description: "Professional security audit recommended before mainnet deployment",
      file: "All Contracts",
      recommendation: "Engage professional auditors for comprehensive review",
      category: "External Review"
    });
  }

  private getContractFiles(): string[] {
    const contractsDir = path.join(process.cwd(), "contracts");
    const files: string[] = [];
    
    function walkDir(dir: string) {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.includes("node_modules")) {
          walkDir(fullPath);
        } else if (item.endsWith(".sol")) {
          files.push(fullPath);
        }
      }
    }
    
    walkDir(contractsDir);
    return files;
  }

  private generateReport(): SecurityReport {
    const criticalIssues = this.issues.filter(i => i.severity === "Critical").length;
    const highIssues = this.issues.filter(i => i.severity === "High").length;
    const mediumIssues = this.issues.filter(i => i.severity === "Medium").length;
    const lowIssues = this.issues.filter(i => i.severity === "Low").length;
    const infoIssues = this.issues.filter(i => i.severity === "Info").length;
    
    const recommendations = this.generateRecommendations();
    
    return {
      timestamp: new Date().toISOString(),
      totalIssues: this.issues.length,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
      infoIssues,
      issues: this.issues,
      recommendations,
      toolsUsed: this.toolsUsed
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const criticalCount = this.issues.filter(i => i.severity === "Critical").length;
    const highCount = this.issues.filter(i => i.severity === "High").length;
    
    if (criticalCount > 0) {
      recommendations.push(`URGENT: Address ${criticalCount} critical security issues before deployment`);
    }
    
    if (highCount > 0) {
      recommendations.push(`HIGH PRIORITY: Resolve ${highCount} high-severity issues`);
    }
    
    recommendations.push("Conduct external security audit before mainnet deployment");
    recommendations.push("Implement comprehensive test coverage (>90%)");
    recommendations.push("Set up monitoring and alerting systems");
    recommendations.push("Prepare incident response procedures");
    recommendations.push("Consider bug bounty program");
    recommendations.push("Verify all contracts on Etherscan after deployment");
    recommendations.push("Use multi-signature wallets for contract ownership");
    recommendations.push("Implement time delays for critical operations");
    
    return recommendations;
  }

  async saveReport(report: SecurityReport): Promise<void> {
    const reportPath = path.join(process.cwd(), "security-analysis-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Also save a human-readable version
    const readableReport = this.generateReadableReport(report);
    const readablePath = path.join(process.cwd(), "security-analysis-report.md");
    fs.writeFileSync(readablePath, readableReport);
    
    console.log(`\n📄 Security reports saved:`);
    console.log(`  JSON: ${reportPath}`);
    console.log(`  Markdown: ${readablePath}`);
  }

  private generateReadableReport(report: SecurityReport): string {
    let markdown = `# Security Analysis Report\n\n`;
    markdown += `**Generated:** ${report.timestamp}\n\n`;
    
    markdown += `## Summary\n\n`;
    markdown += `- **Total Issues:** ${report.totalIssues}\n`;
    markdown += `- **Critical:** ${report.criticalIssues}\n`;
    markdown += `- **High:** ${report.highIssues}\n`;
    markdown += `- **Medium:** ${report.mediumIssues}\n`;
    markdown += `- **Low:** ${report.lowIssues}\n`;
    markdown += `- **Info:** ${report.infoIssues}\n\n`;
    
    markdown += `**Tools Used:** ${report.toolsUsed.join(", ")}\n\n`;
    
    if (report.criticalIssues > 0 || report.highIssues > 0) {
      markdown += `## ⚠️ URGENT ISSUES\n\n`;
      const urgentIssues = report.issues.filter(i => i.severity === "Critical" || i.severity === "High");
      for (const issue of urgentIssues) {
        markdown += `### ${issue.severity}: ${issue.title}\n`;
        markdown += `**File:** ${issue.file}\n`;
        if (issue.line) markdown += `**Line:** ${issue.line}\n`;
        markdown += `**Description:** ${issue.description}\n`;
        markdown += `**Recommendation:** ${issue.recommendation}\n\n`;
      }
    }
    
    markdown += `## All Issues by Category\n\n`;
    const categories = [...new Set(this.issues.map(i => i.category))];
    
    for (const category of categories) {
      const categoryIssues = this.issues.filter(i => i.category === category);
      markdown += `### ${category} (${categoryIssues.length} issues)\n\n`;
      
      for (const issue of categoryIssues) {
        markdown += `#### ${issue.severity}: ${issue.title}\n`;
        markdown += `- **File:** ${issue.file}\n`;
        if (issue.line) markdown += `- **Line:** ${issue.line}\n`;
        markdown += `- **Description:** ${issue.description}\n`;
        markdown += `- **Recommendation:** ${issue.recommendation}\n\n`;
      }
    }
    
    markdown += `## Recommendations\n\n`;
    for (let i = 0; i < report.recommendations.length; i++) {
      markdown += `${i + 1}. ${report.recommendations[i]}\n`;
    }
    
    return markdown;
  }

  printSummary(report: SecurityReport): void {
    console.log("\n" + "=".repeat(60));
    console.log("              SECURITY ANALYSIS SUMMARY");
    console.log("=".repeat(60));
    
    console.log(`Total Issues Found: ${report.totalIssues}`);
    console.log(`Critical: ${report.criticalIssues} | High: ${report.highIssues} | Medium: ${report.mediumIssues} | Low: ${report.lowIssues} | Info: ${report.infoIssues}`);
    
    if (report.criticalIssues > 0) {
      console.log(`\n🚨 CRITICAL: ${report.criticalIssues} critical issues must be fixed immediately!`);
    }
    
    if (report.highIssues > 0) {
      console.log(`\n⚠️  HIGH: ${report.highIssues} high-severity issues require attention`);
    }
    
    console.log(`\nTools Used: ${report.toolsUsed.join(", ")}`);
    
    console.log("\n📋 TOP RECOMMENDATIONS:");
    report.recommendations.slice(0, 5).forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
    
    console.log("=".repeat(60));
  }
}

async function main() {
  const analyzer = new SimpleSecurityAnalyzer();
  
  try {
    const report = await analyzer.runBasicAnalysis();
    await analyzer.saveReport(report);
    analyzer.printSummary(report);
    
    if (report.criticalIssues > 0 || report.highIssues > 0) {
      console.log("\n❌ Security analysis found critical or high-severity issues!");
      console.log("Please address these issues before deployment.");
      process.exit(1);
    } else {
      console.log("\n✅ Basic security analysis completed successfully!");
    }
    
  } catch (error) {
    console.error("❌ Security analysis failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { SimpleSecurityAnalyzer };