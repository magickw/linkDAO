import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { getLogAggregationService } from './log-aggregation';
import { getHealthMonitoringService } from './health-dashboard';
import dotenv from 'dotenv';

dotenv.config();

const execAsync = promisify(exec);

interface DeploymentConfig {
  environment: 'staging' | 'production';
  repository: {
    url: string;
    branch: string;
    deployKey?: string;
  };
  deployment: {
    strategy: 'blue-green' | 'rolling' | 'recreate';
    healthCheckUrl: string;
    healthCheckTimeout: number;
    rollbackOnFailure: boolean;
    preDeployHooks: string[];
    postDeployHooks: string[];
  };
  monitoring: {
    enabled: boolean;
    errorThreshold: number;
    responseTimeThreshold: number;
    monitoringDuration: number; // minutes
  };
  notifications: {
    slack?: {
      enabled: boolean;
      webhookUrl?: string;
      channel?: string;
    };
    email?: {
      enabled: boolean;
      recipients: string[];
      smtpConfig?: any;
    };
  };
}

interface DeploymentStatus {
  id: string;
  environment: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'rolled_back';
  startTime: string;
  endTime?: string;
  version: string;
  previousVersion?: string;
  logs: string[];
  healthChecks: {
    passed: number;
    failed: number;
    details: any[];
  };
  rollbackAvailable: boolean;
}

class DeploymentAutomationService {
  private config: DeploymentConfig;
  private logService = getLogAggregationService();
  private healthService = getHealthMonitoringService();
  private activeDeployments: Map<string, DeploymentStatus> = new Map();

  constructor() {
    this.config = this.loadConfiguration();
  }

  private loadConfiguration(): DeploymentConfig {
    return {
      environment: (process.env.DEPLOYMENT_ENVIRONMENT as any) || 'production',
      repository: {
        url: process.env.REPOSITORY_URL || '',
        branch: process.env.DEPLOYMENT_BRANCH || 'main',
        deployKey: process.env.DEPLOY_KEY_PATH
      },
      deployment: {
        strategy: (process.env.DEPLOYMENT_STRATEGY as any) || 'rolling',
        healthCheckUrl: process.env.HEALTH_CHECK_URL || 'http://localhost:10000/health',
        healthCheckTimeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '300000'), // 5 minutes
        rollbackOnFailure: process.env.ROLLBACK_ON_FAILURE !== 'false',
        preDeployHooks: process.env.PRE_DEPLOY_HOOKS?.split(',') || [],
        postDeployHooks: process.env.POST_DEPLOY_HOOKS?.split(',') || []
      },
      monitoring: {
        enabled: process.env.DEPLOYMENT_MONITORING_ENABLED !== 'false',
        errorThreshold: parseFloat(process.env.ERROR_THRESHOLD || '5.0'), // 5% error rate
        responseTimeThreshold: parseInt(process.env.RESPONSE_TIME_THRESHOLD || '2000'), // 2 seconds
        monitoringDuration: parseInt(process.env.MONITORING_DURATION || '15') // 15 minutes
      },
      notifications: {
        slack: {
          enabled: process.env.SLACK_NOTIFICATIONS_ENABLED === 'true',
          webhookUrl: process.env.SLACK_WEBHOOK_URL,
          channel: process.env.SLACK_CHANNEL || '#deployments'
        },
        email: {
          enabled: process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true',
          recipients: process.env.EMAIL_RECIPIENTS?.split(',') || []
        }
      }
    };
  }

  async deployApplication(version?: string): Promise<string> {
    const deploymentId = this.generateDeploymentId();
    const deployment: DeploymentStatus = {
      id: deploymentId,
      environment: this.config.environment,
      status: 'pending',
      startTime: new Date().toISOString(),
      version: version || 'latest',
      logs: [],
      healthChecks: { passed: 0, failed: 0, details: [] },
      rollbackAvailable: false
    };

    this.activeDeployments.set(deploymentId, deployment);

    try {
      await this.logService.info(
        `Starting deployment ${deploymentId}`,
        'deployment-automation',
        { deploymentId, version, environment: this.config.environment }
      );

      await this.sendNotification('deployment_started', deployment);

      // Execute deployment steps
      deployment.status = 'running';
      await this.executeDeploymentSteps(deployment);

      // Perform health checks
      await this.performHealthChecks(deployment);

      // Monitor deployment if enabled
      if (this.config.monitoring.enabled) {
        await this.monitorDeployment(deployment);
      }

      deployment.status = 'success';
      deployment.endTime = new Date().toISOString();
      deployment.rollbackAvailable = true;

      await this.logService.info(
        `Deployment ${deploymentId} completed successfully`,
        'deployment-automation',
        { deploymentId, duration: this.getDeploymentDuration(deployment) }
      );

      await this.sendNotification('deployment_success', deployment);

      return deploymentId;

    } catch (error) {
      deployment.status = 'failed';
      deployment.endTime = new Date().toISOString();
      deployment.logs.push(`Deployment failed: ${error}`);

      await this.logService.error(
        `Deployment ${deploymentId} failed`,
        'deployment-automation',
        error instanceof Error ? error : new Error(String(error)),
        { deploymentId }
      );

      await this.sendNotification('deployment_failed', deployment);

      // Auto-rollback if enabled
      if (this.config.deployment.rollbackOnFailure && deployment.previousVersion) {
        await this.rollbackDeployment(deploymentId);
      }

      throw error;
    }
  }

  private async executeDeploymentSteps(deployment: DeploymentStatus): Promise<void> {
    const steps = [
      { name: 'Backup current version', fn: () => this.backupCurrentVersion(deployment) },
      { name: 'Run pre-deploy hooks', fn: () => this.runPreDeployHooks(deployment) },
      { name: 'Pull latest code', fn: () => this.pullLatestCode(deployment) },
      { name: 'Install dependencies', fn: () => this.installDependencies(deployment) },
      { name: 'Run database migrations', fn: () => this.runMigrations(deployment) },
      { name: 'Build application', fn: () => this.buildApplication(deployment) },
      { name: 'Deploy application', fn: () => this.deployWithStrategy(deployment) },
      { name: 'Run post-deploy hooks', fn: () => this.runPostDeployHooks(deployment) }
    ];

    for (const step of steps) {
      deployment.logs.push(`Starting: ${step.name}`);
      
      try {
        await step.fn();
        deployment.logs.push(`Completed: ${step.name}`);
      } catch (error) {
        deployment.logs.push(`Failed: ${step.name} - ${error}`);
        throw error;
      }
    }
  }

  private async backupCurrentVersion(deployment: DeploymentStatus): Promise<void> {
    try {
      const backupDir = `/opt/marketplace-api/backups/deployment-${Date.now()}`;
      await execAsync(`mkdir -p ${backupDir}`);
      await execAsync(`cp -r /opt/marketplace-api/current ${backupDir}/`);
      
      deployment.logs.push(`Backup created: ${backupDir}`);
    } catch (error) {
      throw new Error(`Backup failed: ${error}`);
    }
  }

  private async runPreDeployHooks(deployment: DeploymentStatus): Promise<void> {
    for (const hook of this.config.deployment.preDeployHooks) {
      try {
        const { stdout, stderr } = await execAsync(hook);
        deployment.logs.push(`Pre-deploy hook output: ${stdout}`);
        if (stderr) {
          deployment.logs.push(`Pre-deploy hook stderr: ${stderr}`);
        }
      } catch (error) {
        throw new Error(`Pre-deploy hook failed: ${hook} - ${error}`);
      }
    }
  }

  private async pullLatestCode(deployment: DeploymentStatus): Promise<void> {
    try {
      const deployDir = '/tmp/marketplace-api-deploy';
      await execAsync(`rm -rf ${deployDir}`);
      
      let gitCommand = `git clone -b ${this.config.repository.branch} ${this.config.repository.url} ${deployDir}`;
      
      if (this.config.repository.deployKey) {
        gitCommand = `GIT_SSH_COMMAND="ssh -i ${this.config.repository.deployKey}" ${gitCommand}`;
      }
      
      const { stdout } = await execAsync(gitCommand);
      deployment.logs.push(`Git clone output: ${stdout}`);
      
      // Get commit hash for version tracking
      const { stdout: commitHash } = await execAsync(`cd ${deployDir} && git rev-parse HEAD`);
      deployment.version = commitHash.trim().substring(0, 8);
      
    } catch (error) {
      throw new Error(`Failed to pull latest code: ${error}`);
    }
  }

  private async installDependencies(deployment: DeploymentStatus): Promise<void> {
    try {
      const { stdout, stderr } = await execAsync('cd /tmp/marketplace-api-deploy && npm ci --production');
      deployment.logs.push(`npm install output: ${stdout}`);
      if (stderr) {
        deployment.logs.push(`npm install stderr: ${stderr}`);
      }
    } catch (error) {
      throw new Error(`Failed to install dependencies: ${error}`);
    }
  }

  private async runMigrations(deployment: DeploymentStatus): Promise<void> {
    try {
      const { stdout, stderr } = await execAsync('cd /tmp/marketplace-api-deploy && npm run migrate:production');
      deployment.logs.push(`Migration output: ${stdout}`);
      if (stderr) {
        deployment.logs.push(`Migration stderr: ${stderr}`);
      }
    } catch (error) {
      throw new Error(`Database migration failed: ${error}`);
    }
  }

  private async buildApplication(deployment: DeploymentStatus): Promise<void> {
    try {
      // Check if build script exists
      const packageJson = JSON.parse(await fs.readFile('/tmp/marketplace-api-deploy/package.json', 'utf-8'));
      
      if (packageJson.scripts && packageJson.scripts.build) {
        const { stdout, stderr } = await execAsync('cd /tmp/marketplace-api-deploy && npm run build');
        deployment.logs.push(`Build output: ${stdout}`);
        if (stderr) {
          deployment.logs.push(`Build stderr: ${stderr}`);
        }
      } else {
        deployment.logs.push('No build script found, skipping build step');
      }
    } catch (error) {
      throw new Error(`Build failed: ${error}`);
    }
  }

  private async deployWithStrategy(deployment: DeploymentStatus): Promise<void> {
    switch (this.config.deployment.strategy) {
      case 'blue-green':
        await this.blueGreenDeploy(deployment);
        break;
      case 'rolling':
        await this.rollingDeploy(deployment);
        break;
      case 'recreate':
        await this.recreateDeploy(deployment);
        break;
      default:
        throw new Error(`Unknown deployment strategy: ${this.config.deployment.strategy}`);
    }
  }

  private async blueGreenDeploy(deployment: DeploymentStatus): Promise<void> {
    // Simplified blue-green deployment
    try {
      // Stop current service
      await execAsync('systemctl stop marketplace-api');
      
      // Replace current deployment
      await execAsync('rm -rf /opt/marketplace-api/current');
      await execAsync('mv /tmp/marketplace-api-deploy /opt/marketplace-api/current');
      await execAsync('chown -R marketplace:marketplace /opt/marketplace-api/current');
      
      // Start service
      await execAsync('systemctl start marketplace-api');
      
      deployment.logs.push('Blue-green deployment completed');
    } catch (error) {
      throw new Error(`Blue-green deployment failed: ${error}`);
    }
  }

  private async rollingDeploy(deployment: DeploymentStatus): Promise<void> {
    // Simplified rolling deployment
    try {
      // Replace files
      await execAsync('rm -rf /opt/marketplace-api/current');
      await execAsync('mv /tmp/marketplace-api-deploy /opt/marketplace-api/current');
      await execAsync('chown -R marketplace:marketplace /opt/marketplace-api/current');
      
      // Restart service
      await execAsync('systemctl restart marketplace-api');
      
      deployment.logs.push('Rolling deployment completed');
    } catch (error) {
      throw new Error(`Rolling deployment failed: ${error}`);
    }
  }

  private async recreateDeploy(deployment: DeploymentStatus): Promise<void> {
    // Simplified recreate deployment
    try {
      // Stop service
      await execAsync('systemctl stop marketplace-api');
      
      // Replace deployment
      await execAsync('rm -rf /opt/marketplace-api/current');
      await execAsync('mv /tmp/marketplace-api-deploy /opt/marketplace-api/current');
      await execAsync('chown -R marketplace:marketplace /opt/marketplace-api/current');
      
      // Start service
      await execAsync('systemctl start marketplace-api');
      
      deployment.logs.push('Recreate deployment completed');
    } catch (error) {
      throw new Error(`Recreate deployment failed: ${error}`);
    }
  }

  private async runPostDeployHooks(deployment: DeploymentStatus): Promise<void> {
    for (const hook of this.config.deployment.postDeployHooks) {
      try {
        const { stdout, stderr } = await execAsync(hook);
        deployment.logs.push(`Post-deploy hook output: ${stdout}`);
        if (stderr) {
          deployment.logs.push(`Post-deploy hook stderr: ${stderr}`);
        }
      } catch (error) {
        throw new Error(`Post-deploy hook failed: ${hook} - ${error}`);
      }
    }
  }

  private async performHealthChecks(deployment: DeploymentStatus): Promise<void> {
    const maxAttempts = 10;
    const delay = 30000; // 30 seconds
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(this.config.deployment.healthCheckUrl, {
          method: 'GET',
          timeout: 10000
        });
        
        if (response.ok) {
          deployment.healthChecks.passed++;
          deployment.healthChecks.details.push({
            attempt,
            status: 'passed',
            statusCode: response.status,
            timestamp: new Date().toISOString()
          });
          
          deployment.logs.push(`Health check ${attempt}/${maxAttempts}: PASSED`);
          return; // Success!
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        deployment.healthChecks.failed++;
        deployment.healthChecks.details.push({
          attempt,
          status: 'failed',
          error: String(error),
          timestamp: new Date().toISOString()
        });
        
        deployment.logs.push(`Health check ${attempt}/${maxAttempts}: FAILED - ${error}`);
        
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Health checks failed after ${maxAttempts} attempts`);
  }

  private async monitorDeployment(deployment: DeploymentStatus): Promise<void> {
    const monitoringEndTime = Date.now() + (this.config.monitoring.monitoringDuration * 60 * 1000);
    
    deployment.logs.push(`Starting ${this.config.monitoring.monitoringDuration} minute monitoring period`);
    
    while (Date.now() < monitoringEndTime) {
      const metrics = this.healthService.getCurrentMetrics();
      
      if (metrics) {
        // Check error rate
        if (metrics.api.errorRate > this.config.monitoring.errorThreshold) {
          throw new Error(`Error rate ${metrics.api.errorRate}% exceeds threshold ${this.config.monitoring.errorThreshold}%`);
        }
        
        // Check response time
        if (metrics.api.averageResponseTime > this.config.monitoring.responseTimeThreshold) {
          throw new Error(`Response time ${metrics.api.averageResponseTime}ms exceeds threshold ${this.config.monitoring.responseTimeThreshold}ms`);
        }
      }
      
      // Wait 1 minute before next check
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
    
    deployment.logs.push('Monitoring period completed successfully');
  }

  async rollbackDeployment(deploymentId: string): Promise<void> {
    const deployment = this.activeDeployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    try {
      await this.logService.info(
        `Starting rollback for deployment ${deploymentId}`,
        'deployment-automation',
        { deploymentId }
      );

      // Find latest backup
      const { stdout } = await execAsync('ls -t /opt/marketplace-api/backups/ | head -n1');
      const latestBackup = stdout.trim();
      
      if (!latestBackup) {
        throw new Error('No backup found for rollback');
      }

      // Stop service
      await execAsync('systemctl stop marketplace-api');
      
      // Restore from backup
      await execAsync(`rm -rf /opt/marketplace-api/current`);
      await execAsync(`cp -r /opt/marketplace-api/backups/${latestBackup}/current /opt/marketplace-api/`);
      await execAsync('chown -R marketplace:marketplace /opt/marketplace-api/current');
      
      // Start service
      await execAsync('systemctl start marketplace-api');
      
      // Verify rollback
      await this.performHealthChecks(deployment);
      
      deployment.status = 'rolled_back';
      deployment.endTime = new Date().toISOString();
      deployment.logs.push(`Rollback completed using backup: ${latestBackup}`);

      await this.logService.info(
        `Rollback for deployment ${deploymentId} completed successfully`,
        'deployment-automation',
        { deploymentId, backup: latestBackup }
      );

      await this.sendNotification('deployment_rolled_back', deployment);

    } catch (error) {
      await this.logService.error(
        `Rollback for deployment ${deploymentId} failed`,
        'deployment-automation',
        error instanceof Error ? error : new Error(String(error)),
        { deploymentId }
      );

      throw error;
    }
  }

  private async sendNotification(event: string, deployment: DeploymentStatus): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.config.notifications.slack?.enabled) {
      promises.push(this.sendSlackNotification(event, deployment));
    }

    if (this.config.notifications.email?.enabled) {
      promises.push(this.sendEmailNotification(event, deployment));
    }

    await Promise.allSettled(promises);
  }

  private async sendSlackNotification(event: string, deployment: DeploymentStatus): Promise<void> {
    if (!this.config.notifications.slack?.webhookUrl) {
      return;
    }

    const colors = {
      deployment_started: '#36a64f',
      deployment_success: '#36a64f',
      deployment_failed: '#ff0000',
      deployment_rolled_back: '#ff9900'
    };

    const messages = {
      deployment_started: `🚀 Deployment ${deployment.id} started`,
      deployment_success: `✅ Deployment ${deployment.id} completed successfully`,
      deployment_failed: `❌ Deployment ${deployment.id} failed`,
      deployment_rolled_back: `🔄 Deployment ${deployment.id} rolled back`
    };

    const payload = {
      channel: this.config.notifications.slack.channel,
      attachments: [{
        color: colors[event as keyof typeof colors],
        title: messages[event as keyof typeof messages],
        fields: [
          { title: 'Environment', value: deployment.environment, short: true },
          { title: 'Version', value: deployment.version, short: true },
          { title: 'Duration', value: this.getDeploymentDuration(deployment), short: true },
          { title: 'Status', value: deployment.status, short: true }
        ],
        timestamp: Math.floor(Date.now() / 1000)
      }]
    };

    try {
      await fetch(this.config.notifications.slack.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.warn('Failed to send Slack notification:', error);
    }
  }

  private async sendEmailNotification(event: string, deployment: DeploymentStatus): Promise<void> {
    // Email notification implementation would go here
    // This is a placeholder for actual email service integration
    console.log(`Would send email notification for ${event}:`, deployment);
  }

  private generateDeploymentId(): string {
    return `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDeploymentDuration(deployment: DeploymentStatus): string {
    if (!deployment.endTime) {
      return 'In progress';
    }
    
    const start = new Date(deployment.startTime).getTime();
    const end = new Date(deployment.endTime).getTime();
    const duration = Math.round((end - start) / 1000);
    
    if (duration < 60) {
      return `${duration}s`;
    } else if (duration < 3600) {
      return `${Math.round(duration / 60)}m`;
    } else {
      return `${Math.round(duration / 3600)}h`;
    }
  }

  // API methods
  getDeploymentStatus(deploymentId: string): DeploymentStatus | null {
    return this.activeDeployments.get(deploymentId) || null;
  }

  getAllDeployments(): DeploymentStatus[] {
    return Array.from(this.activeDeployments.values())
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }

  async cancelDeployment(deploymentId: string): Promise<void> {
    const deployment = this.activeDeployments.get(deploymentId);
    if (!deployment || deployment.status !== 'running') {
      throw new Error(`Cannot cancel deployment ${deploymentId}`);
    }

    // This would implement deployment cancellation logic
    deployment.status = 'failed';
    deployment.endTime = new Date().toISOString();
    deployment.logs.push('Deployment cancelled by user');

    await this.logService.info(
      `Deployment ${deploymentId} cancelled`,
      'deployment-automation',
      { deploymentId }
    );
  }
}

// Singleton instance
let deploymentAutomationService: DeploymentAutomationService | null = null;

export function getDeploymentAutomationService(): DeploymentAutomationService {
  if (!deploymentAutomationService) {
    deploymentAutomationService = new DeploymentAutomationService();
  }
  return deploymentAutomationService;
}

export { DeploymentAutomationService, DeploymentStatus, DeploymentConfig };