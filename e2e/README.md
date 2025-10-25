# LinkDAO E2E Tests

This directory contains end-to-end tests for the LinkDAO marketplace checkout flow using Playwright.

## Test Structure

- `tests/` - Contains all E2E test files
- `playwright.config.ts` - Playwright configuration file

## Running Tests

### Install Dependencies

```bash
npm install
```

### Run All Tests

```bash
npm test
```

### Run Tests in UI Mode

```bash
npm run test:ui
```

### Run Tests in Debug Mode

```bash
npm run test:debug
```

### Generate Test Code

```bash
npm run codegen
```

## Test Scenarios

### Checkout Flow Tests

1. **Basic Checkout Flow** - Tests the complete checkout journey from marketplace to order confirmation
2. **Payment Method Selection** - Tests switching between different payment methods
3. **Network Switching** - Tests switching between different blockchain networks during checkout
4. **Error Handling** - Tests how the application handles payment errors
5. **Edge Cases** - Tests edge cases like empty cart scenarios

## Test Environment

The tests expect the LinkDAO application to be running on `http://localhost:3000`. Make sure to start the development server before running tests:

```bash
# In the main project directory
npm run dev
```

## Test Data

The tests interact with the actual application UI and may require:

1. A wallet connection (MetaMask or similar)
2. Test tokens for crypto payments
3. Test credit card information for fiat payments

For automated testing, you may need to set up mock wallets or use test environments.

## Writing New Tests

1. Add new test files in the `tests/` directory
2. Follow the existing patterns for test structure
3. Use descriptive test names and clear assertions
4. Test both happy paths and error conditions

## CI/CD Integration

These tests can be integrated into CI/CD pipelines to ensure the checkout flow remains functional after changes.