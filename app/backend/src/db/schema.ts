import { pgTable, serial, varchar, text, timestamp, integer, uuid, primaryKey, index, boolean, numeric, foreignKey } from "drizzle-orm/pg-core";

// Users / Profiles
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  walletAddress: varchar("wallet_address", { length: 66 }).notNull().unique(),
  handle: varchar("handle", { length: 64 }).unique(),
  profileCid: text("profile_cid"), // IPFS metadata
  physicalAddress: text("physical_address"), // JSON object for shipping/billing address
  createdAt: timestamp("created_at").defaultNow(),
});

// Posts
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  authorId: uuid("author_id").references(() => users.id),
  title: text("title"), // Making title nullable to handle existing data
  contentCid: text("content_cid").notNull(),
  parentId: integer("parent_id"),
  mediaCids: text("media_cids"), // JSON array of media IPFS CIDs
  tags: text("tags"), // JSON array of tags
  stakedValue: numeric("staked_value").default('0'), // Total tokens staked on this post
  reputationScore: integer("reputation_score").default(0), // Author's reputation score at time of posting
  dao: varchar("dao", { length: 64 }), // DAO community this post belongs to
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  authorFk: foreignKey({
    columns: [t.authorId],
    foreignColumns: [users.id]
  })
}));

// Post Tags - for efficient querying of posts by tags
export const postTags = pgTable("post_tags", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => posts.id),
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
  postId: integer("post_id").references(() => posts.id),
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
  postId: integer("post_id").references(() => posts.id),
  fromUserId: uuid("from_user_id").references(() => users.id),
  toUserId: uuid("to_user_id").references(() => users.id),
  token: varchar("token", { length: 64 }).notNull(), // e.g. USDC, LNK
  amount: numeric("amount").notNull(),
  message: text("message"), // Optional message with the tip
  txHash: varchar("tx_hash", { length: 66 }), // Blockchain transaction hash
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

// Follows
export const follows = pgTable("follows", {
  followerId: uuid("follower_id").notNull(),
  followingId: uuid("following_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.followerId, t.followingId] }),
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
});

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

// Marketplace tables
export const listings = pgTable("listings", {
  id: serial("id").primaryKey(),
  sellerId: uuid("seller_id").references(() => users.id),
  tokenAddress: varchar("token_address", { length: 66 }).notNull(),
  price: numeric("price").notNull(), // Using numeric for better precision
  quantity: integer("quantity").notNull(),
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
});

export const bids = pgTable("bids", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").references(() => listings.id),
  bidderId: uuid("bidder_id").references(() => users.id),
  amount: numeric("amount").notNull(), // Using numeric for better precision
  timestamp: timestamp("timestamp").defaultNow(),
});

export const offers = pgTable("offers", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").references(() => listings.id),
  buyerId: uuid("buyer_id").references(() => users.id),
  amount: numeric("amount").notNull(), // Using numeric for better precision
  createdAt: timestamp("created_at").defaultNow(),
  accepted: boolean("accepted").default(false),
});

export const escrows = pgTable("escrows", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").references(() => listings.id),
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
});

export const reputations = pgTable("reputations", {
  walletAddress: varchar("wallet_address", { length: 66 }).primaryKey(),
  score: integer("score").notNull(),
  daoApproved: boolean("dao_approved").default(false),
});

// Disputes
export const disputes = pgTable("disputes", {
  id: serial("id").primaryKey(),
  escrowId: integer("escrow_id").references(() => escrows.id),
  reporterId: uuid("reporter_id").references(() => users.id),
  reason: text("reason"),
  status: varchar("status", { length: 32 }).default("open"), // 'open', 'in_review', 'resolved', 'escalated'
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  resolution: text("resolution"), // Description of resolution
  // Evidence tracking
  evidence: text("evidence"), // JSON array of evidence items
});

// Orders
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").references(() => listings.id),
  buyerId: uuid("buyer_id").references(() => users.id),
  sellerId: uuid("seller_id").references(() => users.id),
  escrowId: integer("escrow_id").references(() => escrows.id),
  amount: numeric("amount").notNull(), // Using numeric for better precision
  paymentToken: varchar("payment_token", { length: 66 }),
  status: varchar("status", { length: 32 }).default("pending"), // 'pending', 'completed', 'disputed', 'refunded'
  createdAt: timestamp("created_at").defaultNow(),
});

// AI Moderation table for marketplace listings
export const aiModeration = pgTable("ai_moderation", {
  id: serial("id").primaryKey(),
  objectType: varchar("object_type", { length: 32 }).notNull(), // "listing", "dispute"
  objectId: integer("object_id").notNull(),
  status: varchar("status", { length: 32 }).default("pending"), // 'pending', 'approved', 'rejected', 'flagged'
  aiAnalysis: text("ai_analysis"), // JSON of AI analysis results
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});