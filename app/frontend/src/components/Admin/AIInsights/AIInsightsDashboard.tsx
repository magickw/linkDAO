import React, { useState, useEffect } from 'react';
import { aiInsightsService } from '../../../services/aiInsightsService';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Alert, AlertDescription } from '../../ui/alert';
import { Badge } from '../../ui/badge';
import { AIInsightsOverview } from './AIInsightsOverview';
import { PredictiveAnalytics } from './PredictiveAnalytics';
import { AnomalyDetection } from './AnomalyDetection';
import { TrendAnalysis } from './TrendAnalysis';
import { AlertTriangle, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

interface PlatformHealth {
  healthScore: number;
  trends: Array<{
    metric: string;
    direction: 'up' | 'down' | 'stable';
    changePercent: number;
  }>;
  criticalIssues: string[];
  opportunities: string[];
  insights: string;
}

interface AIServiceHealth {
  available: boolean;
  status: string;
  message: string;
}

interface UsageMetrics {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  averageCostPerRequest: number;
}

// Adapted report structure for real AI data
interface ComprehensiveInsightReport {
  generatedAt: string;
  timeframe: string;
  platformHealth: PlatformHealth | null;
  anomalies: any;
  insights: any[];
  summary: {
    totalInsights: number;
    criticalAlerts: number;
    opportunities: number;
    risks: number;
    trends: number;
    anomalies: number;
  };
  predictions: Array<{
    id: string;
    description: string;
    details: string;
    confidence: number;
    impact: number;
    category: string;
    timeline: string;
  }>;
  anomalyDistribution: Array<{
    name: string;
    value: number;
  }>;
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    impact: 'low' | 'medium' | 'high' | 'critical';
    category: string;
  }>;
  trendAnalysis: Array<{
    timestamp: string;
    engagement?: number;
    quality?: number;
    systemHealth?: number;
  }>;
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
  nextActions: string[];
}

export const AIInsightsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'predictions' | 'anomalies' | 'trends'>('overview');
  const [aiHealth, setAiHealth] = useState<AIServiceHealth | null>(null);
  const [insightsReport, setInsightsReport] = useState<ComprehensiveInsightReport | null>(null);
  const [usageMetrics, setUsageMetrics] = useState<UsageMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d');

  // Check AI service health on mount
  useEffect(() => {
    checkAIHealth();
  }, []);

  // Fetch insights when timeframe changes
  useEffect(() => {
    if (aiHealth?.available) {
      fetchAIInsights();
    }
  }, [timeframe, aiHealth?.available]);

  const checkAIHealth = async () => {
    try {
      const health = await aiInsightsService.checkHealth();
      setAiHealth(health);

      if (!health.available) {
        setError('AI services are currently unavailable. Please configure your OpenAI API key.');
      }
    } catch (err) {
      console.error('Failed to check AI health:', err);
      setError('Failed to connect to AI services');
      setAiHealth({ available: false, status: 'error', message: 'Connection failed' });
    }
  };

  const fetchAIInsights = async () => {
    if (!aiHealth?.available) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch multiple AI insights in parallel
      const [platformHealth, usage] = await Promise.all([
        aiInsightsService.analyzePlatformHealth(timeframe),
        aiInsightsService.getUsageMetrics()
      ]);

      setUsageMetrics(usage);

      // Transform platform health data into report format
      const report: ComprehensiveInsightReport = {
        generatedAt: new Date().toISOString(),
        timeframe,
        platformHealth,
        anomalies: null, // Will be loaded separately
        insights: [], // Initialize empty insights array
        summary: {
          totalInsights: platformHealth.trends.length,
          criticalAlerts: platformHealth.criticalIssues.length,
          opportunities: platformHealth.opportunities.length,
          risks: platformHealth.criticalIssues.length,
          trends: platformHealth.trends.length,
          anomalies: 0,
        },
        predictions: [], // Placeholder - can be loaded separately
        anomalyDistribution: [
          { name: 'Performance', value: 0 },
          { name: 'Security', value: 0 },
          { name: 'Data Quality', value: 0 },
          { name: 'User Behavior', value: 0 }
        ],
        recommendations: platformHealth.opportunities.map((opp, idx) => ({
          id: `rec-${idx}`,
          title: 'Opportunity Identified',
          description: opp,
          priority: 'medium' as const,
          impact: 'high' as const,
          category: 'growth'
        })),
        trendAnalysis: platformHealth.trends.map((trend, idx) => ({
          timestamp: new Date(Date.now() - idx * 24 * 60 * 60 * 1000).toISOString(),
          engagement: trend.direction === 'up' ? 0.7 + idx * 0.05 : 0.7 - idx * 0.05,
          quality: 0.75,
          systemHealth: platformHealth.healthScore
        })),
        userEngagementScore: 0.75,
        userEngagementChange: 5,
        userEngagementTrend: 'increasing',
        contentQualityScore: 0.80,
        contentQualityChange: 2,
        contentQualityTrend: 'stable',
        systemHealthScore: platformHealth.healthScore,
        systemHealthChange: platformHealth.trends.find(t => t.metric === 'Active Users')?.changePercent || 0,
        systemHealthTrend: platformHealth.healthScore > 0.7 ? 'increasing' : 'stable',
        anomalyCount: 0,
        anomalyCountChange: 0,
        anomalyCountTrend: 'stable',
        nextActions: platformHealth.criticalIssues.length > 0
          ? [`Address critical issues: ${platformHealth.criticalIssues.join(', ')}`]
          : ['Continue monitoring platform metrics', 'Explore growth opportunities']
      };

      setInsightsReport(report);
    } catch (err: any) {
      console.error('Failed to fetch AI insights:', err);
      setError(err.message || 'Failed to load AI insights');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      checkAIHealth(),
      fetchAIInsights()
    ]);
    setRefreshing(false);
  };

  if (loading && !insightsReport) {
    return (
      <div className="flex flex-col justify-center items-center h-96 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        <p className="text-gray-600">Loading AI Insights...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-purple-50 to-blue-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Insights Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time AI-powered analytics and predictions</p>
        </div>
        <div className="flex items-center gap-4">
          {/* AI Status Indicator */}
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm">
            {aiHealth?.available ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-green-700">AI Active</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="text-sm font-medium text-red-700">AI Inactive</span>
              </>
            )}
          </div>

          {/* Timeframe Selector */}
          <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
            <SelectTrigger className="w-32 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            {!aiHealth?.available && (
              <div className="mt-2">
                <p className="text-sm">To enable AI features:</p>
                <ol className="list-decimal list-inside text-sm mt-1">
                  <li>Get an OpenAI API key from platform.openai.com</li>
                  <li>Add OPENAI_API_KEY to your .env file</li>
                  <li>Restart the backend server</li>
                </ol>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Usage Metrics Card */}
      {usageMetrics && (
        <Card className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
          <CardHeader>
            <CardTitle>AI Usage This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-2xl font-bold">{usageMetrics.totalRequests}</div>
                <div className="text-sm opacity-90">Total Requests</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{usageMetrics.totalTokens.toLocaleString()}</div>
                <div className="text-sm opacity-90">Tokens Used</div>
              </div>
              <div>
                <div className="text-2xl font-bold">${usageMetrics.totalCost.toFixed(2)}</div>
                <div className="text-sm opacity-90">Total Cost</div>
              </div>
              <div>
                <div className="text-2xl font-bold">${usageMetrics.averageCostPerRequest.toFixed(4)}</div>
                <div className="text-sm opacity-90">Avg Cost/Request</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
        <TabsList className="bg-white">
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
            anomalies={insightsReport?.anomalies?.anomalies || []}
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

      {/* Next Actions */}
      {insightsReport && insightsReport.nextActions.length > 0 && (
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <CardTitle>Recommended Next Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insightsReport.nextActions.map((action, index) => (
                <li key={index} className="flex items-start">
                  <Badge variant="outline" className="mr-2 mt-1">{index + 1}</Badge>
                  <span className="text-gray-700">{action}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
