# AI Content Moderation System - Deployment Guide

This guide covers the complete deployment process for the AI Content Moderation System, including configuration, database setup, monitoring, and validation.

## Prerequisites

### System Requirements
- Node.js 18+ 
- PostgreSQL 13+
- Redis 6+
- Docker (optional, for containerized deployment)
- Minimum 4GB RAM, 2 CPU cores
- 50GB disk space (for logs, backups, evidence storage)

### External Services
- OpenAI API account and API key
- Google Cloud Platform account (for Vision API)
- AWS account (for Rekognition)
- IPFS node or gateway access
- Monitoring infrastructure (Prometheus, Grafana)

## Quick Start

### 1. Clone and Install
```bash
git clone <repository-url>
cd ai-content-moderation/app/backend
npm install
```

### 2. Configure Environment
```bash
# Copy configuration template
cp config/development.env config/production.env

# Edit configuration with your values
nano config/production.env
```

### 3. Deploy
```bash
# Deploy to production
npm run deploy:prod

# Or use the deployment script directly
bash scripts/deploy.sh production
```

## Detailed Deployment Process

### Step 1: Environment Configuration

#### Required Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database
DATABASE_POOL_SIZE=50
DATABASE_SSL=true

# Redis
REDIS_URL=redis://host:6379
REDIS_CLUSTER_MODE=true

# AI Vendor APIs
OPENAI_API_KEY=sk-...
PERSPECTIVE_API_KEY=...
GOOGLE_CLOUD_PROJECT_ID=your-project
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# IPFS
IPFS_GATEWAY_URL=https://your-ipfs-gateway.com

# Security
JWT_SECRET=your-jwt-secret-here
ENCRYPTION_KEY=your-encryption-key-here

# Monitoring
PROMETHEUS_ENDPOINT=http://prometheus:9090
JAEGER_ENDPOINT=http://jaeger:14268/api/traces
```

#### Configuration Files
- `config/production.env` - Production environment variables
- `config/staging.env` - Staging environment variables  
- `config/monitoring.yml` - Monitoring and alerting configuration

### Step 2: Database Setup

#### Initialize Database
```bash
# Run migrations
npm run migrate:up

# Verify database schema
npm run db:validate

# Create initial backup
npm run backup
```

#### Database Optimization
```sql
-- Create performance indexes
CREATE INDEX CONCURRENTLY idx_moderation_cases_status_created 
ON moderation_cases(status, created_at);

CREATE INDEX CONCURRENTLY idx_content_reports_content_created 
ON content_reports(content_id, created_at);

-- Configure connection pooling
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
SELECT pg_reload_conf();
```

### Step 3: Application Deployment

#### Using PM2 (Recommended)
```bash
# Install PM2 globally
npm install -g pm2

# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
pm2 startup
```

#### Using Docker
```bash
# Build Docker image
docker build -t ai-moderation:latest .

# Run container
docker run -d \
  --name ai-moderation \
  --env-file config/production.env \
  -p 3000:3000 \
  ai-moderation:latest
```

#### Using Systemd
```bash
# Create systemd service
sudo cp scripts/ai-moderation.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable ai-moderation
sudo systemctl start ai-moderation
```

### Step 4: Load Balancer Configuration

#### Nginx Configuration
```nginx
upstream ai_moderation {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}

server {
    listen 80;
    server_name api.yourcompany.com;
    
    location / {
        proxy_pass http://ai_moderation;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts for long-running moderation requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    location /health {
        proxy_pass http://ai_moderation;
        access_log off;
    }
    
    location /metrics {
        proxy_pass http://ai_moderation;
        allow 10.0.0.0/8;  # Restrict to internal networks
        deny all;
    }
}
```

### Step 5: Monitoring Setup

#### Prometheus Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'ai-moderation'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: /metrics
    scrape_interval: 15s
```

#### Grafana Dashboard
```bash
# Import dashboard configuration
curl -X POST \
  http://grafana:3000/api/dashboards/db \
  -H 'Content-Type: application/json' \
  -d @config/grafana-dashboard.json
```

#### Alerting Setup
```bash
# Configure alertmanager
cp config/alertmanager.yml /etc/alertmanager/
systemctl restart alertmanager

# Test alerts
curl -X POST http://localhost:9093/api/v1/alerts \
  -H 'Content-Type: application/json' \
  -d '[{"labels":{"alertname":"test"}}]'
```

### Step 6: Security Configuration

#### SSL/TLS Setup
```bash
# Generate SSL certificate (Let's Encrypt)
certbot --nginx -d api.yourcompany.com

# Or use existing certificates
cp /path/to/cert.pem /etc/ssl/certs/
cp /path/to/key.pem /etc/ssl/private/
```

#### Firewall Configuration
```bash
# Allow only necessary ports
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw allow 9090  # Prometheus (internal only)
ufw enable
```

#### Security Headers
```nginx
# Add to nginx configuration
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
```

### Step 7: Validation and Testing

#### Deployment Validation
```bash
# Run comprehensive validation
npm run test:validation

# Or run components separately
npm run test:deployment
npm run validate:deployment
```

#### Load Testing
```bash
# Install artillery for load testing
npm install -g artillery

# Run load test
artillery run config/load-test.yml
```

#### Security Testing
```bash
# Run security tests
npm run test:security

# Check for vulnerabilities
npm audit
npm audit fix
```

## Production Checklist

### Pre-Deployment
- [ ] All environment variables configured
- [ ] Database migrations tested
- [ ] SSL certificates installed
- [ ] Monitoring configured
- [ ] Backup procedures tested
- [ ] Load balancer configured
- [ ] Security measures implemented

### Deployment
- [ ] Application built successfully
- [ ] Database migrations applied
- [ ] Services started and healthy
- [ ] Load balancer routing correctly
- [ ] Monitoring collecting metrics
- [ ] Alerts configured and tested

### Post-Deployment
- [ ] Health checks passing
- [ ] End-to-end tests passing
- [ ] Performance within acceptable limits
- [ ] No critical alerts firing
- [ ] Logs being collected properly
- [ ] Backup procedures working

## Rollback Procedures

### Quick Rollback
```bash
# Stop current version
pm2 stop ai-moderation

# Restore previous version
cp -r /backup/ai-moderation-previous/* ./

# Rollback database if needed
npm run migrate:down

# Start previous version
pm2 start ai-moderation
```

### Database Rollback
```bash
# List available backups
ls -la backups/

# Restore from backup
npm run restore backups/pre-deployment-20231201-120000.sql

# Verify data integrity
npm run db:validate
```

## Troubleshooting

### Common Issues

#### High Memory Usage
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head -10

# Restart with more memory
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

#### Database Connection Issues
```bash
# Check database connectivity
npm run db:check

# Check connection pool
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Restart database connections
pm2 restart ai-moderation
```

#### Vendor API Failures
```bash
# Check vendor API status
npm run vendors:check

# Enable degraded mode
redis-cli SET moderation:config:degraded_mode true

# Check circuit breaker status
curl http://localhost:3000/api/admin/circuit-breakers
```

### Log Analysis
```bash
# Check error logs
tail -f logs/error.log

# Search for specific errors
grep "vendor_error" logs/combined.log | tail -20

# Check performance logs
grep "slow_query" logs/combined.log | tail -10
```

## Maintenance

### Regular Tasks

#### Daily
- Check system health dashboard
- Review error logs
- Monitor queue sizes
- Verify backup completion

#### Weekly  
- Review performance metrics
- Update security patches
- Clean up old logs
- Test disaster recovery

#### Monthly
- Review and update configurations
- Analyze cost and usage trends
- Update dependencies
- Conduct security review

### Automated Maintenance
```bash
# Setup cron jobs
crontab -e

# Daily backup at 2 AM
0 2 * * * /path/to/backup-script.sh

# Weekly log cleanup
0 3 * * 0 find /path/to/logs -name "*.log" -mtime +7 -delete

# Monthly dependency updates
0 4 1 * * npm update && npm audit fix
```

## Support and Escalation

### Contact Information
- **Platform Team**: platform-team@company.com
- **On-Call Engineer**: +1-555-ONCALL
- **Emergency Escalation**: emergency@company.com

### Vendor Support
- **OpenAI**: support@openai.com
- **Google Cloud**: Via Google Cloud Console
- **AWS**: Via AWS Support Center

### Documentation
- [System Architecture](./docs/architecture.md)
- [API Documentation](./docs/api.md)
- [Runbooks](./docs/runbooks/)
- [Security Guidelines](./docs/security.md)