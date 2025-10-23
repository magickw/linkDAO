import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ComposedChart, Bar } from 'recharts';

interface TrendDataPoint {
  timestamp: string;
  engagement?: number;
  quality?: number;
  systemHealth?: number;
  growthRate?: number;
  anomalyCount?: number;
}

interface TrendAnalysisProps {
  trends: TrendDataPoint[];
  loading: boolean;
}

export const TrendAnalysis: React.FC<TrendAnalysisProps> = ({ trends, loading }) => {
  const [metricFilter, setMetricFilter] = useState<'all' | 'engagement' | 'quality' | 'health' | 'growth'>('all');
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d');
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line');

  // Filter trends based on metric
  const filteredTrends = metricFilter === 'all' 
    ? trends 
    : trends.filter(trend => 
        (metricFilter === 'engagement' && trend.engagement) ||
        (metricFilter === 'quality' && trend.quality) ||
        (metricFilter === 'health' && trend.systemHealth) ||
        (metricFilter === 'growth' && trend.growthRate)
      );

  // Prepare data for different chart types
  const chartData = filteredTrends.map(trend => ({
    date: new Date(trend.timestamp).toLocaleDateString(),
    engagement: trend.engagement,
    quality: trend.quality,
    health: trend.systemHealth,
    growth: trend.growthRate,
    anomalies: trend.anomalyCount,
    timestamp: trend.timestamp
  }));

  // Calculate trend indicators
  const calculateTrend = (data: number[]) => {
    if (data.length < 2) return 'stable';
    const first = data[0];
    const last = data[data.length - 1];
    const change = ((last - first) / first) * 100;
    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
  };

  const engagementTrend = calculateTrend(chartData.map(d => d.engagement).filter((d): d is number => d !== undefined));
  const qualityTrend = calculateTrend(chartData.map(d => d.quality).filter((d): d is number => d !== undefined));
  const healthTrend = calculateTrend(chartData.map(d => d.health).filter((d): d is number => d !== undefined));
  const growthTrend = calculateTrend(chartData.map(d => d.growth).filter((d): d is number => d !== undefined));

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-medium mb-1 block">Metric</label>
          <Select value={metricFilter} onValueChange={(value) => setMetricFilter(value as 'all' | 'engagement' | 'quality' | 'health' | 'growth')}>
            <SelectTrigger>
              <SelectValue placeholder="Select metric" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Metrics</SelectItem>
              <SelectItem value="engagement">User Engagement</SelectItem>
              <SelectItem value="quality">Content Quality</SelectItem>
              <SelectItem value="health">System Health</SelectItem>
              <SelectItem value="growth">Growth Rate</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-medium mb-1 block">Timeframe</label>
          <Select value={timeframe} onValueChange={(value) => setTimeframe(value as '7d' | '30d' | '90d')}>
            <SelectTrigger>
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-medium mb-1 block">Chart Type</label>
          <Select value={chartType} onValueChange={(value) => setChartType(value as 'line' | 'area' | 'bar')}>
            <SelectTrigger>
              <SelectValue placeholder="Select chart type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="line">Line Chart</SelectItem>
              <SelectItem value="area">Area Chart</SelectItem>
              <SelectItem value="bar">Bar Chart</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Trend Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">User Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {chartData.length > 0 && chartData[chartData.length - 1].engagement !== undefined ? chartData[chartData.length - 1].engagement?.toFixed(2) : 'N/A'}
            </div>
            <div className="flex items-center mt-2">
              <Badge 
                variant={engagementTrend === 'increasing' ? "default" : engagementTrend === 'decreasing' ? "destructive" : "secondary"}
                className="text-xs"
              >
                {engagementTrend === 'increasing' ? '↑' : engagementTrend === 'decreasing' ? '↓' : '→'} Trending
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Content Quality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {chartData.length > 0 && chartData[chartData.length - 1].quality !== undefined ? chartData[chartData.length - 1].quality?.toFixed(2) : 'N/A'}
            </div>
            <div className="flex items-center mt-2">
              <Badge 
                variant={qualityTrend === 'increasing' ? "default" : qualityTrend === 'decreasing' ? "destructive" : "secondary"}
                className="text-xs"
              >
                {qualityTrend === 'increasing' ? '↑' : qualityTrend === 'decreasing' ? '↓' : '→'} Trending
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {chartData.length > 0 && chartData[chartData.length - 1].health !== undefined ? chartData[chartData.length - 1].health?.toFixed(2) : 'N/A'}
            </div>
            <div className="flex items-center mt-2">
              <Badge 
                variant={healthTrend === 'increasing' ? "default" : healthTrend === 'decreasing' ? "destructive" : "secondary"}
                className="text-xs"
              >
                {healthTrend === 'increasing' ? '↑' : healthTrend === 'decreasing' ? '↓' : '→'} Trending
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {chartData.length > 0 && chartData[chartData.length - 1].growth !== undefined ? chartData[chartData.length - 1].growth?.toFixed(2) : 'N/A'}
            </div>
            <div className="flex items-center mt-2">
              <Badge 
                variant={growthTrend === 'increasing' ? "default" : growthTrend === 'decreasing' ? "destructive" : "secondary"}
                className="text-xs"
              >
                {growthTrend === 'increasing' ? '↑' : growthTrend === 'decreasing' ? '↓' : '→'} Trending
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Metrics Trend Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="engagement" 
                    stroke="#0088FE" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }} 
                    name="Engagement"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="quality" 
                    stroke="#00C49F" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }} 
                    name="Quality"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="health" 
                    stroke="#FF8042" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }} 
                    name="System Health"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="growth" 
                    stroke="#8884D8" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }} 
                    name="Growth Rate"
                  />
                </LineChart>
              ) : chartType === 'area' ? (
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="engagement" 
                    stackId="1" 
                    stroke="#0088FE" 
                    fill="#0088FE" 
                    fillOpacity={0.6}
                    name="Engagement"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="quality" 
                    stackId="2" 
                    stroke="#00C49F" 
                    fill="#00C49F" 
                    fillOpacity={0.6}
                    name="Quality"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="health" 
                    stackId="3" 
                    stroke="#FF8042" 
                    fill="#FF8042" 
                    fillOpacity={0.6}
                    name="System Health"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="growth" 
                    stackId="4" 
                    stroke="#8884D8" 
                    fill="#8884D8" 
                    fillOpacity={0.6}
                    name="Growth Rate"
                  />
                </AreaChart>
              ) : (
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar 
                    dataKey="engagement" 
                    fill="#0088FE" 
                    name="Engagement"
                  />
                  <Bar 
                    dataKey="quality" 
                    fill="#00C49F" 
                    name="Quality"
                  />
                  <Bar 
                    dataKey="health" 
                    fill="#FF8042" 
                    name="System Health"
                  />
                  <Bar 
                    dataKey="growth" 
                    fill="#8884D8" 
                    name="Growth Rate"
                  />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Anomaly Correlation */}
      <Card>
        <CardHeader>
          <CardTitle>Anomaly Correlation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Bar 
                  yAxisId="left"
                  dataKey="anomalies" 
                  fill="#ef4444" 
                  name="Anomalies"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="engagement" 
                  stroke="#0088FE" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }} 
                  name="Engagement"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            This chart shows the correlation between detected anomalies and user engagement over time.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};