# Runbook: System Down

**Alert**: `moderation_system_down`  
**Severity**: P0 - Critical  
**Response Time**: Immediate

## Symptoms
- Health check endpoint returns 5xx errors or times out
- No moderation requests being processed
- Users unable to submit content
- Monitoring dashboard shows system as unavailable

## Immediate Actions (First 5 minutes)

### 1. Confirm the Issue
```bash
# Check if the service is responding
curl -f http://localhost:3000/health
curl -f https://api.company.com/moderation/health

# Check if process is running
ps aux | grep node
pm2 status
```

### 2. Check System Resources
```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top -n 1

# Check network connectivity
ping 8.8.8.8
```

### 3. Review Recent Logs
```bash
# Check application logs for errors
tail -n 100 logs/error.log
tail -n 100 logs/combined.log | grep -i "error\|fatal\|crash"

# Check system logs
sudo journalctl -u moderation-api -n 50
```

## Diagnosis Steps

### Check Application Status
```bash
# If using PM2
pm2 status
pm2 logs moderation-api --lines 50

# If using systemd
sudo systemctl status moderation-api
sudo journalctl -u moderation-api -f
```

### Check Dependencies
```bash
# Database connectivity
psql $DATABASE_URL -c "SELECT 1;"

# Redis connectivity
redis-cli ping

# External API connectivity
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models
```

### Check Configuration
```bash
# Verify environment variables
env | grep -E "(DATABASE_URL|REDIS_URL|OPENAI_API_KEY)"

# Check configuration files
cat config/production.env
```

## Resolution Steps

### 1. Quick Restart (if process is running but unresponsive)
```bash
# Using PM2
pm2 restart moderation-api

# Using systemd
sudo systemctl restart moderation-api

# Manual restart
pkill -f "node.*moderation"
npm run start:prod &
```

### 2. Fix Common Issues

#### Out of Memory
```bash
# Check memory usage
ps aux --sort=-%mem | head -10

# If memory is exhausted, restart with more memory
NODE_OPTIONS="--max-old-space-size=4096" npm run start:prod
```

#### Out of Disk Space
```bash
# Clean up logs
find logs/ -name "*.log" -mtime +7 -delete

# Clean up temporary files
rm -rf /tmp/moderation-*

# Clean up old backups
find backups/ -name "*.sql" -mtime +30 -delete
```

#### Database Connection Issues
```bash
# Check database status
psql $DATABASE_URL -c "SELECT version();"

# Check connection pool
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Restart database if needed (last resort)
sudo systemctl restart postgresql
```

#### Redis Connection Issues
```bash
# Check Redis status
redis-cli ping

# Check Redis memory usage
redis-cli info memory

# Restart Redis if needed
sudo systemctl restart redis
```

### 3. Deploy from Backup
If the application is corrupted:
```bash
# Stop current instance
pm2 stop moderation-api

# Restore from backup
cp -r /backup/moderation-api-latest/* ./

# Restore database if needed
psql $DATABASE_URL < backups/latest-backup.sql

# Start application
pm2 start moderation-api
```

## Recovery Verification

### 1. Health Check
```bash
# Wait 30 seconds for startup
sleep 30

# Check health endpoint
curl -f http://localhost:3000/health

# Check specific components
curl -f http://localhost:3000/health/database
curl -f http://localhost:3000/health/redis
curl -f http://localhost:3000/health/vendors
```

### 2. Functional Test
```bash
# Submit test content for moderation
curl -X POST http://localhost:3000/api/moderation/scan \
  -H "Content-Type: application/json" \
  -d '{"content": "test message", "type": "post"}'
```

### 3. Monitor Key Metrics
- Response time < 5 seconds
- Error rate < 1%
- Queue processing resuming
- No memory/CPU spikes

## Prevention

### Monitoring Improvements
- Add more granular health checks
- Monitor resource usage trends
- Set up predictive alerting for resource exhaustion

### Infrastructure Improvements
- Implement auto-scaling
- Add load balancing
- Set up database read replicas
- Implement circuit breakers

### Process Improvements
- Regular health check automation
- Automated log rotation
- Scheduled resource cleanup
- Disaster recovery testing

## Escalation

### When to Escalate
- System cannot be restored within 15 minutes
- Data corruption is suspected
- Security breach is suspected
- Multiple systems are affected

### Escalation Contacts
1. **Team Lead**: team-lead@company.com, +1-555-LEAD
2. **Engineering Manager**: eng-manager@company.com, +1-555-MANAGER
3. **VP Engineering**: vp-eng@company.com, +1-555-VP

## Communication

### Internal Communication
```
Subject: [P0] Moderation System Down - Investigating

The AI Content Moderation system is currently unavailable. 
We are investigating the issue and will provide updates every 15 minutes.

Impact: Users cannot submit new content for moderation
ETA: Under investigation
Next Update: [Time + 15 minutes]

Incident Commander: [Your Name]
```

### External Communication (if needed)
```
Subject: Service Disruption - Content Submission Temporarily Unavailable

We are currently experiencing technical difficulties with our content 
submission system. Our team is working to resolve the issue as quickly 
as possible.

We apologize for any inconvenience and will provide updates as they 
become available.

Status Page: https://status.company.com
```

## Post-Incident Actions

### Immediate (within 24 hours)
- [ ] Document timeline of events
- [ ] Identify root cause
- [ ] Implement immediate fixes
- [ ] Update monitoring/alerting

### Follow-up (within 1 week)
- [ ] Conduct post-mortem meeting
- [ ] Create action items for prevention
- [ ] Update runbooks based on learnings
- [ ] Test disaster recovery procedures

### Long-term (within 1 month)
- [ ] Implement architectural improvements
- [ ] Enhance monitoring and alerting
- [ ] Conduct chaos engineering exercises
- [ ] Review and update SLAs