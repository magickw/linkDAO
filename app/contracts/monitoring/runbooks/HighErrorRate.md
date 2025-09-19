# High Error Rate Runbook

## Alert Description
This alert triggers when a smart contract experiences an error rate above 10% over a monitoring period.

## Severity: HIGH

## Immediate Actions (0-5 minutes)

### 1. Assess the Situation
- Check the monitoring dashboard for affected contracts
- Identify the specific error types and patterns
- Determine if this is affecting all users or specific addresses

### 2. Quick Diagnostics
```bash
# Check recent failed transactions
curl "http://localhost:3001/api/metrics/[CONTRACT_NAME]"

# Review error logs
tail -f /var/log/contract-monitor.log | grep ERROR

# Check network status
curl "https://api.etherscan.io/api?module=gastracker&action=gasoracle"
```

### 3. Immediate Mitigation
- If error rate > 50%, consider emergency pause if available
- Alert the development team immediately
- Prepare incident communication

## Investigation Steps (5-30 minutes)

### 1. Analyze Error Patterns
- Review transaction failure reasons
- Check if errors are related to:
  - Gas limit issues
  - Insufficient funds
  - Contract logic errors
  - Network congestion
  - External dependency failures

### 2. Check Contract State
```solidity
// Example checks for common issues
contract.paused() // Check if contract is paused
contract.owner() // Verify ownership hasn't changed
contract.balance() // Check contract balance
```

### 3. Review Recent Changes
- Check if any recent deployments or upgrades occurred
- Review recent governance proposals that may have changed parameters
- Verify external dependencies (oracles, other contracts)

## Resolution Steps

### For Gas-Related Issues
1. Monitor gas prices and network congestion
2. Consider adjusting gas limits in frontend
3. Implement dynamic gas pricing if not already present

### For Logic Errors
1. Identify the specific function causing errors
2. Review recent code changes
3. Consider emergency patch deployment if critical

### For External Dependencies
1. Check status of external services (oracles, APIs)
2. Implement fallback mechanisms if available
3. Consider temporary service degradation

### For Network Issues
1. Monitor Ethereum network status
2. Consider switching to backup RPC endpoints
3. Implement retry mechanisms with exponential backoff

## Recovery Actions

### 1. Gradual Recovery
- Monitor error rates as fixes are applied
- Gradually increase traffic if using circuit breakers
- Verify all contract functions are working correctly

### 2. User Communication
- Update status page with current situation
- Notify users of any service impacts
- Provide estimated resolution time

### 3. Post-Incident
- Document root cause and resolution
- Update monitoring thresholds if needed
- Implement additional safeguards

## Prevention Measures

### 1. Enhanced Monitoring
- Add more granular error tracking
- Implement predictive alerting
- Monitor external dependencies

### 2. Code Quality
- Increase test coverage for error scenarios
- Implement better error handling
- Add circuit breakers for external calls

### 3. Infrastructure
- Use multiple RPC endpoints
- Implement automatic failover
- Add rate limiting and throttling

## Escalation Criteria

### Escalate to Senior Engineer if:
- Error rate exceeds 25%
- Multiple contracts are affected
- User funds are at risk
- Resolution time exceeds 30 minutes

### Escalate to Management if:
- Error rate exceeds 50%
- Incident duration exceeds 2 hours
- Significant financial impact
- Media attention or regulatory concerns

## Contact Information

- **On-call Engineer**: [PHONE_NUMBER]
- **Senior Engineer**: [PHONE_NUMBER]
- **Engineering Manager**: [PHONE_NUMBER]
- **Incident Commander**: [PHONE_NUMBER]

## Tools and Resources

- **Monitoring Dashboard**: http://localhost:3001
- **Etherscan**: https://etherscan.io
- **Gas Tracker**: https://ethgasstation.info
- **Network Status**: https://ethstats.net
- **Incident Management**: [INCIDENT_TOOL_URL]

## Checklist

- [ ] Alert acknowledged and team notified
- [ ] Initial assessment completed
- [ ] Root cause identified
- [ ] Mitigation steps implemented
- [ ] Users notified of status
- [ ] Resolution verified
- [ ] Post-incident review scheduled
- [ ] Documentation updated