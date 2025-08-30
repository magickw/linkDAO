import { pgTable, uuid, varchar, text, timestamp, serial, integer, foreignKey, boolean, unique, numeric, index, primaryKey, bigint, date, inet } from "drizzle-orm/pg-core"



export const bots = pgTable("bots", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 128 }),
	persona: text(),
	scopes: text(),
	model: varchar({ length: 64 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const embeddings = pgTable("embeddings", {
	id: serial().primaryKey().notNull(),
	objectType: varchar("object_type", { length: 32 }),
	objectId: integer("object_id"),
	embedding: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const posts = pgTable("posts", {
	id: serial().primaryKey().notNull(),
	authorId: uuid("author_id"),
	contentCid: text("content_cid").notNull(),
	parentId: integer("parent_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.authorId],
		foreignColumns: [users.id],
		name: "posts_author_id_users_id_fk"
	}),
]);

export const proposals = pgTable("proposals", {
	id: serial().primaryKey().notNull(),
	daoId: uuid("dao_id"),
	titleCid: text("title_cid"),
	bodyCid: text("body_cid"),
	startBlock: integer("start_block"),
	endBlock: integer("end_block"),
	status: varchar({ length: 32 }).default('pending'),
});

export const payments = pgTable("payments", {
	id: serial().primaryKey().notNull(),
	from: uuid(),
	to: uuid(),
	token: varchar({ length: 64 }).notNull(),
	amount: varchar({ length: 128 }).notNull(),
	txHash: varchar("tx_hash", { length: 66 }),
	memo: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.from],
		foreignColumns: [users.id],
		name: "payments_from_users_id_fk"
	}),
	foreignKey({
		columns: [table.to],
		foreignColumns: [users.id],
		name: "payments_to_users_id_fk"
	}),
]);

export const reputations = pgTable("reputations", {
	walletAddress: varchar("wallet_address", { length: 66 }).primaryKey().notNull(),
	score: integer().notNull(),
	daoApproved: boolean("dao_approved").default(false),
});

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	walletAddress: varchar("wallet_address", { length: 66 }).notNull(),
	handle: varchar({ length: 64 }),
	profileCid: text("profile_cid"),
	physicalAddress: text("physical_address"), // JSON object for shipping/billing address
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("users_wallet_address_unique").on(table.walletAddress),
	unique("users_handle_unique").on(table.handle),
]);

export const postTags = pgTable("post_tags", {
	id: serial().primaryKey().notNull(),
	postId: integer("post_id"),
	tag: varchar({ length: 64 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const escrows = pgTable("escrows", {
	id: serial().primaryKey().notNull(),
	listingId: integer("listing_id"),
	buyerId: uuid("buyer_id"),
	sellerId: uuid("seller_id"),
	amount: numeric().notNull(),
	buyerApproved: boolean("buyer_approved").default(false),
	sellerApproved: boolean("seller_approved").default(false),
	disputeOpened: boolean("dispute_opened").default(false),
	resolverAddress: varchar("resolver_address", { length: 66 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	deliveryInfo: text("delivery_info"),
	deliveryConfirmed: boolean("delivery_confirmed").default(false),
}, (table) => [
	foreignKey({
		columns: [table.listingId],
		foreignColumns: [listings.id],
		name: "escrows_listing_id_listings_id_fk"
	}),
	foreignKey({
		columns: [table.buyerId],
		foreignColumns: [users.id],
		name: "escrows_buyer_id_users_id_fk"
	}),
	foreignKey({
		columns: [table.sellerId],
		foreignColumns: [users.id],
		name: "escrows_seller_id_users_id_fk"
	}),
]);

export const offers = pgTable("offers", {
	id: serial().primaryKey().notNull(),
	listingId: integer("listing_id"),
	buyerId: uuid("buyer_id"),
	amount: numeric().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	accepted: boolean().default(false),
});

export const disputes = pgTable("disputes", {
	id: serial().primaryKey().notNull(),
	escrowId: integer("escrow_id"),
	reporterId: uuid("reporter_id"),
	reason: text(),
	disputeType: varchar("dispute_type", { length: 64 }).default('other'),
	status: varchar({ length: 32 }).default('created'),
	resolutionMethod: varchar("resolution_method", { length: 32 }).default('community_arbitrator'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	evidenceDeadline: timestamp("evidence_deadline", { mode: 'string' }),
	votingDeadline: timestamp("voting_deadline", { mode: 'string' }),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	verdict: varchar({ length: 32 }),
	refundAmount: numeric("refund_amount"),
	resolverId: uuid("resolver_id"),
	resolution: text(),
	evidence: text(),
	escalatedToDAO: boolean("escalated_to_dao").default(false),
}, (table) => [
	foreignKey({
		columns: [table.escrowId],
		foreignColumns: [escrows.id],
		name: "disputes_escrow_id_escrows_id_fk"
	}),
	foreignKey({
		columns: [table.reporterId],
		foreignColumns: [users.id],
		name: "disputes_reporter_id_users_id_fk"
	}),
	foreignKey({
		columns: [table.resolverId],
		foreignColumns: [users.id],
		name: "disputes_resolver_id_users_id_fk"
	}),
]);

export const disputeEvidence = pgTable("dispute_evidence", {
	id: serial().primaryKey().notNull(),
	disputeId: integer("dispute_id"),
	submitterId: uuid("submitter_id"),
	evidenceType: varchar("evidence_type", { length: 32 }).notNull(),
	ipfsHash: varchar("ipfs_hash", { length: 128 }).notNull(),
	description: text(),
	timestamp: timestamp({ mode: 'string' }).defaultNow(),
	verified: boolean().default(false),
}, (table) => [
	foreignKey({
		columns: [table.disputeId],
		foreignColumns: [disputes.id],
		name: "dispute_evidence_dispute_id_disputes_id_fk"
	}),
	foreignKey({
		columns: [table.submitterId],
		foreignColumns: [users.id],
		name: "dispute_evidence_submitter_id_users_id_fk"
	}),
]);

export const disputeVotes = pgTable("dispute_votes", {
	id: serial().primaryKey().notNull(),
	disputeId: integer("dispute_id"),
	voterId: uuid("voter_id"),
	verdict: varchar({ length: 32 }).notNull(),
	votingPower: integer("voting_power").notNull(),
	reasoning: text(),
	timestamp: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.disputeId],
		foreignColumns: [disputes.id],
		name: "dispute_votes_dispute_id_disputes_id_fk"
	}),
	foreignKey({
		columns: [table.voterId],
		foreignColumns: [users.id],
		name: "dispute_votes_voter_id_users_id_fk"
	}),
	unique("dispute_votes_dispute_id_voter_id_unique").on(table.disputeId, table.voterId),
]);

export const arbitratorApplications = pgTable("arbitrator_applications", {
	id: serial().primaryKey().notNull(),
	applicantId: uuid("applicant_id"),
	qualifications: text().notNull(),
	experience: text(),
	reputationScore: integer("reputation_score").notNull(),
	casesHandled: integer("cases_handled").default(0),
	successRate: numeric("success_rate").default('0'),
	approved: boolean().default(false),
	appliedAt: timestamp("applied_at", { mode: 'string' }).defaultNow(),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
		columns: [table.applicantId],
		foreignColumns: [users.id],
		name: "arbitrator_applications_applicant_id_users_id_fk"
	}),
	unique("arbitrator_applications_applicant_id_unique").on(table.applicantId),
]);

export const disputeEvents = pgTable("dispute_events", {
	id: serial().primaryKey().notNull(),
	disputeId: integer("dispute_id"),
	eventType: varchar("event_type", { length: 64 }).notNull(),
	actorId: uuid("actor_id"),
	description: text(),
	metadata: text(),
	timestamp: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.disputeId],
		foreignColumns: [disputes.id],
		name: "dispute_events_dispute_id_disputes_id_fk"
	}),
	foreignKey({
		columns: [table.actorId],
		foreignColumns: [users.id],
		name: "dispute_events_actor_id_users_id_fk"
	}),
]);

export const orders = pgTable("orders", {
	id: serial().primaryKey().notNull(),
	listingId: integer("listing_id"),
	buyerId: uuid("buyer_id"),
	sellerId: uuid("seller_id"),
	escrowId: integer("escrow_id"),
	amount: numeric().notNull(),
	paymentToken: varchar("payment_token", { length: 66 }),
	status: varchar({ length: 32 }).default('pending'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	// Shipping address for physical items
	shippingStreet: varchar("shipping_street", { length: 200 }),
	shippingCity: varchar("shipping_city", { length: 100 }),
	shippingState: varchar("shipping_state", { length: 100 }),
	shippingPostalCode: varchar("shipping_postal_code", { length: 20 }),
	shippingCountry: varchar("shipping_country", { length: 100 }),
	shippingName: varchar("shipping_name", { length: 100 }),
	shippingPhone: varchar("shipping_phone", { length: 20 }),
});

export const reactions = pgTable("reactions", {
	id: serial().primaryKey().notNull(),
	postId: integer("post_id"),
	userId: uuid("user_id"),
	type: varchar({ length: 32 }).notNull(),
	amount: numeric().notNull(),
	rewardsEarned: numeric("rewards_earned").default('0'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const tips = pgTable("tips", {
	id: serial().primaryKey().notNull(),
	postId: integer("post_id"),
	fromUserId: uuid("from_user_id"),
	toUserId: uuid("to_user_id"),
	token: varchar({ length: 64 }).notNull(),
	amount: numeric().notNull(),
	message: text(),
	txHash: varchar("tx_hash", { length: 66 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const aiModeration = pgTable("ai_moderation", {
	id: serial().primaryKey().notNull(),
	objectType: varchar("object_type", { length: 32 }).notNull(),
	objectId: integer("object_id").notNull(),
	status: varchar({ length: 32 }).default('pending'),
	aiAnalysis: text("ai_analysis"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const listings = pgTable("listings", {
	id: serial().primaryKey().notNull(),
	sellerId: uuid("seller_id"),
	tokenAddress: varchar("token_address", { length: 66 }).notNull(),
	price: numeric().notNull(),
	quantity: integer().notNull(),
	itemType: varchar("item_type", { length: 32 }).notNull(),
	listingType: varchar("listing_type", { length: 32 }).notNull(),
	status: varchar({ length: 32 }).default('active'),
	startTime: timestamp("start_time", { mode: 'string' }).defaultNow(),
	endTime: timestamp("end_time", { mode: 'string' }),
	metadataUri: text("metadata_uri").notNull(),
	isEscrowed: boolean("is_escrowed").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	nftStandard: varchar("nft_standard", { length: 32 }),
	tokenId: varchar("token_id", { length: 128 }),
	highestBid: numeric("highest_bid"),
	highestBidder: varchar("highest_bidder", { length: 66 }),
	reservePrice: numeric("reserve_price"),
	minIncrement: numeric("min_increment"),
	reserveMet: boolean("reserve_met").default(false),
}, (table) => [
	foreignKey({
		columns: [table.sellerId],
		foreignColumns: [users.id],
		name: "listings_seller_id_users_id_fk"
	}),
]);

export const bids = pgTable("bids", {
	id: serial().primaryKey().notNull(),
	listingId: integer("listing_id"),
	bidderId: uuid("bidder_id"),
	amount: numeric().notNull(),
	timestamp: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.listingId],
		foreignColumns: [listings.id],
		name: "bids_listing_id_listings_id_fk"
	}),
	foreignKey({
		columns: [table.bidderId],
		foreignColumns: [users.id],
		name: "bids_bidder_id_users_id_fk"
	}),
]);

export const follows = pgTable("follows", {
	followerId: uuid("follower_id").notNull(),
	followingId: uuid("following_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("follow_idx").using("btree", table.followerId.asc().nullsLast().op("uuid_ops"), table.followingId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
		columns: [table.followerId],
		foreignColumns: [users.id],
		name: "follows_follower_id_users_id_fk"
	}),
	foreignKey({
		columns: [table.followingId],
		foreignColumns: [users.id],
		name: "follows_following_id_users_id_fk"
	}),
	primaryKey({ columns: [table.followerId, table.followingId], name: "follows_follower_id_following_id_pk" }),
]);
export const orderEvents = pgTable("order_events", {
	id: serial().primaryKey().notNull(),
	orderId: integer("order_id"),
	eventType: varchar("event_type", { length: 64 }).notNull(),
	description: text(),
	metadata: text(),
	timestamp: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.orderId],
		foreignColumns: [orders.id],
		name: "order_events_order_id_orders_id_fk"
	}),
]);

export const trackingRecords = pgTable("tracking_records", {
	id: serial().primaryKey().notNull(),
	orderId: integer("order_id"),
	trackingNumber: varchar("tracking_number", { length: 128 }).notNull(),
	carrier: varchar({ length: 32 }).notNull(),
	status: varchar({ length: 64 }),
	events: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	lastUpdated: timestamp("last_updated", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.orderId],
		foreignColumns: [orders.id],
		name: "tracking_records_order_id_orders_id_fk"
	}),
]);

export const notifications = pgTable("notifications", {
	id: serial().primaryKey().notNull(),
	orderId: varchar("order_id", { length: 64 }),
	userAddress: varchar("user_address", { length: 66 }).notNull(),
	type: varchar({ length: 64 }).notNull(),
	message: text().notNull(),
	metadata: text(),
	read: boolean().default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const notificationPreferences = pgTable("notification_preferences", {
	id: serial().primaryKey().notNull(),
	userAddress: varchar("user_address", { length: 66 }).notNull(),
	preferences: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("notification_preferences_user_address_unique").on(table.userAddress),
]);

export const pushTokens = pgTable("push_tokens", {
	id: serial().primaryKey().notNull(),
	userAddress: varchar("user_address", { length: 66 }).notNull(),
	token: varchar({ length: 255 }).notNull(),
	platform: varchar({ length: 32 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const blockchainEvents = pgTable("blockchain_events", {
	id: serial().primaryKey().notNull(),
	orderId: varchar("order_id", { length: 64 }),
	escrowId: varchar("escrow_id", { length: 64 }),
	eventType: varchar("event_type", { length: 64 }).notNull(),
	transactionHash: varchar("transaction_hash", { length: 66 }).notNull(),
	blockNumber: integer("block_number").notNull(),
	timestamp: timestamp({ mode: 'string' }).notNull(),
	data: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const syncStatus = pgTable("sync_status", {
	id: serial().primaryKey().notNull(),
	key: varchar({ length: 64 }).notNull(),
	value: text().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("sync_status_key_unique").on(table.key),
]);

export const reviews = pgTable("reviews", {
	id: serial().primaryKey().notNull(),
	reviewerId: uuid("reviewer_id").notNull(),
	revieweeId: uuid("reviewee_id").notNull(),
	orderId: integer("order_id").notNull(),
	listingId: integer("listing_id"),
	rating: integer().notNull(), // 1-5 stars
	title: varchar({ length: 200 }),
	comment: text(),
	ipfsHash: varchar("ipfs_hash", { length: 128 }), // For storing review content on IPFS
	blockchainTxHash: varchar("blockchain_tx_hash", { length: 66 }), // Transaction hash for blockchain verification
	verificationStatus: varchar("verification_status", { length: 32 }).default('pending'), // pending, verified, rejected
	helpfulVotes: integer("helpful_votes").default(0),
	reportCount: integer("report_count").default(0),
	moderationStatus: varchar("moderation_status", { length: 32 }).default('active'), // active, flagged, removed
	moderationReason: text("moderation_reason"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.reviewerId],
		foreignColumns: [users.id],
		name: "reviews_reviewer_id_users_id_fk"
	}),
	foreignKey({
		columns: [table.revieweeId],
		foreignColumns: [users.id],
		name: "reviews_reviewee_id_users_id_fk"
	}),
	foreignKey({
		columns: [table.orderId],
		foreignColumns: [orders.id],
		name: "reviews_order_id_orders_id_fk"
	}),
	foreignKey({
		columns: [table.listingId],
		foreignColumns: [listings.id],
		name: "reviews_listing_id_listings_id_fk"
	}),
	unique("reviews_reviewer_order_unique").on(table.reviewerId, table.orderId),
	index("reviews_reviewee_rating_idx").on(table.revieweeId, table.rating),
	index("reviews_created_at_idx").on(table.createdAt),
]);

export const reviewHelpfulness = pgTable("review_helpfulness", {
	id: serial().primaryKey().notNull(),
	reviewId: integer("review_id").notNull(),
	userId: uuid("user_id").notNull(),
	isHelpful: boolean("is_helpful").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.reviewId],
		foreignColumns: [reviews.id],
		name: "review_helpfulness_review_id_reviews_id_fk"
	}),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "review_helpfulness_user_id_users_id_fk"
	}),
	unique("review_helpfulness_review_user_unique").on(table.reviewId, table.userId),
]);

export const reviewReports = pgTable("review_reports", {
	id: serial().primaryKey().notNull(),
	reviewId: integer("review_id").notNull(),
	reporterId: uuid("reporter_id").notNull(),
	reason: varchar({ length: 100 }).notNull(), // spam, fake, inappropriate, etc.
	description: text(),
	status: varchar({ length: 32 }).default('pending'), // pending, reviewed, resolved, dismissed
	moderatorId: uuid("moderator_id"),
	moderatorNotes: text("moderator_notes"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
		columns: [table.reviewId],
		foreignColumns: [reviews.id],
		name: "review_reports_review_id_reviews_id_fk"
	}),
	foreignKey({
		columns: [table.reporterId],
		foreignColumns: [users.id],
		name: "review_reports_reporter_id_users_id_fk"
	}),
	foreignKey({
		columns: [table.moderatorId],
		foreignColumns: [users.id],
		name: "review_reports_moderator_id_users_id_fk"
	}),
]);

export const reputationHistory = pgTable("reputation_history", {
	id: serial().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	previousScore: integer("previous_score").notNull(),
	newScore: integer("new_score").notNull(),
	changeReason: varchar("change_reason", { length: 100 }).notNull(), // review_received, review_given, dispute_resolved, etc.
	relatedEntityType: varchar("related_entity_type", { length: 32 }), // review, dispute, order
	relatedEntityId: integer("related_entity_id"),
	calculationDetails: text("calculation_details"), // JSON with detailed calculation breakdown
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "reputation_history_user_id_users_id_fk"
	}),
	index("reputation_history_user_created_idx").on(table.userId, table.createdAt),
]);

export const nftCollections = pgTable("nft_collections", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	creatorId: uuid("creator_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	symbol: varchar({ length: 32 }).notNull(),
	description: text(),
	imageHash: varchar("image_hash", { length: 128 }).notNull(),
	contractAddress: varchar("contract_address", { length: 66 }),
	externalUrl: varchar("external_url", { length: 500 }),
	maxSupply: integer("max_supply"),
	currentSupply: integer("current_supply").default(0),
	mintPrice: varchar("mint_price", { length: 128 }).notNull(),
	isPublicMint: boolean("is_public_mint").default(false),
	royalty: integer().notNull(), // in basis points
	isVerified: boolean("is_verified").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.creatorId],
		foreignColumns: [users.id],
		name: "nft_collections_creator_id_users_id_fk"
	}),
	unique("nft_collections_contract_address_unique").on(table.contractAddress),
]);

export const nfts = pgTable("nfts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	creatorId: uuid("creator_id").notNull(),
	collectionId: uuid("collection_id"),
	tokenId: varchar("token_id", { length: 128 }),
	contractAddress: varchar("contract_address", { length: 66 }),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	imageHash: varchar("image_hash", { length: 128 }).notNull(),
	animationHash: varchar("animation_hash", { length: 128 }),
	metadataHash: varchar("metadata_hash", { length: 128 }).notNull(),
	metadataUri: varchar("metadata_uri", { length: 500 }).notNull(),
	attributes: text(), // JSON string of attributes
	royalty: integer().notNull(), // in basis points
	contentHash: varchar("content_hash", { length: 128 }).notNull(), // for duplicate detection
	externalUrl: varchar("external_url", { length: 500 }),
	isVerified: boolean("is_verified").default(false),
	verifiedAt: timestamp("verified_at", { mode: 'string' }),
	verifierId: uuid("verifier_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.creatorId],
		foreignColumns: [users.id],
		name: "nfts_creator_id_users_id_fk"
	}),
	foreignKey({
		columns: [table.collectionId],
		foreignColumns: [nftCollections.id],
		name: "nfts_collection_id_nft_collections_id_fk"
	}),
	foreignKey({
		columns: [table.verifierId],
		foreignColumns: [users.id],
		name: "nfts_verifier_id_users_id_fk"
	}),
	unique("nfts_content_hash_unique").on(table.contentHash),
	index("nfts_creator_created_idx").on(table.creatorId, table.createdAt),
	index("nfts_collection_idx").on(table.collectionId),
]);

export const nftListings = pgTable("nft_listings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	nftId: uuid("nft_id").notNull(),
	sellerId: uuid("seller_id").notNull(),
	price: varchar({ length: 128 }).notNull(), // in wei
	currency: varchar({ length: 66 }).notNull(), // 'ETH' or token contract address
	isActive: boolean("is_active").default(true),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.nftId],
		foreignColumns: [nfts.id],
		name: "nft_listings_nft_id_nfts_id_fk"
	}),
	foreignKey({
		columns: [table.sellerId],
		foreignColumns: [users.id],
		name: "nft_listings_seller_id_users_id_fk"
	}),
	index("nft_listings_active_idx").on(table.isActive, table.expiresAt),
]);

export const nftAuctions = pgTable("nft_auctions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	nftId: uuid("nft_id").notNull(),
	sellerId: uuid("seller_id").notNull(),
	startingPrice: varchar("starting_price", { length: 128 }).notNull(),
	reservePrice: varchar("reserve_price", { length: 128 }),
	currentBid: varchar("current_bid", { length: 128 }).default('0'),
	currentBidderId: uuid("current_bidder_id"),
	currency: varchar({ length: 66 }).notNull(),
	isActive: boolean("is_active").default(true),
	endTime: timestamp("end_time", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.nftId],
		foreignColumns: [nfts.id],
		name: "nft_auctions_nft_id_nfts_id_fk"
	}),
	foreignKey({
		columns: [table.sellerId],
		foreignColumns: [users.id],
		name: "nft_auctions_seller_id_users_id_fk"
	}),
	foreignKey({
		columns: [table.currentBidderId],
		foreignColumns: [users.id],
		name: "nft_auctions_current_bidder_id_users_id_fk"
	}),
	index("nft_auctions_active_idx").on(table.isActive, table.endTime),
]);

export const nftBids = pgTable("nft_bids", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	auctionId: uuid("auction_id").notNull(),
	bidderId: uuid("bidder_id").notNull(),
	amount: varchar({ length: 128 }).notNull(),
	transactionHash: varchar("transaction_hash", { length: 66 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.auctionId],
		foreignColumns: [nftAuctions.id],
		name: "nft_bids_auction_id_nft_auctions_id_fk"
	}),
	foreignKey({
		columns: [table.bidderId],
		foreignColumns: [users.id],
		name: "nft_bids_bidder_id_users_id_fk"
	}),
	index("nft_bids_auction_created_idx").on(table.auctionId, table.createdAt),
]);

export const nftOffers = pgTable("nft_offers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	nftId: uuid("nft_id").notNull(),
	buyerId: uuid("buyer_id").notNull(),
	amount: varchar({ length: 128 }).notNull(),
	currency: varchar({ length: 66 }).notNull(),
	isActive: boolean("is_active").default(true),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.nftId],
		foreignColumns: [nfts.id],
		name: "nft_offers_nft_id_nfts_id_fk"
	}),
	foreignKey({
		columns: [table.buyerId],
		foreignColumns: [users.id],
		name: "nft_offers_buyer_id_users_id_fk"
	}),
	index("nft_offers_active_idx").on(table.isActive, table.expiresAt),
]);

export const nftTransfers = pgTable("nft_transfers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	nftId: uuid("nft_id").notNull(),
	fromUserId: uuid("from_user_id"),
	toUserId: uuid("to_user_id").notNull(),
	transactionHash: varchar("transaction_hash", { length: 66 }).notNull(),
	blockNumber: integer("block_number").notNull(),
	price: varchar({ length: 128 }), // if it was a sale
	currency: varchar({ length: 66 }), // currency used for sale
	transferType: varchar("transfer_type", { length: 32 }).notNull(), // mint, sale, transfer, etc.
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.nftId],
		foreignColumns: [nfts.id],
		name: "nft_transfers_nft_id_nfts_id_fk"
	}),
	foreignKey({
		columns: [table.fromUserId],
		foreignColumns: [users.id],
		name: "nft_transfers_from_user_id_users_id_fk"
	}),
	foreignKey({
		columns: [table.toUserId],
		foreignColumns: [users.id],
		name: "nft_transfers_to_user_id_users_id_fk"
	}),
	index("nft_transfers_nft_created_idx").on(table.nftId, table.createdAt),
	unique("nft_transfers_transaction_hash_unique").on(table.transactionHash),
]);

// Digital Asset Management System Tables

export const digitalAssets = pgTable("digital_assets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	nftId: uuid("nft_id"),
	creatorId: uuid("creator_id").notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	assetType: varchar("asset_type", { length: 32 }).notNull(),
	fileSize: bigint("file_size", { mode: 'number' }).notNull(),
	fileFormat: varchar("file_format", { length: 32 }).notNull(),
	contentHash: varchar("content_hash", { length: 128 }).notNull(),
	encryptedContentHash: varchar("encrypted_content_hash", { length: 128 }).notNull(),
	encryptionKeyHash: varchar("encryption_key_hash", { length: 128 }).notNull(),
	previewHash: varchar("preview_hash", { length: 128 }),
	metadataHash: varchar("metadata_hash", { length: 128 }).notNull(),
	drmEnabled: boolean("drm_enabled").default(true),
	licenseType: varchar("license_type", { length: 32 }).notNull().default('standard'),
	licenseTerms: text("license_terms"),
	copyrightNotice: text("copyright_notice"),
	usageRestrictions: text("usage_restrictions"),
	downloadLimit: integer("download_limit").default(-1),
	streamingEnabled: boolean("streaming_enabled").default(false),
	watermarkEnabled: boolean("watermark_enabled").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.nftId],
		foreignColumns: [nfts.id],
		name: "digital_assets_nft_id_nfts_id_fk"
	}),
	foreignKey({
		columns: [table.creatorId],
		foreignColumns: [users.id],
		name: "digital_assets_creator_id_users_id_fk"
	}),
	unique("digital_assets_content_hash_unique").on(table.contentHash),
	index("digital_assets_creator_id_idx").on(table.creatorId),
	index("digital_assets_asset_type_idx").on(table.assetType),
	index("digital_assets_created_at_idx").on(table.createdAt),
]);

export const digitalAssetLicenses = pgTable("digital_asset_licenses", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	assetId: uuid("asset_id").notNull(),
	licenseName: varchar("license_name", { length: 100 }).notNull(),
	licenseType: varchar("license_type", { length: 32 }).notNull(),
	price: varchar({ length: 128 }).notNull(),
	currency: varchar({ length: 66 }).notNull(),
	usageRights: text("usage_rights").notNull(),
	restrictions: text(),
	durationDays: integer("duration_days"),
	maxDownloads: integer("max_downloads").default(-1),
	maxUsers: integer("max_users").default(1),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.assetId],
		foreignColumns: [digitalAssets.id],
		name: "digital_asset_licenses_asset_id_digital_assets_id_fk"
	}),
]);

export const digitalAssetPurchases = pgTable("digital_asset_purchases", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	assetId: uuid("asset_id").notNull(),
	licenseId: uuid("license_id").notNull(),
	buyerId: uuid("buyer_id").notNull(),
	sellerId: uuid("seller_id").notNull(),
	transactionHash: varchar("transaction_hash", { length: 66 }).notNull(),
	pricePaid: varchar("price_paid", { length: 128 }).notNull(),
	currency: varchar({ length: 66 }).notNull(),
	licenseKey: varchar("license_key", { length: 128 }).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	downloadsRemaining: integer("downloads_remaining").default(-1),
	isActive: boolean("is_active").default(true),
	purchasedAt: timestamp("purchased_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.assetId],
		foreignColumns: [digitalAssets.id],
		name: "digital_asset_purchases_asset_id_digital_assets_id_fk"
	}),
	foreignKey({
		columns: [table.licenseId],
		foreignColumns: [digitalAssetLicenses.id],
		name: "digital_asset_purchases_license_id_digital_asset_licenses_id_fk"
	}),
	foreignKey({
		columns: [table.buyerId],
		foreignColumns: [users.id],
		name: "digital_asset_purchases_buyer_id_users_id_fk"
	}),
	foreignKey({
		columns: [table.sellerId],
		foreignColumns: [users.id],
		name: "digital_asset_purchases_seller_id_users_id_fk"
	}),
	unique("digital_asset_purchases_license_key_unique").on(table.licenseKey),
	index("digital_asset_purchases_buyer_id_idx").on(table.buyerId),
	index("digital_asset_purchases_asset_id_idx").on(table.assetId),
]);

export const digitalAssetAccessLogs = pgTable("digital_asset_access_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	purchaseId: uuid("purchase_id").notNull(),
	assetId: uuid("asset_id").notNull(),
	userId: uuid("user_id").notNull(),
	accessType: varchar("access_type", { length: 32 }).notNull(),
	ipAddress: inet("ip_address"),
	userAgent: text("user_agent"),
	fileSizeAccessed: bigint("file_size_accessed", { mode: 'number' }),
	durationSeconds: integer("duration_seconds"),
	success: boolean().default(true),
	errorMessage: text("error_message"),
	accessedAt: timestamp("accessed_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.purchaseId],
		foreignColumns: [digitalAssetPurchases.id],
		name: "digital_asset_access_logs_purchase_id_digital_asset_purchases_id_fk"
	}),
	foreignKey({
		columns: [table.assetId],
		foreignColumns: [digitalAssets.id],
		name: "digital_asset_access_logs_asset_id_digital_assets_id_fk"
	}),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "digital_asset_access_logs_user_id_users_id_fk"
	}),
	index("digital_asset_access_logs_user_id_idx").on(table.userId),
	index("digital_asset_access_logs_accessed_at_idx").on(table.accessedAt),
]);

export const dmcaTakedownRequests = pgTable("dmca_takedown_requests", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	assetId: uuid("asset_id").notNull(),
	reporterId: uuid("reporter_id"),
	reporterName: varchar("reporter_name", { length: 255 }).notNull(),
	reporterEmail: varchar("reporter_email", { length: 255 }).notNull(),
	reporterOrganization: varchar("reporter_organization", { length: 255 }),
	copyrightHolderName: varchar("copyright_holder_name", { length: 255 }).notNull(),
	originalWorkDescription: text("original_work_description").notNull(),
	infringementDescription: text("infringement_description").notNull(),
	evidenceUrls: text("evidence_urls").array(),
	evidenceIpfsHashes: text("evidence_ipfs_hashes").array(),
	swornStatement: text("sworn_statement").notNull(),
	contactInformation: text("contact_information").notNull(),
	status: varchar({ length: 32 }).default('pending'),
	adminNotes: text("admin_notes"),
	processedBy: uuid("processed_by"),
	processedAt: timestamp("processed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.assetId],
		foreignColumns: [digitalAssets.id],
		name: "dmca_takedown_requests_asset_id_digital_assets_id_fk"
	}),
	foreignKey({
		columns: [table.reporterId],
		foreignColumns: [users.id],
		name: "dmca_takedown_requests_reporter_id_users_id_fk"
	}),
	foreignKey({
		columns: [table.processedBy],
		foreignColumns: [users.id],
		name: "dmca_takedown_requests_processed_by_users_id_fk"
	}),
	index("dmca_takedown_requests_status_idx").on(table.status),
]);

export const digitalAssetReports = pgTable("digital_asset_reports", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	assetId: uuid("asset_id").notNull(),
	reporterId: uuid("reporter_id").notNull(),
	reportType: varchar("report_type", { length: 32 }).notNull(),
	description: text().notNull(),
	evidenceIpfsHash: varchar("evidence_ipfs_hash", { length: 128 }),
	status: varchar({ length: 32 }).default('pending'),
	moderatorId: uuid("moderator_id"),
	moderatorNotes: text("moderator_notes"),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.assetId],
		foreignColumns: [digitalAssets.id],
		name: "digital_asset_reports_asset_id_digital_assets_id_fk"
	}),
	foreignKey({
		columns: [table.reporterId],
		foreignColumns: [users.id],
		name: "digital_asset_reports_reporter_id_users_id_fk"
	}),
	foreignKey({
		columns: [table.moderatorId],
		foreignColumns: [users.id],
		name: "digital_asset_reports_moderator_id_users_id_fk"
	}),
]);

export const digitalAssetAnalytics = pgTable("digital_asset_analytics", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	assetId: uuid("asset_id").notNull(),
	date: date().notNull(),
	totalDownloads: integer("total_downloads").default(0),
	totalStreams: integer("total_streams").default(0),
	totalPreviews: integer("total_previews").default(0),
	uniqueUsers: integer("unique_users").default(0),
	totalRevenue: varchar("total_revenue", { length: 128 }).default('0'),
	currency: varchar({ length: 66 }).default('ETH'),
	bandwidthUsed: bigint("bandwidth_used", { mode: 'number' }).default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.assetId],
		foreignColumns: [digitalAssets.id],
		name: "digital_asset_analytics_asset_id_digital_assets_id_fk"
	}),
	unique("digital_asset_analytics_asset_date_unique").on(table.assetId, table.date),
	index("digital_asset_analytics_date_idx").on(table.date),
]);

export const cdnAccessLogs = pgTable("cdn_access_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	assetId: uuid("asset_id").notNull(),
	userId: uuid("user_id"),
	cdnNode: varchar("cdn_node", { length: 100 }).notNull(),
	requestType: varchar("request_type", { length: 32 }).notNull(),
	responseTimeMs: integer("response_time_ms").notNull(),
	bytesTransferred: bigint("bytes_transferred", { mode: 'number' }).notNull(),
	cacheHit: boolean("cache_hit").default(false),
	ipAddress: inet("ip_address"),
	countryCode: varchar("country_code", { length: 2 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.assetId],
		foreignColumns: [digitalAssets.id],
		name: "cdn_access_logs_asset_id_digital_assets_id_fk"
	}),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "cdn_access_logs_user_id_users_id_fk"
	}),
	index("cdn_access_logs_created_at_idx").on(table.createdAt),
]);

export const drmKeys = pgTable("drm_keys", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	assetId: uuid("asset_id").notNull(),
	purchaseId: uuid("purchase_id").notNull(),
	keyType: varchar("key_type", { length: 32 }).notNull(),
	keyData: text("key_data").notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.assetId],
		foreignColumns: [digitalAssets.id],
		name: "drm_keys_asset_id_digital_assets_id_fk"
	}),
	foreignKey({
		columns: [table.purchaseId],
		foreignColumns: [digitalAssetPurchases.id],
		name: "drm_keys_purchase_id_digital_asset_purchases_id_fk"
	}),
]);

export const watermarkTemplates = pgTable("watermark_templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	creatorId: uuid("creator_id").notNull(),
	name: varchar({ length: 100 }).notNull(),
	templateType: varchar("template_type", { length: 32 }).notNull(),
	templateData: text("template_data").notNull(),
	isDefault: boolean("is_default").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.creatorId],
		foreignColumns: [users.id],
		name: "watermark_templates_creator_id_users_id_fk"
	}),
]);

export const contentVerification = pgTable("content_verification", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	assetId: uuid("asset_id").notNull(),
	verificationType: varchar("verification_type", { length: 32 }).notNull(),
	verificationData: text("verification_data").notNull(),
	status: varchar({ length: 32 }).notNull(),
	verifiedAt: timestamp("verified_at", { mode: 'string' }).defaultNow(),
	verifiedBy: uuid("verified_by"),
}, (table) => [
	foreignKey({
		columns: [table.assetId],
		foreignColumns: [digitalAssets.id],
		name: "content_verification_asset_id_digital_assets_id_fk"
	}),
	foreignKey({
		columns: [table.verifiedBy],
		foreignColumns: [users.id],
		name: "content_verification_verified_by_users_id_fk"
	}),
]);