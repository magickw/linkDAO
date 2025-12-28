import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, index, foreignKey } from "drizzle-orm/pg-core";
import { users } from "../schema";

// Two-Factor Authentication
export const twoFactorAuth = pgTable("two_factor_auth", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    method: varchar("method", { length: 20 }).notNull(), // 'totp' | 'email'
    secret: text("secret"), // Encrypted TOTP secret
    backupCodes: jsonb("backup_codes"), // Array of encrypted backup codes
    isEnabled: boolean("is_enabled").default(false),
    verifiedAt: timestamp("verified_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
    userIdIdx: index("idx_2fa_user_id").on(t.userId),
    userFk: foreignKey({
        columns: [t.userId],
        foreignColumns: [users.id]
    })
}));

// User Sessions
export const userSessions = pgTable("user_sessions", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),
    deviceInfo: jsonb("device_info"), // { browser, os, device }
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    location: jsonb("location"), // { city, country, coordinates }
    isActive: boolean("is_active").default(true),
    lastActivityAt: timestamp("last_activity_at").defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
    userIdIdx: index("idx_sessions_user_id").on(t.userId),
    sessionTokenIdx: index("idx_sessions_token").on(t.sessionToken),
    isActiveIdx: index("idx_sessions_active").on(t.isActive),
    userFk: foreignKey({
        columns: [t.userId],
        foreignColumns: [users.id]
    })
}));

// User Activity Log
export const userActivityLog = pgTable("user_activity_log", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    activityType: varchar("activity_type", { length: 50 }).notNull(), // 'login', 'logout', 'profile_update', 'security_change', etc.
    description: text("description").notNull(),
    metadata: jsonb("metadata"), // Additional context data
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    sessionId: uuid("session_id").references(() => userSessions.id, { onDelete: "set null" }),
    severity: varchar("severity", { length: 20 }).default("info"), // 'info' | 'warning' | 'critical'
    createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
    userIdIdx: index("idx_activity_user_id").on(t.userId),
    activityTypeIdx: index("idx_activity_type").on(t.activityType),
    createdAtIdx: index("idx_activity_created_at").on(t.createdAt),
    severityIdx: index("idx_activity_severity").on(t.severity),
    userFk: foreignKey({
        columns: [t.userId],
        foreignColumns: [users.id]
    }),
    sessionFk: foreignKey({
        columns: [t.sessionId],
        foreignColumns: [userSessions.id]
    })
}));

// Trusted Devices
export const trustedDevices = pgTable("trusted_devices", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    deviceFingerprint: varchar("device_fingerprint", { length: 255 }).notNull(),
    deviceName: varchar("device_name", { length: 255 }), // User-friendly name
    deviceInfo: jsonb("device_info"), // { browser, os, device }
    ipAddress: varchar("ip_address", { length: 45 }),
    lastUsedAt: timestamp("last_used_at").defaultNow(),
    isTrusted: boolean("is_trusted").default(true),
    createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
    userIdIdx: index("idx_trusted_devices_user_id").on(t.userId),
    fingerprintIdx: index("idx_trusted_devices_fingerprint").on(t.deviceFingerprint),
    isTrustedIdx: index("idx_trusted_devices_is_trusted").on(t.isTrusted),
    userFk: foreignKey({
        columns: [t.userId],
        foreignColumns: [users.id]
    })
}));

// Security Alerts Configuration
export const securityAlertsConfig = pgTable("security_alerts_config", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
    newDeviceAlerts: boolean("new_device_alerts").default(true),
    suspiciousActivityAlerts: boolean("suspicious_activity_alerts").default(true),
    largeTransactionAlerts: boolean("large_transaction_alerts").default(false),
    largeTransactionThreshold: varchar("large_transaction_threshold", { length: 50 }).default("1000"), // In USD equivalent
    securityChangeAlerts: boolean("security_change_alerts").default(true),
    loginAlerts: boolean("login_alerts").default(false),
    alertChannels: jsonb("alert_channels").default('["email"]'), // ['email', 'push', 'sms']
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
    userIdIdx: index("idx_security_alerts_user_id").on(t.userId),
    userFk: foreignKey({
        columns: [t.userId],
        foreignColumns: [users.id]
    })
}));

// Security Alerts (triggered alerts)
export const securityAlerts = pgTable("security_alerts", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    alertType: varchar("alert_type", { length: 50 }).notNull(), // 'new_device', 'suspicious_activity', 'large_transaction', etc.
    severity: varchar("severity", { length: 20 }).notNull(), // 'low' | 'medium' | 'high' | 'critical'
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),
    metadata: jsonb("metadata"), // Additional context
    isRead: boolean("is_read").default(false),
    isResolved: boolean("is_resolved").default(false),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
    userIdIdx: index("idx_security_alerts_user_id").on(t.userId),
    alertTypeIdx: index("idx_security_alerts_type").on(t.alertType),
    severityIdx: index("idx_security_alerts_severity").on(t.severity),
    isReadIdx: index("idx_security_alerts_is_read").on(t.isRead),
    createdAtIdx: index("idx_security_alerts_created_at").on(t.createdAt),
    userFk: foreignKey({
        columns: [t.userId],
        foreignColumns: [users.id]
    })
}));

// Privacy Settings
export const privacySettings = pgTable("privacy_settings", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
    hideTransactionHistory: boolean("hide_transaction_history").default(false),
    anonymousMode: boolean("anonymous_mode").default(false),
    showWalletBalance: boolean("show_wallet_balance").default(false),
    publicProfile: boolean("public_profile").default(true),
    allowDataSharing: boolean("allow_data_sharing").default(false),
    marketingEmails: boolean("marketing_emails").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
    userIdIdx: index("idx_privacy_settings_user_id").on(t.userId),
    userFk: foreignKey({
        columns: [t.userId],
        foreignColumns: [users.id]
    })
}));
