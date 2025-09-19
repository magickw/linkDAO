import { ethers } from 'ethers';
import { SecurityAuditScheduler } from './SecurityAuditScheduler';
import { ParameterTuningSystem } from './ParameterTuningSystem';
import { EmergencyResponseSystem } from './EmergencyResponseSystem';
import { CommunityFeedbackSystem } from './CommunityFeedbackSystem';
import { EventEmitter } from 'events';

export interface MaintenanceConfig {
  auditFrequency: 'weekly' | 'monthly' | 'quarterly';
  parameterAnalysisInterval: number; // hours
  emergencyResponseEnabled: boolean;
  communityFeedbackEnabled: boolean;
  autoImplementLowRiskChanges: boolean;
  governanceThreshold: number; // minimum votes for governance proposals
}

export interface MaintenanceStatus {
  lastAudit: Date;
  nextAudit: Date;
  pendingRecommendations: number;
  activeIncidents: number;
  communityFeedbackCount: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  uptime: number;
}

export class MaintenanceOrchestrator extends EventEmitter {
  private provider: ethers.Provider;
  private signer: ethers.Signer;
  private config: MaintenanceConfig;
  
  private auditScheduler: SecurityAuditScheduler;
  private parameterTuning: ParameterTuningSystem;
  private emergencyResponse: EmergencyResponseSystem;
  private communityFeedback: CommunityFeedbackSystem;
  
  private contracts: Map<string, { address: string; abi: any[] }> = new Map();
  private maintenanceInterval: NodeJS.Timeout | null = null;
  private startTime: Date;

  constructor(
    provider: ethers.Provider,
    signer: ethers.Signer,
    config: MaintenanceConfig
  ) {
    super();
    this.provider = provider;
    this.signer = signer;
    this.config = config;
    this.startTime = new Date();

    // Initialize subsystems
    this.auditScheduler = new SecurityAuditScheduler();
    this.parameterTuning = new ParameterTuningSystem(provider, signer);
    this.emergencyResponse = new EmergencyResponseSystem(provider, signer);
    this.communityFeedback = new CommunityFeedbackSystem();

    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Audit scheduler events
    this.auditScheduler.on('auditCompleted', (audit) => {
      this.handleAuditCompleted(audit);
    });

    this.auditScheduler.on('auditFailed', (audit, error) => {
      this.handleAuditFailed(audit, error);
    });

    // Parameter tuning events
    this.parameterTuning.on('recommendationGenerated', (recommendation) => {
      this.handleParameterRecommendation(recommendation);
    });

    // Emergency response events
    this.emergencyResponse.on('emergencyTriggered', (incident) => {
      this.handleEmergencyIncident(incident);
    });

    this.emergencyResponse.on('incidentResolved', (incident) => {
      this.handleIncidentResolved(incident);
    });

    // Community feedback events
    this.communityFeedback.on('feedbackSubmitted', (feedback) => {
      this.handleCommunityFeedback(feedback);
    });
  }

  async initialize(contractConfigs: { name: string; address: string; abi: any[] }[]) {
    console.log('🔧 Initializing Maintenance Orchestrator...');

    // Register contracts with all subsystems
    for (const config of contractConfigs) {
      this.contracts.set(config.name, { address: config.address, abi: config.abi });
      
      // Add to subsystems
      this.auditScheduler.addContractSchedule(config.name, this.config.auditFrequency);
      this.parameterTuning.addContract(config.name, config.address, config.abi);
      this.emergencyResponse.addContract(config.name, config.address, config.abi);
    }

    // Start subsystems
    this.auditScheduler.startScheduler();
    this.parameterTuning.startAnalysis(this.config.parameterAnalysisInterval);

    // Start main maintenance loop
    this.startMaintenanceLoop();

    console.log('✅ Maintenance Orchestrator initialized successfully');
    this.emit('initialized');
  }

  private startMaintenanceLoop() {
    // Run maintenance checks every hour
    this.maintenanceInterval = setInterval(() => {
      this.performMaintenanceChecks();
    }, 60 * 60 * 1000);

    console.log('🔄 Maintenance loop started');
  }

  private async performMaintenanceChecks() {
    console.log('🔍 Performing routine maintenance checks...');

    try {
      // Check system health
      const health = await this.assessSystemHealth();
      
      // Process pending recommendations
      await this.processPendingRecommendations();
      
      // Check for community feedback requiring attention
      await this.processCommunityFeedback();
      
      // Generate maintenance report if needed
      if (this.shouldGenerateReport()) {
        await this.generateMaintenanceReport();
      }

      this.emit('maintenanceCheckCompleted', health);

    } catch (error) {
      console.error('❌ Maintenance check failed:', error);
      this.emit('maintenanceCheckFailed', error);
    }
  }

  private async assessSystemHealth(): Promise<'healthy' | 'warning' | 'critical'> {
    let healthScore = 100;
    const issues: string[] = [];

    // Check for active incidents
    const activeIncidents = this.emergencyResponse.getActiveIncidents();
    if (activeIncidents.length > 0) {
      const criticalIncidents = activeIncidents.filter(i => i.severity === 'critical');
      if (criticalIncidents.length > 0) {
        healthScore -= 50;
        issues.push(`${criticalIncidents.length} critical incidents active`);
      } else {
        healthScore -= 20;
        issues.push(`${activeIncidents.length} incidents active`);
      }
    }

    // Check audit status
    const auditHistory = this.auditScheduler.getAuditHistory();
    const recentAudits = auditHistory.filter(a => 
      a.completedDate && a.completedDate > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    
    const criticalFindings = recentAudits.flatMap(a => a.findings)
      .filter(f => f.severity === 'critical' && f.status === 'open');
    
    if (criticalFindings.length > 0) {
      healthScore -= 30;
      issues.push(`${criticalFindings.length} critical security findings`);
    }

    // Check parameter recommendations
    const highPriorityRecs = this.parameterTuning.getRecommendations('pending')
      .filter(r => r.confidence > 80);
    
    if (highPriorityRecs.length > 5) {
      healthScore -= 10;
      issues.push(`${highPriorityRecs.length} high-confidence parameter recommendations pending`);
    }

    // Check community feedback
    const urgentFeedback = this.communityFeedback.getFeedback({
      severity: 'critical',
      status: 'submitted'
    });
    
    if (urgentFeedback.length > 0) {
      healthScore -= 15;
      issues.push(`${urgentFeedback.length} critical community reports unaddressed`);
    }

    // Determine health status
    let health: 'healthy' | 'warning' | 'critical';
    if (healthScore >= 80) {
      health = 'healthy';
    } else if (healthScore >= 60) {
      health = 'warning';
    } else {
      health = 'critical';
    }

    if (issues.length > 0) {
      console.log(`⚠️ System health: ${health.toUpperCase()} (${healthScore}/100)`);
      console.log('Issues:', issues.join(', '));
    }

    return health;
  }

  private async processPendingRecommendations() {
    const recommendations = this.parameterTuning.getRecommendations('pending');
    
    for (const rec of recommendations) {
      // Auto-implement low-risk, high-confidence recommendations
      if (this.config.autoImplementLowRiskChanges && 
          rec.confidence > 90 && 
          this.isLowRiskChange(rec)) {
        
        try {
          const success = await this.parameterTuning.implementRecommendation(rec.id);
          if (success) {
            console.log(`✅ Auto-implemented recommendation: ${rec.contractName}.${rec.parameterName}`);
          }
        } catch (error) {
          console.error(`❌ Failed to auto-implement recommendation ${rec.id}:`, error);
        }
      }
      
      // Create governance proposals for high-impact changes
      else if (rec.confidence > 75 && this.isHighImpactChange(rec)) {
        await this.createGovernanceProposal(rec);
      }
    }
  }

  private isLowRiskChange(recommendation: any): boolean {
    // Define criteria for low-risk changes
    const lowRiskParameters = [
      'maxReviewsPerDay',
      'mintingFee',
      'maxListingDuration'
    ];
    
    return lowRiskParameters.includes(recommendation.parameterName) &&
           Math.abs(parseFloat(recommendation.recommendedValue) - parseFloat(recommendation.currentValue)) < 
           parseFloat(recommendation.currentValue) * 0.1; // Less than 10% change
  }

  private isHighImpactChange(recommendation: any): boolean {
    const highImpactParameters = [
      'platformFee',
      'quorum',
      'votingPeriod',
      'defaultTimeout'
    ];
    
    return highImpactParameters.includes(recommendation.parameterName);
  }

  private async createGovernanceProposal(recommendation: any) {
    // This would integrate with your governance system
    console.log(`📋 Creating governance proposal for ${recommendation.contractName}.${recommendation.parameterName}`);
    
    // For now, just log the proposal details
    const proposalDescription = `
Parameter Tuning Proposal: ${recommendation.contractName}.${recommendation.parameterName}

Current Value: ${recommendation.currentValue}
Recommended Value: ${recommendation.recommendedValue}
Confidence: ${recommendation.confidence}%

Expected Impact: ${recommendation.expectedImpact}

This proposal is based on analysis of ${recommendation.basedOnData.length} usage patterns.
    `.trim();

    console.log(proposalDescription);
  }

  private async processCommunityFeedback() {
    const urgentFeedback = this.communityFeedback.getFeedback({
      severity: 'critical',
      status: 'submitted'
    });

    for (const feedback of urgentFeedback) {
      // Auto-escalate security concerns
      if (feedback.type === 'security-concern') {
        await this.emergencyResponse.triggerEmergency(
          'exploit-detected',
          'community-feedback',
          `Security concern reported: ${feedback.title}`,
          feedback.contractsAffected
        );
      }
      
      // Auto-triage other urgent feedback
      this.communityFeedback.updateFeedbackStatus(
        feedback.id,
        'triaged',
        'system',
        'Auto-triaged due to critical severity'
      );
    }
  }

  private shouldGenerateReport(): boolean {
    // Generate daily reports
    const lastReport = new Date();
    lastReport.setHours(0, 0, 0, 0);
    
    const now = new Date();
    return now.getDate() !== lastReport.getDate();
  }

  private async generateMaintenanceReport() {
    console.log('📊 Generating maintenance report...');
    
    const status = await this.getMaintenanceStatus();
    const report = this.generateComprehensiveReport(status);
    
    // In a real implementation, you'd save this to a file or send it somewhere
    console.log('Maintenance report generated');
    this.emit('reportGenerated', report);
  }

  // Event handlers
  private async handleAuditCompleted(audit: any) {
    console.log(`✅ Audit completed for ${audit.contractName}: ${audit.findings.length} findings`);
    
    // Check for critical findings
    const criticalFindings = audit.findings.filter((f: any) => f.severity === 'critical');
    if (criticalFindings.length > 0) {
      await this.emergencyResponse.triggerEmergency(
        'exploit-detected',
        'security-audit',
        `Critical security findings in ${audit.contractName}`,
        [audit.contractName]
      );
    }
  }

  private async handleAuditFailed(audit: any, error: any) {
    console.error(`❌ Audit failed for ${audit.contractName}:`, error);
    
    // Create community feedback for audit failure
    this.communityFeedback.submitFeedback(
      'bug-report',
      `Security audit failed for ${audit.contractName}`,
      `Automated security audit failed with error: ${error}`,
      'system',
      [audit.contractName],
      'high'
    );
  }

  private async handleParameterRecommendation(recommendation: any) {
    console.log(`💡 New parameter recommendation: ${recommendation.contractName}.${recommendation.parameterName}`);
    
    // High-confidence recommendations for critical parameters trigger alerts
    if (recommendation.confidence > 90 && this.isHighImpactChange(recommendation)) {
      this.emit('criticalRecommendation', recommendation);
    }
  }

  private async handleEmergencyIncident(incident: any) {
    console.log(`🚨 Emergency incident: ${incident.description}`);
    
    // Pause parameter tuning during emergencies
    this.parameterTuning.stopAnalysis();
    
    // Create community feedback for transparency
    this.communityFeedback.submitFeedback(
      'security-concern',
      `Emergency incident: ${incident.procedureId}`,
      incident.description,
      'system',
      incident.affectedContracts,
      'critical'
    );
  }

  private async handleIncidentResolved(incident: any) {
    console.log(`✅ Incident resolved: ${incident.id}`);
    
    // Resume parameter tuning
    this.parameterTuning.startAnalysis(this.config.parameterAnalysisInterval);
    
    // Update community on resolution
    this.communityFeedback.addComment(
      `feedback-${incident.id}`,
      'system',
      `Incident resolved: ${incident.resolution}`
    );
  }

  private async handleCommunityFeedback(feedback: any) {
    console.log(`💬 New community feedback: ${feedback.title}`);
    
    // Auto-escalate security concerns
    if (feedback.type === 'security-concern' && feedback.severity === 'critical') {
      setTimeout(() => {
        this.emergencyResponse.triggerEmergency(
          'exploit-detected',
          'community-feedback',
          feedback.description,
          feedback.contractsAffected
        );
      }, 1000); // Small delay to allow for processing
    }
  }

  // Public methods
  async getMaintenanceStatus(): Promise<MaintenanceStatus> {
    const auditHistory = this.auditScheduler.getAuditHistory();
    const lastAudit = auditHistory[0]?.completedDate || new Date(0);
    const upcomingAudits = this.auditScheduler.getUpcomingAudits();
    const nextAudit = upcomingAudits[0]?.nextAudit || new Date();
    
    const pendingRecommendations = this.parameterTuning.getRecommendations('pending').length;
    const activeIncidents = this.emergencyResponse.getActiveIncidents().length;
    const communityFeedbackCount = this.communityFeedback.getFeedback().length;
    
    const systemHealth = await this.assessSystemHealth();
    const uptime = Date.now() - this.startTime.getTime();

    return {
      lastAudit,
      nextAudit,
      pendingRecommendations,
      activeIncidents,
      communityFeedbackCount,
      systemHealth,
      uptime: uptime / (1000 * 60 * 60) // Convert to hours
    };
  }

  generateComprehensiveReport(status: MaintenanceStatus): string {
    let report = '# Comprehensive Maintenance Report\n\n';
    report += `**Generated**: ${new Date().toISOString()}\n`;
    report += `**System Uptime**: ${status.uptime.toFixed(1)} hours\n`;
    report += `**Health Status**: ${status.systemHealth.toUpperCase()}\n\n`;

    // System overview
    report += '## System Overview\n\n';
    report += `- **Contracts Monitored**: ${this.contracts.size}\n`;
    report += `- **Last Security Audit**: ${status.lastAudit.toDateString()}\n`;
    report += `- **Next Security Audit**: ${status.nextAudit.toDateString()}\n`;
    report += `- **Pending Recommendations**: ${status.pendingRecommendations}\n`;
    report += `- **Active Incidents**: ${status.activeIncidents}\n`;
    report += `- **Community Feedback Items**: ${status.communityFeedbackCount}\n\n`;

    // Security audit summary
    report += '## Security Audit Summary\n\n';
    report += this.auditScheduler.generateAuditReport('latest') || 'No recent audits available\n\n';

    // Parameter tuning summary
    report += '## Parameter Tuning Summary\n\n';
    report += this.parameterTuning.generateTuningReport();

    // Emergency response summary
    report += '## Emergency Response Summary\n\n';
    report += this.emergencyResponse.generateEmergencyReport();

    // Community feedback summary
    report += '## Community Feedback Summary\n\n';
    report += this.communityFeedback.generateFeedbackReport();

    return report;
  }

  async shutdown() {
    console.log('🔧 Shutting down Maintenance Orchestrator...');
    
    // Stop all subsystems
    this.auditScheduler.stopScheduler();
    this.parameterTuning.stopAnalysis();
    
    // Stop maintenance loop
    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval);
      this.maintenanceInterval = null;
    }
    
    console.log('✅ Maintenance Orchestrator shut down successfully');
    this.emit('shutdown');
  }
}

// Factory function for easy setup
export async function createMaintenanceSystem(
  provider: ethers.Provider,
  signer: ethers.Signer,
  contractConfigs: { name: string; address: string; abi: any[] }[],
  config: Partial<MaintenanceConfig> = {}
): Promise<MaintenanceOrchestrator> {
  
  const defaultConfig: MaintenanceConfig = {
    auditFrequency: 'monthly',
    parameterAnalysisInterval: 24, // 24 hours
    emergencyResponseEnabled: true,
    communityFeedbackEnabled: true,
    autoImplementLowRiskChanges: false, // Conservative default
    governanceThreshold: 100000 // 100k votes
  };

  const finalConfig = { ...defaultConfig, ...config };
  
  const orchestrator = new MaintenanceOrchestrator(provider, signer, finalConfig);
  await orchestrator.initialize(contractConfigs);
  
  return orchestrator;
}