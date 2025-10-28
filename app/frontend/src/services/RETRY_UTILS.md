# Retry Utility Implementation

## Overview

This document describes the implementation of retry utilities with exponential backoff for API calls in the LinkDAO platform. The implementation provides:

1. **Exponential Backoff** - Delays between retries increase exponentially
2. **Jitter** - Randomization to prevent thundering herd problems
3. **Configurable Retry Logic** - Customizable retry conditions and parameters
4. **Fetch Integration** - Enhanced fetch with built-in retry support

## Architecture

### Core Components

1. **retryWithBackoff** - Generic retry function with exponential backoff
2. **fetchWithRetry** - Enhanced fetch with retry logic
3. **RetryOptions** - Configuration interface for retry behavior

### Features

#### Exponential Backoff
The retry delay increases exponentially with each attempt:
```
delay = min(initialDelay * (exponentialBase ^ attempt), maxDelay)
```

#### Jitter
Randomization is added to retry delays to prevent synchronized retries:
```
totalDelay = delay + (random * 0.1 * delay)
```

#### Configurable Retry Conditions
Custom logic determines which errors should trigger retries:
```typescript
shouldRetry: (error: any) => boolean
```

## Implementation Details

### 1. Generic Retry Function

The `retryWithBackoff` function can wrap any async function:

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T>
```

Usage example:
```typescript
const result = await retryWithBackoff(
  async () => {
    const response = await fetch('/api/data');
    if (!response.ok) throw new Error('Request failed');
    return response.json();
  },
  {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000
  }
);
```

### 2. Enhanced Fetch

The `fetchWithRetry` function provides fetch with built-in retry logic:

```typescript
async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response>
```

Usage example:
```typescript
const response = await fetchWithRetry(
  '/api/communities/123',
  { method: 'GET' },
  { maxRetries: 3, initialDelay: 1000 }
);
```

### 3. Default Retry Conditions

The default retry logic handles common failure scenarios:

```typescript
const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  exponentialBase: 2,
  shouldRetry: (error: any) => {
    // Retry on network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true;
    }
    
    // Retry on 5xx errors and 429 (rate limited)
    if (error.response) {
      const status = error.response.status;
      return status >= 500 || status === 429;
    }
    
    return false;
  }
};
```

## Usage Examples

### Basic Retry
```typescript
import { retryWithBackoff } from './retryUtils';

async function fetchUserData(userId: string) {
  return retryWithBackoff(
    async () => {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    }
  );
}
```

### Custom Retry Conditions
```typescript
import { retryWithBackoff, RetryOptions } from './retryUtils';

const customRetryOptions: RetryOptions = {
  maxRetries: 5,
  initialDelay: 500,
  maxDelay: 5000,
  shouldRetry: (error: any) => {
    // Retry on specific error codes
    return error.status === 503 || error.status === 429 || error.status >= 500;
  }
};

const result = await retryWithBackoff(someFunction, customRetryOptions);
```

### Enhanced Fetch with Retry
```typescript
import { fetchWithRetry } from './retryUtils';

const response = await fetchWithRetry(
  '/api/communities',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'New Community' })
  },
  {
    maxRetries: 3,
    initialDelay: 1000
  }
);
```

## Error Handling

### Network Errors
- Connection timeouts trigger retries
- DNS failures trigger retries
- SSL/TLS errors trigger retries

### HTTP Errors
- 5xx server errors trigger retries
- 429 rate limiting triggers retries
- 4xx client errors do NOT trigger retries (except 429)

### Timeout Handling
- Each retry has its own timeout
- Overall operation timeout is managed by the caller
- AbortController integration for request cancellation

## Performance Considerations

### Delay Calculation
- Exponential backoff prevents overwhelming the server
- Maximum delay prevents excessively long waits
- Jitter prevents synchronized retries across clients

### Memory Usage
- Minimal memory overhead per retry operation
- No persistent state between operations
- Automatic cleanup of timers and resources

### Concurrency
- Each retry operation is independent
- No shared state between concurrent operations
- Thread-safe implementation

## Testing

### Unit Tests
- Successful immediate resolution
- Successful retry after failures
- Proper error propagation after max retries
- Custom retry condition evaluation
- Delay timing verification

### Integration Tests
- Network error handling
- HTTP error handling
- Timeout scenarios
- Concurrent operation testing

### Mock Testing
- Fetch mocking for network simulation
- Timer mocking for delay verification
- Error condition simulation

## Best Practices

### When to Use Retries
1. **Network Operations** - API calls, data fetching
2. **Idempotent Operations** - GET, PUT, DELETE requests
3. **Critical Operations** - User-facing actions that must succeed

### When NOT to Use Retries
1. **Non-idempotent Operations** - POST requests that create resources
2. **User-Interactive Operations** - Real-time user input processing
3. **Resource-Intensive Operations** - Large file uploads/downloads

### Configuration Guidelines
1. **Max Retries** - 3-5 for most operations
2. **Initial Delay** - 1-2 seconds for user-facing operations
3. **Max Delay** - 30 seconds to prevent excessive waiting
4. **Exponential Base** - 2 for standard exponential backoff

## Monitoring and Debugging

### Logging
- Warning logs for each retry attempt
- Error logs for final failures
- Success logs for successful retries

### Metrics
- Retry attempt counts
- Success/failure rates
- Average retry delays
- Operation duration tracking

### Debugging Tools
- Detailed error stack traces
- Retry attempt tracking
- Configuration inspection
- Performance profiling

## Future Enhancements

### Planned Features
1. **Circuit Breaker Pattern** - Prevent retries when service is consistently failing
2. **Retry Budgets** - Limit total retry attempts across all operations
3. **Adaptive Retry Logic** - Adjust retry parameters based on historical success rates
4. **Batch Retry Support** - Handle multiple related operations together

### Performance Improvements
1. **Connection Pooling** - Reuse HTTP connections
2. **Request Batching** - Combine multiple requests when possible
3. **Cache Integration** - Serve from cache during retries
4. **Background Sync** - Defer non-critical operations

## Integration Examples

### Community Service Integration
```typescript
// In communityService.ts
import { fetchWithRetry } from './retryUtils';

static async getCommunityById(id: string): Promise<Community | null> {
  const response = await fetchWithRetry(
    `${BACKEND_API_BASE_URL}/api/communities/${id}`,
    { method: 'GET' },
    COMMUNITY_RETRY_OPTIONS
  );
  // ... handle response
}
```

### Post Service Integration
```typescript
// In communityPostService.ts
import { fetchWithRetry } from './retryUtils';

static async createCommunityPost(data: CreateCommunityPostInput): Promise<CommunityPost> {
  const response = await fetchWithRetry(
    `${BACKEND_API_BASE_URL}/api/communities/${data.communityId}/posts`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    },
    COMMUNITY_POST_RETRY_OPTIONS
  );
  // ... handle response
}
```