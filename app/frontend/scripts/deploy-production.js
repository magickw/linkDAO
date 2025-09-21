#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Deployment configuration
const DEPLOYMENT_CONFIG = {
  environments: {
    staging: {
      url: 'https://staging.linkdao.io',
      branch: 'develop',
      healthCheck: '/api/health',
      rollbackVersions: 3,
    },
    production: {
      url: 'https://linkdao.io',
      branch: 'main',
      healthCheck: '/api/health',
      rollbackVersions: 5,
    },
  },
  
  checks: {
    preDeployment: [
      'npm run test:unit',
      'npm run test:integration',
      'npm run type-check',
      'npm run lint',
    ],
    postDeployment: [
      'healthCheck',
      'smokeTests',
      'performanceCheck',
      'featureFlagValidation',
    ],
  },

  monitoring: {
    errorThreshold: 5, // Max errors per minute
    responseTimeThreshold: 2000, // Max response time in ms
    uptimeThreshold: 99.9, // Min uptime percentage
    monitoringDuration: 300000, // 5 minutes in ms
  },
};

class ProductionDeployer {
  constructor(environment = 'production') {
    this.environment = environment;
    this.config = DEPLOYMENT_CONFIG.environments[environment];
    this.deploymentId = `deploy_${Date.now()}`;
    this.startTime = Date.now();
    
    if (!this.config) {
      throw new Error(`Unknown environment: ${environment}`);
    }
  }

  async deploy() {
    console.log(`🚀 Starting deployment to ${this.environment}`);
    console.log(`📋 Deployment ID: ${this.deploymentId}`);
    
    try {
      // Pre-deployment checks
      await this.runPreDeploymentChecks();
      
      // Create deployment backup
      await this.createDeploymentBackup();
      
      // Build and deploy
      await this.buildApplication();
      await this.deployApplication();
      
      // Post-deployment validation
      await this.runPostDeploymentChecks();
      
      // Monitor deployment
      await this.monitorDeployment();
      
      // Success
      await this.markDeploymentSuccess();
      
    } catch (error) {
      console.error('❌ Deployment failed:', error.message);
      await this.handleDeploymentFailure(error);
      process.exit(1);
    }
  }

  async runPreDeploymentChecks() {
    console.log('🔍 Running pre-deployment checks...');
    
    for (const check of DEPLOYMENT_CONFIG.checks.preDeployment) {
      console.log(`  ⏳ Running: ${check}`);
      try {
        execSync(check, { stdio: 'inherit' });
        console.log(`  ✅ Passed: ${check}`);
      } catch (error) {
        throw new Error(`Pre-deployment check failed: ${check}`);
      }
    }
    
    // Check git status
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
    if (gitStatus.trim()) {
      throw new Error('Working directory is not clean. Commit or stash changes.');
    }
    
    // Verify branch
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    if (currentBranch !== this.config.branch) {
      throw new Error(`Must deploy from ${this.config.branch} branch. Currently on ${currentBranch}`);
    }
    
    console.log('✅ All pre-deployment checks passed');
  }

  async createDeploymentBackup() {
    console.log('💾 Creating deployment backup...');
    
    const backupDir = path.join(__dirname, '../.deployments');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Get current commit hash
    const commitHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    
    // Create backup metadata
    const backupMetadata = {
      deploymentId: this.deploymentId,
      environment: this.environment,
      commitHash,
      timestamp: new Date().toISOString(),
      branch: this.config.branch,
    };
    
    fs.writeFileSync(
      path.join(backupDir, `${this.deploymentId}.json`),
      JSON.stringify(backupMetadata, null, 2)
    );
    
    // Clean up old backups
    await this.cleanupOldBackups(backupDir);
    
    console.log(`✅ Backup created: ${this.deploymentId}`);
  }

  async cleanupOldBackups(backupDir) {
    const backupFiles = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.json'))
      .map(file => ({
        file,
        path: path.join(backupDir, file),
        stats: fs.statSync(path.join(backupDir, file)),
      }))
      .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());
    
    // Keep only the configured number of backups
    const backupsToDelete = backupFiles.slice(this.config.rollbackVersions);
    
    for (const backup of backupsToDelete) {
      fs.unlinkSync(backup.path);
      console.log(`🗑️  Cleaned up old backup: ${backup.file}`);
    }
  }

  async buildApplication() {
    console.log('🔨 Building application...');
    
    // Install dependencies
    console.log('  📦 Installing dependencies...');
    execSync('npm ci', { stdio: 'inherit' });
    
    // Build application
    console.log('  🏗️  Building application...');
    execSync('npm run build', { stdio: 'inherit' });
    
    // Generate bundle analysis
    if (this.environment === 'production') {
      console.log('  📊 Generating bundle analysis...');
      execSync('ANALYZE=true npm run build', { stdio: 'inherit' });
    }
    
    console.log('✅ Application built successfully');
  }

  async deployApplication() {
    console.log('🚢 Deploying application...');
    
    // Deploy based on environment
    if (this.environment === 'production') {
      execSync('npm run deploy:production', { stdio: 'inherit' });
    } else {
      execSync('npm run deploy:staging', { stdio: 'inherit' });
    }
    
    console.log('✅ Application deployed successfully');
  }

  async runPostDeploymentChecks() {
    console.log('🔍 Running post-deployment checks...');
    
    for (const check of DEPLOYMENT_CONFIG.checks.postDeployment) {
      console.log(`  ⏳ Running: ${check}`);
      
      try {
        switch (check) {
          case 'healthCheck':
            await this.runHealthCheck();
            break;
          case 'smokeTests':
            await this.runSmokeTests();
            break;
          case 'performanceCheck':
            await this.runPerformanceCheck();
            break;
          case 'featureFlagValidation':
            await this.validateFeatureFlags();
            break;
          default:
            execSync(check, { stdio: 'inherit' });
        }
        console.log(`  ✅ Passed: ${check}`);
      } catch (error) {
        throw new Error(`Post-deployment check failed: ${check} - ${error.message}`);
      }
    }
    
    console.log('✅ All post-deployment checks passed');
  }

  async runHealthCheck() {
    const response = await fetch(`${this.config.url}${this.config.healthCheck}`);
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
    }
    
    const health = await response.json();
    
    if (health.status !== 'healthy') {
      throw new Error(`Application is not healthy: ${JSON.stringify(health)}`);
    }
  }

  async runSmokeTests() {
    // Basic functionality tests
    const tests = [
      { name: 'Homepage loads', url: this.config.url },
      { name: 'API responds', url: `${this.config.url}/api/health` },
      { name: 'Feature flags API', url: `${this.config.url}/api/feature-flags` },
    ];
    
    for (const test of tests) {
      const response = await fetch(test.url);
      if (!response.ok) {
        throw new Error(`Smoke test failed: ${test.name} - ${response.status}`);
      }
    }
  }

  async runPerformanceCheck() {
    const startTime = Date.now();
    const response = await fetch(this.config.url);
    const endTime = Date.now();
    
    const responseTime = endTime - startTime;
    
    if (responseTime > DEPLOYMENT_CONFIG.monitoring.responseTimeThreshold) {
      throw new Error(`Performance check failed: Response time ${responseTime}ms exceeds threshold`);
    }
  }

  async validateFeatureFlags() {
    const response = await fetch(`${this.config.url}/api/feature-flags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'test-user' }),
    });
    
    if (!response.ok) {
      throw new Error('Feature flags API is not responding');
    }
    
    const data = await response.json();
    
    if (!data.flags || typeof data.flags !== 'object') {
      throw new Error('Feature flags API returned invalid data');
    }
  }

  async monitorDeployment() {
    console.log('📊 Monitoring deployment...');
    
    const monitoringEndTime = Date.now() + DEPLOYMENT_CONFIG.monitoring.monitoringDuration;
    let errorCount = 0;
    let checkCount = 0;
    
    while (Date.now() < monitoringEndTime) {
      try {
        await this.runHealthCheck();
        checkCount++;
        
        // Reset error count on successful check
        errorCount = 0;
        
      } catch (error) {
        errorCount++;
        console.warn(`⚠️  Health check failed (${errorCount}): ${error.message}`);
        
        if (errorCount >= DEPLOYMENT_CONFIG.monitoring.errorThreshold) {
          throw new Error(`Too many errors during monitoring: ${errorCount}`);
        }
      }
      
      // Wait 30 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
    
    const uptime = ((checkCount - errorCount) / checkCount) * 100;
    
    if (uptime < DEPLOYMENT_CONFIG.monitoring.uptimeThreshold) {
      throw new Error(`Uptime ${uptime.toFixed(2)}% below threshold ${DEPLOYMENT_CONFIG.monitoring.uptimeThreshold}%`);
    }
    
    console.log(`✅ Monitoring completed: ${uptime.toFixed(2)}% uptime over ${checkCount} checks`);
  }

  async markDeploymentSuccess() {
    const duration = Date.now() - this.startTime;
    
    console.log('🎉 Deployment completed successfully!');
    console.log(`📊 Deployment stats:`);
    console.log(`   • Environment: ${this.environment}`);
    console.log(`   • Duration: ${Math.round(duration / 1000)}s`);
    console.log(`   • Deployment ID: ${this.deploymentId}`);
    console.log(`   • URL: ${this.config.url}`);
    
    // Send success notification
    await this.sendDeploymentNotification('success', {
      environment: this.environment,
      duration,
      deploymentId: this.deploymentId,
    });
  }

  async handleDeploymentFailure(error) {
    console.log('🚨 Handling deployment failure...');
    
    // Log failure details
    const failureLog = {
      deploymentId: this.deploymentId,
      environment: this.environment,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };
    
    fs.writeFileSync(
      path.join(__dirname, '../.deployments', `${this.deploymentId}_failure.json`),
      JSON.stringify(failureLog, null, 2)
    );
    
    // Send failure notification
    await this.sendDeploymentNotification('failure', {
      environment: this.environment,
      error: error.message,
      deploymentId: this.deploymentId,
    });
    
    // Offer rollback option
    if (process.env.AUTO_ROLLBACK !== 'false') {
      console.log('🔄 Initiating automatic rollback...');
      await this.rollback();
    } else {
      console.log('💡 To rollback manually, run: npm run rollback');
    }
  }

  async rollback() {
    console.log('🔄 Rolling back deployment...');
    
    try {
      // Get previous deployment
      const backupDir = path.join(__dirname, '../.deployments');
      const backupFiles = fs.readdirSync(backupDir)
        .filter(file => file.endsWith('.json') && !file.includes('failure'))
        .map(file => ({
          file,
          metadata: JSON.parse(fs.readFileSync(path.join(backupDir, file), 'utf8')),
        }))
        .filter(backup => backup.metadata.environment === this.environment)
        .sort((a, b) => new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime());
      
      if (backupFiles.length < 2) {
        throw new Error('No previous deployment found for rollback');
      }
      
      const previousDeployment = backupFiles[1]; // Second most recent (first is current failed deployment)
      
      console.log(`🔄 Rolling back to: ${previousDeployment.metadata.commitHash}`);
      
      // Checkout previous commit
      execSync(`git checkout ${previousDeployment.metadata.commitHash}`, { stdio: 'inherit' });
      
      // Rebuild and redeploy
      await this.buildApplication();
      await this.deployApplication();
      
      // Verify rollback
      await this.runHealthCheck();
      
      console.log('✅ Rollback completed successfully');
      
    } catch (rollbackError) {
      console.error('❌ Rollback failed:', rollbackError.message);
      console.log('🚨 Manual intervention required!');
      throw rollbackError;
    }
  }

  async sendDeploymentNotification(status, data) {
    // In production, integrate with Slack, Discord, email, etc.
    const notification = {
      status,
      environment: this.environment,
      timestamp: new Date().toISOString(),
      ...data,
    };
    
    console.log('📢 Deployment notification:', JSON.stringify(notification, null, 2));
    
    // Example: Send to webhook
    if (process.env.DEPLOYMENT_WEBHOOK_URL) {
      try {
        await fetch(process.env.DEPLOYMENT_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notification),
        });
      } catch (error) {
        console.warn('Failed to send webhook notification:', error.message);
      }
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const environment = args[0] || 'production';
  
  if (!['staging', 'production'].includes(environment)) {
    console.error('❌ Invalid environment. Use: staging or production');
    process.exit(1);
  }
  
  const deployer = new ProductionDeployer(environment);
  await deployer.deploy();
}

// Handle CLI execution
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Deployment script failed:', error);
    process.exit(1);
  });
}

module.exports = { ProductionDeployer };