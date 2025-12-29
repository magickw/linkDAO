export interface VerificationRequest {
    id: string;
    userId: string;
    entityType: 'individual' | 'organization';
    entityId?: string;
    status: 'pending' | 'approved' | 'rejected' | 'more_info_needed';
    category?: string;
    description?: string;
    website?: string;
    socialProof?: any;
    reviewedBy?: string;
    reviewedAt?: string;
    rejectionReason?: string;
    adminNotes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface VerificationStatus {
    isVerified: boolean;
    badgeType?: 'blue_check' | 'gold_check' | 'grey_check';
    verifiedAt?: string;
}

export interface CreateVerificationRequestInput {
    entityType: 'individual' | 'organization';
    category?: string;
    description?: string;
    website?: string;
    socialProof?: {
        twitter?: string;
        github?: string;
        linkedin?: string;
        [key: string]: string | undefined;
    };
}
