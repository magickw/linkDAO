import {
  isExtensionError,
  suppressExtensionError,
  createExtensionSafeErrorHandler,
  createExtensionSafeRejectionHandler,
  withExtensionErrorSuppression,
  safeWalletOperation
} from '../extensionErrorHandler';

describe('extensionErrorHandler', () => {
  describe('isExtensionError', () => {
    it('should detect chrome.runtime.sendMessage errors', () => {
      const error = new Error('chrome.runtime.sendMessage() called from a webpage must specify an Extension ID');
      expect(isExtensionError(error)).toBe(true);
    });

    it('should detect extension ID errors', () => {
      const error = new Error('Extension ID is required');
      expect(isExtensionError(error)).toBe(true);
    });

    it('should detect chrome-extension:// URLs', () => {
      const error = {
        message: 'Script error',
        source: 'chrome-extension://opfgelmcmbiajamepnmloijbpoleiama/inpage.js'
      };
      expect(isExtensionError(error)).toBe(true);
    });

    it('should detect MetaMask-related errors', () => {
      const error = new Error('MetaMask provider error');
      expect(isExtensionError(error)).toBe(true);
    });

    it('should not detect regular application errors', () => {
      const error = new Error('Regular application error');
      expect(isExtensionError(error)).toBe(false);
    });

    it('should handle string errors', () => {
      expect(isExtensionError('chrome.runtime.sendMessage error')).toBe(true);
      expect(isExtensionError('regular error')).toBe(false);
    });
  });

  describe('suppressExtensionError', () => {
    it('should suppress extension errors and return true', () => {
      const error = new Error('chrome.runtime.sendMessage error');
      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();
      
      const result = suppressExtensionError(error);
      
      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('Suppressed extension error:', error);
      
      consoleSpy.mockRestore();
    });

    it('should not suppress regular errors and return false', () => {
      const error = new Error('regular error');
      const result = suppressExtensionError(error);
      expect(result).toBe(false);
    });
  });

  describe('createExtensionSafeErrorHandler', () => {
    it('should prevent default for extension errors', () => {
      const handler = createExtensionSafeErrorHandler();
      const mockEvent = {
        message: 'chrome.runtime.sendMessage error',
        filename: '',
        error: { stack: '' },
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      } as any;

      const result = handler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should call original handler for non-extension errors', () => {
      const originalHandler = jest.fn();
      const handler = createExtensionSafeErrorHandler(originalHandler);
      const mockEvent = {
        message: 'regular error',
        filename: '',
        error: { stack: '' },
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      } as any;

      handler(mockEvent);

      expect(originalHandler).toHaveBeenCalledWith(mockEvent);
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('withExtensionErrorSuppression', () => {
    it('should suppress extension errors in sync functions', () => {
      const fn = jest.fn(() => {
        throw new Error('chrome.runtime.sendMessage error');
      });
      
      const wrappedFn = withExtensionErrorSuppression(fn);
      const result = wrappedFn();
      
      expect(result).toBeUndefined();
      expect(fn).toHaveBeenCalled();
    });

    it('should re-throw non-extension errors in sync functions', () => {
      const fn = jest.fn(() => {
        throw new Error('regular error');
      });
      
      const wrappedFn = withExtensionErrorSuppression(fn);
      
      expect(() => wrappedFn()).toThrow('regular error');
    });

    it('should suppress extension errors in async functions', async () => {
      const fn = jest.fn(async () => {
        throw new Error('chrome.runtime.sendMessage error');
      });
      
      const wrappedFn = withExtensionErrorSuppression(fn);
      const result = await wrappedFn();
      
      expect(result).toBeUndefined();
      expect(fn).toHaveBeenCalled();
    });
  });

  describe('safeWalletOperation', () => {
    it('should return result for successful operations', async () => {
      const operation = jest.fn(async () => 'success');
      const result = await safeWalletOperation(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should return fallback for extension errors', async () => {
      const operation = jest.fn(async () => {
        throw new Error('chrome.runtime.sendMessage error');
      });
      
      const result = await safeWalletOperation(operation, 'fallback');
      
      expect(result).toBe('fallback');
    });

    it('should re-throw non-extension errors', async () => {
      const operation = jest.fn(async () => {
        throw new Error('regular error');
      });
      
      await expect(safeWalletOperation(operation)).rejects.toThrow('regular error');
    });
  });
});