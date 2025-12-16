ALTER TABLE "nfts" ADD COLUMN "image_hash" varchar(255);--> statement-breakpoint
ALTER TABLE "nfts" ADD COLUMN "animation_url" text;--> statement-breakpoint
ALTER TABLE "nfts" ADD COLUMN "animation_hash" varchar(255);--> statement-breakpoint
ALTER TABLE "nfts" ADD COLUMN "is_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "nfts" ADD COLUMN "verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "refund_transactions" ADD COLUMN "initiated_at" timestamp;--> statement-breakpoint
ALTER TABLE "returns" ADD COLUMN "refund_method" varchar(50);--> statement-breakpoint
ALTER TABLE "returns" ADD COLUMN "inspected_by" uuid;--> statement-breakpoint
ALTER TABLE "returns" ADD COLUMN "item_condition" varchar(20);--> statement-breakpoint
ALTER TABLE "returns" ADD COLUMN "inspection_notes" text;--> statement-breakpoint
ALTER TABLE "returns" ADD COLUMN "inspection_photos" text;--> statement-breakpoint
ALTER TABLE "returns" ADD COLUMN "inspection_passed" boolean;