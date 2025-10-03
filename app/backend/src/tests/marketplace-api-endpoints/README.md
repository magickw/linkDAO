# Marketplace API Endpoints Testing Suite

This comprehensive testing suite covers all aspects of the marketplace API endpoints implementation, ensuring reliability, correctness, and robustness of the backend services.

## Overview

The testing suite is organized into three main categories:

### 1. Unit Tests (`*.unit.test.ts`)
- **Purpose**: Test individual service methods in isolation with mocked dependencies
- **Coverage**: Service layer business logic, error handling, and edge cases
- **Files**:
  - `sellerProfileService.unit.test.ts` - Seller profile management
  - `authenticationService.unit.test.ts` - Wallet authentication and session management
  - `reputationService.unit.test.ts` - User reputation calculations and caching
  - `marketplaceListingsService.unit.test.ts` - Marketplace listings CRUD operations

### 2. Integration Tests (`*.integration.test.ts`)
- **Purpose**: Test API endpoints with realistic request/response cycles
- **Coverage**: HTTP routes, middleware, validation, and error responses
- **Files**:
  - `sellerProfileRoutes.integration.test.ts` - Seller profile API endpoints
  - `authenticationRoutes.integration.test.ts` - Authentication API endpoints
  - `marketplaceListingsRoutes.integration.test.ts` - Marketplace listings API endpoints

### 3. End-to-End Tests (`*.e2e.test.ts`)
- **Purpose**: Test complete user workflows from start to finish
- **Coverage**: Multi-step processes, data consistency, and real-world scenarios
- **Files**:
  - `sellerOnboardingWorkflow.e2e.test.ts` - Complete seller onboarding process
  - `marketplaceBrowsingWorkflow.e2e.test.ts` - Listing creation and browsing workflows
  - `authenticationWorkflow.e2e.test.ts` - Authentication and session management workflows

## Running Tests

### Prerequisites
```bash
cd app/backend
npm install
```

### Run All Tests
```bash
npm run test:marketplace-api
```

### Run Specific Test Categories
```bash
# Unit tests only
npm run test:marketplace-api -- --unit

# Integration tests only
npm run test:marketplace-api -- --integration

# End-to-end tests only
npm run test:marketplace-api -- --e2e
```

### Run with Verbose Output
```bash
npm run test:marketplace-api -- --verbose
```

### Run Individual Test Files
```bash
# Run specific test file
npx jest src/tests/marketplace-api-endpoints/sellerProfileService.unit.test.ts

# Run with coverage
npx jest src/tests/marketplace-api-endpoints/sellerProfileService.unit.test.ts --coverage
```

## Test Coverage

The testing suite aims for comprehensive coverage of:

### Service Layer (Unit Tests)
- ✅ **Seller Profile Service**
  - Profile creation, retrieval, and updates
  - Onboarding step management
  - Wallet address and ENS handle validation
  - Error handling and fallback scenarios

- ✅ **Authentication Service**
  - Nonce generation and validation
  - Wallet signature verification
  - Session management and refresh tokens
  - ConnectorNotConnectedError handling
  - Rate limiting and security measures

- ✅ **Reputation Service**
  - Reputation calculation and caching
  - Bulk reputation retrieval
  - History tracking and audit trails
  - Default values and fallback mechanisms

- ✅ **Marketplace Listings Service**
  - CRUD operations for listings
  - Pagination, filtering, and sorting
  - Search functionality
  - Category management
  - Authorization and ownership validation

### API Endpoints (Integration Tests)
- ✅ **HTTP Status Codes**: Correct status codes for all scenarios
- ✅ **Request Validation**: Input validation and error messages
- ✅ **Response Format**: Consistent API response structure
- ✅ **Error Handling**: Proper error responses and logging
- ✅ **Middleware**: Rate limiting, caching, and authentication
- ✅ **Edge Cases**: Invalid inputs, missing data, and boundary conditions

### User Workflows (E2E Tests)
- ✅ **Seller Onboarding**: Complete flow from wallet connection to profile completion
- ✅ **Listing Management**: Create, update, delete, and browse listings
- ✅ **Authentication Flow**: Nonce generation, wallet auth, session management
- ✅ **Error Recovery**: Graceful handling of service failures
- ✅ **Data Consistency**: State management across multiple operations

## Test Structure and Patterns

### Unit Test Pattern
```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let mockDependency: jest.Mocked<DependencyType>;

  beforeEach(() => {
    service = new ServiceName();
    mockDependency = dependency as jest.Mocked<DependencyType>;
    jest.clearAllMocks();
  });

  describe('methodName', () => {
    it('should handle success case', async () => {
      // Arrange
      mockDependency.method.mockResolvedValue(expectedResult);
      
      // Act
      const result = await service.methodName(input);
      
      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockDependency.method).toHaveBeenCalledWith(input);
    });

    it('should handle error case', async () => {
      // Arrange
      mockDependency.method.mockRejectedValue(new Error('Test error'));
      
      // Act & Assert
      await expect(service.methodName(input)).rejects.toThrow('Test error');
    });
  });
});
```

### Integration Test Pattern
```typescript
describe('Route Integration Tests', () => {
  let app: express.Application;
  let mockService: jest.Mocked<ServiceType>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api', routes);
    mockService = service as jest.Mocked<ServiceType>;
    jest.clearAllMocks();
  });

  it('should return success response', async () => {
    mockService.method.mockResolvedValue(mockData);

    const response = await request(app)
      .get('/api/endpoint')
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      data: mockData,
      metadata: expect.any(Object),
    });
  });
});
```

### E2E Test Pattern
```typescript
describe('Complete Workflow E2E Tests', () => {
  it('should complete full workflow', async () => {
    // Step 1: Initial state
    const initialResponse = await request(app)
      .get('/api/initial')
      .expect(200);

    // Step 2: Perform action
    const actionResponse = await request(app)
      .post('/api/action')
      .send(actionData)
      .expect(201);

    // Step 3: Verify final state
    const finalResponse = await request(app)
      .get('/api/final')
      .expect(200);

    // Assert workflow completion
    expect(finalResponse.body.data.completed).toBe(true);
  });
});
```

## Mocking Strategy

### Service Dependencies
- Database connections are mocked to avoid external dependencies
- External APIs are mocked for consistent test results
- File system operations are mocked for isolation

### Middleware Mocking
- Rate limiting middleware is mocked to avoid delays
- Caching middleware is mocked for predictable behavior
- Authentication middleware is mocked for controlled access

### Error Simulation
- Network failures are simulated through rejected promises
- Database errors are simulated through mock implementations
- Validation errors are tested with invalid inputs

## Test Data Management

### Test Fixtures
- Consistent test data across all test files
- Realistic wallet addresses and signatures
- Valid and invalid input scenarios

### Data Isolation
- Each test starts with a clean state
- Mocks are reset between tests
- No shared state between test cases

## Continuous Integration

### GitHub Actions Integration
```yaml
- name: Run Marketplace API Tests
  run: |
    cd app/backend
    npm run test:marketplace-api
```

### Coverage Requirements
- Minimum 80% code coverage for service layer
- 100% coverage for critical authentication flows
- All error handling paths must be tested

## Debugging Tests

### Common Issues
1. **Mock not working**: Ensure mock is properly configured before test execution
2. **Async timing**: Use proper async/await patterns and jest timers
3. **Database connections**: Verify all database mocks are in place

### Debug Commands
```bash
# Run tests with debug output
DEBUG=* npm run test:marketplace-api

# Run single test with verbose output
npx jest --testNamePattern="specific test name" --verbose

# Run tests with coverage report
npm run test:marketplace-api -- --coverage --coverageReporters=html
```

## Contributing

When adding new tests:

1. Follow the established naming conventions
2. Include both success and error scenarios
3. Test edge cases and boundary conditions
4. Update this README if adding new test categories
5. Ensure tests are deterministic and isolated

## Performance Considerations

- Tests should complete within reasonable time limits
- Use mocks to avoid external service calls
- Parallel test execution is supported
- Memory usage is monitored during test runs

## Security Testing

The test suite includes security-focused tests for:
- Input validation and sanitization
- Authentication and authorization
- Rate limiting and abuse prevention
- Error message information disclosure
- Session management security