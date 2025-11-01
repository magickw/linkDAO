/**
 * Predictive Analytics Service
 * Analyzes patterns to predict future content needs and user behavior
 */

export interface ContentDemandPrediction {
  topic: string;
  category: string;
  predictedDemand: number; // 0-100 score
  confidence: number; // 0-1
  timeframe: 'week' | 'month' | 'quarter';
  factors: Array<{
    factor: string;
    weight: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }>;
  recommendations: string[];
}

export interface UserBehaviorPrediction {
  userId?: string;
  sessionId: string;
  predictions: Array<{
    action: 'view_document' | 'search' | 'contact_support' | 'abandon' | 'convert';
    probability: number; // 0-1
    confidence: number; // 0-1
    timeframe: number; // minutes
    factors: string[];
  }>;
  riskFactors: Array<{
    factor: string;
    severity: 'low' | 'medium' | 'high';
    mitigation: string;
  }>;
}

export interface ContentPerformancePrediction {
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

export interface SeasonalityPattern {
  pattern: string;
  category: string;
  seasonality: Array<{
    period: string; // 'monday', 'january', 'q1', etc.
    multiplier: number; // relative to baseline
    confidence: number;
  }>;
  peakPeriods: string[];
  lowPeriods: string[];
}

export interface PredictiveInsights {
  contentDemand: ContentDemandPrediction[];
  userBehavior: UserBehaviorPrediction[];
  contentPerformance: ContentPerformancePrediction[];
  seasonality: SeasonalityPattern[];
  alerts: Array<{
    type: 'content_gap' | 'performance_decline' | 'demand_spike' | 'user_churn';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    action: string;
    timeframe: string;
  }>;
  recommendations: string[];
}

export class PredictiveAnalyticsService {
  private historicalData: Map<string, any[]> = new Map();
  private models: Map<string, any> = new Map();
  private patterns: Map<string, any> = new Map();

  /**
   * Record data point for analysis
   */
  recordDataPoint(
    category: string,
    data: {
      timestamp: Date;
      value: number;
      metadata?: Record<string, any>;
    }
  ): void {
    const categoryData = this.historicalData.get(category) || [];
    categoryData.push(data);

    // Keep only last 10,000 data points per category
    if (categoryData.length > 10000) {
      categoryData.splice(0, categoryData.length - 10000);
    }

    this.historicalData.set(category, categoryData);

    // Update patterns
    this.updatePatterns(category, categoryData);
  }

  /**
   * Predict content demand
   */
  predictContentDemand(timeframe: 'week' | 'month' | 'quarter' = 'month'): ContentDemandPrediction[] {
    const predictions: ContentDemandPrediction[] = [];

    // Analyze search trends
    const searchData = this.historicalData.get('search_queries') || [];
    const topicTrends = this.analyzeTopicTrends(searchData, timeframe);

    for (const [topic, trend] of topicTrends.entries()) {
      const prediction = this.generateContentDemandPrediction(topic, trend, timeframe);
      if (prediction.confidence > 0.3) {
        predictions.push(prediction);
      }
    }

    // Analyze content gaps
    const gapData = this.historicalData.get('content_gaps') || [];
    const gapPredictions = this.analyzeContentGaps(gapData, timeframe);
    predictions.push(...gapPredictions);

    return predictions
      .sort((a, b) => b.predictedDemand - a.predictedDemand)
      .slice(0, 20);
  }

  /**
   * Predict user behavior
   */
  predictUserBehavior(
    sessionId: string,
    currentContext: {
      documentsViewed: string[];
      searchQueries: string[];
      timeSpent: number;
      currentDocument?: string;
    }
  ): UserBehaviorPrediction {
    const predictions = [
      this.predictDocumentView(sessionId, currentContext),
      this.predictSearch(sessionId, currentContext),
      this.predictSupportContact(sessionId, currentContext),
      this.predictAbandonment(sessionId, currentContext),
      this.predictConversion(sessionId, currentContext)
    ].filter(p => p.probability > 0.1);

    const riskFactors = this.identifyRiskFactors(sessionId, currentContext);

    return {
      sessionId,
      predictions,
      riskFactors
    };
  }

  /**
   * Predict content performance
   */
  predictContentPerformance(documentPath: string): ContentPerformancePrediction {
    const performanceData = this.historicalData.get(`performance_${documentPath}`) || [];
    const viewData = this.historicalData.get(`views_${documentPath}`) || [];
    const satisfactionData = this.historicalData.get(`satisfaction_${documentPath}`) || [];

    const predictions = [
      this.predictMetric('views', viewData),
      this.predictMetric('satisfaction', satisfactionData),
      this.predictMetric('conversion', performanceData),
      this.predictMetric('support_escalation', performanceData)
    ];

    const recommendations = this.generatePerformanceRecommendations(predictions);

    return {
      documentPath,
      predictions,
      recommendations
    };
  }

  /**
   * Analyze seasonality patterns
   */
  analyzeSeasonality(): SeasonalityPattern[] {
    const patterns: SeasonalityPattern[] = [];

    // Analyze different time patterns
    const timePatterns = ['hourly', 'daily', 'weekly', 'monthly', 'quarterly'];

    for (const pattern of timePatterns) {
      const seasonalityData = this.calculateSeasonality(pattern);
      if (seasonalityData.length > 0) {
        patterns.push(...seasonalityData);
      }
    }

    return patterns;
  }

  /**
   * Generate comprehensive predictive insights
   */
  generatePredictiveInsights(): PredictiveInsights {
    const contentDemand = this.predictContentDemand();
    const contentPerformance = this.predictAllContentPerformance();
    const seasonality = this.analyzeSeasonality();
    const alerts = this.generatePredictiveAlerts(contentDemand, contentPerformance);
    const recommendations = this.generatePredictiveRecommendations(
      contentDemand,
      contentPerformance,
      seasonality
    );

    return {
      contentDemand,
      userBehavior: [], // Would be populated with active user sessions
      contentPerformance,
      seasonality,
      alerts,
      recommendations
    };
  }

  /**
   * Update patterns based on new data
   */
  private updatePatterns(category: string, data: any[]): void {
    if (data.length < 10) return; // Need minimum data for pattern detection

    const pattern = this.detectPattern(data);
    if (pattern) {
      this.patterns.set(category, pattern);
    }
  }

  /**
   * Analyze topic trends from search data
   */
  private analyzeTopicTrends(
    searchData: any[],
    timeframe: 'week' | 'month' | 'quarter'
  ): Map<string, any> {
    const trends = new Map();
    const timeframeDays = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 90;
    const cutoff = new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1000);

    const recentSearches = searchData.filter(s => s.timestamp > cutoff);
    const topicCounts = new Map<string, number>();

    // Count topic occurrences
    for (const search of recentSearches) {
      const topics = this.extractTopics(search.metadata?.query || '');
      for (const topic of topics) {
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      }
    }

    // Calculate trends
    for (const [topic, count] of topicCounts.entries()) {
      if (count >= 5) { // Minimum threshold
        const trend = this.calculateTopicTrend(topic, searchData, timeframeDays);
        trends.set(topic, { count, trend });
      }
    }

    return trends;
  }

  /**
   * Generate content demand prediction
   */
  private generateContentDemandPrediction(
    topic: string,
    trendData: any,
    timeframe: 'week' | 'month' | 'quarter'
  ): ContentDemandPrediction {
    const baseScore = Math.min(trendData.count * 2, 100);
    const trendMultiplier = trendData.trend > 0 ? 1.5 : trendData.trend < 0 ? 0.7 : 1.0;
    const predictedDemand = Math.min(baseScore * trendMultiplier, 100);

    const confidence = this.calculateConfidence(trendData.count, trendData.trend);
    const category = this.categorizeContent(topic);

    return {
      topic,
      category,
      predictedDemand: Math.round(predictedDemand),
      confidence,
      timeframe,
      factors: [
        {
          factor: 'Search volume',
          weight: 0.6,
          trend: trendData.trend > 0 ? 'increasing' : trendData.trend < 0 ? 'decreasing' : 'stable'
        },
        {
          factor: 'Historical demand',
          weight: 0.3,
          trend: 'stable'
        },
        {
          factor: 'Seasonality',
          weight: 0.1,
          trend: 'stable'
        }
      ],
      recommendations: this.generateContentRecommendations(topic, predictedDemand, confidence)
    };
  }

  /**
   * Analyze content gaps
   */
  private analyzeContentGaps(gapData: any[], timeframe: string): ContentDemandPrediction[] {
    const predictions: ContentDemandPrediction[] = [];

    for (const gap of gapData) {
      if (gap.metadata?.priority === 'high' || gap.metadata?.priority === 'critical') {
        predictions.push({
          topic: gap.metadata?.topic || 'Unknown',
          category: gap.metadata?.category || 'general',
          predictedDemand: gap.metadata?.priority === 'critical' ? 90 : 70,
          confidence: 0.8,
          timeframe: timeframe as any,
          factors: [
            {
              factor: 'Identified gap',
              weight: 1.0,
              trend: 'increasing'
            }
          ],
          recommendations: [`Create content for: ${gap.metadata?.topic}`]
        });
      }
    }

    return predictions;
  }

  /**
   * Predict document view probability
   */
  private predictDocumentView(sessionId: string, context: any): any {
    let probability = 0.3; // Base probability

    // Increase probability based on current behavior
    if (context.documentsViewed.length > 0) {
      probability += 0.2;
    }

    if (context.searchQueries.length > 0) {
      probability += 0.3;
    }

    // Decrease probability if user has been browsing for a long time
    if (context.timeSpent > 600000) { // 10 minutes
      probability -= 0.2;
    }

    return {
      action: 'view_document',
      probability: Math.max(0, Math.min(1, probability)),
      confidence: 0.7,
      timeframe: 5,
      factors: ['browsing_history', 'search_activity', 'session_duration']
    };
  }

  /**
   * Predict search probability
   */
  private predictSearch(sessionId: string, context: any): any {
    let probability = 0.4;

    // Increase if user hasn't found what they're looking for
    if (context.searchQueries.length > context.documentsViewed.length) {
      probability += 0.3;
    }

    // Increase if user viewed documents but spent little time
    if (context.documentsViewed.length > 0 && context.timeSpent < 120000) {
      probability += 0.2;
    }

    return {
      action: 'search',
      probability: Math.max(0, Math.min(1, probability)),
      confidence: 0.6,
      timeframe: 3,
      factors: ['search_history', 'document_engagement', 'time_spent']
    };
  }

  /**
   * Predict support contact probability
   */
  private predictSupportContact(sessionId: string, context: any): any {
    let probability = 0.1;

    // Increase if user has searched multiple times without success
    if (context.searchQueries.length >= 3) {
      probability += 0.4;
    }

    // Increase if user has viewed many documents
    if (context.documentsViewed.length >= 5) {
      probability += 0.3;
    }

    return {
      action: 'contact_support',
      probability: Math.max(0, Math.min(1, probability)),
      confidence: 0.8,
      timeframe: 10,
      factors: ['search_frustration', 'document_overload', 'help_seeking_behavior']
    };
  }

  /**
   * Predict abandonment probability
   */
  private predictAbandonment(sessionId: string, context: any): any {
    let probability = 0.2;

    // Increase if user has been inactive or searching unsuccessfully
    if (context.searchQueries.length > 2 && context.documentsViewed.length === 0) {
      probability += 0.5;
    }

    if (context.timeSpent > 900000) { // 15 minutes
      probability += 0.3;
    }

    return {
      action: 'abandon',
      probability: Math.max(0, Math.min(1, probability)),
      confidence: 0.7,
      timeframe: 2,
      factors: ['session_length', 'search_success', 'engagement_level']
    };
  }

  /**
   * Predict conversion probability
   */
  private predictConversion(sessionId: string, context: any): any {
    let probability = 0.15;

    // Increase if user is actively engaging with content
    if (context.documentsViewed.length >= 2 && context.timeSpent > 300000) {
      probability += 0.4;
    }

    // Increase if user found relevant content quickly
    if (context.documentsViewed.length > 0 && context.searchQueries.length <= 2) {
      probability += 0.3;
    }

    return {
      action: 'convert',
      probability: Math.max(0, Math.min(1, probability)),
      confidence: 0.6,
      timeframe: 15,
      factors: ['content_engagement', 'search_efficiency', 'time_investment']
    };
  }

  /**
   * Identify risk factors for user experience
   */
  private identifyRiskFactors(sessionId: string, context: any): any[] {
    const risks = [];

    if (context.searchQueries.length >= 3 && context.documentsViewed.length === 0) {
      risks.push({
        factor: 'Search frustration',
        severity: 'high',
        mitigation: 'Improve search results or suggest alternative content'
      });
    }

    if (context.timeSpent > 600000 && context.documentsViewed.length < 2) {
      risks.push({
        factor: 'Low engagement',
        severity: 'medium',
        mitigation: 'Provide guided navigation or personalized recommendations'
      });
    }

    return risks;
  }

  /**
   * Predict metric values
   */
  private predictMetric(metricName: string, data: any[]): any {
    if (data.length === 0) {
      return {
        metric: metricName,
        predictedValue: 0,
        currentValue: 0,
        trend: 'stable',
        confidence: 0
      };
    }

    const recentData = data.slice(-30); // Last 30 data points
    const currentValue = recentData[recentData.length - 1]?.value || 0;
    const trend = this.calculateTrend(recentData);
    const predictedValue = this.extrapolateTrend(currentValue, trend);

    return {
      metric: metricName,
      predictedValue: Math.round(predictedValue * 100) / 100,
      currentValue: Math.round(currentValue * 100) / 100,
      trend: trend > 0.05 ? 'improving' : trend < -0.05 ? 'declining' : 'stable',
      confidence: Math.min(recentData.length / 30, 1)
    };
  }

  // Helper methods
  private detectPattern(data: any[]): any {
    // Simple pattern detection - in a real implementation, this would use more sophisticated algorithms
    if (data.length < 10) return null;

    const values = data.map(d => d.value);
    const trend = this.calculateTrend(values);
    const volatility = this.calculateVolatility(values);

    return {
      trend,
      volatility,
      pattern: trend > 0.1 ? 'increasing' : trend < -0.1 ? 'decreasing' : 'stable'
    };
  }

  private extractTopics(query: string): string[] {
    // Simple topic extraction - in a real implementation, this would use NLP
    const words = query.toLowerCase().split(/\s+/);
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'how', 'what', 'where', 'when', 'why']);
    
    return words
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 3); // Take first 3 meaningful words
  }

  private calculateTopicTrend(topic: string, data: any[], days: number): number {
    const now = new Date();
    const halfPeriod = new Date(now.getTime() - (days / 2) * 24 * 60 * 60 * 1000);
    
    const recentCount = data.filter(d => 
      d.timestamp > halfPeriod && 
      d.metadata?.query?.toLowerCase().includes(topic)
    ).length;
    
    const olderCount = data.filter(d => 
      d.timestamp <= halfPeriod && 
      d.timestamp > new Date(now.getTime() - days * 24 * 60 * 60 * 1000) &&
      d.metadata?.query?.toLowerCase().includes(topic)
    ).length;

    return olderCount > 0 ? (recentCount - olderCount) / olderCount : 0;
  }

  private calculateConfidence(count: number, trend: number): number {
    const countConfidence = Math.min(count / 20, 1); // More data = higher confidence
    const trendConfidence = Math.abs(trend) > 0.2 ? 0.8 : 0.5; // Strong trends = higher confidence
    return (countConfidence + trendConfidence) / 2;
  }

  private categorizeContent(topic: string): string {
    const categories = {
      wallet: ['wallet', 'metamask', 'connect', 'setup'],
      token: ['token', 'ldao', 'buy', 'purchase', 'acquire'],
      security: ['security', 'safe', 'protect', 'hack', 'scam'],
      defi: ['defi', 'yield', 'farming', 'staking', 'liquidity'],
      nft: ['nft', 'collectible', 'art', 'mint']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => topic.toLowerCase().includes(keyword))) {
        return category;
      }
    }

    return 'general';
  }

  private generateContentRecommendations(topic: string, demand: number, confidence: number): string[] {
    const recommendations = [];

    if (demand > 70 && confidence > 0.6) {
      recommendations.push(`High priority: Create comprehensive guide for "${topic}"`);
    } else if (demand > 50) {
      recommendations.push(`Medium priority: Consider creating content for "${topic}"`);
    }

    if (confidence < 0.5) {
      recommendations.push('Monitor trend for more data before creating content');
    }

    return recommendations;
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    // Simple linear regression slope
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + val * index, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private extrapolateTrend(currentValue: number, trend: number): number {
    return currentValue + trend * 7; // Predict 7 periods ahead
  }

  private calculateSeasonality(pattern: string): SeasonalityPattern[] {
    // Placeholder for seasonality calculation
    return [];
  }

  private predictAllContentPerformance(): ContentPerformancePrediction[] {
    // Get all documents with performance data
    const documents = Array.from(this.historicalData.keys())
      .filter(key => key.startsWith('performance_'))
      .map(key => key.replace('performance_', ''));

    return documents.map(doc => this.predictContentPerformance(doc));
  }

  private generatePerformanceRecommendations(predictions: any[]): string[] {
    const recommendations = [];

    const decliningMetrics = predictions.filter(p => p.trend === 'declining');
    if (decliningMetrics.length > 0) {
      recommendations.push('Address declining performance metrics');
    }

    const lowSatisfaction = predictions.find(p => p.metric === 'satisfaction' && p.predictedValue < 3);
    if (lowSatisfaction) {
      recommendations.push('Improve content quality to increase satisfaction');
    }

    return recommendations;
  }

  private generatePredictiveAlerts(
    contentDemand: ContentDemandPrediction[],
    contentPerformance: ContentPerformancePrediction[]
  ): any[] {
    const alerts = [];

    // High demand content gaps
    const highDemandGaps = contentDemand.filter(d => d.predictedDemand > 80 && d.confidence > 0.7);
    for (const gap of highDemandGaps) {
      alerts.push({
        type: 'content_gap',
        severity: 'high',
        message: `High demand predicted for "${gap.topic}" content`,
        action: 'Create content immediately',
        timeframe: gap.timeframe
      });
    }

    // Performance decline alerts
    const decliningContent = contentPerformance.filter(p => 
      p.predictions.some(pred => pred.trend === 'declining' && pred.confidence > 0.6)
    );
    for (const content of decliningContent) {
      alerts.push({
        type: 'performance_decline',
        severity: 'medium',
        message: `Performance declining for ${content.documentPath}`,
        action: 'Review and update content',
        timeframe: 'week'
      });
    }

    return alerts;
  }

  private generatePredictiveRecommendations(
    contentDemand: ContentDemandPrediction[],
    contentPerformance: ContentPerformancePrediction[],
    seasonality: SeasonalityPattern[]
  ): string[] {
    const recommendations = [];

    if (contentDemand.length > 0) {
      const topDemand = contentDemand[0];
      recommendations.push(`Prioritize creating content for "${topDemand.topic}" - highest predicted demand`);
    }

    const criticalPerformance = contentPerformance.filter(p => 
      p.predictions.some(pred => pred.trend === 'declining')
    );
    if (criticalPerformance.length > 0) {
      recommendations.push(`Review ${criticalPerformance.length} documents with declining performance`);
    }

    if (seasonality.length > 0) {
      recommendations.push('Plan content calendar based on seasonal patterns');
    }

    return recommendations;
  }
}

export const predictiveAnalyticsService = new PredictiveAnalyticsService();
