/**
 * Geolocation Service with Multiple Fallback Providers
 * Handles IP-based geolocation with graceful degradation
 */

export interface LocationData {
  country?: string;
  countryCode?: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export class GeolocationService {
  private providers = [
    {
      name: 'ipapi.co',
      url: 'https://ipapi.co/json/',
      transform: (data: any): LocationData => ({
        country: data.country_name,
        countryCode: data.country_code,
        city: data.city,
        region: data.region,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone
      })
    },
    {
      name: 'ipwhois.app',
      url: 'https://ipwhois.app/json/',
      transform: (data: any): LocationData => ({
        country: data.country,
        countryCode: data.country_code,
        city: data.city,
        region: data.region,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone
      })
    }
  ];

  private cache: Map<string, { data: LocationData | null; timestamp: number }> = new Map();
  private cacheTimeout = 1000 * 60 * 60; // 1 hour

  /**
   * Get location data for an IP address
   * Returns null if all providers fail (non-blocking)
   */
  async getLocation(ip?: string): Promise<LocationData | null> {
    // Check cache first
    const cacheKey = ip || 'self';
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    // Try each provider in sequence
    for (const provider of this.providers) {
      try {
        const url = ip ? `${provider.url}${ip}` : provider.url;
        const response = await fetch(url, {
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });

        if (response.ok) {
          const data = await response.json();
          const location = provider.transform(data);
          
          // Cache the result
          this.cache.set(cacheKey, {
            data: location,
            timestamp: Date.now()
          });

          console.info(`Geolocation obtained from ${provider.name}`);
          return location;
        }
      } catch (error) {
        console.warn(`Geolocation provider ${provider.name} failed:`, error);
        // Continue to next provider
      }
    }

    // All providers failed - cache null result to avoid repeated attempts
    console.warn('All geolocation providers failed, continuing without location data');
    this.cache.set(cacheKey, {
      data: null,
      timestamp: Date.now()
    });

    return null;
  }

  /**
   * Get location with a default fallback
   */
  async getLocationWithFallback(ip?: string, fallback: LocationData = {}): Promise<LocationData> {
    const location = await this.getLocation(ip);
    return location || fallback;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton instance
export const geolocationService = new GeolocationService();
