# Payment Method Prioritization - Technical Troubleshooting Guide

## System Architecture Overview

The Payment Method Prioritization system consists of several interconnected services:

- **PaymentMethodPrioritizationService**: Core prioritization logic
- **CostEffectivenessCalculator**: Real-time cost analysis
- **NetworkAvailabilityChecker**: Network and token compatibility
- **UserPreferenceManager**: Learning and preference storage
- **GasFeeEstimationService**: Multi-source gas fee aggregation

## Common Issues and Solutions

### 1. Prioritization Not Working

**Symptoms:**
- Payment methods appear in wrong order
- Cost-effective options not prioritized
- System defaults to ETH despite high gas fees

**Diagnostic Steps:**
```bash
# Check service health
curl -X GET /api/payment-prioritization/health

# Verify prioritization logic
curl -X POST /api/payment-prioritization/debug \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123", "amount": 100, "chainId": 1}'
```

**Common Causes:**
1. **Gas Fee Service Down**: Check external API connectivity
2. **Preference Data Corruption**: Clear user preferences and retry
3. **Network Configuration Error**: Verify supported tokens registry

**Solutions:**
```javascript
// Reset user preferences
await userPreferenceManager.resetPreferences(userId);

// Force refresh gas fee data
await gasFeeEstimationService.forceRefresh();

// Validate network configuration
await networkAvailabilityChecker.validateConfiguration();
```

### 2. Inaccurate Cost Calculations

**Symptoms:**
- Displayed costs don't match actual transaction costs
- Exchange rates seem outdated
- Gas fee estimates significantly off

**Diagnostic Commands:**
```bash
# Check gas fee sources
curl -X GET /api/payment-prioritization/gas-fees/sources

# Verify exchange rates
curl -X GET /api/payment-prioritization/exchange-rates/status

# Test cost calculation
curl -X POST /api/payment-prioritization/calculate-cost \
  -H "Content-Type: application/json" \
  -d '{"method": "USDC", "amount": 100, "chainId": 1}'
```

**Root Causes:**
1. **API Rate Limiting**: External services throttling requests
2. **Stale Cache Data**: Cache TTL too long for volatile data
3. **Network Latency**: Slow responses from price feeds

**Fixes:**
```javascript
// Clear cost calculation cache
await costEffectivenessCalculator.clearCache();

// Update API keys and rate limits
await gasFeeEstimationService.rotateApiKeys();

// Reduce cache TTL for volatile data
await cacheService.updateTTL('gas-fees', 30); // 30 seconds
```

### 3. Network Compatibility Issues

**Symptoms:**
- Payment methods missing on certain networks
- Incorrect "unsupported" messages
- Network switching suggestions not working

**Debug Process:**
```javascript
// Check supported tokens for network
const tokens = await networkAvailabilityChecker
  .getAvailablePaymentMethods(chainId);

// Validate network configuration
const config = await networkAvailabilityChecker
  .validateNetworkCompatibility(methods, chainId);

// Test network switching
const suggestions = await networkUnavailabilityHandler
  .handleUnsupportedNetwork(method, currentNetwork, supportedNetworks);
```

**Common Issues:**
1. **Outdated Token Registry**: New tokens not added to configuration
2. **RPC Endpoint Failures**: Network connectivity problems
3. **Contract Address Mismatches**: Wrong token addresses for network

### 4. User Preference Learning Problems

**Symptoms:**
- System not learning from user choices
- Preferences not persisting between sessions
- Incorrect preference scoring

**Investigation:**
```sql
-- Check preference data
SELECT * FROM user_payment_preferences WHERE user_id = 'user123';

-- Verify preference updates
SELECT * FROM payment_method_selections 
WHERE user_id = 'user123' 
ORDER BY created_at DESC LIMIT 10;
```

**Debugging Code:**
```javascript
// Test preference learning
const preferences = await userPreferenceManager
  .getUserPaymentPreferences(userId);

// Simulate preference update
await userPreferenceManager.updatePaymentPreference(
  userId, 
  'USDC', 
  { amount: 100, success: true }
);

// Check preference scoring
const score = await userPreferenceManager
  .calculatePreferenceScore('USDC', preferences);
```

### 5. Real-Time Updates Not Working

**Symptoms:**
- Costs not updating during checkout
- WebSocket connection failures
- Stale prioritization data

**WebSocket Diagnostics:**
```javascript
// Check WebSocket connection
const wsStatus = await paymentWebSocketService.getConnectionStatus();

// Test real-time updates
await paymentWebSocketService.subscribeToUpdates(userId, (update) => {
  console.log('Received update:', update);
});

// Force cost update
await realTimeCostMonitoringService.triggerUpdate(userId);
```

**Connection Issues:**
1. **WebSocket Server Down**: Check server status and restart if needed
2. **Client Connection Drops**: Implement reconnection logic
3. **Rate Limiting**: Too many update requests

## Performance Troubleshooting

### Slow Prioritization Response

**Acceptable Response Times:**
- Payment method prioritization: < 500ms
- Cost calculation: < 1000ms
- Real-time updates: < 200ms

**Performance Monitoring:**
```javascript
// Enable performance metrics
const metrics = await prioritizationPerformanceMetrics.getMetrics();

// Check bottlenecks
const bottlenecks = await prioritizationPerformanceOptimizer
  .identifyBottlenecks();

// Optimize caching
await prioritizationPerformanceOptimizer.optimizeCaching();
```

**Common Bottlenecks:**
1. **External API Calls**: Cache aggressively, use parallel requests
2. **Database Queries**: Add indexes, optimize preference queries
3. **Complex Calculations**: Pre-compute common scenarios

### Memory and Resource Issues

**Monitoring Commands:**
```bash
# Check memory usage
ps aux | grep payment-prioritization

# Monitor API response times
curl -w "@curl-format.txt" -X GET /api/payment-prioritization/health

# Check cache hit rates
redis-cli info stats | grep keyspace
```

**Resource Optimization:**
```javascript
// Clear unused cache entries
await cacheService.cleanup();

// Optimize memory usage
await paymentMethodPrioritizationService.optimizeMemory();

// Reduce concurrent API calls
await gasFeeEstimationService.setMaxConcurrency(5);
```

## Error Handling and Recovery

### Graceful Degradation

When services fail, the system should:
1. Fall back to default prioritization order
2. Use cached data when available
3. Provide clear error messages to users

**Fallback Implementation:**
```javascript
try {
  const prioritizedMethods = await paymentMethodPrioritizationService
    .prioritizePaymentMethods(methods, context);
} catch (error) {
  // Log error and use fallback
  logger.error('Prioritization failed:', error);
  const fallbackMethods = getDefaultPrioritization(methods);
  return fallbackMethods;
}
```

### Error Recovery Procedures

**Service Recovery Steps:**
1. **Identify Failed Component**: Check logs and health endpoints
2. **Isolate Issue**: Determine if it's external API, database, or logic error
3. **Apply Fix**: Restart services, clear cache, or update configuration
4. **Verify Recovery**: Test full prioritization flow
5. **Monitor**: Watch for recurring issues

**Automated Recovery:**
```javascript
// Implement circuit breaker pattern
const circuitBreaker = new CircuitBreaker(gasFeeEstimationService.getGasFees, {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});

// Auto-retry with exponential backoff
const retryConfig = {
  retries: 3,
  factor: 2,
  minTimeout: 1000,
  maxTimeout: 5000
};
```

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Response Times**: Prioritization, cost calculation, updates
2. **Error Rates**: Failed prioritizations, API errors, timeouts
3. **Cache Hit Rates**: Gas fees, exchange rates, preferences
4. **User Satisfaction**: Successful transactions, preference accuracy

### Alert Thresholds

```yaml
alerts:
  prioritization_response_time:
    threshold: 1000ms
    severity: warning
  
  cost_calculation_errors:
    threshold: 5%
    severity: critical
  
  gas_fee_api_failures:
    threshold: 10%
    severity: warning
  
  websocket_connection_drops:
    threshold: 20%
    severity: warning
```

### Health Check Endpoints

```javascript
// System health
GET /api/payment-prioritization/health

// Component status
GET /api/payment-prioritization/status

// Performance metrics
GET /api/payment-prioritization/metrics

// Configuration validation
GET /api/payment-prioritization/config/validate
```

## Configuration Management

### Environment Variables

```bash
# Gas fee estimation
GAS_FEE_API_KEYS=etherscan:key1,alchemy:key2,infura:key3
GAS_FEE_CACHE_TTL=30
GAS_FEE_THRESHOLD_USD=50

# Exchange rates
EXCHANGE_RATE_API_KEY=coingecko_key
EXCHANGE_RATE_CACHE_TTL=60

# WebSocket settings
WEBSOCKET_HEARTBEAT_INTERVAL=30000
WEBSOCKET_RECONNECT_ATTEMPTS=5

# Performance settings
MAX_CONCURRENT_CALCULATIONS=10
CACHE_MAX_SIZE=1000
```

### Network Configuration

```json
{
  "networks": {
    "1": {
      "name": "Ethereum",
      "supportedTokens": ["ETH", "USDC", "USDT"],
      "gasFeeThreshold": 50,
      "rpcEndpoints": ["https://eth-mainnet.alchemyapi.io/v2/key"]
    },
    "137": {
      "name": "Polygon",
      "supportedTokens": ["MATIC", "USDC", "USDT"],
      "gasFeeThreshold": 1,
      "rpcEndpoints": ["https://polygon-rpc.com"]
    }
  }
}
```

## Testing and Validation

### Integration Tests

```javascript
// Test full prioritization flow
describe('Payment Method Prioritization Integration', () => {
  it('should prioritize USDC when gas fees are high', async () => {
    // Mock high gas fees
    mockGasFeeService.setGasPrice(100); // High gas price
    
    const result = await paymentMethodPrioritizationService
      .prioritizePaymentMethods(allMethods, userContext);
    
    expect(result[0].method.type).toBe('STABLECOIN_USDC');
  });
});
```

### Load Testing

```bash
# Test prioritization under load
artillery run load-test-config.yml

# Monitor performance during load test
watch -n 1 'curl -s /api/payment-prioritization/metrics | jq .response_time'
```

### User Acceptance Testing

```javascript
// Test user preference learning
const testScenarios = [
  { selections: ['USDC', 'USDC', 'ETH'], expectedFirst: 'USDC' },
  { selections: ['FIAT', 'FIAT', 'USDC'], expectedFirst: 'FIAT' }
];

for (const scenario of testScenarios) {
  // Simulate user selections
  for (const selection of scenario.selections) {
    await simulateUserSelection(testUserId, selection);
  }
  
  // Check prioritization
  const result = await getPrioritizedMethods(testUserId);
  expect(result[0].method.type).toBe(scenario.expectedFirst);
}
```

## Deployment Considerations

### Rolling Deployment

1. **Deploy Backend Services First**: Ensure API compatibility
2. **Update Frontend Gradually**: Use feature flags for rollout
3. **Monitor Key Metrics**: Watch for regressions during deployment
4. **Rollback Plan**: Keep previous version ready for quick rollback

### Database Migrations

```sql
-- Add indexes for performance
CREATE INDEX idx_user_payment_preferences_user_id 
ON user_payment_preferences(user_id);

CREATE INDEX idx_payment_selections_user_timestamp 
ON payment_method_selections(user_id, created_at);

-- Update preference schema if needed
ALTER TABLE user_payment_preferences 
ADD COLUMN preference_version INTEGER DEFAULT 1;
```

### Cache Warming

```javascript
// Pre-populate cache with common data
await gasFeeEstimationService.warmCache();
await exchangeRateService.warmCache();
await networkAvailabilityChecker.warmCache();
```

This troubleshooting guide should help developers and support teams quickly identify and resolve issues with the payment method prioritization system.