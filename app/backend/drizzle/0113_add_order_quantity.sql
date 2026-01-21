-- Add quantity column to orders table
ALTER TABLE "orders" ADD COLUMN "quantity" integer DEFAULT 1 NOT NULL;
