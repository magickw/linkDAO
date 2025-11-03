# LinkDAO Operations Documentation

## Overview

This section contains operational guides, runbooks, and troubleshooting documentation for maintaining and monitoring the LinkDAO platform in production.

## Quick Links

### Essential Guides
- **[Troubleshooting Guide](./TROUBLESHOOTING_GUIDE.md)** - Comprehensive guide for common issues and their solutions
- [Incident Response](./incident-response.md) - Emergency response procedures
- [Incident Response Playbook](./incident-response-playbook.md) - Detailed incident handling procedures
- [Production Deployment Guide](./production-deployment-guide.md) - Step-by-step deployment instructions

### Runbooks
- [Service Down Runbook](./runbooks/service-down.md) - What to do when services are unavailable
- [High Error Rate Runbook](./runbooks/high-error-rate.md) - Handling elevated error rates

## Common Issues & Solutions

### Backend Service (503 Errors)
**Symptoms**: Backend API returning 503 Service Unavailable

**Quick Fix**:
1. Wait 30-60 seconds for cold start to complete
2. Check Render dashboard for service status
3. Review backend logs for errors

**Documentation**: [Troubleshooting Guide - Section 1](./TROUBLESHOOTING_GUIDE.md#1-backend-service-issues-503-errors)

---

### Missing API Endpoints (404 Errors)
**Symptoms**: API calls returning 404 Not Found

**Quick Fix**:
1. Verify correct endpoint URL (e.g., `/api/follows` not `/api/follow`)
2. Check if route is properly mounted in backend
3. Ensure using correct HTTP method (GET vs POST)

**Documentation**: [Troubleshooting Guide - Section 2](./TROUBLESHOOTING_GUIDE.md#2-missing-api-endpoints-404-errors)

---

### Rate Limiting Issues
**Symptoms**: 429 Too Many Requests errors, service worker rate limit messages

**Quick Fix**:
1. Implement exponential backoff in API calls
2. Use rate limit handler utility
3. Check if circuit breaker is open

**Documentation**: [Troubleshooting Guide - Section 3](./TROUBLESHOOTING_GUIDE.md#3-rate-limiting-issues)

---

### WebSocket Connection Failures
**Symptoms**: WebSocket disconnections, real-time features not working

**Quick Fix**:
1. Check backend service status
2. Verify WebSocket endpoint is accessible
3. Implement polling fallback for critical features

**Documentation**: [Troubleshooting Guide - Section 4](./TROUBLESHOOTING_GUIDE.md#4-websocket-connection-failures)

---

### Service Worker CSP Violations
**Symptoms**: Service worker fails to load, CSP errors in console

**Quick Fix**:
1. Verify CSP allows required external scripts
2. Check if Workbox CDN is whitelisted
3. Consider self-hosting Workbox

**Documentation**: [Troubleshooting Guide - Section 5](./TROUBLESHOOTING_GUIDE.md#5-service-worker-and-csp-violations)

**Status**: ✅ FIXED - CSP updated to allow storage.googleapis.com

---

### RPC Node Rate Limits
**Symptoms**: Balance checks failing with 429 errors, "over rate limit" messages

**Quick Fix**:
1. Implement RPC provider fallback chain
2. Use batch RPC calls (multicall)
3. Cache balance data
4. Consider using dedicated RPC provider (Alchemy, Infura, QuickNode)

**Documentation**: [Troubleshooting Guide - Section 6](./TROUBLESHOOTING_GUIDE.md#6-rpc-node-rate-limits)

---

## Monitoring & Health Checks

### Health Check Endpoints
```bash
# Backend overall health
curl https://linkdao-backend.onrender.com/health

# Database health
curl https://linkdao-backend.onrender.com/health/database

# Memory usage
curl https://linkdao-backend.onrender.com/health/memory
```

### Key Metrics to Monitor
1. **Response Times**: API endpoints should respond < 500ms
2. **Error Rates**: Should be < 1% of total requests
3. **Memory Usage**: Should stay < 80% of available memory
4. **Database Connections**: Active connections should be < pool size
5. **WebSocket Connections**: Monitor connection/disconnection rate

### Alerting Thresholds
| Metric | Warning | Critical |
|--------|---------|----------|
| Response Time | > 1s | > 3s |
| Error Rate | > 2% | > 5% |
| Memory Usage | > 80% | > 95% |
| DB Connections | > 80% pool | > 95% pool |
| Service Availability | < 99.5% | < 99% |

## Emergency Procedures

### Service Down
1. Check [Service Down Runbook](./runbooks/service-down.md)
2. Verify Render service status
3. Check backend logs for errors
4. Restart service if needed
5. Monitor recovery

### High Error Rate
1. Check [High Error Rate Runbook](./runbooks/high-error-rate.md)
2. Identify error patterns in logs
3. Check external service status
4. Apply fixes based on error type
5. Monitor error rate decrease

### Database Issues
1. Check database connection pool
2. Review slow query logs
3. Optimize long-running queries
4. Increase pool size if needed
5. Consider read replicas

### Memory Exhaustion
1. Check memory usage endpoint
2. Identify memory leaks
3. Restart service to free memory
4. Review and disable heavy features
5. Consider upgrading hosting plan

## Deployment Procedures

### Standard Deployment
1. Review [Production Deployment Guide](./production-deployment-guide.md)
2. Test changes in staging
3. Create deployment checklist
4. Deploy during low-traffic window
5. Monitor metrics post-deployment
6. Have rollback plan ready

### Emergency Hotfix
1. Create hotfix branch from main
2. Apply minimal fix
3. Test fix locally
4. Deploy directly to production
5. Monitor closely
6. Merge back to main

### Rollback Procedure
1. Identify last working deployment
2. Revert to previous commit
3. Trigger new deployment
4. Monitor recovery
5. Document incident

## Incident Response

### Incident Severity Levels

**P0 - Critical**
- Service completely down
- Data loss or corruption
- Security breach
- Response Time: Immediate
- Escalation: Page on-call engineer

**P1 - High**
- Major feature degradation
- Significant performance issues
- Elevated error rates
- Response Time: Within 30 minutes
- Escalation: Notify team lead

**P2 - Medium**
- Minor feature issues
- Isolated errors
- Performance degradation
- Response Time: Within 2 hours
- Escalation: Create ticket

**P3 - Low**
- Cosmetic issues
- Non-critical bugs
- Enhancement requests
- Response Time: Next business day
- Escalation: Add to backlog

### Incident Response Process
1. **Detect**: Monitoring alerts or user reports
2. **Assess**: Determine severity level
3. **Respond**: Follow appropriate runbook
4. **Resolve**: Apply fix and verify
5. **Document**: Write incident report
6. **Review**: Post-mortem and prevention

## Best Practices

### Proactive Monitoring
- Set up comprehensive monitoring
- Configure meaningful alerts
- Review metrics weekly
- Conduct monthly health checks
- Test disaster recovery procedures

### Documentation
- Keep runbooks up to date
- Document all incidents
- Share learnings with team
- Update troubleshooting guide
- Maintain change log

### Communication
- Use incident channels (Slack, Discord)
- Keep stakeholders informed
- Provide status updates
- Set clear expectations
- Document resolutions

### Prevention
- Regular security audits
- Performance testing
- Load testing before launches
- Code reviews
- Automated testing

## Tools & Resources

### Monitoring Tools
- Render Dashboard: https://dashboard.render.com
- Error Tracking: Check backend logs
- APM: Consider DataDog or New Relic
- Uptime Monitoring: Consider Pingdom or UptimeRobot

### Development Tools
- [Rate Limit Handler](../../app/frontend/src/utils/rateLimitHandler.ts) - Utility for handling rate limits
- Database Query Analyzer: Built into backend
- Memory Profiler: Node.js --inspect

### External Services
- Render Status: https://status.render.com
- PostgreSQL Status: Check provider status page
- Base Network Status: https://status.base.org

## Related Documentation

- [Platform Architecture](../architecture/README.md)
- [Platform Validation](../architecture/PLATFORM_VALIDATION.md)
- [API Documentation](../api/README.md)
- [Deployment Guides](../deployment/README.md)

---

## Support & Escalation

### Internal Team
- **On-call Engineer**: Check rotation schedule
- **Team Lead**: Primary escalation point
- **Platform Team**: platform@linkdao.io

### External Support
- **Render Support**: support@render.com (Starter plan and above)
- **Database Support**: Check provider documentation
- **Community**: Discord server for non-critical issues

---

**Last Updated**: November 2, 2025
**Maintained By**: Platform Operations Team
**Review Frequency**: Monthly
