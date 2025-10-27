import React, { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';
import { AdminAction } from '@/types/auth';
import { Button, GlassPanel } from '@/design-system';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Key,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Download,
  Filter,
  Search,
  BarChart3,
  PieChart,
  LineChart,
  TrendingUp,
  TrendingDown,
  FileText,
  RefreshCw
} from 'lucide-react';

interface SecurityEvent {
  id: string;
  type: 'login' | 'access' | 'modification' | 'suspicious' | 'failed_login';
  severity: 'low' | 'medium' | 'high' | 'critical';
  user: string;
  ip: string;
  location: string;
  timestamp: string;
  description: string;
  status: 'resolved' | 'investigating' | 'pending';
}

interface ComplianceMetric {
  id: string;
  name: string;
  status: 'compliant' | 'non_compliant' | 'pending';
  lastChecked: string;
  nextCheck: string;
  issues: number;
  description: string;
}

export const SecurityComplianceDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'compliance' | 'reports'>('overview');
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [complianceMetrics, setComplianceMetrics] = useState<ComplianceMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d' | '90d'>('7d');
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  // Mock data for demonstration
  useEffect(() => {
    const mockEvents: SecurityEvent[] = [
      {
        id: '1',
        type: 'failed_login',
        severity: 'high',
        user: 'admin_user',
        ip: '192.168.1.100',
        location: 'New York, US',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        description: 'Multiple failed login attempts detected',
        status: 'investigating'
      },
      {
        id: '2',
        type: 'access',
        severity: 'medium',
        user: 'moderator_user',
        ip: '10.0.0.50',
        location: 'London, UK',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        description: 'Access to sensitive user data',
        status: 'resolved'
      },
      {
        id: '3',
        type: 'modification',
        severity: 'critical',
        user: 'admin_user',
        ip: '192.168.1.100',
        location: 'New York, US',
        timestamp: new Date(Date.now() - 10800000).toISOString(),
        description: 'User role modification for multiple accounts',
        status: 'pending'
      }
    ];

    const mockMetrics: ComplianceMetric[] = [
      {
        id: '1',
        name: 'GDPR Compliance',
        status: 'compliant',
        lastChecked: '2023-06-15',
        nextCheck: '2023-07-15',
        issues: 0,
        description: 'General Data Protection Regulation compliance status'
      },
      {
        id: '2',
        name: 'SOC 2 Type II',
        status: 'pending',
        lastChecked: '2023-05-20',
        nextCheck: '2023-06-20',
        issues: 3,
        description: 'Security and availability controls audit'
      },
      {
        id: '3',
        name: 'PCI DSS',
        status: 'non_compliant',
        lastChecked: '2023-06-01',
        nextCheck: '2023-07-01',
        issues: 5,
        description: 'Payment Card Industry Data Security Standard'
      }
    ];

    setSecurityEvents(mockEvents);
    setComplianceMetrics(mockMetrics);
  }, []);

  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would call actual API endpoints
      console.log('Fetching security data for timeframe:', timeframe);
    } catch (error) {
      console.error('Failed to fetch security data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, [timeframe]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'non_compliant': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const filteredEvents = securityEvents.filter(event => {
    const matchesSearch = event.user.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          event.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || event.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center">
                <Shield className="w-8 h-8 mr-3 text-purple-400" />
                Security & Compliance Dashboard
              </h1>
              <p className="text-gray-400 mt-2">
                Monitor security events and compliance status
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as any)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>
              <Button 
                onClick={fetchSecurityData} 
                disabled={loading}
                variant="outline"
                className="flex items-center"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1 mb-8 bg-white/10 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-white text-gray-900'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </button>
          
          <button
            onClick={() => setActiveTab('events')}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'events'
                ? 'bg-white text-gray-900'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Security Events
          </button>
          
          <button
            onClick={() => setActiveTab('compliance')}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'compliance'
                ? 'bg-white text-gray-900'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Compliance
          </button>
          
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'reports'
                ? 'bg-white text-gray-900'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Download className="w-4 h-4 mr-2" />
            Reports
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <GlassPanel className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Critical Events</p>
                    <p className="text-2xl font-bold text-white mt-1">3</p>
                  </div>
                  <div className="p-3 bg-red-500/20 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                </div>
                <div className="flex items-center mt-3">
                  <TrendingUp className="w-4 h-4 text-red-400 mr-1" />
                  <span className="text-sm text-red-400">+12% from last week</span>
                </div>
              </GlassPanel>

              <GlassPanel className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Compliance Issues</p>
                    <p className="text-2xl font-bold text-white mt-1">8</p>
                  </div>
                  <div className="p-3 bg-orange-500/20 rounded-lg">
                    <Shield className="w-6 h-6 text-orange-400" />
                  </div>
                </div>
                <div className="flex items-center mt-3">
                  <TrendingDown className="w-4 h-4 text-green-400 mr-1" />
                  <span className="text-sm text-green-400">-5% from last week</span>
                </div>
              </GlassPanel>

              <GlassPanel className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Resolved Events</p>
                    <p className="text-2xl font-bold text-white mt-1">24</p>
                  </div>
                  <div className="p-3 bg-green-500/20 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  </div>
                </div>
                <div className="flex items-center mt-3">
                  <TrendingUp className="w-4 h-4 text-green-400 mr-1" />
                  <span className="text-sm text-green-400">+18% from last week</span>
                </div>
              </GlassPanel>

              <GlassPanel className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Avg Response Time</p>
                    <p className="text-2xl font-bold text-white mt-1">2.4h</p>
                  </div>
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <Clock className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
                <div className="flex items-center mt-3">
                  <TrendingDown className="w-4 h-4 text-green-400 mr-1" />
                  <span className="text-sm text-green-400">-0.3h from last week</span>
                </div>
              </GlassPanel>

              {/* Security Events Chart */}
              <div className="md:col-span-2 lg:col-span-4">
                <GlassPanel className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Security Events Trend</h3>
                  <div className="h-64 bg-gray-800/50 rounded-lg flex items-center justify-center">
                    <p className="text-gray-400">Security events trend chart would be displayed here</p>
                  </div>
                </GlassPanel>
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div className="space-y-6">
              {/* Filters */}
              <GlassPanel className="p-4">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search events..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white flex-1 min-w-[200px]"
                    />
                  </div>
                  
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="all">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  
                  <Button variant="outline" className="flex items-center">
                    <Filter className="w-4 h-4 mr-2" />
                    More Filters
                  </Button>
                </div>
              </GlassPanel>

              {/* Events List */}
              <div className="space-y-4">
                {filteredEvents.map((event) => (
                  <GlassPanel key={event.id} className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          event.severity === 'critical' ? 'bg-red-500/20' :
                          event.severity === 'high' ? 'bg-orange-500/20' :
                          event.severity === 'medium' ? 'bg-yellow-500/20' :
                          'bg-green-500/20'
                        }`}>
                          {event.type === 'failed_login' && <Key className="w-5 h-5 text-red-400" />}
                          {event.type === 'access' && <Eye className="w-5 h-5 text-blue-400" />}
                          {event.type === 'modification' && <Lock className="w-5 h-5 text-purple-400" />}
                          {event.type === 'suspicious' && <AlertTriangle className="w-5 h-5 text-orange-400" />}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-medium text-white">{event.user}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(event.severity)}`}>
                              {event.severity}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              event.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                              event.status === 'investigating' ? 'bg-orange-500/20 text-orange-400' :
                              'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {event.status}
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm mb-1">{event.description}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                            <span>IP: {event.ip}</span>
                            <span>{event.location}</span>
                            <span>{new Date(event.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="small">
                          Investigate
                        </Button>
                        <Button variant="outline" size="small">
                          Resolve
                        </Button>
                      </div>
                    </div>
                  </GlassPanel>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'compliance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {complianceMetrics.map((metric) => (
                  <GlassPanel key={metric.id} className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-white">{metric.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(metric.status)}`}>
                        {metric.status.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <p className="text-gray-400 text-sm mb-4">{metric.description}</p>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Issues</span>
                        <span className="text-white font-medium">{metric.issues}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Last Checked</span>
                        <span className="text-white text-sm">{metric.lastChecked}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Next Check</span>
                        <span className="text-white text-sm">{metric.nextCheck}</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <Button variant="outline" className="w-full">
                        View Details
                      </Button>
                    </div>
                  </GlassPanel>
                ))}
              </div>
              
              {/* Compliance Chart */}
              <GlassPanel className="p-6">
                <h3 className="text-lg font-bold text-white mb-4">Compliance Status Overview</h3>
                <div className="h-64 bg-gray-800/50 rounded-lg flex items-center justify-center">
                  <p className="text-gray-400">Compliance status chart would be displayed here</p>
                </div>
              </GlassPanel>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <GlassPanel className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">Security Events Report</h3>
                    <FileText className="w-6 h-6 text-blue-400" />
                  </div>
                  <p className="text-gray-400 text-sm mb-4">
                    Detailed report of all security events within the selected timeframe
                  </p>
                  <Button variant="outline" className="w-full flex items-center justify-center">
                    <Download className="w-4 h-4 mr-2" />
                    Download CSV
                  </Button>
                </GlassPanel>
                
                <GlassPanel className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">Compliance Audit Report</h3>
                    <FileText className="w-6 h-6 text-green-400" />
                  </div>
                  <p className="text-gray-400 text-sm mb-4">
                    Comprehensive compliance audit report with findings and recommendations
                  </p>
                  <Button variant="outline" className="w-full flex items-center justify-center">
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </GlassPanel>
                
                <GlassPanel className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">User Access Report</h3>
                    <FileText className="w-6 h-6 text-purple-400" />
                  </div>
                  <p className="text-gray-400 text-sm mb-4">
                    Detailed analysis of user access patterns and permissions
                  </p>
                  <Button variant="outline" className="w-full flex items-center justify-center">
                    <Download className="w-4 h-4 mr-2" />
                    Download Excel
                  </Button>
                </GlassPanel>
              </div>
              
              {/* Custom Report Builder */}
              <GlassPanel className="p-6">
                <h3 className="text-lg font-bold text-white mb-4">Custom Report Builder</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Report Type</label>
                    <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white">
                      <option>Security Events</option>
                      <option>User Access</option>
                      <option>Compliance Status</option>
                      <option>Audit Trail</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Time Range</label>
                    <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white">
                      <option>Last 24 Hours</option>
                      <option>Last 7 Days</option>
                      <option>Last 30 Days</option>
                      <option>Last 90 Days</option>
                    </select>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-gray-400 text-sm mb-2">Additional Filters</label>
                    <input
                      type="text"
                      placeholder="Add filters (e.g., user:admin, severity:high)"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button variant="primary">Generate Report</Button>
                  <Button variant="outline">Save Template</Button>
                </div>
              </GlassPanel>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};