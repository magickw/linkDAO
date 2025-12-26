-- Migration for Contacts System

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create contacts table
CREATE TABLE IF NOT EXISTS "contacts" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "ownerId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "walletAddress" VARCHAR(66) NOT NULL,
    "nickname" VARCHAR(255) NOT NULL,
    "ensName" VARCHAR(255),
    "avatar" TEXT,
    "notes" TEXT,
    "isVerified" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_contacts_owner_wallet" ON "contacts" ("ownerId", "walletAddress");
CREATE INDEX IF NOT EXISTS "idx_contacts_owner_id" ON "contacts" ("ownerId");

-- Create contact_groups table
CREATE TABLE IF NOT EXISTS "contact_groups" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "ownerId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "name" VARCHAR(100) NOT NULL,
    "icon" VARCHAR(50),
    "color" VARCHAR(7),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_contact_groups_owner_name" ON "contact_groups" ("ownerId", "name");

-- Create contact_to_groups join table
CREATE TABLE IF NOT EXISTS "contact_to_groups" (
    "contactId" UUID NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
    "groupId" UUID NOT NULL REFERENCES "contact_groups"("id") ON DELETE CASCADE,
    PRIMARY KEY ("contactId", "groupId")
);

-- Create contact_tags join table
CREATE TABLE IF NOT EXISTS "contact_tags" (
    "contactId" UUID NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
    "tag" VARCHAR(64) NOT NULL,
    PRIMARY KEY ("contactId", "tag")
);
