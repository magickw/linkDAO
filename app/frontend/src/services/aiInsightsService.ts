import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';

/**
 * AI Insights Service for Admin Dashboard
 * Integrates with backend OpenAI services for content moderation and predictive analytics
 */
export class AIInsightsService {
  private baseURL: string;

  constructor() {
    this.baseURL = `${API_BASE_URL}/api/admin/ai`;
  }

  /**
   * Check if AI services are available
   */
  async checkHealth(): Promise<{
    available: boolean;
    status: string;
    message: string;
  }> {
    try {
      const response = await axios.get(`${this.baseURL}/health`);
      return response.data.data;
    } catch (error) {
      return {
        available: false,
        status: 'unavailable',
        message: 'Failed to connect to AI services'
      };
    }
  }

  /**
   * Get content moderation analysis for a piece of content
   */
  async moderateContent(content: {
    contentId: string;
    type: 'post' | 'comment' | 'product' | 'profile' | 'dao_proposal';
    text: string;
    authorId: string;
  }): Promise<{
    contentId: string;
    riskScore: number;
    moderation: any;
    action: string;
    reasoning: string;
    recommendations: string[];
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/moderate`, { content });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Content moderation failed');
    }
  }

  /**
   * Get user churn prediction
   */
  async getUserChurnPrediction(userId: string): Promise<{
    userId: string;
    churnProbability: number;
    churnRisk: 'low' | 'medium' | 'high' | 'critical';
    factors: Array<{ factor: string; impact: number; description: string }>;
    recommendations: string[];
    predictedChurnDate?: string;
  }> {
    try {
      const response = await axios.get(`${this.baseURL}/insights/churn/${userId}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Churn prediction failed');
    }
  }

  /**
   * Predict content engagement
   */
  async predictContentEngagement(data: {
    contentType: string;
    metadata?: {
      authorId?: string;
      topic?: string;
      length?: number;
      hasMedia?: boolean;
      scheduledTime?: string;
    };
  }): Promise<{
    expectedViews: number;
    expectedEngagement: number;
    viralPotential: number;
    optimalPostTime?: string;
    recommendations: string[];
    confidenceScore: number;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/insights/content-performance`, data);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Content performance prediction failed');
    }
  }

  /**
   * Detect anomalies in platform metrics
   */
  async detectAnomalies(metrics: {
    userGrowth?: number[];
    engagement?: number[];
    revenue?: number[];
    activeUsers?: number[];
    contentCreation?: number[];
    timeRange: string;
    labels?: string[];
  }): Promise<{
    anomalies: Array<{
      metric: string;
      index: number;
      timestamp: string;
      value: number;
      expectedRange: [number, number];
      severity: 'low' | 'medium' | 'high';
      description: string;
      possibleCauses: string[];
    }>;
    overallHealth: 'healthy' | 'concerning' | 'critical';
    insights: string;
    recommendations: string[];
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/insights/anomaly-detection`, { metrics });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Anomaly detection failed');
    }
  }

  /**
   * Get seller performance prediction
   */
  async getSellerPerformancePrediction(sellerId: string): Promise<{
    sellerId: string;
    performanceTrend: 'improving' | 'stable' | 'declining';
    predictedRevenue30Days: number;
    riskFactors: string[];
    opportunities: string[];
    recommendations: string[];
  }> {
    try {
      const response = await axios.get(`${this.baseURL}/insights/seller/${sellerId}/performance`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Seller performance prediction failed');
    }
  }

  /**
   * Analyze overall platform health
   */
  async analyzePlatformHealth(timeRange: string = '30d'): Promise<{
    healthScore: number;
    trends: Array<{
      metric: string;
      direction: 'up' | 'down' | 'stable';
      changePercent: number;
    }>;
    criticalIssues: string[];
    opportunities: string[];
    insights: string;
  }> {
    try {
      const response = await axios.get(`${this.baseURL}/insights/platform-health`, {
        params: { timeRange }
      });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Platform health analysis failed');
    }
  }

  /**
   * Predict trends for a given metric
   */
  async predictTrends(data: {
    historicalData: Array<{ date: string; value: number; metric: string }>;
    metricName: string;
    forecastDays?: number;
  }): Promise<{
    predictions: Array<{ date: string; value: number; confidence: number }>;
    trend: 'increasing' | 'decreasing' | 'stable';
    insights: string;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/insights/trends`, data);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Trend prediction failed');
    }
  }

  /**
   * Generate custom insights
   */
  async generateInsights(data: {
    type: 'user_behavior' | 'content_trends' | 'seller_performance' | 'platform_health';
    context: Record<string, any>;
    timeRange?: string;
  }): Promise<{
    insights: string;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/insights/generate`, data);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Insight generation failed');
    }
  }

  /**
   * Get AI usage metrics and costs
   */
  async getUsageMetrics(): Promise<{
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    averageCostPerRequest: number;
  }> {
    try {
      const response = await axios.get(`${this.baseURL}/usage`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to retrieve usage metrics');
    }
  }

  /**
   * Batch moderate multiple pieces of content
   */
  async batchModerateContent(contents: Array<{
    contentId: string;
    type: string;
    text: string;
    authorId: string;
  }>): Promise<Record<string, any>> {
    try {
      const response = await axios.post(`${this.baseURL}/moderate/batch`, { contents });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Batch moderation failed');
    }
  }
}

// Export singleton instance
export const aiInsightsService = new AIInsightsService();
