# LinkDAO Admin API Documentation

This documentation covers the Admin API endpoints, authentication, and integration patterns for the LinkDAO platform.

## 📋 Table of Contents

- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Data Models](#data-models)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Webhooks](#webhooks)
- [SDKs and Libraries](#sdks-and-libraries)
- [Examples](#examples)

## 🔐 Authentication

### Admin Authentication

All admin API endpoints require authentication using JWT tokens with admin privileges.

#### Getting an Admin Token

```http
POST /api/auth/admin/login
Content-Type: application/json

{
  "email": "admin@linkdao.com",
  "password": "your-password",
  "mfaCode": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "user": {
      "id": "admin-123",
      "email": "admin@linkdao.com",
      "role": "admin",
      "permissions": ["read", "write", "delete", "moderate"]
    }
  }
}
```

#### Using the Token

Include the token in the Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Token Refresh

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## 🛠️ API Endpoints

### Dashboard Analytics

#### Get Dashboard Metrics
```http
GET /api/admin/dashboard/metrics
```

**Query Parameters:**
- `timeRange` (string): `1h`, `24h`, `7d`, `30d`, `90d`
- `metrics` (array): Specific metrics to include

**Response:**
```json
{
  "success": true,
  "data": {
    "activeUsers": {
      "current": 1250,
      "change": "+5.2%",
      "trend": "up"
    },
    "systemHealth": {
      "status": "healthy",
      "uptime": 99.98,
      "responseTime": 145
    },
    "moderationQueue": {
      "pending": 23,
      "processed": 156,
      "averageTime": "2.3m"
    }
  }
}
```

#### Get Real-Time Updates
```http
GET /api/admin/dashboard/realtime
```

WebSocket endpoint for real-time dashboard updates:
```javascript
const ws = new WebSocket('wss://api.linkdao.com/admin/realtime');
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  // Handle real-time update
};
```

### User Management

#### List Users
```http
GET /api/admin/users
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `search` (string): Search term
- `status` (string): `active`, `suspended`, `banned`
- `role` (string): User role filter
- `sortBy` (string): Sort field
- `sortOrder` (string): `asc`, `desc`

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user-123",
        "email": "user@example.com",
        "username": "johndoe",
        "status": "active",
        "role": "user",
        "createdAt": "2024-01-15T10:30:00Z",
        "lastActive": "2024-01-20T14:22:00Z",
        "reputation": 85,
        "violations": 0
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1250,
      "pages": 63
    }
  }
}
```

#### Get User Details
```http
GET /api/admin/users/{userId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "username": "johndoe",
      "profile": {
        "displayName": "John Doe",
        "bio": "Web3 enthusiast",
        "avatar": "https://cdn.linkdao.com/avatars/user-123.jpg"
      },
      "stats": {
        "postsCount": 45,
        "commentsCount": 128,
        "likesReceived": 234,
        "reputation": 85
      },
      "activity": {
        "lastLogin": "2024-01-20T14:22:00Z",
        "loginCount": 156,
        "averageSessionTime": "25m"
      },
      "moderation": {
        "violations": [],
        "warnings": 1,
        "suspensions": 0
      }
    }
  }
}
```

#### Update User Status
```http
PATCH /api/admin/users/{userId}/status
Content-Type: application/json

{
  "status": "suspended",
  "reason": "Policy violation",
  "duration": "7d",
  "notifyUser": true
}
```

### Content Moderation

#### Get Moderation Queue
```http
GET /api/admin/moderation/queue
```

**Query Parameters:**
- `priority` (string): `critical`, `high`, `medium`, `low`
- `type` (string): `post`, `comment`, `profile`, `media`
- `status` (string): `pending`, `reviewed`, `escalated`
- `assignee` (string): Moderator ID

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "mod-123",
        "contentId": "post-456",
        "contentType": "post",
        "priority": "high",
        "reportReason": "harassment",
        "reportedBy": "user-789",
        "reportedAt": "2024-01-20T10:15:00Z",
        "aiAnalysis": {
          "riskScore": 0.85,
          "confidence": 0.92,
          "violations": ["harassment", "toxicity"],
          "recommendation": "remove"
        },
        "content": {
          "text": "Content text here...",
          "author": "user-456",
          "createdAt": "2024-01-20T09:30:00Z"
        }
      }
    ],
    "stats": {
      "total": 23,
      "byPriority": {
        "critical": 2,
        "high": 8,
        "medium": 10,
        "low": 3
      }
    }
  }
}
```

#### Take Moderation Action
```http
POST /api/admin/moderation/{itemId}/action
Content-Type: application/json

{
  "action": "remove",
  "reason": "Violates community guidelines",
  "userAction": "warning",
  "notes": "First violation, issued warning"
}
```

### Analytics and Reporting

#### Get Analytics Data
```http
GET /api/admin/analytics/{metric}
```

**Available Metrics:**
- `user-growth`
- `content-volume`
- `engagement`
- `moderation-stats`
- `seller-performance`

**Query Parameters:**
- `timeRange` (string): Time period
- `granularity` (string): `hour`, `day`, `week`, `month`
- `filters` (object): Additional filters

**Response:**
```json
{
  "success": true,
  "data": {
    "metric": "user-growth",
    "timeRange": "30d",
    "data": [
      {
        "date": "2024-01-01",
        "value": 1200,
        "change": "+2.5%"
      }
    ],
    "summary": {
      "total": 15000,
      "growth": "+12.5%",
      "trend": "up"
    }
  }
}
```

#### Generate Custom Report
```http
POST /api/admin/reports/generate
Content-Type: application/json

{
  "name": "Monthly User Report",
  "type": "user-analytics",
  "timeRange": "30d",
  "metrics": ["registrations", "activity", "retention"],
  "filters": {
    "userType": "all",
    "region": "global"
  },
  "format": "pdf",
  "schedule": {
    "frequency": "monthly",
    "recipients": ["admin@linkdao.com"]
  }
}
```

### System Monitoring

#### Get System Health
```http
GET /api/admin/system/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overall": "healthy",
    "services": [
      {
        "name": "api",
        "status": "healthy",
        "responseTime": 145,
        "uptime": 99.98
      },
      {
        "name": "database",
        "status": "healthy",
        "connections": 45,
        "queryTime": 12
      }
    ],
    "metrics": {
      "cpu": 35.2,
      "memory": 68.5,
      "disk": 42.1
    }
  }
}
```

## 📊 Data Models

### User Model
```typescript
interface User {
  id: string;
  email: string;
  username: string;
  status: 'active' | 'suspended' | 'banned';
  role: 'user' | 'moderator' | 'admin';
  profile: {
    displayName: string;
    bio?: string;
    avatar?: string;
  };
  createdAt: string;
  updatedAt: string;
  lastActive?: string;
}
```

### Moderation Item Model
```typescript
interface ModerationItem {
  id: string;
  contentId: string;
  contentType: 'post' | 'comment' | 'profile' | 'media';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'reviewed' | 'escalated';
  reportReason: string;
  reportedBy: string;
  reportedAt: string;
  assignedTo?: string;
  aiAnalysis?: {
    riskScore: number;
    confidence: number;
    violations: string[];
    recommendation: string;
  };
}
```

### Analytics Metric Model
```typescript
interface AnalyticsMetric {
  id: string;
  name: string;
  value: number;
  timestamp: string;
  dimensions?: Record<string, any>;
  metadata?: Record<string, any>;
}
```

## ❌ Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    },
    "timestamp": "2024-01-20T10:30:00Z",
    "requestId": "req-123456"
  }
}
```

### Common Error Codes
- `AUTHENTICATION_REQUIRED` (401): Missing or invalid authentication
- `INSUFFICIENT_PERMISSIONS` (403): User lacks required permissions
- `RESOURCE_NOT_FOUND` (404): Requested resource doesn't exist
- `VALIDATION_ERROR` (400): Invalid request parameters
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_SERVER_ERROR` (500): Server error

## 🚦 Rate Limiting

### Rate Limits
- **General API**: 1000 requests per hour per user
- **Analytics API**: 100 requests per hour per user
- **Real-time endpoints**: 10 connections per user
- **Bulk operations**: 10 requests per minute per user

### Rate Limit Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642694400
X-RateLimit-Retry-After: 3600
```

## 🔗 Webhooks

### Setting Up Webhooks
```http
POST /api/admin/webhooks
Content-Type: application/json

{
  "url": "https://your-app.com/webhooks/admin",
  "events": ["user.created", "content.flagged", "system.alert"],
  "secret": "your-webhook-secret"
}
```

### Webhook Events
- `user.created`: New user registration
- `user.suspended`: User account suspended
- `content.flagged`: Content reported for moderation
- `moderation.completed`: Moderation action taken
- `system.alert`: System alert triggered

### Webhook Payload
```json
{
  "event": "user.created",
  "timestamp": "2024-01-20T10:30:00Z",
  "data": {
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "username": "johndoe"
    }
  },
  "signature": "sha256=..."
}
```

## 📚 SDKs and Libraries

### JavaScript/TypeScript SDK
```bash
npm install @linkdao/admin-sdk
```

```typescript
import { LinkDAOAdmin } from '@linkdao/admin-sdk';

const admin = new LinkDAOAdmin({
  apiKey: 'your-api-key',
  baseURL: 'https://api.linkdao.com'
});

// Get dashboard metrics
const metrics = await admin.dashboard.getMetrics({
  timeRange: '24h'
});

// List users
const users = await admin.users.list({
  page: 1,
  limit: 20,
  status: 'active'
});

// Take moderation action
await admin.moderation.takeAction('mod-123', {
  action: 'approve',
  reason: 'Content meets guidelines'
});
```

### Python SDK
```bash
pip install linkdao-admin
```

```python
from linkdao_admin import LinkDAOAdmin

admin = LinkDAOAdmin(
    api_key='your-api-key',
    base_url='https://api.linkdao.com'
)

# Get system health
health = admin.system.get_health()

# Generate report
report = admin.reports.generate({
    'name': 'Weekly Analytics',
    'type': 'user-analytics',
    'time_range': '7d'
})
```

## 💡 Examples

### Real-Time Dashboard Updates
```javascript
// Connect to real-time updates
const ws = new WebSocket('wss://api.linkdao.com/admin/realtime');

ws.onopen = () => {
  // Subscribe to specific metrics
  ws.send(JSON.stringify({
    action: 'subscribe',
    metrics: ['activeUsers', 'systemHealth', 'moderationQueue']
  }));
};

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  
  switch (update.type) {
    case 'metric_update':
      updateDashboardMetric(update.metric, update.value);
      break;
    case 'alert':
      showAlert(update.message, update.severity);
      break;
  }
};
```

### Bulk User Management
```javascript
// Bulk update user statuses
const bulkUpdate = async (userIds, action) => {
  const results = await Promise.allSettled(
    userIds.map(userId => 
      fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(action)
      })
    )
  );
  
  return results.map((result, index) => ({
    userId: userIds[index],
    success: result.status === 'fulfilled',
    error: result.status === 'rejected' ? result.reason : null
  }));
};
```

### Custom Analytics Query
```javascript
// Build custom analytics query
const getCustomAnalytics = async (config) => {
  const response = await fetch('/api/admin/analytics/custom', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      metrics: config.metrics,
      dimensions: config.dimensions,
      filters: config.filters,
      timeRange: config.timeRange,
      granularity: config.granularity
    })
  });
  
  return response.json();
};

// Usage
const analytics = await getCustomAnalytics({
  metrics: ['user_registrations', 'post_count', 'engagement_rate'],
  dimensions: ['date', 'user_type', 'region'],
  filters: {
    user_type: 'premium',
    region: ['US', 'EU']
  },
  timeRange: '30d',
  granularity: 'day'
});
```

## 🔧 Troubleshooting

### Common Issues

#### Authentication Errors
```javascript
// Handle token expiration
const apiCall = async (url, options) => {
  let response = await fetch(url, options);
  
  if (response.status === 401) {
    // Token expired, refresh it
    const newToken = await refreshToken();
    options.headers.Authorization = `Bearer ${newToken}`;
    response = await fetch(url, options);
  }
  
  return response;
};
```

#### Rate Limiting
```javascript
// Implement exponential backoff
const apiCallWithRetry = async (url, options, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);
    
    if (response.status !== 429) {
      return response;
    }
    
    const retryAfter = response.headers.get('X-RateLimit-Retry-After');
    const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, i) * 1000;
    
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  throw new Error('Max retries exceeded');
};
```

### Debug Mode
Enable debug mode to get detailed request/response information:

```javascript
const admin = new LinkDAOAdmin({
  apiKey: 'your-api-key',
  debug: true // Enables request/response logging
});
```

---

*For more information, visit our [Developer Portal](https://developers.linkdao.com) or contact our [Developer Support](mailto:dev-support@linkdao.com).*