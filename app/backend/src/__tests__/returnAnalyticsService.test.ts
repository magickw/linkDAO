import { ReturnAnalyticsService } from '../services/returnAnalyticsService';

describe('ReturnAnalyticsService', () => {
    let service: ReturnAnalyticsService;

    beforeEach(() => {
        service = new ReturnAnalyticsService();
    });

    describe('Service Initialization', () => {
        it('should create an instance of ReturnAnalyticsService', () => {
            expect(service).toBeInstanceOf(ReturnAnalyticsService);
        });

        it('should have cache TTL constants defined', () => {
            expect((service as any).CACHE_TTL).toBeDefined();
            expect((service as any).CACHE_TTL.REALTIME).toBe(30);
            expect((service as any).CACHE_TTL.ANALYTICS).toBe(600);
        });
    });

    describe('Helper Methods', () => {
        it('should calculate average correctly', () => {
            const numbers = [10, 20, 30, 40, 50];
            const avg = (service as any).calculateAverage(numbers);
            expect(avg).toBe(30);
        });

        it('should return 0 for empty array average', () => {
            const avg = (service as any).calculateAverage([]);
            expect(avg).toBe(0);
        });

        it('should calculate median correctly for odd length array', () => {
            const numbers = [10, 20, 30, 40, 50];
            const median = (service as any).calculateMedian(numbers);
            expect(median).toBe(30);
        });

        it('should calculate median correctly for even length array', () => {
            const numbers = [10, 20, 30, 40];
            const median = (service as any).calculateMedian(numbers);
            expect(median).toBe(25);
        });

        it('should return 0 for empty array median', () => {
            const median = (service as any).calculateMedian([]);
            expect(median).toBe(0);
        });

        it('should calculate percentile correctly', () => {
            const numbers = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
            const p95 = (service as any).calculatePercentile(numbers, 95);
            expect(p95).toBeGreaterThanOrEqual(90);
        });

        it('should return 0 for empty array percentile', () => {
            const p95 = (service as any).calculatePercentile([], 95);
            expect(p95).toBe(0);
        });
    });

    describe('Event Validation', () => {
        it('should throw error for missing returnId', () => {
            const invalidEvent = {
                returnId: '',
                eventType: 'status_changed',
                eventCategory: 'lifecycle',
                eventData: {},
                automated: false,
            };

            expect(() => {
                (service as any).validateEvent(invalidEvent);
            }).toThrow('Return ID is required');
        });

        it('should throw error for missing eventType', () => {
            const invalidEvent = {
                returnId: 'return-123',
                eventType: '',
                eventCategory: 'lifecycle',
                eventData: {},
                automated: false,
            };

            expect(() => {
                (service as any).validateEvent(invalidEvent);
            }).toThrow('Event type is required');
        });

        it('should throw error for missing eventCategory', () => {
            const invalidEvent = {
                returnId: 'return-123',
                eventType: 'status_changed',
                eventCategory: '',
                eventData: {},
                automated: false,
            };

            expect(() => {
                (service as any).validateEvent(invalidEvent);
            }).toThrow('Event category is required');
        });

        it('should not throw error for valid event', () => {
            const validEvent = {
                returnId: 'return-123',
                eventType: 'status_changed',
                eventCategory: 'lifecycle',
                eventData: {},
                automated: false,
            };

            expect(() => {
                (service as any).validateEvent(validEvent);
            }).not.toThrow();
        });
    });

    describe('Metrics Calculation', () => {
        it('should calculate return metrics correctly', () => {
            const mockReturns = [
                { status: 'requested' },
                { status: 'approved' },
                { status: 'completed' },
                { status: 'rejected' },
                { status: 'in_transit' },
            ];

            const metrics = (service as any).calculateReturnMetrics(mockReturns);

            expect(metrics.totalReturns).toBe(5);
            expect(metrics.approvedReturns).toBe(1);
            expect(metrics.rejectedReturns).toBe(1);
            expect(metrics.completedReturns).toBe(1);
            expect(metrics.pendingReturns).toBe(2);
        });

        it('should calculate risk metrics correctly', () => {
            const mockReturns = [
                { riskLevel: 'high', riskScore: 80, requiresManualReview: true },
                { riskLevel: 'medium', riskScore: 50, requiresManualReview: false },
                { riskLevel: 'low', riskScore: 20, requiresManualReview: false },
                { riskLevel: 'low', riskScore: 10, requiresManualReview: false },
            ];

            const riskMetrics = (service as any).calculateRiskMetrics(mockReturns);

            expect(riskMetrics.highRiskReturns).toBe(1);
            expect(riskMetrics.mediumRiskReturns).toBe(1);
            expect(riskMetrics.lowRiskReturns).toBe(2);
            expect(riskMetrics.flaggedForReview).toBe(1);
            expect(riskMetrics.averageRiskScore).toBe(40);
        });

        it('should calculate top return reasons correctly', () => {
            const mockReturns = [
                { returnReason: 'defective' },
                { returnReason: 'defective' },
                { returnReason: 'defective' },
                { returnReason: 'wrong_item' },
                { returnReason: 'wrong_item' },
                { returnReason: 'changed_mind' },
            ];

            const topReasons = (service as any).calculateTopReasons(mockReturns);

            expect(topReasons).toHaveLength(3);
            expect(topReasons[0].reason).toBe('defective');
            expect(topReasons[0].count).toBe(3);
            expect(topReasons[0].percentage).toBe(50);
            expect(topReasons[1].reason).toBe('wrong_item');
            expect(topReasons[1].count).toBe(2);
        });
    });
});
