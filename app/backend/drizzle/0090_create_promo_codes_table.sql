CREATE TABLE IF NOT EXISTS "promo_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"seller_id" uuid NOT NULL,
	"product_id" uuid,
	"discount_type" varchar(20) NOT NULL,
	"discount_value" numeric(20, 2) NOT NULL,
	"min_order_amount" numeric(20, 2),
	"max_discount_amount" numeric(20, 2),
	"start_date" timestamp,
	"end_date" timestamp,
	"usage_limit" integer,
	"usage_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_promo_code_per_seller" UNIQUE("code","seller_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "promo_code_seller_idx" ON "promo_codes" ("seller_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "promo_code_product_idx" ON "promo_codes" ("product_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "promo_code_code_idx" ON "promo_codes" ("code");
