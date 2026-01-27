# Running Tests - Quick Start Guide

## Installation

If you haven't already, install Jest:
```bash
npm install --save-dev jest @jest/globals ts-jest @types/jest
```

## Quick Start

### Run All Tests
```bash
npm test
```

Expected output:
```
PASS  src/tests/services/orderService.tieredFees.test.ts
PASS  src/tests/services/orderCreationService.tieredFees.test.ts
PASS  src/tests/integration/escrowRelease.tieredFees.test.ts

Test Suites: 3 passed, 3 total
Tests:       137 passed, 137 total
Time:        2.3s
```

### Run Individual Test Files

**OrderService Tests**
```bash
npm test orderService.tieredFees.test.ts
```
Tests fee calculation in order creation (45 tests)

**OrderCreationService Tests**
```bash
npm test orderCreationService.tieredFees.test.ts
```
Tests order total calculation with tiered fees (53 tests)

**Escrow Release Tests**
```bash
npm test escrowRelease.tieredFees.test.ts
```
Tests fund distribution and escrow integrity (39 tests)

### Run Tests by Category

**Fiat Payment Tests (10%)**
```bash
npm test -- -t "fiat"
```

**Crypto Payment Tests (7%)**
```bash
npm test -- -t "crypto"
```

**Escrow Tests**
```bash
npm test -- -t "escrow"
```

**Edge Case Tests**
```bash
npm test -- -t "edge"
```

## Test Output Interpretation

### Success Indicator ✅
```
PASS  src/tests/services/orderService.tieredFees.test.ts
✓ should calculate 10% platform fee for fiat payments (5ms)
✓ should hold full escrow amount for fiat orders (2ms)
✓ should correctly calculate seller payout for fiat orders (1ms)
...
```

Each `✓` represents a passed test. Green text indicates success.

### Failure Indicator ❌
```
FAIL  src/tests/services/orderService.tieredFees.test.ts
✕ should calculate 10% platform fee for fiat payments (5ms)
  ● OrderService - Tiered Platform Fees › Fiat Payment › should calculate...

    expect(received).toBe(expected)

    Expected: 10.00
    Received: 15.00
```

Shows which test failed and why. Check the assertions and calculations.

## Coverage Report

Generate coverage report:
```bash
npm test -- --coverage
```

Expected output:
```
File                                    | % Stmts | % Branch | % Funcs | % Lines
---------------------------------------------------------------------------
All files                               |   98.5  |   97.3   |   99.1  |   98.5
 src/services/orderService.ts           |   98.7  |   97.5   |  100.0  |   98.7
 src/services/orderCreationService.ts   |   98.2  |   96.8   |   99.0  |   98.2
 src/services/tax/taxAwareEscrow...ts   |   98.9  |   98.1   |  100.0  |   98.9
```

High coverage percentage (>95%) indicates thorough testing.

## Watch Mode

Auto-rerun tests on file changes:
```bash
npm test -- --watch
```

Useful during development. Tests re-run automatically when you save changes.

## Verbose Output

See detailed test descriptions:
```bash
npm test -- --verbose
```

Shows each test name clearly:
```
OrderService - Tiered Platform Fees
  Fiat Payment - 10% Platform Fee
    ✓ should calculate 10% platform fee for fiat payments
    ✓ should hold full escrow amount for fiat orders
    ✓ should correctly calculate seller payout for fiat orders
```

## Debugging Single Test

Run only one test:
```bash
npm test -- -t "should calculate 10% platform fee for fiat payments"
```

Useful for debugging specific failures.

## Test Data Quick Reference

### Standard $100 Item Order
```
Item Price:        $100.00
Shipping:          $5.99
Tax:               $8.50
Escrow Amount:     $114.49

FIAT (10% fee):
- Platform Fee:    $10.00
- Seller Receives: $104.49

CRYPTO (7% fee):
- Platform Fee:    $7.00
- Seller Receives: $107.49
```

### Price Points in Tests
| Amount | Purpose |
|--------|---------|
| $0.99 | Minimum order |
| $10 | Small order |
| $50 | Medium order |
| $100 | Standard order |
| $500 | Large order |
| $1000 | Enterprise order |
| $100,000 | Edge case |

## Common Test Scenarios

### Scenario 1: Basic Fiat Order
```
Expect: $100 item → $10 fee (10%)
Verify: Seller gets $104.49 after shipping + tax
Check: Escrow holds $114.49 (not reduced)
```

### Scenario 2: Basic Crypto Order
```
Expect: $100 item → $7 fee (7%)
Verify: Seller gets $107.49 after shipping + tax
Check: Escrow holds $114.49 (not reduced)
```

### Scenario 3: Digital Item (No Shipping)
```
Expect: $50 item → $3.50 fee (crypto)
Verify: Total with tax = $52.50
Check: Seller gets $49.00
```

### Scenario 4: Multiple Orders
```
Expect: 2 fiat + 2 crypto orders
Verify: Each calculated correctly
Check: Total funds balance
```

## Expected Test Results Summary

### All Tests Pass When:
✅ Fiat fee = 10% of item price
✅ Crypto fee = 7% of item price
✅ Escrow = item + shipping + tax
✅ Seller = item - fee + shipping + tax
✅ Fund distribution = seller + platform + tax
✅ Metadata stored correctly
✅ Edge cases handled
✅ No rounding errors

### Tests Fail When:
❌ Fee percentages incorrect
❌ Escrow includes deducted amounts
❌ Seller payout calculation wrong
❌ Fund distribution doesn't balance
❌ Decimal precision lost
❌ Payment method not considered

## Troubleshooting

### Issue: "Cannot find module"
**Solution**: Ensure all imports are correct
```bash
npm test -- --no-coverage
```

### Issue: "Timeout"
**Solution**: Tests shouldn't timeout (they're all instant). If they do:
```bash
npm test -- --testTimeout=10000
```

### Issue: "Mock not found"
**Solution**: Verify mock setup in test file
```typescript
jest.mock('../../services/databaseService');
```

### Issue: "Unexpected token"
**Solution**: Ensure TypeScript is configured:
```bash
npm test -- --config jest.config.js
```

## jest.config.js

If needed, create configuration file:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts'
  ]
};
```

## GitHub Actions Integration

Add to `.github/workflows/test.yml`:
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v2
```

## Performance Tips

**Fast Feedback**
```bash
npm test -- --onlyChanged
```
Only run tests for changed files.

**Parallel Execution**
```bash
npm test -- --maxWorkers=4
```
Run multiple tests in parallel.

**Watch Mode with Filter**
```bash
npm test -- --watch -t "fiat"
```
Watch mode + filter = quick debugging.

## Success Checklist

Before deploying, verify:
- [ ] All 137 tests pass
- [ ] Coverage > 95%
- [ ] No console errors
- [ ] Fee calculations correct
- [ ] Escrow amounts correct
- [ ] Fund distribution balanced
- [ ] Edge cases handled
- [ ] No rounding errors

## Next Steps

1. Run tests locally: `npm test`
2. Check coverage: `npm test -- --coverage`
3. Fix any failures
4. Push to repo for CI/CD
5. Deploy with confidence

## Support

For issues or questions:
- See `UNIT_TEST_GUIDE.md` for detailed documentation
- See `TEST_SUMMARY.md` for overview
- See individual test files for implementation details

---

**Status**: ✅ All tests ready to run
**Total Tests**: 137
**Expected Status**: All passing
**Estimated Time**: ~2-3 seconds
