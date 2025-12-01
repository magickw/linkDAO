-- Refund Financial Records Schema
-- This migration creates tables for tracking refund transactions, provider-specific details, and reconciliation status

-- Main refund financial records table
CREATE TABLE IF NOT EXISTS "refund_financial_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "return_id" uuid NOT NULL,
  "refund_id" varchar(255) NOT NULL,
  "original_amount" numeric(20, 8) NOT NULL,
  "refund_amount" numeric(20, 8) NOT NULL,
  "processing_fee" numeric(20, 8) DEFAULT '0' NOT NULL,
  "platform_fee_impact" numeric(20, 8) DEFAULT '0' NOT NULL,
  "seller_impact" numeric(20, 8) DEFAULT '0' NOT NULL,
  "payment_provider" varchar(50) NOT NULL,
  "provider_transaction_id" varchar(255),
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "processed_at" timestamp,
  "reconciled" boolean DEFAULT false NOT NULL,
  "reconciled_at" timestamp,
  "currency" varchar(10) DEFAULT 'USD' NOT NULL,
  "refund_method" varchar(50),
  "failure_reason" text,
  "retry_count" integer DEFAULT 0 NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Provider-specific transaction details table
CREATE TABLE IF NOT EXISTS "refund_provider_transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "refund_record_id" uuid NOT NULL REFERENCES "refund_financial_records"("id") ON DELETE CASCADE,
  "provider_name" varchar(50) NOT NULL,
  "provider_transaction_id" varchar(255) NOT NULL,
  "provider_status" varchar(50) NOT NULL,
  "provider_response" jsonb,
  "transaction_type" varchar(50) NOT NULL,
  "amount" numeric(20, 8) NOT NULL,
  "currency" varchar(10) NOT NULL,
  "fee_amount" numeric(20, 8) DEFAULT '0',
  "net_amount" numeric(20, 8) NOT NULL,
  "exchange_rate" numeric(20, 8),
  "destination_account" varchar(255),
  "source_account" varchar(255),
  "blockchain_tx_hash" varchar(66),
  "blockchain_network" varchar(50),
  "confirmation_count" integer DEFAULT 0,
  "estimated_completion" timestamp,
  "completed_at" timestamp,
  "failed_at" timestamp,
  "failure_code" varchar(50),
  "failure_message" text,
  "webhook_received" boolean DEFAULT false,
  "webhook_data" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Reconciliation status tracking table
CREATE TABLE IF NOT EXISTS "refund_reconciliation_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "refund_record_id" uuid NOT NULL REFERENCES "refund_financial_records"("id") ON DELETE CASCADE,
  "reconciliation_date" date NOT NULL,
  "reconciliation_status" varchar(30) DEFAULT 'pending' NOT NULL,
  "expected_amount" numeric(20, 8) NOT NULL,
  "actual_amount" numeric(20, 8),
  "discrepancy_amount" numeric(20, 8) DEFAULT '0',
  "discrepancy_reason" text,
  "reconciled_by" uuid,
  "reconciliation_notes" text,
  "supporting_documents" jsonb,
  "resolution_status" varchar(30),
  "resolution_notes" text,
  "resolved_at" timestamp,
  "resolved_by" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Refund transaction audit log
CREATE TABLE IF NOT EXISTS "refund_transaction_audit_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "refund_record_id" uuid NOT NULL REFERENCES "refund_financial_records"("id") ON DELETE CASCADE,
  "action_type" varchar(50) NOT NULL,
  "action_description" text NOT NULL,
  "performed_by" uuid,
  "performed_by_role" varchar(30),
  "previous_state" jsonb,
  "new_state" jsonb,
  "ip_address" varchar(45),
  "user_agent" text,
  "timestamp" timestamp DEFAULT now() NOT NULL
);

-- Refund batch processing records
CREATE TABLE IF NOT EXISTS "refund_batch_processing" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "batch_id" varchar(100) NOT NULL UNIQUE,
  "provider_name" varchar(50) NOT NULL,
  "total_refunds" integer NOT NULL,
  "successful_refunds" integer DEFAULT 0,
  "failed_refunds" integer DEFAULT 0,
  "pending_refunds" integer DEFAULT 0,
  "total_amount" numeric(20, 8) NOT NULL,
  "processed_amount" numeric(20, 8) DEFAULT '0',
  "batch_status" varchar(30) DEFAULT 'processing' NOT NULL,
  "started_at" timestamp DEFAULT now() NOT NULL,
  "completed_at" timestamp,
  "error_summary" jsonb,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Refund batch items
CREATE TABLE IF NOT EXISTS "refund_batch_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "batch_id" uuid NOT NULL REFERENCES "refund_batch_processing"("id") ON DELETE CASCADE,
  "refund_record_id" uuid NOT NULL REFERENCES "refund_financial_records"("id") ON DELETE CASCADE,
  "processing_order" integer NOT NULL,
  "item_status" varchar(30) DEFAULT 'pending' NOT NULL,
  "processed_at" timestamp,
  "error_message" text,
  "retry_count" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Indexes for refund_financial_records
CREATE INDEX IF NOT EXISTS "idx_refund_records_return_id" ON "refund_financial_records"("return_id");
CREATE INDEX IF NOT EXISTS "idx_refund_records_refund_id" ON "refund_financial_records"("refund_id");
CREATE INDEX IF NOT EXISTS "idx_refund_records_status" ON "refund_financial_records"("status");
CREATE INDEX IF NOT EXISTS "idx_refund_records_provider" ON "refund_financial_records"("payment_provider");
CREATE INDEX IF NOT EXISTS "idx_refund_records_reconciled" ON "refund_financial_records"("reconciled");
CREATE INDEX IF NOT EXISTS "idx_refund_records_created_at" ON "refund_financial_records"("created_at");
CREATE INDEX IF NOT EXISTS "idx_refund_records_processed_at" ON "refund_financial_records"("processed_at");
CREATE INDEX IF NOT EXISTS "idx_refund_records_provider_tx_id" ON "refund_financial_records"("provider_transaction_id");

-- Indexes for refund_provider_transactions
CREATE INDEX IF NOT EXISTS "idx_provider_tx_refund_record" ON "refund_provider_transactions"("refund_record_id");
CREATE INDEX IF NOT EXISTS "idx_provider_tx_provider_name" ON "refund_provider_transactions"("provider_name");
CREATE INDEX IF NOT EXISTS "idx_provider_tx_provider_tx_id" ON "refund_provider_transactions"("provider_transaction_id");
CREATE INDEX IF NOT EXISTS "idx_provider_tx_status" ON "refund_provider_transactions"("provider_status");
CREATE INDEX IF NOT EXISTS "idx_provider_tx_blockchain_hash" ON "refund_provider_transactions"("blockchain_tx_hash");
CREATE INDEX IF NOT EXISTS "idx_provider_tx_created_at" ON "refund_provider_transactions"("created_at");

-- Indexes for refund_reconciliation_records
CREATE INDEX IF NOT EXISTS "idx_reconciliation_refund_record" ON "refund_reconciliation_records"("refund_record_id");
CREATE INDEX IF NOT EXISTS "idx_reconciliation_date" ON "refund_reconciliation_records"("reconciliation_date");
CREATE INDEX IF NOT EXISTS "idx_reconciliation_status" ON "refund_reconciliation_records"("reconciliation_status");
CREATE INDEX IF NOT EXISTS "idx_reconciliation_discrepancy" ON "refund_reconciliation_records"("discrepancy_amount") WHERE "discrepancy_amount" != 0;

-- Indexes for refund_transaction_audit_log
CREATE INDEX IF NOT EXISTS "idx_audit_log_refund_record" ON "refund_transaction_audit_log"("refund_record_id");
CREATE INDEX IF NOT EXISTS "idx_audit_log_action_type" ON "refund_transaction_audit_log"("action_type");
CREATE INDEX IF NOT EXISTS "idx_audit_log_performed_by" ON "refund_transaction_audit_log"("performed_by");
CREATE INDEX IF NOT EXISTS "idx_audit_log_timestamp" ON "refund_transaction_audit_log"("timestamp");

-- Indexes for refund_batch_processing
CREATE INDEX IF NOT EXISTS "idx_batch_processing_batch_id" ON "refund_batch_processing"("batch_id");
CREATE INDEX IF NOT EXISTS "idx_batch_processing_provider" ON "refund_batch_processing"("provider_name");
CREATE INDEX IF NOT EXISTS "idx_batch_processing_status" ON "refund_batch_processing"("batch_status");
CREATE INDEX IF NOT EXISTS "idx_batch_processing_started_at" ON "refund_batch_processing"("started_at");

-- Indexes for refund_batch_items
CREATE INDEX IF NOT EXISTS "idx_batch_items_batch_id" ON "refund_batch_items"("batch_id");
CREATE INDEX IF NOT EXISTS "idx_batch_items_refund_record" ON "refund_batch_items"("refund_record_id");
CREATE INDEX IF NOT EXISTS "idx_batch_items_status" ON "refund_batch_items"("item_status");

-- Comments for documentation
COMMENT ON TABLE "refund_financial_records" IS 'Main table for tracking all refund financial transactions';
COMMENT ON TABLE "refund_provider_transactions" IS 'Provider-specific transaction details for each refund (Stripe, PayPal, blockchain, etc.)';
COMMENT ON TABLE "refund_reconciliation_records" IS 'Reconciliation status tracking for financial accuracy and discrepancy detection';
COMMENT ON TABLE "refund_transaction_audit_log" IS 'Comprehensive audit trail for all refund transaction modifications';
COMMENT ON TABLE "refund_batch_processing" IS 'Batch processing records for bulk refund operations';
COMMENT ON TABLE "refund_batch_items" IS 'Individual items within refund batch processing operations';

COMMENT ON COLUMN "refund_financial_records"."platform_fee_impact" IS 'Impact on platform fees due to refund';
COMMENT ON COLUMN "refund_financial_records"."seller_impact" IS 'Financial impact on seller revenue';
COMMENT ON COLUMN "refund_provider_transactions"."provider_response" IS 'Raw response from payment provider API';
COMMENT ON COLUMN "refund_provider_transactions"."blockchain_tx_hash" IS 'Transaction hash for blockchain-based refunds';
COMMENT ON COLUMN "refund_reconciliation_records"."discrepancy_amount" IS 'Difference between expected and actual refund amounts';
COMMENT ON COLUMN "refund_reconciliation_records"."supporting_documents" IS 'JSON array of document references for reconciliation';
