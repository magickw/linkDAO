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
  dao: varchar("dao", { length: 64 }), // DAO community this post belongs to (legacy)
  communityId: uuid("community_id"), // New reference to communities table
  pollId: uuid("poll_id"), // Reference to poll if this is a poll post
  isTokenGated: boolean("is_token_gated").default(false), // Whether this post is token gated
  gatedContentPreview: text("gated_content_preview"), // Preview content for gated posts
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  authorFk: foreignKey({
    columns: [t.authorId],
    foreignColumns: [users.id]
  }),
  communityFk: foreignKey({
    columns: [t.communityId],
    foreignColumns: [communities.id]
  }),
  communityIdIdx: index("idx_posts_community_id").on(t.communityId),
  tokenGatedIdx: index("idx_posts_token_gated").on(t.isTokenGated),
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

// Views - track post views with deduplication
export const views = pgTable("views", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => posts.id),
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

// Bookmarks - user-saved posts
export const bookmarks = pgTable("bookmarks", {
  userId: uuid("user_id").notNull().references(() => users.id),
  postId: integer("post_id").notNull().references(() => posts.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  pk: primaryKey(t.userId, t.postId),
  userIdx: index("bookmark_user_idx").on(t.userId),
  postIdx: index("bookmark_post_idx").on(t.postId),
  userFk: foreignKey({
    columns: [t.userId],
    foreignColumns: [users.id]
  }),
  postFk: foreignKey({
    columns: [t.postId],
    foreignColumns: [posts.id]
  })
}));

// Shares - track when users share posts
export const shares = pgTable("shares", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => posts.id),
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
  // Seller profile API fields
  storeDescription: text("store_description"),
  isVerified: boolean("is_verified").default(false),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  onboardingSteps: jsonb("onboarding_steps").default('{"profile_setup": false, "verification": false, "payout_setup": false, "first_listing": false}'),
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
  treasuryAddress: varchar("treasury_address", { length: 66 }),
  governanceToken: varchar("governance_token", { length: 66 }),
  settings: text("settings"), // JSON CommunitySettings object
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  nameIdx: index("idx_communities_name").on(t.name),
  categoryIdx: index("idx_communities_category").on(t.category),
  isPublicIdx: index("idx_communities_is_public").on(t.isPublic),
  memberCountIdx: index("idx_communities_member_count").on(t.memberCount),
  createdAtIdx: index("idx_communities_created_at").on(t.createdAt),
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
  postId: integer("post_id").references(() => posts.id, { onDelete: 'cascade' }),
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
  postId: integer("post_id").references(() => posts.id, { onDelete: 'cascade' }),
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
// Note: Additional messaging tables defined above
export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }),
  participants: jsonb("participants").notNull(),
  lastMessageId: uuid("last_message_id"),
  lastActivity: timestamp("last_activity"),
  unreadCount: integer("unread_count").default(0),
  archivedBy: jsonb("archived_by").default("[]"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  lastActivityIdx: index("idx_conversations_last_activity").on(t.lastActivity),
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
  sentAt: timestamp("timestamp").defaultNow(),
  editedAt: timestamp("edited_at"),
  deletedAt: timestamp("deleted_at"),
}, (t) => ({
  convoTimestampIdx: index("idx_chat_messages_conversation_id_timestamp").on(t.conversationId, t.sentAt),
  replyToIdx: index("idx_chat_messages_reply_to").on(t.replyToId),
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

// Authentication System Tables
export const authSessions = pgTable("auth_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  walletAddress: varchar("wallet_address", { length: 66 }).notNull(),
  sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),
  refreshToken: varchar("refresh_token", { length: 255 }).notNull().unique(),
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