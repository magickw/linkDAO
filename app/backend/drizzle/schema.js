"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.watermarkTemplates = exports.drmKeys = exports.cdnAccessLogs = exports.digitalAssetAnalytics = exports.digitalAssetReports = exports.dmcaTakedownRequests = exports.digitalAssetAccessLogs = exports.digitalAssetPurchases = exports.digitalAssetLicenses = exports.digitalAssets = exports.nftTransfers = exports.nftOffers = exports.nftBids = exports.nftAuctions = exports.nftListings = exports.nfts = exports.nftCollections = exports.reputationHistory = exports.reviewReports = exports.reviewHelpfulness = exports.reviews = exports.syncStatus = exports.blockchainEvents = exports.pushTokens = exports.notificationPreferences = exports.notifications = exports.trackingRecords = exports.orderEvents = exports.follows = exports.bids = exports.listings = exports.aiModeration = exports.tips = exports.reactions = exports.orders = exports.disputeEvents = exports.arbitratorApplications = exports.disputeVotes = exports.disputeEvidence = exports.disputes = exports.offers = exports.escrows = exports.postTags = exports.users = exports.reputations = exports.payments = exports.proposals = exports.posts = exports.embeddings = exports.bots = void 0;
exports.contentVerification = void 0;
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
    disputeType: (0, pg_core_1.varchar)("dispute_type", { length: 64 }).default('other'),
    status: (0, pg_core_1.varchar)({ length: 32 }).default('created'),
    resolutionMethod: (0, pg_core_1.varchar)("resolution_method", { length: 32 }).default('community_arbitrator'),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
    evidenceDeadline: (0, pg_core_1.timestamp)("evidence_deadline", { mode: 'string' }),
    votingDeadline: (0, pg_core_1.timestamp)("voting_deadline", { mode: 'string' }),
    resolvedAt: (0, pg_core_1.timestamp)("resolved_at", { mode: 'string' }),
    verdict: (0, pg_core_1.varchar)({ length: 32 }),
    refundAmount: (0, pg_core_1.numeric)("refund_amount"),
    resolverId: (0, pg_core_1.uuid)("resolver_id"),
    resolution: (0, pg_core_1.text)(),
    evidence: (0, pg_core_1.text)(),
    escalatedToDAO: (0, pg_core_1.boolean)("escalated_to_dao").default(false),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.escrowId],
        foreignColumns: [exports.escrows.id],
        name: "disputes_escrow_id_escrows_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.reporterId],
        foreignColumns: [exports.users.id],
        name: "disputes_reporter_id_users_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.resolverId],
        foreignColumns: [exports.users.id],
        name: "disputes_resolver_id_users_id_fk"
    }),
]);
exports.disputeEvidence = (0, pg_core_1.pgTable)("dispute_evidence", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    disputeId: (0, pg_core_1.integer)("dispute_id"),
    submitterId: (0, pg_core_1.uuid)("submitter_id"),
    evidenceType: (0, pg_core_1.varchar)("evidence_type", { length: 32 }).notNull(),
    ipfsHash: (0, pg_core_1.varchar)("ipfs_hash", { length: 128 }).notNull(),
    description: (0, pg_core_1.text)(),
    timestamp: (0, pg_core_1.timestamp)({ mode: 'string' }).defaultNow(),
    verified: (0, pg_core_1.boolean)().default(false),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.disputeId],
        foreignColumns: [exports.disputes.id],
        name: "dispute_evidence_dispute_id_disputes_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.submitterId],
        foreignColumns: [exports.users.id],
        name: "dispute_evidence_submitter_id_users_id_fk"
    }),
]);
exports.disputeVotes = (0, pg_core_1.pgTable)("dispute_votes", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    disputeId: (0, pg_core_1.integer)("dispute_id"),
    voterId: (0, pg_core_1.uuid)("voter_id"),
    verdict: (0, pg_core_1.varchar)({ length: 32 }).notNull(),
    votingPower: (0, pg_core_1.integer)("voting_power").notNull(),
    reasoning: (0, pg_core_1.text)(),
    timestamp: (0, pg_core_1.timestamp)({ mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.disputeId],
        foreignColumns: [exports.disputes.id],
        name: "dispute_votes_dispute_id_disputes_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.voterId],
        foreignColumns: [exports.users.id],
        name: "dispute_votes_voter_id_users_id_fk"
    }),
    (0, pg_core_1.unique)("dispute_votes_dispute_id_voter_id_unique").on(table.disputeId, table.voterId),
]);
exports.arbitratorApplications = (0, pg_core_1.pgTable)("arbitrator_applications", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    applicantId: (0, pg_core_1.uuid)("applicant_id"),
    qualifications: (0, pg_core_1.text)().notNull(),
    experience: (0, pg_core_1.text)(),
    reputationScore: (0, pg_core_1.integer)("reputation_score").notNull(),
    casesHandled: (0, pg_core_1.integer)("cases_handled").default(0),
    successRate: (0, pg_core_1.numeric)("success_rate").default('0'),
    approved: (0, pg_core_1.boolean)().default(false),
    appliedAt: (0, pg_core_1.timestamp)("applied_at", { mode: 'string' }).defaultNow(),
    approvedAt: (0, pg_core_1.timestamp)("approved_at", { mode: 'string' }),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.applicantId],
        foreignColumns: [exports.users.id],
        name: "arbitrator_applications_applicant_id_users_id_fk"
    }),
    (0, pg_core_1.unique)("arbitrator_applications_applicant_id_unique").on(table.applicantId),
]);
exports.disputeEvents = (0, pg_core_1.pgTable)("dispute_events", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    disputeId: (0, pg_core_1.integer)("dispute_id"),
    eventType: (0, pg_core_1.varchar)("event_type", { length: 64 }).notNull(),
    actorId: (0, pg_core_1.uuid)("actor_id"),
    description: (0, pg_core_1.text)(),
    metadata: (0, pg_core_1.text)(),
    timestamp: (0, pg_core_1.timestamp)({ mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.disputeId],
        foreignColumns: [exports.disputes.id],
        name: "dispute_events_dispute_id_disputes_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.actorId],
        foreignColumns: [exports.users.id],
        name: "dispute_events_actor_id_users_id_fk"
    }),
]);
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
exports.orderEvents = (0, pg_core_1.pgTable)("order_events", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    orderId: (0, pg_core_1.integer)("order_id"),
    eventType: (0, pg_core_1.varchar)("event_type", { length: 64 }).notNull(),
    description: (0, pg_core_1.text)(),
    metadata: (0, pg_core_1.text)(),
    timestamp: (0, pg_core_1.timestamp)({ mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.orderId],
        foreignColumns: [exports.orders.id],
        name: "order_events_order_id_orders_id_fk"
    }),
]);
exports.trackingRecords = (0, pg_core_1.pgTable)("tracking_records", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    orderId: (0, pg_core_1.integer)("order_id"),
    trackingNumber: (0, pg_core_1.varchar)("tracking_number", { length: 128 }).notNull(),
    carrier: (0, pg_core_1.varchar)({ length: 32 }).notNull(),
    status: (0, pg_core_1.varchar)({ length: 64 }),
    events: (0, pg_core_1.text)(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
    lastUpdated: (0, pg_core_1.timestamp)("last_updated", { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.orderId],
        foreignColumns: [exports.orders.id],
        name: "tracking_records_order_id_orders_id_fk"
    }),
]);
exports.notifications = (0, pg_core_1.pgTable)("notifications", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    orderId: (0, pg_core_1.varchar)("order_id", { length: 64 }),
    userAddress: (0, pg_core_1.varchar)("user_address", { length: 66 }).notNull(),
    type: (0, pg_core_1.varchar)({ length: 64 }).notNull(),
    message: (0, pg_core_1.text)().notNull(),
    metadata: (0, pg_core_1.text)(),
    read: (0, pg_core_1.boolean)().default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
});
exports.notificationPreferences = (0, pg_core_1.pgTable)("notification_preferences", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    userAddress: (0, pg_core_1.varchar)("user_address", { length: 66 }).notNull(),
    preferences: (0, pg_core_1.text)().notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.unique)("notification_preferences_user_address_unique").on(table.userAddress),
]);
exports.pushTokens = (0, pg_core_1.pgTable)("push_tokens", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    userAddress: (0, pg_core_1.varchar)("user_address", { length: 66 }).notNull(),
    token: (0, pg_core_1.varchar)({ length: 255 }).notNull(),
    platform: (0, pg_core_1.varchar)({ length: 32 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
});
exports.blockchainEvents = (0, pg_core_1.pgTable)("blockchain_events", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    orderId: (0, pg_core_1.varchar)("order_id", { length: 64 }),
    escrowId: (0, pg_core_1.varchar)("escrow_id", { length: 64 }),
    eventType: (0, pg_core_1.varchar)("event_type", { length: 64 }).notNull(),
    transactionHash: (0, pg_core_1.varchar)("transaction_hash", { length: 66 }).notNull(),
    blockNumber: (0, pg_core_1.integer)("block_number").notNull(),
    timestamp: (0, pg_core_1.timestamp)({ mode: 'string' }).notNull(),
    data: (0, pg_core_1.text)(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
});
exports.syncStatus = (0, pg_core_1.pgTable)("sync_status", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    key: (0, pg_core_1.varchar)({ length: 64 }).notNull(),
    value: (0, pg_core_1.text)().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.unique)("sync_status_key_unique").on(table.key),
]);
exports.reviews = (0, pg_core_1.pgTable)("reviews", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    reviewerId: (0, pg_core_1.uuid)("reviewer_id").notNull(),
    revieweeId: (0, pg_core_1.uuid)("reviewee_id").notNull(),
    orderId: (0, pg_core_1.integer)("order_id").notNull(),
    listingId: (0, pg_core_1.integer)("listing_id"),
    rating: (0, pg_core_1.integer)().notNull(),
    title: (0, pg_core_1.varchar)({ length: 200 }),
    comment: (0, pg_core_1.text)(),
    ipfsHash: (0, pg_core_1.varchar)("ipfs_hash", { length: 128 }),
    blockchainTxHash: (0, pg_core_1.varchar)("blockchain_tx_hash", { length: 66 }),
    verificationStatus: (0, pg_core_1.varchar)("verification_status", { length: 32 }).default('pending'),
    helpfulVotes: (0, pg_core_1.integer)("helpful_votes").default(0),
    reportCount: (0, pg_core_1.integer)("report_count").default(0),
    moderationStatus: (0, pg_core_1.varchar)("moderation_status", { length: 32 }).default('active'),
    moderationReason: (0, pg_core_1.text)("moderation_reason"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.reviewerId],
        foreignColumns: [exports.users.id],
        name: "reviews_reviewer_id_users_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.revieweeId],
        foreignColumns: [exports.users.id],
        name: "reviews_reviewee_id_users_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.orderId],
        foreignColumns: [exports.orders.id],
        name: "reviews_order_id_orders_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.listingId],
        foreignColumns: [exports.listings.id],
        name: "reviews_listing_id_listings_id_fk"
    }),
    (0, pg_core_1.unique)("reviews_reviewer_order_unique").on(table.reviewerId, table.orderId),
    (0, pg_core_1.index)("reviews_reviewee_rating_idx").on(table.revieweeId, table.rating),
    (0, pg_core_1.index)("reviews_created_at_idx").on(table.createdAt),
]);
exports.reviewHelpfulness = (0, pg_core_1.pgTable)("review_helpfulness", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    reviewId: (0, pg_core_1.integer)("review_id").notNull(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    isHelpful: (0, pg_core_1.boolean)("is_helpful").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.reviewId],
        foreignColumns: [exports.reviews.id],
        name: "review_helpfulness_review_id_reviews_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "review_helpfulness_user_id_users_id_fk"
    }),
    (0, pg_core_1.unique)("review_helpfulness_review_user_unique").on(table.reviewId, table.userId),
]);
exports.reviewReports = (0, pg_core_1.pgTable)("review_reports", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    reviewId: (0, pg_core_1.integer)("review_id").notNull(),
    reporterId: (0, pg_core_1.uuid)("reporter_id").notNull(),
    reason: (0, pg_core_1.varchar)({ length: 100 }).notNull(),
    description: (0, pg_core_1.text)(),
    status: (0, pg_core_1.varchar)({ length: 32 }).default('pending'),
    moderatorId: (0, pg_core_1.uuid)("moderator_id"),
    moderatorNotes: (0, pg_core_1.text)("moderator_notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
    resolvedAt: (0, pg_core_1.timestamp)("resolved_at", { mode: 'string' }),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.reviewId],
        foreignColumns: [exports.reviews.id],
        name: "review_reports_review_id_reviews_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.reporterId],
        foreignColumns: [exports.users.id],
        name: "review_reports_reporter_id_users_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.moderatorId],
        foreignColumns: [exports.users.id],
        name: "review_reports_moderator_id_users_id_fk"
    }),
]);
exports.reputationHistory = (0, pg_core_1.pgTable)("reputation_history", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    previousScore: (0, pg_core_1.integer)("previous_score").notNull(),
    newScore: (0, pg_core_1.integer)("new_score").notNull(),
    changeReason: (0, pg_core_1.varchar)("change_reason", { length: 100 }).notNull(),
    relatedEntityType: (0, pg_core_1.varchar)("related_entity_type", { length: 32 }),
    relatedEntityId: (0, pg_core_1.integer)("related_entity_id"),
    calculationDetails: (0, pg_core_1.text)("calculation_details"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "reputation_history_user_id_users_id_fk"
    }),
    (0, pg_core_1.index)("reputation_history_user_created_idx").on(table.userId, table.createdAt),
]);
exports.nftCollections = (0, pg_core_1.pgTable)("nft_collections", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    creatorId: (0, pg_core_1.uuid)("creator_id").notNull(),
    name: (0, pg_core_1.varchar)({ length: 255 }).notNull(),
    symbol: (0, pg_core_1.varchar)({ length: 32 }).notNull(),
    description: (0, pg_core_1.text)(),
    imageHash: (0, pg_core_1.varchar)("image_hash", { length: 128 }).notNull(),
    contractAddress: (0, pg_core_1.varchar)("contract_address", { length: 66 }),
    externalUrl: (0, pg_core_1.varchar)("external_url", { length: 500 }),
    maxSupply: (0, pg_core_1.integer)("max_supply"),
    currentSupply: (0, pg_core_1.integer)("current_supply").default(0),
    mintPrice: (0, pg_core_1.varchar)("mint_price", { length: 128 }).notNull(),
    isPublicMint: (0, pg_core_1.boolean)("is_public_mint").default(false),
    royalty: (0, pg_core_1.integer)().notNull(),
    isVerified: (0, pg_core_1.boolean)("is_verified").default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.creatorId],
        foreignColumns: [exports.users.id],
        name: "nft_collections_creator_id_users_id_fk"
    }),
    (0, pg_core_1.unique)("nft_collections_contract_address_unique").on(table.contractAddress),
]);
exports.nfts = (0, pg_core_1.pgTable)("nfts", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    creatorId: (0, pg_core_1.uuid)("creator_id").notNull(),
    collectionId: (0, pg_core_1.uuid)("collection_id"),
    tokenId: (0, pg_core_1.varchar)("token_id", { length: 128 }),
    contractAddress: (0, pg_core_1.varchar)("contract_address", { length: 66 }),
    name: (0, pg_core_1.varchar)({ length: 255 }).notNull(),
    description: (0, pg_core_1.text)(),
    imageHash: (0, pg_core_1.varchar)("image_hash", { length: 128 }).notNull(),
    animationHash: (0, pg_core_1.varchar)("animation_hash", { length: 128 }),
    metadataHash: (0, pg_core_1.varchar)("metadata_hash", { length: 128 }).notNull(),
    metadataUri: (0, pg_core_1.varchar)("metadata_uri", { length: 500 }).notNull(),
    attributes: (0, pg_core_1.text)(),
    royalty: (0, pg_core_1.integer)().notNull(),
    contentHash: (0, pg_core_1.varchar)("content_hash", { length: 128 }).notNull(),
    externalUrl: (0, pg_core_1.varchar)("external_url", { length: 500 }),
    isVerified: (0, pg_core_1.boolean)("is_verified").default(false),
    verifiedAt: (0, pg_core_1.timestamp)("verified_at", { mode: 'string' }),
    verifierId: (0, pg_core_1.uuid)("verifier_id"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.creatorId],
        foreignColumns: [exports.users.id],
        name: "nfts_creator_id_users_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.collectionId],
        foreignColumns: [exports.nftCollections.id],
        name: "nfts_collection_id_nft_collections_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.verifierId],
        foreignColumns: [exports.users.id],
        name: "nfts_verifier_id_users_id_fk"
    }),
    (0, pg_core_1.unique)("nfts_content_hash_unique").on(table.contentHash),
    (0, pg_core_1.index)("nfts_creator_created_idx").on(table.creatorId, table.createdAt),
    (0, pg_core_1.index)("nfts_collection_idx").on(table.collectionId),
]);
exports.nftListings = (0, pg_core_1.pgTable)("nft_listings", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    nftId: (0, pg_core_1.uuid)("nft_id").notNull(),
    sellerId: (0, pg_core_1.uuid)("seller_id").notNull(),
    price: (0, pg_core_1.varchar)({ length: 128 }).notNull(),
    currency: (0, pg_core_1.varchar)({ length: 66 }).notNull(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    expiresAt: (0, pg_core_1.timestamp)("expires_at", { mode: 'string' }).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.nftId],
        foreignColumns: [exports.nfts.id],
        name: "nft_listings_nft_id_nfts_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.sellerId],
        foreignColumns: [exports.users.id],
        name: "nft_listings_seller_id_users_id_fk"
    }),
    (0, pg_core_1.index)("nft_listings_active_idx").on(table.isActive, table.expiresAt),
]);
exports.nftAuctions = (0, pg_core_1.pgTable)("nft_auctions", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    nftId: (0, pg_core_1.uuid)("nft_id").notNull(),
    sellerId: (0, pg_core_1.uuid)("seller_id").notNull(),
    startingPrice: (0, pg_core_1.varchar)("starting_price", { length: 128 }).notNull(),
    reservePrice: (0, pg_core_1.varchar)("reserve_price", { length: 128 }),
    currentBid: (0, pg_core_1.varchar)("current_bid", { length: 128 }).default('0'),
    currentBidderId: (0, pg_core_1.uuid)("current_bidder_id"),
    currency: (0, pg_core_1.varchar)({ length: 66 }).notNull(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    endTime: (0, pg_core_1.timestamp)("end_time", { mode: 'string' }).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.nftId],
        foreignColumns: [exports.nfts.id],
        name: "nft_auctions_nft_id_nfts_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.sellerId],
        foreignColumns: [exports.users.id],
        name: "nft_auctions_seller_id_users_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.currentBidderId],
        foreignColumns: [exports.users.id],
        name: "nft_auctions_current_bidder_id_users_id_fk"
    }),
    (0, pg_core_1.index)("nft_auctions_active_idx").on(table.isActive, table.endTime),
]);
exports.nftBids = (0, pg_core_1.pgTable)("nft_bids", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    auctionId: (0, pg_core_1.uuid)("auction_id").notNull(),
    bidderId: (0, pg_core_1.uuid)("bidder_id").notNull(),
    amount: (0, pg_core_1.varchar)({ length: 128 }).notNull(),
    transactionHash: (0, pg_core_1.varchar)("transaction_hash", { length: 66 }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.auctionId],
        foreignColumns: [exports.nftAuctions.id],
        name: "nft_bids_auction_id_nft_auctions_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.bidderId],
        foreignColumns: [exports.users.id],
        name: "nft_bids_bidder_id_users_id_fk"
    }),
    (0, pg_core_1.index)("nft_bids_auction_created_idx").on(table.auctionId, table.createdAt),
]);
exports.nftOffers = (0, pg_core_1.pgTable)("nft_offers", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    nftId: (0, pg_core_1.uuid)("nft_id").notNull(),
    buyerId: (0, pg_core_1.uuid)("buyer_id").notNull(),
    amount: (0, pg_core_1.varchar)({ length: 128 }).notNull(),
    currency: (0, pg_core_1.varchar)({ length: 66 }).notNull(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    expiresAt: (0, pg_core_1.timestamp)("expires_at", { mode: 'string' }).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.nftId],
        foreignColumns: [exports.nfts.id],
        name: "nft_offers_nft_id_nfts_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.buyerId],
        foreignColumns: [exports.users.id],
        name: "nft_offers_buyer_id_users_id_fk"
    }),
    (0, pg_core_1.index)("nft_offers_active_idx").on(table.isActive, table.expiresAt),
]);
exports.nftTransfers = (0, pg_core_1.pgTable)("nft_transfers", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    nftId: (0, pg_core_1.uuid)("nft_id").notNull(),
    fromUserId: (0, pg_core_1.uuid)("from_user_id"),
    toUserId: (0, pg_core_1.uuid)("to_user_id").notNull(),
    transactionHash: (0, pg_core_1.varchar)("transaction_hash", { length: 66 }).notNull(),
    blockNumber: (0, pg_core_1.integer)("block_number").notNull(),
    price: (0, pg_core_1.varchar)({ length: 128 }),
    currency: (0, pg_core_1.varchar)({ length: 66 }),
    transferType: (0, pg_core_1.varchar)("transfer_type", { length: 32 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.nftId],
        foreignColumns: [exports.nfts.id],
        name: "nft_transfers_nft_id_nfts_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.fromUserId],
        foreignColumns: [exports.users.id],
        name: "nft_transfers_from_user_id_users_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.toUserId],
        foreignColumns: [exports.users.id],
        name: "nft_transfers_to_user_id_users_id_fk"
    }),
    (0, pg_core_1.index)("nft_transfers_nft_created_idx").on(table.nftId, table.createdAt),
    (0, pg_core_1.unique)("nft_transfers_transaction_hash_unique").on(table.transactionHash),
]);
exports.digitalAssets = (0, pg_core_1.pgTable)("digital_assets", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    nftId: (0, pg_core_1.uuid)("nft_id"),
    creatorId: (0, pg_core_1.uuid)("creator_id").notNull(),
    title: (0, pg_core_1.varchar)({ length: 255 }).notNull(),
    description: (0, pg_core_1.text)(),
    assetType: (0, pg_core_1.varchar)("asset_type", { length: 32 }).notNull(),
    fileSize: (0, pg_core_1.bigint)("file_size", { mode: 'number' }).notNull(),
    fileFormat: (0, pg_core_1.varchar)("file_format", { length: 32 }).notNull(),
    contentHash: (0, pg_core_1.varchar)("content_hash", { length: 128 }).notNull(),
    encryptedContentHash: (0, pg_core_1.varchar)("encrypted_content_hash", { length: 128 }).notNull(),
    encryptionKeyHash: (0, pg_core_1.varchar)("encryption_key_hash", { length: 128 }).notNull(),
    previewHash: (0, pg_core_1.varchar)("preview_hash", { length: 128 }),
    metadataHash: (0, pg_core_1.varchar)("metadata_hash", { length: 128 }).notNull(),
    drmEnabled: (0, pg_core_1.boolean)("drm_enabled").default(true),
    licenseType: (0, pg_core_1.varchar)("license_type", { length: 32 }).notNull().default('standard'),
    licenseTerms: (0, pg_core_1.text)("license_terms"),
    copyrightNotice: (0, pg_core_1.text)("copyright_notice"),
    usageRestrictions: (0, pg_core_1.text)("usage_restrictions"),
    downloadLimit: (0, pg_core_1.integer)("download_limit").default(-1),
    streamingEnabled: (0, pg_core_1.boolean)("streaming_enabled").default(false),
    watermarkEnabled: (0, pg_core_1.boolean)("watermark_enabled").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.nftId],
        foreignColumns: [exports.nfts.id],
        name: "digital_assets_nft_id_nfts_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.creatorId],
        foreignColumns: [exports.users.id],
        name: "digital_assets_creator_id_users_id_fk"
    }),
    (0, pg_core_1.unique)("digital_assets_content_hash_unique").on(table.contentHash),
    (0, pg_core_1.index)("digital_assets_creator_id_idx").on(table.creatorId),
    (0, pg_core_1.index)("digital_assets_asset_type_idx").on(table.assetType),
    (0, pg_core_1.index)("digital_assets_created_at_idx").on(table.createdAt),
]);
exports.digitalAssetLicenses = (0, pg_core_1.pgTable)("digital_asset_licenses", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    assetId: (0, pg_core_1.uuid)("asset_id").notNull(),
    licenseName: (0, pg_core_1.varchar)("license_name", { length: 100 }).notNull(),
    licenseType: (0, pg_core_1.varchar)("license_type", { length: 32 }).notNull(),
    price: (0, pg_core_1.varchar)({ length: 128 }).notNull(),
    currency: (0, pg_core_1.varchar)({ length: 66 }).notNull(),
    usageRights: (0, pg_core_1.text)("usage_rights").notNull(),
    restrictions: (0, pg_core_1.text)(),
    durationDays: (0, pg_core_1.integer)("duration_days"),
    maxDownloads: (0, pg_core_1.integer)("max_downloads").default(-1),
    maxUsers: (0, pg_core_1.integer)("max_users").default(1),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.assetId],
        foreignColumns: [exports.digitalAssets.id],
        name: "digital_asset_licenses_asset_id_digital_assets_id_fk"
    }),
]);
exports.digitalAssetPurchases = (0, pg_core_1.pgTable)("digital_asset_purchases", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    assetId: (0, pg_core_1.uuid)("asset_id").notNull(),
    licenseId: (0, pg_core_1.uuid)("license_id").notNull(),
    buyerId: (0, pg_core_1.uuid)("buyer_id").notNull(),
    sellerId: (0, pg_core_1.uuid)("seller_id").notNull(),
    transactionHash: (0, pg_core_1.varchar)("transaction_hash", { length: 66 }).notNull(),
    pricePaid: (0, pg_core_1.varchar)("price_paid", { length: 128 }).notNull(),
    currency: (0, pg_core_1.varchar)({ length: 66 }).notNull(),
    licenseKey: (0, pg_core_1.varchar)("license_key", { length: 128 }).notNull(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at", { mode: 'string' }),
    downloadsRemaining: (0, pg_core_1.integer)("downloads_remaining").default(-1),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    purchasedAt: (0, pg_core_1.timestamp)("purchased_at", { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.assetId],
        foreignColumns: [exports.digitalAssets.id],
        name: "digital_asset_purchases_asset_id_digital_assets_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.licenseId],
        foreignColumns: [exports.digitalAssetLicenses.id],
        name: "digital_asset_purchases_license_id_digital_asset_licenses_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.buyerId],
        foreignColumns: [exports.users.id],
        name: "digital_asset_purchases_buyer_id_users_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.sellerId],
        foreignColumns: [exports.users.id],
        name: "digital_asset_purchases_seller_id_users_id_fk"
    }),
    (0, pg_core_1.unique)("digital_asset_purchases_license_key_unique").on(table.licenseKey),
    (0, pg_core_1.index)("digital_asset_purchases_buyer_id_idx").on(table.buyerId),
    (0, pg_core_1.index)("digital_asset_purchases_asset_id_idx").on(table.assetId),
]);
exports.digitalAssetAccessLogs = (0, pg_core_1.pgTable)("digital_asset_access_logs", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    purchaseId: (0, pg_core_1.uuid)("purchase_id").notNull(),
    assetId: (0, pg_core_1.uuid)("asset_id").notNull(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    accessType: (0, pg_core_1.varchar)("access_type", { length: 32 }).notNull(),
    ipAddress: (0, pg_core_1.inet)("ip_address"),
    userAgent: (0, pg_core_1.text)("user_agent"),
    fileSizeAccessed: (0, pg_core_1.bigint)("file_size_accessed", { mode: 'number' }),
    durationSeconds: (0, pg_core_1.integer)("duration_seconds"),
    success: (0, pg_core_1.boolean)().default(true),
    errorMessage: (0, pg_core_1.text)("error_message"),
    accessedAt: (0, pg_core_1.timestamp)("accessed_at", { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.purchaseId],
        foreignColumns: [exports.digitalAssetPurchases.id],
        name: "digital_asset_access_logs_purchase_id_digital_asset_purchases_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.assetId],
        foreignColumns: [exports.digitalAssets.id],
        name: "digital_asset_access_logs_asset_id_digital_assets_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "digital_asset_access_logs_user_id_users_id_fk"
    }),
    (0, pg_core_1.index)("digital_asset_access_logs_user_id_idx").on(table.userId),
    (0, pg_core_1.index)("digital_asset_access_logs_accessed_at_idx").on(table.accessedAt),
]);
exports.dmcaTakedownRequests = (0, pg_core_1.pgTable)("dmca_takedown_requests", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    assetId: (0, pg_core_1.uuid)("asset_id").notNull(),
    reporterId: (0, pg_core_1.uuid)("reporter_id"),
    reporterName: (0, pg_core_1.varchar)("reporter_name", { length: 255 }).notNull(),
    reporterEmail: (0, pg_core_1.varchar)("reporter_email", { length: 255 }).notNull(),
    reporterOrganization: (0, pg_core_1.varchar)("reporter_organization", { length: 255 }),
    copyrightHolderName: (0, pg_core_1.varchar)("copyright_holder_name", { length: 255 }).notNull(),
    originalWorkDescription: (0, pg_core_1.text)("original_work_description").notNull(),
    infringementDescription: (0, pg_core_1.text)("infringement_description").notNull(),
    evidenceUrls: (0, pg_core_1.text)("evidence_urls").array(),
    evidenceIpfsHashes: (0, pg_core_1.text)("evidence_ipfs_hashes").array(),
    swornStatement: (0, pg_core_1.text)("sworn_statement").notNull(),
    contactInformation: (0, pg_core_1.text)("contact_information").notNull(),
    status: (0, pg_core_1.varchar)({ length: 32 }).default('pending'),
    adminNotes: (0, pg_core_1.text)("admin_notes"),
    processedBy: (0, pg_core_1.uuid)("processed_by"),
    processedAt: (0, pg_core_1.timestamp)("processed_at", { mode: 'string' }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.assetId],
        foreignColumns: [exports.digitalAssets.id],
        name: "dmca_takedown_requests_asset_id_digital_assets_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.reporterId],
        foreignColumns: [exports.users.id],
        name: "dmca_takedown_requests_reporter_id_users_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.processedBy],
        foreignColumns: [exports.users.id],
        name: "dmca_takedown_requests_processed_by_users_id_fk"
    }),
    (0, pg_core_1.index)("dmca_takedown_requests_status_idx").on(table.status),
]);
exports.digitalAssetReports = (0, pg_core_1.pgTable)("digital_asset_reports", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    assetId: (0, pg_core_1.uuid)("asset_id").notNull(),
    reporterId: (0, pg_core_1.uuid)("reporter_id").notNull(),
    reportType: (0, pg_core_1.varchar)("report_type", { length: 32 }).notNull(),
    description: (0, pg_core_1.text)().notNull(),
    evidenceIpfsHash: (0, pg_core_1.varchar)("evidence_ipfs_hash", { length: 128 }),
    status: (0, pg_core_1.varchar)({ length: 32 }).default('pending'),
    moderatorId: (0, pg_core_1.uuid)("moderator_id"),
    moderatorNotes: (0, pg_core_1.text)("moderator_notes"),
    resolvedAt: (0, pg_core_1.timestamp)("resolved_at", { mode: 'string' }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.assetId],
        foreignColumns: [exports.digitalAssets.id],
        name: "digital_asset_reports_asset_id_digital_assets_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.reporterId],
        foreignColumns: [exports.users.id],
        name: "digital_asset_reports_reporter_id_users_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.moderatorId],
        foreignColumns: [exports.users.id],
        name: "digital_asset_reports_moderator_id_users_id_fk"
    }),
]);
exports.digitalAssetAnalytics = (0, pg_core_1.pgTable)("digital_asset_analytics", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    assetId: (0, pg_core_1.uuid)("asset_id").notNull(),
    date: (0, pg_core_1.date)().notNull(),
    totalDownloads: (0, pg_core_1.integer)("total_downloads").default(0),
    totalStreams: (0, pg_core_1.integer)("total_streams").default(0),
    totalPreviews: (0, pg_core_1.integer)("total_previews").default(0),
    uniqueUsers: (0, pg_core_1.integer)("unique_users").default(0),
    totalRevenue: (0, pg_core_1.varchar)("total_revenue", { length: 128 }).default('0'),
    currency: (0, pg_core_1.varchar)({ length: 66 }).default('ETH'),
    bandwidthUsed: (0, pg_core_1.bigint)("bandwidth_used", { mode: 'number' }).default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.assetId],
        foreignColumns: [exports.digitalAssets.id],
        name: "digital_asset_analytics_asset_id_digital_assets_id_fk"
    }),
    (0, pg_core_1.unique)("digital_asset_analytics_asset_date_unique").on(table.assetId, table.date),
    (0, pg_core_1.index)("digital_asset_analytics_date_idx").on(table.date),
]);
exports.cdnAccessLogs = (0, pg_core_1.pgTable)("cdn_access_logs", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    assetId: (0, pg_core_1.uuid)("asset_id").notNull(),
    userId: (0, pg_core_1.uuid)("user_id"),
    cdnNode: (0, pg_core_1.varchar)("cdn_node", { length: 100 }).notNull(),
    requestType: (0, pg_core_1.varchar)("request_type", { length: 32 }).notNull(),
    responseTimeMs: (0, pg_core_1.integer)("response_time_ms").notNull(),
    bytesTransferred: (0, pg_core_1.bigint)("bytes_transferred", { mode: 'number' }).notNull(),
    cacheHit: (0, pg_core_1.boolean)("cache_hit").default(false),
    ipAddress: (0, pg_core_1.inet)("ip_address"),
    countryCode: (0, pg_core_1.varchar)("country_code", { length: 2 }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.assetId],
        foreignColumns: [exports.digitalAssets.id],
        name: "cdn_access_logs_asset_id_digital_assets_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "cdn_access_logs_user_id_users_id_fk"
    }),
    (0, pg_core_1.index)("cdn_access_logs_created_at_idx").on(table.createdAt),
]);
exports.drmKeys = (0, pg_core_1.pgTable)("drm_keys", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    assetId: (0, pg_core_1.uuid)("asset_id").notNull(),
    purchaseId: (0, pg_core_1.uuid)("purchase_id").notNull(),
    keyType: (0, pg_core_1.varchar)("key_type", { length: 32 }).notNull(),
    keyData: (0, pg_core_1.text)("key_data").notNull(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at", { mode: 'string' }),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.assetId],
        foreignColumns: [exports.digitalAssets.id],
        name: "drm_keys_asset_id_digital_assets_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.purchaseId],
        foreignColumns: [exports.digitalAssetPurchases.id],
        name: "drm_keys_purchase_id_digital_asset_purchases_id_fk"
    }),
]);
exports.watermarkTemplates = (0, pg_core_1.pgTable)("watermark_templates", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    creatorId: (0, pg_core_1.uuid)("creator_id").notNull(),
    name: (0, pg_core_1.varchar)({ length: 100 }).notNull(),
    templateType: (0, pg_core_1.varchar)("template_type", { length: 32 }).notNull(),
    templateData: (0, pg_core_1.text)("template_data").notNull(),
    isDefault: (0, pg_core_1.boolean)("is_default").default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.creatorId],
        foreignColumns: [exports.users.id],
        name: "watermark_templates_creator_id_users_id_fk"
    }),
]);
exports.contentVerification = (0, pg_core_1.pgTable)("content_verification", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    assetId: (0, pg_core_1.uuid)("asset_id").notNull(),
    verificationType: (0, pg_core_1.varchar)("verification_type", { length: 32 }).notNull(),
    verificationData: (0, pg_core_1.text)("verification_data").notNull(),
    status: (0, pg_core_1.varchar)({ length: 32 }).notNull(),
    verifiedAt: (0, pg_core_1.timestamp)("verified_at", { mode: 'string' }).defaultNow(),
    verifiedBy: (0, pg_core_1.uuid)("verified_by"),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.assetId],
        foreignColumns: [exports.digitalAssets.id],
        name: "content_verification_asset_id_digital_assets_id_fk"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.verifiedBy],
        foreignColumns: [exports.users.id],
        name: "content_verification_verified_by_users_id_fk"
    }),
]);
//# sourceMappingURL=schema.js.map