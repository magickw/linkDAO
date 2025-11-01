import { moderationLoggingService } from './moderationLoggingService';
import { safeLogger } from '../utils/safeLogger';
import { moderationMetricsService } from './moderationMetricsService';
import { moderationAlertingService } from './moderationAlertingService';

export interface PolicyVersion {
  id: string;
  version: string;
  name: string;
  description: string;
  config: PolicyConfig;
  createdAt: Date;
  createdBy: string;
  status: 'draft' | 'testing' | 'canary' | 'production' | 'deprecated';
}

export interface PolicyConfig {
  thresholds: Record<string, number>;
  rules: Array<{
    category: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    action: 'allow' | 'limit' | 'block' | 'review';
    confidence: number;
  }>;
  vendorWeights: Record<string, number>;
  reputationModifiers: Record<string, number>;
  customRules?: Array<{
    name: string;
    condition: string;
    action: string;
  }>;
}

export interface CanaryDeployment {
  id: string;
  policyVersionId: string;
  trafficPercentage: number;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'paused' | 'completed' | 'failed' | 'rolled_back';
  targetMetrics: {
    maxErrorRate: number;
    maxLatencyIncrease: number;
    minAccuracy: number;
    maxFalsePositiveIncrease: number;
  };
  actualMetrics?: {
    errorRate: number;
    latencyIncrease: number;
    accuracy: number;
    falsePositiveRate: number;
  };
  rollbackTriggers: string[];
  createdBy: string;
}

export interface DeploymentMetrics {
  canaryMetrics: {
    decisions: number;
    errorRate: number;
    averageLatency: number;
    falsePositiveRate: number;
    userFeedback: number;
  };
  controlMetrics: {
    decisions: number;
    errorRate: number;
    averageLatency: number;
    falsePositiveRate: number;
    userFeedback: number;
  };
  comparison: {
    errorRateDiff: number;
    latencyDiff: number;
    accuracyDiff: number;
    significanceLevel: number;
  };
}

class CanaryDeploymentService {
  private policyVersions = new Map<string, PolicyVersion>();
  private activeDeployments = new Map<string, CanaryDeployment>();
  private currentProductionPolicy: string | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeDefaultPolicy();
    this.startMonitoring();
  }

  /**
   * Initialize default production policy
   */
  private initializeDefaultPolicy(): void {
    const defaultPolicy: PolicyVersion = {
      id: 'default_v1',
      version: '1.0.0',
      name: 'Default Production Policy',
      description: 'Initial production policy configuration',
      config: {
        thresholds: {
          harassment: 0.8,
          spam: 0.85,
          violence: 0.9,
          scam: 0.95,
          nsfw: 0.8
        },
        rules: [
          {
            category: 'harassment',
            severity: 'high',
            action: 'block',
            confidence: 0.8
          },
          {
            category: 'spam',
            severity: 'medium',
            action: 'limit',
            confidence: 0.85
          },
          {
            category: 'violence',
            severity: 'critical',
            action: 'block',
            confidence: 0.9
          }
        ],
        vendorWeights: {
          openai: 0.4,
          perspective: 0.3,
          google_vision: 0.3
        },
        reputationModifiers: {
          low: 1.2,
          medium: 1.0,
          high: 0.8
        }
      },
      createdAt: new Date(),
      createdBy: 'system',
      status: 'production'
    };

    this.policyVersions.set(defaultPolicy.id, defaultPolicy);
    this.currentProductionPolicy = defaultPolicy.id;
  }

  /**
   * Create a new policy version
   */
  async createPolicyVersion(
    name: string,
    description: string,
    config: PolicyConfig,
    createdBy: string
  ): Promise<PolicyVersion> {
    const version = this.generateVersionNumber();
    const policyVersion: PolicyVersion = {
      id: `policy_${Date.now()}`,
      version,
      name,
      description,
      config,
      createdAt: new Date(),
      createdBy,
      status: 'draft'
    };

    this.policyVersions.set(policyVersion.id, policyVersion);

    await moderationLoggingService.logModerationDecision({
      timestamp: new Date(),
      eventType: 'decision',
      contentId: 'system',
      userId: createdBy,
      metadata: {
        action: 'policy_version_created',
        policyId: policyVersion.id,
        version: policyVersion.version
      }
    });

    return policyVersion;
  }

  /**
   * Start a canary deployment
   */
  async startCanaryDeployment(
    policyVersionId: string,
    trafficPercentage: number,
    targetMetrics: CanaryDeployment['targetMetrics'],
    createdBy: string
  ): Promise<CanaryDeployment> {
    const policyVersion = this.policyVersions.get(policyVersionId);
    if (!policyVersion) {
      throw new Error(`Policy version ${policyVersionId} not found`);
    }

    if (policyVersion.status !== 'draft' && policyVersion.status !== 'testing') {
      throw new Error(`Policy version must be in draft or testing status to deploy`);
    }

    // Check if there's already an active deployment
    const activeDeployment = Array.from(this.activeDeployments.values())
      .find(d => d.status === 'active');
    
    if (activeDeployment) {
      throw new Error(`Cannot start new deployment while ${activeDeployment.id} is active`);
    }

    const deployment: CanaryDeployment = {
      id: `canary_${Date.now()}`,
      policyVersionId,
      trafficPercentage: Math.min(Math.max(trafficPercentage, 1), 50), // Limit to 1-50%
      startTime: new Date(),
      status: 'active',
      targetMetrics,
      rollbackTriggers: [],
      createdBy
    };

    this.activeDeployments.set(deployment.id, deployment);
    policyVersion.status = 'canary';

    await moderationLoggingService.logModerationDecision({
      timestamp: new Date(),
      eventType: 'decision',
      contentId: 'system',
      userId: createdBy,
      metadata: {
        action: 'canary_deployment_started',
        deploymentId: deployment.id,
        policyId: policyVersionId,
        trafficPercentage
      }
    });

    return deployment;
  }

  /**
   * Get deployment metrics comparison
   */
  async getDeploymentMetrics(deploymentId: string): Promise<DeploymentMetrics | null> {
    const deployment = this.activeDeployments.get(deploymentId);
    if (!deployment || deployment.status !== 'active') {
      return null;
    }

    const timeWindow = Date.now() - deployment.startTime.getTime();
    
    // Get metrics for canary and control groups
    const [canaryMetrics, controlMetrics] = await Promise.all([
      this.getGroupMetrics('canary', timeWindow),
      this.getGroupMetrics('control', timeWindow)
    ]);

    // Calculate statistical significance
    const comparison = this.calculateStatisticalComparison(canaryMetrics, controlMetrics);

    return {
      canaryMetrics,
      controlMetrics,
      comparison
    };
  }

  /**
   * Check if deployment should be rolled back
   */
  async checkRollbackConditions(deploymentId: string): Promise<{
    shouldRollback: boolean;
    reasons: string[];
  }> {
    const deployment = this.activeDeployments.get(deploymentId);
    if (!deployment || deployment.status !== 'active') {
      return { shouldRollback: false, reasons: [] };
    }

    const metrics = await this.getDeploymentMetrics(deploymentId);
    if (!metrics) {
      return { shouldRollback: false, reasons: [] };
    }

    const reasons: string[] = [];

    // Check error rate
    if (metrics.canaryMetrics.errorRate > deployment.targetMetrics.maxErrorRate) {
      reasons.push(`Error rate ${(metrics.canaryMetrics.errorRate * 100).toFixed(2)}% exceeds target ${(deployment.targetMetrics.maxErrorRate * 100).toFixed(2)}%`);
    }

    // Check latency increase
    const latencyIncrease = (metrics.canaryMetrics.averageLatency - metrics.controlMetrics.averageLatency) / metrics.controlMetrics.averageLatency;
    if (latencyIncrease > deployment.targetMetrics.maxLatencyIncrease) {
      reasons.push(`Latency increase ${(latencyIncrease * 100).toFixed(2)}% exceeds target ${(deployment.targetMetrics.maxLatencyIncrease * 100).toFixed(2)}%`);
    }

    // Check false positive rate
    if (metrics.canaryMetrics.falsePositiveRate > deployment.targetMetrics.maxFalsePositiveIncrease) {
      reasons.push(`False positive rate ${(metrics.canaryMetrics.falsePositiveRate * 100).toFixed(2)}% exceeds target`);
    }

    // Check statistical significance for negative changes
    if (metrics.comparison.significanceLevel > 0.95 && metrics.comparison.errorRateDiff > 0.02) {
      reasons.push(`Statistically significant increase in error rate detected`);
    }

    return {
      shouldRollback: reasons.length > 0,
      reasons
    };
  }

  /**
   * Rollback a canary deployment
   */
  async rollbackDeployment(deploymentId: string, reason: string, rolledBackBy: string): Promise<void> {
    const deployment = this.activeDeployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    deployment.status = 'rolled_back';
    deployment.endTime = new Date();
    deployment.rollbackTriggers.push(reason);

    const policyVersion = this.policyVersions.get(deployment.policyVersionId);
    if (policyVersion) {
      policyVersion.status = 'testing';
    }

    await moderationLoggingService.logModerationDecision({
      timestamp: new Date(),
      eventType: 'decision',
      contentId: 'system',
      userId: rolledBackBy,
      metadata: {
        action: 'canary_deployment_rolled_back',
        deploymentId,
        reason,
        policyId: deployment.policyVersionId
      }
    });

    // Trigger alert
    await moderationAlertingService.testAlert('canary_rollback');
  }

  /**
   * Promote canary to production
   */
  async promoteToProduction(deploymentId: string, promotedBy: string): Promise<void> {
    const deployment = this.activeDeployments.get(deploymentId);
    if (!deployment || deployment.status !== 'active') {
      throw new Error(`Cannot promote deployment ${deploymentId}`);
    }

    // Verify metrics are within acceptable range
    const rollbackCheck = await this.checkRollbackConditions(deploymentId);
    if (rollbackCheck.shouldRollback) {
      throw new Error(`Cannot promote deployment with issues: ${rollbackCheck.reasons.join(', ')}`);
    }

    // Update deployment status
    deployment.status = 'completed';
    deployment.endTime = new Date();

    // Update policy versions
    const newPolicyVersion = this.policyVersions.get(deployment.policyVersionId);
    if (newPolicyVersion) {
      newPolicyVersion.status = 'production';
    }

    // Deprecate old production policy
    if (this.currentProductionPolicy) {
      const oldPolicy = this.policyVersions.get(this.currentProductionPolicy);
      if (oldPolicy) {
        oldPolicy.status = 'deprecated';
      }
    }

    this.currentProductionPolicy = deployment.policyVersionId;

    await moderationLoggingService.logModerationDecision({
      timestamp: new Date(),
      eventType: 'decision',
      contentId: 'system',
      userId: promotedBy,
      metadata: {
        action: 'canary_promoted_to_production',
        deploymentId,
        policyId: deployment.policyVersionId,
        oldPolicyId: this.currentProductionPolicy
      }
    });
  }

  /**
   * Get current policy for content moderation
   */
  getPolicyForContent(contentId: string, userId: string): PolicyConfig {
    // Determine if this content should use canary policy
    const activeDeployment = Array.from(this.activeDeployments.values())
      .find(d => d.status === 'active');

    if (activeDeployment && this.shouldUseCanaryPolicy(contentId, activeDeployment.trafficPercentage)) {
      const canaryPolicy = this.policyVersions.get(activeDeployment.policyVersionId);
      if (canaryPolicy) {
        return canaryPolicy.config;
      }
    }

    // Use production policy
    const productionPolicy = this.currentProductionPolicy 
      ? this.policyVersions.get(this.currentProductionPolicy)
      : null;

    if (!productionPolicy) {
      throw new Error('No production policy available');
    }

    return productionPolicy.config;
  }

  /**
   * Get all policy versions
   */
  getPolicyVersions(): PolicyVersion[] {
    return Array.from(this.policyVersions.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get active deployments
   */
  getActiveDeployments(): CanaryDeployment[] {
    return Array.from(this.activeDeployments.values())
      .filter(d => d.status === 'active');
  }

  /**
   * Get deployment history
   */
  getDeploymentHistory(limit: number = 50): CanaryDeployment[] {
    return Array.from(this.activeDeployments.values())
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }

  // Private helper methods

  private startMonitoring(): void {
    // Monitor active deployments every 5 minutes
    this.monitoringInterval = setInterval(async () => {
      await this.monitorActiveDeployments();
    }, 300000);
  }

  private async monitorActiveDeployments(): Promise<void> {
    const activeDeployments = this.getActiveDeployments();

    for (const deployment of activeDeployments) {
      try {
        const rollbackCheck = await this.checkRollbackConditions(deployment.id);
        
        if (rollbackCheck.shouldRollback) {
          await this.rollbackDeployment(
            deployment.id,
            `Automatic rollback: ${rollbackCheck.reasons.join(', ')}`,
            'system'
          );
        }
      } catch (error) {
        safeLogger.error(`Failed to monitor deployment ${deployment.id}:`, error);
      }
    }
  }

  private shouldUseCanaryPolicy(contentId: string, trafficPercentage: number): boolean {
    // Use consistent hash to determine if content should use canary
    const hash = this.hashString(contentId);
    return (hash % 100) < trafficPercentage;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private generateVersionNumber(): string {
    const versions = Array.from(this.policyVersions.values())
      .map(p => p.version)
      .filter(v => v.match(/^\d+\.\d+\.\d+$/))
      .sort((a, b) => this.compareVersions(b, a));

    if (versions.length === 0) {
      return '1.0.0';
    }

    const latest = versions[0];
    const [major, minor, patch] = latest.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
  }

  private compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      
      if (aPart !== bPart) {
        return aPart - bPart;
      }
    }
    
    return 0;
  }

  private async getGroupMetrics(group: 'canary' | 'control', timeWindow: number) {
    // This would query actual metrics from the logging service
    // For now, return mock data
    return {
      decisions: Math.floor(Math.random() * 1000) + 500,
      errorRate: Math.random() * 0.05,
      averageLatency: 1000 + Math.random() * 1000,
      falsePositiveRate: Math.random() * 0.1,
      userFeedback: Math.random() * 5
    };
  }

  private calculateStatisticalComparison(canary: any, control: any) {
    // Simplified statistical comparison
    const errorRateDiff = canary.errorRate - control.errorRate;
    const latencyDiff = canary.averageLatency - control.averageLatency;
    const accuracyDiff = (1 - canary.falsePositiveRate) - (1 - control.falsePositiveRate);

    // Mock significance calculation (would use proper statistical tests)
    const significanceLevel = Math.random() * 0.3 + 0.7; // 70-100%

    return {
      errorRateDiff,
      latencyDiff,
      accuracyDiff,
      significanceLevel
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}

export const canaryDeploymentService = new CanaryDeploymentService();
