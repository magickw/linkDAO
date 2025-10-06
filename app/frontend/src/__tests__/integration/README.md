# Integration Tests for Interconnected Social Platform

This directory contains comprehensive integration tests for the interconnected social platform, focusing on cross-feature workflows, notification delivery, real-time updates, and search functionality.

## Overview

The integration tests validate the seamless interaction between the platform's core features:
- **Feed System**: Facebook-style content aggregation and display
- **Community System**: Reddit-style topic-based discussions
- **Messaging System**: Wallet-to-wallet encrypted communications
- **Notification System**: Real-time notifications across all features
- **Search System**: Global search across all content types

## Test Suites

### 1. Cross-Feature Workflows (`CrossFeatureWorkflows.integration.test.tsx`)

Tests the integration between different features and validates user journeys that span multiple systems.

**Key Test Areas:**
- Feed to Messaging Integration
  - Sharing posts to direct messages
  - Navigation from shared content back to original posts
  - Community invitation via direct messages
- Community to Feed Integration
  - Cross-posting from communities to personal feeds
  - Following users from communities and feed updates
- Search Integration Across Features
  - Global search with navigation to different content types
  - Search result filtering and categorization
  - Search history and saved searches
- User Activity and Analytics Integration
  - Cross-feature engagement tracking
  - Reputation updates based on multi-feature activity

**Requirements Covered:** 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7

### 2. Notification Delivery (`NotificationDelivery.integration.test.tsx`)

Tests real-time notification delivery, categorization, and user interaction across all features.

**Key Test Areas:**
- Real-Time Notification Delivery
  - WebSocket connection establishment
  - Notification priority handling (high, normal, low)
  - Notification batching to prevent spam
  - Categorization and filtering
- Offline Notification Handling
  - Notification queuing when offline
  - Conflict resolution during sync
  - Preference persistence offline
- Notification Interaction and Navigation
  - Navigation to correct content when clicked
  - Read status management
  - Bulk notification actions

**Requirements Covered:** 6.1, 6.2, 6.3, 6.4, 6.5, 6.6

### 3. Real-Time Updates (`RealTimeUpdates.integration.test.tsx`)

Tests live updates and WebSocket functionality across all platform features.

**Key Test Areas:**
- Feed Real-Time Updates
  - New post delivery and display
  - Live reaction updates with animations
  - Typing indicators for comments
  - Batched update handling
- Community Real-Time Updates
  - Member count and online status updates
  - Live community activity feed
  - Governance voting updates
- Messaging Real-Time Updates
  - Message delivery and read receipts
  - Typing indicators in conversations
  - New message reception with animations
- Connection Management and Error Handling
  - WebSocket connection loss and reconnection
  - Update queuing during disconnection
  - Malformed message handling

**Requirements Covered:** 6.1, 6.2, 6.3, 6.6

### 4. Search Functionality (`SearchFunctionality.integration.test.tsx`)

Tests global search capabilities and result accuracy across all content types.

**Key Test Areas:**
- Global Search Functionality
  - Comprehensive search across posts, communities, users
  - Search suggestions and autocomplete
  - Filter and sorting options
  - Search history management
- Search Result Accuracy and Relevance
  - Relevance score ranking
  - Search term highlighting
  - Contextual snippets
  - Typo handling and fuzzy matching
  - Semantic search capabilities
- Advanced Search Features
  - Boolean search operators (AND, OR, NOT)
  - Field-specific search (author:, tag:, community:)
  - Search analytics and insights
- Search Performance and Error Handling
  - Service failure graceful handling
  - Loading states during search
  - Empty results handling
  - Request debouncing

**Requirements Covered:** 4.1, 4.4, 5.1

## Running the Tests

### Prerequisites

- Node.js 18+ and npm
- All project dependencies installed (`npm install`)

### Running All Integration Tests

```bash
# Run all integration test suites
npm run test:integration

# Or use the shell script directly
./scripts/run-integration-tests.sh
```

### Running Specific Test Suites

```bash
# Run cross-feature workflow tests
./scripts/run-integration-tests.sh cross-feature

# Run notification delivery tests
./scripts/run-integration-tests.sh notifications

# Run real-time update tests
./scripts/run-integration-tests.sh realtime

# Run search functionality tests
./scripts/run-integration-tests.sh search
```

### Running with Custom Options

```bash
# Run with extended timeout (2 minutes)
./scripts/run-integration-tests.sh --timeout 120 all

# Run with more workers for faster execution
./scripts/run-integration-tests.sh --workers 8 all

# Run with verbose output
./scripts/run-integration-tests.sh --verbose all
```

### Coverage Reports

```bash
# Generate coverage report only
./scripts/run-integration-tests.sh coverage

# View HTML coverage report
open coverage/integration/lcov-report/index.html
```

## Test Configuration

### Jest Configuration (`jest.integration.config.js`)

- **Test Timeout**: 30 seconds (configurable)
- **Coverage Threshold**: 70% overall, 80% for critical services
- **Test Environment**: jsdom with WebSocket mocking
- **Parallel Execution**: Up to 50% of CPU cores (configurable)

### Test Setup (`integrationSetup.ts`)

Provides comprehensive mocking for:
- WebSocket connections
- IndexedDB for offline functionality
- Crypto API for encryption
- Local/Session Storage
- Intersection/Resize Observers
- Media APIs (File, FileReader, etc.)
- Notification API
- Service Worker API

## Test Utilities

The integration tests include several utility functions available globally:

```typescript
// Wait for async operations
await global.testUtils.waitForAsync(100);

// Trigger custom events
global.testUtils.triggerCustomEvent(element, 'notification', { data });

// Mock WebSocket messages
const event = global.testUtils.mockWebSocketMessage({ type: 'new_post', payload });

// Simulate network conditions
global.testUtils.simulateNetworkCondition('offline');
```

## Debugging Tests

### Verbose Output

Run tests with `--verbose` flag to see detailed test execution:

```bash
./scripts/run-integration-tests.sh --verbose all
```

### Debug Specific Test

```bash
# Run Jest in debug mode for a specific test file
npx jest --config=jest.integration.config.js src/__tests__/integration/CrossFeatureWorkflows.integration.test.tsx --verbose --no-cache
```

### Browser Debugging

For complex debugging, you can run tests in a real browser environment:

```bash
# Install puppeteer for browser testing
npm install --save-dev jest-puppeteer puppeteer

# Run with puppeteer environment
npx jest --config=jest.integration.config.js --testEnvironment=jest-environment-puppeteer
```

## Performance Considerations

### Test Optimization

- Tests use mocked services to avoid network calls
- WebSocket connections are mocked for consistent behavior
- Virtual scrolling tests use intersection observer mocks
- File upload tests use mock File objects

### Parallel Execution

Integration tests are designed to run in parallel:
- Each test suite is independent
- Mocks are reset between tests
- No shared state between test files

### Memory Management

- Large datasets are mocked rather than generated
- Cleanup functions reset all mocks after each test
- Timers and event listeners are properly cleaned up

## Continuous Integration

### GitHub Actions Integration

Add to your `.github/workflows/test.yml`:

```yaml
- name: Run Integration Tests
  run: |
    cd app/frontend
    ./scripts/run-integration-tests.sh --timeout 120
  env:
    CI: true
```

### Coverage Requirements

- Overall coverage: 70% minimum
- Critical services: 80% minimum
- Cross-feature integration: 75% minimum

## Troubleshooting

### Common Issues

1. **WebSocket Connection Errors**
   - Ensure WebSocket mocks are properly configured
   - Check that event listeners are correctly mocked

2. **Timeout Issues**
   - Increase timeout with `--timeout` flag
   - Check for unresolved promises in tests

3. **Memory Leaks**
   - Verify cleanup functions are called
   - Check for unclosed event listeners

4. **Flaky Tests**
   - Add proper wait conditions with `waitFor`
   - Use deterministic mock data
   - Avoid time-dependent assertions

### Getting Help

- Check the test output for specific error messages
- Review the coverage report for untested code paths
- Use `--verbose` flag for detailed test execution logs
- Examine the mock setup in `integrationSetup.ts`

## Contributing

When adding new integration tests:

1. Follow the existing test structure and naming conventions
2. Add comprehensive mocking for external dependencies
3. Include both happy path and error scenarios
4. Update this README with new test descriptions
5. Ensure tests are deterministic and not flaky
6. Add appropriate cleanup in `afterEach` hooks

## Requirements Mapping

| Requirement | Test Suite | Description |
|-------------|------------|-------------|
| 4.1 | Cross-Feature, Search | Cross-feature content discovery |
| 4.2 | Cross-Feature | Content sharing between features |
| 4.3 | Cross-Feature | Community announcements in messaging |
| 4.4 | Cross-Feature, Search | Global search and discovery |
| 4.5 | Cross-Feature | Cross-promotion options |
| 4.6 | Cross-Feature | User following and feed updates |
| 4.7 | Cross-Feature | Cross-feature notifications |
| 5.1 | Search | Intelligent caching and performance |
| 6.1 | Notifications, Real-Time | Real-time notification delivery |
| 6.2 | Notifications, Real-Time | Live content updates |
| 6.3 | Notifications, Real-Time | Engagement notifications |
| 6.4 | Notifications | Mention notifications |
| 6.5 | Notifications | Community governance notifications |
| 6.6 | Notifications, Real-Time | Connection status and sync |