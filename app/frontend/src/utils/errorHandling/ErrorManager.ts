/**
 * Comprehensive Error Management System
 * Handles graceful degradation, retry mechanisms, and user feedback
 */

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  PERMISSION = 'permission',
  CONTENT = 'content',
  WALLET = 'wallet',
  BLOCKCHAIN = 'blockchain',
  PERFORMANCE = 'performance',
  UNKNOWN = 'unknown'
}

export interface ErrorContext {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  actionableSteps: string[];
  retryable: boolean;
  fallbackAvailable: boolean;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: ErrorCategory[];
}

export class ErrorManager {
  private static instance: ErrorManager;
  private errorHistory: ErrorContext[] = [];
  private retryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryableErrors: [ErrorCategory.NETWORK, ErrorCategory.PERFORMANCE]
  };

  private constructor() {}

  static getInstance(): ErrorManager {
    if (!ErrorManager.instance) {
      ErrorManager.instance = new ErrorManager();
    }
    return ErrorManager.instance;
  }

  /**
   * Handle error with automatic categorization and response
   */
  handleError(error: Error | ErrorContext, context?: Partial<ErrorContext>): ErrorContext {
    const errorContext = this.createErrorContext(error, context);
    this.logError(errorContext);
    
    // Determine response strategy
    if (errorContext.retryable) {
      this.scheduleRetry(errorContext);
    }
    
    if (errorContext.fallbackAvailable) {
      this.activateFallback(errorContext);
    }
    
    return errorContext;
  }

  /**
   * Retry mechanism with exponential backoff
   */
  async retryOperation<T>(
    operation: () => Promise<T>,
    context: Partial<ErrorContext> = {},
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.retryConfig, ...customConfig };
    let lastError: Error;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        const errorContext = this.createErrorContext(error as Error, context);
        
        if (!this.isRetryableError(errorContext.category, config)) {
          throw error;
        }
        
        if (attempt === config.maxAttempts) {
          break;
        }
        
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        );
        
        await this.delay(delay);
      }
    }
    
    throw lastError!;
  }

  /**
   * Create standardized error context
   */
  private createErrorContext(error: Error | ErrorContext, context?: Partial<ErrorContext>): ErrorContext {
    if ('category' in error) {
      return { ...error, ...context };
    }
    
    const category = this.categorizeError(error);
    const severity = this.determineSeverity(category, error);
    
    return {
      id: this.generateErrorId(),
      category,
      severity,
      message: error.message,
      userMessage: this.generateUserMessage(category, error),
      actionableSteps: this.generateActionableSteps(category, error),
      retryable: this.isRetryableError(category),
      fallbackAvailable: this.hasFallback(category),
      timestamp: new Date(),
      metadata: {
        stack: error.stack,
        name: error.name,
        ...context?.metadata
      },
      ...context
    };
  }

  /**
   * Categorize error based on type and message
   */
  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return ErrorCategory.NETWORK;
    }
    
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorCategory.VALIDATION;
    }
    
    if (message.includes('unauthorized') || message.includes('authentication')) {
      return ErrorCategory.AUTHENTICATION;
    }
    
    if (message.includes('permission') || message.includes('forbidden')) {
      return ErrorCategory.PERMISSION;
    }
    
    if (message.includes('wallet') || message.includes('metamask')) {
      return ErrorCategory.WALLET;
    }
    
    if (message.includes('blockchain') || message.includes('transaction')) {
      return ErrorCategory.BLOCKCHAIN;
    }
    
    if (message.includes('performance') || message.includes('memory')) {
      return ErrorCategory.PERFORMANCE;
    }
    
    return ErrorCategory.UNKNOWN;
  }

  /**
   * Determine error severity
   */
  private determineSeverity(category: ErrorCategory, error: Error): ErrorSeverity {
    switch (category) {
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.BLOCKCHAIN:
        return ErrorSeverity.HIGH;
      case ErrorCategory.NETWORK:
      case ErrorCategory.PERFORMANCE:
        return ErrorSeverity.MEDIUM;
      case ErrorCategory.VALIDATION:
      case ErrorCategory.CONTENT:
        return ErrorSeverity.LOW;
      default:
        return ErrorSeverity.MEDIUM;
    }
  }

  /**
   * Generate user-friendly error messages
   */
  private generateUserMessage(category: ErrorCategory, error: Error): string {
    switch (category) {
      case ErrorCategory.NETWORK:
        return "Connection issue detected. Please check your internet connection.";
      case ErrorCategory.AUTHENTICATION:
        return "Authentication required. Please sign in to continue.";
      case ErrorCategory.WALLET:
        return "Wallet connection issue. Please check your wallet and try again.";
      case ErrorCategory.BLOCKCHAIN:
        return "Blockchain transaction failed. Please try again or check network status.";
      case ErrorCategory.VALIDATION:
        return "Invalid input detected. Please check your data and try again.";
      case ErrorCategory.PERMISSION:
        return "You don't have permission to perform this action.";
      case ErrorCategory.PERFORMANCE:
        return "System is running slowly. Please wait a moment and try again.";
      default:
        return "An unexpected error occurred. Please try again.";
    }
  }

  /**
   * Generate actionable recovery steps
   */
  private generateActionableSteps(category: ErrorCategory, error: Error): string[] {
    switch (category) {
      case ErrorCategory.NETWORK:
        return [
          "Check your internet connection",
          "Try refreshing the page",
          "Switch to a different network if available"
        ];
      case ErrorCategory.AUTHENTICATION:
        return [
          "Sign in to your account",
          "Clear browser cache and cookies",
          "Try using a different browser"
        ];
      case ErrorCategory.WALLET:
        return [
          "Check if your wallet is connected",
          "Refresh your wallet connection",
          "Try switching wallet accounts"
        ];
      case ErrorCategory.BLOCKCHAIN:
        return [
          "Check network status",
          "Ensure sufficient gas fees",
          "Try again in a few minutes"
        ];
      case ErrorCategory.VALIDATION:
        return [
          "Review your input data",
          "Check required fields",
          "Ensure data format is correct"
        ];
      default:
        return [
          "Try refreshing the page",
          "Clear browser cache",
          "Contact support if issue persists"
        ];
    }
  }

  /**
   * Check if error category is retryable
   */
  private isRetryableError(category: ErrorCategory, config?: RetryConfig): boolean {
    const retryableErrors = config?.retryableErrors || this.retryConfig.retryableErrors;
    return retryableErrors.includes(category);
  }

  /**
   * Check if fallback is available for error category
   */
  private hasFallback(category: ErrorCategory): boolean {
    return [
      ErrorCategory.NETWORK,
      ErrorCategory.PERFORMANCE,
      ErrorCategory.CONTENT
    ].includes(category);
  }

  /**
   * Schedule retry for retryable errors
   */
  private scheduleRetry(errorContext: ErrorContext): void {
    // Implementation would depend on specific retry strategy
    console.log(`Scheduling retry for error: ${errorContext.id}`);
  }

  /**
   * Activate fallback mechanisms
   */
  private activateFallback(errorContext: ErrorContext): void {
    // Implementation would depend on specific fallback strategy
    console.log(`Activating fallback for error: ${errorContext.id}`);
  }

  /**
   * Log error for monitoring and debugging
   */
  private logError(errorContext: ErrorContext): void {
    this.errorHistory.push(errorContext);
    
    // Keep only last 100 errors in memory
    if (this.errorHistory.length > 100) {
      this.errorHistory = this.errorHistory.slice(-100);
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error handled:', errorContext);
    }
    
    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(errorContext);
    }
  }

  /**
   * Send error to monitoring service
   */
  private sendToMonitoring(errorContext: ErrorContext): void {
    // Implementation would send to actual monitoring service
    console.log('Sending to monitoring:', errorContext.id);
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get error history for debugging
   */
  getErrorHistory(): ErrorContext[] {
    return [...this.errorHistory];
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
  }
}

export const errorManager = ErrorManager.getInstance();