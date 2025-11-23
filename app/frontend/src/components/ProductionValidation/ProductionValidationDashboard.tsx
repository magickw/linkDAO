/**
 * Production Validation Dashboard
 * 
 * Provides a comprehensive dashboard for monitoring production validation
 * and deployment status of the seller integration system.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from 'recharts';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
  TrendingUp,

  RefreshCw,
  Download,
  Play,
  Pause,
} from 'lucide-react';

interface ValidationResult {
  component: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  duration: number;
  details?: any;
}

interface SystemMetrics {
  timestamp: number;
  responseTime: number;
  errorRate: number;
  throughput: number;
  memoryUsage: number;
  cpuUsage: number;
  cacheHitRate: number;
}

interface WorkflowStatus {
  workflow: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: string;
  responseTime: number;
}

interface DeploymentStatus {
  environment: string;
  status: 'deploying' | 'deployed' | 'failed' | 'rollback';
  timestamp: string;
  version: string;
  progress: number;
}

const ProductionValidationDashboard: React.FC = () => {
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics[]>([]);
  const [workflowStatuses, setWorkflowStatuses] = useState<WorkflowStatus[]>([]);
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    
    const interval = setInterval(() => {
      if (isMonitoring) {
        fetchDashboardData();
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [isMonitoring]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch validation results
      const validationResponse = await fetch('/api/monitoring/validation/results');
      if (validationResponse.ok) {
        const validationData = await validationResponse.json();
        setValidationResults(validationData.data || []);
      }

      // Fetch system metrics
      const metricsResponse = await fetch('/api/monitoring/metrics/history?limit=20');
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setSystemMetrics(metricsData.data?.metrics || []);
      }

      // Fetch workflow statuses
      const workflowResponse = await fetch('/api/monitoring/seller-workflows/status');
      if (workflowResponse.ok) {
        const workflowData = await workflowResponse.json();
        const workflows = Object.entries(workflowData.data?.workflows || {}).map(([name, status]: [string, any]) => ({
          workflow: name,
          status: status.status,
          lastCheck: status.lastCheck,
          responseTime: status.responseTime,
        }));
        setWorkflowStatuses(workflows);
      }

      // Fetch deployment status
      const deploymentResponse = await fetch('/api/monitoring/deployment/status');
      if (deploymentResponse.ok) {
        const deploymentData = await deploymentResponse.json();
        setDeploymentStatus(deploymentData.data);
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerValidation = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/monitoring/validation/trigger', {
        method: 'POST',
      });
      
      if (response.ok) {
        await fetchDashboardData();
      }
    } catch (error) {
      console.error('Error triggering validation:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async () => {
    try {
      const response = await fetch('/api/monitoring/report');
      if (response.ok) {
        const reportData = await response.json();
        const blob = new Blob([JSON.stringify(reportData.data, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `production-validation-report-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
      case 'healthy':
      case 'deployed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
      case 'unhealthy':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'passed':
      case 'healthy':
      case 'deployed':
        return 'default';
      case 'failed':
      case 'unhealthy':
        return 'destructive';
      case 'warning':
      case 'degraded':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const overallStatus = validationResults.length > 0 
    ? validationResults.every(r => r.status === 'passed') ? 'healthy' : 'degraded'
    : 'unknown';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Production Validation Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor seller integration system validation and deployment status
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="small"
            onClick={() => setIsMonitoring(!isMonitoring)}
          >
            {isMonitoring ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isMonitoring ? 'Pause' : 'Resume'}
          </Button>
          <Button variant="outline" size="small" onClick={fetchDashboardData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="small" onClick={downloadReport}>
            <Download className="h-4 w-4" />
            Report
          </Button>
          <Button onClick={triggerValidation} disabled={loading}>
            Run Validation
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              {getStatusIcon(overallStatus)}
              <div>
                <p className="text-sm font-medium">Overall Status</p>
                <Badge variant={getStatusBadgeVariant(overallStatus)}>
                  {overallStatus.toUpperCase()}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Validations Passed</p>
                <p className="text-2xl font-bold">
                  {validationResults.filter(r => r.status === 'passed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Active Workflows</p>
                <p className="text-2xl font-bold">
                  {workflowStatuses.filter(w => w.status === 'healthy').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Last Update</p>
                <p className="text-sm text-muted-foreground">
                  {lastUpdate.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deployment Status */}
      {deploymentStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getStatusIcon(deploymentStatus.status)}
              <span>Deployment Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{deploymentStatus.environment}</p>
                  <p className="text-sm text-muted-foreground">
                    Version: {deploymentStatus.version}
                  </p>
                </div>
                <Badge variant={getStatusBadgeVariant(deploymentStatus.status)}>
                  {deploymentStatus.status.toUpperCase()}
                </Badge>
              </div>
              {deploymentStatus.status === 'deploying' && (
                <Progress value={deploymentStatus.progress} className="w-full" />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="validation" className="space-y-4">
        <TabsList>
          <TabsTrigger value="validation">Validation Results</TabsTrigger>
          <TabsTrigger value="workflows">Seller Workflows</TabsTrigger>
          <TabsTrigger value="metrics">System Metrics</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="validation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Validation Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {validationResults.length === 0 ? (
                  <p className="text-muted-foreground">No validation results available</p>
                ) : (
                  validationResults.map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(result.status)}
                        <div>
                          <p className="font-medium">{result.component}</p>
                          <p className="text-sm text-muted-foreground">{result.message}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={getStatusBadgeVariant(result.status)}>
                          {result.status.toUpperCase()}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {result.duration.toFixed(2)}ms
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Seller Workflow Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workflowStatuses.map((workflow, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(workflow.status)}
                        <span className="font-medium capitalize">
                          {workflow.workflow.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      </div>
                      <Badge variant={getStatusBadgeVariant(workflow.status)}>
                        {workflow.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>Response Time: {workflow.responseTime.toFixed(2)}ms</p>
                      <p>Last Check: {new Date(workflow.lastCheck).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={systemMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                      formatter={(value: number) => [`${value.toFixed(2)}ms`, 'Response Time']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="responseTime" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Error Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={systemMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                      formatter={(value: number) => [`${value.toFixed(2)}%`, 'Error Rate']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="errorRate" 
                      stroke="#ff7300" 
                      fill="#ff7300" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Memory Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={systemMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                      formatter={(value: number) => [`${value.toFixed(2)}%`, 'Memory Usage']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="memoryUsage" 
                      stroke="#00ff00" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cache Hit Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={systemMetrics.slice(-10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                      formatter={(value: number) => [`${value.toFixed(2)}%`, 'Cache Hit Rate']}
                    />
                    <Bar dataKey="cacheHitRate" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Average Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {systemMetrics.length > 0 
                    ? (systemMetrics.reduce((sum, m) => sum + m.responseTime, 0) / systemMetrics.length).toFixed(2)
                    : '0'
                  }ms
                </div>
                <p className="text-sm text-muted-foreground">Last 20 measurements</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Throughput</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {systemMetrics.length > 0 
                    ? (systemMetrics.reduce((sum, m) => sum + m.throughput, 0) / systemMetrics.length).toFixed(0)
                    : '0'
                  }
                </div>
                <p className="text-sm text-muted-foreground">Requests per second</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Health Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {overallStatus === 'healthy' ? '100%' : overallStatus === 'degraded' ? '75%' : '25%'}
                </div>
                <p className="text-sm text-muted-foreground">Overall system health</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={systemMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="responseTime" 
                    stroke="#8884d8" 
                    name="Response Time (ms)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="throughput" 
                    stroke="#82ca9d" 
                    name="Throughput (req/s)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cacheHitRate" 
                    stroke="#ffc658" 
                    name="Cache Hit Rate (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductionValidationDashboard;