import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface InsightMetric {
  name: string;
  value: number;
  change: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

interface TrendDataPoint {
  timestamp: string;
  engagement?: number;
  quality?: number;
  systemHealth?: number;
  growthRate?: number;
  anomalyCount?: number;
}

// Chart data interface for Recharts
interface ChartDataPoint {
  date: string;
  engagement?: number;
  quality?: number;
  health?: number;
  [key: string]: any;
}

interface Prediction {
  id: string;
  description: string;
  details: string;
  confidence: number;
  impact: number;
  category: string;
  timeline: string;
}

interface Anomaly {
  id: string;
  description: string;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  type: string;
  timestamp: string;
}

interface AnomalyDistribution {
  name: string;
  value: number;
  [key: string]: any;
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  impact: 'low' | 'medium' | 'high' | 'critical';
  category: string;
}

interface ComprehensiveInsightReport {
  generatedAt: string;
  timeframe: string;
  summary: {
    totalInsights: number;
    criticalAlerts: number;
    opportunities: number;
    risks: number;
    trends: number;
    anomalies: number;
  };
  insights: any[];
  predictions: Prediction[];
  anomalies: Anomaly[];
  trendAnalysis: TrendDataPoint[];
  recommendations: Recommendation[];
  nextActions: string[];
  userEngagementScore: number;
  userEngagementChange: number;
  userEngagementTrend: 'increasing' | 'decreasing' | 'stable';
  contentQualityScore: number;
  contentQualityChange: number;
  contentQualityTrend: 'increasing' | 'decreasing' | 'stable';
  systemHealthScore: number;
  systemHealthChange: number;
  systemHealthTrend: 'increasing' | 'decreasing' | 'stable';
  anomalyCount: number;
  anomalyCountChange: number;
  anomalyCountTrend: 'increasing' | 'decreasing' | 'stable';
  anomalyDistribution: AnomalyDistribution[];
}

interface AIInsightsOverviewProps {
  report: ComprehensiveInsightReport | null;
  loading: boolean;
  timeframe: string;
  onRefresh: () => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const AIInsightsOverview: React.FC<AIInsightsOverviewProps> = ({ 
  report, 
  loading, 
  timeframe,
  onRefresh 
}) => {
  const [metricData, setMetricData] = useState<InsightMetric[]>([]);
  const [trendData, setTrendData] = useState<ChartDataPoint[]>([]);

  useEffect(() => {
    if (report) {
      setMetricData([
        {
          name: 'User Engagement',
          value: report.userEngagementScore,
          change: report.userEngagementChange,
          trend: report.userEngagementTrend
        },
        {
          name: 'Content Quality',
          value: report.contentQualityScore,
          change: report.contentQualityChange,
          trend: report.contentQualityTrend
        },
        {
          name: 'System Health',
          value: report.systemHealthScore,
          change: report.systemHealthChange,
          trend: report.systemHealthTrend
        },
        {
          name: 'Anomaly Count',
          value: report.anomalyCount,
          change: report.anomalyCountChange,
          trend: report.anomalyCountTrend
        }
      ]);

      // Transform trend data for charting
      if (report.trendAnalysis) {
        const trendPoints = report.trendAnalysis.map((trend, index) => ({
          date: `Day ${index + 1}`,
          engagement: trend.engagement,
          quality: trend.quality,
          health: trend.systemHealth,
          timestamp: trend.timestamp
        }));
        setTrendData(trendPoints);
      }
    }
  }, [report]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No AI insights data available</p>
        <Button onClick={onRefresh} className="mt-4">Refresh Data</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricData.map((metric, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {typeof metric.value === 'number' ? metric.value.toFixed(2) : metric.value}
              </div>
              <div className="flex items-center mt-2">
                <Badge 
                  variant={metric.change >= 0 ? "default" : "destructive"}
                  className="text-xs"
                >
                  {metric.change >= 0 ? '↑' : '↓'} {Math.abs(metric.change)}%
                </Badge>
                <span className="text-xs text-gray-500 ml-2">
                  vs previous {timeframe}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trend Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Trend Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
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
                />
                <Line 
                  type="monotone" 
                  dataKey="quality" 
                  stroke="#00C49F" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="health" 
                  stroke="#FF8042" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Anomaly Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Anomaly Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={report.anomalyDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => {
                      if (typeof percent === 'number') {
                        return `${name}: ${(percent * 100).toFixed(0)}%`;
                      }
                      return `${name}: ${percent}`;
                    }}
                  >
                    {report.anomalyDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Predictions */}
        <Card>
          <CardHeader>
            <CardTitle>Top Predictions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {report.predictions.slice(0, 5).map((prediction, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{prediction.description}</div>
                    <div className="text-sm text-gray-500">
                      Confidence: {(prediction.confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                  <Badge variant="outline">
                    {prediction.category}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>AI Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {report.recommendations.slice(0, 3).map((recommendation, index) => (
              <div key={index} className="p-4 border rounded-lg bg-blue-50">
                <div className="flex items-start">
                  <div className="flex-1">
                    <h4 className="font-medium">{recommendation.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{recommendation.description}</p>
                    <div className="flex items-center mt-2">
                      <Badge variant="secondary" className="mr-2">
                        Priority: {recommendation.priority}
                      </Badge>
                      <Badge variant="outline">
                        Impact: {recommendation.impact}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Implement
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};