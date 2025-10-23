import React, { useState, useEffect } from 'react';
import { AdminAction } from '../../../types/auth';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

interface AuditAnalyticsProps {
  auditActions: AdminAction[];
  loading: boolean;
  timeframe: '24h' | '7d' | '30d' | '90d';
}

interface ActionCount {
  name: string;
  value: number;
}

interface AdminActivity {
  adminId: string;
  adminHandle: string;
  actionCount: number;
}

interface TimeSeriesData {
  date: string;
  count: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

export const AuditAnalytics: React.FC<AuditAnalyticsProps> = ({ auditActions, loading, timeframe }) => {
  const [actionDistribution, setActionDistribution] = useState<ActionCount[]>([]);
  const [targetTypeDistribution, setTargetTypeDistribution] = useState<ActionCount[]>([]);
  const [topAdmins, setTopAdmins] = useState<AdminActivity[]>([]);
  const [actionsOverTime, setActionsOverTime] = useState<TimeSeriesData[]>([]);

  useEffect(() => {
    if (auditActions.length > 0) {
      // Calculate action distribution
      const actionCounts: Record<string, number> = {};
      auditActions.forEach(action => {
        actionCounts[action.action] = (actionCounts[action.action] || 0) + 1;
      });
      setActionDistribution(
        Object.entries(actionCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10)
      );

      // Calculate target type distribution
      const targetTypeCounts: Record<string, number> = {};
      auditActions.forEach(action => {
        targetTypeCounts[action.targetType] = (targetTypeCounts[action.targetType] || 0) + 1;
      });
      setTargetTypeDistribution(
        Object.entries(targetTypeCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
      );

      // Calculate top admins
      const adminActivity: Record<string, { adminId: string; adminHandle: string; count: number }> = {};
      auditActions.forEach(action => {
        const key = `${action.adminId}-${action.adminHandle}`;
        if (!adminActivity[key]) {
          adminActivity[key] = {
            adminId: action.adminId,
            adminHandle: action.adminHandle,
            count: 0
          };
        }
        adminActivity[key].count++;
      });
      setTopAdmins(
        Object.values(adminActivity)
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      );

      // Calculate actions over time
      const timeSeriesData: Record<string, number> = {};
      auditActions.forEach(action => {
        const date = new Date(action.timestamp);
        let dateKey: string;
        
        switch (timeframe) {
          case '24h':
            // Group by hour
            dateKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:00`;
            break;
          case '7d':
          case '30d':
            // Group by day
            dateKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
            break;
          case '90d':
            // Group by week
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            dateKey = `${weekStart.getFullYear()}-W${Math.ceil(date.getDate() / 7)}`;
            break;
          default:
            dateKey = date.toISOString().split('T')[0];
        }
        
        timeSeriesData[dateKey] = (timeSeriesData[dateKey] || 0) + 1;
      });
      
      setActionsOverTime(
        Object.entries(timeSeriesData)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date))
      );
    }
  }, [auditActions, timeframe]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditActions.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Unique Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topAdmins.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Action Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actionDistribution.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Target Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{targetTypeDistribution.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Action Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Action Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={actionDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Target Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Target Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={targetTypeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {targetTypeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Admins */}
        <Card>
          <CardHeader>
            <CardTitle>Top Active Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topAdmins}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="adminHandle" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="actionCount" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Actions Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Actions Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={actionsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Admins Table */}
        <Card>
          <CardHeader>
            <CardTitle>Top Admins by Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Admin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {topAdmins.map((admin, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {admin.adminHandle}
                        <div className="text-gray-500 text-xs">{admin.adminId}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {admin.actionCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Action Types Table */}
        <Card>
          <CardHeader>
            <CardTitle>Action Types Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Percentage
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {actionDistribution.map((action, index) => {
                    const percentage = ((action.value / auditActions.length) * 100).toFixed(1);
                    return (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {action.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {action.value}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {percentage}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};