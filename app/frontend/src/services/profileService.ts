import { UserProfile, CreateUserProfileInput, UpdateUserProfileInput } from '../models/UserProfile';
import { deduplicatedFetch } from '../utils/requestDeduplication';

// Get the backend API base URL from environment variables
const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';

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
      // Get auth token from localStorage - check multiple possible storage keys
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

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/profiles`, {
        method: 'POST',
        headers,
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
      
      const profile = await response.json();
      // Convert string dates to Date objects
      return {
        ...profile,
        createdAt: new Date(profile.createdAt),
        updatedAt: new Date(profile.updatedAt)
      };
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
          const errorData = await response.json();
          // Extract error message from various possible error response formats
          if (errorData.error) {
            if (typeof errorData.error === 'string') {
              errorMessage = errorData.error;
            } else if (typeof errorData.error === 'object' && errorData.error.message) {
              errorMessage = errorData.error.message;
            } else {
              errorMessage = JSON.stringify(errorData.error);
            }
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
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
        const contentType = response.headers.get('content-type') || '';
        const raw = await response.text();
        // Empty body or 204-equivalent — treat as no profile
        if (!raw || raw.trim().length === 0) {
          return null;
        }
        let parsed: any;
        try {
          parsed = JSON.parse(raw);
        } catch (parseErr) {
          console.error(`Failed to parse JSON response for address ${address}. Raw snippet:`, raw.slice(0, 200));
          // Do not crash the UI on bad backend payloads; treat as no profile
          return null;
        }
        // Convert string dates to Date objects
        if (parsed && parsed.data) {
          return {
            ...parsed.data,
            createdAt: new Date(parsed.data.createdAt),
            updatedAt: new Date(parsed.data.updatedAt)
          };
        }
        // Handle case where the response is the profile data directly (not wrapped in data)
        if (parsed && parsed.id) {
          return {
            ...parsed,
            createdAt: new Date(parsed.createdAt),
            updatedAt: new Date(parsed.updatedAt)
          };
        }
        return null;
      } catch (jsonError) {
        console.error(`Failed handling response for address ${address}:`, jsonError);
        // Graceful fallback: return null instead of throwing
        return null;
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
      // Get auth token from localStorage - check multiple possible storage keys
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

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/profiles/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = 'Failed to update profile';
        try {
          const errorData = await response.json();
          // Extract error message from various possible error response formats
          if (errorData.error) {
            if (typeof errorData.error === 'string') {
              errorMessage = errorData.error;
            } else if (typeof errorData.error === 'object' && errorData.error.message) {
              errorMessage = errorData.error.message;
            } else {
              errorMessage = JSON.stringify(errorData.error);
            }
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (jsonError) {
          // If response is not JSON, provide a better error message
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('text/html')) {
            errorMessage = `Backend service unavailable (received HTML instead of JSON). Please check if the backend is running on ${BACKEND_API_BASE_URL}`;
          } else {
            errorMessage = `Invalid response from backend (status: ${response.status})`;
          }
        }
        throw new Error(errorMessage);
      }

      const profile = await response.json();
      // Convert string dates to Date objects
      return {
        ...profile.data,
        createdAt: new Date(profile.data.createdAt),
        updatedAt: new Date(profile.data.updatedAt)
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Update a profile by wallet address
   * @param address - Wallet address
   * @param data - Updated profile data
   * @returns The updated profile
   */
  static async updateProfileByAddress(address: string, data: UpdateUserProfileInput): Promise<UserProfile> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      // Get auth token from localStorage - check multiple possible storage keys
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

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/profiles/address/${address}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = 'Failed to update profile';
        try {
          const error = await response.json();
          errorMessage = error.error?.message || error.error || errorMessage;
        } catch (jsonError) {
          // If response is not JSON, provide a better error message
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('text/html')) {
            errorMessage = `Backend service unavailable (received HTML instead of JSON). Please check if the backend is running on ${BACKEND_API_BASE_URL}`;
          } else {
            errorMessage = `Invalid response from backend (status: ${response.status})`;
          }
        }
        throw new Error(errorMessage);
      }

      const profile = await response.json();
      // Convert string dates to Date objects
      return {
        ...profile.data,
        createdAt: new Date(profile.data.createdAt),
        updatedAt: new Date(profile.data.updatedAt)
      };
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
      // Get auth token from localStorage - check multiple possible storage keys
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

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/profiles/${id}`, {
        method: 'DELETE',
        headers,
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
      
      const profiles = await response.json();
      // Convert string dates to Date objects for all profiles
      return profiles.map((profile: any) => ({
        ...profile,
        createdAt: new Date(profile.createdAt),
        updatedAt: new Date(profile.updatedAt)
      }));
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }
}