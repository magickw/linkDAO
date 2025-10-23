import React, { useState, useEffect } from 'react';
import { adminService } from '../../../services/adminService';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { AIInsightsOverview } from './AIInsightsOverview';
import { PredictiveAnalytics } from './PredictiveAnalytics';
import { AnomalyDetection } from './AnomalyDetection';
import { TrendAnalysis } from './TrendAnalysis';

// Type definitions to match child components
interface InsightMetric {
  name: string;
  value: number;
  change: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

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

interface TrendDataPoint {
  timestamp: string;
  engagement?: number;
  quality?: number;
  systemHealth?: number;
  growthRate?: number;
  anomalyCount?: number;
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

interface EngineStatus {
  isRunning: boolean;
  lastUpdate: string;
  componentsStatus: {
    predictiveAnalytics: 'active' | 'inactive' | 'error';
    anomalyDetection: 'active' | 'inactive' | 'error';
    automatedInsights: 'active' | 'inactive' | 'error';
    trendAnalysis: 'active' | 'inactive' | 'error';
  };
  performance: {
    totalInsightsGenerated: number;
    averageProcessingTime: number;
    errorRate: number;
    lastError?: string;
  };
}

export const AIInsightsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'predictions' | 'anomalies' | 'trends'>('overview');
  const [engineStatus, setEngineStatus] = useState<EngineStatus | null>(null);
  const [insightsReport, setInsightsReport] = useState<ComprehensiveInsightReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState<'hourly' | 'daily' | 'weekly' | 'monthly'>('daily');

  const fetchAIInsights = async () => {
    try {
      setLoading(true);
      const [report, status] = await Promise.all([
        adminService.getAIInsightsReport(timeframe),
        adminService.getAIEngineStatus()
      ]);
      
      // Transform the report to match our interface
      const transformedReport: ComprehensiveInsightReport = {
        generatedAt: report.generatedAt || new Date().toISOString(),
        timeframe: report.timeframe || timeframe,
        summary: report.summary || {
          totalInsights: 0,
          criticalAlerts: 0,
          opportunities: 0,
          risks: 0,
          trends: 0,
          anomalies: 0
        },
        insights: report.insights || [],
        predictions: Array.isArray(report.predictions) 
          ? report.predictions.map((pred: any, index: number) => ({
              id: pred.id || `pred-${index}`,
              description: pred.description || 'Prediction',
              details: pred.details || 'No details available',
              confidence: pred.confidence || 0,
              impact: pred.impact || 0,
              category: pred.category || 'general',
              timeline: pred.timeline || 'unknown'
            }))
          : [],
        anomalies: Array.isArray(report.anomalies)
          ? report.anomalies.map((anom: any, index: number) => ({
              id: anom.id || `anom-${index}`,
              description: anom.description || 'Anomaly detected',
              details: anom.details || 'No details available',
              severity: anom.severity || 'low',
              confidence: anom.confidence || 0,
              type: anom.type || 'unknown',
              timestamp: anom.timestamp || new Date().toISOString()
            }))
          : [],
        trendAnalysis: Array.isArray(report.trends)
          ? report.trends.map((trend: any) => ({
              timestamp: trend.timestamp || new Date().toISOString(),
              engagement: trend.engagement,
              quality: trend.quality,
              systemHealth: trend.systemHealth,
              growthRate: trend.growthRate,
              anomalyCount: trend.anomalyCount
            }))
          : [],
        recommendations: Array.isArray(report.recommendations)
          ? report.recommendations.map((rec: any, index: number) => ({
              id: `rec-${index}`,
              title: typeof rec === 'string' ? rec : rec.title || 'Recommendation',
              description: typeof rec === 'string' ? rec : rec.description || rec,
              priority: 'medium',
              impact: 'medium',
              category: 'general'
            }))
          : [],
        nextActions: report.nextActions || [],
        userEngagementScore: 75,
        userEngagementChange: 5,
        userEngagementTrend: 'increasing',
        contentQualityScore: 82,
        contentQualityChange: -2,
        contentQualityTrend: 'decreasing',
        systemHealthScore: 95,
        systemHealthChange: 1,
        systemHealthTrend: 'increasing',
        anomalyCount: report.anomalies?.length || 0,
        anomalyCountChange: -1,
        anomalyCountTrend: 'decreasing',
        anomalyDistribution: [
          { name: 'Critical', value: report.anomalies?.filter((a: any) => a.severity === 'critical').length || 0 },
          { name: 'High', value: report.anomalies?.filter((a: any) => a.severity === 'high').length || 0 },
          { name: 'Medium', value: report.anomalies?.filter((a: any) => a.severity === 'medium').length || 0 },
          { name: 'Low', value: report.anomalies?.filter((a: any) => a.severity === 'low').length || 0 }
        ]
      };
      
      setInsightsReport(transformedReport);
      setEngineStatus(status);
    } catch (error) {
      console.error('Failed to fetch AI insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAIInsights();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchAIInsights();
  }, [timeframe]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">AI Insights Dashboard</h1>
          <p className="text-gray-600">Machine learning powered analytics and predictions</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeframe} onValueChange={(value) => setTimeframe(value as 'hourly' | 'daily' | 'weekly' | 'monthly')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={handleRefresh} 
            disabled={refreshing}
            variant="outline"
          >
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </Button>
        </div>
      </div>

      {/* Engine Status */}
      {engineStatus && (
        <Card>
          <CardHeader>
            <CardTitle>AI Engine Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${engineStatus.isRunning ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>{engineStatus.isRunning ? 'Running' : 'Stopped'}</span>
                <span className="text-gray-500">Models: {Object.keys(engineStatus.componentsStatus).length}</span>
                <span className="text-gray-500">Last Update: {new Date(engineStatus.lastUpdate).toLocaleString()}</span>
              </div>
              <Button variant="outline" size="sm">
                {engineStatus.isRunning ? 'Stop Engine' : 'Start Engine'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6">
          <AIInsightsOverview 
            report={insightsReport} 
            loading={loading} 
            timeframe={timeframe}
            onRefresh={handleRefresh}
          />
        </TabsContent>
        
        <TabsContent value="predictions" className="mt-6">
          <PredictiveAnalytics 
            predictions={insightsReport?.predictions || []} 
            loading={loading} 
          />
        </TabsContent>
        
        <TabsContent value="anomalies" className="mt-6">
          <AnomalyDetection 
            anomalies={insightsReport?.anomalies || []} 
            loading={loading} 
          />
        </TabsContent>
        
        <TabsContent value="trends" className="mt-6">
          <TrendAnalysis 
            trends={insightsReport?.trendAnalysis || []} 
            loading={loading} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};