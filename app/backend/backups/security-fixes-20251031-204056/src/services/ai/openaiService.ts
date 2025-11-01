import OpenAI from 'openai';
import { safeLogger } from '../utils/safeLogger';
import crypto from 'crypto';
import { safeLogger } from '../utils/safeLogger';
import { aiCacheService } from './aiCacheService';
import { safeLogger } from '../utils/safeLogger';

/**
 * OpenAI Service for LinkDAO Admin AI Features
 * Handles content moderation, insights generation, and predictive analytics
 */
export class OpenAIService {
  private client: OpenAI;
  private static instance: OpenAIService;
  private usageMetrics: {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
  };

  private constructor() {
    if (!process.env.OPENAI_API_KEY) {
      safeLogger.warn('OPENAI_API_KEY not set. AI features will be disabled.');
      this.client = null as any;
    } else {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    this.usageMetrics = {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
    };
  }

  static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService();
    }
    return OpenAIService.instance;
  }

  /**
   * Check if OpenAI is available
   */
  isAvailable(): boolean {
    return !!this.client && !!process.env.OPENAI_API_KEY;
  }

  /**
   * Moderate content using GPT-4 for nuanced analysis
   */
  async moderateContent(content: {
    text: string;
    images?: string[];
    metadata?: Record<string, any>;
  }): Promise<{
    flagged: boolean;
    categories: {
      hate: number;
      harassment: number;
      selfHarm: number;
      sexual: number;
      violence: number;
      spam: number;
    };
    reasoning: string;
    confidence: number;
    recommendations: string[];
  }> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI service is not available');
    }

    try {
      this.usageMetrics.totalRequests++;

      const completion = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are a content moderation AI for LinkDAO, a DAO management platform.
            Analyze content for violations of community guidelines. Evaluate on a scale of 0-1 for:
            - hate: Hate speech or discriminatory content
            - harassment: Harassment, bullying, or targeted attacks
            - selfHarm: Self-harm, suicide, or dangerous content
            - sexual: Sexual or adult content inappropriate for the platform
            - violence: Violence, gore, or graphic content
            - spam: Spam, scams, or misleading information

            Consider context and intent. Provide:
            1. Scores for each category (0-1)
            2. Clear reasoning for your assessment
            3. Confidence level (0-1)
            4. Specific recommendations for moderators

            Respond in JSON format with this structure:
            {
              "categories": { "hate": 0.1, "harassment": 0.2, ... },
              "reasoning": "Detailed explanation",
              "confidence": 0.85,
              "recommendations": ["action1", "action2"]
            }`,
          },
          {
            role: 'user',
            content: `Analyze this content:\n\n${content.text}${
              content.metadata ? `\n\nContext: ${JSON.stringify(content.metadata)}` : ''
            }`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 1000,
      });

      const analysis = JSON.parse(completion.choices[0].message.content || '{}');

      // Track usage
      if (completion.usage) {
        this.usageMetrics.totalTokens += completion.usage.total_tokens;
        // Estimate cost: GPT-4 Turbo is ~$0.01/1k prompt tokens, ~$0.03/1k completion tokens
        const estimatedCost =
          (completion.usage.prompt_tokens / 1000) * 0.01 +
          (completion.usage.completion_tokens / 1000) * 0.03;
        this.usageMetrics.totalCost += estimatedCost;
      }

      const flagged = this.shouldFlag(analysis.categories || {});

      return {
        flagged,
        categories: analysis.categories || {
          hate: 0,
          harassment: 0,
          selfHarm: 0,
          sexual: 0,
          violence: 0,
          spam: 0,
        },
        reasoning: analysis.reasoning || 'No reasoning provided',
        confidence: analysis.confidence || 0.7,
        recommendations: analysis.recommendations || [],
      };
    } catch (error) {
      safeLogger.error('AI moderation error:', error);
      throw new Error('Failed to moderate content with AI');
    }
  }

  /**
   * Generate insights from data
   */
  async generateInsight(data: {
    type: 'user_behavior' | 'content_trends' | 'seller_performance' | 'platform_health';
    context: Record<string, any>;
    timeRange?: string;
  }): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI service is not available');
    }

    const prompts = {
      user_behavior: `Analyze user behavior patterns and provide actionable insights for community management.
      Focus on engagement trends, potential churn indicators, and opportunities for improvement.`,

      content_trends: `Analyze content trends and identify emerging topics, popular themes, and potential issues.
      Highlight viral patterns and content that's driving engagement.`,

      seller_performance: `Analyze seller performance metrics and provide specific recommendations.
      Identify top performers, underperformers, and actionable improvement strategies.`,

      platform_health: `Analyze overall platform health metrics and identify areas of concern or opportunity.
      Provide strategic recommendations for platform growth and user satisfaction.`,
    };

    try {
      this.usageMetrics.totalRequests++;

      const completion = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `${prompts[data.type]}

            Provide insights in a clear, actionable format with:
            1. Key observations
            2. Specific metrics or patterns
            3. Recommended actions
            4. Potential risks or opportunities`
          },
          {
            role: 'user',
            content: `Time Range: ${data.timeRange || 'Last 30 days'}

            Data:
            ${JSON.stringify(data.context, null, 2)}`
          },
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      if (completion.usage) {
        this.usageMetrics.totalTokens += completion.usage.total_tokens;
        const estimatedCost =
          (completion.usage.prompt_tokens / 1000) * 0.01 +
          (completion.usage.completion_tokens / 1000) * 0.03;
        this.usageMetrics.totalCost += estimatedCost;
      }

      return completion.choices[0].message.content || 'No insights generated';
    } catch (error) {
      safeLogger.error('Insight generation error:', error);
      throw new Error('Failed to generate insights');
    }
  }

  /**
   * Predict future trends and metrics
   */
  async predictTrends(data: {
    historicalData: Array<{ date: string; value: number; metric: string }>;
    metricName: string;
    forecastDays: number;
  }): Promise<{
    predictions: Array<{ date: string; value: number; confidence: number }>;
    trend: 'increasing' | 'decreasing' | 'stable';
    insights: string;
  }> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI service is not available');
    }

    try {
      this.usageMetrics.totalRequests++;

      const completion = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are a data analyst specializing in trend prediction and forecasting.
            Analyze historical data and predict future values with confidence intervals.

            Respond in JSON format:
            {
              "predictions": [{"date": "YYYY-MM-DD", "value": 100, "confidence": 0.85}],
              "trend": "increasing|decreasing|stable",
              "insights": "Detailed analysis and reasoning"
            }`,
          },
          {
            role: 'user',
            content: `Metric: ${data.metricName}
            Forecast Days: ${data.forecastDays}

            Historical Data:
            ${JSON.stringify(data.historicalData, null, 2)}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
        max_tokens: 1200,
      });

      const prediction = JSON.parse(completion.choices[0].message.content || '{}');

      if (completion.usage) {
        this.usageMetrics.totalTokens += completion.usage.total_tokens;
        const estimatedCost =
          (completion.usage.prompt_tokens / 1000) * 0.01 +
          (completion.usage.completion_tokens / 1000) * 0.03;
        this.usageMetrics.totalCost += estimatedCost;
      }

      return {
        predictions: prediction.predictions || [],
        trend: prediction.trend || 'stable',
        insights: prediction.insights || 'No insights available',
      };
    } catch (error) {
      safeLogger.error('Trend prediction error:', error);
      throw new Error('Failed to predict trends');
    }
  }

  /**
   * Detect anomalies in metrics
   */
  async detectAnomalies(metrics: {
    userGrowth?: number[];
    engagement?: number[];
    revenue?: number[];
    activeUsers?: number[];
    timeRange: string;
  }): Promise<{
    anomalies: Array<{
      metric: string;
      index: number;
      value: number;
      expectedRange: [number, number];
      severity: 'low' | 'medium' | 'high';
      description: string;
    }>;
    insights: string;
    recommendations: string[];
  }> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI service is not available');
    }

    try {
      this.usageMetrics.totalRequests++;

      const completion = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are a data analyst specializing in anomaly detection.
            Analyze platform metrics for unusual patterns or outliers that may indicate:
            - Sudden growth spikes or drops
            - Unusual user behavior
            - Potential technical issues
            - Market opportunities

            Identify anomalies, their severity, and provide actionable insights.

            Respond in JSON format:
            {
              "anomalies": [{
                "metric": "userGrowth",
                "index": 5,
                "value": 1000,
                "expectedRange": [100, 200],
                "severity": "high",
                "description": "Explanation"
              }],
              "insights": "Overall analysis",
              "recommendations": ["action1", "action2"]
            }`,
          },
          {
            role: 'user',
            content: `Time Range: ${metrics.timeRange}

            Metrics:
            ${JSON.stringify(metrics, null, 2)}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 1500,
      });

      const analysis = JSON.parse(completion.choices[0].message.content || '{}');

      if (completion.usage) {
        this.usageMetrics.totalTokens += completion.usage.total_tokens;
        const estimatedCost =
          (completion.usage.prompt_tokens / 1000) * 0.01 +
          (completion.usage.completion_tokens / 1000) * 0.03;
        this.usageMetrics.totalCost += estimatedCost;
      }

      return {
        anomalies: analysis.anomalies || [],
        insights: analysis.insights || 'No anomalies detected',
        recommendations: analysis.recommendations || [],
      };
    } catch (error) {
      safeLogger.error('Anomaly detection error:', error);
      throw new Error('Failed to detect anomalies');
    }
  }

  /**
   * Get usage metrics
   */
  getUsageMetrics() {
    return {
      ...this.usageMetrics,
      averageCostPerRequest: this.usageMetrics.totalRequests > 0
        ? this.usageMetrics.totalCost / this.usageMetrics.totalRequests
        : 0,
    };
  }

  /**
   * Reset usage metrics (useful for monthly tracking)
   */
  resetUsageMetrics() {
    this.usageMetrics = {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
    };
  }

  /**
   * Determine if content should be flagged
   */
  private shouldFlag(categories: Record<string, number>): boolean {
    const threshold = 0.7;
    return Object.values(categories).some(score => score > threshold);
  }

  /**
   * Generate hash for content (for audit trails)
   */
  private hashContent(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }
}

export const openaiService = OpenAIService.getInstance();
