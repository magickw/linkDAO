# OpenAI Integration Setup Guide

## Overview
This document guides you through setting up and using the OpenAI integration for the AI Insights Dashboard.

## Quick Start

### 1. Get Your OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with `sk-`)

### 2. Add Environment Variable

Add this to your `.env` file (or `.env.local` for development):

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-actual-api-key-here
```

**Important:** Never commit your API key to version control!

### 3. Restart Your Backend Server

```bash
cd app/backend
npm run dev
```

The backend will now have access to OpenAI services.

## What's Been Implemented

### Backend Services

#### 1. OpenAI Service (`app/backend/src/services/ai/openaiService.ts`)
Core service that handles all OpenAI API interactions:
- ✅ Content moderation using GPT-4
- ✅ Insight generation from data
- ✅ Trend prediction
- ✅ Anomaly detection
- ✅ Usage tracking (requests, tokens, costs)

#### 2. Content Moderation AI (`app/backend/src/services/ai/contentModerationAI.ts`)
Specialized service for content safety:
- ✅ Content analysis with risk scoring
- ✅ Automatic flagging/removal based on risk
- ✅ User history integration
- ✅ Batch content moderation

#### 3. Predictive Analytics (`app/backend/src/services/ai/predictiveAnalyticsService.ts`)
Data-driven insights and predictions:
- ✅ User churn prediction
- ✅ Content engagement forecasting
- ✅ Anomaly detection in metrics
- ✅ Seller performance trends
- ✅ Platform health analysis

### API Endpoints

All endpoints are available at `/api/admin/ai/*`:

```
GET    /api/admin/ai/health                          # Check AI service status
POST   /api/admin/ai/moderate                        # Moderate content
POST   /api/admin/ai/moderate/batch                  # Batch moderation
GET    /api/admin/ai/insights/churn/:userId          # User churn prediction
POST   /api/admin/ai/insights/content-performance    # Content engagement prediction
POST   /api/admin/ai/insights/anomaly-detection      # Detect anomalies
GET    /api/admin/ai/insights/seller/:sellerId/performance  # Seller performance
GET    /api/admin/ai/insights/platform-health        # Platform health analysis
POST   /api/admin/ai/insights/trends                 # Trend predictions
POST   /api/admin/ai/insights/generate               # Generate custom insights
GET    /api/admin/ai/usage                           # Get AI usage metrics
POST   /api/admin/ai/usage/reset                     # Reset usage metrics
```

### Frontend Service

#### AI Insights Service (`app/frontend/src/services/aiInsightsService.ts`)
Complete TypeScript client for all AI endpoints:
- ✅ Full type safety
- ✅ Error handling
- ✅ Axios-based HTTP client
- ✅ Singleton pattern for easy use

## Usage Examples

### Example 1: Moderate Content

```typescript
import { aiInsightsService } from '@/services/aiInsightsService';

async function moderatePost(postId: string, text: string, authorId: string) {
  try {
    const result = await aiInsightsService.moderateContent({
      contentId: postId,
      type: 'post',
      text,
      authorId
    });

    console.log('Risk Score:', result.riskScore);
    console.log('Action:', result.action); // 'approved', 'flagged', 'queued', or 'auto_removed'
    console.log('Reasoning:', result.reasoning);
    console.log('Recommendations:', result.recommendations);

    // Take action based on result
    if (result.action === 'auto_removed') {
      await removeContent(postId);
      await notifyUser(authorId, 'Content removed for policy violation');
    } else if (result.action === 'flagged') {
      await queueForHumanReview(postId);
    }
  } catch (error) {
    console.error('Moderation failed:', error);
  }
}
```

### Example 2: Predict User Churn

```typescript
import { aiInsightsService } from '@/services/aiInsightsService';

async function checkUserRetention(userId: string) {
  try {
    const prediction = await aiInsightsService.getUserChurnPrediction(userId);

    console.log('Churn Probability:', prediction.churnProbability);
    console.log('Risk Level:', prediction.churnRisk);
    console.log('Key Factors:', prediction.factors);
    console.log('Recommendations:', prediction.recommendations);

    if (prediction.churnRisk === 'high' || prediction.churnRisk === 'critical') {
      // Trigger retention campaign
      await sendReEngagementEmail(userId);
      await offerSpecialIncentive(userId);
    }
  } catch (error) {
    console.error('Churn prediction failed:', error);
  }
}
```

### Example 3: Detect Platform Anomalies

```typescript
import { aiInsightsService } from '@/services/aiInsightsService';

async function monitorPlatformHealth() {
  try {
    const metrics = {
      userGrowth: [100, 120, 115, 130, 500], // Spike detected!
      engagement: [0.6, 0.62, 0.61, 0.59, 0.58],
      revenue: [10000, 11000, 10500, 12000, 11500],
      timeRange: '7d',
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    };

    const analysis = await aiInsightsService.detectAnomalies(metrics);

    console.log('Overall Health:', analysis.overallHealth);
    console.log('Anomalies Found:', analysis.anomalies.length);

    analysis.anomalies.forEach(anomaly => {
      console.log(`${anomaly.metric}: ${anomaly.description}`);
      console.log('Severity:', anomaly.severity);
      console.log('Possible Causes:', anomaly.possibleCauses);
    });

    console.log('Recommendations:', analysis.recommendations);
  } catch (error) {
    console.error('Anomaly detection failed:', error);
  }
}
```

### Example 4: Analyze Platform Health

```typescript
import { aiInsightsService } from '@/services/aiInsightsService';

async function getDashboardInsights() {
  try {
    const health = await aiInsightsService.analyzePlatformHealth('30d');

    console.log('Health Score:', health.healthScore);
    console.log('Trends:', health.trends);
    console.log('Critical Issues:', health.criticalIssues);
    console.log('Opportunities:', health.opportunities);
    console.log('AI Insights:', health.insights);
  } catch (error) {
    console.error('Health analysis failed:', error);
  }
}
```

### Example 5: Get Usage Metrics

```typescript
import { aiInsightsService } from '@/services/aiInsightsService';

async function checkAICosts() {
  try {
    const usage = await aiInsightsService.getUsageMetrics();

    console.log('Total Requests:', usage.totalRequests);
    console.log('Total Tokens:', usage.totalTokens);
    console.log('Total Cost: $', usage.totalCost.toFixed(4));
    console.log('Avg Cost/Request: $', usage.averageCostPerRequest.toFixed(4));

    // Alert if costs are too high
    if (usage.totalCost > 100) {
      console.warn('AI costs exceed budget!');
    }
  } catch (error) {
    console.error('Failed to get usage metrics:', error);
  }
}
```

## Integrating with Existing Components

Your existing AI Insights components can now use real data. Here's how to update them:

### Update AIInsightsOverview Component

```typescript
// app/frontend/src/components/Admin/AIInsights/AIInsightsOverview.tsx

import { aiInsightsService } from '@/services/aiInsightsService';
import { useEffect, useState } from 'react';

export function AIInsightsOverview() {
  const [platformHealth, setPlatformHealth] = useState(null);
  const [anomalies, setAnomalies] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInsights() {
      try {
        // Check if AI is available
        const health = await aiInsightsService.checkHealth();
        if (!health.available) {
          console.warn('AI services unavailable');
          return;
        }

        // Load platform health
        const platformData = await aiInsightsService.analyzePlatformHealth('30d');
        setPlatformHealth(platformData);

        // Load anomaly detection (if you have metrics)
        // const anomalyData = await aiInsightsService.detectAnomalies({...});
        // setAnomalies(anomalyData);

      } catch (error) {
        console.error('Failed to load AI insights:', error);
      } finally {
        setLoading(false);
      }
    }

    loadInsights();
  }, []);

  // Render your component with real data
  // ...
}
```

## Cost Management

### Estimated Costs (OpenAI Pricing as of Oct 2024)

**GPT-4 Turbo:**
- Input: $0.01 / 1K tokens
- Output: $0.03 / 1K tokens

**Typical Usage:**
- Content Moderation: ~500 tokens = $0.01-0.02 per analysis
- Insight Generation: ~1000 tokens = $0.02-0.04 per insight
- Anomaly Detection: ~1500 tokens = $0.03-0.06 per analysis

**Monthly Estimates:**
- 1000 content moderations = ~$15
- 500 insights generated = ~$15
- 100 anomaly checks = ~$4
- **Total: ~$35/month** for moderate usage

### Cost Control Measures

The implementation includes several cost-saving features:

1. **Usage Tracking**: Monitor costs in real-time
2. **Caching**: Reduce redundant API calls (TODO: implement)
3. **Batch Operations**: Process multiple items efficiently
4. **Graceful Degradation**: Falls back to rule-based systems if AI unavailable

### Best Practices

1. **Enable AI selectively**: Don't analyze every piece of content
2. **Use thresholds**: Only trigger AI for suspicious content
3. **Cache results**: Store AI decisions to avoid re-analysis
4. **Monitor costs**: Check usage metrics daily
5. **Set budgets**: Configure spend limits in OpenAI dashboard

## Troubleshooting

### AI Services Not Available

**Symptom**: `/api/admin/ai/health` returns `available: false`

**Solutions:**
1. Check if `OPENAI_API_KEY` is set in `.env`
2. Verify the API key is valid at https://platform.openai.com/api-keys
3. Ensure backend server was restarted after adding the key
4. Check backend logs for error messages

### Rate Limit Errors

**Symptom**: `429 Too Many Requests` errors

**Solutions:**
1. Reduce request frequency
2. Implement request queuing
3. Upgrade OpenAI plan for higher limits
4. Use batch operations instead of individual requests

### High Costs

**Symptom**: OpenAI bills are unexpectedly high

**Solutions:**
1. Check usage metrics: `GET /api/admin/ai/usage`
2. Implement caching for repeated queries
3. Use cheaper models for simple tasks (GPT-3.5 instead of GPT-4)
4. Add rate limiting to prevent abuse
5. Set up budget alerts in OpenAI dashboard

### Slow Response Times

**Symptom**: AI endpoints taking >10 seconds

**Solutions:**
1. Use streaming for long-running analyses (not yet implemented)
2. Reduce `max_tokens` in requests
3. Consider async processing for non-urgent tasks
4. Cache frequently requested insights

## Security Considerations

### API Key Protection

- ✅ Never commit API keys to git
- ✅ Use environment variables only
- ✅ Rotate keys regularly (every 90 days)
- ✅ Use separate keys for dev/staging/production
- ✅ Monitor key usage for unauthorized access

### Content Privacy

- ✅ Don't send personally identifiable information (PII) to OpenAI
- ✅ Hash or anonymize user data before analysis
- ✅ Comply with GDPR and data protection laws
- ✅ Inform users if their content is analyzed by AI

### Access Control

- ✅ AI endpoints require admin authentication
- ✅ Implement role-based permissions
- ✅ Audit all AI operations
- ✅ Rate limit to prevent abuse

## Next Steps

### Recommended Enhancements

1. **Caching Layer**: Cache AI responses to reduce costs
2. **Async Processing**: Queue non-urgent AI tasks
3. **Model Selection**: Use GPT-3.5 for simple tasks, GPT-4 for complex
4. **Fine-tuning**: Train custom models on your data
5. **Streaming**: Stream responses for better UX
6. **Embeddings**: Use embeddings for semantic search
7. **Vector Database**: Store embeddings for fast similarity search

### Integration Checklist

- [x] Backend OpenAI service implemented
- [x] Content moderation AI service created
- [x] Predictive analytics service built
- [x] API endpoints exposed
- [x] Frontend service created
- [ ] Update existing AI components to use real API
- [ ] Add caching layer
- [ ] Implement usage alerts
- [ ] Set up monitoring dashboards
- [ ] Create admin UI for AI settings

## Support

For questions or issues:

1. Check OpenAI API documentation: https://platform.openai.com/docs
2. Review implementation code in `app/backend/src/services/ai/`
3. Check usage metrics: `GET /api/admin/ai/usage`
4. Review backend logs for detailed error messages

## Conclusion

You now have a complete OpenAI integration for your AI Insights Dashboard! The backend services are production-ready, and the frontend service provides a clean TypeScript interface.

**To start using it:**
1. Add your `OPENAI_API_KEY` to `.env`
2. Restart your backend server
3. Test the integration: `GET /api/admin/ai/health`
4. Update your frontend components to use `aiInsightsService`

Happy AI-powered insights! 🚀
