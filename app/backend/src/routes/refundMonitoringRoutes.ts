import { Router } from 'express';
import { refundMonitoringController } from '../controllers/refundMonitoringController';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';

const router = Router();

/**
 * Refund Monitoring Routes
 * API endpoints for refund transaction monitoring and analytics
 * 
 * All routes require admin authentication
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 * Properties: 7, 8, 9, 10
 */

// Apply admin authentication middleware to all routes
router.use(adminAuthMiddleware);

/**
 * GET /api/admin/refunds/tracker
 * Get comprehensive refund transaction tracking data
 * Property 7: Multi-Provider Transaction Tracking
 * 
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
router.get('/tracker', refundMonitoringController.getTransactionTracker);

/**
 * GET /api/admin/refunds/providers/status
 * Get real-time payment provider status
 * Property 8: Failure Detection and Alerting
 */
router.get('/providers/status', refundMonitoringController.getProviderStatus);

/**
 * GET /api/admin/refunds/providers/health
 * Monitor provider health metrics
 * Comprehensive health monitoring for all payment providers
 */
router.get('/providers/health', refundMonitoringController.monitorProviderHealth);

/**
 * GET /api/admin/refunds/reconciliation
 * Get refund reconciliation data
 * Property 9: Transaction Reconciliation Completeness
 * 
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
router.get('/reconciliation', refundMonitoringController.getReconciliationData);

/**
 * GET /api/admin/refunds/failures/analysis
 * Analyze refund failures
 * Property 10: Discrepancy Detection
 * 
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
router.get('/failures/analysis', refundMonitoringController.analyzeFailures);

/**
 * GET /api/admin/refunds/failures/patterns
 * Detect failure patterns in refund transactions
 * 
 * Query params:
 * - lookbackMinutes: number (default: 60)
 */
router.get('/failures/patterns', refundMonitoringController.detectFailurePatterns);

/**
 * GET /api/admin/refunds/alerts
 * Generate alerts based on current system state
 */
router.get('/alerts', refundMonitoringController.generateAlerts);

/**
 * POST /api/admin/refunds/remediation/suggestions
 * Generate remediation suggestions based on alerts and patterns
 * 
 * Body:
 * - alerts: Alert[]
 * - patterns: FailurePattern[]
 */
router.post('/remediation/suggestions', refundMonitoringController.generateRemediationSuggestions);

/**
 * POST /api/admin/refunds/track
 * Track a refund transaction
 * 
 * Body: RefundTransactionData
 */
router.post('/track', refundMonitoringController.trackRefundTransaction);

/**
 * PATCH /api/admin/refunds/:refundRecordId/status
 * Update refund transaction status
 * 
 * Params:
 * - refundRecordId: string
 * 
 * Body:
 * - status: 'pending' | 'completed' | 'failed' | 'cancelled'
 * - processedAt?: ISO date string
 * - failureReason?: string
 */
router.patch('/:refundRecordId/status', refundMonitoringController.updateRefundStatus);

/**
 * GET /api/admin/refunds/:refundRecordId
 * Get refund transaction details
 * 
 * Params:
 * - refundRecordId: string
 */
router.get('/:refundRecordId', refundMonitoringController.getRefundDetails);

/**
 * GET /api/admin/refunds/:refundRecordId/audit-log
 * Get refund audit log
 * 
 * Params:
 * - refundRecordId: string
 */
router.get('/:refundRecordId/audit-log', refundMonitoringController.getRefundAuditLog);

/**
 * GET /api/admin/refunds/export
 * Export refund data
 * 
 * Query params:
 * - format: 'csv' | 'excel' | 'json'
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
router.get('/export', refundMonitoringController.exportRefundData);

/**
 * GET /api/admin/refunds/revenue-impact
 * Calculate revenue impact from refunds
 * Property 24: Comprehensive Cost Calculation
 * Property 25: Multi-Dimensional Impact Analysis
 * 
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
router.get('/revenue-impact', refundMonitoringController.calculateRevenueImpact);

/**
 * GET /api/admin/refunds/cost-analysis
 * Get comprehensive cost analysis
 * Property 24: Comprehensive Cost Calculation
 * Property 25: Multi-Dimensional Impact Analysis
 * 
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
router.get('/cost-analysis', refundMonitoringController.getCostAnalysis);

/**
 * GET /api/admin/refunds/cost-trends
 * Get cost trend analysis
 * Property 25: Multi-Dimensional Impact Analysis
 * Property 26: Historical Data Forecasting
 * 
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
router.get('/cost-trends', refundMonitoringController.getCostTrends);

/**
 * GET /api/admin/refunds/processing-fees
 * Get processing fees breakdown
 * Property 24: Comprehensive Cost Calculation
 * 
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
router.get('/processing-fees', refundMonitoringController.getProcessingFees);

/**
 * GET /api/admin/refunds/shipping-costs
 * Get shipping costs analysis
 * Property 24: Comprehensive Cost Calculation
 * 
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
router.get('/shipping-costs', refundMonitoringController.getShippingCosts);

/**
 * GET /api/admin/refunds/administrative-overhead
 * Get administrative overhead analysis
 * Property 24: Comprehensive Cost Calculation
 * 
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
router.get('/administrative-overhead', refundMonitoringController.getAdministrativeOverhead);

/**
 * GET /api/admin/refunds/profitability-metrics
 * Get profitability metrics
 * Task 2.3: Add profitability metrics
 * 
 * Calculates comprehensive profitability metrics including:
 * - Refund-to-revenue ratio
 * - Cost per return
 * - Net impact calculations
 * 
 * Query params:
 * - startDate: ISO date string (required)
 * - endDate: ISO date string (required)
 * - totalRevenue: number (optional) - Total revenue for the period to calculate ratios
 */
router.get('/profitability-metrics', refundMonitoringController.getProfitabilityMetrics);

export default router;
