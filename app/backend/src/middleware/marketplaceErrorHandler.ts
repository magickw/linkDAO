import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

// Marketplace-specific error types
export class ENSValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'ENS_VALIDATION_ERROR', details);
  }
}

export class ENSResolutionError extends AppError {
  constructor(message: string = 'ENS resolution failed', details?: any) {
    super(message, 503, 'ENS_RESOLUTION_ERROR', details);
  }
}

export class ImageUploadError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'IMAGE_UPLOAD_ERROR', details);
  }
}

export class IPFSStorageError extends AppError {
  constructor(message: string = 'IPFS storage failed', details?: any) {
    super(message, 503, 'IPFS_STORAGE_ERROR', details);
  }
}

export class CDNDistributionError extends AppError {
  constructor(message: string = 'CDN distribution failed', details?: any) {
    super(message, 503, 'CDN_DISTRIBUTION_ERROR', details);
  }
}

export class PaymentValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'PAYMENT_VALIDATION_ERROR', details);
  }
}

export class InsufficientBalanceError extends AppError {
  constructor(message: string = 'Insufficient balance for transaction', details?: any) {
    super(message, 400, 'INSUFFICIENT_BALANCE', details);
  }
}

export class EscrowSetupError extends AppError {
  constructor(message: string = 'Escrow setup failed', details?: any) {
    super(message, 503, 'ESCROW_SETUP_ERROR', details);
  }
}

export class ListingPublicationError extends AppError {
  constructor(message: string = 'Listing publication failed', details?: any) {
    super(message, 503, 'LISTING_PUBLICATION_ERROR', details);
  }
}

export class OrderCreationError extends AppError {
  constructor(message: string = 'Order creation failed', details?: any) {
    super(message, 503, 'ORDER_CREATION_ERROR', details);
  }
}

// Error recovery suggestions interface
export interface ErrorRecovery {
  canRetry: boolean;
  suggestedActions: string[];
  alternativeOptions?: any[];
  estimatedResolutionTime?: number;
  helpUrl?: string;
}

// Error recovery mapping
export const getErrorRecovery = (error: AppError): ErrorRecovery => {
  switch (error.code) {
    case 'ENS_VALIDATION_ERROR':
      return {
        canRetry: true,
        suggestedActions: [
          'Check ENS name format (e.g., "yourname.eth")',
          'Verify ENS name exists and is properly configured',
          'Try a different ENS name or leave field empty'
        ],
        alternativeOptions: [
          { type: 'skip', description: 'Continue without ENS handle' },
          { type: 'suggestions', description: 'Get ENS name suggestions' }
        ],
        helpUrl: '/help/ens-setup'
      };

    case 'ENS_RESOLUTION_ERROR':
      return {
        canRetry: true,
        suggestedActions: [
          'Check your internet connection',
          'Try again in a few moments',
          'Use a different ENS provider if available'
        ],
        estimatedResolutionTime: 30,
        helpUrl: '/help/ens-troubleshooting'
      };

    case 'IMAGE_UPLOAD_ERROR':
      return {
        canRetry: true,
        suggestedActions: [
          'Check file size (max 10MB)',
          'Ensure file is a valid image format (JPG, PNG, WebP)',
          'Try compressing the image',
          'Check your internet connection'
        ],
        alternativeOptions: [
          { type: 'compress', description: 'Auto-compress image' },
          { type: 'resize', description: 'Resize image automatically' }
        ],
        helpUrl: '/help/image-upload'
      };

    case 'IPFS_STORAGE_ERROR':
      return {
        canRetry: true,
        suggestedActions: [
          'Try uploading again',
          'Check your internet connection',
          'Contact support if problem persists'
        ],
        estimatedResolutionTime: 60,
        helpUrl: '/help/storage-issues'
      };

    case 'CDN_DISTRIBUTION_ERROR':
      return {
        canRetry: true,
        suggestedActions: [
          'Image uploaded successfully but distribution is delayed',
          'Your image will be available shortly',
          'Refresh the page in a few minutes'
        ],
        estimatedResolutionTime: 300,
        helpUrl: '/help/cdn-issues'
      };

    case 'PAYMENT_VALIDATION_ERROR':
      return {
        canRetry: true,
        suggestedActions: [
          'Check payment method details',
          'Verify wallet connection',
          'Ensure sufficient balance',
          'Try a different payment method'
        ],
        alternativeOptions: [
          { type: 'crypto', description: 'Pay with cryptocurrency' },
          { type: 'fiat', description: 'Pay with credit card' },
          { type: 'escrow', description: 'Use escrow protection' }
        ],
        helpUrl: '/help/payment-methods'
      };

    case 'INSUFFICIENT_BALANCE':
      return {
        canRetry: false,
        suggestedActions: [
          'Add funds to your wallet',
          'Try a different payment method',
          'Use fiat payment instead'
        ],
        alternativeOptions: [
          { type: 'fiat', description: 'Pay with credit card (no crypto needed)' },
          { type: 'different_crypto', description: 'Try a different cryptocurrency' }
        ],
        helpUrl: '/help/insufficient-balance'
      };

    case 'ESCROW_SETUP_ERROR':
      return {
        canRetry: true,
        suggestedActions: [
          'Check wallet connection',
          'Ensure sufficient gas fees',
          'Try direct payment instead',
          'Contact support if issue persists'
        ],
        alternativeOptions: [
          { type: 'direct', description: 'Pay directly without escrow' },
          { type: 'fiat', description: 'Use fiat payment with built-in protection' }
        ],
        estimatedResolutionTime: 120,
        helpUrl: '/help/escrow-issues'
      };

    case 'LISTING_PUBLICATION_ERROR':
      return {
        canRetry: true,
        suggestedActions: [
          'Check all required fields are filled',
          'Verify images uploaded successfully',
          'Try saving as draft first',
          'Contact support if problem persists'
        ],
        alternativeOptions: [
          { type: 'draft', description: 'Save as draft and publish later' },
          { type: 'simplified', description: 'Create simplified listing' }
        ],
        estimatedResolutionTime: 60,
        helpUrl: '/help/listing-issues'
      };

    case 'ORDER_CREATION_ERROR':
      return {
        canRetry: true,
        suggestedActions: [
          'Verify payment was processed successfully',
          'Check product availability',
          'Try placing order again',
          'Contact seller if issue persists'
        ],
        alternativeOptions: [
          { type: 'contact_seller', description: 'Contact seller directly' },
          { type: 'similar_products', description: 'Browse similar products' }
        ],
        estimatedResolutionTime: 180,
        helpUrl: '/help/order-issues'
      };

    default:
      return {
        canRetry: true,
        suggestedActions: [
          'Try the action again',
          'Refresh the page',
          'Check your internet connection',
          'Contact support if problem persists'
        ],
        helpUrl: '/help/general-troubleshooting'
      };
  }
};

// Enhanced error response with recovery suggestions
export const marketplaceErrorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Get recovery suggestions
  const recovery = getErrorRecovery(error);

  // Enhanced error response
  const errorResponse = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
      recovery: {
        canRetry: recovery.canRetry,
        suggestedActions: recovery.suggestedActions,
        ...(recovery.alternativeOptions && { alternativeOptions: recovery.alternativeOptions }),
        ...(recovery.estimatedResolutionTime && { estimatedResolutionTime: recovery.estimatedResolutionTime }),
        ...(recovery.helpUrl && { helpUrl: recovery.helpUrl })
      }
    },
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };

  // Add request ID if available
  if (req.headers['x-request-id']) {
    (errorResponse as any).requestId = req.headers['x-request-id'];
  }

  res.status(error.statusCode || 500).json(errorResponse);
};

// Graceful degradation handler
export const gracefulDegradationHandler = (
  serviceName: string,
  fallbackData?: any
) => {
  return (error: any, req: Request, res: Response, next: NextFunction) => {
    console.warn(`⚠️ Service degradation: ${serviceName} is unavailable`, error.message);

    // Return fallback response
    res.status(200).json({
      success: true,
      data: fallbackData || {},
      warning: {
        code: 'SERVICE_DEGRADED',
        message: `${serviceName} is temporarily unavailable. Limited functionality provided.`,
        affectedFeatures: getAffectedFeatures(serviceName),
        estimatedRestoration: getEstimatedRestoration(serviceName)
      },
      timestamp: new Date().toISOString()
    });
  };
};

// Helper functions for graceful degradation
const getAffectedFeatures = (serviceName: string): string[] => {
  const featureMap: { [key: string]: string[] } = {
    'ENS': ['ENS handle validation', 'ENS suggestions'],
    'IPFS': ['Image storage', 'Decentralized file access'],
    'CDN': ['Fast image loading', 'Global image delivery'],
    'Escrow': ['Escrow protection', 'Dispute resolution'],
    'Search': ['Advanced search', 'Filtering'],
    'Notifications': ['Real-time notifications', 'Email alerts']
  };

  return featureMap[serviceName] || ['Some features'];
};

const getEstimatedRestoration = (serviceName: string): string => {
  const restorationMap: { [key: string]: string } = {
    'ENS': '5-10 minutes',
    'IPFS': '10-30 minutes',
    'CDN': '15-45 minutes',
    'Escrow': '30-60 minutes',
    'Search': '5-15 minutes',
    'Notifications': '10-20 minutes'
  };

  return restorationMap[serviceName] || '15-30 minutes';
};

// Error monitoring and logging service
export class ErrorMonitoringService {
  private static errorCounts: Map<string, number> = new Map();
  private static lastReset: Date = new Date();

  static logError(error: AppError, context: any = {}) {
    const errorKey = `${error.code}_${error.statusCode}`;
    const currentCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, currentCount + 1);

    // Reset counts every hour
    if (Date.now() - this.lastReset.getTime() > 3600000) {
      this.errorCounts.clear();
      this.lastReset = new Date();
    }

    // Log error with context
    const logEntry = {
      timestamp: new Date().toISOString(),
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        stack: error.stack
      },
      context,
      count: this.errorCounts.get(errorKey),
      severity: this.getSeverity(error)
    };

    // Different logging levels based on severity
    if (logEntry.severity === 'critical') {
      console.error('🚨 CRITICAL ERROR:', JSON.stringify(logEntry, null, 2));
    } else if (logEntry.severity === 'high') {
      console.error('❌ HIGH SEVERITY ERROR:', JSON.stringify(logEntry, null, 2));
    } else if (logEntry.severity === 'medium') {
      console.warn('⚠️ MEDIUM SEVERITY ERROR:', JSON.stringify(logEntry, null, 2));
    } else {
      console.log('ℹ️ LOW SEVERITY ERROR:', JSON.stringify(logEntry, null, 2));
    }

    // Alert if error frequency is high
    if (currentCount > 10) {
      console.error(`🚨 HIGH ERROR FREQUENCY: ${errorKey} occurred ${currentCount} times in the last hour`);
    }
  }

  private static getSeverity(error: AppError): 'critical' | 'high' | 'medium' | 'low' {
    if (error.statusCode >= 500) return 'critical';
    if (error.code?.includes('PAYMENT') || error.code?.includes('ORDER')) return 'high';
    if (error.code?.includes('VALIDATION') || error.code?.includes('UPLOAD')) return 'medium';
    return 'low';
  }

  static getErrorStats() {
    return {
      totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0),
      errorBreakdown: Object.fromEntries(this.errorCounts),
      lastReset: this.lastReset,
      uptime: Date.now() - this.lastReset.getTime()
    };
  }
}