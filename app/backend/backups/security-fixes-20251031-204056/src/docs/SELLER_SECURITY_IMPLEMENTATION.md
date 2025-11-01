# Seller Security Implementation

## Overview

The Seller Security Service provides comprehensive security measures for seller data protection, wallet ownership verification, role-based access control, data sanitization, and audit logging for seller operations.

## Architecture

### Core Components

1. **SellerSecurityService** - Main security service handling all seller-specific security operations
2. **SellerSecurityMiddleware** - Express middleware for request-level security controls
3. **Security Routes** - API endpoints for security operations
4. **Audit Logging** - Comprehensive logging of all seller security events

### Security Features

#### 1. Wallet Ownership Verification

- **Nonce Generation**: Cryptographically secure nonces for signature verification
- **Signature Validation**: Ethereum signature verification for wallet ownership
- **Timestamp Validation**: Time-bound verification to prevent replay attacks
- **Automatic Cleanup**: Expired nonces are automatically cleaned up

```typescript
// Generate verification nonce
const nonce = sellerSecurityService.generateVerificationNonce(walletAddress);

// Verify wallet ownership
const isValid = await sellerSecurityService.verifyWalletOwnership({
  walletAddress,
  signature,
  message,
  timestamp,
  nonce
});
```

#### 2. Role-Based Access Control (RBAC)

**Roles Hierarchy:**
- **SYSTEM** (Level 5) - Automated operations, full access
- **OWNER** (Level 4) - Full control over seller account
- **ADMIN** (Level 3) - Management access, cannot modify permissions
- **MODERATOR** (Level 2) - Content management access
- **VIEWER** (Level 1) - Read-only access

**Permissions by Role:**

| Resource | Owner | Admin | Moderator | Viewer | System |
|----------|-------|-------|-----------|--------|--------|
| Profile | RWD | RW | R | R | RW |
| Listings | RWD | RWD | RW | R | RW |
| Orders | RWU | RWU | RU | R | RWU |
| Analytics | R | R | R | R | RW |
| Settings | RW | R | - | - | - |
| Permissions | RW | - | - | - | - |
| Audit | R | - | - | - | W |

*R=Read, W=Write, D=Delete, U=Update*

#### 3. Session Management

- **Secure Sessions**: Cryptographically secure session IDs
- **Session Validation**: Automatic session timeout and validation
- **Session Cleanup**: Automatic cleanup of expired sessions
- **Session Revocation**: Manual session termination

```typescript
// Create security session
const sessionId = await sellerSecurityService.createSecuritySession(
  walletAddress,
  SellerRole.OWNER,
  ipAddress,
  userAgent
);

// Validate session
const context = await sellerSecurityService.validateSecuritySession(sessionId);

// Revoke session
await sellerSecurityService.revokeSecuritySession(sessionId);
```

#### 4. Data Sanitization

**Sanitization Rules by Context:**

**Storage Context:**
- Remove: `privateKey`, `internalNotes`, `adminFlags`
- Mask: `email`, `phone`
- Preserve: `walletAddress` (needed for storage)

**Transmission Context:**
- Remove: `privateKey`, `internalNotes`, `adminFlags`
- Mask: `email`, `phone`
- Preserve: `walletAddress` (needed for client)

**Logging Context:**
- Remove: `privateKey`, `internalNotes`, `adminFlags`
- Mask: `email`, `phone`, `walletAddress`, `signature`
- Hash: `signature`

```typescript
// Sanitize data for transmission
const sanitized = await sellerSecurityService.sanitizeSellerData(
  sensitiveData, 
  'transmission'
);
```

#### 5. Audit Logging

**Audit Event Types:**
- `access_attempt` - Access validation attempts
- `access_denied` - Denied access attempts
- `wallet_verification` - Wallet ownership verification
- `session_created` - Security session creation
- `session_expired` - Session expiration
- `session_revoked` - Manual session revocation
- `permission_update` - Permission changes
- `security_alert` - Security alerts
- `profile_update` - Profile modifications
- `data_sanitization` - Data sanitization events

```typescript
// Log audit event
await sellerSecurityService.logSellerAuditEvent({
  eventType: 'profile_update',
  walletAddress,
  actorAddress,
  resource: 'profile',
  action: 'update',
  oldState: { name: 'old-name' },
  newState: { name: 'new-name' },
  metadata: { field: 'name' },
  ipAddress,
  userAgent,
  timestamp: new Date()
});
```

## API Endpoints

### Security Operations

#### Generate Verification Nonce
```http
POST /api/seller/security/nonce
Content-Type: application/json

{
  "walletAddress": "0x1234567890123456789012345678901234567890"
}
```

#### Verify Wallet Ownership
```http
POST /api/seller/security/verify
Content-Type: application/json

{
  "walletAddress": "0x1234567890123456789012345678901234567890",
  "signature": "0x...",
  "message": "Verify ownership",
  "timestamp": 1640995200000,
  "nonce": "generated-nonce"
}
```

#### Create Security Session
```http
POST /api/seller/security/session
Content-Type: application/json

{
  "walletAddress": "0x1234567890123456789012345678901234567890",
  "signature": "0x...",
  "message": "Verify ownership",
  "timestamp": 1640995200000,
  "nonce": "generated-nonce",
  "role": "owner"
}
```

#### Get Security Status
```http
GET /api/seller/security/status/0x1234567890123456789012345678901234567890
X-Wallet-Address: 0x1234567890123456789012345678901234567890
X-Session-ID: session-id
```

#### Get Audit Logs
```http
GET /api/seller/security/audit/0x1234567890123456789012345678901234567890?limit=50&offset=0
X-Wallet-Address: 0x1234567890123456789012345678901234567890
X-Session-ID: session-id
```

## Middleware Usage

### Access Validation
```typescript
app.get('/api/seller/:walletAddress/profile',
  sellerSecurityMiddleware.validateSellerAccess(['profile']),
  (req, res) => {
    // Handler code
  }
);
```

### Role Requirements
```typescript
app.post('/api/seller/:walletAddress/settings',
  sellerSecurityMiddleware.validateSellerAccess(['settings']),
  sellerSecurityMiddleware.requireSellerRole(SellerRole.ADMIN),
  (req, res) => {
    // Handler code
  }
);
```

### Audit Logging
```typescript
app.put('/api/seller/:walletAddress/profile',
  sellerSecurityMiddleware.validateSellerAccess(['profile']),
  sellerSecurityMiddleware.auditSellerOperation('profile_update', 'profile', 'update'),
  (req, res) => {
    // Handler code
  }
);
```

### Rate Limiting
```typescript
app.get('/api/seller/:walletAddress/analytics',
  sellerSecurityMiddleware.sellerRateLimit(100, 900000), // 100 requests per 15 minutes
  sellerSecurityMiddleware.validateSellerAccess(['analytics']),
  (req, res) => {
    // Handler code
  }
);
```

### Response Sanitization
```typescript
app.get('/api/seller/:walletAddress/sensitive',
  sellerSecurityMiddleware.validateSellerAccess(['profile']),
  sellerSecurityMiddleware.sanitizeSellerResponse('transmission'),
  (req, res) => {
    // Handler code
  }
);
```

## Security Configuration

### Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your-jwt-secret-min-32-chars
JWT_EXPIRATION=24h
REFRESH_TOKEN_EXPIRATION=7d

# Authentication Settings
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=900000
SESSION_TIMEOUT=3600000
REQUIRE_MFA=false

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=1000
API_RATE_LIMIT_MAX=500
AUTH_RATE_LIMIT_MAX=10

# Encryption
MASTER_ENCRYPTION_KEY=your-64-char-hex-key
KEY_ROTATION_INTERVAL=2592000000
KEY_DERIVATION_ITERATIONS=100000

# Security Monitoring
AUDIT_ENABLED=true
AUDIT_LOG_LEVEL=info
AUDIT_RETENTION_PERIOD=2555
VULNERABILITY_SCANNING_ENABLED=true
```

## Security Best Practices

### 1. Wallet Verification
- Always verify wallet ownership before sensitive operations
- Use time-bound nonces to prevent replay attacks
- Implement proper signature validation
- Clean up expired nonces automatically

### 2. Session Management
- Use cryptographically secure session IDs
- Implement session timeouts
- Provide session revocation capabilities
- Monitor for suspicious session activity

### 3. Access Control
- Implement least privilege principle
- Use role-based access control
- Validate permissions on every request
- Log all access attempts

### 4. Data Protection
- Sanitize data based on context
- Never log sensitive information
- Encrypt sensitive data at rest
- Use secure transmission protocols

### 5. Audit Logging
- Log all security-relevant events
- Include sufficient context in logs
- Implement log integrity protection
- Regular audit log review

## Error Handling

### Security Errors
- **401 Unauthorized**: Invalid or missing authentication
- **403 Forbidden**: Insufficient permissions
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Security system failure

### Error Response Format
```json
{
  "success": false,
  "message": "Access denied",
  "code": "INSUFFICIENT_PERMISSIONS",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "req-123456"
}
```

## Monitoring and Alerting

### Security Metrics
- Failed authentication attempts
- Permission violations
- Rate limit violations
- Session anomalies
- Data access patterns

### Alert Conditions
- Multiple failed authentication attempts
- Unusual access patterns
- Permission escalation attempts
- System security errors
- Audit log tampering

## Testing

### Unit Tests
- Service functionality tests
- Middleware behavior tests
- Error handling tests
- Performance tests

### Integration Tests
- End-to-end security workflows
- API endpoint security tests
- Middleware integration tests
- Database security tests

### Security Tests
- Penetration testing
- Vulnerability scanning
- Access control testing
- Data sanitization testing

## Deployment Considerations

### Production Setup
1. Configure all required environment variables
2. Enable security monitoring
3. Set up audit log storage
4. Configure alerting systems
5. Implement log rotation
6. Set up backup procedures

### Scaling Considerations
- Session storage scaling
- Audit log storage scaling
- Rate limiting distribution
- Security monitoring scaling

## Compliance

### Data Protection
- GDPR compliance through data sanitization
- Right to be forgotten implementation
- Data minimization principles
- Consent management

### Security Standards
- OWASP security guidelines
- Industry best practices
- Regular security audits
- Vulnerability management

## Troubleshooting

### Common Issues
1. **Session Timeout**: Check session timeout configuration
2. **Permission Denied**: Verify role assignments
3. **Rate Limiting**: Check rate limit configuration
4. **Audit Logging**: Verify audit service configuration

### Debug Mode
Enable debug logging for detailed security event information:
```bash
AUDIT_LOG_LEVEL=debug
```

## Future Enhancements

### Planned Features
- Multi-factor authentication
- Advanced threat detection
- Machine learning-based anomaly detection
- Integration with external security services
- Advanced audit analytics
- Automated incident response