import axios from 'axios';
import crypto from 'crypto';

export interface KYCConfig {
  provider: 'jumio' | 'onfido' | 'sumsub';
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  webhookSecret: string;
}

export interface KYCDocument {
  type: 'passport' | 'drivers_license' | 'national_id' | 'utility_bill' | 'bank_statement';
  frontImage: string; // base64 or file path
  backImage?: string; // base64 or file path
  country: string;
}

export interface KYCPersonalInfo {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  nationality: string;
  address: {
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  phoneNumber?: string;
  email: string;
}

export interface KYCVerificationRequest {
  userId: string;
  personalInfo: KYCPersonalInfo;
  documents: KYCDocument[];
  verificationLevel: 'basic' | 'enhanced' | 'premium';
}

export interface KYCVerificationResult {
  id: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected' | 'requires_review';
  verificationLevel: 'basic' | 'enhanced' | 'premium';
  riskScore?: number;
  reasons?: string[];
  documents: {
    type: string;
    status: 'verified' | 'rejected' | 'pending';
    extractedData?: Record<string, any>;
  }[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export interface KYCLimits {
  daily: number;
  monthly: number;
  yearly: number;
  lifetime: number;
}

export interface KYCWebhookEvent {
  type: string;
  verificationId: string;
  userId: string;
  status: string;
  data: any;
  timestamp: string;
}

export class KYCVerificationService {
  private config: KYCConfig;
  private verifications: Map<string, KYCVerificationResult> = new Map();

  constructor(config: KYCConfig) {
    this.config = config;
  }

  public async initiateVerification(request: KYCVerificationRequest): Promise<KYCVerificationResult> {
    try {
      const verificationId = `kyc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const verification: KYCVerificationResult = {
        id: verificationId,
        userId: request.userId,
        status: 'pending',
        verificationLevel: request.verificationLevel,
        documents: request.documents.map(doc => ({
          type: doc.type,
          status: 'pending',
        })),
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      };

      // Store verification
      this.verifications.set(verificationId, verification);

      // Submit to KYC provider
      const providerResult = await this.submitToProvider(request, verificationId);
      
      if (providerResult) {
        verification.status = providerResult.status as 'pending' | 'approved' | 'rejected' | 'requires_review';
        verification.riskScore = providerResult.riskScore;
        verification.reasons = providerResult.reasons;
        verification.updatedAt = new Date();
        
        this.verifications.set(verificationId, verification);
      }

      return verification;
    } catch (error) {
      console.error('KYC verification initiation error:', error);
      throw new Error('Failed to initiate KYC verification');
    }
  }

  private async submitToProvider(
    request: KYCVerificationRequest, 
    verificationId: string
  ): Promise<{ status: string; riskScore?: number; reasons?: string[] } | null> {
    switch (this.config.provider) {
      case 'jumio':
        return await this.submitToJumio(request, verificationId);
      case 'onfido':
        return await this.submitToOnfido(request, verificationId);
      case 'sumsub':
        return await this.submitToSumsub(request, verificationId);
      default:
        throw new Error(`Unsupported KYC provider: ${this.config.provider}`);
    }
  }

  private async submitToJumio(
    request: KYCVerificationRequest,
    verificationId: string
  ): Promise<{ status: string; riskScore?: number; reasons?: string[] } | null> {
    try {
      const headers = {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'LDAO-KYC-Service/1.0',
      };

      const payload = {
        customerInternalReference: request.userId,
        workflowId: this.getWorkflowId(request.verificationLevel),
        userReference: verificationId,
        callbackUrl: `${process.env.BACKEND_URL}/api/kyc/webhook/jumio`,
        successUrl: `${process.env.FRONTEND_URL}/kyc/success`,
        errorUrl: `${process.env.FRONTEND_URL}/kyc/error`,
      };

      const response = await axios.post(
        `${this.config.baseUrl}/initiate`,
        payload,
        { headers, timeout: 15000 }
      );

      return {
        status: 'pending',
        riskScore: 0,
      };
    } catch (error) {
      console.error('Jumio submission error:', error);
      return null;
    }
  }

  private async submitToOnfido(
    request: KYCVerificationRequest,
    verificationId: string
  ): Promise<{ status: string; riskScore?: number; reasons?: string[] } | null> {
    try {
      const headers = {
        'Authorization': `Token token=${this.config.apiKey}`,
        'Content-Type': 'application/json',
      };

      // Create applicant
      const applicantPayload = {
        first_name: request.personalInfo.firstName,
        last_name: request.personalInfo.lastName,
        email: request.personalInfo.email,
        dob: request.personalInfo.dateOfBirth,
        address: {
          flat_number: '',
          building_number: request.personalInfo.address.street.split(' ')[0],
          building_name: '',
          street: request.personalInfo.address.street,
          sub_street: '',
          town: request.personalInfo.address.city,
          state: request.personalInfo.address.state || '',
          postcode: request.personalInfo.address.postalCode,
          country: request.personalInfo.address.country,
        },
      };

      const applicantResponse = await axios.post(
        `${this.config.baseUrl}/applicants`,
        applicantPayload,
        { headers, timeout: 15000 }
      );

      const applicantId = applicantResponse.data.id;

      // Create check
      const checkPayload = {
        applicant_id: applicantId,
        report_names: this.getOnfidoReports(request.verificationLevel),
        webhook_ids: [`${process.env.BACKEND_URL}/api/kyc/webhook/onfido`],
      };

      const checkResponse = await axios.post(
        `${this.config.baseUrl}/checks`,
        checkPayload,
        { headers, timeout: 15000 }
      );

      return {
        status: 'pending',
        riskScore: 0,
      };
    } catch (error) {
      console.error('Onfido submission error:', error);
      return null;
    }
  }

  private async submitToSumsub(
    request: KYCVerificationRequest,
    verificationId: string
  ): Promise<{ status: string; riskScore?: number; reasons?: string[] } | null> {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const method = 'POST';
      const url = '/resources/applicants';
      const body = JSON.stringify({
        externalUserId: request.userId,
        info: {
          firstName: request.personalInfo.firstName,
          lastName: request.personalInfo.lastName,
          dob: request.personalInfo.dateOfBirth,
          country: request.personalInfo.address.country,
        },
      });

      const signature = this.generateSumsubSignature(method, url, body, timestamp);

      const headers = {
        'X-App-Token': this.config.apiKey,
        'X-App-Access-Sig': signature,
        'X-App-Access-Ts': timestamp.toString(),
        'Content-Type': 'application/json',
      };

      const response = await axios.post(
        `${this.config.baseUrl}${url}`,
        body,
        { headers, timeout: 15000 }
      );

      return {
        status: 'pending',
        riskScore: 0,
      };
    } catch (error) {
      console.error('Sumsub submission error:', error);
      return null;
    }
  }

  private generateSumsubSignature(method: string, url: string, body: string, timestamp: number): string {
    const payload = `${timestamp}${method}${url}${body}`;
    return crypto
      .createHmac('sha256', this.config.apiSecret)
      .update(payload)
      .digest('hex');
  }

  private getWorkflowId(level: string): string {
    const workflows = {
      basic: 'basic_kyc_workflow',
      enhanced: 'enhanced_kyc_workflow',
      premium: 'premium_kyc_workflow',
    };
    return workflows[level as keyof typeof workflows] || workflows.basic;
  }

  private getOnfidoReports(level: string): string[] {
    const reports = {
      basic: ['document', 'facial_similarity_photo'],
      enhanced: ['document', 'facial_similarity_photo', 'watchlist'],
      premium: ['document', 'facial_similarity_photo', 'watchlist', 'proof_of_address'],
    };
    return reports[level as keyof typeof reports] || reports.basic;
  }

  public async getVerificationStatus(verificationId: string): Promise<KYCVerificationResult | null> {
    return this.verifications.get(verificationId) || null;
  }

  public async getUserVerificationStatus(userId: string): Promise<KYCVerificationResult | null> {
    for (const verification of this.verifications.values()) {
      if (verification.userId === userId && verification.status === 'approved') {
        return verification;
      }
    }
    return null;
  }

  public async updateVerificationStatus(
    verificationId: string,
    status: 'pending' | 'approved' | 'rejected' | 'requires_review',
    reasons?: string[],
    riskScore?: number
  ): Promise<boolean> {
    const verification = this.verifications.get(verificationId);
    if (!verification) {
      return false;
    }

    verification.status = status;
    verification.updatedAt = new Date();
    if (reasons) verification.reasons = reasons;
    if (riskScore !== undefined) verification.riskScore = riskScore;

    this.verifications.set(verificationId, verification);
    return true;
  }

  public async handleWebhook(payload: string, signature: string, provider: string): Promise<KYCWebhookEvent | null> {
    try {
      if (!this.verifyWebhookSignature(payload, signature, provider)) {
        console.error('Invalid webhook signature');
        return null;
      }

      const event = JSON.parse(payload);
      
      // Process the webhook event
      await this.processWebhookEvent(event, provider);

      return {
        type: event.type || event.eventType,
        verificationId: event.verificationId || event.id,
        userId: event.userId || event.externalUserId,
        status: event.status,
        data: event,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('KYC webhook handling error:', error);
      return null;
    }
  }

  private verifyWebhookSignature(payload: string, signature: string, provider: string): boolean {
    try {
      let expectedSignature: string;

      switch (provider) {
        case 'jumio':
          expectedSignature = crypto
            .createHmac('sha256', this.config.webhookSecret)
            .update(payload)
            .digest('hex');
          break;
        case 'onfido':
          expectedSignature = crypto
            .createHmac('sha1', this.config.webhookSecret)
            .update(payload)
            .digest('hex');
          break;
        case 'sumsub':
          expectedSignature = crypto
            .createHmac('sha256', this.config.webhookSecret)
            .update(payload)
            .digest('hex');
          break;
        default:
          return false;
      }

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      console.error('Webhook signature verification error:', error);
      return false;
    }
  }

  private async processWebhookEvent(event: any, provider: string): Promise<void> {
    try {
      const verificationId = event.verificationId || event.id;
      const status = this.normalizeStatus(event.status, provider);

      await this.updateVerificationStatus(
        verificationId,
        status,
        event.reasons || event.rejectionReasons,
        event.riskScore
      );

      // Trigger post-verification actions
      if (status === 'approved') {
        await this.handleVerificationApproved(verificationId);
      } else if (status === 'rejected') {
        await this.handleVerificationRejected(verificationId, event.reasons);
      }
    } catch (error) {
      console.error('Webhook event processing error:', error);
    }
  }

  private normalizeStatus(status: string, provider: string): 'approved' | 'rejected' | 'requires_review' | 'pending' {
    const statusMappings: Record<string, Record<string, string>> = {
      jumio: {
        'PASSED': 'approved',
        'FAILED': 'rejected',
        'PENDING': 'pending',
        'REVIEW': 'requires_review',
      },
      onfido: {
        'complete': 'approved',
        'clear': 'approved',
        'consider': 'requires_review',
        'unidentified': 'rejected',
      },
      sumsub: {
        'completed': 'approved',
        'rejected': 'rejected',
        'pending': 'pending',
        'onHold': 'requires_review',
      },
    };

    return statusMappings[provider]?.[status] as any || 'pending';
  }

  private async handleVerificationApproved(verificationId: string): Promise<void> {
    console.log(`KYC verification approved: ${verificationId}`);
    
    // In a real implementation, this would:
    // 1. Update user's verification status in database
    // 2. Increase purchase limits
    // 3. Send approval notification
    // 4. Enable premium features
  }

  private async handleVerificationRejected(verificationId: string, reasons?: string[]): Promise<void> {
    console.log(`KYC verification rejected: ${verificationId}`, reasons);
    
    // In a real implementation, this would:
    // 1. Update user's verification status in database
    // 2. Send rejection notification with reasons
    // 3. Provide guidance for resubmission
    // 4. Log rejection for compliance
  }

  public getPurchaseLimits(verificationLevel: 'none' | 'basic' | 'enhanced' | 'premium'): KYCLimits {
    const limits: Record<string, KYCLimits> = {
      none: { daily: 100, monthly: 500, yearly: 2000, lifetime: 5000 },
      basic: { daily: 1000, monthly: 5000, yearly: 25000, lifetime: 50000 },
      enhanced: { daily: 5000, monthly: 25000, yearly: 100000, lifetime: 250000 },
      premium: { daily: 25000, monthly: 100000, yearly: 500000, lifetime: 1000000 },
    };

    return limits[verificationLevel] || limits.none;
  }

  public async isVerificationRequired(userId: string, amount: number): Promise<boolean> {
    const userVerification = await this.getUserVerificationStatus(userId);
    
    if (!userVerification) {
      // No verification - check if amount exceeds unverified limits
      const limits = this.getPurchaseLimits('none');
      return amount > limits.daily;
    }

    const limits = this.getPurchaseLimits(userVerification.verificationLevel);
    
    // Check if amount exceeds current verification level limits
    return amount > limits.daily;
  }

  public async getRequiredVerificationLevel(amount: number): Promise<'basic' | 'enhanced' | 'premium'> {
    const basicLimits = this.getPurchaseLimits('basic');
    const enhancedLimits = this.getPurchaseLimits('enhanced');
    const premiumLimits = this.getPurchaseLimits('premium');

    if (amount <= basicLimits.daily) {
      return 'basic';
    } else if (amount <= enhancedLimits.daily) {
      return 'enhanced';
    } else {
      return 'premium';
    }
  }

  public async generateComplianceReport(userId: string): Promise<{
    userId: string;
    verificationStatus: string;
    verificationLevel: string;
    riskScore: number;
    lastVerified: Date;
    complianceFlags: string[];
  } | null> {
    const verification = await this.getUserVerificationStatus(userId);
    
    if (!verification) {
      return null;
    }

    return {
      userId,
      verificationStatus: verification.status,
      verificationLevel: verification.verificationLevel,
      riskScore: verification.riskScore || 0,
      lastVerified: verification.updatedAt,
      complianceFlags: verification.reasons || [],
    };
  }
}