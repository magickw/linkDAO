# AI Content Moderation System - Operational Runbooks

This directory contains operational runbooks and troubleshooting guides for the AI Content Moderation System.

## Quick Reference

### Emergency Contacts
- **Platform Team**: platform-team@company.com
- **Moderation Team**: moderation-team@company.com  
- **Security Team**: security-team@company.com
- **On-Call Engineer**: +1-555-ONCALL

### System Status Dashboard
- **Production**: https://status.company.com/moderation
- **Staging**: https://staging-status.company.com/moderation
- **Metrics**: https://grafana.company.com/d/moderation

### Common Commands
```bash
# Check system health
curl -f http://localhost:3000/health

# View logs
tail -f logs/combined.log

# Check queue sizes
redis-cli LLEN moderation:queue:fast
redis-cli LLEN moderation:queue:slow

# Database status
npm run db:status

# Restart services
pm2 restart moderation-api
```

## Runbook Index

### System Health
- [System Down](./system-down.md) - When the moderation system is completely unavailable
- [High Latency](./high-latency.md) - When response times are elevated
- [Memory Issues](./memory-issues.md) - When memory usage is high

### Moderation Pipeline
- [Queue Backup](./queue-backup.md) - When moderation queues are backing up
- [Low Confidence Scores](./low-confidence.md) - When AI models return low confidence
- [Vendor API Issues](./vendor-api-issues.md) - When external AI services fail

### Data Issues
- [Database Problems](./database-problems.md) - Database connectivity and performance issues
- [Redis Issues](./redis-issues.md) - Cache and queue storage problems
- [IPFS Problems](./ipfs-problems.md) - Evidence storage issues

### Quality Issues
- [High False Positive Rate](./false-positives.md) - When legitimate content is blocked
- [High Appeal Overturn Rate](./appeal-quality.md) - When appeals frequently overturn decisions
- [Spam Reports](./spam-reports.md) - When the system receives many false reports

### Security Incidents
- [Security Breach](./security-breach.md) - Data breach or unauthorized access
- [DDoS Attack](./ddos-attack.md) - Distributed denial of service attacks
- [API Abuse](./api-abuse.md) - API rate limiting and abuse handling

### Deployment Issues
- [Deployment Failure](./deployment-failure.md) - When deployments fail
- [Rollback Procedure](./rollback-procedure.md) - How to rollback deployments
- [Configuration Issues](./config-issues.md) - Environment and configuration problems

## Escalation Procedures

### Severity Levels

**P0 - Critical (Immediate Response)**
- System completely down
- Data breach or security incident
- Widespread false positives blocking legitimate content

**P1 - High (1 hour response)**
- Significant performance degradation
- Vendor API failures affecting >50% of requests
- Queue backup causing >1 hour delays

**P2 - Medium (4 hour response)**
- Moderate performance issues
- Single vendor API issues with fallbacks working
- Quality issues affecting <10% of content

**P3 - Low (Next business day)**
- Minor performance issues
- Documentation updates needed
- Feature requests

### Escalation Path
1. **On-Call Engineer** - First responder for all alerts
2. **Team Lead** - Escalate after 30 minutes for P0, 2 hours for P1
3. **Engineering Manager** - Escalate after 1 hour for P0, 4 hours for P1
4. **VP Engineering** - Escalate for prolonged P0 incidents

## Monitoring and Alerting

### Key Metrics to Watch
- **Request Rate**: Normal range 100-1000 req/min
- **Response Time**: P95 < 5 seconds, P99 < 10 seconds
- **Error Rate**: < 1% for vendor APIs, < 0.1% for system errors
- **Queue Size**: Fast lane < 100, slow lane < 500
- **Confidence Scores**: >70% of decisions should have >0.7 confidence

### Alert Channels
- **Slack**: #moderation-alerts for all alerts
- **PagerDuty**: P0 and P1 incidents only
- **Email**: Daily summaries and P2+ incidents
- **SMS**: P0 incidents only

## Common Troubleshooting Steps

### 1. Check System Health
```bash
# Overall health check
curl -f http://localhost:3000/health

# Check individual components
curl -f http://localhost:3000/health/database
curl -f http://localhost:3000/health/redis
curl -f http://localhost:3000/health/vendors
```

### 2. Review Recent Logs
```bash
# Check for errors in last 10 minutes
tail -n 1000 logs/combined.log | grep -i error | tail -20

# Check specific component logs
grep "vendor_error" logs/combined.log | tail -10
grep "moderation_decision" logs/combined.log | tail -10
```

### 3. Check Queue Status
```bash
# Queue sizes
redis-cli LLEN moderation:queue:fast
redis-cli LLEN moderation:queue:slow
redis-cli LLEN moderation:queue:human_review

# Queue processing rates
redis-cli GET moderation:stats:processed_per_minute
```

### 4. Verify Vendor APIs
```bash
# Test OpenAI API
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models

# Test Google Vision API
curl -H "Authorization: Bearer $GOOGLE_ACCESS_TOKEN" \
  https://vision.googleapis.com/v1/images:annotate
```

### 5. Check Database Performance
```bash
# Active connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Long running queries
psql $DATABASE_URL -c "SELECT query, state, query_start FROM pg_stat_activity WHERE state = 'active' AND query_start < now() - interval '1 minute';"
```

## Recovery Procedures

### Graceful Degradation
When vendor APIs are unavailable:
1. Enable single-vendor mode
2. Increase confidence thresholds
3. Route more content to human review
4. Enable warning labels for published content

### Emergency Shutdown
If system is causing harm:
1. Enable maintenance mode
2. Stop processing new content
3. Preserve existing queues
4. Notify stakeholders

### Data Recovery
If data is corrupted:
1. Stop all writes to affected tables
2. Restore from latest backup
3. Replay transactions from WAL logs
4. Verify data integrity

## Performance Optimization

### Quick Wins
- Restart Redis to clear memory fragmentation
- Clear old logs to free disk space
- Restart application to clear memory leaks
- Enable connection pooling if disabled

### Scaling Actions
- Add more worker processes
- Scale Redis cluster
- Increase database connection pool
- Enable CDN for static assets

## Contact Information

### Teams
- **Platform Team**: Responsible for infrastructure and deployment
- **Moderation Team**: Responsible for policy and human review
- **Security Team**: Responsible for security and compliance
- **Data Team**: Responsible for analytics and ML models

### External Vendors
- **OpenAI Support**: support@openai.com
- **Google Cloud Support**: Via Google Cloud Console
- **AWS Support**: Via AWS Support Center
- **IPFS Support**: Community forums and documentation

## Additional Resources
- [System Architecture Documentation](../architecture.md)
- [API Documentation](../api.md)
- [Deployment Guide](../deployment.md)
- [Security Guidelines](../security.md)