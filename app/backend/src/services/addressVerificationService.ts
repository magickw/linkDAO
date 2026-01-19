/**
 * Address Verification Service
 *
 * Validates and normalizes shipping addresses using Google Maps Geocoding API
 * Provides address suggestions and validation for international addresses
 */

import axios from 'axios';
import { safeLogger } from '../utils/safeLogger';
import { withTimeout } from '../utils/paymentTimeout';

export interface Address {
  fullName?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface AddressValidationResult {
  valid: boolean;
  normalized?: Address;
  suggestions?: Address[];
  confidence?: 'high' | 'medium' | 'low';
  errors?: Array<{
    field: string;
    message: string;
  }>;
  metadata?: {
    latitude?: number;
    longitude?: number;
    formattedAddress?: string;
    addressType?: string;
  };
}

export class AddressVerificationService {
  private readonly googleApiKey: string;
  private readonly timeout = 5000; // 5 seconds

  constructor() {
    this.googleApiKey = process.env.GOOGLE_MAPS_API_KEY || '';

    if (!this.googleApiKey) {
      safeLogger.warn('Google Maps API key not configured. Address verification will use basic validation only.');
    }
  }

  /**
   * Validate address with Google Maps API
   */
  async validateAddress(address: Address): Promise<AddressValidationResult> {
    // Basic validation first
    const basicValidation = this.basicValidation(address);
    if (!basicValidation.valid) {
      return basicValidation;
    }

    // If Google API key is not configured, return basic validation result
    if (!this.googleApiKey) {
      return {
        valid: true,
        normalized: address,
        confidence: 'low'
      };
    }

    try {
      // Format address for geocoding
      const addressString = this.formatAddressString(address);

      // Call Google Geocoding API with timeout
      const response = await withTimeout(
        axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
          params: {
            address: addressString,
            key: this.googleApiKey,
            components: `country:${address.country}`
          }
        }),
        this.timeout,
        'Address Verification'
      );

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const result = response.data.results[0];
        const components = this.parseAddressComponents(result.address_components);

        // Normalize address based on Google's response
        const normalized = this.normalizeAddress(address, components);

        // Calculate confidence based on location type
        const confidence = this.calculateConfidence(result);

        return {
          valid: true,
          normalized,
          confidence,
          metadata: {
            latitude: result.geometry.location.lat,
            longitude: result.geometry.location.lng,
            formattedAddress: result.formatted_address,
            addressType: result.types[0]
          }
        };
      } else if (response.data.status === 'ZERO_RESULTS') {
        return {
          valid: false,
          errors: [
            {
              field: 'address',
              message: 'Address could not be verified. Please check and try again.'
            }
          ]
        };
      } else {
        safeLogger.warn(`Google Geocoding API returned status: ${response.data.status}`);
        // Fallback to basic validation
        return {
          valid: true,
          normalized: address,
          confidence: 'low'
        };
      }
    } catch (error) {
      safeLogger.error('Error validating address with Google API:', error);
      // Fallback to basic validation on error
      return {
        valid: true,
        normalized: address,
        confidence: 'low'
      };
    }
  }

  /**
   * Basic address validation without external API
   */
  private basicValidation(address: Address): AddressValidationResult {
    const errors: Array<{ field: string; message: string }> = [];

    // Required fields
    if (!address.addressLine1 || address.addressLine1.trim().length === 0) {
      errors.push({ field: 'addressLine1', message: 'Street address is required' });
    }

    if (!address.city || address.city.trim().length === 0) {
      errors.push({ field: 'city', message: 'City is required' });
    }

    if (!address.state || address.state.trim().length === 0) {
      errors.push({ field: 'state', message: 'State/Province is required' });
    }

    if (!address.postalCode || address.postalCode.trim().length === 0) {
      errors.push({ field: 'postalCode', message: 'Postal code is required' });
    }

    if (!address.country || address.country.trim().length === 0) {
      errors.push({ field: 'country', message: 'Country is required' });
    }

    // Country-specific postal code validation
    if (address.postalCode) {
      const postalCodeError = this.validatePostalCode(address.postalCode, address.country);
      if (postalCodeError) {
        errors.push({ field: 'postalCode', message: postalCodeError });
      }
    }

    // Address length validation
    if (address.addressLine1 && address.addressLine1.length > 100) {
      errors.push({ field: 'addressLine1', message: 'Address line 1 is too long (max 100 characters)' });
    }

    if (address.addressLine2 && address.addressLine2.length > 100) {
      errors.push({ field: 'addressLine2', message: 'Address line 2 is too long (max 100 characters)' });
    }

    if (address.city && address.city.length > 50) {
      errors.push({ field: 'city', message: 'City name is too long (max 50 characters)' });
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate postal code format by country
   */
  private validatePostalCode(postalCode: string, country: string): string | null {
    const patterns: Record<string, { pattern: RegExp; message: string }> = {
      'US': {
        pattern: /^\d{5}(-\d{4})?$/,
        message: 'US postal code must be in format: 12345 or 12345-6789'
      },
      'CA': {
        pattern: /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/i,
        message: 'Canadian postal code must be in format: A1A 1A1'
      },
      'GB': {
        pattern: /^[A-Z]{1,2}\d{1,2}[A-Z]? ?\d[A-Z]{2}$/i,
        message: 'UK postal code format is invalid'
      },
      'AU': {
        pattern: /^\d{4}$/,
        message: 'Australian postal code must be 4 digits'
      },
      'DE': {
        pattern: /^\d{5}$/,
        message: 'German postal code must be 5 digits'
      },
      'FR': {
        pattern: /^\d{5}$/,
        message: 'French postal code must be 5 digits'
      },
      'JP': {
        pattern: /^\d{3}-?\d{4}$/,
        message: 'Japanese postal code must be in format: 123-4567'
      },
      'CN': {
        pattern: /^\d{6}$/,
        message: 'Chinese postal code must be 6 digits'
      }
    };

    const validation = patterns[country.toUpperCase()];
    if (validation && !validation.pattern.test(postalCode)) {
      return validation.message;
    }

    return null;
  }

  /**
   * Format address as string for geocoding
   */
  private formatAddressString(address: Address): string {
    const parts = [
      address.addressLine1,
      address.addressLine2,
      address.city,
      address.state,
      address.postalCode,
      address.country
    ].filter(Boolean);

    return parts.join(', ');
  }

  /**
   * Parse Google address components
   */
  private parseAddressComponents(components: any[]): Record<string, string> {
    const parsed: Record<string, string> = {};

    for (const component of components) {
      const types = component.types;

      if (types.includes('street_number')) {
        parsed.streetNumber = component.long_name;
      }
      if (types.includes('route')) {
        parsed.route = component.long_name;
      }
      if (types.includes('locality')) {
        parsed.city = component.long_name;
      }
      if (types.includes('administrative_area_level_1')) {
        parsed.state = component.short_name;
      }
      if (types.includes('postal_code')) {
        parsed.postalCode = component.long_name;
      }
      if (types.includes('postal_code_suffix')) {
        parsed.postalCodeSuffix = component.long_name;
      }
      if (types.includes('country')) {
        parsed.country = component.short_name;
      }
    }

    return parsed;
  }

  /**
   * Normalize address using Google's parsed components
   */
  private normalizeAddress(original: Address, components: Record<string, string>): Address {
    let addressLine1 = original.addressLine1;

    // Construct normalized street address
    if (components.streetNumber && components.route) {
      addressLine1 = `${components.streetNumber} ${components.route}`;
    }

    return {
      ...original,
      addressLine1: addressLine1 || original.addressLine1,
      city: components.city || original.city,
      state: components.state || original.state,
      postalCode: components.postalCode || original.postalCode,
      country: components.country || original.country
    };
  }

  /**
   * Calculate confidence level based on geocoding result
   */
  private calculateConfidence(result: any): 'high' | 'medium' | 'low' {
    const locationType = result.geometry?.location_type;

    if (locationType === 'ROOFTOP') {
      return 'high';
    } else if (locationType === 'RANGE_INTERPOLATED' || locationType === 'GEOMETRIC_CENTER') {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Get address suggestions (autocomplete)
   */
  async getAddressSuggestions(partialAddress: string, country: string = 'US'): Promise<string[]> {
    if (!this.googleApiKey) {
      return [];
    }

    try {
      const response = await withTimeout(
        axios.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
          params: {
            input: partialAddress,
            key: this.googleApiKey,
            types: 'address',
            components: `country:${country}`
          }
        }),
        this.timeout,
        'Address Autocomplete'
      );

      if (response.data.status === 'OK') {
        return response.data.predictions.map((p: any) => p.description);
      }

      return [];
    } catch (error) {
      safeLogger.error('Error getting address suggestions:', error);
      return [];
    }
  }
}

export const addressVerificationService = new AddressVerificationService();
