import { relations } from "drizzle-orm/relations";
import { users, posts, payments, listings, escrows, bids, follows } from "./schema";

export const postsRelations = relations(posts, ({one}) => ({
	user: one(users, {
		fields: [posts.authorId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	posts: many(posts),
	payments_from: many(payments, {
		relationName: "payments_from_users_id"
	}),
	payments_to: many(payments, {
		relationName: "payments_to_users_id"
	}),
	escrows_buyerId: many(escrows, {
		relationName: "escrows_buyerId_users_id"
	}),
	escrows_sellerId: many(escrows, {
		relationName: "escrows_sellerId_users_id"
	}),
	listings: many(listings),
	bids: many(bids),
	follows_followerId: many(follows, {
		relationName: "follows_followerId_users_id"
	}),
	follows_followingId: many(follows, {
		relationName: "follows_followingId_users_id"
	}),
}));

export const paymentsRelations = relations(payments, ({one}) => ({
	user_from: one(users, {
		fields: [payments.from],
		references: [users.id],
		relationName: "payments_from_users_id"
	}),
	user_to: one(users, {
		fields: [payments.to],
		references: [users.id],
		relationName: "payments_to_users_id"
	}),
}));

export const escrowsRelations = relations(escrows, ({one}) => ({
	listing: one(listings, {
		fields: [escrows.listingId],
		references: [listings.id]
	}),
	user_buyerId: one(users, {
		fields: [escrows.buyerId],
		references: [users.id],
		relationName: "escrows_buyerId_users_id"
	}),
	user_sellerId: one(users, {
		fields: [escrows.sellerId],
		references: [users.id],
		relationName: "escrows_sellerId_users_id"
	}),
}));

export const listingsRelations = relations(listings, ({one, many}) => ({
	escrows: many(escrows),
	user: one(users, {
		fields: [listings.sellerId],
		references: [users.id]
	}),
	bids: many(bids),
}));

export const bidsRelations = relations(bids, ({one}) => ({
	listing: one(listings, {
		fields: [bids.listingId],
		references: [listings.id]
	}),
	user: one(users, {
		fields: [bids.bidderId],
		references: [users.id]
	}),
}));

export const followsRelations = relations(follows, ({one}) => ({
	user_followerId: one(users, {
		fields: [follows.followerId],
		references: [users.id],
		relationName: "follows_followerId_users_id"
	}),
	user_followingId: one(users, {
		fields: [follows.followingId],
		references: [users.id],
		relationName: "follows_followingId_users_id"
	}),
}));