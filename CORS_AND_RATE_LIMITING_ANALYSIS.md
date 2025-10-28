# CORS Configuration and Rate Limiting Analysis

## Summary
The LinkDAO backend implements comprehensive CORS (Cross-Origin Resource Sharing) configuration and rate limiting middleware to protect API endpoints and manage traffic.

---

## CORS Configuration

### Location
**Primary Files:**
- `/Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend/src/middleware/corsMiddleware.ts`
- `/Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend/src/middleware/enhancedCorsMiddleware.ts`

### CORS Origins Configuration

#### Production Environment
```typescript
allowedOrigins: [
  'https://linkdao.io',
  'https://www.linkdao.io',
  'https://app.linkdao.io',
  'https://marketplace.linkdao.io'
]
```

#### Staging Environment
```typescript
allowedOrigins: [
  'https://staging.linkdao.io',
  'https://staging-app.linkdao.io',
  'https://staging-marketplace.linkdao.io',
  'http://localhost:3000',
  'http://localhost:3001'
]
```

#### Development Environment
```typescript
allowedOrigins: [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:8080'
]
```

### Allowed Methods
- GET
- POST
- PUT
- DELETE
- PATCH
- OPTIONS

### Allowed Headers
- Origin
- X-Requested-With
- Content-Type
- Accept
- Authorization
- X-Request-ID
- X-Correlation-ID
- X-Session-ID
- X-Wallet-Address
- X-Chain-ID

### Exposed Headers
- X-Request-ID
- X-RateLimit-Limit
- X-RateLimit-Remaining
- X-RateLimit-Reset
- RateLimit-Limit
- RateLimit-Remaining
- RateLimit-Reset
- RateLimit-Policy

### Security Features
1. **Dynamic Origin Validation**: Checks origin against allowed list
2. **Localhost Support in Development**: Automatically allows localhost with any port in dev mode
3. **Preflight Rate Limiting**: Limits preflight requests to 10 per minute per IP/origin
4. **Security Headers**: Sets additional headers like X-Frame-Options, X-XSS-Protection, etc.
5. **Blocked Origins List**: Temporarily blocks repeated CORS violators (5 minutes)
6. **Logging**: Logs blocked origins and suspicious patterns for monitoring

### CORS Middleware Setup in index.ts
Located at line 150 of `/Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend/src/index.ts`:
```typescript
app.use(corsMiddleware);
```

Applied early in the middleware stack (after Helmet) for proper cross-origin request handling.

---

## Authentication Nonce Endpoint

### Location
**Route Definition:** `/Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend/src/routes/authenticationRoutes.ts`
**Controller:** `/Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend/src/controllers/authenticationController.ts`

### Endpoint Details
```
Route: POST /api/auth/nonce
Description: Generate nonce for wallet authentication
Access: Public
```

### Request Validation
- **Wallet Address Format**: Must be valid Ethereum address (`0x[a-fA-F0-9]{40}`)
- **Validation Rule**: Uses express-validator with regex pattern matching
- **Error Handling**: Returns 400 for invalid wallet address

### Rate Limiting Applied
The endpoint uses auth-specific rate limiting:
- **Limit**: 5 attempts per 15 minutes
- **Configuration**: Set in authenticationRoutes.ts line 14:
  ```typescript
  const authRateLimit = authMiddleware.authRateLimit(5, 15);
  ```

### Response Format
**Success (200):**
```json
{
  "success": true,
  "data": {
    "nonce": "string",
    "message": "string",
    "expiresAt": "ISO 8601 datetime"
  }
}
```

**Error (400/500):**
```json
{
  "success": false,
  "error": {
    "code": "NONCE_GENERATION_FAILED",
    "message": "Failed to generate authentication nonce",
    "details": "error message"
  }
}
```

### Related Authentication Endpoints
1. **POST /api/auth/wallet** - Authenticate with signature (rate limited 5/15min)
2. **POST /api/auth/refresh** - Refresh session (rate limited 5/15min)
3. **GET /api/auth/status** - Check auth status (no explicit rate limit)
4. **POST /api/auth/logout** - Logout (optional auth)
5. **GET /api/auth/stats** - Auth statistics (requires auth)
6. **GET /api/auth/health** - Health check

---

## Rate Limiting Middleware

### Primary Implementation Files

#### 1. Enhanced Rate Limiting (`enhancedRateLimiting.ts`)
**Location:** `/Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend/src/middleware/enhancedRateLimiting.ts`

**Features:**
- Dynamic rate limit calculations
- Burst protection
- Whitelist/blacklist support
- IP proxy trust configuration
- Alert thresholds
- Block duration configuration
- Grace periods

**Configuration Options:**
```typescript
interface EnhancedRateLimitConfig {
  windowMs: number;           // Time window in milliseconds
  maxRequests: number;        // Max requests per window
  burstLimit?: number;        // Max requests in burst window
  burstWindowMs?: number;     // Burst window time
  alertThreshold?: number;    // Alert at X% usage
  blockDuration?: number;     // How long to block after limit
  gracePeriod?: number;       // Grace period before blocking
  whitelist?: string[];       // IP whitelist
  blacklist?: string[];       // IP blacklist
  trustProxy?: boolean;       // Trust X-Forwarded-For headers
}
```

**Pre-configured Limiters:**

1. **General Rate Limit** (`enhancedGeneralRateLimit`)
   - Window: 60 seconds
   - Max: 100 requests
   - Burst: 20 requests per 1 second
   - Alert threshold: 80%
   - Block duration: 5 minutes

2. **Auth Rate Limit** (`enhancedAuthRateLimit`)
   - Window: 60 seconds
   - Max: 10 requests
   - Burst: 3 requests per 1 second
   - Alert threshold: 70%
   - Block duration: 10 minutes
   - Custom key: IP + wallet address

3. **API Rate Limit** (`enhancedApiRateLimit`)
   - Window: 60 seconds
   - Max: 200 requests (100 for unauthenticated)
   - Burst: 50 requests per 1 second
   - Alert threshold: 85%
   - Dynamic limits based on authentication
   - Skips health/ping endpoints

#### 2. Rate Limiting Service (`rateLimitingService.ts`)
**Location:** `/Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend/src/services/rateLimitingService.ts`

**Uses:** Redis for distributed rate limiting (with memory store fallback)

**Default Limits:**

User Action Limits:
- Posts: 10 per hour
- Comments: 50 per hour
- Reactions: 200 per hour
- Messages: 100 per hour
- Follows: 20 per hour
- Reports: 5 per hour

IP-Based Limits:
- Registration: 3 per hour
- Login: 10 per 15 minutes
- Password Reset: 3 per hour
- API Calls: 1000 per hour

**Features:**
- Reputation-based dynamic limits
- Sliding window rate limiting
- Whitelist/blacklist support
- Rate limit statistics tracking
- Per-endpoint customization

### Application in index.ts

**Location:** Line 164 of `/Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend/src/index.ts`

```typescript
// Enhanced rate limiting with abuse prevention
app.use(enhancedApiRateLimit);
```

### Rate Limit Headers

The system responds with rate limit information in headers:

**Standard Headers:**
- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Requests remaining in window
- `RateLimit-Reset`: When the window resets (ISO 8601 format)
- `RateLimit-Policy`: Limit and window size

**Legacy Headers (optional):**
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

**Burst Headers:**
- `RateLimit-Burst-Limit`: Burst limit
- `RateLimit-Burst-Remaining`: Burst requests remaining
- `RateLimit-Burst-Reset`: Burst window reset time

### Rate Limit Exceeded Response

**Status Code:** 429 Too Many Requests

**Response Body:**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later.",
    "details": {
      "limit": 100,
      "windowMs": 60000,
      "retryAfter": 45,
      "reason": "rate_limit|burst_limit",
      "blocked": false,
      "blockExpiry": "ISO 8601 datetime"
    }
  },
  "metadata": {
    "requestId": "string",
    "timestamp": "ISO 8601 datetime"
  }
}
```

**Retry-After Header:**
- Specifies seconds to wait before retry
- Set when rate limit exceeded
- Also set for blocked requests (up to 5 minutes)

### Alert and Monitoring

**Alert Conditions:**
1. Usage reaches configured threshold (default 80%)
2. Repeated violations (3+ violations within 1 hour)
3. High burst activity

**Logged Information:**
- IP address
- User agent
- Endpoint
- Current usage percentage
- Request ID
- Timestamp

### Rate Limit Management

**Public Methods:**
```typescript
// Get statistics
getStatistics(): Promise<RateLimitStats>

// Reset rate limit for a key
resetRateLimit(key: string): Promise<void>

// Block a specific key
blockKey(key: string, durationMs?: number): Promise<void>

// Unblock a specific key
unblockKey(key: string): Promise<void>
```

---

## Key Security Considerations

1. **IP Trust Configuration**: Set `trustProxy: true` to properly detect client IP from `X-Forwarded-For` headers
2. **Credential Support**: CORS configured to allow credentials with `credentials: true`
3. **Preflight Caching**: Max age set to 24 hours for preflight requests
4. **Burst Protection**: Separate short-window limits prevent request bursts
5. **Reputation-Based Scaling**: Authenticated users get higher limits
6. **Temporary Blocking**: Bad actors are temporarily blocked after violations
7. **Monitoring**: All rate limit violations and CORS blocks are logged

---

## Environment Variables

Rate limiting and CORS can be configured via:
- `NODE_ENV`: Determines which CORS origins to use
- `REDIS_HOST`: Redis connection for rate limit store
- `REDIS_PORT`: Redis port
- `REDIS_PASSWORD`: Redis authentication
- `CORS_ORIGIN`: Additional CORS origins (comma-separated)
- `RATE_LIMIT_WHITELIST`: IPs to whitelist (comma-separated)
- `RATE_LIMIT_BLACKLIST`: IPs to blacklist (comma-separated)

---

## Integration Flow

1. **Request arrives** → CORS middleware validates origin
2. **Preflight OPTIONS** → Handled separately with its own rate limit
3. **Actual request** → Enhanced rate limiting checks applied
4. **Rate limit exceeded** → Returns 429 with retry information
5. **Request passes** → Routes process request
6. **Response** → Includes rate limit headers

---

## Testing Rate Limits

Example cURL commands:

```bash
# Generate nonce (auth endpoint - 5 per 15 min)
curl -X POST http://localhost:3000/api/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x1234567890123456789012345678901234567890"}'

# Check rate limit headers
curl -I http://localhost:3000/api/marketplace/listings

# Test CORS preflight
curl -X OPTIONS http://localhost:3000/api/auth/nonce \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

---

## Endpoints Using Rate Limiting

- **Auth endpoints**: `/api/auth/*` - 5 attempts per 15 minutes
- **API endpoints**: Generally limited to 100-200 per minute
- **General traffic**: Enhanced API rate limit (100-300 depending on auth)
- **Health checks**: Exempt from rate limiting

