import { UserProfile, CreateUserProfileInput, UpdateUserProfileInput } from '../models/UserProfile';

// Get the backend API base URL from environment variables
const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002';

/**
 * Profile API Service
 * Provides functions to interact with the backend profile API endpoints
 */
export class ProfileService {
  /**
   * Create a new user profile
   * @param data - Profile data to create
   * @returns The created profile
   */
  static async createProfile(data: CreateUserProfileInput): Promise<UserProfile> {
    const response = await fetch(`${BACKEND_API_BASE_URL}/api/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create profile');
    }

    return response.json();
  }

  /**
   * Get a profile by its ID
   * @param id - Profile ID
   * @returns The profile or null if not found
   */
  static async getProfileById(id: string): Promise<UserProfile | null> {
    const response = await fetch(`${BACKEND_API_BASE_URL}/api/profiles/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch profile');
    }

    return response.json();
  }

  /**
   * Get a profile by wallet address
   * @param address - Wallet address
   * @returns The profile or null if not found
   */
  static async getProfileByAddress(address: string): Promise<UserProfile | null> {
    const response = await fetch(`${BACKEND_API_BASE_URL}/api/profiles/address/${address}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch profile');
    }

    return response.json();
  }

  /**
   * Update an existing profile
   * @param id - Profile ID
   * @param data - Updated profile data
   * @returns The updated profile
   */
  static async updateProfile(id: string, data: UpdateUserProfileInput): Promise<UserProfile> {
    const response = await fetch(`${BACKEND_API_BASE_URL}/api/profiles/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update profile');
    }

    return response.json();
  }

  /**
   * Delete a profile
   * @param id - Profile ID
   * @returns True if deleted, false if not found
   */
  static async deleteProfile(id: string): Promise<boolean> {
    const response = await fetch(`${BACKEND_API_BASE_URL}/api/profiles/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return false;
      }
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete profile');
    }

    return true;
  }

  /**
   * Get all profiles
   * @returns Array of all profiles
   */
  static async getAllProfiles(): Promise<UserProfile[]> {
    const response = await fetch(`${BACKEND_API_BASE_URL}/api/profiles`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch profiles');
    }

    return response.json();
  }
}