import React, { useState, useEffect } from 'react';
import { adminService } from '../../../services/adminService';
import { AdminAction } from '../../../types/auth';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { AuditSearch } from './AuditSearch';
import { AuditAnalytics } from './AuditAnalytics';
import { ComplianceReports } from './ComplianceReports';

interface AuditDashboardProps {
  className?: string;
}

export const AuditDashboard: React.FC<AuditDashboardProps> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState<'search' | 'analytics' | 'compliance'>('search');
  const [auditActions, setAuditActions] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d' | '90d'>('7d');

  const fetchAuditData = async () => {
    setLoading(true);
    try {
      // Calculate date range based on timeframe
      const endDate = new Date();
      let startDate = new Date();
      
      switch (timeframe) {
        case '24h':
          startDate.setHours(startDate.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
      }

      const data = await adminService.getAuditLog({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 1000
      });
      
      setAuditActions(data.actions);
    } catch (error) {
      console.error('Failed to fetch audit data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, [timeframe]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Audit System Dashboard</h1>
          <p className="text-gray-600">Comprehensive audit trail and compliance monitoring</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeframe} onValueChange={(value) => setTimeframe(value as '24h' | '7d' | '30d' | '90d')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={fetchAuditData} 
            disabled={loading}
            variant="outline"
          >
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('search')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'search'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Search & Filter
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'analytics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Analytics & Visualization
          </button>
          <button
            onClick={() => setActiveTab('compliance')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'compliance'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Compliance Reports
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'search' && (
          <AuditSearch auditActions={auditActions} loading={loading} />
        )}
        
        {activeTab === 'analytics' && (
          <AuditAnalytics auditActions={auditActions} loading={loading} timeframe={timeframe} />
        )}
        
        {activeTab === 'compliance' && (
          <ComplianceReports auditActions={auditActions} loading={loading} />
        )}
      </div>
    </div>
  );
};