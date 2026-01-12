# Security Incident Response Plan
## LinkDAO Non-Custodial Wallet

**Version**: 1.0
**Last Updated**: 2026-01-11
**Status**: Active
**Classification**: Internal - Security Team

---

## 1. Overview

This document outlines the procedures for responding to security incidents affecting the LinkDAO Wallet. As a non-custodial wallet, users hold their own keys, but security incidents can still impact user safety and trust.

### 1.1 Scope

This plan covers:
- Security vulnerabilities in wallet code
- Phishing attacks targeting users
- Smart contract exploits
- Data breaches (telemetry, analytics)
- Service disruptions
- Third-party integration failures

### 1.2 Incident Severity Levels

| Level | Name | Description | Response Time |
|-------|------|-------------|---------------|
| P0 | Critical | Active exploitation, fund loss possible | 15 minutes |
| P1 | High | Vulnerability discovered, not yet exploited | 1 hour |
| P2 | Medium | Security weakness, limited impact | 4 hours |
| P3 | Low | Minor issue, no immediate risk | 24 hours |

---

## 2. Response Team

### 2.1 Core Team

| Role | Responsibilities | Contact |
|------|-----------------|---------|
| Incident Commander | Overall coordination, communications | incidents@linkdao.io |
| Security Lead | Technical investigation, mitigation | security@linkdao.io |
| Engineering Lead | Code fixes, deployments | dev@linkdao.io |
| Communications Lead | User notifications, PR | comms@linkdao.io |

### 2.2 Escalation Path

```
Developer → Security Lead → Incident Commander → CTO → CEO
     ↓           ↓               ↓
 15 mins     30 mins          1 hour
```

---

## 3. Incident Response Phases

### Phase 1: Detection & Triage (0-15 minutes)

**Actions**:
1. Receive incident report (automated monitoring, user report, security researcher)
2. Assess severity level using criteria below
3. Notify appropriate team members
4. Begin incident log

**Severity Assessment**:
- Can users lose funds? → P0
- Is user data at risk? → P1
- Is functionality impaired? → P2
- Is it a cosmetic/minor issue? → P3

**Initial Notification Template**:
```
SECURITY INCIDENT DETECTED
Severity: [P0/P1/P2/P3]
Time: [UTC timestamp]
Summary: [Brief description]
Status: INVESTIGATING
Commander: [Name]
```

### Phase 2: Containment (15-60 minutes)

**P0/P1 Actions**:
1. [ ] Consider emergency service pause (if applicable)
2. [ ] Revoke compromised API keys
3. [ ] Block malicious addresses in phishing detector
4. [ ] Update rate limits if under attack
5. [ ] Preserve evidence (logs, screenshots)

**Code-Level Responses**:
```typescript
// Emergency: Disable specific features
// File: src/config/featureFlags.ts
export const EMERGENCY_FLAGS = {
  DISABLE_TRANSACTIONS: false,
  DISABLE_IMPORTS: false,
  DISABLE_EXPORTS: false,
  FORCE_READONLY: false,
};
```

**Communication**: Draft holding statement for users

### Phase 3: Investigation (1-4 hours)

**Technical Investigation**:
1. [ ] Review security monitor logs
2. [ ] Analyze affected code paths
3. [ ] Identify root cause
4. [ ] Determine scope of impact
5. [ ] Identify affected users (if any)

**Investigation Log Template**:
```markdown
## Incident [ID] Investigation Log

### Timeline
- [Time] Event discovered
- [Time] Initial response
- [Time] Root cause identified

### Technical Details
- Affected components:
- Root cause:
- Attack vector:
- Data/funds impacted:

### Evidence
- Log entries:
- Code references:
- Screenshots:
```

### Phase 4: Remediation (4-24 hours)

**Fix Development**:
1. [ ] Develop fix in isolated branch
2. [ ] Security review of fix
3. [ ] Test in staging environment
4. [ ] Prepare rollback plan

**Deployment Checklist**:
1. [ ] All tests passing
2. [ ] Security review approved
3. [ ] Rollback procedure documented
4. [ ] Monitoring alerts configured
5. [ ] Team on standby for issues

**Post-Fix Verification**:
1. [ ] Verify fix resolves issue
2. [ ] Confirm no regression
3. [ ] Monitor for 24 hours

### Phase 5: Recovery & Communication

**User Communication**:

For P0/P1 incidents, notify users via:
1. In-app banner (BetaWarningBanner can be repurposed)
2. Email to registered users
3. Twitter/Social media
4. Discord/Community channels

**Notification Template**:
```markdown
# Security Notice

**Status**: [Resolved/Ongoing]
**Date**: [Date]

## What Happened
[Clear, non-technical explanation]

## Impact
[Who was affected and how]

## What We Did
[Actions taken to resolve]

## What You Should Do
[User action items, if any]

## Prevention
[Steps to prevent recurrence]

Questions? Contact security@linkdao.io
```

### Phase 6: Post-Incident Review (24-72 hours)

**Review Meeting Agenda**:
1. Incident timeline review
2. What went well
3. What could be improved
4. Action items for prevention

**Post-Mortem Document**:
```markdown
# Post-Mortem: [Incident Title]

**Date**: [Date]
**Severity**: [P0-P3]
**Duration**: [Time to resolution]
**Author**: [Name]

## Summary
[2-3 sentence summary]

## Timeline
[Detailed timeline with UTC timestamps]

## Root Cause
[Technical explanation]

## Impact
- Users affected: [Number]
- Funds at risk: [Amount]
- Duration: [Time]

## Resolution
[How it was fixed]

## Lessons Learned
1. [Lesson 1]
2. [Lesson 2]

## Action Items
- [ ] [Action 1] - Owner: [Name] - Due: [Date]
- [ ] [Action 2] - Owner: [Name] - Due: [Date]

## Appendix
[Logs, screenshots, code snippets]
```

---

## 4. Specific Incident Playbooks

### 4.1 Phishing Attack Detected

1. Add malicious addresses to `phishingDetector.ts`
2. Update domain blocklist
3. Post warning on social channels
4. Report to MetaMask/ScamSniffer databases

```typescript
// Quick block malicious address
import { reportMaliciousAddress } from '@/security/phishingDetector';
await reportMaliciousAddress('0x...', 'Phishing campaign detected');
```

### 4.2 Vulnerability in Crypto Code

1. **CRITICAL**: Do NOT discuss publicly until fixed
2. Disable affected feature if possible
3. Fast-track fix through security review
4. Consider responsible disclosure timeline

### 4.3 Third-Party Dependency Vulnerability

1. Check if vulnerability is exploitable in our usage
2. Update dependency or apply patch
3. Review for signs of exploitation
4. Monitor `npm audit` and Snyk alerts

### 4.4 Rate Limit/DDoS Attack

1. Increase rate limits temporarily
2. Enable additional CAPTCHA if available
3. Contact CDN/hosting provider
4. Consider geo-blocking if attack is regional

---

## 5. Communication Templates

### 5.1 Initial Acknowledgment (Twitter)

```
🔒 We're aware of reports regarding [issue]. Our security team is investigating. We'll provide updates as we learn more.

Your funds remain safe in your own wallets.
```

### 5.2 Issue Resolved (Twitter)

```
✅ Update: The [issue] has been resolved.

Summary: [Brief explanation]
Impact: [Who was affected]
Action required: [None/Update app/etc]

Full details: [link to blog post]

Thank you for your patience. 🙏
```

### 5.3 Email to Affected Users

```
Subject: Important Security Notice from LinkDAO Wallet

Dear LinkDAO User,

We're writing to inform you about a security matter that may affect your account.

WHAT HAPPENED
[Clear explanation]

WHAT WE'RE DOING
[Our response]

WHAT YOU SHOULD DO
[User actions]

We take security seriously and are committed to protecting your assets. If you have questions, please contact security@linkdao.io.

The LinkDAO Team
```

---

## 6. Emergency Contacts

| Service | Contact | Purpose |
|---------|---------|---------|
| Hosting Provider | [Contact] | Infrastructure issues |
| CDN | [Contact] | DDoS mitigation |
| Legal Counsel | [Contact] | Legal implications |
| Insurance | [Contact] | Cyber insurance claims |
| Law Enforcement | Local authorities | Criminal activity |

---

## 7. Tools & Resources

### 7.1 Security Monitoring

- `securityMonitorService.ts` - Client-side event logging
- Server-side log aggregation (TBD)
- Uptime monitoring (TBD)

### 7.2 Code References

| File | Purpose |
|------|---------|
| `phishingDetector.ts` | Malicious address blocking |
| `rateLimiter.ts` | Rate limit configuration |
| `betaLimitsService.ts` | Transaction limits |
| `securityMonitorService.ts` | Event logging |

### 7.3 External Resources

- [OWASP Incident Response](https://owasp.org/www-project-incident-response/)
- [NIST Incident Handling Guide](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r2.pdf)
- [MetaMask Security Contacts](https://metamask.io/security/)

---

## 8. Plan Maintenance

- **Review Frequency**: Quarterly
- **Next Review**: [Date]
- **Owner**: Security Lead

### Update History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-01-11 | Initial plan | Security Team |

---

## Appendix A: Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│           SECURITY INCIDENT QUICK REFERENCE             │
├─────────────────────────────────────────────────────────┤
│ 1. ASSESS: What severity? (P0=funds at risk)            │
│ 2. NOTIFY: incidents@linkdao.io                         │
│ 3. CONTAIN: Block addresses, revoke keys if needed      │
│ 4. INVESTIGATE: Check logs, identify root cause         │
│ 5. FIX: Develop, review, test, deploy                   │
│ 6. COMMUNICATE: Inform users appropriately              │
│ 7. REVIEW: Post-mortem within 72 hours                  │
└─────────────────────────────────────────────────────────┘

Emergency Feature Flags:
  DISABLE_TRANSACTIONS = true  → Stops all transactions
  FORCE_READONLY = true        → Read-only mode

Key Contacts:
  Security: security@linkdao.io
  Incidents: incidents@linkdao.io
```

---

*This document is confidential and intended for internal use only.*
