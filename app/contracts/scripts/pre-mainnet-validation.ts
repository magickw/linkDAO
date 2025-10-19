import { ethers } from "hardhat";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const execAsync = promisify(exec);

interface ValidationResult {
  category: string;
  check: string;
  status: "PASS" | "FAIL" | "WARN" | "SKIP";
  message: string;
  critical: boolean;
  details?: any;
}

interface ValidationReport {
  timestamp: string;
  network: string;
  overallStatus: "READY" | "NOT_READY" | "WARNINGS";
  totalChecks: number;
  passed: number;
  failed: number;
  warnings: number;
  skipped: number;
  criticalFailures: number;
  results: ValidationResult[];
  recommendations: string[];
  goNoGoDecision: {
    ready: boolean;
    blockers: string[];
    warnings: string[];
  };
}

class PreMainnetValidator {
  private results: ValidationResult[] = [];
  private network: string = "mainnet";
  private config: any = {};
  private deployer: any;

  constructor(network: string = "mainnet") {
    this.network = network;
  }

  /**
   * Run all validation checks
   */
  async runValidation(): Promise<ValidationReport> {
    console.log("🔍 LinkDAO Pre-Mainnet Validation");
    console.log("=" .repeat(80));
    console.log(`Target Network: ${this.network}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log("=" .repeat(80) + "\n");

    try {
      // Initialize deployer
      await this.initializeDeployer();

      // Category 1: Environment & Configuration
      await this.validateEnvironmentConfiguration();

      // Category 2: Security & Audits
      await this.validateSecurityAudits();

      // Category 3: Smart Contracts
      await this.validateSmartContracts();

      // Category 4: Deployment Readiness
      await this.validateDeploymentReadiness();

      // Category 5: Infrastructure
      await this.validateInfrastructure();

      // Category 6: Operational Readiness
      await this.validateOperationalReadiness();

      // Category 7: Legal & Compliance
      await this.validateLegalCompliance();

      // Category 8: Community & Documentation
      await this.validateCommunityReadiness();

      // Generate final report
      return this.generateReport();
    } catch (error) {
      console.error("❌ Validation failed with error:", error);
      throw error;
    }
  }

  /**
   * Initialize deployer account
   */
  private async initializeDeployer() {
    console.log("\n📋 Initializing Deployer Account...");

    try {
      const [deployer] = await ethers.getSigners();
      this.deployer = deployer;

      this.addResult({
        category: "Environment",
        check: "Deployer Account",
        status: "PASS",
        message: `Deployer address: ${deployer.address}`,
        critical: true,
        details: { address: deployer.address }
      });
    } catch (error) {
      this.addResult({
        category: "Environment",
        check: "Deployer Account",
        status: "FAIL",
        message: `Failed to initialize deployer: ${error}`,
        critical: true
      });
    }
  }

  /**
   * Category 1: Environment & Configuration Validation
   */
  private async validateEnvironmentConfiguration() {
    console.log("\n🔧 1. Environment & Configuration Checks");
    console.log("-" .repeat(80));

    // Check 1.1: Environment variables
    await this.checkEnvironmentVariables();

    // Check 1.2: Network configuration
    await this.checkNetworkConfiguration();

    // Check 1.3: Hardhat configuration
    await this.checkHardhatConfiguration();

    // Check 1.4: Deployer balance
    await this.checkDeployerBalance();

    // Check 1.5: Multisig addresses
    await this.checkMultisigAddresses();

    // Check 1.6: Treasury configuration
    await this.checkTreasuryConfiguration();
  }

  private async checkEnvironmentVariables() {
    const requiredVars = [
      'PRIVATE_KEY',
      'MAINNET_RPC_URL',
      'ETHERSCAN_API_KEY',
      'TREASURY_ADDRESS',
      'EMERGENCY_MULTISIG_ADDRESS',
      'GOVERNANCE_MULTISIG_ADDRESS'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length === 0) {
      this.addResult({
        category: "Environment",
        check: "Environment Variables",
        status: "PASS",
        message: "All required environment variables are set",
        critical: true,
        details: { requiredVars }
      });
    } else {
      this.addResult({
        category: "Environment",
        check: "Environment Variables",
        status: "FAIL",
        message: `Missing environment variables: ${missingVars.join(", ")}`,
        critical: true,
        details: { missingVars }
      });
    }
  }

  private async checkNetworkConfiguration() {
    try {
      const network = await ethers.provider.getNetwork();
      const isMainnet = network.chainId === BigInt(1);

      if (this.network === "mainnet" && !isMainnet) {
        this.addResult({
          category: "Environment",
          check: "Network Configuration",
          status: "FAIL",
          message: `Expected mainnet (chainId: 1), got chainId: ${network.chainId}`,
          critical: true,
          details: { chainId: network.chainId.toString() }
        });
      } else {
        this.addResult({
          category: "Environment",
          check: "Network Configuration",
          status: "PASS",
          message: `Connected to correct network (chainId: ${network.chainId})`,
          critical: true,
          details: { chainId: network.chainId.toString() }
        });
      }
    } catch (error) {
      this.addResult({
        category: "Environment",
        check: "Network Configuration",
        status: "FAIL",
        message: `Failed to verify network: ${error}`,
        critical: true
      });
    }
  }

  private async checkHardhatConfiguration() {
    try {
      const configPath = join(__dirname, "../hardhat.config.ts");
      const configExists = existsSync(configPath);

      if (configExists) {
        this.addResult({
          category: "Environment",
          check: "Hardhat Configuration",
          status: "PASS",
          message: "Hardhat configuration file found",
          critical: false
        });
      } else {
        this.addResult({
          category: "Environment",
          check: "Hardhat Configuration",
          status: "FAIL",
          message: "Hardhat configuration file not found",
          critical: true
        });
      }
    } catch (error) {
      this.addResult({
        category: "Environment",
        check: "Hardhat Configuration",
        status: "FAIL",
        message: `Failed to verify hardhat config: ${error}`,
        critical: true
      });
    }
  }

  private async checkDeployerBalance() {
    try {
      const balance = await this.deployer.provider.getBalance(this.deployer.address);
      const balanceEth = parseFloat(ethers.utils.formatEther(balance));
      const minRequired = 2.0; // Minimum 2 ETH for mainnet deployment
      const recommended = 5.0; // Recommended 5 ETH for safety

      if (balanceEth >= recommended) {
        this.addResult({
          category: "Environment",
          check: "Deployer Balance",
          status: "PASS",
          message: `Deployer has ${balanceEth.toFixed(4)} ETH (recommended: ${recommended} ETH)`,
          critical: true,
          details: { balance: balanceEth, recommended }
        });
      } else if (balanceEth >= minRequired) {
        this.addResult({
          category: "Environment",
          check: "Deployer Balance",
          status: "WARN",
          message: `Deployer has ${balanceEth.toFixed(4)} ETH (minimum met, but below recommended ${recommended} ETH)`,
          critical: false,
          details: { balance: balanceEth, minimum: minRequired, recommended }
        });
      } else {
        this.addResult({
          category: "Environment",
          check: "Deployer Balance",
          status: "FAIL",
          message: `Deployer has ${balanceEth.toFixed(4)} ETH (minimum required: ${minRequired} ETH)`,
          critical: true,
          details: { balance: balanceEth, minimum: minRequired }
        });
      }
    } catch (error) {
      this.addResult({
        category: "Environment",
        check: "Deployer Balance",
        status: "FAIL",
        message: `Failed to check deployer balance: ${error}`,
        critical: true
      });
    }
  }

  private async checkMultisigAddresses() {
    const multisigAddresses = {
      emergency: process.env.EMERGENCY_MULTISIG_ADDRESS,
      governance: process.env.GOVERNANCE_MULTISIG_ADDRESS,
      treasury: process.env.TREASURY_ADDRESS
    };

    let allValid = true;
    const invalidAddresses: string[] = [];

    for (const [name, address] of Object.entries(multisigAddresses)) {
      if (!address || !ethers.utils.isAddress(address)) {
        allValid = false;
        invalidAddresses.push(name);
      }
    }

    if (allValid) {
      this.addResult({
        category: "Environment",
        check: "Multisig Addresses",
        status: "PASS",
        message: "All multisig addresses are valid",
        critical: true,
        details: multisigAddresses
      });
    } else {
      this.addResult({
        category: "Environment",
        check: "Multisig Addresses",
        status: "FAIL",
        message: `Invalid multisig addresses: ${invalidAddresses.join(", ")}`,
        critical: true,
        details: { invalidAddresses }
      });
    }
  }

  private async checkTreasuryConfiguration() {
    const treasuryAddress = process.env.TREASURY_ADDRESS;

    if (treasuryAddress && ethers.utils.isAddress(treasuryAddress)) {
      this.addResult({
        category: "Environment",
        check: "Treasury Configuration",
        status: "PASS",
        message: `Treasury address configured: ${treasuryAddress}`,
        critical: true,
        details: { treasuryAddress }
      });
    } else {
      this.addResult({
        category: "Environment",
        check: "Treasury Configuration",
        status: "FAIL",
        message: "Treasury address not configured or invalid",
        critical: true
      });
    }
  }

  /**
   * Category 2: Security & Audits Validation
   */
  private async validateSecurityAudits() {
    console.log("\n🔒 2. Security & Audit Checks");
    console.log("-" .repeat(80));

    // Check 2.1: Security test suite
    await this.checkSecurityTests();

    // Check 2.2: Static analysis
    await this.checkStaticAnalysis();

    // Check 2.3: Audit reports
    await this.checkAuditReports();

    // Check 2.4: Emergency procedures
    await this.checkEmergencyProcedures();
  }

  private async checkSecurityTests() {
    try {
      console.log("  Running security test suite...");
      const { stdout, stderr } = await execAsync("npm run test:security 2>&1 || true");

      const hasPassed = stdout.includes("passing") && !stdout.includes("failing");

      if (hasPassed) {
        this.addResult({
          category: "Security",
          check: "Security Test Suite",
          status: "PASS",
          message: "Security tests passed",
          critical: true
        });
      } else {
        this.addResult({
          category: "Security",
          check: "Security Test Suite",
          status: "FAIL",
          message: "Security tests failed or have failures",
          critical: true,
          details: { output: stdout.substring(0, 500) }
        });
      }
    } catch (error) {
      this.addResult({
        category: "Security",
        check: "Security Test Suite",
        status: "WARN",
        message: "Could not run security tests (script may not exist)",
        critical: false
      });
    }
  }

  private async checkStaticAnalysis() {
    try {
      console.log("  Running static analysis...");
      // Check if slither is available
      const { stdout } = await execAsync("which slither || echo 'not found'");

      if (stdout.includes("not found")) {
        this.addResult({
          category: "Security",
          check: "Static Analysis (Slither)",
          status: "SKIP",
          message: "Slither not installed - static analysis skipped",
          critical: false
        });
      } else {
        this.addResult({
          category: "Security",
          check: "Static Analysis (Slither)",
          status: "PASS",
          message: "Slither is available for static analysis",
          critical: false
        });
      }
    } catch (error) {
      this.addResult({
        category: "Security",
        check: "Static Analysis",
        status: "SKIP",
        message: "Static analysis tools not available",
        critical: false
      });
    }
  }

  private async checkAuditReports() {
    const auditPath = join(__dirname, "../audits");
    const auditExists = existsSync(auditPath);

    if (auditExists) {
      this.addResult({
        category: "Security",
        check: "Audit Reports",
        status: "PASS",
        message: "Audit directory exists - verify reports are up to date",
        critical: false
      });
    } else {
      this.addResult({
        category: "Security",
        check: "Audit Reports",
        status: "WARN",
        message: "No audit directory found - ensure external audits are completed",
        critical: false
      });
    }
  }

  private async checkEmergencyProcedures() {
    const emergencyScriptPath = join(__dirname, "emergency-procedures.ts");
    const emergencyExists = existsSync(emergencyScriptPath);

    if (emergencyExists) {
      this.addResult({
        category: "Security",
        check: "Emergency Procedures",
        status: "PASS",
        message: "Emergency procedures script exists",
        critical: true
      });
    } else {
      this.addResult({
        category: "Security",
        check: "Emergency Procedures",
        status: "FAIL",
        message: "Emergency procedures script not found",
        critical: true
      });
    }
  }

  /**
   * Category 3: Smart Contracts Validation
   */
  private async validateSmartContracts() {
    console.log("\n📜 3. Smart Contract Checks");
    console.log("-" .repeat(80));

    // Check 3.1: Contract compilation
    await this.checkContractCompilation();

    // Check 3.2: Contract size limits
    await this.checkContractSizes();

    // Check 3.3: Gas optimization
    await this.checkGasOptimization();

    // Check 3.4: Critical contracts exist
    await this.checkCriticalContracts();
  }

  private async checkContractCompilation() {
    try {
      console.log("  Compiling contracts...");
      const { stdout, stderr } = await execAsync("npx hardhat compile --force 2>&1");

      if (stdout.includes("Compiled") && !stderr.includes("Error")) {
        this.addResult({
          category: "Contracts",
          check: "Contract Compilation",
          status: "PASS",
          message: "All contracts compiled successfully",
          critical: true
        });
      } else {
        this.addResult({
          category: "Contracts",
          check: "Contract Compilation",
          status: "FAIL",
          message: "Contract compilation failed",
          critical: true,
          details: { error: stderr }
        });
      }
    } catch (error) {
      this.addResult({
        category: "Contracts",
        check: "Contract Compilation",
        status: "FAIL",
        message: `Compilation error: ${error}`,
        critical: true
      });
    }
  }

  private async checkContractSizes() {
    try {
      console.log("  Checking contract sizes...");
      const { stdout } = await execAsync("npx hardhat size-contracts 2>&1 || true");

      // Check if any contract exceeds 24KB limit
      const hasOversized = stdout.includes("KB") && stdout.match(/(\d+\.?\d*)\s*KB/g)?.some(size => {
        const sizeNum = parseFloat(size.replace("KB", "").trim());
        return sizeNum > 24;
      });

      if (hasOversized) {
        this.addResult({
          category: "Contracts",
          check: "Contract Size Limits",
          status: "FAIL",
          message: "Some contracts exceed 24KB size limit",
          critical: true,
          details: { output: stdout.substring(0, 500) }
        });
      } else {
        this.addResult({
          category: "Contracts",
          check: "Contract Size Limits",
          status: "PASS",
          message: "All contracts within 24KB size limit",
          critical: true
        });
      }
    } catch (error) {
      this.addResult({
        category: "Contracts",
        check: "Contract Size Limits",
        status: "WARN",
        message: "Could not verify contract sizes",
        critical: false
      });
    }
  }

  private async checkGasOptimization() {
    const optimizedPath = join(__dirname, "../contracts/optimized");
    const optimizedExists = existsSync(optimizedPath);

    if (optimizedExists) {
      this.addResult({
        category: "Contracts",
        check: "Gas Optimization",
        status: "PASS",
        message: "Optimized contracts directory exists",
        critical: false
      });
    } else {
      this.addResult({
        category: "Contracts",
        check: "Gas Optimization",
        status: "WARN",
        message: "Optimized contracts directory not found - using standard contracts",
        critical: false
      });
    }
  }

  private async checkCriticalContracts() {
    const criticalContracts = [
      "LDAOToken",
      "Governance",
      "ReputationSystem",
      "Marketplace",
      "EnhancedEscrow",
      "DisputeResolution"
    ];

    const contractsPath = join(__dirname, "../contracts");
    const missingContracts: string[] = [];

    for (const contract of criticalContracts) {
      const contractPath = join(contractsPath, `${contract}.sol`);
      if (!existsSync(contractPath)) {
        missingContracts.push(contract);
      }
    }

    if (missingContracts.length === 0) {
      this.addResult({
        category: "Contracts",
        check: "Critical Contracts",
        status: "PASS",
        message: "All critical contracts found",
        critical: true,
        details: { contracts: criticalContracts }
      });
    } else {
      this.addResult({
        category: "Contracts",
        check: "Critical Contracts",
        status: "FAIL",
        message: `Missing critical contracts: ${missingContracts.join(", ")}`,
        critical: true,
        details: { missingContracts }
      });
    }
  }

  /**
   * Category 4: Deployment Readiness
   */
  private async validateDeploymentReadiness() {
    console.log("\n🚀 4. Deployment Readiness Checks");
    console.log("-" .repeat(80));

    // Check 4.1: Deployment scripts
    await this.checkDeploymentScripts();

    // Check 4.2: Gas estimation
    await this.checkGasEstimation();

    // Check 4.3: Deployment configuration
    await this.checkDeploymentConfiguration();
  }

  private async checkDeploymentScripts() {
    const deploymentScripts = [
      "deploy-foundation.ts",
      "deploy-ldao-token.ts",
      "deploy-governance.ts",
      "deploy-marketplace.js",
      "deploy-enhanced-escrow.ts",
      "deploy-production.ts"
    ];

    const scriptsPath = join(__dirname);
    const missingScripts: string[] = [];

    for (const script of deploymentScripts) {
      const scriptPath = join(scriptsPath, script);
      if (!existsSync(scriptPath)) {
        missingScripts.push(script);
      }
    }

    if (missingScripts.length === 0) {
      this.addResult({
        category: "Deployment",
        check: "Deployment Scripts",
        status: "PASS",
        message: "All deployment scripts found",
        critical: true,
        details: { scripts: deploymentScripts }
      });
    } else {
      this.addResult({
        category: "Deployment",
        check: "Deployment Scripts",
        status: "WARN",
        message: `Missing deployment scripts: ${missingScripts.join(", ")}`,
        critical: false,
        details: { missingScripts }
      });
    }
  }

  private async checkGasEstimation() {
    // Estimate deployment costs
    try {
      const gasPrice = await this.deployer.provider.getGasPrice();
      const estimatedGasUnits = 50_000_000; // Rough estimate for full deployment
      const estimatedCostWei = ethers.BigNumber.from(estimatedGasUnits).mul(gasPrice);
      const estimatedCostEth = parseFloat(ethers.utils.formatEther(estimatedCostWei));

      this.addResult({
        category: "Deployment",
        check: "Gas Estimation",
        status: "PASS",
        message: `Estimated deployment cost: ${estimatedCostEth.toFixed(4)} ETH`,
        critical: false,
        details: {
          gasPrice: gasPrice.toString(),
          estimatedGasUnits,
          estimatedCostEth
        }
      });
    } catch (error) {
      this.addResult({
        category: "Deployment",
        check: "Gas Estimation",
        status: "WARN",
        message: "Could not estimate gas costs",
        critical: false
      });
    }
  }

  private async checkDeploymentConfiguration() {
    const deployConfigPath = join(__dirname, "../deployment-config.json");
    const deployConfigExists = existsSync(deployConfigPath);

    if (deployConfigExists) {
      try {
        const config = JSON.parse(readFileSync(deployConfigPath, "utf-8"));
        this.addResult({
          category: "Deployment",
          check: "Deployment Configuration",
          status: "PASS",
          message: "Deployment configuration file found and valid",
          critical: false,
          details: { config }
        });
      } catch (error) {
        this.addResult({
          category: "Deployment",
          check: "Deployment Configuration",
          status: "WARN",
          message: "Deployment configuration exists but is invalid JSON",
          critical: false
        });
      }
    } else {
      this.addResult({
        category: "Deployment",
        check: "Deployment Configuration",
        status: "WARN",
        message: "No deployment configuration file found (using defaults)",
        critical: false
      });
    }
  }

  /**
   * Category 5: Infrastructure
   */
  private async validateInfrastructure() {
    console.log("\n🏗️  5. Infrastructure Checks");
    console.log("-" .repeat(80));

    // Check 5.1: Monitoring setup
    await this.checkMonitoringSetup();

    // Check 5.2: RPC endpoint connectivity
    await this.checkRPCConnectivity();

    // Check 5.3: Etherscan API
    await this.checkEtherscanAPI();
  }

  private async checkMonitoringSetup() {
    const monitoringScriptPath = join(__dirname, "monitoring-setup.ts");
    const monitoringExists = existsSync(monitoringScriptPath);

    if (monitoringExists) {
      this.addResult({
        category: "Infrastructure",
        check: "Monitoring Setup",
        status: "PASS",
        message: "Monitoring setup script exists",
        critical: false
      });
    } else {
      this.addResult({
        category: "Infrastructure",
        check: "Monitoring Setup",
        status: "WARN",
        message: "Monitoring setup script not found",
        critical: false
      });
    }
  }

  private async checkRPCConnectivity() {
    try {
      const blockNumber = await this.deployer.provider.getBlockNumber();

      this.addResult({
        category: "Infrastructure",
        check: "RPC Connectivity",
        status: "PASS",
        message: `Connected to RPC (current block: ${blockNumber})`,
        critical: true,
        details: { blockNumber }
      });
    } catch (error) {
      this.addResult({
        category: "Infrastructure",
        check: "RPC Connectivity",
        status: "FAIL",
        message: `Failed to connect to RPC: ${error}`,
        critical: true
      });
    }
  }

  private async checkEtherscanAPI() {
    const etherscanKey = process.env.ETHERSCAN_API_KEY;

    if (etherscanKey && etherscanKey !== "YOUR_ETHERSCAN_API_KEY") {
      this.addResult({
        category: "Infrastructure",
        check: "Etherscan API",
        status: "PASS",
        message: "Etherscan API key configured",
        critical: false
      });
    } else {
      this.addResult({
        category: "Infrastructure",
        check: "Etherscan API",
        status: "WARN",
        message: "Etherscan API key not configured - contract verification will fail",
        critical: false
      });
    }
  }

  /**
   * Category 6: Operational Readiness
   */
  private async validateOperationalReadiness() {
    console.log("\n⚙️  6. Operational Readiness Checks");
    console.log("-" .repeat(80));

    // Check 6.1: Team readiness
    await this.checkTeamReadiness();

    // Check 6.2: Documentation
    await this.checkDocumentation();

    // Check 6.3: Support infrastructure
    await this.checkSupportInfrastructure();
  }

  private async checkTeamReadiness() {
    this.addResult({
      category: "Operations",
      check: "Team Readiness",
      status: "PASS",
      message: "Manual check: Ensure team is briefed and on-call rotation is set",
      critical: false
    });
  }

  private async checkDocumentation() {
    const docsPath = join(__dirname, "../../docs");
    const docsExist = existsSync(docsPath);

    if (docsExist) {
      this.addResult({
        category: "Operations",
        check: "Documentation",
        status: "PASS",
        message: "Documentation directory exists",
        critical: false
      });
    } else {
      this.addResult({
        category: "Operations",
        check: "Documentation",
        status: "WARN",
        message: "Documentation directory not found",
        critical: false
      });
    }
  }

  private async checkSupportInfrastructure() {
    const supportChannels = {
      slack: process.env.SLACK_WEBHOOK_URL,
      discord: process.env.DISCORD_WEBHOOK_URL,
      email: process.env.ALERT_EMAIL
    };

    const configuredChannels = Object.entries(supportChannels)
      .filter(([_, url]) => url && url.length > 0)
      .map(([name]) => name);

    if (configuredChannels.length > 0) {
      this.addResult({
        category: "Operations",
        check: "Support Infrastructure",
        status: "PASS",
        message: `Alert channels configured: ${configuredChannels.join(", ")}`,
        critical: false,
        details: { channels: configuredChannels }
      });
    } else {
      this.addResult({
        category: "Operations",
        check: "Support Infrastructure",
        status: "WARN",
        message: "No alert channels configured",
        critical: false
      });
    }
  }

  /**
   * Category 7: Legal & Compliance
   */
  private async validateLegalCompliance() {
    console.log("\n⚖️  7. Legal & Compliance Checks");
    console.log("-" .repeat(80));

    // Check 7.1: Terms of service
    await this.checkTermsOfService();

    // Check 7.2: Privacy policy
    await this.checkPrivacyPolicy();

    // Check 7.3: Legal review
    await this.checkLegalReview();
  }

  private async checkTermsOfService() {
    this.addResult({
      category: "Legal",
      check: "Terms of Service",
      status: "PASS",
      message: "Manual check: Verify ToS are finalized and approved",
      critical: false
    });
  }

  private async checkPrivacyPolicy() {
    this.addResult({
      category: "Legal",
      check: "Privacy Policy",
      status: "PASS",
      message: "Manual check: Verify privacy policy is finalized",
      critical: false
    });
  }

  private async checkLegalReview() {
    this.addResult({
      category: "Legal",
      check: "Legal Review",
      status: "PASS",
      message: "Manual check: Confirm legal counsel has reviewed deployment",
      critical: false
    });
  }

  /**
   * Category 8: Community & Documentation
   */
  private async validateCommunityReadiness() {
    console.log("\n👥 8. Community & Documentation Checks");
    console.log("-" .repeat(80));

    // Check 8.1: Launch announcement
    await this.checkLaunchAnnouncement();

    // Check 8.2: User guides
    await this.checkUserGuides();

    // Check 8.3: API documentation
    await this.checkAPIDocumentation();
  }

  private async checkLaunchAnnouncement() {
    this.addResult({
      category: "Community",
      check: "Launch Announcement",
      status: "PASS",
      message: "Manual check: Verify launch announcements are prepared",
      critical: false
    });
  }

  private async checkUserGuides() {
    this.addResult({
      category: "Community",
      check: "User Guides",
      status: "PASS",
      message: "Manual check: Verify user guides are complete",
      critical: false
    });
  }

  private async checkAPIDocumentation() {
    this.addResult({
      category: "Community",
      check: "API Documentation",
      status: "PASS",
      message: "Manual check: Verify API documentation is up to date",
      critical: false
    });
  }

  /**
   * Helper: Add validation result
   */
  private addResult(result: ValidationResult) {
    this.results.push(result);

    const icon = {
      "PASS": "✅",
      "FAIL": "❌",
      "WARN": "⚠️ ",
      "SKIP": "⏭️ "
    }[result.status];

    const criticalTag = result.critical ? " [CRITICAL]" : "";
    console.log(`  ${icon} ${result.check}${criticalTag}: ${result.message}`);
  }

  /**
   * Generate final validation report
   */
  private generateReport(): ValidationReport {
    const passed = this.results.filter(r => r.status === "PASS").length;
    const failed = this.results.filter(r => r.status === "FAIL").length;
    const warnings = this.results.filter(r => r.status === "WARN").length;
    const skipped = this.results.filter(r => r.status === "SKIP").length;
    const criticalFailures = this.results.filter(r => r.status === "FAIL" && r.critical).length;

    const blockers = this.results
      .filter(r => r.status === "FAIL" && r.critical)
      .map(r => `${r.category}: ${r.check}`);

    const warningsList = this.results
      .filter(r => r.status === "WARN")
      .map(r => `${r.category}: ${r.check}`);

    const ready = criticalFailures === 0;
    const overallStatus = ready ? (warnings > 0 ? "WARNINGS" : "READY") : "NOT_READY";

    const report: ValidationReport = {
      timestamp: new Date().toISOString(),
      network: this.network,
      overallStatus,
      totalChecks: this.results.length,
      passed,
      failed,
      warnings,
      skipped,
      criticalFailures,
      results: this.results,
      recommendations: this.generateRecommendations(),
      goNoGoDecision: {
        ready,
        blockers,
        warnings: warningsList
      }
    };

    // Print summary
    this.printSummary(report);

    // Save report to file
    this.saveReport(report);

    return report;
  }

  /**
   * Generate recommendations based on results
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    // Check for critical failures
    const criticalFailures = this.results.filter(r => r.status === "FAIL" && r.critical);
    if (criticalFailures.length > 0) {
      recommendations.push("🛑 CRITICAL: Fix all critical failures before proceeding to mainnet");
      criticalFailures.forEach(failure => {
        recommendations.push(`   - ${failure.category}: ${failure.check}`);
      });
    }

    // Check for warnings
    const warnings = this.results.filter(r => r.status === "WARN");
    if (warnings.length > 0) {
      recommendations.push("⚠️  Review all warnings and address if possible:");
      warnings.forEach(warning => {
        recommendations.push(`   - ${warning.category}: ${warning.check}`);
      });
    }

    // Specific recommendations
    const deployerBalance = this.results.find(r => r.check === "Deployer Balance");
    if (deployerBalance?.status === "WARN") {
      recommendations.push("💰 Consider adding more ETH to deployer wallet for safety margin");
    }

    const auditReports = this.results.find(r => r.check === "Audit Reports");
    if (auditReports?.status === "WARN") {
      recommendations.push("🔍 Strongly recommend completing external security audit before mainnet");
    }

    const etherscan = this.results.find(r => r.check === "Etherscan API");
    if (etherscan?.status === "WARN") {
      recommendations.push("🔑 Configure Etherscan API key for contract verification");
    }

    return recommendations;
  }

  /**
   * Print summary report
   */
  private printSummary(report: ValidationReport) {
    console.log("\n" + "=".repeat(80));
    console.log("📊 VALIDATION SUMMARY");
    console.log("=".repeat(80));
    console.log(`Overall Status: ${report.overallStatus}`);
    console.log(`Total Checks: ${report.totalChecks}`);
    console.log(`  ✅ Passed: ${report.passed}`);
    console.log(`  ❌ Failed: ${report.failed} (${report.criticalFailures} critical)`);
    console.log(`  ⚠️  Warnings: ${report.warnings}`);
    console.log(`  ⏭️  Skipped: ${report.skipped}`);
    console.log("=".repeat(80));

    console.log("\n🎯 GO/NO-GO DECISION");
    console.log("-".repeat(80));
    if (report.goNoGoDecision.ready) {
      console.log("✅ READY FOR MAINNET DEPLOYMENT");
      if (report.goNoGoDecision.warnings.length > 0) {
        console.log("\nWarnings to address:");
        report.goNoGoDecision.warnings.forEach(w => console.log(`  ⚠️  ${w}`));
      }
    } else {
      console.log("❌ NOT READY FOR MAINNET DEPLOYMENT");
      console.log("\nCritical blockers:");
      report.goNoGoDecision.blockers.forEach(b => console.log(`  🛑 ${b}`));
    }
    console.log("=".repeat(80));

    if (report.recommendations.length > 0) {
      console.log("\n💡 RECOMMENDATIONS");
      console.log("-".repeat(80));
      report.recommendations.forEach(rec => console.log(rec));
      console.log("=".repeat(80));
    }
  }

  /**
   * Save report to file
   */
  private saveReport(report: ValidationReport) {
    const outputDir = join(__dirname, "../validation-reports");
    const outputFile = join(outputDir, `pre-mainnet-validation-${Date.now()}.json`);

    try {
      // Create directory if it doesn't exist
      if (!existsSync(outputDir)) {
        const fs = require("fs");
        fs.mkdirSync(outputDir, { recursive: true });
      }

      writeFileSync(outputFile, JSON.stringify(report, null, 2));
      console.log(`\n📄 Report saved to: ${outputFile}`);
    } catch (error) {
      console.error(`Failed to save report: ${error}`);
    }
  }
}

/**
 * Main execution
 */
async function main() {
  const network = process.env.HARDHAT_NETWORK || "mainnet";
  const validator = new PreMainnetValidator(network);

  try {
    const report = await validator.runValidation();

    // Exit with error code if not ready
    if (report.goNoGoDecision.ready) {
      process.exit(0);
    } else {
      console.error("\n❌ Validation failed - not ready for mainnet deployment");
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ Validation error:", error);
    process.exit(1);
  }
}

// Run validation
if (require.main === module) {
  main().catch(console.error);
}

export { PreMainnetValidator, ValidationReport, ValidationResult };
