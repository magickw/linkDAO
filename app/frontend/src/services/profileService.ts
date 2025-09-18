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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create profile');
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Get a profile by its ID
   * @param id - Profile ID
   * @returns The profile or null if not found
   */
  static async getProfileById(id: string): Promise<UserProfile | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/profiles/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch profile');
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Get a profile by wallet address
   * @param address - Wallet address
   * @returns The profile or null if not found
   */
  static async getProfileByAddress(address: string): Promise<UserProfile | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      console.log(`Fetching profile for address: ${address}`);
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/profiles/address/${address}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        
        let errorMessage = 'Failed to fetch profile';
        try {
          const error = await response.json();
          errorMessage = error.error || error.message || errorMessage;
        } catch (jsonError) {
          // If response is not JSON (e.g., HTML error page), provide a better error message
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('text/html')) {
            errorMessage = `Backend service unavailable (received HTML instead of JSON). Please check if the backend is running on ${BACKEND_API_BASE_URL}`;
          } else {
            errorMessage = `Invalid response from backend (status: ${response.status})`;
          }
        }
        
        console.error(`Failed to fetch profile for address ${address}:`, errorMessage);
        throw new Error(errorMessage);
      }
      
      try {
        return await response.json();
      } catch (jsonError) {
        console.error(`Failed to parse JSON response for address ${address}:`, jsonError);
        throw new Error('Backend returned invalid JSON response');
      }
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      // Handle network connection errors
      if (error instanceof Error && 
          (error.message.includes('fetch') || 
           error.message.includes('NetworkError') || 
           error.message.includes('Failed to fetch'))) {
        console.warn(`Backend unavailable, falling back to minimal profile for ${address}`);
        // Return null instead of throwing error to allow graceful degradation
        return null;
      }
      
      console.error(`Error fetching profile for address ${address}:`, error);
      throw error;
    }
  }

  /**
   * Update an existing profile
   * @param id - Profile ID
   * @param data - Updated profile data
   * @returns The updated profile
   */
  static async updateProfile(id: string, data: UpdateUserProfileInput): Promise<UserProfile> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/profiles/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update profile');
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Delete a profile
   * @param id - Profile ID
   * @returns True if deleted, false if not found
   */
  static async deleteProfile(id: string): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/profiles/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 404) {
          return false;
        }
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete profile');
      }
      
      return true;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Get all profiles
   * @returns Array of all profiles
   */
  static async getAllProfiles(): Promise<UserProfile[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/profiles`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch profiles');
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }
}