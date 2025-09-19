import { ethers } from 'ethers';
import { EventEmitter } from 'events';

export interface EmergencyProcedure {
  id: string;
  name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  triggerConditions: string[];
  automatedActions: EmergencyAction[];
  manualSteps: string[];
  requiredApprovals: number;
  timeoutMinutes: number;
  contacts: EmergencyContact[];
}

export interface EmergencyAction {
  type: 'pause' | 'unpause' | 'transfer' | 'upgrade' | 'notify' | 'custom';
  contractName: string;
  functionName: string;
  parameters: any[];
  requiresMultiSig: boolean;
  priority: number;
}

export interface EmergencyContact {
  role: string;
  name: string;
  phone: string;
  email: string;
  telegramId?: string;
  priority: number;
}

export interface EmergencyIncident {
  id: string;
  procedureId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'detected' | 'responding' | 'contained' | 'resolved' | 'post-mortem';
  triggeredBy: string;
  triggeredAt: Date;
  description: string;
  affectedContracts: string[];
  actionsExecuted: ExecutedAction[];
  timeline: IncidentEvent[];
  resolution?: string;
  postMortemUrl?: string;
}

export interface ExecutedAction {
  actionId: string;
  executedAt: Date;
  executedBy: string;
  transactionHash?: string;
  success: boolean;
  error?: string;
}

export interface IncidentEvent {
  timestamp: Date;
  type: 'detection' | 'action' | 'escalation' | 'communication' | 'resolution';
  description: string;
  actor: string;
}

export class EmergencyResponseSystem extends EventEmitter {
  private provider: ethers.Provider;
  private signer: ethers.Signer;
  private contracts: Map<string, ethers.Contract> = new Map();
  private procedures: Map<string, EmergencyProcedure> = new Map();
  private incidents: Map<string, EmergencyIncident> = new Map();
  private monitoringActive = false;

  constructor(provider: ethers.Provider, signer: ethers.Signer) {
    super();
    this.provider = provider;
    this.signer = signer;
    this.setupDefaultProcedures();
  }

  private setupDefaultProcedures() {
    // Critical: Contract Exploit Detected
    this.addProcedure({
      id: 'exploit-detected',
      name: 'Contract Exploit Response',
      severity: 'critical',
      triggerConditions: [
        'Unusual large value transfers',
        'Rapid fund drainage',
        'Governance attack detected',
        'Oracle manipulation'
      ],
      automatedActions: [
        {
          type: 'pause',
          contractName: 'all',
          functionName: 'pause',
          parameters: [],
          requiresMultiSig: false,
          priority: 1
        },
        {
          type: 'notify',
          contractName: 'system',
          functionName: 'sendAlert',
          parameters: ['CRITICAL: Exploit detected - all contracts paused'],
          requiresMultiSig: false,
          priority: 2
        }
      ],
      manualSteps: [
        'Assess the scope of the exploit',
        'Contact security team immediately',
        'Prepare public communication',
        'Coordinate with exchanges if needed',
        'Plan recovery strategy'
      ],
      requiredApprovals: 2,
      timeoutMinutes: 15,
      contacts: [
        {
          role: 'Security Lead',
          name: '[SECURITY_LEAD_NAME]',
          phone: '[PHONE_NUMBER]',
          email: '[EMAIL]',
          priority: 1
        },
        {
          role: 'CTO',
          name: '[CTO_NAME]',
          phone: '[PHONE_NUMBER]',
          email: '[EMAIL]',
          priority: 2
        }
      ]
    });

    // High: Governance Attack
    this.addProcedure({
      id: 'governance-attack',
      name: 'Governance Attack Response',
      severity: 'high',
      triggerConditions: [
        'Malicious proposal with high voting power',
        'Unusual voting patterns',
        'Proposal to transfer ownership',
        'Emergency governance changes'
      ],
      automatedActions: [
        {
          type: 'pause',
          contractName: 'Governance',
          functionName: 'pause',
          parameters: [],
          requiresMultiSig: true,
          priority: 1
        }
      ],
      manualSteps: [
        'Analyze the malicious proposal',
        'Calculate required counter-votes',
        'Mobilize community voting',
        'Prepare counter-proposal if needed'
      ],
      requiredApprovals: 3,
      timeoutMinutes: 60,
      contacts: [
        {
          role: 'Governance Lead',
          name: '[GOVERNANCE_LEAD_NAME]',
          phone: '[PHONE_NUMBER]',
          email: '[EMAIL]',
          priority: 1
        }
      ]
    });

    // Medium: High Error Rate
    this.addProcedure({
      id: 'high-error-rate',
      name: 'High Error Rate Response',
      severity: 'medium',
      triggerConditions: [
        'Error rate > 25%',
        'Multiple contract failures',
        'Network congestion issues'
      ],
      automatedActions: [
        {
          type: 'notify',
          contractName: 'system',
          functionName: 'sendAlert',
          parameters: ['High error rate detected'],
          requiresMultiSig: false,
          priority: 1
        }
      ],
      manualSteps: [
        'Investigate error patterns',
        'Check network status',
        'Adjust gas parameters if needed',
        'Monitor for improvement'
      ],
      requiredApprovals: 1,
      timeoutMinutes: 30,
      contacts: [
        {
          role: 'DevOps Engineer',
          name: '[DEVOPS_NAME]',
          phone: '[PHONE_NUMBER]',
          email: '[EMAIL]',
          priority: 1
        }
      ]
    });

    // Low: Parameter Drift
    this.addProcedure({
      id: 'parameter-drift',
      name: 'Parameter Optimization',
      severity: 'low',
      triggerConditions: [
        'Usage patterns changed significantly',
        'Fee optimization needed',
        'Timeout adjustments required'
      ],
      automatedActions: [],
      manualSteps: [
        'Analyze usage patterns',
        'Calculate optimal parameters',
        'Create governance proposal',
        'Implement changes'
      ],
      requiredApprovals: 1,
      timeoutMinutes: 1440, // 24 hours
      contacts: [
        {
          role: 'Product Manager',
          name: '[PM_NAME]',
          phone: '[PHONE_NUMBER]',
          email: '[EMAIL]',
          priority: 1
        }
      ]
    });
  }

  addContract(name: string, address: string, abi: any[]) {
    const contract = new ethers.Contract(address, abi, this.signer);
    this.contracts.set(name, contract);
  }

  addProcedure(procedure: EmergencyProcedure) {
    this.procedures.set(procedure.id, procedure);
    console.log(`Added emergency procedure: ${procedure.name}`);
  }

  async triggerEmergency(
    procedureId: string,
    triggeredBy: string,
    description: string,
    affectedContracts: string[] = []
  ): Promise<string> {
    const procedure = this.procedures.get(procedureId);
    if (!procedure) {
      throw new Error(`Emergency procedure ${procedureId} not found`);
    }

    const incidentId = `incident-${Date.now()}`;
    const incident: EmergencyIncident = {
      id: incidentId,
      procedureId,
      severity: procedure.severity,
      status: 'detected',
      triggeredBy,
      triggeredAt: new Date(),
      description,
      affectedContracts,
      actionsExecuted: [],
      timeline: [
        {
          timestamp: new Date(),
          type: 'detection',
          description: `Emergency detected: ${description}`,
          actor: triggeredBy
        }
      ]
    };

    this.incidents.set(incidentId, incident);
    this.emit('emergencyTriggered', incident);

    console.log(`🚨 EMERGENCY TRIGGERED: ${procedure.name} (${incidentId})`);
    console.log(`Severity: ${procedure.severity.toUpperCase()}`);
    console.log(`Description: ${description}`);

    // Execute automated actions
    await this.executeAutomatedActions(incident, procedure);

    // Notify emergency contacts
    await this.notifyEmergencyContacts(incident, procedure);

    // Update status
    incident.status = 'responding';
    incident.timeline.push({
      timestamp: new Date(),
      type: 'action',
      description: 'Automated response initiated',
      actor: 'system'
    });

    return incidentId;
  }

  private async executeAutomatedActions(
    incident: EmergencyIncident,
    procedure: EmergencyProcedure
  ) {
    console.log(`Executing ${procedure.automatedActions.length} automated actions...`);

    // Sort actions by priority
    const sortedActions = procedure.automatedActions.sort((a, b) => a.priority - b.priority);

    for (const action of sortedActions) {
      try {
        const executedAction = await this.executeAction(action, incident.id);
        incident.actionsExecuted.push(executedAction);

        incident.timeline.push({
          timestamp: new Date(),
          type: 'action',
          description: `Executed ${action.type} on ${action.contractName}`,
          actor: 'system'
        });

      } catch (error) {
        console.error(`Failed to execute action ${action.type}:`, error);
        
        incident.actionsExecuted.push({
          actionId: `${action.type}-${action.contractName}`,
          executedAt: new Date(),
          executedBy: 'system',
          success: false,
          error: `${error}`
        });
      }
    }
  }

  private async executeAction(action: EmergencyAction, incidentId: string): Promise<ExecutedAction> {
    const executedAction: ExecutedAction = {
      actionId: `${action.type}-${action.contractName}`,
      executedAt: new Date(),
      executedBy: await this.signer.getAddress(),
      success: false
    };

    try {
      switch (action.type) {
        case 'pause':
          await this.executePauseAction(action);
          break;
        case 'unpause':
          await this.executeUnpauseAction(action);
          break;
        case 'transfer':
          await this.executeTransferAction(action);
          break;
        case 'notify':
          await this.executeNotifyAction(action);
          break;
        case 'custom':
          await this.executeCustomAction(action);
          break;
      }

      executedAction.success = true;
      console.log(`✅ Executed ${action.type} on ${action.contractName}`);

    } catch (error) {
      executedAction.error = `${error}`;
      console.error(`❌ Failed to execute ${action.type} on ${action.contractName}:`, error);
    }

    return executedAction;
  }

  private async executePauseAction(action: EmergencyAction) {
    if (action.contractName === 'all') {
      // Pause all pausable contracts
      for (const [name, contract] of this.contracts) {
        if (contract.interface.hasFunction('pause')) {
          const tx = await contract.pause();
          await tx.wait();
          console.log(`Paused ${name}`);
        }
      }
    } else {
      const contract = this.contracts.get(action.contractName);
      if (contract && contract.interface.hasFunction('pause')) {
        const tx = await contract.pause();
        await tx.wait();
      }
    }
  }

  private async executeUnpauseAction(action: EmergencyAction) {
    const contract = this.contracts.get(action.contractName);
    if (contract && contract.interface.hasFunction('unpause')) {
      const tx = await contract.unpause();
      await tx.wait();
    }
  }

  private async executeTransferAction(action: EmergencyAction) {
    const contract = this.contracts.get(action.contractName);
    if (contract && contract.interface.hasFunction(action.functionName)) {
      const tx = await contract[action.functionName](...action.parameters);
      await tx.wait();
    }
  }

  private async executeNotifyAction(action: EmergencyAction) {
    // Send notifications through various channels
    const message = action.parameters[0];
    
    // Emit event for monitoring systems
    this.emit('emergencyNotification', {
      message,
      timestamp: new Date(),
      severity: 'critical'
    });

    // Log to console
    console.log(`🚨 EMERGENCY NOTIFICATION: ${message}`);
  }

  private async executeCustomAction(action: EmergencyAction) {
    const contract = this.contracts.get(action.contractName);
    if (contract && contract.interface.hasFunction(action.functionName)) {
      const tx = await contract[action.functionName](...action.parameters);
      await tx.wait();
    }
  }

  private async notifyEmergencyContacts(
    incident: EmergencyIncident,
    procedure: EmergencyProcedure
  ) {
    console.log(`Notifying ${procedure.contacts.length} emergency contacts...`);

    const sortedContacts = procedure.contacts.sort((a, b) => a.priority - b.priority);

    for (const contact of sortedContacts) {
      try {
        await this.sendEmergencyNotification(contact, incident, procedure);
        
        incident.timeline.push({
          timestamp: new Date(),
          type: 'communication',
          description: `Notified ${contact.role}: ${contact.name}`,
          actor: 'system'
        });

      } catch (error) {
        console.error(`Failed to notify ${contact.name}:`, error);
      }
    }
  }

  private async sendEmergencyNotification(
    contact: EmergencyContact,
    incident: EmergencyIncident,
    procedure: EmergencyProcedure
  ) {
    const message = `🚨 EMERGENCY: ${procedure.name}
Incident ID: ${incident.id}
Severity: ${incident.severity.toUpperCase()}
Description: ${incident.description}
Time: ${incident.triggeredAt.toISOString()}
Affected Contracts: ${incident.affectedContracts.join(', ')}

Please respond immediately.`;

    // In a real implementation, you would integrate with:
    // - SMS service (Twilio, AWS SNS)
    // - Email service (SendGrid, AWS SES)
    // - Slack/Discord webhooks
    // - Telegram bot API
    // - Phone call service (for critical incidents)

    console.log(`📞 Would notify ${contact.role} (${contact.name}): ${message}`);
  }

  async resolveIncident(
    incidentId: string,
    resolution: string,
    resolvedBy: string
  ): Promise<void> {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    incident.status = 'resolved';
    incident.resolution = resolution;
    
    incident.timeline.push({
      timestamp: new Date(),
      type: 'resolution',
      description: `Incident resolved: ${resolution}`,
      actor: resolvedBy
    });

    this.emit('incidentResolved', incident);
    console.log(`✅ Incident ${incidentId} resolved by ${resolvedBy}`);
  }

  async createPostMortem(incidentId: string): Promise<string> {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    const procedure = this.procedures.get(incident.procedureId);
    if (!procedure) {
      throw new Error(`Procedure ${incident.procedureId} not found`);
    }

    let postMortem = `# Post-Mortem: ${procedure.name}\n\n`;
    postMortem += `**Incident ID**: ${incident.id}\n`;
    postMortem += `**Date**: ${incident.triggeredAt.toISOString()}\n`;
    postMortem += `**Severity**: ${incident.severity.toUpperCase()}\n`;
    postMortem += `**Duration**: ${this.calculateIncidentDuration(incident)}\n`;
    postMortem += `**Triggered By**: ${incident.triggeredBy}\n\n`;

    postMortem += `## Summary\n\n${incident.description}\n\n`;

    postMortem += `## Affected Systems\n\n`;
    for (const contract of incident.affectedContracts) {
      postMortem += `- ${contract}\n`;
    }
    postMortem += '\n';

    postMortem += `## Timeline\n\n`;
    for (const event of incident.timeline) {
      postMortem += `- **${event.timestamp.toISOString()}**: ${event.description} (${event.actor})\n`;
    }
    postMortem += '\n';

    postMortem += `## Actions Taken\n\n`;
    for (const action of incident.actionsExecuted) {
      const status = action.success ? '✅' : '❌';
      postMortem += `- ${status} ${action.actionId} at ${action.executedAt.toISOString()}`;
      if (action.transactionHash) {
        postMortem += ` (${action.transactionHash})`;
      }
      if (action.error) {
        postMortem += ` - Error: ${action.error}`;
      }
      postMortem += '\n';
    }
    postMortem += '\n';

    postMortem += `## Root Cause Analysis\n\n`;
    postMortem += `[To be filled by incident commander]\n\n`;

    postMortem += `## Lessons Learned\n\n`;
    postMortem += `[To be filled by team]\n\n`;

    postMortem += `## Action Items\n\n`;
    postMortem += `- [ ] Update monitoring to detect this issue earlier\n`;
    postMortem += `- [ ] Improve automated response procedures\n`;
    postMortem += `- [ ] Update documentation and runbooks\n`;
    postMortem += `- [ ] Conduct team training on lessons learned\n\n`;

    return postMortem;
  }

  private calculateIncidentDuration(incident: EmergencyIncident): string {
    const start = incident.triggeredAt;
    const end = incident.timeline
      .filter(e => e.type === 'resolution')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]?.timestamp || new Date();

    const durationMs = end.getTime() - start.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  }

  getActiveIncidents(): EmergencyIncident[] {
    return Array.from(this.incidents.values())
      .filter(incident => incident.status !== 'resolved')
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());
  }

  getIncidentHistory(limit?: number): EmergencyIncident[] {
    const incidents = Array.from(this.incidents.values())
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());

    return limit ? incidents.slice(0, limit) : incidents;
  }

  generateEmergencyReport(): string {
    let report = '# Emergency Response System Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    const incidents = this.getIncidentHistory();
    const activeIncidents = this.getActiveIncidents();

    report += '## Summary\n\n';
    report += `- Total Incidents: ${incidents.length}\n`;
    report += `- Active Incidents: ${activeIncidents.length}\n`;
    report += `- Procedures Configured: ${this.procedures.size}\n`;
    report += `- Contracts Monitored: ${this.contracts.size}\n\n`;

    // Active incidents
    if (activeIncidents.length > 0) {
      report += '## 🚨 Active Incidents\n\n';
      for (const incident of activeIncidents) {
        report += `### ${incident.id}\n`;
        report += `- **Severity**: ${incident.severity.toUpperCase()}\n`;
        report += `- **Status**: ${incident.status}\n`;
        report += `- **Started**: ${incident.triggeredAt.toISOString()}\n`;
        report += `- **Description**: ${incident.description}\n\n`;
      }
    }

    // Recent incidents
    const recentIncidents = incidents.slice(0, 10);
    if (recentIncidents.length > 0) {
      report += '## Recent Incidents\n\n';
      report += '| ID | Severity | Status | Date | Description |\n';
      report += '|----|----------|--------|------|-------------|\n';
      
      for (const incident of recentIncidents) {
        report += `| ${incident.id} | ${incident.severity} | ${incident.status} | ${incident.triggeredAt.toDateString()} | ${incident.description} |\n`;
      }
      report += '\n';
    }

    // Procedure effectiveness
    report += '## Procedure Effectiveness\n\n';
    const procedureStats = this.calculateProcedureStats();
    
    for (const [procedureId, stats] of procedureStats) {
      const procedure = this.procedures.get(procedureId);
      if (procedure) {
        report += `### ${procedure.name}\n`;
        report += `- **Triggered**: ${stats.triggered} times\n`;
        report += `- **Success Rate**: ${stats.successRate.toFixed(1)}%\n`;
        report += `- **Avg Resolution Time**: ${stats.avgResolutionTime}\n\n`;
      }
    }

    return report;
  }

  private calculateProcedureStats(): Map<string, any> {
    const stats = new Map();
    
    for (const incident of this.incidents.values()) {
      const existing = stats.get(incident.procedureId) || {
        triggered: 0,
        resolved: 0,
        totalResolutionTime: 0
      };
      
      existing.triggered++;
      
      if (incident.status === 'resolved') {
        existing.resolved++;
        const duration = this.calculateIncidentDurationMs(incident);
        existing.totalResolutionTime += duration;
      }
      
      stats.set(incident.procedureId, existing);
    }

    // Calculate derived metrics
    for (const [procedureId, data] of stats) {
      data.successRate = data.triggered > 0 ? (data.resolved / data.triggered) * 100 : 0;
      data.avgResolutionTime = data.resolved > 0 
        ? this.formatDuration(data.totalResolutionTime / data.resolved)
        : 'N/A';
    }

    return stats;
  }

  private calculateIncidentDurationMs(incident: EmergencyIncident): number {
    const start = incident.triggeredAt;
    const end = incident.timeline
      .filter(e => e.type === 'resolution')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]?.timestamp;

    return end ? end.getTime() - start.getTime() : 0;
  }

  private formatDuration(ms: number): string {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }
}