import { API_BASE_URL } from '@/config/api';
import { deduplicatedFetch } from '../utils/requestDeduplication';
import { csrfService } from './csrfService';
import { enhancedAuthService } from './enhancedAuthService';

export interface Address {
    id: string;
    userId: string;
    addressType: 'billing' | 'shipping';
    label?: string;
    firstName: string;
    lastName: string;
    company?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string; // Changed from zipCode
    country: string;
    phone?: string;
    email?: string;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateAddressInput {
    type: 'billing' | 'shipping'; // Mapped to addressType in backend
    label?: string;
    firstName: string;
    lastName: string;
    company?: string;
    address1: string; // Mapped to addressLine1 in backend
    address2?: string; // Mapped to addressLine2 in backend
    city: string;
    state: string;
    zipCode: string; // Mapped to postalCode in backend
    country: string;
    phone?: string;
    email?: string;
    isDefault?: boolean;
}

export interface UpdateAddressInput extends Partial<CreateAddressInput> { }

export class AddressService {
    /**
     * Get all addresses for the authenticated user
     */
    static async getAddresses(token?: string): Promise<Address[]> {
        const authToken = token || enhancedAuthService.getAuthToken();
        if (!authToken) return [];

        try {
            const data = await deduplicatedFetch(`${API_BASE_URL}/api/user/addresses`, {
                headers: await this.getHeaders(authToken),
            });
            return data as Address[];
        } catch (error) {
            console.error('Error fetching addresses:', error);
            throw error;
        }
    }

    /**
     * Create a new address
     */
    static async createAddress(input: CreateAddressInput): Promise<Address> {
        const authToken = enhancedAuthService.getAuthToken();
        if (!authToken) throw new Error('Not authenticated');

        try {
            const response = await fetch(`${API_BASE_URL}/api/user/addresses`, {
                method: 'POST',
                headers: await this.getHeaders(authToken),
                body: JSON.stringify(input),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create address');
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating address:', error);
            throw error;
        }
    }

    /**
     * Update an address
     */
    static async updateAddress(id: string, input: UpdateAddressInput): Promise<Address> {
        const authToken = enhancedAuthService.getAuthToken();
        if (!authToken) throw new Error('Not authenticated');

        try {
            const response = await fetch(`${API_BASE_URL}/api/user/addresses/${id}`, {
                method: 'PUT',
                headers: await this.getHeaders(authToken),
                body: JSON.stringify(input),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update address');
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating address:', error);
            throw error;
        }
    }

    /**
     * Delete an address
     */
    static async deleteAddress(id: string): Promise<void> {
        const authToken = enhancedAuthService.getAuthToken();
        if (!authToken) throw new Error('Not authenticated');

        try {
            const response = await fetch(`${API_BASE_URL}/api/user/addresses/${id}`, {
                method: 'DELETE',
                headers: await this.getHeaders(authToken),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete address');
            }
        } catch (error) {
            console.error('Error deleting address:', error);
            throw error;
        }
    }

    /**
     * Set default address
     */
    static async setDefaultAddress(id: string): Promise<Address> {
        const authToken = enhancedAuthService.getAuthToken();
        if (!authToken) throw new Error('Not authenticated');

        try {
            const response = await fetch(`${API_BASE_URL}/api/user/addresses/${id}/default`, {
                method: 'POST',
                headers: await this.getHeaders(authToken),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to set default address');
            }

            return await response.json();
        } catch (error) {
            console.error('Error setting default address:', error);
            throw error;
        }
    }

    private static getAuthToken(): string | null {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('linkdao_access_token') ||
            localStorage.getItem('authToken') ||
            localStorage.getItem('token');
    }

    private static async getHeaders(token: string): Promise<HeadersInit> {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        try {
            const csrfHeaders = await csrfService.getCSRFHeaders();
            Object.assign(headers, csrfHeaders);
        } catch (error) {
            // Ignore CSRF errors
        }

        return headers;
    }
}
