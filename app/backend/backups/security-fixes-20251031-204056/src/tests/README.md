# Testing Infrastructure for Real Data Operations

This directory contains comprehensive testing infrastructure to replace mock data with real database operations. The testing strategy includes test fixtures, integration tests, and performance tests.

## Overview

The testing infrastructure is designed to:
- Replace mock data with realistic test fixtures
- Test real database operations instead of mocked services
- Validate performance characteristics with realistic data volumes
- Ensure data consistency and error handling
- Support both development and CI/CD environments

## Directory Structure

```
src/tests/
├── fixtures/                    # Test data fixtures
│   ├── communityFixtures.ts     # Community test data
│   ├── productFixtures.ts       # Product/marketplace test data
│   ├── userFixtures.ts          # User and profile test data
│   ├── governanceFixtures.ts    # DAO and governance test data
│   ├── feedFixtures.ts          # Social feed test data
│   ├── testDataFactory.ts       # Factory for generating test data
│   ├── databaseSeeder.ts        # Database seeding utilities
│   └── index.ts                 # Fixture exports
├── integration/                 # Integration tests
│   ├── realDataOperations.test.ts  # Database operation tests
│   └── apiIntegration.test.ts       # API endpoint tests
├── performance/                 # Performance tests
│   ├── realDataPerformance.test.ts     # Database performance tests
│   ├── cachingEffectiveness.test.ts    # Caching performance tests
│   └── setup.ts                        # Performance test setup
└── README.md                    # This file
```

## Test Fixtures

### Features
- **Realistic Data**: Uses Faker.js to generate realistic test data
- **Deterministic**: Supports seeded random generation for consistent tests
- **Flexible**: Factory pattern allows easy customization and overrides
- **Comprehensive**: Covers all major data types (users, communities, products, etc.)
- **Relationships**: Maintains referential integrity between related entities

### Usage

```typescript
import { CommunityFixtures, ProductFixtures, UserFixtures } from '../fixtures';

// Create single entities
const community = CommunityFixtures.createCommunity();
const product = ProductFixtures.createProduct();
const user = UserFixtures.createUser();

// Create multiple entities
const communities = CommunityFixtures.createCommunities({ count: 10 });
const products = ProductFixtures.createProducts({ count: 50 });

// Create with overrides
const verifiedUsers = UserFixtures.createUsers({
  count: 5,
  overrides: { isVerified: true }
});

// Create complete datasets with relationships
const { community, memberships, posts } = CommunityFixtures.createCommunityWithData(10, 20);
```

## Database Seeding

### DatabaseSeeder Class

The `DatabaseSeeder` class provides methods to populate test databases with realistic data:

```typescript
import { DatabaseSeeder } from '../fixtures';

const seeder = new DatabaseSeeder(testDatabaseUrl);

// Seed with default amounts
await seeder.seed();

// Seed with custom amounts
await seeder.seed({
  userCount: 100,
  communityCount: 20,
  productCount: 200,
  postCount: 500,
  clean: true
});

// Predefined seed sizes
await seeder.seedMinimal();      // Small dataset for quick tests
await seeder.seedComprehensive(); // Large dataset for performance tests

// Clean database
await seeder.cleanDatabase();
```

### Command Line Interface

```bash
# Seed with different dataset sizes
npm run seed:test                # Default dataset
npm run seed:test:minimal        # Minimal dataset
npm run seed:test:comprehensive  # Comprehensive dataset
npm run seed:test:clean          # Clean all test data

# Custom seeding
node scripts/seed-test-data.js custom 100 20 500 1000 50 10
```

## Integration Tests

### Real Data Operations Tests

Tests database operations with real data instead of mocks:

```bash
# Run integration tests
npm run test:integration

# Run specific integration test suites
npm test -- --testPathPattern="integration/realDataOperations"
npm test -- --testPathPattern="integration/apiIntegration"
```

### Test Categories

1. **Community Operations**: CRUD operations, memberships, statistics
2. **Product/Marketplace Operations**: Products, auctions, sellers, search
3. **User Operations**: Profiles, relationships, reputation
4. **Governance Operations**: Proposals, voting, DAOs
5. **Feed Operations**: Posts, reactions, comments, trending
6. **Error Handling**: Database errors, constraint violations, transactions

## Performance Tests

### Performance Test Suite

Comprehensive performance testing with realistic data volumes:

```bash
# Run performance tests
npm run test:performance

# Run with garbage collection enabled
ENABLE_GC=true npm run test:performance

# Generate performance reports
npm run test:performance && node scripts/generate-performance-report.js
```

### Test Categories

1. **Database Query Performance**: Response times for various query types
2. **Bulk Operations**: Insert, update, delete performance with large datasets
3. **Caching Effectiveness**: Cache hit rates and performance improvements
4. **Memory Usage**: Memory efficiency with large result sets
5. **Scalability**: Performance under increasing load and data volume
6. **Concurrency**: Performance with concurrent requests

### Performance Benchmarks

| Operation | Threshold | Description |
|-----------|-----------|-------------|
| Community Queries | < 500ms | Basic community listing and filtering |
| Product Queries | < 800ms | Product search and category filtering |
| Complex Joins | < 5000ms | Multi-table joins with aggregation |
| Bulk Insert (1000) | < 5000ms | Bulk insertion of 1000 records |
| Cache Hit Rate | > 80% | Percentage of requests served from cache |
| Memory Usage | < 100MB | Peak memory increase for large operations |

## Environment Setup

### Prerequisites

1. **Test Database**: Separate database for testing
2. **Environment Variables**:
   ```bash
   TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/test_db
   NODE_ENV=test
   ```

### Setup Script

```bash
# Set up test environment
./scripts/setup-test-environment.sh

# Available options:
./scripts/setup-test-environment.sh minimal      # Quick setup
./scripts/setup-test-environment.sh comprehensive # Full setup
./scripts/setup-test-environment.sh clean       # Clean only
```

## Best Practices

### Test Data Management

1. **Isolation**: Each test should clean up after itself
2. **Deterministic**: Use seeded random data for consistent results
3. **Realistic**: Test data should mirror production characteristics
4. **Performance**: Use appropriate dataset sizes for different test types

### Database Testing

1. **Transactions**: Use database transactions for test isolation
2. **Cleanup**: Always clean test data between tests
3. **Constraints**: Test database constraint violations
4. **Indexes**: Verify query performance with proper indexing

### Performance Testing

1. **Baseline**: Establish performance baselines
2. **Monitoring**: Track performance trends over time
3. **Realistic Load**: Test with production-like data volumes
4. **Resource Usage**: Monitor memory and CPU usage

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run Integration Tests
  run: |
    export TEST_DATABASE_URL=${{ secrets.TEST_DATABASE_URL }}
    npm run test:integration

- name: Run Performance Tests
  run: |
    export TEST_DATABASE_URL=${{ secrets.TEST_DATABASE_URL }}
    export ENABLE_GC=true
    npm run test:performance
```

### Test Reports

Performance tests generate comprehensive reports:
- JSON reports for programmatic analysis
- HTML reports for human review
- JUnit XML for CI/CD integration

## Troubleshooting

### Common Issues

1. **Database Connection**: Ensure TEST_DATABASE_URL is set correctly
2. **Memory Issues**: Use `--expose-gc` flag for memory-intensive tests
3. **Timeout Issues**: Increase Jest timeout for performance tests
4. **Data Conflicts**: Ensure proper test isolation and cleanup

### Debug Mode

```bash
# Run tests with debug output
DEBUG=* npm run test:integration

# Run single test file
npm test -- --testPathPattern="realDataOperations" --verbose
```

## Contributing

When adding new tests:

1. **Fixtures**: Add new fixtures for new data types
2. **Integration**: Test real database operations
3. **Performance**: Include performance benchmarks
4. **Documentation**: Update this README with new test categories

### Adding New Fixtures

```typescript
// 1. Create fixture interface
export interface NewEntityFixture {
  id: string;
  // ... other properties
}

// 2. Create fixture class
export class NewEntityFixtures {
  static createEntity(overrides: Partial<NewEntityFixture> = {}): NewEntityFixture {
    return {
      id: faker.string.uuid(),
      // ... generate realistic data
      ...overrides
    };
  }
}

// 3. Add to database seeder
// 4. Create integration tests
// 5. Add performance benchmarks
```

This testing infrastructure ensures that the transition from mock data to real database operations maintains reliability, performance, and data integrity.