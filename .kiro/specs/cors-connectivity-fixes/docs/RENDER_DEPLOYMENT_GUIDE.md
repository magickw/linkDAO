# Render Deployment Guide for CORS Connectivity Fixes

## Overview

This guide provides comprehensive instructions for deploying the LinkDAO backend with CORS connectivity fixes to Render, optimized for resource constraints and reliable performance.

## Prerequisites

### Required Accounts and Access
- Render account with deployment permissions
- GitHub repository access
- Environment variables and secrets
- Database access credentials

### System Requirements
- Node.js 18+ (specified in package.json)
- PostgreSQL database
- Redis instance (optional, for caching)
- SSL certificate (handled by Render)

## Pre-Deployment Checklist

### 1. Code Preparation

```bash
# Ensure all CORS fixes are committed
git status
git add .
git commit -m "feat: implement CORS connectivity fixes"
git push origin main

# Verify build passes locally
npm run build
npm run test

# Check for security vulnerabilities
npm audit
npm audit fix
```

### 2. Environment Configuration

Create `.env.production` file:
```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/database
DB_POOL_MAX=2
DB_POOL_MIN=1
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000

# CORS Configuration
NODE_ENV=production
CORS_ORIGINS=https://linkdao.io,https://www.linkdao.io,https://app.linkdao.io
CORS_CREDENTIALS=true
CORS_MAX_AGE=86400

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=10
RATE_LIMIT_BURST_LIMIT=5
RATE_LIMIT_WINDOW_MS=60000

# Memory Management
MAX_MEMORY_MB=512
GC_INTERVAL_MS=60000
MEMORY_THRESHOLD_MB=400

# WebSocket Configuration
WS_ENABLED=true
WS_HEARTBEAT_INTERVAL=30000
WS_CONNECTION_TIMEOUT=20000

# Circuit Breaker
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_RECOVERY_TIMEOUT=30000
CIRCUIT_BREAKER_MONITORING_PERIOD=60000

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
ENABLE_REQUEST_LOGGING=true

# Health Check
HEALTH_CHECK_INTERVAL=30000
HEALTH_CHECK_TIMEOUT=5000
```

### 3. Render Service Configuration

Create `render.yaml`:
```yaml
services:
  - type: web
    name: linkdao-backend
    env: node
    plan: starter  # or standard for better performance
    buildCommand: npm ci && npm run build
    startCommand: npm start
    healthCheckPath: /health
    
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: DATABASE_URL
        fromDatabase:
          name: linkdao-db
          property: connectionString
      - key: CORS_ORIGINS
        value: https://linkdao.io,https://www.linkdao.io,https://app.linkdao.io
      - key: DB_POOL_MAX
        value: 2
      - key: MAX_MEMORY_MB
        value: 512
      - key: RATE_LIMIT_REQUESTS_PER_MINUTE
        value: 10
    
    # Resource optimization for Render free tier
    scaling:
      minInstances: 1
      maxInstances: 1
    
    # Health check configuration
    healthCheck:
      path: /health
      intervalSeconds: 30
      timeoutSeconds: 5
      unhealthyThresholdCount: 3
      healthyThresholdCount: 2

databases:
  - name: linkdao-db
    databaseName: linkdao
    user: linkdao_user
    plan: free  # or starter for better performance
```

## Deployment Steps

### 1. Initial Deployment

```bash
# Connect to Render via GitHub
# 1. Go to https://dashboard.render.com
# 2. Click "New +" -> "Web Service"
# 3. Connect your GitHub repository
# 4. Configure service settings:

Service Name: linkdao-backend
Environment: Node
Region: Oregon (US West) or closest to users
Branch: main
Build Command: npm ci && npm run build
Start Command: npm start
```

### 2. Environment Variables Setup

In Render dashboard, add these environment variables:

**Database & Connection**
```
DATABASE_URL: [Auto-generated from database]
DB_POOL_MAX: 2
DB_POOL_MIN: 1
DB_IDLE_TIMEOUT: 30000
DB_CONNECTION_TIMEOUT: 2000
```

**CORS & Security**
```
NODE_ENV: production
CORS_ORIGINS: https://linkdao.io,https://www.linkdao.io
CORS_CREDENTIALS: true
CORS_MAX_AGE: 86400
```

**Performance & Resource Management**
```
MAX_MEMORY_MB: 512
GC_INTERVAL_MS: 60000
MEMORY_THRESHOLD_MB: 400
RATE_LIMIT_REQUESTS_PER_MINUTE: 10
```

**WebSocket & Real-time Features**
```
WS_ENABLED: true
WS_HEARTBEAT_INTERVAL: 30000
WS_CONNECTION_TIMEOUT: 20000
```

**Circuit Breaker & Resilience**
```
CIRCUIT_BREAKER_FAILURE_THRESHOLD: 5
CIRCUIT_BREAKER_RECOVERY_TIMEOUT: 30000
CIRCUIT_BREAKER_MONITORING_PERIOD: 60000
```

### 3. Database Setup

```bash
# Create database in Render
# 1. Go to Render Dashboard
# 2. Click "New +" -> "PostgreSQL"
# 3. Configure database:

Database Name: linkdao-db
Database User: linkdao_user
Region: Same as web service
Plan: Free (or Starter for production)

# Run migrations after database is ready
npm run migrate:production
```

### 4. SSL and Domain Configuration

```bash
# Custom domain setup (if applicable)
# 1. In Render service settings
# 2. Go to "Settings" -> "Custom Domains"
# 3. Add your domain: api.linkdao.io
# 4. Configure DNS CNAME record:

CNAME api linkdao-backend.onrender.com

# SSL is automatically handled by Render
```

## Resource Optimization for Render

### 1. Memory Management

Update `app/backend/src/index.ts`:
```typescript
// Memory monitoring and optimization
const memoryConfig = {
  maxMemoryMB: parseInt(process.env.MAX_MEMORY_MB || '512'),
  gcIntervalMs: parseInt(process.env.GC_INTERVAL_MS || '60000'),
  memoryThresholdMB: parseInt(process.env.MEMORY_THRESHOLD_MB || '400')
};

// Enable garbage collection
if (global.gc) {
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    
    if (heapUsedMB > memoryConfig.memoryThresholdMB) {
      console.log(`Memory usage high: ${heapUsedMB}MB, triggering GC`);
      global.gc();
    }
  }, memoryConfig.gcIntervalMs);
}

// Memory usage monitoring
setInterval(() => {
  const memUsage = process.memoryUsage();
  const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
  
  if (heapUsedMB > memoryConfig.maxMemoryMB * 0.9) {
    console.warn(`Memory usage critical: ${heapUsedMB}MB`);
  }
}, 30000);
```

### 2. Database Connection Optimization

Update database configuration:
```typescript
// Optimized for Render resource constraints
const dbConfig = {
  max: parseInt(process.env.DB_POOL_MAX || '2'),
  min: parseInt(process.env.DB_POOL_MIN || '1'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
  acquireTimeoutMillis: 5000,
  createTimeoutMillis: 3000,
  destroyTimeoutMillis: 5000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 200
};
```

### 3. Request Optimization

```typescript
// Rate limiting optimized for Render
const rateLimitConfig = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  max: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '10'),
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
};
```

## Monitoring and Health Checks

### 1. Health Check Endpoint

Create comprehensive health check:
```typescript
// app/backend/src/routes/healthRoutes.ts
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version,
    environment: process.env.NODE_ENV,
    services: {}
  };

  try {
    // Database health check
    await db.query('SELECT 1');
    health.services.database = 'healthy';
  } catch (error) {
    health.services.database = 'unhealthy';
    health.status = 'degraded';
  }

  // Memory health check
  const memUsageMB = health.memory.heapUsed / 1024 / 1024;
  const maxMemoryMB = parseInt(process.env.MAX_MEMORY_MB || '512');
  
  if (memUsageMB > maxMemoryMB * 0.9) {
    health.status = 'degraded';
    health.warnings = ['High memory usage'];
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

### 2. Logging Configuration

```typescript
// Structured logging for Render
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});
```

### 3. Performance Monitoring

```typescript
// Request performance monitoring
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    // Alert on slow requests
    if (duration > 5000) {
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.url,
        duration
      });
    }
  });
  
  next();
});
```

## Deployment Verification

### 1. Automated Tests

```bash
# Run deployment verification tests
npm run test:deployment

# Test specific endpoints
curl -f https://linkdao-backend.onrender.com/health
curl -f https://linkdao-backend.onrender.com/api/posts

# Test CORS configuration
curl -H "Origin: https://linkdao.io" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://linkdao-backend.onrender.com/api/posts
```

### 2. Performance Verification

```bash
# Load testing (use sparingly on free tier)
ab -n 100 -c 5 https://linkdao-backend.onrender.com/health

# Response time testing
curl -w "@curl-format.txt" -o /dev/null -s https://linkdao-backend.onrender.com/api/posts
```

### 3. WebSocket Testing

```javascript
// Test WebSocket connection
const io = require('socket.io-client');
const socket = io('https://linkdao-backend.onrender.com');

socket.on('connect', () => {
  console.log('WebSocket connected successfully');
  socket.disconnect();
});

socket.on('connect_error', (error) => {
  console.error('WebSocket connection failed:', error);
});
```

## Troubleshooting Deployment Issues

### 1. Build Failures

```bash
# Check build logs in Render dashboard
# Common issues and solutions:

# Node version mismatch
echo "engines: { node: '>=18.0.0' }" >> package.json

# Missing dependencies
npm ci --production=false

# TypeScript compilation errors
npm run build --verbose
```

### 2. Runtime Errors

```bash
# Check application logs in Render dashboard
# Common issues:

# Database connection failures
# - Verify DATABASE_URL is correct
# - Check database is running
# - Verify network connectivity

# Memory issues
# - Monitor memory usage in logs
# - Reduce DB_POOL_MAX if needed
# - Enable garbage collection

# CORS errors
# - Verify CORS_ORIGINS includes your domain
# - Check for typos in environment variables
```

### 3. Performance Issues

```bash
# Monitor resource usage
# In Render dashboard -> Metrics

# Database performance
# - Check slow query logs
# - Optimize database indexes
# - Reduce connection pool size

# Memory optimization
# - Enable garbage collection
# - Reduce cache sizes
# - Optimize data structures
```

## Rollback Procedures

### 1. Quick Rollback

```bash
# Rollback to previous deployment
# In Render dashboard:
# 1. Go to service -> Deploys
# 2. Find previous successful deployment
# 3. Click "Redeploy"
```

### 2. Emergency Rollback

```bash
# Revert code changes
git revert HEAD
git push origin main

# Or rollback to specific commit
git reset --hard <previous-commit-hash>
git push --force origin main
```

### 3. Database Rollback

```bash
# If database migrations need rollback
npm run migrate:rollback

# Or restore from backup
pg_restore --clean --no-acl --no-owner -h host -U user -d database backup.sql
```

## Maintenance and Updates

### 1. Regular Maintenance

```bash
# Weekly tasks
npm audit && npm audit fix
npm update
git commit -am "chore: update dependencies"

# Monthly tasks
# - Review performance metrics
# - Update Node.js version if needed
# - Review and optimize database queries
# - Update SSL certificates (automatic on Render)
```

### 2. Scaling Considerations

```bash
# When to upgrade Render plan:
# - Consistent memory usage > 80%
# - Response times > 2 seconds
# - Frequent 503 errors
# - Database connection pool exhaustion

# Upgrade path:
# Free -> Starter ($7/month)
# Starter -> Standard ($25/month)
```

### 3. Monitoring Setup

```bash
# Set up external monitoring
# - UptimeRobot for uptime monitoring
# - New Relic for performance monitoring
# - Sentry for error tracking

# Configure alerts for:
# - Service downtime
# - High error rates
# - Memory usage > 90%
# - Response times > 5 seconds
```

## Security Considerations

### 1. Environment Variables

```bash
# Never commit sensitive data
echo ".env*" >> .gitignore

# Use Render's environment variable encryption
# All environment variables are encrypted at rest
```

### 2. Database Security

```bash
# Use strong passwords
# Enable SSL connections
# Restrict database access to Render services only
# Regular security updates
```

### 3. API Security

```bash
# Implement rate limiting
# Use HTTPS only
# Validate all inputs
# Implement proper CORS policies
# Regular security audits
```

## Support and Resources

### Render Documentation
- [Render Docs](https://render.com/docs)
- [Node.js on Render](https://render.com/docs/node-version)
- [Environment Variables](https://render.com/docs/environment-variables)

### LinkDAO Resources
- Internal documentation: `/docs`
- Development team: dev@linkdao.io
- Emergency contact: emergency@linkdao.io

### Monitoring Tools
- Render Dashboard: https://dashboard.render.com
- Application logs: Available in Render dashboard
- Performance metrics: Built into Render dashboard