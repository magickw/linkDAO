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