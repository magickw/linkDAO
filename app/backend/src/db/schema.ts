import { pgTable, serial, varchar, text, timestamp, integer, uuid, primaryKey, index, boolean, numeric, foreignKey, jsonb } from "drizzle-orm/pg-core";
import * as marketplaceSchema from "./marketplaceSchema";

// Users / Profiles
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  walletAddress: varchar("wallet_address", { length: 66 }).notNull().unique(),
  handle: varchar("handle", { length: 64 }).unique(),
  profileCid: text("profile_cid"), // IPFS metadata
  physicalAddress: text("physical_address"), // JSON object for shipping/billing address (deprecated)
  
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
  pollId: uuid("poll_id"), // Reference to poll if this is a poll post
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

// Sellers table for enhanced store functionality
export const sellers = pgTable("sellers", {
  id: serial("id").primaryKey(),
  walletAddress: varchar("wallet_address", { length: 66 }).notNull().unique(),
  displayName: varchar("display_name", { length: 255 }),
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
  tier: varchar("tier", { length: 32 }).default("basic"),
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
  currency: varchar("currency", { length: 10 }).default("ETH"),
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
  // Enhanced fields for improved order tracking
  checkoutSessionId: varchar("checkout_session_id", { length: 255 }),
  paymentMethod: varchar("payment_method", { length: 20 }), // 'crypto', 'fiat', 'escrow'
  paymentDetails: text("payment_details"), // JSON object with payment-specific data
  shippingAddress: text("shipping_address"), // JSON object with shipping details
  billingAddress: text("billing_address"), // JSON object with billing details
  orderNotes: text("order_notes"),
  trackingNumber: varchar("tracking_number", { length: 100 }),
  trackingCarrier: varchar("tracking_carrier", { length: 50 }),
  estimatedDelivery: timestamp("estimated_delivery"),
  actualDelivery: timestamp("actual_delivery"),
  deliveryConfirmation: text("delivery_confirmation"), // JSON object with delivery proof
  paymentConfirmationHash: varchar("payment_confirmation_hash", { length: 66 }), // Blockchain tx hash
  escrowContractAddress: varchar("escrow_contract_address", { length: 66 }),
  totalAmount: numeric("total_amount", { precision: 20, scale: 8 }), // Total including fees, taxes, shipping
  currency: varchar("currency", { length: 10 }).default("USD"),
  orderMetadata: text("order_metadata"), // JSON object for additional order data
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  stripeTransferGroup: varchar("stripe_transfer_group", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  checkoutSessionIdx: index("idx_orders_checkout_session_id").on(t.checkoutSessionId),
  paymentMethodIdx: index("idx_orders_payment_method").on(t.paymentMethod),
  trackingNumberIdx: index("idx_orders_tracking_number").on(t.trackingNumber),
  estimatedDeliveryIdx: index("idx_orders_estimated_delivery").on(t.estimatedDelivery),
  paymentConfirmationIdx: index("idx_orders_payment_confirmation_hash").on(t.paymentConfirmationHash),
}));

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
  reporterId: uuid("reporter_id").references(() => users.id).notNull(),
  reason: varchar("reason", { length: 48 }).notNull(),
  details: text("details"),
  weight: numeric("weight").default("1"),
  status: varchar("status", { length: 24 }).default("open"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  contentIdx: index("content_reports_content_idx").on(t.contentId),
  reporterIdx: index("content_reports_reporter_idx").on(t.reporterId),
}));

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

// ENS Verifications
export const ensVerifications = pgTable("ens_verifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  walletAddress: varchar("wallet_address", { length: 66 }).notNull(),
  ensHandle: varchar("ens_handle", { length: 255 }).notNull(),
  verificationMethod: varchar("verification_method", { length: 50 }).notNull(), // 'signature', 'transaction', 'reverse_resolution'
  verificationData: text("verification_data"), // JSON object with verification details
  verifiedAt: timestamp("verified_at").defaultNow(),
  verificationTxHash: varchar("verification_tx_hash", { length: 66 }),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  walletAddressIdx: index("idx_ens_verifications_wallet_address").on(t.walletAddress),
  ensHandleIdx: index("idx_ens_verifications_ens_handle").on(t.ensHandle),
  isActiveIdx: index("idx_ens_verifications_is_active").on(t.isActive),
  expiresAtIdx: index("idx_ens_verifications_expires_at").on(t.expiresAt),
  uniqueActiveIdx: index("idx_ens_verifications_unique_active").on(t.walletAddress, t.ensHandle),
}));

// Export all marketplace tables
export const {
  marketplaceUsers,
  marketplaceProducts,
  marketplaceOrders,
  marketplaceDisputes,
  disputeJudges,
  marketplaceVerifications,
  sellerVerifications,
  marketplaceReviews,
  reviewHelpfulness,
  reviewReports,
  marketplaceAnalytics,
  marketplaceConfig
} = marketplaceSchema;

// Payment Transaction Tables for Order-Payment Integration

export const paymentTransactions = pgTable("payment_transactions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
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
  orderId: integer("order_id").references(() => orders.id).notNull(),
  receiptNumber: varchar("receipt_number", { length: 100 }).notNull().unique(),
  paymentMethod: varchar("payment_method", { length: 20 }).notNull(),
  amount: numeric("amount", { precision: 20, scale: 8 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
  fees: text("fees").notNull(), // JSON
  transactionDetails: text("transaction_details").notNull(), // JSON
  receiptUrl: varchar("receipt_url", { length: 500 }).notNull(),
  metadata: text("metadata"), // JSON
  createdAt: timestamp("created_at").defaultNow()
}, (t) => ({
  transactionIdIdx: index("idx_payment_receipts_transaction_id").on(t.transactionId),
  orderIdIdx: index("idx_payment_receipts_order_id").on(t.orderId),
  receiptNumberIdx: index("idx_payment_receipts_receipt_number").on(t.receiptNumber),
  paymentMethodIdx: index("idx_payment_receipts_payment_method").on(t.paymentMethod),
  createdAtIdx: index("idx_payment_receipts_created_at").on(t.createdAt)
}));

export const orderPaymentEvents = pgTable("order_payment_events", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
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
  postId: integer("post_id").references(() => posts.id, { onDelete: "cascade" }).notNull(),
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
export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }),
  participants: jsonb("participants").notNull(),
  lastMessageId: uuid("last_message_id"),
  lastActivity: timestamp("last_activity"),
  unreadCount: integer("unread_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  lastActivityIdx: index("idx_conversations_last_activity").on(t.lastActivity),
}));

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "cascade" }).notNull(),
  senderAddress: varchar("sender_address", { length: 66 }).notNull(),
  content: text("content").notNull(),
  sentAt: timestamp("timestamp").defaultNow(),
  editedAt: timestamp("edited_at"),
  deletedAt: timestamp("deleted_at"),
}, (t) => ({
  convoTimestampIdx: index("idx_chat_messages_conversation_id_timestamp").on(t.conversationId, t.sentAt),
}));