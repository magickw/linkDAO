ALTER TABLE "products" ADD COLUMN "main_category" varchar(50);
ALTER TABLE "products" ADD COLUMN "sub_category" varchar(100);
ALTER TABLE "products" ADD COLUMN "is_physical" boolean DEFAULT false;
ALTER TABLE "products" ADD COLUMN "price_fiat" numeric(20, 2);
ALTER TABLE "products" ADD COLUMN "defi_protocol" varchar(100);
ALTER TABLE "products" ADD COLUMN "defi_asset_type" varchar(50);
ALTER TABLE "products" ADD COLUMN "current_apy" numeric(5, 2);
ALTER TABLE "products" ADD COLUMN "weight" numeric(10, 3);
ALTER TABLE "products" ADD COLUMN "condition" varchar(20) DEFAULT 'new';

CREATE INDEX "idx_products_main_category" ON "products" ("main_category");
