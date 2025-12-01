# Seller Return Performance Analytics API

## Overview

The Seller Return Performance Analytics API provides comprehensive analytics on seller return performance, including return metrics, compliance scoring, and comparative analysis across sellers.

## Authentication

All endpoints require admin authentication via the `adminAuthMiddleware`.

## Endpoints

### 1. Get Seller Return Metrics

Get comprehensive return metrics for a specific seller.

**Endpoint:** `GET /api/admin/returns/seller/:sellerId/metrics`

**Parameters:**
- `sellerId` (path, required): The ID of the seller
- `startDate` (query, optional): Start date for analysis (ISO 8601 format)
- `endDate` (query, optional): End date for analysis (ISO 8601 format)

**Default Time Range:** Last 30 days if dates not provided

**Response:**
```json
{
  "success": true,
  "data": {
    "sellerId": "seller-123",
    "sellerName": "Example Store",
    "totalReturns": 45,
    "approvedReturns": 38,
    "rejectedReturns": 5,
    "pendingReturns": 2,
    "returnRate": 8.5,
    "approvalRate": 84.4,
    "averageProcessingTime": 28.5,
    "averageRefundAmount": 45.50,
    "totalRefundAmount": 1729.00,
    "customerSatisfactionScore": 4.2,
    "complianceScore": 87.5,
    "riskScore": 15,
    "timeRange": {
      "start": "2024-01-01T00:00:00.000Z",
      "end": "2024-01-31T23:59:59.999Z"
    }
  }
}
```

**Validates:** Requirements 2.1 (return rates by seller)

---

### 2. Get Seller Compliance Metrics

Get compliance metrics and policy violations for a specific seller.

**Endpoint:** `GET /api/admin/returns/seller/:sellerId/compliance`

**Parameters:**
- `sellerId` (path, required): The ID of the seller
- `startDate` (query, optional): Start date for analysis
- `endDate` (query, optional): End date for analysis

**Response:**
```json
{
  "success": true,
  "data": {
    "sellerId": "seller-123",
    "sellerName": "Example Store",
    "complianceScore": 87.5,
    "policyViolations": 2,
    "processingTimeCompliance": 92.3,
    "approvalRateDeviation": 5.2,
    "customerComplaintRate": 3.1,
    "violations": [
      {
        "violationType": "processing_delay",
        "severity": "major",
        "description": "5 returns processed beyond 48-hour SLA",
        "occurrenceCount": 5,
        "firstOccurrence": "2024-01-05T10:30:00.000Z",
        "lastOccurrence": "2024-01-28T15:45:00.000Z"
      }
    ],
    "recommendations": [
      "Improve return processing speed to meet 48-hour SLA",
      "Maintain current excellent customer satisfaction levels"
    ]
  }
}
```

**Validates:** 
- Requirements 5.1 (policy compliance verification)
- Requirements 5.2 (violation detection)
- Property 15 (Policy Compliance Verification)
- Property 16 (Violation Detection and Response)

---

### 3. Compare Seller Performance

Compare a seller's performance against platform averages and other sellers.

**Endpoint:** `GET /api/admin/returns/seller/:sellerId/comparison`

**Parameters:**
- `sellerId` (path, required): The ID of the seller
- `startDate` (query, optional): Start date for analysis
- `endDate` (query, optional): End date for analysis

**Response:**
```json
{
  "success": true,
  "data": {
    "sellerId": "seller-123",
    "sellerName": "Example Store",
    "metrics": {
      "returnRate": 8.5,
      "approvalRate": 84.4,
      "averageProcessingTime": 28.5,
      "customerSatisfactionScore": 4.2,
      "complianceScore": 87.5
    },
    "ranking": {
      "returnRateRank": 15,
      "approvalRateRank": 8,
      "processingTimeRank": 12,
      "satisfactionRank": 6,
      "overallRank": 10
    },
    "percentiles": {
      "returnRate": 65.5,
      "approvalRate": 78.2,
      "processingTime": 72.1,
      "satisfaction": 85.3
    }
  }
}
```

**Validates:**
- Requirements 5.3 (outlier seller identification)
- Requirements 6.5 (comparative analysis)
- Property 17 (Statistical Outlier Identification)
- Property 20 (Comparative Analysis and Best Practices)

---

### 4. Get Platform Averages

Get platform-wide return averages for comparison.

**Endpoint:** `GET /api/admin/returns/platform/averages`

**Parameters:**
- `startDate` (query, optional): Start date for analysis
- `endDate` (query, optional): End date for analysis

**Response:**
```json
{
  "success": true,
  "data": {
    "averageReturnRate": 7.8,
    "averageApprovalRate": 82.5,
    "averageProcessingTime": 32.1,
    "averageCustomerSatisfaction": 4.1,
    "medianReturnRate": 7.2,
    "medianApprovalRate": 83.0,
    "medianProcessingTime": 30.5
  }
}
```

---

### 5. Get All Sellers Performance

Get performance metrics for all sellers.

**Endpoint:** `GET /api/admin/returns/sellers/performance`

**Parameters:**
- `startDate` (query, optional): Start date for analysis
- `endDate` (query, optional): End date for analysis
- `sortBy` (query, optional): Field to sort by (returnRate, approvalRate, processingTime, satisfaction)
- `order` (query, optional): Sort order (asc, desc)
- `limit` (query, optional): Maximum number of results

**Response:**
```json
{
  "success": true,
  "data": {
    "sellers": [],
    "platformAverages": {
      "averageReturnRate": 7.8,
      "averageApprovalRate": 82.5,
      "averageProcessingTime": 32.1,
      "averageCustomerSatisfaction": 4.1
    },
    "timeRange": {
      "start": "2024-01-01T00:00:00.000Z",
      "end": "2024-01-31T23:59:59.999Z"
    }
  }
}
```

---

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

**Common Error Codes:**
- `400` - Bad Request (missing or invalid parameters)
- `401` - Unauthorized (invalid or missing authentication)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (seller not found)
- `500` - Internal Server Error

---

## Metrics Definitions

### Return Rate
Percentage of orders that result in return requests.
```
returnRate = (totalReturns / totalOrders) * 100
```

### Approval Rate
Percentage of return requests that are approved.
```
approvalRate = (approvedReturns / totalReturns) * 100
```

### Average Processing Time
Average time (in hours) from return request to approval/rejection.
```
averageProcessingTime = sum(processingTimes) / count(processedReturns)
```

### Compliance Score
Overall compliance score (0-100) based on:
- Processing time compliance (30% weight)
- Approval rate deviation (40% weight)
- Customer complaint rate (20% weight)
- Violation count (10% weight)

### Processing Time Compliance
Percentage of returns processed within 48-hour SLA.
```
processingTimeCompliance = (returnsWithin48Hours / totalReturns) * 100
```

### Approval Rate Deviation
Absolute difference between seller's approval rate and platform average.
```
approvalRateDeviation = |sellerApprovalRate - platformAverageApprovalRate|
```

---

## Usage Examples

### Get Seller Metrics for Last 30 Days
```bash
curl -X GET \
  'https://api.linkdao.com/api/admin/returns/seller/seller-123/metrics' \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN'
```

### Get Seller Metrics for Specific Date Range
```bash
curl -X GET \
  'https://api.linkdao.com/api/admin/returns/seller/seller-123/metrics?startDate=2024-01-01&endDate=2024-01-31' \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN'
```

### Get Seller Compliance Metrics
```bash
curl -X GET \
  'https://api.linkdao.com/api/admin/returns/seller/seller-123/compliance' \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN'
```

### Compare Seller Performance
```bash
curl -X GET \
  'https://api.linkdao.com/api/admin/returns/seller/seller-123/comparison' \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN'
```

---

## Integration Notes

1. **Caching**: Results are cached for 5 minutes to improve performance
2. **Rate Limiting**: API is rate-limited to 100 requests per minute per admin user
3. **Real-Time Updates**: Metrics are calculated on-demand but may have up to 30-second delay for real-time data
4. **Data Retention**: Historical data is retained for 2 years for compliance purposes

---

## Correctness Properties

This API implements the following correctness properties:

- **Property 4**: Comprehensive Trend Analysis - includes all dimensions (category, seller, time period, return reason)
- **Property 15**: Policy Compliance Verification - verifies seller compliance with policies
- **Property 16**: Violation Detection and Response - detects violations and generates alerts
- **Property 17**: Statistical Outlier Identification - identifies sellers with significantly different metrics
- **Property 20**: Comparative Analysis and Best Practices - highlights best practices and improvement areas

---

## Support

For API support or questions, contact the admin support team or refer to the main API documentation.
