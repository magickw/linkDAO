/**
 * Profitability Metrics Tests
 * Task 2.3: Add profitability metrics
 * 
 * Tests for the profitability metrics calculation functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { refundCostAnalysisService } from '../refundCostAnalysisService';

// Mock the database
vi.mock('../../db/index', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          groupBy: vi.fn(() => Promise.resolve([]))
        }))
      }))
    }))
  }
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

describe('RefundCostAnalysisService - Profitability Metrics', () => {
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2024-01-31');
  const totalRevenue = 100000;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateProfitabilityMetrics', () => {
    it('should return profitability metrics structure', async () => {
      const metrics = await refundCostAnalysisService.calculateProfitabilityMetrics(
        startDate,
        endDate,
        totalRevenue
      );

      // Verify structure
      expect(metrics).toHaveProperty('refundToRevenueRatio');
      expect(metrics).toHaveProperty('costPerReturn');
      expect(metrics).toHaveProperty('costPerReturnBreakdown');
      expect(metrics).toHaveProperty('netImpact');
      expect(metrics).toHaveProperty('profitabilityRatios');
      expect(metrics).toHaveProperty('efficiencyMetrics');
    });

    it('should include cost per return breakdown', async () => {
      const metrics = await refundCostAnalysisService.calculateProfitabilityMetrics(
        startDate,
        endDate,
        totalRevenue
      );

      expect(metrics.costPerReturnBreakdown).toHaveProperty('processingFeePerReturn');
      expect(metrics.costPerReturnBreakdown).toHaveProperty('shippingCostPerReturn');
      expect(metrics.costPerReturnBreakdown).toHaveProperty('administrativeOverheadPerReturn');
    });

    it('should include net impact calculations', async () => {
      const metrics = await refundCostAnalysisService.calculateProfitabilityMetrics(
        startDate,
        endDate,
        totalRevenue
      );

      expect(metrics.netImpact).toHaveProperty('totalRevenueLoss');
      expect(metrics.netImpact).toHaveProperty('totalCosts');
      expect(metrics.netImpact).toHaveProperty('netFinancialImpact');
      expect(metrics.netImpact).toHaveProperty('impactOnPlatformFees');
      expect(metrics.netImpact).toHaveProperty('impactOnSellerRevenue');
    });

    it('should include profitability ratios', async () => {
      const metrics = await refundCostAnalysisService.calculateProfitabilityMetrics(
        startDate,
        endDate,
        totalRevenue
      );

      expect(metrics.profitabilityRatios).toHaveProperty('costToRefundRatio');
      expect(metrics.profitabilityRatios).toHaveProperty('netImpactToRevenueRatio');
      expect(metrics.profitabilityRatios).toHaveProperty('returnRate');
    });

    it('should include efficiency metrics', async () => {
      const metrics = await refundCostAnalysisService.calculateProfitabilityMetrics(
        startDate,
        endDate,
        totalRevenue
      );

      expect(metrics.efficiencyMetrics).toHaveProperty('averageRefundAmount');
      expect(metrics.efficiencyMetrics).toHaveProperty('averageReturnProcessingTime');
      expect(metrics.efficiencyMetrics).toHaveProperty('costEfficiencyScore');
    });

    it('should handle missing totalRevenue parameter', async () => {
      const metrics = await refundCostAnalysisService.calculateProfitabilityMetrics(
        startDate,
        endDate
      );

      // Should still return valid metrics
      expect(metrics).toBeDefined();
      expect(metrics.refundToRevenueRatio).toBe(0);
      expect(metrics.profitabilityRatios.netImpactToRevenueRatio).toBe(0);
    });

    it('should calculate refund-to-revenue ratio correctly', async () => {
      const metrics = await refundCostAnalysisService.calculateProfitabilityMetrics(
        startDate,
        endDate,
        totalRevenue
      );

      // Ratio should be a percentage
      expect(typeof metrics.refundToRevenueRatio).toBe('number');
      expect(metrics.refundToRevenueRatio).toBeGreaterThanOrEqual(0);
    });

    it('should calculate cost per return', async () => {
      const metrics = await refundCostAnalysisService.calculateProfitabilityMetrics(
        startDate,
        endDate,
        totalRevenue
      );

      expect(typeof metrics.costPerReturn).toBe('number');
      expect(metrics.costPerReturn).toBeGreaterThanOrEqual(0);
    });

    it('should calculate net financial impact', async () => {
      const metrics = await refundCostAnalysisService.calculateProfitabilityMetrics(
        startDate,
        endDate,
        totalRevenue
      );

      // Net impact should be revenue loss + costs
      const expectedNetImpact = 
        metrics.netImpact.totalRevenueLoss + 
        metrics.netImpact.totalCosts;
      
      expect(metrics.netImpact.netFinancialImpact).toBe(expectedNetImpact);
    });

    it('should return all numeric values', async () => {
      const metrics = await refundCostAnalysisService.calculateProfitabilityMetrics(
        startDate,
        endDate,
        totalRevenue
      );

      // Check all top-level numeric fields
      expect(typeof metrics.refundToRevenueRatio).toBe('number');
      expect(typeof metrics.costPerReturn).toBe('number');

      // Check breakdown
      expect(typeof metrics.costPerReturnBreakdown.processingFeePerReturn).toBe('number');
      expect(typeof metrics.costPerReturnBreakdown.shippingCostPerReturn).toBe('number');
      expect(typeof metrics.costPerReturnBreakdown.administrativeOverheadPerReturn).toBe('number');

      // Check net impact
      expect(typeof metrics.netImpact.totalRevenueLoss).toBe('number');
      expect(typeof metrics.netImpact.totalCosts).toBe('number');
      expect(typeof metrics.netImpact.netFinancialImpact).toBe('number');

      // Check ratios
      expect(typeof metrics.profitabilityRatios.costToRefundRatio).toBe('number');
      expect(typeof metrics.profitabilityRatios.netImpactToRevenueRatio).toBe('number');
      expect(typeof metrics.profitabilityRatios.returnRate).toBe('number');

      // Check efficiency
      expect(typeof metrics.efficiencyMetrics.averageRefundAmount).toBe('number');
      expect(typeof metrics.efficiencyMetrics.averageReturnProcessingTime).toBe('number');
      expect(typeof metrics.efficiencyMetrics.costEfficiencyScore).toBe('number');
    });
  });
});
