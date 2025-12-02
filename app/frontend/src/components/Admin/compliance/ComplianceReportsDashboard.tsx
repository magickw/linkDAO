/**
 * Compliance Reports Dashboard Component
 * 
 * Frontend component for generating and managing compliance reports
 * with filtering, search, and export functionality.
 */

import React, { useState, useEffect } from 'react';

interface Report {
  id: string;
  type: 'summary' | 'violation' | 'trend' | 'seller' | 'custom';
  title: string;
  description: string;
  generatedAt: Date;
  generatedBy: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  status: 'generating' | 'completed' | 'failed';
  fileUrl?: string;
  downloadCount: number;
  metadata: {
    totalSellers: number;
    totalViolations: number;
    averageComplianceScore: number;
    criticalViolations: number;
    resolvedViolations: number;
  };
}

interface ReportFilters {
  type: string;
  startDate: string;
  endDate: string;
  generatedBy: string;
  status: string;
}

interface ComplianceReportsDashboardProps {
  userId: string;
}

export const ComplianceReportsDashboard: React.FC<ComplianceReportsDashboardProps> = ({ userId }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [reportType, setReportType] = useState<'summary' | 'violation' | 'trend' | 'seller'>('summary');
  const [sellerId, setSellerId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [includeTrends, setIncludeTrends] = useState(false);
  const [includePredictions, setIncludePredictions] = useState(false);
  const [format, setFormat] = useState<'json' | 'csv' | 'pdf'>('json');
  const [filters, setFilters] = useState<ReportFilters>({
    type: 'all',
    startDate: '',
    endDate: '',
    generatedBy: '',
    status: 'all'
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Load reports on mount
  useEffect(() => {
    loadReports();
  }, []);

  // Load reports from API
  const loadReports = async () => {
    try {
      setLoading(true);
      
      // Mock API call - would be actual API call
      const mockReports: Report[] = [
        {
          id: 'R001',
          type: 'summary',
          title: 'Compliance Summary Report',
          description: 'Monthly compliance summary for all sellers',
          generatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          generatedBy: 'admin-1',
          period: {
            startDate: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
          },
          status: 'completed',
          fileUrl: '/api/compliance/reports/R001/download',
          downloadCount: 5,
          metadata: {
            totalSellers: 150,
            totalViolations: 45,
            averageComplianceScore: 85.5,
            criticalViolations: 3,
            resolvedViolations: 35
          }
        },
        {
          id: 'R002',
          type: 'violation',
          title: 'Violation Analysis Report',
          description: 'Detailed analysis of all violations in the period',
          generatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          generatedBy: 'admin-2',
          period: {
            startDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
          },
          status: 'completed',
          fileUrl: '/api/compliance/reports/R002/download',
          downloadCount: 3,
          metadata: {
            totalSellers: 25,
            totalViolations: 45,
            averageComplianceScore: 0,
            criticalViolations: 3,
            resolvedViolations: 35
          }
        },
        {
          id: 'R003',
          type: 'trend',
          title: 'Trend Analysis Report',
          description: '30-day trend analysis with predictions',
          generatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          generatedBy: 'admin-1',
          period: {
            startDate: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
          },
          status: 'completed',
          fileUrl: '/api/compliance/reports/R003/download',
          downloadCount: 8,
          metadata: {
            totalSellers: 150,
            totalViolations: 10,
            averageComplianceScore: 85.5,
            criticalViolations: 0,
            resolvedViolations: 8
          }
        },
        {
          id: 'R004',
          type: 'seller',
          title: 'Seller Report: TechStore Pro',
          description: 'Individual seller compliance report',
          generatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          generatedBy: 'admin-1',
          period: {
            startDate: new Date(Date.now() - 33 * 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
          },
          status: 'completed',
          fileUrl: '/api/compliance/reports/R004/download',
          downloadCount: 2,
          metadata: {
            totalSellers: 1,
            totalViolations: 2,
            averageComplianceScore: 92,
            criticalViolations: 0,
            resolvedViolations: 1
          }
        }
      ];

      setReports(mockReports);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate new report
  const generateReport = async () => {
    try {
      // Validate inputs
      if (!startDate || !endDate) {
        alert('Please select start and end dates');
        return;
      }

      const reportData: any = {
        startDate,
        endDate,
        generatedBy: userId,
        format
      };

      // Add type-specific options
      if (reportType === 'summary') {
        reportData.includeTrends = includeTrends;
        reportData.includePredictions = includePredictions;
      } else if (reportType === 'seller') {
        if (!sellerId) {
          alert('Please enter a seller ID');
          return;
        }
        reportData.sellerId = sellerId;
        reportData.includeHistory = true;
        reportData.includeViolations = true;
        reportData.includeMetrics = true;
      } else if (reportType === 'trend') {
        reportData.includePredictions = includePredictions;
        reportData.forecastPeriod = 30;
      }

      // Mock API call - would be actual API call
      console.log('Generating report:', reportData);
      
      // Show success message
      alert('Report generation started. You will be notified when it\'s ready.');
      
      // Close modal and reset form
      setShowGenerateModal(false);
      resetForm();
      
      // Reload reports after a delay
      setTimeout(() => {
        loadReports();
      }, 2000);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    }
  };

  // Download report
  const downloadReport = async (report: Report) => {
    try {
      if (!report.fileUrl) {
        alert('Report file not available');
        return;
      }

      // Mock download - would be actual file download
      console.log('Downloading report:', report.id);
      
      // Update download count
      setReports(prev => prev.map(r => 
        r.id === report.id 
          ? { ...r, downloadCount: r.downloadCount + 1 }
          : r
      ));
      
      alert('Report downloaded successfully');
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report. Please try again.');
    }
  };

  // Delete report
  const deleteReport = async (reportId: string) => {
    try {
      if (!confirm('Are you sure you want to delete this report?')) {
        return;
      }

      // Mock API call - would be actual API call
      console.log('Deleting report:', reportId);
      
      // Remove from local state
      setReports(prev => prev.filter(r => r.id !== reportId));
      
      alert('Report deleted successfully');
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Failed to delete report. Please try again.');
    }
  };

  // Reset form
  const resetForm = () => {
    setReportType('summary');
    setSellerId('');
    setStartDate('');
    setEndDate('');
    setIncludeTrends(false);
    setIncludePredictions(false);
    setFormat('json');
  };

  // Filter reports
  const filteredReports = reports.filter(report => {
    const matchesType = filters.type === 'all' || report.type === filters.type;
    const matchesSearch = report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         report.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filters.status === 'all' || report.status === filters.status;
    const matchesGeneratedBy = !filters.generatedBy || report.generatedBy === filters.generatedBy;
    
    return matchesType && matchesSearch && matchesStatus && matchesGeneratedBy;
  });

  // Get report type color
  const getReportTypeColor = (type: string) => {
    switch (type) {
      case 'summary': return 'text-blue-600 bg-blue-100';
      case 'violation': return 'text-red-600 bg-red-100';
      case 'trend': return 'text-green-600 bg-green-100';
      case 'seller': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'generating': return 'text-yellow-600 bg-yellow-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Compliance Reports</h1>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Generate Report
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="summary">Summary</option>
              <option value="violation">Violation</option>
              <option value="trend">Trend</option>
              <option value="seller">Seller</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="generating">Generating</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Generated By</label>
            <input
              type="text"
              value={filters.generatedBy}
              onChange={(e) => setFilters({ ...filters, generatedBy: e.target.value })}
              placeholder="Filter by user..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilters({
                  type: 'all',
                  startDate: '',
                  endDate: '',
                  generatedBy: '',
                  status: 'all'
                });
                setSearchQuery('');
              }}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Reports</h2>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-600">Loading reports...</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Report
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Generated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Downloads
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{report.title}</div>
                        <div className="text-sm text-gray-500">{report.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getReportTypeColor(report.type)}`}>
                        {report.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {report.period.startDate.toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        to {report.period.endDate.toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {report.generatedAt.toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        by {report.generatedBy}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(report.status)}`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {report.downloadCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {report.status === 'completed' && (
                          <button
                            onClick={() => downloadReport(report)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Download
                          </button>
                        )}
                        <button
                          onClick={() => deleteReport(report.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredReports.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No reports found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-2/3 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Generate Compliance Report</h3>
              <button
                onClick={() => {
                  setShowGenerateModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="summary">Compliance Summary</option>
                  <option value="violation">Violation Analysis</option>
                  <option value="trend">Trend Analysis</option>
                  <option value="seller">Seller Report</option>
                </select>
              </div>
              
              {reportType === 'seller' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seller ID</label>
                  <input
                    type="text"
                    value={sellerId}
                    onChange={(e) => setSellerId(e.target.value)}
                    placeholder="Enter seller ID..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {(reportType === 'summary' || reportType === 'trend') && (
                <div className="space-y-2">
                  {reportType === 'summary' && (
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={includeTrends}
                        onChange={(e) => setIncludeTrends(e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Include trend analysis</span>
                    </label>
                  )}
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={includePredictions}
                      onChange={(e) => setIncludePredictions(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Include predictions</span>
                  </label>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowGenerateModal(false);
                  resetForm();
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={generateReport}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Generate Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceReportsDashboard;