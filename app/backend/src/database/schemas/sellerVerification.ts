import { pgTable, uuid, varchar, text, timestamp, index, primaryKey } from 'drizzle-orm/pg-core';
import { sellers } from '../../db/schema';

export const sellerVerifications = pgTable('seller_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  sellerId: uuid('seller_id').notNull().references(() => sellers.id, { onDelete: 'cascade' }),
  status: varchar('status', { 
    enum: ['pending', 'verified', 'rejected', 'expired'] 
  }).notNull().default('pending'),
  
  // Legal information
  legalName: varchar('legal_name', { length: 255 }),
  ein: varchar('ein', { length: 10 }), // Format: ##-#######
  businessAddress: text('business_address'),
  
  // Document storage references
  einDocumentId: uuid('ein_document_id'), // Reference to encrypted document
  businessLicenseId: uuid('business_license_id'), // Reference to encrypted document
  addressProofId: uuid('address_proof_id'), // Reference to encrypted document
  
  // Verification metadata
  verificationMethod: varchar('verification_method', { 
    enum: ['irs_tin_match', 'trulioo', 'manual_review', 'open_corporates'] 
  }),
  verificationReference: varchar('verification_reference', { length: 255 }), // External reference ID
  
  // Risk assessment
  riskScore: varchar('risk_score', { enum: ['low', 'medium', 'high'] }),
  riskFactors: text('risk_factors'), // JSON array of risk factors
  
  // Timestamps
  submittedAt: timestamp('submitted_at').notNull().defaultNow(),
  verifiedAt: timestamp('verified_at'),
  expiresAt: timestamp('expires_at'), // For periodic re-verification
  
  // Audit trail
  reviewedBy: uuid('reviewed_by'), // Admin user ID for manual reviews
  rejectionReason: text('rejection_reason'),
  notes: text('notes'),
}, (table) => {
  return {
    sellerIdx: index('seller_verifications_seller_idx').on(table.sellerId),
    statusIdx: index('seller_verifications_status_idx').on(table.status),
    einIdx: index('seller_verifications_ein_idx').on(table.ein),
  };
});