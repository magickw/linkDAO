import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { safeLogger } from '../utils/safeLogger';

/**
 * Security Test Setup
 * Configures the test environment for security and compliance testing
 */

// Global test configuration
beforeAll(async () => {
  safeLogger.info('🔒 Setting up security test environment...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
  process.env.SECURITY_TEST_MODE = 'true';
  
  // Initialize test database if needed
  // await initializeTestDatabase();
  
  // Setup test data
  // await seedSecurityTestData();
  
  safeLogger.info('✅ Security test environment ready');
});

afterAll(async () => {
  safeLogger.info('🧹 Cleaning up security test environment...');
  
  // Cleanup test data
  // await cleanupTestDatabase();
  
  // Reset environment variables
  delete process.env.SECURITY_TEST_MODE;
  
  safeLogger.info('✅ Security test cleanup complete');
});

beforeEach(async () => {
  // Reset state before each test
  // This ensures test isolation
});

afterEach(async () => {
  // Cleanup after each test
  // This prevents test interference
});

// Mock external security services for testing
jest.mock('../services/vendors/openaiModerationService', () => ({
  moderateContent: jest.fn().mockResolvedValue({
    flagged: false,
    categories: [],
    confidence: 0.1
  })
}));

jest.mock('../services/vendors/perspectiveApiService', () => ({
  analyzeComment: jest.fn().mockResolvedValue({
    toxicity: 0.1,
    severe_toxicity: 0.05,
    identity_attack: 0.02
  })
}));

// Mock external compliance services
jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
}));

// Security test utilities
export const SecurityTestUtils = {
  /**
   * Create test user with specific risk profile
   */
  createTestUser: (riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') => {
    const baseUser = {
      id: `test-user-${Date.now()}`,
      email: `test-${Date.now()}@example.com`,
      created_at: new Date()
    };

    switch (riskLevel) {
      case 'HIGH':
        return {
          ...baseUser,
          nationality: 'XX', // High-risk country
          previous_violations: 2
        };
      case 'CRITICAL':
        return {
          ...baseUser,
          name: 'John Criminal', // Triggers sanctions screening
          nationality: 'XX'
        };
      default:
        return baseUser;
    }
  },

  /**
   * Create test transaction
   */
  createTestTransaction: (amount: number, suspicious: boolean = false) => ({
    id: `test-tx-${Date.now()}`,
    user_id: 'test-user',
    transaction_type: 'PURCHASE' as const,
    amount,
    currency: 'USD',
    timestamp: new Date(),
    status: 'COMPLETED' as const,
    metadata: {
      ip_address: suspicious ? '192.168.1.999' : '192.168.1.1',
      suspicious_indicators: suspicious ? ['UNUSUAL_PATTERN'] : []
    }
  }),

  /**
   * Create test KYC document
   */
  createTestKYCDocument: (documentType: string, authentic: boolean = true) => ({
    id: `test-doc-${Date.now()}`,
    user_id: 'test-user',
    document_type: documentType,
    file_path: `/test/${documentType.toLowerCase()}.jpg`,
    file_hash: authentic ? 'authentic-hash' : 'suspicious-hash',
    upload_timestamp: new Date(),
    verification_status: 'PENDING' as const,
    metadata: {
      file_size: 1024000,
      mime_type: 'image/jpeg',
      original_filename: `${documentType.toLowerCase()}.jpg`,
      authenticity_score: authentic ? 0.95 : 0.3
    }
  }),

  /**
   * Wait for async operations to complete
   */
  waitForAsyncOperations: (ms: number = 100) => 
    new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Generate test data for compliance reporting
   */
  generateComplianceTestData: () => ({
    reporting_period: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date()
    },
    transactions: Array.from({ length: 100 }, (_, i) => ({
      id: `compliance-tx-${i}`,
      amount: Math.random() * 10000,
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
    })),
    users: Array.from({ length: 50 }, (_, i) => ({
      id: `compliance-user-${i}`,
      verification_level: ['NONE', 'BASIC', 'ENHANCED'][Math.floor(Math.random() * 3)]
    }))
  })
};

// Export for use in tests
global.SecurityTestUtils = SecurityTestUtils;