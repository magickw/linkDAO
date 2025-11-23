import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown,
  Cpu, 
  MemoryStick, 
  HardDrive,
  Network,
  Database,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Gauge
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { CapacityData } from '@/hooks/useSystemHealthMonitoring';

interface CapacityPlanningPanelProps {
  capacityData: CapacityData | null;
  isLoading: boolean;
}

export const CapacityPlanningPanel: React.FC<CapacityPlanningPanelProps> = ({
  capacityData,
  isLoading
}) => {
  const [selectedResource, setSelectedResource] = useState<string>('cpu');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('24h');
  const [activeTab, setActiveTab] = useState('predictions');

  const resourceIcons = {
    cpu: Cpu,
    memory: MemoryStick,
    storage: HardDrive,
    network: Network,
    database_connections: Database
  };

  const getResourceIcon = (resource: string) => {
    const IconComponent = resourceIcons[resource as keyof typeof resourceIcons] || Activity;
    return <IconComponent className="h-4 w-4" />;
  };

  const getResourceColor = (resource: string) => {
    const colors = {
      cpu: 'text-blue-600',
      memory: 'text-purple-600',
      storage: 'text-green-600',
      network: 'text-orange-600',
      database_connections: 'text-red-600'
    };
    return colors[resource as keyof typeof colors] || 'text-gray-600';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatTimeToExhaustion = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return 'Soon';
  };

  const selectedPrediction = useMemo(() => {
    if (!capacityData?.predictions) return null;
    return capacityData.predictions.find(
      p => p.resource === selectedResource && p.timeframe === selectedTimeframe
    );
  }, [capacityData, selectedResource, selectedTimeframe]);

  const costBreakdownData = useMemo(() => {
    if (!capacityData?.costAnalysis) return [];
    
    const breakdown = capacityData.costAnalysis.breakdown;
    return Object.entries(breakdown).map(([key, value]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value: value as number,
      percentage: ((value as number) / capacityData.costAnalysis!.totalCost * 100).toFixed(1)
    }));
  }, [capacityData]);

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
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
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse">
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!capacityData) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No capacity planning data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Capacity Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Scaling Recommendations</p>
                <p className="text-2xl font-bold text-blue-600">
                  {capacityData.scalingRecommendations.length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-400" />
            </div>
            <div className="mt-2">
              <Badge variant="outline" className="text-xs">
                {capacityData.scalingRecommendations.filter(r => r.priority === 'urgent').length} Urgent
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Performance Bottlenecks</p>
                <p className="text-2xl font-bold text-red-600">
                  {capacityData.bottlenecks.length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
            <div className="mt-2">
              <Badge variant="outline" className="text-xs">
                {capacityData.bottlenecks.filter(b => b.severity === 'critical').length} Critical
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Cost</p>
                <p className="text-2xl font-bold text-green-600">
                  {capacityData.costAnalysis ? formatCurrency(capacityData.costAnalysis.totalCost) : 'N/A'}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-400" />
            </div>
            <div className="mt-2">
              <Badge variant="outline" className="text-xs">
                {capacityData.costAnalysis ? 
                  `${formatCurrency(capacityData.costAnalysis.optimizations.reduce((sum, opt) => sum + opt.potentialSavings, 0))} Potential Savings` :
                  'No data'
                }
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resource Efficiency</p>
                <p className="text-2xl font-bold text-purple-600">
                  {capacityData.resourceHistory.length > 0 ? 
                    Math.round((capacityData.resourceHistory[capacityData.resourceHistory.length - 1].cpu + 
                               capacityData.resourceHistory[capacityData.resourceHistory.length - 1].memory) / 2) : 0}%
                </p>
              </div>
              <Gauge className="h-8 w-8 text-purple-400" />
            </div>
            <div className="mt-2">
              <Badge variant="outline" className="text-xs">
                Average Utilization
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Capacity Planning Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="predictions">Resource Predictions</TabsTrigger>
          <TabsTrigger value="recommendations">Scaling Recommendations</TabsTrigger>
          <TabsTrigger value="bottlenecks">Performance Bottlenecks</TabsTrigger>
          <TabsTrigger value="cost">Cost Optimization</TabsTrigger>
        </TabsList>

        {/* Resource Predictions Tab */}
        <TabsContent value="predictions" className="space-y-6">
          {/* Resource and Timeframe Selectors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Resource Usage Predictions
                </div>
                <div className="flex space-x-4">
                  <Select value={selectedResource} onValueChange={setSelectedResource}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpu">CPU</SelectItem>
                      <SelectItem value="memory">Memory</SelectItem>
                      <SelectItem value="storage">Storage</SelectItem>
                      <SelectItem value="network">Network</SelectItem>
                      <SelectItem value="database_connections">DB Connections</SelectItem>
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
                      <SelectItem value="30d">30 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedPrediction ? (
                <div className="space-y-6">
                  {/* Prediction Chart */}
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={selectedPrediction.predictions}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="timestamp" 
                          tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                        />
                        <YAxis />
                        <Tooltip 
                          labelFormatter={(value) => new Date(value).toLocaleString()}
                          formatter={(value: number, name: string) => [
                            `${value.toFixed(1)}%`, 
                            name.charAt(0).toUpperCase() + name.slice(1)
                          ]}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="upperBound" 
                          stackId="1"
                          stroke="none"
                          fill="#e5e7eb"
                          fillOpacity={0.3}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="lowerBound" 
                          stackId="1"
                          stroke="none"
                          fill="#ffffff"
                          fillOpacity={1}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="predicted" 
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="confidence" 
                          stroke="#10b981"
                          strokeWidth={1}
                          strokeDasharray="5 5"
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Prediction Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Warning Threshold</p>
                            <p className="text-lg font-semibold text-yellow-600">
                              {selectedPrediction.thresholds.warning}%
                            </p>
                          </div>
                          <AlertTriangle className="h-6 w-6 text-yellow-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Critical Threshold</p>
                            <p className="text-lg font-semibold text-red-600">
                              {selectedPrediction.thresholds.critical}%
                            </p>
                          </div>
                          <AlertTriangle className="h-6 w-6 text-red-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Time to Exhaustion</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {selectedPrediction.projectedExhaustion ? 
                                formatTimeToExhaustion(selectedPrediction.projectedExhaustion.date) :
                                'Not projected'
                              }
                            </p>
                          </div>
                          <Clock className="h-6 w-6 text-gray-600" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600">No prediction data available for selected resource and timeframe</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resource History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Resource Usage History (24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={capacityData.resourceHistory.slice(-50)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                    />
                    <Line type="monotone" dataKey="cpu" stroke="#3b82f6" name="CPU" />
                    <Line type="monotone" dataKey="memory" stroke="#8b5cf6" name="Memory" />
                    <Line type="monotone" dataKey="storage" stroke="#10b981" name="Storage" />
                    <Line type="monotone" dataKey="network" stroke="#f59e0b" name="Network" />
                    <Line type="monotone" dataKey="connections" stroke="#ef4444" name="DB Connections" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scaling Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Auto-Scaling Recommendations ({capacityData.scalingRecommendations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {capacityData.scalingRecommendations.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No scaling recommendations</h3>
                  <p className="text-gray-600">System resources are optimally configured</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {capacityData.scalingRecommendations.map((recommendation) => (
                    <div key={recommendation.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={getResourceColor(recommendation.component)}>
                            {getResourceIcon(recommendation.component)}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{recommendation.component}</h4>
                            <p className="text-sm text-gray-600 capitalize">
                              {recommendation.action.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <Badge className={getPriorityColor(recommendation.priority)}>
                          {recommendation.priority}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Trigger Metrics</h5>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Metric:</span>
                              <span className="font-medium">{recommendation.trigger.metric}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Current:</span>
                              <span className="font-medium">{recommendation.trigger.currentValue.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Threshold:</span>
                              <span className="font-medium">{recommendation.trigger.threshold}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Cost Impact</h5>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Current Cost:</span>
                              <span className="font-medium">{formatCurrency(recommendation.costOptimization.currentCost)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Projected Cost:</span>
                              <span className="font-medium">{formatCurrency(recommendation.costOptimization.projectedCost)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className={`font-medium ${recommendation.costOptimization.savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {recommendation.costOptimization.savings >= 0 ? 'Savings:' : 'Additional Cost:'}
                              </span>
                              <span className={`font-medium ${recommendation.costOptimization.savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(Math.abs(recommendation.costOptimization.savings))}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <h5 className="font-medium text-gray-900 mb-2">Recommendation</h5>
                        <p className="text-sm text-gray-700 mb-2">{recommendation.recommendation.estimatedImpact}</p>
                        <div className="text-sm text-gray-600">
                          Target Capacity: <span className="font-medium">{recommendation.recommendation.targetCapacity}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                          <Clock className="h-4 w-4 inline mr-1" />
                          {new Date(recommendation.timestamp).toLocaleString()}
                        </div>
                        <Button size="small" variant="outline">
                          Apply Recommendation
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Bottlenecks Tab */}
        <TabsContent value="bottlenecks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                Performance Bottlenecks ({capacityData.bottlenecks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {capacityData.bottlenecks.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No performance bottlenecks detected</h3>
                  <p className="text-gray-600">System is performing optimally</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {capacityData.bottlenecks.map((bottleneck) => (
                    <div key={bottleneck.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={getResourceColor(bottleneck.type)}>
                            {getResourceIcon(bottleneck.type)}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{bottleneck.component}</h4>
                            <p className="text-sm text-gray-600 capitalize">{bottleneck.type} bottleneck</p>
                          </div>
                        </div>
                        <Badge className={getSeverityColor(bottleneck.severity)}>
                          {bottleneck.severity}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Performance Impact</h5>
                          <div className="space-y-2">
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span>Performance Degradation</span>
                                <span>{bottleneck.impact.performanceDegradation.toFixed(1)}%</span>
                              </div>
                              <Progress value={bottleneck.impact.performanceDegradation} className="h-2" />
                            </div>
                            <div className="text-sm">
                              <span className="text-gray-600">User Experience Impact:</span>
                              <span className={`ml-2 font-medium ${
                                bottleneck.impact.userExperienceImpact === 'severe' ? 'text-red-600' :
                                bottleneck.impact.userExperienceImpact === 'significant' ? 'text-orange-600' :
                                bottleneck.impact.userExperienceImpact === 'moderate' ? 'text-yellow-600' :
                                'text-green-600'
                              }`}>
                                {bottleneck.impact.userExperienceImpact}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Resolution</h5>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Estimated Effort:</span>
                              <span className="font-medium capitalize">{bottleneck.resolution.estimatedEffort}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Estimated Cost:</span>
                              <span className="font-medium">{formatCurrency(bottleneck.resolution.estimatedCost)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Timeline:</span>
                              <span className="font-medium">{bottleneck.resolution.timeline}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <h5 className="font-medium text-gray-900 mb-2">Affected Services</h5>
                        <div className="flex flex-wrap gap-2">
                          {bottleneck.impact.affectedServices.map((service: any, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {service}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="mb-4">
                        <h5 className="font-medium text-gray-900 mb-2">Recommended Actions</h5>
                        <ul className="text-sm text-gray-700 space-y-1">
                          {bottleneck.resolution.recommendations.slice(0, 3).map((recommendation: string, index: number) => (
                            <li key={index} className="flex items-start">
                              <span className="text-green-500 mr-2">•</span>
                              <span>{recommendation}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex justify-end">
                        <Button size="small" variant="outline">
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

        {/* Cost Optimization Tab */}
        <TabsContent value="cost" className="space-y-6">
          {capacityData.costAnalysis ? (
            <>
              {/* Cost Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <DollarSign className="h-5 w-5 mr-2" />
                      Monthly Cost Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center mb-4">
                      <div className="text-3xl font-bold text-gray-900">
                        {formatCurrency(capacityData.costAnalysis.totalCost)}
                      </div>
                      <div className="text-sm text-gray-600">Total Monthly Cost</div>
                    </div>
                    
                    <div className="h-48 mb-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={costBreakdownData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${percent}%`}
                          >
                            {costBreakdownData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(value as number)} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-2">
                      {costBreakdownData.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span>{item.name}</span>
                          </div>
                          <span className="font-medium">{formatCurrency(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Target className="h-5 w-5 mr-2" />
                      Optimization Opportunities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center mb-4">
                      <div className="text-3xl font-bold text-green-600">
                        {formatCurrency(capacityData.costAnalysis.optimizations.reduce((sum, opt) => sum + opt.potentialSavings, 0))}
                      </div>
                      <div className="text-sm text-gray-600">Potential Monthly Savings</div>
                    </div>

                    <div className="space-y-3">
                      {capacityData.costAnalysis.optimizations.slice(0, 4).map((optimization, index) => (
                        <div key={index} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-gray-900">{optimization.category}</h5>
                            <Badge variant="outline" className="text-green-600">
                              {formatCurrency(optimization.potentialSavings)}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{optimization.description}</p>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Risk: {optimization.risk}</span>
                            <span>Effort: {optimization.effort}</span>
                            <span className="capitalize">{optimization.implementation}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right-sizing Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Gauge className="h-5 w-5 mr-2" />
                    Right-sizing Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {capacityData.costAnalysis.rightsizing.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                      <p className="text-green-600 font-medium">Resources are optimally sized</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {capacityData.costAnalysis.rightsizing.map((item, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-medium text-gray-900">{item.resource}</h5>
                            <Badge variant="outline" className="text-green-600">
                              {formatCurrency(item.savings)} savings
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Current Size:</span>
                              <div className="font-medium">{item.currentSize}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Recommended Size:</span>
                              <div className="font-medium text-blue-600">{item.recommendedSize}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Utilization:</span>
                              <div className="font-medium">{item.utilization.toFixed(1)}%</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No cost analysis data available</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};