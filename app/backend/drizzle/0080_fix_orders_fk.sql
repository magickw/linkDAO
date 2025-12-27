ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_listing_id_listings_id_fk";
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_listing_id_products_id_fk" FOREIGN KEY ("listing_id") REFERENCES "products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
