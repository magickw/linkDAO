# Internal Security Review Template

## Review Information

- **Reviewer**: [Name]
- **Date**: [YYYY-MM-DD]
- **Scope**: [Contract names or specific functionality]
- **Commit Hash**: [Git commit hash]
- **Review Type**: [Initial / Follow-up / Pre-deployment / Post-incident]

## Executive Summary

[Brief 2-3 sentence summary of the review findings]

## Contracts Reviewed

- [ ] Contract 1
- [ ] Contract 2
- [ ] Contract 3

## Security Checklist

### Access Control
- [ ] All privileged functions have appropriate access control
- [ ] Owner/admin roles are properly managed
- [ ] Role-based access control (RBAC) is correctly implemented
- [ ] No unauthorized access vectors exist

### Reentrancy Protection
- [ ] All state-changing functions are protected against reentrancy
- [ ] Checks-effects-interactions pattern is followed
- [ ] ReentrancyGuard is used where appropriate

### Integer Arithmetic
- [ ] No integer overflow/underflow vulnerabilities
- [ ] SafeMath or Solidity 0.8+ used for arithmetic operations
- [ ] Division by zero handled appropriately

### External Calls
- [ ] External calls are made safely
- [ ] Return values are properly checked
- [ ] Gas limitations are considered
- [ ] Untrusted contracts are handled carefully

### Input Validation
- [ ] All user inputs are validated
- [ ] Array bounds are checked
- [ ] Zero address checks are in place
- [ ] Amount/value validations exist

### Logic Errors
- [ ] Business logic is correctly implemented
- [ ] Edge cases are handled
- [ ] State transitions are valid
- [ ] No logic vulnerabilities exist

## Findings

### Critical Severity
[None / List findings with details]

### High Severity
[None / List findings with details]

### Medium Severity
[None / List findings with details]

### Low Severity
[None / List findings with details]

### Informational
[None / List suggestions for improvement]

## Finding Template

```markdown
### [SEVERITY] [Finding Title]

**Contract**: ContractName.sol
**Function**: functionName()
**Line**: Line number(s)

**Description**:
[Detailed description of the vulnerability or issue]

**Impact**:
[Potential impact if exploited]

**Recommendation**:
[Suggested fix or mitigation]

**Status**: [Identified / Acknowledged / Fixed / Accepted Risk]
```

## Gas Optimization Opportunities

- [ ] Opportunity 1
- [ ] Opportunity 2

## Code Quality Observations

- Documentation quality: [Excellent / Good / Needs Improvement]
- Test coverage: [Percentage]
- Code complexity: [Low / Medium / High]

## Recommendations

1. [Recommendation 1]
2. [Recommendation 2]
3. [Recommendation 3]

## Follow-up Actions

- [ ] Action item 1
- [ ] Action item 2
- [ ] Action item 3

## Reviewer Sign-off

**Reviewer**: [Name]
**Date**: [YYYY-MM-DD]
**Signature**: _____________________

---

*This review was conducted as part of LinkDAO's internal security process.*
