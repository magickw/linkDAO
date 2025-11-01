import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { KYCVerificationService, KYCVerificationRequest } from '../services/kycVerificationService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';

export class KYCController {
  private kycService: KYCVerificationService;

  constructor(kycService: KYCVerificationService) {
    this.kycService = kycService;
  }

  public initiateVerification = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, personalInfo, documents, verificationLevel = 'basic' } = req.body;

      // Comprehensive validation
      if (!userId || !personalInfo || !documents) {
        res.status(400).json({
          error: 'Missing required fields: userId, personalInfo, documents'
        });
        return;
      }

      // Validate personal info
      const requiredPersonalFields = ['firstName', 'lastName', 'email', 'dateOfBirth', 'nationality'];
      for (const field of requiredPersonalFields) {
        if (!personalInfo[field]) {
          res.status(400).json({
            error: `Missing required personal info field: ${field}`
          });
          return;
        }
      }

      // Validate address
      if (!personalInfo.address || !personalInfo.address.street || !personalInfo.address.city || !personalInfo.address.country) {
        res.status(400).json({
          error: 'Missing required address fields: street, city, country'
        });
        return;
      }

      // Validate documents
      if (!Array.isArray(documents) || documents.length === 0) {
        res.status(400).json({
          error: 'At least one document is required'
        });
        return;
      }

      for (const doc of documents) {
        if (!doc.type || !doc.frontImage || !doc.country) {
          res.status(400).json({
            error: 'Each document must have type, frontImage, and country'
          });
          return;
        }

        if (!['passport', 'drivers_license', 'national_id', 'utility_bill', 'bank_statement'].includes(doc.type)) {
          res.status(400).json({
            error: 'Invalid document type'
          });
          return;
        }
      }

      // Validate verification level
      if (!['basic', 'enhanced', 'premium'].includes(verificationLevel)) {
        res.status(400).json({
          error: 'Invalid verification level'
        });
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(personalInfo.email)) {
        res.status(400).json({
          error: 'Invalid email format'
        });
        return;
      }

      // Date of birth validation (must be 18+ years old)
      const dob = new Date(personalInfo.dateOfBirth);
      const eighteenYearsAgo = new Date();
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
      
      if (dob > eighteenYearsAgo) {
        res.status(400).json({
          error: 'User must be at least 18 years old'
        });
        return;
      }

      const request: KYCVerificationRequest = {
        userId,
        personalInfo,
        documents,
        verificationLevel,
      };

      const result = await this.kycService.initiateVerification(request);

      res.status(200).json({
        success: true,
        verificationId: result.id,
        status: result.status,
        verificationLevel: result.verificationLevel,
        expiresAt: result.expiresAt,
        nextSteps: this.getNextSteps(result.status, verificationLevel),
      });
    } catch (error) {
      safeLogger.error('KYC initiation error:', error);
      res.status(500).json({
        error: 'Failed to initiate KYC verification',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  public getVerificationStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { verificationId } = req.params;

      if (!verificationId) {
        res.status(400).json({
          error: 'Missing verification ID'
        });
        return;
      }

      const verification = await this.kycService.getVerificationStatus(verificationId);

      if (!verification) {
        res.status(404).json({
          error: 'Verification not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        verification: {
          id: verification.id,
          status: verification.status,
          verificationLevel: verification.verificationLevel,
          riskScore: verification.riskScore,
          reasons: verification.reasons,
          documents: verification.documents.map(doc => ({
            type: doc.type,
            status: doc.status,
            // Don't expose extracted data for security
          })),
          createdAt: verification.createdAt,
          updatedAt: verification.updatedAt,
          expiresAt: verification.expiresAt,
        },
        nextSteps: this.getNextSteps(verification.status, verification.verificationLevel),
      });
    } catch (error) {
      safeLogger.error('KYC status retrieval error:', error);
      res.status(500).json({
        error: 'Failed to retrieve verification status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  public getUserVerificationStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          error: 'Missing user ID'
        });
        return;
      }

      const verification = await this.kycService.getUserVerificationStatus(userId);

      if (!verification) {
        res.status(200).json({
          success: true,
          verified: false,
          verificationLevel: 'none',
          limits: this.kycService.getPurchaseLimits('none'),
          recommendations: this.getVerificationRecommendations('none'),
        });
        return;
      }

      res.status(200).json({
        success: true,
        verified: verification.status === 'approved',
        verificationLevel: verification.verificationLevel,
        status: verification.status,
        limits: this.kycService.getPurchaseLimits(verification.verificationLevel),
        lastVerified: verification.updatedAt,
        expiresAt: verification.expiresAt,
        riskScore: verification.riskScore,
        recommendations: this.getVerificationRecommendations(verification.verificationLevel),
      });
    } catch (error) {
      safeLogger.error('User KYC status retrieval error:', error);
      res.status(500).json({
        error: 'Failed to retrieve user verification status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  public checkVerificationRequirement = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, amount } = req.body;

      if (!userId || !amount) {
        res.status(400).json({
          error: 'Missing required fields: userId, amount'
        });
        return;
      }

      if (amount <= 0) {
        res.status(400).json({
          error: 'Amount must be greater than 0'
        });
        return;
      }

      if (amount > 1000000) { // $1M limit
        res.status(400).json({
          error: 'Amount exceeds maximum allowed limit'
        });
        return;
      }

      const isRequired = await this.kycService.isVerificationRequired(userId, amount);
      const requiredLevel = await this.kycService.getRequiredVerificationLevel(amount);
      const currentVerification = await this.kycService.getUserVerificationStatus(userId);

      res.status(200).json({
        success: true,
        verificationRequired: isRequired,
        requiredLevel,
        currentLevel: currentVerification?.verificationLevel || 'none',
        currentStatus: currentVerification?.status || 'none',
        limits: this.kycService.getPurchaseLimits(requiredLevel),
        upgradeNeeded: isRequired && (!currentVerification || currentVerification.verificationLevel !== requiredLevel),
        estimatedTime: this.getEstimatedVerificationTime(requiredLevel),
      });
    } catch (error) {
      safeLogger.error('KYC requirement check error:', error);
      res.status(500).json({
        error: 'Failed to check verification requirement',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  public getPurchaseLimits = async (req: Request, res: Response): Promise<void> => {
    try {
      const { level = 'none' } = req.params;

      if (!['none', 'basic', 'enhanced', 'premium'].includes(level)) {
        res.status(400).json({
          error: 'Invalid verification level. Must be: none, basic, enhanced, or premium'
        });
        return;
      }

      const limits = this.kycService.getPurchaseLimits(level as any);
      const allLimits = {
        none: this.kycService.getPurchaseLimits('none'),
        basic: this.kycService.getPurchaseLimits('basic'),
        enhanced: this.kycService.getPurchaseLimits('enhanced'),
        premium: this.kycService.getPurchaseLimits('premium'),
      };

      res.status(200).json({
        success: true,
        currentLevel: level,
        limits,
        allLimits,
        benefits: this.getVerificationBenefits(level as any),
      });
    } catch (error) {
      safeLogger.error('KYC limits retrieval error:', error);
      res.status(500).json({
        error: 'Failed to retrieve limits',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  public generateComplianceReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          error: 'Missing user ID'
        });
        return;
      }

      const report = await this.kycService.generateComplianceReport(userId);

      if (!report) {
        res.status(404).json({
          error: 'No verification found for user'
        });
        return;
      }

      res.status(200).json({
        success: true,
        report: {
          ...report,
          generatedAt: new Date(),
          reportId: `compliance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        },
      });
    } catch (error) {
      safeLogger.error('Compliance report generation error:', error);
      res.status(500).json({
        error: 'Failed to generate compliance report',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  public handleWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const provider = req.params.provider;
      const signature = this.getWebhookSignature(req, provider);
      
      if (!signature) {
        res.status(400).json({ error: 'Missing signature' });
        return;
      }

      if (!['jumio', 'onfido', 'sumsub'].includes(provider)) {
        res.status(400).json({ error: 'Invalid provider' });
        return;
      }

      const event = await this.kycService.handleWebhook(req.body.toString(), signature, provider);
      
      if (!event) {
        res.status(400).json({ error: 'Invalid webhook' });
        return;
      }

      res.status(200).json({ 
        received: true,
        eventType: event.type,
        timestamp: event.timestamp,
      });
    } catch (error) {
      safeLogger.error('KYC webhook error:', error);
      res.status(500).json({ 
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  private getWebhookSignature(req: Request, provider: string): string | null {
    switch (provider) {
      case 'jumio':
        return req.headers['x-jumio-signature'] as string;
      case 'onfido':
        return req.headers['x-sha1-signature'] as string;
      case 'sumsub':
        return req.headers['x-payload-digest'] as string;
      default:
        return null;
    }
  }

  private getNextSteps(status: string, level: string): string[] {
    const steps: string[] = [];

    switch (status) {
      case 'pending':
        steps.push('Your verification is being processed');
        steps.push('You will receive an email notification when complete');
        steps.push('Processing typically takes 1-3 business days');
        break;
      case 'approved':
        steps.push('Verification complete! You can now make purchases');
        steps.push(`Your ${level} verification level is active`);
        if (level !== 'premium') {
          steps.push('Consider upgrading to a higher level for increased limits');
        }
        break;
      case 'rejected':
        steps.push('Please review the rejection reasons');
        steps.push('You can resubmit with corrected documents');
        steps.push('Contact support if you need assistance');
        break;
      case 'requires_review':
        steps.push('Your verification requires manual review');
        steps.push('This may take 3-5 business days');
        steps.push('No action needed from you at this time');
        break;
    }

    return steps;
  }

  private getVerificationRecommendations(level: string): string[] {
    const recommendations: string[] = [];

    switch (level) {
      case 'none':
        recommendations.push('Complete basic verification to increase your purchase limits');
        recommendations.push('Basic verification only requires a government ID');
        recommendations.push('Verification typically completes within 24 hours');
        break;
      case 'basic':
        recommendations.push('Upgrade to enhanced verification for higher limits');
        recommendations.push('Enhanced verification includes address verification');
        recommendations.push('Unlock premium features with enhanced verification');
        break;
      case 'enhanced':
        recommendations.push('Consider premium verification for maximum limits');
        recommendations.push('Premium verification includes income verification');
        recommendations.push('Access exclusive features and priority support');
        break;
      case 'premium':
        recommendations.push('You have the highest verification level');
        recommendations.push('Enjoy maximum purchase limits and all features');
        recommendations.push('Remember to keep your information updated');
        break;
    }

    return recommendations;
  }

  private getVerificationBenefits(level: string): string[] {
    const benefits: string[] = [];

    switch (level) {
      case 'none':
        benefits.push('Limited purchase amounts');
        benefits.push('Basic platform access');
        break;
      case 'basic':
        benefits.push('Increased daily and monthly limits');
        benefits.push('Access to standard features');
        benefits.push('Email support');
        break;
      case 'enhanced':
        benefits.push('Higher purchase limits');
        benefits.push('Access to premium features');
        benefits.push('Priority customer support');
        benefits.push('Advanced trading tools');
        break;
      case 'premium':
        benefits.push('Maximum purchase limits');
        benefits.push('All platform features');
        benefits.push('Dedicated account manager');
        benefits.push('Exclusive investment opportunities');
        benefits.push('Priority transaction processing');
        break;
    }

    return benefits;
  }

  private getEstimatedVerificationTime(level: string): string {
    const times = {
      basic: '1-24 hours',
      enhanced: '1-3 business days',
      premium: '3-5 business days',
    };

    return times[level as keyof typeof times] || '1-3 business days';
  }
}