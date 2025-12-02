import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { refundMonitoringService } from '../refundMonitoringService';
import { providerHealthHistoryService } from '../providerHealthHistoryService';

describe('Provider Health Monitoring', () => {
  describe('RefundMonitoringService.monitorProviderHealth', () => {
    it('should return health reports for all providers', async () => {
      const healthReports = await refundMonitoringService.monitorProviderHealth();

      expect(healthReports).toBeDefined();
      expect(Array.isArray(healthReports)).toBe(true);
      expect(healthReports.length).toBe(3); // stripe, paypal, blockchain

      healthReports.forEach(report => {
        expect(report).toHaveProperty('provider');
        expect(['stripe', 'paypal', 'blockchain']).toContain(report.provider);
        
        expect(report).toHaveProperty('health');
        expect(report.health).toHaveProperty('overall');
        expect(['healthy', 'warning', 'critical']).toContain(report.health.overall);
        expect(report.health).toHaveProperty('uptime');
        expect(report.health).toHaveProperty('responseTime');
        expect(report.health).toHaveProperty('errorRate');
        expect(report.health).toHaveProperty('throughput');

        expect(report).toHaveProperty('metrics');
        expect(report.metrics).toHaveProperty('last5Minutes');
        expect(report.metrics).toHaveProperty('last15Minutes');
        expect(report.metrics).toHaveProperty('lastHour');

        expect(report).toHaveProperty('alerts');
        expect(Array.isArray(report.alerts)).toBe(true);

        expect(report).toHaveProperty('recommendations');
        expect(Array.isArray(report.recommendations)).toBe(true);
      });
    });

    it('should calculate correct health status based on metrics', async () => {
      const healthReports = await refundMonitoringService.monitorProviderHealth();

      healthReports.forEach(report => {
        const { uptime, errorRate, responseTime } = report.health;

        if (report.health.overall === 'healthy') {
          expect(uptime).toBeGreaterThanOrEqual(99);
          expect(errorRate).toBeLessThan(1);
          expect(responseTime).toBeLessThan(2000);
        } else if (report.health.overall === 'warning') {
          expect(uptime).toBeGreaterThanOrEqual(95);
          expect(errorRate).toBeLessThan(5);
          expect(responseTime).toBeLessThan(5000);
        }
      });
    });

    it('should generate alerts for unhealthy providers', async () => {
      const healthReports = await refundMonitoringService.monitorProviderHealth();

      healthReports.forEach(report => {
        if (report.health.overall === 'critical' || report.health.overall === 'warning') {
          expect(report.alerts.length).toBeGreaterThan(0);
          
          report.alerts.forEach(alert => {
            expect(alert).toHaveProperty('severity');
            expect(['info', 'warning', 'critical']).toContain(alert.severity);
            expect(alert).toHaveProperty('message');
            expect(alert).toHaveProperty('timestamp');
          });
        }
      });
    });

    it('should provide recommendations for problematic providers', async () => {
      const healthReports = await refundMonitoringService.monitorProviderHealth();

      healthReports.forEach(report => {
        if (report.health.overall !== 'healthy') {
          expect(report.recommendations.length).toBeGreaterThan(0);
          
          report.recommendations.forEach(recommendation => {
            expect(typeof recommendation).toBe('string');
            expect(recommendation.length).toBeGreaterThan(0);
          });
        }
      });
    });

    it('should track metrics across different time windows', async () => {
      const healthReports = await refundMonitoringService.monitorProviderHealth();

      healthReports.forEach(report => {
        const { last5Minutes, last15Minutes, lastHour } = report.metrics;

        expect(last5Minutes.successCount).toBeGreaterThanOrEqual(0);
        expect(last5Minutes.failureCount).toBeGreaterThanOrEqual(0);
        expect(last5Minutes.averageResponseTime).toBeGreaterThanOrEqual(0);

        expect(last15Minutes.successCount).toBeGreaterThanOrEqual(last5Minutes.successCount);
        expect(last15Minutes.failureCount).toBeGreaterThanOrEqual(last5Minutes.failureCount);

        expect(lastHour.successCount).toBeGreaterThanOrEqual(last15Minutes.successCount);
        expect(lastHour.failureCount).toBeGreaterThanOrEqual(last15Minutes.failureCount);
      });
    });
  });

  describe('ProviderHealthHistoryService', () => {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

    describe('getHealthSnapshots', () => {
      it('should return health snapshots for a provider', async () => {
        const snapshots = await providerHealthHistoryService.getHealthSnapshots(
          'stripe',
          startDate,
          endDate,
          60 // 1 hour intervals
        );

        expect(Array.isArray(snapshots)).toBe(true);
        
        snapshots.forEach(snapshot => {
          expect(snapshot).toHaveProperty('timestamp');
          expect(snapshot).toHaveProperty('provider');
          expect(snapshot.provider).toBe('stripe');
          expect(snapshot).toHaveProperty('status');
          expect(['operational', 'degraded', 'down']).toContain(snapshot.status);
          expect(snapshot).toHaveProperty('successRate');
          expect(snapshot).toHaveProperty('errorRate');
          expect(snapshot).toHaveProperty('averageResponseTime');
          expect(snapshot).toHaveProperty('transactionCount');
        });
      });

      it('should respect the interval parameter', async () => {
        const intervalMinutes = 30;
        const snapshots = await providerHealthHistoryService.getHealthSnapshots(
          'paypal',
          startDate,
          endDate,
          intervalMinutes
        );

        if (snapshots.length > 1) {
          const timeDiff = snapshots[1].timestamp.getTime() - snapshots[0].timestamp.getTime();
          const expectedDiff = intervalMinutes * 60 * 1000;
          expect(timeDiff).toBe(expectedDiff);
        }
      });
    });

    describe('getHealthTrends', () => {
      it('should return health trends for a provider', async () => {
        const trends = await providerHealthHistoryService.getHealthTrends(
          'blockchain',
          startDate,
          endDate
        );

        expect(trends).toHaveProperty('provider');
        expect(trends.provider).toBe('blockchain');
        
        expect(trends).toHaveProperty('period');
        expect(trends.period.start).toEqual(startDate);
        expect(trends.period.end).toEqual(endDate);

        expect(trends).toHaveProperty('snapshots');
        expect(Array.isArray(trends.snapshots)).toBe(true);

        expect(trends).toHaveProperty('trends');
        expect(trends.trends).toHaveProperty('successRateTrend');
        expect(['improving', 'stable', 'declining']).toContain(trends.trends.successRateTrend);
        expect(trends.trends).toHaveProperty('responseTimeTrend');
        expect(['improving', 'stable', 'declining']).toContain(trends.trends.responseTimeTrend);
        expect(trends.trends).toHaveProperty('volumeTrend');
        expect(['increasing', 'stable', 'decreasing']).toContain(trends.trends.volumeTrend);

        expect(trends).toHaveProperty('statistics');
        expect(trends.statistics).toHaveProperty('averageSuccessRate');
        expect(trends.statistics).toHaveProperty('averageResponseTime');
        expect(trends.statistics).toHaveProperty('totalTransactions');
        expect(trends.statistics).toHaveProperty('uptimePercentage');
      });

      it('should calculate statistics correctly', async () => {
        const trends = await providerHealthHistoryService.getHealthTrends(
          'stripe',
          startDate,
          endDate
        );

        expect(trends.statistics.averageSuccessRate).toBeGreaterThanOrEqual(0);
        expect(trends.statistics.averageSuccessRate).toBeLessThanOrEqual(100);
        
        expect(trends.statistics.averageResponseTime).toBeGreaterThanOrEqual(0);
        
        expect(trends.statistics.totalTransactions).toBeGreaterThanOrEqual(0);
        
        expect(trends.statistics.uptimePercentage).toBeGreaterThanOrEqual(0);
        expect(trends.statistics.uptimePercentage).toBeLessThanOrEqual(100);
      });
    });

    describe('compareProviderHealth', () => {
      it('should compare health across all providers', async () => {
        const comparison = await providerHealthHistoryService.compareProviderHealth(
          startDate,
          endDate
        );

        expect(comparison).toHaveProperty('period');
        expect(comparison.period.start).toEqual(startDate);
        expect(comparison.period.end).toEqual(endDate);

        expect(comparison).toHaveProperty('providers');
        expect(Array.isArray(comparison.providers)).toBe(true);
        expect(comparison.providers.length).toBe(3);

        comparison.providers.forEach((provider, index) => {
          expect(provider).toHaveProperty('provider');
          expect(['stripe', 'paypal', 'blockchain']).toContain(provider.provider);
          
          expect(provider).toHaveProperty('rank');
          expect(provider.rank).toBe(index + 1);
          
          expect(provider).toHaveProperty('score');
          expect(provider.score).toBeGreaterThanOrEqual(0);
          expect(provider.score).toBeLessThanOrEqual(100);

          expect(provider).toHaveProperty('metrics');
          expect(provider.metrics).toHaveProperty('successRate');
          expect(provider.metrics).toHaveProperty('responseTime');
          expect(provider.metrics).toHaveProperty('uptime');
          expect(provider.metrics).toHaveProperty('volume');
        });

        expect(comparison).toHaveProperty('recommendations');
        expect(Array.isArray(comparison.recommendations)).toBe(true);
        expect(comparison.recommendations.length).toBeGreaterThan(0);
      });

      it('should rank providers by composite score', async () => {
        const comparison = await providerHealthHistoryService.compareProviderHealth(
          startDate,
          endDate
        );

        // Verify providers are sorted by score (descending)
        for (let i = 0; i < comparison.providers.length - 1; i++) {
          expect(comparison.providers[i].score).toBeGreaterThanOrEqual(
            comparison.providers[i + 1].score
          );
        }

        // Verify ranks are sequential
        comparison.providers.forEach((provider, index) => {
          expect(provider.rank).toBe(index + 1);
        });
      });

      it('should provide actionable recommendations', async () => {
        const comparison = await providerHealthHistoryService.compareProviderHealth(
          startDate,
          endDate
        );

        comparison.recommendations.forEach(recommendation => {
          expect(typeof recommendation).toBe('string');
          expect(recommendation.length).toBeGreaterThan(0);
          // Recommendations should mention specific providers or actions
          expect(
            recommendation.includes('stripe') ||
            recommendation.includes('paypal') ||
            recommendation.includes('blockchain') ||
            recommendation.includes('monitoring') ||
            recommendation.includes('performing well')
          ).toBe(true);
        });
      });
    });
  });
});
