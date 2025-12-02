import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  ServerIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import { refundMonitoringService } from '../../../services/refundMonitoringService';
import type {
  RefundTransactionTracker,
  PaymentProviderStatus,
  RefundReconciliation,
  RefundFailureAnalysis
} from '../../../services/refundMonitoringService';

/**
 * RefundAnalyticsInterface Component
 * Comprehensive interface for monitoring refund transactions, provider status, and financial impact
 * 
 * Features:
 * - Transaction monitoring view with real-time metrics
 * - Provider status dashboard with health indicators
 * - Financial impact charts and analysis
 * - Failure analysis and remediation suggestions
 * 
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 * Properties: 7, 8, 9, 10
 */
export const RefundAnalyticsInterface: React.FC = () => {
  // State management
  const [transactionTracker, setTransactionTracker] = useState<RefundTransactionTracker | null>(null);
  const [providerStatus, setProviderStatus] = useState<PaymentProviderStatus[]>([]);
  const [reconciliation, setReconciliation] = useState<RefundReconciliation | null>(null);
  const [failureAnalysis, setFailureAnalysis] = useState<RefundFailureAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'overview' | 'providers' | 'financial'>('overview');

  // Date range for analysis
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
    end: new Date()
  });

  /**
   * Fetch all refund analytics data
   * Property 7: Multi-Provider Transaction Tracking
   */
  const fetchRefundData = async () => {
    try {
      setIsRefreshing(true);
      setError(null);

      const [tracker, providers, recon, failures] = await Promise.all([
        refundMonitoringService.getTransactionTracker(dateRange.start, dateRange.end),
        refundMonitoringService.getProviderStatus(),
        refundMonitoringService.getReconciliationData(dateRange.start, dateRange.end),
        refundMonitoringService.analyzeFailures(dateRange.start, dateRange.end)
      ]);

      setTransactionTracker(tracker);
      setProviderStatus(providers);
      setReconciliation(recon);
      setFailureAnalysis(failures);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching refund data:', err);
      setError('Failed to fetch refund analytics data');
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchRefundData();
  }, []);

  // Refresh data when date range changes
  useEffect(() => {
    if (!isLoading) {
      fetchRefundData();
    }
  }, [dateRange]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRefundData();
    }, 30000);

    return () => clearInterval(interval);
  }, [dateRange]);

  /**
   * Get provider status color and icon
   */
  const getProviderStatusDisplay = (status: PaymentProviderStatus) => {
    switch (status.status) {
      case 'operational':
        return {
          color: 'text-green-400',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/50',
          icon: CheckCircleIcon,
          label: 'Operational'
        };
      case 'degraded':
        return {
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/50',
          icon: ExclamationTriangleIcon,
          label: 'Degraded'
        };
      case 'down':
        return {
          color: 'text-red-400',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/50',
          icon: ExclamationTriangleIcon,
          label: 'Down'
        };
    }
  };

  /**
   * Format currency
   */
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  /**
   * Format time duration
   */
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  /**
   * Format percentage
   */
  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading refund analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Refund Analytics Dashboard
              </h1>
              <p className="text-gray-400">
                Real-time monitoring of refund transactions and provider status
              </p>
            </div>

            <div className="flex items-center space-x-4">
              {/* Last Update */}
              <div className="text-sm text-gray-400">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </div>

              {/* Refresh Button */}
              <button
                onClick={fetchRefundData}
                disabled={isRefreshing}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <ArrowPathIcon className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-center space-x-3"
            >
              <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
              <div>
                <p className="text-red-400 font-medium">Error</p>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            </motion.div>
          )}
        </div>

        {/* View Selector */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setSelectedView('overview')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedView === 'overview'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <ChartBarIcon className="w-5 h-5 inline mr-2" />
            Transaction Overview
          </button>
          <button
            onClick={() => setSelectedView('providers')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedView === 'providers'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <ServerIcon className="w-5 h-5 inline mr-2" />
            Provider Status
          </button>
          <button
            onClick={() => setSelectedView('financial')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedView === 'financial'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <BanknotesIcon className="w-5 h-5 inline mr-2" />
            Financial Impact
          </button>
        </div>

        <AnimatePresence mode="wait">
          {/* Transaction Overview View */}
          {selectedView === 'overview' && transactionTracker && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Transaction Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Refunds */}
                <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-500/10 rounded-lg">
                      <CurrencyDollarIcon className="w-6 h-6 text-blue-400" />
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Total Refunds</p>
                    <p className="text-3xl font-bold text-white">
                      {transactionTracker.totalRefunds.toLocaleString()}
                    </p>
                    <p className="text-gray-500 text-sm mt-2">
                      {formatCurrency(transactionTracker.totalRefundAmount)}
                    </p>
                  </div>
                </div>

                {/* Successful Refunds */}
                <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-green-500/10 rounded-lg">
                      <CheckCircleIcon className="w-6 h-6 text-green-400" />
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Successful</p>
                    <p className="text-3xl font-bold text-white">
                      {transactionTracker.successfulRefunds.toLocaleString()}
                    </p>
                    <p className="text-green-400 text-sm mt-2">
                      {formatPercentage(
                        (transactionTracker.successfulRefunds / transactionTracker.totalRefunds) * 100
                      )} success rate
                    </p>
                  </div>
                </div>

                {/* Failed Refunds */}
                <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-red-500/10 rounded-lg">
                      <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Failed</p>
                    <p className="text-3xl font-bold text-white">
                      {transactionTracker.failedRefunds.toLocaleString()}
                    </p>
                    <p className="text-red-400 text-sm mt-2">
                      {formatPercentage(
                        (transactionTracker.failedRefunds / transactionTracker.totalRefunds) * 100
                      )} failure rate
                    </p>
                  </div>
                </div>

                {/* Average Processing Time */}
                <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-purple-500/10 rounded-lg">
                      <ClockIcon className="w-6 h-6 text-purple-400" />
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Avg Processing Time</p>
                    <p className="text-3xl font-bold text-white">
                      {formatDuration(transactionTracker.averageRefundTime)}
                    </p>
                    <p className="text-gray-500 text-sm mt-2">
                      {transactionTracker.pendingRefunds} pending
                    </p>
                  </div>
                </div>
              </div>

              {/* Provider Breakdown */}
              <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6 mb-8">
                <h3 className="text-xl font-bold text-white mb-6">Provider Breakdown</h3>
                <div className="space-y-4">
                  {transactionTracker.providerBreakdown.map((provider) => (
                    <div key={provider.provider} className="bg-gray-700/30 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-500/10 rounded-lg">
                            <ServerIcon className="w-5 h-5 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium capitalize">{provider.provider}</p>
                            <p className="text-gray-400 text-sm">
                              {provider.totalTransactions} transactions
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold">
                            {formatCurrency(provider.totalAmount)}
                          </p>
                          <p className="text-gray-400 text-sm">
                            {formatPercentage(provider.successRate)} success
                          </p>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="w-full bg-gray-600 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${provider.successRate}%` }}
                        />
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                        <div>
                          <p className="text-gray-400">Successful</p>
                          <p className="text-green-400 font-medium">
                            {provider.successfulTransactions}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Failed</p>
                          <p className="text-red-400 font-medium">
                            {provider.failedTransactions}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Avg Time</p>
                          <p className="text-purple-400 font-medium">
                            {formatDuration(provider.averageProcessingTime)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Provider Status View */}
          {selectedView === 'providers' && (
            <motion.div
              key="providers"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {providerStatus.map((provider) => {
                  const display = getProviderStatusDisplay(provider);
                  const StatusIcon = display.icon;

                  return (
                    <div
                      key={provider.provider}
                      className={`bg-gray-800/50 backdrop-blur-xl border ${display.borderColor} rounded-xl p-6`}
                    >
                      {/* Provider Header */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                          <div className={`p-3 ${display.bgColor} rounded-lg`}>
                            <ServerIcon className={`w-6 h-6 ${display.color}`} />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white capitalize">
                              {provider.provider}
                            </h3>
                            <div className="flex items-center space-x-2 mt-1">
                              <StatusIcon className={`w-4 h-4 ${display.color}`} />
                              <span className={`text-sm font-medium ${display.color}`}>
                                {display.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="space-y-4">
                        {/* Success Rate */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-400 text-sm">Success Rate</span>
                            <span className="text-white font-bold">
                              {formatPercentage(provider.successRate)}
                            </span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${
                                provider.successRate >= 95
                                  ? 'bg-green-500'
                                  : provider.successRate >= 80
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${provider.successRate}%` }}
                            />
                          </div>
                        </div>

                        {/* Error Rate */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-400 text-sm">Error Rate</span>
                            <span className="text-white font-bold">
                              {formatPercentage(provider.errorRate)}
                            </span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-red-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${provider.errorRate}%` }}
                            />
                          </div>
                        </div>

                        {/* Processing Time */}
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm">Avg Processing Time</span>
                          <span className="text-white font-bold">
                            {formatDuration(provider.averageProcessingTime)}
                          </span>
                        </div>

                        {/* Last Successful Refund */}
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm">Last Successful</span>
                          <span className="text-white font-bold text-sm">
                            {provider.lastSuccessfulRefund
                              ? new Date(provider.lastSuccessfulRefund).toLocaleTimeString()
                              : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Recent Errors */}
                      {provider.recentErrors.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-gray-700">
                          <p className="text-gray-400 text-sm mb-3">Recent Errors:</p>
                          <div className="space-y-2">
                            {provider.recentErrors.slice(0, 3).map((error, index) => (
                              <div
                                key={index}
                                className="bg-red-500/10 border border-red-500/30 rounded-lg p-2"
                              >
                                <p className="text-red-300 text-xs truncate">{error}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Financial Impact View */}
          {selectedView === 'financial' && reconciliation && failureAnalysis && (
            <motion.div
              key="financial"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Reconciliation Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-green-500/10 rounded-lg">
                      <CheckCircleIcon className="w-6 h-6 text-green-400" />
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Reconciled</p>
                    <p className="text-3xl font-bold text-white">
                      {reconciliation.totalReconciled.toLocaleString()}
                    </p>
                    <p className="text-green-400 text-sm mt-2">
                      {formatPercentage(reconciliation.reconciliationRate)}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-yellow-500/10 rounded-lg">
                      <ClockIcon className="w-6 h-6 text-yellow-400" />
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Pending</p>
                    <p className="text-3xl font-bold text-white">
                      {reconciliation.totalPending.toLocaleString()}
                    </p>
                    <p className="text-gray-500 text-sm mt-2">
                      Avg {formatDuration(reconciliation.averageReconciliationTime)}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-red-500/10 rounded-lg">
                      <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Discrepancies</p>
                    <p className="text-3xl font-bold text-white">
                      {reconciliation.totalDiscrepancies.toLocaleString()}
                    </p>
                    <p className="text-red-400 text-sm mt-2">
                      {formatCurrency(reconciliation.totalDiscrepancyAmount)}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-purple-500/10 rounded-lg">
                      <ChartBarIcon className="w-6 h-6 text-purple-400" />
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Total Failures</p>
                    <p className="text-3xl font-bold text-white">
                      {failureAnalysis.totalFailures.toLocaleString()}
                    </p>
                    <p className="text-gray-500 text-sm mt-2">
                      {failureAnalysis.permanentFailures} permanent
                    </p>
                  </div>
                </div>
              </div>

              {/* Failure Analysis */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Failures by Provider */}
                <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-6">Failures by Provider</h3>
                  <div className="space-y-4">
                    {Object.entries(failureAnalysis.failuresByProvider).map(([provider, count]) => (
                      <div key={provider} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-red-500/10 rounded-lg">
                            <ServerIcon className="w-5 h-5 text-red-400" />
                          </div>
                          <span className="text-white capitalize">{provider}</span>
                        </div>
                        <span className="text-red-400 font-bold">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Failures by Reason */}
                <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-6">Failures by Reason</h3>
                  <div className="space-y-4">
                    {Object.entries(failureAnalysis.failuresByReason)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([reason, count]) => (
                        <div key={reason} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-orange-500/10 rounded-lg">
                              <ExclamationTriangleIcon className="w-5 h-5 text-orange-400" />
                            </div>
                            <span className="text-white text-sm">{reason}</span>
                          </div>
                          <span className="text-orange-400 font-bold">{count}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
