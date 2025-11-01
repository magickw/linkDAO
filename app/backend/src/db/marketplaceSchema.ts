import { pgTable, serial, varchar, text, timestamp, integer, uuid, primaryKey, index, boolean, numeric, foreignKey, jsonb } from "drizzle-orm/pg-core";
import { users } from "./schema";

// Marketplace roles (only required for buyers/sellers)
export const marketplaceUsers = pgTable("marketplace_users", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 10 }).notNull(), // 'buyer' | 'seller'
  email: varchar("email", { length: 255 }), // optional, not for login
  legalName: varchar("legal_name", { length: 255 }),
  country: varchar("country", { length: 2 }),
  shippingAddress: jsonb("shipping_address"), // structured address if physical goods
  billingAddress: jsonb("billing_address"), // structured billing address
  kycVerified: boolean("kyc_verified").default(false),
  kycVerificationDate: timestamp("kyc_verification_date"),
  kycProvider: varchar("kyc_provider", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Products (for marketplace listings)
export const marketplaceProducts = pgTable("marketplace_products", {
  id: uuid("id").defaultRandom().primaryKey(),
  sellerId: uuid("seller_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  priceCrypto: numeric("price_crypto", { precision: 20, scale: 8 }).notNull(),
  priceFiat: numeric("price_fiat", { precision: 20, scale: 2 }), // optional display price
  currency: varchar("currency", { length: 10 }).default("USDC"),
  metadataUri: text("metadata_uri"), // e.g. IPFS hash for digital goods
  isPhysical: boolean("is_physical").default(false),
  stock: integer("stock").default(1),
  status: varchar("status", { length: 20 }).default("active"), // 'active' | 'inactive' | 'sold_out' | 'suspended' | 'draft'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Orders (escrow-based transactions)
export const marketplaceOrders = pgTable("marketplace_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  buyerId: uuid("buyer_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  sellerId: uuid("seller_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => marketplaceProducts.id, { onDelete: "cascade" }).notNull(),
  escrowContractAddress: varchar("escrow_contract_address", { length: 66 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending"), // 'pending' | 'shipped' | 'delivered' | 'disputed' | 'completed' | 'cancelled'
  amount: numeric("amount", { precision: 20, scale: 8 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("USDC"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Dispute resolution
export const marketplaceDisputes = pgTable("marketplace_disputes", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").references(() => marketplaceOrders.id, { onDelete: "cascade" }).notNull(),
  raisedBy: uuid("raised_by").references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).default("open"), // 'open' | 'resolved_buyer' | 'resolved_seller' | 'cancelled'
  evidence: jsonb("evidence"), // IPFS links, screenshots, etc.
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// Community judges staking on disputes
export const disputeJudges = pgTable("dispute_judges", {
  id: uuid("id").defaultRandom().primaryKey(),
  disputeId: uuid("dispute_id").references(() => marketplaceDisputes.id, { onDelete: "cascade" }).notNull(),
  judgeId: uuid("judge_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  decision: varchar("decision", { length: 10 }), // 'buyer' | 'seller'
  stakedAmount: numeric("staked_amount", { precision: 20, scale: 8 }).notNull(),
  rewarded: boolean("rewarded").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Marketplace verification records
export const marketplaceVerifications = pgTable("marketplace_verifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  sellerVerificationId: uuid("seller_verification_id").references(() => sellerVerifications.id, { onDelete: "set null" }),
  verificationLevel: varchar("verification_level", { length: 20 }).default("basic").notNull(), // 'basic' | 'verified' | 'premium'
  sellerTier: varchar("seller_tier", { length: 20 }).default("unverified").notNull(), // 'unverified' | 'standard' | 'verified' | 'premium'
  riskScore: numeric("risk_score", { precision: 3, scale: 2 }).default("0").notNull(),
  proofOfOwnership: jsonb("proof_of_ownership"),
  brandVerification: jsonb("brand_verification"),
  verificationStatus: varchar("verification_status", { length: 20 }).default("pending").notNull(), // 'pending' | 'approved' | 'rejected'
  verifiedBy: varchar("verified_by", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Seller verification tiers and history
export const sellerVerifications = pgTable("seller_verifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  status: varchar("status", { 
    enum: ['pending', 'verified', 'rejected', 'expired'] 
  }).notNull().default('pending'),
  
  // Legal information
  legalName: varchar("legal_name", { length: 255 }),
  ein: varchar("ein", { length: 10 }), // Format: ##-#######
  businessAddress: text("business_address"),
  
  // Document storage references
  einDocumentId: uuid("ein_document_id"), // Reference to encrypted document
  businessLicenseId: uuid("business_license_id"), // Reference to encrypted document
  addressProofId: uuid("address_proof_id"), // Reference to encrypted document
  
  // Verification metadata
  verificationMethod: varchar("verification_method", { 
    enum: ['irs_tin_match', 'trulioo', 'manual_review', 'open_corporates'] 
  }),
  verificationReference: varchar("verification_reference", { length: 255 }), // External reference ID
  
  // Risk assessment
  riskScore: varchar("risk_score", { enum: ['low', 'medium', 'high'] }),
  riskFactors: text("risk_factors"), // JSON array of risk factors
  
  // Timestamps
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  verifiedAt: timestamp("verified_at"),
  expiresAt: timestamp("expires_at"), // For periodic re-verification
  
  // Audit trail
  reviewedBy: uuid("reviewed_by"), // Admin user ID for manual reviews
  rejectionReason: text("rejection_reason"),
  notes: text("notes"),
  
  // Progress tracking
  progressStatus: varchar("progress_status", { 
    enum: ['submitted', 'documents_verified', 'manual_review', 'approved', 'rejected'] 
  }).default('submitted'),
  progressUpdatedAt: timestamp("progress_updated_at").defaultNow(),
  
  reputationScore: integer("reputation_score").default(0),
  totalVolume: numeric("total_volume", { precision: 20, scale: 8 }).default("0"),
  successfulTransactions: integer("successful_transactions").default(0),
  disputeRate: numeric("dispute_rate", { precision: 3, scale: 2 }).default("0"),
  lastTierUpdate: timestamp("last_tier_update").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    userIdx: index("seller_verifications_user_idx").on(table.userId),
    statusIdx: index("seller_verifications_status_idx").on(table.status),
    einIdx: index("seller_verifications_ein_idx").on(table.ein),
  };
});

// Reviews for marketplace transactions
export const marketplaceReviews = pgTable("marketplace_reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  reviewerId: uuid("reviewer_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  revieweeId: uuid("reviewee_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  orderId: uuid("order_id").references(() => marketplaceOrders.id, { onDelete: "cascade" }).notNull(),
  rating: integer("rating").notNull(), // 1-5 stars
  title: varchar("title", { length: 255 }),
  comment: text("comment"),
  isVerified: boolean("is_verified").default(false),
  helpfulCount: integer("helpful_count").default(0),
  reportCount: integer("report_count").default(0),
  status: varchar("status", { length: 20 }).default("active"), // 'active' | 'hidden' | 'removed'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Review helpfulness tracking
export const reviewHelpfulness = pgTable("review_helpfulness", {
  id: uuid("id").defaultRandom().primaryKey(),
  reviewId: uuid("review_id").references(() => marketplaceReviews.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  isHelpful: boolean("is_helpful").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Review reports
export const reviewReports = pgTable("review_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  reviewId: uuid("review_id").references(() => marketplaceReviews.id, { onDelete: "cascade" }).notNull(),
  reporterId: uuid("reporter_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  reason: varchar("reason", { length: 100 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).default("pending"), // 'pending' | 'resolved' | 'dismissed'
  createdAt: timestamp("created_at").defaultNow(),
});

// Marketplace analytics
export const marketplaceAnalytics = pgTable("marketplace_analytics", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => marketplaceProducts.id, { onDelete: "cascade" }),
  eventType: varchar("event_type", { length: 50 }).notNull(), // 'view' | 'click' | 'purchase' | 'favorite'
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Marketplace configuration
export const marketplaceConfig = pgTable("marketplace_config", {
  id: varchar("id", { length: 50 }).primaryKey(),
  configKey: varchar("config_key", { length: 100 }).notNull().unique(),
  configValue: text("config_value").notNull(),
  valueType: varchar("value_type", { length: 20 }).notNull(), // 'string' | 'number' | 'boolean' | 'json'
  description: text("description"),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
