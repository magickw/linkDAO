# Admin Authentication & Authorization System

## Overview

The LinkDAO admin system implements a comprehensive authentication and authorization framework with role-based access control (RBAC), permission management, session tracking, rate limiting, and audit logging.

## Features

### 1. **Role-Based Access Control (RBAC)**
Three hierarchical admin roles:
- **Super Admin**: Full system access, all permissions
- **Admin**: Most permissions except admin management
- **Moderator**: Limited to content moderation and basic analytics

### 2. **Granular Permissions**
14 specific permissions across 5 categories:
- User Management (view, edit, suspend, delete)
- Content Moderation (moderate, delete, feature)
- Marketplace (seller_review, manage)
- Disputes (view, resolve)
- System (analytics, settings, audit)
- Admin Management (manage, roles)

### 3. **Session Management**
- Activity-based session renewal
- 30-minute inactivity timeout
- 8-hour maximum session lifetime
- IP and user-agent tracking
- Session revocation capability

### 4. **Rate Limiting**
- Standard limit: 1000 requests per 15 minutes
- Strict limit: 100 requests per 15 minutes (sensitive operations)
- Super admins can bypass standard rate limits

### 5. **Audit Logging**
- Automatic logging of all admin actions
- Captures: timestamp, admin ID, role, action, IP, user agent, status code
- Request body logging for non-GET requests

### 6. **Security Features**
- JWT token verification
- Session validation
- Permission checks before action execution
- IP and user-agent tracking
- Automatic cleanup of expired sessions

## Usage

### Protecting Admin Routes

```typescript
import {
  adminAuthMiddleware,
  requirePermission,
  requireRole,
  AdminRole
} from '../middleware/adminAuthMiddleware';

// Apply to all admin routes
router.use(adminAuthMiddleware);

// Require specific permission
router.post('/users/:id/suspend',
  requirePermission('users.suspend'),
  controller.suspendUser
);

// Require minimum role
router.delete('/admin/:id',
  requireRole(AdminRole.ADMIN),
  controller.deleteAdmin
);
```

### Frontend Authentication

```typescript
// Include JWT token in requests
const token = localStorage.getItem('adminToken');

fetch('/api/admin/users', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### JWT Token Structure

```json
{
  "userId": "user-123",
  "address": "0x123...",
  "walletAddress": "0x123...",
  "isAdmin": true,
  "role": "admin",
  "permissions": ["users.view", "content.moderate", ...],
  "sessionId": "admin_user-123_1234567890",
  "iat": 1234567890,
  "exp": 1234597890
}
```

## API Endpoints

### Protected Routes

All routes under `/api/admin/*` are protected:

#### Dashboard & Stats
- `GET /api/admin/stats` - Get admin dashboard stats (all admins)
- `GET /api/admin/dashboard/metrics` - Get dashboard metrics (all admins)
- `GET /api/admin/dashboard/status` - Get system status (all admins)
- `GET /api/admin/dashboard/historical` - Historical metrics (requires `system.analytics`)

#### User Management
- `GET /api/admin/users` - List users (requires `users.view`)
- `POST /api/admin/users/:id/suspend` - Suspend user (requires `users.suspend`)
- `POST /api/admin/users/:id/unsuspend` - Unsuspend user (requires `users.suspend`)
- `PUT /api/admin/users/:id/role` - Update role (requires `admin.roles`)

#### Content Moderation
- `GET /api/admin/moderation` - Get moderation queue (requires `content.moderate`)
- `POST /api/admin/moderation/:id/resolve` - Resolve item (requires `content.moderate`)
- `POST /api/admin/moderation/:id/assign` - Assign moderator (requires `content.moderate`)

#### Seller Management
- `GET /api/admin/sellers/applications` - List applications (requires `marketplace.seller_review`)
- `POST /api/admin/sellers/applications/:id/review` - Review application (requires `marketplace.seller_review`)

#### Dispute Resolution
- `GET /api/admin/disputes` - List disputes (requires `disputes.view`)
- `POST /api/admin/disputes/:id/resolve` - Resolve dispute (requires `disputes.resolve`)
- `POST /api/admin/disputes/:id/assign` - Assign dispute (requires `disputes.view`)

#### System Configuration
- `GET /api/admin/policies` - Get policies (requires `system.settings`)
- `POST /api/admin/policies` - Create policy (requires `system.settings`)
- `PUT /api/admin/policies/:id` - Update policy (requires `system.settings`)
- `DELETE /api/admin/policies/:id` - Delete policy (requires `system.settings` + strict rate limit)

#### Audit Logs
- `GET /api/admin/audit/logs` - Get audit logs (requires `system.audit`)
- `GET /api/admin/audit/search` - Search logs (requires `system.audit`)
- `GET /api/admin/audit/analytics` - Audit analytics (requires `system.audit`)
- `GET /api/admin/audit/export` - Export logs (requires Admin role + strict rate limit)
- `GET /api/admin/audit/compliance` - Compliance report (requires Admin role)

## Permission Matrix

| Permission | Super Admin | Admin | Moderator |
|-----------|------------|-------|-----------|
| users.view | ✅ | ✅ | ✅ |
| users.edit | ✅ | ✅ | ❌ |
| users.suspend | ✅ | ✅ | ❌ |
| users.delete | ✅ | ❌ | ❌ |
| content.moderate | ✅ | ✅ | ✅ |
| content.delete | ✅ | ✅ | ✅ |
| content.feature | ✅ | ✅ | ❌ |
| marketplace.seller_review | ✅ | ✅ | ❌ |
| marketplace.manage | ✅ | ✅ | ❌ |
| disputes.view | ✅ | ✅ | ✅ |
| disputes.resolve | ✅ | ✅ | ❌ |
| system.analytics | ✅ | ✅ | ✅ |
| system.settings | ✅ | ❌ | ❌ |
| system.audit | ✅ | ✅ | ❌ |
| admin.manage | ✅ | ❌ | ❌ |
| admin.roles | ✅ | ❌ | ❌ |

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Admin access token required"
}
```

### 403 Forbidden (Insufficient Permission)
```json
{
  "success": false,
  "error": "Permission denied. Required permission: users.suspend",
  "requiredPermission": "users.suspend"
}
```

### 403 Forbidden (Insufficient Role)
```json
{
  "success": false,
  "error": "Insufficient role. Required: admin, Current: moderator"
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "error": "Too many admin requests from this IP, please try again later."
}
```

## Session Management

### Session Creation
Sessions are created automatically upon first authenticated request with valid JWT token.

### Session Validation
- Checked on every request
- Validates user ID matches
- Checks expiration time
- Updates last activity timestamp
- Extends expiration by 30 minutes on activity

### Session Expiration
- **Inactivity timeout**: 30 minutes
- **Maximum lifetime**: 8 hours
- Expired sessions are automatically deleted

### Manual Session Revocation
```typescript
import { revokeAdminSession } from '../middleware/adminAuthMiddleware';

// Revoke specific session
revokeAdminSession('admin_user-123_1234567890');

// Get user's active sessions
import { getUserSessions } from '../middleware/adminAuthMiddleware';
const sessions = getUserSessions('user-123');
```

## Monitoring

### Active Sessions
```typescript
import { getActiveAdminSessionsCount } from '../middleware/adminAuthMiddleware';

const activeCount = getActiveAdminSessionsCount();
console.log(`Active admin sessions: ${activeCount}`);
```

### Audit Logs
All admin actions are logged to console (and can be sent to external audit service):

```json
{
  "timestamp": "2025-01-17T10:30:00.000Z",
  "adminId": "user-123",
  "adminRole": "admin",
  "action": "POST /api/admin/users/456/suspend",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "statusCode": 200,
  "requestBody": {
    "reason": "Violation of terms",
    "duration": 7
  }
}
```

## Best Practices

### 1. **Use Specific Permissions**
Instead of checking `isAdmin`, always check specific permissions:

```typescript
// ❌ Bad
if (user.isAdmin) {
  // Allow action
}

// ✅ Good
if (user.permissions.includes('users.suspend')) {
  // Allow action
}
```

### 2. **Apply Rate Limiting to Sensitive Operations**
```typescript
router.delete('/users/:id',
  strictAdminRateLimiter,
  requirePermission('users.delete'),
  controller.deleteUser
);
```

### 3. **Always Log Admin Actions**
The `adminAuditLogger` middleware is automatically applied to all admin routes.

### 4. **Validate Session on Critical Operations**
Sessions are validated automatically, but you can add additional checks:

```typescript
if (!req.user.sessionId) {
  return res.status(401).json({
    error: 'Session required for this operation'
  });
}
```

### 5. **Use Role Hierarchies for Simple Checks**
When you need "at least X role", use `requireRole`:

```typescript
// Only admins and super admins
router.post('/important-action',
  requireRole(AdminRole.ADMIN),
  controller.action
);
```

## Security Considerations

1. **JWT Secret**: Ensure `JWT_SECRET` environment variable is set to a strong, random value
2. **HTTPS Only**: Always use HTTPS in production
3. **Token Expiration**: Set appropriate JWT expiration times
4. **Session Cleanup**: Expired sessions are cleaned every 60 seconds
5. **Rate Limiting**: Adjust limits based on your needs
6. **Audit Logs**: Store audit logs in a secure, tamper-proof location
7. **IP Allowlisting**: Consider implementing IP allowlisting for admin access

## Future Enhancements

- [ ] Multi-factor authentication (MFA)
- [ ] IP allowlisting configuration
- [ ] Advanced anomaly detection
- [ ] Real-time alert system
- [ ] Session management UI for admins
- [ ] Persistent audit log storage
- [ ] Compliance report generation
- [ ] Role and permission management UI

## Troubleshooting

### Issue: Token Invalid
**Cause**: JWT signature verification failed
**Solution**: Ensure JWT_SECRET matches between token generation and verification

### Issue: Session Expired
**Cause**: No activity for 30 minutes or session older than 8 hours
**Solution**: Re-authenticate to get new token and session

### Issue: Permission Denied
**Cause**: User lacks required permission
**Solution**: Contact super admin to grant necessary permissions

### Issue: Rate Limited
**Cause**: Too many requests in short time
**Solution**: Wait for rate limit window to reset (15 minutes)

## Support

For issues or questions about the admin authentication system:
1. Check this documentation
2. Review audit logs for specific errors
3. Contact the development team
4. Review the source code in `/backend/src/middleware/adminAuthMiddleware.ts`

---

**Last Updated**: 2025-01-17
**Version**: 1.0.0
