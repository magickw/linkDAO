import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Cpu, 
  MemoryStick, 
  Server, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Zap
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { SystemHealthOverview as SystemHealthData } from '@/hooks/useSystemHealthMonitoring';

interface SystemHealthOverviewProps {
  systemHealth: SystemHealthData | null;
  isLoading: boolean;
}

export const SystemHealthOverview: React.FC<SystemHealthOverviewProps> = ({
  systemHealth,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!systemHealth) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No system health data available</p>
      </div>
    );
  }

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'degrading': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const servicesData = [
    { name: 'Healthy', value: systemHealth.metrics.services.healthy, color: '#10b981' },
    { name: 'Degraded', value: systemHealth.metrics.services.degraded, color: '#f59e0b' },
    { name: 'Failed', value: systemHealth.metrics.services.failed, color: '#ef4444' }
  ].filter(item => item.value > 0);

  const alertsData = [
    { name: 'Critical', value: systemHealth.alerts.critical, color: '#ef4444' },
    { name: 'Warning', value: systemHealth.alerts.warning, color: '#f59e0b' },
    { name: 'Info', value: systemHealth.alerts.info, color: '#3b82f6' }
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Health Score and Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overall Health Score */}
        <Card className={`border-2 ${getHealthBgColor(systemHealth.healthScore)}`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Activity className="h-5 w-5 mr-2" />
              System Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className={`text-4xl font-bold mb-2 ${getHealthColor(systemHealth.healthScore)}`}>
                {Math.round(systemHealth.healthScore)}%
              </div>
              <Progress 
                value={systemHealth.healthScore} 
                className="mb-4"
              />
              <Badge 
                variant={systemHealth.status === 'healthy' ? 'default' : 'destructive'}
                className="text-sm"
              >
                {systemHealth.status.toUpperCase()}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* System Trends */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <TrendingUp className="h-5 w-5 mr-2" />
              Health Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Direction</span>
                <div className="flex items-center">
                  {getTrendIcon(systemHealth.trends.direction)}
                  <span className="ml-2 text-sm capitalize">
                    {systemHealth.trends.direction}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Change Rate</span>
                <span className="text-sm font-mono">
                  {systemHealth.trends.changeRate.toFixed(2)}%
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Confidence</span>
                <div className="flex items-center">
                  <Progress 
                    value={systemHealth.trends.confidence * 100} 
                    className="w-16 mr-2"
                  />
                  <span className="text-sm">
                    {Math.round(systemHealth.trends.confidence * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resource Usage */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Zap className="h-5 w-5 mr-2" />
              Resource Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <Cpu className="h-4 w-4 mr-2 text-blue-600" />
                    <span className="text-sm font-medium">CPU</span>
                  </div>
                  <span className="text-sm font-mono">
                    {systemHealth.metrics.cpu.toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={systemHealth.metrics.cpu} 
                  className="h-2"
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <MemoryStick className="h-4 w-4 mr-2 text-purple-600" />
                    <span className="text-sm font-medium">Memory</span>
                  </div>
                  <span className="text-sm font-mono">
                    {systemHealth.metrics.memory.toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={systemHealth.metrics.memory} 
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Services and Alerts Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Services Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Server className="h-5 w-5 mr-2" />
              Services Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {systemHealth.metrics.services.total}
                  </div>
                  <div className="text-sm text-gray-600">Total Services</div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-600">Healthy</span>
                    <span className="font-medium">{systemHealth.metrics.services.healthy}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-yellow-600">Degraded</span>
                    <span className="font-medium">{systemHealth.metrics.services.degraded}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-red-600">Failed</span>
                    <span className="font-medium">{systemHealth.metrics.services.failed}</span>
                  </div>
                </div>
              </div>
              
              {servicesData.length > 0 && (
                <div className="flex justify-center">
                  <ResponsiveContainer width="100%" height={120}>
                    <PieChart>
                      <Pie
                        data={servicesData}
                        cx="50%"
                        cy="50%"
                        innerRadius={25}
                        outerRadius={50}
                        dataKey="value"
                      >
                        {servicesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Alerts Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {systemHealth.alerts.total}
                  </div>
                  <div className="text-sm text-gray-600">Total Alerts</div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-red-600">Critical</span>
                    <span className="font-medium">{systemHealth.alerts.critical}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-yellow-600">Warning</span>
                    <span className="font-medium">{systemHealth.alerts.warning}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-600">Info</span>
                    <span className="font-medium">{systemHealth.alerts.info}</span>
                  </div>
                </div>
              </div>
              
              {alertsData.length > 0 && (
                <div className="flex justify-center">
                  <ResponsiveContainer width="100%" height={120}>
                    <PieChart>
                      <Pie
                        data={alertsData}
                        cx="50%"
                        cy="50%"
                        innerRadius={25}
                        outerRadius={50}
                        dataKey="value"
                      >
                        {alertsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Bottlenecks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            Performance Bottlenecks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {systemHealth.bottlenecks.total}
              </div>
              <div className="text-sm text-gray-600">Total Issues</div>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600 mb-1">
                {systemHealth.bottlenecks.critical}
              </div>
              <div className="text-sm text-red-600">Critical</div>
            </div>
            
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600 mb-1">
                {systemHealth.bottlenecks.high}
              </div>
              <div className="text-sm text-yellow-600">High Priority</div>
            </div>
          </div>
          
          {systemHealth.bottlenecks.total === 0 && (
            <div className="text-center py-8">
              <div className="text-green-600 mb-2">
                <Activity className="h-8 w-8 mx-auto" />
              </div>
              <p className="text-green-600 font-medium">No performance bottlenecks detected</p>
              <p className="text-sm text-gray-600 mt-1">System is performing optimally</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Last Updated:</span>
              <div className="mt-1">
                {new Date(systemHealth.timestamp).toLocaleString()}
              </div>
            </div>
            
            <div>
              <span className="font-medium text-gray-600">Health Score:</span>
              <div className="mt-1 font-mono">
                {systemHealth.healthScore.toFixed(2)}%
              </div>
            </div>
            
            <div>
              <span className="font-medium text-gray-600">Status:</span>
              <div className="mt-1">
                <Badge variant={systemHealth.status === 'healthy' ? 'default' : 'destructive'}>
                  {systemHealth.status}
                </Badge>
              </div>
            </div>
            
            <div>
              <span className="font-medium text-gray-600">Trend Confidence:</span>
              <div className="mt-1 font-mono">
                {Math.round(systemHealth.trends.confidence * 100)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};