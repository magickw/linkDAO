import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BellIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarIcon,
  UserIcon,
  Cog6ToothIcon,
  InformationCircleIcon,
  ClockIcon,
  UserGroupIcon,
  ChartBarIcon,
  BellAlertIcon,
  ShieldCheckIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { riskManagementService, RiskAlert } from '../../../services/riskManagementService';

interface AlertConfiguration {
  id: string;
  name: string;
  description: string;
  type: 'threshold_breach' | 'pattern_detected' | 'unusual_activity' | 'system_anomaly';
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  condition: string;
  threshold: number;
  recipients: string[];
  channels: ('email' | 'sms' | 'in_app' | 'webhook')[];
  escalationRules: Array<{
    condition: string;
    action: string;
    delay: number;
    enabled: boolean;
  }>;
}

interface AlertMetrics {
  totalAlerts: number;
  activeAlerts: number;
  acknowledgedAlerts: number;
  resolvedAlerts: number;
  falsePositives: number;
  averageResolutionTime: number;
  alertTrends: Array<{
    date: string;
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }>;
  typeDistribution: Record<string, number>;
  severityDistribution: Record<string, number>;
}

interface AlertManagementProps {
  onAlertAction?: (alertId: string, action: string) => void;
}

const ALERT_TYPES = [
  { value: 'threshold_breach', label: 'Threshold Breach', description: 'Risk score exceeds defined threshold' },
  { value: 'pattern_detected', label: 'Pattern Detected', description: 'Suspicious behavioral patterns identified' },
  { value: 'unusual_activity', label: 'Unusual Activity', description: 'Anomalous user or system activity' },
  { value: 'system_anomaly', label: 'System Anomaly', description: 'System performance or availability issues' }
];

const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low', color: '#10B981' },
  { value: 'medium', label: 'Medium', color: '#F59E0B' },
  { value: 'high', label: 'High', color: '#EF4444' },
  { value: 'critical', label: 'Critical', color: '#DC2626' }
];

const NOTIFICATION_CHANNELS = [
  { value: 'email', label: 'Email', icon: EnvelopeIcon },
  { value: 'sms', label: 'SMS', icon: PhoneIcon },
  { value: 'in_app', label: 'In-App', icon: BellIcon },
  { value: 'webhook', label: 'Webhook', icon: DocumentTextIcon }
];

const TEAM_MEMBERS = [
  { id: 'user1', name: 'John Smith', email: 'john.smith@company.com', role: 'Security Analyst' },
  { id: 'user2', name: 'Sarah Johnson', email: 'sarah.johnson@company.com', role: 'Risk Manager' },
  { id: 'user3', name: 'Michael Chen', email: 'michael.chen@company.com', role: 'Compliance Officer' },
  { id: 'user4', name: 'Emily Davis', email: 'emily.davis@company.com', role: 'Security Lead' },
];

export const AlertManagement: React.FC<AlertManagementProps> = ({
  onAlertAction
}) => {
  // State management
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [alertMetrics, setAlertMetrics] = useState<AlertMetrics | null>(null);
  const [alertConfigurations, setAlertConfigurations] = useState<AlertConfiguration[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<RiskAlert | null>(null);
  const [selectedConfiguration, setSelectedConfiguration] = useState<AlertConfiguration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'alerts' | 'configuration' | 'analytics' | 'routing'>('alerts');

  // Filter state
  const [filters, setFilters] = useState({
    type: '',
    severity: '',
    status: '',
    searchQuery: ''
  });

  // UI state
  const [showFilters, setShowFilters] = useState(true);
  const [showAlertDetails, setShowAlertDetails] = useState(false);
  const [showConfigDetails, setShowConfigDetails] = useState(false);
  const [showCreateConfig, setShowCreateConfig] = useState(false);

  // Load data
  useEffect(() => {
    loadAlertData();
  }, []);

  const loadAlertData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [alertsData] = await Promise.all([
        riskManagementService.getRiskAlerts({
          limit: 100,
        })
      ]);

      setAlerts(alertsData.alerts);

      // Mock metrics and configurations - in real implementation, these would come from the API
      setAlertMetrics({
        totalAlerts: alertsData.alerts.length,
        activeAlerts: alertsData.alerts.filter(a => a.status === 'active').length,
        acknowledgedAlerts: alertsData.alerts.filter(a => a.status === 'acknowledged').length,
        resolvedAlerts: alertsData.alerts.filter(a => a.status === 'resolved').length,
        falsePositives: Math.floor(alertsData.alerts.length * 0.1),
        averageResolutionTime: 45, // minutes
        alertTrends: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          total: Math.floor(Math.random() * 20) + 5,
          critical: Math.floor(Math.random() * 5) + 1,
          high: Math.floor(Math.random() * 8) + 2,
          medium: Math.floor(Math.random() * 10) + 3,
          low: Math.floor(Math.random() * 5) + 1
        })),
        typeDistribution: {
          threshold_breach: alertsData.alerts.filter(a => a.type === 'threshold_breach').length,
          pattern_detected: alertsData.alerts.filter(a => a.type === 'pattern_detected').length,
          unusual_activity: alertsData.alerts.filter(a => a.type === 'unusual_activity').length,
          system_anomaly: alertsData.alerts.filter(a => a.type === 'system_anomaly').length
        },
        severityDistribution: {
          low: alertsData.alerts.filter(a => a.severity === 'low').length,
          medium: alertsData.alerts.filter(a => a.severity === 'medium').length,
          high: alertsData.alerts.filter(a => a.severity === 'high').length,
          critical: alertsData.alerts.filter(a => a.severity === 'critical').length
        }
      });

      // Mock alert configurations
      setAlertConfigurations([
        {
          id: 'config1',
          name: 'High Risk Score Alert',
          description: 'Alert when risk score exceeds 0.8',
          type: 'threshold_breach',
          enabled: true,
          severity: 'high',
          condition: 'risk_score > 0.8',
          threshold: 0.8,
          recipients: ['user1', 'user2'],
          channels: ['email', 'in_app'],
          escalationRules: [
            { condition: 'not_acknowledged_30min', action: 'escalate_to_manager', delay: 30, enabled: true },
            { condition: 'not_resolved_2h', action: 'escalate_to_lead', delay: 120, enabled: true }
          ]
        },
        {
          id: 'config2',
          name: 'Multiple Returns Alert',
          description: 'Alert when user has multiple returns in short period',
          type: 'pattern_detected',
          enabled: true,
          severity: 'medium',
          condition: 'returns_count > 3 AND timeframe < 7d',
          threshold: 3,
          recipients: ['user1', 'user3'],
          channels: ['email', 'in_app'],
          escalationRules: [
            { condition: 'not_acknowledged_1h', action: 'send_sms_reminder', delay: 60, enabled: true }
          ]
        },
        {
          id: 'config3',
          name: 'System Performance Alert',
          description: 'Alert when system performance degrades',
          type: 'system_anomaly',
          enabled: false,
          severity: 'critical',
          condition: 'response_time > 5000ms OR error_rate > 5%',
          threshold: 5000,
          recipients: ['user4'],
          channels: ['email', 'sms', 'webhook'],
          escalationRules: [
            { condition: 'not_resolved_15min', action: 'page_on_call', delay: 15, enabled: true }
          ]
        }
      ]);
    } catch (err) {
      console.error('Error loading alert data:', err);
      setError('Failed to load alert data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAlertAction = async (alertId: string, action: 'acknowledge' | 'resolve' | 'false_positive') => {
    try {
      setIsLoading(true);
      setError(null);

      if (action === 'acknowledge') {
        await riskManagementService.acknowledgeAlert(alertId);
      } else if (action === 'resolve') {
        await riskManagementService.resolveAlert(alertId, 'Manual resolution', 'Resolved by admin');
      }

      onAlertAction?.(alertId, action);
      await loadAlertData();
      setShowAlertDetails(false);
    } catch (err) {
      console.error('Error performing alert action:', err);
      setError('Failed to perform alert action');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigurationToggle = async (configId: string, enabled: boolean) => {
    try {
      setIsLoading(true);
      setError(null);

      // Mock configuration update - in real implementation, this would call the API
      setAlertConfigurations(prev => 
        prev.map(config => 
          config.id === configId ? { ...config, enabled } : config
        )
      );
    } catch (err) {
      console.error('Error updating configuration:', err);
      setError('Failed to update configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'low': return <BellIcon className="w-5 h-5 text-green-500" />;
      case 'medium': return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'high': return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      case 'critical': return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
      default: return <BellIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800 border-green-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      high: 'bg-red-100 text-red-800 border-red-300',
      critical: 'bg-red-200 text-red-900 border-red-400'
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${colors[severity as keyof typeof colors] || colors.medium}`}>
        {severity.toUpperCase()}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-red-100 text-red-800 border-red-300',
      acknowledged: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      resolved: 'bg-green-100 text-green-800 border-green-300',
      false_positive: 'bg-gray-100 text-gray-800 border-gray-300'
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${colors[status as keyof typeof colors] || colors.active}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAlertTrendData = () => {
    if (!alertMetrics) return [];
    return alertMetrics.alertTrends;
  };

  const getAlertDistributionData = () => {
    if (!alertMetrics) return [];
    return Object.entries(alertMetrics.typeDistribution).map(([type, count]) => ({
      name: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: count
    }));
  };

  const getSeverityDistributionData = () => {
    if (!alertMetrics) return [];
    return Object.entries(alertMetrics.severityDistribution).map(([severity, count]) => ({
      name: severity.charAt(0).toUpperCase() + severity.slice(1),
      value: count,
      color: SEVERITY_LEVELS.find(s => s.value === severity)?.color || '#6B7280'
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading alert management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <BellAlertIcon className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Alert Management</h1>
                <p className="text-sm text-gray-500">Configure and manage risk alerts</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {alertMetrics && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-600">{alertMetrics.activeAlerts}</div>
                  <div className="text-xs text-gray-500">Active Alerts</div>
                </div>
              )}
              <button
                onClick={loadAlertData}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <ArrowPathIcon className="w-4 h-4" />
                <span className="text-sm">Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4"
          >
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Metrics Cards */}
        {alertMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <BellIcon className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-sm text-gray-500">Total</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{alertMetrics.totalAlerts}</div>
              <div className="text-sm text-gray-600">Total Alerts</div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-red-100 rounded-lg">
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                </div>
                <span className="text-sm text-gray-500">Active</span>
              </div>
              <div className="text-2xl font-bold text-red-600">{alertMetrics.activeAlerts}</div>
              <div className="text-sm text-gray-600">Require Attention</div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <ClockIcon className="w-6 h-6 text-yellow-600" />
                </div>
                <span className="text-sm text-gray-500">Avg Time</span>
              </div>
              <div className="text-2xl font-bold text-yellow-600">{alertMetrics.averageResolutionTime}m</div>
              <div className="text-sm text-gray-600">Resolution Time</div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-sm text-gray-500">Resolved</span>
              </div>
              <div className="text-2xl font-bold text-green-600">{alertMetrics.resolvedAlerts}</div>
              <div className="text-sm text-gray-600">Successfully Resolved</div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'alerts', label: 'Alerts', icon: BellIcon },
                { key: 'configuration', label: 'Configuration', icon: Cog6ToothIcon },
                { key: 'analytics', label: 'Analytics', icon: ChartBarIcon },
                { key: 'routing', label: 'Routing', icon: UserGroupIcon }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.key
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Alerts Tab */}
            {activeTab === 'alerts' && (
              <div className="space-y-4">
                {/* Filters */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-gray-50 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <FunnelIcon className="w-5 h-5 text-gray-400" />
                          <span className="text-sm font-medium text-gray-700">Filters</span>
                        </div>
                        <button
                          onClick={() => setShowFilters(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                          <select
                            value={filters.type}
                            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">All Types</option>
                            {ALERT_TYPES.map(type => (
                              <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                          <select
                            value={filters.severity}
                            onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">All Severities</option>
                            {SEVERITY_LEVELS.map(level => (
                              <option key={level.value} value={level.value}>{level.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                          <select
                            value={filters.status}
                            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="acknowledged">Acknowledged</option>
                            <option value="resolved">Resolved</option>
                            <option value="false_positive">False Positive</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                          <div className="relative">
                            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              value={filters.searchQuery}
                              onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                              placeholder="Search alerts..."
                              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Alerts List */}
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            {getSeverityIcon(alert.severity)}
                            <h4 className="text-sm font-medium text-gray-900">{alert.title}</h4>
                            <div className="flex items-center space-x-2">
                              {getSeverityBadge(alert.severity)}
                              {getStatusBadge(alert.status)}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{alert.description}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>Type: {alert.type.replace('_', ' ')}</span>
                            <span>Triggered: {formatDate(alert.triggeredAt)}</span>
                            {alert.acknowledgedAt && (
                              <span>Acknowledged: {formatDate(alert.acknowledgedAt)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => {
                              setSelectedAlert(alert);
                              setShowAlertDetails(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            View
                          </button>
                          {alert.status === 'active' && (
                            <button
                              onClick={() => handleAlertAction(alert.id, 'acknowledge')}
                              className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
                            >
                              Acknowledge
                            </button>
                          )}
                          {(alert.status === 'active' || alert.status === 'acknowledged') && (
                            <button
                              onClick={() => handleAlertAction(alert.id, 'resolve')}
                              className="text-green-600 hover:text-green-800 text-sm font-medium"
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Configuration Tab */}
            {activeTab === 'configuration' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Alert Configurations</h3>
                  <button
                    onClick={() => setShowCreateConfig(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <span className="text-sm">Create New Alert</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {alertConfigurations.map((config) => (
                    <div key={config.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="text-sm font-medium text-gray-900">{config.name}</h4>
                            <div className="flex items-center space-x-2">
                              {getSeverityBadge(config.severity)}
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                config.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {config.enabled ? 'Enabled' : 'Disabled'}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{config.description}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>Type: {config.type.replace('_', ' ')}</span>
                            <span>Threshold: {config.threshold}</span>
                            <span>Recipients: {config.recipients.length}</span>
                            <span>Channels: {config.channels.join(', ')}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedConfiguration(config);
                              setShowConfigDetails(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleConfigurationToggle(config.id, !config.enabled)}
                            className={`text-sm font-medium ${
                              config.enabled ? 'text-yellow-600 hover:text-yellow-800' : 'text-green-600 hover:text-green-800'
                            }`}
                          >
                            {config.enabled ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && alertMetrics && (
              <div className="space-y-6">
                {/* Alert Trends */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Alert Trends</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={getAlertTrendData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="total" stroke="#3B82F6" strokeWidth={2} />
                        <Line type="monotone" dataKey="critical" stroke="#DC2626" strokeWidth={2} />
                        <Line type="monotone" dataKey="high" stroke="#EF4444" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Distribution Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Alert Type Distribution</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={getAlertDistributionData()}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {getAlertDistributionData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={`hsl(${index * 60}, 70%, 50%)`} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Severity Distribution</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getSeverityDistributionData()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#3B82F6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Resolution Rate</h4>
                    <div className="text-2xl font-bold text-green-600">
                      {alertMetrics.totalAlerts > 0 
                        ? ((alertMetrics.resolvedAlerts / alertMetrics.totalAlerts) * 100).toFixed(1)
                        : 0}%
                    </div>
                    <div className="text-xs text-gray-500">Successfully resolved</div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">False Positive Rate</h4>
                    <div className="text-2xl font-bold text-yellow-600">
                      {alertMetrics.totalAlerts > 0 
                        ? ((alertMetrics.falsePositives / alertMetrics.totalAlerts) * 100).toFixed(1)
                        : 0}%
                    </div>
                    <div className="text-xs text-gray-500">Need review</div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Average Resolution</h4>
                    <div className="text-2xl font-bold text-blue-600">
                      {alertMetrics.averageResolutionTime}m
                    </div>
                    <div className="text-xs text-gray-500">Time to resolve</div>
                  </div>
                </div>
              </div>
            )}

            {/* Routing Tab */}
            {activeTab === 'routing' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Alert Routing Rules</h3>
                  <div className="space-y-4">
                    {alertConfigurations.map((config) => (
                      <div key={config.id} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-gray-900">{config.name}</h4>
                          {getSeverityBadge(config.severity)}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Condition:</span> {config.condition}
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Recipients:</span> {config.recipients.map(id => 
                              TEAM_MEMBERS.find(m => m.id === id)?.name || id
                            ).join(', ')}
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Channels:</span> {config.channels.join(', ')}
                          </div>
                        </div>

                        <div className="mt-3 border-t border-gray-200 pt-3">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Escalation Rules</h5>
                          <div className="space-y-1">
                            {config.escalationRules.map((rule, index) => (
                              <div key={index} className="flex items-center justify-between text-xs">
                                <span className="text-gray-600">
                                  {rule.condition} → {rule.action} ({rule.delay}min)
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  rule.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {rule.enabled ? 'Active' : 'Disabled'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Team Members */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Team Members</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {TEAM_MEMBERS.map((member) => (
                      <div key={member.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                            <span className="text-sm text-gray-600">{member.name.charAt(0)}</span>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">{member.name}</h4>
                            <p className="text-xs text-gray-500">{member.role}</p>
                          </div>
                        </div>
                        <div className="text-xs text-gray-600">
                          <p>{member.email}</p>
                          <p>Available for alerts</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alert Details Modal */}
      <AnimatePresence>
        {showAlertDetails && selectedAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowAlertDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Alert Details</h3>
                  <button
                    onClick={() => setShowAlertDetails(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">{selectedAlert.title}</h4>
                    <p className="text-sm text-gray-600">{selectedAlert.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm text-gray-600">Type:</dt>
                      <dd className="text-sm text-gray-900">{selectedAlert.type.replace('_', ' ')}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">Severity:</dt>
                      <dd>{getSeverityBadge(selectedAlert.severity)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">Status:</dt>
                      <dd>{getStatusBadge(selectedAlert.status)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">Triggered:</dt>
                      <dd className="text-sm text-gray-900">{formatDate(selectedAlert.triggeredAt)}</dd>
                    </div>
                  </div>
                  
                  {/* Affected Entities */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Affected Entities</h5>
                    <div className="space-y-2">
                      {selectedAlert.affectedEntities.map((entity, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-900 capitalize">{entity.type}: {entity.name}</span>
                            <span className="text-xs text-gray-500">{entity.id}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowAlertDetails(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                  {selectedAlert.status === 'active' && (
                    <button
                      onClick={() => handleAlertAction(selectedAlert.id, 'acknowledge')}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                    >
                      Acknowledge
                    </button>
                  )}
                  {(selectedAlert.status === 'active' || selectedAlert.status === 'acknowledged') && (
                    <button
                      onClick={() => handleAlertAction(selectedAlert.id, 'resolve')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Configuration Details Modal */}
      <AnimatePresence>
        {showConfigDetails && selectedConfiguration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowConfigDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto m-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Alert Configuration</h3>
                  <button
                    onClick={() => setShowConfigDetails(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">{selectedConfiguration.name}</h4>
                    <p className="text-sm text-gray-600">{selectedConfiguration.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Type:</dt>
                      <dd className="text-sm text-gray-900">{selectedConfiguration.type.replace('_', ' ')}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Severity:</dt>
                      <dd>{getSeverityBadge(selectedConfiguration.severity)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Status:</dt>
                      <dd>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          selectedConfiguration.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedConfiguration.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Threshold:</dt>
                      <dd className="text-sm text-gray-900">{selectedConfiguration.threshold}</dd>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Condition</h5>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <code className="text-sm text-gray-900">{selectedConfiguration.condition}</code>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Notification Channels</h5>
                    <div className="flex flex-wrap gap-2">
                      {selectedConfiguration.channels.map((channel) => {
                        const ChannelIcon = NOTIFICATION_CHANNELS.find(c => c.value === channel)?.icon || BellIcon;
                        return (
                          <span key={channel} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <ChannelIcon className="w-3 h-3 mr-1" />
                            {channel.replace('_', ' ').toUpperCase()}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Recipients</h5>
                    <div className="space-y-2">
                      {selectedConfiguration.recipients.map((recipientId) => {
                        const member = TEAM_MEMBERS.find(m => m.id === recipientId);
                        return (
                          <div key={recipientId} className="flex items-center space-x-3 bg-gray-50 rounded-lg p-2">
                            <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                              <span className="text-xs text-gray-600">{member?.name.charAt(0) || '?'}</span>
                            </div>
                            <div>
                              <div className="text-sm text-gray-900">{member?.name || 'Unknown'}</div>
                              <div className="text-xs text-gray-500">{member?.email || 'No email'}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Escalation Rules</h5>
                    <div className="space-y-2">
                      {selectedConfiguration.escalationRules.map((rule, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm text-gray-900 font-medium">{rule.action}</div>
                              <div className="text-xs text-gray-600">{rule.condition}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-900">{rule.delay}min</div>
                              <div className={`text-xs ${rule.enabled ? 'text-green-600' : 'text-gray-500'}`}>
                                {rule.enabled ? 'Active' : 'Disabled'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowConfigDetails(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => handleConfigurationToggle(selectedConfiguration.id, !selectedConfiguration.enabled)}
                    className={`px-4 py-2 rounded-lg text-white ${
                      selectedConfiguration.enabled ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {selectedConfiguration.enabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};