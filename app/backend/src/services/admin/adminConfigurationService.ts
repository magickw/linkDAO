import { db } from '../../db';
import { 
  policy_configurations, 
  threshold_configurations, 
  vendor_configurations,
  admin_audit_logs,
  alert_configurations
} from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';

export interface PolicyConfiguration {
  id?: number;
  name: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidenceThreshold: number;
  action: 'allow' | 'limit' | 'block' | 'review';
  reputationModifier: number;
  description?: string;
  isActive: boolean;
  createdBy?: string;
}

export interface ThresholdConfiguration {
  id?: number;
  contentType: string;
  reputationTier: string;
  autoBlockThreshold: number;
  quarantineThreshold: number;
  publishThreshold: number;
  escalationThreshold: number;
  isActive: boolean;
  createdBy?: string;
}

export interface VendorConfiguration {
  id?: number;
  vendorName: string;
  serviceType: string;
  apiEndpoint?: string;
  apiKeyRef?: string;
  isEnabled: boolean;
  priority: number;
  timeoutMs: number;
  retryAttempts: number;
  rateLimitPerMinute: number;
  costPerRequest: number;
  fallbackVendorId?: number;
  healthCheckUrl?: string;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
}

export interface AlertConfiguration {
  id?: number;
  alertName: string;
  metricName: string;
  conditionType: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
  thresholdValue: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  notificationChannels: string[];
  isActive: boolean;
  cooldownMinutes: number;
  createdBy?: string;
}

export class AdminConfigurationService {
  // Policy Configuration Management
  async createPolicyConfiguration(config: PolicyConfiguration, adminId: string): Promise<PolicyConfiguration> {
    const [created] = await db.insert(policy_configurations).values({
      ...config,
      confidenceThreshold: config.confidenceThreshold.toString(),
      reputationModifier: config.reputationModifier.toString(),
      createdBy: adminId,
    }).returning();

    await this.logAuditAction(adminId, 'create', 'policy_configuration', created.id.toString(), null, config);
    
    return this.mapPolicyConfiguration(created);
  }

  async updatePolicyConfiguration(id: number, config: Partial<PolicyConfiguration>, adminId: string): Promise<PolicyConfiguration> {
    const [existing] = await db.select().from(policy_configurations).where(eq(policy_configurations.id, id));
    
    const updateData: any = { ...config, updatedAt: new Date() };
    if (config.confidenceThreshold !== undefined) {
      updateData.confidenceThreshold = config.confidenceThreshold.toString();
    }
    if (config.reputationModifier !== undefined) {
      updateData.reputationModifier = config.reputationModifier.toString();
    }
    
    const [updated] = await db.update(policy_configurations)
      .set(updateData)
      .where(eq(policy_configurations.id, id))
      .returning();

    await this.logAuditAction(adminId, 'update', 'policy_configuration', id.toString(), existing, config);
    
    return this.mapPolicyConfiguration(updated);
  }

  async getPolicyConfigurations(activeOnly: boolean = false): Promise<PolicyConfiguration[]> {
    const results = await db
      .select()
      .from(policy_configurations)
      .where(activeOnly ? eq(policy_configurations.isActive, true) : undefined)
      .orderBy(desc(policy_configurations.createdAt));
    
    return results.map(this.mapPolicyConfiguration);
  }

  async deletePolicyConfiguration(id: number, adminId: string): Promise<void> {
    const [existing] = await db.select().from(policy_configurations).where(eq(policy_configurations.id, id));
    
    await db.delete(policy_configurations).where(eq(policy_configurations.id, id));
    
    await this.logAuditAction(adminId, 'delete', 'policy_configuration', id.toString(), existing, null);
  }

  // Threshold Configuration Management
  async createThresholdConfiguration(config: ThresholdConfiguration, adminId: string): Promise<ThresholdConfiguration> {
    const [created] = await db.insert(threshold_configurations).values({
      contentType: config.contentType,
      reputationTier: config.reputationTier,
      autoBlockThreshold: config.autoBlockThreshold.toString(),
      quarantineThreshold: config.quarantineThreshold.toString(),
      publishThreshold: config.publishThreshold.toString(),
      escalationThreshold: config.escalationThreshold.toString(),
      isActive: config.isActive,
      createdBy: adminId,
    }).returning();

    await this.logAuditAction(adminId, 'create', 'threshold_configuration', created.id.toString(), null, config);
    
    return this.mapThresholdConfiguration(created);
  }

  async updateThresholdConfiguration(id: number, config: Partial<ThresholdConfiguration>, adminId: string): Promise<ThresholdConfiguration> {
    const [existing] = await db.select().from(threshold_configurations).where(eq(threshold_configurations.id, id));
    
    const updateData: any = { ...config, updatedAt: new Date() };
    if (config.autoBlockThreshold !== undefined) {
      updateData.autoBlockThreshold = config.autoBlockThreshold.toString();
    }
    if (config.quarantineThreshold !== undefined) {
      updateData.quarantineThreshold = config.quarantineThreshold.toString();
    }
    if (config.publishThreshold !== undefined) {
      updateData.publishThreshold = config.publishThreshold.toString();
    }
    if (config.escalationThreshold !== undefined) {
      updateData.escalationThreshold = config.escalationThreshold.toString();
    }
    
    const [updated] = await db.update(threshold_configurations)
      .set(updateData)
      .where(eq(threshold_configurations.id, id))
      .returning();

    await this.logAuditAction(adminId, 'update', 'threshold_configuration', id.toString(), existing, config);
    
    return this.mapThresholdConfiguration(updated);
  }

  async getThresholdConfigurations(contentType?: string, reputationTier?: string): Promise<ThresholdConfiguration[]> {
    const conditions = [];
    if (contentType && reputationTier) {
      conditions.push(and(
        eq(threshold_configurations.contentType, contentType),
        eq(threshold_configurations.reputationTier, reputationTier)
      ));
    } else if (contentType) {
      conditions.push(eq(threshold_configurations.contentType, contentType));
    } else if (reputationTier) {
      conditions.push(eq(threshold_configurations.reputationTier, reputationTier));
    }
    
    const results = await db
      .select()
      .from(threshold_configurations)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(threshold_configurations.createdAt));
    return results.map(this.mapThresholdConfiguration);
  }

  // Vendor Configuration Management
  async createVendorConfiguration(config: VendorConfiguration, adminId: string): Promise<VendorConfiguration> {
    const [created] = await db.insert(vendor_configurations).values({
      vendorName: config.vendorName,
      serviceType: config.serviceType,
      apiEndpoint: config.apiEndpoint,
      apiKeyRef: config.apiKeyRef,
      isEnabled: config.isEnabled,
      priority: config.priority,
      timeoutMs: config.timeoutMs,
      retryAttempts: config.retryAttempts,
      rateLimitPerMinute: config.rateLimitPerMinute,
      costPerRequest: config.costPerRequest.toString(),
      fallbackVendorId: config.fallbackVendorId,
      healthCheckUrl: config.healthCheckUrl,
      healthStatus: config.healthStatus,
    }).returning();

    await this.logAuditAction(adminId, 'create', 'vendor_configuration', created.id.toString(), null, config);
    
    return this.mapVendorConfiguration(created);
  }

  async updateVendorConfiguration(id: number, config: Partial<VendorConfiguration>, adminId: string): Promise<VendorConfiguration> {
    const [existing] = await db.select().from(vendor_configurations).where(eq(vendor_configurations.id, id));
    
    const updateData: any = { ...config, updatedAt: new Date() };
    if (config.costPerRequest !== undefined) {
      updateData.costPerRequest = config.costPerRequest.toString();
    }
    
    const [updated] = await db.update(vendor_configurations)
      .set(updateData)
      .where(eq(vendor_configurations.id, id))
      .returning();

    await this.logAuditAction(adminId, 'update', 'vendor_configuration', id.toString(), existing, config);
    
    return this.mapVendorConfiguration(updated);
  }

  async getVendorConfigurations(serviceType?: string, enabledOnly: boolean = false): Promise<VendorConfiguration[]> {
    const conditions = [];
    if (serviceType) {
      conditions.push(eq(vendor_configurations.serviceType, serviceType));
    }
    if (enabledOnly) {
      conditions.push(eq(vendor_configurations.isEnabled, true));
    }
    
    const results = await db
      .select()
      .from(vendor_configurations)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(vendor_configurations.priority, desc(vendor_configurations.createdAt));
    return results.map(this.mapVendorConfiguration);
  }

  async updateVendorHealthStatus(id: number, status: string): Promise<void> {
    await db.update(vendor_configurations)
      .set({
        healthStatus: status,
        lastHealthCheck: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(vendor_configurations.id, id));
  }

  // Alert Configuration Management
  async createAlertConfiguration(config: AlertConfiguration, adminId: string): Promise<AlertConfiguration> {
    const [created] = await db.insert(alert_configurations).values({
      alertName: config.alertName,
      metricName: config.metricName,
      conditionType: config.conditionType,
      thresholdValue: config.thresholdValue.toString(),
      severity: config.severity,
      notificationChannels: JSON.stringify(config.notificationChannels),
      isActive: config.isActive,
      cooldownMinutes: config.cooldownMinutes,
      createdBy: adminId,
    }).returning();

    await this.logAuditAction(adminId, 'create', 'alert_configuration', created.id.toString(), null, config);
    
    return this.mapAlertConfiguration(created);
  }

  async updateAlertConfiguration(id: number, config: Partial<AlertConfiguration>, adminId: string): Promise<AlertConfiguration> {
    const [existing] = await db.select().from(alert_configurations).where(eq(alert_configurations.id, id));
    
    const updateData: any = { ...config, updatedAt: new Date() };
    if (config.notificationChannels) {
      updateData.notificationChannels = JSON.stringify(config.notificationChannels);
    }
    if (config.thresholdValue !== undefined) {
      updateData.thresholdValue = config.thresholdValue.toString();
    }
    
    const [updated] = await db.update(alert_configurations)
      .set(updateData)
      .where(eq(alert_configurations.id, id))
      .returning();

    await this.logAuditAction(adminId, 'update', 'alert_configuration', id.toString(), existing, config);
    
    return this.mapAlertConfiguration(updated);
  }

  async getAlertConfigurations(activeOnly: boolean = false): Promise<AlertConfiguration[]> {
    const conditions = [];
    if (activeOnly) {
      conditions.push(eq(alert_configurations.isActive, true));
    }
    
    const results = await db
      .select()
      .from(alert_configurations)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(alert_configurations.createdAt));
    return results.map(this.mapAlertConfiguration);
  }

  // Audit Logging
  private async logAuditAction(
    adminId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    oldValues: any,
    newValues: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await db.insert(admin_audit_logs).values({
      adminId,
      action,
      resourceType,
      resourceId,
      oldValues: oldValues ? JSON.stringify(oldValues) : null,
      newValues: newValues ? JSON.stringify(newValues) : null,
      ipAddress,
      userAgent,
    });
  }

  async getAuditLogs(adminId?: string, resourceType?: string, limit: number = 100): Promise<any[]> {
    const conditions = [];
    if (adminId) {
      conditions.push(eq(admin_audit_logs.adminId, adminId));
    }
    if (resourceType) {
      conditions.push(eq(admin_audit_logs.resourceType, resourceType));
    }
    
    return await db
      .select()
      .from(admin_audit_logs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(admin_audit_logs.timestamp))
      .limit(limit);
  }

  // Mapping functions
  private mapPolicyConfiguration(row: any): PolicyConfiguration {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      severity: row.severity,
      confidenceThreshold: parseFloat(row.confidenceThreshold),
      action: row.action,
      reputationModifier: parseFloat(row.reputationModifier),
      description: row.description,
      isActive: row.isActive,
      createdBy: row.createdBy,
    };
  }

  private mapThresholdConfiguration(row: any): ThresholdConfiguration {
    return {
      id: row.id,
      contentType: row.contentType,
      reputationTier: row.reputationTier,
      autoBlockThreshold: parseFloat(row.autoBlockThreshold),
      quarantineThreshold: parseFloat(row.quarantineThreshold),
      publishThreshold: parseFloat(row.publishThreshold),
      escalationThreshold: parseFloat(row.escalationThreshold),
      isActive: row.isActive,
      createdBy: row.createdBy,
    };
  }

  private mapVendorConfiguration(row: any): VendorConfiguration {
    return {
      id: row.id,
      vendorName: row.vendorName,
      serviceType: row.serviceType,
      apiEndpoint: row.apiEndpoint,
      apiKeyRef: row.apiKeyRef,
      isEnabled: row.isEnabled,
      priority: row.priority,
      timeoutMs: row.timeoutMs,
      retryAttempts: row.retryAttempts,
      rateLimitPerMinute: row.rateLimitPerMinute,
      costPerRequest: parseFloat(row.costPerRequest),
      fallbackVendorId: row.fallbackVendorId,
      healthCheckUrl: row.healthCheckUrl,
      healthStatus: row.healthStatus,
    };
  }

  private mapAlertConfiguration(row: any): AlertConfiguration {
    return {
      id: row.id,
      alertName: row.alertName,
      metricName: row.metricName,
      conditionType: row.conditionType,
      thresholdValue: parseFloat(row.thresholdValue),
      severity: row.severity,
      notificationChannels: JSON.parse(row.notificationChannels || '[]'),
      isActive: row.isActive,
      cooldownMinutes: row.cooldownMinutes,
      createdBy: row.createdBy,
    };
  }
}

export const adminConfigurationService = new AdminConfigurationService();
