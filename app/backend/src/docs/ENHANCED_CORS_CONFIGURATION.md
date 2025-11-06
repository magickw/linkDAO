# Enhanced CORS Configuration

## Overview

The Enhanced CORS Middleware provides comprehensive cross-origin request handling with advanced security features, dynamic origin validation, and comprehensive monitoring capabilities.

## Features

### 1. Dynamic Origin Validation
- **Environment-specific configurations**: Different rules for development, staging, and production
- **Regex pattern matching**: Support for Vercel deployment patterns and wildcard subdomains
- **Runtime origin validation**: Validate origins against current configuration

### 2. Vercel Deployment Support
- Automatic support for Vercel preview deployments
- Pattern matching for `linkdao-*.vercel.app` domains
- Support for branch-specific deployments

### 3. Comprehensive Logging and Monitoring
- Detailed request logging with context information
- Suspicious request detection based on user agents and patterns
- CORS statistics and monitoring endpoints
- Blocked origin tracking with automatic cleanup

### 4. Security Features
- Rate limiting for preflight requests
- Temporary blocking of suspicious origins
- Security headers injection
- Request fingerprinting and threat detection

## Configuration

### Environment Variables

```bash
# Enable emergency CORS mode (development only)
EMERGENCY_CORS=true

# Additional allowed origins (comma-separated)
CORS_ALLOWED_ORIGINS=https://custom-domain.com,https://another-domain.com
CORS_ORIGIN=https://single-domain.com
```

### Environment-Specific Behavior

#### Development
- **Strict validation**: Disabled
- **Dynamic validation**: Enabled
- **Suspicious detection**: Disabled
- **Rate limiting**: Disabled
- **Localhost support**: All ports allowed

#### Staging
- **Strict validation**: Disabled
- **Dynamic validation**: Enabled
- **Suspicious detection**: Enabled
- **Rate limiting**: Enabled
- **Vercel support**: Enabled

#### Production
- **Strict validation**: Enabled
- **Dynamic validation**: Enabled
- **Suspicious detection**: Enabled
- **Rate limiting**: Enabled
- **Security headers**: Enabled

## Allowed Origins

### Production Origins
- `https://linkdao.io`
- `https://www.linkdao.io`
- `https://app.linkdao.io`
- `https://marketplace.linkdao.io`
- `https://api.linkdao.io`
- `https://linkdao-backend.onrender.com`

### Vercel Deployment Patterns
- `https://linkdao.vercel.app`
- `https://linkdao-*.vercel.app` (preview deployments)
- `https://*-linkdao.vercel.app` (branch deployments)
- `https://linkdao-*-*.vercel.app` (complex deployments)

### Development Origins
- `http://localhost:*` (any port)
- `http://127.0.0.1:*` (any port)
- `https://localhost:*` (any port)

## API Endpoints

### CORS Status Monitoring
```
GET /api/cors/status?origin=https://example.com
```

Response:
```json
{
  "success": true,
  "data": {
    "statistics": {
      "preflightCacheSize": 5,
      "blockedOriginsCount": 2,
      "allowedOriginsCount": 15,
      "environment": "production",
      "config": {
        "strictOriginValidation": true,
        "dynamicOriginValidation": true,
        "suspiciousRequestDetection": true,
        "vercelDeploymentSupport": true,
        "rateLimitPreflight": true,
        "logBlocked": true
      }
    },
    "emergencyMode": false,
    "currentOrigin": "https://linkdao.io",
    "originValidation": {
      "allowed": true,
      "reason": "Exact match",
      "matchedPattern": "https://linkdao.io"
    },
    "blockedOrigins": [],
    "timestamp": "2025-11-05T18:45:00.000Z"
  }
}
```

## Suspicious Request Detection

The middleware automatically detects and logs suspicious requests based on:

### User Agent Patterns
- Bot/crawler/spider patterns
- Security scanning tools (sqlmap, nikto, nmap)
- Automated tools (curl, wget, postman)
- Programming language HTTP clients

### Path Patterns
- Admin panel paths (`/admin`, `/wp-admin`)
- Database management (`/phpmyadmin`)
- Server-side script files (`.php`, `.asp`, `.jsp`)
- Configuration and backup paths

### Origin Patterns
- High port numbers (>10000)
- Direct IP addresses
- Suspicious top-level domains (`.tk`, `.ml`, `.ga`)

## Usage Examples

### Basic Usage
```typescript
import { enhancedCorsMiddleware } from './middleware/enhancedCorsMiddleware';

app.use(enhancedCorsMiddleware.middleware());
```

### Environment-Specific Usage
```typescript
import { getEnvironmentCorsMiddleware } from './middleware/enhancedCorsMiddleware';

app.use(getEnvironmentCorsMiddleware());
```

### Custom Configuration
```typescript
import { EnhancedCorsMiddleware } from './middleware/enhancedCorsMiddleware';

const customCors = new EnhancedCorsMiddleware({
  strictOriginValidation: true,
  suspiciousRequestDetection: true,
  vercelDeploymentSupport: false
});

app.use(customCors.middleware());
```

### Runtime Management
```typescript
// Add new allowed origin
enhancedCorsMiddleware.addAllowedOrigin('https://new-subdomain.linkdao.io');

// Remove origin
enhancedCorsMiddleware.removeAllowedOrigin('https://old-subdomain.linkdao.io');

// Get statistics
const stats = enhancedCorsMiddleware.getStatistics();

// Validate origin
const validation = enhancedCorsMiddleware.validateOrigin('https://test.com');

// Reset state (for maintenance)
enhancedCorsMiddleware.reset();
```

## Troubleshooting

### Common Issues

1. **Origin Blocked in Production**
   - Check if origin is in allowed list
   - Verify environment configuration
   - Check for typos in domain names

2. **Vercel Deployment Issues**
   - Ensure `vercelDeploymentSupport` is enabled
   - Check deployment URL pattern
   - Verify environment variables

3. **Development CORS Issues**
   - Use `EMERGENCY_CORS=true` for debugging
   - Check localhost port configuration
   - Verify development environment setup

### Debug Mode

Enable emergency CORS mode for debugging:
```bash
EMERGENCY_CORS=true npm start
```

This enables ultra-permissive CORS settings for troubleshooting connectivity issues.

### Monitoring

Monitor CORS activity through:
- Application logs (debug level)
- CORS status endpoint
- Statistics collection
- Blocked origins tracking

## Security Considerations

1. **Never use emergency CORS in production**
2. **Regularly review allowed origins list**
3. **Monitor suspicious request patterns**
4. **Keep blocked origins list clean**
5. **Use strict validation in production**
6. **Enable comprehensive logging**

## Performance Impact

- **Minimal overhead**: Efficient origin validation
- **Caching**: Preflight request caching reduces load
- **Rate limiting**: Prevents abuse and DoS attacks
- **Memory usage**: Bounded cache sizes with automatic cleanup