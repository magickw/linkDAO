/**
 * CAPTCHA Integration Service
 * Handles CAPTCHA verification for suspicious activity prevention
 */

import axios from 'axios';
import crypto from 'crypto';
import { Request } from 'express';

export interface CaptchaVerificationResult {
  success: boolean;
  score?: number;
  action?: string;
  challengeTs?: string;
  hostname?: string;
  errorCodes?: string[];
}

export interface CaptchaChallenge {
  id: string;
  challenge: string;
  solution: string;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
}

export interface SimpleCaptchaOptions {
  width: number;
  height: number;
  length: number;
  noise: boolean;
  color: boolean;
}

export class CaptchaService {
  private static readonly RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
  private static readonly HCAPTCHA_VERIFY_URL = 'https://hcaptcha.com/siteverify';
  
  private static challenges: Map<string, CaptchaChallenge> = new Map();

  /**
   * Verify Google reCAPTCHA v2/v3 response
   */
  static async verifyRecaptcha(
    token: string,
    remoteIp?: string,
    expectedAction?: string
  ): Promise<CaptchaVerificationResult> {
    try {
      const secretKey = process.env.RECAPTCHA_SECRET_KEY;
      if (!secretKey) {
        throw new Error('reCAPTCHA secret key not configured');
      }

      const response = await axios.post(this.RECAPTCHA_VERIFY_URL, null, {
        params: {
          secret: secretKey,
          response: token,
          remoteip: remoteIp
        },
        timeout: 10000
      });

      const result = response.data;

      // For reCAPTCHA v3, check score and action
      if (result.success && result.score !== undefined) {
        // reCAPTCHA v3 verification
        const scoreThreshold = parseFloat(process.env.RECAPTCHA_SCORE_THRESHOLD || '0.5');
        
        if (result.score < scoreThreshold) {
          return {
            success: false,
            score: result.score,
            action: result.action,
            errorCodes: ['low-score']
          };
        }

        if (expectedAction && result.action !== expectedAction) {
          return {
            success: false,
            score: result.score,
            action: result.action,
            errorCodes: ['action-mismatch']
          };
        }
      }

      return {
        success: result.success,
        score: result.score,
        action: result.action,
        challengeTs: result.challenge_ts,
        hostname: result.hostname,
        errorCodes: result['error-codes'] || []
      };

    } catch (error) {
      console.error('reCAPTCHA verification error:', error);
      return {
        success: false,
        errorCodes: ['network-error']
      };
    }
  }

  /**
   * Verify hCaptcha response
   */
  static async verifyHcaptcha(
    token: string,
    remoteIp?: string
  ): Promise<CaptchaVerificationResult> {
    try {
      const secretKey = process.env.HCAPTCHA_SECRET_KEY;
      if (!secretKey) {
        throw new Error('hCaptcha secret key not configured');
      }

      const response = await axios.post(this.HCAPTCHA_VERIFY_URL, null, {
        params: {
          secret: secretKey,
          response: token,
          remoteip: remoteIp
        },
        timeout: 10000
      });

      const result = response.data;

      return {
        success: result.success,
        challengeTs: result.challenge_ts,
        hostname: result.hostname,
        errorCodes: result['error-codes'] || []
      };

    } catch (error) {
      console.error('hCaptcha verification error:', error);
      return {
        success: false,
        errorCodes: ['network-error']
      };
    }
  }

  /**
   * Generate simple text-based CAPTCHA
   */
  static generateSimpleCaptcha(options: Partial<SimpleCaptchaOptions> = {}): CaptchaChallenge {
    const opts: SimpleCaptchaOptions = {
      width: 200,
      height: 80,
      length: 5,
      noise: true,
      color: false,
      ...options
    };

    // Generate random text
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let solution = '';
    for (let i = 0; i < opts.length; i++) {
      solution += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    // Create challenge ID
    const challengeId = crypto.randomBytes(16).toString('hex');

    // Generate SVG CAPTCHA
    const challenge = this.generateSVGCaptcha(solution, opts);

    const captchaChallenge: CaptchaChallenge = {
      id: challengeId,
      challenge,
      solution,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      attempts: 0,
      maxAttempts: 3
    };

    // Store challenge
    this.challenges.set(challengeId, captchaChallenge);

    // Clean up expired challenges
    this.cleanupExpiredChallenges();

    return captchaChallenge;
  }

  /**
   * Verify simple CAPTCHA solution
   */
  static verifySimpleCaptcha(challengeId: string, solution: string): CaptchaVerificationResult {
    const challenge = this.challenges.get(challengeId);
    
    if (!challenge) {
      return {
        success: false,
        errorCodes: ['challenge-not-found']
      };
    }

    // Check if expired
    if (new Date() > challenge.expiresAt) {
      this.challenges.delete(challengeId);
      return {
        success: false,
        errorCodes: ['challenge-expired']
      };
    }

    // Check attempts
    challenge.attempts++;
    if (challenge.attempts > challenge.maxAttempts) {
      this.challenges.delete(challengeId);
      return {
        success: false,
        errorCodes: ['too-many-attempts']
      };
    }

    // Verify solution (case-insensitive)
    const isCorrect = challenge.solution.toLowerCase() === solution.toLowerCase();
    
    if (isCorrect) {
      this.challenges.delete(challengeId);
      return { success: true };
    } else {
      return {
        success: false,
        errorCodes: ['incorrect-solution']
      };
    }
  }

  /**
   * Generate mathematical CAPTCHA
   */
  static generateMathCaptcha(): CaptchaChallenge {
    const operations = ['+', '-', '*'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    let num1: number, num2: number, solution: number, question: string;

    switch (operation) {
      case '+':
        num1 = Math.floor(Math.random() * 50) + 1;
        num2 = Math.floor(Math.random() * 50) + 1;
        solution = num1 + num2;
        question = `${num1} + ${num2} = ?`;
        break;
      case '-':
        num1 = Math.floor(Math.random() * 50) + 25;
        num2 = Math.floor(Math.random() * 25) + 1;
        solution = num1 - num2;
        question = `${num1} - ${num2} = ?`;
        break;
      case '*':
        num1 = Math.floor(Math.random() * 10) + 1;
        num2 = Math.floor(Math.random() * 10) + 1;
        solution = num1 * num2;
        question = `${num1} × ${num2} = ?`;
        break;
      default:
        throw new Error('Invalid operation');
    }

    const challengeId = crypto.randomBytes(16).toString('hex');

    const captchaChallenge: CaptchaChallenge = {
      id: challengeId,
      challenge: question,
      solution: solution.toString(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      attempts: 0,
      maxAttempts: 3
    };

    this.challenges.set(challengeId, captchaChallenge);
    this.cleanupExpiredChallenges();

    return captchaChallenge;
  }

  /**
   * Generate word-based CAPTCHA
   */
  static generateWordCaptcha(): CaptchaChallenge {
    const words = [
      'apple', 'banana', 'cherry', 'dragon', 'elephant', 'forest', 'guitar', 'house',
      'island', 'jungle', 'kitten', 'lemon', 'mountain', 'ocean', 'piano', 'queen',
      'rainbow', 'sunset', 'tiger', 'umbrella', 'village', 'water', 'yellow', 'zebra'
    ];

    const word = words[Math.floor(Math.random() * words.length)];
    const challengeId = crypto.randomBytes(16).toString('hex');

    // Create a simple word puzzle
    const scrambled = word.split('').sort(() => Math.random() - 0.5).join('');
    const question = `Unscramble this word: ${scrambled.toUpperCase()}`;

    const captchaChallenge: CaptchaChallenge = {
      id: challengeId,
      challenge: question,
      solution: word,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      attempts: 0,
      maxAttempts: 3
    };

    this.challenges.set(challengeId, captchaChallenge);
    this.cleanupExpiredChallenges();

    return captchaChallenge;
  }

  /**
   * Determine if CAPTCHA is required based on request
   */
  static shouldRequireCaptcha(req: Request, riskScore: number = 0): boolean {
    // Always require CAPTCHA for high risk scores
    if (riskScore >= 80) return true;

    // Check for suspicious patterns
    const userAgent = req.get('User-Agent') || '';
    const suspiciousPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /curl/i, /wget/i, /python/i, /requests/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(userAgent)) return true;
    }

    // Check for missing common headers
    if (!req.get('Accept-Language') || !req.get('Accept-Encoding')) {
      return riskScore >= 50;
    }

    // Require CAPTCHA for medium risk scores during peak hours
    const hour = new Date().getHours();
    const isPeakHours = hour >= 9 && hour <= 17; // 9 AM to 5 PM
    
    if (isPeakHours && riskScore >= 60) return true;
    if (!isPeakHours && riskScore >= 70) return true;

    return false;
  }

  /**
   * Get CAPTCHA configuration for frontend
   */
  static getCaptchaConfig(): {
    recaptcha?: {
      siteKey: string;
      version: string;
    };
    hcaptcha?: {
      siteKey: string;
    };
    simple: boolean;
  } {
    const config: any = {
      simple: true
    };

    if (process.env.RECAPTCHA_SITE_KEY) {
      config.recaptcha = {
        siteKey: process.env.RECAPTCHA_SITE_KEY,
        version: process.env.RECAPTCHA_VERSION || 'v2'
      };
    }

    if (process.env.HCAPTCHA_SITE_KEY) {
      config.hcaptcha = {
        siteKey: process.env.HCAPTCHA_SITE_KEY
      };
    }

    return config;
  }

  /**
   * Generate SVG CAPTCHA image
   */
  private static generateSVGCaptcha(text: string, options: SimpleCaptchaOptions): string {
    const { width, height, noise, color } = options;
    
    // Generate random colors
    const textColor = color ? this.randomColor() : '#000000';
    const bgColor = color ? this.randomLightColor() : '#ffffff';
    
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<rect width="100%" height="100%" fill="${bgColor}"/>`;
    
    // Add noise lines if enabled
    if (noise) {
      for (let i = 0; i < 5; i++) {
        const x1 = Math.random() * width;
        const y1 = Math.random() * height;
        const x2 = Math.random() * width;
        const y2 = Math.random() * height;
        const lineColor = color ? this.randomColor() : '#cccccc';
        svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${lineColor}" stroke-width="1"/>`;
      }
    }
    
    // Add text
    const fontSize = Math.floor(height * 0.6);
    const letterSpacing = width / (text.length + 1);
    
    for (let i = 0; i < text.length; i++) {
      const x = letterSpacing * (i + 1);
      const y = height / 2 + fontSize / 3;
      const rotation = (Math.random() - 0.5) * 30; // Random rotation -15 to 15 degrees
      const charColor = color ? this.randomColor() : textColor;
      
      svg += `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${fontSize}" `;
      svg += `font-weight="bold" fill="${charColor}" text-anchor="middle" `;
      svg += `transform="rotate(${rotation} ${x} ${y})">${text[i]}</text>`;
    }
    
    svg += '</svg>';
    
    // Convert to base64 data URL
    const base64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
  }

  /**
   * Generate random color
   */
  private static randomColor(): string {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Generate random light color for background
   */
  private static randomLightColor(): string {
    const colors = ['#F8F9FA', '#E9ECEF', '#DEE2E6', '#CED4DA', '#ADB5BD'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Clean up expired challenges
   */
  private static cleanupExpiredChallenges(): void {
    const now = new Date();
    for (const [id, challenge] of this.challenges.entries()) {
      if (now > challenge.expiresAt) {
        this.challenges.delete(id);
      }
    }
  }

  /**
   * Get CAPTCHA statistics
   */
  static getCaptchaStats(): {
    activeChallenges: number;
    totalGenerated: number;
    successRate: number;
  } {
    // This would be enhanced with persistent storage in production
    return {
      activeChallenges: this.challenges.size,
      totalGenerated: 0, // Would track this with persistent storage
      successRate: 0 // Would calculate from historical data
    };
  }

  /**
   * Refresh CAPTCHA challenge
   */
  static refreshChallenge(challengeId: string, type: 'simple' | 'math' | 'word' = 'simple'): CaptchaChallenge | null {
    // Remove old challenge
    this.challenges.delete(challengeId);
    
    // Generate new challenge
    switch (type) {
      case 'math':
        return this.generateMathCaptcha();
      case 'word':
        return this.generateWordCaptcha();
      default:
        return this.generateSimpleCaptcha();
    }
  }
}

export default CaptchaService;