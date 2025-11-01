export interface VerificationRequest {
  legalName: string;
  ein?: string; // Optional for individuals
  businessAddress: string;
  // Document references would be added here in a real implementation
}

export interface SellerVerification {
  id: string;
  sellerId: string;
  status: 'pending' | 'verified' | 'rejected' | 'expired';
  
  // Legal information
  legalName?: string;
  ein?: string;
  businessAddress?: string;
  
  // Document storage references
  einDocumentId?: string;
  businessLicenseId?: string;
  addressProofId?: string;
  
  // Verification metadata
  verificationMethod?: string;
  verificationReference?: string;
  
  // Risk assessment
  riskScore?: 'low' | 'medium' | 'high';
  riskFactors?: string;
  
  // Timestamps
  submittedAt: Date;
  verifiedAt?: Date;
  expiresAt?: Date;
  
  // Audit trail
  reviewedBy?: string;
  rejectionReason?: string;
  notes?: string;
}

export interface VerificationResult {
  success: boolean;
  method?: string;
  reference?: string;
  riskScore?: 'low' | 'medium' | 'high';
  reason?: string;
}

export interface AddressNormalizationResult {
  normalizedAddress: string;
  components: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  coordinates?: {
    lat: number;
    lng: number;
  };
}