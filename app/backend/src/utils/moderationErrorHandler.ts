import { safeLogger } from './safeLogger';

/**
 * Standardized error types for moderation system
 */
export enum ModerationErrorType {
  // Database errors
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  DATABASE_QUERY_ERROR = 'DATABASE_QUERY_ERROR',
  DATABASE_SCHEMA_ERROR = 'DATABASE_SCHEMA_ERROR',
  
  // AI service errors
  AI_SERVICE_UNAVAILABLE = 'AI_SERVICE_UNAVAILABLE',
  AI_SERVICE_TIMEOUT = 'AI_SERVICE_TIMEOUT',
  AI_SERVICE_RATE_LIMITED = 'AI_SERVICE_RATE_LIMITED',
  AI_SERVICE_INVALID_RESPONSE = 'AI_SERVICE_INVALID_RESPONSE',
  
  // Validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_CONTENT_TYPE = 'INVALID_CONTENT_TYPE',
  
  // Business logic errors
  CONTENT_ALREADY_MODERATED = 'CONTENT_ALREADY_MODERATED',
  MODERATION_CASE_NOT_FOUND = 'MODERATION_CASE_NOT_FOUND',
  UNAUTHORIZED_MODERATION_ACTION = 'UNAUTHORIZED_MODERATION_ACTION',
  APPEAL_NOT_ELIGIBLE = 'APPEAL_NOT_ELIGIBLE',
  APPEAL_ALREADY_SUBMITTED = 'APPEAL_ALREADY_SUBMITTED',
  
  // Rate limiting errors
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REPORTS = 'TOO_MANY_REPORTS',
  
  // CAPTCHA errors
  CAPTCHA_VERIFICATION_FAILED = 'CAPTCHA_VERIFICATION_FAILED',
  CAPTCHA_TOKEN_INVALID = 'CAPTCHA_TOKEN_INVALID',
  CAPTCHA_TOKEN_EXPIRED = 'CAPTCHA_TOKEN_EXPIRED',
  
  // Security errors
  SIGNATURE_VERIFICATION_FAILED = 'SIGNATURE_VERIFICATION_FAILED',
  HASH_VERIFICATION_FAILED = 'HASH_VERIFICATION_FAILED',
  
  // IPFS errors
  IPFS_UPLOAD_FAILED = 'IPFS_UPLOAD_FAILED',
  IPFS_RETRIEVAL_FAILED = 'IPFS_RETRIEVAL_FAILED',
  
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Standardized moderation error class
 */
export class ModerationError extends Error {
  public readonly type: ModerationErrorType;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;
  public readonly retryable: boolean;
  public readonly originalError?: Error;

  constructor(
    type: ModerationErrorType,
    message: string,
    statusCode: number = 500,
    details?: Record<string, any>,
    retryable: boolean = false,
    originalError?: Error
  ) {
    super(message);
    this.name = 'ModerationError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.retryable = retryable;
    this.originalError = originalError;
    
    // Maintain proper stack trace
    Error.captureStackTrace(this, ModerationError);
  }

  toJSON() {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      retryable: this.retryable
    };
  }
}

/**
 * Error handler utility for moderation services
 */
export class ModerationErrorHandler {
  /**
   * Handle database connection errors
   */
  static handleDatabaseError(error: any, context?: string): ModerationError {
    safeLogger.error(`Database error${context ? ` in ${context}` : ''}:`, error);

    if (error.code === 'ECONNREFUSED' || error.code === '57P01') {
      return new ModerationError(
        ModerationErrorType.DATABASE_CONNECTION_ERROR,
        'Database connection failed. Please try again later.',
        503,
        { originalCode: error.code },
        true,
        error
      );
    }

    if (error.code === '42P01') {
      return new ModerationError(
        ModerationErrorType.DATABASE_SCHEMA_ERROR,
        'Database table does not exist. Please run migrations.',
        500,
        { table: error.table },
        false,
        error
      );
    }

    if (error.code === '42703') {
      return new ModerationError(
        ModerationErrorType.DATABASE_SCHEMA_ERROR,
        'Database schema mismatch. Please run migrations.',
        500,
        { column: error.column },
        false,
        error
      );
    }

    if (error.code === '23505') {
      return new ModerationError(
        ModerationErrorType.DATABASE_QUERY_ERROR,
        'Duplicate entry detected.',
        409,
        { constraint: error.constraint },
        false,
        error
      );
    }

    if (error.code === '23503') {
      return new ModerationError(
        ModerationErrorType.DATABASE_QUERY_ERROR,
        'Foreign key constraint violation.',
        400,
        { constraint: error.constraint },
        false,
        error
      );
    }

    // Generic database error
    return new ModerationError(
      ModerationErrorType.DATABASE_QUERY_ERROR,
      'Database operation failed.',
      500,
      { originalCode: error.code },
      false,
      error
    );
  }

  /**
   * Handle AI service errors
   */
  static handleAIServiceError(error: any, vendorName: string, context?: string): ModerationError {
    safeLogger.error(`AI service error for ${vendorName}${context ? ` in ${context}` : ''}:`, error);

    // Timeout errors
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return new ModerationError(
        ModerationErrorType.AI_SERVICE_TIMEOUT,
        `AI service timeout for ${vendorName}.`,
        504,
        { vendor: vendorName },
        true,
        error
      );
    }

    // Rate limit errors
    if (error.status === 429 || error.code === 429 || error.message?.includes('rate limit')) {
      return new ModerationError(
        ModerationErrorType.AI_SERVICE_RATE_LIMITED,
        `AI service rate limit exceeded for ${vendorName}.`,
        429,
        { vendor: vendorName, retryAfter: error.headers?.['retry-after'] },
        true,
        error
      );
    }

    // Connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return new ModerationError(
        ModerationErrorType.AI_SERVICE_UNAVAILABLE,
        `AI service ${vendorName} is unavailable.`,
        503,
        { vendor: vendorName },
        true,
        error
      );
    }

    // Invalid response
    if (error.message?.includes('parse') || error.message?.includes('invalid response')) {
      return new ModerationError(
        ModerationErrorType.AI_SERVICE_INVALID_RESPONSE,
        `Invalid response from ${vendorName}.`,
        502,
        { vendor: vendorName },
        true,
        error
      );
    }

    // Generic AI service error
    return new ModerationError(
      ModerationErrorType.AI_SERVICE_UNAVAILABLE,
      `AI service ${vendorName} encountered an error.`,
      503,
      { vendor: vendorName, originalError: error.message },
      true,
      error
    );
  }

  /**
   * Handle validation errors
   */
  static handleValidationError(error: any, field?: string): ModerationError {
    safeLogger.error('Validation error:', error);

    if (error.name === 'ZodError') {
      return new ModerationError(
        ModerationErrorType.INVALID_INPUT,
        'Invalid input data.',
        400,
        { 
          field,
          errors: error.errors,
          details: error.issues 
        },
        false,
        error
      );
    }

    if (error.type === 'required') {
      return new ModerationError(
        ModerationErrorType.MISSING_REQUIRED_FIELD,
        `Required field '${field}' is missing.`,
        400,
        { field },
        false,
        error
      );
    }

    return new ModerationError(
      ModerationErrorType.INVALID_INPUT,
      'Invalid input data.',
      400,
      { field, message: error.message },
      false,
      error
    );
  }

  /**
   * Handle rate limiting errors
   */
  static handleRateLimitError(limit: number, window: number, context?: string): ModerationError {
    safeLogger.warn(`Rate limit exceeded${context ? ` in ${context}` : ''}`);

    return new ModerationError(
      ModerationErrorType.RATE_LIMIT_EXCEEDED,
      `Rate limit exceeded. Maximum ${limit} requests per ${window}ms.`,
      429,
      { limit, window },
      false
    );
  }

  /**
   * Handle CAPTCHA errors
   */
  static handleCaptchaError(error: any): ModerationError {
    safeLogger.error('CAPTCHA error:', error);

    if (error.message?.includes('invalid') || error.code === 'invalid-input-response') {
      return new ModerationError(
        ModerationErrorType.CAPTCHA_TOKEN_INVALID,
        'Invalid CAPTCHA token.',
        400,
        { originalError: error.message },
        false,
        error
      );
    }

    if (error.message?.includes('expired') || error.code === 'timeout-or-duplicate') {
      return new ModerationError(
        ModerationErrorType.CAPTCHA_TOKEN_EXPIRED,
        'CAPTCHA token has expired.',
        400,
        { originalError: error.message },
        false,
        error
      );
    }

    return new ModerationError(
      ModerationErrorType.CAPTCHA_VERIFICATION_FAILED,
      'CAPTCHA verification failed.',
      400,
      { originalError: error.message },
      false,
      error
    );
  }

  /**
   * Handle signature verification errors
   */
  static handleSignatureVerificationError(error: any, context?: string): ModerationError {
    safeLogger.error(`Signature verification error${context ? ` in ${context}` : ''}:`, error);

    return new ModerationError(
      ModerationErrorType.SIGNATURE_VERIFICATION_FAILED,
      'Signature verification failed.',
      400,
      { originalError: error.message },
      false,
      error
    );
  }

  /**
   * Handle hash verification errors
   */
  static handleHashVerificationError(expected: string, actual: string): ModerationError {
    safeLogger.error('Hash verification failed:', { expected, actual });

    return new ModerationError(
      ModerationErrorType.HASH_VERIFICATION_FAILED,
      'Content hash verification failed.',
      400,
      { expected, actual },
      false
    );
  }

  /**
   * Handle IPFS errors
   */
  static handleIPFSError(error: any, operation: 'upload' | 'retrieval', context?: string): ModerationError {
    safeLogger.error(`IPFS ${operation} error${context ? ` in ${context}` : ''}:`, error);

    const errorType = operation === 'upload' 
      ? ModerationErrorType.IPFS_UPLOAD_FAILED 
      : ModerationErrorType.IPFS_RETRIEVAL_FAILED;

    return new ModerationError(
      errorType,
      `IPFS ${operation} failed.`,
      503,
      { operation, originalError: error.message },
      true,
      error
    );
  }

  /**
   * Handle business logic errors
   */
  static handleBusinessLogicError(type: ModerationErrorType, message: string, details?: Record<string, any>): ModerationError {
    safeLogger.warn(`Business logic error: ${type}`, details);

    return new ModerationError(
      type,
      message,
      400,
      details,
      false
    );
  }

  /**
   * Wrap any error in a ModerationError
   */
  static wrapError(error: any, context?: string): ModerationError {
    if (error instanceof ModerationError) {
      return error;
    }

    // Check for known error types
    if (error.code?.startsWith('23')) {
      // PostgreSQL integrity errors
      return this.handleDatabaseError(error, context);
    }

    if (error.code?.startsWith('57') || error.code?.startsWith('58')) {
      // PostgreSQL connection errors
      return this.handleDatabaseError(error, context);
    }

    if (error.status === 429 || error.code === 429) {
      return this.handleAIServiceError(error, 'unknown', context);
    }

    // Unknown error
    safeLogger.error(`Unknown error${context ? ` in ${context}` : ''}:`, error);
    return new ModerationError(
      ModerationErrorType.UNKNOWN_ERROR,
      'An unexpected error occurred.',
      500,
      { originalError: error.message },
      true,
      error
    );
  }

  /**
   * Check if error is retryable
   */
  static isRetryable(error: any): boolean {
    if (error instanceof ModerationError) {
      return error.retryable;
    }

    // Retryable error codes
    const retryableCodes = [
      'ETIMEDOUT',
      'ECONNABORTED',
      'ECONNREFUSED',
      'ENOTFOUND',
      'EAI_AGAIN',
      'ECONNRESET',
      429,
      502,
      503,
      504
    ];

    return retryableCodes.includes(error.code) || retryableCodes.includes(error.status);
  }

  /**
   * Get safe fallback response for a given operation
   */
  static getSafeFallback(operation: string): any {
    const fallbacks: Record<string, any> = {
      'moderate_content': {
        isSpam: false,
        confidence: 0,
        spamType: 'other',
        explanation: 'Moderation service unavailable - content will be reviewed manually',
        riskScore: 0.5,
        recommendedAction: 'review'
      },
      'detect_toxicity': {
        isToxic: false,
        toxicityType: 'other',
        confidence: 0,
        explanation: 'Toxicity detection unavailable',
        riskScore: 0
      },
      'detect_copyright': {
        potentialInfringement: false,
        confidence: 0,
        explanation: 'Copyright detection unavailable',
        riskScore: 0,
        similarContent: []
      },
      'get_moderation_queue': {
        items: [],
        total: 0,
        page: 1,
        totalPages: 0
      },
      'get_moderation_history': {
        actions: [],
        total: 0,
        page: 1,
        totalPages: 0
      },
      'get_dashboard_data': {
        overview: { totalDecisions: 0, averageLatency: 0, errorRate: 0, queueDepth: 0, costToday: 0 },
        accuracy: { falsePositiveRate: 0, falseNegativeRate: 0, appealOverturnRate: 0, humanAgreementRate: 0, accuracyTrend: [] },
        appeals: { totalAppeals: 0, pendingAppeals: 0, overturnRate: 0, averageResolutionTime: 0, appealsByOutcome: {}, appealsTrend: [] },
        performance: { throughput: 0, latencyP95: 0, vendorPerformance: {}, performanceTrend: [] },
        content: { contentByType: {}, actionsByType: {}, topViolationCategories: [], contentTrend: [] },
        alerts: []
      }
    };

    return fallbacks[operation] || null;
  }
}

/**
 * Helper function to execute async operations with standardized error handling
 */
export async function withModerationErrorHandling<T>(
  operation: string,
  fn: () => Promise<T>,
  fallback?: T
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const moderationError = ModerationErrorHandler.wrapError(error, operation);
    
    // If retryable, we might want to retry (but for now, just log)
    if (ModerationErrorHandler.isRetryable(error)) {
      safeLogger.warn(`Retryable error in ${operation}:`, moderationError);
    }

    // Return fallback if provided, otherwise throw
    if (fallback !== undefined) {
      safeLogger.info(`Returning fallback for ${operation}`);
      return fallback;
    }

    throw moderationError;
  }
}