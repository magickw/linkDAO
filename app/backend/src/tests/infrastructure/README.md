# Infrastructure Tests

This directory contains comprehensive tests for the core infrastructure components of the interconnected social platform. These tests validate the functionality, performance, and reliability of caching strategies, API endpoints, WebSocket connections, and database operations.

## Test Categories

### 1. Service Worker Cache Tests (`serviceWorkerCache.test.ts`)

Tests the intelligent caching system with multiple strategies:

- **NetworkFirst Strategy**: For feed content with 5-minute TTL
- **StaleWhileRevalidate Strategy**: For community data with 10-minute TTL  
- **CacheFirst Strategy**: For user profiles with 30-minute TTL
- **NetworkOnly Strategy**: For messages (privacy)

**Key Features Tested:**
- Cache initialization and service worker registration
- Predictive preloading based on user behavior
- Tag-based cache invalidation
- Offline action queuing
- Cache statistics and storage quota management
- Batch resource caching with graceful failure handling
- Cache warming for critical resources

### 2. API Endpoints Integration Tests (`apiEndpoints.integration.test.ts`)

Comprehensive testing of REST API endpoints:

**Feed API:**
- GET `/api/feed/enhanced` - Personalized feed with filtering
- POST `/api/feed` - Create new posts
- POST `/api/feed/:id/react` - Add reactions
- POST `/api/feed/:id/tip` - Send tips

**Community API:**
- GET `/api/communities` - List and search communities
- POST `/api/communities` - Create communities
- POST `/api/communities/:id/join` - Join/leave communities
- GET `/api/communities/:id/posts` - Community posts

**Messaging API:**
- GET `/api/messaging/conversations` - User conversations
- POST `/api/messaging/conversations` - Start conversations
- POST `/api/messaging/conversations/:id/messages` - Send messages

**Features Tested:**
- Request validation and error handling
- Authentication and authorization
- Rate limiting enforcement
- Pagination and filtering
- Data integrity and constraints

### 3. WebSocket Service Tests (`webSocket.test.ts`)

Real-time communication infrastructure:

**Connection Management:**
- User authentication with wallet addresses
- Connection state tracking (online/offline/reconnecting)
- Multiple connections per user
- Graceful disconnection handling

**Subscription System:**
- Feed subscriptions with event filtering
- Community-specific subscriptions
- Conversation subscriptions
- Priority-based message delivery

**Real-time Features:**
- Feed updates and new post notifications
- Message delivery with encryption metadata
- Reaction updates with aggregation
- Tip notifications with transaction details
- Typing indicators with timeout
- Community updates and member changes

**Advanced Features:**
- Message queuing for offline users
- Heartbeat and connection health monitoring
- Subscription filtering by event types and priority
- Connection statistics and monitoring

### 4. Database Operations Tests (`database.test.ts`)

Database schema and operations validation:

**Core Operations:**
- CRUD operations for posts, communities, conversations, messages
- Complex queries with joins and filtering
- Full-text search functionality
- Pagination and ordering

**Data Integrity:**
- Foreign key constraints
- Unique constraints
- Required field validation
- Data type validation

**Performance:**
- Query performance benchmarks
- Index effectiveness
- Transaction handling
- Rollback scenarios

**Advanced Features:**
- Soft deletion handling
- Engagement score calculations
- Community statistics
- Message encryption metadata

## Running Tests

### Prerequisites

1. **Node.js 18+** and npm installed
2. **PostgreSQL** database (optional, tests will skip if unavailable)
3. **Redis** server (optional, tests will skip if unavailable)

### Environment Setup

Create a `.env.test` file in the backend directory:

```bash
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5432/test_db
REDIS_URL=redis://localhost:6379/1
JWT_SECRET=test-jwt-secret
FRONTEND_URL=http://localhost:3000
VERBOSE_TESTS=false
```

### Running All Tests

```bash
# Run all infrastructure tests
npm run test:infrastructure:all

# Run with verbose output
npm run test:infrastructure:verbose
```

### Running Specific Test Categories

```bash
# Cache tests only
npm run test:infrastructure:cache

# API tests only  
npm run test:infrastructure:api

# WebSocket tests only
npm run test:infrastructure:websocket

# Database tests only
npm run test:infrastructure:database
```

### Using Jest Directly

```bash
# Run with Jest configuration
npm run test:infrastructure

# Run specific test file
npx jest src/tests/infrastructure/serviceWorkerCache.test.ts

# Run with coverage
npx jest --config jest.infrastructure.config.js --coverage
```

## Test Configuration

### Jest Configuration (`jest.infrastructure.config.js`)

- **Test Environment**: Node.js
- **Test Timeout**: 30 seconds
- **Coverage Thresholds**: 70% global, 80% for services
- **Parallel Execution**: 50% of available cores
- **Coverage Reports**: Text, LCOV, HTML

### Global Setup and Teardown

- **Global Setup**: Database migrations, Redis setup, test directories
- **Global Teardown**: Cleanup test data, temporary files
- **Per-Test Setup**: Mock clearing, environment reset

## Test Structure

Each test file follows a consistent structure:

```typescript
describe('Component Name', () => {
  beforeAll(async () => {
    // One-time setup
  });

  afterAll(async () => {
    // One-time cleanup
  });

  beforeEach(() => {
    // Per-test setup
  });

  afterEach(() => {
    // Per-test cleanup
  });

  describe('Feature Category', () => {
    it('should test specific functionality', async () => {
      // Test implementation
    });
  });
});
```

## Mocking Strategy

### Service Worker Cache Tests
- Mock `caches` API, `fetch`, `localStorage`
- Mock `navigator.serviceWorker` and `navigator.storage`
- Mock `crypto` API for encryption tests

### API Tests
- Use `supertest` for HTTP request testing
- Mock database connections for isolated testing
- Mock external services (Redis, IPFS, etc.)

### WebSocket Tests
- Use `socket.io-client` for real WebSocket testing
- Create actual HTTP server for integration testing
- Mock authentication and user management

### Database Tests
- Use test database with real connections
- Transaction-based test isolation
- Cleanup test data after each test

## Coverage Requirements

### Minimum Coverage Thresholds

- **Global**: 70% (branches, functions, lines, statements)
- **Services**: 80% (higher standard for core business logic)
- **Routes**: 70% (API endpoint coverage)
- **Controllers**: 70% (request handling logic)

### Coverage Reports

Generated in `coverage/infrastructure/`:
- **Text**: Console output during test runs
- **LCOV**: For CI/CD integration
- **HTML**: Detailed browser-viewable reports

## Performance Benchmarks

### Expected Performance Metrics

- **Cache Operations**: < 100ms for cache hits
- **API Responses**: < 500ms for simple queries
- **WebSocket Messages**: < 50ms delivery time
- **Database Queries**: < 1000ms for complex queries

### Load Testing

- **API Endpoints**: 100+ concurrent requests
- **WebSocket Connections**: 50+ simultaneous connections
- **Database Operations**: Transaction rollback scenarios

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure PostgreSQL is running
   - Check connection string in `.env.test`
   - Verify database permissions

2. **Redis Connection Errors**
   - Ensure Redis server is running
   - Check Redis URL configuration
   - Tests will skip if Redis unavailable

3. **WebSocket Test Timeouts**
   - Increase test timeout in Jest config
   - Check for port conflicts
   - Ensure proper cleanup in afterEach

4. **Cache Test Failures**
   - Clear browser cache if running in browser environment
   - Check localStorage mock implementation
   - Verify service worker registration mocks

### Debug Mode

Enable verbose logging:

```bash
VERBOSE_TESTS=true npm run test:infrastructure
```

### Test Isolation

Each test runs in isolation with:
- Fresh mock implementations
- Cleared localStorage/sessionStorage
- Reset database state (if using transactions)
- Cleaned up WebSocket connections

## Continuous Integration

### CI/CD Integration

The tests are designed to run in CI environments:

```yaml
# Example GitHub Actions workflow
- name: Run Infrastructure Tests
  run: |
    npm install
    npm run test:infrastructure
  env:
    NODE_ENV: test
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
```

### Test Artifacts

Generated artifacts:
- Coverage reports in `coverage/infrastructure/`
- Test results in JUnit format
- Performance benchmarks
- Error logs and debugging information

## Contributing

### Adding New Tests

1. Follow the existing test structure and naming conventions
2. Include both positive and negative test cases
3. Add appropriate mocks and cleanup
4. Update this README with new test descriptions
5. Ensure coverage thresholds are met

### Test Guidelines

- **Descriptive Names**: Use clear, descriptive test names
- **Single Responsibility**: Each test should verify one specific behavior
- **Proper Cleanup**: Always clean up resources in afterEach/afterAll
- **Error Handling**: Test both success and failure scenarios
- **Performance**: Include performance assertions where relevant

### Code Quality

- Use TypeScript for type safety
- Follow ESLint and Prettier configurations
- Include JSDoc comments for complex test logic
- Use meaningful variable and function names
- Keep tests focused and concise