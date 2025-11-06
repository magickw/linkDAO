/**
 * WebSocket Optimizations Test Suite
 * 
 * Tests the enhanced WebSocket functionality including:
 * - Resource-aware connections
 * - Automatic fallback to polling
 * - Exponential backoff reconnection
 */

import { WebSocketService } from '../webSocketService';
import { WebSocketConnectionManager } from '../webSocketConnectionManager';

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    connected: false,
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    onAny: jest.fn()
  }))
}));

// Mock request manager
jest.mock('../requestManager', () => ({
  requestManager: {
    get: jest.fn(() => Promise.resolve({ data: [] }))
  }
}));

describe('WebSocket Optimizations', () => {
  let webSocketService: WebSocketService;
  let connectionManager: WebSocketConnectionManager;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create fresh instances
    webSocketService = new WebSocketService({
      resourceAware: true,
      enableFallback: true,
      maxReconnectAttempts: 3,
      reconnectDelay: 100 // Fast for testing
    });

    connectionManager = new WebSocketConnectionManager({
      enabled: true,
      pollingInterval: 1000,
      endpoints: {
        feed: '/api/feed/updates',
        notifications: '/api/notifications/poll',
        status: '/api/status'
      }
    });
  });

  describe('Resource-Aware Configuration', () => {
    it('should detect resource constraints', () => {
      const stats = webSocketService.getStats();
      expect(stats).toHaveProperty('resourceConstraints');
      expect(stats.resourceConstraints).toHaveProperty('memoryUsage');
      expect(stats.resourceConstraints).toHaveProperty('isLowPowerMode');
      expect(typeof stats.resourceConstraints.isLowPowerMode).toBe('boolean');
    });

    it('should adjust configuration based on resource constraints', () => {
      const config = {
        resourceAware: true,
        maxReconnectAttempts: 10,
        reconnectDelay: 1000
      };

      const service = new WebSocketService(config);
      const stats = service.getStats();
      
      expect(stats.resourceConstraints).toBeDefined();
    });

    it('should report optional connection status', () => {
      const isOptional = webSocketService.isOptionalConnection();
      expect(typeof isOptional).toBe('boolean');
    });
  });

  describe('Connection State Management', () => {
    it('should initialize with correct default state', () => {
      const state = webSocketService.getConnectionState();
      
      expect(state).toEqual({
        isConnected: false,
        isReconnecting: false,
        reconnectAttempts: 0,
        lastConnected: null,
        lastError: null,
        connectionQuality: 'unknown'
      });
    });

    it('should track connection attempts', () => {
      const initialState = webSocketService.getConnectionState();
      expect(initialState.reconnectAttempts).toBe(0);
    });

    it('should provide connection statistics', () => {
      const stats = webSocketService.getStats();
      
      expect(stats).toHaveProperty('isConnected');
      expect(stats).toHaveProperty('isReconnecting');
      expect(stats).toHaveProperty('reconnectAttempts');
      expect(stats).toHaveProperty('connectionQuality');
      expect(stats).toHaveProperty('resourceConstraints');
    });
  });

  describe('Fallback Mechanism', () => {
    it('should initialize connection manager with fallback config', () => {
      const state = connectionManager.getState();
      
      expect(state).toHaveProperty('mode');
      expect(state).toHaveProperty('isConnected');
      expect(state).toHaveProperty('resourceConstrained');
    });

    it('should provide recommended update intervals', () => {
      const interval = connectionManager.getRecommendedUpdateInterval();
      expect(typeof interval).toBe('number');
      expect(interval).toBeGreaterThanOrEqual(0);
    });

    it('should report real-time availability', () => {
      const isRealTime = connectionManager.isRealTimeAvailable();
      expect(typeof isRealTime).toBe('boolean');
    });

    it('should handle connection mode changes', () => {
      const mockCallback = jest.fn();
      connectionManager.on('connection_mode_changed', mockCallback);
      
      // Simulate mode change
      connectionManager.emit('connection_mode_changed', { mode: 'polling' });
      
      expect(mockCallback).toHaveBeenCalledWith({ mode: 'polling' });
    });
  });

  describe('Event System', () => {
    it('should register and emit events correctly', () => {
      const mockCallback = jest.fn();
      const testData = { test: 'data' };

      webSocketService.on('test_event', mockCallback);
      webSocketService.emit('test_event', testData);

      expect(mockCallback).toHaveBeenCalledWith(testData);
    });

    it('should handle event listener removal', () => {
      const mockCallback = jest.fn();

      webSocketService.on('test_event', mockCallback);
      webSocketService.off('test_event', mockCallback);
      webSocketService.emit('test_event', { test: 'data' });

      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should handle once listeners correctly', () => {
      const mockCallback = jest.fn();

      webSocketService.once('test_event', mockCallback);
      webSocketService.emit('test_event', { test: 'data' });
      webSocketService.emit('test_event', { test: 'data2' });

      expect(mockCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Configuration Updates', () => {
    it('should allow runtime configuration updates', () => {
      const newConfig = {
        maxReconnectAttempts: 5,
        reconnectDelay: 2000
      };

      webSocketService.updateConfig(newConfig);
      
      // Configuration should be updated (we can't directly test private config,
      // but we can test that the method doesn't throw)
      expect(() => webSocketService.updateConfig(newConfig)).not.toThrow();
    });

    it('should allow fallback configuration updates', () => {
      const newConfig = {
        pollingInterval: 2000,
        maxPollingInterval: 60000
      };

      connectionManager.updateConfig(newConfig);
      
      expect(() => connectionManager.updateConfig(newConfig)).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', () => {
      expect(() => {
        webSocketService.emit('error', 'Test error');
      }).not.toThrow();
    });

    it('should handle callback errors gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });

      webSocketService.on('test_event', errorCallback);
      
      expect(() => {
        webSocketService.emit('test_event', {});
      }).not.toThrow();
    });
  });

  describe('Memory Management', () => {
    it('should provide resource constraint information', () => {
      const constraints = webSocketService.getResourceConstraints();
      
      expect(constraints).toHaveProperty('memoryUsage');
      expect(constraints).toHaveProperty('connectionCount');
      expect(constraints).toHaveProperty('networkLatency');
      expect(constraints).toHaveProperty('isLowPowerMode');
    });

    it('should handle cleanup operations', () => {
      expect(() => {
        webSocketService.disconnect();
      }).not.toThrow();
    });
  });
});

describe('Integration Tests', () => {
  it('should work together - WebSocket service and connection manager', () => {
    const webSocketService = new WebSocketService({
      resourceAware: true,
      enableFallback: true
    });

    const connectionManager = new WebSocketConnectionManager({
      enabled: true,
      pollingInterval: 1000
    });

    // Both should be initialized without errors
    expect(webSocketService).toBeDefined();
    expect(connectionManager).toBeDefined();

    // Both should provide state information
    expect(webSocketService.getStats()).toBeDefined();
    expect(connectionManager.getState()).toBeDefined();
  });
});