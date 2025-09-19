import { Request, Response } from 'express';
import { 
  ENSValidationError, 
  ImageUploadError, 
  PaymentValidationError,
  InsufficientBalanceError,
  getErrorRecovery,
  ErrorMonitoringService
} from '../middleware/marketplaceErrorHandler';
import { ErrorLoggingService } from '../services/errorLoggingService';

describe('Marketplace Error Handling', () => {
  beforeEach(() => {
    // Clear error logs before each test
    (ErrorLoggingService as any).logs = [];
  });

  describe('Error Types', () => {
    it('should create ENS validation error with correct properties', () => {
      const error = new ENSValidationError('Invalid ENS format', { ensName: 'invalid.eth' });
      
      expect(error.message).toBe('Invalid ENS format');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('ENS_VALIDATION_ERROR');
      expect(error.details).toEqual({ ensName: 'invalid.eth' });
    });

    it('should create image upload error with correct properties', () => {
      const error = new ImageUploadError('File too large', { maxSize: '10MB' });
      
      expect(error.message).toBe('File too large');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('IMAGE_UPLOAD_ERROR');
      expect(error.details).toEqual({ maxSize: '10MB' });
    });

    it('should create payment validation error with correct properties', () => {
      const error = new PaymentValidationError('Invalid payment method');
      
      expect(error.message).toBe('Invalid payment method');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('PAYMENT_VALIDATION_ERROR');
    });

    it('should create insufficient balance error with correct properties', () => {
      const error = new InsufficientBalanceError();
      
      expect(error.message).toBe('Insufficient balance for transaction');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('INSUFFICIENT_BALANCE');
    });
  });

  describe('Error Recovery', () => {
    it('should provide recovery suggestions for ENS validation error', () => {
      const error = new ENSValidationError('Invalid ENS format');
      const recovery = getErrorRecovery(error);

      expect(recovery.canRetry).toBe(true);
      expect(recovery.suggestedActions).toContain('Check ENS name format (e.g., "yourname.eth")');
      expect(recovery.alternativeOptions).toBeDefined();
      expect(recovery.helpUrl).toBe('/help/ens-setup');
    });

    it('should provide recovery suggestions for image upload error', () => {
      const error = new ImageUploadError('File too large');
      const recovery = getErrorRecovery(error);

      expect(recovery.canRetry).toBe(true);
      expect(recovery.suggestedActions).toContain('Check file size (max 10MB)');
      expect(recovery.alternativeOptions).toBeDefined();
      expect(recovery.helpUrl).toBe('/help/image-upload');
    });

    it('should provide recovery suggestions for insufficient balance error', () => {
      const error = new InsufficientBalanceError();
      const recovery = getErrorRecovery(error);

      expect(recovery.canRetry).toBe(false);
      expect(recovery.suggestedActions).toContain('Add funds to your wallet');
      expect(recovery.alternativeOptions).toBeDefined();
      expect(recovery.helpUrl).toBe('/help/insufficient-balance');
    });

    it('should provide default recovery for unknown error', () => {
      const error = new Error('Unknown error') as any;
      error.code = 'UNKNOWN_ERROR';
      const recovery = getErrorRecovery(error);

      expect(recovery.canRetry).toBe(true);
      expect(recovery.suggestedActions).toContain('Try the action again');
      expect(recovery.helpUrl).toBe('/help/general-troubleshooting');
    });
  });

  describe('Error Logging Service', () => {
    it('should log error with context', () => {
      const error = new ENSValidationError('Invalid ENS format');
      const mockReq = {
        method: 'POST',
        originalUrl: '/api/ens/validate',
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('Mozilla/5.0'),
        headers: { 'x-request-id': 'test-123' }
      } as any;

      const errorId = ErrorLoggingService.logError(error, mockReq);

      expect(errorId).toMatch(/^err_\d+_[a-z0-9]+$/);
      
      const stats = ErrorLoggingService.getErrorStats();
      expect(stats.totalErrors).toBe(1);
      expect(stats.errorsByCode['ENS_VALIDATION_ERROR']).toBe(1);
    });

    it('should search errors by criteria', () => {
      const error1 = new ENSValidationError('Invalid ENS format');
      const error2 = new ImageUploadError('File too large');
      
      ErrorLoggingService.logError(error1);
      ErrorLoggingService.logError(error2);

      const ensErrors = ErrorLoggingService.searchErrors({ code: 'ENS_VALIDATION_ERROR' });
      const imageErrors = ErrorLoggingService.searchErrors({ code: 'IMAGE_UPLOAD_ERROR' });

      expect(ensErrors).toHaveLength(1);
      expect(imageErrors).toHaveLength(1);
      expect(ensErrors[0].code).toBe('ENS_VALIDATION_ERROR');
      expect(imageErrors[0].code).toBe('IMAGE_UPLOAD_ERROR');
    });

    it('should resolve errors', () => {
      const error = new ENSValidationError('Invalid ENS format');
      const errorId = ErrorLoggingService.logError(error);

      const resolved = ErrorLoggingService.resolveError(errorId, 'admin');
      expect(resolved).toBe(true);

      const errors = ErrorLoggingService.searchErrors({ resolved: true });
      expect(errors).toHaveLength(1);
      expect(errors[0].resolved).toBe(true);
      expect(errors[0].resolvedBy).toBe('admin');
    });

    it('should export logs in JSON format', () => {
      const error = new ENSValidationError('Invalid ENS format');
      ErrorLoggingService.logError(error);

      const exportData = ErrorLoggingService.exportLogs('json');
      const logs = JSON.parse(exportData);

      expect(Array.isArray(logs)).toBe(true);
      expect(logs).toHaveLength(1);
      expect(logs[0].code).toBe('ENS_VALIDATION_ERROR');
    });

    it('should export logs in CSV format', () => {
      const error = new ENSValidationError('Invalid ENS format');
      ErrorLoggingService.logError(error);

      const exportData = ErrorLoggingService.exportLogs('csv');
      const lines = exportData.split('\n');

      expect(lines[0]).toContain('ID,Timestamp,Level,Code,Message');
      expect(lines[1]).toContain('ENS_VALIDATION_ERROR');
    });

    it('should get health status', () => {
      const health = ErrorLoggingService.getHealthStatus();

      expect(health.status).toBe('healthy');
      expect(health.metrics).toHaveProperty('totalLogs');
      expect(health.metrics).toHaveProperty('errorRate');
      expect(health.metrics).toHaveProperty('criticalErrors');
      expect(health.metrics).toHaveProperty('unresolvedErrors');
    });
  });

  describe('Error Monitoring Service', () => {
    it('should log error with severity classification', () => {
      const criticalError = new Error('Database connection failed') as any;
      criticalError.statusCode = 500;
      criticalError.code = 'DATABASE_ERROR';

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      ErrorMonitoringService.logError(criticalError);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚨 CRITICAL ERROR:'),
        expect.any(String)
      );

      consoleSpy.mockRestore();
    });

    it('should track error frequency', () => {
      const error = new ENSValidationError('Invalid ENS format');
      
      // Log the same error multiple times
      for (let i = 0; i < 5; i++) {
        ErrorMonitoringService.logError(error);
      }

      const stats = ErrorMonitoringService.getErrorStats();
      expect(stats.totalErrors).toBe(5);
    });

    it('should get error statistics', () => {
      const error1 = new ENSValidationError('Invalid ENS format');
      const error2 = new ImageUploadError('File too large');
      
      ErrorMonitoringService.logError(error1);
      ErrorMonitoringService.logError(error2);

      const stats = ErrorMonitoringService.getErrorStats();
      
      expect(stats.totalErrors).toBe(2);
      expect(stats.errorBreakdown).toHaveProperty('ENS_VALIDATION_ERROR_400');
      expect(stats.errorBreakdown).toHaveProperty('IMAGE_UPLOAD_ERROR_400');
    });
  });

  describe('Graceful Degradation', () => {
    it('should handle service degradation gracefully', () => {
      const mockReq = {} as Request;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any;
      const mockNext = jest.fn();

      const { gracefulDegradationHandler } = require('../middleware/marketplaceErrorHandler');
      const handler = gracefulDegradationHandler('ENS', { fallbackData: 'ENS service unavailable' });

      const error = new Error('ENS service timeout');
      handler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          warning: expect.objectContaining({
            code: 'SERVICE_DEGRADED',
            message: expect.stringContaining('ENS is temporarily unavailable')
          })
        })
      );
    });
  });
});