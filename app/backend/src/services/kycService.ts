import { DatabaseService } from './databaseService';
import { RedisService } from './redisService';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export interface KYCDocument {
  type: 'passport' | 'drivers_license' | 'national_id' | 'utility_bill' | 'bank_statement';
  url: string;
  uploadedAt: string;
  verified: boolean;
}

export interface KYCData {
  id: string;
  walletAddress: string;
  tier: 'basic' | 'intermediate' | 'advanced';
  status: 'none' | 'pending' | 'under_review' | 'approved' | 'rejected' | 'expired';
  documents: KYCDocument[];
  personalInfo?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    nationality?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
  };
  businessInfo?: {
    companyName?: string;
    registrationNumber?: string;
    businessType?: string;
    website?: string;
  };
  submittedAt: string;
  reviewedAt?: string;
  expiresAt?: string;
  rejectionReason?: string;
  reviewNotes?: string;
}

export class KYCService {
  private databaseService: DatabaseService;
  private redisService: RedisService;

  constructor() {
    this.databaseService = new DatabaseService();
    this.redisService = new RedisService();
  }

  /**
   * Initiate KYC verification process
   */
  async initiateKYC(walletAddress: string, tier: 'basic' | 'intermediate' | 'advanced', documents?: KYCDocument[]): Promise<KYCData> {
    const kycId = crypto.randomUUID();
    
    const kycData: KYCData = {
      id: kycId,
      walletAddress: walletAddress.toLowerCase(),
      tier,
      status: 'pending',
      documents: documents || [],
      submittedAt: new Date().toISOString()
    };

    // Store KYC data in Redis for quick access
    const kycKey = `kyc:${walletAddress.toLowerCase()}`;
    await this.redisService.setex(kycKey, 86400 * 30, JSON.stringify(kycData)); // 30 days

    // Update user's KYC status in database
    const db = this.databaseService.getDatabase();
    await db.update(users)
      .set({ 
        kycStatus: 'pending',
        updatedAt: new Date()
      } as any)
      .where(eq(users.walletAddress, walletAddress));

    return {
      ...kycData,
      requiredDocuments: this.getRequiredDocuments(tier),
      estimatedProcessingTime: this.getEstimatedProcessingTime(tier)
    } as any;
  }

  /**
   * Get KYC status for a user
   */
  async getKYCStatus(walletAddress: string): Promise<{
    status: string;
    tier: string;
    submittedAt?: string;
    reviewedAt?: string;
    expiresAt?: string;
    rejectionReason?: string;
    requiredDocuments?: string[];
    completedDocuments?: string[];
  }> {
    const kycKey = `kyc:${walletAddress.toLowerCase()}`;
    const kycData = await this.redisService.get(kycKey);

    if (!kycData) {
      return {
        status: 'none',
        tier: 'none'
      };
    }

    const data: KYCData = JSON.parse(kycData);
    const requiredDocs = this.getRequiredDocuments(data.tier);
    const completedDocs = data.documents.map(doc => doc.type);

    return {
      status: data.status,
      tier: data.tier,
      submittedAt: data.submittedAt,
      reviewedAt: data.reviewedAt,
      expiresAt: data.expiresAt,
      rejectionReason: data.rejectionReason,
      requiredDocuments: requiredDocs,
      completedDocuments: completedDocs
    };
  }

  /**
   * Upload KYC document
   */
  async uploadDocument(walletAddress: string, document: KYCDocument): Promise<void> {
    const kycKey = `kyc:${walletAddress.toLowerCase()}`;
    const kycData = await this.redisService.get(kycKey);

    if (!kycData) {
      throw new Error('KYC process not initiated');
    }

    const data: KYCData = JSON.parse(kycData);
    
    // Remove existing document of the same type
    data.documents = data.documents.filter(doc => doc.type !== document.type);
    
    // Add new document
    data.documents.push({
      ...document,
      uploadedAt: new Date().toISOString(),
      verified: false
    });

    // Check if all required documents are uploaded
    const requiredDocs = this.getRequiredDocuments(data.tier);
    const uploadedTypes = data.documents.map(doc => doc.type);
    const allDocsUploaded = requiredDocs.every(docType => uploadedTypes.includes(docType as any));

    if (allDocsUploaded && data.status === 'pending') {
      data.status = 'under_review';
      
      // Schedule automatic review (in a real implementation, this would trigger a review process)
      setTimeout(() => {
        this.processAutomaticReview(walletAddress);
      }, 1000 * 60 * 5); // 5 minutes delay for demo
    }

    await this.redisService.setex(kycKey, 86400 * 30, JSON.stringify(data));
  }

  /**
   * Update personal information
   */
  async updatePersonalInfo(walletAddress: string, personalInfo: KYCData['personalInfo']): Promise<void> {
    const kycKey = `kyc:${walletAddress.toLowerCase()}`;
    const kycData = await this.redisService.get(kycKey);

    if (!kycData) {
      throw new Error('KYC process not initiated');
    }

    const data: KYCData = JSON.parse(kycData);
    data.personalInfo = { ...data.personalInfo, ...personalInfo };

    await this.redisService.setex(kycKey, 86400 * 30, JSON.stringify(data));
  }

  /**
   * Update business information (for advanced KYC)
   */
  async updateBusinessInfo(walletAddress: string, businessInfo: KYCData['businessInfo']): Promise<void> {
    const kycKey = `kyc:${walletAddress.toLowerCase()}`;
    const kycData = await this.redisService.get(kycKey);

    if (!kycData) {
      throw new Error('KYC process not initiated');
    }

    const data: KYCData = JSON.parse(kycData);
    data.businessInfo = { ...data.businessInfo, ...businessInfo };

    await this.redisService.setex(kycKey, 86400 * 30, JSON.stringify(data));
  }

  /**
   * Approve KYC verification
   */
  async approveKYC(walletAddress: string, reviewNotes?: string): Promise<void> {
    const kycKey = `kyc:${walletAddress.toLowerCase()}`;
    const kycData = await this.redisService.get(kycKey);

    if (!kycData) {
      throw new Error('KYC data not found');
    }

    const data: KYCData = JSON.parse(kycData);
    data.status = 'approved';
    data.reviewedAt = new Date().toISOString();
    data.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year
    data.reviewNotes = reviewNotes;

    // Mark all documents as verified
    data.documents = data.documents.map(doc => ({ ...doc, verified: true }));

    await this.redisService.setex(kycKey, 86400 * 365, JSON.stringify(data)); // Store for 1 year

    // Update user's KYC status in database
    const db = this.databaseService.getDatabase();
    await db.update(users)
      .set({ 
        kycStatus: data.tier,
        updatedAt: new Date()
      } as any)
      .where(eq(users.walletAddress, walletAddress));
  }

  /**
   * Reject KYC verification
   */
  async rejectKYC(walletAddress: string, rejectionReason: string, reviewNotes?: string): Promise<void> {
    const kycKey = `kyc:${walletAddress.toLowerCase()}`;
    const kycData = await this.redisService.get(kycKey);

    if (!kycData) {
      throw new Error('KYC data not found');
    }

    const data: KYCData = JSON.parse(kycData);
    data.status = 'rejected';
    data.reviewedAt = new Date().toISOString();
    data.rejectionReason = rejectionReason;
    data.reviewNotes = reviewNotes;

    await this.redisService.setex(kycKey, 86400 * 30, JSON.stringify(data));

    // Update user's KYC status in database
    const db = this.databaseService.getDatabase();
    await db.update(users)
      .set({ 
        kycStatus: 'rejected',
        updatedAt: new Date()
      } as any)
      .where(eq(users.walletAddress, walletAddress));
  }

  /**
   * Get required documents for KYC tier
   */
  private getRequiredDocuments(tier: 'basic' | 'intermediate' | 'advanced'): string[] {
    const documentRequirements = {
      basic: ['national_id'],
      intermediate: ['national_id', 'utility_bill'],
      advanced: ['passport', 'utility_bill', 'bank_statement']
    };

    return documentRequirements[tier] || [];
  }

  /**
   * Get estimated processing time for KYC tier
   */
  private getEstimatedProcessingTime(tier: 'basic' | 'intermediate' | 'advanced'): string {
    const processingTimes = {
      basic: '1-2 business days',
      intermediate: '3-5 business days',
      advanced: '5-10 business days'
    };

    return processingTimes[tier] || '1-2 business days';
  }

  /**
   * Process automatic review (simplified for demo)
   */
  private async processAutomaticReview(walletAddress: string): Promise<void> {
    try {
      const kycStatus = await this.getKYCStatus(walletAddress);
      
      if (kycStatus.status === 'under_review') {
        // In a real implementation, this would involve AI/ML document verification
        // For demo purposes, we'll approve basic KYC automatically
        if (kycStatus.tier === 'basic') {
          await this.approveKYC(walletAddress, 'Automatically approved - basic tier');
        } else {
          // Higher tiers would require manual review
          console.log(`KYC for ${walletAddress} requires manual review (${kycStatus.tier} tier)`);
        }
      }
    } catch (error) {
      console.error('Error in automatic KYC review:', error);
    }
  }

  /**
   * Check if KYC is expired
   */
  async isKYCExpired(walletAddress: string): Promise<boolean> {
    const kycStatus = await this.getKYCStatus(walletAddress);
    
    if (!kycStatus.expiresAt || kycStatus.status !== 'approved') {
      return false;
    }

    return new Date(kycStatus.expiresAt) < new Date();
  }

  /**
   * Get KYC limits based on tier
   */
  getKYCLimits(tier: string): {
    dailyLimit: number;
    monthlyLimit: number;
    transactionLimit: number;
    features: string[];
  } {
    const limits = {
      none: {
        dailyLimit: 100, // USD
        monthlyLimit: 1000,
        transactionLimit: 50,
        features: ['basic_trading']
      },
      basic: {
        dailyLimit: 1000,
        monthlyLimit: 10000,
        transactionLimit: 500,
        features: ['basic_trading', 'nft_trading', 'enhanced_features']
      },
      intermediate: {
        dailyLimit: 10000,
        monthlyLimit: 100000,
        transactionLimit: 5000,
        features: ['basic_trading', 'nft_trading', 'enhanced_features', 'high_value_trading', 'escrow_services']
      },
      advanced: {
        dailyLimit: 100000,
        monthlyLimit: 1000000,
        transactionLimit: 50000,
        features: ['basic_trading', 'nft_trading', 'enhanced_features', 'high_value_trading', 'escrow_services', 'governance_voting', 'dispute_resolution']
      }
    };

    return limits[tier as keyof typeof limits] || limits.none;
  }
}