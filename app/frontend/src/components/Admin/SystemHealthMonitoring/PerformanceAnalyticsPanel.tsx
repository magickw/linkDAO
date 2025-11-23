import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Target,
  Zap,
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle,
  Eye,
  Settings,
  Gauge,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar,
  ScatterChart,
  Scatter
} from 'recharts';
import { PerformanceData } from '@/hooks/useSystemHealthMonitoring';

interface PerformanceAnalyticsPanelProps {
  performanceData: PerformanceData | null;
  isLoading: boolean;
}

export const PerformanceAnalyticsPanel: React.FC<PerformanceAnalyticsPanelProps> = ({
  performanceData,
  isLoading
}) => {
  const [selectedMetric, setSelectedMetric] = useState<string>('response_time_avg');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('24h');
  const [activeTab, setActiveTab] = useState('metrics');

  const getBenchmarkStatus = (benchmark: any) => {
    const deviation = Math.abs(benchmark.current - benchmark.target) / benchmark.target * 100;
    if (deviation <= 10) return { status: 'good', color: 'text-green-600' };
    if (deviation <= 25) return { status: 'warning', color: 'text-yellow-600' };
    return { status: 'critical', color: 'text-red-600' };
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'degrading': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatMetricValue = (value: number, unit: string) => {
    if (unit === 'ms') return `${value.toFixed(1)}ms`;
    if (unit === '%') return `${value.toFixed(1)}%`;
    if (unit === 'req/s') return `${value.toFixed(1)} req/s`;
    return `${value.toFixed(2)} ${unit}`;
  };

  const selectedTrendAnalysis = useMemo(() => {
    if (!performanceData?.trendAnalyses) return null;
    return performanceData.trendAnalyses.find(
      analysis => analysis.metric === selectedMetric && analysis.timeframe === selectedTimeframe
    );
  }, [performanceData, selectedMetric, selectedTimeframe]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!performanceData) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No performance analytics data available</p>
      </div>
    );
  }  return (
    <div className="space-y-6">
      {/* Performance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Benchmarks</p>
                <p className="text-2xl font-bold text-blue-600">
                  {performanceData.benchmarks.length}
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-400" />
            </div>
            <div className="mt-2">
              <Badge variant="outline" className="text-xs">
                {performanceData.benchmarks.filter(b => getBenchmarkStatus(b).status === 'good').length} Meeting Targets
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Optimization Recommendations</p>
                <p className="text-2xl font-bold text-orange-600">
                  {performanceData.optimizationRecommendations.length}
                </p>
              </div>
              <Zap className="h-8 w-8 text-orange-400" />
            </div>
            <div className="mt-2">
              <Badge variant="outline" className="text-xs">
                {performanceData.optimizationRecommendations.filter(r => r.priority === 'critical').length} Critical
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Trend Analyses</p>
                <p className="text-2xl font-bold text-purple-600">
                  {performanceData.trendAnalyses.length}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-400" />
            </div>
            <div className="mt-2">
              <Badge variant="outline" className="text-xs">
                {performanceData.trendAnalyses.filter(t => t.trend.direction === 'up').length} Improving
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Impact Assessments</p>
                <p className="text-2xl font-bold text-green-600">
                  {performanceData.impactAssessments.length}
                </p>
              </div>
              <Eye className="h-8 w-8 text-green-400" />
            </div>
            <div className="mt-2">
              <Badge variant="outline" className="text-xs">
                {performanceData.impactAssessments.filter(i => i.impact.overall === 'positive').length} Positive
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks & SLAs</TabsTrigger>
          <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
          <TabsTrigger value="recommendations">Optimization</TabsTrigger>
        </TabsList>

        {/* Performance Metrics Tab */}
        <TabsContent value="metrics" className="space-y-6">
          {/* Metric Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <LineChartIcon className="h-5 w-5 mr-2" />
                  Performance Metrics
                </div>
                <div className="flex space-x-4">
                  <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="response_time_avg">Avg Response Time</SelectItem>
                      <SelectItem value="response_time_p95">P95 Response Time</SelectItem>
                      <SelectItem value="throughput">Throughput</SelectItem>
                      <SelectItem value="error_rate">Error Rate</SelectItem>
                      <SelectItem value="cpu_utilization">CPU Utilization</SelectItem>
                      <SelectItem value="memory_utilization">Memory Utilization</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceData.metrics.filter(m => m.name === selectedMetric).slice(-50)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                      formatter={(value: number, name: string, props: any) => [
                        formatMetricValue(value, props.payload.unit),
                        name
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Current Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {performanceData.metrics
              .filter((metric, index, self) => 
                index === self.findIndex(m => m.name === metric.name)
              )
              .slice(0, 6)
              .map((metric) => {
                const latestValue = performanceData.metrics
                  .filter(m => m.name === metric.name)
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                
                return (
                  <Card key={metric.name}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900 text-sm">
                          {metric.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </h4>
                        <Activity className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {formatMetricValue(latestValue.value, latestValue.unit)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(latestValue.timestamp).toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </TabsContent>

        {/* Benchmarks & SLAs Tab */}
        <TabsContent value="benchmarks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Performance Benchmarks & SLAs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performanceData.benchmarks.map((benchmark) => {
                  const status = getBenchmarkStatus(benchmark);
                  const achievementRate = (benchmark.current / benchmark.target) * 100;
                  
                  return (
                    <div key={benchmark.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{benchmark.name}</h4>
                          <p className="text-sm text-gray-600 capitalize">{benchmark.category.replace('_', ' ')}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getTrendIcon(benchmark.trend)}
                          <Badge variant="outline" className={status.color}>
                            {status.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900">{benchmark.current.toFixed(1)}</div>
                          <div className="text-xs text-gray-600">Current</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600">{benchmark.target.toFixed(1)}</div>
                          <div className="text-xs text-gray-600">Target</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-lg font-bold ${status.color}`}>
                            {achievementRate.toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-600">Achievement</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-600">{benchmark.sla.uptime.toFixed(1)}%</div>
                          <div className="text-xs text-gray-600">SLA Uptime</div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span>SLA Performance</span>
                          <span>{benchmark.sla.current.toFixed(1)}%</span>
                        </div>
                        <Progress value={benchmark.sla.current} className="h-2" />
                      </div>

                      <div className="h-32">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={benchmark.historical.slice(-20)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="timestamp" 
                              tickFormatter={(value) => new Date(value).toLocaleDateString()}
                            />
                            <YAxis />
                            <Tooltip 
                              labelFormatter={(value) => new Date(value).toLocaleString()}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="value" 
                              stroke="#3b82f6"
                              fill="#3b82f6"
                              fillOpacity={0.1}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trend Analysis Tab */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Performance Trend Analysis
                </div>
                <div className="flex space-x-4">
                  <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="response_time_avg">Avg Response Time</SelectItem>
                      <SelectItem value="throughput">Throughput</SelectItem>
                      <SelectItem value="error_rate">Error Rate</SelectItem>
                      <SelectItem value="cpu_utilization">CPU Utilization</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">1 Hour</SelectItem>
                      <SelectItem value="6h">6 Hours</SelectItem>
                      <SelectItem value="24h">24 Hours</SelectItem>
                      <SelectItem value="7d">7 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedTrendAnalysis ? (
                <div className="space-y-6">
                  {/* Trend Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-2">
                            {getTrendIcon(selectedTrendAnalysis.trend.direction)}
                          </div>
                          <div className="text-lg font-bold capitalize">
                            {selectedTrendAnalysis.trend.direction}
                          </div>
                          <div className="text-xs text-gray-600">Trend Direction</div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600">
                            {Math.round(selectedTrendAnalysis.trend.confidence * 100)}%
                          </div>
                          <div className="text-xs text-gray-600">Confidence</div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-purple-600">
                            {selectedTrendAnalysis.statistics.mean.toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-600">Mean Value</div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-orange-600">
                            {selectedTrendAnalysis.anomalies.length}
                          </div>
                          <div className="text-xs text-gray-600">Anomalies</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Forecast Chart */}
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart>
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
                          data={selectedTrendAnalysis.forecast}
                          type="monotone" 
                          dataKey="predicted" 
                          stroke="#10b981"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                          name="Forecast"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Statistics Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Statistical Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Mean:</span>
                            <span className="font-medium">{selectedTrendAnalysis.statistics.mean.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Median:</span>
                            <span className="font-medium">{selectedTrendAnalysis.statistics.median.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">95th Percentile:</span>
                            <span className="font-medium">{selectedTrendAnalysis.statistics.p95.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">99th Percentile:</span>
                            <span className="font-medium">{selectedTrendAnalysis.statistics.p99.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Std Deviation:</span>
                            <span className="font-medium">{selectedTrendAnalysis.statistics.stdDev.toFixed(2)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Seasonality Analysis</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Pattern Detected:</span>
                            <Badge variant={selectedTrendAnalysis.seasonality.detected ? "default" : "secondary"}>
                              {selectedTrendAnalysis.seasonality.detected ? 'Yes' : 'No'}
                            </Badge>
                          </div>
                          {selectedTrendAnalysis.seasonality.detected && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Pattern Type:</span>
                                <span className="font-medium capitalize">{selectedTrendAnalysis.seasonality.pattern}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Strength:</span>
                                <div className="flex items-center">
                                  <Progress value={selectedTrendAnalysis.seasonality.strength * 100} className="w-16 mr-2" />
                                  <span className="text-sm">{Math.round(selectedTrendAnalysis.seasonality.strength * 100)}%</span>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600">No trend analysis available for selected metric and timeframe</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Optimization Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                Performance Optimization Recommendations ({performanceData.optimizationRecommendations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {performanceData.optimizationRecommendations.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No optimization recommendations</h3>
                  <p className="text-gray-600">System performance is optimal</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {performanceData.optimizationRecommendations.map((recommendation) => (
                    <div key={recommendation.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{recommendation.recommendation.title}</h4>
                          <p className="text-sm text-gray-600 capitalize">{recommendation.category} optimization</p>
                        </div>
                        <Badge className={getPriorityColor(recommendation.priority)}>
                          {recommendation.priority}
                        </Badge>
                      </div>

                      <div className="mb-4">
                        <h5 className="font-medium text-gray-900 mb-2">Issue Description</h5>
                        <p className="text-sm text-gray-700">{recommendation.issue.description}</p>
                        <div className="mt-2 flex items-center space-x-4 text-sm">
                          <span className="text-gray-600">Impact: 
                            <span className={`ml-1 font-medium ${
                              recommendation.issue.impact === 'critical' ? 'text-red-600' :
                              recommendation.issue.impact === 'high' ? 'text-orange-600' :
                              recommendation.issue.impact === 'medium' ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              {recommendation.issue.impact}
                            </span>
                          </span>
                          <span className="text-gray-600">Root Cause: 
                            <span className="ml-1 font-medium">{recommendation.issue.rootCause}</span>
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Expected Improvements</h5>
                          <div className="space-y-1 text-sm">
                            {Object.entries(recommendation.metrics.improvement).map(([metric, improvement]) => (
                              <div key={metric} className="flex justify-between">
                                <span className="text-gray-600 capitalize">{metric.replace('_', ' ')}:</span>
                                <span className="font-medium text-green-600">
                                  +{(improvement as number).toFixed(1)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Implementation</h5>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Effort:</span>
                              <span className="font-medium capitalize">{recommendation.recommendation.estimatedEffort}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Cost:</span>
                              <span className="font-medium">${recommendation.recommendation.estimatedCost}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Timeline:</span>
                              <span className="font-medium">{recommendation.recommendation.timeline}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <h5 className="font-medium text-gray-900 mb-2">Implementation Steps</h5>
                        <ul className="text-sm text-gray-700 space-y-1">
                          {recommendation.recommendation.steps.slice(0, 3).map((step: any, index: number) => (
                            <li key={index} className="flex items-start">
                              <span className="text-blue-600 mr-2">{index + 1}.</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                          <Clock className="h-4 w-4 inline mr-1" />
                          {new Date(recommendation.timestamp).toLocaleString()}
                        </div>
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};