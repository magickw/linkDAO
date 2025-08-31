export interface ErrorClassification {
  type: 'transient' | 'permanent' | 'rate_limit' | 'authentication' | 'validation' | 'network' | 'timeout' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  suggestedAction: 'retry' | 'fallback' | 'escalate' | 'ignore';
  category: string;
  description: string;
  recoveryStrategy?: string;
}

export interface ErrorContext {
  service: string;
  operation: string;
  timestamp: Date;
  requestId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface ClassifiedError {
  originalError: Error;
  classification: ErrorClassification;
  context: ErrorContext;
  id: string;
  timestamp: Date;
}

/**
 * Error classification service for AI content moderation system
 * Classifies errors to determine appropriate response strategies
 */
export class ErrorClassificationService {
  private errorPatterns: Map<string, ErrorClassification> = new Map();
  private classificationHistory: ClassifiedError[] = [];
  private readonly maxHistorySize = 1000;

  constructor() {
    this.setupDefaultClassifications();
  }

  /**
   * Classify an error and determine response strategy
   */
  classifyError(error: Error, context: ErrorContext): ClassifiedError {
    const classification = this.determineClassification(error);
    
    const classifiedError: ClassifiedError = {
      originalError: error,
      classification,
      context,
      id: this.generateErrorId(),
      timestamp: new Date()
    };

    // Store in history
    this.classificationHistory.push(classifiedError);
    if (this.classificationHistory.length > this.maxHistorySize) {
      this.classificationHistory.shift();
    }

    return classifiedError;
  }

  /**
   * Determine error classification based on error characteristics
   */
  private determineClassification(error: Error): ErrorClassification {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();
    const errorStack = error.stack?.toLowerCase() || '';

    // Check for specific error patterns
    for (const [pattern, classification] of this.errorPatterns) {
      if (this.matchesPattern(pattern, errorMessage, errorName, errorStack)) {
        return classification;
      }
    }

    // Fallback classification based on common patterns
    if (this.isNetworkError(error)) {
      return this.getNetworkErrorClassification();
    }

    if (this.isTimeoutError(error)) {
      return this.getTimeoutErrorClassification();
    }

    if (this.isRateLimitError(error)) {
      return this.getRateLimitErrorClassification();
    }

    if (this.isAuthenticationError(error)) {
      return this.getAuthenticationErrorClassification();
    }

    if (this.isValidationError(error)) {
      return this.getValidationErrorClassification();
    }

    // Default unknown classification
    return {
      type: 'unknown',
      severity: 'medium',
      retryable: false,
      suggestedAction: 'escalate',
      category: 'unknown',
      description: 'Unknown error type',
      recoveryStrategy: 'Manual investigation required'
    };
  }

  /**
   * Check if error matches a specific pattern
   */
  private matchesPattern(pattern: string, message: string, name: string, stack: string): boolean {
    const regex = new RegExp(pattern, 'i');
    return regex.test(message) || regex.test(name) || regex.test(stack);
  }

  /**
   * Check if error is network-related
   */
  private isNetworkError(error: Error): boolean {
    const networkIndicators = [
      'network', 'connection', 'timeout', 'econnreset', 'enotfound', 
      'econnrefused', 'socket', 'dns', 'fetch'
    ];
    
    const errorText = `${error.name} ${error.message}`.toLowerCase();
    return networkIndicators.some(indicator => errorText.includes(indicator));
  }

  /**
   * Check if error is timeout-related
   */
  private isTimeoutError(error: Error): boolean {
    const timeoutIndicators = ['timeout', 'timed out', 'deadline exceeded'];
    const errorText = `${error.name} ${error.message}`.toLowerCase();
    return timeoutIndicators.some(indicator => errorText.includes(indicator));
  }

  /**
   * Check if error is rate limit-related
   */
  private isRateLimitError(error: Error): boolean {
    const rateLimitIndicators = [
      'rate limit', 'too many requests', '429', 'quota exceeded',
      'throttled', 'rate exceeded'
    ];
    
    const errorText = `${error.name} ${error.message}`.toLowerCase();
    return rateLimitIndicators.some(indicator => errorText.includes(indicator));
  }

  /**
   * Check if error is authentication-related
   */
  private isAuthenticationError(error: Error): boolean {
    const authIndicators = [
      'unauthorized', 'authentication', 'invalid token', 'expired token',
      '401', 'forbidden', '403', 'access denied', 'api key'
    ];
    
    const errorText = `${error.name} ${error.message}`.toLowerCase();
    return authIndicators.some(indicator => errorText.includes(indicator));
  }

  /**
   * Check if error is validation-related
   */
  private isValidationError(error: Error): boolean {
    const validationIndicators = [
      'validation', 'invalid', 'bad request', '400', 'malformed',
      'schema', 'required field', 'format'
    ];
    
    const errorText = `${error.name} ${error.message}`.toLowerCase();
    return validationIndicators.some(indicator => errorText.includes(indicator));
  }

  /**
   * Get network error classification
   */
  private getNetworkErrorClassification(): ErrorClassification {
    return {
      type: 'network',
      severity: 'medium',
      retryable: true,
      suggestedAction: 'retry',
      category: 'connectivity',
      description: 'Network connectivity issue',
      recoveryStrategy: 'Retry with exponential backoff, check network connectivity'
    };
  }

  /**
   * Get timeout error classification
   */
  private getTimeoutErrorClassification(): ErrorClassification {
    return {
      type: 'timeout',
      severity: 'medium',
      retryable: true,
      suggestedAction: 'retry',
      category: 'performance',
      description: 'Operation timed out',
      recoveryStrategy: 'Retry with longer timeout, consider fallback'
    };
  }

  /**
   * Get rate limit error classification
   */
  private getRateLimitErrorClassification(): ErrorClassification {
    return {
      type: 'rate_limit',
      severity: 'low',
      retryable: true,
      suggestedAction: 'retry',
      category: 'quota',
      description: 'Rate limit exceeded',
      recoveryStrategy: 'Retry after delay, implement backoff strategy'
    };
  }

  /**
   * Get authentication error classification
   */
  private getAuthenticationErrorClassification(): ErrorClassification {
    return {
      type: 'authentication',
      severity: 'high',
      retryable: false,
      suggestedAction: 'escalate',
      category: 'security',
      description: 'Authentication or authorization failure',
      recoveryStrategy: 'Check API credentials, refresh tokens if applicable'
    };
  }

  /**
   * Get validation error classification
   */
  private getValidationErrorClassification(): ErrorClassification {
    return {
      type: 'validation',
      severity: 'medium',
      retryable: false,
      suggestedAction: 'escalate',
      category: 'data',
      description: 'Input validation failure',
      recoveryStrategy: 'Fix input data, check API documentation'
    };
  }

  /**
   * Setup default error classifications
   */
  private setupDefaultClassifications(): void {
    // OpenAI specific errors
    this.errorPatterns.set('openai.*insufficient_quota', {
      type: 'rate_limit',
      severity: 'medium',
      retryable: true,
      suggestedAction: 'fallback',
      category: 'quota',
      description: 'OpenAI quota exceeded',
      recoveryStrategy: 'Use alternative vendor or wait for quota reset'
    });

    this.errorPatterns.set('openai.*invalid_api_key', {
      type: 'authentication',
      severity: 'critical',
      retryable: false,
      suggestedAction: 'escalate',
      category: 'configuration',
      description: 'Invalid OpenAI API key',
      recoveryStrategy: 'Update API key configuration'
    });

    // Google Vision specific errors
    this.errorPatterns.set('google.*vision.*quota.*exceeded', {
      type: 'rate_limit',
      severity: 'medium',
      retryable: true,
      suggestedAction: 'fallback',
      category: 'quota',
      description: 'Google Vision API quota exceeded',
      recoveryStrategy: 'Use alternative vendor or wait for quota reset'
    });

    this.errorPatterns.set('google.*vision.*invalid.*credentials', {
      type: 'authentication',
      severity: 'critical',
      retryable: false,
      suggestedAction: 'escalate',
      category: 'configuration',
      description: 'Invalid Google Vision API credentials',
      recoveryStrategy: 'Update API credentials configuration'
    });

    // Perspective API specific errors
    this.errorPatterns.set('perspective.*api.*quota.*exceeded', {
      type: 'rate_limit',
      severity: 'medium',
      retryable: true,
      suggestedAction: 'fallback',
      category: 'quota',
      description: 'Perspective API quota exceeded',
      recoveryStrategy: 'Use alternative vendor or wait for quota reset'
    });

    // Database errors
    this.errorPatterns.set('connection.*refused|connection.*timeout', {
      type: 'transient',
      severity: 'high',
      retryable: true,
      suggestedAction: 'retry',
      category: 'database',
      description: 'Database connection issue',
      recoveryStrategy: 'Retry connection, check database health'
    });

    this.errorPatterns.set('deadlock|lock.*timeout', {
      type: 'transient',
      severity: 'medium',
      retryable: true,
      suggestedAction: 'retry',
      category: 'database',
      description: 'Database lock contention',
      recoveryStrategy: 'Retry with random delay'
    });

    // Redis errors
    this.errorPatterns.set('redis.*connection.*lost', {
      type: 'transient',
      severity: 'medium',
      retryable: true,
      suggestedAction: 'retry',
      category: 'cache',
      description: 'Redis connection lost',
      recoveryStrategy: 'Retry operation, consider cache bypass'
    });

    // IPFS errors
    this.errorPatterns.set('ipfs.*timeout|ipfs.*unreachable', {
      type: 'network',
      severity: 'medium',
      retryable: true,
      suggestedAction: 'retry',
      category: 'storage',
      description: 'IPFS network issue',
      recoveryStrategy: 'Retry with different gateway, use local storage fallback'
    });

    // Circuit breaker errors
    this.errorPatterns.set('circuit.*breaker.*open', {
      type: 'transient',
      severity: 'medium',
      retryable: false,
      suggestedAction: 'fallback',
      category: 'resilience',
      description: 'Circuit breaker is open',
      recoveryStrategy: 'Use fallback mechanism, wait for circuit recovery'
    });
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(timeWindowMs?: number): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    errorsByCategory: Record<string, number>;
    retryableErrors: number;
    nonRetryableErrors: number;
  } {
    const cutoffTime = timeWindowMs ? new Date(Date.now() - timeWindowMs) : new Date(0);
    const relevantErrors = this.classificationHistory.filter(e => e.timestamp >= cutoffTime);

    const stats = {
      totalErrors: relevantErrors.length,
      errorsByType: {} as Record<string, number>,
      errorsBySeverity: {} as Record<string, number>,
      errorsByCategory: {} as Record<string, number>,
      retryableErrors: 0,
      nonRetryableErrors: 0
    };

    relevantErrors.forEach(error => {
      const { classification } = error;
      
      // Count by type
      stats.errorsByType[classification.type] = (stats.errorsByType[classification.type] || 0) + 1;
      
      // Count by severity
      stats.errorsBySeverity[classification.severity] = (stats.errorsBySeverity[classification.severity] || 0) + 1;
      
      // Count by category
      stats.errorsByCategory[classification.category] = (stats.errorsByCategory[classification.category] || 0) + 1;
      
      // Count retryable vs non-retryable
      if (classification.retryable) {
        stats.retryableErrors++;
      } else {
        stats.nonRetryableErrors++;
      }
    });

    return stats;
  }

  /**
   * Get recent errors by service
   */
  getRecentErrorsByService(serviceName: string, limit: number = 10): ClassifiedError[] {
    return this.classificationHistory
      .filter(error => error.context.service === serviceName)
      .slice(-limit);
  }

  /**
   * Check if error should trigger circuit breaker
   */
  shouldTriggerCircuitBreaker(error: ClassifiedError): boolean {
    const { classification } = error;
    
    // Don't trigger circuit breaker for validation or authentication errors
    if (classification.type === 'validation' || classification.type === 'authentication') {
      return false;
    }
    
    // Trigger for high severity transient errors
    if (classification.severity === 'high' && classification.type === 'transient') {
      return true;
    }
    
    // Trigger for network and timeout errors
    if (classification.type === 'network' || classification.type === 'timeout') {
      return true;
    }
    
    return false;
  }

  /**
   * Get recommended retry delay based on error classification
   */
  getRecommendedRetryDelay(error: ClassifiedError, attemptNumber: number): number {
    const { classification } = error;
    
    // Base delays by error type (in milliseconds)
    const baseDelays: Record<string, number> = {
      'rate_limit': 60000, // 1 minute for rate limits
      'network': 1000,     // 1 second for network issues
      'timeout': 2000,     // 2 seconds for timeouts
      'transient': 1000,   // 1 second for transient errors
      'unknown': 5000      // 5 seconds for unknown errors
    };
    
    const baseDelay = baseDelays[classification.type] || 1000;
    
    // Apply exponential backoff
    const exponentialDelay = baseDelay * Math.pow(2, attemptNumber - 1);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * exponentialDelay;
    
    // Cap maximum delay at 5 minutes
    return Math.min(exponentialDelay + jitter, 300000);
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add custom error pattern
   */
  addErrorPattern(pattern: string, classification: ErrorClassification): void {
    this.errorPatterns.set(pattern, classification);
  }

  /**
   * Remove error pattern
   */
  removeErrorPattern(pattern: string): boolean {
    return this.errorPatterns.delete(pattern);
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.classificationHistory = [];
  }
}

export const errorClassificationService = new ErrorClassificationService();