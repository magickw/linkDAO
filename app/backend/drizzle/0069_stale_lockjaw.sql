CREATE TABLE "refund_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"return_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD',
	"refund_type" varchar(20) DEFAULT 'full',
	"provider" varchar(50) NOT NULL,
	"provider_refund_id" varchar(100),
	"provider_fee" numeric(10, 2) DEFAULT '0',
	"status" varchar(20) DEFAULT 'pending',
	"failure_reason" text,
	"processed_at" timestamp,
	"completed_at" timestamp,
	"error_message" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "return_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid,
	"buyer_id" uuid,
	"date" date DEFAULT CURRENT_DATE,
	"total_returns" integer DEFAULT 0,
	"approved_returns" integer DEFAULT 0,
	"rejected_returns" integer DEFAULT 0,
	"completed_returns" integer DEFAULT 0,
	"total_refund_amount" numeric(12, 2) DEFAULT '0',
	"average_processing_time_hours" numeric(8, 2),
	"return_rate_percentage" numeric(5, 2),
	"top_return_reasons" jsonb,
	"risk_distribution" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "return_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"return_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"sender_role" varchar(20) NOT NULL,
	"message" text NOT NULL,
	"attachments" jsonb,
	"is_internal" boolean DEFAULT false,
	"read_by_buyer" boolean DEFAULT false,
	"read_by_seller" boolean DEFAULT false,
	"read_by_admin" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "return_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"accepts_returns" boolean DEFAULT true,
	"return_window_days" integer DEFAULT 30,
	"auto_approve_low_risk" boolean DEFAULT false,
	"requires_original_packaging" boolean DEFAULT true,
	"restocking_fee_percentage" numeric(5, 2) DEFAULT '0',
	"return_shipping_paid_by" varchar(10) DEFAULT 'buyer',
	"accepted_reasons" text[] DEFAULT '{"defective","not_as_described","changed_mind","damaged_in_shipping"}',
	"excluded_categories" text[],
	"minimum_order_value" numeric(10, 2),
	"maximum_returns_per_customer" integer DEFAULT 10,
	"policy_text" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "return_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"return_id" uuid NOT NULL,
	"from_status" varchar(20),
	"to_status" varchar(20) NOT NULL,
	"notes" text,
	"changed_by" uuid,
	"changed_by_role" varchar(20),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "returns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"buyer_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"return_reason" varchar(50) NOT NULL,
	"return_reason_details" text,
	"items_to_return" jsonb NOT NULL,
	"original_amount" numeric(10, 2) NOT NULL,
	"refund_amount" numeric(10, 2),
	"restocking_fee" numeric(10, 2) DEFAULT '0',
	"return_shipping_cost" numeric(10, 2) DEFAULT '0',
	"status" varchar(20) DEFAULT 'requested',
	"refund_status" varchar(20) DEFAULT 'pending',
	"risk_score" integer DEFAULT 0,
	"risk_level" varchar(10) DEFAULT 'low',
	"risk_factors" text[],
	"requires_manual_review" boolean DEFAULT false,
	"return_label_url" text,
	"return_tracking_number" varchar(100),
	"return_carrier" varchar(50),
	"refund_transaction_id" varchar(100),
	"approved_at" timestamp,
	"approved_by" uuid,
	"rejected_at" timestamp,
	"rejected_by" uuid,
	"rejection_reason" text,
	"shipped_at" timestamp,
	"received_at" timestamp,
	"inspected_at" timestamp,
	"refunded_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "refund_transactions" ADD CONSTRAINT "refund_transactions_return_id_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."returns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_messages" ADD CONSTRAINT "return_messages_return_id_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."returns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_status_history" ADD CONSTRAINT "return_status_history_return_id_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."returns"("id") ON DELETE cascade ON UPDATE no action;