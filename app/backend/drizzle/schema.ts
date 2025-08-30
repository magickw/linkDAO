import { pgTable, uuid, varchar, text, timestamp, serial, integer, foreignKey, boolean, unique, numeric, index, primaryKey } from "drizzle-orm/pg-core"



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