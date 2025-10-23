import React, { useState, useEffect } from 'react';
import { AdminAction } from '../../../types/auth';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface ComplianceReportsProps {
  auditActions: AdminAction[];
  loading: boolean;
}

interface ComplianceReport {
  id: string;
  name: string;
  description: string;
  lastGenerated: string;
  status: 'active' | 'pending' | 'failed';
}

interface SuspiciousActivity {
  id: string;
  adminId: string;
  adminHandle: string;
  action: string;
  targetType: string;
  timestamp: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

interface PolicyViolation {
  id: string;
  policy: string;
  adminId: string;
  adminHandle: string;
  action: string;
  timestamp: string;
  details: string;
}

export const ComplianceReports: React.FC<ComplianceReportsProps> = ({ auditActions, loading }) => {
  const [reports, setReports] = useState<ComplianceReport[]>([
    {
      id: '1',
      name: 'GDPR Compliance Report',
      description: 'Data protection and privacy compliance audit',
      lastGenerated: '2023-06-15',
      status: 'active'
    },
    {
      id: '2',
      name: 'SOX Compliance Report',
      description: 'Financial controls and reporting compliance',
      lastGenerated: '2023-06-10',
      status: 'active'
    },
    {
      id: '3',
      name: 'HIPAA Compliance Report',
      description: 'Health information privacy compliance',
      lastGenerated: '2023-05-20',
      status: 'pending'
    }
  ]);
  
  const [suspiciousActivities, setSuspiciousActivities] = useState<SuspiciousActivity[]>([]);
  const [policyViolations, setPolicyViolations] = useState<PolicyViolation[]>([]);
  const [reportType, setReportType] = useState('gdpr');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    // Detect suspicious activities
    const suspicious: SuspiciousActivity[] = [];
    
    // Group actions by admin and time window to detect bulk actions
    const adminActions: Record<string, AdminAction[]> = {};
    auditActions.forEach(action => {
      if (!adminActions[action.adminId]) {
        adminActions[action.adminId] = [];
      }
      adminActions[action.adminId].push(action);
    });
    
    // Check for bulk actions (more than 50 actions in 1 hour)
    Object.entries(adminActions).forEach(([adminId, actions]) => {
      const adminHandle = actions[0]?.adminHandle || adminId;
      
      // Sort actions by timestamp
      actions.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      // Check for bulk actions in 1-hour windows
      for (let i = 0; i < actions.length - 50; i++) {
        const windowStart = new Date(actions[i].timestamp);
        const windowEnd = new Date(windowStart.getTime() + 60 * 60 * 1000); // 1 hour
        
        let count = 1;
        for (let j = i + 1; j < actions.length; j++) {
          if (new Date(actions[j].timestamp) <= windowEnd) {
            count++;
          } else {
            break;
          }
        }
        
        if (count >= 50) {
          suspicious.push({
            id: `bulk-${adminId}-${windowStart.getTime()}`,
            adminId,
            adminHandle,
            action: 'bulk_actions',
            targetType: 'multiple',
            timestamp: windowStart.toISOString(),
            reason: `Performed ${count} actions within 1 hour`,
            severity: 'high'
          });
        }
      }
    });
    
    // Check for suspicious target types
    auditActions.forEach(action => {
      if (action.targetType === 'user' && action.action === 'suspend') {
        // Check if suspending users with specific patterns
        if (action.reason.toLowerCase().includes('spam') || action.reason.toLowerCase().includes('bot')) {
          suspicious.push({
            id: `suspend-${action.id}`,
            adminId: action.adminId,
            adminHandle: action.adminHandle,
            action: action.action,
            targetType: action.targetType,
            timestamp: action.timestamp,
            reason: action.reason,
            severity: 'medium'
          });
        }
      }
    });
    
    setSuspiciousActivities(suspicious);
    
    // Detect policy violations
    const violations: PolicyViolation[] = [];
    
    auditActions.forEach(action => {
      // Check for actions without proper reasons
      if (!action.reason || action.reason.trim().length < 5) {
        violations.push({
          id: `policy-${action.id}`,
          policy: 'Reason Required',
          adminId: action.adminId,
          adminHandle: action.adminHandle,
          action: action.action,
          timestamp: action.timestamp,
          details: 'Action performed without adequate justification'
        });
      }
      
      // Check for unauthorized actions
      if (action.action === 'delete' && action.targetType === 'user') {
        violations.push({
          id: `policy-delete-${action.id}`,
          policy: 'User Deletion Policy',
          adminId: action.adminId,
          adminHandle: action.adminHandle,
          action: action.action,
          timestamp: action.timestamp,
          details: 'User deletion requires supervisor approval'
        });
      }
    });
    
    setPolicyViolations(violations);
  }, [auditActions]);

  const generateReport = () => {
    // In a real implementation, this would call an API to generate a report
    alert(`Generating ${reportType} compliance report...`);
  };

  const exportReport = (format: 'pdf' | 'csv' | 'json') => {
    // In a real implementation, this would export the report in the specified format
    alert(`Exporting report in ${format} format...`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Report Generation */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Compliance Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gdpr">GDPR Compliance</SelectItem>
                  <SelectItem value="sox">SOX Compliance</SelectItem>
                  <SelectItem value="hipaa">HIPAA Compliance</SelectItem>
                  <SelectItem value="custom">Custom Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <Select value={dateRange} onValueChange={(value) => {
                const validValues = ['7d', '30d', '90d'] as const;
                if (validValues.includes(value as any)) {
                  setDateRange(value as '7d' | '30d' | '90d');
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={generateReport} className="w-full">
                Generate Report
              </Button>
            </div>
          </div>
          
          <div className="flex justify-end mt-4 space-x-2">
            <Button onClick={() => exportReport('pdf')} variant="outline">
              Export PDF
            </Button>
            <Button onClick={() => exportReport('csv')} variant="outline">
              Export CSV
            </Button>
            <Button onClick={() => exportReport('json')} variant="outline">
              Export JSON
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Predefined Reports */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {reports.map((report) => (
          <Card key={report.id}>
            <CardHeader>
              <CardTitle className="text-lg">{report.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm mb-4">{report.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Last: {report.lastGenerated}</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  report.status === 'active' ? 'bg-green-100 text-green-800' :
                  report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {report.status}
                </span>
              </div>
              <Button className="w-full mt-4" variant="outline">
                View Report
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Suspicious Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Suspicious Activities Detected</CardTitle>
        </CardHeader>
        <CardContent>
          {suspiciousActivities.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
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
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Severity
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {suspiciousActivities.map((activity) => (
                    <tr key={activity.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {activity.adminHandle}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {activity.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {activity.targetType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(activity.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {activity.reason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          activity.severity === 'high' ? 'bg-red-100 text-red-800' :
                          activity.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {activity.severity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No suspicious activities detected
            </div>
          )}
        </CardContent>
      </Card>

      {/* Policy Violations */}
      <Card>
        <CardHeader>
          <CardTitle>Policy Violations</CardTitle>
        </CardHeader>
        <CardContent>
          {policyViolations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Policy
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Admin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {policyViolations.map((violation) => (
                    <tr key={violation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {violation.policy}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {violation.adminHandle}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {violation.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(violation.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {violation.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No policy violations detected
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};