import { 
  Service, 
  ServiceCategory, 
  ServiceBooking, 
  ServiceAvailability,
  ServiceMilestone,
  ServiceProviderProfile,
  ServiceSearchFilters,
  ServiceStats,
  CreateServiceRequest,
  CreateBookingRequest
} from '../types/service';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

class ServiceApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('auth_token') || '';
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  }

  // Service Categories
  async getCategories(): Promise<ServiceCategory[]> {
    return this.request<ServiceCategory[]>('/api/services/categories');
  }

  // Service Management
  async createService(serviceData: CreateServiceRequest): Promise<Service> {
    return this.request<Service>('/api/services/services', {
      method: 'POST',
      body: JSON.stringify(serviceData),
    });
  }

  async updateService(serviceId: string, updateData: Partial<CreateServiceRequest>): Promise<Service> {
    return this.request<Service>(`/api/services/services/${serviceId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async getService(serviceId: string): Promise<Service> {
    return this.request<Service>(`/api/services/services/${serviceId}`);
  }

  async searchServices(filters: ServiceSearchFilters, page: number = 1, limit: number = 20): Promise<{
    services: Service[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined && value !== null)
      ),
    });

    return this.request<{
      services: Service[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/api/services/services/search?${params}`);
  }

  async getProviderServices(): Promise<Service[]> {
    return this.request<Service[]>('/api/services/services/my-services');
  }

  // Service Availability
  async setServiceAvailability(serviceId: string, availability: Omit<ServiceAvailability, 'id' | 'serviceId' | 'createdAt'>[]): Promise<ServiceAvailability[]> {
    return this.request<ServiceAvailability[]>(`/api/services/services/${serviceId}/availability`, {
      method: 'POST',
      body: JSON.stringify({ availability }),
    });
  }

  async getServiceAvailability(serviceId: string): Promise<ServiceAvailability[]> {
    return this.request<ServiceAvailability[]>(`/api/services/services/${serviceId}/availability`);
  }

  // Booking Management
  async createBooking(bookingData: CreateBookingRequest): Promise<ServiceBooking> {
    return this.request<ServiceBooking>('/api/services/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }

  async getBooking(bookingId: string): Promise<ServiceBooking> {
    return this.request<ServiceBooking>(`/api/services/bookings/${bookingId}`);
  }

  async getUserBookings(role?: 'client' | 'provider'): Promise<ServiceBooking[]> {
    const params = role ? `?role=${role}` : '';
    return this.request<ServiceBooking[]>(`/api/services/bookings${params}`);
  }

  async updateBookingStatus(bookingId: string, status: string): Promise<ServiceBooking> {
    return this.request<ServiceBooking>(`/api/services/bookings/${bookingId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Provider Profile Management
  async createProviderProfile(profileData: Partial<ServiceProviderProfile>): Promise<ServiceProviderProfile> {
    return this.request<ServiceProviderProfile>('/api/services/provider-profile', {
      method: 'POST',
      body: JSON.stringify(profileData),
    });
  }

  async updateProviderProfile(updateData: Partial<ServiceProviderProfile>): Promise<ServiceProviderProfile> {
    return this.request<ServiceProviderProfile>('/api/services/provider-profile', {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async getProviderProfile(userId: string): Promise<ServiceProviderProfile> {
    return this.request<ServiceProviderProfile>(`/api/services/provider-profile/${userId}`);
  }

  // Milestone Management
  async updateMilestone(milestoneId: string, updateData: {
    status?: string;
    deliverables?: string[];
    clientFeedback?: string;
  }): Promise<ServiceMilestone> {
    return this.request<ServiceMilestone>(`/api/services/milestones/${milestoneId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  }

  async getBookingMilestones(bookingId: string): Promise<ServiceMilestone[]> {
    return this.request<ServiceMilestone[]>(`/api/services/bookings/${bookingId}/milestones`);
  }

  // Statistics
  async getProviderStats(): Promise<ServiceStats> {
    return this.request<ServiceStats>('/api/services/provider/stats');
  }
}

export const serviceApiService = new ServiceApiService();