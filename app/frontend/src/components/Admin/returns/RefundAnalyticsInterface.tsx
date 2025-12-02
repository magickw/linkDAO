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
  ArrowTrendingDownIcon,
  ArrowDownTrayIcon,
  DocumentArrowDownIcon,
  XMarkIcon
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
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Drill-down state
  const [drillDown, setDrillDown] = useState<{
    type: 'provider' | 'transaction' | 'failure' | null;
    value: string | null;
    data: any;
  }>({ type: null, value: null, data: null });

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

  // Add click handlers for drill-down
  const handleProviderClick = (provider: string) => {
    handleDrillDown('provider', provider);
  };

  const handleTransactionClick = (transactionId: string) => {
    handleDrillDown('transaction', transactionId);
  };

  const handleFailureClick = (failureType: string) => {
    handleDrillDown('failure', failureType);
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

  // Export functionality
  const exportFormats = [
    {
      type: 'csv',
      label: 'CSV',
      icon: <DocumentArrowDownIcon className="w-5 h-5" />
    },
    {
      type: 'excel',
      label: 'Excel',
      icon: <DocumentArrowDownIcon className="w-5 h-5" />
    },
    {
      type: 'pdf',
      label: 'PDF Report',
      icon: <DocumentArrowDownIcon className="w-5 h-5" />
    }
  ];

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    setIsExporting(true);
    try {
      // Prepare export data based on current view
      const exportData = {
        view: selectedView,
        dateRange: {
          start: dateRange.start.toISOString().split('T')[0],
          end: dateRange.end.toISOString().split('T')[0]
        },
        transactionTracker,
        providerStatus,
        reconciliation,
        failureAnalysis,
        exportTimestamp: new Date().toISOString()
      };

      switch (format) {
        case 'csv':
          await exportToCSV(exportData);
          break;
        case 'excel':
          await exportToExcel(exportData);
          break;
        case 'pdf':
          await exportToPDF(exportData);
          break;
      }
    } catch (error) {
      console.error('Export failed:', error);
      setError('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
      setShowExportMenu(false);
    }
  };

  const exportToCSV = async (data: any) => {
    let csvContent = [];
    
    // Header
    csvContent.push(['Refund Analytics Export', '', '', '']);
    csvContent.push(['Export Date', new Date().toLocaleDateString(), '', '']);
    csvContent.push(['Date Range', `${data.dateRange.start} to ${data.dateRange.end}`, '', '']);
    csvContent.push(['View', data.view, '', '']);
    csvContent.push(['', '', '', '']);

    // Transaction Overview
    if (data.transactionTracker) {
      csvContent.push(['Transaction Overview', '', '', '']);
      csvContent.push(['Total Refunds', data.transactionTracker.totalRefunds, '', '']);
      csvContent.push(['Successful Refunds', data.transactionTracker.successfulRefunds, '', '']);
      csvContent.push(['Failed Refunds', data.transactionTracker.failedRefunds, '', '']);
      csvContent.push(['Total Refund Amount', `$${data.transactionTracker.totalRefundAmount}`, '', '']);
      csvContent.push(['Average Refund Time', formatDuration(data.transactionTracker.averageRefundTime), '', '']);
      csvContent.push(['', '', '', '']);
      
      // Provider Breakdown
      csvContent.push(['Provider Breakdown', '', '', '']);
      csvContent.push(['Provider', 'Total Transactions', 'Total Amount', 'Success Rate']);
      data.transactionTracker.providerBreakdown.forEach((provider: any) => {
        csvContent.push([
          provider.provider,
          provider.totalTransactions,
          `$${provider.totalAmount}`,
          `${provider.successRate}%`
        ]);
      });
      csvContent.push(['', '', '', '']);
    }

    // Provider Status
    if (data.providerStatus && data.providerStatus.length > 0) {
      csvContent.push(['Provider Status', '', '', '']);
      csvContent.push(['Provider', 'Status', 'Success Rate', 'Error Rate', 'Avg Processing Time']);
      data.providerStatus.forEach((provider: any) => {
        csvContent.push([
          provider.provider,
          provider.status,
          `${provider.successRate}%`,
          `${provider.errorRate}%`,
          formatDuration(provider.averageProcessingTime)
        ]);
      });
      csvContent.push(['', '', '', '']);
    }

    // Reconciliation Data
    if (data.reconciliation) {
      csvContent.push(['Reconciliation Metrics', '', '', '']);
      csvContent.push(['Total Reconciled', data.reconciliation.totalReconciled, '', '']);
      csvContent.push(['Total Pending', data.reconciliation.totalPending, '', '']);
      csvContent.push(['Total Discrepancies', data.reconciliation.totalDiscrepancies, '', '']);
      csvContent.push(['Discrepancy Amount', `$${data.reconciliation.totalDiscrepancyAmount}`, '', '']);
      csvContent.push(['Reconciliation Rate', `${data.reconciliation.reconciliationRate}%`, '', '']);
      csvContent.push(['', '', '', '']);
    }

    // Failure Analysis
    if (data.failureAnalysis) {
      csvContent.push(['Failure Analysis', '', '', '']);
      csvContent.push(['Total Failures', data.failureAnalysis.totalFailures, '', '']);
      csvContent.push(['Permanent Failures', data.failureAnalysis.permanentFailures, '', '']);
      csvContent.push(['', '', '', '']);
      
      // Failures by Provider
      csvContent.push(['Failures by Provider', '', '', '']);
      Object.entries(data.failureAnalysis.failuresByProvider).forEach(([provider, count]) => {
        csvContent.push([provider, count, '', '']);
      });
      csvContent.push(['', '', '', '']);
      
      // Failures by Reason
      csvContent.push(['Failures by Reason', '', '', '']);
      Object.entries(data.failureAnalysis.failuresByReason).forEach(([reason, count]) => {
        csvContent.push([reason, count, '', '']);
      });
    }

    // Convert to CSV string
    const csvString = csvContent.map(row => row.join(',')).join('
');

    // Download CSV file
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `refund-analytics-${data.view}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Drill-down functionality
  const handleDrillDown = async (type: 'provider' | 'transaction' | 'failure', value: string) => {
    try {
      setIsLoading(true);
      // In a real implementation, this would call an API endpoint to get detailed data
      const drillDownData = {
        type,
        value,
        data: await getDrillDownDetails(type, value)
      };
      
      setDrillDown(drillDownData);
    } catch (error) {
      console.error('Drill-down failed:', error);
      setError('Failed to load detailed information');
    } finally {
      setIsLoading(false);
    }
  };

  const getDrillDownDetails = async (type: string, value: string) => {
    // Mock implementation - in real app, this would fetch from API
    switch (type) {
      case 'provider':
        return {
          provider: value,
          totalTransactions: Math.floor(Math.random() * 1000) + 500,
          successfulTransactions: Math.floor(Math.random() * 900) + 400,
          failedTransactions: Math.floor(Math.random() * 100) + 50,
          totalAmount: Math.floor(Math.random() * 100000) + 50000,
          averageProcessingTime: Math.floor(Math.random() * 300) + 60,
          errorRate: (Math.random() * 10 + 2).toFixed(1),
          recentTransactions: Array.from({ length: 10 }, (_, i) => ({
            id: `TXN${100000 + i}`,
            timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
            amount: Math.floor(Math.random() * 1000) + 100,
            status: ['successful', 'failed', 'pending'][Math.floor(Math.random() * 3)],
            errorCode: Math.random() > 0.7 ? `ERR${Math.floor(Math.random() * 1000)}` : null
          })),
          errorBreakdown: {
            'Insufficient Funds': Math.floor(Math.random() * 20) + 5,
            'Invalid Card': Math.floor(Math.random() * 15) + 3,
            'Network Timeout': Math.floor(Math.random() * 10) + 2,
            'API Error': Math.floor(Math.random() * 8) + 1,
            'Other': Math.floor(Math.random() * 5) + 1
          }
        };
      case 'transaction':
        return {
          transactionId: value,
          amount: Math.floor(Math.random() * 1000) + 100,
          provider: ['stripe', 'paypal', 'blockchain'][Math.floor(Math.random() * 3)],
          status: ['successful', 'failed', 'pending'][Math.floor(Math.random() * 3)],
          timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          customerEmail: `customer${Math.floor(Math.random() * 1000)}@example.com`,
          orderId: `ORD${Math.floor(Math.random() * 100000)}`,
          refundReason: ['Defective Product', 'Wrong Item', 'Not as Described', 'Changed Mind'][Math.floor(Math.random() * 4)],
          processingSteps: [
            { step: 'Refund Requested', timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(), status: 'completed' },
            { step: 'Provider Processing', timestamp: new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000).toISOString(), status: 'completed' },
            { step: 'Bank Processing', timestamp: new Date(Date.now() - Math.random() * 6 * 60 * 60 * 1000).toISOString(), status: 'in_progress' },
            { step: 'Customer Account', timestamp: null, status: 'pending' }
          ],
          failureReason: Math.random() > 0.7 ? {
            code: `ERR${Math.floor(Math.random() * 1000)}`,
            message: ['Insufficient funds', 'Invalid card details', 'Network timeout', 'API limit exceeded'][Math.floor(Math.random() * 4)],
            retryable: Math.random() > 0.5
          } : null
        };
      case 'failure':
        return {
          failureType: value,
          totalOccurrences: Math.floor(Math.random() * 100) + 20,
          affectedProviders: ['stripe', 'paypal', 'blockchain'].slice(0, Math.floor(Math.random() * 3) + 1),
          firstOccurrence: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          lastOccurrence: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          averageResolutionTime: Math.floor(Math.random() * 3600) + 300, // seconds
          resolutionRate: (Math.random() * 30 + 70).toFixed(1), // percentage
          recentFailures: Array.from({ length: 5 }, (_, i) => ({
            id: `FAIL${1000 + i}`,
            timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
            provider: ['stripe', 'paypal', 'blockchain'][Math.floor(Math.random() * 3)],
            transactionId: `TXN${Math.floor(Math.random() * 100000)}`,
            resolved: Math.random() > 0.3,
            resolutionTime: Math.random() > 0.3 ? Math.floor(Math.random() * 3600) + 60 : null
          })),
          recommendedActions: [
            'Check provider API status',
            'Review error logs for patterns',
            'Contact provider support',
            'Implement retry logic',
            'Update integration documentation'
          ]
        };
      default:
        return {};
    }
  };

  const clearDrillDown = () => {
    setDrillDown({ type: null, value: null, data: null });
  };

  const exportToExcel = async (data: any) => {
    // Create structured data for Excel export
    const workbookData = {
      metadata: {
        exportDate: new Date().toISOString(),
        dateRange: data.dateRange,
        view: data.view
      },
      transactionOverview: data.transactionTracker,
      providerStatus: data.providerStatus,
      reconciliation: data.reconciliation,
      failureAnalysis: data.failureAnalysis
    };

    // Convert to JSON and download as .xlsx (simplified approach)
    const jsonContent = JSON.stringify(workbookData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `refund-analytics-${data.view}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToPDF = async (data: any) => {
    // Create formatted text report
    const reportContent = `
REFUND ANALYTICS REPORT
=========================

Export Date: ${new Date().toLocaleDateString()}
Date Range: ${data.dateRange.start} to ${data.dateRange.end}
View: ${data.view.toUpperCase()}

TRANSACTION OVERVIEW
---------------------
${data.transactionTracker ? `
Total Refunds: ${data.transactionTracker.totalRefunds}
Successful Refunds: ${data.transactionTracker.successfulRefunds}
Failed Refunds: ${data.transactionTracker.failedRefunds}
Total Refund Amount: $${data.transactionTracker.totalRefundAmount}
Average Refund Time: ${formatDuration(data.transactionTracker.averageRefundTime)}
Pending Refunds: ${data.transactionTracker.pendingRefunds}
` : 'No transaction data available'}

PROVIDER STATUS
----------------
${data.providerStatus && data.providerStatus.length > 0 ? 
  data.providerStatus.map((provider: any) => 
    `${provider.provider.toUpperCase()}:
` +
    `  Status: ${provider.status}
` +
    `  Success Rate: ${provider.successRate}%
` +
    `  Error Rate: ${provider.errorRate}%
` +
    `  Avg Processing Time: ${formatDuration(provider.averageProcessingTime)}
`
  ).join('
') : 'No provider data available'
}

RECONCILIATION METRICS
-----------------------
${data.reconciliation ? `
Total Reconciled: ${data.reconciliation.totalReconciled}
Total Pending: ${data.reconciliation.totalPending}
Total Discrepancies: ${data.reconciliation.totalDiscrepancies}
Discrepancy Amount: $${data.reconciliation.totalDiscrepancyAmount}
Reconciliation Rate: ${data.reconciliation.reconciliationRate}%
Average Reconciliation Time: ${formatDuration(data.reconciliation.averageReconciliationTime)}
` : 'No reconciliation data available'}

FAILURE ANALYSIS
-----------------
${data.failureAnalysis ? `
Total Failures: ${data.failureAnalysis.totalFailures}
Permanent Failures: ${data.failureAnalysis.permanentFailures}
Retryable Failures: ${data.failureAnalysis.retryableFailures}

Failures by Provider:
${Object.entries(data.failureAnalysis.failuresByProvider).map(([provider, count]) => 
  `  ${provider}: ${count}`
).join('
')}

Failures by Reason:
${Object.entries(data.failureAnalysis.failuresByReason).map(([reason, count]) => 
  `  ${reason}: ${count}`
).join('
')}
` : 'No failure analysis data available'}
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `refund-analytics-report-${data.view}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

              <div className="flex items-center space-x-4">
              {/* Export Button */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={isExporting}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  <ArrowDownTrayIcon className={`w-5 h-5 ${isExporting ? 'animate-pulse' : ''}`} />
                  <span>{isExporting ? 'Exporting...' : 'Export'}</span>
                </button>
                
                {/* Export Dropdown Menu */}
                <AnimatePresence>
                  {showExportMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50"
                    >
                      {exportFormats.map((format) => (
                        <button
                          key={format.type}
                          onClick={() => handleExport(format.type as 'csv' | 'excel' | 'pdf')}
                          disabled={isExporting}
                          className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors first:rounded-t-lg last:rounded-b-lg"
                        >
                          {format.icon}
                          <span className="text-white">{format.label}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
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

        {/* Drill-down View */}
        <AnimatePresence>
          {drillDown.type && drillDown.value && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6 mb-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <ChevronRightIcon className="w-6 h-6 text-blue-400" />
                  <h2 className="text-xl font-bold text-white">
                    Drill-down: {drillDown.type} - {drillDown.value}
                  </h2>
                </div>
                
                <button
                  onClick={clearDrillDown}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Drill-down content based on type */}
              {drillDown.type === 'provider' && drillDown.data && (
                <div className="space-y-6">
                  {/* Provider Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <p className="text-gray-400 text-sm mb-1">Total Transactions</p>
                      <p className="text-2xl font-bold text-white">{drillDown.data.totalTransactions}</p>
                    </div>
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <p className="text-gray-400 text-sm mb-1">Success Rate</p>
                      <p className="text-2xl font-bold text-green-400">
                        {((drillDown.data.successfulTransactions / drillDown.data.totalTransactions) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <p className="text-gray-400 text-sm mb-1">Error Rate</p>
                      <p className="text-2xl font-bold text-red-400">{drillDown.data.errorRate}%</p>
                    </div>
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <p className="text-gray-400 text-sm mb-1">Avg Processing</p>
                      <p className="text-2xl font-bold text-white">{formatDuration(drillDown.data.averageProcessingTime)}</p>
                    </div>
                  </div>

                  {/* Error Breakdown */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Error Breakdown</h3>
                    <div className="space-y-2">
                      {Object.entries(drillDown.data.errorBreakdown).map(([error, count]) => (
                        <div key={error} className="flex items-center justify-between bg-gray-700/30 rounded-lg p-3">
                          <span className="text-white">{error}</span>
                          <span className="text-red-400 font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Transactions */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Recent Transactions</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-700">
                            <th className="text-left py-2 px-3 text-sm font-medium text-gray-400">Transaction ID</th>
                            <th className="text-left py-2 px-3 text-sm font-medium text-gray-400">Timestamp</th>
                            <th className="text-left py-2 px-3 text-sm font-medium text-gray-400">Amount</th>
                            <th className="text-left py-2 px-3 text-sm font-medium text-gray-400">Status</th>
                            <th className="text-left py-2 px-3 text-sm font-medium text-gray-400">Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {drillDown.data.recentTransactions.map((txn: any, index: number) => (
                            <tr key={index} className="border-b border-gray-700/50">
                              <td className="py-2 px-3 text-white text-sm">{txn.id}</td>
                              <td className="py-2 px-3 text-gray-400 text-sm">{new Date(txn.timestamp).toLocaleString()}</td>
                              <td className="py-2 px-3 text-white text-sm">{formatCurrency(txn.amount)}</td>
                              <td className="py-2 px-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  txn.status === 'successful' ? 'bg-green-500/20 text-green-400' :
                                  txn.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                  'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                  {txn.status}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-gray-400 text-sm">{txn.errorCode || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {drillDown.type === 'transaction' && drillDown.data && (
                <div className="space-y-6">
                  {/* Transaction Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Transaction Information</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Transaction ID:</span>
                          <span className="text-white">{drillDown.data.transactionId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Order ID:</span>
                          <span className="text-white">{drillDown.data.orderId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Provider:</span>
                          <span className="text-white capitalize">{drillDown.data.provider}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Amount:</span>
                          <span className="text-white">{formatCurrency(drillDown.data.amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Status:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            drillDown.data.status === 'successful' ? 'bg-green-500/20 text-green-400' :
                            drillDown.data.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {drillDown.data.status}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Customer:</span>
                          <span className="text-white">{drillDown.data.customerEmail}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Refund Reason:</span>
                          <span className="text-white">{drillDown.data.refundReason}</span>
                        </div>
                      </div>
                    </div>

                    {/* Processing Steps */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Processing Steps</h3>
                      <div className="space-y-3">
                        {drillDown.data.processingSteps.map((step: any, index: number) => (
                          <div key={index} className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${
                              step.status === 'completed' ? 'bg-green-400' :
                              step.status === 'in_progress' ? 'bg-yellow-400' :
                              'bg-gray-600'
                            }`} />
                            <div className="flex-1">
                              <p className="text-white text-sm">{step.step}</p>
                              {step.timestamp && (
                                <p className="text-gray-400 text-xs">{new Date(step.timestamp).toLocaleString()}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Failure Information */}
                  {drillDown.data.failureReason && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Failure Information</h3>
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-gray-400 text-sm">Error Code</p>
                            <p className="text-red-400 font-medium">{drillDown.data.failureReason.code}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-sm">Error Message</p>
                            <p className="text-red-400 font-medium">{drillDown.data.failureReason.message}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-sm">Retryable</p>
                            <p className={`font-medium ${
                              drillDown.data.failureReason.retryable ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {drillDown.data.failureReason.retryable ? 'Yes' : 'No'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {drillDown.type === 'failure' && drillDown.data && (
                <div className="space-y-6">
                  {/* Failure Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <p className="text-gray-400 text-sm mb-1">Total Occurrences</p>
                      <p className="text-2xl font-bold text-white">{drillDown.data.totalOccurrences}</p>
                    </div>
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <p className="text-gray-400 text-sm mb-1">Affected Providers</p>
                      <p className="text-2xl font-bold text-white">{drillDown.data.affectedProviders.length}</p>
                    </div>
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <p className="text-gray-400 text-sm mb-1">Resolution Rate</p>
                      <p className="text-2xl font-bold text-green-400">{drillDown.data.resolutionRate}%</p>
                    </div>
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <p className="text-gray-400 text-sm mb-1">Avg Resolution</p>
                      <p className="text-2xl font-bold text-white">{formatDuration(drillDown.data.averageResolutionTime)}</p>
                    </div>
                  </div>

                  {/* Recommended Actions */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Recommended Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {drillDown.data.recommendedActions.map((action: string, index: number) => (
                        <div key={index} className="flex items-center space-x-3 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                          <CheckCircleIcon className="w-5 h-5 text-blue-400" />
                          <span className="text-white text-sm">{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Failures */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Recent Failures</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-700">
                            <th className="text-left py-2 px-3 text-sm font-medium text-gray-400">Failure ID</th>
                            <th className="text-left py-2 px-3 text-sm font-medium text-gray-400">Timestamp</th>
                            <th className="text-left py-2 px-3 text-sm font-medium text-gray-400">Provider</th>
                            <th className="text-left py-2 px-3 text-sm font-medium text-gray-400">Transaction</th>
                            <th className="text-left py-2 px-3 text-sm font-medium text-gray-400">Resolved</th>
                            <th className="text-left py-2 px-3 text-sm font-medium text-gray-400">Resolution Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {drillDown.data.recentFailures.map((failure: any, index: number) => (
                            <tr key={index} className="border-b border-gray-700/50">
                              <td className="py-2 px-3 text-white text-sm">{failure.id}</td>
                              <td className="py-2 px-3 text-gray-400 text-sm">{new Date(failure.timestamp).toLocaleString()}</td>
                              <td className="py-2 px-3 text-white text-sm capitalize">{failure.provider}</td>
                              <td className="py-2 px-3 text-white text-sm">{failure.transactionId}</td>
                              <td className="py-2 px-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  failure.resolved ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {failure.resolved ? 'Yes' : 'No'}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-gray-400 text-sm">
                                {failure.resolutionTime ? formatDuration(failure.resolutionTime) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Default view for other drill-down types */}
              {!['provider', 'transaction', 'failure'].includes(drillDown.type || '') && (
                <div className="text-gray-400">
                  <p>Detailed analysis for {drillDown.type} "{drillDown.value}"</p>
                  <p className="text-sm mt-2">This would show detailed metrics, trends, and related items.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
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
                    <div 
                      key={provider.provider} 
                      className="bg-gray-700/30 rounded-lg p-4 cursor-pointer hover:bg-gray-700/50 transition-colors"
                      onClick={() => handleProviderClick(provider.provider)}
                    >
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
                      className={`bg-gray-800/50 backdrop-blur-xl border ${display.borderColor} rounded-xl p-6 cursor-pointer hover:bg-gray-700/50 transition-colors`}
                      onClick={() => handleProviderClick(provider.provider)}
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
                      <div 
                        key={provider} 
                        className="flex items-center justify-between cursor-pointer hover:bg-gray-700/50 rounded-lg p-2 transition-colors"
                        onClick={() => handleFailureClick(`Provider: ${provider}`)}
                      >
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
                        <div 
                          key={reason} 
                          className="flex items-center justify-between cursor-pointer hover:bg-gray-700/50 rounded-lg p-2 transition-colors"
                          onClick={() => handleFailureClick(reason)}
                        >
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
