import { db } from '../db';
import { userAddresses } from '../db/buyerDataSchema';
import { eq, and, desc } from 'drizzle-orm';

export interface UserAddress {
    id: string;
    userId: string;
    addressType: 'shipping' | 'billing' | 'both';
    label?: string;
    firstName: string;
    lastName: string;
    company?: string;
    phone?: string;
    email?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    isDefault: boolean;
    isVerified: boolean;
    verifiedAt?: Date;
    deliveryInstructions?: string;
    createdAt: Date;
    updatedAt: Date;
    lastUsedAt?: Date;
}

export interface CreateAddressInput {
    userId: string;
    addressType: 'shipping' | 'billing' | 'both';
    label?: string;
    firstName: string;
    lastName: string;
    company?: string;
    phone?: string;
    email?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    isDefault?: boolean;
    deliveryInstructions?: string;
}

export interface UpdateAddressInput {
    label?: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    phone?: string;
    email?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    isDefault?: boolean;
    deliveryInstructions?: string;
}

export class AddressService {
    /**
     * Get all addresses for a user
     */
    static async getUserAddresses(userId: string, addressType?: 'shipping' | 'billing' | 'both'): Promise<UserAddress[]> {
        const conditions = [eq(userAddresses.userId, userId)];

        if (addressType) {
            conditions.push(eq(userAddresses.addressType, addressType));
        }

        const addresses = await db
            .select()
            .from(userAddresses)
            .where(and(...conditions))
            .orderBy(desc(userAddresses.isDefault), desc(userAddresses.lastUsedAt));

        return addresses as UserAddress[];
    }

    /**
     * Get a specific address by ID
     */
    static async getAddressById(addressId: string, userId: string): Promise<UserAddress | null> {
        const [address] = await db
            .select()
            .from(userAddresses)
            .where(and(
                eq(userAddresses.id, addressId),
                eq(userAddresses.userId, userId)
            ))
            .limit(1);

        return (address as UserAddress) || null;
    }

    /**
     * Get default address for a user
     */
    static async getDefaultAddress(userId: string, addressType: 'shipping' | 'billing'): Promise<UserAddress | null> {
        const [address] = await db
            .select()
            .from(userAddresses)
            .where(and(
                eq(userAddresses.userId, userId),
                eq(userAddresses.isDefault, true),
                // Address type can be specific type or 'both'
                addressType === 'shipping'
                    ? or(eq(userAddresses.addressType, 'shipping'), eq(userAddresses.addressType, 'both'))
                    : or(eq(userAddresses.addressType, 'billing'), eq(userAddresses.addressType, 'both'))
            ))
            .limit(1);

        return (address as UserAddress) || null;
    }

    /**
     * Create a new address
     */
    static async createAddress(input: CreateAddressInput): Promise<UserAddress> {
        // If this is set as default, unset other defaults of the same type
        if (input.isDefault) {
            await this.unsetDefaultAddresses(input.userId, input.addressType);
        }

        const [newAddress] = await db
            .insert(userAddresses)
            .values({
                ...input,
                isDefault: input.isDefault || false,
            })
            .returning();

        return newAddress as UserAddress;
    }

    /**
     * Update an existing address
     */
    static async updateAddress(addressId: string, userId: string, input: UpdateAddressInput): Promise<UserAddress | null> {
        // If setting as default, unset other defaults
        if (input.isDefault) {
            const address = await this.getAddressById(addressId, userId);
            if (address) {
                await this.unsetDefaultAddresses(userId, address.addressType);
            }
        }

        const [updatedAddress] = await db
            .update(userAddresses)
            .set({
                ...input,
                updatedAt: new Date(),
            })
            .where(and(
                eq(userAddresses.id, addressId),
                eq(userAddresses.userId, userId)
            ))
            .returning();

        return (updatedAddress as UserAddress) || null;
    }

    /**
     * Delete an address
     */
    static async deleteAddress(addressId: string, userId: string): Promise<boolean> {
        const result = await db
            .delete(userAddresses)
            .where(and(
                eq(userAddresses.id, addressId),
                eq(userAddresses.userId, userId)
            ))
            .returning();

        return result.length > 0;
    }

    /**
     * Set an address as default
     */
    static async setDefaultAddress(addressId: string, userId: string): Promise<UserAddress | null> {
        const address = await this.getAddressById(addressId, userId);
        if (!address) return null;

        // Unset other defaults of the same type
        await this.unsetDefaultAddresses(userId, address.addressType);

        // Set this one as default
        const [updatedAddress] = await db
            .update(userAddresses)
            .set({
                isDefault: true,
                updatedAt: new Date(),
            })
            .where(eq(userAddresses.id, addressId))
            .returning();

        return (updatedAddress as UserAddress) || null;
    }

    /**
     * Update last used timestamp
     */
    static async updateLastUsed(addressId: string): Promise<void> {
        await db
            .update(userAddresses)
            .set({
                lastUsedAt: new Date(),
            })
            .where(eq(userAddresses.id, addressId));
    }

    /**
     * Verify an address
     */
    static async verifyAddress(addressId: string, userId: string): Promise<UserAddress | null> {
        const [verifiedAddress] = await db
            .update(userAddresses)
            .set({
                isVerified: true,
                verifiedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(and(
                eq(userAddresses.id, addressId),
                eq(userAddresses.userId, userId)
            ))
            .returning();

        return (verifiedAddress as UserAddress) || null;
    }

    /**
     * Helper: Unset default addresses of a specific type for a user
     */
    private static async unsetDefaultAddresses(userId: string, addressType: 'shipping' | 'billing' | 'both'): Promise<void> {
        await db
            .update(userAddresses)
            .set({
                isDefault: false,
                updatedAt: new Date(),
            })
            .where(and(
                eq(userAddresses.userId, userId),
                eq(userAddresses.addressType, addressType),
                eq(userAddresses.isDefault, true)
            ));
    }
}
