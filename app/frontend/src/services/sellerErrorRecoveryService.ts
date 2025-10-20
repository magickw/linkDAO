import { 
  SellerError, 
  SellerErrorType, 
  ErrorRecoveryStrategy, 
  RecoveryAction, 
  RetryConfig 
} from '../types/sellerError';

/**
 * Service for handling seller error recovery strategies
 */
export class SellerErrorRecoveryService {
  private static instance: SellerErrorRecoveryService;
  private errorTrackingService?: any; // Will be injected
  private cacheService?: any; // Will be injected

  private constructor() {}

  static getInstance(): SellerErrorRecoveryService {
    if (!SellerErrorRecoveryService.instance) {
      SellerErrorRecoveryService.instance = new SellerErrorRecoveryService();
    }
    return SellerErrorRecoveryService.instance;
  }

  /**
   * Set external services for error recovery
   */
  setServices(errorTrackingService?: any, cacheService?: any) {
    this.errorTrackingService = errorTrackingService;
    this.cacheService = cacheService;
  }

  /**
   * Handle error and return recovery strategy
   */
  async handleError(error: SellerError, context: string): Promise<ErrorRecoveryStrategy> {
    // Report error if needed
    if (error.shouldReport() && this.errorTrackingService) {
      this.errorTrackingService.reportError(error, { context });
    }

    switch (error.type) {
      case SellerErrorType.API_ERROR:
        return this.handleAPIError(error, context);
      case SellerErrorType.CACHE_ERROR:
        return this.handleCacheError(error, context);
      case SellerErrorType.NETWORK_ERROR:
        return this.handleNetworkError(error, context);
      case SellerErrorType.VALIDATION_ERROR:
        return this.handleValidationError(error, context);
      case SellerErrorType.PERMISSION_ERROR:
        return this.handlePermissionError(error, context);
      case SellerErrorType.IMAGE_UPLOAD_ERROR:
        return this.handleImageUploadError(error, context);
      case SellerErrorType.TIER_VALIDATION_ERROR:
        return this.handleTierValidationError(error, context);
      case SellerErrorType.DATA_SYNC_ERROR:
        return this.handleDataSyncError(error, context);
      default:
        return this.handleGenericError(error, context);
    }
  }

  private async handleAPIError(error: SellerError, context: string): Promise<ErrorRecoveryStrategy> {
    const recoveryActions: RecoveryAction[] = [
      {
        type: 'retry',
        description: 'Retry the request',
        priority: 1,
        action: async () => {
          // Implement retry logic with exponential backoff
          await this.retryWithBackoff(async () => {
            // The actual retry will be handled by the component
            throw new Error('Retry action should be handled by component');
          });
        },
      },
    ];

    // Add cache fallback if cache service is available
    if (this.cacheService) {
      recoveryActions.push({
        type: 'fallback',
        description: 'Use cached data',
        priority: 2,
        action: async () => {
          // Load from cache if available
          const cachedData = await this.cacheService.get(`seller_${context}`);
          if (cachedData) {
            return cachedData;
          }
        },
      });
    }

    return {
      canRecover: true,
      recoveryActions,
      retryConfig: {
        maxAttempts: 3,
        backoffMultiplier: 2,
        initialDelay: 1000,
        maxDelay: 10000,
      },
      userMessage: error.getUserMessage(),
    };
  }

  private async handleCacheError(error: SellerError, context: string): Promise<ErrorRecoveryStrategy> {
    return {
      canRecover: true,
      recoveryActions: [
        {
          type: 'cache_clear',
          description: 'Clear cache and refresh',
          priority: 1,
          action: async () => {
            if (this.cacheService) {
              await this.cacheService.clear(`seller_${context}`);
            }
          },
        },
        {
          type: 'refresh',
          description: 'Refresh data from server',
          priority: 2,
          action: async () => {
            // Force refresh from API
            window.location.reload();
          },
        },
      ],
      userMessage: error.getUserMessage(),
    };
  }

  private async handleNetworkError(error: SellerError, context: string): Promise<ErrorRecoveryStrategy> {
    return {
      canRecover: true,
      recoveryActions: [
        {
          type: 'retry',
          description: 'Retry when connection is restored',
          priority: 1,
          action: async () => {
            // Wait for network and retry
            await this.waitForNetwork();
          },
        },
        {
          type: 'fallback',
          description: 'Work offline with cached data',
          priority: 2,
          action: async () => {
            if (this.cacheService) {
              const cachedData = await this.cacheService.get(`seller_${context}`);
              return cachedData;
            }
          },
        },
      ],
      retryConfig: {
        maxAttempts: 5,
        backoffMultiplier: 1.5,
        initialDelay: 2000,
        maxDelay: 30000,
      },
      userMessage: error.getUserMessage(),
    };
  }

  private async handleValidationError(error: SellerError, context: string): Promise<ErrorRecoveryStrategy> {
    return {
      canRecover: false,
      recoveryActions: [],
      userMessage: error.getUserMessage(),
    };
  }

  private async handlePermissionError(error: SellerError, context: string): Promise<ErrorRecoveryStrategy> {
    return {
      canRecover: false,
      recoveryActions: [
        {
          type: 'redirect',
          description: 'Go to seller onboarding',
          priority: 1,
          action: async () => {
            window.location.href = '/marketplace/seller/onboarding';
          },
        },
      ],
      userMessage: error.getUserMessage(),
    };
  }

  private async handleImageUploadError(error: SellerError, context: string): Promise<ErrorRecoveryStrategy> {
    return {
      canRecover: true,
      recoveryActions: [
        {
          type: 'retry',
          description: 'Retry image upload',
          priority: 1,
          action: async () => {
            // Retry will be handled by the upload component
          },
        },
      ],
      retryConfig: {
        maxAttempts: 2,
        backoffMultiplier: 1.5,
        initialDelay: 1000,
      },
      userMessage: error.getUserMessage(),
    };
  }

  private async handleTierValidationError(error: SellerError, context: string): Promise<ErrorRecoveryStrategy> {
    return {
      canRecover: false,
      recoveryActions: [
        {
          type: 'redirect',
          description: 'View tier upgrade options',
          priority: 1,
          action: async () => {
            window.location.href = '/marketplace/seller/tier-upgrade';
          },
        },
      ],
      userMessage: error.getUserMessage(),
    };
  }

  private async handleDataSyncError(error: SellerError, context: string): Promise<ErrorRecoveryStrategy> {
    return {
      canRecover: true,
      recoveryActions: [
        {
          type: 'retry',
          description: 'Wait for sync to complete',
          priority: 1,
          action: async () => {
            // Wait a bit and retry
            await new Promise(resolve => setTimeout(resolve, 3000));
          },
        },
      ],
      userMessage: error.getUserMessage(),
    };
  }

  private async handleGenericError(error: SellerError, context: string): Promise<ErrorRecoveryStrategy> {
    return {
      canRecover: false,
      recoveryActions: [
        {
          type: 'refresh',
          description: 'Refresh the page',
          priority: 1,
          action: async () => {
            window.location.reload();
          },
        },
      ],
      userMessage: error.getUserMessage(),
    };
  }

  /**
   * Retry with exponential backoff
   */
  private async retryWithBackoff(
    fn: () => Promise<any>,
    config: RetryConfig = {
      maxAttempts: 3,
      backoffMultiplier: 2,
      initialDelay: 1000,
    }
  ): Promise<any> {
    let attempt = 1;
    let delay = config.initialDelay;

    while (attempt <= config.maxAttempts) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === config.maxAttempts) {
          throw error;
        }

        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(
          delay * config.backoffMultiplier,
          config.maxDelay || 30000
        );
        attempt++;
      }
    }
  }

  /**
   * Wait for network connection to be restored
   */
  private async waitForNetwork(): Promise<void> {
    return new Promise((resolve) => {
      if (navigator.onLine) {
        resolve();
        return;
      }

      const handleOnline = () => {
        window.removeEventListener('online', handleOnline);
        resolve();
      };

      window.addEventListener('online', handleOnline);
    });
  }
}

export const sellerErrorRecoveryService = SellerErrorRecoveryService.getInstance();