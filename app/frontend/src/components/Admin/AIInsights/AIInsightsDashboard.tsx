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

// Type definitions from adminService
interface ContentDemandPrediction {
  topic: string;
  category: string;
  predictedDemand: number;
  confidence: number;
  timeframe: 'week' | 'month' | 'quarter';
  factors: Array<{
    factor: string;
    weight: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }>;
  recommendations: string[];
}

interface UserBehaviorPrediction {
  userId?: string;
  sessionId: string;
  predictions: Array<{
    action: 'view_document' | 'search' | 'contact_support' | 'abandon' | 'convert';
    probability: number;
    confidence: number;
    timeframe: number;
    factors: string[];
  }>;
  riskFactors: Array<{
    factor: string;
    severity: 'low' | 'medium' | 'high';
    mitigation: string;
  }>;
}

interface ContentPerformancePrediction {
  documentPath: string;
  predictions: Array<{
    metric: 'views' | 'satisfaction' | 'conversion' | 'support_escalation';
    predictedValue: number;
    currentValue: number;
    trend: 'improving' | 'declining' | 'stable';
    confidence: number;
  }>;
  recommendations: string[];
}

interface AIInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'recommendation' | 'alert' | 'opportunity' | 'risk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  confidence: number;
  actionItems: any[];
  relatedMetrics: string[];
  timestamp: string;
  category: string;
  priority: number;
  impact: 'positive' | 'negative' | 'neutral';
  timeframe: string;
  metadata: Record<string, any>;
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
  insights: AIInsight[];
  predictions: any[];
  anomalies: any[];
  trends: any[];
  recommendations: string[];
  nextActions: string[];
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
      setInsightsReport(report);
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
            trends={insightsReport?.trends || []} 
            loading={loading} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};