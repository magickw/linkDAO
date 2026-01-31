import { safeLogger } from '../utils/safeLogger';
import { ModerationErrorHandler, ModerationErrorType } from '../utils/moderationErrorHandler';

/**
 * CAPTCHA verification service
 * Supports multiple CAPTCHA providers (reCAPTCHA, hCaptcha, Turnstile, etc.)
 */
export class CaptchaService {
  private provider: 'recaptcha' | 'hcaptcha' | 'turnstile' | 'custom';
  private secretKey: string;
  private verificationEndpoint: string;
  private scoreThreshold: number;

  constructor() {
    // Configure based on environment variables
    const providerEnv = process.env.CAPTCHA_PROVIDER || 'recaptcha';
    this.provider = providerEnv as any;
    
    // Set provider-specific configuration
    switch (this.provider) {
      case 'recaptcha':
        this.secretKey = process.env.RECAPTCHA_SECRET_KEY || '';
        this.verificationEndpoint = 'https://www.google.com/recaptcha/api/siteverify';
        this.scoreThreshold = parseFloat(process.env.RECAPTCHA_SCORE_THRESHOLD || '0.5');
        break;
      
      case 'hcaptcha':
        this.secretKey = process.env.HCAPTCHA_SECRET_KEY || '';
        this.verificationEndpoint = 'https://hcaptcha.com/siteverify';
        this.scoreThreshold = parseFloat(process.env.HCAPTCHA_SCORE_THRESHOLD || '0.5');
        break;
      
      case 'turnstile':
        this.secretKey = process.env.TURNSTILE_SECRET_KEY || '';
        this.verificationEndpoint = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
        this.scoreThreshold = parseFloat(process.env.TURNSTILE_SCORE_THRESHOLD || '0.5');
        break;
      
      case 'custom':
        this.secretKey = process.env.CUSTOM_CAPTCHA_SECRET_KEY || '';
        this.verificationEndpoint = process.env.CUSTOM_CAPTCHA_ENDPOINT || '';
        this.scoreThreshold = parseFloat(process.env.CUSTOM_CAPTCHA_THRESHOLD || '0.5');
        break;
      
      default:
        this.provider = 'recaptcha';
        this.secretKey = '';
        this.verificationEndpoint = 'https://www.google.com/recaptcha/api/siteverify';
        this.scoreThreshold = 0.5;
    }

    if (!this.secretKey) {
      safeLogger.warn('CAPTCHA secret key not configured. CAPTCHA verification will be skipped in development mode.');
    }
  }

  /**
   * Verify CAPTCHA token
   */
  async verifyToken(token: string, remoteIp?: string): Promise<{
    success: boolean;
    score?: number;
    challengeTs?: string;
    hostname?: string;
    errorCodes?: string[];
  }> {
    // Skip verification in development mode if no secret key is configured
    if (!this.secretKey && process.env.NODE_ENV !== 'production') {
      safeLogger.warn('CAPTCHA verification skipped (no secret key configured in development)');
      return {
        success: true,
        score: 1.0,
        challengeTs: new Date().toISOString(),
        hostname: 'localhost'
      };
    }

    if (!this.secretKey) {
      throw ModerationErrorHandler.handleBusinessLogicError(
        ModerationErrorType.CAPTCHA_VERIFICATION_FAILED,
        'CAPTCHA service not configured',
        { provider: this.provider }
      );
    }

    if (!token) {
      throw ModerationErrorHandler.handleCaptchaError(new Error('Token is required'));
    }

    try {
      const response = await fetch(this.verificationEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          secret: this.secretKey,
          response: token,
          ...(remoteIp && { remoteip: remoteIp })
        }),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`CAPTCHA verification failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        safeLogger.warn('CAPTCHA verification failed:', result['error-codes']);
        
        // Map error codes to specific error types
        if (result['error-codes']?.includes('invalid-input-response')) {
          throw ModerationErrorHandler.handleCaptchaError(
            new Error('Invalid CAPTCHA token')
          );
        }
        
        if (result['error-codes']?.includes('timeout-or-duplicate')) {
          throw ModerationErrorHandler.handleCaptchaError(
            new Error('CAPTCHA token expired')
          );
        }
        
        throw ModerationErrorHandler.handleCaptchaError(
          new Error('CAPTCHA verification failed')
        );
      }

      // Check score for reCAPTCHA v3 and Turnstile
      if (result.score !== undefined && result.score < this.scoreThreshold) {
        safeLogger.warn('CAPTCHA score below threshold:', {
          score: result.score,
          threshold: this.scoreThreshold
        });
        
        return {
          success: false,
          score: result.score,
          challengeTs: result.challenge_ts,
          hostname: result.hostname,
          errorCodes: ['score-below-threshold']
        };
      }

      safeLogger.info('CAPTCHA verified successfully:', {
        score: result.score,
        hostname: result.hostname
      });

      return {
        success: true,
        score: result.score,
        challengeTs: result.challenge_ts,
        hostname: result.hostname
      };

    } catch (error) {
      safeLogger.error('CAPTCHA verification error:', error);
      
      if (error instanceof ModerationErrorHandler || error.name === 'ModerationError') {
        throw error;
      }
      
      throw ModerationErrorHandler.wrapError(error, 'verifyCaptchaToken');
    }
  }

  /**
   * Verify CAPTCHA with enhanced validation
   */
  async verifyWithValidation(
    token: string,
    options: {
      remoteIp?: string;
      expectedHostname?: string;
      maxTokenAge?: number; // in milliseconds
      requireScore?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    score?: number;
    error?: string;
  }> {
    try {
      // Verify token
      const result = await this.verifyToken(token, options.remoteIp);

      if (!result.success) {
        return {
          success: false,
          score: result.score,
          error: result.errorCodes?.join(', ') || 'Verification failed'
        };
      }

      // Validate hostname if provided
      if (options.expectedHostname && result.hostname !== options.expectedHostname) {
        safeLogger.warn('CAPTCHA hostname mismatch:', {
          expected: options.expectedHostname,
          actual: result.hostname
        });
        
        return {
          success: false,
          score: result.score,
          error: 'Hostname mismatch'
        };
      }

      // Validate token age if provided
      if (options.maxTokenAge && result.challengeTs) {
        const tokenAge = Date.now() - new Date(result.challengeTs).getTime();
        
        if (tokenAge > options.maxTokenAge) {
          safeLogger.warn('CAPTCHA token expired:', {
            age: tokenAge,
            maxAge: options.maxTokenAge
          });
          
          return {
            success: false,
            score: result.score,
            error: 'Token expired'
          };
        }
      }

      // Check score if required
      if (options.requireScore && result.score === undefined) {
        return {
          success: false,
          error: 'Score not available'
        };
      }

      return {
        success: true,
        score: result.score
      };

    } catch (error) {
      safeLogger.error('CAPTCHA validation error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate a simple math-based CAPTCHA (for development/testing)
   */
  generateMathCaptcha(): {
    question: string;
    answer: number;
    token: string;
    expiresAt: Date;
  } {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const answer = num1 + num2;
    
    // Generate a simple token
    const token = Buffer.from(`${num1}:${num2}:${Date.now()}`).toString('base64');
    
    return {
      question: `${num1} + ${num2} = ?`,
      answer,
      token,
      expiresAt: new Date(Date.now() + 300000) // 5 minutes
    };
  }

  /**
   * Verify math-based CAPTCHA
   */
  verifyMathCaptcha(token: string, answer: number): boolean {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [num1, num2, timestamp] = decoded.split(':');
      
      // Check if expired (5 minutes)
      if (Date.now() - parseInt(timestamp) > 300000) {
        return false;
      }
      
      const expectedAnswer = parseInt(num1) + parseInt(num2);
      return answer === expectedAnswer;
      
    } catch (error) {
      safeLogger.error('Math CAPTCHA verification error:', error);
      return false;
    }
  }

  /**
   * Get CAPTCHA configuration for frontend
   */
  getFrontendConfig(): {
    provider: string;
    siteKey: string;
    scoreThreshold: number;
    version: 'v2' | 'v3';
  } {
    const siteKey = process.env.CAPTCHA_SITE_KEY || '';
    
    return {
      provider: this.provider,
      siteKey,
      scoreThreshold: this.scoreThreshold,
      version: this.provider === 'recaptcha' ? 'v3' : 'v2'
    };
  }

  /**
   * Check if CAPTCHA is enabled
   */
  isEnabled(): boolean {
    return !!this.secretKey || process.env.NODE_ENV !== 'production';
  }

  /**
   * Get current provider
   */
  getProvider(): string {
    return this.provider;
  }
}

export const captchaService = new CaptchaService();