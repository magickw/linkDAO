# Pre-Mainnet Validation Script

## Overview

The `pre-mainnet-validation.ts` script performs comprehensive validation checks before deploying LinkDAO to Ethereum mainnet. It ensures all critical requirements are met and provides a clear GO/NO-GO decision.

## Features

### 8 Validation Categories

1. **Environment & Configuration** (6 checks)
   - Environment variables validation
   - Network configuration verification
   - Hardhat configuration check
   - Deployer balance validation (min 2 ETH, recommended 5 ETH)
   - Multisig addresses verification
   - Treasury configuration

2. **Security & Audits** (4 checks)
   - Security test suite execution
   - Static analysis tools (Slither)
   - Audit reports verification
   - Emergency procedures validation

3. **Smart Contracts** (4 checks)
   - Contract compilation
   - Contract size limits (24KB)
   - Gas optimization verification
   - Critical contracts existence

4. **Deployment Readiness** (3 checks)
   - Deployment scripts verification
   - Gas cost estimation
   - Deployment configuration

5. **Infrastructure** (3 checks)
   - Monitoring setup
   - RPC endpoint connectivity
   - Etherscan API configuration

6. **Operational Readiness** (3 checks)
   - Team readiness checklist
   - Documentation verification
   - Support infrastructure

7. **Legal & Compliance** (3 checks)
   - Terms of service review
   - Privacy policy review
   - Legal counsel approval

8. **Community & Documentation** (3 checks)
   - Launch announcements
   - User guides
   - API documentation

## Usage

### Prerequisites

1. Install dependencies:
```bash
npm install
```

2. Copy and configure environment file:
```bash
cp .env.mainnet.example .env
```

3. Update `.env` with your configuration:
   - Add deployer private key
   - Configure mainnet RPC URL
   - Set Etherscan API key
   - Configure multisig addresses (CRITICAL!)

### Running Validation

#### For Mainnet Deployment:
```bash
npm run validate:mainnet
```

Or directly:
```bash
npx hardhat run scripts/pre-mainnet-validation.ts --network mainnet
```

#### For Testnet (Sepolia):
```bash
HARDHAT_NETWORK=sepolia npx hardhat run scripts/pre-mainnet-validation.ts
```

#### Dry Run (Hardhat Network):
```bash
npx hardhat run scripts/pre-mainnet-validation.ts
```

### Output

The script provides:

1. **Real-time Console Output**
   - Progress updates for each check
   - Pass/Fail/Warning indicators
   - Detailed messages for failures

2. **Summary Report**
   - Overall status (READY/NOT_READY/WARNINGS)
   - Statistics (passed, failed, warnings, skipped)
   - Critical failures count
   - GO/NO-GO decision

3. **JSON Report File**
   - Saved to `validation-reports/pre-mainnet-validation-{timestamp}.json`
   - Complete details of all checks
   - Machine-readable for CI/CD integration

### Example Output

```
🔍 LinkDAO Pre-Mainnet Validation
================================================================================
Target Network: mainnet
Timestamp: 2024-01-15T10:30:00.000Z
================================================================================

🔧 1. Environment & Configuration Checks
--------------------------------------------------------------------------------
  ✅ Deployer Account: Deployer address: 0x1234...5678
  ✅ Environment Variables: All required environment variables are set
  ✅ Network Configuration: Connected to correct network (chainId: 1)
  ✅ Hardhat Configuration: Hardhat configuration file found
  ⚠️  Deployer Balance: Deployer has 3.5000 ETH (minimum met, but below recommended 5 ETH)
  ✅ Multisig Addresses: All multisig addresses are valid
  ✅ Treasury Configuration: Treasury address configured: 0xabcd...ef01

🔒 2. Security & Audit Checks
--------------------------------------------------------------------------------
  ✅ Security Test Suite: Security tests passed
  ⏭️  Static Analysis (Slither): Slither not installed - static analysis skipped
  ⚠️  Audit Reports: No audit directory found - ensure external audits are completed
  ✅ Emergency Procedures: Emergency procedures script exists

... (more checks)

================================================================================
📊 VALIDATION SUMMARY
================================================================================
Overall Status: WARNINGS
Total Checks: 29
  ✅ Passed: 24
  ❌ Failed: 0 (0 critical)
  ⚠️  Warnings: 3
  ⏭️  Skipped: 2
================================================================================

🎯 GO/NO-GO DECISION
--------------------------------------------------------------------------------
✅ READY FOR MAINNET DEPLOYMENT

Warnings to address:
  ⚠️  Environment: Deployer Balance
  ⚠️  Security: Audit Reports
  ⚠️  Infrastructure: Etherscan API
================================================================================

💡 RECOMMENDATIONS
--------------------------------------------------------------------------------
⚠️  Review all warnings and address if possible:
   - Environment: Deployer Balance
   - Security: Audit Reports
   - Infrastructure: Etherscan API
💰 Consider adding more ETH to deployer wallet for safety margin
🔍 Strongly recommend completing external security audit before mainnet
🔑 Configure Etherscan API key for contract verification
================================================================================

📄 Report saved to: validation-reports/pre-mainnet-validation-1705318200000.json
```

## Exit Codes

- **0**: Validation passed - ready for deployment
- **1**: Validation failed - critical blockers present

Use in CI/CD:
```bash
npm run validate:mainnet && npm run deploy:mainnet || echo "Deployment blocked by validation failures"
```

## Validation Criteria

### Critical Checks (Must Pass)

These checks MUST pass for deployment approval:

- ✅ Deployer account configured
- ✅ All required environment variables set
- ✅ Connected to correct network
- ✅ Deployer balance >= 2 ETH
- ✅ All multisig addresses valid
- ✅ Treasury configured
- ✅ Security tests pass
- ✅ Emergency procedures exist
- ✅ All contracts compile
- ✅ Contracts within size limits
- ✅ Critical contracts present
- ✅ Deployment scripts exist
- ✅ RPC connectivity working

### Warning Checks (Should Pass)

These checks should pass but won't block deployment:

- ⚠️  Deployer balance >= 5 ETH (recommended)
- ⚠️  Static analysis tools available
- ⚠️  External audit reports present
- ⚠️  Etherscan API configured
- ⚠️  Monitoring infrastructure ready
- ⚠️  Alert channels configured

### Manual Checks (Review Required)

These require manual verification:

- 📋 Team briefed and on-call rotation set
- 📋 Documentation complete
- 📋 Terms of service finalized
- 📋 Privacy policy approved
- 📋 Legal review completed
- 📋 Launch announcements prepared
- 📋 User guides complete
- 📋 API documentation up to date

## Integration with Deployment Process

### Recommended Workflow

1. **Pre-Deployment** (1-2 days before)
   ```bash
   # Run validation on testnet
   HARDHAT_NETWORK=sepolia npm run validate:mainnet

   # Fix any issues
   # Re-run validation until all checks pass
   ```

2. **Final Check** (Day of deployment)
   ```bash
   # Run mainnet validation
   npm run validate:mainnet

   # Review report carefully
   # Obtain team approval
   ```

3. **Deploy** (If validation passes)
   ```bash
   # Proceed with deployment
   npm run deploy:mainnet
   ```

### CI/CD Integration

Add to GitHub Actions workflow:

```yaml
name: Pre-Mainnet Validation

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run pre-mainnet validation
        env:
          PRIVATE_KEY: ${{ secrets.DEPLOYER_PRIVATE_KEY }}
          MAINNET_RPC_URL: ${{ secrets.MAINNET_RPC_URL }}
          ETHERSCAN_API_KEY: ${{ secrets.ETHERSCAN_API_KEY }}
          TREASURY_ADDRESS: ${{ secrets.TREASURY_ADDRESS }}
          EMERGENCY_MULTISIG_ADDRESS: ${{ secrets.EMERGENCY_MULTISIG }}
          GOVERNANCE_MULTISIG_ADDRESS: ${{ secrets.GOVERNANCE_MULTISIG }}
        run: npm run validate:mainnet

      - name: Upload validation report
        uses: actions/upload-artifact@v3
        with:
          name: validation-report
          path: contracts/validation-reports/*.json
```

## Customization

### Adding Custom Checks

Edit `pre-mainnet-validation.ts` and add to the appropriate validation category:

```typescript
private async validateCustomCheck() {
  // Your custom validation logic
  const result = await someValidation();

  this.addResult({
    category: "Custom",
    check: "My Custom Check",
    status: result.success ? "PASS" : "FAIL",
    message: "Check completed",
    critical: true,  // Set to true if this blocks deployment
    details: result.data
  });
}
```

Then call it from `runValidation()`:

```typescript
async runValidation(): Promise<ValidationReport> {
  // ... existing categories
  await this.validateCustomCheck();
  // ...
}
```

### Modifying Thresholds

Update minimum requirements in the script:

```typescript
// Deployer balance (line ~275)
const minRequired = 2.0; // Change minimum ETH
const recommended = 5.0; // Change recommended ETH

// Gas estimation (line ~485)
const estimatedGasUnits = 50_000_000; // Adjust gas estimate
```

## Troubleshooting

### Common Issues

**"Insufficient balance" error**
- Add more ETH to deployer wallet
- Minimum: 2 ETH, Recommended: 5 ETH

**"Missing environment variables" error**
- Copy `.env.mainnet.example` to `.env`
- Fill in all required values

**"Contract compilation failed" error**
- Run `npx hardhat clean`
- Run `npx hardhat compile`
- Check for syntax errors in contracts

**"RPC connectivity failed" error**
- Verify `MAINNET_RPC_URL` is correct
- Check Infura/Alchemy API limits
- Try alternative RPC provider

**"Invalid multisig address" error**
- Ensure addresses are valid Ethereum addresses (0x...)
- Deploy multisig wallets first if needed
- Verify addresses match your multisig deployment

## Support

For issues or questions:
- GitHub Issues: https://github.com/linkdao/linkdao/issues
- Discord: https://discord.gg/linkdao
- Email: devops@linkdao.io

## License

MIT License - see LICENSE file for details
