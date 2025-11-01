# AI API Endpoints Documentation

## Overview
This document describes the AI-powered API endpoints added to the LinkDAO platform for community recommendations and engagement insights.

## Endpoints

### 1. Get Community Recommendations
```
POST /api/admin/ai/community-recommendations
```

**Description**: Get personalized community recommendations for a user

**Request Body**:
```json
{
  "userId": "string",
  "joinedCommunities": ["string"],
  "interests": ["string"]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "id": "string",
        "name": "string",
        "displayName": "string",
        "description": "string",
        "memberCount": "number",
        "category": "string",
        "avatar": "string",
        "icon": "string",
        "reason": "string",
        "confidence": "number",
        "matchFactors": ["string"],
        "trendingScore": "number",
        "growthRate": "number"
      }
    ]
  }
}
```

### 2. Get Community Engagement Insights
```
POST /api/admin/ai/community-engagement-insights
```

**Description**: Get AI-generated insights about community engagement patterns

**Request Body**:
```json
{
  "communityIds": ["string"]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "insights": "string"
  }
}
```

### 3. Generate AI Insights (Extended)
```
POST /api/admin/ai/insights/generate
```

**Description**: Generate various types of AI insights, including community recommendations and engagement insights

**Request Body**:
```json
{
  "type": "community_recommendations|community_engagement",
  "context": {
    // Context data specific to the type
  }
}
```

**Response** (for community_recommendations):
```json
{
  "success": true,
  "data": {
    "recommendations": [
      // Array of community recommendations
    ]
  }
}
```

**Response** (for community_engagement):
```json
{
  "success": true,
  "data": {
    "insights": "string"
  }
}
```

## Implementation Details

### Community Recommendation Logic
1. **Input Processing**: Takes user context including joined communities, interests, and activity history
2. **Data Retrieval**: Fetches all public communities from the database
3. **Filtering**: Removes already joined communities from the recommendation pool
4. **AI Analysis**: Uses OpenAI to analyze user context and recommend relevant communities
5. **Trending Integration**: Combines AI recommendations with trending communities for diversity
6. **Scoring**: Calculates confidence scores and match factors for each recommendation
7. **Sorting**: Orders recommendations by confidence score

### Community Engagement Insights Logic
1. **Data Collection**: Gathers community data including member counts, activity metrics, and growth rates
2. **AI Analysis**: Uses OpenAI to analyze engagement patterns and generate natural language insights
3. **Insight Generation**: Provides actionable recommendations for improving community participation

## Error Handling

All endpoints include proper error handling:
- **400 Bad Request**: Missing or invalid parameters
- **500 Internal Server Error**: Issues with AI service or database connectivity
- **503 Service Unavailable**: AI services not configured properly

## Rate Limiting

The AI endpoints implement rate limiting to prevent abuse:
- Maximum 100 requests per hour per user
- Burst limit of 10 requests per minute

## Authentication

All endpoints require admin authentication:
- JWT token validation
- Role-based access control (admin only)

## Performance Considerations

- **Caching**: Results are cached for 5 minutes to reduce AI API calls
- **Batching**: Multiple communities can be analyzed in a single request
- **Asynchronous Processing**: Long-running AI operations are processed asynchronously when possible

## Monitoring

- **Logging**: All API requests are logged for monitoring and debugging
- **Metrics**: Usage statistics are collected for performance analysis
- **Error Tracking**: Exceptions are tracked for quick issue resolution