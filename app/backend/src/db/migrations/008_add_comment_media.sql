CREATE TABLE IF NOT EXISTS "comments_new" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "post_id" integer REFERENCES "posts"("id") ON DELETE CASCADE,
  "quick_post_id" uuid REFERENCES "quick_posts"("id") ON DELETE CASCADE,
  "author_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "content" text NOT NULL,
  "parent_comment_id" uuid REFERENCES "comments"("id"),
  "upvotes" integer DEFAULT 0,
  "downvotes" integer DEFAULT 0,
  "moderation_status" varchar(24) DEFAULT 'active',
  "media" jsonb,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

INSERT INTO "comments_new" ("id", "post_id", "quick_post_id", "author_id", "content", "parent_comment_id", "upvotes", "downvotes", "moderation_status", "created_at", "updated_at")
SELECT "id", "post_id", "quick_post_id", "author_id", "content", "parent_comment_id", "upvotes", "downvotes", "moderation_status", "created_at", "updated_at"
FROM "comments";

DROP TABLE "comments";
ALTER TABLE "comments_new" RENAME TO "comments";

-- Recreate indices
CREATE INDEX "idx_comments_post_id" ON "comments" ("post_id");
CREATE INDEX "idx_comments_quick_post_id" ON "comments" ("quick_post_id");
CREATE INDEX "idx_comments_author_id" ON "comments" ("author_id");
CREATE INDEX "idx_comments_created_at" ON "comments" ("created_at");
