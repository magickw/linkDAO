# Self-Hosted Storage System Documentation

## Overview

The self-hosted storage system provides a secure, private, and compliant storage solution for sensitive content within the LinkDAO application. It offers end-to-end encryption, access control, backup capabilities, monitoring, and content delivery optimization.

## Key Features

1. **Secure File Storage**: End-to-end encryption with AES-256-GCM
2. **Access Control**: Role-based permissions and file-level access control
3. **Backup & Recovery**: Automated backups with retention policies
4. **Monitoring & Alerting**: Real-time system health and performance monitoring
5. **Content Delivery**: High-performance CDN for optimized content delivery
6. **Compliance**: GDPR-compliant data handling and privacy controls

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   Application   │────│  Storage Routes  │────│ Storage Service  │
└─────────────────┘    └──────────────────┘    └──────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   Auth System    │    │  Backup Service  │    │ Monitor Service  │
└──────────────────┘    └──────────────────┘    └──────────────────┘
                                │
                        ┌──────────────────┐
                        │   CDN Service    │
                        └──────────────────┘
```

## Services

### 1. Self-Hosted Storage Service (`selfHostedStorageService.ts`)

Core storage functionality with encryption and access control.

**Key Methods:**
- `uploadFile()` - Upload encrypted files with metadata
- `downloadFile()` - Download and decrypt files with integrity verification
- `deleteFile()` - Secure file deletion
- `listUserFiles()` - List files with pagination
- `updateAccessControl()` - Modify file permissions
- `getStorageStats()` - Retrieve storage usage statistics

### 2. Backup Service (`backupService.ts`)

Automated backup and disaster recovery system.

**Key Methods:**
- `createFullBackup()` - Complete system backup
- `createIncrementalBackup()` - Backup only changed files
- `restoreFromBackup()` - Restore system from backup
- `listBackups()` - List available backups
- `cleanupOldBackups()` - Manage backup retention

### 3. Storage Monitoring Service (`storageMonitoringService.ts`)

Real-time monitoring and alerting system.

**Key Methods:**
- `getHealthStatus()` - System health assessment
- `getAlerts()` - Retrieve system alerts
- `getSystemMetrics()` - CPU, memory, disk usage
- `getStorageMetrics()` - Storage performance metrics

### 4. CDN Service (`cdnService.ts`)

High-performance content delivery network.

**Key Methods:**
- `start()` - Start CDN server
- `stop()` - Stop CDN server
- `getFileUrl()` - Generate file URLs
- `getThumbnailUrl()` - Generate thumbnail URLs

### 5. Storage Routes (`storageRoutes.ts`)

REST API endpoints for storage operations.

**Endpoints:**
- `POST /api/storage/upload` - Upload file
- `GET /api/storage/:fileId` - Download file
- `DELETE /api/storage/:fileId` - Delete file
- `GET /api/storage/list` - List user files
- `PUT /api/storage/:fileId/access` - Update access control
- `GET /api/storage/stats` - Get storage statistics
- `GET /api/storage/health` - Health check

## Security Features

### Encryption
- AES-256-GCM encryption for all stored files
- Per-file encryption keys
- Integrity verification with checksums

### Access Control
- Role-based permissions (admin, user, moderator, guest)
- File-level read/write permissions
- JWT-based authentication

### Compliance
- GDPR-compliant data handling
- Data residency controls
- Right to deletion implementation

## Configuration

### Environment Variables

```bash
# Storage paths
SELF_HOSTED_STORAGE_PATH=/path/to/storage
SELF_HOSTED_BACKUP_PATH=/path/to/backups

# Encryption keys
SELF_HOSTED_ENCRYPTION_KEY=your-32-byte-encryption-key
BACKUP_ENCRYPTION_KEY=your-backup-encryption-key

# CDN configuration
CDN_PORT=8080
CDN_HOST=localhost
CDN_BASE_PATH=/cdn
CDN_CACHE_MAX_AGE=3600

# Monitoring thresholds
ALERT_THRESHOLD_CPU=80
ALERT_THRESHOLD_MEMORY=85
ALERT_THRESHOLD_DISK=90
ALERT_THRESHOLD_STORAGE_ERRORS=10
```

## Usage Examples

### 1. Uploading a File

```javascript
const fileBuffer = fs.readFileSync('document.pdf');
const result = await selfHostedStorageService.uploadFile(fileBuffer, 'document.pdf', {
  userId: 'user123',
  contentType: 'legal_document',
  encrypt: true,
  accessControl: {
    readPermissions: ['user123', 'admin'],
    writePermissions: ['user123']
  }
});
```

### 2. Downloading a File

```javascript
const { buffer, metadata } = await selfHostedStorageService.downloadFile('file-id-123', 'user123');
// buffer contains the decrypted file content
```

### 3. Setting Up CDN

```javascript
// Start CDN service
await cdnService.start();

// Get file URL
const fileUrl = cdnService.getFileUrl('file-id-123');
```

### 4. Monitoring System Health

```javascript
const health = await storageMonitoringService.getHealthStatus();
console.log(`System status: ${health.status}`);
```

## API Endpoints

### Upload File
```
POST /api/storage/upload
Headers: Authorization: Bearer <token>
Body: multipart/form-data
  - file: <file content>
  - contentType: <content type>
  - encrypt: true/false
  - readPermissions: comma-separated user IDs
  - writePermissions: comma-separated user IDs
```

### Download File
```
GET /api/storage/{fileId}
Headers: Authorization: Bearer <token>
```

### Delete File
```
DELETE /api/storage/{fileId}
Headers: Authorization: Bearer <token>
```

### List Files
```
GET /api/storage/list?limit=50&offset=0
Headers: Authorization: Bearer <token>
```

### Update Access Control
```
PUT /api/storage/{fileId}/access
Headers: Authorization: Bearer <token>
Body: {
  "readPermissions": ["user1", "user2"],
  "writePermissions": ["user1"]
}
```

### Get Storage Statistics
```
GET /api/storage/stats
Headers: Authorization: Bearer <token>
```

## Backup Strategy

1. **Daily Full Backups**: Complete system snapshots
2. **Hourly Incremental Backups**: Only changed files
3. **30-Day Retention**: Automatic cleanup of old backups
4. **Encrypted Storage**: Backup encryption with separate keys
5. **Integrity Verification**: Checksum validation for all backups

## Monitoring and Alerts

### Alert Types
- CPU Usage Thresholds
- Memory Usage Thresholds
- Disk Space Thresholds
- Storage Error Rates
- Backup Status
- Security Events

### Alert Levels
- **Info**: General information
- **Warning**: Potential issues
- **Error**: Problems requiring attention
- **Critical**: Immediate action required

## Performance Optimization

### CDN Features
- Intelligent caching with ETags
- Thumbnail generation on-demand
- Asset optimization (resize, quality adjustment)
- CORS support for cross-origin requests
- Security headers for protection

### Storage Optimization
- Memory-efficient file handling
- Streaming for large files
- Connection pooling for database operations
- Asynchronous operations for better throughput

## Integration with LinkDAO

The self-hosted storage system integrates seamlessly with the existing LinkDAO infrastructure:

1. **Authentication**: Uses existing JWT-based authentication system
2. **User Management**: Integrates with user profiles and roles
3. **API Compatibility**: RESTful endpoints compatible with frontend
4. **Monitoring**: Integrates with existing logging and monitoring systems
5. **Security**: Follows existing security patterns and middleware

## Maintenance

### Regular Tasks
1. Monitor system health and alerts
2. Verify backup integrity
3. Check storage capacity and cleanup if needed
4. Review access logs for security events
5. Update encryption keys periodically

### Emergency Procedures
1. **System Failure**: Restore from latest backup
2. **Data Corruption**: Use file integrity checks to identify issues
3. **Security Breach**: Revoke access and audit permissions
4. **Performance Issues**: Check system metrics and optimize

## Troubleshooting

### Common Issues

1. **Upload Failures**:
   - Check file size limits
   - Verify authentication token
   - Ensure sufficient disk space

2. **Download Failures**:
   - Verify file exists
   - Check access permissions
   - Validate file integrity

3. **Backup Issues**:
   - Check backup storage space
   - Verify encryption keys
   - Review backup logs

4. **Performance Problems**:
   - Monitor system resources
   - Check CDN configuration
   - Review access patterns

### Logs and Diagnostics

All services log to the standard application logging system:
- Info level: General operations
- Warning level: Potential issues
- Error level: Problems requiring attention
- Critical level: System failures

## Future Enhancements

1. **Advanced CDN Features**:
   - Image optimization with Sharp
   - Video transcoding
   - WebP conversion

2. **Enhanced Security**:
   - Multi-factor authentication
   - Advanced encryption options
   - Intrusion detection

3. **Scalability Improvements**:
   - Distributed storage
   - Load balancing
   - Database sharding

4. **Compliance Features**:
   - Audit trails
   - Data portability
   - Enhanced privacy controls