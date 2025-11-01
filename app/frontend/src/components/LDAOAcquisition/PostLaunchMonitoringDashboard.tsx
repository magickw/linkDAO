import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users, 
  DollarSign, 
  Activity,
  Download,
  RefreshCw
} from 'lucide-react';

interface SystemMetrics {
  totalPurchases: number;
  totalVolume: number;
  averageTransactionSize: number;
  conversionRate: number;
  userAcquisitionRate: number;
  stakingParticipation: number;
  errorRate: number;
  responseTime: number;
}

interface UserBehaviorAnalytics {
  preferredPaymentMethods: Record<string, number>;
  purchasePatterns: {
    timeOfDay: Record<string, number>;
    dayOfWeek: Record<string, number>;
    seasonality: Record<string, number>;
  };
  userJourney: {
    averageTimeToFirstPurchase: number;
    dropOffPoints: Record<string, number>;
    conversionFunnelData: Record<string, number>;
  };
  earningBehavior: {
    mostPopularActivities: Record<string, number>;
    averageEarningsPerUser: number;
    retentionRates: Record<string, number>;
  };
}

interface PerformanceMetrics {
  apiResponseTimes: Record<string, number>;
  databaseQueryPerformance: Record<string, number>;
  smartContractGasUsage: Record<string, number>;
  cacheHitRates: Record<string, number>;
  errorRates: Record<string, number>;
}

interface OptimizationRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: 'performance' | 'user_experience' | 'business' | 'technical';
  title: string;
  description: string;
  expectedImpact: string;
  implementationEffort: 'low' | 'medium' | 'high';
  actionItems: string[];
}

interface HealthStatus {
  overall: string;
  components: Record<string, string>;
  metrics: {
    errorRate: number;
    responseTime: number;
    conversionRate: number;
  };
  timestamp: string;
}

export const PostLaunchMonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [analytics, setAnalytics] = useState<UserBehaviorAnalytics | null>(null);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [recommendations, setRecommendations] = useState<OptimizationRecommendation[]>([]);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ldao/monitoring/dashboard');
      const data = await response.json();
      
      if (data.success) {
        setMetrics(data.data.metrics);
        setAnalytics(data.data.analytics);
        setPerformance(data.data.performance);
        setRecommendations(data.data.recommendations);
        setLastUpdated(new Date());
      }

      // Fetch health status separately
      const healthResponse = await fetch('/api/ldao/monitoring/health');
      const healthData = await healthResponse.json();
      if (healthData.success) {
        setHealthStatus(healthData.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch(`/api/ldao/monitoring/export?format=${format}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ldao-metrics.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'degraded': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading monitoring data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">LDAO Post-Launch Monitoring</h1>
          <p className="text-gray-600">
            Last updated: {lastUpdated.toLocaleString()}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => exportData('json')} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
          <Button onClick={() => exportData('csv')} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={fetchDashboardData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Health Status */}
      {healthStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              System Health Status
              <div className={`ml-2 flex items-center ${getHealthStatusColor(healthStatus.overall)}`}>
                {getHealthStatusIcon(healthStatus.overall)}
                <span className="ml-1 capitalize">{healthStatus.overall}</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(healthStatus.components).map(([component, status]) => (
                <div key={component} className="flex items-center justify-between p-3 border rounded">
                  <span className="capitalize">{component.replace('_', ' ')}</span>
                  <div className={`flex items-center ${getHealthStatusColor(status)}`}>
                    {getHealthStatusIcon(status)}
                    <span className="ml-1 text-sm capitalize">{status}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Purchases</p>
                  <p className="text-2xl font-bold">{metrics.totalPurchases.toLocaleString()}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Volume</p>
                  <p className="text-2xl font-bold">${metrics.totalVolume.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                  <p className="text-2xl font-bold">{(metrics.conversionRate * 100).toFixed(2)}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Error Rate</p>
                  <p className="text-2xl font-bold">{(metrics.errorRate * 100).toFixed(2)}%</p>
                </div>
                <Activity className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Analytics */}
      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analytics">User Analytics</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-4">
          {analytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Payment Methods */}
              <Card>
                <CardHeader>
                  <CardTitle>Preferred Payment Methods</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={Object.entries(analytics.preferredPaymentMethods).map(([method, count]) => ({
                          name: method,
                          value: count
                        }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label
                      >
                        {Object.entries(analytics.preferredPaymentMethods).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 60%)`} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Purchase Patterns */}
              <Card>
                <CardHeader>
                  <CardTitle>Purchase Patterns by Time of Day</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={Object.entries(analytics.purchasePatterns.timeOfDay).map(([time, count]) => ({
                        time,
                        purchases: count
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="purchases" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Conversion Funnel */}
              <Card>
                <CardHeader>
                  <CardTitle>Conversion Funnel</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(analytics.userJourney.conversionFunnelData).map(([stage, percentage]) => (
                      <div key={stage} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="capitalize">{stage.replace('_', ' ')}</span>
                          <span>{percentage}%</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Earning Activities */}
              <Card>
                <CardHeader>
                  <CardTitle>Popular Earning Activities</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={Object.entries(analytics.earningBehavior.mostPopularActivities).map(([activity, count]) => ({
                        activity,
                        count
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="activity" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {performance && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* API Response Times */}
              <Card>
                <CardHeader>
                  <CardTitle>API Response Times (ms)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={Object.entries(performance.apiResponseTimes).map(([endpoint, time]) => ({
                        endpoint: endpoint.split('/').pop(),
                        time
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="endpoint" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="time" fill="#ffc658" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Cache Hit Rates */}
              <Card>
                <CardHeader>
                  <CardTitle>Cache Hit Rates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(performance.cacheHitRates).map(([cache, rate]) => (
                      <div key={cache} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="capitalize">{cache.replace('_', ' ')}</span>
                          <span>{(rate * 100).toFixed(1)}%</span>
                        </div>
                        <Progress value={rate * 100} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Gas Usage */}
              <Card>
                <CardHeader>
                  <CardTitle>Smart Contract Gas Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={Object.entries(performance.smartContractGasUsage).map(([operation, gas]) => ({
                        operation: operation.replace('_', ' '),
                        gas
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="operation" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="gas" fill="#ff7300" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Error Rates */}
              <Card>
                <CardHeader>
                  <CardTitle>Error Rates by Endpoint</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(performance.errorRates).map(([endpoint, rate]) => (
                      <div key={endpoint} className="space-y-2">
                        <div className="flex justify-between">
                          <span>{endpoint.split('/').pop()}</span>
                          <span className={rate > 0.02 ? 'text-red-600' : 'text-green-600'}>
                            {(rate * 100).toFixed(2)}%
                          </span>
                        </div>
                        <Progress 
                          value={rate * 100} 
                          className={`h-2 ${rate > 0.02 ? 'bg-red-100' : 'bg-green-100'}`} 
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      {rec.title}
                      <Badge className={`ml-2 ${getPriorityColor(rec.priority)}`}>
                        {rec.priority}
                      </Badge>
                    </CardTitle>
                    <Badge variant="outline">{rec.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">{rec.description}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="font-semibold text-sm">Expected Impact:</p>
                      <p className="text-sm text-gray-600">{rec.expectedImpact}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Implementation Effort:</p>
                      <Badge variant="outline" className="capitalize">{rec.implementationEffort}</Badge>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-sm mb-2">Action Items:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {rec.actionItems.map((item, itemIndex) => (
                        <li key={itemIndex} className="text-sm text-gray-600">{item}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};