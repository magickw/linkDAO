# Return Analytics Service API Documentation

## Overview

The Return Analytics Service provides comprehensive analytics and real-time monitoring capabilities for the return and refund system. It includes caching, event processing, and detailed metrics calculation.

## Table of Contents

- [Real-Time Metrics](#real-time-metrics)
- [Analytics](#analytics)
- [Event Processing](#event-processing)
- [Cache Management](#cache-management)
- [Types](#types)

---

## Real-Time Metrics

### `getRealtimeMetrics()`

Get current real-time return metrics with automatic caching.

**Returns:** `Promise<RealtimeMetrics>`

**Cache TTL:** 30 seconds

**Example:**
```typescript
const metrics = await returnAnalyticsService.getRealtimeMetrics();

console.log(metrics);
// {
//   timestamp: Date,
//   activeReturns: 42,
//   pendingApproval: 15,
//   pendingRefund: 8,
//   inTransitReturns: 12,
//   returnsPerMinute: 2.4,
//   approvalsPerMinute: 1.2,
//   refundsPerMinute: 0.8,
//   manualReviewQueueDepth: 5,
//   refundProcessingQueueDepth: 8,
//   inspectionQueueDepth: 3,
//   volumeSpikeDetected: false
// }
```

---

## Analytics

### `getEnhancedAnalytics(sellerId: string, period: AnalyticsPeriod)`

Get comprehensive return analytics for a specific seller and time period.

**Parameters:**
- `sellerId` (string): The seller's unique identifier
- `period` (AnalyticsPeriod): Time period for analytics
  - `start` (string): ISO date string for period start
  - `end` (string): ISO date string for period end

**Returns:** `Promise<ReturnAnalytics>`

**Cache TTL:** 10 minutes

**Example:**
```typescript
const analytics = await returnAnalyticsService.getEnhancedAnalytics(
  'seller-123',
  {
    start: '2024-01-01T00:00:00Z',
    end: '2024-01-31T23:59:59Z'
  }
);

console.log(analytics);
// {
//   metrics: {
//     totalReturns: 150,
//     approvedReturns: 120,
//     rejectedReturns: 15,
//     completedReturns: 110,
//     pendingReturns: 25,
//     cancelledReturns: 15,
//     statusDistribution: { ... }
//   },
//   financial: {
//     totalRefundAmount: 15000,
//     averageRefundAmount: 125,
//     maxRefundAmount: 500,
//     minRefundAmount: 25,
//     totalRestockingFees: 750,
//     totalShippingCosts: 450,
//     netRefundImpact: 13800
//   },
//   processingTime: {
//     averageApprovalTime: 24.5,
//     averageRefundTime: 48.2,
//     averageTotalResolutionTime: 96.7,
//     medianApprovalTime: 18.0,
//     p95ApprovalTime: 72.0,
//     p99ApprovalTime: 120.0
//   },
//   risk: {
//     highRiskReturns: 8,
//     mediumRiskReturns: 22,
//     lowRiskReturns: 120,
//     flaggedForReview: 15,
//     fraudDetected: 3,
//     averageRiskScore: 18.5
//   },
//   topReturnReasons: [...],
//   returnsByDay: [...],
//   returnRate: 5.2,
//   customerSatisfaction: 4.3,
//   returnTrends: { ... }
// }
```

### `getStatusDistribution(period: AnalyticsPeriod)`

Get the distribution of return statuses for a given period.

**Parameters:**
- `period` (AnalyticsPeriod): Time period for analysis

**Returns:** `Promise<Record<string, number>>`

**Cache TTL:** 10 minutes

**Example:**
```typescript
const distribution = await returnAnalyticsService.getStatusDistribution({
  start: '2024-01-01T00:00:00Z',
  end: '2024-01-31T23:59:59Z'
});

console.log(distribution);
// {
//   requested: 25,
//   approved: 40,
//   in_transit: 15,
//   received: 12,
//   inspected: 10,
//   refund_processing: 8,
//   completed: 35,
//   rejected: 5
// }
```

### `getProcessingTimeMetrics(sellerId: string, period: AnalyticsPeriod)`

Calculate detailed processing time metrics for returns.

**Parameters:**
- `sellerId` (string): The seller's unique identifier
- `period` (AnalyticsPeriod): Time period for analysis

**Returns:** `Promise<ProcessingTimeMetrics>`

**Cache TTL:** 10 minutes

**Example:**
```typescript
const processingMetrics = await returnAnalyticsService.getProcessingTimeMetrics(
  'seller-123',
  {
    start: '2024-01-01T00:00:00Z',
    end: '2024-01-31T23:59:59Z'
  }
);

console.log(processingMetrics);
// {
//   averageApprovalTime: 24.5,      // hours
//   averageRefundTime: 48.2,        // hours
//   averageTotalResolutionTime: 96.7, // hours
//   medianApprovalTime: 18.0,       // hours
//   p95ApprovalTime: 72.0,          // hours
//   p99ApprovalTime: 120.0          // hours
// }
```

---

## Event Processing

### `processReturnEvent(event: Omit<ReturnEvent, 'id' | 'timestamp'>)`

Process and store a return event with automatic cache invalidation.

**Parameters:**
- `event` (ReturnEvent): Event object containing:
  - `returnId` (string): Return identifier
  - `eventType` (string): Type of event (e.g., 'status_changed', 'refund_initiated')
  - `eventCategory` (string): Category (e.g., 'lifecycle', 'financial', 'communication')
  - `eventData` (any): Event-specific data
  - `previousState` (any, optional): Previous state before event
  - `newState` (any, optional): New state after event
  - `actorId` (string, optional): User who triggered the event
  - `actorRole` (string, optional): Role of the actor
  - `automated` (boolean): Whether event was automated

**Returns:** `Promise<void>`

**Example:**
```typescript
await returnAnalyticsService.processReturnEvent({
  returnId: 'return-123',
  eventType: 'status_changed',
  eventCategory: 'lifecycle',
  eventData: {
    from: 'requested',
    to: 'approved',
    reason: 'Meets return policy criteria'
  },
  previousState: { status: 'requested' },
  newState: { status: 'approved' },
  actorId: 'admin-456',
  actorRole: 'admin',
  automated: false
});
```

### `getReturnEventHistory(returnId: string)`

Retrieve the complete event history for a specific return.

**Parameters:**
- `returnId` (string): Return identifier

**Returns:** `Promise<ReturnEvent[]>`

**Cache TTL:** 10 minutes

**Example:**
```typescript
const events = await returnAnalyticsService.getReturnEventHistory('return-123');

console.log(events);
// [
//   {
//     id: 'event-1',
//     returnId: 'return-123',
//     eventType: 'created',
//     eventCategory: 'lifecycle',
//     eventData: { ... },
//     automated: false,
//     timestamp: Date
//   },
//   {
//     id: 'event-2',
//     returnId: 'return-123',
//     eventType: 'status_changed',
//     eventCategory: 'lifecycle',
//     eventData: { from: 'requested', to: 'approved' },
//     actorId: 'admin-456',
//     actorRole: 'admin',
//     automated: false,
//     timestamp: Date
//   }
// ]
```

---

## Cache Management

### `warmCache(sellerId: string)`

Pre-load analytics data into cache for improved performance.

**Parameters:**
- `sellerId` (string): The seller's unique identifier

**Returns:** `Promise<void>`

**Example:**
```typescript
// Warm cache for a seller (loads last 30 days of analytics)
await returnAnalyticsService.warmCache('seller-123');
```

**Note:** This method automatically loads:
- Enhanced analytics for the last 30 days
- Real-time metrics

---

## Types

### `AnalyticsPeriod`

```typescript
interface AnalyticsPeriod {
  start: string; // ISO date string
  end: string;   // ISO date string
}
```

### `ReturnMetrics`

```typescript
interface ReturnMetrics {
  totalReturns: number;
  approvedReturns: number;
  rejectedReturns: number;
  completedReturns: number;
  pendingReturns: number;
  cancelledReturns: number;
  statusDistribution: Record<string, number>;
}
```

### `FinancialMetrics`

```typescript
interface FinancialMetrics {
  totalRefundAmount: number;
  averageRefundAmount: number;
  maxRefundAmount: number;
  minRefundAmount: number;
  totalRestockingFees: number;
  totalShippingCosts: number;
  netRefundImpact: number;
}
```

### `ProcessingTimeMetrics`

```typescript
interface ProcessingTimeMetrics {
  averageApprovalTime: number;      // In hours
  averageRefundTime: number;        // In hours
  averageTotalResolutionTime: number; // In hours
  medianApprovalTime: number;       // In hours
  p95ApprovalTime: number;          // In hours
  p99ApprovalTime: number;          // In hours
}
```

### `RiskMetrics`

```typescript
interface RiskMetrics {
  highRiskReturns: number;
  mediumRiskReturns: number;
  lowRiskReturns: number;
  flaggedForReview: number;
  fraudDetected: number;
  averageRiskScore: number;
}
```

### `ReturnAnalytics`

```typescript
interface ReturnAnalytics {
  metrics: ReturnMetrics;
  financial: FinancialMetrics;
  processingTime: ProcessingTimeMetrics;
  risk: RiskMetrics;
  topReturnReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
  returnsByDay: Array<{
    date: string;
    count: number;
  }>;
  returnRate: number;
  customerSatisfaction: number;
  returnTrends: {
    monthOverMonth: number;
    weeklyTrend: Array<{
      week: string;
      returns: number;
      refunds: number;
    }>;
  };
}
```

### `ReturnEvent`

```typescript
interface ReturnEvent {
  id: string;
  returnId: string;
  eventType: string;
  eventCategory: string;
  eventData: any;
  previousState?: any;
  newState?: any;
  actorId?: string;
  actorRole?: string;
  automated: boolean;
  timestamp: Date;
}
```

---

## Caching Strategy

The service implements a multi-tier caching strategy:

| Data Type | Cache TTL | Cache Key Pattern |
|-----------|-----------|-------------------|
| Real-time metrics | 30 seconds | `return:metrics:realtime` |
| Hourly aggregates | 5 minutes | `return:hourly:*` |
| Daily aggregates | 30 minutes | `return:daily:*` |
| Comprehensive analytics | 10 minutes | `return:analytics:{sellerId}:{start}:{end}` |
| Status distribution | 10 minutes | `return:status:{start}:{end}` |
| Processing time metrics | 10 minutes | `return:processing:{sellerId}:{start}:{end}` |
| Event history | 10 minutes | `return:events:{returnId}` |

### Cache Invalidation

Caches are automatically invalidated when:
- A new return event is processed
- Return status changes
- Refund transactions are completed
- Manual cache warming is triggered

---

## Performance Considerations

1. **Real-time Metrics**: Updated every 30 seconds, suitable for dashboards
2. **Analytics Queries**: Cached for 10 minutes to reduce database load
3. **Event Processing**: Asynchronous with automatic cache invalidation
4. **Batch Operations**: Use `warmCache()` for bulk pre-loading

---

## Error Handling

All methods throw errors that should be caught and handled appropriately:

```typescript
try {
  const analytics = await returnAnalyticsService.getEnhancedAnalytics(
    'seller-123',
    { start: '2024-01-01T00:00:00Z', end: '2024-01-31T23:59:59Z' }
  );
} catch (error) {
  console.error('Failed to fetch analytics:', error);
  // Handle error appropriately
}
```

Common errors:
- `Redis connection errors`: Service continues with database-only mode
- `Invalid date ranges`: Validation errors thrown
- `Missing required fields`: Validation errors for events
- `Database errors`: Propagated from database layer

---

## Best Practices

1. **Use appropriate time periods**: Shorter periods for real-time dashboards, longer for trend analysis
2. **Warm cache proactively**: Call `warmCache()` for frequently accessed sellers
3. **Handle cache misses gracefully**: Service automatically falls back to database queries
4. **Monitor cache hit rates**: Track Redis performance for optimization
5. **Batch event processing**: Process multiple events together when possible

---

## Integration Example

```typescript
import { returnAnalyticsService } from './services/returnAnalyticsService';

// Dashboard real-time metrics
const realtimeMetrics = await returnAnalyticsService.getRealtimeMetrics();

// Seller analytics for last 30 days
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const analytics = await returnAnalyticsService.getEnhancedAnalytics(
  'seller-123',
  {
    start: thirtyDaysAgo.toISOString(),
    end: new Date().toISOString()
  }
);

// Process a return status change event
await returnAnalyticsService.processReturnEvent({
  returnId: 'return-456',
  eventType: 'status_changed',
  eventCategory: 'lifecycle',
  eventData: { from: 'requested', to: 'approved' },
  actorId: 'admin-789',
  actorRole: 'admin',
  automated: false
});

// Get event history for audit trail
const eventHistory = await returnAnalyticsService.getReturnEventHistory('return-456');
```

---

## Support

For issues or questions, please contact the development team or refer to the main project documentation.
