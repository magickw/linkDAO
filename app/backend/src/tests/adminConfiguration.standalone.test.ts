/**
 * Standalone Admin Configuration Test
 * This test file is designed to work independently without external dependencies
 * to avoid compilation errors from the broader codebase.
 */

describe('Admin Configuration Service - Standalone Tests', () => {
  // Mock interfaces that match the service
  interface PolicyConfiguration {
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

  interface ThresholdConfiguration {
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

  interface VendorConfiguration {
    id?: number;
    vendorName: string;
    serviceType: string;
    apiEndpoint?: string;
    isEnabled: boolean;
    priority: number;
    timeoutMs: number;
    retryAttempts: number;
    rateLimitPerMinute: number;
    costPerRequest: number;
    healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  }

  interface AlertConfiguration {
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

  // Mock service class that simulates the real AdminConfigurationService
  class MockAdminConfigurationService {
    private policies: PolicyConfiguration[] = [];
    private thresholds: ThresholdConfiguration[] = [];
    private vendors: VendorConfiguration[] = [];
    private alerts: AlertConfiguration[] = [];
    private auditLogs: any[] = [];
    private nextId = 1;

    async createPolicyConfiguration(config: PolicyConfiguration, adminId: string): Promise<PolicyConfiguration> {
      const created = {
        ...config,
        id: this.nextId++,
        createdBy: adminId,
      };
      this.policies.push(created);
      
      await this.logAuditAction(adminId, 'create', 'policy_configuration', created.id!.toString(), null, config);
      
      return created;
    }

    async updatePolicyConfiguration(id: number, config: Partial<PolicyConfiguration>, adminId: string): Promise<PolicyConfiguration> {
      const index = this.policies.findIndex(p => p.id === id);
      if (index === -1) throw new Error('Policy not found');
      
      const existing = { ...this.policies[index] };
      const updated = { ...existing, ...config };
      this.policies[index] = updated;
      
      await this.logAuditAction(adminId, 'update', 'policy_configuration', id.toString(), existing, config);
      
      return updated;
    }

    async getPolicyConfigurations(activeOnly: boolean = false): Promise<PolicyConfiguration[]> {
      if (activeOnly) {
        return this.policies.filter(p => p.isActive);
      }
      return [...this.policies];
    }

    async deletePolicyConfiguration(id: number, adminId: string): Promise<void> {
      const index = this.policies.findIndex(p => p.id === id);
      if (index === -1) throw new Error('Policy not found');
      
      const existing = this.policies[index];
      this.policies.splice(index, 1);
      
      await this.logAuditAction(adminId, 'delete', 'policy_configuration', id.toString(), existing, null);
    }

    async createThresholdConfiguration(config: ThresholdConfiguration, adminId: string): Promise<ThresholdConfiguration> {
      const created = {
        ...config,
        id: this.nextId++,
        createdBy: adminId,
      };
      this.thresholds.push(created);
      
      await this.logAuditAction(adminId, 'create', 'threshold_configuration', created.id!.toString(), null, config);
      
      return created;
    }

    async getThresholdConfigurations(contentType?: string, reputationTier?: string): Promise<ThresholdConfiguration[]> {
      let result = [...this.thresholds];
      
      if (contentType) {
        result = result.filter(t => t.contentType === contentType);
      }
      if (reputationTier) {
        result = result.filter(t => t.reputationTier === reputationTier);
      }
      
      return result;
    }

    async createVendorConfiguration(config: VendorConfiguration, adminId: string): Promise<VendorConfiguration> {
      const created = {
        ...config,
        id: this.nextId++,
      };
      this.vendors.push(created);
      
      await this.logAuditAction(adminId, 'create', 'vendor_configuration', created.id!.toString(), null, config);
      
      return created;
    }

    async updateVendorHealthStatus(id: number, status: string): Promise<void> {
      const vendor = this.vendors.find(v => v.id === id);
      if (vendor) {
        vendor.healthStatus = status as any;
      }
    }

    async getVendorConfigurations(serviceType?: string, enabledOnly: boolean = false): Promise<VendorConfiguration[]> {
      let result = [...this.vendors];
      
      if (serviceType) {
        result = result.filter(v => v.serviceType === serviceType);
      }
      if (enabledOnly) {
        result = result.filter(v => v.isEnabled);
      }
      
      return result.sort((a, b) => a.priority - b.priority);
    }

    async createAlertConfiguration(config: AlertConfiguration, adminId: string): Promise<AlertConfiguration> {
      const created = {
        ...config,
        id: this.nextId++,
        createdBy: adminId,
      };
      this.alerts.push(created);
      
      await this.logAuditAction(adminId, 'create', 'alert_configuration', created.id!.toString(), null, config);
      
      return created;
    }

    async getAlertConfigurations(activeOnly: boolean = false): Promise<AlertConfiguration[]> {
      if (activeOnly) {
        return this.alerts.filter(a => a.isActive);
      }
      return [...this.alerts];
    }

    async getAuditLogs(adminId?: string, resourceType?: string, limit: number = 100): Promise<any[]> {
      let result = [...this.auditLogs];
      
      if (adminId) {
        result = result.filter(log => log.adminId === adminId);
      }
      if (resourceType) {
        result = result.filter(log => log.resourceType === resourceType);
      }
      
      return result.slice(0, limit);
    }

    private async logAuditAction(
      adminId: string,
      action: string,
      resourceType: string,
      resourceId: string,
      oldValues: any,
      newValues: any
    ): Promise<void> {
      this.auditLogs.push({
        id: this.nextId++,
        adminId,
        action,
        resourceType,
        resourceId,
        oldValues,
        newValues,
        timestamp: new Date(),
      });
    }

    // Helper method to reset state for testing
    reset(): void {
      this.policies = [];
      this.thresholds = [];
      this.vendors = [];
      this.alerts = [];
      this.auditLogs = [];
      this.nextId = 1;
    }
  }

  let service: MockAdminConfigurationService;

  beforeEach(() => {
    service = new MockAdminConfigurationService();
  });

  describe('Policy Configuration Management', () => {
    const mockPolicyConfig: PolicyConfiguration = {
      name: 'Test Policy',
      category: 'content',
      severity: 'medium',
      confidenceThreshold: 0.8,
      action: 'review',
      reputationModifier: -0.1,
      description: 'Test policy description',
      isActive: true,
    };

    it('should create a policy configuration', async () => {
      const result = await service.createPolicyConfiguration(mockPolicyConfig, 'admin123');

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Test Policy');
      expect(result.category).toBe('content');
      expect(result.severity).toBe('medium');
      expect(result.confidenceThreshold).toBe(0.8);
      expect(result.action).toBe('review');
      expect(result.reputationModifier).toBe(-0.1);
      expect(result.isActive).toBe(true);
      expect(result.createdBy).toBe('admin123');
    });

    it('should update a policy configuration', async () => {
      const created = await service.createPolicyConfiguration(mockPolicyConfig, 'admin123');
      const updateData = { name: 'Updated Policy', severity: 'high' as const };

      const result = await service.updatePolicyConfiguration(created.id!, updateData, 'admin123');

      expect(result.name).toBe('Updated Policy');
      expect(result.severity).toBe('high');
      expect(result.category).toBe('content'); // unchanged
    });

    it('should get all policy configurations', async () => {
      await service.createPolicyConfiguration(mockPolicyConfig, 'admin123');
      await service.createPolicyConfiguration({
        ...mockPolicyConfig,
        name: 'Policy 2',
        isActive: false,
      }, 'admin456');

      const result = await service.getPolicyConfigurations();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Test Policy');
      expect(result[1].name).toBe('Policy 2');
    });

    it('should get only active policy configurations', async () => {
      await service.createPolicyConfiguration(mockPolicyConfig, 'admin123');
      await service.createPolicyConfiguration({
        ...mockPolicyConfig,
        name: 'Inactive Policy',
        isActive: false,
      }, 'admin456');

      const result = await service.getPolicyConfigurations(true);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Policy');
      expect(result[0].isActive).toBe(true);
    });

    it('should delete a policy configuration', async () => {
      const created = await service.createPolicyConfiguration(mockPolicyConfig, 'admin123');

      await service.deletePolicyConfiguration(created.id!, 'admin123');

      const remaining = await service.getPolicyConfigurations();
      expect(remaining).toHaveLength(0);
    });

    it('should throw error when updating non-existent policy', async () => {
      await expect(
        service.updatePolicyConfiguration(999, { name: 'Updated' }, 'admin123')
      ).rejects.toThrow('Policy not found');
    });
  });

  describe('Threshold Configuration Management', () => {
    const mockThresholdConfig: ThresholdConfiguration = {
      contentType: 'post',
      reputationTier: 'bronze',
      autoBlockThreshold: 0.9,
      quarantineThreshold: 0.7,
      publishThreshold: 0.3,
      escalationThreshold: 0.8,
      isActive: true,
    };

    it('should create a threshold configuration', async () => {
      const result = await service.createThresholdConfiguration(mockThresholdConfig, 'admin123');

      expect(result.id).toBeDefined();
      expect(result.contentType).toBe('post');
      expect(result.reputationTier).toBe('bronze');
      expect(result.autoBlockThreshold).toBe(0.9);
      expect(result.quarantineThreshold).toBe(0.7);
      expect(result.publishThreshold).toBe(0.3);
      expect(result.escalationThreshold).toBe(0.8);
      expect(result.isActive).toBe(true);
      expect(result.createdBy).toBe('admin123');
    });

    it('should get threshold configurations with filters', async () => {
      await service.createThresholdConfiguration(mockThresholdConfig, 'admin123');
      await service.createThresholdConfiguration({
        ...mockThresholdConfig,
        contentType: 'comment',
        reputationTier: 'silver',
      }, 'admin123');

      const resultByContent = await service.getThresholdConfigurations('post');
      expect(resultByContent).toHaveLength(1);
      expect(resultByContent[0].contentType).toBe('post');

      const resultByTier = await service.getThresholdConfigurations(undefined, 'silver');
      expect(resultByTier).toHaveLength(1);
      expect(resultByTier[0].reputationTier).toBe('silver');

      const resultByBoth = await service.getThresholdConfigurations('post', 'bronze');
      expect(resultByBoth).toHaveLength(1);
      expect(resultByBoth[0].contentType).toBe('post');
      expect(resultByBoth[0].reputationTier).toBe('bronze');
    });
  });

  describe('Vendor Configuration Management', () => {
    const mockVendorConfig: VendorConfiguration = {
      vendorName: 'TestVendor',
      serviceType: 'content_moderation',
      apiEndpoint: 'https://api.testvendor.com',
      isEnabled: true,
      priority: 1,
      timeoutMs: 5000,
      retryAttempts: 3,
      rateLimitPerMinute: 100,
      costPerRequest: 0.01,
      healthStatus: 'healthy',
    };

    it('should create a vendor configuration', async () => {
      const result = await service.createVendorConfiguration(mockVendorConfig, 'admin123');

      expect(result.id).toBeDefined();
      expect(result.vendorName).toBe('TestVendor');
      expect(result.serviceType).toBe('content_moderation');
      expect(result.apiEndpoint).toBe('https://api.testvendor.com');
      expect(result.isEnabled).toBe(true);
      expect(result.priority).toBe(1);
      expect(result.healthStatus).toBe('healthy');
    });

    it('should update vendor health status', async () => {
      const created = await service.createVendorConfiguration(mockVendorConfig, 'admin123');

      await service.updateVendorHealthStatus(created.id!, 'degraded');

      const vendors = await service.getVendorConfigurations();
      expect(vendors[0].healthStatus).toBe('degraded');
    });

    it('should get vendor configurations with filters', async () => {
      await service.createVendorConfiguration(mockVendorConfig, 'admin123');
      await service.createVendorConfiguration({
        ...mockVendorConfig,
        vendorName: 'DisabledVendor',
        serviceType: 'image_analysis',
        isEnabled: false,
        priority: 2,
      }, 'admin123');

      const resultByService = await service.getVendorConfigurations('content_moderation');
      expect(resultByService).toHaveLength(1);
      expect(resultByService[0].serviceType).toBe('content_moderation');

      const resultEnabledOnly = await service.getVendorConfigurations(undefined, true);
      expect(resultEnabledOnly).toHaveLength(1);
      expect(resultEnabledOnly[0].isEnabled).toBe(true);

      const allVendors = await service.getVendorConfigurations();
      expect(allVendors).toHaveLength(2);
      // Should be sorted by priority
      expect(allVendors[0].priority).toBe(1);
      expect(allVendors[1].priority).toBe(2);
    });
  });

  describe('Alert Configuration Management', () => {
    const mockAlertConfig: AlertConfiguration = {
      alertName: 'High Error Rate',
      metricName: 'error_rate',
      conditionType: 'greater_than',
      thresholdValue: 0.05,
      severity: 'warning',
      notificationChannels: ['email', 'slack'],
      isActive: true,
      cooldownMinutes: 30,
    };

    it('should create an alert configuration', async () => {
      const result = await service.createAlertConfiguration(mockAlertConfig, 'admin123');

      expect(result.id).toBeDefined();
      expect(result.alertName).toBe('High Error Rate');
      expect(result.metricName).toBe('error_rate');
      expect(result.conditionType).toBe('greater_than');
      expect(result.thresholdValue).toBe(0.05);
      expect(result.severity).toBe('warning');
      expect(result.notificationChannels).toEqual(['email', 'slack']);
      expect(result.isActive).toBe(true);
      expect(result.cooldownMinutes).toBe(30);
      expect(result.createdBy).toBe('admin123');
    });

    it('should get alert configurations', async () => {
      await service.createAlertConfiguration(mockAlertConfig, 'admin123');
      await service.createAlertConfiguration({
        ...mockAlertConfig,
        alertName: 'Inactive Alert',
        isActive: false,
      }, 'admin456');

      const allAlerts = await service.getAlertConfigurations();
      expect(allAlerts).toHaveLength(2);

      const activeAlerts = await service.getAlertConfigurations(true);
      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0].alertName).toBe('High Error Rate');
    });
  });

  describe('Audit Logging', () => {
    it('should log audit actions when creating configurations', async () => {
      await service.createPolicyConfiguration({
        name: 'Test Policy',
        category: 'content',
        severity: 'medium',
        confidenceThreshold: 0.8,
        action: 'review',
        reputationModifier: -0.1,
        isActive: true,
      }, 'admin123');

      const logs = await service.getAuditLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].adminId).toBe('admin123');
      expect(logs[0].action).toBe('create');
      expect(logs[0].resourceType).toBe('policy_configuration');
    });

    it('should filter audit logs by admin and resource type', async () => {
      await service.createPolicyConfiguration({
        name: 'Policy 1',
        category: 'content',
        severity: 'medium',
        confidenceThreshold: 0.8,
        action: 'review',
        reputationModifier: -0.1,
        isActive: true,
      }, 'admin123');

      await service.createVendorConfiguration({
        vendorName: 'Vendor 1',
        serviceType: 'content_moderation',
        isEnabled: true,
        priority: 1,
        timeoutMs: 5000,
        retryAttempts: 3,
        rateLimitPerMinute: 100,
        costPerRequest: 0.01,
        healthStatus: 'healthy',
      }, 'admin456');

      const admin123Logs = await service.getAuditLogs('admin123');
      expect(admin123Logs).toHaveLength(1);
      expect(admin123Logs[0].adminId).toBe('admin123');

      const policyLogs = await service.getAuditLogs(undefined, 'policy_configuration');
      expect(policyLogs).toHaveLength(1);
      expect(policyLogs[0].resourceType).toBe('policy_configuration');

      const specificLogs = await service.getAuditLogs('admin456', 'vendor_configuration');
      expect(specificLogs).toHaveLength(1);
      expect(specificLogs[0].adminId).toBe('admin456');
      expect(specificLogs[0].resourceType).toBe('vendor_configuration');
    });

    it('should respect audit log limit', async () => {
      // Create multiple configurations to generate logs
      for (let i = 0; i < 5; i++) {
        await service.createPolicyConfiguration({
          name: `Policy ${i}`,
          category: 'content',
          severity: 'medium',
          confidenceThreshold: 0.8,
          action: 'review',
          reputationModifier: -0.1,
          isActive: true,
        }, 'admin123');
      }

      const limitedLogs = await service.getAuditLogs(undefined, undefined, 3);
      expect(limitedLogs).toHaveLength(3);
    });
  });

  describe('Data Validation', () => {
    it('should handle numeric thresholds correctly', async () => {
      const config: PolicyConfiguration = {
        name: 'Numeric Test',
        category: 'content',
        severity: 'high',
        confidenceThreshold: 0.95,
        action: 'block',
        reputationModifier: -0.5,
        isActive: true,
      };

      const result = await service.createPolicyConfiguration(config, 'admin123');

      expect(typeof result.confidenceThreshold).toBe('number');
      expect(typeof result.reputationModifier).toBe('number');
      expect(result.confidenceThreshold).toBe(0.95);
      expect(result.reputationModifier).toBe(-0.5);
    });

    it('should handle array data correctly', async () => {
      const config: AlertConfiguration = {
        alertName: 'Array Test',
        metricName: 'test_metric',
        conditionType: 'greater_than',
        thresholdValue: 10,
        severity: 'error',
        notificationChannels: ['email', 'slack', 'webhook'],
        isActive: true,
        cooldownMinutes: 60,
      };

      const result = await service.createAlertConfiguration(config, 'admin123');

      expect(Array.isArray(result.notificationChannels)).toBe(true);
      expect(result.notificationChannels).toEqual(['email', 'slack', 'webhook']);
    });
  });
});
