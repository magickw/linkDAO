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
  status: varchar("status", { length: 32 }).default("active"), // 'active' | 'inactive' | 'sold_out' | 'suspended' | 'draft'
  tags: text("tags"), // JSON array of tags
  shipping: text("shipping"), // JSON ShippingInfo
  nft: text("nft"), // JSON NFTInfo
  views: integer("views").default(0),
  favorites: integer("favorites").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
}));

// Product Tags - for efficient querying
export const productTags = pgTable("product_tags", {
  id: serial("id").primaryKey(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  tag: varchar("tag", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  productTagIdx: index("product_tag_idx").on(t.productId, t.tag),
  tagIdx: index("tag_idx").on(t.tag),
  productFk: foreignKey({
    columns: [t.productId],
    foreignColumns: [products.id]
  })
}));

// Marketplace listings (keeping for backward compatibility)
export const listings = pgTable("listings", {
  id: serial("id").primaryKey(),
  sellerId: uuid("seller_id").references(() => users.id),
  productId: uuid("product_id").references(() => products.id), // Link to products table
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
}, (t) => ({
  productFk: foreignKey({
    columns: [t.productId],
    foreignColumns: [products.id]
  })
}));

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

// Order Events
export const orderEvents = pgTable("order_events", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id),
  eventType: varchar("event_type", { length: 64 }).notNull(),
  description: text("description"),
  metadata: text("metadata"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Tracking Records
export const trackingRecords = pgTable("tracking_records", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id),
  trackingNumber: varchar("tracking_number", { length: 128 }).notNull(),
  carrier: varchar("carrier", { length: 32 }).notNull(),
  status: varchar("status", { length: 64 }),
  events: text("events"),
  createdAt: timestamp("created_at").defaultNow(),
  lastUpdated: timestamp("last_updated").defaultNow(),
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
  metadataUri: text("metadata_uri").notNull(),
  attributes: text("attributes"), // JSON
  rarity: varchar("rarity", { length: 20 }),
  status: varchar("status", { length: 20 }).default("active"),
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
  orderId: integer("order_id").references(() => orders.id).notNull(),
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

export const reviewHelpfulness = pgTable("review_helpfulness", {
  id: uuid("id").defaultRandom().primaryKey(),
  reviewId: uuid("review_id").references(() => reviews.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  isHelpful: boolean("is_helpful").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reviewReports = pgTable("review_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  reviewId: uuid("review_id").references(() => reviews.id).notNull(),
  reporterId: uuid("reporter_id").references(() => users.id).notNull(),
  reason: varchar("reason", { length: 100 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reputationHistory = pgTable("reputation_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  changeType: varchar("change_type", { length: 50 }).notNull(),
  changeValue: integer("change_value").notNull(),
  previousScore: integer("previous_score").notNull(),
  newScore: integer("new_score").notNull(),
  reason: text("reason"),
  relatedEntityType: varchar("related_entity_type", { length: 50 }),
  relatedEntityId: varchar("related_entity_id", { length: 128 }),
  createdAt: timestamp("created_at").defaultNow(),
});

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
    foreignColumns: [table.id],
    name: "service_categories_parent_id_service_categories_id_fk"
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
    foreignColumns: [users.id],
    name: "services_provider_id_users_id_fk"
  }),
  categoryFk: foreignKey({
    columns: [table.categoryId],
    foreignColumns: [serviceCategories.id],
    name: "services_category_id_service_categories_id_fk"
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
    foreignColumns: [services.id],
    name: "service_availability_service_id_services_id_fk"
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
    foreignColumns: [services.id],
    name: "service_bookings_service_id_services_id_fk"
  }),
  clientFk: foreignKey({
    columns: [table.clientId],
    foreignColumns: [users.id],
    name: "service_bookings_client_id_users_id_fk"
  }),
  providerFk: foreignKey({
    columns: [table.providerId],
    foreignColumns: [users.id],
    name: "service_bookings_provider_id_users_id_fk"
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
    foreignColumns: [serviceBookings.id],
    name: "service_milestones_booking_id_service_bookings_id_fk"
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
    foreignColumns: [serviceBookings.id],
    name: "service_reviews_booking_id_service_bookings_id_fk"
  }),
  reviewerFk: foreignKey({
    columns: [table.reviewerId],
    foreignColumns: [users.id],
    name: "service_reviews_reviewer_id_users_id_fk"
  }),
  revieweeFk: foreignKey({
    columns: [table.revieweeId],
    foreignColumns: [users.id],
    name: "service_reviews_reviewee_id_users_id_fk"
  }),
  serviceFk: foreignKey({
    columns: [table.serviceId],
    foreignColumns: [services.id],
    name: "service_reviews_service_id_services_id_fk"
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
    foreignColumns: [users.id],
    name: "service_provider_profiles_user_id_users_id_fk"
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
    foreignColumns: [serviceBookings.id],
    name: "service_messages_booking_id_service_bookings_id_fk"
  }),
  senderFk: foreignKey({
    columns: [table.senderId],
    foreignColumns: [users.id],
    name: "service_messages_sender_id_users_id_fk"
  }),
  recipientFk: foreignKey({
    columns: [table.recipientId],
    foreignColumns: [users.id],
    name: "service_messages_recipient_id_users_id_fk"
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
    name: "time_tracking_booking_id_service_bookings_id_fk"
  }),
  milestoneFk: foreignKey({
    columns: [table.milestoneId],
    foreignColumns: [serviceMilestones.id],
    name: "time_tracking_milestone_id_service_milestones_id_fk"
  }),
  providerFk: foreignKey({
    columns: [table.providerId],
    foreignColumns: [users.id],
    name: "time_tracking_provider_id_users_id_fk"
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
    name: "project_deliverables_booking_id_service_bookings_id_fk"
  }),
  milestoneFk: foreignKey({
    columns: [table.milestoneId],
    foreignColumns: [serviceMilestones.id],
    name: "project_deliverables_milestone_id_service_milestones_id_fk"
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
    name: "milestone_payments_milestone_id_service_milestones_id_fk"
  }),
  bookingFk: foreignKey({
    columns: [table.bookingId],
    foreignColumns: [serviceBookings.id],
    name: "milestone_payments_booking_id_service_bookings_id_fk"
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
    name: "project_threads_booking_id_service_bookings_id_fk"
  }),
  milestoneFk: foreignKey({
    columns: [table.milestoneId],
    foreignColumns: [serviceMilestones.id],
    name: "project_threads_milestone_id_service_milestones_id_fk"
  }),
  createdByFk: foreignKey({
    columns: [table.createdBy],
    foreignColumns: [users.id],
    name: "project_threads_created_by_users_id_fk"
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
    foreignColumns: [projectThreads.id],
    name: "project_messages_thread_id_project_threads_id_fk"
  }),
  bookingFk: foreignKey({
    columns: [table.bookingId],
    foreignColumns: [serviceBookings.id],
    name: "project_messages_booking_id_service_bookings_id_fk"
  }),
  senderFk: foreignKey({
    columns: [table.senderId],
    foreignColumns: [users.id],
    name: "project_messages_sender_id_users_id_fk"
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
    foreignColumns: [serviceBookings.id],
    name: "project_approvals_booking_id_service_bookings_id_fk"
  }),
  milestoneFk: foreignKey({
    columns: [table.milestoneId],
    foreignColumns: [serviceMilestones.id],
    name: "project_approvals_milestone_id_service_milestones_id_fk"
  }),
  deliverableFk: foreignKey({
    columns: [table.deliverableId],
    foreignColumns: [projectDeliverables.id],
    name: "project_approvals_deliverable_id_project_deliverables_id_fk"
  }),
  approverFk: foreignKey({
    columns: [table.approverId],
    foreignColumns: [users.id],
    name: "project_approvals_approver_id_users_id_fk"
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
    name: "project_activities_booking_id_service_bookings_id_fk"
  }),
  milestoneFk: foreignKey({
    columns: [table.milestoneId],
    foreignColumns: [serviceMilestones.id],
    name: "project_activities_milestone_id_service_milestones_id_fk"
  }),
  userFk: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "project_activities_user_id_users_id_fk"
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
    name: "project_files_booking_id_service_bookings_id_fk"
  }),
  milestoneFk: foreignKey({
    columns: [table.milestoneId],
    foreignColumns: [serviceMilestones.id],
    name: "project_files_milestone_id_service_milestones_id_fk"
  }),
  deliverableFk: foreignKey({
    columns: [table.deliverableId],
    foreignColumns: [projectDeliverables.id],
    name: "project_files_deliverable_id_project_deliverables_id_fk"
  }),
  uploaderFk: foreignKey({
    columns: [table.uploaderId],
    foreignColumns: [users.id],
    name: "project_files_uploader_id_users_id_fk"
  }),
  bookingIdx: index("project_files_booking_id_idx").on(table.bookingId),
  fileHashIdx: index("project_files_file_hash_idx").on(table.fileHash),
}));

// AI Content Moderation System Tables

export const moderationCases = pgTable("moderation_cases", {
  id: serial("id").primaryKey(),
  contentId: varchar("content_id", { length: 64 }).notNull(),
  contentType: varchar("content_type", { length: 24 }).notNull(),
  userId: uuid("user_id").notNull().references(() => users.id),
  status: varchar("status", { length: 24 }).default("pending"),
  riskScore: numeric("risk_score", { precision: 5, scale: 4 }).default("0"),
  decision: varchar("decision", { length: 24 }),
  reasonCode: varchar("reason_code", { length: 48 }),
  confidence: numeric("confidence", { precision: 5, scale: 4 }).default("0"),
  vendorScores: text("vendor_scores"), // JSON
  evidenceCid: text("evidence_cid"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  contentIdIdx: index("idx_moderation_cases_content_id").on(t.contentId),
  userIdIdx: index("idx_moderation_cases_user_id").on(t.userId),
  statusIdx: index("idx_moderation_cases_status").on(t.status),
  createdAtIdx: index("idx_moderation_cases_created_at").on(t.createdAt),
  riskScoreIdx: index("idx_moderation_cases_risk_score").on(t.riskScore),
  userStatusIdx: index("idx_moderation_cases_user_status").on(t.userId, t.status),
}));

export const moderationActions = pgTable("moderation_actions", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  contentId: varchar("content_id", { length: 64 }).notNull(),
  action: varchar("action", { length: 24 }).notNull(),
  durationSec: integer("duration_sec").default(0),
  appliedBy: varchar("applied_by", { length: 64 }),
  rationale: text("rationale"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  userIdIdx: index("idx_moderation_actions_user_id").on(t.userId),
  contentIdIdx: index("idx_moderation_actions_content_id").on(t.contentId),
  createdAtIdx: index("idx_moderation_actions_created_at").on(t.createdAt),
  userCreatedIdx: index("idx_moderation_actions_user_created").on(t.userId, t.createdAt),
}));

export const contentReports = pgTable("content_reports", {
  id: serial("id").primaryKey(),
  contentId: varchar("content_id", { length: 64 }).notNull(),
  contentType: varchar("content_type", { length: 24 }).notNull(),
  reporterId: uuid("reporter_id").notNull().references(() => users.id),
  reason: varchar("reason", { length: 48 }).notNull(),
  details: text("details"),
  category: varchar("category", { length: 24 }),
  weight: numeric("weight", { precision: 5, scale: 4 }).default("1"),
  status: varchar("status", { length: 24 }).default("open"),
  moderatorId: uuid("moderator_id").references(() => users.id),
  resolution: text("resolution"),
  moderatorNotes: text("moderator_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  contentIdIdx: index("idx_content_reports_content_id").on(t.contentId),
  reporterIdIdx: index("idx_content_reports_reporter_id").on(t.reporterId),
  statusIdx: index("idx_content_reports_status").on(t.status),
  createdAtIdx: index("idx_content_reports_created_at").on(t.createdAt),
  contentStatusIdx: index("idx_content_reports_content_status").on(t.contentId, t.status),
  categoryIdx: index("idx_content_reports_category").on(t.category),
  moderatorIdx: index("idx_content_reports_moderator").on(t.moderatorId),
}));

export const moderationAppeals = pgTable("moderation_appeals", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().references(() => moderationCases.id),
  appellantId: uuid("appellant_id").notNull().references(() => users.id),
  status: varchar("status", { length: 24 }).default("open"),
  stakeAmount: numeric("stake_amount", { precision: 20, scale: 8 }).default("0"),
  juryDecision: varchar("jury_decision", { length: 24 }),
  decisionCid: text("decision_cid"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  caseIdIdx: index("idx_moderation_appeals_case_id").on(t.caseId),
  appellantIdIdx: index("idx_moderation_appeals_appellant_id").on(t.appellantId),
  statusIdx: index("idx_moderation_appeals_status").on(t.status),
}));

export const appealJurors = pgTable("appeal_jurors", {
  id: serial("id").primaryKey(),
  appealId: integer("appeal_id").notNull().references(() => moderationAppeals.id),
  jurorId: uuid("juror_id").notNull().references(() => users.id),
  selectionWeight: numeric("selection_weight", { precision: 10, scale: 4 }).notNull(),
  voteCommitment: varchar("vote_commitment", { length: 64 }),
  voteReveal: varchar("vote_reveal", { length: 24 }),
  voteReasoning: text("vote_reasoning"),
  rewardAmount: numeric("reward_amount", { precision: 20, scale: 8 }).default("0"),
  slashedAmount: numeric("slashed_amount", { precision: 20, scale: 8 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  votedAt: timestamp("voted_at"),
}, (t) => ({
  appealIdIdx: index("idx_appeal_jurors_appeal_id").on(t.appealId),
  jurorIdIdx: index("idx_appeal_jurors_juror_id").on(t.jurorId),
}));

export const moderationPolicies = pgTable("moderation_policies", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 48 }).notNull(),
  severity: varchar("severity", { length: 24 }).notNull(),
  confidenceThreshold: numeric("confidence_threshold", { precision: 5, scale: 4 }).notNull(),
  action: varchar("action", { length: 24 }).notNull(),
  reputationModifier: numeric("reputation_modifier", { precision: 5, scale: 4 }).default("0"),
  description: text("description").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const moderationVendors = pgTable("moderation_vendors", {
  id: serial("id").primaryKey(),
  vendorName: varchar("vendor_name", { length: 32 }).notNull().unique(),
  vendorType: varchar("vendor_type", { length: 24 }).notNull(),
  apiEndpoint: varchar("api_endpoint", { length: 255 }),
  isEnabled: boolean("is_enabled").default(true),
  weight: numeric("weight", { precision: 5, scale: 4 }).default("1"),
  costPerRequest: numeric("cost_per_request", { precision: 10, scale: 6 }).default("0"),
  avgLatencyMs: integer("avg_latency_ms").default(0),
  successRate: numeric("success_rate", { precision: 5, scale: 4 }).default("1"),
  lastHealthCheck: timestamp("last_health_check"),
  configuration: text("configuration"), // JSON
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const moderationAuditLog = pgTable("moderation_audit_log", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => moderationCases.id),
  actionType: varchar("action_type", { length: 32 }).notNull(),
  actorId: varchar("actor_id", { length: 64 }),
  actorType: varchar("actor_type", { length: 24 }).default("user"),
  oldState: text("old_state"), // JSON
  newState: text("new_state"), // JSON
  reasoning: text("reasoning"),
  ipAddress: varchar("ip_address", { length: 45 }), // IPv6 compatible
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  caseIdIdx: index("idx_moderation_audit_log_case_id").on(t.caseId),
  createdAtIdx: index("idx_moderation_audit_log_created_at").on(t.createdAt),
  actorIdIdx: index("idx_moderation_audit_log_actor_id").on(t.actorId),
}));

export const moderationMetrics = pgTable("moderation_metrics", {
  id: serial("id").primaryKey(),
  metricType: varchar("metric_type", { length: 32 }).notNull(),
  metricName: varchar("metric_name", { length: 64 }).notNull(),
  metricValue: numeric("metric_value", { precision: 15, scale: 6 }).notNull(),
  dimensions: text("dimensions"), // JSON
  recordedAt: timestamp("recorded_at").defaultNow(),
}, (t) => ({
  metricTypeIdx: index("idx_moderation_metrics_metric_type").on(t.metricType),
  recordedAtIdx: index("idx_moderation_metrics_recorded_at").on(t.recordedAt),
}));

export const contentHashes = pgTable("content_hashes", {
  id: serial("id").primaryKey(),
  contentId: varchar("content_id", { length: 64 }).notNull(),
  contentType: varchar("content_type", { length: 24 }).notNull(),
  hashType: varchar("hash_type", { length: 24 }).notNull(),
  hashValue: varchar("hash_value", { length: 128 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  contentIdIdx: index("idx_content_hashes_content_id").on(t.contentId),
  hashValueIdx: index("idx_content_hashes_hash_value").on(t.hashValue),
  hashTypeIdx: index("idx_content_hashes_hash_type").on(t.hashType),
}));

export const reputationImpacts = pgTable("reputation_impacts", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  caseId: integer("case_id").references(() => moderationCases.id),
  impactType: varchar("impact_type", { length: 32 }).notNull(),
  impactValue: numeric("impact_value", { precision: 10, scale: 4 }).notNull(),
  previousReputation: numeric("previous_reputation", { precision: 10, scale: 4 }),
  newReputation: numeric("new_reputation", { precision: 10, scale: 4 }),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  userIdIdx: index("idx_reputation_impacts_user_id").on(t.userId),
  caseIdIdx: index("idx_reputation_impacts_case_id").on(t.caseId),
  createdAtIdx: index("idx_reputation_impacts_created_at").on(t.createdAt),
}));