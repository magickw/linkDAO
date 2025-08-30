// Enums and Types for Digital Asset Management

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

export enum WatermarkType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO_OVERLAY = 'video_overlay'
}

// Interface Definitions

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

export interface WatermarkTemplate {
  id: string;
  creatorId: string;
  name: string;
  templateType: WatermarkType;
  templateData: WatermarkData;
  isDefault: boolean;
  createdAt: string;
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

// Analytics Types

export interface AnalyticsMetrics {
  totalDownloads: number;
  totalStreams: number;
  totalPreviews: number;
  uniqueUsers: number;
  totalRevenue: string;
  bandwidthUsed: number;
  averageFileSize: number;
  popularAssets: Array<{
    assetId: string;
    title: string;
    downloads: number;
    revenue: string;
  }>;
  userEngagement: {
    dailyActiveUsers: number;
    averageSessionDuration: number;
    returnUserRate: number;
  };
  performanceMetrics: {
    averageResponseTime: number;
    cacheHitRate: number;
    errorRate: number;
  };
}

export interface TimeSeriesData {
  date: string;
  downloads: number;
  streams: number;
  previews: number;
  revenue: string;
  uniqueUsers: number;
}

export interface GeographicDistribution {
  country: string;
  users: number;
  downloads: number;
}

export interface RevenueAnalytics {
  totalRevenue: string;
  averageOrderValue: string;
  revenueByAsset: Array<{
    assetId: string;
    title: string;
    revenue: string;
    sales: number;
  }>;
  revenueByLicenseType: Array<{
    licenseType: string;
    revenue: string;
    sales: number;
  }>;
}

export interface RealTimeStats {
  activeUsers: number;
  currentDownloads: number;
  currentStreams: number;
  recentActivity: Array<{
    userId: string;
    accessType: AccessType;
    timestamp: string;
    success: boolean;
  }>;
}

// Form Types

export interface CreateAssetForm {
  title: string;
  description: string;
  assetType: AssetType;
  licenseType: LicenseType;
  licenseTerms: string;
  copyrightNotice: string;
  downloadLimit: number;
  streamingEnabled: boolean;
  watermarkEnabled: boolean;
  file: File | null;
}

export interface CreateLicenseForm {
  licenseName: string;
  licenseType: LicenseType;
  price: string;
  currency: string;
  usageRights: UsageRights;
  restrictions: LicenseRestrictions;
  durationDays: number;
  maxDownloads: number;
  maxUsers: number;
}

export interface DMCAForm {
  assetId: string;
  reporterName: string;
  reporterEmail: string;
  reporterOrganization: string;
  copyrightHolderName: string;
  originalWorkDescription: string;
  infringementDescription: string;
  evidenceUrls: string[];
  swornStatement: string;
  contactInformation: string;
}

// API Response Types

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Error Types

export interface DigitalAssetError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// Utility Types

export type AssetTypeIcon = {
  [key in AssetType]: string;
};

export type LicenseTypeColor = {
  [key in LicenseType]: string;
};

export type AccessTypeLabel = {
  [key in AccessType]: string;
};

// Constants

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  [AssetType.IMAGE]: 'Image',
  [AssetType.VIDEO]: 'Video',
  [AssetType.AUDIO]: 'Audio',
  [AssetType.DOCUMENT]: 'Document',
  [AssetType.SOFTWARE]: 'Software',
  [AssetType.EBOOK]: 'E-book',
  [AssetType.GAME]: 'Game',
  [AssetType.MODEL_3D]: '3D Model',
  [AssetType.ANIMATION]: 'Animation',
  [AssetType.FONT]: 'Font',
  [AssetType.TEMPLATE]: 'Template',
  [AssetType.OTHER]: 'Other'
};

export const LICENSE_TYPE_LABELS: Record<LicenseType, string> = {
  [LicenseType.STANDARD]: 'Standard License',
  [LicenseType.PERSONAL]: 'Personal Use',
  [LicenseType.COMMERCIAL]: 'Commercial License',
  [LicenseType.EXTENDED]: 'Extended License',
  [LicenseType.EXCLUSIVE]: 'Exclusive License',
  [LicenseType.CREATIVE_COMMONS]: 'Creative Commons',
  [LicenseType.CUSTOM]: 'Custom License'
};

export const ACCESS_TYPE_LABELS: Record<AccessType, string> = {
  [AccessType.DOWNLOAD]: 'Download',
  [AccessType.STREAM]: 'Stream',
  [AccessType.PREVIEW]: 'Preview'
};

export const DMCA_STATUS_LABELS: Record<DMCAStatus, string> = {
  [DMCAStatus.PENDING]: 'Pending Review',
  [DMCAStatus.UNDER_REVIEW]: 'Under Review',
  [DMCAStatus.APPROVED]: 'Approved',
  [DMCAStatus.REJECTED]: 'Rejected',
  [DMCAStatus.RESOLVED]: 'Resolved'
};

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  [ReportType.COPYRIGHT]: 'Copyright Infringement',
  [ReportType.INAPPROPRIATE]: 'Inappropriate Content',
  [ReportType.MALWARE]: 'Malware/Virus',
  [ReportType.SPAM]: 'Spam',
  [ReportType.OTHER]: 'Other'
};