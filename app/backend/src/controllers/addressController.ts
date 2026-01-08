import { Request, Response } from 'express';
import { AddressService, CreateAddressInput, UpdateAddressInput } from '../services/addressService';
import { safeLogger } from '../utils/safeLogger';

export class AddressController {
    /**
     * Get all addresses for the authenticated user
     */
    static async getAddresses(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const addresses = await AddressService.getAddresses(userId);

            // Map backend fields to expected frontend response if needed, 
            // or we'll update frontend to match backend.
            // For now, returning raw DB objects is fine as we'll update frontend.
            return res.status(200).json(addresses);
        } catch (error) {
            safeLogger.error('Error in getAddresses:', error);
            return res.status(500).json({ error: 'Failed to fetch addresses' });
        }
    }

    /**
     * Create a new address
     */
    static async createAddress(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            // Map the request body which might use frontend names (address1) to backend inputs (addressLine1)
            // Or assume frontend sends correct keys.
            // Let's assume frontend sends keys: address1, city, etc.
            const rawBody = req.body;

            const input: CreateAddressInput = {
                type: rawBody.type,
                firstName: rawBody.firstName,
                lastName: rawBody.lastName,
                company: rawBody.company,
                addressLine1: rawBody.address1 || rawBody.addressLine1, // Handle both
                addressLine2: rawBody.address2 || rawBody.addressLine2,
                city: rawBody.city,
                state: rawBody.state,
                postalCode: rawBody.zipCode || rawBody.postalCode, // Handle both
                country: rawBody.country,
                phone: rawBody.phone,
                isDefault: rawBody.isDefault,
                label: rawBody.label
            };

            // Basic validation
            if (!input.addressLine1 || !input.city || !input.state || !input.postalCode || !input.country) {
                return res.status(400).json({ error: 'Missing required address fields' });
            }

            if (!input.type || (input.type !== 'billing' && input.type !== 'shipping')) {
                return res.status(400).json({ error: 'Invalid address type' });
            }

            const address = await AddressService.createAddress(userId, input);
            return res.status(201).json(address);
        } catch (error) {
            safeLogger.error('Error in createAddress:', error);
            return res.status(500).json({ error: 'Failed to create address' });
        }
    }

    /**
     * Update an address
     */
    static async updateAddress(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const { id } = req.params;
            const rawBody = req.body;

            const input: UpdateAddressInput = {
                type: rawBody.type,
                firstName: rawBody.firstName,
                lastName: rawBody.lastName,
                company: rawBody.company,
                addressLine1: rawBody.address1 || rawBody.addressLine1,
                addressLine2: rawBody.address2 || rawBody.addressLine2,
                city: rawBody.city,
                state: rawBody.state,
                postalCode: rawBody.zipCode || rawBody.postalCode,
                country: rawBody.country,
                phone: rawBody.phone,
                isDefault: rawBody.isDefault,
                label: rawBody.label
            };

            const existing = await AddressService.getAddressById(id, userId);
            if (!existing) {
                return res.status(404).json({ error: 'Address not found' });
            }

            const address = await AddressService.updateAddress(id, userId, input);
            return res.status(200).json(address);
        } catch (error) {
            safeLogger.error('Error in updateAddress:', error);
            return res.status(500).json({ error: 'Failed to update address' });
        }
    }

    /**
     * Delete an address
     */
    static async deleteAddress(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const { id } = req.params;

            const existing = await AddressService.getAddressById(id, userId);
            if (!existing) {
                return res.status(404).json({ error: 'Address not found' });
            }

            await AddressService.deleteAddress(id, userId);
            return res.status(200).json({ message: 'Address deleted successfully' });
        } catch (error) {
            safeLogger.error('Error in deleteAddress:', error);
            return res.status(500).json({ error: 'Failed to delete address' });
        }
    }

    /**
     * Set an address as default
     */
    static async setDefaultAddress(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const { id } = req.params;

            const existing = await AddressService.getAddressById(id, userId);
            if (!existing) {
                return res.status(404).json({ error: 'Address not found' });
            }

            const address = await AddressService.setDefaultAddress(id, userId);
            return res.status(200).json(address);
        } catch (error) {
            safeLogger.error('Error in setDefaultAddress:', error);
            return res.status(500).json({ error: 'Failed to set default address' });
        }
    }
}
