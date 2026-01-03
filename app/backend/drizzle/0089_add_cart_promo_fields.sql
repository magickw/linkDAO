ALTER TABLE "cart_items" ADD COLUMN "applied_promo_code_id" uuid;
ALTER TABLE "cart_items" ADD COLUMN "applied_discount" numeric(20, 8) DEFAULT '0';
DO $$ BEGIN
 ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_applied_promo_code_id_promo_codes_id_fk" FOREIGN KEY ("applied_promo_code_id") REFERENCES "promo_codes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
