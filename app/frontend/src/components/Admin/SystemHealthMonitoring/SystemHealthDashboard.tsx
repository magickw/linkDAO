import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Server,
  Database,
  Cpu,
  MemoryStick,
  Network,
  Clock,
  Users,
  Zap
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useSystemHealthMonitoring } from '@/hooks/useSystemHealthMonitoring';
import { SystemHealthOverview } from './SystemHealthOverview';
import { ComponentDependencyMap } from './ComponentDependencyMap';
import { IntelligentAlertsPanel } from './IntelligentAlertsPanel';
import { CapacityPlanningPanel } from './CapacityPlanningPanel';
import { PerformanceAnalyticsPanel } from './PerformanceAnalyticsPanel';

interface SystemHealthDashboardProps {
  className?: string;
}

export const SystemHealthDashboard: React.FC<SystemHealthDashboardProps> = ({ className }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [autoRefresh, setAutoRefresh] = useState(true);

  const {
    systemHealth,
    systemStatus,
    alerts,
    capacityData,
    performanceData,
    isLoading,
    error,
    refreshData
  } = useSystemHealthMonitoring({
    refreshInterval: autoRefresh ? refreshInterval : 0
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50';
      case 'degraded': return 'text-yellow-600 bg-yellow-50';
      case 'critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'degraded': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'critical': return <XCircle className="h-5 w-5 text-red-600" />;
      default: return <Minus className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'degrading': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Failed to Load System Health Data
              </h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={refreshData}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Health Monitoring</h1>
          <p className="text-gray-600 mt-1">
            Real-time system health, performance analytics, and intelligent alerting
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Auto Refresh:</label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300"
            />
          </div>
          
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="rounded-md border-gray-300 text-sm"
            disabled={!autoRefresh}
          >
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
            <option value={60000}>1m</option>
            <option value={300000}>5m</option>
          </select>
          
          <Button
            onClick={refreshData}
            disabled={isLoading}
            size="sm"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* System Status Cards */}
      {systemStatus && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Overall Health */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overall Health</p>
                  <div className="flex items-center mt-2">
                    {getStatusIcon(systemStatus.overall.status)}
                    <span className="ml-2 text-2xl font-bold">
                      {Math.round(systemStatus.overall.score)}%
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-full ${getStatusColor(systemStatus.overall.status)}`}>
                  <Activity className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-1" />
                Uptime: {formatUptime(systemStatus.overall.uptime)}
              </div>
            </CardContent>
          </Card>

          {/* Services Status */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Services</p>
                  <div className="flex items-center mt-2">
                    <Server className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="text-2xl font-bold">
                      {systemStatus.services.healthy}/{systemStatus.services.total}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex space-x-2">
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      {systemStatus.services.healthy} Healthy
                    </Badge>
                  </div>
                  {systemStatus.services.degraded > 0 && (
                    <Badge variant="outline" className="text-yellow-600 border-yellow-200 mt-1">
                      {systemStatus.services.degraded} Degraded
                    </Badge>
                  )}
                  {systemStatus.services.failed > 0 && (
                    <Badge variant="outline" className="text-red-600 border-red-200 mt-1">
                      {systemStatus.services.failed} Failed
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Alerts */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Alerts</p>
                  <div className="flex items-center mt-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
                    <span className="text-2xl font-bold">
                      {systemStatus.alerts.active}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  {systemStatus.alerts.critical > 0 && (
                    <Badge variant="destructive" className="mb-1">
                      {systemStatus.alerts.critical} Critical
                    </Badge>
                  )}
                  <div className="text-sm text-gray-600">
                    {systemStatus.alerts.active - systemStatus.alerts.critical} Warnings
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Performance</p>
                  <div className="flex items-center mt-2">
                    <Zap className="h-5 w-5 text-purple-600 mr-2" />
                    <span className="text-2xl font-bold">
                      {systemStatus.performance.criticalBottlenecks === 0 ? 'Good' : 'Issues'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center text-sm">
                    {getTrendIcon(systemStatus.performance.trends.direction)}
                    <span className="ml-1 capitalize">
                      {systemStatus.performance.trends.direction}
                    </span>
                  </div>
                  {systemStatus.performance.criticalBottlenecks > 0 && (
                    <div className="text-sm text-red-600 mt-1">
                      {systemStatus.performance.criticalBottlenecks} Critical Issues
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="capacity">Capacity</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <SystemHealthOverview 
            systemHealth={systemHealth}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="dependencies" className="space-y-6">
          <ComponentDependencyMap 
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <IntelligentAlertsPanel 
            alerts={alerts}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="capacity" className="space-y-6">
          <CapacityPlanningPanel 
            capacityData={capacityData}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <PerformanceAnalyticsPanel 
            performanceData={performanceData}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>

      {/* Recent Alerts Quick View */}
      {systemStatus?.alerts.recent && systemStatus.alerts.recent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Recent Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {systemStatus.alerts.recent.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-3 ${
                      alert.severity === 'critical' ? 'bg-red-500' :
                      alert.severity === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`} />
                    <div>
                      <p className="font-medium text-gray-900">{alert.title}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                  >
                    {alert.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};