-- Create verification_requests table
CREATE TABLE IF NOT EXISTS "verification_requests" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "entity_type" varchar(32) NOT NULL,
    "entity_id" uuid,
    "status" varchar(32) DEFAULT 'pending' NOT NULL,
    "category" varchar(64),
    "description" text,
    "website" varchar(500),
    "social_proof" jsonb,
    "wallet_signature" text,
    "email_verified" boolean DEFAULT false,
    "phone_verified" boolean DEFAULT false,
    "government_id_provided" boolean DEFAULT false,
    "notability_sources" jsonb,
    "notability_description" text,
    "external_links" jsonb,
    "has_profile_photo" boolean DEFAULT false,
    "has_bio" boolean DEFAULT false,
    "has_public_posts" boolean DEFAULT false,
    "post_count" integer DEFAULT 0,
    "uniqueness_verified" boolean DEFAULT false,
    "duplicate_accounts" jsonb,
    "org_name" varchar(255),
    "org_type" varchar(64),
    "domain_verified" boolean DEFAULT false,
    "org_email" varchar(255),
    "registration_number" varchar(100),
    "reviewed_by" uuid REFERENCES "users"("id"),
    "reviewed_at" timestamp,
    "rejection_reason" text,
    "rejection_category" varchar(64),
    "admin_notes" text,
    "verification_score" integer,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

-- Create indexes for verification_requests
CREATE INDEX IF NOT EXISTS "idx_verif_req_user_status" ON "verification_requests" ("user_id", "status");
CREATE INDEX IF NOT EXISTS "idx_verif_req_status" ON "verification_requests" ("status");
CREATE INDEX IF NOT EXISTS "idx_verif_req_entity_type" ON "verification_requests" ("entity_type");
CREATE INDEX IF NOT EXISTS "idx_verif_req_category" ON "verification_requests" ("category");

-- Create user_verification table
CREATE TABLE IF NOT EXISTS "user_verification" (
    "user_id" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
    "status" varchar(32) DEFAULT 'verified' NOT NULL,
    "badge_type" varchar(32) DEFAULT 'blue_check' NOT NULL,
    "verified_at" timestamp DEFAULT now() NOT NULL,
    "expires_at" timestamp,
    "verification_method" varchar(64),
    "metadata" jsonb,
    "disclaimer" text DEFAULT 'Verification confirms identity and notability. It does not imply endorsement by LinkDAO.',
    "can_be_revoked" boolean DEFAULT true,
    "revocation_reason" text,
    "revoked_at" timestamp,
    "revoked_by" uuid REFERENCES "users"("id"),
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

-- Create index for user_verification
CREATE INDEX IF NOT EXISTS "idx_user_verif_status" ON "user_verification" ("status");

-- Create org_verification table
CREATE TABLE IF NOT EXISTS "org_verification" (
    "org_id" uuid PRIMARY KEY,
    "status" varchar(32) DEFAULT 'verified' NOT NULL,
    "badge_type" varchar(32) DEFAULT 'gold_check' NOT NULL,
    "verified_at" timestamp DEFAULT now() NOT NULL,
    "expires_at" timestamp,
    "contact_email" varchar(255),
    "metadata" jsonb,
    "disclaimer" text DEFAULT 'Verification confirms identity and notability. It does not imply endorsement by LinkDAO.',
    "can_be_revoked" boolean DEFAULT true,
    "revocation_reason" text,
    "revoked_at" timestamp,
    "revoked_by" uuid REFERENCES "users"("id"),
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

-- Create index for org_verification
CREATE INDEX IF NOT EXISTS "idx_org_verif_status" ON "org_verification" ("status");

-- Create verification_documents table
CREATE TABLE IF NOT EXISTS "verification_documents" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "request_id" uuid NOT NULL REFERENCES "verification_requests"("id") ON DELETE CASCADE,
    "document_type" varchar(64) NOT NULL,
    "document_url" text NOT NULL,
    "document_hash" varchar(128),
    "uploaded_at" timestamp DEFAULT now()
);

-- Create index for verification_documents
CREATE INDEX IF NOT EXISTS "idx_verif_doc_request" ON "verification_documents" ("request_id");

-- Create verification_history table
CREATE TABLE IF NOT EXISTS "verification_history" (
    "id" serial PRIMARY KEY,
    "entity_type" varchar(32) NOT NULL,
    "entity_id" uuid NOT NULL,
    "action" varchar(32) NOT NULL,
    "actor_id" uuid,
    "prev_status" varchar(32),
    "new_status" varchar(32),
    "reason" text,
    "created_at" timestamp DEFAULT now()
);

-- Create index for verification_history
CREATE INDEX IF NOT EXISTS "idx_verif_hist_entity" ON "verification_history" ("entity_id", "entity_type");
