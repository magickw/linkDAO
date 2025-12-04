import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DocumentTextIcon,
  CalendarIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  Cog6ToothIcon,
  PlusIcon,
  EyeIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { riskManagementService, RiskReport } from '../../../services/riskManagementService';

interface ReportFilters {
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  dateRange: {
    start: string;
    end: string;
  };
  status: 'all' | 'completed' | 'scheduled';
  searchQuery: string;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  sections: string[];
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    enabled: boolean;
  };
  recipients: string[];
}

const REPORT_TYPES = [
  { value: 'daily', label: 'Daily Report', description: 'Daily risk summary and metrics' },
  { value: 'weekly', label: 'Weekly Report', description: 'Weekly risk analysis and trends' },
  { value: 'monthly', label: 'Monthly Report', description: 'Monthly risk assessment and compliance' },
  { value: 'custom', label: 'Custom Report', description: 'Custom date range report' }
];

const EXPORT_FORMATS = [
  { value: 'csv', label: 'CSV', icon: DocumentArrowDownIcon },
  { value: 'excel', label: 'Excel', icon: DocumentArrowDownIcon },
  { value: 'pdf', label: 'PDF', icon: DocumentArrowDownIcon }
];

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export const RiskReporting: React.FC = () => {
  // State management
  const [reports, setReports] = useState<RiskReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<RiskReport | null>(null);
  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'reports' | 'generate' | 'templates' | 'schedule'>('reports');

  // Filter state
  const [filters, setFilters] = useState<ReportFilters>({
    type: 'weekly',
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
    },
    status: 'all',
    searchQuery: ''
  });

  // UI state
  const [showFilters, setShowFilters] = useState(true);
  const [showReportDetails, setShowReportDetails] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [generateConfig, setGenerateConfig] = useState({
    title: '',
    type: 'weekly' as 'daily' | 'weekly' | 'monthly' | 'custom',
    period: {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    includeRecommendations: true
  });

  // Load data
  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [reportsData] = await Promise.all([
        riskManagementService.getRiskReports({
          type: filters.type !== 'custom' ? filters.type : undefined,
          period: filters.type === 'custom' ? filters.dateRange : undefined,
          limit: 50
        })
      ]);

      setReports(reportsData.reports);

      // Mock report templates - in real implementation, this would come from the API
      setReportTemplates([
        {
          id: 'template1',
          name: 'Daily Risk Summary',
          description: 'Comprehensive daily risk metrics and alerts summary',
          type: 'daily',
          sections: ['overview', 'metrics', 'alerts', 'trends', 'recommendations'],
          schedule: {
            frequency: 'daily',
            time: '09:00',
            enabled: true
          },
          recipients: ['admin@company.com', 'risk-team@company.com']
        },
        {
          id: 'template2',
          name: 'Weekly Risk Analysis',
          description: 'Detailed weekly risk analysis with trend identification',
          type: 'weekly',
          sections: ['executive_summary', 'risk_metrics', 'trend_analysis', 'top_risks', 'team_performance', 'recommendations'],
          schedule: {
            frequency: 'weekly',
            time: '10:00',
            enabled: true
          },
          recipients: ['admin@company.com', 'risk-team@company.com', 'compliance@company.com']
        },
        {
          id: 'template3',
          name: 'Monthly Compliance Report',
          description: 'Monthly compliance and regulatory risk assessment',
          type: 'monthly',
          sections: ['compliance_overview', 'risk_assessment', 'regulatory_metrics', 'audit_findings', 'action_items'],
          schedule: {
            frequency: 'monthly',
            time: '08:00',
            enabled: true
          },
          recipients: ['admin@company.com', 'compliance@company.com', 'legal@company.com']
        }
      ]);
    } catch (err) {
      console.error('Error loading report data:', err);
      setError('Failed to load report data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      const report = await riskManagementService.generateRiskReport({
        title: generateConfig.title || `${generateConfig.type.charAt(0).toUpperCase() + generateConfig.type.slice(1)} Risk Report`,
        type: generateConfig.type,
        period: generateConfig.period,
        includeRecommendations: generateConfig.includeRecommendations
      });

      setReports(prev => [report, ...prev]);
      setShowGenerateModal(false);
      setSelectedReport(report);
      setShowReportDetails(true);
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportReport = async (reportId: string, format: 'csv' | 'excel' | 'pdf') => {
    try {
      setError(null);

      const blob = await riskManagementService.exportRiskData({
        format,
        type: 'reports',
        filters: { reportIds: [reportId] }
      });

      // Download file
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `risk-report-${reportId}-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting report:', err);
      setError('Failed to export report');
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'daily': return <CalendarIcon className="w-5 h-5 text-blue-500" />;
      case 'weekly': return <ChartBarIcon className="w-5 h-5 text-green-500" />;
      case 'monthly': return <DocumentTextIcon className="w-5 h-5 text-purple-500" />;
      case 'custom': return <Cog6ToothIcon className="w-5 h-5 text-gray-500" />;
      default: return <DocumentTextIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getReportTrendData = () => {
    // Mock trend data - in real implementation, this would come from the API
    return Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      totalReturns: Math.floor(Math.random() * 100) + 50,
      highRiskReturns: Math.floor(Math.random() * 20) + 5,
      averageRiskScore: Math.random() * 0.3 + 0.4
    }));
  };

  const getRiskDistributionData = () => {
    if (!selectedReport) return [];
    
    // Mock distribution data based on report metrics
    return [
      { name: 'Low Risk', value: 45, color: COLORS[0] },
      { name: 'Medium Risk', value: 30, color: COLORS[1] },
      { name: 'High Risk', value: 20, color: COLORS[2] },
      { name: 'Critical Risk', value: 5, color: COLORS[3] }
    ];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading risk reports...</p>
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
              <DocumentTextIcon className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Risk Reporting</h1>
                <p className="text-sm text-gray-500">Generate and manage risk assessment reports</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{reports.length}</div>
                <div className="text-xs text-gray-500">Total Reports</div>
              </div>
              <button
                onClick={() => setShowGenerateModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                <span className="text-sm">Generate Report</span>
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
        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'reports', label: 'Reports', icon: DocumentTextIcon },
                { key: 'generate', label: 'Generate', icon: PlusIcon },
                { key: 'templates', label: 'Templates', icon: Cog6ToothIcon },
                { key: 'schedule', label: 'Schedule', icon: ClockIcon }
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
            {/* Reports Tab */}
            {activeTab === 'reports' && (
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
                          <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                          <select
                            value={filters.type}
                            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as any }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            {REPORT_TYPES.map(type => (
                              <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                          <select
                            value={filters.status}
                            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="all">All Reports</option>
                            <option value="completed">Completed</option>
                            <option value="scheduled">Scheduled</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                          <div className="flex space-x-2">
                            <input
                              type="date"
                              value={filters.dateRange.start}
                              onChange={(e) => setFilters(prev => ({ 
                                ...prev, 
                                dateRange: { ...prev.dateRange, start: e.target.value }
                              }))}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-gray-500 self-center">to</span>
                            <input
                              type="date"
                              value={filters.dateRange.end}
                              onChange={(e) => setFilters(prev => ({ 
                                ...prev, 
                                dateRange: { ...prev.dateRange, end: e.target.value }
                              }))}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                          <div className="relative">
                            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              value={filters.searchQuery}
                              onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                              placeholder="Search reports..."
                              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Reports List */}
                <div className="space-y-3">
                  {reports.map((report) => (
                    <div key={report.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            {getReportTypeIcon(report.type)}
                            <h4 className="text-sm font-medium text-gray-900">{report.title}</h4>
                            <div className="flex items-center space-x-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {report.type.toUpperCase()}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDate(report.period.start)} - {formatDate(report.period.end)}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">
                            {report.recommendations.length > 0 && (
                              <span>Includes {report.recommendations.length} recommendations</span>
                            )}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>Generated: {formatDateTime(report.generatedAt)}</span>
                            <span>By: {report.generatedBy}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedReport(report);
                              setShowReportDetails(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            <EyeIcon className="w-4 h-4 mr-1" />
                            View
                          </button>
                          <div className="relative">
                            <button
                              onClick={() => setShowExportMenu(showExportMenu === report.id ? null : report.id)}
                              className="text-green-600 hover:text-green-800 text-sm font-medium"
                            >
                              <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
                              Export
                            </button>
                            <AnimatePresence>
                              {showExportMenu === report.id && (
                                <motion.div
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10"
                                >
                                  {EXPORT_FORMATS.map((format) => (
                                    <button
                                      key={format.value}
                                      onClick={() => handleExportReport(report.id, format.value as any)}
                                      className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                                    >
                                      <format.icon className="w-5 h-5 text-gray-400" />
                                      <span className="text-white">{format.label}</span>
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generate Tab */}
            {activeTab === 'generate' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Generate New Report</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Report Title</label>
                      <input
                        type="text"
                        value={generateConfig.title}
                        onChange={(e) => setGenerateConfig(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Enter report title..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                      <select
                        value={generateConfig.type}
                        onChange={(e) => setGenerateConfig(prev => ({ ...prev, type: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {REPORT_TYPES.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>

                    {generateConfig.type === 'custom' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                        <div className="flex space-x-2">
                          <input
                            type="date"
                            value={generateConfig.period.start}
                            onChange={(e) => setGenerateConfig(prev => ({ 
                              ...prev, 
                              period: { ...prev.period, start: e.target.value }
                            }))}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-gray-500 self-center">to</span>
                          <input
                            type="date"
                            value={generateConfig.period.end}
                            onChange={(e) => setGenerateConfig(prev => ({ 
                              ...prev, 
                              period: { ...prev.period, end: e.target.value }
                            }))}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="includeRecommendations"
                          checked={generateConfig.includeRecommendations}
                          onChange={(e) => setGenerateConfig(prev => ({ ...prev, includeRecommendations: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Include recommendations
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowGenerateModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleGenerateReport}
                      disabled={!generateConfig.title.trim() || isGenerating}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isGenerating ? 'Generating...' : 'Generate Report'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Templates Tab */}
            {activeTab === 'templates' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Report Templates</h3>
                  <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                    <PlusIcon className="w-4 h-4" />
                    <span className="text-sm">Create Template</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reportTemplates.map((template) => (
                    <div key={template.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-start space-x-3">
                        {getReportTypeIcon(template.type)}
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900">{template.name}</h4>
                          <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>Type: {template.type}</span>
                            <span>Sections: {template.sections.length}</span>
                            {template.schedule && (
                              <span>
                                Scheduled: {template.schedule.frequency} at {template.schedule.time}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Schedule Tab */}
            {activeTab === 'schedule' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Scheduled Reports</h3>
                  
                  <div className="space-y-4">
                    {reportTemplates.filter(template => template.schedule?.enabled).map((template) => (
                      <div key={template.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">{template.name}</h4>
                            <p className="text-sm text-gray-600">
                              {template.schedule?.frequency} at {template.schedule?.time}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <ClockIcon className="w-3 h-3 mr-1" />
                              Active
                            </span>
                            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                              Configure
                            </button>
                          </div>
                        </div>
                        
                        <div className="mt-3 text-xs text-gray-500">
                          Recipients: {template.recipients.join(', ')}
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

      {/* Report Details Modal */}
      <AnimatePresence>
        {showReportDetails && selectedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowReportDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Report Details</h3>
                  <button
                    onClick={() => setShowReportDetails(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-6">
                  {/* Report Header */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">{selectedReport.title}</h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Type: {selectedReport.type}</span>
                      <span>Period: {formatDate(selectedReport.period.start)} - {formatDate(selectedReport.period.end)}</span>
                      <span>Generated: {formatDateTime(selectedReport.generatedAt)}</span>
                      <span>By: {selectedReport.generatedBy}</span>
                    </div>
                  </div>

                  {/* Risk Metrics */}
                  <div>
                    <h5 className="text-md font-medium text-gray-900 mb-4">Risk Metrics</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <dt className="text-sm font-medium text-gray-600">Total Returns</dt>
                        <dd className="text-2xl font-bold text-gray-900">{selectedReport.metrics.totalReturns}</dd>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <dt className="text-sm font-medium text-gray-600">High Risk Returns</dt>
                        <dd className="text-2xl font-bold text-red-600">{selectedReport.metrics.highRiskReturns}</dd>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <dt className="text-sm font-medium text-gray-600">Average Risk Score</dt>
                        <dd className="text-2xl font-bold text-yellow-600">{selectedReport.metrics.averageRiskScore.toFixed(2)}</dd>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <dt className="text-sm font-medium text-gray-600">Flagged for Review</dt>
                        <dd className="text-2xl font-bold text-orange-600">{selectedReport.metrics.flaggedForReview}</dd>
                      </div>
                    </div>
                  </div>

                  {/* Risk Distribution Chart */}
                  <div>
                    <h5 className="text-md font-medium text-gray-900 mb-4">Risk Distribution</h5>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={getRiskDistributionData()}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {getRiskDistributionData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Top Risk Factors */}
                  <div>
                    <h5 className="text-md font-medium text-gray-900 mb-4">Top Risk Factors</h5>
                    <div className="space-y-2">
                      {selectedReport.topRiskFactors.map((factor, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900">{factor.factor}</span>
                            <span className="text-sm text-gray-600">{factor.count} occurrences</span>
                          </div>
                          <div className="mt-1">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="h-2 bg-orange-500 rounded-full"
                                style={{ width: `${(factor.averageImpact / 100) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Risk Trends */}
                  <div>
                    <h5 className="text-md font-medium text-gray-900 mb-4">Risk Trends</h5>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={getReportTrendData()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip />
                          <Legend />
                          <Line yAxisId="left" type="monotone" dataKey="totalReturns" stroke="#3B82F6" strokeWidth={2} />
                          <Line yAxisId="left" type="monotone" dataKey="highRiskReturns" stroke="#EF4444" strokeWidth={2} />
                          <Line yAxisId="right" type="monotone" dataKey="averageRiskScore" stroke="#F59E0B" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Recommendations */}
                  {selectedReport.recommendations.length > 0 && (
                    <div>
                      <h5 className="text-md font-medium text-gray-900 mb-4">Recommendations</h5>
                      <div className="space-y-2">
                        {selectedReport.recommendations.map((recommendation, index) => (
                          <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start space-x-3">
                              <InformationCircleIcon className="w-5 h-5 text-blue-400 mt-0.5" />
                              <div>
                                <p className="text-sm text-blue-800">{recommendation}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowReportDetails(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowExportMenu(selectedReport.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                      Export Report
                    </button>
                    <AnimatePresence>
                      {showExportMenu === selectedReport.id && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10"
                        >
                          {EXPORT_FORMATS.map((format) => (
                            <button
                              key={format.value}
                              onClick={() => handleExportReport(selectedReport.id, format.value as any)}
                              className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                            >
                              <format.icon className="w-5 h-5 text-gray-400" />
                              <span className="text-gray-900">{format.label}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generate Report Modal */}
      <AnimatePresence>
        {showGenerateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowGenerateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full m-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Generate Report</h3>
                  <button
                    onClick={() => setShowGenerateModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                {/* Generate form content would go here */}
                <div className="text-center py-8">
                  <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Report generation form</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};