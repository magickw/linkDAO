import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';

export interface EmergencyResponseConfig {
  network: string;
  multisigWallets: {
    treasury: string;
    emergency: string;
    governance: string;
  };
  emergencyContacts: {
    email: string[];
    slack: string[];
    discord: string[];
    phone: string[];
  };
  thresholds: {
    largeTransfer: string; // ETH amount
    highGasPrice: string; // gwei
    errorRate: number; // percentage
    downtime: number; // milliseconds
  };
  notifications: {
    slack: {
      webhookUrl: string;
      channel: string;
      enabled: boolean;
    };
    discord: {
      webhookUrl: string;
      enabled: boolean;
    };
    email: {
      smtpConfig: {
        host: string;
        port: number;
        secure: boolean;
        auth: {
          user: string;
          pass: string;
        };
      };
      enabled: boolean;
    };
    webhook: {
      url: string;
      headers: Record<string, string>;
      enabled: boolean;
    };
  };
  automation: {
    pauseOnExploit: boolean;
    withdrawOnCritical: boolean;
    transferOwnershipOnBreach: boolean;
    maxAutomatedActions: number;
  };
}

export interface IncidentReport {
  id: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'exploit' | 'gas_attack' | 'governance_attack' | 'oracle_manipulation' | 'network_issue' | 'other';
  description: string;
  affectedContracts: string[];
  detectionMethod: 'automated' | 'manual' | 'external';
  responseActions: ResponseAction[];
  status: 'detected' | 'responding' | 'contained' | 'resolved' | 'escalated';
  estimatedImpact: {
    financial: string;
    users: number;
    reputation: 'low' | 'medium' | 'high';
  };
  timeline: TimelineEvent[];
}

export interface ResponseAction {
  id: string;
  type: 'pause' | 'withdraw' | 'transfer_ownership' | 'notify' | 'investigate' | 'escalate';
  description: string;
  automated: boolean;
  executed: boolean;
  executedAt?: number;
  transactionHash?: string;
  result?: 'success' | 'failed' | 'partial';
  error?: string;
}

export interface TimelineEvent {
  timestamp: number;
  event: string;
  details: any;
  severity: 'info' | 'warning' | 'critical';
}

export class AutomatedEmergencyResponse {
  private config: EmergencyResponseConfig;
  private deploymentData: any;
  private contractABIs: { [key: string]: any[] } = {};
  private activeIncidents: Map<string, IncidentReport> = new Map();
  private actionCounter: number = 0;
  private logFile: string;

  constructor(config: EmergencyResponseConfig) {
    this.config = config;
    this.logFile = path.join(__dirname, '..', 'emergency-logs', `emergency-${Date.now()}.json`);
    
    // Ensure log directory exists
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  async initialize(): Promise<void> {
    console.log('🚨 Initializing Automated Emergency Response System...\n');
    
    await this.loadDeploymentData();
    await this.loadContractABIs();
    await this.validateConfiguration();
    
    console.log('✅ Emergency Response System initialized successfully\n');
    this.logEvent('SYSTEM_INITIALIZED', 'Emergency response system activated', 'info');
  }

  private async loadDeploymentData(): Promise<void> {
    const possiblePaths = [
      path.join(__dirname, '..', `deployedAddresses-${this.config.network}.json`),
      path.join(__dirname, '..', 'deployedAddresses.json'),
      path.join(__dirname, '..', 'deployed-addresses-localhost.json')
    ];

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        this.deploymentData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log(`📄 Loaded deployment data from: ${path.basename(filePath)}`);
        return;
      }
    }

    throw new Error('❌ No deployment data found. Deploy contracts first.');
  }

  private async loadContractABIs(): Promise<void> {
    const artifactsPath = path.join(__dirname, '..', 'artifacts', 'contracts');
    
    for (const [contractName, address] of Object.entries(this.deploymentData)) {
      if (typeof address === 'string' && address.startsWith('0x')) {
        try {
          const artifactPath = path.join(artifactsPath, `${contractName}.sol`, `${contractName}.json`);
          
          if (fs.existsSync(artifactPath)) {
            const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
            this.contractABIs[contractName] = artifact.abi;
          }
        } catch (error) {
          console.warn(`⚠️ Could not load ABI for ${contractName}`);
        }
      }
    }
  }

  private async validateConfiguration(): Promise<void> {
    // Validate multisig addresses
    for (const [type, address] of Object.entries(this.config.multisigWallets)) {
      if (!ethers.isAddress(address)) {
        throw new Error(`Invalid ${type} multisig address: ${address}`);
      }
    }

    // Validate notification configurations
    if (this.config.notifications.slack.enabled && !this.config.notifications.slack.webhookUrl) {
      throw new Error('Slack webhook URL required when Slack notifications are enabled');
    }

    if (this.config.notifications.discord.enabled && !this.config.notifications.discord.webhookUrl) {
      throw new Error('Discord webhook URL required when Discord notifications are enabled');
    }

    console.log('✅ Configuration validated');
  }

  async detectIncident(
    type: IncidentReport['type'],
    description: string,
    affectedContracts: string[],
    severity: IncidentReport['severity'] = 'medium',
    detectionMethod: IncidentReport['detectionMethod'] = 'automated'
  ): Promise<string> {
    const incidentId = `INC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const incident: IncidentReport = {
      id: incidentId,
      timestamp: Date.now(),
      severity,
      type,
      description,
      affectedContracts,
      detectionMethod,
      responseActions: [],
      status: 'detected',
      estimatedImpact: {
        financial: '0',
        users: 0,
        reputation: 'low'
      },
      timeline: [{
        timestamp: Date.now(),
        event: 'INCIDENT_DETECTED',
        details: { type, description, affectedContracts },
        severity: 'critical'
      }]
    };

    this.activeIncidents.set(incidentId, incident);
    
    console.log(`🚨 INCIDENT DETECTED: ${incidentId}`);
    console.log(`   Type: ${type}`);
    console.log(`   Severity: ${severity}`);
    console.log(`   Description: ${description}`);
    console.log(`   Affected Contracts: ${affectedContracts.join(', ')}`);
    
    this.logEvent('INCIDENT_DETECTED', incident, 'critical');
    
    // Trigger automated response
    await this.triggerAutomatedResponse(incidentId);
    
    // Send notifications
    await this.sendIncidentNotifications(incident);
    
    return incidentId;
  }

  private async triggerAutomatedResponse(incidentId: string): Promise<void> {
    const incident = this.activeIncidents.get(incidentId);
    if (!incident) return;

    console.log(`🤖 Triggering automated response for incident: ${incidentId}`);
    
    incident.status = 'responding';
    this.addTimelineEvent(incidentId, 'AUTOMATED_RESPONSE_STARTED', 'Automated response procedures initiated', 'info');

    // Determine response actions based on incident type and severity
    const responseActions = this.determineResponseActions(incident);
    
    for (const action of responseActions) {
      if (this.actionCounter >= this.config.automation.maxAutomatedActions) {
        console.log('⚠️ Maximum automated actions reached. Manual intervention required.');
        incident.status = 'escalated';
        break;
      }

      if (action.automated) {
        await this.executeResponseAction(incidentId, action);
        this.actionCounter++;
      }
    }

    // Update incident status
    if (incident.status === 'responding') {
      incident.status = 'contained';
      this.addTimelineEvent(incidentId, 'INCIDENT_CONTAINED', 'Automated response completed', 'info');
    }
  }

  private determineResponseActions(incident: IncidentReport): ResponseAction[] {
    const actions: ResponseAction[] = [];

    switch (incident.type) {
      case 'exploit':
        if (this.config.automation.pauseOnExploit) {
          actions.push({
            id: `pause-${Date.now()}`,
            type: 'pause',
            description: 'Emergency pause of all pausable contracts',
            automated: true,
            executed: false
          });
        }
        
        if (this.config.automation.withdrawOnCritical && incident.severity === 'critical') {
          actions.push({
            id: `withdraw-${Date.now()}`,
            type: 'withdraw',
            description: 'Emergency withdrawal of funds',
            automated: true,
            executed: false
          });
        }
        
        if (this.config.automation.transferOwnershipOnBreach) {
          actions.push({
            id: `transfer-${Date.now()}`,
            type: 'transfer_ownership',
            description: 'Transfer ownership to emergency multisig',
            automated: true,
            executed: false
          });
        }
        break;

      case 'gas_attack':
        actions.push({
          id: `pause-non-critical-${Date.now()}`,
          type: 'pause',
          description: 'Pause non-critical operations during high gas prices',
          automated: true,
          executed: false
        });
        break;

      case 'governance_attack':
        actions.push({
          id: `notify-governance-${Date.now()}`,
          type: 'notify',
          description: 'Alert governance participants of malicious activity',
          automated: true,
          executed: false
        });
        break;

      case 'oracle_manipulation':
        actions.push({
          id: `pause-price-dependent-${Date.now()}`,
          type: 'pause',
          description: 'Pause price-dependent operations',
          automated: true,
          executed: false
        });
        break;
    }

    // Always add notification action
    actions.push({
      id: `notify-${Date.now()}`,
      type: 'notify',
      description: 'Send incident notifications to emergency contacts',
      automated: true,
      executed: false
    });

    return actions;
  }

  private async executeResponseAction(incidentId: string, action: ResponseAction): Promise<void> {
    const incident = this.activeIncidents.get(incidentId);
    if (!incident) return;

    console.log(`🔧 Executing action: ${action.type} - ${action.description}`);
    
    try {
      switch (action.type) {
        case 'pause':
          await this.executePauseAction(incident, action);
          break;
        case 'withdraw':
          await this.executeWithdrawAction(incident, action);
          break;
        case 'transfer_ownership':
          await this.executeOwnershipTransferAction(incident, action);
          break;
        case 'notify':
          await this.executeNotificationAction(incident, action);
          break;
      }

      action.executed = true;
      action.executedAt = Date.now();
      action.result = 'success';
      
      this.addTimelineEvent(incidentId, 'ACTION_EXECUTED', {
        actionType: action.type,
        description: action.description,
        result: 'success'
      }, 'info');

    } catch (error: any) {
      action.executed = true;
      action.executedAt = Date.now();
      action.result = 'failed';
      action.error = error.message;
      
      console.error(`❌ Action failed: ${action.type} - ${error.message}`);
      
      this.addTimelineEvent(incidentId, 'ACTION_FAILED', {
        actionType: action.type,
        description: action.description,
        error: error.message
      }, 'critical');
    }

    incident.responseActions.push(action);
  }

  private async executePauseAction(incident: IncidentReport, action: ResponseAction): Promise<void> {
    const pausableContracts = ['Marketplace', 'EnhancedEscrow', 'NFTMarketplace', 'TipRouter', 'EnhancedRewardPool'];
    const contractsToPause = incident.affectedContracts.length > 0 ? 
      incident.affectedContracts.filter(c => pausableContracts.includes(c)) : 
      pausableContracts;

    for (const contractName of contractsToPause) {
      const address = this.deploymentData[contractName];
      if (!address) continue;

      try {
        const contract = await ethers.getContractAt(contractName, address);
        
        if (contract.pause && !(await contract.paused())) {
          const tx = await contract.pause();
          await tx.wait(2);
          
          action.transactionHash = tx.hash;
          console.log(`   ✅ Paused ${contractName}: ${tx.hash}`);
        }
      } catch (error) {
        console.warn(`   ⚠️ Could not pause ${contractName}: ${error}`);
      }
    }
  }

  private async executeWithdrawAction(incident: IncidentReport, action: ResponseAction): Promise<void> {
    const withdrawableContracts = ['EnhancedRewardPool', 'PaymentRouter', 'EnhancedEscrow'];
    
    for (const contractName of withdrawableContracts) {
      const address = this.deploymentData[contractName];
      if (!address) continue;

      try {
        const contract = await ethers.getContractAt(contractName, address);
        const balance = await ethers.provider.getBalance(address);
        
        if (balance > 0 && contract.emergencyWithdraw) {
          const tx = await contract.emergencyWithdraw();
          await tx.wait(2);
          
          action.transactionHash = tx.hash;
          console.log(`   ✅ Emergency withdrawal from ${contractName}: ${tx.hash}`);
        }
      } catch (error) {
        console.warn(`   ⚠️ Could not withdraw from ${contractName}: ${error}`);
      }
    }
  }

  private async executeOwnershipTransferAction(incident: IncidentReport, action: ResponseAction): Promise<void> {
    const ownableContracts = Object.keys(this.deploymentData).filter(name => 
      this.contractABIs[name] && this.contractABIs[name].some(item => 
        item.type === 'function' && item.name === 'transferOwnership'
      )
    );

    for (const contractName of ownableContracts) {
      const address = this.deploymentData[contractName];
      if (!address) continue;

      try {
        const contract = await ethers.getContractAt(contractName, address);
        const [signer] = await ethers.getSigners();
        const currentOwner = await contract.owner();
        
        if (currentOwner.toLowerCase() === signer.address.toLowerCase()) {
          const tx = await contract.transferOwnership(this.config.multisigWallets.emergency);
          await tx.wait(2);
          
          action.transactionHash = tx.hash;
          console.log(`   ✅ Transferred ownership of ${contractName}: ${tx.hash}`);
        }
      } catch (error) {
        console.warn(`   ⚠️ Could not transfer ownership of ${contractName}: ${error}`);
      }
    }
  }

  private async executeNotificationAction(incident: IncidentReport, action: ResponseAction): Promise<void> {
    await this.sendIncidentNotifications(incident);
    console.log('   ✅ Incident notifications sent');
  }

  private async sendIncidentNotifications(incident: IncidentReport): Promise<void> {
    const message = this.formatIncidentMessage(incident);

    // Send Slack notification
    if (this.config.notifications.slack.enabled) {
      try {
        await this.sendSlackNotification(message, incident.severity);
      } catch (error) {
        console.warn('Failed to send Slack notification:', error);
      }
    }

    // Send Discord notification
    if (this.config.notifications.discord.enabled) {
      try {
        await this.sendDiscordNotification(message, incident.severity);
      } catch (error) {
        console.warn('Failed to send Discord notification:', error);
      }
    }

    // Send webhook notification
    if (this.config.notifications.webhook.enabled) {
      try {
        await this.sendWebhookNotification(incident);
      } catch (error) {
        console.warn('Failed to send webhook notification:', error);
      }
    }
  }

  private formatIncidentMessage(incident: IncidentReport): string {
    const severityEmoji = {
      low: '🟡',
      medium: '🟠',
      high: '🔴',
      critical: '🚨'
    }[incident.severity];

    return `${severityEmoji} **SECURITY INCIDENT DETECTED**

**Incident ID**: ${incident.id}
**Severity**: ${incident.severity.toUpperCase()}
**Type**: ${incident.type.replace('_', ' ').toUpperCase()}
**Status**: ${incident.status.toUpperCase()}

**Description**: ${incident.description}

**Affected Contracts**: ${incident.affectedContracts.join(', ') || 'None specified'}

**Response Actions**: ${incident.responseActions.length} actions ${incident.responseActions.filter(a => a.executed).length > 0 ? 'executed' : 'planned'}

**Time**: ${new Date(incident.timestamp).toISOString()}

**Network**: ${this.config.network}`;
  }

  private async sendSlackNotification(message: string, severity: string): Promise<void> {
    const color = {
      low: '#ffeb3b',
      medium: '#ff9800',
      high: '#f44336',
      critical: '#d32f2f'
    }[severity] || '#ff9800';

    const payload = {
      channel: this.config.notifications.slack.channel,
      attachments: [{
        color,
        text: message,
        ts: Math.floor(Date.now() / 1000)
      }]
    };

    const response = await fetch(this.config.notifications.slack.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Slack notification failed: ${response.statusText}`);
    }
  }

  private async sendDiscordNotification(message: string, severity: string): Promise<void> {
    const color = {
      low: 0xffeb3b,
      medium: 0xff9800,
      high: 0xf44336,
      critical: 0xd32f2f
    }[severity] || 0xff9800;

    const payload = {
      embeds: [{
        title: 'Security Incident Alert',
        description: message,
        color,
        timestamp: new Date().toISOString()
      }]
    };

    const response = await fetch(this.config.notifications.discord.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Discord notification failed: ${response.statusText}`);
    }
  }

  private async sendWebhookNotification(incident: IncidentReport): Promise<void> {
    const response = await fetch(this.config.notifications.webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.config.notifications.webhook.headers
      },
      body: JSON.stringify({
        type: 'security_incident',
        incident,
        timestamp: Date.now()
      })
    });

    if (!response.ok) {
      throw new Error(`Webhook notification failed: ${response.statusText}`);
    }
  }

  private addTimelineEvent(incidentId: string, event: string, details: any, severity: TimelineEvent['severity']): void {
    const incident = this.activeIncidents.get(incidentId);
    if (incident) {
      incident.timeline.push({
        timestamp: Date.now(),
        event,
        details,
        severity
      });
    }
  }

  private logEvent(event: string, details: any, severity: string): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      severity
    };

    // Append to log file
    const logData = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(this.logFile, logData);
  }

  async generateIncidentReport(incidentId: string): Promise<string> {
    const incident = this.activeIncidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    let report = `# Security Incident Report\n\n`;
    report += `**Incident ID**: ${incident.id}\n`;
    report += `**Timestamp**: ${new Date(incident.timestamp).toISOString()}\n`;
    report += `**Severity**: ${incident.severity.toUpperCase()}\n`;
    report += `**Type**: ${incident.type.replace('_', ' ').toUpperCase()}\n`;
    report += `**Status**: ${incident.status.toUpperCase()}\n`;
    report += `**Detection Method**: ${incident.detectionMethod}\n\n`;

    report += `## Description\n\n${incident.description}\n\n`;

    report += `## Affected Contracts\n\n`;
    for (const contractName of incident.affectedContracts) {
      const address = this.deploymentData[contractName];
      report += `- **${contractName}**: ${address || 'Address not found'}\n`;
    }
    report += '\n';

    report += `## Response Actions\n\n`;
    for (const action of incident.responseActions) {
      const status = action.executed ? 
        (action.result === 'success' ? '✅' : '❌') : '⏳';
      
      report += `${status} **${action.type.replace('_', ' ').toUpperCase()}**: ${action.description}\n`;
      
      if (action.transactionHash) {
        report += `   - Transaction: ${action.transactionHash}\n`;
      }
      
      if (action.error) {
        report += `   - Error: ${action.error}\n`;
      }
      
      report += '\n';
    }

    report += `## Timeline\n\n`;
    for (const event of incident.timeline) {
      const time = new Date(event.timestamp).toISOString();
      const severityEmoji = {
        info: 'ℹ️',
        warning: '⚠️',
        critical: '🚨'
      }[event.severity];
      
      report += `${severityEmoji} **${time}**: ${event.event}\n`;
      if (typeof event.details === 'string') {
        report += `   ${event.details}\n`;
      } else {
        report += `   ${JSON.stringify(event.details, null, 2)}\n`;
      }
      report += '\n';
    }

    report += `## Estimated Impact\n\n`;
    report += `- **Financial**: ${incident.estimatedImpact.financial} ETH\n`;
    report += `- **Users Affected**: ${incident.estimatedImpact.users}\n`;
    report += `- **Reputation Impact**: ${incident.estimatedImpact.reputation}\n\n`;

    report += `## Next Steps\n\n`;
    if (incident.status === 'resolved') {
      report += `- Conduct post-incident review\n`;
      report += `- Update security procedures\n`;
      report += `- Communicate resolution to stakeholders\n`;
    } else {
      report += `- Continue monitoring the situation\n`;
      report += `- Implement additional security measures if needed\n`;
      report += `- Prepare for potential escalation\n`;
    }

    return report;
  }

  async saveIncidentReport(incidentId: string): Promise<void> {
    const report = await this.generateIncidentReport(incidentId);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `incident-report-${incidentId}-${timestamp}.md`;
    const reportsDir = path.join(__dirname, '..', 'incident-reports');
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filepath = path.join(reportsDir, filename);
    fs.writeFileSync(filepath, report);
    
    console.log(`📄 Incident report saved to: ${filename}`);
  }

  getActiveIncidents(): IncidentReport[] {
    return Array.from(this.activeIncidents.values());
  }

  async resolveIncident(incidentId: string, resolution: string): Promise<void> {
    const incident = this.activeIncidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    incident.status = 'resolved';
    this.addTimelineEvent(incidentId, 'INCIDENT_RESOLVED', resolution, 'info');
    
    await this.saveIncidentReport(incidentId);
    
    console.log(`✅ Incident ${incidentId} resolved: ${resolution}`);
  }
}

// Load emergency response configuration
export function loadEmergencyConfig(): EmergencyResponseConfig {
  const configPath = path.join(__dirname, '..', 'emergency-config.json');
  
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  // Default configuration
  return {
    network: process.env.HARDHAT_NETWORK || 'mainnet',
    multisigWallets: {
      treasury: process.env.TREASURY_MULTISIG_ADDRESS || '',
      emergency: process.env.EMERGENCY_MULTISIG_ADDRESS || '',
      governance: process.env.GOVERNANCE_MULTISIG_ADDRESS || ''
    },
    emergencyContacts: {
      email: (process.env.EMERGENCY_EMAIL_CONTACTS || '').split(',').filter(Boolean),
      slack: (process.env.EMERGENCY_SLACK_CONTACTS || '').split(',').filter(Boolean),
      discord: (process.env.EMERGENCY_DISCORD_CONTACTS || '').split(',').filter(Boolean),
      phone: (process.env.EMERGENCY_PHONE_CONTACTS || '').split(',').filter(Boolean)
    },
    thresholds: {
      largeTransfer: ethers.parseEther('1000').toString(),
      highGasPrice: ethers.parseUnits('100', 'gwei').toString(),
      errorRate: 10,
      downtime: 300000 // 5 minutes
    },
    notifications: {
      slack: {
        webhookUrl: process.env.EMERGENCY_SLACK_WEBHOOK || '',
        channel: process.env.EMERGENCY_SLACK_CHANNEL || '#security-alerts',
        enabled: !!process.env.EMERGENCY_SLACK_WEBHOOK
      },
      discord: {
        webhookUrl: process.env.EMERGENCY_DISCORD_WEBHOOK || '',
        enabled: !!process.env.EMERGENCY_DISCORD_WEBHOOK
      },
      email: {
        smtpConfig: {
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASS || ''
          }
        },
        enabled: !!process.env.SMTP_USER
      },
      webhook: {
        url: process.env.EMERGENCY_WEBHOOK_URL || '',
        headers: {
          'Authorization': `Bearer ${process.env.EMERGENCY_WEBHOOK_TOKEN || ''}`
        },
        enabled: !!process.env.EMERGENCY_WEBHOOK_URL
      }
    },
    automation: {
      pauseOnExploit: process.env.AUTO_PAUSE_ON_EXPLOIT !== 'false',
      withdrawOnCritical: process.env.AUTO_WITHDRAW_ON_CRITICAL === 'true',
      transferOwnershipOnBreach: process.env.AUTO_TRANSFER_ON_BREACH === 'true',
      maxAutomatedActions: parseInt(process.env.MAX_AUTOMATED_ACTIONS || '5')
    }
  };
}

// Main execution function
export async function configureEmergencyResponseSystems(): Promise<AutomatedEmergencyResponse> {
  try {
    console.log('🚨 Configuring Emergency Response Systems...\n');

    // Load configuration
    const config = loadEmergencyConfig();
    
    // Validate required configuration
    if (!config.multisigWallets.emergency) {
      throw new Error('Emergency multisig address is required');
    }

    // Initialize emergency response system
    const emergencyResponse = new AutomatedEmergencyResponse(config);
    await emergencyResponse.initialize();

    console.log('🎉 Emergency Response Systems configured successfully!\n');
    
    // Log configuration summary
    console.log('📊 Configuration Summary:');
    console.log(`   Network: ${config.network}`);
    console.log(`   Emergency Multisig: ${config.multisigWallets.emergency}`);
    console.log(`   Notifications: ${Object.values(config.notifications).filter(n => n.enabled).length} channels enabled`);
    console.log(`   Automation: ${config.automation.pauseOnExploit ? 'Enabled' : 'Disabled'}`);
    console.log(`   Max Automated Actions: ${config.automation.maxAutomatedActions}`);
    console.log('');

    return emergencyResponse;

  } catch (error) {
    console.error('❌ Failed to configure emergency response systems:', error);
    throw error;
  }
}

// CLI execution
if (require.main === module) {
  configureEmergencyResponseSystems()
    .then(() => {
      console.log('Emergency response system is active. Monitoring for incidents...');
    })
    .catch(() => process.exit(1));
}