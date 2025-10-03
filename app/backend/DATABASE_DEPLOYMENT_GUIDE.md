# Database Deployment Guide

This guide covers the production database deployment procedures for the marketplace API endpoints.

## Overview

The database deployment system provides:
- Production-ready migration scripts
- Initial data seeding
- Backup and recovery procedures
- Rollback capabilities
- Deployment verification

## Prerequisites

### Environment Variables

Ensure the following environment variables are set:

```bash
DATABASE_URL=postgresql://username:password@host:port/database
```

### Required Tools

- Node.js 18+
- PostgreSQL client tools (pg_dump, psql)
- TypeScript/ts-node

## Deployment Scripts

### 1. Production Migration

Runs all database migrations with production-grade error handling:

```bash
npm run migrate:production
```

Features:
- Environment validation
- Connection testing
- Backup preparation
- Migration verification
- Graceful error handling

### 2. Data Seeding

Seeds initial marketplace data:

```bash
npm run seed:production
```

Seeds:
- Sample seller profiles
- Demo marketplace listings
- Initial reputation data

### 3. Database Backup

#### Create Schema Backup
```bash
npm run backup:schema
```

#### Create Full Backup
```bash
npm run backup:full
```

#### Restore from Backup
```bash
npm run backup:restore /path/to/backup.sql
```

#### List Available Backups
```bash
npm run backup:list
```

### 4. Complete Deployment

Deploy database with migrations and seeding:

```bash
# Full deployment
npm run deploy:db deploy

# Skip backup (faster, but risky)
npm run deploy:db deploy --skip-backup

# Skip seeding (migrations only)
npm run deploy:db deploy --skip-seeding

# Dry run (preview changes)
npm run deploy:db deploy --dry-run
```

### 5. Rollback

Rollback to a previous backup:

```bash
npm run deploy:db rollback /path/to/backup.sql
```

### 6. Deployment Status

Check current deployment status:

```bash
npm run deploy:db status
```

## Production Deployment Workflow

### Initial Deployment

1. **Prepare Environment**
   ```bash
   # Set environment variables
   export DATABASE_URL="postgresql://..."
   
   # Verify connection
   npm run deploy:db status
   ```

2. **Create Pre-deployment Backup**
   ```bash
   npm run backup:full
   ```

3. **Deploy Database**
   ```bash
   npm run deploy:db deploy
   ```

4. **Verify Deployment**
   ```bash
   npm run deploy:db status
   ```

### Updates and Migrations

1. **Create Backup**
   ```bash
   npm run backup:full
   ```

2. **Run Migrations**
   ```bash
   npm run migrate:production
   ```

3. **Verify Success**
   ```bash
   npm run deploy:db status
   ```

### Emergency Rollback

1. **Identify Backup**
   ```bash
   npm run backup:list
   ```

2. **Rollback Database**
   ```bash
   npm run deploy:db rollback /path/to/backup.sql
   ```

3. **Verify Rollback**
   ```bash
   npm run deploy:db status
   ```

## Database Schema

### Core Tables

The deployment creates these critical tables:

#### seller_profiles
- `wallet_address` (PRIMARY KEY)
- `display_name`
- `ens_handle`
- `store_description`
- `is_verified`
- `onboarding_completed`
- `created_at`, `updated_at`

#### marketplace_listings
- `id` (PRIMARY KEY)
- `seller_address` (FOREIGN KEY)
- `title`, `description`
- `price`, `currency`
- `category`, `images`
- `is_active`
- `created_at`, `updated_at`

#### user_reputation
- `wallet_address` (PRIMARY KEY)
- `reputation_score`
- `total_transactions`
- `positive_reviews`, `negative_reviews`
- `last_calculated`

#### auth_sessions
- `session_id` (PRIMARY KEY)
- `wallet_address`
- `session_token`, `refresh_token`
- `expires_at`, `created_at`

## Monitoring and Maintenance

### Health Checks

Monitor database health:

```bash
# Application health check
npm run health

# Database-specific status
npm run deploy:db status
```

### Regular Backups

Set up automated backups:

```bash
# Daily schema backup
0 2 * * * cd /app/backend && npm run backup:schema

# Weekly full backup
0 3 * * 0 cd /app/backend && npm run backup:full
```

### Performance Monitoring

Key metrics to monitor:
- Connection pool usage
- Query response times
- Migration execution time
- Backup completion status

## Troubleshooting

### Common Issues

#### Connection Failures
```bash
# Test connection
npm run deploy:db status

# Check environment variables
echo $DATABASE_URL
```

#### Migration Failures
```bash
# Check migration logs
npm run migrate:production

# Manual migration inspection
psql $DATABASE_URL -c "\dt"
```

#### Backup/Restore Issues
```bash
# Verify backup integrity
npm run backup:list

# Test restore in development
npm run backup:restore /path/to/backup.sql
```

### Error Recovery

1. **Failed Migration**
   - Check error logs
   - Rollback to last known good state
   - Fix migration issues
   - Re-run deployment

2. **Data Corruption**
   - Stop application
   - Restore from latest backup
   - Verify data integrity
   - Resume operations

3. **Performance Issues**
   - Check connection pool settings
   - Analyze slow queries
   - Consider read replicas
   - Optimize indexes

## Security Considerations

### Access Control
- Use dedicated database user for application
- Limit permissions to required operations
- Rotate database credentials regularly

### Backup Security
- Encrypt backup files
- Store backups in secure location
- Implement backup retention policy

### Connection Security
- Use SSL/TLS connections
- Implement connection pooling
- Monitor for suspicious activity

## Best Practices

### Development
- Test migrations in staging environment
- Use dry-run mode for verification
- Keep migration scripts idempotent

### Production
- Always create backups before changes
- Monitor deployment progress
- Have rollback plan ready
- Document all changes

### Maintenance
- Regular backup testing
- Performance monitoring
- Security updates
- Capacity planning

## Support

For issues or questions:
1. Check deployment logs
2. Review troubleshooting section
3. Verify environment configuration
4. Contact development team

## Version History

- v1.0.0 - Initial production deployment system
- Requirements: 7.1, 7.6 from marketplace-api-endpoints spec