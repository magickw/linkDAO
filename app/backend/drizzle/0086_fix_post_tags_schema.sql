-- Fix post_tags schema mismatch (Integer vs UUID)
DROP TABLE IF EXISTS "post_tags";

CREATE TABLE IF NOT EXISTS "post_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" uuid,
	"tag" varchar(64) NOT NULL,
	"created_at" timestamp DEFAULT now()
);

DO $$ BEGIN
 ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "post_tag_idx" ON "post_tags" ("post_id","tag");
