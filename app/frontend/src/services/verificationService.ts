import { CreateVerificationRequestInput, VerificationRequest } from '../models/Verification';

const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';

export class VerificationService {
    private static getHeaders(): HeadersInit {
        const token = localStorage.getItem('linkdao_access_token') ||
            localStorage.getItem('authToken') ||
            localStorage.getItem('token') ||
            localStorage.getItem('auth_token');

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    static async submitRequest(data: CreateVerificationRequestInput): Promise<VerificationRequest> {
        const response = await fetch(`${BACKEND_API_BASE_URL}/api/verification/apply`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to submit verification request');
        }

        return response.json();
    }

    static async getMyRequests(): Promise<VerificationRequest[]> {
        const response = await fetch(`${BACKEND_API_BASE_URL}/api/verification/my-requests`, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch verification requests');
        }

        return response.json();
    }

    // Admin methods could go here if needed, but likely specific to admin dashboard
}
