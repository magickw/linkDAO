import { logger } from '../utils/logger';

// Multiple geolocation services as fallbacks
const GEO_SERVICES = [
  'https://ipapi.co/json/',
  'https://ipwho.is/',
  'https://api.ipgeolocation.io/ipgeo?apiKey=YOUR_API_KEY' // You'll need to add your own API key
];

interface GeoLocationData {
  country: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
  isp: string;
}

class GeoLocationService {
  private cachedLocation: GeoLocationData | null = null;
  private lastFetchTime: number = 0;
  private cacheDuration: number = 30 * 60 * 1000; // 30 minutes

  async getLocation(): Promise<GeoLocationData | null> {
    // Return cached location if still valid
    if (this.cachedLocation && Date.now() - this.lastFetchTime < this.cacheDuration) {
      return this.cachedLocation;
    }

    // Try multiple services as fallbacks
    for (const serviceUrl of GEO_SERVICES) {
      try {
        const location = await this.fetchFromService(serviceUrl);
        if (location) {
          this.cachedLocation = location;
          this.lastFetchTime = Date.now();
          return location;
        }
      } catch (error) {
        logger.warn(`Geolocation service failed (${serviceUrl}):`, error);
        // Continue to next service
      }
    }

    // If all services fail, return null
    logger.warn('All geolocation services failed, using default location');
    return null;
  }

  private async fetchFromService(url: string): Promise<GeoLocationData | null> {
    // Skip ip-api.com which is rate-limited
    if (url.includes('ip-api.com')) {
      throw new Error('Skipping ip-api.com due to rate limiting');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Parse response based on service
      if (url.includes('ipapi.co')) {
        return {
          country: data.country_name || data.country,
          region: data.region || data.region_name,
          city: data.city,
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
          timezone: data.timezone,
          isp: data.org || data.isp
        };
      } else if (url.includes('ipwho.is')) {
        return {
          country: data.country,
          region: data.region,
          city: data.city,
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
          timezone: data.timezone,
          isp: data.connection?.isp || data.isp
        };
      }

      return null;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  // Clear cache (useful for testing)
  clearCache(): void {
    this.cachedLocation = null;
    this.lastFetchTime = 0;
  }
}

export const geoLocationService = new GeoLocationService();
export default geoLocationService;