# API Test Suite Documentation

## Overview

This test suite provides comprehensive automated testing for the LinkDAO backend API, specifically focusing on:

1. **Follow System** - User follow/unfollow functionality
2. **Feed System** - Content feed with filtering and sorting
3. **Integration** - Follow system + Feed filtering integration

## Test Files

### 1. `followSystem.test.ts`
Tests all follow-related endpoints:
- `POST /api/follow/follow` - Follow a user
- `POST /api/follow/unfollow` - Unfollow a user
- `GET /api/follow/followers/:address` - Get user's followers
- `GET /api/follow/following/:address` - Get users a user is following
- `GET /api/follow/is-following/:follower/:following` - Check follow status
- `GET /api/follow/count/:address` - Get follow counts

**Test Coverage:**
- ✅ Valid requests
- ✅ Invalid address formats
- ✅ Missing parameters
- ✅ Self-follow prevention
- ✅ Idempotency
- ✅ Empty states
- ✅ Data consistency

### 2. `feedSystem.test.ts`
Tests all feed-related endpoints:
- `GET /api/feed/enhanced` - Get feed with various filters
- Feed source filtering (following vs all)
- Sorting (hot, new, top)
- Time range filtering
- Pagination

**Test Coverage:**
- ✅ Authentication requirements
- ✅ Feed source filtering (following/all)
- ✅ Sorting algorithms
- ✅ Pagination
- ✅ Post structure validation
- ✅ Performance benchmarks
- ✅ Error handling

### 3. `followFeedIntegration.test.ts`
Tests integration between follow system and feed filtering:
- Following feed shows only posts from followed users
- Global feed shows all posts
- Social proof integration
- Follow/unfollow affects feed immediately
- Multi-user scenarios

**Test Coverage:**
- ✅ Feed filtering based on follow relationships
- ✅ Social proof in posts
- ✅ Consistency between follow list and feed
- ✅ Empty state handling
- ✅ Performance with many follows

## Prerequisites

### Backend Server
The backend server must be running on port 10000:
```bash
cd app/backend
npm run dev
```

Verify it's running:
```bash
curl http://localhost:10000/health
```

### Environment Variables
Set these in your `.env.test` file:
```bash
TEST_API_URL=http://localhost:10000
TEST_AUTH_TOKEN=your-test-token-here
TEST_AUTH_TOKEN_ALICE=alice-token
TEST_AUTH_TOKEN_BOB=bob-token
TEST_AUTH_TOKEN_CHARLIE=charlie-token
TEST_AUTH_TOKEN_DAVE=dave-token
```

### Dependencies
```bash
npm install --save-dev \
  @jest/globals \
  supertest \
  @types/supertest
```

## Running Tests

### Run All Tests
```bash
cd app/backend
./scripts/run-api-tests.sh
```

### Run Specific Test Suite
```bash
# Follow system only
./scripts/run-api-tests.sh follow

# Feed system only
./scripts/run-api-tests.sh feed

# Integration tests only
./scripts/run-api-tests.sh integration
```

### Run Individual Test File
```bash
npm test -- src/tests/api/followSystem.test.ts
npm test -- src/tests/api/feedSystem.test.ts
npm test -- src/tests/api/followFeedIntegration.test.ts
```

### Run with Coverage
```bash
npm test -- --coverage src/tests/api/
```

### Run in Watch Mode
```bash
npm test -- --watch src/tests/api/followSystem.test.ts
```

## Test Data

### Test User Addresses
The tests use predefined Ethereum addresses for consistency:

```typescript
const TEST_ADDRESSES = {
  user1: '0x1234567890123456789012345678901234567890',
  user2: '0x2345678901234567890123456789012345678901',
  user3: '0x3456789012345678901234567890123456789012',
};
```

### Test Scenarios

#### Scenario 1: Basic Follow/Unfollow
1. User1 follows User2
2. Verify follow relationship exists
3. User1 unfollows User2
4. Verify relationship removed

#### Scenario 2: Following Feed
1. Alice follows Bob and Charlie
2. Alice's "following" feed shows only Bob and Charlie's posts
3. Alice's "all" feed shows everyone's posts
4. Alice unfollows Bob
5. Alice's "following" feed no longer shows Bob's posts

#### Scenario 3: Social Proof
1. Alice follows Bob and Charlie
2. Posts that Bob or Charlie engaged with show social proof
3. Social proof includes "Bob reacted to this" indicators

## Expected Results

### Follow System Tests
```
✓ should successfully follow a user (150ms)
✓ should return error when follower address is missing (45ms)
✓ should return error when following address is missing (43ms)
✓ should return error when trying to follow yourself (48ms)
✓ should handle invalid ethereum address format (42ms)
✓ should be idempotent - following twice should not error (95ms)
✓ should successfully unfollow a user (88ms)
✓ should return list of followers for a user (76ms)
✓ should return empty array for user with no followers (52ms)
✓ should return true when user is following another user (68ms)
✓ should return false when user is not following another user (59ms)
✓ should return correct follower and following counts (94ms)
✓ should maintain consistency across follow/unfollow operations (187ms)

Test Suites: 1 passed, 1 total
Tests: 13 passed, 13 total
```

### Feed System Tests
```
✓ should return 401 when no authentication token provided (54ms)
✓ should return feed data with valid authentication (156ms)
✓ should support pagination parameters (98ms)
✓ should return only posts from followed users when feedSource=following (134ms)
✓ should return posts from all users when feedSource=all (112ms)
✓ should sort by hot (default) (143ms)
✓ should sort by new (128ms)
✓ should include pagination metadata (89ms)
✓ should return posts with required fields (76ms)
✓ should respond within acceptable time (< 2s) (456ms)

Test Suites: 1 passed, 1 total
Tests: 10 passed, 10 total
```

### Integration Tests
```
✓ should show posts from followed users in following feed (187ms)
✓ should show all posts in global feed regardless of follow status (134ms)
✓ should update following feed after following a new user (245ms)
✓ should remove posts from following feed after unfollowing a user (223ms)
✓ should include social proof showing which followed users engaged (167ms)
✓ should maintain consistency between follow count and following feed (198ms)

Test Suites: 1 passed, 1 total
Tests: 6 passed, 6 total
```

## Troubleshooting

### Backend Not Running
**Error:** `✗ Backend server is not running!`

**Solution:**
```bash
cd app/backend
npm run dev
```

### Authentication Errors
**Error:** `401 Access token required`

**Solution:**
1. Generate a valid JWT token for testing
2. Set `TEST_AUTH_TOKEN` environment variable
3. Or update the tests to use your authentication mechanism

### Database Connection Errors
**Error:** `Database connection failed`

**Solution:**
1. Ensure PostgreSQL is running
2. Check database connection string in `.env`
3. Run migrations: `npm run migrate`

### Port Already in Use
**Error:** `EADDRINUSE: address already in use :::10000`

**Solution:**
```bash
# Kill process on port 10000
lsof -ti:10000 | xargs kill -9

# Restart backend
npm run dev
```

## Test Maintenance

### Adding New Tests

1. Create test file in `src/tests/api/`
2. Follow naming convention: `featureName.test.ts`
3. Use existing test structure:

```typescript
import request from 'supertest';
import { describe, it, expect } from '@jest/globals';

const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:10000';

describe('Feature Name Tests', () => {
  let agent: any;

  beforeAll(() => {
    agent = request(API_BASE_URL);
  });

  describe('Endpoint Group', () => {
    it('should test specific behavior', async () => {
      const response = await agent
        .get('/api/endpoint')
        .expect(200);

      expect(response.body).toHaveProperty('expected');
    });
  });
});
```

### Updating Existing Tests

When API contracts change:
1. Update test expectations
2. Update test data if needed
3. Run tests to verify
4. Update documentation

## CI/CD Integration

### GitHub Actions Example

```yaml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd app/backend
          npm ci

      - name: Run migrations
        run: |
          cd app/backend
          npm run migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/linkdao_test

      - name: Start backend
        run: |
          cd app/backend
          npm run dev &
          sleep 5

      - name: Run API tests
        run: |
          cd app/backend
          ./scripts/run-api-tests.sh
        env:
          TEST_API_URL: http://localhost:10000
```

## Performance Benchmarks

### Expected Response Times

| Endpoint | Expected Time | Max Time |
|----------|--------------|----------|
| GET /api/feed/enhanced | < 500ms | 2000ms |
| POST /api/follow/follow | < 200ms | 500ms |
| GET /api/follow/followers/:address | < 300ms | 1000ms |
| GET /api/follow/count/:address | < 150ms | 500ms |

### Load Testing

For load testing, use tools like:
- **Artillery**: `artillery quick --count 100 --num 10 http://localhost:10000/api/feed/enhanced`
- **k6**: For more complex scenarios

## Security Considerations

### What These Tests Check
- ✅ Authentication requirements
- ✅ Input validation
- ✅ Address format validation
- ✅ Self-follow prevention
- ✅ Authorization (users can only access their own data)

### What These Tests Don't Check
- ❌ Rate limiting
- ❌ SQL injection (use ORM parameterized queries)
- ❌ XSS attacks (handled by frontend)
- ❌ CSRF protection

## Next Steps

1. **Add More Test Coverage:**
   - WebSocket real-time updates
   - Post creation and engagement
   - Notifications system
   - Search functionality

2. **Performance Testing:**
   - Load testing with Artillery or k6
   - Database query optimization
   - Caching effectiveness

3. **End-to-End Testing:**
   - Frontend + Backend integration
   - User workflows
   - Cross-browser testing

## Support

For questions or issues with tests:
1. Check test output for specific error messages
2. Verify backend is running and healthy
3. Check database connections
4. Review test documentation above
5. Open an issue in the repository
