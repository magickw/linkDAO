import request from 'supertest';
import express from 'express';
import { serviceController } from '../controllers/serviceController';

// Mock the service
jest.mock('../services/serviceService', () => ({
  serviceService: {
    getCategories: jest.fn(),
    createService: jest.fn(),
    searchServices: jest.fn(),
    createBooking: jest.fn(),
    createProviderProfile: jest.fn(),
    getProviderStats: jest.fn(),
    updateBookingStatus: jest.fn(),
    setServiceAvailability: jest.fn(),
    updateMilestone: jest.fn(),
  }
}));

import { serviceService } from '../services/serviceService';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';

const app = express();
app.use(express.json());

// Mock auth middleware
app.use((req, res, next) => {
  (req as any).user = { walletAddress: 'test-wallet', userId: 'test-user-id' };
  next();
});

// Routes
app.get('/categories', serviceController.getCategories);
app.post('/services', serviceController.createService);
app.get('/services/search', serviceController.searchServices);
app.post('/bookings', serviceController.createBooking);
app.post('/provider-profile', serviceController.createProviderProfile);
app.get('/provider/stats', serviceController.getProviderStats);

describe('ServiceController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /categories', () => {
    it('should return service categories', async () => {
      const mockCategories = [
        {
          id: '1',
          name: 'Digital Services',
          description: 'Web development and design',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      (serviceService.getCategories as jest.Mock).mockResolvedValue(mockCategories);

      const response = await request(app)
        .get('/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockCategories);
      expect(serviceService.getCategories).toHaveBeenCalledTimes(1);
    });

    it('should handle errors when fetching categories', async () => {
      (serviceService.getCategories as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/categories')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to fetch categories');
    });
  });

  describe('POST /services', () => {
    it('should create a new service', async () => {
      const serviceData = {
        categoryId: 'cat-1',
        title: 'Web Development',
        description: 'Full-stack web development services',
        pricingModel: 'hourly',
        basePrice: '50.00',
        currency: 'USD'
      };

      const mockService = {
        id: 'service-1',
        providerId: 'test-user-id',
        ...serviceData,
        status: 'active',
        featured: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      (serviceService.createService as jest.Mock).mockResolvedValue(mockService);

      const response = await request(app)
        .post('/services')
        .send(serviceData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockService);
      expect(serviceService.createService).toHaveBeenCalledWith('test-user-id', serviceData);
    });

    it('should handle service creation errors', async () => {
      const serviceData = {
        categoryId: 'cat-1',
        title: 'Web Development',
        description: 'Full-stack web development services',
        pricingModel: 'hourly',
        basePrice: '50.00'
      };

      (serviceService.createService as jest.Mock).mockRejectedValue(new Error('Validation error'));

      const response = await request(app)
        .post('/services')
        .send(serviceData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to create service');
    });
  });

  describe('GET /services/search', () => {
    it('should search services with filters', async () => {
      const mockResult = {
        services: [
          {
            id: 'service-1',
            title: 'Web Development',
            pricingModel: 'hourly',
            basePrice: '50.00'
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1
        }
      };

      (serviceService.searchServices as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/services/search?categoryId=cat-1&pricingModel=hourly')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
      expect(serviceService.searchServices).toHaveBeenCalledWith(
        { categoryId: 'cat-1', pricingModel: 'hourly' },
        1,
        20
      );
    });
  });

  describe('POST /bookings', () => {
    it('should create a new booking', async () => {
      const bookingData = {
        serviceId: 'service-1',
        bookingType: 'consultation',
        clientRequirements: 'Need help with React app'
      };

      const mockBooking = {
        id: 'booking-1',
        clientId: 'test-user-id',
        ...bookingData,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      (serviceService.createBooking as jest.Mock).mockResolvedValue(mockBooking);

      const response = await request(app)
        .post('/bookings')
        .send(bookingData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockBooking);
      expect(serviceService.createBooking).toHaveBeenCalledWith('test-user-id', bookingData);
    });
  });

  describe('POST /provider-profile', () => {
    it('should create a provider profile', async () => {
      const profileData = {
        businessName: 'Tech Solutions Inc',
        tagline: 'Expert web development services',
        skills: ['React', 'Node.js', 'TypeScript']
      };

      const mockProfile = {
        id: 'profile-1',
        userId: 'test-user-id',
        ...profileData,
        isVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      (serviceService.createProviderProfile as jest.Mock).mockResolvedValue(mockProfile);

      const response = await request(app)
        .post('/provider-profile')
        .send(profileData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockProfile);
      expect(serviceService.createProviderProfile).toHaveBeenCalledWith('test-user-id', profileData);
    });
  });

  describe('GET /provider/stats', () => {
    it('should return provider statistics', async () => {
      const mockStats = {
        totalServices: 5,
        activeBookings: 3,
        completedBookings: 12,
        averageRating: 4.8,
        totalEarnings: '2500.00',
        responseRate: 95,
        completionRate: 98
      };

      (serviceService.getProviderStats as jest.Mock).mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/provider/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStats);
      expect(serviceService.getProviderStats).toHaveBeenCalledWith('test-user-id');
    });
  });
});
