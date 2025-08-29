import { pgTable, uuid, varchar, text, timestamp, serial, integer, foreignKey, boolean, unique, numeric, index, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



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
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	// Physical address fields for marketplace logistics
	physicalStreet: varchar("physical_street", { length: 200 }),
	physicalCity: varchar("physical_city", { length: 100 }),
	physicalState: varchar("physical_state", { length: 100 }),
	physicalPostalCode: varchar("physical_postal_code", { length: 20 }),
	physicalCountry: varchar("physical_country", { length: 100 }),
	physicalAddressType: varchar("physical_address_type", { length: 20 }), // 'shipping' or 'billing'
	physicalIsDefault: boolean("physical_is_default").default(false),
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
	status: varchar({ length: 32 }).default('open'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	resolution: text(),
	evidence: text(),
});

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
