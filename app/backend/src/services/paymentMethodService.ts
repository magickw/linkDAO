import { db } from '../db';
import { paymentMethodsV2 } from '../db/buyerDataSchema';
import { eq, and, desc, or } from 'drizzle-orm';

export interface PaymentMethod {
    id: string;
    userId: string;
    methodType: 'credit_card' | 'debit_card' | 'crypto_wallet' | 'bank_account';
    provider?: string;
    label?: string;
    cardLast4?: string;
    cardBrand?: string;
    cardExpMonth?: number;
    cardExpYear?: number;
    cardFingerprint?: string;
    walletAddress?: string;
    walletType?: string;
    chainId?: number;
    stripePaymentMethodId?: string;
    stripeCustomerId?: string;
    externalId?: string;
    billingAddressId?: string;
    isDefault: boolean;
    isVerified: boolean;
    verifiedAt?: Date;
    requiresCvv: boolean;
    requires3ds: boolean;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    lastUsedAt?: Date;
}

export interface CreatePaymentMethodInput {
    userId: string;
    methodType: 'credit_card' | 'debit_card' | 'crypto_wallet' | 'bank_account';
    provider?: string;
    label?: string;
    cardLast4?: string;
    cardBrand?: string;
    cardExpMonth?: number;
    cardExpYear?: number;
    cardFingerprint?: string;
    walletAddress?: string;
    walletType?: string;
    chainId?: number;
    stripePaymentMethodId?: string;
    stripeCustomerId?: string;
    externalId?: string;
    billingAddressId?: string;
    isDefault?: boolean;
}

export interface UpdatePaymentMethodInput {
    label?: string;
    billingAddressId?: string;
    isDefault?: boolean;
    status?: string;
}

export class PaymentMethodService {
    /**
     * Get all payment methods for a user
     */
    static async getUserPaymentMethods(userId: string, activeOnly: boolean = true): Promise<PaymentMethod[]> {
        const conditions = [eq(paymentMethodsV2.userId, userId)];

        if (activeOnly) {
            conditions.push(eq(paymentMethodsV2.status, 'active'));
        }

        const methods = await db
            .select()
            .from(paymentMethodsV2)
            .where(and(...conditions))
            .orderBy(desc(paymentMethodsV2.isDefault), desc(paymentMethodsV2.lastUsedAt));

        return methods as PaymentMethod[];
    }

    /**
     * Get a specific payment method by ID
     */
    static async getPaymentMethodById(methodId: string, userId: string): Promise<PaymentMethod | null> {
        const [method] = await db
            .select()
            .from(paymentMethodsV2)
            .where(and(
                eq(paymentMethodsV2.id, methodId),
                eq(paymentMethodsV2.userId, userId)
            ))
            .limit(1);

        return (method as PaymentMethod) || null;
    }

    /**
     * Get default payment method for a user
     */
    static async getDefaultPaymentMethod(userId: string): Promise<PaymentMethod | null> {
        const [method] = await db
            .select()
            .from(paymentMethodsV2)
            .where(and(
                eq(paymentMethodsV2.userId, userId),
                eq(paymentMethodsV2.isDefault, true),
                eq(paymentMethodsV2.status, 'active')
            ))
            .limit(1);

        return (method as PaymentMethod) || null;
    }

    /**
     * Create a new payment method
     */
    static async createPaymentMethod(input: CreatePaymentMethodInput): Promise<PaymentMethod> {
        // If this is set as default, unset other defaults
        if (input.isDefault) {
            await this.unsetDefaultPaymentMethods(input.userId);
        }

        const [newMethod] = await db
            .insert(paymentMethodsV2)
            .values({
                ...input,
                isDefault: input.isDefault || false,
                isVerified: false,
                requiresCvv: true,
                requires3ds: false,
                status: 'active',
            })
            .returning();

        return newMethod as PaymentMethod;
    }

    /**
     * Update an existing payment method
     */
    static async updatePaymentMethod(methodId: string, userId: string, input: UpdatePaymentMethodInput): Promise<PaymentMethod | null> {
        // If setting as default, unset other defaults
        if (input.isDefault) {
            await this.unsetDefaultPaymentMethods(userId);
        }

        const [updatedMethod] = await db
            .update(paymentMethodsV2)
            .set({
                ...input,
                updatedAt: new Date(),
            })
            .where(and(
                eq(paymentMethodsV2.id, methodId),
                eq(paymentMethodsV2.userId, userId)
            ))
            .returning();

        return (updatedMethod as PaymentMethod) || null;
    }

    /**
     * Delete a payment method (soft delete by setting status to disabled)
     */
    static async deletePaymentMethod(methodId: string, userId: string): Promise<boolean> {
        const result = await db
            .update(paymentMethodsV2)
            .set({
                status: 'disabled',
                updatedAt: new Date(),
            })
            .where(and(
                eq(paymentMethodsV2.id, methodId),
                eq(paymentMethodsV2.userId, userId)
            ))
            .returning();

        return result.length > 0;
    }

    /**
     * Permanently delete a payment method
     */
    static async permanentlyDeletePaymentMethod(methodId: string, userId: string): Promise<boolean> {
        const result = await db
            .delete(paymentMethodsV2)
            .where(and(
                eq(paymentMethodsV2.id, methodId),
                eq(paymentMethodsV2.userId, userId)
            ))
            .returning();

        return result.length > 0;
    }

    /**
     * Set a payment method as default
     */
    static async setDefaultPaymentMethod(methodId: string, userId: string): Promise<PaymentMethod | null> {
        // Unset other defaults
        await this.unsetDefaultPaymentMethods(userId);

        // Set this one as default
        const [updatedMethod] = await db
            .update(paymentMethodsV2)
            .set({
                isDefault: true,
                updatedAt: new Date(),
            })
            .where(and(
                eq(paymentMethodsV2.id, methodId),
                eq(paymentMethodsV2.userId, userId)
            ))
            .returning();

        return (updatedMethod as PaymentMethod) || null;
    }

    /**
     * Update last used timestamp
     */
    static async updateLastUsed(methodId: string): Promise<void> {
        await db
            .update(paymentMethodsV2)
            .set({
                lastUsedAt: new Date(),
            })
            .where(eq(paymentMethodsV2.id, methodId));
    }

    /**
     * Mark expired payment methods
     */
    static async markExpiredPaymentMethods(): Promise<number> {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;

        const result = await db
            .update(paymentMethodsV2)
            .set({
                status: 'expired',
                updatedAt: new Date(),
            })
            .where(and(
                eq(paymentMethodsV2.status, 'active'),
                or(
                    // Year is less than current year
                    eq(paymentMethodsV2.cardExpYear, currentYear - 1),
                    // Year is current year but month has passed
                    and(
                        eq(paymentMethodsV2.cardExpYear, currentYear),
                        eq(paymentMethodsV2.cardExpMonth, currentMonth - 1)
                    )
                )
            ))
            .returning();

        return result.length;
    }

    /**
     * Verify a payment method
     */
    static async verifyPaymentMethod(methodId: string, userId: string): Promise<PaymentMethod | null> {
        const [verifiedMethod] = await db
            .update(paymentMethodsV2)
            .set({
                isVerified: true,
                verifiedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(and(
                eq(paymentMethodsV2.id, methodId),
                eq(paymentMethodsV2.userId, userId)
            ))
            .returning();

        return (verifiedMethod as PaymentMethod) || null;
    }

    /**
     * Helper: Unset default payment methods for a user
     */
    private static async unsetDefaultPaymentMethods(userId: string): Promise<void> {
        await db
            .update(paymentMethodsV2)
            .set({
                isDefault: false,
                updatedAt: new Date(),
            })
            .where(and(
                eq(paymentMethodsV2.userId, userId),
                eq(paymentMethodsV2.isDefault, true)
            ));
    }
}
