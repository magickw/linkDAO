import { db } from '../db';
import * as schema from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';

// Input matches the new schema fields
export interface CreateAddressInput {
    type: 'billing' | 'shipping';
    label?: string;
    firstName: string;
    lastName: string;
    company?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
    email?: string;
    isDefault?: boolean;
}

export interface UpdateAddressInput extends Partial<CreateAddressInput> { }

export class AddressService {
    /**
     * Get all addresses for a user
     */
    static async getAddresses(userId: string) {
        try {
            // Using userAddresses from buyerDataSchema via main schema export
            return await db
                .select()
                .from(schema.buyerDataSchema.userAddresses)
                .where(eq(schema.buyerDataSchema.userAddresses.userId, userId))
                .orderBy(desc(schema.buyerDataSchema.userAddresses.isDefault), desc(schema.buyerDataSchema.userAddresses.createdAt));
        } catch (error) {
            safeLogger.error('Error fetching addresses:', error);
            throw error;
        }
    }

    /**
     * Get a specific address
     */
    static async getAddressById(id: string, userId: string) {
        try {
            const result = await db
                .select()
                .from(schema.buyerDataSchema.userAddresses)
                .where(and(
                    eq(schema.buyerDataSchema.userAddresses.id, id),
                    eq(schema.buyerDataSchema.userAddresses.userId, userId)
                ));
            return result[0] || null;
        } catch (error) {
            safeLogger.error('Error fetching address:', error);
            throw error;
        }
    }

    /**
     * Create a new address
     */
    static async createAddress(userId: string, data: CreateAddressInput) {
        try {
            const addressType = data.type; // 'billing' or 'shipping'

            // If setting as default, unset other defaults of same type
            if (data.isDefault) {
                await this.unsetDefaultAddresses(userId, addressType);
            }

            const result = await db.insert(schema.buyerDataSchema.userAddresses).values({
                userId,
                addressType, // Map type to addressType
                label: data.label || (addressType === 'billing' ? 'Billing Address' : 'Shipping Address'),
                firstName: data.firstName,
                lastName: data.lastName,
                company: data.company,
                phone: data.phone,
                email: data.email,
                addressLine1: data.addressLine1,
                addressLine2: data.addressLine2,
                city: data.city,
                state: data.state,
                postalCode: data.postalCode,
                country: data.country,
                isDefault: data.isDefault
            }).returning();

            return result[0];
        } catch (error) {
            safeLogger.error('Error creating address:', error);
            throw error;
        }
    }

    /**
     * Update an address
     */
    static async updateAddress(id: string, userId: string, data: UpdateAddressInput) {
        try {
            // If setting as default, unset other defaults
            if (data.isDefault) {
                let typeToUnset = data.type;
                if (!typeToUnset) {
                    const current = await this.getAddressById(id, userId);
                    if (current) typeToUnset = current.addressType as 'billing' | 'shipping';
                }

                if (typeToUnset) {
                    await this.unsetDefaultAddresses(userId, typeToUnset);
                }
            }

            // Map input fields to schema fields
            const updateData: any = {
                updatedAt: new Date(),
                ...data
            };

            // Handle field mapping for update
            if (data.type) updateData.addressType = data.type;
            if (data.addressLine1) updateData.addressLine1 = data.addressLine1;
            if (data.addressLine2) updateData.addressLine2 = data.addressLine2;
            if (data.postalCode) updateData.postalCode = data.postalCode;

            // Remove mapped/unused logical fields from direct spread if needed, but extra fields usually ignored or we should be precise.
            // Cleaner to construct the object explicitly.
            const cleanUpdateData: any = { updatedAt: new Date() };
            if (data.type !== undefined) cleanUpdateData.addressType = data.type;
            if (data.label !== undefined) cleanUpdateData.label = data.label;
            if (data.firstName !== undefined) cleanUpdateData.firstName = data.firstName;
            if (data.lastName !== undefined) cleanUpdateData.lastName = data.lastName;
            if (data.company !== undefined) cleanUpdateData.company = data.company;
            if (data.phone !== undefined) cleanUpdateData.phone = data.phone;
            if (data.email !== undefined) cleanUpdateData.email = data.email;
            if (data.addressLine1 !== undefined) cleanUpdateData.addressLine1 = data.addressLine1;
            if (data.addressLine2 !== undefined) cleanUpdateData.addressLine2 = data.addressLine2;
            if (data.city !== undefined) cleanUpdateData.city = data.city;
            if (data.state !== undefined) cleanUpdateData.state = data.state;
            if (data.postalCode !== undefined) cleanUpdateData.postalCode = data.postalCode;
            if (data.country !== undefined) cleanUpdateData.country = data.country;
            if (data.isDefault !== undefined) cleanUpdateData.isDefault = data.isDefault;

            const result = await db
                .update(schema.buyerDataSchema.userAddresses)
                .set(cleanUpdateData)
                .where(and(
                    eq(schema.buyerDataSchema.userAddresses.id, id),
                    eq(schema.buyerDataSchema.userAddresses.userId, userId)
                ))
                .returning();

            return result[0];
        } catch (error) {
            safeLogger.error('Error updating address:', error);
            throw error;
        }
    }

    /**
     * Delete an address
     */
    static async deleteAddress(id: string, userId: string) {
        try {
            const result = await db
                .delete(schema.buyerDataSchema.userAddresses)
                .where(and(
                    eq(schema.buyerDataSchema.userAddresses.id, id),
                    eq(schema.buyerDataSchema.userAddresses.userId, userId)
                ))
                .returning();

            return result.length > 0;
        } catch (error) {
            safeLogger.error('Error deleting address:', error);
            throw error;
        }
    }

    /**
     * Set an address as default
     */
    static async setDefaultAddress(id: string, userId: string) {
        try {
            const address = await this.getAddressById(id, userId);
            if (!address) throw new Error('Address not found');

            await this.unsetDefaultAddresses(userId, address.addressType as 'billing' | 'shipping');

            const result = await db
                .update(schema.buyerDataSchema.userAddresses)
                .set({
                    isDefault: true,
                    updatedAt: new Date()
                })
                .where(eq(schema.buyerDataSchema.userAddresses.id, id))
                .returning();

            return result[0];
        } catch (error) {
            safeLogger.error('Error setting default address:', error);
            throw error;
        }
    }

    /**
     * Helper: Unset default addresses for a user and type
     */
    private static async unsetDefaultAddresses(userId: string, type: 'billing' | 'shipping') {
        await db
            .update(schema.buyerDataSchema.userAddresses)
            .set({ isDefault: false })
            .where(and(
                eq(schema.buyerDataSchema.userAddresses.userId, userId),
                eq(schema.buyerDataSchema.userAddresses.addressType, type),
                eq(schema.buyerDataSchema.userAddresses.isDefault, true)
            ));
    }
}
