# Payment Method Prioritization API Documentation

## Overview

The Payment Method Prioritization API provides intelligent ordering of payment methods based on cost-effectiveness, user preferences, and network availability. This API is designed to integrate seamlessly with checkout flows and provide real-time payment method recommendations.

## Base URL

```
Production: https://api.linkdao.io/v1/payment-prioritization
Staging: https://staging-api.linkdao.io/v1/payment-prioritization
```

## Authentication

All API requests require authentication using a Bearer token:

```http
Authorization: Bearer <your-api-token>
```

## Core Endpoints

### Get Prioritized Payment Methods

Retrieves payment methods ordered by priority for a specific user and transaction context.

```http
POST /prioritize
```

**Request Body:**
```json
{
  "userId": "string",
  "amount": "number",
  "currency": "string",
  "chainId": "number",
  "context": {
    "productId": "string",
    "sellerId": "string",
    "urgency": "low|medium|high"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "prioritizedMethods": [
      {
        "method": {
          "id": "usdc-ethereum",
          "type": "STABLECOIN_USDC",
          "name": "USDC",
          "symbol": "USDC",
          "network": "Ethereum",
          "chainId": 1
        },
        "priority": 1,
        "costEstimate": {
          "totalCost": 105.50,
          "baseCost": 100.00,
          "gasFee": 5.50,
          "exchangeRate": 1.0,
          "estimatedTime": 120,
          "confidence": 0.95
        },
        "availabilityStatus": "available",
        "userPreferenceScore": 0.8,
        "recommendationReason": "Lowest total cost with high reliability"
      }
    ],
    "metadata": {
      "calculatedAt": "2024-01-15T10:30:00Z",
      "validUntil": "2024-01-15T10:35:00Z",
      "gasFeesHigh": false,
      "networkCongestion": "low"
    }
  }
}
```

### Calculate Transaction Costs

Get detailed cost breakdown for specific payment methods.

```http
POST /calculate-costs
```

**Request Body:**
```json
{
  "methods": ["STABLECOIN_USDC", "NATIVE_ETH", "FIAT_STRIPE"],
  "amount": 100,
  "chainId": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "costComparisons": [
      {
        "method": "STABLECOIN_USDC",
        "totalCost": 105.50,
        "breakdown": {
          "baseCost": 100.00,
          "gasFee": 5.50,
          "processingFee": 0.00,
          "exchangeRate": 1.0
        },
        "estimatedTime": 120,
        "confidence": 0.95
      }
    ],
    "recommendedMethod": "STABLECOIN_USDC",
    "potentialSavings": {
      "amount": 15.30,
      "percentage": 12.7,
      "comparedTo": "NATIVE_ETH"
    }
  }
}
```

### Update User Preferences

Record user payment method selection to improve future recommendations.

```http
POST /preferences/update
```

**Request Body:**
```json
{
  "userId": "string",
  "selectedMethod": "STABLECOIN_USDC",
  "transactionContext": {
    "amount": 100,
    "chainId": 1,
    "success": true,
    "actualCost": 105.50,
    "completionTime": 118
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "preferenceUpdated": true,
    "newPreferenceScore": 0.85,
    "learningConfidence": 0.72
  }
}
```

### Get User Preferences

Retrieve current user payment preferences and learning data.

```http
GET /preferences/{userId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "preferences": {
      "preferredMethods": [
        {
          "method": "STABLECOIN_USDC",
          "score": 0.85,
          "usageCount": 15,
          "successRate": 0.93
        }
      ],
      "avoidedMethods": ["NATIVE_ETH"],
      "maxGasFeeThreshold": 50.00,
      "preferStablecoins": true,
      "preferFiat": false,
      "lastUsedMethods": [
        {
          "method": "STABLECOIN_USDC",
          "timestamp": "2024-01-15T09:45:00Z",
          "success": true
        }
      ]
    },
    "learningStats": {
      "totalTransactions": 23,
      "learningConfidence": 0.78,
      "preferencesLastUpdated": "2024-01-15T09:45:00Z"
    }
  }
}
```

## Real-Time Updates

### WebSocket Connection

Connect to real-time payment method updates:

```javascript
const ws = new WebSocket('wss://api.linkdao.io/v1/payment-prioritization/ws');

ws.onopen = () => {
  // Subscribe to updates for specific user
  ws.send(JSON.stringify({
    action: 'subscribe',
    userId: 'user123',
    types: ['cost-updates', 'prioritization-changes']
  }));
};

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  // Handle real-time updates
};
```

**Update Message Format:**
```json
{
  "type": "cost-update",
  "userId": "user123",
  "data": {
    "method": "NATIVE_ETH",
    "newCost": 125.30,
    "previousCost": 110.50,
    "changePercentage": 13.4,
    "reason": "gas-fee-increase"
  },
  "timestamp": "2024-01-15T10:32:00Z"
}
```

## Network and Availability

### Check Network Compatibility

Verify payment method availability for specific networks.

```http
GET /networks/{chainId}/methods
```

**Response:**
```json
{
  "success": true,
  "data": {
    "chainId": 1,
    "networkName": "Ethereum",
    "availableMethods": [
      {
        "method": "STABLECOIN_USDC",
        "contractAddress": "0xA0b86a33E6441E6C7D3E4C2C4C6C6C6C6C6C6C6C",
        "supported": true,
        "minimumAmount": 1.0,
        "maximumAmount": 1000000.0
      }
    ],
    "recommendedMethods": ["STABLECOIN_USDC", "FIAT_STRIPE"],
    "gasFeesHigh": false
  }
}
```

### Get Supported Networks

List all supported networks and their capabilities.

```http
GET /networks
```

**Response:**
```json
{
  "success": true,
  "data": {
    "networks": [
      {
        "chainId": 1,
        "name": "Ethereum",
        "symbol": "ETH",
        "supportedMethods": ["NATIVE_ETH", "STABLECOIN_USDC", "STABLECOIN_USDT"],
        "averageGasFee": 25.50,
        "averageConfirmationTime": 120,
        "status": "healthy"
      },
      {
        "chainId": 137,
        "name": "Polygon",
        "symbol": "MATIC",
        "supportedMethods": ["NATIVE_MATIC", "STABLECOIN_USDC"],
        "averageGasFee": 0.05,
        "averageConfirmationTime": 30,
        "status": "healthy"
      }
    ]
  }
}
```

## Gas Fee and Market Data

### Get Current Gas Fees

Retrieve real-time gas fee estimates from multiple sources.

```http
GET /gas-fees/{chainId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "chainId": 1,
    "gasPrice": {
      "slow": 20,
      "standard": 25,
      "fast": 35,
      "unit": "gwei"
    },
    "estimatedCosts": {
      "erc20Transfer": 5.25,
      "ethTransfer": 2.10,
      "complexTransaction": 12.50,
      "currency": "USD"
    },
    "sources": [
      {
        "name": "Etherscan",
        "gasPrice": 25,
        "confidence": 0.95,
        "lastUpdated": "2024-01-15T10:30:00Z"
      }
    ],
    "networkCongestion": "low",
    "recommendation": "Good time to transact"
  }
}
```

### Get Exchange Rates

Current exchange rates for supported cryptocurrencies.

```http
GET /exchange-rates
```

**Response:**
```json
{
  "success": true,
  "data": {
    "rates": {
      "ETH": {
        "USD": 2450.50,
        "EUR": 2234.25,
        "lastUpdated": "2024-01-15T10:29:00Z",
        "change24h": 2.3
      },
      "USDC": {
        "USD": 1.0001,
        "EUR": 0.9123,
        "lastUpdated": "2024-01-15T10:29:00Z",
        "change24h": 0.01
      }
    },
    "source": "CoinGecko",
    "cacheExpiresAt": "2024-01-15T10:34:00Z"
  }
}
```

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "PRIORITIZATION_FAILED",
    "message": "Unable to prioritize payment methods",
    "details": {
      "reason": "Gas fee estimation service unavailable",
      "retryAfter": 30,
      "fallbackAvailable": true
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_123456789"
  }
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `INVALID_REQUEST` | Request validation failed | 400 |
| `UNAUTHORIZED` | Invalid or missing authentication | 401 |
| `USER_NOT_FOUND` | User ID not found | 404 |
| `NETWORK_UNSUPPORTED` | Chain ID not supported | 400 |
| `PRIORITIZATION_FAILED` | Unable to calculate priorities | 500 |
| `GAS_FEE_UNAVAILABLE` | Gas fee estimation failed | 503 |
| `EXCHANGE_RATE_UNAVAILABLE` | Exchange rate service down | 503 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/prioritize` | 100 requests | 1 minute |
| `/calculate-costs` | 200 requests | 1 minute |
| `/preferences/*` | 50 requests | 1 minute |
| `/gas-fees/*` | 300 requests | 1 minute |
| WebSocket connections | 10 connections | per user |

## SDK Examples

### JavaScript/TypeScript

```typescript
import { PaymentPrioritizationClient } from '@linkdao/payment-prioritization-sdk';

const client = new PaymentPrioritizationClient({
  apiKey: 'your-api-key',
  environment: 'production'
});

// Get prioritized payment methods
const result = await client.prioritizePaymentMethods({
  userId: 'user123',
  amount: 100,
  chainId: 1
});

// Subscribe to real-time updates
client.subscribeToUpdates('user123', (update) => {
  console.log('Payment method update:', update);
});
```

### React Hook

```typescript
import { usePaymentPrioritization } from '@linkdao/react-payment-prioritization';

function CheckoutComponent() {
  const {
    prioritizedMethods,
    loading,
    error,
    updatePreference
  } = usePaymentPrioritization({
    userId: 'user123',
    amount: 100,
    chainId: 1
  });

  const handlePaymentSelection = (method) => {
    updatePreference(method);
    // Process payment...
  };

  return (
    <div>
      {prioritizedMethods.map(method => (
        <PaymentMethodCard
          key={method.method.id}
          method={method}
          onSelect={handlePaymentSelection}
        />
      ))}
    </div>
  );
}
```

## Testing

### Test Environment

```
Base URL: https://test-api.linkdao.io/v1/payment-prioritization
```

### Test Data

Use these test user IDs for consistent behavior:
- `test-user-prefers-usdc`: Always prefers USDC
- `test-user-prefers-fiat`: Always prefers fiat payments
- `test-user-new`: No payment history

### Mock Responses

Enable mock mode for testing:

```http
POST /prioritize
X-Mock-Response: true
```

This will return predictable test data instead of real calculations.

## Changelog

### v1.2.0 (2024-01-15)
- Added real-time WebSocket updates
- Improved preference learning algorithm
- Added network congestion indicators

### v1.1.0 (2024-01-01)
- Added exchange rate integration
- Improved gas fee estimation accuracy
- Added user preference override capabilities

### v1.0.0 (2023-12-15)
- Initial release
- Basic payment method prioritization
- Cost calculation and comparison
- User preference learning