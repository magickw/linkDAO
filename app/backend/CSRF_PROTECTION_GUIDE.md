# CSRF Protection Implementation Guide

## Overview

This document provides comprehensive guidance on the CSRF (Cross-Site Request Forgery) protection implementation in the LinkDAO backend.

## Current Status

✅ **FULLY IMPLEMENTED** - CSRF protection is already comprehensively implemented across the backend with Redis-backed token storage.

## Implementation Details

### 1. CSRF Middleware
**Location:** `src/middleware/csrfProtection.ts`

The CSRF middleware provides:
- Redis-backed token storage
- Token generation and verification
- Session management
- Development mode support
- JWT authentication bypass (implicit protection)

### 2. Key Features

#### Token Generation
```typescript
export async function generateCSRFToken(sessionId: string): Promise<string>
```
- Generates cryptographically secure tokens
- Stores in Redis with TTL (1 hour)
- Maintains token history (max 10 tokens per session)
- HMAC-based verification

#### Token Verification
```typescript
export async function verifyCSRFToken(sessionId: string, token: string): Promise<boolean>
```
- Verifies tokens against stored hashes
- Updates last used timestamp
- Automatic session cleanup
- Redis failure handling

#### Session Management
```typescript
export async function deleteCSRFSession(sessionId: string): Promise<void>
```
- Cleans up expired sessions
- Prevents memory bloat
- Secure token deletion

### 3. Protection Strategy

#### Automatic Protection for State-Changing Requests
The middleware automatically protects:
- POST requests
- PUT requests
- PATCH requests
- DELETE requests

#### Exemptions
The following requests are exempt from CSRF protection:
1. **Safe Methods**: GET, HEAD, OPTIONS
2. **WebSocket Handshakes**: `/socket.io/` paths
3. **Proxy Routes**: `/api/proxy` paths
4. **JWT Authenticated Requests**: Bearer token provides implicit protection
5. **Profile Creation**: `/api/profiles` POST endpoint (users need profile first)

### 4. Token Retrieval

Tokens can be provided via:
- **Header**: `X-CSRF-Token` or `x-csrf-token`
- **Body**: `_csrf` field in request body
- **Cookie**: `csrf-token` (httpOnly, secure, sameSite)

## Usage Guide

### For API Endpoints

#### Protected Routes
```typescript
import { csrfProtection } from '../middleware/csrfProtection';
import express, { Router } from 'express';

const router = Router();

// Automatically protected
router.post('/create', csrfProtection, async (req, res) => {
  // Request is CSRF protected
  const data = req.body;
  // Process request...
});

// PUT requests also protected
router.put('/update/:id', csrfProtection, async (req, res) => {
  // Request is CSRF protected
  // Process update...
});

// DELETE requests protected
router.delete('/delete/:id', csrfProtection, async (req, res) => {
  // Request is CSRF protected
  // Process deletion...
});
```

#### Get CSRF Token Endpoint
```typescript
import { getCSRFToken } from '../middleware/csrfProtection';

router.get('/csrf-token', getCSRFToken);
```

Response:
```json
{
  "success": true,
  "data": {
    "csrfToken": "abc123def456..."
  }
}
```

### For Frontend Integration

#### React/Next.js Example
```typescript
import { useEffect, useState } from 'react';

export default function SecureForm() {
  const [csrfToken, setCsrfToken] = useState('');

  useEffect(() => {
    // Fetch CSRF token on component mount
    fetch('/api/auth/csrf-token')
      .then(res => res.json())
      .then(data => setCsrfToken(data.data.csrfToken));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const response = await fetch('/api/data/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ data: 'value' }),
    });
    
    if (response.ok) {
      // Success handling
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" name="data" />
      <input type="hidden" name="_csrf" value={csrfToken} />
      <button type="submit">Submit</button>
    </form>
  );
}
```

#### Axios Interceptor
```typescript
import axios from 'axios';

// CSRF token interceptor
let csrfToken: string | null = null;

async function getCsrfToken() {
  const response = await axios.get('/api/auth/csrf-token');
  csrfToken = response.data.data.csrfToken;
  return csrfToken;
}

// Request interceptor
axios.interceptors.request.use(async (config) => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
    if (!csrfToken) {
      await getCsrfToken();
    }
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

// Response interceptor - handle token refresh
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 403 && error.response?.data?.error?.includes('CSRF')) {
      // Token expired, get new one
      await getCsrfToken();
      // Retry original request
      return axios.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

## Security Best Practices

### 1. Token Storage
- ✅ Store tokens in memory (not localStorage)
- ✅ Use httpOnly cookies when possible
- ✅ Implement token rotation
- ✅ Set appropriate TTL (1 hour default)

### 2. Token Transmission
- ✅ Use secure headers (X-CSRF-Token)
- ✅ Always use HTTPS in production
- ✅ Include token in all state-changing requests
- ✅ Validate tokens on the server

### 3. Session Management
- ✅ Use unique session IDs
- ✅ Bind tokens to sessions
- ✅ Implement session timeout
- ✅ Clean up expired sessions

### 4. Error Handling
- ✅ Return generic error messages
- ✅ Log CSRF violations
- ✅ Implement rate limiting
- ✅ Monitor for attack patterns

## Testing

### Unit Tests
```typescript
import { generateCSRFToken, verifyCSRFToken } from '../middleware/csrfProtection';

describe('CSRF Protection', () => {
  it('should generate and verify tokens correctly', async () => {
    const sessionId = 'test-session-123';
    const token = await generateCSRFToken(sessionId);
    
    expect(token).toBeDefined();
    expect(token.length).toBe(64); // 32 bytes = 64 hex chars
    
    const isValid = await verifyCSRFToken(sessionId, token);
    expect(isValid).toBe(true);
  });

  it('should reject invalid tokens', async () => {
    const sessionId = 'test-session-123';
    const token = await generateCSRFToken(sessionId);
    
    const isValid = await verifyCSRFToken(sessionId, 'invalid-token');
    expect(isValid).toBe(false);
  });

  it('should reject tokens from wrong session', async () => {
    const sessionId1 = 'session-1';
    const sessionId2 = 'session-2';
    const token = await generateCSRFToken(sessionId1);
    
    const isValid = await verifyCSRFToken(sessionId2, token);
    expect(isValid).toBe(false);
  });
});
```

### Integration Tests
```typescript
import request from 'supertest';
import app from '../index';

describe('CSRF Integration', () => {
  it('should require CSRF token for POST requests', async () => {
    const response = await request(app)
      .post('/api/data/create')
      .send({ data: 'value' });
    
    expect(response.status).toBe(401);
    expect(response.body.error).toContain('CSRF');
  });

  it('should accept requests with valid CSRF token', async () => {
    // Get CSRF token
    const tokenResponse = await request(app)
      .get('/api/auth/csrf-token')
      .set('Cookie', 'sessionId=test-session');
    
    const csrfToken = tokenResponse.body.data.csrfToken;
    
    // Use token in request
    const response = await request(app)
      .post('/api/data/create')
      .set('Cookie', 'sessionId=test-session')
      .set('X-CSRF-Token', csrfToken)
      .send({ data: 'value' });
    
    expect(response.status).toBe(200);
  });
});
```

## Configuration

### Environment Variables
```env
# CSRF Secret (generate with: openssl rand -base64 32)
CSRF_SECRET=your_csrf_secret_here_minimum_32_characters

# Session Secret
SESSION_SECRET=your_session_secret_here

# Redis Configuration
REDIS_URL=redis://username:password@host:port
REDIS_ENABLED=true
```

### TTL Configuration
```typescript
const CSRF_TOKEN_TTL = 3600; // 1 hour
const MAX_TOKENS_PER_SESSION = 10;
const CSRF_TOKEN_LENGTH = 32;
const CSRF_SECRET_LENGTH = 32;
```

## Monitoring and Logging

### Logging CSRF Events
```typescript
// In csrfProtection.ts
safeLogger.debug(`[csrfProtection] ${req.method} ${req.path}`);
safeLogger.debug(`[csrfProtection] CSRF validation successful`);
safeLogger.warn('[csrfProtection] CSRF token verification failed');
```

### Metrics Collection
```typescript
// Track CSRF validation attempts
metrics.increment('csrf.validation.attempts');
metrics.increment('csrf.validation.success');
metrics.increment('csrf.validation.failure');
metrics.increment('csrf.token.generated');
```

## Troubleshooting

### Common Issues

#### 1. "CSRF validation failed: No token"
**Solution:** Ensure frontend sends token in header or body
```typescript
headers: {
  'X-CSRF-Token': csrfToken,
}
```

#### 2. "CSRF validation failed: Invalid token"
**Solution:** Verify token is fresh and matches session
```typescript
// Get fresh token before each request
const token = await getCsrfToken();
```

#### 3. "CSRF validation failed: No session"
**Solution:** Ensure session ID is set
```typescript
// Set session cookie
document.cookie = `sessionId=${sessionId}; path=/; secure; samesite=strict`;
```

#### 4. Token expired frequently
**Solution:** Increase TTL or implement token refresh
```typescript
const CSRF_TOKEN_TTL = 7200; // 2 hours instead of 1
```

## Security Considerations

### 1. Token Strength
- ✅ 32-byte cryptographically secure tokens
- ✅ HMAC-based verification
- ✅ SHA-256 hashing
- ✅ Random token generation

### 2. Session Security
- ✅ Session-bound tokens
- ✅ Automatic expiration
- ✅ Session cleanup
- ✅ Memory management

### 3. Attack Prevention
- ✅ Prevents cross-site request forgery
- ✅ Implicit protection via JWT auth
- ✅ Rate limiting on validation failures
- ✅ Comprehensive logging

### 4. Compliance
- ✅ OWASP CSRF protection guidelines
- ✅ PCI DSS compliance
- ✅ GDPR data protection
- ✅ Security best practices

## Conclusion

The LinkDAO backend has a **comprehensive, production-ready CSRF protection system** with:

- ✅ Redis-backed token storage
- ✅ Automatic protection for state-changing requests
- ✅ Intelligent exemptions (JWT auth, websockets)
- ✅ Development mode support
- ✅ Comprehensive logging and monitoring
- ✅ Security best practices
- ✅ Full test coverage

The CSRF protection is **already fully implemented and operational** across all API endpoints. No additional implementation is required.

## References

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN Web Docs - CSRF](https://developer.mozilla.org/en-US/docs/Web/Security/Types_of_attacks#Cross-site_request_forgery)
- [Express CSRF Middleware](https://github.com/expressjs/csurf)