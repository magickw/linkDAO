/**
 * Standardized error types for the seller system (Backend)
 */
export enum SellerErrorType {
  API_ERROR = 'API_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  IMAGE_UPLOAD_ERROR = 'IMAGE_UPLOAD_ERROR',
  TIER_VALIDATION_ERROR = 'TIER_VALIDATION_ERROR',
  DATA_SYNC_ERROR = 'DATA_SYNC_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
}

/**
 * Unified error class for seller system with consistent error handling
 */
export class SellerError extends Error {
  public readonly type: SellerErrorType;
  public readonly code?: string;
  public readonly details?: any;
  public readonly timestamp: string;
  public readonly recoverable: boolean;

  constructor(
    type: SellerErrorType,
    message: string,
    code?: string,
    details?: any,
    recoverable: boolean = true
  ) {
    super(message);
    this.name = 'SellerError';
    this.type = type;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.recoverable = recoverable;

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SellerError);
    }
  }

  /**
   * Convert error to JSON for logging and reporting
   */
  toJSON() {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      recoverable: this.recoverable,
      stack: this.stack,
    };
  }

  /**
   * Create a user-friendly error message
   */
  getUserMessage(): string {
    switch (this.type) {
      case SellerErrorType.API_ERROR:
        return 'We\'re having trouble connecting to our servers. Please try again in a moment.';
      case SellerErrorType.CACHE_ERROR:
        return 'There was an issue loading your data. We\'re refreshing it now.';
      case SellerErrorType.VALIDATION_ERROR:
        return this.message || 'Please check your input and try again.';
      case SellerErrorType.NETWORK_ERROR:
        return 'Please check your internet connection and try again.';
      case SellerErrorType.PERMISSION_ERROR:
        return 'You don\'t have permission to perform this action.';
      case SellerErrorType.IMAGE_UPLOAD_ERROR:
        return 'There was an issue uploading your image. Please try again.';
      case SellerErrorType.TIER_VALIDATION_ERROR:
        return 'This action is not available for your current seller tier.';
      case SellerErrorType.DATA_SYNC_ERROR:
        return 'Your data is being synchronized. Please wait a moment.';
      case SellerErrorType.DATABASE_ERROR:
        return 'There was a database error. Please try again.';
      case SellerErrorType.STORAGE_ERROR:
        return 'There was a storage error. Please try again.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }

  /**
   * Check if this error should be reported to error tracking service
   */
  shouldReport(): boolean {
    // Don't report validation errors or expected permission errors
    return ![
      SellerErrorType.VALIDATION_ERROR,
      SellerErrorType.PERMISSION_ERROR,
    ].includes(this.type);
  }
}
