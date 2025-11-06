# Production Configuration Values

This document details the specific configuration values used for different deployment environments.

## Render Free Tier Configuration

### WebSocket Settings
- `maxConnections`: 50
- `memoryThreshold`: 200 MB
- `enableHeartbeat`: false
- `heartbeatInterval`: 60000 ms (60 seconds)
- `messageQueueLimit`: 20
- `connectionTimeout`: 60000 ms (60 seconds)

### Rate Limiting Settings

#### General API Rate Limiting
- `windowMs`: 900000 ms (15 minutes)
- `max`: 500 requests
- `message`: "Too many requests from this IP, please try again later."

#### Feed Endpoint Rate Limiting
- `windowMs`: 60000 ms (1 minute)
- `max`: 10 requests
- `message`: "Too many feed requests, please try again in a minute."

#### Post Creation Rate Limiting
- `windowMs`: 900000 ms (15 minutes)
- `max`: 20 requests
- `message`: "Too many posts created, please try again later."

### Database Connection Pool
- `maxConnections`: 2
- `minConnections`: 1
- `idleTimeoutMillis`: 20000 ms (20 seconds)
- `connectionTimeoutMillis`: 5000 ms (5 seconds)

### Memory Management
- `thresholdWarning`: 300 MB
- `thresholdCritical`: 400 MB
- `gcThreshold`: 250 MB

### External Service Timeouts
- `ipfsTimeout`: 10000 ms (10 seconds)
- `rpcTimeout`: 10000 ms (10 seconds)
- `dnsTimeout`: 3000 ms (3 seconds)
- `maxRetries`: 2

## Render Pro Tier Configuration

### WebSocket Settings
- `maxConnections`: 500
- `memoryThreshold`: 400 MB
- `enableHeartbeat`: true
- `heartbeatInterval`: 30000 ms (30 seconds)
- `messageQueueLimit`: 100
- `connectionTimeout`: 60000 ms (60 seconds)

### Rate Limiting Settings

#### General API Rate Limiting
- `windowMs`: 900000 ms (15 minutes)
- `max`: 2000 requests
- `message`: "Too many requests from this IP, please try again later."

#### Feed Endpoint Rate Limiting
- `windowMs`: 60000 ms (1 minute)
- `max`: 30 requests
- `message`: "Too many feed requests, please try again in a minute."

#### Post Creation Rate Limiting
- `windowMs`: 900000 ms (15 minutes)
- `max`: 100 requests
- `message`: "Too many posts created, please try again later."

### Database Connection Pool
- `maxConnections`: 10
- `minConnections`: 2
- `idleTimeoutMillis`: 30000 ms (30 seconds)
- `connectionTimeoutMillis`: 10000 ms (10 seconds)

### Memory Management
- `thresholdWarning`: 600 MB
- `thresholdCritical`: 800 MB
- `gcThreshold`: 500 MB

### External Service Timeouts
- `ipfsTimeout`: 10000 ms (10 seconds)
- `rpcTimeout`: 10000 ms (10 seconds)
- `dnsTimeout`: 3000 ms (3 seconds)
- `maxRetries`: 2

## Environment Detection Logic

The system determines which configuration to use based on the following environment variables:

1. **Render Free Tier Detection**:
   - `RENDER_SERVICE_TYPE` === 'free'
   - OR `NODE_ENV` === 'production' AND no `RENDER_SERVICE_TYPE` set

2. **Render Pro Tier Detection**:
   - `RENDER_SERVICE_TYPE` === 'pro'

3. **Self-Hosted Detection**:
   - None of the above conditions met

## Fallback Mechanisms

### External Services
1. **Ethereum RPC**:
   - Primary: `https://cloudflare-eth.com`
   - Fallback: `https://mainnet.infura.io/v3/1f6040196b894a6e90ef4842c62503d7`

2. **IPFS Gateway**:
   - Primary: `https://ipfs.io`
   - Fallback: `https://gateway.pinata.cloud`

### Database
- Connection pool automatically adjusts based on available resources
- Statement and query timeouts prevent long-running operations from consuming resources

### Memory Management
- Automatic garbage collection triggered when memory usage exceeds thresholds
- Graceful degradation of features when memory is low
- WebSocket service automatically disabled when memory is critically low

## Rate Limiting Strategy

### Tier-Based Limits
- Free tier has more restrictive limits to prevent abuse and conserve resources
- Pro tier has higher limits to support more active users
- Authenticated users get higher limits than anonymous users

### Adaptive Behavior
- Rate limits are enforced per IP address
- Authenticated users are identified by wallet address
- Violations are tracked and can trigger additional restrictions

## WebSocket Resource Management

### Connection Management
- Maximum connections enforced to prevent resource exhaustion
- Idle connections automatically cleaned up
- Connection timeouts prevent stale connections

### Memory Optimization
- Message queue limits prevent memory buildup
- Heartbeat disabled on constrained environments to save resources
- Graceful degradation when memory usage is high

### Real-time Updates
- Subscription-based messaging to reduce unnecessary traffic
- Message prioritization to ensure critical updates are delivered
- Offline message queuing with priority-based delivery

This configuration ensures the application runs smoothly across different deployment environments while maintaining security and performance standards.