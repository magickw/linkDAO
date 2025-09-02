#!/usr/bin/env node

/**
 * Test Suite Validation Script
 * 
 * Validates that the comprehensive test suite is properly configured
 * and all components are working correctly.
 */

const fs = require('fs/promises');
const path = require('path');
const { execSync } = require('child_process');

class TestSuiteValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.checks = [];
  }

  async validate() {
    console.log('🔍 Validating comprehensive test suite...');
    
    try {
      await this.validateFileStructure();
      await this.validateConfiguration();
      await this.validateDependencies();
      await this.validateScripts();
      await this.validateEnvironment();
      
      this.displayResults();
      
      if (this.errors.length === 0) {
        console.log('✅ Test suite validation passed!');
        return true;
      } else {
        console.log('❌ Test suite validation failed!');
        return false;
      }
    } catch (error) {
      console.error('💥 Validation failed with error:', error);
      return false;
    }
  }

  async validateFileStructure() {
    console.log('📁 Validating file structure...');
    
    const requiredFiles = [
      'src/tests/comprehensive/testSuite.ts',
      'src/tests/comprehensive/testEnvironment.ts',
      'src/tests/comprehensive/smartContractTests.ts',
      'src/tests/comprehensive/apiIntegrationTests.ts',
      'src/tests/comprehensive/databaseTests.ts',
      'src/tests/comprehensive/endToEndTests.ts',
      'src/tests/comprehensive/performanceTests.ts',
      'src/tests/comprehensive/securityTests.ts',
      'src/tests/comprehensive/testRunner.ts',
      'src/tests/comprehensive/setup.ts',
      'src/tests/comprehensive/globalSetup.ts',
      'src/tests/comprehensive/globalTeardown.ts',
      'src/tests/comprehensive/jestSetup.ts',
      'src/tests/comprehensive/testSequencer.js',
      'src/tests/comprehensive/comprehensive.test.ts',
      'jest.comprehensive.config.js',
      'scripts/run-comprehensive-tests.sh',
      'scripts/ci-setup.sh',
      'scripts/seed-test-data.js',
      'scripts/generate-test-report.js'
    ];
    
    const requiredDirectories = [
      'src/tests/comprehensive',
      'test-reports',
      'test-artifacts',
      'coverage'
    ];
    
    // Check required files
    for (const file of requiredFiles) {
      const filePath = path.join(process.cwd(), file);
      if (await this.fileExists(filePath)) {
        this.checks.push(`✅ ${file}`);
      } else {
        this.errors.push(`❌ Missing file: ${file}`);
      }
    }
    
    // Check required directories
    for (const dir of requiredDirectories) {
      const dirPath = path.join(process.cwd(), dir);
      if (await this.directoryExists(dirPath)) {
        this.checks.push(`✅ Directory: ${dir}`);
      } else {
        // Try to create directory
        try {
          await fs.mkdir(dirPath, { recursive: true });
          this.checks.push(`✅ Created directory: ${dir}`);
        } catch (error) {
          this.errors.push(`❌ Cannot create directory: ${dir}`);
        }
      }
    }
  }

  async validateConfiguration() {
    console.log('⚙️  Validating configuration...');
    
    // Check Jest configuration
    const jestConfigPath = path.join(process.cwd(), 'jest.comprehensive.config.js');
    if (await this.fileExists(jestConfigPath)) {
      try {
        const jestConfig = require(jestConfigPath);
        
        // Validate key configuration options
        if (jestConfig.testMatch) {
          this.checks.push('✅ Jest test patterns configured');
        } else {
          this.warnings.push('⚠️  Jest test patterns not configured');
        }
        
        if (jestConfig.coverageThreshold) {
          this.checks.push('✅ Coverage thresholds configured');
        } else {
          this.warnings.push('⚠️  Coverage thresholds not configured');
        }
        
        if (jestConfig.setupFilesAfterEnv) {
          this.checks.push('✅ Jest setup files configured');
        } else {
          this.warnings.push('⚠️  Jest setup files not configured');
        }
      } catch (error) {
        this.errors.push(`❌ Invalid Jest configuration: ${error.message}`);
      }
    } else {
      this.errors.push('❌ Jest comprehensive configuration not found');
    }
    
    // Check package.json scripts
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (await this.fileExists(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
        
        const requiredScripts = [
          'test:comprehensive',
          'test:comprehensive:full',
          'test:security',
          'test:performance',
          'ci:setup',
          'seed:test-data',
          'report:generate'
        ];
        
        for (const script of requiredScripts) {
          if (packageJson.scripts && packageJson.scripts[script]) {
            this.checks.push(`✅ Script: ${script}`);
          } else {
            this.errors.push(`❌ Missing script: ${script}`);
          }
        }
      } catch (error) {
        this.errors.push(`❌ Invalid package.json: ${error.message}`);
      }
    }
  }

  async validateDependencies() {
    console.log('📦 Validating dependencies...');
    
    const requiredDependencies = [
      'jest',
      'ts-jest',
      '@types/jest',
      'supertest',
      'playwright'
    ];
    
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (await this.fileExists(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        };
        
        for (const dep of requiredDependencies) {
          if (allDeps[dep]) {
            this.checks.push(`✅ Dependency: ${dep}`);
          } else {
            this.warnings.push(`⚠️  Missing dependency: ${dep}`);
          }
        }
      } catch (error) {
        this.errors.push(`❌ Cannot read package.json: ${error.message}`);
      }
    }
    
    // Check if node_modules exists
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    if (await this.directoryExists(nodeModulesPath)) {
      this.checks.push('✅ node_modules directory exists');
    } else {
      this.warnings.push('⚠️  node_modules directory not found - run npm install');
    }
  }

  async validateScripts() {
    console.log('📜 Validating scripts...');
    
    const scripts = [
      'scripts/run-comprehensive-tests.sh',
      'scripts/ci-setup.sh',
      'scripts/seed-test-data.js',
      'scripts/generate-test-report.js'
    ];
    
    for (const script of scripts) {
      const scriptPath = path.join(process.cwd(), script);
      if (await this.fileExists(scriptPath)) {
        // Check if script is executable
        try {
          const stats = await fs.stat(scriptPath);
          const isExecutable = !!(stats.mode & parseInt('111', 8));
          
          if (isExecutable) {
            this.checks.push(`✅ Executable script: ${script}`);
          } else {
            this.warnings.push(`⚠️  Script not executable: ${script}`);
          }
        } catch (error) {
          this.errors.push(`❌ Cannot check script permissions: ${script}`);
        }
      } else {
        this.errors.push(`❌ Missing script: ${script}`);
      }
    }
  }

  async validateEnvironment() {
    console.log('🌍 Validating environment...');
    
    // Check Node.js version
    try {
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      
      if (majorVersion >= 18) {
        this.checks.push(`✅ Node.js version: ${nodeVersion}`);
      } else {
        this.errors.push(`❌ Node.js version ${nodeVersion} is too old (requires 18+)`);
      }
    } catch (error) {
      this.errors.push('❌ Cannot determine Node.js version');
    }
    
    // Check npm version
    try {
      const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      this.checks.push(`✅ npm version: ${npmVersion}`);
    } catch (error) {
      this.warnings.push('⚠️  Cannot determine npm version');
    }
    
    // Check environment variables
    const requiredEnvVars = [
      'NODE_ENV'
    ];
    
    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        this.checks.push(`✅ Environment variable: ${envVar}=${process.env[envVar]}`);
      } else {
        this.warnings.push(`⚠️  Environment variable not set: ${envVar}`);
      }
    }
    
    // Check TypeScript
    try {
      execSync('npx tsc --version', { encoding: 'utf8', stdio: 'pipe' });
      this.checks.push('✅ TypeScript available');
    } catch (error) {
      this.warnings.push('⚠️  TypeScript not available');
    }
  }

  displayResults() {
    console.log('\n📊 Validation Results:');
    console.log('======================');
    
    console.log(`\n✅ Checks Passed: ${this.checks.length}`);
    if (this.checks.length > 0 && process.env.VERBOSE === 'true') {
      this.checks.forEach(check => console.log(`  ${check}`));
    }
    
    if (this.warnings.length > 0) {
      console.log(`\n⚠️  Warnings: ${this.warnings.length}`);
      this.warnings.forEach(warning => console.log(`  ${warning}`));
    }
    
    if (this.errors.length > 0) {
      console.log(`\n❌ Errors: ${this.errors.length}`);
      this.errors.forEach(error => console.log(`  ${error}`));
    }
    
    console.log('\n📈 Summary:');
    console.log(`  Total Checks: ${this.checks.length + this.warnings.length + this.errors.length}`);
    console.log(`  Passed: ${this.checks.length}`);
    console.log(`  Warnings: ${this.warnings.length}`);
    console.log(`  Errors: ${this.errors.length}`);
    
    const successRate = Math.round((this.checks.length / (this.checks.length + this.errors.length)) * 100);
    console.log(`  Success Rate: ${successRate}%`);
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async directoryExists(dirPath) {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new TestSuiteValidator();
  
  validator.validate()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 Validation failed:', error);
      process.exit(1);
    });
}

module.exports = TestSuiteValidator;