import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock all external dependencies to create a standalone test
const mockDb = {
    insert: jest.fn(),
    select: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
};

const mockSchema = {
    policy_configurations: {
        id: 'id',
        name: 'name',
        category: 'category',
        severity: 'severity',
        confidenceThreshold: 'confidenceThreshold',
        action: 'action',
        reputationModifier: 'reputationModifier',
        description: 'description',
        isActive: 'isActive',
        createdBy: 'createdBy',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
    },
    threshold_configurations: {
        id: 'id',
        contentType: 'contentType',
        reputationTier: 'reputationTier',
        autoBlockThreshold: 'autoBlockThreshold',
        quarantineThreshold: 'quarantineThreshold',
        publishThreshold: 'publishThreshold',
        escalationThreshold: 'escalationThreshold',
        isActive: 'isActive',
        createdBy: 'createdBy',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
    },
    vendor_configurations: {
        id: 'id',
        vendorName: 'vendorName',
        serviceType: 'serviceType',
        apiEndpoint: 'apiEndpoint',
        apiKeyRef: 'apiKeyRef',
        isEnabled: 'isEnabled',
        priority: 'priority',
        timeoutMs: 'timeoutMs',
        retryAttempts: 'retryAttempts',
        rateLimitPerMinute: 'rateLimitPerMinute',
        costPerRequest: 'costPerRequest',
        fallbackVendorId: 'fallbackVendorId',
        healthCheckUrl: 'healthCheckUrl',
        healthStatus: 'healthStatus',
        lastHealthCheck: 'lastHealthCheck',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
    },
    alert_configurations: {
        id: 'id',
        alertName: 'alertName',
        metricName: 'metricName',
        conditionType: 'conditionType',
        thresholdValue: 'thresholdValue',
        severity: 'severity',
        notificationChannels: 'notificationChannels',
        isActive: 'isActive',
        cooldownMinutes: 'cooldownMinutes',
        createdBy: 'createdBy',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
    },
    admin_audit_logs: {
        id: 'id',
        adminId: 'adminId',
        action: 'action',
        resourceType: 'resourceType',
        resourceId: 'resourceId',
        oldValues: 'oldValues',
        newValues: 'newValues',
        ipAddress: 'ipAddress',
        userAgent: 'userAgent',
        timestamp: 'timestamp',
    },
};

const mockDrizzleORM = {
    eq: jest.fn((field, value) => ({ field, value, type: 'eq' })),
    and: jest.fn((...conditions) => ({ conditions, type: 'and' })),
    desc: jest.fn((field) => ({ field, type: 'desc' })),
};

// Mock the modules
jest.mock('../db/connectionPool', () => ({
    db: mockDb,
}));

jest.mock('../db/schema', () => mockSchema);

jest.mock('drizzle-orm', () => mockDrizzleORM);

// Import the service after mocking
import { AdminConfigurationService, PolicyConfiguration, ThresholdConfiguration, VendorConfiguration, AlertConfiguration } from '../services/adminConfigurationService';

describe('AdminConfigurationService - Standalone Tests', () => {
    let service: AdminConfigurationService;
    let mockQuery: any;

    beforeEach(() => {
        service = new AdminConfigurationService();

        // Reset all mocks
        jest.clearAllMocks();

        // Setup common mock query chain
        mockQuery = {
            values: jest.fn().mockReturnThis(),
            returning: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
        };

        mockDb.insert.mockReturnValue(mockQuery);
        mockDb.select.mockReturnValue(mockQuery);
        mockDb.update.mockReturnValue(mockQuery);
        mockDb.delete.mockReturnValue(mockQuery);
    });

    afterEach(() => {
        jest.resetAllMocks();
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
            const mockCreated = {
                id: 1,
                ...mockPolicyConfig,
                createdBy: 'admin123',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockQuery.returning.mockResolvedValue([mockCreated]);

            const result = await service.createPolicyConfiguration(mockPolicyConfig, 'admin123');

            expect(mockDb.insert).toHaveBeenCalledWith(mockSchema.policy_configurations);
            expect(mockQuery.values).toHaveBeenCalledWith({
                ...mockPolicyConfig,
                createdBy: 'admin123',
            });
            expect(result).toEqual({
                id: 1,
                name: 'Test Policy',
                category: 'content',
                severity: 'medium',
                confidenceThreshold: 0.8,
                action: 'review',
                reputationModifier: -0.1,
                description: 'Test policy description',
                isActive: true,
                createdBy: 'admin123',
            });
        });

        it('should update a policy configuration', async () => {
            const mockExisting = { id: 1, ...mockPolicyConfig, createdBy: 'admin123' };
            const mockUpdated = { ...mockExisting, name: 'Updated Policy', updatedAt: new Date() };
            const updateData = { name: 'Updated Policy' };

            mockQuery.mockResolvedValueOnce([mockExisting]); // for select
            mockQuery.returning.mockResolvedValue([mockUpdated]); // for update

            const result = await service.updatePolicyConfiguration(1, updateData, 'admin123');

            expect(mockDb.select).toHaveBeenCalled();
            expect(mockDb.update).toHaveBeenCalledWith(mockSchema.policy_configurations);
            expect(result.name).toBe('Updated Policy');
        });

        it('should get policy configurations', async () => {
            const mockPolicies = [
                { id: 1, ...mockPolicyConfig, createdBy: 'admin123' },
                { id: 2, ...mockPolicyConfig, name: 'Policy 2', createdBy: 'admin456' },
            ];

            mockQuery.mockResolvedValue(mockPolicies);

            const result = await service.getPolicyConfigurations();

            expect(mockDb.select).toHaveBeenCalled();
            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('Test Policy');
            expect(result[1].name).toBe('Policy 2');
        });

        it('should get only active policy configurations', async () => {
            const mockActivePolicies = [
                { id: 1, ...mockPolicyConfig, createdBy: 'admin123', isActive: true },
            ];

            mockQuery.mockResolvedValue(mockActivePolicies);

            const result = await service.getPolicyConfigurations(true);

            expect(mockQuery.where).toHaveBeenCalled();
            expect(result).toHaveLength(1);
            expect(result[0].isActive).toBe(true);
        });

        it('should delete a policy configuration', async () => {
            const mockExisting = { id: 1, ...mockPolicyConfig, createdBy: 'admin123' };

            mockQuery.mockResolvedValue([mockExisting]);

            await service.deletePolicyConfiguration(1, 'admin123');

            expect(mockDb.select).toHaveBeenCalled();
            expect(mockDb.delete).toHaveBeenCalledWith(mockSchema.policy_configurations);
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
            const mockCreated = {
                id: 1,
                ...mockThresholdConfig,
                createdBy: 'admin123',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockQuery.returning.mockResolvedValue([mockCreated]);

            const result = await service.createThresholdConfiguration(mockThresholdConfig, 'admin123');

            expect(mockDb.insert).toHaveBeenCalledWith(mockSchema.threshold_configurations);
            expect(result.contentType).toBe('post');
            expect(result.reputationTier).toBe('bronze');
        });

        it('should get threshold configurations with filters', async () => {
            const mockThresholds = [
                { id: 1, ...mockThresholdConfig, createdBy: 'admin123' },
            ];

            mockQuery.mockResolvedValue(mockThresholds);

            const result = await service.getThresholdConfigurations('post', 'bronze');

            expect(mockQuery.where).toHaveBeenCalled();
            expect(result).toHaveLength(1);
            expect(result[0].contentType).toBe('post');
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
            const mockCreated = {
                id: 1,
                ...mockVendorConfig,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockQuery.returning.mockResolvedValue([mockCreated]);

            const result = await service.createVendorConfiguration(mockVendorConfig, 'admin123');

            expect(mockDb.insert).toHaveBeenCalledWith(mockSchema.vendor_configurations);
            expect(result.vendorName).toBe('TestVendor');
            expect(result.serviceType).toBe('content_moderation');
        });

        it('should update vendor health status', async () => {
            await service.updateVendorHealthStatus(1, 'degraded');

            expect(mockDb.update).toHaveBeenCalledWith(mockSchema.vendor_configurations);
            expect(mockQuery.set).toHaveBeenCalledWith({
                healthStatus: 'degraded',
                lastHealthCheck: expect.any(Date),
                updatedAt: expect.any(Date),
            });
        });

        it('should get vendor configurations with filters', async () => {
            const mockVendors = [
                { id: 1, ...mockVendorConfig },
            ];

            mockQuery.mockResolvedValue(mockVendors);

            const result = await service.getVendorConfigurations('content_moderation', true);

            expect(mockQuery.where).toHaveBeenCalled();
            expect(result).toHaveLength(1);
            expect(result[0].serviceType).toBe('content_moderation');
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
            const mockCreated = {
                id: 1,
                ...mockAlertConfig,
                notificationChannels: JSON.stringify(mockAlertConfig.notificationChannels),
                createdBy: 'admin123',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockQuery.returning.mockResolvedValue([mockCreated]);

            const result = await service.createAlertConfiguration(mockAlertConfig, 'admin123');

            expect(mockDb.insert).toHaveBeenCalledWith(mockSchema.alert_configurations);
            expect(result.alertName).toBe('High Error Rate');
            expect(result.notificationChannels).toEqual(['email', 'slack']);
        });

        it('should get alert configurations', async () => {
            const mockAlerts = [
                {
                    id: 1,
                    ...mockAlertConfig,
                    notificationChannels: JSON.stringify(mockAlertConfig.notificationChannels),
                    createdBy: 'admin123',
                },
            ];

            mockQuery.mockResolvedValue(mockAlerts);

            const result = await service.getAlertConfigurations();

            expect(result).toHaveLength(1);
            expect(result[0].notificationChannels).toEqual(['email', 'slack']);
        });
    });

    describe('Audit Logging', () => {
        it('should get audit logs with filters', async () => {
            const mockLogs = [
                {
                    id: 1,
                    adminId: 'admin123',
                    action: 'create',
                    resourceType: 'policy_configuration',
                    resourceId: '1',
                    oldValues: null,
                    newValues: JSON.stringify({ name: 'Test Policy' }),
                    timestamp: new Date(),
                },
            ];

            mockQuery.mockResolvedValue(mockLogs);

            const result = await service.getAuditLogs('admin123', 'policy_configuration', 50);

            expect(mockQuery.where).toHaveBeenCalled();
            expect(mockQuery.limit).toHaveBeenCalledWith(50);
            expect(result).toHaveLength(1);
            expect(result[0].adminId).toBe('admin123');
        });
    });

    describe('Error Handling', () => {
        it('should handle database errors gracefully', async () => {
            mockQuery.returning.mockRejectedValue(new Error('Database connection failed'));

            await expect(
                service.createPolicyConfiguration({
                    name: 'Test',
                    category: 'test',
                    severity: 'low',
                    confidenceThreshold: 0.5,
                    action: 'allow',
                    reputationModifier: 0,
                    isActive: true,
                }, 'admin123')
            ).rejects.toThrow('Database connection failed');
        });
    });

    describe('Data Mapping', () => {
        it('should correctly map policy configuration data types', async () => {
            const mockCreated = {
                id: 1,
                name: 'Test Policy',
                category: 'content',
                severity: 'medium',
                confidenceThreshold: '0.8', // String from DB
                action: 'review',
                reputationModifier: '-0.1', // String from DB
                description: 'Test description',
                isActive: true,
                createdBy: 'admin123',
            };

            mockQuery.returning.mockResolvedValue([mockCreated]);

            const result = await service.createPolicyConfiguration({
                name: 'Test Policy',
                category: 'content',
                severity: 'medium',
                confidenceThreshold: 0.8,
                action: 'review',
                reputationModifier: -0.1,
                description: 'Test description',
                isActive: true,
            }, 'admin123');

            expect(typeof result.confidenceThreshold).toBe('number');
            expect(typeof result.reputationModifier).toBe('number');
            expect(result.confidenceThreshold).toBe(0.8);
            expect(result.reputationModifier).toBe(-0.1);
        });

        it('should correctly parse JSON notification channels', async () => {
            const mockAlert = {
                id: 1,
                alertName: 'Test Alert',
                metricName: 'test_metric',
                conditionType: 'greater_than',
                thresholdValue: '10.5',
                severity: 'warning',
                notificationChannels: '["email","slack","webhook"]',
                isActive: true,
                cooldownMinutes: 30,
                createdBy: 'admin123',
            };

            mockQuery.mockResolvedValue([mockAlert]);

            const result = await service.getAlertConfigurations();

            expect(result[0].notificationChannels).toEqual(['email', 'slack', 'webhook']);
            expect(typeof result[0].thresholdValue).toBe('number');
            expect(result[0].thresholdValue).toBe(10.5);
        });
    });
});
