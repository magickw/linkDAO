import { EventEmitter } from 'events';
import { ethers } from 'ethers';

export interface SecurityAudit {
  id: string;
  contractName: string;
  contractAddress: string;
  auditType: 'routine' | 'targeted' | 'emergency' | 'pre-upgrade';
  status: 'scheduled' | 'in-progress' | 'completed' | 'failed';
  scheduledDate: Date;
  completedDate?: Date;
  auditor: string;
  findings: AuditFinding[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

export interface AuditFinding {
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  category: 'access-control' | 'reentrancy' | 'overflow' | 'logic' | 'gas' | 'other';
  title: string;
  description: string;
  location: string;
  recommendation: string;
  status: 'open' | 'acknowledged' | 'fixed' | 'wont-fix';
}

export interface AuditSchedule {
  contractName: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'annually';
  lastAudit: Date;
  nextAudit: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export class SecurityAuditScheduler extends EventEmitter {
  private audits: Map<string, SecurityAudit> = new Map();
  private schedules: Map<string, AuditSchedule> = new Map();
  private auditTools: AuditTool[] = [];
  private schedulerInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.setupDefaultAuditTools();
  }

  private setupDefaultAuditTools() {
    this.auditTools = [
      {
        name: 'Slither',
        command: 'slither',
        args: ['--json', '-'],
        type: 'static-analysis'
      },
      {
        name: 'MythX',
        command: 'mythx',
        args: ['analyze'],
        type: 'symbolic-execution'
      },
      {
        name: 'Echidna',
        command: 'echidna-test',
        args: ['--format', 'json'],
        type: 'fuzzing'
      }
    ];
  }

  addContractSchedule(
    contractName: string,
    frequency: 'weekly' | 'monthly' | 'quarterly' | 'annually',
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ) {
    const schedule: AuditSchedule = {
      contractName,
      frequency,
      lastAudit: new Date(0), // Never audited
      nextAudit: this.calculateNextAuditDate(new Date(), frequency),
      priority
    };

    this.schedules.set(contractName, schedule);
    console.log(`Added audit schedule for ${contractName}: ${frequency} audits`);
  }

  private calculateNextAuditDate(lastAudit: Date, frequency: string): Date {
    const next = new Date(lastAudit);
    
    switch (frequency) {
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'annually':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
    
    return next;
  }

  async scheduleAudit(
    contractName: string,
    contractAddress: string,
    auditType: 'routine' | 'targeted' | 'emergency' | 'pre-upgrade' = 'routine',
    scheduledDate: Date = new Date()
  ): Promise<string> {
    const auditId = `audit-${contractName}-${Date.now()}`;
    
    const audit: SecurityAudit = {
      id: auditId,
      contractName,
      contractAddress,
      auditType,
      status: 'scheduled',
      scheduledDate,
      auditor: 'automated',
      findings: [],
      riskLevel: 'low',
      recommendations: []
    };

    this.audits.set(auditId, audit);
    this.emit('auditScheduled', audit);
    
    console.log(`Scheduled ${auditType} audit for ${contractName} (${auditId})`);
    return auditId;
  }

  async runAudit(auditId: string): Promise<SecurityAudit> {
    const audit = this.audits.get(auditId);
    if (!audit) {
      throw new Error(`Audit ${auditId} not found`);
    }

    console.log(`Starting audit ${auditId} for ${audit.contractName}...`);
    audit.status = 'in-progress';
    this.emit('auditStarted', audit);

    try {
      // Run all available audit tools
      const allFindings: AuditFinding[] = [];
      
      for (const tool of this.auditTools) {
        try {
          const findings = await this.runAuditTool(tool, audit.contractAddress);
          allFindings.push(...findings);
        } catch (error) {
          console.warn(`Audit tool ${tool.name} failed:`, error);
        }
      }

      // Process and categorize findings
      audit.findings = this.processFindings(allFindings);
      audit.riskLevel = this.assessOverallRisk(audit.findings);
      audit.recommendations = this.generateRecommendations(audit.findings);
      audit.status = 'completed';
      audit.completedDate = new Date();

      // Update schedule
      const schedule = this.schedules.get(audit.contractName);
      if (schedule) {
        schedule.lastAudit = new Date();
        schedule.nextAudit = this.calculateNextAuditDate(new Date(), schedule.frequency);
      }

      this.emit('auditCompleted', audit);
      console.log(`Completed audit ${auditId}: ${audit.findings.length} findings, risk level: ${audit.riskLevel}`);

    } catch (error) {
      audit.status = 'failed';
      this.emit('auditFailed', audit, error);
      console.error(`Audit ${auditId} failed:`, error);
    }

    return audit;
  }

  private async runAuditTool(tool: AuditTool, contractAddress: string): Promise<AuditFinding[]> {
    // This is a mock implementation - in reality, you'd integrate with actual tools
    const mockFindings: AuditFinding[] = [];

    switch (tool.name) {
      case 'Slither':
        mockFindings.push(...this.generateSlitherFindings());
        break;
      case 'MythX':
        mockFindings.push(...this.generateMythXFindings());
        break;
      case 'Echidna':
        mockFindings.push(...this.generateEchidnaFindings());
        break;
    }

    return mockFindings;
  }

  private generateSlitherFindings(): AuditFinding[] {
    return [
      {
        severity: 'medium',
        category: 'access-control',
        title: 'Missing access control',
        description: 'Function lacks proper access control modifiers',
        location: 'Contract.sol:42',
        recommendation: 'Add onlyOwner or appropriate access control modifier',
        status: 'open'
      }
    ];
  }

  private generateMythXFindings(): AuditFinding[] {
    return [
      {
        severity: 'low',
        category: 'gas',
        title: 'Gas optimization opportunity',
        description: 'Loop can be optimized to reduce gas consumption',
        location: 'Contract.sol:78',
        recommendation: 'Consider using more efficient loop structure',
        status: 'open'
      }
    ];
  }

  private generateEchidnaFindings(): AuditFinding[] {
    return [
      {
        severity: 'info',
        category: 'logic',
        title: 'Invariant check',
        description: 'Contract invariants are maintained under fuzzing',
        location: 'Contract.sol:*',
        recommendation: 'No action required',
        status: 'acknowledged'
      }
    ];
  }

  private processFindings(findings: AuditFinding[]): AuditFinding[] {
    // Remove duplicates and merge similar findings
    const uniqueFindings = new Map<string, AuditFinding>();
    
    for (const finding of findings) {
      const key = `${finding.category}-${finding.title}-${finding.location}`;
      if (!uniqueFindings.has(key)) {
        uniqueFindings.set(key, finding);
      }
    }

    return Array.from(uniqueFindings.values())
      .sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity));
  }

  private getSeverityWeight(severity: string): number {
    switch (severity) {
      case 'critical': return 5;
      case 'high': return 4;
      case 'medium': return 3;
      case 'low': return 2;
      case 'info': return 1;
      default: return 0;
    }
  }

  private assessOverallRisk(findings: AuditFinding[]): 'low' | 'medium' | 'high' | 'critical' {
    const criticalCount = findings.filter(f => f.severity === 'critical').length;
    const highCount = findings.filter(f => f.severity === 'high').length;
    const mediumCount = findings.filter(f => f.severity === 'medium').length;

    if (criticalCount > 0) return 'critical';
    if (highCount > 2) return 'high';
    if (highCount > 0 || mediumCount > 3) return 'medium';
    return 'low';
  }

  private generateRecommendations(findings: AuditFinding[]): string[] {
    const recommendations: string[] = [];

    const criticalFindings = findings.filter(f => f.severity === 'critical');
    const highFindings = findings.filter(f => f.severity === 'high');

    if (criticalFindings.length > 0) {
      recommendations.push('URGENT: Address all critical security findings immediately');
      recommendations.push('Consider emergency pause if contracts are live');
    }

    if (highFindings.length > 0) {
      recommendations.push('High priority: Fix high severity findings before next release');
    }

    if (findings.filter(f => f.category === 'access-control').length > 0) {
      recommendations.push('Review and strengthen access control mechanisms');
    }

    if (findings.filter(f => f.category === 'reentrancy').length > 0) {
      recommendations.push('Implement reentrancy guards where needed');
    }

    return recommendations;
  }

  startScheduler() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
    }

    // Check for due audits every hour
    this.schedulerInterval = setInterval(() => {
      this.checkDueAudits();
    }, 60 * 60 * 1000);

    console.log('Security audit scheduler started');
  }

  stopScheduler() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
    console.log('Security audit scheduler stopped');
  }

  private async checkDueAudits() {
    const now = new Date();
    
    for (const [contractName, schedule] of this.schedules) {
      if (schedule.nextAudit <= now) {
        console.log(`Audit due for ${contractName}`);
        
        // Get contract address (this would come from your contract registry)
        const contractAddress = await this.getContractAddress(contractName);
        
        if (contractAddress) {
          const auditId = await this.scheduleAudit(contractName, contractAddress, 'routine');
          
          // Auto-run routine audits
          setTimeout(() => {
            this.runAudit(auditId);
          }, 1000);
        }
      }
    }
  }

  private async getContractAddress(contractName: string): Promise<string | null> {
    // This would integrate with your contract registry
    // For now, return a mock address
    return '0x' + '0'.repeat(40);
  }

  getAuditHistory(contractName?: string): SecurityAudit[] {
    const audits = Array.from(this.audits.values());
    
    if (contractName) {
      return audits.filter(audit => audit.contractName === contractName);
    }
    
    return audits.sort((a, b) => b.scheduledDate.getTime() - a.scheduledDate.getTime());
  }

  getUpcomingAudits(): AuditSchedule[] {
    return Array.from(this.schedules.values())
      .filter(schedule => schedule.nextAudit > new Date())
      .sort((a, b) => a.nextAudit.getTime() - b.nextAudit.getTime());
  }

  generateAuditReport(auditId: string): string {
    const audit = this.audits.get(auditId);
    if (!audit) {
      throw new Error(`Audit ${auditId} not found`);
    }

    let report = `# Security Audit Report\n\n`;
    report += `**Audit ID**: ${audit.id}\n`;
    report += `**Contract**: ${audit.contractName}\n`;
    report += `**Address**: ${audit.contractAddress}\n`;
    report += `**Type**: ${audit.auditType}\n`;
    report += `**Status**: ${audit.status}\n`;
    report += `**Risk Level**: ${audit.riskLevel.toUpperCase()}\n`;
    report += `**Scheduled**: ${audit.scheduledDate.toISOString()}\n`;
    if (audit.completedDate) {
      report += `**Completed**: ${audit.completedDate.toISOString()}\n`;
    }
    report += '\n';

    // Summary
    report += '## Summary\n\n';
    const severityCounts = this.countBySeverity(audit.findings);
    report += `- **Total Findings**: ${audit.findings.length}\n`;
    report += `- **Critical**: ${severityCounts.critical}\n`;
    report += `- **High**: ${severityCounts.high}\n`;
    report += `- **Medium**: ${severityCounts.medium}\n`;
    report += `- **Low**: ${severityCounts.low}\n`;
    report += `- **Info**: ${severityCounts.info}\n\n`;

    // Findings
    if (audit.findings.length > 0) {
      report += '## Findings\n\n';
      
      for (const finding of audit.findings) {
        const severityEmoji = this.getSeverityEmoji(finding.severity);
        report += `### ${severityEmoji} ${finding.title} (${finding.severity.toUpperCase()})\n\n`;
        report += `**Category**: ${finding.category}\n`;
        report += `**Location**: ${finding.location}\n`;
        report += `**Status**: ${finding.status}\n\n`;
        report += `**Description**: ${finding.description}\n\n`;
        report += `**Recommendation**: ${finding.recommendation}\n\n`;
      }
    }

    // Recommendations
    if (audit.recommendations.length > 0) {
      report += '## Recommendations\n\n';
      for (const rec of audit.recommendations) {
        report += `- ${rec}\n`;
      }
      report += '\n';
    }

    return report;
  }

  private countBySeverity(findings: AuditFinding[]) {
    return {
      critical: findings.filter(f => f.severity === 'critical').length,
      high: findings.filter(f => f.severity === 'high').length,
      medium: findings.filter(f => f.severity === 'medium').length,
      low: findings.filter(f => f.severity === 'low').length,
      info: findings.filter(f => f.severity === 'info').length
    };
  }

  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      case 'info': return 'ℹ️';
      default: return '❓';
    }
  }
}

interface AuditTool {
  name: string;
  command: string;
  args: string[];
  type: 'static-analysis' | 'symbolic-execution' | 'fuzzing' | 'formal-verification';
}