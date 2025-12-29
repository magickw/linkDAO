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

    // Review Data
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at"),
    rejectionReason: text("rejection_reason"),
    adminNotes: text("admin_notes"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
    userStatusIdx: index("idx_verif_req_user_status").on(t.userId, t.status),
    statusIdx: index("idx_verif_req_status").on(t.status),
    entityTypeIdx: index("idx_verif_req_entity_type").on(t.entityType),
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
