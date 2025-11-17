#!/usr/bin/env node

const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const fetch = require('node-fetch');

class RollbackManager {
  constructor(environment = 'production') {
    this.environment = environment;
    this.backupDir = path.join(__dirname, '../.deployments');
  }

  async rollback() {
    console.log(`🔄 Starting rollback for ${this.environment}`);
    
    try {
      // List available deployments
      const deployments = await this.listAvailableDeployments();
      
      if (deployments.length === 0) {
        throw new Error('No deployments available for rollback');
      }
      
      // Show deployment options
      console.log('\n📋 Available deployments:');
      deployments.forEach((deployment, index) => {
        const date = new Date(deployment.metadata.timestamp).toLocaleString();
        console.log(`  ${index + 1}. ${deployment.metadata.commitHash.substring(0, 8)} - ${date}`);
      });
      
      // Get user selection
      const selectedIndex = await this.getUserSelection(deployments.length);
      const selectedDeployment = deployments[selectedIndex];
      
      // Confirm rollback
      const confirmed = await this.confirmRollback(selectedDeployment);
      if (!confirmed) {
        console.log('❌ Rollback cancelled');
        return;
      }
      
      // Perform rollback
      await this.performRollback(selectedDeployment);
      
      console.log('✅ Rollback completed successfully');
      
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      process.exit(1);
    }
  }

  async listAvailableDeployments() {
    if (!fs.existsSync(this.backupDir)) {
      return [];
    }
    
    const backupFiles = fs.readdirSync(this.backupDir)
      .filter(file => file.endsWith('.json') && !file.includes('failure'))
      .map(file => {
        try {
          const metadata = JSON.parse(fs.readFileSync(path.join(this.backupDir, file), 'utf8'));
          return { file, metadata };
        } catch (error) {
          console.warn(`Warning: Could not parse ${file}`);
          return null;
        }
      })
      .filter(deployment => 
        deployment && 
        deployment.metadata.environment === this.environment
      )
      .sort((a, b) => 
        new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime()
      );
    
    return backupFiles;
  }

  async getUserSelection(maxOptions) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    return new Promise((resolve) => {
      rl.question(`\nSelect deployment to rollback to (1-${maxOptions}): `, (answer) => {
        rl.close();
        const selection = parseInt(answer) - 1;
        
        if (isNaN(selection) || selection < 0 || selection >= maxOptions) {
          console.error('❌ Invalid selection');
          process.exit(1);
        }
        
        resolve(selection);
      });
    });
  }

  async confirmRollback(deployment) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    return new Promise((resolve) => {
      const commitHash = deployment.metadata.commitHash.substring(0, 8);
      const date = new Date(deployment.metadata.timestamp).toLocaleString();
      
      console.log(`\n⚠️  You are about to rollback to:`);
      console.log(`   • Commit: ${commitHash}`);
      console.log(`   • Date: ${date}`);
      console.log(`   • Environment: ${this.environment}`);
      
      rl.question('\nAre you sure you want to continue? (yes/no): ', (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
      });
    });
  }

  validateCommitHash(commitHash) {
    // Validate commit hash format (40 character hex string or short hash)
    if (!commitHash || typeof commitHash !== 'string') {
      throw new Error('Invalid commit hash: must be a non-empty string');
    }
    
    // Remove any potentially dangerous characters and validate format
    const cleanHash = commitHash.replace(/[^a-fA-F0-9]/g, '');
    if (cleanHash.length < 7 || cleanHash.length > 40) {
      throw new Error('Invalid commit hash format: must be 7-40 hexadecimal characters');
    }
    
    return cleanHash;
  }

  async performRollback(deployment) {
    const rawCommitHash = deployment.metadata.commitHash;
    
    try {
      // Validate and sanitize commit hash to prevent command injection
      const commitHash = this.validateCommitHash(rawCommitHash);
      
      console.log(`🔄 Rolling back to commit: ${commitHash}`);
      
      // Create rollback backup of current state
      await this.createRollbackBackup();
      
      // Checkout target commit with error handling
      console.log('📦 Checking out target commit...');
      const checkoutResult = spawnSync('git', ['checkout', commitHash], { stdio: 'inherit' });
      if (checkoutResult.status !== 0) {
        throw new Error(`Git checkout failed with exit code ${checkoutResult.status}`);
      }
      
      // Install dependencies with error handling
      console.log('📦 Installing dependencies...');
      const installResult = spawnSync('npm', ['ci'], { stdio: 'inherit' });
      if (installResult.status !== 0) {
        throw new Error(`NPM install failed with exit code ${installResult.status}`);
      }
      
      // Build application with error handling
      console.log('🔨 Building application...');
      const buildResult = spawnSync('npm', ['run', 'build'], { stdio: 'inherit' });
      if (buildResult.status !== 0) {
        throw new Error(`Build failed with exit code ${buildResult.status}`);
      }
      
      // Deploy application with error handling
      console.log('🚢 Deploying application...');
      const deployScript = this.environment === 'production' ? 'deploy:production' : 'deploy:staging';
      const deployResult = spawnSync('npm', ['run', deployScript], { stdio: 'inherit' });
      if (deployResult.status !== 0) {
        throw new Error(`Deployment failed with exit code ${deployResult.status}`);
      }
      
      // Verify deployment
      console.log('🔍 Verifying deployment...');
      await this.verifyRollback();
      
      // Log rollback
      await this.logRollback(deployment);
      
    } catch (error) {
      console.error(`❌ Rollback failed: ${error.message}`);
      throw error;
    }
  }

  async createRollbackBackup() {
    console.log('💾 Creating rollback backup...');
    
    const result = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
    
    // Add error checking for git rev-parse command
    if (result.status !== 0) {
      throw new Error(`Failed to get current commit hash: git rev-parse failed with exit code ${result.status}`);
    }
    
    if (!result.stdout) {
      throw new Error('Failed to get current commit hash: no output from git rev-parse');
    }
    
    const currentCommit = result.stdout.trim();
    
    // Validate the commit hash before using it
    if (!currentCommit || currentCommit.length < 7) {
      throw new Error(`Invalid commit hash received: ${currentCommit}`);
    }
    
    const rollbackId = `rollback_${Date.now()}`;
    
    const backupMetadata = {
      deploymentId: rollbackId,
      environment: this.environment,
      commitHash: currentCommit,
      timestamp: new Date().toISOString(),
      type: 'rollback_backup',
    };
    
    fs.writeFileSync(
      path.join(this.backupDir, `${rollbackId}.json`),
      JSON.stringify(backupMetadata, null, 2)
    );
    
    console.log(`✅ Rollback backup created: ${rollbackId}`);
  }

  async verifyRollback() {
    const config = {
      staging: { url: 'https://staging.linkdao.io' },
      production: { url: 'https://linkdao.io' },
    };
    
    const baseUrl = config[this.environment]?.url;
    if (!baseUrl) {
      console.warn('⚠️  Cannot verify rollback - unknown environment URL');
      return;
    }
    
    // Health check with timeout and proper error handling
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(`${baseUrl}/api/health`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'LinkDAO-Rollback-Manager/1.0'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
      }
      
      const health = await response.json();
      if (health.status !== 'healthy') {
        throw new Error(`Application is not healthy after rollback: ${health.status}`);
      }
      
      console.log('✅ Rollback verification successful');
      
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Rollback verification timed out after 30 seconds');
      }
      throw new Error(`Rollback verification failed: ${error.message}`);
    }
  }

  async logRollback(deployment) {
    const rollbackLog = {
      timestamp: new Date().toISOString(),
      environment: this.environment,
      rolledBackTo: {
        commitHash: deployment.metadata.commitHash,
        deploymentId: deployment.metadata.deploymentId,
        originalTimestamp: deployment.metadata.timestamp,
      },
      performedBy: process.env.USER || 'unknown',
    };
    
    const logFile = path.join(this.backupDir, 'rollback_history.json');
    let history = [];
    
    if (fs.existsSync(logFile)) {
      try {
        history = JSON.parse(fs.readFileSync(logFile, 'utf8'));
      } catch (error) {
        console.warn('Warning: Could not read rollback history');
      }
    }
    
    history.unshift(rollbackLog);
    
    // Keep only last 50 rollback entries
    history = history.slice(0, 50);
    
    fs.writeFileSync(logFile, JSON.stringify(history, null, 2));
    
    console.log('📝 Rollback logged to history');
  }

  async listRollbackHistory() {
    const logFile = path.join(this.backupDir, 'rollback_history.json');
    
    if (!fs.existsSync(logFile)) {
      console.log('📝 No rollback history found');
      return;
    }
    
    try {
      const history = JSON.parse(fs.readFileSync(logFile, 'utf8'));
      
      console.log(`📝 Rollback History for ${this.environment}:`);
      console.log('');
      
      history
        .filter(entry => entry.environment === this.environment)
        .slice(0, 10) // Show last 10 rollbacks
        .forEach((entry, index) => {
          const date = new Date(entry.timestamp).toLocaleString();
          const commitHash = entry.rolledBackTo.commitHash.substring(0, 8);
          const performedBy = entry.performedBy;
          
          console.log(`  ${index + 1}. ${date}`);
          console.log(`     Rolled back to: ${commitHash}`);
          console.log(`     Performed by: ${performedBy}`);
          console.log('');
        });
        
    } catch (error) {
      console.error('❌ Could not read rollback history:', error.message);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const environment = args[1] || 'production';
  
  if (!['staging', 'production'].includes(environment)) {
    console.error('❌ Invalid environment. Use: staging or production');
    process.exit(1);
  }
  
  const rollbackManager = new RollbackManager(environment);
  
  switch (command) {
    case 'history':
      await rollbackManager.listRollbackHistory();
      break;
    case 'rollback':
    default:
      await rollbackManager.rollback();
      break;
  }
}

// Handle CLI execution
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Rollback script failed:', error);
    process.exit(1);
  });
}

module.exports = { RollbackManager };