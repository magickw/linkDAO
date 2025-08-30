"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.follows = exports.bids = exports.listings = exports.aiModeration = exports.tips = exports.reactions = exports.orders = exports.disputes = exports.offers = exports.escrows = exports.postTags = exports.users = exports.reputations = exports.payments = exports.proposals = exports.posts = exports.embeddings = exports.bots = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.bots = (0, pg_core_1.pgTable)("bots", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    name: (0, pg_core_1.varchar)({ length: 128 }),
    persona: (0, pg_core_1.text)(),
    scopes: (0, pg_core_1.text)(),
    model: (0, pg_core_1.varchar)({ length: 64 }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
});
exports.embeddings = (0, pg_core_1.pgTable)("embeddings", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    objectType: (0, pg_core_1.varchar)("object_type", { length: 32 }),
    objectId: (0, pg_core_1.integer)("object_id"),
    embedding: (0, pg_core_1.text)(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
});
exports.posts = (0, pg_core_1.pgTable)("posts", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    authorId: (0, pg_core_1.uuid)("author_id"),
    contentCid: (0, pg_core_1.text)("content_cid").notNull(),
    parentId: (0, pg_core_1.integer)("parent_id"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.authorId],
        foreignColumns: [exports.users.id],
        name: "posts_author_id_users_id_fk"
    }),
]);
exports.proposals = (0, pg_core_1.pgTable)("proposals", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    daoId: (0, pg_core_1.uuid)("dao_id"),
    titleCid: (0, pg_core_1.text)("title_cid"),
    bodyCid: (0, pg_core_1.text)("body_cid"),
    startBlock: (0, pg_core_1.integer)("start_block"),
    endBlock: (0, pg_core_1.integer)("end_block"),
    status: (0, pg_core_1.varchar)({ length: 32 }).default('pending'),
});
exports.payments = (0, pg_core_1.pgTable)("payments", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    from: (0, pg_core_1.uuid)(),
    to: (0, pg_core_1.uuid)(),
    token: (0, pg_core_1.varchar)({ length: 64 }).notNull(),
    amount: (0, pg_core_1.varchar)({ length: 128 }).notNull(),
    txHash: (0, pg_core_1.varchar)("tx_hash", { length: 66 }),
    memo: (0, pg_core_1.text)(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.from],
        foreignColumns: [exports.users.id],
        name: "payments_from_users_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.to],
        foreignColumns: [exports.users.id],
        name: "payments_to_users_id_fk"
    }),
]);
exports.reputations = (0, pg_core_1.pgTable)("reputations", {
    walletAddress: (0, pg_core_1.varchar)("wallet_address", { length: 66 }).primaryKey().notNull(),
    score: (0, pg_core_1.integer)().notNull(),
    daoApproved: (0, pg_core_1.boolean)("dao_approved").default(false),
});
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    walletAddress: (0, pg_core_1.varchar)("wallet_address", { length: 66 }).notNull(),
    handle: (0, pg_core_1.varchar)({ length: 64 }),
    profileCid: (0, pg_core_1.text)("profile_cid"),
    physicalAddress: (0, pg_core_1.text)("physical_address"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.unique)("users_wallet_address_unique").on(table.walletAddress),
    (0, pg_core_1.unique)("users_handle_unique").on(table.handle),
]);
exports.postTags = (0, pg_core_1.pgTable)("post_tags", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    postId: (0, pg_core_1.integer)("post_id"),
    tag: (0, pg_core_1.varchar)({ length: 64 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
});
exports.escrows = (0, pg_core_1.pgTable)("escrows", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    listingId: (0, pg_core_1.integer)("listing_id"),
    buyerId: (0, pg_core_1.uuid)("buyer_id"),
    sellerId: (0, pg_core_1.uuid)("seller_id"),
    amount: (0, pg_core_1.numeric)().notNull(),
    buyerApproved: (0, pg_core_1.boolean)("buyer_approved").default(false),
    sellerApproved: (0, pg_core_1.boolean)("seller_approved").default(false),
    disputeOpened: (0, pg_core_1.boolean)("dispute_opened").default(false),
    resolverAddress: (0, pg_core_1.varchar)("resolver_address", { length: 66 }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
    resolvedAt: (0, pg_core_1.timestamp)("resolved_at", { mode: 'string' }),
    deliveryInfo: (0, pg_core_1.text)("delivery_info"),
    deliveryConfirmed: (0, pg_core_1.boolean)("delivery_confirmed").default(false),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.listingId],
        foreignColumns: [exports.listings.id],
        name: "escrows_listing_id_listings_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.buyerId],
        foreignColumns: [exports.users.id],
        name: "escrows_buyer_id_users_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.sellerId],
        foreignColumns: [exports.users.id],
        name: "escrows_seller_id_users_id_fk"
    }),
]);
exports.offers = (0, pg_core_1.pgTable)("offers", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    listingId: (0, pg_core_1.integer)("listing_id"),
    buyerId: (0, pg_core_1.uuid)("buyer_id"),
    amount: (0, pg_core_1.numeric)().notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
    accepted: (0, pg_core_1.boolean)().default(false),
});
exports.disputes = (0, pg_core_1.pgTable)("disputes", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    escrowId: (0, pg_core_1.integer)("escrow_id"),
    reporterId: (0, pg_core_1.uuid)("reporter_id"),
    reason: (0, pg_core_1.text)(),
    status: (0, pg_core_1.varchar)({ length: 32 }).default('open'),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
    resolvedAt: (0, pg_core_1.timestamp)("resolved_at", { mode: 'string' }),
    resolution: (0, pg_core_1.text)(),
    evidence: (0, pg_core_1.text)(),
});
exports.orders = (0, pg_core_1.pgTable)("orders", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    listingId: (0, pg_core_1.integer)("listing_id"),
    buyerId: (0, pg_core_1.uuid)("buyer_id"),
    sellerId: (0, pg_core_1.uuid)("seller_id"),
    escrowId: (0, pg_core_1.integer)("escrow_id"),
    amount: (0, pg_core_1.numeric)().notNull(),
    paymentToken: (0, pg_core_1.varchar)("payment_token", { length: 66 }),
    status: (0, pg_core_1.varchar)({ length: 32 }).default('pending'),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
    shippingStreet: (0, pg_core_1.varchar)("shipping_street", { length: 200 }),
    shippingCity: (0, pg_core_1.varchar)("shipping_city", { length: 100 }),
    shippingState: (0, pg_core_1.varchar)("shipping_state", { length: 100 }),
    shippingPostalCode: (0, pg_core_1.varchar)("shipping_postal_code", { length: 20 }),
    shippingCountry: (0, pg_core_1.varchar)("shipping_country", { length: 100 }),
    shippingName: (0, pg_core_1.varchar)("shipping_name", { length: 100 }),
    shippingPhone: (0, pg_core_1.varchar)("shipping_phone", { length: 20 }),
});
exports.reactions = (0, pg_core_1.pgTable)("reactions", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    postId: (0, pg_core_1.integer)("post_id"),
    userId: (0, pg_core_1.uuid)("user_id"),
    type: (0, pg_core_1.varchar)({ length: 32 }).notNull(),
    amount: (0, pg_core_1.numeric)().notNull(),
    rewardsEarned: (0, pg_core_1.numeric)("rewards_earned").default('0'),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
});
exports.tips = (0, pg_core_1.pgTable)("tips", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    postId: (0, pg_core_1.integer)("post_id"),
    fromUserId: (0, pg_core_1.uuid)("from_user_id"),
    toUserId: (0, pg_core_1.uuid)("to_user_id"),
    token: (0, pg_core_1.varchar)({ length: 64 }).notNull(),
    amount: (0, pg_core_1.numeric)().notNull(),
    message: (0, pg_core_1.text)(),
    txHash: (0, pg_core_1.varchar)("tx_hash", { length: 66 }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
});
exports.aiModeration = (0, pg_core_1.pgTable)("ai_moderation", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    objectType: (0, pg_core_1.varchar)("object_type", { length: 32 }).notNull(),
    objectId: (0, pg_core_1.integer)("object_id").notNull(),
    status: (0, pg_core_1.varchar)({ length: 32 }).default('pending'),
    aiAnalysis: (0, pg_core_1.text)("ai_analysis"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).defaultNow(),
});
exports.listings = (0, pg_core_1.pgTable)("listings", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    sellerId: (0, pg_core_1.uuid)("seller_id"),
    tokenAddress: (0, pg_core_1.varchar)("token_address", { length: 66 }).notNull(),
    price: (0, pg_core_1.numeric)().notNull(),
    quantity: (0, pg_core_1.integer)().notNull(),
    itemType: (0, pg_core_1.varchar)("item_type", { length: 32 }).notNull(),
    listingType: (0, pg_core_1.varchar)("listing_type", { length: 32 }).notNull(),
    status: (0, pg_core_1.varchar)({ length: 32 }).default('active'),
    startTime: (0, pg_core_1.timestamp)("start_time", { mode: 'string' }).defaultNow(),
    endTime: (0, pg_core_1.timestamp)("end_time", { mode: 'string' }),
    metadataUri: (0, pg_core_1.text)("metadata_uri").notNull(),
    isEscrowed: (0, pg_core_1.boolean)("is_escrowed").default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).defaultNow(),
    nftStandard: (0, pg_core_1.varchar)("nft_standard", { length: 32 }),
    tokenId: (0, pg_core_1.varchar)("token_id", { length: 128 }),
    highestBid: (0, pg_core_1.numeric)("highest_bid"),
    highestBidder: (0, pg_core_1.varchar)("highest_bidder", { length: 66 }),
    reservePrice: (0, pg_core_1.numeric)("reserve_price"),
    minIncrement: (0, pg_core_1.numeric)("min_increment"),
    reserveMet: (0, pg_core_1.boolean)("reserve_met").default(false),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.sellerId],
        foreignColumns: [exports.users.id],
        name: "listings_seller_id_users_id_fk"
    }),
]);
exports.bids = (0, pg_core_1.pgTable)("bids", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    listingId: (0, pg_core_1.integer)("listing_id"),
    bidderId: (0, pg_core_1.uuid)("bidder_id"),
    amount: (0, pg_core_1.numeric)().notNull(),
    timestamp: (0, pg_core_1.timestamp)({ mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.listingId],
        foreignColumns: [exports.listings.id],
        name: "bids_listing_id_listings_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.bidderId],
        foreignColumns: [exports.users.id],
        name: "bids_bidder_id_users_id_fk"
    }),
]);
exports.follows = (0, pg_core_1.pgTable)("follows", {
    followerId: (0, pg_core_1.uuid)("follower_id").notNull(),
    followingId: (0, pg_core_1.uuid)("following_id").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("follow_idx").using("btree", table.followerId.asc().nullsLast().op("uuid_ops"), table.followingId.asc().nullsLast().op("uuid_ops")),
    (0, pg_core_1.foreignKey)({
        columns: [table.followerId],
        foreignColumns: [exports.users.id],
        name: "follows_follower_id_users_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.followingId],
        foreignColumns: [exports.users.id],
        name: "follows_following_id_users_id_fk"
    }),
    (0, pg_core_1.primaryKey)({ columns: [table.followerId, table.followingId], name: "follows_follower_id_following_id_pk" }),
]);
//# sourceMappingURL=schema.js.map