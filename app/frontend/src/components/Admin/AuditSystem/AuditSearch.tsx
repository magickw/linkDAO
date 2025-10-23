import React, { useState } from 'react';
import { AdminAction } from '../../../types/auth';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';

interface AuditSearchProps {
  auditActions: AdminAction[];
  loading: boolean;
}

interface SearchFilters {
  adminId?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  startDate?: string;
  endDate?: string;
}

export const AuditSearch: React.FC<AuditSearchProps> = ({ auditActions, loading }) => {
  const [filters, setFilters] = useState<SearchFilters>({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [filteredActions, setFilteredActions] = useState<AdminAction[]>(auditActions);

  const handleSearch = () => {
    let results = [...auditActions];
    
    if (filters.adminId) {
      results = results.filter(action => 
        action.adminId.toLowerCase().includes(filters.adminId!.toLowerCase()) ||
        action.adminHandle.toLowerCase().includes(filters.adminId!.toLowerCase())
      );
    }
    
    if (filters.action) {
      results = results.filter(action => 
        action.action.toLowerCase().includes(filters.action!.toLowerCase())
      );
    }
    
    if (filters.targetType) {
      results = results.filter(action => 
        action.targetType.toLowerCase().includes(filters.targetType!.toLowerCase())
      );
    }
    
    if (filters.targetId) {
      results = results.filter(action => 
        action.targetId.toLowerCase().includes(filters.targetId!.toLowerCase())
      );
    }
    
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      results = results.filter(action => 
        new Date(action.timestamp) >= startDate
      );
    }
    
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999); // End of day
      results = results.filter(action => 
        new Date(action.timestamp) <= endDate
      );
    }
    
    setFilteredActions(results);
  };

  const exportToCSV = () => {
    const headers = ['Timestamp', 'Admin ID', 'Admin Handle', 'Action', 'Target Type', 'Target ID', 'Reason'];
    const csvContent = [
      headers.join(','),
      ...filteredActions.map(action => [
        `"${action.timestamp}"`,
        `"${action.adminId}"`,
        `"${action.adminHandle}"`,
        `"${action.action}"`,
        `"${action.targetType}"`,
        `"${action.targetId}"`,
        `"${action.reason}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `audit_log_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetFilters = () => {
    setFilters({
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    });
    setFilteredActions(auditActions);
  };

  return (
    <div className="space-y-6">
      {/* Search Filters */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Search Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin ID/Handle</label>
            <Input
              type="text"
              value={filters.adminId || ''}
              onChange={(e) => setFilters({ ...filters, adminId: e.target.value })}
              placeholder="Search by admin ID or handle"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
            <Input
              type="text"
              value={filters.action || ''}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              placeholder="e.g., suspend, approve, delete"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Type</label>
            <select
              value={filters.targetType || ''}
              onChange={(e) => setFilters({ ...filters, targetType: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Types</option>
              <option value="user">User</option>
              <option value="post">Post</option>
              <option value="seller">Seller</option>
              <option value="dispute">Dispute</option>
              <option value="listing">Listing</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target ID</label>
            <Input
              type="text"
              value={filters.targetId || ''}
              onChange={(e) => setFilters({ ...filters, targetId: e.target.value })}
              placeholder="Target entity ID"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <Input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <Input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-4">
          <div className="flex space-x-2">
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
            <Button onClick={resetFilters} variant="outline">
              Reset Filters
            </Button>
          </div>
          <Button onClick={exportToCSV} variant="outline">
            Export to CSV
          </Button>
        </div>
      </div>
      
      {/* Results */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            Audit Results ({filteredActions.length} records)
          </h3>
        </div>
        
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
                  Target
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredActions.map((action) => (
                <tr key={action.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(action.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{action.adminHandle}</div>
                    <div className="text-gray-500 text-xs">{action.adminId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {action.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="font-medium">{action.targetType}</div>
                    <div className="text-gray-500 text-xs">{action.targetId}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs truncate" title={action.reason}>
                      {action.reason}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredActions.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-gray-500">No audit records found matching your criteria</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};