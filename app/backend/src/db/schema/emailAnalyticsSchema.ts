import { pgTable, uuid, varchar, timestamp, boolean, decimal, jsonb, index, foreignKey, time } from "drizzle-orm/pg-core";
import { users } from "../schema";

// Email Analytics Table
export const emailAnalytics = pgTable("email_analytics", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    emailType: varchar("email_type", { length: 50 }).notNull(),
    emailSubject: varchar("email_subject", { length: 255 }),
    sentAt: timestamp("sent_at").defaultNow().notNull(),
    openedAt: timestamp("opened_at"),
    clickedAt: timestamp("clicked_at"),
    trackingId: varchar("tracking_id", { length: 255 }).notNull().unique(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
    userIdIdx: index("idx_email_analytics_user_id").on(t.userId),
    trackingIdIdx: index("idx_email_analytics_tracking_id").on(t.trackingId),
    sentAtIdx: index("idx_email_analytics_sent_at").on(t.sentAt),
    emailTypeIdx: index("idx_email_analytics_email_type").on(t.emailType),
    userFk: foreignKey({
        columns: [t.userId],
        foreignColumns: [users.id]
    })
}));

// Email Digest Queue Table
export const emailDigestQueue = pgTable("email_digest_queue", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    emailType: varchar("email_type", { length: 50 }).notNull(),
    eventData: jsonb("event_data").notNull(),
    scheduledFor: timestamp("scheduled_for").notNull(),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
    userIdIdx: index("idx_email_digest_queue_user_id").on(t.userId),
    scheduledForIdx: index("idx_email_digest_queue_scheduled_for").on(t.scheduledFor),
    sentAtIdx: index("idx_email_digest_queue_sent_at").on(t.sentAt),
    userFk: foreignKey({
        columns: [t.userId],
        foreignColumns: [users.id]
    })
}));

// Export types
export type EmailAnalytics = typeof emailAnalytics.$inferSelect;
export type NewEmailAnalytics = typeof emailAnalytics.$inferInsert;
export type EmailDigestQueue = typeof emailDigestQueue.$inferSelect;
export type NewEmailDigestQueue = typeof emailDigestQueue.$inferInsert;
