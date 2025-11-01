export interface DigitalAsset {
  id: string;
  nftId?: string;
  creatorId: string;
  title: string;
  description?: string;
  assetType: AssetType;
  fileSize: number;
  fileFormat: string;
  contentHash: string;
  encryptedContentHash: string;
  encryptionKeyHash: string;
  previewHash?: string;
  metadataHash: string;
  drmEnabled: boolean;
  licenseType: LicenseType;
  licenseTerms?: string;
  copyrightNotice?: string;
  usageRestrictions?: UsageRestrictions;
  downloadLimit: number;
  streamingEnabled: boolean;
  watermarkEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DigitalAssetLicense {
  id: string;
  assetId: string;
  licenseName: string;
  licenseType: LicenseType;
  price: string;
  currency: string;
  usageRights: UsageRights;
  restrictions?: LicenseRestrictions;
  durationDays?: number;
  maxDownloads: number;
  maxUsers: number;
  isActive: boolean;
  createdAt: string;
}

export interface DigitalAssetPurchase {
  id: string;
  assetId: string;
  licenseId: string;
  buyerId: string;
  sellerId: string;
  transactionHash: string;
  pricePaid: string;
  currency: string;
  licenseKey: string;
  expiresAt?: string;
  downloadsRemaining: number;
  isActive: boolean;
  purchasedAt: string;
}

export interface DigitalAssetAccessLog {
  id: string;
  purchaseId: string;
  assetId: string;
  userId: string;
  accessType: AccessType;
  ipAddress?: string;
  userAgent?: string;
  fileSizeAccessed?: number;
  durationSeconds?: number;
  success: boolean;
  errorMessage?: string;
  accessedAt: string;
}

export interface DMCATakedownRequest {
  id: string;
  assetId: string;
  reporterId?: string;
  reporterName: string;
  reporterEmail: string;
  reporterOrganization?: string;
  copyrightHolderName: string;
  originalWorkDescription: string;
  infringementDescription: string;
  evidenceUrls?: string[];
  evidenceIpfsHashes?: string[];
  swornStatement: string;
  contactInformation: string;
  status: DMCAStatus;
  adminNotes?: string;
  processedBy?: string;
  processedAt?: string;
  createdAt: string;
}

export interface DigitalAssetReport {
  id: string;
  assetId: string;
  reporterId: string;
  reportType: ReportType;
  description: string;
  evidenceIpfsHash?: string;
  status: ReportStatus;
  moderatorId?: string;
  moderatorNotes?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface DigitalAssetAnalytics {
  id: string;
  assetId: string;
  date: string;
  totalDownloads: number;
  totalStreams: number;
  totalPreviews: number;
  uniqueUsers: number;
  totalRevenue: string;
  currency: string;
  bandwidthUsed: number;
  createdAt: string;
}

export interface DRMKey {
  id: string;
  assetId: string;
  purchaseId: string;
  keyType: DRMKeyType;
  keyData: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
}

export interface WatermarkTemplate {
  id: string;
  creatorId: string;
  name: string;
  templateType: WatermarkType;
  templateData: WatermarkData;
  isDefault: boolean;
  createdAt: string;
}

export interface ContentVerification {
  id: string;
  assetId: string;
  verificationType: VerificationType;
  verificationData: VerificationData;
  status: VerificationStatus;
  verifiedAt: string;
  verifiedBy?: string;
}

// Enums and Types
export enum AssetType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  SOFTWARE = 'software',
  EBOOK = 'ebook',
  GAME = 'game',
  MODEL_3D = '3d_model',
  ANIMATION = 'animation',
  FONT = 'font',
  TEMPLATE = 'template',
  OTHER = 'other'
}

export enum LicenseType {
  STANDARD = 'standard',
  PERSONAL = 'personal',
  COMMERCIAL = 'commercial',
  EXTENDED = 'extended',
  EXCLUSIVE = 'exclusive',
  CREATIVE_COMMONS = 'creative_commons',
  CUSTOM = 'custom'
}

export enum AccessType {
  DOWNLOAD = 'download',
  STREAM = 'stream',
  PREVIEW = 'preview'
}

export enum DMCAStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  RESOLVED = 'resolved'
}

export enum ReportType {
  COPYRIGHT = 'copyright',
  INAPPROPRIATE = 'inappropriate',
  MALWARE = 'malware',
  SPAM = 'spam',
  OTHER = 'other'
}

export enum ReportStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed'
}

export enum DRMKeyType {
  ENCRYPTION = 'encryption',
  WATERMARK = 'watermark',
  ACCESS = 'access'
}

export enum WatermarkType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO_OVERLAY = 'video_overlay'
}

export enum VerificationType {
  HASH_CHECK = 'hash_check',
  SIGNATURE_VERIFY = 'signature_verify',
  AI_DETECTION = 'ai_detection'
}

export enum VerificationStatus {
  VERIFIED = 'verified',
  FAILED = 'failed',
  PENDING = 'pending'
}

// Complex Types
export interface UsageRestrictions {
  allowCommercialUse: boolean;
  allowModification: boolean;
  allowRedistribution: boolean;
  allowPrintUse: boolean;
  allowDigitalUse: boolean;
  maxResolution?: string;
  geographicRestrictions?: string[];
  industryRestrictions?: string[];
  customRestrictions?: string[];
}

export interface UsageRights {
  personalUse: boolean;
  commercialUse: boolean;
  modification: boolean;
  redistribution: boolean;
  printRights: boolean;
  digitalRights: boolean;
  exclusiveRights: boolean;
  resaleRights: boolean;
  sublicensingRights: boolean;
  customRights?: string[];
}

export interface LicenseRestrictions {
  maxUsers?: number;
  maxDownloads?: number;
  maxPrintRuns?: number;
  geographicLimitations?: string[];
  industryLimitations?: string[];
  timeRestrictions?: {
    startDate?: string;
    endDate?: string;
    timezone?: string;
  };
  customRestrictions?: string[];
}

export interface WatermarkData {
  text?: {
    content: string;
    fontSize: number;
    fontFamily: string;
    color: string;
    opacity: number;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  };
  image?: {
    ipfsHash: string;
    opacity: number;
    scale: number;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  };
  video?: {
    overlayType: 'text' | 'image' | 'logo';
    duration: number;
    fadeIn: boolean;
    fadeOut: boolean;
    position: string;
  };
}

export interface VerificationData {
  hashCheck?: {
    expectedHash: string;
    actualHash: string;
    algorithm: string;
  };
  signatureVerify?: {
    publicKey: string;
    signature: string;
    message: string;
  };
  aiDetection?: {
    confidence: number;
    detectedContent: string[];
    model: string;
    version: string;
  };
}

// Request/Response Types
export interface CreateDigitalAssetRequest {
  nftId?: string;
  title: string;
  description?: string;
  assetType: AssetType;
  fileFormat: string;
  licenseType: LicenseType;
  licenseTerms?: string;
  copyrightNotice?: string;
  usageRestrictions?: UsageRestrictions;
  downloadLimit?: number;
  streamingEnabled?: boolean;
  watermarkEnabled?: boolean;
  file: Buffer | Uint8Array;
}

export interface CreateLicenseRequest {
  assetId: string;
  licenseName: string;
  licenseType: LicenseType;
  price: string;
  currency: string;
  usageRights: UsageRights;
  restrictions?: LicenseRestrictions;
  durationDays?: number;
  maxDownloads?: number;
  maxUsers?: number;
}

export interface PurchaseLicenseRequest {
  assetId: string;
  licenseId: string;
  transactionHash: string;
  pricePaid: string;
  currency: string;
}

export interface SubmitDMCARequest {
  assetId: string;
  reporterName: string;
  reporterEmail: string;
  reporterOrganization?: string;
  copyrightHolderName: string;
  originalWorkDescription: string;
  infringementDescription: string;
  evidenceUrls?: string[];
  swornStatement: string;
  contactInformation: string;
}

export interface AssetAccessRequest {
  licenseKey: string;
  accessType: AccessType;
  userAgent?: string;
}

export interface AssetAnalyticsQuery {
  assetId?: string;
  creatorId?: string;
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month';
}

export interface CreateWatermarkTemplateRequest {
  name: string;
  templateType: WatermarkType;
  templateData: WatermarkData;
  isDefault?: boolean;
}
