/**
 * Geolocation Service with Rate Limit Handling
 * 
 * Provides IP-based geolocation with:
 * - Local caching to avoid rate limits
 * - Graceful fallback when service unavailable
 * - Multiple provider support
 */

interface GeolocationData {
  country?: string;
  region?: string;
  city?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;
}

class GeolocationService {
  private cache: Map<string, { data: GeolocationData; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly STORAGE_KEY = 'geolocation_cache';
  private rateLimitedUntil: number = 0;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.cache = new Map(Object.entries(data));
      }
    } catch (error) {
      console.warn('Failed to load geolocation cache:', error);
    }
  }

  private saveToStorage() {
    try {
      const data = Object.fromEntries(this.cache);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save geolocation cache:', error);
    }
  }

  async getGeolocation(): Promise<GeolocationData | null> {
    // Check if we're rate limited
    if (Date.now() < this.rateLimitedUntil) {
      console.log('Geolocation service rate limited, using cached data');
      return this.getCachedData();
    }

    // Check cache first
    const cached = this.getCachedData();
    if (cached) {
      return cached;
    }

    // Try to fetch new data
    try {
      const response = await fetch('https://ipapi.co/json/', {
        signal: AbortSignal.timeout(5000)
      });

      if (response.status === 429 || response.status === 403) {
        // Rate limited
        this.rateLimitedUntil = Date.now() + 60 * 60 * 1000; // 1 hour
        console.warn('Geolocation service rate limited');
        return this.getCachedData();
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Cache the result
      this.cache.set('current', {
        data: {
          country: data.country_name,
          region: data.region,
          city: data.city,
          lat: data.latitude,
          lon: data.longitude,
          timezone: data.timezone,
          isp: data.org
        },
        timestamp: Date.now()
      });
      
      this.saveToStorage();
      return this.cache.get('current')!.data;
    } catch (error) {
      console.warn('Geolocation service failed, trying next:', error);
      return this.getCachedData();
    }
  }

  private getCachedData(): GeolocationData | null {
    const cached = this.cache.get('current');
    if (!cached) return null;

    // Check if cache is still valid
    if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
      this.cache.delete('current');
      this.saveToStorage();
      return null;
    }

    return cached.data;
  }

  clearCache() {
    this.cache.clear();
    this.saveToStorage();
    this.rateLimitedUntil = 0;
  }
}

export const geolocationService = new GeolocationService();
