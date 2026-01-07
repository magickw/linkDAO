import { pgTable, varchar, text, timestamp, uuid, index, boolean, numeric, unique } from "drizzle-orm/pg-core";
import { users } from "./schema";

// User Addresses - Multiple shipping and billing addresses per user
export const userAddresses = pgTable("user_addresses", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

    // Address Type
    addressType: varchar("address_type", { length: 20 }).notNull(), // 'shipping' | 'billing' | 'both'
    label: varchar("label", { length: 100 }), // 'Home', 'Work', etc.

    // Contact Information
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    company: varchar("company", { length: 200 }),
    phone: varchar("phone", { length: 20 }),
    email: varchar("email", { length: 255 }),

    // Address Details
    addressLine1: varchar("address_line1", { length: 255 }).notNull(),
    addressLine2: varchar("address_line2", { length: 255 }),
    city: varchar("city", { length: 100 }).notNull(),
    state: varchar("state", { length: 100 }).notNull(),
    postalCode: varchar("postal_code", { length: 20 }).notNull(),
    country: varchar("country", { length: 100 }).notNull().default("US"),

    // Metadata
    isDefault: boolean("is_default").default(false),
    isVerified: boolean("is_verified").default(false),
    verifiedAt: timestamp("verified_at"),

    // Delivery Instructions
    deliveryInstructions: text("delivery_instructions"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    lastUsedAt: timestamp("last_used_at"),
}, (t) => ({
    userIdIdx: index("idx_user_addresses_user_id").on(t.userId),
    typeIdx: index("idx_user_addresses_type").on(t.addressType),
    defaultIdx: index("idx_user_addresses_default").on(t.isDefault),
    lastUsedIdx: index("idx_user_addresses_last_used").on(t.lastUsedAt),
}));

// Payment Methods V2 - Multiple payment methods per user
export const paymentMethodsV2 = pgTable("payment_methods_v2", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

    // Payment Method Type
    methodType: varchar("method_type", { length: 20 }).notNull(), // 'credit_card' | 'debit_card' | 'crypto_wallet' | 'bank_account'
    provider: varchar("provider", { length: 50 }), // 'stripe' | 'coinbase' | 'metamask'

    // Display Information
    label: varchar("label", { length: 100 }),

    // Card Information (encrypted/tokenized)
    cardLast4: varchar("card_last4", { length: 4 }),
    cardBrand: varchar("card_brand", { length: 20 }),
    cardExpMonth: numeric("card_exp_month"),
    cardExpYear: numeric("card_exp_year"),
    cardFingerprint: varchar("card_fingerprint", { length: 255 }),

    // Crypto Wallet Information
    walletAddress: varchar("wallet_address", { length: 66 }),
    walletType: varchar("wallet_type", { length: 20 }),
    chainId: numeric("chain_id"),

    // External Provider References
    stripePaymentMethodId: varchar("stripe_payment_method_id", { length: 255 }),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    externalId: varchar("external_id", { length: 255 }),

    // Billing Address
    billingAddressId: uuid("billing_address_id").references(() => userAddresses.id, { onDelete: "set null" }),

    // Metadata
    isDefault: boolean("is_default").default(false),
    isVerified: boolean("is_verified").default(false),
    verifiedAt: timestamp("verified_at"),

    // Security
    requiresCvv: boolean("requires_cvv").default(true),
    requires3ds: boolean("requires_3ds").default(false),

    // Status
    status: varchar("status", { length: 20 }).default("active"), // 'active' | 'expired' | 'disabled' | 'failed_verification'

    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    lastUsedAt: timestamp("last_used_at"),
}, (t) => ({
    userIdIdx: index("idx_payment_methods_v2_user_id").on(t.userId),
    typeIdx: index("idx_payment_methods_v2_type").on(t.methodType),
    defaultIdx: index("idx_payment_methods_v2_default").on(t.isDefault),
    statusIdx: index("idx_payment_methods_v2_status").on(t.status),
    stripePmIdx: index("idx_payment_methods_v2_stripe_pm").on(t.stripePaymentMethodId),
    lastUsedIdx: index("idx_payment_methods_v2_last_used").on(t.lastUsedAt),
}));

// Wishlists
export const wishlists = pgTable("wishlists", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull().default("My Wishlist"),
    description: text("description"),

    // Privacy
    isPublic: boolean("is_public").default(false),
    shareToken: varchar("share_token", { length: 64 }).unique(),

    // Metadata
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
    userIdIdx: index("idx_wishlists_user_id").on(t.userId),
    shareTokenIdx: index("idx_wishlists_share_token").on(t.shareToken),
    publicIdx: index("idx_wishlists_public").on(t.isPublic),
    uniqueUserWishlistName: unique("unique_user_wishlist_name").on(t.userId, t.name),
}));

// Wishlist Items
export const wishlistItems = pgTable("wishlist_items", {
    id: uuid("id").defaultRandom().primaryKey(),
    wishlistId: uuid("wishlist_id").notNull().references(() => wishlists.id, { onDelete: "cascade" }),
    productId: uuid("product_id").notNull(), // References products.id

    // Item Details
    quantity: numeric("quantity").default("1"),
    priority: varchar("priority", { length: 20 }).default("medium"), // 'high' | 'medium' | 'low'
    notes: text("notes"),

    // Price Tracking
    priceAtAdd: numeric("price_at_add", { precision: 20, scale: 2 }),
    priceAlertThreshold: numeric("price_alert_threshold", { precision: 20, scale: 2 }),

    // Timestamps
    addedAt: timestamp("added_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
    wishlistIdIdx: index("idx_wishlist_items_wishlist_id").on(t.wishlistId),
    productIdIdx: index("idx_wishlist_items_product_id").on(t.productId),
    addedAtIdx: index("idx_wishlist_items_added_at").on(t.addedAt),
    priorityIdx: index("idx_wishlist_items_priority").on(t.priority),
    uniqueWishlistProduct: unique("unique_wishlist_product").on(t.wishlistId, t.productId),
}));

// Buyer Profiles
export const buyerProfiles = pgTable("buyer_profiles", {
    userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),

    // Quick Stats
    totalOrders: numeric("total_orders").default("0"),
    totalSpent: numeric("total_spent", { precision: 20, scale: 2 }).default("0"),
    averageOrderValue: numeric("average_order_value", { precision: 20, scale: 2 }).default("0"),

    // Saved Items Count
    savedAddressesCount: numeric("saved_addresses_count").default("0"),
    savedPaymentMethodsCount: numeric("saved_payment_methods_count").default("0"),
    wishlistItemsCount: numeric("wishlist_items_count").default("0"),

    // Preferences
    preferredCurrency: varchar("preferred_currency", { length: 10 }).default("USD"),
    preferredPaymentMethodId: uuid("preferred_payment_method_id").references(() => paymentMethodsV2.id, { onDelete: "set null" }),
    preferredShippingAddressId: uuid("preferred_shipping_address_id").references(() => userAddresses.id, { onDelete: "set null" }),
    preferredBillingAddressId: uuid("preferred_billing_address_id").references(() => userAddresses.id, { onDelete: "set null" }),

    // Communication Preferences
    emailNotifications: boolean("email_notifications").default(true),
    smsNotifications: boolean("sms_notifications").default(false),
    pushNotifications: boolean("push_notifications").default(true),

    // Marketing Preferences
    marketingEmails: boolean("marketing_emails").default(true),
    priceDropAlerts: boolean("price_drop_alerts").default(true),
    orderUpdates: boolean("order_updates").default(true),

    // Privacy
    profileVisibility: varchar("profile_visibility", { length: 20 }).default("private"), // 'public' | 'private' | 'friends'

    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    lastPurchaseAt: timestamp("last_purchase_at"),
}, (t) => ({
    lastPurchaseIdx: index("idx_buyer_profiles_last_purchase").on(t.lastPurchaseAt),
    totalSpentIdx: index("idx_buyer_profiles_total_spent").on(t.totalSpent),
    totalOrdersIdx: index("idx_buyer_profiles_total_orders").on(t.totalOrders),
}));
