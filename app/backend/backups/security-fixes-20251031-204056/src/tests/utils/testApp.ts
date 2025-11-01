import express, { Express } from 'express';
import { safeLogger } from '../utils/safeLogger';
import cors from 'cors';
import { safeLogger } from '../utils/safeLogger';
import { jest } from '@jest/globals';
import { safeLogger } from '../utils/safeLogger';

// Import middleware
import { globalErrorHandler } from '../../middleware/globalErrorHandler';
import { safeLogger } from '../utils/safeLogger';
import { requestLogging } from '../../middleware/requestLogging';
import { safeLogger } from '../utils/safeLogger';
import { enhancedRateLimiting } from '../../middleware/enhancedRateLimiting';
import { safeLogger } from '../utils/safeLogger';
import { enhancedCorsMiddleware } from '../../middleware/enhancedCorsMiddleware';
import { safeLogger } from '../utils/safeLogger';

// Import routes
import { sellerRoutes } from '../../routes/sellerRoutes';
import { safeLogger } from '../utils/safeLogger';
import { sellerProfileRoutes } from '../../routes/sellerProfileRoutes';
import { safeLogger } from '../utils/safeLogger';
import { sellerAnalyticsRoutes } from '../../routes/sellerAnalyticsRoutes';
import { safeLogger } from '../utils/safeLogger';
import { sellerSecurityRoutes } from '../../routes/sellerSecurityRoutes';
import { safeLogger } from '../utils/safeLogger';
import { automatedTierUpgradeRoutes } from '../../routes/automatedTierUpgradeRoutes';
import { safeLogger } from '../utils/safeLogger';
import { healthRoutes } from '../../routes/healthRoutes';
import { safeLogger } from '../utils/safeLogger';
import { monitoringRoutes } from '../../routes/monitoringRoutes';
import { safeLogger } from '../utils/safeLogger';

// Import services for mocking
import { sellerService } from '../../services/sellerService';
import { safeLogger } from '../utils/safeLogger';
import { sellerCacheManager } from '../../services/sellerCacheManager';
import { safeLogger } from '../utils/safeLogger';
import { sellerWebSocketService } from '../../services/sellerWebSocketService';
import { safeLogger } from '../utils/safeLogger';

export async function createTestApp(): Promise<Express> {
  const app = express();

  // Basic middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // CORS middleware
  app.use(enhancedCorsMiddleware);

  // Request logging (in test mode)
  app.use(requestLogging);

  // Rate limiting (relaxed for tests)
  app.use(enhancedRateLimiting);

  // Health check routes (always available)
  app.use('/api/health', healthRoutes);
  app.use('/api/monitoring', monitoringRoutes);

  // Seller-related routes
  app.use('/api/marketplace/seller', sellerRoutes);
  app.use('/api/marketplace/seller', sellerProfileRoutes);
  app.use('/api/marketplace/seller', sellerAnalyticsRoutes);
  app.use('/api/marketplace/seller', sellerSecurityRoutes);
  app.use('/api/marketplace/seller', automatedTierUpgradeRoutes);

  // Error handling middleware (must be last)
  app.use(globalErrorHandler);

  return app;
}

export function mockSellerServices() {
  // Mock seller service methods
  jest.spyOn(sellerService, 'createSellerProfile').mockImplementation(async (profileData) => {
    return {
      walletAddress: profileData.walletAddress,
      displayName: profileData.displayName,
      storeName: profileData.storeName,
      bio: profileData.bio,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  jest.spyOn(sellerService, 'getSellerProfile').mockImplementation(async (walletAddress) => {
    if (walletAddress === '0x9999999999999999999999999999999999999999') {
      return null; // Simulate not found
    }
    return {
      walletAddress,
      displayName: 'Test Seller',
      storeName: 'Test Store',
      bio: 'Test bio',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    };
  });

  jest.spyOn(sellerService, 'updateSellerProfile').mockImplementation(async (walletAddress, updates) => {
    return {
      walletAddress,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
  });

  jest.spyOn(sellerService, 'getOnboardingSteps').mockImplementation(async (walletAddress) => {
    return [
      { id: 'profile', title: 'Profile Setup', completed: true },
      { id: 'verification', title: 'Verification', completed: false },
      { id: 'payout', title: 'Payout Setup', completed: false },
      { id: 'first-listing', title: 'First Listing', completed: false },
    ];
  });

  jest.spyOn(sellerService, 'getDashboardStats').mockImplementation(async (walletAddress) => {
    return {
      profile: {
        walletAddress,
        displayName: 'Test Seller',
        storeName: 'Test Store',
        bio: 'Test bio',
      },
      listings: [],
      stats: {
        totalSales: 0,
        totalRevenue: 0,
        pendingOrders: 0,
        completedOrders: 0,
        averageRating: 0,
        totalViews: 0,
      },
      notifications: [],
    };
  });

  jest.spyOn(sellerService, 'getListings').mockImplementation(async (walletAddress) => {
    return [];
  });

  // Mock cache manager
  jest.spyOn(sellerCacheManager, 'invalidateSellerCache').mockImplementation(async (walletAddress) => {
    // Simulate cache invalidation
    return Promise.resolve();
  });

  jest.spyOn(sellerCacheManager, 'clearAll').mockImplementation(async () => {
    return Promise.resolve();
  });

  // Mock WebSocket service
  jest.spyOn(sellerWebSocketService, 'addConnection').mockImplementation((walletAddress, ws) => {
    // Simulate WebSocket connection management
  });

  jest.spyOn(sellerWebSocketService, 'removeConnection').mockImplementation((walletAddress) => {
    // Simulate WebSocket disconnection
  });

  jest.spyOn(sellerWebSocketService, 'broadcast').mockImplementation((walletAddress, message) => {
    // Simulate WebSocket broadcast
  });

  jest.spyOn(sellerWebSocketService, 'getActiveConnections').mockImplementation(() => {
    return 0;
  });
}

export function resetSellerServiceMocks() {
  jest.restoreAllMocks();
}

// Test data factories
export function createTestSellerProfile(overrides: any = {}) {
  return {
    walletAddress: '0x1234567890123456789012345678901234567890',
    displayName: 'Test Seller',
    storeName: 'Test Store',
    bio: 'Test seller bio',
    profileImageUrl: null,
    coverImageUrl: null,
    tier: {
      id: 'bronze',
      name: 'Bronze',
      level: 1,
    },
    stats: {
      totalSales: 0,
      totalListings: 0,
      rating: 0,
    },
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createTestSellerListing(overrides: any = {}) {
  return {
    id: 'test-listing-1',
    sellerId: '0x1234567890123456789012345678901234567890',
    title: 'Test Product',
    description: 'Test product description',
    price: 100,
    currency: 'USD',
    images: [],
    category: 'Electronics',
    status: 'active',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createTestDashboardData(overrides: any = {}) {
  const profile = createTestSellerProfile();
  return {
    profile,
    listings: [],
    stats: {
      totalSales: 0,
      totalRevenue: 0,
      pendingOrders: 0,
      completedOrders: 0,
      averageRating: 0,
      totalViews: 0,
    },
    notifications: [],
    ...overrides,
  };
}

// Performance testing utilities
export function simulateHighLoad(requestCount: number = 100) {
  return Array.from({ length: requestCount }, (_, i) => ({
    id: i,
    timestamp: Date.now() + i,
  }));
}

export function measureResponseTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = Date.now();
  return fn().then(result => ({
    result,
    duration: Date.now() - start,
  }));
}

// Error simulation utilities
export function simulateServiceFailure(service: any, method: string, errorMessage: string) {
  const originalMethod = service[method];
  service[method] = jest.fn().mockRejectedValue(new Error(errorMessage));
  
  return () => {
    service[method] = originalMethod;
  };
}

export function simulateIntermittentFailure(service: any, method: string, failureRate: number = 0.5) {
  const originalMethod = service[method];
  service[method] = jest.fn().mockImplementation((...args) => {
    if (Math.random() < failureRate) {
      return Promise.reject(new Error('Intermittent service failure'));
    }
    return originalMethod.apply(service, args);
  });
  
  return () => {
    service[method] = originalMethod;
  };
}

// Memory and resource monitoring
export function getMemoryUsage() {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage();
  }
  return {
    rss: 0,
    heapTotal: 0,
    heapUsed: 0,
    external: 0,
    arrayBuffers: 0,
  };
}

export function trackMemoryUsage(testName: string) {
  const initialMemory = getMemoryUsage();
  
  return {
    getMemoryDelta: () => {
      const currentMemory = getMemoryUsage();
      return {
        rss: currentMemory.rss - initialMemory.rss,
        heapTotal: currentMemory.heapTotal - initialMemory.heapTotal,
        heapUsed: currentMemory.heapUsed - initialMemory.heapUsed,
        external: currentMemory.external - initialMemory.external,
        arrayBuffers: currentMemory.arrayBuffers - initialMemory.arrayBuffers,
      };
    },
    logMemoryUsage: () => {
      const delta = trackMemoryUsage(testName).getMemoryDelta();
      safeLogger.info(`[${testName}] Memory Delta:`, delta);
    },
  };
}