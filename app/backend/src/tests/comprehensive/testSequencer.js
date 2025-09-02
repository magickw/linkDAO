/**
 * Test Sequencer for Comprehensive Tests
 * 
 * Ensures tests run in the correct order for dependencies and optimal performance
 */

const Sequencer = require('@jest/test-sequencer').default;

class ComprehensiveTestSequencer extends Sequencer {
  sort(tests) {
    // Define test execution order based on dependencies and performance
    const testOrder = [
      // 1. Environment and setup tests first
      'setup.test',
      'testEnvironment.test',
      
      // 2. Database tests (foundation)
      'databaseTests.test',
      'databaseConnection.test',
      'databaseModels.test',
      
      // 3. Smart contract tests (core functionality)
      'smartContractTests.test',
      'escrow.test',
      'reputation.test',
      'nft.test',
      'governance.test',
      'token.test',
      
      // 4. Backend API tests
      'apiIntegrationTests.test',
      'authController.test',
      'productController.test',
      'orderController.test',
      'userController.test',
      'paymentController.test',
      'reviewController.test',
      
      // 5. Security tests
      'securityTests.test',
      'authentication.test',
      'authorization.test',
      'inputValidation.test',
      
      // 6. Performance tests (resource intensive)
      'performanceTests.test',
      'loadTesting.test',
      'stressTesting.test',
      
      // 7. End-to-end tests (most comprehensive)
      'endToEndTests.test',
      'purchaseWorkflow.test',
      'sellerOnboarding.test',
      'disputeResolution.test',
      'nftTrading.test',
      'governance.test',
      
      // 8. Integration tests last
      'integration.test',
      'fullSystem.test'
    ];

    // Sort tests based on the defined order
    const sortedTests = tests.sort((testA, testB) => {
      const getTestPriority = (testPath) => {
        const testName = testPath.split('/').pop() || '';
        
        // Find matching pattern in testOrder
        for (let i = 0; i < testOrder.length; i++) {
          if (testName.includes(testOrder[i])) {
            return i;
          }
        }
        
        // Default priority for unmatched tests
        return testOrder.length;
      };

      const priorityA = getTestPriority(testA.path);
      const priorityB = getTestPriority(testB.path);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Secondary sort by test size (smaller tests first)
      const sizeA = testA.duration || 0;
      const sizeB = testB.duration || 0;
      
      if (sizeA !== sizeB) {
        return sizeA - sizeB;
      }

      // Tertiary sort alphabetically
      return testA.path.localeCompare(testB.path);
    });

    // Log test execution order for debugging
    if (process.env.DEBUG_TEST_ORDER === 'true') {
      console.log('Test execution order:');
      sortedTests.forEach((test, index) => {
        console.log(`${index + 1}. ${test.path}`);
      });
    }

    return sortedTests;
  }

  allFailedTests(tests) {
    // Run failed tests first in subsequent runs
    const failedTests = tests.filter(test => test.numFailingTests > 0);
    const passedTests = tests.filter(test => test.numFailingTests === 0);
    
    return [...failedTests, ...passedTests];
  }
}

module.exports = ComprehensiveTestSequencer;