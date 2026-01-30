import { pgTable, varchar, text, timestamp, integer, uuid, index, boolean, numeric, jsonb } from "drizzle-orm/pg-core";
import { users } from "./schema";

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

// Marketplace verification records
export const marketplaceVerifications = pgTable("marketplace_verifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  sellerVerificationId: uuid("seller_verification_id").references(() => sellerVerifications.id, { onDelete: "set null" }),
  verificationLevel: varchar("verification_level", { length: 20 }).default("basic").notNull(), // 'basic' | 'verified' | 'premium'
  sellerTier: varchar("seller_tier", { length: 20 }).default("bronze").notNull(), // 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
  riskScore: numeric("risk_score", { precision: 3, scale: 2 }).default("0").notNull(),
  proofOfOwnership: jsonb("proof_of_ownership"),
  brandVerification: jsonb("brand_verification"),
  verificationStatus: varchar("verification_status", { length: 20 }).default("pending").notNull(), // 'pending' | 'approved' | 'rejected'
  verifiedBy: varchar("verified_by", { length: 64 }),
  kycVerified: boolean("kyc_verified").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Seller verification tiers and history
export const sellerVerifications = pgTable("seller_verifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  currentTier: varchar("current_tier", { length: 20 }).default("bronze").notNull(), // 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
  status: varchar("status", { length: 20 }).notNull().default('pending'),

  // Legal information
  legalName: varchar("legal_name", { length: 255 }),
  ein: varchar("ein", { length: 10 }), // Format: ##-#######
  businessAddress: text("business_address"),

  // Document storage references
  einDocumentId: uuid("ein_document_id"), // Reference to encrypted document
  businessLicenseId: uuid("business_license_id"), // Reference to encrypted document
  addressProofId: uuid("address_proof_id"), // Reference to encrypted document

  // Verification metadata
  verificationMethod: varchar("verification_method", { length: 50 }),
  verificationReference: varchar("verification_reference", { length: 255 }), // External reference ID

  // Risk assessment
  riskScore: varchar("risk_score", { length: 10 }),
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
  progressStatus: varchar("progress_status", { length: 30 }).default('submitted'),
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

// Marketplace rewards tracking
export const marketplaceRewards = pgTable("marketplace_rewards", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: integer("order_id").notNull(),
  buyerId: uuid("buyer_id").references(() => users.id, { onDelete: "cascade" }),
  sellerId: uuid("seller_id").references(() => users.id, { onDelete: "cascade" }),
  transactionAmount: numeric("transaction_amount", { precision: 20, scale: 8 }).notNull(),
  buyerReward: numeric("buyer_reward", { precision: 20, scale: 8 }).notNull(),
  sellerReward: numeric("seller_reward", { precision: 20, scale: 8 }).notNull(),
  rewardTier: varchar("reward_tier", { length: 20 }).notNull(),
  bonusMultiplier: numeric("bonus_multiplier", { precision: 5, scale: 2 }).notNull(),
  processedAt: timestamp("processed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  buyerIdIdx: index("marketplace_rewards_buyer_id_idx").on(table.buyerId),
  sellerIdIdx: index("marketplace_rewards_seller_id_idx").on(table.sellerId),
  orderIdIdx: index("marketplace_rewards_order_id_idx").on(table.orderId),
  processedAtIdx: index("marketplace_rewards_processed_at_idx").on(table.processedAt),
}));

// Marketplace earning challenges
export const earningChallenges = pgTable("earning_challenges", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  challengeType: varchar("challenge_type", { length: 20 }).notNull(), // 'daily' | 'weekly' | 'monthly' | 'milestone'
  activityType: varchar("activity_type", { length: 50 }).notNull(), // 'marketplace' | 'referral' | 'community'
  targetValue: numeric("target_value", { precision: 20, scale: 8 }).notNull(),
  rewardAmount: numeric("reward_amount", { precision: 20, scale: 8 }).notNull(),
  bonusMultiplier: numeric("bonus_multiplier", { precision: 5, scale: 2 }).default("1.00"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  maxParticipants: integer("max_participants"),
  currentParticipants: integer("current_participants").default(0),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  challengeTypeIdx: index("earning_challenges_type_idx").on(table.challengeType),
  activityTypeIdx: index("earning_challenges_activity_type_idx").on(table.activityType),
  isActiveIdx: index("earning_challenges_is_active_idx").on(table.isActive),
  startDateIdx: index("earning_challenges_start_date_idx").on(table.startDate),
}));

// User challenge progress tracking
export const userChallengeProgress = pgTable("user_challenge_progress", {
  id: uuid("id").defaultRandom().primaryKey(),
  challengeId: uuid("challenge_id").references(() => earningChallenges.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  currentProgress: numeric("current_progress", { precision: 20, scale: 8 }).notNull(),
  targetValue: numeric("target_value", { precision: 20, scale: 8 }).notNull(),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  rewardClaimed: boolean("reward_claimed").default(false),
  rewardClaimedAt: timestamp("reward_claimed_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  challengeUserIdx: index("user_challenge_progress_challenge_user_idx").on(table.challengeId, table.userId),
  userIdx: index("user_challenge_progress_user_idx").on(table.userId),
  isCompletedIdx: index("user_challenge_progress_is_completed_idx").on(table.isCompleted),
  rewardClaimedIdx: index("user_challenge_progress_reward_claimed_idx").on(table.rewardClaimed),
}));