-- Newsletter Subscriptions Table
CREATE TABLE IF NOT EXISTS "newsletter_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"subscribed_at" timestamp DEFAULT now() NOT NULL,
	"unsubscribed_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"subscription_metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_subscriptions_email_unique" UNIQUE("email")
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "idx_newsletter_subscriptions_email" ON "newsletter_subscriptions" ("email");
CREATE INDEX IF NOT EXISTS "idx_newsletter_subscriptions_active" ON "newsletter_subscriptions" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_newsletter_subscriptions_created" ON "newsletter_subscriptions" ("created_at");

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_newsletter_subscriptions_updated_at ON newsletter_subscriptions;
CREATE TRIGGER update_newsletter_subscriptions_updated_at 
    BEFORE UPDATE ON newsletter_subscriptions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();