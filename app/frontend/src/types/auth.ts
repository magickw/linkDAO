export type UserRole = 'user' | 'moderator' | 'admin' | 'super_admin';

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'content' | 'users' | 'marketplace' | 'system' | 'disputes';
}

export interface RolePermissions {
  role: UserRole;
  permissions: string[];
  description: string;
}

export interface AuthUser {
  id: string;
  address: string;
  handle: string;
  ens?: string;
  email?: string;
  role: UserRole;
  permissions: string[];
  kycStatus: 'none' | 'pending' | 'basic' | 'intermediate' | 'advanced';
  kycTier?: string;
  chainId?: number;
  isActive: boolean;
  isSuspended: boolean;
  suspensionReason?: string;
  suspensionExpiresAt?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  avatarCid?: string;
  preferences?: {
    notifications?: {
      email?: boolean;
      push?: boolean;
      inApp?: boolean;
    };
    privacy?: {
      showEmail?: boolean;
      showTransactions?: boolean;
      allowDirectMessages?: boolean;
    };
    trading?: {
      autoApproveSmallAmounts?: boolean;
      defaultSlippage?: number;
      preferredCurrency?: string;
    };
  };
  privacySettings?: {
    profileVisibility?: 'public' | 'private' | 'friends';
    activityVisibility?: 'public' | 'private' | 'friends';
    contactVisibility?: 'public' | 'private' | 'friends';
  };
  sessionInfo?: {
    lastLogin?: string;
    loginCount?: number;
    deviceInfo?: any;
  };
}

export interface AdminAction {
  id: string;
  adminId: string;
  adminHandle: string;
  action: string;
  targetType: 'user' | 'post' | 'seller' | 'dispute' | 'listing';
  targetId: string;
  reason: string;
  details?: any;
  timestamp: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface ModerationQueue {
  id: string;
  type: 'post' | 'user_report' | 'seller_application' | 'dispute';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'quarantined' | 'blocked' | 'allowed' | 'appealed' | 'under_review' | 'in_review' | 'resolved' | 'escalated';
  reportedBy?: string;
  targetId: string;
  targetType: string;
  reason: string;
  description?: string;
  evidence?: string[];
  assignedTo?: string;
  assignedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SellerApplication {
  id: string;
  applicantId: string;
  applicantAddress: string;
  applicantHandle: string;
  businessName?: string;
  businessType: string;
  description: string;
  categories: string[];
  documents: {
    businessLicense?: string;
    taxId?: string;
    bankStatement?: string;
    identityDocument?: string;
    additionalDocs?: string[];
  };
  contactInfo: {
    email: string;
    phone?: string;
    address?: string;
  };
  socialLinks?: {
    website?: string;
    twitter?: string;
    linkedin?: string;
  };
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'requires_info';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  rejectionReason?: string;
  submittedAt: string;
  updatedAt: string;
}

export interface Evidence {
  id: string;
  type: string;
  filename?: string;
  status?: 'pending' | 'verified' | 'rejected';
  size?: number;
  uploadedAt?: string;
  description?: string;
  url?: string;
}

export interface DisputeCase {
  id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  type: 'product_not_received' | 'product_not_as_described' | 'refund_request' | 'payment_issue' | 'other';
  status: 'open' | 'investigating' | 'awaiting_response' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  amount: number;
  currency: string;
  description: string;
  evidence: {
    buyerEvidence?: Evidence[];
    sellerEvidence?: Evidence[];
    adminEvidence?: Evidence[];
  };
  timeline: DisputeTimelineEvent[];
  assignedTo?: string;
  assignedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolution?: {
    outcome: 'buyer_favor' | 'seller_favor' | 'partial_refund' | 'no_action';
    refundAmount?: number;
    reasoning: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DisputeTimelineEvent {
  id: string;
  type: 'created' | 'evidence_submitted' | 'admin_note' | 'status_change' | 'resolved';
  actor: string;
  actorRole: UserRole;
  description: string;
  data?: any;
  timestamp: string;
}

// Permission definitions
export const PERMISSIONS: Permission[] = [
  // Content Management
  { id: 'content.moderate', name: 'Moderate Content', description: 'Review and moderate user posts and comments', category: 'content' },
  { id: 'content.delete', name: 'Delete Content', description: 'Delete inappropriate content', category: 'content' },
  { id: 'content.feature', name: 'Feature Content', description: 'Feature posts and content', category: 'content' },
  
  // User Management
  { id: 'users.view', name: 'View Users', description: 'View user profiles and information', category: 'users' },
  { id: 'users.suspend', name: 'Suspend Users', description: 'Suspend user accounts', category: 'users' },
  { id: 'users.ban', name: 'Ban Users', description: 'Permanently ban user accounts', category: 'users' },
  { id: 'users.kyc_review', name: 'Review KYC', description: 'Review and approve KYC submissions', category: 'users' },
  
  // Marketplace Management
  { id: 'marketplace.seller_review', name: 'Review Sellers', description: 'Review and approve seller applications', category: 'marketplace' },
  { id: 'marketplace.listing_moderate', name: 'Moderate Listings', description: 'Review and moderate marketplace listings', category: 'marketplace' },
  { id: 'marketplace.escrow_manage', name: 'Manage Escrow', description: 'Manage escrow transactions', category: 'marketplace' },
  
  // Dispute Resolution
  { id: 'disputes.view', name: 'View Disputes', description: 'View dispute cases', category: 'disputes' },
  { id: 'disputes.resolve', name: 'Resolve Disputes', description: 'Resolve dispute cases', category: 'disputes' },
  { id: 'disputes.escalate', name: 'Escalate Disputes', description: 'Escalate disputes to higher authority', category: 'disputes' },
  
  // System Administration
  { id: 'system.config', name: 'System Configuration', description: 'Configure system settings', category: 'system' },
  { id: 'system.audit', name: 'View Audit Logs', description: 'View system audit logs', category: 'system' },
  { id: 'system.analytics', name: 'View Analytics', description: 'View system analytics and reports', category: 'system' },
];

// Role permission mappings
export const ROLE_PERMISSIONS: RolePermissions[] = [
  {
    role: 'user',
    permissions: [],
    description: 'Regular user with basic platform access'
  },
  {
    role: 'moderator',
    permissions: [
      'content.moderate',
      'content.delete',
      'users.view',
      'marketplace.listing_moderate',
      'disputes.view'
    ],
    description: 'Content moderator with limited administrative privileges'
  },
  {
    role: 'admin',
    permissions: [
      'content.moderate',
      'content.delete',
      'content.feature',
      'users.view',
      'users.suspend',
      'users.kyc_review',
      'marketplace.seller_review',
      'marketplace.listing_moderate',
      'marketplace.escrow_manage',
      'disputes.view',
      'disputes.resolve',
      'system.analytics'
    ],
    description: 'Administrator with full platform management capabilities'
  },
  {
    role: 'super_admin',
    permissions: PERMISSIONS.map(p => p.id),
    description: 'Super administrator with all system privileges'
  }
];