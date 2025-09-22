/**
 * Enhanced Marketplace Service - Handles the new marketplace enhancements
 * Integrates with the enhanced backend services for ENS, image storage, and order management
 */

export interface ENSValidationResult {
  isValid: boolean;
  isAvailable: boolean;
  isOwned: boolean;
  errors: string[];
  suggestions: string[];
}

export interface ImageUploadResult {
  ipfsHash: string;
  cdnUrl: string;
  thumbnails: {
    small: string;
    medium: string;
    large: string;
  };
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
}

export interface ListingCreationRequest {
  sellerId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  images: File[];
  metadata: any;
  escrowEnabled: boolean;
}

export interface PaymentValidationRequest {
  paymentMethod: 'crypto' | 'fiat' | 'escrow';
  amount: number;
  currency: string;
  userAddress: string;
  paymentDetails: any;
}

export interface PaymentValidationResult {
  isValid: boolean;
  hasSufficientBalance: boolean;
  errors: string[];
  warnings: string[];
  suggestedAlternatives?: PaymentAlternative[];
}

export interface PaymentAlternative {
  method: 'crypto' | 'fiat' | 'escrow';
  description: string;
  available: boolean;
  estimatedTotal: number;
  currency: string;
}

export class EnhancedMarketplaceService {
  private baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

  // ENS Integration Methods
  async validateENSHandle(ensHandle: string): Promise<ENSValidationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/sellers/ens/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ensHandle }),
      });

      if (!response.ok) {
        throw new Error('Failed to validate ENS handle');
      }

      const result = await response.json();
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to validate ENS handle');
      }
    } catch (error) {
      console.error('Error validating ENS handle:', error);
      return {
        isValid: false,
        isAvailable: false,
        isOwned: false,
        errors: ['Failed to validate ENS handle'],
        suggestions: [],
      };
    }
  }

  async verifyENSOwnership(ensHandle: string, walletAddress: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/sellers/ens/verify-ownership`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ensHandle, walletAddress }),
      });

      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      return result.success && result.data?.isOwned;
    } catch (error) {
      console.error('Error verifying ENS ownership:', error);
      return false;
    }
  }

  // Image Storage Methods
  async uploadImage(file: File, category: 'profile' | 'cover' | 'listing'): Promise<ImageUploadResult> {
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('category', category);

      const response = await fetch(`${this.baseUrl}/api/images/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload image');
      }

      const result = await response.json();
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  async deleteImage(ipfsHash: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/images/${ipfsHash}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete image');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to delete image');
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  }

  // Enhanced Listing Methods
  async createListingWithImages(listingData: ListingCreationRequest): Promise<any> {
    try {
      const formData = new FormData();
      
      // Add text fields
      formData.append('sellerId', listingData.sellerId);
      formData.append('title', listingData.title);
      formData.append('description', listingData.description);
      formData.append('price', listingData.price.toString());
      formData.append('currency', listingData.currency);
      formData.append('category', listingData.category);
      formData.append('escrowEnabled', listingData.escrowEnabled.toString());
      formData.append('metadata', JSON.stringify(listingData.metadata));

      // Add image files
      listingData.images.forEach((image, index) => {
        formData.append(`images`, image);
      });

      const response = await fetch(`${this.baseUrl}/api/listings/create-with-images`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create listing');
      }

      const result = await response.json();
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to create listing');
      }
    } catch (error) {
      console.error('Error creating listing with images:', error);
      throw error;
    }
  }

  async getMarketplaceListings(filters?: any): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });
      }

      const response = await fetch(`${this.baseUrl}/marketplace/listings?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch marketplace listings');
      }

      const result = await response.json();
      if (result.success) {
        return result.data || [];
      } else {
        throw new Error(result.message || 'Failed to fetch marketplace listings');
      }
    } catch (error) {
      console.error('Error fetching marketplace listings:', error);
      return [];
    }
  }

  // Enhanced Payment Methods
  async validatePaymentMethod(request: PaymentValidationRequest): Promise<PaymentValidationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/payments/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error('Failed to validate payment method');
      }

      const result = await response.json();
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to validate payment method');
      }
    } catch (error) {
      console.error('Error validating payment method:', error);
      return {
        isValid: false,
        hasSufficientBalance: false,
        errors: ['Failed to validate payment method'],
        warnings: [],
        suggestedAlternatives: [],
      };
    }
  }

  async processEnhancedCheckout(checkoutData: any): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/checkout/enhanced`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(checkoutData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process checkout');
      }

      const result = await response.json();
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to process checkout');
      }
    } catch (error) {
      console.error('Error processing enhanced checkout:', error);
      throw error;
    }
  }

  // Order Management Methods
  async createOrderWithPayment(orderData: any): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/orders/create-with-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create order');
      }

      const result = await response.json();
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to create order');
      }
    } catch (error) {
      console.error('Error creating order with payment:', error);
      throw error;
    }
  }

  async getOrderTrackingInfo(orderId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/orders/${orderId}/tracking`);
      
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch order tracking info');
      }

      const result = await response.json();
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to fetch order tracking info');
      }
    } catch (error) {
      console.error('Error fetching order tracking info:', error);
      return null;
    }
  }

  // Profile Enhancement Methods
  async updateSellerProfileEnhanced(walletAddress: string, profileData: any): Promise<any> {
    try {
      const formData = new FormData();
      
      // Add text fields
      Object.entries(profileData).forEach(([key, value]) => {
        if (key !== 'profileImage' && key !== 'coverImage' && value !== undefined) {
          if (typeof value === 'object') {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, value.toString());
          }
        }
      });
      
      // Add image files
      if (profileData.profileImage) {
        formData.append('profileImage', profileData.profileImage);
      }
      if (profileData.coverImage) {
        formData.append('coverImage', profileData.coverImage);
      }

      const response = await fetch(`${this.baseUrl}/api/sellers/profile/${walletAddress}/enhanced`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update seller profile');
      }

      const result = await response.json();
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to update seller profile');
      }
    } catch (error) {
      console.error('Error updating seller profile:', error);
      throw error;
    }
  }

  // Utility Methods
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  async getSystemStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/system/status`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch system status');
      }

      const result = await response.json();
      return result.data || {};
    } catch (error) {
      console.error('Error fetching system status:', error);
      return {};
    }
  }
}

export const enhancedMarketplaceService = new EnhancedMarketplaceService();