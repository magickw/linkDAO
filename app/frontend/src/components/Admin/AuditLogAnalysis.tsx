import React, { useState, useEffect } from 'react';
import { Button } from '@/design-system/components/Button';

interface AuditLogEntry {
  id: number;
  adminId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

interface AuditSearchFilters {
  adminId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
  limit?: number;
  offset?: number;
}

interface AuditAnalytics {
  totalActions: number;
  actionsByType: Record<string, number>;
  actionsByAdmin: Record<string, number>;
  actionsByResource: Record<string, number>;
  actionsOverTime: Array<{ date: string; count: number }>;
  topAdmins: Array<{ adminId: string; actionCount: number }>;
  suspiciousActivity: Array<{
    type: 'bulk_changes' | 'off_hours' | 'unusual_ip' | 'rapid_succession';
    description: string;
    adminId: string;
    timestamp: Date;
    severity: 'low' | 'medium' | 'high';
  }>;
}

export const AuditLogAnalysis: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [analytics, setAnalytics] = useState<AuditAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'analytics' | 'compliance'>('search');
  const [searchFilters, setSearchFilters] = useState<AuditSearchFilters>({
    limit: 50,
    offset: 0
  });
  const [totalLogs, setTotalLogs] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  useEffect(() => {
    if (activeTab === 'search') {
      searchAuditLogs();
    } else if (activeTab === 'analytics') {
      fetchAnalytics();
    }
  }, [activeTab, searchFilters]);

  const searchAuditLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(searchFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          if (value instanceof Date) {
            params.append(key, value.toISOString());
          } else {
            params.append(key, value.toString());
          }
        }
      });

      const response = await fetch(`/api/admin/audit/search?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setLogs(data.data.logs);
        setTotalLogs(data.data.total);
        setHasMore(data.data.hasMore);
      }
    } catch (error) {
      console.error('Error searching audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

      const response = await fetch(
        `/api/admin/audit/analytics?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      const data = await response.json();
      
      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportLogs = async (format: 'json' | 'csv') => {
    try {
      const params = new URLSearchParams();
      Object.entries(searchFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && key !== 'limit' && key !== 'offset') {
          if (value instanceof Date) {
            params.append(key, value.toISOString());
          } else {
            params.append(key, value.toString());
          }
        }
      });
      params.append('format', format);

      const response = await fetch(`/api/admin/audit/export?${params}`);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting logs:', error);
    }
  };

  const loadMore = () => {
    setSearchFilters({
      ...searchFilters,
      offset: (searchFilters.offset || 0) + (searchFilters.limit || 50)
    });
  };

  const resetFilters = () => {
    setSearchFilters({
      limit: 50,
      offset: 0
    });
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleString();
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create': return 'text-green-600 bg-green-100';
      case 'update': return 'text-blue-600 bg-blue-100';
      case 'delete': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 px-6">
          {[
            { id: 'search', name: 'Search Logs', icon: '🔍' },
            { id: 'analytics', name: 'Analytics', icon: '📊' },
            { id: 'compliance', name: 'Compliance', icon: '📋' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {/* Search Tab */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            {/* Search Filters */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Search Filters</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Admin ID</label>
                  <input
                    type="text"
                    value={searchFilters.adminId || ''}
                    onChange={(e) => setSearchFilters({ ...searchFilters, adminId: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="admin-123"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Action</label>
                  <select
                    value={searchFilters.action || ''}
                    onChange={(e) => setSearchFilters({ ...searchFilters, action: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">All Actions</option>
                    <option value="create">Create</option>
                    <option value="update">Update</option>
                    <option value="delete">Delete</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Resource Type</label>
                  <select
                    value={searchFilters.resourceType || ''}
                    onChange={(e) => setSearchFilters({ ...searchFilters, resourceType: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">All Resources</option>
                    <option value="policy_configuration">Policy Configuration</option>
                    <option value="threshold_configuration">Threshold Configuration</option>
                    <option value="vendor_configuration">Vendor Configuration</option>
                    <option value="alert_configuration">Alert Configuration</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Date</label>
                  <input
                    type="datetime-local"
                    value={searchFilters.startDate ? searchFilters.startDate.toISOString().slice(0, 16) : ''}
                    onChange={(e) => setSearchFilters({ 
                      ...searchFilters, 
                      startDate: e.target.value ? new Date(e.target.value) : undefined 
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">End Date</label>
                  <input
                    type="datetime-local"
                    value={searchFilters.endDate ? searchFilters.endDate.toISOString().slice(0, 16) : ''}
                    onChange={(e) => setSearchFilters({ 
                      ...searchFilters, 
                      endDate: e.target.value ? new Date(e.target.value) : undefined 
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">IP Address</label>
                  <input
                    type="text"
                    value={searchFilters.ipAddress || ''}
                    onChange={(e) => setSearchFilters({ ...searchFilters, ipAddress: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="192.168.1.1"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center mt-4">
                <div className="flex space-x-2">
                  <Button onClick={searchAuditLogs} className="bg-blue-600 hover:bg-blue-700 text-white">
                    Search
                  </Button>
                  <Button onClick={resetFilters} variant="outline">
                    Reset
                  </Button>
                </div>
                <div className="flex space-x-2">
                  <Button onClick={() => exportLogs('json')} variant="outline">
                    Export JSON
                  </Button>
                  <Button onClick={() => exportLogs('csv')} variant="outline">
                    Export CSV
                  </Button>
                </div>
              </div>
            </div>

            {/* Results Summary */}
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Showing {logs.length} of {totalLogs} results
              </div>
            </div>

            {/* Audit Logs Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Admin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resource
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.adminId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{log.resourceType}</div>
                        {log.resourceId && (
                          <div className="text-sm text-gray-500">ID: {log.resourceId}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.ipAddress || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="text-center">
                <Button onClick={loadMore} variant="outline" disabled={isLoading}>
                  {isLoading ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{analytics.totalActions}</div>
                <div className="text-sm text-blue-600">Total Actions</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{analytics.topAdmins.length}</div>
                <div className="text-sm text-green-600">Active Admins</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{Object.keys(analytics.actionsByType).length}</div>
                <div className="text-sm text-yellow-600">Action Types</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{analytics.suspiciousActivity.length}</div>
                <div className="text-sm text-red-600">Suspicious Activities</div>
              </div>
            </div>

            {/* Top Admins */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-lg font-medium text-gray-900 mb-3">Top Admins (Last 7 Days)</h4>
              <div className="space-y-2">
                {analytics.topAdmins.slice(0, 5).map((admin, index) => (
                  <div key={admin.adminId} className="flex justify-between items-center">
                    <span className="text-sm text-gray-900">
                      #{index + 1} {admin.adminId}
                    </span>
                    <span className="text-sm font-medium text-gray-600">
                      {admin.actionCount} actions
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions by Type */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-lg font-medium text-gray-900 mb-3">Actions by Type</h4>
              <div className="space-y-2">
                {Object.entries(analytics.actionsByType).map(([action, count]) => (
                  <div key={action} className="flex justify-between items-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(action)}`}>
                      {action}
                    </span>
                    <span className="text-sm font-medium text-gray-600">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Suspicious Activity */}
            {analytics.suspiciousActivity.length > 0 && (
              <div className="bg-red-50 p-4 rounded-lg">
                <h4 className="text-lg font-medium text-red-900 mb-3">Suspicious Activity</h4>
                <div className="space-y-3">
                  {analytics.suspiciousActivity.map((activity, index) => (
                    <div key={index} className="bg-white p-3 rounded border border-red-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900">{activity.description}</div>
                          <div className="text-sm text-gray-500">
                            Admin: {activity.adminId} | {formatTimestamp(activity.timestamp)}
                          </div>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(activity.severity)}`}>
                          {activity.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Compliance Tab */}
        {activeTab === 'compliance' && (
          <div className="space-y-6">
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg">Compliance reporting features coming soon</div>
              <div className="text-sm text-gray-400 mt-2">
                This will include automated compliance reports, policy violation detection, and audit trails.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Audit Log Details</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                    <div className="mt-1 text-sm text-gray-900">{formatTimestamp(selectedLog.timestamp)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Admin ID</label>
                    <div className="mt-1 text-sm text-gray-900">{selectedLog.adminId}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Action</label>
                    <div className="mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(selectedLog.action)}`}>
                        {selectedLog.action}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Resource Type</label>
                    <div className="mt-1 text-sm text-gray-900">{selectedLog.resourceType}</div>
                  </div>
                  {selectedLog.resourceId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Resource ID</label>
                      <div className="mt-1 text-sm text-gray-900">{selectedLog.resourceId}</div>
                    </div>
                  )}
                  {selectedLog.ipAddress && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">IP Address</label>
                      <div className="mt-1 text-sm text-gray-900">{selectedLog.ipAddress}</div>
                    </div>
                  )}
                </div>

                {selectedLog.oldValues && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Old Values</label>
                    <pre className="mt-1 text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                      {JSON.stringify(selectedLog.oldValues, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.newValues && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">New Values</label>
                    <pre className="mt-1 text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                      {JSON.stringify(selectedLog.newValues, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.userAgent && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">User Agent</label>
                    <div className="mt-1 text-xs text-gray-600 break-all">{selectedLog.userAgent}</div>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <Button
                  onClick={() => setSelectedLog(null)}
                  variant="outline"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};