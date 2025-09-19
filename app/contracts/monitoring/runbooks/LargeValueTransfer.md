# Large Value Transfer Runbook

## Alert Description
This alert triggers when a transaction involves a transfer of tokens or ETH above the configured threshold (default: 10,000 tokens or equivalent ETH value).

## Severity: MEDIUM

## Immediate Actions (0-5 minutes)

### 1. Verify the Transfer
- Confirm the transaction details on Etherscan
- Check the sender and receiver addresses
- Verify the exact amount and token type
- Confirm transaction was successful

### 2. Initial Assessment
```bash
# Get transaction details
curl "https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=[TX_HASH]&apikey=[API_KEY]"

# Check if addresses are known
grep -i "[SENDER_ADDRESS]" known_addresses.txt
grep -i "[RECEIVER_ADDRESS]" known_addresses.txt
```

### 3. Risk Classification
- **Low Risk**: Known addresses, expected business operations
- **Medium Risk**: Unknown addresses, unusual patterns
- **High Risk**: Suspicious addresses, potential security incident

## Investigation Steps (5-30 minutes)

### 1. Address Analysis
```bash
# Check address history
curl "https://api.etherscan.io/api?module=account&action=txlist&address=[ADDRESS]&sort=desc&apikey=[API_KEY]"

# Check if address is a contract
curl "https://api.etherscan.io/api?module=proxy&action=eth_getCode&address=[ADDRESS]&apikey=[API_KEY]"
```

### 2. Pattern Analysis
- Check for multiple large transfers in sequence
- Look for unusual timing patterns
- Verify if this is part of normal operations
- Check for correlation with other alerts

### 3. Business Context
- Verify if transfer was authorized
- Check if it's related to:
  - Liquidity provision
  - Treasury operations
  - User withdrawals
  - Partner payments
  - Governance actions

## Risk Assessment

### 1. Low Risk Indicators
- Transfers to/from known exchange addresses
- Regular business operations
- Authorized treasury movements
- Liquidity pool operations
- Governance-approved transfers

### 2. Medium Risk Indicators
- Transfers to new/unknown addresses
- Unusual timing (outside business hours)
- Round numbers that seem arbitrary
- Multiple transfers to different addresses
- Transfers from governance contracts

### 3. High Risk Indicators
- Transfers to mixer services
- Rapid sequence of large transfers
- Transfers following security alerts
- Unknown addresses with no history
- Transfers that drain significant portions of funds

## Response Actions

### For Low Risk Transfers
1. Document the transfer for audit purposes
2. Update known address database if needed
3. No immediate action required
4. Continue monitoring

### For Medium Risk Transfers
1. Alert security team for review
2. Monitor subsequent transactions closely
3. Verify with business stakeholders
4. Consider temporary enhanced monitoring

### For High Risk Transfers
1. **IMMEDIATE**: Alert security team and management
2. Consider emergency pause if available
3. Prepare incident response
4. Contact relevant exchanges if needed
5. Document everything for potential investigation

## Monitoring and Tracking

### 1. Enhanced Monitoring
```bash
# Set up address monitoring
echo "[SUSPICIOUS_ADDRESS]" >> watch_addresses.txt

# Monitor for additional transfers
curl -X POST [MONITORING_API] -d '{
  "address": "[ADDRESS]",
  "threshold": 1000,
  "duration": "24h"
}'
```

### 2. Cross-Reference Checks
- Check against known blacklists
- Verify with OFAC sanctions list
- Cross-reference with security databases
- Check for similar patterns in other protocols

## Communication Protocol

### 1. Internal Notifications
- Security team (always)
- Treasury team (if treasury-related)
- Compliance team (if regulatory implications)
- Executive team (if high-value or suspicious)

### 2. External Communications
- Law enforcement (if criminal activity suspected)
- Exchanges (if funds moved to exchanges)
- Partners (if their funds are involved)
- Regulators (if required by jurisdiction)

## Documentation Requirements

### 1. Incident Record
- Transaction hash and details
- Addresses involved
- Timeline of events
- Actions taken
- Risk assessment outcome

### 2. Follow-up Actions
- Additional monitoring implemented
- Policy changes recommended
- Process improvements identified
- Training needs identified

## Escalation Criteria

### Escalate to Security Team Lead if:
- Transfer amount exceeds $100,000 equivalent
- Multiple large transfers detected
- Suspicious address patterns identified
- Transfer follows security alert

### Escalate to Management if:
- Transfer amount exceeds $1,000,000 equivalent
- Criminal activity suspected
- Regulatory reporting required
- Media attention likely

## Prevention and Detection

### 1. Enhanced Detection
- Implement ML-based anomaly detection
- Add velocity checks for addresses
- Monitor for unusual patterns
- Cross-reference with threat intelligence

### 2. Preventive Measures
- Implement transfer limits where appropriate
- Add time delays for large transfers
- Require multi-signature for treasury operations
- Implement whitelist for large transfers

## Tools and Resources

### Blockchain Analysis
- **Etherscan**: https://etherscan.io
- **Chainalysis**: [If available]
- **Elliptic**: [If available]
- **OXT**: https://oxt.me

### Security Resources
- **OFAC Sanctions**: https://sanctionssearch.ofac.treas.gov
- **Crypto Blacklists**: Various security providers
- **Threat Intelligence**: Security team resources

## Response Checklist

- [ ] Transaction verified on blockchain
- [ ] Addresses analyzed and classified
- [ ] Risk assessment completed
- [ ] Appropriate teams notified
- [ ] Enhanced monitoring activated (if needed)
- [ ] Documentation completed
- [ ] Follow-up actions scheduled
- [ ] Incident closed or escalated

## Common False Positives

### 1. Legitimate Business Operations
- Exchange deposits/withdrawals
- Liquidity pool operations
- Treasury management
- Partner payments
- User withdrawals

### 2. DeFi Operations
- Yield farming deposits
- Staking operations
- DEX arbitrage
- Flash loan operations
- Governance token distributions

## Post-Incident Analysis

### 1. Review Questions
- Was the alert appropriate?
- Could we have detected this earlier?
- Were our response procedures effective?
- What can we improve?

### 2. Process Improvements
- Update detection thresholds
- Enhance address classification
- Improve response procedures
- Update team training

## Contact Information

- **Security Team**: [PHONE_NUMBER]
- **Treasury Team**: [PHONE_NUMBER]
- **Compliance Team**: [PHONE_NUMBER]
- **Legal Team**: [PHONE_NUMBER]
- **Executive On-Call**: [PHONE_NUMBER]