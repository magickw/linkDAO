/**
 * Security Manager - Central Security Orchestrator
 * Integrates all security components for the enhanced social dashboard
 */

import InputSanitizer, { SanitizationConfig, SanitizedContent } from './inputSanitizer';
import MediaValidator, { MediaValidationConfig, MediaValidationResult } from './mediaValidator';
import LinkPreviewSecurity, { LinkPreviewConfig, LinkPreviewResult } from './linkPreviewSecurity';
import TokenTransactionSecurity, { TransactionValidationConfig, TransactionValidationResult } from './tokenTransactionSecurity';
import WalletSecurity, { WalletSecurityConfig, WalletSecurityResult } from './walletSecurity';
import { ethers } from 'ethers';

export interface SecurityManagerConfig {
  inputSanitization: Partial<SanitizationConfig>;
  mediaValidation: Partial<MediaValidationConfig>;
  linkPreview: Partial<LinkPreviewConfig>;
  transactionValidation: Partial<TransactionValidationConfig>;
  walletSecurity: Partial<WalletSecurityConfig>;
  enableAuditLogging: boolean;
  enableRealTimeMonitoring: boolean;
}

export interface SecurityValidationResult {
  valid: boolean;
  data?: any;
  errors: string[];
  warnings: string[];
  blocked: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

export interface SecurityContext {
  userId?: string;
  walletAddress?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export class SecurityManager {
  private static instance: SecurityManager;
  private config: SecurityManagerConfig;
  private initialized = false;

  private static readonly DEFAULT_CONFIG: SecurityManagerConfig = {
    inputSanitization: {
      allowMarkdown: true,
      maxLength: 10000,
      stripScripts: true
    },
    mediaValidation: {
      maxFileSize: 10 * 1024 * 1024,
      requireImageOptimization: true,
      scanForMalware: true
    },
    linkPreview: {
      enableSandbox: true,
      timeout: 10000,
      maxRedirects: 3
    },
    transactionValidation: {
      maxGasPrice: BigInt(ethers.utils.parseUnits('100', 'gwei').toString()),
      requireConfirmations: 1,
      enableSlippageProtection: true
    },
    walletSecurity: {
      sessionTimeout: 24 * 60 * 60 * 1000,
      requireReauth: true,
      encryptStorage: true
    },
    enableAuditLogging: true,
    enableRealTimeMonitoring: true
  };

  private constructor(config: Partial<SecurityManagerConfig> = {}) {
    this.config = { ...SecurityManager.DEFAULT_CONFIG, ...config };
  }

  public static getInstance(config?: Partial<SecurityManagerConfig>): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager(config);
    }
    return SecurityManager.instance;
  }

  /**
   * Initialize security manager
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize wallet security
      await WalletSecurity.initialize(this.config.walletSecurity);

      this.initialized = true;
      console.log('Security Manager initialized successfully');

    } catch (error) {
      console.error('Failed to initialize Security Manager:', error);
      throw error;
    }
  }

  /**
   * Validate rich content input
   */
  public async validateRichContent(
    content: string,
    context: SecurityContext,
    config?: Partial<SanitizationConfig>
  ): Promise<SecurityValidationResult> {
    try {
      const finalConfig = { ...this.config.inputSanitization, ...config };
      const result = InputSanitizer.sanitizeRichContent(content, finalConfig);

      // Additional validation
      const structureValidation = InputSanitizer.validateContentStructure(content, 'post');

      const errors = [...result.blocked];
      const warnings = [...result.warnings, ...structureValidation.warnings];

      if (!structureValidation.valid) {
        errors.push(...structureValidation.errors);
      }

      const riskLevel = this.calculateRiskLevel(errors, warnings);

      return {
        valid: errors.length === 0,
        data: result.sanitized,
        errors,
        warnings,
        blocked: result.blocked,
        riskLevel,
        recommendations: this.generateRecommendations(errors, warnings, 'content')
      };

    } catch (error) {
      return {
        valid: false,
        errors: [`Content validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        blocked: [],
        riskLevel: 'critical',
        recommendations: ['Content validation failed - do not proceed']
      };
    }
  }

  /**
   * Validate hashtags and mentions
   */
  public async validateHashtagsAndMentions(
    input: string,
    context: SecurityContext
  ): Promise<SecurityValidationResult> {
    try {
      const result = InputSanitizer.sanitizeHashtagsAndMentions(input);

      const errors = [...result.blocked];
      const warnings = [...result.warnings];
      const riskLevel = this.calculateRiskLevel(errors, warnings);

      return {
        valid: errors.length === 0,
        data: result.sanitized,
        errors,
        warnings,
        blocked: result.blocked,
        riskLevel,
        recommendations: this.generateRecommendations(errors, warnings, 'hashtags')
      };

    } catch (error) {
      return {
        valid: false,
        errors: [`Hashtag/mention validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        blocked: [],
        riskLevel: 'critical',
        recommendations: ['Validation failed - do not proceed']
      };
    }
  }

  /**
   * Validate media upload
   */
  public async validateMediaUpload(
    file: File,
    context: SecurityContext,
    config?: Partial<MediaValidationConfig>
  ): Promise<SecurityValidationResult> {
    try {
      const finalConfig = { ...this.config.mediaValidation, ...config };
      const result = await MediaValidator.validateMedia(file, finalConfig);

      const errors = [...result.errors];
      const warnings = [...result.warnings];
      const riskLevel = this.calculateRiskLevel(errors, warnings);

      return {
        valid: result.valid,
        data: result.file,
        errors,
        warnings,
        blocked: [],
        riskLevel,
        recommendations: this.generateRecommendations(errors, warnings, 'media')
      };

    } catch (error) {
      return {
        valid: false,
        errors: [`Media validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        blocked: [],
        riskLevel: 'critical',
        recommendations: ['Media validation failed - do not proceed']
      };
    }
  }

  /**
   * Process media securely
   */
  public async processMediaSecurely(
    file: File,
    context: SecurityContext
  ): Promise<SecurityValidationResult> {
    try {
      // First validate the media
      const validation = await this.validateMediaUpload(file, context);
      if (!validation.valid) {
        return validation;
      }

      // Process the media
      const processed = await MediaValidator.processMedia(file);

      return {
        valid: true,
        data: processed,
        errors: [],
        warnings: [],
        blocked: [],
        riskLevel: 'low',
        recommendations: ['Media processed successfully']
      };

    } catch (error) {
      return {
        valid: false,
        errors: [`Media processing error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        blocked: [],
        riskLevel: 'critical',
        recommendations: ['Media processing failed - do not proceed']
      };
    }
  }

  /**
   * Generate secure link preview
   */
  public async generateSecureLinkPreview(
    url: string,
    context: SecurityContext,
    config?: Partial<LinkPreviewConfig>
  ): Promise<SecurityValidationResult> {
    try {
      const finalConfig = { ...this.config.linkPreview, ...config };
      const result = await LinkPreviewSecurity.generatePreview(url, finalConfig);

      const errors = [...result.security.blocked];
      const warnings = [...result.security.warnings];
      const riskLevel = result.security.safe ? 'low' : 'high';

      return {
        valid: result.security.safe,
        data: result,
        errors,
        warnings,
        blocked: result.security.blocked,
        riskLevel,
        recommendations: this.generateRecommendations(errors, warnings, 'link_preview')
      };

    } catch (error) {
      return {
        valid: false,
        errors: [`Link preview error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        blocked: [],
        riskLevel: 'critical',
        recommendations: ['Link preview generation failed - do not proceed']
      };
    }
  }

  /**
   * Validate token transaction
   */
  public async validateTokenTransaction(
    transaction: ethers.providers.TransactionRequest,
    provider: ethers.providers.Provider,
    context: SecurityContext,
    config?: Partial<TransactionValidationConfig>
  ): Promise<SecurityValidationResult> {
    try {
      const finalConfig = { ...this.config.transactionValidation, ...config };
      const result = await TokenTransactionSecurity.validateTransaction(
        transaction,
        provider,
        finalConfig
      );

      const errors = [...result.errors];
      const warnings = [...result.warnings];
      const riskLevel = result.security.riskLevel;

      return {
        valid: result.valid,
        data: result.transaction,
        errors,
        warnings,
        blocked: [],
        riskLevel,
        recommendations: result.security.recommendations
      };

    } catch (error) {
      return {
        valid: false,
        errors: [`Transaction validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        blocked: [],
        riskLevel: 'critical',
        recommendations: ['Transaction validation failed - do not proceed']
      };
    }
  }

  /**
   * Create secure wallet session
   */
  public async createSecureWalletSession(
    walletAddress: string,
    networkId: number,
    provider: ethers.providers.Provider,
    context: SecurityContext,
    config?: Partial<WalletSecurityConfig>
  ): Promise<SecurityValidationResult> {
    try {
      const finalConfig = { ...this.config.walletSecurity, ...config };
      const result = await WalletSecurity.createSession(
        walletAddress,
        networkId,
        provider,
        finalConfig
      );

      const errors = [...result.errors];
      const warnings = [...result.warnings];
      const riskLevel = this.calculateRiskLevel(errors, warnings);

      return {
        valid: result.success,
        data: result.session,
        errors,
        warnings,
        blocked: [],
        riskLevel,
        recommendations: this.generateRecommendations(errors, warnings, 'wallet_session')
      };

    } catch (error) {
      return {
        valid: false,
        errors: [`Wallet session error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        blocked: [],
        riskLevel: 'critical',
        recommendations: ['Wallet session creation failed - do not proceed']
      };
    }
  }

  /**
   * Validate wallet session
   */
  public async validateWalletSession(
    sessionId: string,
    context: SecurityContext
  ): Promise<SecurityValidationResult> {
    try {
      const result = await WalletSecurity.validateSession(sessionId);

      const errors = [...result.errors];
      const warnings = [...result.warnings];
      const riskLevel = this.calculateRiskLevel(errors, warnings);

      return {
        valid: result.success,
        data: result.session,
        errors,
        warnings,
        blocked: [],
        riskLevel,
        recommendations: this.generateRecommendations(errors, warnings, 'session_validation')
      };

    } catch (error) {
      return {
        valid: false,
        errors: [`Session validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        blocked: [],
        riskLevel: 'critical',
        recommendations: ['Session validation failed - please re-authenticate']
      };
    }
  }

  /**
   * Comprehensive security scan
   */
  public async performSecurityScan(
    data: {
      content?: string;
      media?: File[];
      urls?: string[];
      transaction?: ethers.providers.TransactionRequest;
    },
    context: SecurityContext,
    provider?: ethers.providers.Provider
  ): Promise<SecurityValidationResult> {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    const allBlocked: string[] = [];
    const results: SecurityValidationResult[] = [];

    try {
      // Scan content
      if (data.content) {
        const contentResult = await this.validateRichContent(data.content, context);
        results.push(contentResult);
        allErrors.push(...contentResult.errors);
        allWarnings.push(...contentResult.warnings);
        allBlocked.push(...contentResult.blocked);
      }

      // Scan media
      if (data.media && data.media.length > 0) {
        for (const file of data.media) {
          const mediaResult = await this.validateMediaUpload(file, context);
          results.push(mediaResult);
          allErrors.push(...mediaResult.errors);
          allWarnings.push(...mediaResult.warnings);
          allBlocked.push(...mediaResult.blocked);
        }
      }

      // Scan URLs
      if (data.urls && data.urls.length > 0) {
        for (const url of data.urls) {
          const urlResult = await this.generateSecureLinkPreview(url, context);
          results.push(urlResult);
          allErrors.push(...urlResult.errors);
          allWarnings.push(...urlResult.warnings);
          allBlocked.push(...urlResult.blocked);
        }
      }

      // Scan transaction
      if (data.transaction && provider) {
        const txResult = await this.validateTokenTransaction(data.transaction, provider, context);
        results.push(txResult);
        allErrors.push(...txResult.errors);
        allWarnings.push(...txResult.warnings);
        allBlocked.push(...txResult.blocked);
      }

      const overallRiskLevel = this.calculateOverallRiskLevel(results);

      return {
        valid: allErrors.length === 0,
        data: { results },
        errors: allErrors,
        warnings: allWarnings,
        blocked: allBlocked,
        riskLevel: overallRiskLevel,
        recommendations: this.generateRecommendations(allErrors, allWarnings, 'comprehensive_scan')
      };

    } catch (error) {
      return {
        valid: false,
        errors: [`Security scan error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: allWarnings,
        blocked: allBlocked,
        riskLevel: 'critical',
        recommendations: ['Security scan failed - do not proceed']
      };
    }
  }

  /**
   * Helper methods
   */
  private calculateRiskLevel(errors: string[], warnings: string[]): 'low' | 'medium' | 'high' | 'critical' {
    if (errors.length > 0) return 'critical';
    if (warnings.length > 3) return 'high';
    if (warnings.length > 1) return 'medium';
    return 'low';
  }

  private calculateOverallRiskLevel(results: SecurityValidationResult[]): 'low' | 'medium' | 'high' | 'critical' {
    const riskLevels = results.map(r => r.riskLevel);
    
    if (riskLevels.includes('critical')) return 'critical';
    if (riskLevels.includes('high')) return 'high';
    if (riskLevels.includes('medium')) return 'medium';
    return 'low';
  }

  private generateRecommendations(
    errors: string[],
    warnings: string[],
    context: string
  ): string[] {
    const recommendations: string[] = [];

    if (errors.length > 0) {
      recommendations.push('Critical security issues detected - do not proceed');
      recommendations.push('Review and fix all errors before continuing');
    }

    if (warnings.length > 0) {
      recommendations.push('Security warnings detected - review carefully');
    }

    switch (context) {
      case 'content':
        if (warnings.length > 0) {
          recommendations.push('Consider simplifying content or removing problematic elements');
        }
        break;
      case 'media':
        if (warnings.length > 0) {
          recommendations.push('Consider using different media files or formats');
        }
        break;
      case 'link_preview':
        if (warnings.length > 0) {
          recommendations.push('Verify the safety of the linked content');
        }
        break;
      case 'wallet_session':
        if (warnings.length > 0) {
          recommendations.push('Consider re-authenticating or switching networks');
        }
        break;
    }

    if (recommendations.length === 0) {
      recommendations.push('Security validation passed - safe to proceed');
    }

    return recommendations;
  }

  /**
   * Get security status
   */
  public getSecurityStatus(): {
    initialized: boolean;
    config: SecurityManagerConfig;
    timestamp: Date;
  } {
    return {
      initialized: this.initialized,
      config: this.config,
      timestamp: new Date()
    };
  }
}

export default SecurityManager;