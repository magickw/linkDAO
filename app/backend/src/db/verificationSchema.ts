import { pgTable, serial, varchar, text, timestamp, integer, uuid, primaryKey, index, boolean, numeric, foreignKey, jsonb } from "drizzle-orm/pg-core";
import { users } from "./schema";
import { communities } from "./schema"; // Assuming communities is exported from schema.ts

// Verification Requests
export const verificationRequests = pgTable("verification_requests", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    entityType: varchar("entity_type", { length: 32 }).notNull(), // 'individual', 'organization'
    entityId: uuid("entity_id"), // Optional: if verifying a specific community/org, though userId usually suffices for individual
    status: varchar("status", { length: 32 }).default("pending").notNull(), // 'pending', 'approved', 'rejected', 'more_info_needed'

    // Application Data
    category: varchar("category", { length: 64 }), // e.g., 'founder', 'artist', 'developer', 'company', 'dao'
    description: text("description"),
    website: varchar("website", { length: 500 }),
    socialProof: jsonb("social_proof"), // { twitter: "...", github: "...", linkedin: "..." }

    // Enhanced Verification Criteria (Industry Standard)
    // Authenticity Checks
    walletSignature: text("wallet_signature"), // Signed message for wallet ownership
    emailVerified: boolean("email_verified").default(false),
    phoneVerified: boolean("phone_verified").default(false),
    governmentIdProvided: boolean("government_id_provided").default(false), // Optional for individuals

    // Notability Evidence (at least one required)
    notabilitySources: jsonb("notability_sources"), // Array of sources: ["wikipedia", "news", "verified_social", "ens", "github", "dao_role"]
    notabilityDescription: text("notability_description"), // Description of why they're notable
    externalLinks: jsonb("external_links"), // Links to news articles, Wikipedia, etc.

    // Profile Completeness
    hasProfilePhoto: boolean("has_profile_photo").default(false),
    hasBio: boolean("has_bio").default(false),
    hasPublicPosts: boolean("has_public_posts").default(false),
    postCount: integer("post_count").default(0),

    // Uniqueness Check
    uniquenessVerified: boolean("uniqueness_verified").default(false), // One verified account per entity
    duplicateAccounts: jsonb("duplicate_accounts"), // Array of potential duplicate wallet addresses

    // Organization-Specific Fields
    orgName: varchar("org_name", { length: 255 }),
    orgType: varchar("org_type", { length: 64 }), // 'company', 'dao', 'protocol', 'nft_project', 'media'
    domainVerified: boolean("domain_verified").default(false),
    orgEmail: varchar("org_email", { length: 255 }),
    registrationNumber: varchar("registration_number", { length: 100 }), // Business registration number

    // Review Data
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at"),
    rejectionReason: text("rejection_reason"),
    rejectionCategory: varchar("rejection_category", { length: 64 }), // 'not_notable', 'incomplete', 'duplicate', 'fan_account', 'parody'
    adminNotes: text("admin_notes"),
    verificationScore: integer("verification_score"), // 0-100 confidence score

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
    userStatusIdx: index("idx_verif_req_user_status").on(t.userId, t.status),
    statusIdx: index("idx_verif_req_status").on(t.status),
    entityTypeIdx: index("idx_verif_req_entity_type").on(t.entityType),
    categoryIdx: index("idx_verif_req_category").on(t.category),
}));

// User Verification Status (Approved)
export const userVerification = pgTable("user_verification", {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 32 }).default("verified").notNull(), // 'verified', 'suspended', 'revoked'
    badgeType: varchar("badge_type", { length: 32 }).default("blue_check").notNull(), // 'blue_check', 'gold_check', 'grey_check'
    verifiedAt: timestamp("verified_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at"), // Optional expiry

    // Metadata
    verificationMethod: varchar("verification_method", { length: 64 }), // 'manual_review', 'twitter_oauth', 'github_oauth' etc.
    metadata: jsonb("metadata"), // Extra info displayed on hover e.g. "Verified since 2024"

    // Transparency Rules
    disclaimer: text("disclaimer").default("Verification confirms identity and notability. It does not imply endorsement by LinkDAO."),
    canBeRevoked: boolean("can_be_revoked").default(true),
    revocationReason: text("revocation_reason"),
    revokedAt: timestamp("revoked_at"),
    revokedBy: uuid("revoked_by").references(() => users.id),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
    pk: primaryKey(t.userId),
    statusIdx: index("idx_user_verif_status").on(t.status),
}));

// Organization/Community Verification Status (Approved)
export const orgVerification = pgTable("org_verification", {
    orgId: uuid("org_id").notNull(), // Can reference communities.id or a separate orgs table
    // Note: We might need to add a foreign key if communities are in the same schema file or circular dep handling

    status: varchar("status", { length: 32 }).default("verified").notNull(), // 'verified', 'suspended', 'revoked'
    badgeType: varchar("badge_type", { length: 32 }).default("gold_check").notNull(), // 'gold_check', 'grey_check'
    verifiedAt: timestamp("verified_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at"),

    // Contact info for the verified org
    contactEmail: varchar("contact_email", { length: 255 }),
    metadata: jsonb("metadata"),

    // Transparency Rules
    disclaimer: text("disclaimer").default("Verification confirms identity and notability. It does not imply endorsement by LinkDAO."),
    canBeRevoked: boolean("can_be_revoked").default(true),
    revocationReason: text("revocation_reason"),
    revokedAt: timestamp("revoked_at"),
    revokedBy: uuid("revoked_by").references(() => users.id),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
    pk: primaryKey(t.orgId),
    statusIdx: index("idx_org_verif_status").on(t.status),
}));

// Verification Documents (Private)
export const verificationDocuments = pgTable("verification_documents", {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id").notNull().references(() => verificationRequests.id, { onDelete: "cascade" }),
    documentType: varchar("document_type", { length: 64 }).notNull(), // 'passport', 'id_card', 'incorporation_doc'
    documentUrl: text("document_url").notNull(), // Encrypted URL or Secure Storage Path
    documentHash: varchar("document_hash", { length: 128 }), // SHA-256 hash for integrity
    uploadedAt: timestamp("uploaded_at").defaultNow(),
}, (t) => ({
    requestIdx: index("idx_verif_doc_request").on(t.requestId),
}));

// Verification History / Audit Log
export const verificationHistory = pgTable("verification_history", {
    id: serial("id").primaryKey(),
    entityType: varchar("entity_type", { length: 32 }).notNull(), // 'user', 'org'
    entityId: uuid("entity_id").notNull(),
    action: varchar("action", { length: 32 }).notNull(), // 'applied', 'approved', 'rejected', 'revoked', 'suspended'
    actorId: uuid("actor_id"), // Who performed the action (User or Admin)
    prevStatus: varchar("prev_status", { length: 32 }),
    newStatus: varchar("new_status", { length: 32 }),
    reason: text("reason"),
    createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
    entityIdx: index("idx_verif_hist_entity").on(t.entityId, t.entityType),
}));
