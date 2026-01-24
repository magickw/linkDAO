import { pgTable, serial, varchar, text, timestamp, integer, uuid, primaryKey, index, boolean, numeric, foreignKey, jsonb, interval, unique, date, decimal } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import * as marketplaceSchema from "./marketplaceSchema";
import * as buyerDataSchema from "./buyerDataSchema";
export { marketplaceSchema, buyerDataSchema };

// Users / Profiles
export const addresses = pgTable("addresses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar("type", { length: 20 }).notNull(), // 'billing' or 'shipping'
  isDefault: boolean("is_default").default(false),

  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  company: varchar("company", { length: 200 }),
  address1: varchar("address1", { length: 255 }).notNull(),
  address2: varchar("address2", { length: 255 }),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 100 }).notNull(),
  zipCode: varchar("zip_code", { length: 20 }).notNull(),
  country: varchar("country", { length: 2 }).notNull(),
  phone: varchar("phone", { length: 20 }),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (t) => ({
  userTypeIdx: index("idx_addresses_user_type").on(t.userId, t.type),
  userIdIdx: index("idx_addresses_user_id").on(t.userId),
  userFk: foreignKey({
    columns: [t.userId],
    foreignColumns: [users.id]
  })
}));

// Users / Profiles
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  walletAddress: varchar("wallet_address", { length: 66 }).notNull().unique(),
  handle: varchar("handle", { length: 64 }).unique(),
  displayName: varchar("display_name", { length: 100 }), // Public display name
  ens: varchar("ens", { length: 255 }), // ENS name (public)
  avatarCid: text("avatar_cid"), // Avatar image IPFS CID or URL (public)
  bioCid: text("bio_cid"), // Bio text (public)
  profileCid: text("profile_cid"), // Legacy IPFS metadata (deprecated)
  physicalAddress: text("physical_address"), // JSON object for encrypted private data (addresses, names, etc.)

  // Role field for admin functionality
  role: varchar("role", { length: 32 }).default('user'),

  // Admin credentials fields
  email: varchar("email", { length: 255 }).unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  emailVerified: boolean("email_verified").default(false),
  permissions: jsonb("permissions").default('[]'),
  lastLogin: timestamp("last_login"),
  loginAttempts: integer("login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),

  // Employee management fields
  isEmployee: boolean("is_employee").default(false),
  employeeStatus: varchar("employee_status", { length: 20 }).default('active'),
  invitedBy: uuid("invited_by"),
  invitedAt: timestamp("invited_at"),

  // Billing address fields
  billingFirstName: varchar("billing_first_name", { length: 100 }),
  billingLastName: varchar("billing_last_name", { length: 100 }),
  billingCompany: varchar("billing_company", { length: 200 }),
  billingAddress1: varchar("billing_address1", { length: 255 }),
  billingAddress2: varchar("billing_address2", { length: 255 }),
  billingCity: varchar("billing_city", { length: 100 }),
  billingState: varchar("billing_state", { length: 100 }),
  billingZipCode: varchar("billing_zip_code", { length: 20 }),
  billingCountry: varchar("billing_country", { length: 2 }),
  billingPhone: varchar("billing_phone", { length: 20 }),

  // Shipping address fields
  shippingFirstName: varchar("shipping_first_name", { length: 100 }),
  shippingLastName: varchar("shipping_last_name", { length: 100 }),
  shippingCompany: varchar("shipping_company", { length: 200 }),
  shippingAddress1: varchar("shipping_address1", { length: 255 }),
  shippingAddress2: varchar("shipping_address2", { length: 255 }),
  shippingCity: varchar("shipping_city", { length: 100 }),
  shippingState: varchar("shipping_state", { length: 100 }),
  shippingZipCode: varchar("shipping_zip_code", { length: 20 }),
  shippingCountry: varchar("shipping_country", { length: 2 }),
  shippingPhone: varchar("shipping_phone", { length: 20 }),
  shippingSameAsBilling: boolean("shipping_same_as_billing").default(true),

  // Profile customization fields
  bannerCid: text("banner_cid"), // Banner image IPFS CID or URL (public)
  website: varchar("website", { length: 500 }), // Primary website URL (public)
  socialLinks: jsonb("social_links").default('[]'), // Social media links array (public)

  // LDAO Token
  ldaoBalance: numeric("ldao_balance", { precision: 20, scale: 8 }).default('0'),

  // Verification status (explicit)
  isVerified: boolean("is_verified").default(false),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Contacts System
export const contacts = pgTable("contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  walletAddress: varchar("wallet_address", { length: 66 }).notNull(),
  nickname: varchar("nickname", { length: 255 }).notNull(),
  ensName: varchar("ens_name", { length: 255 }),
  avatar: text("avatar"),
  notes: text("notes"),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  ownerWalletIdx: index("idx_contacts_owner_wallet").on(t.ownerId, t.walletAddress),
  ownerIdx: index("idx_contacts_owner_id").on(t.ownerId),
}));

export const contactGroups = pgTable("contact_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  icon: varchar("icon", { length: 50 }),
  color: varchar("color", { length: 7 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  ownerNameIdx: index("idx_contact_groups_owner_name").on(t.ownerId, t.name),
}));

export const contactToGroups = pgTable("contact_to_groups", {
  contactId: uuid("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  groupId: uuid("group_id").notNull().references(() => contactGroups.id, { onDelete: "cascade" }),
}, (t) => ({
  pk: primaryKey(t.contactId, t.groupId),
}));

export const contactTags = pgTable("contact_tags", {
  contactId: uuid("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  tag: varchar("tag", { length: 64 }).notNull(),
}, (t) => ({
  pk: primaryKey(t.contactId, t.tag),
}));

// Posts
export const posts = pgTable("posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  shareId: varchar("share_id", { length: 16 }), // Short, shareable ID for community posts
  authorId: uuid("author_id").references(() => users.id),
  title: text("title"), // Making title nullable to handle existing data
  content: text("content"), // Actual post content (fallback when IPFS unavailable)
  contentCid: text("content_cid").notNull(),
  parentId: uuid("parent_id"),
  isRepost: boolean("is_repost").default(false),
  mediaCids: text("media_cids"), // JSON array of media IPFS CIDs
  mediaUrls: text("media_urls"), // JSON array of media URLs (HTTP/HTTPS)
  location: jsonb("location"), // { name, lat, lng }
  tags: text("tags"), // JSON array of tags
  stakedValue: numeric("staked_value").default('0'), // Total tokens staked on this post
  reputationScore: integer("reputation_score").default(0), // Author's reputation score at time of posting
  dao: varchar("dao", { length: 64 }), // DAO community this post belongs to (legacy)
  communityId: uuid("community_id"), // New reference to communities table
  pollId: uuid("poll_id"), // Reference to poll if this is a poll post
  isTokenGated: boolean("is_token_gated").default(false), // Whether this post is token gated
  gatedContentPreview: text("gated_content_preview"), // Preview content for gated posts
  // Moderation fields
  moderationStatus: varchar("moderation_status", { length: 24 }).default('active'),
  status: varchar("status", { length: 24 }).default('active'), // Alias for moderationStatus
  moderationWarning: text("moderation_warning"),
  riskScore: numeric("risk_score", { precision: 5, scale: 4 }).default('0'),
  // Pin fields
  isPinned: boolean("is_pinned").default(false),
  pinnedAt: timestamp("pinned_at"),
  pinnedBy: text("pinned_by"),
  upvotes: integer("upvotes").default(0),
  downvotes: integer("downvotes").default(0),
  views: integer("views").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  authorFk: foreignKey({
    columns: [t.authorId],
    foreignColumns: [users.id]
  }),
  communityFk: foreignKey({
    columns: [t.communityId],
    foreignColumns: [communities.id]
  }),
  shareIdIdx: index("idx_posts_share_id").on(t.shareId),
  communityIdIdx: index("idx_posts_community_id").on(t.communityId),
  tokenGatedIdx: index("idx_posts_token_gated").on(t.isTokenGated),
}));

// Statuses - Twitter/Facebook style status updates
// (Formerly quick_posts)
export const statuses = pgTable("statuses", {
  id: uuid("id").defaultRandom().primaryKey(),
  shareId: varchar("share_id", { length: 16 }).notNull().unique(), // Short, shareable ID for URLs
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content"), // Actual post content (fallback when IPFS unavailable)
  contentCid: text("content_cid").notNull(),
  parentId: uuid("parent_id").references(() => statuses.id, { onDelete: "cascade" }), // For replies
  isRepost: boolean("is_repost").default(false),
  mediaCids: text("media_cids"), // JSON array of media IPFS CIDs
  mediaUrls: text("media_urls"), // JSON array of media URLs (HTTP/HTTPS)
  location: jsonb("location"), // { name, lat, lng }
  tags: text("tags"), // JSON array of tags
  stakedValue: numeric("staked_value").default('0'), // Total tokens staked on this post
  reputationScore: integer("reputation_score").default(0), // Author's reputation score at time of posting
  isTokenGated: boolean("is_token_gated").default(false), // Whether this post is token gated
  gatedContentPreview: text("gated_content_preview"), // Preview content for gated posts
  moderationStatus: varchar("moderation_status", { length: 24 }).default('active'), // 'active' | 'limited' | 'pending_review' | 'blocked'
  moderationWarning: text("moderation_warning"),
  riskScore: numeric("risk_score", { precision: 5, scale: 4 }).default('0'),
  upvotes: integer("upvotes").default(0),
  downvotes: integer("downvotes").default(0),
  views: integer("views").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  authorFk: foreignKey({
    columns: [t.authorId],
    foreignColumns: [users.id]
  }),
  parentFk: foreignKey({
    columns: [t.parentId],
    foreignColumns: [statuses.id]
  }),
  shareIdIdx: index("idx_statuses_share_id").on(t.shareId),
  moderationStatusIdx: index("idx_statuses_moderation_status").on(t.moderationStatus),
  authorIdIdx: index("idx_statuses_author_id").on(t.authorId),
  createdAtIdx: index("idx_statuses_created_at").on(t.createdAt),
}));

// Status Tags - for efficient querying of statuses by tags
export const statusTags = pgTable("status_tags", {
  id: serial("id").primaryKey(),
  statusId: uuid("status_id").notNull().references(() => statuses.id, { onDelete: "cascade" }),
  tag: varchar("tag", { length: 64 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  idx: index("idx_status_tag").on(t.statusId, t.tag),
  statusFk: foreignKey({
    columns: [t.statusId],
    foreignColumns: [statuses.id]
  })
}));

// Comments - for both regular posts and statuses
export const comments = pgTable("comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }),
  statusId: uuid("status_id").references(() => statuses.id, { onDelete: "cascade" }), // Can be null if comment is on a regular post
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  parentCommentId: uuid("parent_comment_id"), // For nested comments/replies
  upvotes: integer("upvotes").default(0),
  downvotes: integer("downvotes").default(0),
  moderationStatus: varchar("moderation_status", { length: 24 }).default('active'),
  media: jsonb("media"), // { type: 'image' | 'gif' | 'sticker', url: string, ... }
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  postFk: foreignKey({
    columns: [t.postId],
    foreignColumns: [posts.id]
  }),
  statusFk: foreignKey({
    columns: [t.statusId],
    foreignColumns: [statuses.id]
  }),
  authorFk: foreignKey({
    columns: [t.authorId],
    foreignColumns: [users.id]
  }),
  parentCommentFk: foreignKey({
    columns: [t.parentCommentId],
    foreignColumns: [comments.id]
  }),
  postIdIdx: index("idx_comments_post_id").on(t.postId),
  statusIdIdx: index("idx_comments_status_id").on(t.statusId),
  authorIdIdx: index("idx_comments_author_id").on(t.authorId),
  createdAtIdx: index("idx_comments_created_at").on(t.createdAt),
}));

// Status Reactions - token-based reactions to statuses
export const statusReactions = pgTable("status_reactions", {
  id: serial("id").primaryKey(),
  statusId: uuid("status_id").notNull().references(() => statuses.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 32 }).notNull(), // 'hot', 'diamond', 'bullish', 'governance', 'art'
  amount: numeric("amount").notNull(), // Amount of tokens staked
  rewardsEarned: numeric("rewards_earned").default('0'), // Rewards earned by the post author
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  idx: index("idx_status_reaction_user").on(t.statusId, t.userId),
  statusFk: foreignKey({
    columns: [t.statusId],
    foreignColumns: [statuses.id]
  }),
  userFk: foreignKey({
    columns: [t.userId],
    foreignColumns: [users.id]
  })
}));

// Status Tips - direct token transfers to status authors
export const statusTips = pgTable("status_tips", {
  id: serial("id").primaryKey(),
  statusId: uuid("status_id").notNull().references(() => statuses.id, { onDelete: "cascade" }),
  fromUserId: uuid("from_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  toUserId: uuid("to_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 64 }).notNull(), // e.g. USDC, LNK
  amount: numeric("amount").notNull(),
  message: text("message"), // Optional message with the tip
  txHash: varchar("tx_hash", { length: 66 }), // Blockchain transaction hash
  networkName: varchar("network_name", { length: 64 }),
  chainId: integer("chain_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  idx: index("idx_status_tip").on(t.statusId),
  statusFk: foreignKey({
    columns: [t.statusId],
    foreignColumns: [statuses.id]
  }),
  fromUserFk: foreignKey({
    columns: [t.fromUserId],
    foreignColumns: [users.id]
  }),
  toUserFk: foreignKey({
    columns: [t.toUserId],
    foreignColumns: [users.id]
  })
}));

// Status Views - track status views with deduplication
export const statusViews = pgTable("status_views", {
  id: serial("id").primaryKey(),
  statusId: uuid("status_id").notNull().references(() => statuses.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }), // Nullable for anonymous views
  ipAddress: varchar("ip_address", { length: 45 }), // IPv4 or IPv6
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  idx: index("idx_status_view_post_user").on(t.statusId, t.userId),
  createdAtIdx: index("idx_status_view_created_at").on(t.createdAt),
  statusFk: foreignKey({
    columns: [t.statusId],
    foreignColumns: [statuses.id]
  }),
  userFk: foreignKey({
    columns: [t.userId],
    foreignColumns: [users.id]
  })
}));

// Status Bookmarks - user bookmarks for statuses
export const statusBookmarks = pgTable("status_bookmarks", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  statusId: uuid("status_id").notNull().references(() => statuses.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  pk: primaryKey(t.userId, t.statusId),
  userIdx: index("idx_status_bookmark_user").on(t.userId),
  postIdx: index("idx_status_bookmark_post").on(t.statusId),
  userFk: foreignKey({
    columns: [t.userId],
    foreignColumns: [users.id]
  }),
  statusFk: foreignKey({
    columns: [t.statusId],
    foreignColumns: [statuses.id]
  })
}));

// Status Shares - track sharing of statuses
export const statusShares = pgTable("status_shares", {
  id: serial("id").primaryKey(),
  statusId: uuid("status_id").notNull().references(() => statuses.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetType: varchar("target_type", { length: 32 }).notNull(), // 'community', 'dm', 'external'
  targetId: uuid("target_id"), // Community ID or User ID for DMs
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  idx: index("idx_status_share_post_user").on(t.statusId, t.userId),
  createdAtIdx: index("idx_status_share_created_at").on(t.createdAt),
  statusFk: foreignKey({
    columns: [t.statusId],
    foreignColumns: [statuses.id]
  }),
  userFk: foreignKey({
    columns: [t.userId],
    foreignColumns: [users.id]
  })
}));

// Post Tags - for efficient querying of posts by tags
export const postTags = pgTable("post_tags", {
  id: serial("id").primaryKey(),
  postId: uuid("post_id").references(() => posts.id),
  tag: varchar("tag", { length: 64 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  idx: index("post_tag_idx").on(t.postId, t.tag),
  postFk: foreignKey({
    columns: [t.postId],
    foreignColumns: [posts.id]
  })
}));

// Reactions - token-based reactions to posts
export const reactions = pgTable("reactions", {
  id: serial("id").primaryKey(),
  postId: uuid("post_id").references(() => posts.id),
  userId: uuid("user_id").references(() => users.id),
  type: varchar("type", { length: 32 }).notNull(), // 'hot', 'diamond', 'bullish', 'governance', 'art'
  amount: numeric("amount").notNull(), // Amount of tokens staked
  rewardsEarned: numeric("rewards_earned").default('0'), // Rewards earned by the post author
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  idx: index("reaction_post_user_idx").on(t.postId, t.userId),
  postFk: foreignKey({
    columns: [t.postId],
    foreignColumns: [posts.id]
  }),
  userFk: foreignKey({
    columns: [t.userId],
    foreignColumns: [users.id]
  })
}));

// Tips - direct token transfers to post authors
export const tips = pgTable("tips", {
  id: serial("id").primaryKey(),
  postId: uuid("post_id").references(() => posts.id),
  fromUserId: uuid("from_user_id").references(() => users.id),
  toUserId: uuid("to_user_id").references(() => users.id),
  token: varchar("token", { length: 64 }).notNull(), // e.g. USDC, LNK
  amount: numeric("amount").notNull(),
  message: text("message"), // Optional message with the tip
  txHash: varchar("tx_hash", { length: 66 }), // Blockchain transaction hash
  networkName: varchar("network_name", { length: 64 }),
  chainId: integer("chain_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  idx: index("tip_post_idx").on(t.postId),
  postFk: foreignKey({
    columns: [t.postId],
    foreignColumns: [posts.id]
  }),
  fromUserFk: foreignKey({
    columns: [t.fromUserId],
    foreignColumns: [users.id]
  }),
  toUserFk: foreignKey({
    columns: [t.toUserId],
    foreignColumns: [users.id]
  })
}));

// Reaction Purchases - simplified reaction system with revenue sharing
export const reactionPurchases = pgTable("reaction_purchases", {
  id: serial("id").primaryKey(),
  postId: varchar("post_id", { length: 255 }).notNull(), // Can be UUID or integer for compatibility
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  userAddress: varchar("user_address", { length: 66 }).notNull(),
  reactionType: varchar("reaction_type", { length: 32 }).notNull(), // 'hot', 'diamond', 'bullish', 'love', 'laugh', 'wow'
  price: numeric("price", { precision: 20, scale: 8 }).notNull(), // Price paid in LDAO tokens
  authorEarnings: numeric("author_earnings", { precision: 20, scale: 8 }).notNull(), // 70% to post author
  treasuryFee: numeric("treasury_fee", { precision: 20, scale: 8 }).notNull(), // 30% to treasury
  postAuthor: varchar("post_author", { length: 66 }).notNull(), // Post author's wallet address
  txHash: varchar("tx_hash", { length: 66 }), // Blockchain transaction hash
  purchasedAt: timestamp("purchased_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  postIdIdx: index("idx_reaction_purchases_post_id").on(t.postId),
  userIdIdx: index("idx_reaction_purchases_user_id").on(t.userId),
  userAddressIdx: index("idx_reaction_purchases_user_address").on(t.userAddress),
  postAuthorIdx: index("idx_reaction_purchases_post_author").on(t.postAuthor),
  reactionTypeIdx: index("idx_reaction_purchases_reaction_type").on(t.reactionType),
  purchasedAtIdx: index("idx_reaction_purchases_purchased_at").on(t.purchasedAt),
  txHashIdx: index("idx_reaction_purchases_tx_hash").on(t.txHash),
  postTypeIdx: index("idx_reaction_purchases_post_type").on(t.postId, t.reactionType),
  userPostIdx: index("idx_reaction_purchases_user_post").on(t.userId, t.postId),
  authorEarningsIdx: index("idx_reaction_purchases_author_earnings").on(t.postAuthor, t.purchasedAt),
  userFk: foreignKey({
    columns: [t.userId],
    foreignColumns: [users.id]
  })
}));

// Views - track post views with deduplication
export const views = pgTable("views", {
  id: serial("id").primaryKey(),
  postId: uuid("post_id").notNull().references(() => posts.id),
  userId: uuid("user_id").references(() => users.id), // Nullable for anonymous views
  ipAddress: varchar("ip_address", { length: 45 }), // IPv4 or IPv6
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  postUserIdx: index("view_post_user_idx").on(t.postId, t.userId),
  postCreatedIdx: index("view_post_created_idx").on(t.postId, t.createdAt),
  postFk: foreignKey({
    columns: [t.postId],
    foreignColumns: [posts.id]
  }),
  userFk: foreignKey({
    columns: [t.userId],
    foreignColumns: [users.id]
  })
}));

// Bookmarks - user-saved posts and statuses
export const bookmarks = pgTable("bookmarks", {
  userId: uuid("user_id").notNull().references(() => users.id),
  postId: uuid("post_id").references(() => posts.id), // For community posts (nullable)
  statusId: uuid("status_id").references(() => statuses.id), // For feed statuses (nullable)
  contentType: varchar("content_type", { length: 16 }).default('post').notNull(), // 'post' or 'status'
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  userIdx: index("bookmark_user_idx").on(t.userId),
  postIdx: index("bookmark_post_idx").on(t.postId),
  statusIdx: index("bookmark_status_idx").on(t.statusId),
  userFk: foreignKey({
    columns: [t.userId],
    foreignColumns: [users.id]
  })
}));

// Shares - track when users share posts
export const shares = pgTable("shares", {
  id: serial("id").primaryKey(),
  postId: uuid("post_id").notNull().references(() => posts.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  targetType: varchar("target_type", { length: 32 }).notNull(), // 'community', 'dm', 'external'
  targetId: uuid("target_id"), // Community ID or User ID for DMs
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  postUserIdx: index("share_post_user_idx").on(t.postId, t.userId),
  postCreatedIdx: index("share_post_created_idx").on(t.postId, t.createdAt),
  postFk: foreignKey({
    columns: [t.postId],
    foreignColumns: [posts.id]
  }),
  userFk: foreignKey({
    columns: [t.userId],
    foreignColumns: [users.id]
  })
}));

// Follows
export const follows = pgTable("follows", {
  followerId: uuid("follower_id").notNull(),
  followingId: uuid("following_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  pk: primaryKey(t.followerId, t.followingId),
  idx: index("follow_idx").on(t.followerId, t.followingId),
  followerFk: foreignKey({
    columns: [t.followerId],
    foreignColumns: [users.id]
  }),
  followingFk: foreignKey({
    columns: [t.followingId],
    foreignColumns: [users.id]
  })
}));

// User Onboarding Preferences
export const userOnboardingPreferences = pgTable("user_onboarding_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  preferredCategories: text("preferred_categories").array(), // e.g. ['defi', 'nft', 'dao', 'gaming']
  preferredTags: text("preferred_tags").array(), // e.g. ['ethereum', 'trading', 'governance', 'art']
  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
  skipOnboarding: boolean("skip_onboarding").default(false).notNull(), // If user skipped onboarding
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  userIdIdx: index("idx_user_onboarding_user_id").on(t.userId),
  onboardingCompletedIdx: index("idx_user_onboarding_completed").on(t.onboardingCompleted),
  userFk: foreignKey({
    columns: [t.userId],
    foreignColumns: [users.id]
  })
}));

// Payments
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  from: uuid("from").references(() => users.id),
  to: uuid("to").references(() => users.id),
  token: varchar("token", { length: 64 }).notNull(), // e.g. USDC
  amount: varchar("amount", { length: 128 }).notNull(),
  txHash: varchar("tx_hash", { length: 66 }),
  memo: text("memo"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Governance Proposals
export const proposals = pgTable("proposals", {
  id: serial("id").primaryKey(),
  daoId: uuid("dao_id"),
  titleCid: text("title_cid"),
  bodyCid: text("body_cid"),
  startBlock: integer("start_block"),
  endBlock: integer("end_block"),
  status: varchar("status", { length: 32 }).default("pending"),
  yesVotes: numeric("yes_votes", { precision: 20, scale: 8 }).default("0"),
  noVotes: numeric("no_votes", { precision: 20, scale: 8 }).default("0"),
  abstainVotes: numeric("abstain_votes", { precision: 20, scale: 8 }).default("0"),
  totalVotes: numeric("total_votes", { precision: 20, scale: 8 }).default("0"),
  quorumReached: boolean("quorum_reached").default(false),
  proposerId: uuid("proposer_id").references(() => users.id),
  executionEta: timestamp("execution_eta"),
  executedAt: timestamp("executed_at"),
  cancelledAt: timestamp("cancelled_at"),
  // New fields for governance integration
  proposerAddress: varchar("proposer_address", { length: 66 }),
  category: varchar("category", { length: 32 }).default("general"),
  quorum: numeric("quorum", { precision: 20, scale: 8 }),
  executionDelay: integer("execution_delay"),
  requiresStaking: boolean("requires_staking").default(false),
  minStakeToVote: numeric("min_stake_to_vote", { precision: 20, scale: 8 }).default("0"),
  targets: text("targets"), // JSON array of target addresses
  values: text("values"), // JSON array of values
  signatures: text("signatures"), // JSON array of function signatures
  calldatas: text("calldatas"), // JSON array of calldata
  queuedAt: timestamp("queued_at"),
  requiredMajority: integer("required_majority").default(50),
}, (t) => ({
  daoIdx: index("idx_proposals_dao_id").on(t.daoId),
  statusIdx: index("idx_proposals_status").on(t.status),
  proposerIdx: index("idx_proposals_proposer").on(t.proposerId),
  categoryIdx: index("idx_proposals_category").on(t.category),
}));

// Votes
export const votes = pgTable("votes", {
  id: uuid("id").defaultRandom().primaryKey(),
  proposalId: integer("proposal_id").references(() => proposals.id, { onDelete: "cascade" }).notNull(),
  voterId: uuid("voter_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  voteChoice: varchar("vote_choice", { length: 10 }).notNull(),
  votingPower: numeric("voting_power", { precision: 20, scale: 8 }).notNull().default("0"),
  delegatedPower: numeric("delegated_power", { precision: 20, scale: 8 }).default("0"),
  totalPower: numeric("total_power", { precision: 20, scale: 8 }).notNull().default("0"),
  transactionHash: varchar("transaction_hash", { length: 66 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  uniqueVote: primaryKey(t.proposalId, t.voterId),
  proposalIdx: index("idx_votes_proposal_id").on(t.proposalId),
  voterIdx: index("idx_votes_voter_id").on(t.voterId),
  createdAtIdx: index("idx_votes_created_at").on(t.createdAt),
}));

// Voting Delegations
export const votingDelegations = pgTable("voting_delegations", {
  id: uuid("id").defaultRandom().primaryKey(),
  delegatorId: uuid("delegator_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  delegateId: uuid("delegate_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  daoId: uuid("dao_id"),
  votingPower: numeric("voting_power", { precision: 20, scale: 8 }).notNull().default("0"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
}, (t) => ({
  uniqueDelegation: primaryKey(t.delegatorId, t.delegateId, t.daoId),
  delegatorIdx: index("idx_voting_delegations_delegator").on(t.delegatorId),
  delegateIdx: index("idx_voting_delegations_delegate").on(t.delegateId),
  daoIdx: index("idx_voting_delegations_dao").on(t.daoId),
  activeIdx: index("idx_voting_delegations_active").on(t.active),
}));

// Voting Power Snapshots
export const votingPowerSnapshots = pgTable("voting_power_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  daoId: uuid("dao_id"),
  proposalId: integer("proposal_id").references(() => proposals.id, { onDelete: "cascade" }),
  tokenBalance: numeric("token_balance", { precision: 20, scale: 8 }).notNull().default("0"),
  stakingMultiplier: numeric("staking_multiplier", { precision: 5, scale: 2 }).default("1.0"),
  delegatedPower: numeric("delegated_power", { precision: 20, scale: 8 }).default("0"),
  totalVotingPower: numeric("total_voting_power", { precision: 20, scale: 8 }).notNull().default("0"),
  snapshotBlock: integer("snapshot_block"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  userIdx: index("idx_voting_power_snapshots_user").on(t.userId),
  daoIdx: index("idx_voting_power_snapshots_dao").on(t.daoId),
  proposalIdx: index("idx_voting_power_snapshots_proposal").on(t.proposalId),
  blockIdx: index("idx_voting_power_snapshots_block").on(t.snapshotBlock),
}));

// Governance Settings
export const governanceSettings = pgTable("governance_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  daoId: uuid("dao_id").unique(),
  votingTokenAddress: varchar("voting_token_address", { length: 66 }),
  votingDelay: integer("voting_delay").default(86400), // 1 day
  votingPeriod: integer("voting_period").default(604800), // 7 days
  proposalThreshold: numeric("proposal_threshold", { precision: 20, scale: 8 }).default("1000"),
  quorumPercentage: integer("quorum_percentage").default(10),
  executionDelay: integer("execution_delay").default(172800), // 2 days
  requiredMajority: integer("required_majority").default(50),
  allowDelegation: boolean("allow_delegation").default(true),
  stakingEnabled: boolean("staking_enabled").default(false),
  stakingMultiplierMax: numeric("staking_multiplier_max", { precision: 5, scale: 2 }).default("2.0"),
  riskScore: numeric("risk_score", { precision: 5, scale: 4 }).default('0'),
  upvotes: integer("upvotes").default(0),
  downvotes: integer("downvotes").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  daoIdx: index("idx_governance_settings_dao").on(t.daoId),
}));

// AI Bot Configs
export const bots = pgTable("bots", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 128 }),
  persona: text("persona"),
  scopes: text("scopes"), // JSON of permissions
  model: varchar("model", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Embeddings (simplified without pgvector)
export const embeddings = pgTable("embeddings", {
  id: serial("id").primaryKey(),
  objectType: varchar("object_type", { length: 32 }), // "post", "proposal"
  objectId: integer("object_id"),
  // Storing embedding as JSON text instead of vector type
  embedding: text("embedding"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Product Categories
export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  parentId: uuid("parent_id"),
  path: text("path").notNull(), // JSON array of category names
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  parentFk: foreignKey({
    columns: [t.parentId],
    foreignColumns: [t.id]
  })
}));

// Products
export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  sellerId: uuid("seller_id").references(() => users.id).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").notNull(),
  priceAmount: numeric("price_amount", { precision: 20, scale: 8 }).notNull(),
  priceCurrency: varchar("price_currency", { length: 10 }).notNull(),
  categoryId: uuid("category_id").references(() => categories.id).notNull(),
  images: text("images").notNull(), // JSON array of IPFS hashes
  metadata: text("metadata").notNull(), // JSON ProductMetadata
  inventory: integer("inventory").notNull().default(0),
  inventoryHolds: integer("inventory_holds").notNull().default(0), // Number of items currently held in temporary reservations
  status: varchar("status", { length: 32 }).default("active"), // 'active' | 'inactive' | 'sold_out' | 'suspended' | 'draft'
  tags: text("tags"), // JSON array of tags
  shipping: text("shipping"), // JSON ShippingInfo
  nft: text("nft"), // JSON NFTInfo
  views: integer("views").default(0),
  favorites: integer("favorites").default(0),
  salesCount: integer("sales_count").default(0),
  // Enhanced fields for better listing management
  listingStatus: varchar("listing_status", { length: 20 }).default("draft"),
  publishedAt: timestamp("published_at"),
  searchVector: text("search_vector"), // For full-text search optimization
  imageIpfsHashes: text("image_ipfs_hashes"), // JSON array of IPFS hashes
  imageCdnUrls: text("image_cdn_urls"), // JSON object with CDN URLs
  primaryImageIndex: integer("primary_image_index").default(0),
  seoTitle: varchar("seo_title", { length: 255 }),
  seoDescription: text("seo_description"),
  seoKeywords: text("seo_keywords"), // JSON array of SEO keywords
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),

  // Consolidated fields from marketplace_products
  mainCategory: varchar("main_category", { length: 50 }), // For easier categorization without joins
  subCategory: varchar("sub_category", { length: 100 }),
  isPhysical: boolean("is_physical").default(false),
  priceFiat: numeric("price_fiat", { precision: 20, scale: 2 }),
  metadataUri: text("metadata_uri"), // IPFS hash for digital goods/metadata
  // DeFi specific fields from marketplace_products
  defiProtocol: varchar("defi_protocol", { length: 100 }),
  defiAssetType: varchar("defi_asset_type", { length: 50 }),
  underlyingAssets: jsonb("underlying_assets"), // Array of { address, symbol, weight }
  currentApy: numeric("current_apy", { precision: 5, scale: 2 }),
  lockPeriod: integer("lock_period"), // Lock period in days
  maturityDate: timestamp("maturity_date"), // For time-locked positions
  riskLevel: varchar("risk_level", { length: 20 }).default("medium"), // 'low' | 'medium' | 'high'
  // Physical goods specific fields from marketplace_products
  weight: numeric("weight", { precision: 10, scale: 3 }), // Weight in kg
  dimensions: jsonb("dimensions"), // { length, width, height } in cm
  condition: varchar("condition", { length: 20 }).default("new"), // 'new' | 'used' | 'refurbished'
  // Service specific fields from marketplace_products
  serviceDuration: integer("service_duration"), // Duration in hours
  deliveryMethod: varchar("delivery_method", { length: 20 }), // 'online' | 'in-person' | 'hybrid'
}, (t) => ({
  sellerFk: foreignKey({
    columns: [t.sellerId],
    foreignColumns: [users.id]
  }),
  categoryFk: foreignKey({
    columns: [t.categoryId],
    foreignColumns: [categories.id]
  }),
  titleIdx: index("product_title_idx").on(t.title),
  statusIdx: index("product_status_idx").on(t.status),
  categoryIdx: index("product_category_idx").on(t.categoryId),
  sellerIdx: index("product_seller_idx").on(t.sellerId),
  priceIdx: index("product_price_idx").on(t.priceAmount),
  listingStatusIdx: index("idx_products_listing_status").on(t.listingStatus),
  publishedAtIdx: index("idx_products_published_at").on(t.publishedAt),
  mainCategoryIdx: index("idx_products_main_category").on(t.mainCategory),
}));

// Product Tags - for efficient querying
export const productTags = pgTable("product_tags", {
  id: serial("id").primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  tag: varchar("tag", { length: 64 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  idx: index("product_tag_idx").on(t.productId, t.tag),
  productFk: foreignKey({
    columns: [t.productId],
    foreignColumns: [products.id]
  })
}));

// Promo Codes
export const promoCodes = pgTable("promo_codes", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 50 }).notNull(),
  sellerId: uuid("seller_id").references(() => users.id).notNull(), // Promo codes belong to a seller
  productId: uuid("product_id").references(() => products.id), // Optional: specific to a product
  discountType: varchar("discount_type", { length: 20 }).notNull(), // 'percentage' | 'fixed_amount'
  discountValue: numeric("discount_value", { precision: 20, scale: 2 }).notNull(),
  minOrderAmount: numeric("min_order_amount", { precision: 20, scale: 2 }),
  maxDiscountAmount: numeric("max_discount_amount", { precision: 20, scale: 2 }),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  usageLimit: integer("usage_limit"),
  usageCount: integer("usage_count").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  uniqueCode: unique("unique_promo_code_per_seller").on(t.code, t.sellerId),
  sellerIdx: index("promo_code_seller_idx").on(t.sellerId),
  productIdx: index("promo_code_product_idx").on(t.productId),
  codeIdx: index("promo_code_code_idx").on(t.code),
  sellerFk: foreignKey({
    columns: [t.sellerId],
    foreignColumns: [users.id]
  }),
  productFk: foreignKey({
    columns: [t.productId],
    foreignColumns: [products.id]
  })
}));

// Saved For Later - items users want to purchase later
export const savedForLater = pgTable("saved_for_later", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  savedAt: timestamp("saved_at").defaultNow().notNull(),
  notes: text("notes"),
  priceAtSave: numeric("price_at_save", { precision: 20, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  userProductUnique: unique("saved_for_later_user_product_unique").on(t.userId, t.productId),
  userIdIdx: index("idx_saved_for_later_user_id").on(t.userId),
  productIdIdx: index("idx_saved_for_later_product_id").on(t.productId),
  savedAtIdx: index("idx_saved_for_later_saved_at").on(t.savedAt),
}));


// Inventory Holds - for temporary inventory reservations during checkout
export const inventoryHolds = pgTable("inventory_holds", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  heldBy: uuid("held_by").references(() => users.id, { onDelete: "cascade" }), // User who holds the inventory
  quantity: integer("quantity").notNull(),
  orderId: varchar("order_id", { length: 255 }), // Associated order ID
  holdType: varchar("hold_type", { length: 50 }).default("order_pending"), // 'order_pending' | 'checkout' | 'reservation'
  expiresAt: timestamp("expires_at").notNull(),
  status: varchar("status", { length: 20 }).default("active"), // 'active' | 'released' | 'converted' | 'consumed' | 'order_created'
  metadata: text("metadata"), // JSON metadata for additional context
  releaseReason: varchar("release_reason", { length: 50 }), // 'order_completed' | 'order_cancelled' | 'expired'
  releasedAt: timestamp("released_at"), // When the hold was released
  checkoutSessionId: varchar("checkout_session_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  productIdIdx: index("idx_inventory_holds_product_id").on(t.productId),
  heldByIdx: index("idx_inventory_holds_held_by").on(t.heldBy),
  orderIdIdx: index("idx_inventory_holds_order_id").on(t.orderId),
  expiresAtIdx: index("idx_inventory_holds_expires_at").on(t.expiresAt),
  statusIdx: index("idx_inventory_holds_status").on(t.status),
  holdTypeIdx: index("idx_inventory_holds_hold_type").on(t.holdType),
}));

// ENS Verifications - for verified ENS names
export const ensVerifications = pgTable("ens_verifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  walletAddress: varchar("wallet_address", { length: 66 }).notNull(),
  ensName: varchar("ens_name", { length: 255 }).notNull(),
  resolvedAddress: varchar("resolved_address", { length: 66 }).notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  verifiedAt: timestamp("verified_at"),
  lastCheckedAt: timestamp("last_checked_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  userIdIdx: index("idx_ens_verifications_user_id").on(t.userId),
  walletAddressIdx: index("idx_ens_verifications_wallet_address").on(t.walletAddress),
  ensNameIdx: index("idx_ens_verifications_ens_name").on(t.ensName),
  isVerifiedIdx: index("idx_ens_verifications_is_verified").on(t.isVerified),
  expiresAtIdx: index("idx_ens_verifications_expires_at").on(t.expiresAt),
}));

// Sellers table for enhanced store functionality
export const sellers = pgTable("sellers", {
  id: serial("id").primaryKey(),
  walletAddress: varchar("wallet_address", { length: 66 }).notNull().unique(),
  storeName: varchar("store_name", { length: 255 }),
  bio: text("bio"),
  description: text("description"),
  sellerStory: text("seller_story"),
  location: varchar("location", { length: 255 }),
  coverImageUrl: text("cover_image_url"),
  socialLinks: text("social_links"), // JSON
  performanceMetrics: text("performance_metrics"), // JSON
  verificationLevels: text("verification_levels"), // JSON
  isOnline: boolean("is_online").default(false),
  lastSeen: timestamp("last_seen"),
  tier: varchar("tier", { length: 32 }).default("bronze"),
  // ENS support columns (nullable - ENS is optional)
  ensHandle: varchar("ens_handle", { length: 255 }),
  ensVerified: boolean("ens_verified").default(false),
  ensLastVerified: timestamp("ens_last_verified"),
  // Image storage fields for IPFS hashes and CDN URLs
  profileImageIpfs: varchar("profile_image_ipfs", { length: 255 }),
  profileImageCdn: varchar("profile_image_cdn", { length: 500 }),
  coverImageIpfs: varchar("cover_image_ipfs", { length: 255 }),
  coverImageCdn: varchar("cover_image_cdn", { length: 500 }),
  // Enhanced profile fields
  websiteUrl: varchar("website_url", { length: 500 }),
  twitterHandle: varchar("twitter_handle", { length: 100 }),
  discordHandle: varchar("discord_handle", { length: 100 }),
  telegramHandle: varchar("telegram_handle", { length: 100 }),
  linkedinHandle: varchar("linkedin_handle", { length: 100 }),
  facebookHandle: varchar("facebook_handle", { length: 100 }),
  // Seller profile API fields
  storeDescription: text("store_description"),
  isVerified: boolean("is_verified").default(false),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  onboardingSteps: jsonb("onboarding_steps").default({
    profile_setup: false,
    verification: false,
    payout_setup: false,
    first_listing: false
  }),
  // KYC Compliance fields
  legalBusinessName: varchar("legal_business_name", { length: 255 }),
  businessType: varchar("business_type", { length: 50 }).default("individual"),
  registeredAddressStreet: varchar("registered_address_street", { length: 500 }),
  registeredAddressCity: varchar("registered_address_city", { length: 100 }),
  registeredAddressState: varchar("registered_address_state", { length: 100 }),
  registeredAddressPostalCode: varchar("registered_address_postal_code", { length: 20 }),
  registeredAddressCountry: varchar("registered_address_country", { length: 100 }),
  taxIdEncrypted: text("tax_id_encrypted"), // Encrypted tax ID for seller
  // New payout settings JSON column
  payoutSettings: jsonb("payout_settings"), // JSON with fiat withdrawal details
  taxIdType: varchar("tax_id_type", { length: 20 }).default("ssn"),
  kycStatus: varchar("kyc_status", { length: 30 }).default("pending"),
  kycSubmittedAt: timestamp("kyc_submitted_at"),
  kycVerifiedAt: timestamp("kyc_verified_at"),
  kycRejectionReason: text("kyc_rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Seller activities for timeline
export const sellerActivities = pgTable("seller_activities", {
  id: serial("id").primaryKey(),
  sellerWalletAddress: varchar("seller_wallet_address", { length: 66 }).notNull(),
  activityType: varchar("activity_type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  metadata: text("metadata"), // JSON
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  sellerFk: foreignKey({
    columns: [t.sellerWalletAddress],
    foreignColumns: [sellers.walletAddress]
  })
}));

// Seller badges
export const sellerBadges = pgTable("seller_badges", {
  id: serial("id").primaryKey(),
  sellerWalletAddress: varchar("seller_wallet_address", { length: 66 }).notNull(),
  badgeType: varchar("badge_type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }),
  color: varchar("color", { length: 50 }),
  earnedAt: timestamp("earned_at").defaultNow(),
  isActive: boolean("is_active").default(true),
}, (t) => ({
  sellerFk: foreignKey({
    columns: [t.sellerWalletAddress],
    foreignColumns: [sellers.walletAddress]
  })
}));

// DAO endorsements
export const sellerDaoEndorsements = pgTable("seller_dao_endorsements", {
  id: serial("id").primaryKey(),
  sellerWalletAddress: varchar("seller_wallet_address", { length: 66 }).notNull(),
  endorserAddress: varchar("endorser_address", { length: 66 }).notNull(),
  endorserEns: varchar("endorser_ens", { length: 255 }),
  proposalHash: varchar("proposal_hash", { length: 66 }),
  voteCount: integer("vote_count").default(0),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  sellerFk: foreignKey({
    columns: [t.sellerWalletAddress],
    foreignColumns: [sellers.walletAddress]
  })
}));

// Seller transactions
export const sellerTransactions = pgTable("seller_transactions", {
  id: serial("id").primaryKey(),
  sellerWalletAddress: varchar("seller_wallet_address", { length: 66 }).notNull(),
  transactionType: varchar("transaction_type", { length: 20 }).notNull(),
  amount: numeric("amount", { precision: 20, scale: 8 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("USD"),
  counterpartyAddress: varchar("counterparty_address", { length: 66 }),
  transactionHash: varchar("transaction_hash", { length: 66 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  sellerFk: foreignKey({
    columns: [t.sellerWalletAddress],
    foreignColumns: [sellers.walletAddress]
  })
}));

// Chat: conversations and messages


// Marketplace listings (keeping for backward compatibility)
/**
 * @deprecated Use `products` table instead.
 * This table is redundant and will be removed.
 */
export const listings = pgTable("listings", {
  id: uuid("id").defaultRandom().primaryKey(),
  sellerId: uuid("seller_id").references(() => users.id),
  productId: uuid("product_id").references(() => products.id), // Link to products table
  tokenAddress: varchar("token_address", { length: 66 }).notNull(),
  price: numeric("price").notNull(), // Using numeric for better precision
  inventory: integer("inventory").notNull(),
  inventoryHolds: integer("inventory_holds").notNull().default(0), // Number of items currently held in temporary reservations
  itemType: varchar("item_type", { length: 32 }).notNull(), // 'PHYSICAL' | 'DIGITAL' | 'NFT' | 'SERVICE'
  listingType: varchar("listing_type", { length: 32 }).notNull(), // 'FIXED_PRICE' | 'AUCTION'
  status: varchar("status", { length: 32 }).default("active"),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  highestBid: numeric("highest_bid"),
  highestBidder: varchar("highest_bidder", { length: 66 }),
  metadataURI: text("metadata_uri").notNull(),
  isEscrowed: boolean("is_escrowed").default(false),
  // NFT specific fields
  nftStandard: varchar("nft_standard", { length: 32 }), // 'ERC721' | 'ERC1155'
  tokenId: varchar("token_id", { length: 128 }),
  // Auction specific fields
  reservePrice: numeric("reserve_price"),
  minIncrement: numeric("min_increment"),
  reserveMet: boolean("reserve_met").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  productFk: foreignKey({
    columns: [t.productId],
    foreignColumns: [products.id]
  })
}));

export const bids = pgTable("bids", {
  id: uuid("id").defaultRandom().primaryKey(),
  listingId: uuid("listing_id").references(() => listings.id),
  bidderId: uuid("bidder_id").references(() => users.id),
  amount: numeric("amount").notNull(), // Using numeric for better precision
  timestamp: timestamp("timestamp").defaultNow(),
});

export const offers = pgTable("offers", {
  id: uuid("id").defaultRandom().primaryKey(),
  listingId: uuid("listing_id").references(() => listings.id),
  buyerId: uuid("buyer_id").references(() => users.id),
  amount: numeric("amount").notNull(), // Using numeric for better precision
  createdAt: timestamp("created_at").defaultNow(),
  accepted: boolean("accepted").default(false),
});

export const escrows = pgTable("escrows", {
  id: uuid("id").defaultRandom().primaryKey(),
  listingId: uuid("listing_id").references(() => listings.id),
  buyerId: uuid("buyer_id").references(() => users.id),
  sellerId: uuid("seller_id").references(() => users.id),
  amount: numeric("amount").notNull(), // Using numeric for better precision
  buyerApproved: boolean("buyer_approved").default(false),
  sellerApproved: boolean("seller_approved").default(false),
  disputeOpened: boolean("dispute_opened").default(false),
  resolverAddress: varchar("resolver_address", { length: 66 }),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  // Delivery tracking
  deliveryInfo: text("delivery_info"),
  deliveryConfirmed: boolean("delivery_confirmed").default(false),
  deliveryConfirmedAt: timestamp("delivery_confirmed_at"),
  // Escrow expiry
  expiresAt: timestamp("expires_at"),
  // Payment tracking
  paymentMethod: varchar("payment_method", { length: 32 }),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  paypalCaptureId: varchar("paypal_capture_id", { length: 255 }),
  tokenAddress: varchar("token_address", { length: 66 }),
  onChainId: varchar("on_chain_id", { length: 255 }),
  // Resolution details
  resolution: text("resolution"),
});

export const reputations = pgTable("reputations", {
  walletAddress: varchar("wallet_address", { length: 66 }).primaryKey(),
  score: integer("score").notNull(),
  daoApproved: boolean("dao_approved").default(false),
});

// Disputes
export const disputes = pgTable("disputes", {
  id: serial("id").primaryKey(),
  escrowId: uuid("escrow_id").references(() => escrows.id),
  reporterId: uuid("reporter_id").references(() => users.id),
  reason: text("reason"),
  status: varchar("status", { length: 32 }).default("open"), // 'open', 'in_review', 'resolved', 'escalated'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  resolution: text("resolution"), // Description of resolution
  // Evidence tracking
  evidence: text("evidence"), // JSON array of evidence items
});

// Dispute Evidence
export const disputeEvidence = pgTable("dispute_evidence", {
  id: serial("id").primaryKey(),
  disputeId: integer("dispute_id").references(() => disputes.id),
  submitterId: uuid("submitter_id").references(() => users.id),
  evidenceType: varchar("evidence_type", { length: 32 }).notNull(),
  ipfsHash: varchar("ipfs_hash", { length: 128 }).notNull(),
  description: text("description"),
  timestamp: timestamp("timestamp").defaultNow(),
  verified: boolean("verified").default(false),
});

// Order Receipts
export const orderReceipts = pgTable("order_receipts", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").references(() => orders.id),
  receiptNumber: varchar("receipt_number", { length: 64 }),
  buyerInfo: jsonb("buyer_info"),
  items: jsonb("items"),
  pricing: jsonb("pricing"),
  paymentDetails: jsonb("payment_details"),
  pdfUrl: text("pdf_url"),
  emailSentAt: timestamp("email_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Order Cancellations
export const orderCancellations = pgTable("order_cancellations", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").references(() => orders.id),
  buyerId: uuid("buyer_id").references(() => users.id),
  sellerId: uuid("seller_id").references(() => users.id),
  reason: text("reason"),
  description: text("description"),
  status: varchar("status", { length: 32 }).default("pending"), // 'pending', 'approved', 'denied', 'auto_approved'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
  responseReason: text("response_reason"),
  refundStatus: varchar("refund_status", { length: 32 }), // 'pending', 'processing', 'completed', 'failed'
  refundDetails: jsonb("refund_details"),
}, (t) => ({
  orderIdx: index("order_cancellations_order_id_idx").on(t.orderId),
  statusIdx: index("order_cancellations_status_idx").on(t.status),
  createdAtIdx: index("order_cancellations_created_at_idx").on(t.createdAt)
}));

// Delivery Estimates
export const deliveryEstimates = pgTable("delivery_estimates", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").references(() => orders.id),
  estimatedDeliveryMin: timestamp("estimated_delivery_min"),
  estimatedDeliveryMax: timestamp("estimated_delivery_max"),
  confidence: varchar("confidence", { length: 20 }).default("medium"), // 'high', 'medium', 'low'
  factors: jsonb("factors"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Seller Notification Queue
export const sellerNotificationQueue = pgTable("seller_notification_queue", {
  id: serial("id").primaryKey(),
  sellerId: uuid("seller_id").references(() => users.id),
  type: varchar("type", { length: 64 }),
  priority: varchar("priority", { length: 20 }).default("normal"), // 'normal', 'high', 'urgent'
  title: varchar("title", { length: 255 }),
  body: text("body"),
  data: jsonb("data"),
  channels: text("channels").array(), // Array of channels e.g. ['push', 'email']
  status: varchar("status", { length: 20 }).default("pending"), // 'pending', 'sent', 'failed'
  createdAt: timestamp("created_at").defaultNow(),
});

// Seller Notification Preferences
export const sellerNotificationPreferences = pgTable("seller_notification_preferences", {
  userId: uuid("user_id").primaryKey().references(() => users.id),
  pushEnabled: boolean("push_enabled").default(true),
  emailEnabled: boolean("email_enabled").default(true),
  inAppEnabled: boolean("in_app_enabled").default(true),
  quietHoursStart: varchar("quiet_hours_start", { length: 5 }), // HH:mm
  quietHoursEnd: varchar("quiet_hours_end", { length: 5 }), // HH:mm
  batchingEnabled: boolean("batching_enabled").default(true),
});

// Orders
export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  listingId: uuid("listing_id").references(() => products.id),
  buyerId: uuid("buyer_id").references(() => users.id),
  buyerAddress: varchar("buyer_address", { length: 66 }), // Buyer wallet address for easier lookup
  sellerId: uuid("seller_id").references(() => users.id),
  escrowId: uuid("escrow_id").references(() => escrows.id),
  amount: numeric("amount").notNull(), // Using numeric for better precision
  paymentToken: varchar("payment_token", { length: 66 }),
  status: varchar("status", { length: 32 }).default("pending"), // 'pending', 'completed', 'disputed', 'refunded'
  // Enhanced fields for improved order tracking
  checkoutSessionId: varchar("checkout_session_id", { length: 255 }),
  paymentMethod: varchar("payment_method", { length: 20 }), // 'crypto', 'fiat', 'escrow'
  paymentDetails: text("payment_details"), // JSON object with payment-specific data
  shippingAddress: text("shipping_address"), // JSON object with shipping details
  billingAddress: text("billing_address"), // JSON object with billing details
  // Individual shipping columns for better querying
  shippingName: varchar("shipping_name", { length: 255 }),
  shippingPhone: varchar("shipping_phone", { length: 50 }),
  shippingStreet: text("shipping_street"),
  shippingCity: varchar("shipping_city", { length: 100 }),
  shippingState: varchar("shipping_state", { length: 100 }),
  shippingPostalCode: varchar("shipping_postal_code", { length: 20 }),
  shippingCountry: varchar("shipping_country", { length: 100 }),
  orderNotes: text("order_notes"),
  trackingNumber: varchar("tracking_number", { length: 100 }),
  trackingCarrier: varchar("tracking_carrier", { length: 50 }),
  shipmentId: varchar("shipment_id", { length: 255 }), // External ID from shipping provider
  shippingLabelUrl: text("shipping_label_url"), // URL to download the label
  trackingData: text("tracking_data"), // JSON cache of the latest tracking info
  estimatedDelivery: timestamp("estimated_delivery"),
  actualDelivery: timestamp("actual_delivery"),
  deliveryConfirmation: text("delivery_confirmation"), // JSON object with delivery proof
  paymentConfirmationHash: varchar("payment_confirmation_hash", { length: 66 }), // Blockchain tx hash
  escrowContractAddress: varchar("escrow_contract_address", { length: 66 }),
  totalAmount: numeric("total_amount", { precision: 20, scale: 8 }), // Total including fees, taxes, shipping
  currency: varchar("currency", { length: 10 }).default("USD"),
  orderMetadata: text("order_metadata"), // JSON object for additional order data
  metadata: jsonb("metadata"), // Additional metadata as JSONB
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  stripeTransferGroup: varchar("stripe_transfer_group", { length: 255 }),
  // Financial Details
  taxAmount: numeric("tax_amount", { precision: 20, scale: 8 }).default('0'),
  shippingCost: numeric("shipping_cost", { precision: 20, scale: 8 }).default('0'),
  platformFee: numeric("platform_fee", { precision: 20, scale: 8 }).default('0'),
  taxBreakdown: jsonb("tax_breakdown").default('[]'),
  quantity: integer("quantity").default(1).notNull(),
  // New lifecycle fields
  cancellationRequestedAt: timestamp("cancellation_requested_at"),
  cancellationReason: text("cancellation_reason"),
  receiptGeneratedAt: timestamp("receipt_generated_at"),
  receiptId: uuid("receipt_id").references(() => orderReceipts.id),
  estimatedDeliveryMin: timestamp("estimated_delivery_min"),
  estimatedDeliveryMax: timestamp("estimated_delivery_max"),
  createdAt: timestamp("created_at").defaultNow(),
  // Digital Delivery & Services
  digitalDeliveryCompletedAt: timestamp("digital_delivery_completed_at"),
  deliveryNotes: text("delivery_notes"),
  serviceStatus: varchar("service_status", { length: 32 }), // 'pending', 'scheduled', 'in_progress', 'completed'
  serviceScheduled: boolean("service_scheduled").default(false),
  scheduledDate: varchar("scheduled_date", { length: 50 }),
  scheduledTime: varchar("scheduled_time", { length: 50 }),
  scheduledTimezone: varchar("scheduled_timezone", { length: 50 }),
  serviceNotes: text("service_notes"),
  serviceDeliverables: text("service_deliverables"), // JSON array of deliverables
  serviceCompletedAt: timestamp("service_completed_at"),
  buyerConfirmedAt: timestamp("buyer_confirmed_at"),
  serviceStarted: boolean("service_started").default(false),
  serviceStartedAt: timestamp("service_started_at"),
  isServiceOrder: boolean("is_service_order").default(false),
}, (t) => ({
  checkoutSessionIdx: index("idx_orders_checkout_session_id").on(t.checkoutSessionId),
  paymentMethodIdx: index("idx_orders_payment_method").on(t.paymentMethod),
  trackingNumberIdx: index("idx_orders_tracking_number").on(t.trackingNumber),
  estimatedDeliveryIdx: index("idx_orders_estimated_delivery").on(t.estimatedDelivery),
  paymentConfirmationIdx: index("idx_orders_payment_confirmation_hash").on(t.paymentConfirmationHash),
  buyerAddressIdx: index("idx_orders_buyer_address").on(t.buyerAddress),
}));

// AI Moderation table for marketplace listings
export const aiModeration = pgTable("ai_moderation", {
  id: uuid("id").defaultRandom().primaryKey(),
  objectType: varchar("object_type", { length: 32 }).notNull(), // "listing", "dispute"
  objectId: uuid("object_id").notNull(),
  status: varchar("status", { length: 32 }).default("pending"), // 'pending', 'approved', 'rejected', 'flagged'
  aiAnalysis: text("ai_analysis"), // JSON of AI analysis results
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Order Events
export const orderEvents = pgTable("order_events", {
  id: serial("id").primaryKey(),
  orderId: uuid("order_id").references(() => orders.id),
  eventType: varchar("event_type", { length: 64 }).notNull(),
  description: text("description"),
  metadata: text("metadata"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Tracking Records
export const trackingRecords = pgTable("tracking_records", {
  id: serial("id").primaryKey(),
  orderId: uuid("order_id").references(() => orders.id),
  trackingNumber: varchar("tracking_number", { length: 128 }).notNull(),
  carrier: varchar("carrier", { length: 32 }).notNull(),
  status: varchar("status", { length: 64 }),
  shipmentId: varchar("shipment_id", { length: 255 }),
  labelUrl: text("label_url"),
  trackingData: text("tracking_data"), // Full JSON response
  events: text("events"),
  deliveryEstimateUpdatedAt: timestamp("delivery_estimate_updated_at"),
  exceptionType: varchar("exception_type", { length: 64 }),
  exceptionDetails: text("exception_details"),
  createdAt: timestamp("created_at").defaultNow(),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Fulfillment Metrics (for performance tracking)
export const fulfillmentMetrics = pgTable("fulfillment_metrics", {
  id: uuid("id").defaultRandom().primaryKey(),
  sellerId: uuid("seller_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  avgTimeToShipHours: decimal("avg_time_to_ship_hours", { precision: 10, scale: 2 }),
  avgDeliveryTimeHours: decimal("avg_delivery_time_hours", { precision: 10, scale: 2 }),
  onTimeRate: decimal("on_time_rate", { precision: 5, scale: 2 }),
  fulfillmentRate: decimal("fulfillment_rate", { precision: 5, scale: 2 }),
  exceptionRate: decimal("exception_rate", { precision: 5, scale: 2 }),
  totalOrders: integer("total_orders").default(0),
  completedOrders: integer("completed_orders").default(0),
  disputedOrders: integer("disputed_orders").default(0),
  cancelledOrders: integer("cancelled_orders").default(0),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  sellerIdx: index("idx_fulfillment_metrics_seller").on(t.sellerId),
  periodIdx: index("idx_fulfillment_metrics_period").on(t.periodStart, t.periodEnd),
  uniquePeriod: unique("uq_fulfillment_metrics_seller_period").on(t.sellerId, t.periodStart, t.periodEnd)
}));

// Shipping Labels (for carrier integration)
export const shippingLabels = pgTable("shipping_labels", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: 'cascade' }),
  easypostShipmentId: varchar("easypost_shipment_id", { length: 255 }),
  easypostTrackerId: varchar("easypost_tracker_id", { length: 255 }),
  trackingNumber: varchar("tracking_number", { length: 255 }),
  carrier: varchar("carrier", { length: 100 }),
  service: varchar("service", { length: 100 }),
  labelUrl: text("label_url"),
  trackingUrl: text("tracking_url"),
  postageLabelPdfUrl: text("postage_label_pdf_url"),
  rateAmount: decimal("rate_amount", { precision: 10, scale: 2 }),
  rateCurrency: varchar("rate_currency", { length: 10 }).default('USD'),
  status: varchar("status", { length: 50 }).default('created'),
  fromAddress: jsonb("from_address"),
  toAddress: jsonb("to_address"),
  parcelInfo: jsonb("parcel_info"),
  trackingEvents: jsonb("tracking_events"),
  createdAt: timestamp("created_at").defaultNow(),
  purchasedAt: timestamp("purchased_at"),
  shippedAt: timestamp("shipped_at"),
  deliveredAt: timestamp("delivered_at"),
  lastTrackingUpdate: timestamp("last_tracking_update"),
}, (t) => ({
  orderIdx: index("idx_shipping_labels_order").on(t.orderId),
  trackingIdx: index("idx_shipping_labels_tracking").on(t.trackingNumber),
  statusIdx: index("idx_shipping_labels_status").on(t.status)
}));

// Order Automation Logs (for audit trail)
export const orderAutomationLogs = pgTable("order_automation_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: 'cascade' }),
  ruleName: varchar("rule_name", { length: 255 }).notNull(),
  actionTaken: varchar("action_taken", { length: 255 }).notNull(),
  previousStatus: varchar("previous_status", { length: 50 }),
  newStatus: varchar("new_status", { length: 50 }),
  triggeredBy: varchar("triggered_by", { length: 100 }).default('system'),
  success: boolean("success").default(true),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  orderIdx: index("idx_automation_logs_order").on(t.orderId),
  createdIdx: index("idx_automation_logs_created").on(t.createdAt),
  ruleIdx: index("idx_automation_logs_rule").on(t.ruleName)
}));

// System alerts configuration
export const alert_configurations = pgTable("alert_configurations", {
  id: serial("id").primaryKey(),
  alertName: varchar("alert_name", { length: 64 }).notNull(),
  metricName: varchar("metric_name", { length: 64 }).notNull(),
  conditionType: varchar("condition_type", { length: 24 }).notNull(),
  thresholdValue: numeric("threshold_value").notNull(),
  severity: varchar("severity", { length: 24 }).notNull(),
  notificationChannels: text("notification_channels"), // JSON string array
  isActive: boolean("is_active").default(true),
  cooldownMinutes: integer("cooldown_minutes").default(60),
  createdBy: varchar("created_by", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Admin Notifications
export const admin_notifications = pgTable("admin_notifications", {
  id: serial("id").primaryKey(),
  adminId: varchar("admin_id", { length: 66 }).notNull(),
  type: varchar("type", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  actionUrl: text("action_url"),
  priority: varchar("priority", { length: 20 }).default('medium').notNull(),
  category: varchar("category", { length: 20 }).default('system').notNull(),
  metadata: text("metadata"),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Admin Notification Preferences
export const admin_notification_preferences = pgTable("admin_notification_preferences", {
  id: serial("id").primaryKey(),
  adminId: varchar("admin_id", { length: 66 }).notNull().unique(),
  preferences: text("preferences").notNull(), // JSON string
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Image Storage Infrastructure
export const images = pgTable("images", {
  id: uuid("id").defaultRandom().primaryKey(),
  ipfsHash: varchar("ipfs_hash", { length: 66 }).notNull(),
  cid: varchar("cid", { length: 66 }).notNull(),
  url: varchar("url", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  orderId: varchar("order_id", { length: 64 }),
  userAddress: varchar("user_address", { length: 66 }).notNull(),
  type: varchar("type", { length: 64 }).notNull(),
  message: text("message").notNull(),
  metadata: text("metadata"),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notification Preferences
export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userAddress: varchar("user_address", { length: 66 }).notNull().unique(),
  preferences: text("preferences").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Push Tokens
export const pushTokens = pgTable("push_tokens", {
  id: serial("id").primaryKey(),
  userAddress: varchar("user_address", { length: 66 }).notNull(),
  token: varchar("token", { length: 255 }).notNull(),
  platform: varchar("platform", { length: 32 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Blockchain Events
export const blockchainEvents = pgTable("blockchain_events", {
  id: serial("id").primaryKey(),
  orderId: varchar("order_id", { length: 64 }),
  escrowId: varchar("escrow_id", { length: 64 }),
  eventType: varchar("event_type", { length: 64 }).notNull(),
  transactionHash: varchar("transaction_hash", { length: 66 }).notNull(),
  blockNumber: integer("block_number").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  data: text("data"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Sync Status
export const syncStatus = pgTable("sync_status", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Digital Assets
export const digitalAssets = pgTable("digital_assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id").references(() => users.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  fileType: varchar("file_type", { length: 50 }).notNull(),
  fileSize: integer("file_size").notNull(),
  encryptedContentHash: text("encrypted_content_hash").notNull(),
  previewHash: text("preview_hash"),
  metadataHash: text("metadata_hash").notNull(),
  price: numeric("price", { precision: 20, scale: 8 }),
  currency: varchar("currency", { length: 10 }).default("USD"),
  licenseType: varchar("license_type", { length: 50 }).notNull(),
  isPublic: boolean("is_public").default(false),
  downloadCount: integer("download_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const digitalAssetLicenses = pgTable("digital_asset_licenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  assetId: uuid("asset_id").references(() => digitalAssets.id).notNull(),
  licenseeId: uuid("licensee_id").references(() => users.id).notNull(),
  licenseType: varchar("license_type", { length: 50 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  price: numeric("price", { precision: 20, scale: 8 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
  status: varchar("status", { length: 20 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const digitalAssetPurchases = pgTable("digital_asset_purchases", {
  id: uuid("id").defaultRandom().primaryKey(),
  assetId: uuid("asset_id").references(() => digitalAssets.id).notNull(),
  buyerId: uuid("buyer_id").references(() => users.id).notNull(),
  price: numeric("price", { precision: 20, scale: 8 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
  transactionHash: varchar("transaction_hash", { length: 66 }),
  status: varchar("status", { length: 20 }).default("completed"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const digitalAssetAccessLogs = pgTable("digital_asset_access_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  assetId: uuid("asset_id").references(() => digitalAssets.id).notNull(),
  userId: uuid("user_id").references(() => users.id),
  accessType: varchar("access_type", { length: 20 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  success: boolean("success").notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const digitalAssetAnalytics = pgTable("digital_asset_analytics", {
  id: uuid("id").defaultRandom().primaryKey(),
  assetId: uuid("asset_id").references(() => digitalAssets.id).notNull(),
  date: timestamp("date").notNull(),
  views: integer("views").default(0),
  downloads: integer("downloads").default(0),
  revenue: numeric("revenue", { precision: 20, scale: 8 }).default("0"),
  uniqueUsers: integer("unique_users").default(0),
});

export const dmcaTakedownRequests = pgTable("dmca_takedown_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  assetId: uuid("asset_id").references(() => digitalAssets.id).notNull(),
  requesterId: uuid("requester_id").references(() => users.id).notNull(),
  reason: text("reason").notNull(),
  evidence: text("evidence"),
  status: varchar("status", { length: 20 }).default("pending"),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const digitalAssetReports = pgTable("digital_asset_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  assetId: uuid("asset_id").references(() => digitalAssets.id).notNull(),
  reporterId: uuid("reporter_id").references(() => users.id).notNull(),
  reason: varchar("reason", { length: 100 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const drmKeys = pgTable("drm_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  assetId: uuid("asset_id").references(() => digitalAssets.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  encryptedKey: text("encrypted_key").notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const watermarkTemplates = pgTable("watermark_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  templateType: varchar("template_type", { length: 20 }).notNull(),
  templateData: text("template_data").notNull(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Communities System Tables

// Community categories
export const communityCategories = pgTable("community_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  icon: varchar("icon", { length: 100 }),
  color: varchar("color", { length: 7 }), // hex color code
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  slugIdx: index("idx_community_categories_slug").on(t.slug),
  isActiveIdx: index("idx_community_categories_is_active").on(t.isActive),
  sortOrderIdx: index("idx_community_categories_sort_order").on(t.sortOrder),
}));

// Communities
export const communities = pgTable("communities", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 64 }).notNull().unique(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  description: text("description"),
  rules: text("rules"), // JSON array of rules
  memberCount: integer("member_count").default(0).notNull(),
  postCount: integer("post_count").default(0).notNull(),
  avatar: text("avatar"),
  banner: text("banner"),
  category: varchar("category", { length: 100 }).notNull(),
  tags: text("tags"), // JSON array of tags
  isPublic: boolean("is_public").default(true).notNull(),
  moderators: text("moderators"), // JSON array of moderator addresses
  creatorAddress: varchar("creator_address", { length: 66 }), // Wallet address of the creator
  treasuryAddress: varchar("treasury_address", { length: 66 }),
  governanceToken: varchar("governance_token", { length: 66 }),
  settings: text("settings"), // JSON CommunitySettings object

  // Verification status (explicit)
  isVerified: boolean("is_verified").default(false),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  nameIdx: index("idx_communities_name").on(t.name),
  slugIdx: index("idx_communities_slug").on(t.slug),
  categoryIdx: index("idx_communities_category").on(t.category),
  isPublicIdx: index("idx_communities_is_public").on(t.isPublic),
  memberCountIdx: index("idx_communities_member_count").on(t.memberCount),
  createdAtIdx: index("idx_communities_created_at").on(t.createdAt),
  creatorAddressIdx: index("idx_communities_creator_address").on(t.creatorAddress),
}));

// Community members
export const communityMembers = pgTable("community_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  communityId: uuid("community_id").references(() => communities.id, { onDelete: 'cascade' }).notNull(),
  userAddress: varchar("user_address", { length: 66 }).notNull(),
  role: varchar("role", { length: 32 }).default('member').notNull(), // 'member', 'moderator', 'admin'
  reputation: integer("reputation").default(0).notNull(),
  contributions: integer("contributions").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
  bannedAt: timestamp("banned_at"),
  banExpiry: timestamp("ban_expiry"), // When the ban expires
  banReason: text("ban_reason"), // Reason for the ban
}, (t) => ({
  pk: primaryKey(t.communityId, t.userAddress),
  communityIdIdx: index("idx_community_members_community_id").on(t.communityId),
  userAddressIdx: index("idx_community_members_user_address").on(t.userAddress),
  roleIdx: index("idx_community_members_role").on(t.role),
  isActiveIdx: index("idx_community_members_is_active").on(t.isActive),
  joinedAtIdx: index("idx_community_members_joined_at").on(t.joinedAt),
}));

// Community statistics
export const communityStats = pgTable("community_stats", {
  id: uuid("id").defaultRandom().primaryKey(),
  communityId: uuid("community_id").references(() => communities.id, { onDelete: 'cascade' }).notNull().unique(),
  activeMembers7d: integer("active_members_7d").default(0).notNull(),
  activeMembers30d: integer("active_members_30d").default(0).notNull(),
  posts7d: integer("posts_7d").default(0).notNull(),
  posts30d: integer("posts_30d").default(0).notNull(),
  engagementRate: numeric("engagement_rate", { precision: 5, scale: 4 }).default("0").notNull(),
  growthRate7d: numeric("growth_rate_7d", { precision: 5, scale: 4 }).default("0").notNull(),
  growthRate30d: numeric("growth_rate_30d", { precision: 5, scale: 4 }).default("0").notNull(),
  trendingScore: numeric("trending_score", { precision: 10, scale: 4 }).default("0").notNull(),
  lastCalculatedAt: timestamp("last_calculated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  trendingScoreIdx: index("idx_community_stats_trending_score").on(t.trendingScore),
  growthRate7dIdx: index("idx_community_stats_growth_rate_7d").on(t.growthRate7d),
  lastCalculatedAtIdx: index("idx_community_stats_last_calculated_at").on(t.lastCalculatedAt),
}));

// Announcements
export const announcements = pgTable("announcements", {
  id: uuid("id").defaultRandom().primaryKey(),
  communityId: uuid("community_id").references(() => communities.id, { onDelete: 'cascade' }).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: text("type").default('info').notNull(), // 'info', 'warning', 'success'
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
}, (t) => ({
  communityIdIdx: index("idx_announcements_community_id").on(t.communityId),
  isActiveIdx: index("idx_announcements_is_active").on(t.isActive),
}));

// Monthly Updates - Creator community updates
export const monthlyUpdates = pgTable("monthly_updates", {
  id: uuid("id").defaultRandom().primaryKey(),
  communityId: uuid("community_id").references(() => communities.id, { onDelete: 'cascade' }).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  summary: text("summary"), // Short summary for preview
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
  highlights: jsonb("highlights").default([]), // Array of highlight items
  metrics: jsonb("metrics").default({}), // Key metrics for the month
  mediaCids: text("media_cids"), // JSON array of media IPFS CIDs
  isPublished: boolean("is_published").default(false).notNull(),
  publishedAt: timestamp("published_at"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  communityIdIdx: index("idx_monthly_updates_community_id").on(t.communityId),
  yearMonthIdx: index("idx_monthly_updates_year_month").on(t.year, t.month),
  isPublishedIdx: index("idx_monthly_updates_is_published").on(t.isPublished),
  publishedAtIdx: index("idx_monthly_updates_published_at").on(t.publishedAt),
  uniqueMonthIdx: unique("idx_monthly_updates_unique_month").on(t.communityId, t.year, t.month),
}));

// Community governance proposals
export const communityGovernanceProposals = pgTable("community_governance_proposals", {
  id: uuid("id").defaultRandom().primaryKey(),
  communityId: uuid("community_id").references(() => communities.id, { onDelete: 'cascade' }).notNull(),
  proposerAddress: varchar("proposer_address", { length: 66 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'text', 'parameter', 'membership', 'spending', 'rule_change', 'moderator_election', 'budget_allocation', 'feature_request', 'parameter_change', 'grant'
  status: varchar("status", { length: 32 }).default("pending"), // 'pending', 'active', 'passed', 'rejected', 'executed', 'expired', 'multi_sig_pending'
  votingStartTime: timestamp("voting_start_time").notNull(),
  votingEndTime: timestamp("voting_end_time").notNull(),
  executionEta: timestamp("execution_eta"),
  executedAt: timestamp("executed_at"),
  cancelledAt: timestamp("cancelled_at"),
  yesVotes: numeric("yes_votes", { precision: 20, scale: 8 }).default("0"),
  noVotes: numeric("no_votes", { precision: 20, scale: 8 }).default("0"),
  abstainVotes: numeric("abstain_votes", { precision: 20, scale: 8 }).default("0"),
  totalVotes: numeric("total_votes", { precision: 20, scale: 8 }).default("0"),
  quorum: numeric("quorum", { precision: 20, scale: 8 }).default("0"),
  quorumReached: boolean("quorum_reached").default(false),
  requiredMajority: integer("required_majority").default(50), // percentage needed for approval
  requiredStake: numeric("required_stake", { precision: 20, scale: 8 }).default("0"), // minimum stake required to vote
  executionDelay: integer("execution_delay"), // delay in seconds before execution
  requiredSignatures: integer("required_signatures").default(1), // number of signatures required for multi-sig proposals
  signaturesObtained: integer("signatures_obtained").default(0), // number of signatures obtained
  multiSigEnabled: boolean("multi_sig_enabled").default(false), // whether multi-sig is required
  autoExecute: boolean("auto_execute").default(false), // whether to auto-execute when passed
  executionTemplate: text("execution_template"), // JSON template for automated execution
  metadata: text("metadata"), // JSON additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  communityIdIdx: index("idx_community_governance_proposals_community_id").on(t.communityId),
  proposerIdx: index("idx_community_governance_proposals_proposer").on(t.proposerAddress),
  statusIdx: index("idx_community_governance_proposals_status").on(t.status),
  votingEndTimeIdx: index("idx_community_governance_proposals_voting_end_time").on(t.votingEndTime),
}));

// Community governance votes
export const communityGovernanceVotes = pgTable("community_governance_votes", {
  id: uuid("id").defaultRandom().primaryKey(),
  proposalId: uuid("proposal_id").references(() => communityGovernanceProposals.id, { onDelete: 'cascade' }).notNull(),
  voterAddress: varchar("voter_address", { length: 66 }).notNull(),
  voteChoice: varchar("vote_choice", { length: 10 }).notNull(), // 'yes', 'no', 'abstain'
  votingPower: numeric("voting_power", { precision: 20, scale: 8 }).notNull().default("0"),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  uniqueVote: primaryKey(t.proposalId, t.voterAddress),
  proposalIdIdx: index("idx_community_governance_votes_proposal_id").on(t.proposalId),
  voterAddressIdx: index("idx_community_governance_votes_voter_address").on(t.voterAddress),
  voteChoiceIdx: index("idx_community_governance_votes_choice").on(t.voteChoice),
}));

// Community delegation
export const communityDelegations = pgTable("community_delegations", {
  id: uuid("id").defaultRandom().primaryKey(),
  communityId: uuid("community_id").references(() => communities.id, { onDelete: 'cascade' }).notNull(),
  delegatorAddress: varchar("delegator_address", { length: 66 }).notNull(),
  delegateAddress: varchar("delegate_address", { length: 66 }).notNull(),
  votingPower: numeric("voting_power", { precision: 20, scale: 8 }).notNull().default("0"),
  isRevocable: boolean("is_revocable").default(true),
  expiryDate: timestamp("expiry_date"),
  metadata: text("metadata"), // JSON additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  uniqueDelegation: primaryKey(t.communityId, t.delegatorAddress),
  communityIdIdx: index("idx_community_delegations_community_id").on(t.communityId),
  delegatorAddressIdx: index("idx_community_delegations_delegator").on(t.delegatorAddress),
  delegateAddressIdx: index("idx_community_delegations_delegate").on(t.delegateAddress),
  expiryDateIdx: index("idx_community_delegations_expiry").on(t.expiryDate),
}));

// Community automated proposal executions
export const communityAutomatedExecutions = pgTable("community_automated_executions", {
  id: uuid("id").defaultRandom().primaryKey(),
  proposalId: uuid("proposal_id").references(() => communityGovernanceProposals.id, { onDelete: 'cascade' }).notNull(),
  executionType: varchar("execution_type", { length: 50 }).notNull(), // 'scheduled', 'recurring', 'dependent'
  executionTime: timestamp("execution_time"),
  recurrencePattern: varchar("recurrence_pattern", { length: 100 }), // cron expression or interval
  dependencyProposalId: uuid("dependency_proposal_id"),
  executionStatus: varchar("execution_status", { length: 32 }).default("pending"), // 'pending', 'executed', 'failed', 'cancelled'
  executionResult: text("execution_result"), // JSON result of execution
  metadata: text("metadata"), // JSON additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  proposalIdIdx: index("idx_community_automated_executions_proposal_id").on(t.proposalId),
  executionTypeIdx: index("idx_community_automated_executions_type").on(t.executionType),
  executionTimeIdx: index("idx_community_automated_executions_time").on(t.executionTime),
  executionStatusIdx: index("idx_community_automated_executions_status").on(t.executionStatus),
  dependencyProposalIdIdx: index("idx_community_automated_executions_dependency").on(t.dependencyProposalId),
}));

// Community token gated content
export const communityTokenGatedContent = pgTable("community_token_gated_content", {
  id: uuid("id").defaultRandom().primaryKey(),
  communityId: uuid("community_id").references(() => communities.id, { onDelete: 'cascade' }).notNull(),
  postId: uuid("post_id").references(() => posts.id, { onDelete: 'cascade' }),
  gatingType: varchar("gating_type", { length: 50 }).notNull(), // 'token_balance', 'nft_ownership', 'subscription'
  tokenAddress: varchar("token_address", { length: 66 }),
  tokenId: varchar("token_id", { length: 128 }),
  minimumBalance: numeric("minimum_balance", { precision: 20, scale: 8 }),
  subscriptionTier: varchar("subscription_tier", { length: 50 }),
  accessType: varchar("access_type", { length: 50 }).default("view"), // 'view', 'interact', 'full'
  metadata: text("metadata"), // JSON additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  communityIdIdx: index("idx_community_token_gated_content_community_id").on(t.communityId),
  postIdIdx: index("idx_community_token_gated_content_post_id").on(t.postId),
  gatingTypeIdx: index("idx_community_token_gated_content_gating_type").on(t.gatingType),
  tokenAddressIdx: index("idx_community_token_gated_content_token_address").on(t.tokenAddress),
}));

// Community user content access
export const communityUserContentAccess = pgTable("community_user_content_access", {
  id: uuid("id").defaultRandom().primaryKey(),
  contentId: uuid("content_id").references(() => communityTokenGatedContent.id, { onDelete: 'cascade' }).notNull(),
  userAddress: varchar("user_address", { length: 66 }).notNull(),
  accessLevel: varchar("access_level", { length: 50 }).notNull(), // 'denied', 'view', 'interact', 'full'
  accessGrantedAt: timestamp("access_granted_at").defaultNow().notNull(),
  accessExpiresAt: timestamp("access_expires_at"),
  metadata: text("metadata"), // JSON additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  uniqueAccess: primaryKey(t.contentId, t.userAddress),
  contentIdIdx: index("idx_community_user_content_access_content_id").on(t.contentId),
  userAddressIdx: index("idx_community_user_content_access_user_address").on(t.userAddress),
  accessLevelIdx: index("idx_community_user_content_access_level").on(t.accessLevel),
}));

// User interaction logs for recommendation training
export const userInteractions = pgTable("user_interactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  targetType: varchar("target_type", { length: 32 }).notNull(), // 'community', 'post', 'user'
  targetId: varchar("target_id", { length: 66 }).notNull(), // ID of the target
  interactionType: varchar("interaction_type", { length: 32 }).notNull(), // 'view', 'join', 'follow', 'like', 'comment', 'share'
  interactionValue: numeric("interaction_value", { precision: 10, scale: 4 }).default("1.0"), // Weight/value of interaction
  metadata: text("metadata"), // JSON additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  userIdx: index("idx_user_interactions_user_id").on(t.userId),
  targetTypeIdx: index("idx_user_interactions_target_type").on(t.targetType),
  targetIdIdx: index("idx_user_interactions_target_id").on(t.targetId),
  interactionTypeIdx: index("idx_user_interactions_interaction_type").on(t.interactionType),
  createdAtIdx: index("idx_user_interactions_created_at").on(t.createdAt),
}));

// Community recommendations for precomputed recommendations
export const communityRecommendations = pgTable("community_recommendations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  communityId: uuid("community_id").references(() => communities.id, { onDelete: 'cascade' }).notNull(),
  score: numeric("score", { precision: 10, scale: 4 }).notNull(), // Recommendation score
  reasons: text("reasons"), // JSON array of reasons for recommendation
  algorithmVersion: varchar("algorithm_version", { length: 32 }).default("v1.0"),
  expiresAt: timestamp("expires_at"), // When recommendation expires
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  uniqueRecommendation: primaryKey(t.userId, t.communityId),
  userIdx: index("idx_community_recommendations_user_id").on(t.userId),
  communityIdx: index("idx_community_recommendations_community_id").on(t.communityId),
  scoreIdx: index("idx_community_recommendations_score").on(t.score),
  expiresAtIdx: index("idx_community_recommendations_expires_at").on(t.expiresAt),
}));

// User recommendations for precomputed user suggestions
export const userRecommendations = pgTable("user_recommendations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(), // User receiving the recommendation
  recommendedUserId: uuid("recommended_user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(), // User being recommended
  score: numeric("score", { precision: 10, scale: 4 }).notNull(), // Recommendation score
  reasons: text("reasons"), // JSON array of reasons for recommendation
  mutualConnections: integer("mutual_connections").default(0),
  sharedInterests: text("shared_interests"), // JSON array of shared interests
  algorithmVersion: varchar("algorithm_version", { length: 32 }).default("v1.0"),
  expiresAt: timestamp("expires_at"), // When recommendation expires
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  uniqueRecommendation: primaryKey(t.userId, t.recommendedUserId),
  userIdx: index("idx_user_recommendations_user_id").on(t.userId),
  recommendedUserIdx: index("idx_user_recommendations_recommended_user_id").on(t.recommendedUserId),
  scoreIdx: index("idx_user_recommendations_score").on(t.score),
  expiresAtIdx: index("idx_user_recommendations_expires_at").on(t.expiresAt),
}));

// Trending content for cross-community trending
export const trendingContent = pgTable("trending_content", {
  id: uuid("id").defaultRandom().primaryKey(),
  contentType: varchar("content_type", { length: 32 }).notNull(), // 'community', 'post', 'user', 'topic'
  contentId: varchar("content_id", { length: 66 }).notNull(), // ID of the content
  score: numeric("score", { precision: 10, scale: 4 }).notNull(), // Trending score
  timeframe: varchar("timeframe", { length: 16 }).notNull(), // 'hourly', 'daily', 'weekly'
  rank: integer("rank").notNull(), // Rank within timeframe
  metadata: text("metadata"), // JSON additional data
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
}, (t) => ({
  uniqueTrending: primaryKey(t.contentType, t.contentId, t.timeframe),
  contentTypeIdx: index("idx_trending_content_content_type").on(t.contentType),
  contentIdIdx: index("idx_trending_content_content_id").on(t.contentId),
  timeframeIdx: index("idx_trending_content_timeframe").on(t.timeframe),
  scoreIdx: index("idx_trending_content_score").on(t.score),
  rankIdx: index("idx_trending_content_rank").on(t.rank),
  calculatedAtIdx: index("idx_trending_content_calculated_at").on(t.calculatedAt),
}));

// Community events for event calendar
export const communityEvents = pgTable("community_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  communityId: uuid("community_id").references(() => communities.id, { onDelete: 'cascade' }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  eventType: varchar("event_type", { length: 50 }).notNull(), // 'meeting', 'ama', 'workshop', 'competition', 'other'
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  location: text("location"), // Could be physical address or virtual link
  isRecurring: boolean("is_recurring").default(false),
  recurrencePattern: varchar("recurrence_pattern", { length: 100 }), // cron expression or simple pattern
  maxAttendees: integer("max_attendees"),
  rsvpRequired: boolean("rsvp_required").default(false),
  rsvpDeadline: timestamp("rsvp_deadline"),
  metadata: text("metadata"), // JSON additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  communityIdx: index("idx_community_events_community_id").on(t.communityId),
  startTimeIdx: index("idx_community_events_start_time").on(t.startTime),
  eventTypeIdx: index("idx_community_events_event_type").on(t.eventType),
  isRecurringIdx: index("idx_community_events_is_recurring").on(t.isRecurring),
}));

// User event RSVPs
export const eventRsvps = pgTable("event_rsvps", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").references(() => communityEvents.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  status: varchar("status", { length: 20 }).default("confirmed"), // 'confirmed', 'maybe', 'declined'
  attendeesCount: integer("attendees_count").default(1),
  metadata: text("metadata"), // JSON additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  uniqueRsvp: primaryKey(t.eventId, t.userId),
  eventIdx: index("idx_event_rsvps_event_id").on(t.eventId),
  userIdx: index("idx_event_rsvps_user_id").on(t.userId),
  statusIdx: index("idx_event_rsvps_status").on(t.status),
}));

// Community subscription tiers
export const communitySubscriptionTiers = pgTable("community_subscription_tiers", {
  id: uuid("id").defaultRandom().primaryKey(),
  communityId: uuid("community_id").references(() => communities.id, { onDelete: 'cascade' }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  price: numeric("price", { precision: 20, scale: 8 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
  benefits: text("benefits"), // JSON array of benefits
  accessLevel: varchar("access_level", { length: 50 }).notNull(), // 'view', 'interact', 'full'
  durationDays: integer("duration_days"),
  isActive: boolean("is_active").default(true),
  metadata: text("metadata"), // JSON additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  communityIdIdx: index("idx_community_subscription_tiers_community_id").on(t.communityId),
  isActiveIdx: index("idx_community_subscription_tiers_is_active").on(t.isActive),
}));

// Marketplace-specific moderation tables
// The detailed marketplace moderation tables (e.g. marketplaceVerifications, sellerVerifications)
// are defined in app/backend/src/db/marketplaceSchema.ts and imported at the top of this file.
// We intentionally do not redeclare them here to avoid duplicate symbol errors.

// Revenue Sharing and Treasury Management Tables

// Community treasury pools for collecting fees
export const communityTreasuryPools = pgTable("community_treasury_pools", {
  id: uuid("id").defaultRandom().primaryKey(),
  communityId: uuid("community_id").references(() => communities.id, { onDelete: 'cascade' }).notNull(),
  tokenAddress: varchar("token_address", { length: 66 }).notNull(),
  tokenSymbol: varchar("token_symbol", { length: 20 }).notNull(),
  balance: numeric("balance", { precision: 20, scale: 8 }).default("0").notNull(),
  totalContributions: numeric("total_contributions", { precision: 20, scale: 8 }).default("0").notNull(),
  totalDistributions: numeric("total_distributions", { precision: 20, scale: 8 }).default("0").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  communityIdIdx: index("idx_community_treasury_pools_community_id").on(t.communityId),
  tokenAddressIdx: index("idx_community_treasury_pools_token_address").on(t.tokenAddress),
  isActiveIdx: index("idx_community_treasury_pools_is_active").on(t.isActive),
}));

// Community fee distributions to creators
export const communityCreatorRewards = pgTable("community_creator_rewards", {
  id: uuid("id").defaultRandom().primaryKey(),
  communityId: uuid("community_id").references(() => communities.id, { onDelete: 'cascade' }).notNull(),
  postId: uuid("post_id").references(() => posts.id, { onDelete: 'cascade' }),
  creatorAddress: varchar("creator_address", { length: 66 }).notNull(),
  rewardAmount: numeric("reward_amount", { precision: 20, scale: 8 }).notNull(),
  tokenAddress: varchar("token_address", { length: 66 }).notNull(),
  tokenSymbol: varchar("token_symbol", { length: 20 }).notNull(),
  distributionType: varchar("distribution_type", { length: 30 }).notNull(), // 'post_fee', 'community_fee', 'tip'
  transactionHash: varchar("transaction_hash", { length: 66 }),
  status: varchar("status", { length: 20 }).default("pending"), // 'pending', 'distributed', 'failed'
  metadata: text("metadata"), // JSON additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  distributedAt: timestamp("distributed_at"),
}, (t) => ({
  communityIdIdx: index("idx_community_creator_rewards_community_id").on(t.communityId),
  creatorAddressIdx: index("idx_community_creator_rewards_creator_address").on(t.creatorAddress),
  postIdIdx: index("idx_community_creator_rewards_post_id").on(t.postId),
  statusIdx: index("idx_community_creator_rewards_status").on(t.status),
  createdAtIdx: index("idx_community_creator_rewards_created_at").on(t.createdAt),
}));

// Community member staking for rewards
export const communityStaking = pgTable("community_staking", {
  id: uuid("id").defaultRandom().primaryKey(),
  communityId: uuid("community_id").references(() => communities.id, { onDelete: 'cascade' }).notNull(),
  userAddress: varchar("user_address", { length: 66 }).notNull(),
  stakedAmount: numeric("staked_amount", { precision: 20, scale: 8 }).notNull(),
  tokenAddress: varchar("token_address", { length: 66 }).notNull(),
  tokenSymbol: varchar("token_symbol", { length: 20 }).notNull(),
  stakedAt: timestamp("staked_at").defaultNow().notNull(),
  unstakedAt: timestamp("unstaked_at"),
  rewardsEarned: numeric("rewards_earned", { precision: 20, scale: 8 }).default("0").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  metadata: text("metadata"), // JSON additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  communityIdIdx: index("idx_community_staking_community_id").on(t.communityId),
  userAddressIdx: index("idx_community_staking_user_address").on(t.userAddress),
  isActiveIdx: index("idx_community_staking_is_active").on(t.isActive),
  stakedAtIdx: index("idx_community_staking_staked_at").on(t.stakedAt),
}));

// Community staking rewards distributions
export const communityStakingRewards = pgTable("community_staking_rewards", {
  id: uuid("id").defaultRandom().primaryKey(),
  stakingId: uuid("staking_id").references(() => communityStaking.id, { onDelete: 'cascade' }).notNull(),
  userAddress: varchar("user_address", { length: 66 }).notNull(),
  rewardAmount: numeric("reward_amount", { precision: 20, scale: 8 }).notNull(),
  tokenAddress: varchar("token_address", { length: 66 }).notNull(),
  tokenSymbol: varchar("token_symbol", { length: 20 }).notNull(),
  rewardType: varchar("reward_type", { length: 30 }).notNull(), // 'participation', 'liquidity', 'governance'
  transactionHash: varchar("transaction_hash", { length: 66 }),
  status: varchar("status", { length: 20 }).default("pending"), // 'pending', 'distributed', 'failed'
  metadata: text("metadata"), // JSON additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  distributedAt: timestamp("distributed_at"),
}, (t) => ({
  stakingIdIdx: index("idx_community_staking_rewards_staking_id").on(t.stakingId),
  userAddressIdx: index("idx_community_staking_rewards_user_address").on(t.userAddress),
  statusIdx: index("idx_community_staking_rewards_status").on(t.status),
  rewardTypeIdx: index("idx_community_staking_rewards_type").on(t.rewardType),
}));

// Newsletter Subscriptions
export const newsletterSubscriptions = pgTable("newsletter_subscriptions", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  subscribedAt: timestamp("subscribed_at").defaultNow().notNull(),
  unsubscribedAt: timestamp("unsubscribed_at"),
  isActive: boolean("is_active").default(true).notNull(),
  subscriptionMetadata: text("subscription_metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  emailIdx: index("idx_newsletter_subscriptions_email").on(t.email),
  activeIdx: index("idx_newsletter_subscriptions_active").on(t.isActive),
  createdIdx: index("idx_newsletter_subscriptions_created").on(t.createdAt),
}));

// Community referral programs
export const communityReferralPrograms = pgTable("community_referral_programs", {
  id: uuid("id").defaultRandom().primaryKey(),
  communityId: uuid("community_id").references(() => communities.id, { onDelete: 'cascade' }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  rewardAmount: numeric("reward_amount", { precision: 20, scale: 8 }).notNull(),
  rewardToken: varchar("reward_token", { length: 66 }).notNull(),
  rewardTokenSymbol: varchar("reward_token_symbol", { length: 20 }).notNull(),
  referralLimit: integer("referral_limit"), // Max referrals per user
  isActive: boolean("is_active").default(true).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  metadata: text("metadata"), // JSON additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  communityIdIdx: index("idx_community_referral_programs_community_id").on(t.communityId),
  isActiveIdx: index("idx_community_referral_programs_is_active").on(t.isActive),
  startDateIdx: index("idx_community_referral_programs_start_date").on(t.startDate),
}));

// Community user referrals
export const communityUserReferrals = pgTable("community_user_referrals", {
  id: uuid("id").defaultRandom().primaryKey(),
  programId: uuid("program_id").references(() => communityReferralPrograms.id, { onDelete: 'cascade' }).notNull(),
  referrerAddress: varchar("referrer_address", { length: 66 }).notNull(),
  referredAddress: varchar("referred_address", { length: 66 }).notNull(),
  rewardAmount: numeric("reward_amount", { precision: 20, scale: 8 }).notNull(),
  rewardToken: varchar("reward_token", { length: 66 }).notNull(),
  rewardTokenSymbol: varchar("reward_token_symbol", { length: 20 }).notNull(),
  rewardStatus: varchar("reward_status", { length: 20 }).default("pending"), // 'pending', 'claimed', 'distributed'
  transactionHash: varchar("transaction_hash", { length: 66 }),
  metadata: text("metadata"), // JSON additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  rewardedAt: timestamp("rewarded_at"),
}, (t) => ({
  programIdIdx: index("idx_community_user_referrals_program_id").on(t.programId),
  referrerAddressIdx: index("idx_community_user_referrals_referrer_address").on(t.referrerAddress),
  referredAddressIdx: index("idx_community_user_referrals_referred_address").on(t.referredAddress),
  rewardStatusIdx: index("idx_community_user_referrals_reward_status").on(t.rewardStatus),
  uniqueReferral: index("idx_community_user_referrals_unique").on(t.programId, t.referrerAddress, t.referredAddress),
}));

// Counterfeit detection results

// Community user subscriptions
export const communityUserSubscriptions = pgTable("community_user_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  communityId: uuid("community_id").references(() => communities.id, { onDelete: 'cascade' }).notNull(),
  tierId: uuid("tier_id").references(() => communitySubscriptionTiers.id, { onDelete: 'cascade' }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: varchar("status", { length: 20 }).default("active"), // 'active', 'expired', 'cancelled'
  paymentTxHash: varchar("payment_tx_hash", { length: 66 }),
  metadata: text("metadata"), // JSON additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  userIdIdx: index("idx_community_user_subscriptions_user_id").on(t.userId),
  communityIdIdx: index("idx_community_user_subscriptions_community_id").on(t.communityId),
  tierIdIdx: index("idx_community_user_subscriptions_tier_id").on(t.tierId),
  statusIdx: index("idx_community_user_subscriptions_status").on(t.status),
}));

// Community multi-signature approvals
export const communityMultiSigApprovals = pgTable("community_multi_sig_approvals", {
  id: uuid("id").defaultRandom().primaryKey(),
  proposalId: uuid("proposal_id").references(() => communityGovernanceProposals.id, { onDelete: 'cascade' }).notNull(),
  approverAddress: varchar("approver_address", { length: 66 }).notNull(),
  signature: text("signature"), // Blockchain signature
  approvedAt: timestamp("approved_at").defaultNow().notNull(),
  metadata: text("metadata"), // JSON additional data
}, (t) => ({
  uniqueApproval: primaryKey(t.proposalId, t.approverAddress),
  proposalIdIdx: index("idx_community_multi_sig_approvals_proposal_id").on(t.proposalId),
  approverAddressIdx: index("idx_community_multi_sig_approvals_approver").on(t.approverAddress),
  approvedAtIdx: index("idx_community_multi_sig_approvals_approved_at").on(t.approvedAt),
}));

// Community proxy votes
export const communityProxyVotes = pgTable("community_proxy_votes", {
  id: uuid("id").defaultRandom().primaryKey(),
  proposalId: uuid("proposal_id").references(() => communityGovernanceProposals.id, { onDelete: 'cascade' }).notNull(),
  proxyAddress: varchar("proxy_address", { length: 66 }).notNull(),
  voterAddress: varchar("voter_address", { length: 66 }).notNull(),
  voteChoice: varchar("vote_choice", { length: 10 }).notNull(), // 'yes', 'no', 'abstain'
  votingPower: numeric("voting_power", { precision: 20, scale: 8 }).notNull().default("0"),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  uniqueProxyVote: primaryKey(t.proposalId, t.voterAddress),
  proposalIdIdx: index("idx_community_proxy_votes_proposal_id").on(t.proposalId),
  proxyAddressIdx: index("idx_community_proxy_votes_proxy").on(t.proxyAddress),
  voterAddressIdx: index("idx_community_proxy_votes_voter").on(t.voterAddress),
}));

// Community moderation actions
export const communityModerationActions = pgTable("community_moderation_actions", {
  id: uuid("id").defaultRandom().primaryKey(),
  communityId: uuid("community_id").references(() => communities.id, { onDelete: 'cascade' }).notNull(),
  moderatorAddress: varchar("moderator_address", { length: 66 }).notNull(),
  action: varchar("action", { length: 20 }).notNull(), // 'approve', 'reject', 'ban', 'unban', 'promote', 'demote'
  targetType: varchar("target_type", { length: 20 }).notNull(), // 'post', 'user', 'comment'
  targetId: varchar("target_id", { length: 66 }).notNull(),
  reason: text("reason"),
  metadata: text("metadata"), // JSON additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  communityIdIdx: index("idx_community_moderation_actions_community_id").on(t.communityId),
  moderatorAddressIdx: index("idx_community_moderation_actions_moderator").on(t.moderatorAddress),
  actionIdx: index("idx_community_moderation_actions_action").on(t.action),
  targetTypeIdx: index("idx_community_moderation_actions_target_type").on(t.targetType),
  createdAtIdx: index("idx_community_moderation_actions_created_at").on(t.createdAt),
}));

export const contentVerification = pgTable("content_verification", {
  id: uuid("id").defaultRandom().primaryKey(),
  assetId: uuid("asset_id").references(() => digitalAssets.id).notNull(),
  verificationHash: text("verification_hash").notNull(),
  algorithm: varchar("algorithm", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cdnAccessLogs = pgTable("cdn_access_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  assetId: uuid("asset_id").references(() => digitalAssets.id).notNull(),
  userId: uuid("user_id").references(() => users.id),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  accessTime: timestamp("access_time").defaultNow(),
  responseSize: integer("response_size"),
  responseTime: integer("response_time"),
});

// LDAO Earn-to-Own System Tables

// Earning activities table to track all earning events

// Admin Sessions table
export const adminSessions = pgTable("admin_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar("token_hash", { length: 255 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  lastActivity: timestamp("last_activity").defaultNow(),
  isActive: boolean("is_active").default(true),
});

// Admin Audit Log table
export const adminAuditLog = pgTable("admin_audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  adminId: uuid("admin_id").notNull().references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  resourceType: varchar("resource_type", { length: 50 }),
  resourceId: varchar("resource_id", { length: 255 }),
  details: jsonb("details"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// NFT Tables
export const nfts = pgTable("nfts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tokenId: varchar("token_id", { length: 128 }).notNull(),
  contractAddress: varchar("contract_address", { length: 66 }).notNull(),
  ownerId: uuid("owner_id").references(() => users.id).notNull(),
  creatorId: uuid("creator_id").references(() => users.id).notNull(),
  collectionId: uuid("collection_id"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url").notNull(),
  imageHash: varchar("image_hash", { length: 255 }),
  animationUrl: text("animation_url"),
  animationHash: varchar("animation_hash", { length: 255 }),
  metadataUri: text("metadata_uri").notNull(),
  metadataHash: varchar("metadata_hash", { length: 255 }),
  attributes: text("attributes"), // JSON
  rarity: varchar("rarity", { length: 20 }),
  status: varchar("status", { length: 20 }).default("active"),
  isVerified: boolean("is_verified").default(false),
  verifiedAt: timestamp("verified_at"),
  verifierId: uuid("verifier_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const nftCollections = pgTable("nft_collections", {
  id: uuid("id").defaultRandom().primaryKey(),
  creatorId: uuid("creator_id").references(() => users.id).notNull(),
  contractAddress: varchar("contract_address", { length: 66 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  imageHash: varchar("image_hash", { length: 255 }),
  bannerUrl: text("banner_url"),
  maxSupply: integer("max_supply"),
  currentSupply: integer("current_supply").default(0),
  royaltyPercentage: numeric("royalty_percentage", { precision: 5, scale: 2 }).default("0"),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const nftListings = pgTable("nft_listings", {
  id: uuid("id").defaultRandom().primaryKey(),
  nftId: uuid("nft_id").references(() => nfts.id).notNull(),
  sellerId: uuid("seller_id").references(() => users.id).notNull(),
  price: numeric("price", { precision: 20, scale: 8 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
  listingType: varchar("listing_type", { length: 20 }).notNull(), // 'fixed' | 'auction'
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  expiresAt: timestamp("expires_at"),
  status: varchar("status", { length: 20 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const nftOffers = pgTable("nft_offers", {
  id: uuid("id").defaultRandom().primaryKey(),
  nftId: uuid("nft_id").references(() => nfts.id).notNull(),
  buyerId: uuid("buyer_id").references(() => users.id).notNull(),
  price: numeric("price", { precision: 20, scale: 8 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  status: varchar("status", { length: 20 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const nftAuctions = pgTable("nft_auctions", {
  id: uuid("id").defaultRandom().primaryKey(),
  nftId: uuid("nft_id").references(() => nfts.id).notNull(),
  sellerId: uuid("seller_id").references(() => users.id).notNull(),
  startingPrice: numeric("starting_price", { precision: 20, scale: 8 }).notNull(),
  reservePrice: numeric("reserve_price", { precision: 20, scale: 8 }),
  currentBid: numeric("current_bid", { precision: 20, scale: 8 }),
  highestBidderId: uuid("highest_bidder_id").references(() => users.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: varchar("status", { length: 20 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Review and Reputation Tables
export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  reviewerId: uuid("reviewer_id").references(() => users.id).notNull(),
  revieweeId: uuid("reviewee_id").references(() => users.id).notNull(),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  rating: integer("rating").notNull(),
  title: varchar("title", { length: 255 }),
  comment: text("comment"),
  isVerified: boolean("is_verified").default(false),
  helpfulCount: integer("helpful_count").default(0),
  reportCount: integer("report_count").default(0),
  status: varchar("status", { length: 20 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// reviewHelpfulness and reviewReports are provided by marketplaceSchema; do not redeclare here.


// Services Marketplace Tables

export const serviceCategories = pgTable("service_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  parentId: uuid("parent_id"),
  icon: varchar("icon", { length: 50 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  parentFk: foreignKey({
    columns: [table.parentId],
    foreignColumns: [table.id]
  }),
}));

export const services = pgTable("services", {
  id: uuid("id").defaultRandom().primaryKey(),
  providerId: uuid("provider_id").notNull(),
  categoryId: uuid("category_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  shortDescription: varchar("short_description", { length: 500 }),
  pricingModel: varchar("pricing_model", { length: 20 }).notNull(),
  basePrice: numeric("base_price", { precision: 20, scale: 8 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("USD"),
  durationMinutes: integer("duration_minutes"),
  isRemote: boolean("is_remote").default(true),
  locationRequired: boolean("location_required").default(false),
  serviceLocation: text("service_location"),
  tags: text("tags").array(),
  requirements: text("requirements"),
  deliverables: text("deliverables"),
  portfolioItems: text("portfolio_items").array(),
  status: varchar("status", { length: 20 }).default("active"),
  featured: boolean("featured").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  providerFk: foreignKey({
    columns: [table.providerId],
    foreignColumns: [users.id]
  }),
  categoryFk: foreignKey({
    columns: [table.categoryId],
    foreignColumns: [serviceCategories.id]
  }),
  providerIdx: index("services_provider_id_idx").on(table.providerId),
  categoryIdx: index("services_category_id_idx").on(table.categoryId),
  statusIdx: index("services_status_idx").on(table.status),
}));

export const serviceAvailability = pgTable("service_availability", {
  id: uuid("id").defaultRandom().primaryKey(),
  serviceId: uuid("service_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: varchar("start_time", { length: 8 }).notNull(), // HH:MM:SS format
  endTime: varchar("end_time", { length: 8 }).notNull(),
  timezone: varchar("timezone", { length: 50 }).notNull().default("UTC"),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  serviceFk: foreignKey({
    columns: [table.serviceId],
    foreignColumns: [services.id]
  }),
  serviceIdx: index("service_availability_service_id_idx").on(table.serviceId),
}));

export const serviceBookings = pgTable("service_bookings", {
  id: uuid("id").defaultRandom().primaryKey(),
  serviceId: uuid("service_id").notNull(),
  clientId: uuid("client_id").notNull(),
  providerId: uuid("provider_id").notNull(),
  bookingType: varchar("booking_type", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending"),
  scheduledStart: timestamp("scheduled_start"),
  scheduledEnd: timestamp("scheduled_end"),
  actualStart: timestamp("actual_start"),
  actualEnd: timestamp("actual_end"),
  totalAmount: numeric("total_amount", { precision: 20, scale: 8 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
  paymentStatus: varchar("payment_status", { length: 20 }).default("pending"),
  escrowContract: varchar("escrow_contract", { length: 66 }),
  clientRequirements: text("client_requirements"),
  providerNotes: text("provider_notes"),
  meetingLink: varchar("meeting_link", { length: 500 }),
  locationDetails: text("location_details"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  serviceFk: foreignKey({
    columns: [table.serviceId],
    foreignColumns: [services.id]
  }),
  clientFk: foreignKey({
    columns: [table.clientId],
    foreignColumns: [users.id]
  }),
  providerFk: foreignKey({
    columns: [table.providerId],
    foreignColumns: [users.id]
  }),
  clientIdx: index("service_bookings_client_id_idx").on(table.clientId),
  providerIdx: index("service_bookings_provider_id_idx").on(table.providerId),
  statusIdx: index("service_bookings_status_idx").on(table.status),
}));

export const serviceMilestones = pgTable("service_milestones", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id").notNull(),
  milestoneNumber: integer("milestone_number").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  amount: numeric("amount", { precision: 20, scale: 8 }).notNull(),
  dueDate: timestamp("due_date"),
  status: varchar("status", { length: 20 }).default("pending"),
  deliverables: text("deliverables").array(),
  clientFeedback: text("client_feedback"),
  completedAt: timestamp("completed_at"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  bookingFk: foreignKey({
    columns: [table.bookingId],
    foreignColumns: [serviceBookings.id]
  }),
  bookingIdx: index("service_milestones_booking_id_idx").on(table.bookingId),
}));

export const serviceReviews = pgTable("service_reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id").notNull(),
  reviewerId: uuid("reviewer_id").notNull(),
  revieweeId: uuid("reviewee_id").notNull(),
  serviceId: uuid("service_id").notNull(),
  rating: integer("rating").notNull(),
  communicationRating: integer("communication_rating"),
  qualityRating: integer("quality_rating"),
  timelinessRating: integer("timeliness_rating"),
  title: varchar("title", { length: 200 }),
  comment: text("comment"),
  wouldRecommend: boolean("would_recommend"),
  ipfsHash: varchar("ipfs_hash", { length: 128 }),
  blockchainTxHash: varchar("blockchain_tx_hash", { length: 66 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  bookingFk: foreignKey({
    columns: [table.bookingId],
    foreignColumns: [serviceBookings.id]
  }),
  reviewerFk: foreignKey({
    columns: [table.reviewerId],
    foreignColumns: [users.id]
  }),
  revieweeFk: foreignKey({
    columns: [table.revieweeId],
    foreignColumns: [users.id]
  }),
  serviceFk: foreignKey({
    columns: [table.serviceId],
    foreignColumns: [services.id]
  }),
  serviceIdx: index("service_reviews_service_id_idx").on(table.serviceId),
}));

export const serviceProviderProfiles = pgTable("service_provider_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  businessName: varchar("business_name", { length: 255 }),
  tagline: varchar("tagline", { length: 500 }),
  bio: text("bio"),
  skills: text("skills").array(),
  certifications: text("certifications").array(),
  languages: text("languages").array(),
  responseTimeHours: integer("response_time_hours").default(24),
  availabilityTimezone: varchar("availability_timezone", { length: 50 }).default("UTC"),
  portfolioDescription: text("portfolio_description"),
  yearsExperience: integer("years_experience"),
  education: text("education"),
  websiteUrl: varchar("website_url", { length: 500 }),
  linkedinUrl: varchar("linkedin_url", { length: 500 }),
  githubUrl: varchar("github_url", { length: 500 }),
  isVerified: boolean("is_verified").default(false),
  verificationDocuments: text("verification_documents").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userFk: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id]
  }),
  userUnique: index("service_provider_profiles_user_id_unique").on(table.userId),
}));

export const serviceMessages = pgTable("service_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id").notNull(),
  senderId: uuid("sender_id").notNull(),
  recipientId: uuid("recipient_id").notNull(),
  messageType: varchar("message_type", { length: 20 }).default("text"),
  content: text("content"),
  fileAttachments: text("file_attachments").array(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  bookingFk: foreignKey({
    columns: [table.bookingId],
    foreignColumns: [serviceBookings.id]
  }),
  senderFk: foreignKey({
    columns: [table.senderId],
    foreignColumns: [users.id]
  }),
  recipientFk: foreignKey({
    columns: [table.recipientId],
    foreignColumns: [users.id]
  }),
  bookingIdx: index("service_messages_booking_id_idx").on(table.bookingId),
}));

// Project Management Tools Tables

export const timeTracking = pgTable("time_tracking", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id").notNull(),
  milestoneId: uuid("milestone_id"),
  providerId: uuid("provider_id").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  durationMinutes: integer("duration_minutes"),
  description: text("description"),
  isBillable: boolean("is_billable").default(true),
  hourlyRate: numeric("hourly_rate", { precision: 20, scale: 8 }),
  totalAmount: numeric("total_amount", { precision: 20, scale: 8 }),
  status: varchar("status", { length: 20 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  bookingFk: foreignKey({
    columns: [table.bookingId],
    foreignColumns: [serviceBookings.id],

  }),
  milestoneFk: foreignKey({
    columns: [table.milestoneId],
    foreignColumns: [serviceMilestones.id],

  }),
  providerFk: foreignKey({
    columns: [table.providerId],
    foreignColumns: [users.id],

  }),
  bookingIdx: index("time_tracking_booking_id_idx").on(table.bookingId),
  providerIdx: index("time_tracking_provider_id_idx").on(table.providerId),
  startTimeIdx: index("time_tracking_start_time_idx").on(table.startTime),
}));

export const projectDeliverables = pgTable("project_deliverables", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id").notNull(),
  milestoneId: uuid("milestone_id"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  deliverableType: varchar("deliverable_type", { length: 50 }).notNull(),
  fileHash: varchar("file_hash", { length: 128 }),
  fileName: varchar("file_name", { length: 255 }),
  fileSize: integer("file_size"),
  fileType: varchar("file_type", { length: 100 }),
  content: text("content"),
  url: varchar("url", { length: 500 }),
  status: varchar("status", { length: 20 }).default("pending"),
  submittedAt: timestamp("submitted_at"),
  reviewedAt: timestamp("reviewed_at"),
  clientFeedback: text("client_feedback"),
  revisionNotes: text("revision_notes"),
  versionNumber: integer("version_number").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  bookingFk: foreignKey({
    columns: [table.bookingId],
    foreignColumns: [serviceBookings.id],

  }),
  milestoneFk: foreignKey({
    columns: [table.milestoneId],
    foreignColumns: [serviceMilestones.id],

  }),
  bookingIdx: index("project_deliverables_booking_id_idx").on(table.bookingId),
  milestoneIdx: index("project_deliverables_milestone_id_idx").on(table.milestoneId),
  statusIdx: index("project_deliverables_status_idx").on(table.status),
}));

export const milestonePayments = pgTable("milestone_payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  milestoneId: uuid("milestone_id").notNull(),
  bookingId: uuid("booking_id").notNull(),
  amount: numeric("amount", { precision: 20, scale: 8 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 20 }).notNull(),
  escrowContract: varchar("escrow_contract", { length: 66 }),
  paymentProcessorId: varchar("payment_processor_id", { length: 100 }),
  transactionHash: varchar("transaction_hash", { length: 66 }),
  status: varchar("status", { length: 20 }).default("pending"),
  heldUntil: timestamp("held_until"),
  releaseConditions: text("release_conditions"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  milestoneFk: foreignKey({
    columns: [table.milestoneId],
    foreignColumns: [serviceMilestones.id],

  }),
  bookingFk: foreignKey({
    columns: [table.bookingId],
    foreignColumns: [serviceBookings.id],

  }),
  milestoneIdx: index("milestone_payments_milestone_id_idx").on(table.milestoneId),
  statusIdx: index("milestone_payments_status_idx").on(table.status),
}));

export const projectThreads = pgTable("project_threads", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id").notNull(),
  milestoneId: uuid("milestone_id"),
  threadType: varchar("thread_type", { length: 30 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  isPrivate: boolean("is_private").default(false),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  bookingFk: foreignKey({
    columns: [table.bookingId],
    foreignColumns: [serviceBookings.id],

  }),
  milestoneFk: foreignKey({
    columns: [table.milestoneId],
    foreignColumns: [serviceMilestones.id],

  }),
  createdByFk: foreignKey({
    columns: [table.createdBy],
    foreignColumns: [users.id],

  }),
  bookingIdx: index("project_threads_booking_id_idx").on(table.bookingId),
}));

export const projectMessages = pgTable("project_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  threadId: uuid("thread_id").notNull(),
  bookingId: uuid("booking_id").notNull(),
  senderId: uuid("sender_id").notNull(),
  messageType: varchar("message_type", { length: 20 }).default("text"),
  content: text("content"),
  fileAttachments: text("file_attachments"), // JSON string
  codeLanguage: varchar("code_language", { length: 50 }),
  isRead: boolean("is_read").default(false),
  isPinned: boolean("is_pinned").default(false),
  replyTo: uuid("reply_to"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  threadFk: foreignKey({
    columns: [table.threadId],
    foreignColumns: [projectThreads.id]
  }),
  bookingFk: foreignKey({
    columns: [table.bookingId],
    foreignColumns: [serviceBookings.id]
  }),
  senderFk: foreignKey({
    columns: [table.senderId],
    foreignColumns: [users.id]
  }),
  threadIdx: index("project_messages_thread_id_idx").on(table.threadId),
  bookingIdx: index("project_messages_booking_id_idx").on(table.bookingId),
}));

export const projectApprovals = pgTable("project_approvals", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id").notNull(),
  milestoneId: uuid("milestone_id"),
  deliverableId: uuid("deliverable_id"),
  approverId: uuid("approver_id").notNull(),
  approvalType: varchar("approval_type", { length: 30 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending"),
  feedback: text("feedback"),
  approvedAt: timestamp("approved_at"),
  autoApproveAt: timestamp("auto_approve_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  bookingFk: foreignKey({
    columns: [table.bookingId],
    foreignColumns: [serviceBookings.id]
  }),
  milestoneFk: foreignKey({
    columns: [table.milestoneId],
    foreignColumns: [serviceMilestones.id]
  }),
  deliverableFk: foreignKey({
    columns: [table.deliverableId],
    foreignColumns: [projectDeliverables.id]
  }),
  approverFk: foreignKey({
    columns: [table.approverId],
    foreignColumns: [users.id],
  }),
  bookingIdx: index("project_approvals_booking_id_idx").on(table.bookingId),
  statusIdx: index("project_approvals_status_idx").on(table.status),
}));

export const projectActivities = pgTable("project_activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id").notNull(),
  milestoneId: uuid("milestone_id"),
  userId: uuid("user_id").notNull(),
  activityType: varchar("activity_type", { length: 50 }).notNull(),
  description: text("description").notNull(),
  metadata: text("metadata"), // JSON string
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  bookingFk: foreignKey({
    columns: [table.bookingId],
    foreignColumns: [serviceBookings.id],

  }),
  milestoneFk: foreignKey({
    columns: [table.milestoneId],
    foreignColumns: [serviceMilestones.id],

  }),
  userFk: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],

  }),
  bookingIdx: index("project_activities_booking_id_idx").on(table.bookingId),
  createdAtIdx: index("project_activities_created_at_idx").on(table.createdAt),
}));

export const projectFiles = pgTable("project_files", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id").notNull(),
  milestoneId: uuid("milestone_id"),
  deliverableId: uuid("deliverable_id"),
  uploaderId: uuid("uploader_id").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileHash: varchar("file_hash", { length: 128 }).notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: varchar("file_type", { length: 100 }).notNull(),
  versionNumber: integer("version_number").default(1),
  isCurrentVersion: boolean("is_current_version").default(true),
  accessLevel: varchar("access_level", { length: 20 }).default("project"),
  downloadCount: integer("download_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  bookingFk: foreignKey({
    columns: [table.bookingId],
    foreignColumns: [serviceBookings.id],

  }),
  milestoneFk: foreignKey({
    columns: [table.milestoneId],
    foreignColumns: [serviceMilestones.id],

  }),
  deliverableFk: foreignKey({
    columns: [table.deliverableId],
    foreignColumns: [projectDeliverables.id],

  }),
  uploaderFk: foreignKey({
    columns: [table.uploaderId],
    foreignColumns: [users.id],

  }),
  bookingIdx: index("project_files_booking_id_idx").on(table.bookingId),
  fileHashIdx: index("project_files_file_hash_idx").on(table.fileHash),
}));

// AI Content Moderation System Tables

// Core moderation cases
export const moderationCases = pgTable("moderation_cases", {
  id: serial("id").primaryKey(),
  contentId: varchar("content_id", { length: 64 }).notNull(),
  contentType: varchar("content_type", { length: 24 }).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  assignedModeratorId: uuid("assigned_moderator_id").references(() => users.id),
  status: varchar("status", { length: 24 }).default("pending"),
  riskScore: numeric("risk_score", { precision: 5, scale: 4 }).default("0"),
  decision: varchar("decision", { length: 24 }),
  reasonCode: varchar("reason_code", { length: 48 }),
  confidence: numeric("confidence", { precision: 5, scale: 4 }).default("0"),
  vendorScores: text("vendor_scores"), // JSON string
  evidenceCid: text("evidence_cid"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  contentIdx: index("moderation_cases_content_idx").on(t.contentId),
  userIdx: index("moderation_cases_user_idx").on(t.userId),
  statusIdx: index("moderation_cases_status_idx").on(t.status),
}));

// ... (rest of the code remains the same)
// Moderation actions/enforcement
export const moderationActions = pgTable("moderation_actions", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  contentId: varchar("content_id", { length: 64 }).notNull(),
  action: varchar("action", { length: 24 }).notNull(),
  durationSec: integer("duration_sec").default(0),
  appliedBy: varchar("applied_by", { length: 64 }),
  rationale: text("rationale"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Community reports
export const contentReports = pgTable("content_reports", {
  id: serial("id").primaryKey(),
  contentId: varchar("content_id", { length: 64 }).notNull(),
  targetType: varchar("target_type", { length: 32 }),
  targetId: varchar("target_id", { length: 64 }),
  reportType: varchar("report_type", { length: 32 }),
  reporterId: uuid("reporter_id").references(() => users.id).notNull(),
  reporterWeight: numeric("reporter_weight").default("1"),
  reason: varchar("reason", { length: 48 }).notNull(),
  details: text("details"),
  weight: numeric("weight").default("1"),
  status: varchar("status", { length: 24 }).default("open"),
  resolution: text("resolution"), // Resolution details for closed reports
  moderatorNotes: text("moderator_notes"), // Internal notes from moderators
  consensusScore: numeric("consensus_score", { precision: 5, scale: 2 }), // Agreement score among moderators
  validatedAt: timestamp("validated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  contentIdx: index("content_reports_content_idx").on(t.contentId),
  reporterIdx: index("content_reports_reporter_idx").on(t.reporterId),
}));

// Alias for backward compatibility
export const communityReports = contentReports;

// Appeals system
export const moderationAppeals = pgTable("moderation_appeals", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => moderationCases.id).notNull(),
  appellantId: uuid("appellant_id").references(() => users.id).notNull(),
  status: varchar("status", { length: 24 }).default("open"),
  stakeAmount: numeric("stake_amount").default("0"),
  juryDecision: varchar("jury_decision", { length: 24 }),
  decisionCid: text("decision_cid"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  caseIdx: index("moderation_appeals_case_idx").on(t.caseId),
  appellantIdx: index("moderation_appeals_appellant_idx").on(t.appellantId),
  statusIdx: index("moderation_appeals_status_idx").on(t.status),
}));

// DAO Jury system - Juror assignments for appeals
export const appealJurors = pgTable("appeal_jurors", {
  id: serial("id").primaryKey(),
  appealId: integer("appeal_id").references(() => moderationAppeals.id).notNull(),
  jurorId: uuid("juror_id").references(() => users.id).notNull(),
  selectionRound: integer("selection_round").notNull(),
  status: varchar("status", { length: 24 }).default("selected"),
  stakeAmount: numeric("stake_amount").default("0"),
  voteCommitment: text("vote_commitment"), // Hash of vote + nonce
  voteReveal: varchar("vote_reveal", { length: 24 }), // 'uphold' | 'overturn' | 'partial'
  voteTimestamp: timestamp("vote_timestamp"),
  rewardAmount: numeric("reward_amount").default("0"),
  slashedAmount: numeric("slashed_amount").default("0"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  appealIdx: index("appeal_jurors_appeal_idx").on(t.appealId),
  jurorIdx: index("appeal_jurors_juror_idx").on(t.jurorId),
  statusIdx: index("appeal_jurors_status_idx").on(t.status),
}));

// Jury voting sessions
export const juryVotingSessions = pgTable("jury_voting_sessions", {
  id: serial("id").primaryKey(),
  appealId: integer("appeal_id").references(() => moderationAppeals.id).notNull(),
  sessionRound: integer("session_round").notNull(),
  commitPhaseStart: timestamp("commit_phase_start").notNull(),
  commitPhaseEnd: timestamp("commit_phase_end").notNull(),
  revealPhaseStart: timestamp("reveal_phase_start").notNull(),
  revealPhaseEnd: timestamp("reveal_phase_end").notNull(),
  requiredJurors: integer("required_jurors").default(5),
  selectedJurors: integer("selected_jurors").default(0),
  committedVotes: integer("committed_votes").default(0),
  revealedVotes: integer("revealed_votes").default(0),
  status: varchar("status", { length: 24 }).default("setup"),
  finalDecision: varchar("final_decision", { length: 24 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  appealIdx: index("jury_voting_sessions_appeal_idx").on(t.appealId),
  statusIdx: index("jury_voting_sessions_status_idx").on(t.status),
}));

// Juror eligibility and reputation tracking
export const jurorEligibility = pgTable("juror_eligibility", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull().unique(),
  reputationScore: numeric("reputation_score").default("1.0"),
  totalStake: numeric("total_stake").default("0"),
  activeCases: integer("active_cases").default(0),
  completedCases: integer("completed_cases").default(0),
  correctDecisions: integer("correct_decisions").default(0),
  incorrectDecisions: integer("incorrect_decisions").default(0),
  lastActivity: timestamp("last_activity"),
  isEligible: boolean("is_eligible").default(true),
  suspensionUntil: timestamp("suspension_until"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  userIdx: index("juror_eligibility_user_idx").on(t.userId),
  eligibleIdx: index("juror_eligibility_eligible_idx").on(t.isEligible),
}));

// Audit logging for moderation decisions
export const moderationAuditLog = pgTable("moderation_audit_log", {
  id: serial("id").primaryKey(),
  actionType: varchar("action_type", { length: 64 }).notNull(),
  actorId: varchar("actor_id", { length: 64 }).notNull(),
  actorType: varchar("actor_type", { length: 24 }).notNull(),
  targetId: varchar("target_id", { length: 64 }),
  targetType: varchar("target_type", { length: 24 }),
  oldState: text("old_state"), // JSON
  newState: text("new_state"), // JSON
  reasoning: text("reasoning"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reputation history tracking
export const reputationHistory = pgTable("reputation_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  changeType: varchar("change_type", { length: 50 }).notNull(),
  impactType: varchar("impact_type", { length: 50 }).notNull(),
  impactValue: numeric("impact_value").notNull(),
  previousScore: numeric("previous_score").notNull(),
  newScore: numeric("new_score").notNull(),
  reason: text("reason"),
  relatedEntityType: varchar("related_entity_type", { length: 50 }),
  relatedEntityId: varchar("related_entity_id", { length: 128 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Enhanced reputation tracking with detailed metrics
export const userReputationScores = pgTable("user_reputation_scores", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull().unique(),
  overallScore: numeric("overall_score", { precision: 10, scale: 4 }).default("1000").notNull(),
  moderationScore: numeric("moderation_score", { precision: 10, scale: 4 }).default("1000").notNull(),
  reportingScore: numeric("reporting_score", { precision: 10, scale: 4 }).default("1000").notNull(),
  juryScore: numeric("jury_score", { precision: 10, scale: 4 }).default("1000").notNull(),
  violationCount: integer("violation_count").default(0).notNull(),
  helpfulReportsCount: integer("helpful_reports_count").default(0).notNull(),
  falseReportsCount: integer("false_reports_count").default(0).notNull(),
  successfulAppealsCount: integer("successful_appeals_count").default(0).notNull(),
  juryDecisionsCount: integer("jury_decisions_count").default(0).notNull(),
  juryAccuracyRate: numeric("jury_accuracy_rate", { precision: 5, scale: 4 }).default("0").notNull(),
  lastViolationAt: timestamp("last_violation_at"),
  reputationTier: varchar("reputation_tier", { length: 24 }).default("bronze").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Reputation change events with detailed tracking
export const reputationChangeEvents = pgTable("reputation_change_events", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  eventType: varchar("event_type", { length: 32 }).notNull(),
  scoreChange: numeric("score_change", { precision: 10, scale: 4 }).notNull(),
  previousScore: numeric("previous_score", { precision: 10, scale: 4 }).notNull(),
  newScore: numeric("new_score", { precision: 10, scale: 4 }).notNull(),
  severityMultiplier: numeric("severity_multiplier", { precision: 5, scale: 4 }).default("1"),
  caseId: integer("case_id"),
  appealId: integer("appeal_id"),
  reportId: integer("report_id"),
  description: text("description").notNull(),
  metadata: text("metadata"), // JSON string
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Progressive penalty system
export const reputationPenalties = pgTable("reputation_penalties", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  penaltyType: varchar("penalty_type", { length: 32 }).notNull(),
  severityLevel: integer("severity_level").notNull(),
  violationCount: integer("violation_count").notNull(),
  penaltyStart: timestamp("penalty_start").defaultNow().notNull(),
  penaltyEnd: timestamp("penalty_end"),
  isActive: boolean("is_active").default(true).notNull(),
  caseId: integer("case_id"),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Reputation thresholds configuration
export const reputationThresholds = pgTable("reputation_thresholds", {
  id: serial("id").primaryKey(),
  thresholdType: varchar("threshold_type", { length: 32 }).notNull(),
  minScore: numeric("min_score", { precision: 10, scale: 4 }).notNull(),
  maxScore: numeric("max_score", { precision: 10, scale: 4 }),
  multiplier: numeric("multiplier", { precision: 5, scale: 4 }).default("1"),
  description: text("description").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Juror performance tracking
export const jurorPerformance = pgTable("juror_performance", {
  id: serial("id").primaryKey(),
  jurorId: uuid("juror_id").references(() => users.id).notNull(),
  appealId: integer("appeal_id").notNull(),
  vote: varchar("vote", { length: 24 }).notNull(),
  wasMajority: boolean("was_majority").notNull(),
  wasCorrect: boolean("was_correct"),
  stakeAmount: numeric("stake_amount", { precision: 20, scale: 8 }).notNull(),
  rewardEarned: numeric("reward_earned", { precision: 20, scale: 8 }).default("0"),
  penaltyApplied: numeric("penalty_applied", { precision: 20, scale: 8 }).default("0"),
  responseTimeMinutes: integer("response_time_minutes"),
  qualityScore: numeric("quality_score", { precision: 5, scale: 4 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Reporter performance tracking
export const reporterPerformance = pgTable("reporter_performance", {
  id: serial("id").primaryKey(),
  reporterId: uuid("reporter_id").references(() => users.id).notNull(),
  reportId: integer("report_id").notNull(),
  reportAccuracy: varchar("report_accuracy", { length: 24 }),
  moderatorAgreement: boolean("moderator_agreement"),
  finalCaseOutcome: varchar("final_case_outcome", { length: 24 }),
  weightApplied: numeric("weight_applied", { precision: 5, scale: 4 }).notNull(),
  reputationImpact: numeric("reputation_impact", { precision: 10, scale: 4 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Reputation rewards configuration
export const reputationRewards = pgTable("reputation_rewards", {
  id: serial("id").primaryKey(),
  rewardType: varchar("reward_type", { length: 32 }).notNull(),
  baseReward: numeric("base_reward", { precision: 10, scale: 4 }).notNull(),
  multiplierMin: numeric("multiplier_min", { precision: 5, scale: 4 }).default("1"),
  multiplierMax: numeric("multiplier_max", { precision: 5, scale: 4 }).default("3"),
  requirements: text("requirements"), // JSON string
  description: text("description").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});




// Marketplace-specific moderation tables
// The detailed marketplace moderation tables (e.g. marketplaceVerifications, sellerVerifications)
// are defined in app/backend/src/db/marketplaceSchema.ts and imported at the top of this file.
// We intentionally do not redeclare them here to avoid duplicate symbol errors.

// Counterfeit detection results
export const counterfeitDetections = pgTable("counterfeit_detections", {
  id: serial("id").primaryKey(),
  listingId: varchar("listing_id", { length: 64 }).notNull(),
  brandKeywords: text("brand_keywords"), // JSON array
  suspiciousTerms: text("suspicious_terms"), // JSON array
  imageAnalysis: text("image_analysis"), // JSON string
  priceAnalysis: text("price_analysis"), // JSON string
  confidenceScore: numeric("confidence_score", { precision: 3, scale: 2 }).default("0").notNull(),
  isCounterfeit: boolean("is_counterfeit").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Scam pattern detection results
export const scamPatterns = pgTable("scam_patterns", {
  id: serial("id").primaryKey(),
  listingId: varchar("listing_id", { length: 64 }).notNull(),
  patternType: varchar("pattern_type", { length: 32 }).notNull(),
  confidence: numeric("confidence", { precision: 3, scale: 2 }).default("0").notNull(),
  indicators: text("indicators"), // JSON array
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// sellerVerifications is defined in marketplaceSchema and imported above; do not redeclare here.

// Proof of ownership records
export const ownershipProofs = pgTable("ownership_proofs", {
  id: serial("id").primaryKey(),
  listingId: varchar("listing_id", { length: 64 }).notNull(),
  tokenAddress: varchar("token_address", { length: 66 }).notNull(),
  tokenId: varchar("token_id", { length: 128 }).notNull(),
  walletAddress: varchar("wallet_address", { length: 66 }).notNull(),
  signature: text("signature").notNull(),
  message: text("message").notNull(),
  timestamp: varchar("timestamp", { length: 20 }).notNull(), // Using varchar for bigint
  isValid: boolean("is_valid").default(false),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Brand keyword database for counterfeit detection
export const brandKeywords = pgTable("brand_keywords", {
  id: serial("id").primaryKey(),
  brandName: varchar("brand_name", { length: 100 }).notNull(),
  keywords: text("keywords"), // JSON array
  category: varchar("category", { length: 50 }),
  estimatedPriceRange: text("estimated_price_range"), // JSON string
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Marketplace moderation rules and thresholds
export const marketplaceModerationRules = pgTable("marketplace_moderation_rules", {
  id: serial("id").primaryKey(),
  ruleName: varchar("rule_name", { length: 100 }).notNull(),
  ruleType: varchar("rule_type", { length: 32 }).notNull(),
  conditions: text("conditions"), // JSON string
  action: varchar("action", { length: 24 }).notNull(),
  threshold: numeric("threshold", { precision: 3, scale: 2 }).default("0.5"),
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Stolen NFT database
export const stolenNfts = pgTable("stolen_nfts", {
  id: serial("id").primaryKey(),
  tokenAddress: varchar("token_address", { length: 66 }).notNull(),
  tokenId: varchar("token_id", { length: 128 }).notNull(),
  reportedBy: varchar("reported_by", { length: 66 }),
  reportReason: text("report_reason"),
  evidence: text("evidence"), // JSON string
  status: varchar("status", { length: 24 }).default("reported"),
  verifiedBy: varchar("verified_by", { length: 64 }),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Marketplace moderation decisions
export const marketplaceModerationDecisions = pgTable("marketplace_moderation_decisions", {
  id: serial("id").primaryKey(),
  listingId: varchar("listing_id", { length: 64 }).notNull(),
  decision: varchar("decision", { length: 24 }).notNull(),
  confidence: numeric("confidence", { precision: 3, scale: 2 }).default("0").notNull(),
  primaryCategory: varchar("primary_category", { length: 48 }),
  reasoning: text("reasoning"),
  vendorResults: text("vendor_results"), // JSON string
  moderatorId: varchar("moderator_id", { length: 64 }),
  isAutomated: boolean("is_automated").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Marketplace appeals
export const marketplaceAppeals = pgTable("marketplace_appeals", {
  id: serial("id").primaryKey(),
  listingId: varchar("listing_id", { length: 64 }).notNull(),
  decisionId: integer("decision_id").references(() => marketplaceModerationDecisions.id),
  appellantAddress: varchar("appellant_address", { length: 66 }).notNull(),
  appealReason: text("appeal_reason").notNull(),
  evidence: text("evidence"), // JSON string
  status: varchar("status", { length: 24 }).default("open"),
  reviewedBy: varchar("reviewed_by", { length: 64 }),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});
// Privacy and Compliance Tables - Task 14

// User consent management
export const user_consents = pgTable("user_consents", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: uuid("user_id").notNull(),
  consentType: varchar("consent_type", { length: 32 }).notNull(),
  status: varchar("status", { length: 16 }).default("pending").notNull(),
  purpose: text("purpose").notNull(),
  legalBasis: varchar("legal_basis", { length: 32 }).notNull(),
  grantedAt: timestamp("granted_at"),
  withdrawnAt: timestamp("withdrawn_at"),
  expiresAt: timestamp("expires_at"),
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),
  userAgent: text("user_agent").notNull(),
  consentVersion: varchar("consent_version", { length: 16 }).default("1.0").notNull(),
  metadata: text("metadata"), // JSON
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Data retention policies
export const data_retention_policies = pgTable("data_retention_policies", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  dataType: varchar("data_type", { length: 64 }).notNull(),
  retentionPeriodDays: integer("retention_period_days").notNull(),
  region: varchar("region", { length: 16 }),
  autoDelete: boolean("auto_delete").default(false).notNull(),
  archiveBeforeDelete: boolean("archive_before_delete").default(false).notNull(),
  encryptArchive: boolean("encrypt_archive").default(false).notNull(),
  notifyBeforeDelete: boolean("notify_before_delete").default(false).notNull(),
  notificationDays: integer("notification_days").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Data retention audit logs
export const data_retention_logs = pgTable("data_retention_logs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  policyId: varchar("policy_id", { length: 64 }).notNull(),
  action: varchar("action", { length: 16 }).notNull(),
  recordCount: integer("record_count").default(0).notNull(),
  dataType: varchar("data_type", { length: 64 }).notNull(),
  executedAt: timestamp("executed_at").defaultNow(),
  executedBy: varchar("executed_by", { length: 64 }).notNull(),
  success: boolean("success").default(false).notNull(),
  errorMessage: text("error_message"),
  executionTimeMs: integer("execution_time_ms").default(0).notNull(),
});

// Privacy evidence storage
export const privacy_evidence = pgTable("privacy_evidence", {
  id: varchar("id", { length: 64 }).primaryKey(),
  caseId: integer("case_id").notNull(),
  contentHash: varchar("content_hash", { length: 64 }).notNull(),
  evidenceType: varchar("evidence_type", { length: 32 }).default("moderation_decision").notNull(),
  safeContent: text("safe_content").notNull(),
  modelOutputs: text("model_outputs"), // JSON
  decisionRationale: text("decision_rationale").notNull(),
  policyVersion: varchar("policy_version", { length: 16 }).default("1.0").notNull(),
  moderatorId: varchar("moderator_id", { length: 64 }),
  region: varchar("region", { length: 16 }).notNull(),
  encryptionKeyHash: varchar("encryption_key_hash", { length: 64 }),
  piiRedactionApplied: boolean("pii_redaction_applied").default(false).notNull(),
  retentionExpiresAt: timestamp("retention_expires_at").notNull(),
  legalBasis: varchar("legal_basis", { length: 32 }).notNull(),
  dataClassification: varchar("data_classification", { length: 16 }).default("internal").notNull(),
  processingPurpose: varchar("processing_purpose", { length: 64 }).notNull(),
  ipfsCid: text("ipfs_cid"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Evidence access logs
export const evidence_access_logs = pgTable("evidence_access_logs", {
  id: serial("id").primaryKey(),
  evidenceId: varchar("evidence_id", { length: 64 }).notNull(),
  accessedBy: varchar("accessed_by", { length: 64 }).notNull(),
  accessedAt: timestamp("accessed_at").defaultNow(),
  purpose: varchar("purpose", { length: 128 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),
  userAgent: text("user_agent").notNull(),
  accessGranted: boolean("access_granted").default(true).notNull(),
});

// Geofencing rules
export const geofencing_rules = pgTable("geofencing_rules", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  regions: text("regions"), // JSON array
  action: varchar("action", { length: 16 }).notNull(),
  contentTypes: text("content_types"), // JSON array
  reason: text("reason").notNull(),
  priority: integer("priority").default(50).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// PII detection results (for audit and improvement)
export const pii_detection_results = pgTable("pii_detection_results", {
  id: serial("id").primaryKey(),
  contentHash: varchar("content_hash", { length: 64 }).notNull(),
  detectedTypes: text("detected_types"), // JSON array
  confidence: numeric("confidence", { precision: 3, scale: 2 }).default("0").notNull(),
  redactionApplied: boolean("redaction_applied").default(false).notNull(),
  sensitivityLevel: varchar("sensitivity_level", { length: 16 }).default("medium").notNull(),
  processingTimeMs: integer("processing_time_ms").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Regional compliance configurations
export const regional_compliance = pgTable("regional_compliance", {
  region: varchar("region", { length: 16 }).primaryKey(),
  country: varchar("country", { length: 8 }).notNull(),
  gdprApplicable: boolean("gdpr_applicable").default(false).notNull(),
  ccpaApplicable: boolean("ccpa_applicable").default(false).notNull(),
  dataLocalization: boolean("data_localization").default(false).notNull(),
  contentRestrictions: text("content_restrictions"), // JSON array
  retentionPeriodDays: integer("retention_period_days").default(730).notNull(),
  consentRequired: boolean("consent_required").default(false).notNull(),
  rightToErasure: boolean("right_to_erasure").default(false).notNull(),
  dataPortability: boolean("data_portability").default(false).notNull(),
  minorProtections: boolean("minor_protections").default(true).notNull(),
  cryptoRegulations: text("crypto_regulations"), // JSON array
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Link Safety and URL Analysis System Tables - Task 15

// URL Analysis Results Table
export const urlAnalysisResults = pgTable("url_analysis_results", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  urlHash: varchar("url_hash", { length: 64 }).notNull().unique(),
  domain: varchar("domain", { length: 255 }).notNull(),
  status: varchar("status", { length: 24 }).default("pending"),
  riskScore: numeric("risk_score", { precision: 5, scale: 2 }).default("0.00"),
  analysisResults: text("analysis_results"), // JSON
  unfurledContent: text("unfurled_content"), // JSON
  lastAnalyzed: timestamp("last_analyzed").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  urlHashIdx: index("idx_url_analysis_url_hash").on(t.urlHash),
  domainIdx: index("idx_url_analysis_domain").on(t.domain),
  statusIdx: index("idx_url_analysis_status").on(t.status),
  lastAnalyzedIdx: index("idx_url_analysis_last_analyzed").on(t.lastAnalyzed),
}));

// Domain Reputation Table
export const domainReputation = pgTable("domain_reputation", {
  id: serial("id").primaryKey(),
  domain: varchar("domain", { length: 255 }).notNull().unique(),
  reputationScore: numeric("reputation_score", { precision: 5, scale: 2 }).default("50.00"),
  category: varchar("category", { length: 32 }),
  isVerified: boolean("is_verified").default(false),
  isBlacklisted: boolean("is_blacklisted").default(false),
  blacklistReason: text("blacklist_reason"),
  firstSeen: timestamp("first_seen").defaultNow(),
  lastUpdated: timestamp("last_updated").defaultNow(),
  analysisCount: integer("analysis_count").default(0),
  maliciousCount: integer("malicious_count").default(0),
}, (t) => ({
  domainIdx: index("idx_domain_reputation_domain").on(t.domain),
  scoreIdx: index("idx_domain_reputation_score").on(t.reputationScore),
  blacklistedIdx: index("idx_domain_reputation_blacklisted").on(t.isBlacklisted),
}));

// Custom Blacklist Table
export const customBlacklist = pgTable("custom_blacklist", {
  id: serial("id").primaryKey(),
  entryType: varchar("entry_type", { length: 16 }).notNull(),
  entryValue: text("entry_value").notNull(),
  category: varchar("category", { length: 32 }).notNull(),
  severity: varchar("severity", { length: 16 }).default("medium"),
  description: text("description"),
  source: varchar("source", { length: 64 }),
  addedBy: uuid("added_by").references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  typeValueIdx: index("idx_custom_blacklist_type_value").on(t.entryType, t.entryValue),
  categoryIdx: index("idx_custom_blacklist_category").on(t.category),
  activeIdx: index("idx_custom_blacklist_active").on(t.isActive),
}));

// Link Safety Vendor Results Table
export const linkSafetyVendorResults = pgTable("link_safety_vendor_results", {
  id: serial("id").primaryKey(),
  urlAnalysisId: integer("url_analysis_id").references(() => urlAnalysisResults.id),
  vendorName: varchar("vendor_name", { length: 32 }).notNull(),
  vendorStatus: varchar("vendor_status", { length: 24 }),
  threatTypes: text("threat_types"), // JSON array
  confidence: numeric("confidence", { precision: 5, scale: 2 }).default("0.00"),
  rawResponse: text("raw_response"), // JSON
  analysisTimeMs: integer("analysis_time_ms"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  urlAnalysisIdx: index("idx_link_safety_vendor_url_analysis").on(t.urlAnalysisId),
  vendorNameIdx: index("idx_link_safety_vendor_name").on(t.vendorName),
}));

// Content Link Associations Table
export const contentLinks = pgTable("content_links", {
  id: serial("id").primaryKey(),
  contentId: varchar("content_id", { length: 64 }).notNull(),
  contentType: varchar("content_type", { length: 24 }).notNull(),
  urlAnalysisId: integer("url_analysis_id").references(() => urlAnalysisResults.id),
  positionInContent: integer("position_in_content"),
  linkText: text("link_text"),
  isShortened: boolean("is_shortened").default(false),
  originalUrl: text("original_url"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  contentIdx: index("idx_content_links_content").on(t.contentId, t.contentType),
  urlAnalysisIdx: index("idx_content_links_url_analysis").on(t.urlAnalysisId),
}));

// Real-time Link Monitoring Table
export const linkMonitoringAlerts = pgTable("link_monitoring_alerts", {
  id: serial("id").primaryKey(),
  urlAnalysisId: integer("url_analysis_id").references(() => urlAnalysisResults.id),
  alertType: varchar("alert_type", { length: 32 }).notNull(),
  severity: varchar("severity", { length: 16 }).default("medium"),
  description: text("description"),
  affectedContentCount: integer("affected_content_count").default(0),
  isResolved: boolean("is_resolved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
}, (t) => ({
  alertTypeIdx: index("idx_link_monitoring_alerts_type").on(t.alertType),
  resolvedIdx: index("idx_link_monitoring_alerts_resolved").on(t.isResolved),
}));
// Admin Configuration System Tables

// Policy configuration table for managing moderation rules
export const policy_configurations = pgTable("policy_configurations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 64 }).notNull(),
  category: varchar("category", { length: 48 }).notNull(),
  severity: varchar("severity", { length: 24 }).notNull(),
  confidenceThreshold: numeric("confidence_threshold").default("0.7"),
  action: varchar("action", { length: 24 }).notNull(),
  reputationModifier: numeric("reputation_modifier").default("0"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Threshold configurations for different content types and user reputation levels
export const threshold_configurations = pgTable("threshold_configurations", {
  id: serial("id").primaryKey(),
  contentType: varchar("content_type", { length: 24 }).notNull(),
  reputationTier: varchar("reputation_tier", { length: 24 }).notNull(),
  autoBlockThreshold: numeric("auto_block_threshold").default("0.95"),
  quarantineThreshold: numeric("quarantine_threshold").default("0.7"),
  publishThreshold: numeric("publish_threshold").default("0.3"),
  escalationThreshold: numeric("escalation_threshold").default("0.5"),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Vendor configuration for AI service management
export const vendor_configurations = pgTable("vendor_configurations", {
  id: serial("id").primaryKey(),
  vendorName: varchar("vendor_name", { length: 48 }).notNull(),
  serviceType: varchar("service_type", { length: 32 }).notNull(),
  apiEndpoint: text("api_endpoint"),
  apiKeyRef: varchar("api_key_ref", { length: 128 }),
  isEnabled: boolean("is_enabled").default(true),
  priority: integer("priority").default(1),
  timeoutMs: integer("timeout_ms").default(30000),
  retryAttempts: integer("retry_attempts").default(3),
  rateLimitPerMinute: integer("rate_limit_per_minute").default(100),
  costPerRequest: numeric("cost_per_request").default("0"),
  fallbackVendorId: integer("fallback_vendor_id"),
  healthCheckUrl: text("health_check_url"),
  lastHealthCheck: timestamp("last_health_check"),
  healthStatus: varchar("health_status", { length: 24 }).default("unknown"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// System metrics for real-time monitoring
export const system_metrics = pgTable("system_metrics", {
  id: serial("id").primaryKey(),
  metricName: varchar("metric_name", { length: 64 }).notNull(),
  metricValue: numeric("metric_value").notNull(),
  metricType: varchar("metric_type", { length: 24 }).notNull(),
  tags: text("tags"), // JSON string for tags
  timestamp: timestamp("timestamp").defaultNow(),
});

// Admin audit logs for configuration changes
export const admin_audit_logs = pgTable("admin_audit_logs", {
  id: serial("id").primaryKey(),
  adminId: varchar("admin_id", { length: 64 }).notNull(),
  action: varchar("action", { length: 48 }).notNull(),
  resourceType: varchar("resource_type", { length: 32 }).notNull(),
  resourceId: varchar("resource_id", { length: 64 }),
  oldValues: text("old_values"), // JSON string
  newValues: text("new_values"), // JSON string
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// System alerts configuration

// Image Storage Infrastructure
export const imageStorage = pgTable("image_storage", {
  id: uuid("id").defaultRandom().primaryKey(),
  ipfsHash: varchar("ipfs_hash", { length: 255 }).notNull().unique(),
  cdnUrl: varchar("cdn_url", { length: 500 }),
  originalFilename: varchar("original_filename", { length: 255 }),
  contentType: varchar("content_type", { length: 100 }),
  fileSize: integer("file_size"),
  width: integer("width"),
  height: integer("height"),
  thumbnails: text("thumbnails"), // JSON object with thumbnail URLs
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "cascade" }),
  usageType: varchar("usage_type", { length: 50 }), // 'profile', 'cover', 'listing', 'product'
  usageReferenceId: varchar("usage_reference_id", { length: 255 }), // ID of the object using this image
  backupUrls: text("backup_urls"), // JSON array of backup/mirror URLs
  accessCount: integer("access_count").default(0),
  lastAccessed: timestamp("last_accessed"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  ipfsHashIdx: index("idx_image_storage_ipfs_hash").on(t.ipfsHash),
  ownerIdIdx: index("idx_image_storage_owner_id").on(t.ownerId),
  usageTypeIdx: index("idx_image_storage_usage_type").on(t.usageType),
  usageReferenceIdx: index("idx_image_storage_usage_reference").on(t.usageReferenceId),
  createdAtIdx: index("idx_image_storage_created_at").on(t.createdAt),
}));
// ENS Verifications table is defined earlier in the file (line 725)

// Export only active marketplace tables (not commented out)
export const {
  marketplaceUsers,
  marketplaceVerifications,
  sellerVerifications,
  marketplaceConfig,
  marketplaceRewards,
  earningChallenges,
  userChallengeProgress
} = marketplaceSchema;

// Payment Transaction Tables for Order-Payment Integration

export const paymentTransactions = pgTable("payment_transactions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  paymentMethod: varchar("payment_method", { length: 20 }).notNull(),
  transactionHash: varchar("transaction_hash", { length: 66 }),
  paymentIntentId: varchar("payment_intent_id", { length: 255 }),
  escrowId: varchar("escrow_id", { length: 255 }),
  amount: numeric("amount", { precision: 20, scale: 8 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  processingFee: numeric("processing_fee", { precision: 20, scale: 8 }).default('0'),
  platformFee: numeric("platform_fee", { precision: 20, scale: 8 }).default('0'),
  gasFee: numeric("gas_fee", { precision: 20, scale: 8 }).default('0'),
  totalFees: numeric("total_fees", { precision: 20, scale: 8 }).default('0'),
  receiptUrl: varchar("receipt_url", { length: 500 }),
  receiptData: text("receipt_data"), // JSON
  failureReason: text("failure_reason"),
  retryCount: integer("retry_count").default(0),
  transactionType: varchar("transaction_type", { length: 50 }),
  requestPayload: text("request_payload"),
  webhookReceived: boolean("webhook_received").default(false),
  metadata: text("metadata"), // JSON
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  confirmedAt: timestamp("confirmed_at")
}, (t) => ({
  orderIdIdx: index("idx_payment_transactions_order_id").on(t.orderId),
  paymentMethodIdx: index("idx_payment_transactions_payment_method").on(t.paymentMethod),
  statusIdx: index("idx_payment_transactions_status").on(t.status),
  transactionHashIdx: index("idx_payment_transactions_transaction_hash").on(t.transactionHash),
  paymentIntentIdIdx: index("idx_payment_transactions_payment_intent_id").on(t.paymentIntentId),
  escrowIdIdx: index("idx_payment_transactions_escrow_id").on(t.escrowId),
  createdAtIdx: index("idx_payment_transactions_created_at").on(t.createdAt),
  confirmedAtIdx: index("idx_payment_transactions_confirmed_at").on(t.confirmedAt)
}));

export const paymentReceipts = pgTable("payment_receipts", {
  id: varchar("id", { length: 255 }).primaryKey(),
  transactionId: varchar("transaction_id", { length: 255 }).references(() => paymentTransactions.id).notNull(),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  receiptNumber: varchar("receipt_number", { length: 100 }).notNull().unique(),
  paymentMethod: varchar("payment_method", { length: 20 }).notNull(),
  amount: numeric("amount", { precision: 20, scale: 8 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
  fees: text("fees").notNull(), // JSON
  transactionDetails: text("transaction_details").notNull(), // JSON
  receiptUrl: varchar("receipt_url", { length: 500 }).notNull(),
  metadata: text("metadata"), // JSON
  // Marketplace receipt fields
  items: jsonb("items"), // Array of order items
  subtotal: numeric("subtotal", { precision: 20, scale: 8 }).default('0'),
  shipping: numeric("shipping", { precision: 20, scale: 8 }).default('0'),
  tax: numeric("tax", { precision: 20, scale: 8 }).default('0'),
  sellerName: varchar("seller_name", { length: 255 }),
  // LDAO receipt fields
  tokensPurchased: varchar("tokens_purchased", { length: 255 }),
  pricePerToken: varchar("price_per_token", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow()
}, (t) => ({
  transactionIdIdx: index("idx_payment_receipts_transaction_id").on(t.transactionId),
  orderIdIdx: index("idx_payment_receipts_order_id").on(t.orderId),
  receiptNumberIdx: index("idx_payment_receipts_receipt_number").on(t.receiptNumber),
  paymentMethodIdx: index("idx_payment_receipts_payment_method").on(t.paymentMethod),
  createdAtIdx: index("idx_payment_receipts_created_at").on(t.createdAt),
  sellerNameIdx: index("idx_payment_receipts_seller_name").on(t.sellerName),
  tokensPurchasedIdx: index("idx_payment_receipts_tokens_purchased").on(t.tokensPurchased),
  pricePerTokenIdx: index("idx_payment_receipts_price_per_token").on(t.pricePerToken)
}));

export const orderPaymentEvents = pgTable("order_payment_events", {
  id: serial("id").primaryKey(),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  transactionId: varchar("transaction_id", { length: 255 }).references(() => paymentTransactions.id),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  eventDescription: text("event_description").notNull(),
  paymentStatus: varchar("payment_status", { length: 20 }),
  orderStatus: varchar("order_status", { length: 20 }),
  eventData: text("event_data"), // JSON
  createdAt: timestamp("created_at").defaultNow()
}, (t) => ({
  orderIdIdx: index("idx_order_payment_events_order_id").on(t.orderId),
  transactionIdIdx: index("idx_order_payment_events_transaction_id").on(t.transactionId),
  eventTypeIdx: index("idx_order_payment_events_event_type").on(t.eventType),
  paymentStatusIdx: index("idx_order_payment_events_payment_status").on(t.paymentStatus),
  createdAtIdx: index("idx_order_payment_events_created_at").on(t.createdAt)
}));
// Quick Polling System Tables
export const polls = pgTable("polls", {
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }).notNull(),
  question: text("question").notNull(),
  allowMultiple: boolean("allow_multiple").default(false),
  tokenWeighted: boolean("token_weighted").default(false),
  minTokens: numeric("min_tokens").default("0"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  postIdIdx: index("idx_polls_post_id").on(t.postId),
  expiresAtIdx: index("idx_polls_expires_at").on(t.expiresAt),
}));

export const pollOptions = pgTable("poll_options", {
  id: uuid("id").defaultRandom().primaryKey(),
  pollId: uuid("poll_id").references(() => polls.id, { onDelete: "cascade" }).notNull(),
  text: text("text").notNull(),
  orderIndex: integer("order_index").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  pollIdIdx: index("idx_poll_options_poll_id").on(t.pollId),
}));

export const pollVotes = pgTable("poll_votes", {
  id: uuid("id").defaultRandom().primaryKey(),
  pollId: uuid("poll_id").references(() => polls.id, { onDelete: "cascade" }).notNull(),
  optionId: uuid("option_id").references(() => pollOptions.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  tokenAmount: numeric("token_amount").default("1"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  pollIdIdx: index("idx_poll_votes_poll_id").on(t.pollId),
  userIdIdx: index("idx_poll_votes_user_id").on(t.userId),
  optionIdIdx: index("idx_poll_votes_option_id").on(t.optionId),
  uniqueVote: index("idx_poll_votes_unique").on(t.pollId, t.userId, t.optionId),
}));

// Conversations and Chat Messages
// Note: Additional messaging tables defined above
export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  subject: varchar("subject", { length: 255 }),
  title: varchar("title", { length: 255 }), // Optional title (alternative to subject)
  participants: jsonb("participants").notNull(),
  lastMessageId: uuid("last_message_id"), // Reference to last message
  lastActivity: timestamp("last_activity"),
  unreadCount: integer("unread_count").default(0),
  archivedBy: jsonb("archived_by").default("[]"), // Array of user addresses who archived this
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),

  // Legacy columns from old schema
  relatedProductId: uuid("related_product_id"),
  relatedOrderId: integer("related_order_id"),
  lastMessageAt: timestamp("last_message_at"),

  // Marketplace context columns
  conversationType: varchar("conversation_type", { length: 32 }).default("general"),
  orderId: integer("order_id"),
  productId: uuid("product_id"),
  listingId: integer("listing_id"),
  contextMetadata: jsonb("context_metadata").default("{}"),
  isAutomated: boolean("is_automated").default(false),
  status: varchar("status", { length: 32 }).default("active"),
  archivedAt: timestamp("archived_at"),
  // Phase 5: Channel/Group support
  channelName: varchar("channel_name", { length: 100 }),
  isChannel: boolean("is_channel").default(false),
  channelDescription: text("channel_description"),
  channelAvatar: varchar("channel_avatar", { length: 500 }),
  maxMembers: integer("max_members").default(100),
}, (t) => ({
  lastActivityIdx: index("idx_conversations_last_activity").on(t.lastActivity),

  // Marketplace indexes
  orderIdIdx: index("idx_conversations_order_id").on(t.orderId),
  productIdIdx: index("idx_conversations_product_id").on(t.productId),
  listingIdIdx: index("idx_conversations_listing_id").on(t.listingId),
  conversationTypeIdx: index("idx_conversations_type").on(t.conversationType),
  statusIdx: index("idx_conversations_status").on(t.status),
  isAutomatedIdx: index("idx_conversations_is_automated").on(t.isAutomated),
  // Phase 5: Channel indexes
  isChannelIdx: index("idx_conversations_is_channel").on(t.isChannel),
}));

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "cascade" }).notNull(),
  senderAddress: varchar("sender_address", { length: 66 }).notNull(),
  content: text("content").notNull(),
  messageType: varchar("message_type", { length: 32 }).default("text"),
  encryptionMetadata: jsonb("encryption_metadata"),
  replyToId: uuid("reply_to_id").references(() => chatMessages.id),
  attachments: jsonb("attachments"),
  isPinned: boolean("is_pinned").default(false),
  pinnedBy: varchar("pinned_by", { length: 66 }),
  pinnedAt: timestamp("pinned_at"),
  sentAt: timestamp("sent_at").defaultNow(),
  editedAt: timestamp("edited_at"),
  deletedAt: timestamp("deleted_at"),
  // Phase 5 additions
  hiddenBy: jsonb("hidden_by").default("[]"), // Array of user addresses who hid/deleted this message locally
  deliveryStatus: varchar("delivery_status", { length: 16 }).default("sent"),
  replyCount: integer("reply_count").default(0),
  originalContent: text("original_content"),
  quotedMessageId: uuid("quoted_message_id").references(() => chatMessages.id),
  metadata: jsonb("metadata").default("{}"),
}, (t) => ({
  convoTimestampIdx: index("idx_chat_messages_conversation_id_timestamp").on(t.conversationId, t.sentAt),
  replyToIdx: index("idx_chat_messages_reply_to").on(t.replyToId),
  quotedIdx: index("idx_chat_messages_quoted").on(t.quotedMessageId),
  isPinnedIdx: index("idx_chat_messages_is_pinned").on(t.conversationId, t.isPinned),
  deliveryStatusIdx: index("idx_chat_messages_delivery_status").on(t.conversationId, t.deliveryStatus),
}));

// Message reactions table for emoji reactions
export const messageReactions = pgTable("message_reactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  messageId: uuid("message_id").references(() => chatMessages.id, { onDelete: "cascade" }).notNull(),
  userAddress: varchar("user_address", { length: 66 }).notNull(),
  emoji: varchar("emoji", { length: 32 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  messageIdx: index("idx_message_reactions_message").on(t.messageId),
  userIdx: index("idx_message_reactions_user").on(t.userAddress),
  uniqueReaction: unique("unique_message_reaction").on(t.messageId, t.userAddress, t.emoji),
}));

// Message read status tracking
export const messageReadStatus = pgTable("message_read_status", {
  messageId: uuid("message_id").references(() => chatMessages.id, { onDelete: "cascade" }).notNull(),
  userAddress: varchar("user_address", { length: 66 }).notNull(),
  readAt: timestamp("read_at").defaultNow(),
}, (t) => ({
  pk: primaryKey(t.messageId, t.userAddress),
  messageIdx: index("idx_message_read_status_message").on(t.messageId),
  userIdx: index("idx_message_read_status_user").on(t.userAddress),
}));

// Blocked users table
export const blockedUsers = pgTable("blocked_users", {
  blockerAddress: varchar("blocker_address", { length: 66 }).notNull(),
  blockedAddress: varchar("blocked_address", { length: 66 }).notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  pk: primaryKey(t.blockerAddress, t.blockedAddress),
  blockerIdx: index("idx_blocked_users_blocker").on(t.blockerAddress),
  blockedIdx: index("idx_blocked_users_blocked").on(t.blockedAddress),
}));

// Phase 5: Typing indicators (ephemeral)
export const typingIndicators = pgTable("typing_indicators", {
  conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "cascade" }).notNull(),
  userAddress: varchar("user_address", { length: 66 }).notNull(),
  startedAt: timestamp("started_at").defaultNow(),
}, (t) => ({
  pk: primaryKey(t.conversationId, t.userAddress),
  startedIdx: index("idx_typing_indicators_started").on(t.startedAt),
}));

// Phase 5: User presence tracking
export const userPresence = pgTable("user_presence", {
  userAddress: varchar("user_address", { length: 66 }).primaryKey(),
  status: varchar("status", { length: 20 }).default("offline"), // online, away, busy, offline
  lastSeen: timestamp("last_seen").defaultNow(),
  currentConversationId: uuid("current_conversation_id").references(() => conversations.id, { onDelete: "set null" }),
  deviceInfo: jsonb("device_info").default("{}"),
}, (t) => ({
  statusIdx: index("idx_user_presence_status").on(t.status),
  lastSeenIdx: index("idx_user_presence_last_seen").on(t.lastSeen),
}));

// Message templates table for marketplace messaging
export const messageTemplates = pgTable("message_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  walletAddress: varchar("wallet_address", { length: 66 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 64 }),
  tags: jsonb("tags").default("[]"),
  isActive: boolean("is_active").default(true),
  usageCount: integer("usage_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  userIdIdx: index("idx_message_templates_user_id").on(t.userId),
  walletAddressIdx: index("idx_message_templates_wallet_address").on(t.walletAddress),
  categoryIdx: index("idx_message_templates_category").on(t.category),
  isActiveIdx: index("idx_message_templates_is_active").on(t.isActive),
  createdAtIdx: index("idx_message_templates_created_at").on(t.createdAt),
  usageCountIdx: index("idx_message_templates_usage_count").on(t.usageCount),
}));

// Quick replies table for marketplace messaging
export const quickReplies = pgTable("quick_replies", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  walletAddress: varchar("wallet_address", { length: 66 }).notNull(),
  triggerKeywords: jsonb("trigger_keywords").notNull(),
  responseText: text("response_text").notNull(),
  category: varchar("category", { length: 64 }),
  isActive: boolean("is_active").default(true),
  usageCount: integer("usage_count").default(0),
  priority: integer("priority").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  userIdIdx: index("idx_quick_replies_user_id").on(t.userId),
  walletAddressIdx: index("idx_quick_replies_wallet_address").on(t.walletAddress),
  categoryIdx: index("idx_quick_replies_category").on(t.category),
  isActiveIdx: index("idx_quick_replies_is_active").on(t.isActive),
  priorityIdx: index("idx_quick_replies_priority").on(t.priority),
  usageCountIdx: index("idx_quick_replies_usage_count").on(t.usageCount),
}));

// Conversation participants table for detailed participant tracking
export const conversationParticipants = pgTable("conversation_participants", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 32 }).default("member"),
  joinedAt: timestamp("joined_at").defaultNow(),
  leftAt: timestamp("left_at"),
  lastReadAt: timestamp("last_read_at"),
  isMuted: boolean("is_muted").default(false),
  notificationsEnabled: boolean("notifications_enabled").default(true),
  customTitle: varchar("custom_title", { length: 255 }),
}, (t) => ({
  conversationIdIdx: index("idx_conversation_participants_conversation_id").on(t.conversationId),
  userIdIdx: index("idx_conversation_participants_user_id").on(t.userId),

  roleIdx: index("idx_conversation_participants_role").on(t.role),
  joinedAtIdx: index("idx_conversation_participants_joined_at").on(t.joinedAt),
  uniqueConversationUser: unique("unique_conversation_user").on(t.conversationId, t.userId),
}));

// Conversation analytics table for pre-aggregated stats
export const conversationAnalytics = pgTable("conversation_analytics", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "cascade" }).notNull().unique(),
  totalMessages: integer("total_messages").default(0),
  lastMessageAt: timestamp("last_message_at"),
  averageResponseTime: interval("average_response_time"),
  participantStats: jsonb("participant_stats").default("{}"),
  messageTypes: jsonb("message_types").default("{}"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  conversationIdIdx: index("idx_conversation_analytics_conversation_id").on(t.conversationId),
  lastMessageAtIdx: index("idx_conversation_analytics_last_message_at").on(t.lastMessageAt),
  updatedAtIdx: index("idx_conversation_analytics_updated_at").on(t.updatedAt),
}));

// Marketplace Listings - for the marketplace API endpoints
export const marketplaceListings = pgTable("marketplace_listings", {
  id: uuid("id").defaultRandom().primaryKey(),
  sellerAddress: varchar("seller_address", { length: 42 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  price: numeric("price", { precision: 18, scale: 8 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("ETH"),
  images: jsonb("images"), // JSON array of image URLs/IPFS hashes
  category: varchar("category", { length: 100 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  sellerFk: foreignKey({
    columns: [t.sellerAddress],
    foreignColumns: [sellers.walletAddress]
  }),
  sellerAddressIdx: index("idx_marketplace_listings_seller_address").on(t.sellerAddress),
  createdAtIdx: index("idx_marketplace_listings_created_at").on(t.createdAt),
  priceIdx: index("idx_marketplace_listings_price").on(t.price),
  categoryIdx: index("idx_marketplace_listings_category").on(t.category),
  isActiveIdx: index("idx_marketplace_listings_is_active").on(t.isActive),
  titleIdx: index("idx_marketplace_listings_title").on(t.title),
  activeCreatedIdx: index("idx_marketplace_listings_active_created").on(t.isActive, t.createdAt),
  sellerActiveIdx: index("idx_marketplace_listings_seller_active").on(t.sellerAddress, t.isActive),
  categoryActiveIdx: index("idx_marketplace_listings_category_active").on(t.category, t.isActive, t.createdAt),
}));

// Mobile Device Tokens for push notifications
export const mobileDeviceTokens = pgTable("mobile_device_tokens", {
  id: serial("id").primaryKey(),
  userAddress: varchar("user_address", { length: 66 }).notNull(),
  token: varchar("token", { length: 255 }).notNull(),
  platform: varchar("platform", { length: 32 }).notNull(), // 'ios', 'android', 'web'
  lastUsedAt: timestamp("last_used_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  userTokenIdx: index("idx_mobile_device_tokens_user_token").on(t.userAddress, t.token),
  platformIdx: index("idx_mobile_device_tokens_platform").on(t.platform),
}));

// Offline Content Cache
export const offlineContentCache = pgTable("offline_content_cache", {
  id: uuid("id").defaultRandom().primaryKey(),
  userAddress: varchar("user_address", { length: 66 }).notNull(),
  contentType: varchar("content_type", { length: 50 }).notNull(), // 'post', 'community', 'user', 'comment'
  contentId: varchar("content_id", { length: 64 }).notNull(),
  contentData: text("content_data").notNull(), // JSON serialized content
  expiresAt: timestamp("expires_at"),
  priority: integer("priority").default(0), // Higher priority content is kept longer
  accessedAt: timestamp("accessed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  userContentIdx: index("idx_offline_content_cache_user_content").on(t.userAddress, t.contentType, t.contentId),
  expiresAtIdx: index("idx_offline_content_cache_expires_at").on(t.expiresAt),
  priorityIdx: index("idx_offline_content_cache_priority").on(t.priority),
}));

// Offline Action Queue
export const offlineActionQueue = pgTable("offline_action_queue", {
  id: uuid("id").defaultRandom().primaryKey(),
  userAddress: varchar("user_address", { length: 66 }).notNull(),
  actionType: varchar("action_type", { length: 50 }).notNull(), // 'post', 'comment', 'vote', 'like'
  actionData: text("action_data").notNull(), // JSON serialized action data
  status: varchar("status", { length: 20 }).default("pending"), // 'pending', 'processing', 'completed', 'failed'
  retryCount: integer("retry_count").default(0),
  lastAttemptAt: timestamp("last_attempt_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  userActionIdx: index("idx_offline_action_queue_user_action").on(t.userAddress, t.actionType),
  statusIdx: index("idx_offline_action_queue_status").on(t.status),
  createdAtIdx: index("idx_offline_action_queue_created_at").on(t.createdAt),
}));

// Mobile Governance Sessions
export const mobileGovernanceSessions = pgTable("mobile_governance_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userAddress: varchar("user_address", { length: 66 }).notNull(),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  proposalId: uuid("proposal_id").references(() => proposals.id),
  actionType: varchar("action_type", { length: 50 }), // 'view', 'vote', 'create'
  biometricUsed: boolean("biometric_used").default(false),
  sessionStart: timestamp("session_start").defaultNow(),
  sessionEnd: timestamp("session_end"),
  actionsPerformed: integer("actions_performed").default(0),
}, (t) => ({
  userSessionIdx: index("idx_mobile_governance_sessions_user_session").on(t.userAddress, t.sessionId),
  proposalIdx: index("idx_mobile_governance_sessions_proposal").on(t.proposalId),
  sessionStartIdx: index("idx_mobile_governance_sessions_start").on(t.sessionStart),
}));

// Authentication System Tables
export const authSessions = pgTable("auth_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  walletAddress: varchar("wallet_address", { length: 66 }).notNull(),
  sessionToken: varchar("session_token", { length: 512 }).notNull().unique(),
  refreshToken: varchar("refresh_token", { length: 512 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  refreshExpiresAt: timestamp("refresh_expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 45 }),
  lastUsedAt: timestamp("last_used_at").defaultNow(),
}, (t) => ({
  walletAddressIdx: index("idx_auth_sessions_wallet_address").on(t.walletAddress),
  sessionTokenIdx: index("idx_auth_sessions_session_token").on(t.sessionToken),
  refreshTokenIdx: index("idx_auth_sessions_refresh_token").on(t.refreshToken),
  expiresAtIdx: index("idx_auth_sessions_expires_at").on(t.expiresAt),
  isActiveIdx: index("idx_auth_sessions_is_active").on(t.isActive),
}));

export const walletAuthAttempts = pgTable("wallet_auth_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  walletAddress: varchar("wallet_address", { length: 66 }).notNull(),
  attemptType: varchar("attempt_type", { length: 32 }).notNull(), // 'login', 'refresh', 'logout'
  success: boolean("success").notNull(),
  errorMessage: text("error_message"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  walletAddressIdx: index("idx_wallet_auth_attempts_wallet_address").on(t.walletAddress),
  createdAtIdx: index("idx_wallet_auth_attempts_created_at").on(t.createdAt),
  successIdx: index("idx_wallet_auth_attempts_success").on(t.success),
}));

export const walletNonces = pgTable("wallet_nonces", {
  id: uuid("id").defaultRandom().primaryKey(),
  walletAddress: varchar("wallet_address", { length: 66 }).notNull(),
  nonce: varchar("nonce", { length: 255 }).notNull().unique(),
  message: text("message").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  walletAddressIdx: index("idx_wallet_nonces_wallet_address").on(t.walletAddress),
  nonceIdx: index("idx_wallet_nonces_nonce").on(t.nonce),
  expiresAtIdx: index("idx_wallet_nonces_expires_at").on(t.expiresAt),
  usedIdx: index("idx_wallet_nonces_used").on(t.used),
}));

// Marketplace Reputation System Tables
export const userReputation = pgTable("user_reputation", {
  walletAddress: varchar("wallet_address", { length: 66 }).primaryKey(),
  reputationScore: numeric("reputation_score", { precision: 5, scale: 2 }).default("0.00").notNull(),
  totalTransactions: integer("total_transactions").default(0).notNull(),
  positiveReviews: integer("positive_reviews").default(0).notNull(),
  negativeReviews: integer("negative_reviews").default(0).notNull(),
  neutralReviews: integer("neutral_reviews").default(0).notNull(),
  successfulSales: integer("successful_sales").default(0).notNull(),
  successfulPurchases: integer("successful_purchases").default(0).notNull(),
  disputedTransactions: integer("disputed_transactions").default(0).notNull(),
  resolvedDisputes: integer("resolved_disputes").default(0).notNull(),
  averageResponseTime: numeric("average_response_time", { precision: 10, scale: 2 }).default("0.00"),
  completionRate: numeric("completion_rate", { precision: 5, scale: 2 }).default("100.00"),
  lastCalculated: timestamp("last_calculated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  scoreIdx: index("idx_user_reputation_score").on(t.reputationScore),
  totalTransactionsIdx: index("idx_user_reputation_total_transactions").on(t.totalTransactions),
  updatedAtIdx: index("idx_user_reputation_updated_at").on(t.updatedAt),
}));

export const reputationHistoryMarketplace = pgTable("reputation_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  walletAddress: varchar("wallet_address", { length: 66 }).notNull(),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  scoreChange: numeric("score_change", { precision: 5, scale: 2 }).notNull(),
  previousScore: numeric("previous_score", { precision: 5, scale: 2 }).notNull(),
  newScore: numeric("new_score", { precision: 5, scale: 2 }).notNull(),
  transactionId: varchar("transaction_id", { length: 100 }),
  reviewId: uuid("review_id"),
  description: text("description"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  walletAddressIdx: index("idx_reputation_history_wallet_address").on(t.walletAddress),
  eventTypeIdx: index("idx_reputation_history_event_type").on(t.eventType),
  createdAtIdx: index("idx_reputation_history_created_at").on(t.createdAt),
  transactionIdIdx: index("idx_reputation_history_transaction_id").on(t.transactionId),
  walletAddressFk: foreignKey({
    columns: [t.walletAddress],
    foreignColumns: [userReputation.walletAddress]
  })
}));

export const reputationCalculationRules = pgTable("reputation_calculation_rules", {
  id: serial("id").primaryKey(),
  ruleName: varchar("rule_name", { length: 100 }).notNull().unique(),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  scoreImpact: numeric("score_impact", { precision: 5, scale: 2 }).notNull(),
  weightFactor: numeric("weight_factor", { precision: 3, scale: 2 }).default("1.00"),
  minThreshold: integer("min_threshold").default(0),
  maxImpact: numeric("max_impact", { precision: 5, scale: 2 }),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  eventTypeIdx: index("idx_reputation_rules_event_type").on(t.eventType),
  activeIdx: index("idx_reputation_rules_active").on(t.isActive),
}));

// Seller Performance Management Tables

// Seller Performance Scorecards
export const sellerScorecards = pgTable("seller_scorecards", {
  id: serial("id").primaryKey(),
  sellerWalletAddress: varchar("seller_wallet_address", { length: 66 }).notNull(),
  overallScore: numeric("overall_score", { precision: 5, scale: 2 }).notNull().default("0.00"),
  customerSatisfaction: numeric("customer_satisfaction", { precision: 5, scale: 2 }).notNull().default("0.00"),
  orderFulfillment: numeric("order_fulfillment", { precision: 5, scale: 2 }).notNull().default("0.00"),
  responseTime: numeric("response_time", { precision: 5, scale: 2 }).notNull().default("0.00"),
  disputeRate: numeric("dispute_rate", { precision: 5, scale: 2 }).notNull().default("0.00"),
  growthRate: numeric("growth_rate", { precision: 5, scale: 2 }).notNull().default("0.00"),
  performanceTier: varchar("performance_tier", { length: 20 }).default("bronze"),
  lastCalculatedAt: timestamp("last_calculated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  sellerWalletIdx: index("idx_seller_scorecards_wallet").on(t.sellerWalletAddress),
  performanceTierIdx: index("idx_seller_scorecards_tier").on(t.performanceTier),
  sellerFk: foreignKey({
    columns: [t.sellerWalletAddress],
    foreignColumns: [sellers.walletAddress]
  })
}));

// Seller Performance History
export const sellerPerformanceHistory = pgTable("seller_performance_history", {
  id: serial("id").primaryKey(),
  sellerWalletAddress: varchar("seller_wallet_address", { length: 66 }).notNull(),
  metricType: varchar("metric_type", { length: 50 }).notNull(),
  metricValue: numeric("metric_value", { precision: 10, scale: 4 }).notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  metadata: jsonb("metadata").default("{}"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  sellerMetricIdx: index("idx_seller_performance_history_wallet_type").on(t.sellerWalletAddress, t.metricType),
  periodIdx: index("idx_seller_performance_history_period").on(t.periodStart, t.periodEnd),
  sellerFk: foreignKey({
    columns: [t.sellerWalletAddress],
    foreignColumns: [sellers.walletAddress]
  })
}));

// Seller Risk Assessments
export const sellerRiskAssessments = pgTable("seller_risk_assessments", {
  id: serial("id").primaryKey(),
  sellerWalletAddress: varchar("seller_wallet_address", { length: 66 }).notNull(),
  overallRiskScore: numeric("overall_risk_score", { precision: 5, scale: 2 }).notNull().default("0.00"),
  financialRisk: numeric("financial_risk", { precision: 5, scale: 2 }).notNull().default("0.00"),
  operationalRisk: numeric("operational_risk", { precision: 5, scale: 2 }).notNull().default("0.00"),
  reputationRisk: numeric("reputation_risk", { precision: 5, scale: 2 }).notNull().default("0.00"),
  complianceRisk: numeric("compliance_risk", { precision: 5, scale: 2 }).notNull().default("0.00"),
  riskFactors: jsonb("risk_factors").default("[]"),
  riskLevel: varchar("risk_level", { length: 20 }).default("low"),
  mitigationRecommendations: jsonb("mitigation_recommendations").default("[]"),
  lastAssessedAt: timestamp("last_assessed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  sellerWalletIdx: index("idx_seller_risk_assessments_wallet").on(t.sellerWalletAddress),
  riskLevelIdx: index("idx_seller_risk_assessments_level").on(t.riskLevel),
  sellerFk: foreignKey({
    columns: [t.sellerWalletAddress],
    foreignColumns: [sellers.walletAddress]
  })
}));

// Seller Performance Alerts
export const sellerPerformanceAlerts = pgTable("seller_performance_alerts", {
  id: serial("id").primaryKey(),
  sellerWalletAddress: varchar("seller_wallet_address", { length: 66 }).notNull(),
  alertType: varchar("alert_type", { length: 50 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull().default("medium"),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  thresholdValue: numeric("threshold_value", { precision: 10, scale: 4 }),
  currentValue: numeric("current_value", { precision: 10, scale: 4 }),
  recommendations: jsonb("recommendations").default("[]"),
  isAcknowledged: boolean("is_acknowledged").default(false),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedBy: varchar("acknowledged_by", { length: 66 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  sellerWalletIdx: index("idx_seller_performance_alerts_wallet").on(t.sellerWalletAddress),
  alertTypeIdx: index("idx_seller_performance_alerts_type").on(t.alertType),
  sellerFk: foreignKey({
    columns: [t.sellerWalletAddress],
    foreignColumns: [sellers.walletAddress]
  })
}));

// Marketplace Health Metrics
export const marketplaceHealthMetrics = pgTable("marketplace_health_metrics", {
  id: serial("id").primaryKey(),
  metricName: varchar("metric_name", { length: 100 }).notNull(),
  metricValue: numeric("metric_value", { precision: 15, scale: 4 }).notNull(),
  metricUnit: varchar("metric_unit", { length: 50 }),
  category: varchar("category", { length: 50 }).notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  metadata: jsonb("metadata").default("{}"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  categoryIdx: index("idx_marketplace_health_metrics_category").on(t.category),
  periodIdx: index("idx_marketplace_health_metrics_period").on(t.periodStart, t.periodEnd),
}));

// Seller Growth Projections
export const sellerGrowthProjections = pgTable("seller_growth_projections", {
  id: serial("id").primaryKey(),
  sellerWalletAddress: varchar("seller_wallet_address", { length: 66 }).notNull(),
  projectionType: varchar("projection_type", { length: 50 }).notNull(),
  currentValue: numeric("current_value", { precision: 15, scale: 4 }).notNull(),
  projectedValue: numeric("projected_value", { precision: 15, scale: 4 }).notNull(),
  confidenceInterval: numeric("confidence_interval", { precision: 5, scale: 2 }).notNull(),
  projectionPeriodMonths: integer("projection_period_months").notNull(),
  successFactors: jsonb("success_factors").default("[]"),
  improvementRecommendations: jsonb("improvement_recommendations").default("[]"),
  modelVersion: varchar("model_version", { length: 20 }).default("1.0"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  sellerWalletIdx: index("idx_seller_growth_projections_wallet").on(t.sellerWalletAddress),
  projectionTypeIdx: index("idx_seller_growth_projections_type").on(t.projectionType),
  sellerFk: foreignKey({
    columns: [t.sellerWalletAddress],
    foreignColumns: [sellers.walletAddress]
  })
}));

// Shopping Cart System Tables
export const carts = pgTable("carts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  sessionId: varchar("session_id", { length: 255 }),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  metadata: text("metadata"), // JSON additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  userIdIdx: index("idx_carts_user_id").on(t.userId),
  sessionIdIdx: index("idx_carts_session_id").on(t.sessionId),
  statusIdx: index("idx_carts_status").on(t.status),
}));

export const cartItems = pgTable("cart_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  cartId: uuid("cart_id").references(() => carts.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  quantity: integer("quantity").notNull(),
  priceAtTime: numeric("price_at_time", { precision: 20, scale: 8 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
  appliedPromoCodeId: uuid("applied_promo_code_id").references(() => promoCodes.id),
  appliedDiscount: numeric("applied_discount", { precision: 20, scale: 8 }).default("0"),
  // Gift options
  isGift: boolean("is_gift").default(false),
  giftMessage: text("gift_message"),
  giftWrapOption: varchar("gift_wrap_option", { length: 50 }),
  // Selection for bulk actions
  selected: boolean("selected").default(true),
  metadata: text("metadata"), // JSON additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  cartIdIdx: index("idx_cart_items_cart_id").on(t.cartId),
  productIdIdx: index("idx_cart_items_product_id").on(t.productId),
  uniqueCartProduct: index("idx_cart_items_unique_cart_product").on(t.cartId, t.productId),
  selectedIdx: index("idx_cart_items_selected").on(t.selected),
}));

// Enhanced Payment Method Preferences System
export const paymentMethodPreferences = pgTable("payment_method_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),

  // Encrypted preference data
  encryptedPreferences: text("encrypted_preferences").notNull(), // JSON encrypted with user-specific key

  // Quick access fields for performance (non-encrypted)
  preferredMethods: jsonb("preferred_methods").default("[]"), // Array of preferred payment method types in order
  avoidedMethods: jsonb("avoided_methods").default("[]"), // Array of avoided payment method types
  maxGasFeeThreshold: numeric("max_gas_fee_threshold", { precision: 10, scale: 2 }).default("50.00"), // Maximum acceptable gas fee in USD
  preferStablecoins: boolean("prefer_stablecoins").default(true),
  preferFiat: boolean("prefer_fiat").default(false),

  // Learning algorithm data
  totalTransactions: integer("total_transactions").default(0),
  methodUsageCounts: jsonb("method_usage_counts").default("{}"), // Count of usage per payment method
  lastUsedMethods: jsonb("last_used_methods").default("[]"), // Recent payment methods with timestamps
  preferenceScores: jsonb("preference_scores").default("{}"), // Calculated preference scores per method

  // Metadata
  learningEnabled: boolean("learning_enabled").default(true),
  lastPreferenceUpdate: timestamp("last_preference_update").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  userIdIdx: index("idx_payment_preferences_user_id").on(t.userId),
  updatedAtIdx: index("idx_payment_preferences_updated_at").on(t.updatedAt),
  learningEnabledIdx: index("idx_payment_preferences_learning_enabled").on(t.learningEnabled),
}));

// Payment method usage history for learning
export const paymentMethodUsageHistory = pgTable("payment_method_usage_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  paymentMethodType: varchar("payment_method_type", { length: 50 }).notNull(), // 'STABLECOIN_USDC', 'FIAT_STRIPE', 'NATIVE_ETH', etc.
  transactionAmount: numeric("transaction_amount", { precision: 20, scale: 8 }),
  transactionCurrency: varchar("transaction_currency", { length: 10 }),
  gasFeeUsd: numeric("gas_fee_usd", { precision: 10, scale: 2 }),
  totalCostUsd: numeric("total_cost_usd", { precision: 10, scale: 2 }),
  networkId: integer("network_id"),
  wasPreferred: boolean("was_preferred").default(false), // Whether this was the user's preferred choice
  wasSuggested: boolean("was_suggested").default(false), // Whether this was system-suggested
  contextData: jsonb("context_data").default("{}"), // Additional context (market conditions, etc.)
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  userIdIdx: index("idx_payment_usage_history_user_id").on(t.userId),
  methodTypeIdx: index("idx_payment_usage_history_method_type").on(t.paymentMethodType),
  createdAtIdx: index("idx_payment_usage_history_created_at").on(t.createdAt),
  userMethodIdx: index("idx_payment_usage_history_user_method").on(t.userId, t.paymentMethodType),
}));

// Payment method preference overrides
export const paymentMethodPreferenceOverrides = pgTable("payment_method_preference_overrides", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  overrideType: varchar("override_type", { length: 50 }).notNull(), // 'manual_selection', 'temporary_preference', 'network_specific'
  paymentMethodType: varchar("payment_method_type", { length: 50 }).notNull(),
  networkId: integer("network_id"),
  priorityBoost: integer("priority_boost").default(0), // How much to boost this method's priority
  expiresAt: timestamp("expires_at"), // When this override expires (NULL for permanent)
  reason: text("reason"), // User-provided reason for override
  metadata: jsonb("metadata").default("{}"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  userIdIdx: index("idx_payment_preference_overrides_user_id").on(t.userId),
  expiresAtIdx: index("idx_payment_preference_overrides_expires_at").on(t.expiresAt),
  methodTypeIdx: index("idx_payment_preference_overrides_method_type").on(t.paymentMethodType),
}));

// LDAO Token Acquisition System Tables

// Purchase transactions table
export const purchaseTransactions = pgTable("purchase_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  amount: numeric("amount", { precision: 20, scale: 8 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 20 }).notNull(),
  paymentToken: varchar("payment_token", { length: 20 }).notNull(),
  pricePerToken: numeric("price_per_token", { precision: 20, scale: 8 }).notNull(),
  discountApplied: numeric("discount_applied", { precision: 5, scale: 4 }).default("0").notNull(),
  totalPrice: numeric("total_price", { precision: 20, scale: 8 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  txHash: varchar("tx_hash", { length: 66 }),
  paymentProcessorId: varchar("payment_processor_id", { length: 255 }),
  paymentDetails: text("payment_details"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  userIdx: index("idx_purchase_transactions_user_id").on(t.userId),
  statusIdx: index("idx_purchase_transactions_status").on(t.status),
  createdAtIdx: index("idx_purchase_transactions_created_at").on(t.createdAt),
  paymentMethodIdx: index("idx_purchase_transactions_payment_method").on(t.paymentMethod),
}));

// Earning activities table
export const earningActivities = pgTable("earning_activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  activityType: varchar("activity_type", { length: 50 }).notNull(),
  activityId: varchar("activity_id", { length: 255 }).notNull(),
  tokensEarned: numeric("tokens_earned", { precision: 20, scale: 8 }).notNull(),
  baseReward: numeric("base_reward", { precision: 20, scale: 8 }).notNull(),
  multiplier: numeric("multiplier", { precision: 5, scale: 4 }).default("1.0").notNull(),
  qualityScore: numeric("quality_score", { precision: 5, scale: 4 }),
  isPremiumBonus: boolean("is_premium_bonus").default(false).notNull(),
  premiumBonusAmount: numeric("premium_bonus_amount", { precision: 20, scale: 8 }).default("0"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  userIdx: index("idx_earning_activities_user_id").on(t.userId),
  activityTypeIdx: index("idx_earning_activities_activity_type").on(t.activityType),
  createdAtIdx: index("idx_earning_activities_created_at").on(t.createdAt),
}));

// Enhanced staking positions table
export const stakingPositions = pgTable("staking_positions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  amount: numeric("amount", { precision: 20, scale: 8 }).notNull(),
  lockPeriod: integer("lock_period").notNull(),
  aprRate: numeric("apr_rate", { precision: 5, scale: 4 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  startTime: timestamp("start_time").notNull().$defaultFn(() => new Date()),
  endDate: timestamp("end_date").notNull(),
  isAutoCompound: boolean("is_auto_compound").default(false).notNull(),
  isFixedTerm: boolean("is_fixed_term").default(true),
  isActive: boolean("is_active").default(true).notNull(),
  tierId: varchar("tier_id", { length: 64 }),
  rewardsEarned: numeric("rewards_earned", { precision: 20, scale: 8 }).default("0").notNull(),
  accumulatedRewards: numeric("accumulated_rewards", { precision: 20, scale: 8 }).default("0"), // Total accumulated rewards
  lastRewardClaim: timestamp("last_reward_claim"), // Last time rewards were claimed
  status: varchar("status", { length: 20 }).default("active").notNull(),
  contractAddress: varchar("contract_address", { length: 66 }),
  txHash: varchar("tx_hash", { length: 66 }),
  transactionHash: varchar("transaction_hash", { length: 66 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  userIdx: index("idx_staking_positions_user_id").on(t.userId),
  statusIdx: index("idx_staking_positions_status").on(t.status),
  endDateIdx: index("idx_staking_positions_end_date").on(t.endDate),
}));

// Price history table for analytics
export const ldaoPriceHistory = pgTable("ldao_price_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  priceUsd: numeric("price_usd", { precision: 20, scale: 8 }).notNull(),
  priceEth: numeric("price_eth", { precision: 20, scale: 8 }),
  volume24h: numeric("volume_24h", { precision: 20, scale: 8 }).default("0"),
  marketCap: numeric("market_cap", { precision: 20, scale: 8 }),
  source: varchar("source", { length: 50 }).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (t) => ({
  timestampIdx: index("idx_ldao_price_history_timestamp").on(t.timestamp),
  sourceIdx: index("idx_ldao_price_history_source").on(t.source),
}));

// Volume discount tiers configuration
export const volumeDiscountTiers = pgTable("volume_discount_tiers", {
  id: uuid("id").defaultRandom().primaryKey(),
  minAmount: numeric("min_amount", { precision: 20, scale: 8 }).notNull(),
  maxAmount: numeric("max_amount", { precision: 20, scale: 8 }),
  discountPercentage: numeric("discount_percentage", { precision: 5, scale: 4 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  minAmountIdx: index("idx_volume_discount_tiers_min_amount").on(t.minAmount),
  isActiveIdx: index("idx_volume_discount_tiers_is_active").on(t.isActive),
}));

// User purchase limits and KYC status
export const userPurchaseLimits = pgTable("user_purchase_limits", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  dailyLimit: numeric("daily_limit", { precision: 20, scale: 8 }).default("1000").notNull(),
  monthlyLimit: numeric("monthly_limit", { precision: 20, scale: 8 }).default("10000").notNull(),
  dailySpent: numeric("daily_spent", { precision: 20, scale: 8 }).default("0").notNull(),
  monthlySpent: numeric("monthly_spent", { precision: 20, scale: 8 }).default("0").notNull(),
  kycVerified: boolean("kyc_verified").default(false).notNull(),
  kycLevel: varchar("kyc_level", { length: 20 }).default("none").notNull(),
  lastResetDate: timestamp("last_reset_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Referral program tracking
// Referral configuration table
export const referralConfig = pgTable("referral_config", {
  id: uuid("id").defaultRandom().primaryKey(),
  configKey: varchar("config_key", { length: 100 }).notNull().unique(),
  configValue: text("config_value").notNull(),
  configType: varchar("config_type", { length: 20 }).default("string").notNull(), // string, number, boolean, json
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  configKeyIdx: index("idx_referral_config_config_key").on(t.configKey),
}));

export const referralActivities = pgTable("referral_activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  referrerId: uuid("referrer_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  refereeId: uuid("referee_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  activityType: varchar("activity_type", { length: 50 }).notNull(),
  tokensEarned: numeric("tokens_earned", { precision: 20, scale: 8 }).notNull(),
  tierLevel: integer("tier_level").default(1).notNull(),
  bonusPercentage: numeric("bonus_percentage", { precision: 5, scale: 4 }).notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  referrerIdx: index("idx_referral_activities_referrer_id").on(t.referrerId),
  refereeIdx: index("idx_referral_activities_referee_id").on(t.refereeId),
  createdAtIdx: index("idx_referral_activities_created_at").on(t.createdAt),
}));

// Bridge transactions tracking
export const bridgeTransactions = pgTable("bridge_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  nonce: integer("nonce"),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  fromChain: varchar("from_chain", { length: 50 }).notNull(),
  toChain: varchar("to_chain", { length: 50 }).notNull(),
  amount: numeric("amount", { precision: 20, scale: 8 }).notNull(),
  bridgeProvider: varchar("bridge_provider", { length: 50 }).notNull(),
  sourceTxHash: varchar("source_tx_hash", { length: 66 }),
  destinationTxHash: varchar("destination_tx_hash", { length: 66 }),
  bridgeId: varchar("bridge_id", { length: 255 }),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  fees: numeric("fees", { precision: 20, scale: 8 }).default("0"),
  estimatedTime: integer("estimated_time"),
  actualTime: integer("actual_time"),
  errorMessage: text("error_message"),
  validatorCount: integer("validator_count").default(0), // Number of validators for this bridge
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  userIdx: index("idx_bridge_transactions_user_id").on(t.userId),
  nonceIdx: index("idx_bridge_transactions_nonce").on(t.nonce),
  statusIdx: index("idx_bridge_transactions_status").on(t.status),
  createdAtIdx: index("idx_bridge_transactions_created_at").on(t.createdAt),
}));

// Bridge events tracking
export const bridgeEvents = pgTable("bridge_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  transactionId: varchar("transaction_id", { length: 255 }).notNull(),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  blockNumber: integer("block_number"),
  txHash: varchar("tx_hash", { length: 66 }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  data: text("data"), // JSON string
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  transactionIdIdx: index("idx_bridge_events_transaction_id").on(t.transactionId),
  eventTypeIdx: index("idx_bridge_events_event_type").on(t.eventType),
  timestampIdx: index("idx_bridge_events_timestamp").on(t.timestamp),
}));

// Bridge metrics tracking
export const bridgeMetrics = pgTable("bridge_metrics", {
  id: uuid("id").defaultRandom().primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  totalTransactions: integer("total_transactions").notNull().default(0),
  totalVolume: numeric("total_volume", { precision: 30, scale: 8 }).notNull().default("0"),
  totalFees: numeric("total_fees", { precision: 30, scale: 8 }).notNull().default("0"),
  successRate: numeric("success_rate", { precision: 5, scale: 4 }).notNull().default("0"),
  averageCompletionTime: integer("average_completion_time").notNull().default(0),
  activeValidators: integer("active_validators").notNull().default(0),
  chainMetrics: text("chain_metrics"), // JSON string
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  timestampIdx: index("idx_bridge_metrics_timestamp").on(t.timestamp),
}));

// Bridge alerts
export const bridgeAlerts = pgTable("bridge_alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  alertType: varchar("alert_type", { length: 50 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  chainId: integer("chain_id"),
  transactionId: varchar("transaction_id", { length: 255 }),
  validatorAddress: varchar("validator_address", { length: 66 }),
  isResolved: boolean("is_resolved").default(false).notNull(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by", { length: 66 }),
  metadata: text("metadata"), // JSON string
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  alertTypeIdx: index("idx_bridge_alerts_alert_type").on(t.alertType),
  severityIdx: index("idx_bridge_alerts_severity").on(t.severity),
  chainIdIdx: index("idx_bridge_alerts_chain_id").on(t.chainId),
  isResolvedIdx: index("idx_bridge_alerts_is_resolved").on(t.isResolved),
  createdAtIdx: index("idx_bridge_alerts_created_at").on(t.createdAt),
}));

// DEX swap transactions
export const dexSwapTransactions = pgTable("dex_swap_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  dexProvider: varchar("dex_provider", { length: 50 }).notNull(),
  fromToken: varchar("from_token", { length: 20 }).notNull(),
  toToken: varchar("to_token", { length: 20 }).notNull(),
  amountIn: numeric("amount_in", { precision: 20, scale: 8 }).notNull(),
  amountOut: numeric("amount_out", { precision: 20, scale: 8 }),
  expectedAmountOut: numeric("expected_amount_out", { precision: 20, scale: 8 }),
  slippageTolerance: numeric("slippage_tolerance", { precision: 5, scale: 4 }).default("0.005"),
  priceImpact: numeric("price_impact", { precision: 5, scale: 4 }),
  gasFee: numeric("gas_fee", { precision: 20, scale: 8 }),
  txHash: varchar("tx_hash", { length: 66 }),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  userIdx: index("idx_dex_swap_transactions_user_id").on(t.userId),
  statusIdx: index("idx_dex_swap_transactions_status").on(t.status),
  createdAtIdx: index("idx_dex_swap_transactions_created_at").on(t.createdAt),
}));

// Fiat payment processing records
export const fiatPaymentRecords = pgTable("fiat_payment_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  purchaseTransactionId: uuid("purchase_transaction_id").references(() => purchaseTransactions.id, { onDelete: 'cascade' }).notNull(),
  paymentProcessor: varchar("payment_processor", { length: 50 }).notNull(),
  processorPaymentId: varchar("processor_payment_id", { length: 255 }).notNull(),
  amountFiat: numeric("amount_fiat", { precision: 20, scale: 8 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
  exchangeRate: numeric("exchange_rate", { precision: 20, scale: 8 }).notNull(),
  amountCrypto: numeric("amount_crypto", { precision: 20, scale: 8 }).notNull(),
  cryptoCurrency: varchar("crypto_currency", { length: 20 }).notNull(),
  processingFees: numeric("processing_fees", { precision: 20, scale: 8 }).default("0"),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  webhookData: text("webhook_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  purchaseTransactionIdx: index("idx_fiat_payment_records_purchase_transaction_id").on(t.purchaseTransactionId),
  statusIdx: index("idx_fiat_payment_records_status").on(t.status),
  processorPaymentIdIdx: index("idx_fiat_payment_records_processor_payment_id").on(t.processorPaymentId),
}));

// LDAO Earn-to-Own System Tables

// Earning activities table to track all earning events

// =================================================================================================
// USER MONITORING SYSTEM TABLES
// =================================================================================================

// User Behavior Logs - Track frontend events
export const userBehaviorLogs = pgTable("user_behavior_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }),
  eventType: varchar("event_type", { length: 50 }).notNull(), // VIEW_PRODUCT, CLICK_BUTTON, SEARCH, etc.
  metadata: text("metadata"), // JSON string with event details
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  sessionId: varchar("session_id", { length: 100 }),
  path: varchar("path", { length: 255 }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  userIdIdx: index("idx_user_behavior_logs_user_id").on(t.userId),
  eventTypeIdx: index("idx_user_behavior_logs_event_type").on(t.eventType),
  timestampIdx: index("idx_user_behavior_logs_timestamp").on(t.timestamp),
  sessionIdIdx: index("idx_user_behavior_logs_session_id").on(t.sessionId),
}));

// User Transactions - Track on-chain transactions linked to users
export const userTransactions = pgTable("user_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }),
  txHash: varchar("tx_hash", { length: 66 }).notNull().unique(),
  chain: varchar("chain", { length: 50 }).default("ethereum"),
  eventType: varchar("event_type", { length: 50 }).notNull(), // TRANSFER, SWAP, MINT, etc.
  token: varchar("token", { length: 64 }),
  amount: numeric("amount", { precision: 30, scale: 18 }),
  status: varchar("status", { length: 20 }).default("pending"),
  blockNumber: integer("block_number"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  userIdIdx: index("idx_user_transactions_user_id").on(t.userId),
  txHashIdx: index("idx_user_transactions_tx_hash").on(t.txHash),
  eventTypeIdx: index("idx_user_transactions_event_type").on(t.eventType),
  timestampIdx: index("idx_user_transactions_timestamp").on(t.timestamp),
}));

// Purchases - Track marketplace purchases (distinct from payments)
export const purchases = pgTable("purchases", {
  id: uuid("id").defaultRandom().primaryKey(),
  buyerId: uuid("buyer_id").references(() => users.id).notNull(),
  sellerId: uuid("seller_id").references(() => users.id).notNull(),
  productId: uuid("product_id").references(() => products.id),
  price: numeric("price", { precision: 20, scale: 8 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
  escrowId: varchar("escrow_id", { length: 100 }),
  status: varchar("status", { length: 32 }).default("pending"), // pending, completed, disputed, refunded
  disputeStatus: varchar("dispute_status", { length: 32 }),
  txHash: varchar("tx_hash", { length: 66 }),
  metadata: text("metadata"), // JSON string
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),

  // Financial Details
  taxAmount: numeric("tax_amount", { precision: 20, scale: 8 }).default('0'),
  shippingCost: numeric("shipping_cost", { precision: 20, scale: 8 }).default('0'),
  platformFee: numeric("platform_fee", { precision: 20, scale: 8 }).default('0'),
  taxBreakdown: jsonb("tax_breakdown").default('[]'),
}, (t) => ({
  buyerIdx: index("idx_purchases_buyer_id").on(t.buyerId),
  sellerIdx: index("idx_purchases_seller_id").on(t.sellerId),
  productIdx: index("idx_purchases_product_id").on(t.productId),
  statusIdx: index("idx_purchases_status").on(t.status),
  timestampIdx: index("idx_purchases_timestamp").on(t.timestamp),
}));

// Wallet Activity - Track raw wallet events
export const walletActivity = pgTable("wallet_activity", {
  id: uuid("id").defaultRandom().primaryKey(),
  walletAddress: varchar("wallet_address", { length: 66 }).notNull(),
  userId: uuid("user_id").references(() => users.id), // Optional link to user if known
  activityType: varchar("activity_type", { length: 50 }).notNull(), // TRANSFER_IN, TRANSFER_OUT, VOTE, etc.
  txHash: varchar("tx_hash", { length: 66 }),
  amount: numeric("amount", { precision: 30, scale: 18 }),
  token: varchar("token", { length: 64 }),
  chainId: integer("chain_id"),
  metadata: text("metadata"), // JSON string
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  walletIdx: index("idx_wallet_activity_wallet").on(t.walletAddress),
  userIdIdx: index("idx_wallet_activity_user_id").on(t.userId),
  activityTypeIdx: index("idx_wallet_activity_type").on(t.activityType),
  timestampIdx: index("idx_wallet_activity_timestamp").on(t.timestamp),
}));

// Risk Flags - Store risk scores and flags
export const riskFlags = pgTable("risk_flags", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  flagType: varchar("flag_type", { length: 100 }).notNull(), // "High Transaction Velocity", "Suspicious Wallet Cluster"
  severity: varchar("severity", { length: 20 }).notNull(), // low, medium, high, critical
  description: text("description"),
  score: integer("score"), // Risk score contribution
  status: varchar("status", { length: 20 }).default("active"), // active, resolved, ignored
  resolvedBy: uuid("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  metadata: text("metadata"), // JSON string with supporting evidence
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  userIdIdx: index("idx_risk_flags_user_id").on(t.userId),
  severityIdx: index("idx_risk_flags_severity").on(t.severity),
  statusIdx: index("idx_risk_flags_status").on(t.status),
  createdAtIdx: index("idx_risk_flags_created_at").on(t.createdAt),
}));

// Audit Logs - Immutable log of critical actions
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id), // Actor
  action: varchar("action", { length: 100 }).notNull(),
  resourceType: varchar("resource_type", { length: 50 }),
  resourceId: varchar("resource_id", { length: 100 }),
  payload: text("payload"), // JSON string of changes/data
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (t) => ({
  userIdIdx: index("idx_audit_logs_user_id").on(t.userId),
  actionIdx: index("idx_audit_logs_action").on(t.action),
  resourceIdx: index("idx_audit_logs_resource").on(t.resourceType, t.resourceId),
  timestampIdx: index("idx_audit_logs_timestamp").on(t.timestamp),
}));

export * from "./marketplaceSchema";

// Workflow Templates
export const workflowTemplates = pgTable("workflow_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull(), // WorkflowCategory
  triggerType: varchar("trigger_type", { length: 50 }).notNull(), // TriggerType
  triggerConfig: jsonb("trigger_config").notNull(), // TriggerConfig
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Workflow Instances
export const workflowInstances = pgTable("workflow_instances", {
  id: uuid("id").defaultRandom().primaryKey(),
  templateId: uuid("template_id").references(() => workflowTemplates.id, { onDelete: "cascade" }).notNull(),
  status: varchar("status", { length: 20 }).notNull(), // WorkflowStatus
  priority: integer("priority").default(5).notNull(),
  contextData: jsonb("context_data"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  templateIdx: index("workflow_instances_template_idx").on(table.templateId),
  statusIdx: index("workflow_instances_status_idx").on(table.status),
}));

// Workflow Steps
export const workflowSteps = pgTable("workflow_steps", {
  id: uuid("id").defaultRandom().primaryKey(),
  templateId: uuid("template_id").references(() => workflowTemplates.id, { onDelete: "cascade" }).notNull(),
  stepOrder: integer("step_order").notNull(),
  stepType: varchar("step_type", { length: 50 }).notNull(), // StepType
  stepConfig: jsonb("step_config").notNull(), // StepConfig
  conditions: jsonb("conditions"),
  timeoutMinutes: integer("timeout_minutes").default(60).notNull(),
  retryCount: integer("retry_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  templateIdx: index("workflow_steps_template_idx").on(table.templateId),
  orderIdx: index("workflow_steps_order_idx").on(table.templateId, table.stepOrder),
}));

// Workflow Step Executions
export const workflowStepExecutions = pgTable("workflow_step_executions", {
  id: uuid("id").defaultRandom().primaryKey(),
  instanceId: uuid("instance_id").references(() => workflowInstances.id, { onDelete: "cascade" }).notNull(),
  stepId: uuid("step_id").references(() => workflowSteps.id, { onDelete: "cascade" }).notNull(),
  status: varchar("status", { length: 20 }).notNull(), // StepExecutionStatus
  inputData: jsonb("input_data"),
  outputData: jsonb("output_data"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  instanceIdx: index("workflow_step_executions_instance_idx").on(table.instanceId),
  stepIdx: index("workflow_step_executions_step_idx").on(table.stepId),
  statusIdx: index("workflow_step_executions_status_idx").on(table.status),
}));

// Workflow Task Assignments
export const workflowTaskAssignments = pgTable("workflow_task_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  stepExecutionId: uuid("step_execution_id").references(() => workflowStepExecutions.id, { onDelete: "cascade" }).notNull(),
  assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "cascade" }).notNull(),
  assignedBy: uuid("assigned_by").references(() => users.id, { onDelete: "set null" }),
  taskType: varchar("task_type", { length: 50 }).notNull(), // TaskType
  taskData: jsonb("task_data").notNull(),
  priority: integer("priority").default(5).notNull(),
  dueDate: timestamp("due_date"),
  status: varchar("status", { length: 20 }).notNull(), // TaskStatus
  completionData: jsonb("completion_data"),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  stepExecutionIdx: index("workflow_task_assignments_step_execution_idx").on(table.stepExecutionId),
  assignedToIdx: index("workflow_task_assignments_assigned_to_idx").on(table.assignedTo),
  statusIdx: index("workflow_task_assignments_status_idx").on(table.status),
}));

// Workflow Escalations
export const workflowEscalations = pgTable("workflow_escalations", {
  id: uuid("id").defaultRandom().primaryKey(),
  assignmentId: uuid("assignment_id").references(() => workflowTaskAssignments.id, { onDelete: "cascade" }).notNull(),
  escalationReason: varchar("escalation_reason", { length: 255 }).notNull(),
  escalationLevel: integer("escalation_level").default(1).notNull(),
  escalatedTo: uuid("escalated_to").references(() => users.id, { onDelete: "set null" }),
  escalatedBy: uuid("escalated_by").references(() => users.id, { onDelete: "set null" }),
  escalatedAt: timestamp("escalated_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  resolutionNotes: text("resolution_notes"),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  assignmentIdx: index("workflow_escalations_assignment_idx").on(table.assignmentId),
  statusIdx: index("workflow_escalations_status_idx").on(table.status),
  escalatedToIdx: index("workflow_escalations_escalated_to_idx").on(table.escalatedTo),
}));

// Workflow Rules
export const workflowRules = pgTable("workflow_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  ruleType: varchar("rule_type", { length: 50 }).notNull(), // RuleType
  conditions: jsonb("conditions").notNull(), // RuleCondition[]
  actions: jsonb("actions").notNull(), // RuleAction[]
  priority: integer("priority").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Workflow Metrics
export const workflowMetrics = pgTable("workflow_metrics", {
  id: uuid("id").defaultRandom().primaryKey(),
  templateId: uuid("template_id").references(() => workflowTemplates.id, { onDelete: "set null" }),
  instanceId: uuid("instance_id").references(() => workflowInstances.id, { onDelete: "set null" }),
  metricType: varchar("metric_type", { length: 50 }).notNull(), // MetricType
  metricValue: numeric("metric_value", { precision: 20, scale: 8 }).notNull(),
  metricUnit: varchar("metric_unit", { length: 20 }),
  dimensions: jsonb("dimensions"),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
}, (table) => ({
  templateIdx: index("workflow_metrics_template_idx").on(table.templateId),
  instanceIdx: index("workflow_metrics_instance_idx").on(table.instanceId),
  metricTypeIdx: index("workflow_metrics_type_idx").on(table.metricType),
}));

// Workflow Auto-Approval System Tables
export const workflowApprovalCriteria = pgTable('workflow_approval_criteria', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  entityType: varchar('entity_type', { length: 50 }).notNull(), // 'return', 'dispute', 'refund', 'verification'
  maxRiskScore: integer('max_risk_score'),
  maxAmount: decimal('max_amount', { precision: 10, scale: 2 }),
  requirePositiveHistory: boolean('require_positive_history').default(false),
  requireFraudCheck: boolean('require_fraud_check').default(false),
  priority: integer('priority').default(1),
  isActive: boolean('is_active').default(true),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  entityTypeIdx: index("workflow_approval_criteria_entity_type_idx").on(table.entityType),
  priorityIdx: index("workflow_approval_criteria_priority_idx").on(table.priority),
  activeIdx: index("workflow_approval_criteria_active_idx").on(table.isActive),
}));

export const workflowDecisions = pgTable('workflow_decisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  decisionType: varchar('decision_type', { length: 50 }).notNull(), // 'auto_approved', 'auto_rejected', 'manual_approved', 'manual_rejected', 'escalated'
  reason: text('reason').notNull(),
  confidence: decimal('confidence', { precision: 5, scale: 4 }).notNull(),
  riskScore: integer('risk_score').notNull(),
  riskLevel: varchar('risk_level', { length: 10 }).notNull(), // 'low', 'medium', 'high'
  criteria: text('criteria').array(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  entityIdx: index("workflow_decisions_entity_idx").on(table.entityType, table.entityId),
  decisionTypeIdx: index("workflow_decisions_type_idx").on(table.decisionType),
  riskScoreIdx: index("workflow_decisions_risk_score_idx").on(table.riskScore),
  createdAtIdx: index("workflow_decisions_created_at_idx").on(table.createdAt),
}));

// Return and Refund System Tables
export const returnPolicies = pgTable('return_policies', {
  id: uuid('id').primaryKey().defaultRandom(),
  sellerId: uuid('seller_id').notNull(),
  acceptsReturns: boolean('accepts_returns').default(true),
  returnWindowDays: integer('return_window_days').default(30),
  autoApproveLowRisk: boolean('auto_approve_low_risk').default(false),
  requiresOriginalPackaging: boolean('requires_original_packaging').default(true),
  restockingFeePercentage: decimal('restocking_fee_percentage', { precision: 5, scale: 2 }).default('0'),
  returnShippingPaidBy: varchar('return_shipping_paid_by', { length: 10 }).default('buyer'),
  acceptedReasons: text('accepted_reasons').array().default(['defective', 'not_as_described', 'changed_mind', 'damaged_in_shipping']),
  excludedCategories: text('excluded_categories').array(),
  minimumOrderValue: decimal('minimum_order_value', { precision: 10, scale: 2 }),
  maximumReturnsPerCustomer: integer('maximum_returns_per_customer').default(10),
  policyText: text('policy_text'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const returns = pgTable('returns', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull(),
  buyerId: uuid('buyer_id').notNull(),
  sellerId: uuid('seller_id').notNull(),
  returnReason: varchar('return_reason', { length: 50 }).notNull(),
  reason: varchar('reason', { length: 255 }), // Alias for returnReason for analytics
  returnReasonDetails: text('return_reason_details'),
  itemsToReturn: jsonb('items_to_return').notNull(),
  originalAmount: decimal('original_amount', { precision: 10, scale: 2 }).notNull(),
  refundAmount: decimal('refund_amount', { precision: 10, scale: 2 }),
  restockingFee: decimal('restocking_fee', { precision: 10, scale: 2 }).default('0'),
  returnShippingCost: decimal('return_shipping_cost', { precision: 10, scale: 2 }).default('0'),
  status: varchar('status', { length: 20 }).default('requested'),
  refundStatus: varchar('refund_status', { length: 20 }).default('pending'),
  refundMethod: varchar('refund_method', { length: 50 }),
  riskScore: integer('risk_score').default(0),
  riskLevel: varchar('risk_level', { length: 10 }).default('low'),
  riskFactors: text('risk_factors').array(),
  requiresManualReview: boolean('requires_manual_review').default(false),
  returnLabelUrl: text('return_label_url'),
  returnTrackingNumber: varchar('return_tracking_number', { length: 100 }),
  returnCarrier: varchar('return_carrier', { length: 50 }),
  refundTransactionId: varchar('refund_transaction_id', { length: 100 }),
  approvedAt: timestamp('approved_at'),
  approvedBy: uuid('approved_by'),
  rejectedAt: timestamp('rejected_at'),
  rejectedBy: uuid('rejected_by'),
  rejectionReason: text('rejection_reason'),
  shippedAt: timestamp('shipped_at'),
  receivedAt: timestamp('received_at'),
  inspectedAt: timestamp('inspected_at'),
  inspectedBy: uuid('inspected_by'),
  itemCondition: varchar('item_condition', { length: 20 }), // 'as_new', 'good', 'acceptable', 'damaged', 'unusable'
  inspectionNotes: text('inspection_notes'),
  inspectionPhotos: text('inspection_photos'), // JSON string of photo URLs
  inspectionPassed: boolean('inspection_passed'),
  refundedAt: timestamp('refunded_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const returnStatusHistory = pgTable('return_status_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  returnId: uuid('return_id').notNull().references(() => returns.id, { onDelete: 'cascade' }),
  fromStatus: varchar('from_status', { length: 20 }),
  toStatus: varchar('to_status', { length: 20 }).notNull(),
  notes: text('notes'),
  changedBy: uuid('changed_by'),
  changedByRole: varchar('changed_by_role', { length: 20 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const returnMessages = pgTable('return_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  returnId: uuid('return_id').notNull().references(() => returns.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id').notNull(),
  senderRole: varchar('sender_role', { length: 20 }).notNull(),
  message: text('message').notNull(),
  attachments: jsonb('attachments'),
  isInternal: boolean('is_internal').default(false),
  readByBuyer: boolean('read_by_buyer').default(false),
  readBySeller: boolean('read_by_seller').default(false),
  readByAdmin: boolean('read_by_admin').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const refundTransactions = pgTable('refund_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  returnId: uuid('return_id').notNull().references(() => returns.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD'),
  refundType: varchar('refund_type', { length: 20 }).default('full'),
  provider: varchar('provider', { length: 50 }).notNull(),
  providerRefundId: varchar('provider_refund_id', { length: 100 }),
  providerFee: decimal('provider_fee', { precision: 10, scale: 2 }).default('0'),
  status: varchar('status', { length: 20 }).default('pending'),
  initiatedAt: timestamp('initiated_at'),
  failureReason: text('failure_reason'),
  processedAt: timestamp('processed_at'),
  completedAt: timestamp('completed_at'),
  errorMessage: text('error_message'),
  metadata: jsonb('metadata'),
  responsePayload: jsonb('response_payload'), // Raw API response from provider
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const returnAnalytics = pgTable('return_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  sellerId: uuid('seller_id'),
  buyerId: uuid('buyer_id'),
  date: date('date').default(sql`CURRENT_DATE`),
  totalReturns: integer('total_returns').default(0),
  approvedReturns: integer('approved_returns').default(0),
  rejectedReturns: integer('rejected_returns').default(0),
  completedReturns: integer('completed_returns').default(0),
  totalRefundAmount: decimal('total_refund_amount', { precision: 12, scale: 2 }).default('0'),
  averageProcessingTimeHours: decimal('average_processing_time_hours', { precision: 8, scale: 2 }),
  returnRatePercentage: decimal('return_rate_percentage', { precision: 5, scale: 2 }),
  topReturnReasons: jsonb('top_return_reasons'),
  riskDistribution: jsonb('risk_distribution'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================================================
// RETURN AND REFUND ADMIN MONITORING SYSTEM
// ============================================================================

// Return Events - Comprehensive event tracking
export const returnEvents = pgTable("return_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  returnId: uuid("return_id").notNull(),

  // Event classification
  eventType: varchar("event_type", { length: 50 }).notNull(),
  eventCategory: varchar("event_category", { length: 30 }).notNull(),

  // Event data
  eventData: jsonb("event_data").notNull().default('{}'),
  previousState: jsonb("previous_state"),
  newState: jsonb("new_state"),

  // Actor information
  actorId: uuid("actor_id"),
  actorRole: varchar("actor_role", { length: 20 }),
  actorIpAddress: varchar("actor_ip_address", { length: 45 }),
  actorUserAgent: text("actor_user_agent"),

  // Context
  sessionId: varchar("session_id", { length: 100 }),
  automated: boolean("automated").default(false),

  // Metadata
  metadata: jsonb("metadata").default('{}'),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  returnIdIdx: index("idx_return_events_return_id").on(t.returnId),
  eventTypeIdx: index("idx_return_events_event_type").on(t.eventType),
  eventCategoryIdx: index("idx_return_events_event_category").on(t.eventCategory),
  timestampIdx: index("idx_return_events_timestamp").on(t.timestamp),
  actorIdIdx: index("idx_return_events_actor_id").on(t.actorId),
  automatedIdx: index("idx_return_events_automated").on(t.automated),
  compositeIdx: index("idx_return_events_composite").on(t.returnId, t.timestamp),
}));

// Return Analytics Hourly - Hourly aggregated metrics
export const returnAnalyticsHourly = pgTable("return_analytics_hourly", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Time dimension
  hourTimestamp: timestamp("hour_timestamp").notNull().unique(),

  // Volume metrics
  totalReturns: integer("total_returns").default(0),
  newReturns: integer("new_returns").default(0),
  approvedReturns: integer("approved_returns").default(0),
  rejectedReturns: integer("rejected_returns").default(0),
  completedReturns: integer("completed_returns").default(0),
  cancelledReturns: integer("cancelled_returns").default(0),

  // Status distribution
  statusRequested: integer("status_requested").default(0),
  statusApproved: integer("status_approved").default(0),
  statusRejected: integer("status_rejected").default(0),
  statusInTransit: integer("status_in_transit").default(0),
  statusReceived: integer("status_received").default(0),
  statusInspected: integer("status_inspected").default(0),
  statusRefundProcessing: integer("status_refund_processing").default(0),
  statusCompleted: integer("status_completed").default(0),

  // Financial metrics
  totalRefundAmount: decimal("total_refund_amount", { precision: 20, scale: 8 }).default("0"),
  avgRefundAmount: decimal("avg_refund_amount", { precision: 20, scale: 8 }).default("0"),
  maxRefundAmount: decimal("max_refund_amount", { precision: 20, scale: 8 }).default("0"),
  minRefundAmount: decimal("min_refund_amount", { precision: 20, scale: 8 }).default("0"),
  totalRestockingFees: decimal("total_restocking_fees", { precision: 20, scale: 8 }).default("0"),
  totalShippingCosts: decimal("total_shipping_costs", { precision: 20, scale: 8 }).default("0"),

  // Processing time metrics (in hours)
  avgApprovalTime: decimal("avg_approval_time", { precision: 10, scale: 2 }),
  avgRefundTime: decimal("avg_refund_time", { precision: 10, scale: 2 }),
  avgTotalResolutionTime: decimal("avg_total_resolution_time", { precision: 10, scale: 2 }),
  medianApprovalTime: decimal("median_approval_time", { precision: 10, scale: 2 }),
  p95ApprovalTime: decimal("p95_approval_time", { precision: 10, scale: 2 }),

  // Return reasons breakdown
  reasonDefective: integer("reason_defective").default(0),
  reasonWrongItem: integer("reason_wrong_item").default(0),
  reasonNotAsDescribed: integer("reason_not_as_described").default(0),
  reasonDamagedShipping: integer("reason_damaged_shipping").default(0),
  reasonChangedMind: integer("reason_changed_mind").default(0),
  reasonBetterPrice: integer("reason_better_price").default(0),
  reasonNoLongerNeeded: integer("reason_no_longer_needed").default(0),
  reasonOther: integer("reason_other").default(0),

  // Risk metrics
  highRiskReturns: integer("high_risk_returns").default(0),
  mediumRiskReturns: integer("medium_risk_returns").default(0),
  lowRiskReturns: integer("low_risk_returns").default(0),
  flaggedForReview: integer("flagged_for_review").default(0),
  fraudDetected: integer("fraud_detected").default(0),

  // Customer satisfaction
  avgSatisfactionScore: decimal("avg_satisfaction_score", { precision: 3, scale: 2 }),
  satisfactionResponses: integer("satisfaction_responses").default(0),

  // Metadata
  calculatedAt: timestamp("calculated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  timestampIdx: index("idx_return_analytics_hourly_timestamp").on(t.hourTimestamp),
}));

// Return Analytics Daily - Daily aggregated metrics
export const returnAnalyticsDaily = pgTable("return_analytics_daily", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Time dimension
  date: date("date").notNull().unique(),

  // Volume metrics
  totalReturns: integer("total_returns").default(0),
  newReturns: integer("new_returns").default(0),
  approvedReturns: integer("approved_returns").default(0),
  rejectedReturns: integer("rejected_returns").default(0),
  completedReturns: integer("completed_returns").default(0),
  cancelledReturns: integer("cancelled_returns").default(0),

  // Status distribution
  statusRequested: integer("status_requested").default(0),
  statusApproved: integer("status_approved").default(0),
  statusRejected: integer("status_rejected").default(0),
  statusInTransit: integer("status_in_transit").default(0),
  statusReceived: integer("status_received").default(0),
  statusInspected: integer("status_inspected").default(0),
  statusRefundProcessing: integer("status_refund_processing").default(0),
  statusCompleted: integer("status_completed").default(0),

  // Financial metrics
  totalRefundAmount: decimal("total_refund_amount", { precision: 20, scale: 8 }).default("0"),
  avgRefundAmount: decimal("avg_refund_amount", { precision: 20, scale: 8 }).default("0"),
  maxRefundAmount: decimal("max_refund_amount", { precision: 20, scale: 8 }).default("0"),
  minRefundAmount: decimal("min_refund_amount", { precision: 20, scale: 8 }).default("0"),
  totalRestockingFees: decimal("total_restocking_fees", { precision: 20, scale: 8 }).default("0"),
  totalShippingCosts: decimal("total_shipping_costs", { precision: 20, scale: 8 }).default("0"),
  netRefundImpact: decimal("net_refund_impact", { precision: 20, scale: 8 }).default("0"),

  // Processing time metrics (in hours)
  avgApprovalTime: decimal("avg_approval_time", { precision: 10, scale: 2 }),
  avgRefundTime: decimal("avg_refund_time", { precision: 10, scale: 2 }),
  avgTotalResolutionTime: decimal("avg_total_resolution_time", { precision: 10, scale: 2 }),
  medianApprovalTime: decimal("median_approval_time", { precision: 10, scale: 2 }),
  p95ApprovalTime: decimal("p95_approval_time", { precision: 10, scale: 2 }),
  p99ApprovalTime: decimal("p99_approval_time", { precision: 10, scale: 2 }),

  // Return reasons breakdown
  reasonDefective: integer("reason_defective").default(0),
  reasonWrongItem: integer("reason_wrong_item").default(0),
  reasonNotAsDescribed: integer("reason_not_as_described").default(0),
  reasonDamagedShipping: integer("reason_damaged_shipping").default(0),
  reasonChangedMind: integer("reason_changed_mind").default(0),
  reasonBetterPrice: integer("reason_better_price").default(0),
  reasonNoLongerNeeded: integer("reason_no_longer_needed").default(0),
  reasonOther: integer("reason_other").default(0),

  // Risk metrics
  highRiskReturns: integer("high_risk_returns").default(0),
  mediumRiskReturns: integer("medium_risk_returns").default(0),
  lowRiskReturns: integer("low_risk_returns").default(0),
  flaggedForReview: integer("flagged_for_review").default(0),
  fraudDetected: integer("fraud_detected").default(0),
  avgRiskScore: decimal("avg_risk_score", { precision: 5, scale: 2 }),

  // Customer satisfaction
  avgSatisfactionScore: decimal("avg_satisfaction_score", { precision: 3, scale: 2 }),
  satisfactionResponses: integer("satisfaction_responses").default(0),
  npsScore: integer("nps_score"),

  // Return rate
  returnRate: decimal("return_rate", { precision: 5, scale: 2 }),
  totalOrders: integer("total_orders").default(0),

  // Metadata
  calculatedAt: timestamp("calculated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  dateIdx: index("idx_return_analytics_daily_date").on(t.date),
}));

// Return Analytics Weekly - Weekly aggregated metrics
export const returnAnalyticsWeekly = pgTable("return_analytics_weekly", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Time dimension
  weekStart: date("week_start").notNull(),
  weekEnd: date("week_end").notNull(),
  weekNumber: integer("week_number").notNull(),
  year: integer("year").notNull(),

  // Volume metrics
  totalReturns: integer("total_returns").default(0),
  newReturns: integer("new_returns").default(0),
  approvedReturns: integer("approved_returns").default(0),
  rejectedReturns: integer("rejected_returns").default(0),
  completedReturns: integer("completed_returns").default(0),
  cancelledReturns: integer("cancelled_returns").default(0),

  // Status distribution
  statusRequested: integer("status_requested").default(0),
  statusApproved: integer("status_approved").default(0),
  statusRejected: integer("status_rejected").default(0),
  statusInTransit: integer("status_in_transit").default(0),
  statusReceived: integer("status_received").default(0),
  statusInspected: integer("status_inspected").default(0),
  statusRefundProcessing: integer("status_refund_processing").default(0),
  statusCompleted: integer("status_completed").default(0),

  // Financial metrics
  totalRefundAmount: decimal("total_refund_amount", { precision: 20, scale: 8 }).default("0"),
  avgRefundAmount: decimal("avg_refund_amount", { precision: 20, scale: 8 }).default("0"),
  maxRefundAmount: decimal("max_refund_amount", { precision: 20, scale: 8 }).default("0"),
  minRefundAmount: decimal("min_refund_amount", { precision: 20, scale: 8 }).default("0"),
  totalRestockingFees: decimal("total_restocking_fees", { precision: 20, scale: 8 }).default("0"),
  totalShippingCosts: decimal("total_shipping_costs", { precision: 20, scale: 8 }).default("0"),
  netRefundImpact: decimal("net_refund_impact", { precision: 20, scale: 8 }).default("0"),

  // Processing time metrics (in hours)
  avgApprovalTime: decimal("avg_approval_time", { precision: 10, scale: 2 }),
  avgRefundTime: decimal("avg_refund_time", { precision: 10, scale: 2 }),
  avgTotalResolutionTime: decimal("avg_total_resolution_time", { precision: 10, scale: 2 }),
  medianApprovalTime: decimal("median_approval_time", { precision: 10, scale: 2 }),
  p95ApprovalTime: decimal("p95_approval_time", { precision: 10, scale: 2 }),
  p99ApprovalTime: decimal("p99_approval_time", { precision: 10, scale: 2 }),

  // Return reasons breakdown
  reasonDefective: integer("reason_defective").default(0),
  reasonWrongItem: integer("reason_wrong_item").default(0),
  reasonNotAsDescribed: integer("reason_not_as_described").default(0),
  reasonDamagedShipping: integer("reason_damaged_shipping").default(0),
  reasonChangedMind: integer("reason_changed_mind").default(0),
  reasonBetterPrice: integer("reason_better_price").default(0),
  reasonNoLongerNeeded: integer("reason_no_longer_needed").default(0),
  reasonOther: integer("reason_other").default(0),

  // Risk metrics
  highRiskReturns: integer("high_risk_returns").default(0),
  mediumRiskReturns: integer("medium_risk_returns").default(0),
  lowRiskReturns: integer("low_risk_returns").default(0),
  flaggedForReview: integer("flagged_for_review").default(0),
  fraudDetected: integer("fraud_detected").default(0),
  avgRiskScore: decimal("avg_risk_score", { precision: 5, scale: 2 }),

  // Customer satisfaction
  avgSatisfactionScore: decimal("avg_satisfaction_score", { precision: 3, scale: 2 }),
  satisfactionResponses: integer("satisfaction_responses").default(0),
  npsScore: integer("nps_score"),

  // Week-over-week comparison
  returnRateChange: decimal("return_rate_change", { precision: 5, scale: 2 }),
  volumeChange: decimal("volume_change", { precision: 5, scale: 2 }),
  refundAmountChange: decimal("refund_amount_change", { precision: 5, scale: 2 }),

  // Return rate
  returnRate: decimal("return_rate", { precision: 5, scale: 2 }),
  totalOrders: integer("total_orders").default(0),

  // Metadata
  calculatedAt: timestamp("calculated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  weekIdx: index("idx_return_analytics_weekly_week").on(t.weekStart, t.year),
  yearWeekIdx: index("idx_return_analytics_weekly_year_week").on(t.year, t.weekNumber),
}));

// Return Analytics Monthly - Monthly aggregated metrics
export const returnAnalyticsMonthly = pgTable("return_analytics_monthly", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Time dimension
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  monthStart: date("month_start").notNull(),
  monthEnd: date("month_end").notNull(),

  // Volume metrics
  totalReturns: integer("total_returns").default(0),
  newReturns: integer("new_returns").default(0),
  approvedReturns: integer("approved_returns").default(0),
  rejectedReturns: integer("rejected_returns").default(0),
  completedReturns: integer("completed_returns").default(0),
  cancelledReturns: integer("cancelled_returns").default(0),

  // Status distribution
  statusRequested: integer("status_requested").default(0),
  statusApproved: integer("status_approved").default(0),
  statusRejected: integer("status_rejected").default(0),
  statusInTransit: integer("status_in_transit").default(0),
  statusReceived: integer("status_received").default(0),
  statusInspected: integer("status_inspected").default(0),
  statusRefundProcessing: integer("status_refund_processing").default(0),
  statusCompleted: integer("status_completed").default(0),

  // Financial metrics
  totalRefundAmount: decimal("total_refund_amount", { precision: 20, scale: 8 }).default("0"),
  avgRefundAmount: decimal("avg_refund_amount", { precision: 20, scale: 8 }).default("0"),
  maxRefundAmount: decimal("max_refund_amount", { precision: 20, scale: 8 }).default("0"),
  minRefundAmount: decimal("min_refund_amount", { precision: 20, scale: 8 }).default("0"),
  totalRestockingFees: decimal("total_restocking_fees", { precision: 20, scale: 8 }).default("0"),
  totalShippingCosts: decimal("total_shipping_costs", { precision: 20, scale: 8 }).default("0"),
  netRefundImpact: decimal("net_refund_impact", { precision: 20, scale: 8 }).default("0"),

  // Processing time metrics (in hours)
  avgApprovalTime: decimal("avg_approval_time", { precision: 10, scale: 2 }),
  avgRefundTime: decimal("avg_refund_time", { precision: 10, scale: 2 }),
  avgTotalResolutionTime: decimal("avg_total_resolution_time", { precision: 10, scale: 2 }),
  medianApprovalTime: decimal("median_approval_time", { precision: 10, scale: 2 }),
  p95ApprovalTime: decimal("p95_approval_time", { precision: 10, scale: 2 }),
  p99ApprovalTime: decimal("p99_approval_time", { precision: 10, scale: 2 }),

  // Return reasons breakdown
  reasonDefective: integer("reason_defective").default(0),
  reasonWrongItem: integer("reason_wrong_item").default(0),
  reasonNotAsDescribed: integer("reason_not_as_described").default(0),
  reasonDamagedShipping: integer("reason_damaged_shipping").default(0),
  reasonChangedMind: integer("reason_changed_mind").default(0),
  reasonBetterPrice: integer("reason_better_price").default(0),
  reasonNoLongerNeeded: integer("reason_no_longer_needed").default(0),
  reasonOther: integer("reason_other").default(0),

  // Risk metrics
  highRiskReturns: integer("high_risk_returns").default(0),
  mediumRiskReturns: integer("medium_risk_returns").default(0),
  lowRiskReturns: integer("low_risk_returns").default(0),
  flaggedForReview: integer("flagged_for_review").default(0),
  fraudDetected: integer("fraud_detected").default(0),
  avgRiskScore: decimal("avg_risk_score", { precision: 5, scale: 2 }),

  // Customer satisfaction
  avgSatisfactionScore: decimal("avg_satisfaction_score", { precision: 3, scale: 2 }),
  satisfactionResponses: integer("satisfaction_responses").default(0),
  npsScore: integer("nps_score"),

  // Month-over-month comparison
  returnRateChange: decimal("return_rate_change", { precision: 5, scale: 2 }),
  volumeChange: decimal("volume_change", { precision: 5, scale: 2 }),
  refundAmountChange: decimal("refund_amount_change", { precision: 5, scale: 2 }),

  // Year-over-year comparison
  yoyReturnRateChange: decimal("yoy_return_rate_change", { precision: 5, scale: 2 }),
  yoyVolumeChange: decimal("yoy_volume_change", { precision: 5, scale: 2 }),
  yoyRefundAmountChange: decimal("yoy_refund_amount_change", { precision: 5, scale: 2 }),

  // Return rate
  returnRate: decimal("return_rate", { precision: 5, scale: 2 }),
  totalOrders: integer("total_orders").default(0),

  // Seasonal indicators
  isSeasonalPeak: boolean("is_seasonal_peak").default(false),
  seasonalFactor: decimal("seasonal_factor", { precision: 5, scale: 2 }),

  // Metadata
  calculatedAt: timestamp("calculated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  monthIdx: index("idx_return_analytics_monthly_month").on(t.month, t.year),
  yearIdx: index("idx_return_analytics_monthly_year").on(t.year),
}));

// Return Metrics Realtime - Real-time monitoring data
export const returnMetricsRealtime = pgTable("return_metrics_realtime", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Timestamp (5-minute intervals)
  timestamp: timestamp("timestamp").notNull().unique(),

  // Current state metrics
  activeReturns: integer("active_returns").default(0),
  pendingApproval: integer("pending_approval").default(0),
  pendingRefund: integer("pending_refund").default(0),
  inTransitReturns: integer("in_transit_returns").default(0),

  // Rate metrics (per minute)
  returnsPerMinute: decimal("returns_per_minute", { precision: 10, scale: 2 }).default("0"),
  approvalsPerMinute: decimal("approvals_per_minute", { precision: 10, scale: 2 }).default("0"),
  refundsPerMinute: decimal("refunds_per_minute", { precision: 10, scale: 2 }).default("0"),

  // Processing queue depth
  manualReviewQueueDepth: integer("manual_review_queue_depth").default(0),
  refundProcessingQueueDepth: integer("refund_processing_queue_depth").default(0),
  inspectionQueueDepth: integer("inspection_queue_depth").default(0),

  // Alert triggers
  volumeSpikeDetected: boolean("volume_spike_detected").default(false),
  processingDelayDetected: boolean("processing_delay_detected").default(false),
  refundFailureSpikeDetected: boolean("refund_failure_spike_detected").default(false),

  // System health
  avgApiResponseTimeMs: integer("avg_api_response_time_ms"),
  errorRate: decimal("error_rate", { precision: 5, scale: 2 }),

  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  timestampIdx: index("idx_return_metrics_realtime_timestamp").on(t.timestamp),
}));

// Seller Return Performance - Seller-specific analytics
export const sellerReturnPerformance = pgTable("seller_return_performance", {
  id: uuid("id").defaultRandom().primaryKey(),
  sellerId: uuid("seller_id").notNull(),

  // Time period
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  periodType: varchar("period_type", { length: 20 }).notNull(),

  // Volume metrics
  totalReturns: integer("total_returns").default(0),
  approvedReturns: integer("approved_returns").default(0),
  rejectedReturns: integer("rejected_returns").default(0),
  approvalRate: decimal("approval_rate", { precision: 5, scale: 2 }),

  // Financial impact
  totalRefundAmount: decimal("total_refund_amount", { precision: 20, scale: 8 }).default("0"),
  totalRevenue: decimal("total_revenue", { precision: 20, scale: 8 }).default("0"),
  refundToRevenueRatio: decimal("refund_to_revenue_ratio", { precision: 5, scale: 4 }),

  // Processing performance
  avgApprovalTimeHours: decimal("avg_approval_time_hours", { precision: 10, scale: 2 }),
  avgRefundTimeHours: decimal("avg_refund_time_hours", { precision: 10, scale: 2 }),
  slaComplianceRate: decimal("sla_compliance_rate", { precision: 5, scale: 2 }),

  // Quality metrics
  returnRate: decimal("return_rate", { precision: 5, scale: 2 }),
  defectRate: decimal("defect_rate", { precision: 5, scale: 2 }),
  customerSatisfaction: decimal("customer_satisfaction", { precision: 3, scale: 2 }),

  // Risk indicators
  fraudIncidents: integer("fraud_incidents").default(0),
  policyViolations: integer("policy_violations").default(0),
  avgRiskScore: decimal("avg_risk_score", { precision: 5, scale: 2 }),

  // Compliance
  policyCompliant: boolean("policy_compliant").default(true),
  complianceScore: decimal("compliance_score", { precision: 5, scale: 2 }),
  violations: jsonb("violations").default('[]'),

  // Rankings
  performanceRank: integer("performance_rank"),
  categoryRank: integer("category_rank"),

  // Metadata
  calculatedAt: timestamp("calculated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  sellerIdIdx: index("idx_seller_return_performance_seller_id").on(t.sellerId),
  periodIdx: index("idx_seller_return_performance_period").on(t.periodStart, t.periodEnd),
  rankIdx: index("idx_seller_return_performance_rank").on(t.performanceRank),
  complianceIdx: index("idx_seller_return_performance_compliance").on(t.policyCompliant, t.complianceScore),
}));

// Category Return Analytics - Category-level insights
export const categoryReturnAnalytics = pgTable("category_return_analytics", {
  id: uuid("id").defaultRandom().primaryKey(),
  categoryId: uuid("category_id").notNull(),

  // Time period
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),

  // Volume metrics
  totalReturns: integer("total_returns").default(0),
  totalOrders: integer("total_orders").default(0),
  returnRate: decimal("return_rate", { precision: 5, scale: 2 }),

  // Financial metrics
  totalRefundAmount: decimal("total_refund_amount", { precision: 20, scale: 8 }).default("0"),
  avgRefundAmount: decimal("avg_refund_amount", { precision: 20, scale: 8 }).default("0"),

  // Return reasons (category-specific patterns)
  topReturnReasons: jsonb("top_return_reasons"),

  // Quality indicators
  defectRate: decimal("defect_rate", { precision: 5, scale: 2 }),
  damageRate: decimal("damage_rate", { precision: 5, scale: 2 }),
  misdescriptionRate: decimal("misdescription_rate", { precision: 5, scale: 2 }),

  // Trends
  returnRateTrend: varchar("return_rate_trend", { length: 20 }),
  trendPercentage: decimal("trend_percentage", { precision: 5, scale: 2 }),

  // Benchmarks
  industryBenchmarkReturnRate: decimal("industry_benchmark_return_rate", { precision: 5, scale: 2 }),
  performanceVsBenchmark: varchar("performance_vs_benchmark", { length: 20 }),

  // Metadata
  calculatedAt: timestamp("calculated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  categoryIdIdx: index("idx_category_return_analytics_category_id").on(t.categoryId),
  periodIdx: index("idx_category_return_analytics_period").on(t.periodStart, t.periodEnd),
  returnRateIdx: index("idx_category_return_analytics_return_rate").on(t.returnRate),
}));

// Refund Provider Performance - Payment provider tracking
export const refundProviderPerformance = pgTable("refund_provider_performance", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Provider identification
  provider: varchar("provider", { length: 30 }).notNull(),

  // Time period
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),

  // Volume metrics
  totalRefunds: integer("total_refunds").default(0),
  successfulRefunds: integer("successful_refunds").default(0),
  failedRefunds: integer("failed_refunds").default(0),
  pendingRefunds: integer("pending_refunds").default(0),
  successRate: decimal("success_rate", { precision: 5, scale: 2 }),

  // Financial metrics
  totalRefundAmount: decimal("total_refund_amount", { precision: 20, scale: 8 }).default("0"),
  totalFees: decimal("total_fees", { precision: 20, scale: 8 }).default("0"),
  avgRefundAmount: decimal("avg_refund_amount", { precision: 20, scale: 8 }).default("0"),

  // Performance metrics
  avgProcessingTimeMinutes: decimal("avg_processing_time_minutes", { precision: 10, scale: 2 }),
  medianProcessingTimeMinutes: decimal("median_processing_time_minutes", { precision: 10, scale: 2 }),
  p95ProcessingTimeMinutes: decimal("p95_processing_time_minutes", { precision: 10, scale: 2 }),

  // Reliability metrics
  uptimePercentage: decimal("uptime_percentage", { precision: 5, scale: 2 }),
  errorRate: decimal("error_rate", { precision: 5, scale: 2 }),
  retryRate: decimal("retry_rate", { precision: 5, scale: 2 }),

  // Error analysis
  errorBreakdown: jsonb("error_breakdown"),
  topErrors: jsonb("top_errors"),

  // Status
  operationalStatus: varchar("operational_status", { length: 20 }),
  lastSuccessfulRefund: timestamp("last_successful_refund"),
  lastFailure: timestamp("last_failure"),

  // Metadata
  calculatedAt: timestamp("calculated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  providerIdx: index("idx_refund_provider_performance_provider").on(t.provider),
  periodIdx: index("idx_refund_provider_performance_period").on(t.periodStart, t.periodEnd),
  statusIdx: index("idx_refund_provider_performance_status").on(t.operationalStatus),
}));

// Return Admin Alerts - Alert tracking and management
export const returnAdminAlerts = pgTable("return_admin_alerts", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Alert classification
  alertType: varchar("alert_type", { length: 50 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull(),

  // Alert details
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  affectedEntityType: varchar("affected_entity_type", { length: 30 }),
  affectedEntityId: uuid("affected_entity_id"),

  // Metrics that triggered alert
  triggerMetric: varchar("trigger_metric", { length: 50 }),
  triggerThreshold: decimal("trigger_threshold", { precision: 20, scale: 8 }),
  actualValue: decimal("actual_value", { precision: 20, scale: 8 }),

  // Context
  contextData: jsonb("context_data").default('{}'),
  recommendedActions: jsonb("recommended_actions"),

  // Status
  status: varchar("status", { length: 20 }).notNull().default('active'),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedBy: uuid("acknowledged_by"),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: uuid("resolved_by"),
  resolutionNotes: text("resolution_notes"),

  // Notification
  notifiedAdmins: jsonb("notified_admins"),
  notificationSentAt: timestamp("notification_sent_at"),

  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  typeIdx: index("idx_return_admin_alerts_type").on(t.alertType),
  severityIdx: index("idx_return_admin_alerts_severity").on(t.severity),
  statusIdx: index("idx_return_admin_alerts_status").on(t.status),
  createdAtIdx: index("idx_return_admin_alerts_created_at").on(t.createdAt),
}));

// Return Admin Audit Log - Comprehensive admin action tracking
export const returnAdminAuditLog = pgTable("return_admin_audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Admin identification
  adminId: uuid("admin_id").notNull(),
  adminEmail: varchar("admin_email", { length: 255 }),
  adminRole: varchar("admin_role", { length: 50 }),

  // Action details
  actionType: varchar("action_type", { length: 50 }).notNull(),
  actionCategory: varchar("action_category", { length: 30 }).notNull(),

  // Target entity
  entityType: varchar("entity_type", { length: 30 }).notNull(),
  entityId: uuid("entity_id"),

  // Change tracking
  beforeState: jsonb("before_state"),
  afterState: jsonb("after_state"),
  changes: jsonb("changes"),

  // Context
  reason: text("reason"),
  justification: text("justification"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  sessionId: varchar("session_id", { length: 100 }),

  // Security
  requiresApproval: boolean("requires_approval").default(false),
  approvedBy: uuid("approved_by"),
  approvedAt: timestamp("approved_at"),

  // Metadata
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  adminIdIdx: index("idx_return_admin_audit_log_admin_id").on(t.adminId),
  actionTypeIdx: index("idx_return_admin_audit_log_action_type").on(t.actionType),
  entityIdx: index("idx_return_admin_audit_log_entity").on(t.entityType, t.entityId),
  timestampIdx: index("idx_return_admin_audit_log_timestamp").on(t.timestamp),
}));

// ============================================================================
// REFUND FINANCIAL RECORDS SCHEMA
// ============================================================================

// Refund Financial Records - Main table for tracking all refund financial transactions
export const refundFinancialRecords = pgTable("refund_financial_records", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Return and refund identification
  returnId: uuid("return_id").notNull(),
  refundId: varchar("refund_id", { length: 255 }).notNull(),

  // Financial amounts
  originalAmount: decimal("original_amount", { precision: 20, scale: 8 }).notNull(),
  refundAmount: decimal("refund_amount", { precision: 20, scale: 8 }).notNull(),
  processingFee: decimal("processing_fee", { precision: 20, scale: 8 }).notNull().default('0'),
  platformFeeImpact: decimal("platform_fee_impact", { precision: 20, scale: 8 }).notNull().default('0'),
  sellerImpact: decimal("seller_impact", { precision: 20, scale: 8 }).notNull().default('0'),

  // Payment provider details
  paymentProvider: varchar("payment_provider", { length: 50 }).notNull(),
  providerTransactionId: varchar("provider_transaction_id", { length: 255 }),

  // Status tracking
  status: varchar("status", { length: 20 }).notNull().default('pending'),
  processedAt: timestamp("processed_at"),

  // Reconciliation
  reconciled: boolean("reconciled").notNull().default(false),
  reconciledAt: timestamp("reconciled_at"),

  // Additional details
  currency: varchar("currency", { length: 10 }).notNull().default('USD'),
  refundMethod: varchar("refund_method", { length: 50 }),
  failureReason: text("failure_reason"),
  retryCount: integer("retry_count").notNull().default(0),
  metadata: jsonb("metadata"),

  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  returnIdIdx: index("idx_refund_records_return_id").on(t.returnId),
  refundIdIdx: index("idx_refund_records_refund_id").on(t.refundId),
  statusIdx: index("idx_refund_records_status").on(t.status),
  providerIdx: index("idx_refund_records_provider").on(t.paymentProvider),
  reconciledIdx: index("idx_refund_records_reconciled").on(t.reconciled),
  createdAtIdx: index("idx_refund_records_created_at").on(t.createdAt),
  processedAtIdx: index("idx_refund_records_processed_at").on(t.processedAt),
  providerTxIdIdx: index("idx_refund_records_provider_tx_id").on(t.providerTransactionId),
}));

// Refund Provider Transactions - Provider-specific transaction details
export const refundProviderTransactions = pgTable("refund_provider_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Link to main refund record
  refundRecordId: uuid("refund_record_id").notNull().references(() => refundFinancialRecords.id, { onDelete: 'cascade' }),

  // Provider details
  providerName: varchar("provider_name", { length: 50 }).notNull(),
  providerTransactionId: varchar("provider_transaction_id", { length: 255 }).notNull(),
  providerStatus: varchar("provider_status", { length: 50 }).notNull(),
  providerResponse: jsonb("provider_response"),

  // Transaction details
  transactionType: varchar("transaction_type", { length: 50 }).notNull(),
  amount: decimal("amount", { precision: 20, scale: 8 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
  feeAmount: decimal("fee_amount", { precision: 20, scale: 8 }).default('0'),
  netAmount: decimal("net_amount", { precision: 20, scale: 8 }).notNull(),
  exchangeRate: decimal("exchange_rate", { precision: 20, scale: 8 }),

  // Account details
  destinationAccount: varchar("destination_account", { length: 255 }),
  sourceAccount: varchar("source_account", { length: 255 }),

  // Blockchain specific
  blockchainTxHash: varchar("blockchain_tx_hash", { length: 66 }),
  blockchainNetwork: varchar("blockchain_network", { length: 50 }),
  confirmationCount: integer("confirmation_count").default(0),

  // Timing
  estimatedCompletion: timestamp("estimated_completion"),
  completedAt: timestamp("completed_at"),
  failedAt: timestamp("failed_at"),

  // Failure details
  failureCode: varchar("failure_code", { length: 50 }),
  failureMessage: text("failure_message"),

  // Webhook tracking
  webhookReceived: boolean("webhook_received").default(false),

  // Additional tracking fields
  providerRefundId: varchar("provider_refund_id", { length: 255 }),
  responsePayload: jsonb("response_payload"),
  processingTimeMs: integer("processing_time_ms"),
  webhookData: jsonb("webhook_data"),

  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  refundRecordFk: foreignKey({
    columns: [t.refundRecordId],
    foreignColumns: [refundFinancialRecords.id]
  }),
  refundRecordIdx: index("idx_provider_tx_refund_record").on(t.refundRecordId),
  providerNameIdx: index("idx_provider_tx_provider_name").on(t.providerName),
  providerTxIdIdx: index("idx_provider_tx_provider_tx_id").on(t.providerTransactionId),
  statusIdx: index("idx_provider_tx_status").on(t.providerStatus),
  blockchainHashIdx: index("idx_provider_tx_blockchain_hash").on(t.blockchainTxHash),
  createdAtIdx: index("idx_provider_tx_created_at").on(t.createdAt),
}));

// Refund Reconciliation Records - Reconciliation status tracking
export const refundReconciliationRecords = pgTable("refund_reconciliation_records", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Link to main refund record
  refundRecordId: uuid("refund_record_id").notNull().references(() => refundFinancialRecords.id, { onDelete: 'cascade' }),

  // Reconciliation details
  reconciliationDate: date("reconciliation_date").notNull(),
  reconciliationStatus: varchar("reconciliation_status", { length: 30 }).notNull().default('pending'),

  // Amount tracking
  expectedAmount: decimal("expected_amount", { precision: 20, scale: 8 }).notNull(),
  actualAmount: decimal("actual_amount", { precision: 20, scale: 8 }),
  discrepancyAmount: decimal("discrepancy_amount", { precision: 20, scale: 8 }).default('0'),
  discrepancyReason: text("discrepancy_reason"),

  // Reconciliation tracking
  reconciledBy: uuid("reconciled_by"),
  reconciliationNotes: text("reconciliation_notes"),
  supportingDocuments: jsonb("supporting_documents"),

  // Resolution
  resolutionStatus: varchar("resolution_status", { length: 30 }),
  resolutionNotes: text("resolution_notes"),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: uuid("resolved_by"),

  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  refundRecordFk: foreignKey({
    columns: [t.refundRecordId],
    foreignColumns: [refundFinancialRecords.id]
  }),
  refundRecordIdx: index("idx_reconciliation_refund_record").on(t.refundRecordId),
  dateIdx: index("idx_reconciliation_date").on(t.reconciliationDate),
  statusIdx: index("idx_reconciliation_status").on(t.reconciliationStatus),
  discrepancyIdx: index("idx_reconciliation_discrepancy").on(t.discrepancyAmount),
}));

// Refund Transaction Audit Log - Comprehensive audit trail
export const refundTransactionAuditLog = pgTable("refund_transaction_audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Link to main refund record
  refundRecordId: uuid("refund_record_id").notNull().references(() => refundFinancialRecords.id, { onDelete: 'cascade' }),

  // Action details
  actionType: varchar("action_type", { length: 50 }).notNull(),
  actionDescription: text("action_description").notNull(),

  // Actor details
  performedBy: uuid("performed_by"),
  performedByRole: varchar("performed_by_role", { length: 30 }),

  // State tracking
  previousState: jsonb("previous_state"),
  newState: jsonb("new_state"),

  // Context
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),

  // Timestamp
  timestamp: timestamp("timestamp").notNull().defaultNow(),
}, (t) => ({
  refundRecordFk: foreignKey({
    columns: [t.refundRecordId],
    foreignColumns: [refundFinancialRecords.id]
  }),
  refundRecordIdx: index("idx_audit_log_refund_record").on(t.refundRecordId),
  actionTypeIdx: index("idx_audit_log_action_type").on(t.actionType),
  performedByIdx: index("idx_audit_log_performed_by").on(t.performedBy),
  timestampIdx: index("idx_audit_log_timestamp").on(t.timestamp),
}));

// Refund Batch Processing - Batch processing records
export const refundBatchProcessing = pgTable("refund_batch_processing", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Batch identification
  batchId: varchar("batch_id", { length: 100 }).notNull().unique(),
  providerName: varchar("provider_name", { length: 50 }).notNull(),

  // Batch statistics
  totalRefunds: integer("total_refunds").notNull(),
  successfulRefunds: integer("successful_refunds").default(0),
  failedRefunds: integer("failed_refunds").default(0),
  pendingRefunds: integer("pending_refunds").default(0),

  // Amount tracking
  totalAmount: decimal("total_amount", { precision: 20, scale: 8 }).notNull(),
  processedAmount: decimal("processed_amount", { precision: 20, scale: 8 }).default('0'),

  // Status
  batchStatus: varchar("batch_status", { length: 30 }).notNull().default('processing'),

  // Timing
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),

  // Error tracking
  errorSummary: jsonb("error_summary"),
  metadata: jsonb("metadata"),

  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  batchIdIdx: index("idx_batch_processing_batch_id").on(t.batchId),
  providerIdx: index("idx_batch_processing_provider").on(t.providerName),
  statusIdx: index("idx_batch_processing_status").on(t.batchStatus),
  startedAtIdx: index("idx_batch_processing_started_at").on(t.startedAt),
}));

// Refund Batch Items - Individual items within batch processing
export const refundBatchItems = pgTable("refund_batch_items", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Batch and refund links
  batchId: uuid("batch_id").notNull().references(() => refundBatchProcessing.id, { onDelete: 'cascade' }),
  refundRecordId: uuid("refund_record_id").notNull().references(() => refundFinancialRecords.id, { onDelete: 'cascade' }),

  // Processing details
  processingOrder: integer("processing_order").notNull(),
  itemStatus: varchar("item_status", { length: 30 }).notNull().default('pending'),
  processedAt: timestamp("processed_at"),

  // Error tracking
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),

  // Timestamp
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  batchFk: foreignKey({
    columns: [t.batchId],
    foreignColumns: [refundBatchProcessing.id]
  }),
  refundRecordFk: foreignKey({
    columns: [t.refundRecordId],
    foreignColumns: [refundFinancialRecords.id]
  }),
  batchIdIdx: index("idx_batch_items_batch_id").on(t.batchId),
  refundRecordIdx: index("idx_batch_items_refund_record").on(t.refundRecordId),
  statusIdx: index("idx_batch_items_status").on(t.itemStatus),
}));

// ============================================================================
// FRAUD DETECTION AND RISK MANAGEMENT SYSTEM
// ============================================================================

// Risk Assessments - Comprehensive risk scoring for returns
export const riskAssessments = pgTable("risk_assessments", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Return and user links
  returnId: uuid("return_id").notNull().references(() => returns.id, { onDelete: 'cascade' }),
  userId: uuid("user_id").notNull().references(() => users.id),

  // Risk scoring
  riskScore: integer("risk_score").notNull(), // 0-100
  riskLevel: varchar("risk_level", { length: 10 }).notNull(), // 'low' | 'medium' | 'high'
  confidence: decimal("confidence", { precision: 5, scale: 4 }).notNull(), // 0.0-1.0

  // Assessment details
  flags: jsonb("flags").default('[]'), // Array of risk flags
  features: jsonb("features").notNull(), // Extracted features used for scoring
  modelVersion: varchar("model_version", { length: 50 }).notNull(),
  modelType: varchar("model_type", { length: 50 }).notNull(), // 'rule_based' | 'ml_model'

  // Recommendation
  recommendation: varchar("recommendation", { length: 20 }).notNull(), // 'auto_approve' | 'manual_review' | 'auto_reject'
  recommendationReason: text("recommendation_reason"),

  // Timestamps
  assessmentDate: timestamp("assessment_date").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  returnFk: foreignKey({
    columns: [t.returnId],
    foreignColumns: [returns.id]
  }),
  userFk: foreignKey({
    columns: [t.userId],
    foreignColumns: [users.id]
  }),
  returnIdIdx: index("idx_risk_assessments_return_id").on(t.returnId),
  userIdIdx: index("idx_risk_assessments_user_id").on(t.userId),
  riskLevelIdx: index("idx_risk_assessments_risk_level").on(t.riskLevel),
  recommendationIdx: index("idx_risk_assessments_recommendation").on(t.recommendation),
  assessmentDateIdx: index("idx_risk_assessments_assessment_date").on(t.assessmentDate),
}));

// Risk Features - Individual features contributing to risk score
export const riskFeatures = pgTable("risk_features", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Assessment link
  assessmentId: uuid("assessment_id").notNull().references(() => riskAssessments.id, { onDelete: 'cascade' }),

  // Feature details
  featureName: varchar("feature_name", { length: 100 }).notNull(),
  featureValue: text("feature_value").notNull(), // Stored as string, can be parsed
  featureType: varchar("feature_type", { length: 20 }).notNull(), // 'numeric' | 'categorical' | 'boolean'

  // Contribution to risk
  weight: decimal("weight", { precision: 5, scale: 4 }).notNull(), // Feature weight in model
  contribution: decimal("contribution", { precision: 8, scale: 4 }).notNull(), // Contribution to final score

  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  assessmentFk: foreignKey({
    columns: [t.assessmentId],
    foreignColumns: [riskAssessments.id]
  }),
  assessmentIdIdx: index("idx_risk_features_assessment_id").on(t.assessmentId),
  featureNameIdx: index("idx_risk_features_feature_name").on(t.featureName),
}));

// Fraud Patterns - Detected fraud patterns and anomalies
export const fraudPatterns = pgTable("fraud_patterns", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Pattern identification
  patternType: varchar("pattern_type", { length: 50 }).notNull(), // 'high_frequency' | 'high_value' | 'reason_abuse' | 'velocity' | 'geographic' | 'coordinated'
  severity: varchar("severity", { length: 10 }).notNull(), // 'low' | 'medium' | 'high' | 'critical'

  // Pattern details
  description: text("description").notNull(),
  detectionCriteria: jsonb("detection_criteria").notNull(), // Criteria used to detect this pattern

  // Detection statistics
  detectionCount: integer("detection_count").default(0),
  firstDetected: timestamp("first_detected").notNull().defaultNow(),
  lastDetected: timestamp("last_detected").notNull().defaultNow(),

  // Affected entities
  affectedUsers: jsonb("affected_users").default('[]'), // Array of user IDs
  affectedReturns: jsonb("affected_returns").default('[]'), // Array of return IDs

  // Pattern status
  isActive: boolean("is_active").default(true),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: uuid("resolved_by"),
  resolutionNotes: text("resolution_notes"),

  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  patternTypeIdx: index("idx_fraud_patterns_pattern_type").on(t.patternType),
  severityIdx: index("idx_fraud_patterns_severity").on(t.severity),
  isActiveIdx: index("idx_fraud_patterns_is_active").on(t.isActive),
  lastDetectedIdx: index("idx_fraud_patterns_last_detected").on(t.lastDetected),
}));

// User Fraud Profiles - Historical fraud indicators per user
export const userFraudProfiles = pgTable("user_fraud_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),

  // User link
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: 'cascade' }),

  // Return statistics
  totalReturns: integer("total_returns").default(0),
  highRiskReturns: integer("high_risk_returns").default(0),
  approvedReturns: integer("approved_returns").default(0),
  rejectedReturns: integer("rejected_returns").default(0),

  // Financial statistics
  totalReturnValue: decimal("total_return_value", { precision: 12, scale: 2 }).default('0'),
  averageReturnValue: decimal("average_return_value", { precision: 10, scale: 2 }).default('0'),

  // Risk indicators
  averageRiskScore: decimal("average_risk_score", { precision: 5, scale: 2 }).default('0'),
  fraudConfirmations: integer("fraud_confirmations").default(0), // Confirmed fraud cases
  falsePositives: integer("false_positives").default(0), // False fraud alerts

  // Behavioral patterns
  returnFrequency: decimal("return_frequency", { precision: 5, scale: 2 }).default('0'), // Returns per month
  lastReturnDate: timestamp("last_return_date"),
  accountAge: integer("account_age"), // Days since account creation

  // Pattern flags
  detectedPatterns: jsonb("detected_patterns").default('[]'), // Array of pattern types detected

  // Profile status
  trustScore: integer("trust_score").default(50), // 0-100, starts at 50
  isBlacklisted: boolean("is_blacklisted").default(false),
  blacklistedAt: timestamp("blacklisted_at"),
  blacklistReason: text("blacklist_reason"),

  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  userFk: foreignKey({
    columns: [t.userId],
    foreignColumns: [users.id]
  }),
  userIdIdx: index("idx_user_fraud_profiles_user_id").on(t.userId),
  trustScoreIdx: index("idx_user_fraud_profiles_trust_score").on(t.trustScore),
  isBlacklistedIdx: index("idx_user_fraud_profiles_is_blacklisted").on(t.isBlacklisted),
}));

// Support Chat Sessions
export const supportChatSessions = pgTable("support_chat_sessions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  agentId: uuid("agent_id").references(() => users.id, { onDelete: 'set null' }),
  status: varchar("status", { length: 20 }).default("waiting"), // waiting, active, closed
  initialMessage: text("initial_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  userFk: foreignKey({
    columns: [t.userId],
    foreignColumns: [users.id]
  }),
  agentFk: foreignKey({
    columns: [t.agentId],
    foreignColumns: [users.id]
  }),
  statusIdx: index("idx_support_chat_sessions_status").on(t.status),
  createdAtIdx: index("idx_support_chat_sessions_created_at").on(t.createdAt),
}));

// Support Chat Messages
export const supportChatMessages = pgTable("support_chat_messages", {
  id: varchar("id", { length: 36 }).primaryKey(),
  chatSessionId: varchar("chat_session_id", { length: 36 }).notNull().references(() => supportChatSessions.id, { onDelete: 'cascade' }),
  senderId: uuid("sender_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  isAgent: boolean("is_agent").default(false),
  read: boolean("read").default(false),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
}, (t) => ({
  chatSessionFk: foreignKey({
    columns: [t.chatSessionId],
    foreignColumns: [supportChatSessions.id]
  }),
  senderFk: foreignKey({
    columns: [t.senderId],
    foreignColumns: [users.id]
  }),
  timestampIdx: index("idx_support_chat_messages_timestamp").on(t.timestamp),
  readIdx: index("idx_support_chat_messages_read").on(t.read),
}));

// Support FAQ
export const supportFAQ = pgTable("support_faq", {
  id: varchar("id", { length: 36 }).primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: varchar("category", { length: 100 }).default("general"),
  priority: integer("priority").default(1),
  isActive: boolean("is_active").default(true),
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  categoryIdx: index("idx_support_faq_category").on(t.category),
  priorityIdx: index("idx_support_faq_priority").on(t.priority),
  isActiveIdx: index("idx_support_faq_is_active").on(t.isActive),
}));

// Support Tickets
export const supportTickets = pgTable("support_tickets", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  subject: varchar("subject", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 100 }).default("general"),
  priority: varchar("priority", { length: 20 }).default("medium"),
  status: varchar("status", { length: 20 }).default("open"), // open, in_progress, resolved, closed
  assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  userFk: foreignKey({
    columns: [t.userId],
    foreignColumns: [users.id]
  }),
  assignedToFk: foreignKey({
    columns: [t.assignedTo],
    foreignColumns: [users.id]
  }),
  statusIdx: index("idx_support_tickets_status").on(t.status),
  priorityIdx: index("idx_support_tickets_priority").on(t.priority),
  categoryIdx: index("idx_support_tickets_category").on(t.category),
}));

// Offline/Mobile support tables
export const cachedContent = pgTable("cached_content", {
  id: uuid("id").defaultRandom().primaryKey(),
  userAddress: varchar("user_address", { length: 66 }).notNull(),
  contentType: varchar("content_type", { length: 20 }).notNull(),
  contentId: varchar("content_id", { length: 255 }).notNull(),
  contentData: text("content_data").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  priority: integer("priority").default(5),
  accessedAt: timestamp("accessed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  userIdx: index("idx_cached_content_user").on(t.userAddress),
  typeIdx: index("idx_cached_content_type").on(t.contentType),
}));

export const offlineActions = pgTable("offline_actions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userAddress: varchar("user_address", { length: 66 }).notNull(),
  actionType: varchar("action_type", { length: 20 }).notNull(),
  actionData: text("action_data").notNull(),
  status: varchar("status", { length: 20 }).default("pending"),
  retryCount: integer("retry_count").default(0),
  lastAttemptAt: timestamp("last_attempt_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  userIdx: index("idx_offline_actions_user").on(t.userAddress),
  statusIdx: index("idx_offline_actions_status").on(t.status),
}));

// Gem balance tracking
export const userGemBalance = pgTable("user_gem_balance", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id", { length: 66 }).notNull().unique(),
  balance: integer("balance").default(0).notNull(),
  totalPurchased: integer("total_purchased").default(0).notNull(),
  totalSpent: integer("total_spent").default(0).notNull(),
  lastPurchaseAt: timestamp("last_purchase_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  userIdx: index("idx_user_gem_balance_user").on(t.userId),
}));

// Gem transaction history
export const gemTransaction = pgTable("gem_transaction", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id", { length: 66 }).notNull(),
  amount: integer("amount").notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'purchase', 'spend', 'refund'
  price: decimal("price", { precision: 10, scale: 2 }), // Price in USD for purchases
  paymentMethod: varchar("payment_method", { length: 50 }), // 'stripe', 'crypto', etc.
  paymentIntentId: varchar("payment_intent_id", { length: 255 }),
  referenceId: varchar("reference_id", { length: 255 }), // Related post/comment ID for spends
  status: varchar("status", { length: 20 }).default("completed").notNull(),
  metadata: jsonb("metadata"),
  // New fields for receipt generation
  orderId: varchar("order_id", { length: 255 }).unique(), // Unique order ID for tracking
  network: varchar("network", { length: 50 }), // Blockchain network (e.g., Ethereum, Base, Polygon)
  transactionHash: varchar("transaction_hash", { length: 66 }), // Blockchain transaction hash
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  userIdx: index("idx_gem_transaction_user").on(t.userId),
  typeIdx: index("idx_gem_transaction_type").on(t.type),
  statusIdx: index("idx_gem_transaction_status").on(t.status),
  createdAtIdx: index("idx_gem_transaction_created").on(t.createdAt),
  networkIdx: index("idx_gem_transaction_network").on(t.network),
  transactionHashIdx: index("idx_gem_transaction_hash").on(t.transactionHash),
  orderNetworkIdx: index("idx_gem_transaction_order_network").on(t.orderId, t.network),
}));

// Seller tier requirements table
export const sellerTierRequirements = pgTable("seller_tier_requirements", {
  id: serial("id").primaryKey(),
  tier: varchar("tier", { length: 20 }).notNull(),
  requirementType: varchar("requirement_type", { length: 50 }).notNull(),
  requiredValue: decimal("required_value", { precision: 20, scale: 8 }).notNull(),
  currentValue: decimal("current_value", { precision: 20, scale: 8 }).default("0"),
  description: text("description"),
  isMet: boolean("is_met").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  tierIdx: index("idx_seller_tier_requirements_tier").on(t.tier),
  requirementTypeIdx: index("idx_seller_tier_requirements_type").on(t.requirementType),
}));

// Seller tier benefits table
export const sellerTierBenefits = pgTable("seller_tier_benefits", {
  id: serial("id").primaryKey(),
  tier: varchar("tier", { length: 20 }).notNull(),
  benefitType: varchar("benefit_type", { length: 50 }).notNull(),
  benefitValue: text("benefit_value").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  tierIdx: index("idx_seller_tier_benefits_tier").on(t.tier),
  benefitTypeIdx: index("idx_seller_tier_benefits_type").on(t.benefitType),
}));

// Seller tier progression tracking table
export const sellerTierProgression = pgTable("seller_tier_progression", {
  id: serial("id").primaryKey(),
  sellerWalletAddress: varchar("seller_wallet_address", { length: 66 }).notNull(),
  currentTier: varchar("current_tier", { length: 20 }).notNull(),
  nextEligibleTier: varchar("next_eligible_tier", { length: 20 }),
  progressPercentage: decimal("progress_percentage", { precision: 5, scale: 2 }).default("0"),
  requirementsMet: integer("requirements_met").default(0),
  totalRequirements: integer("total_requirements").default(0),
  lastEvaluationAt: timestamp("last_evaluation_at").defaultNow(),
  nextEvaluationAt: timestamp("next_evaluation_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  sellerWalletAddressIdx: index("idx_seller_tier_progression_seller").on(t.sellerWalletAddress),
  currentTierIdx: index("idx_seller_tier_progression_current_tier").on(t.currentTier),
  nextEvaluationAtIdx: index("idx_seller_tier_progression_next_evaluation").on(t.nextEvaluationAt),
}));

// Seller tier history table
export const sellerTierHistory = pgTable("seller_tier_history", {
  id: serial("id").primaryKey(),
  sellerWalletAddress: varchar("seller_wallet_address", { length: 66 }).notNull(),
  fromTier: varchar("from_tier", { length: 20 }).notNull(),
  toTier: varchar("to_tier", { length: 20 }).notNull(),
  upgradeReason: text("upgrade_reason"),
  autoUpgraded: boolean("auto_upgraded").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  sellerWalletAddressIdx: index("idx_seller_tier_history_seller").on(t.sellerWalletAddress),
  createdAtIdx: index("idx_seller_tier_history_created_at").on(t.createdAt),
}));

// ============================================================================
// Social Media Integration Tables
// ============================================================================

// Social Media Connections - Store OAuth tokens per user per platform
export const socialMediaConnections = pgTable("social_media_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  platform: varchar("platform", { length: 32 }).notNull(), // 'twitter' | 'facebook' | 'linkedin'

  // Encrypted OAuth tokens (using encryptionService)
  accessToken: text("access_token").notNull(), // Encrypted
  refreshToken: text("refresh_token"), // Encrypted (nullable - not all platforms use it)
  tokenExpiry: timestamp("token_expiry"),

  // Platform-specific user info
  platformUserId: varchar("platform_user_id", { length: 255 }).notNull(),
  platformUsername: varchar("platform_username", { length: 255 }),
  platformDisplayName: varchar("platform_display_name", { length: 255 }),
  platformAvatarUrl: text("platform_avatar_url"),

  // OAuth metadata
  scopes: text("scopes"), // JSON array of granted scopes

  // Facebook Page Support
  pageId: varchar("page_id", { length: 255 }),
  pageName: varchar("page_name", { length: 255 }),
  pageAccessToken: text("page_access_token"), // Encrypted if possible, but consistent with accessToken for now

  // Status tracking
  status: varchar("status", { length: 32 }).default("active"), // 'active' | 'expired' | 'revoked' | 'error'
  lastError: text("last_error"),
  lastUsedAt: timestamp("last_used_at"),
  connectedAt: timestamp("connected_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  userPlatformIdx: index("idx_social_connections_user_platform").on(t.userId, t.platform),
  userPlatformUnique: unique("unique_user_platform").on(t.userId, t.platform),
  statusIdx: index("idx_social_connections_status").on(t.status),
}));

// Social Media Posts - Track cross-posted content for analytics and retry logic
export const socialMediaPosts = pgTable("social_media_posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }),
  statusId: uuid("status_id").references(() => statuses.id, { onDelete: "cascade" }),
  connectionId: uuid("connection_id").notNull().references(() => socialMediaConnections.id, { onDelete: "cascade" }),
  platform: varchar("platform", { length: 32 }).notNull(),

  // External post reference
  externalPostId: varchar("external_post_id", { length: 255 }),
  externalPostUrl: text("external_post_url"),

  // Content sent
  contentSent: text("content_sent").notNull(),
  mediaSent: text("media_sent"), // JSON array of media URLs/IDs

  // Status
  postStatus: varchar("post_status", { length: 32 }).default("pending"), // 'pending' | 'posted' | 'failed' | 'deleted'
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),

  // Timestamps
  postedAt: timestamp("posted_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  postIdx: index("idx_social_posts_post_id").on(t.postId),
  statusIdx: index("idx_social_posts_status_id").on(t.statusId),
  connectionIdx: index("idx_social_posts_connection_id").on(t.connectionId),
  postStatusIdx: index("idx_social_posts_post_status").on(t.postStatus),
}));

// OAuth States - Temporary storage for OAuth state parameters (CSRF protection)
export const oauthStates = pgTable("oauth_states", {
  id: uuid("id").defaultRandom().primaryKey(),
  state: varchar("state", { length: 128 }).notNull().unique(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  platform: varchar("platform", { length: 32 }).notNull(),
  codeVerifier: text("code_verifier"), // For PKCE (Twitter OAuth 2.0)
  redirectUri: text("redirect_uri"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  stateIdx: index("idx_oauth_states_state").on(t.state),
  expiresIdx: index("idx_oauth_states_expires").on(t.expiresAt),
  userIdx: index("idx_oauth_states_user").on(t.userId),
}));

// File Attachments - For deduplication and virus scanning tracking
export const fileAttachments = pgTable("file_attachments", {
  id: uuid("id").defaultRandom().primaryKey(),
  fileHash: varchar("file_hash", { length: 64 }).unique().notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  s3Key: varchar("s3_key", { length: 500 }),
  ipfsCid: varchar("ipfs_cid", { length: 100 }),
  uploadedBy: varchar("uploaded_by", { length: 66 }).notNull(),
  uploadTimestamp: timestamp("upload_timestamp").defaultNow(),
  virusScanStatus: varchar("virus_scan_status", { length: 20 }).default("pending"),
  virusScanResult: jsonb("virus_scan_result"),
  referenceCount: integer("reference_count").default(1),
  isQuarantined: boolean("is_quarantined").default(false),
  // Phase 2: Thumbnails and CDN
  thumbnailSmallUrl: varchar("thumbnail_small_url", { length: 500 }),
  thumbnailMediumUrl: varchar("thumbnail_medium_url", { length: 500 }),
  s3Url: varchar("s3_url", { length: 500 }),
  cdnUrl: varchar("cdn_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  hashIdx: index("idx_file_attachments_hash").on(t.fileHash),
  uploadedByIdx: index("idx_file_attachments_uploaded_by").on(t.uploadedBy),
  virusScanStatusIdx: index("idx_file_attachments_virus_scan_status").on(t.virusScanStatus),
  createdAtIdx: index("idx_file_attachments_created_at").on(t.createdAt),
  s3UrlIdx: index("idx_file_attachments_s3_url").on(t.s3Url),
}));

// Virus Scan Logs - Audit trail for virus scanning
export const virusScanLogs = pgTable("virus_scan_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  fileHash: varchar("file_hash", { length: 64 }).notNull().references(() => fileAttachments.fileHash, { onDelete: "cascade" }),
  scanner: varchar("scanner", { length: 20 }).notNull(),
  scanResult: varchar("scan_result", { length: 20 }).notNull(),
  viruses: text("viruses").array(),
  scanTimeMs: integer("scan_time_ms"),
  scannedAt: timestamp("scanned_at").defaultNow(),
  scannedBy: varchar("scanned_by", { length: 66 }),
}, (t) => ({
  fileHashIdx: index("idx_virus_scan_logs_file_hash").on(t.fileHash),
  scannedAtIdx: index("idx_virus_scan_logs_scanned_at").on(t.scannedAt),
}));


// Verification Schema
export * from "./verificationSchema";

