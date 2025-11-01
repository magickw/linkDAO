import { serviceService } from '../services/serviceService';

// Mock the database
jest.mock('../db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  }
}));

import { db } from '../db';

describe('ServiceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCategories', () => {
    it('should return active service categories', async () => {
      const mockCategories = [
        {
          id: '1',
          name: 'Digital Services',
          description: 'Web development and design',
          parentId: null,
          icon: 'computer',
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ];

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(mockCategories)
      };

      (db.select as jest.Mock).mockReturnValue(mockSelect);

      const result = await serviceService.getCategories();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Digital Services');
      expect(mockSelect.from).toHaveBeenCalled();
    });
  });

  describe('createService', () => {
    it('should create a new service', async () => {
      const providerId = 'provider-1';
      const serviceData = {
        categoryId: 'cat-1',
        title: 'Web Development',
        description: 'Full-stack web development services',
        pricingModel: 'hourly' as const,
        basePrice: '50.00',
        currency: 'USD'
      };

      const mockService = {
        id: 'service-1',
        providerId,
        ...serviceData,
        shortDescription: null,
        durationMinutes: null,
        isRemote: true,
        locationRequired: false,
        serviceLocation: null,
        tags: [],
        requirements: null,
        deliverables: null,
        portfolioItems: [],
        status: 'active',
        featured: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const mockInsert = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockService])
      };

      (db.insert as jest.Mock).mockReturnValue(mockInsert);

      const result = await serviceService.createService(providerId, serviceData);

      expect(result.title).toBe('Web Development');
      expect(result.providerId).toBe(providerId);
      expect(result.pricingModel).toBe('hourly');
      expect(mockInsert.values).toHaveBeenCalled();
    });
  });

  describe('searchServices', () => {
    it('should search services with filters', async () => {
      const filters = {
        categoryId: 'cat-1',
        pricingModel: 'hourly' as const,
        minPrice: '25.00',
        maxPrice: '100.00'
      };

      const mockServices = [
        {
          id: 'service-1',
          title: 'Web Development',
          pricingModel: 'hourly',
          basePrice: '50.00',
          status: 'active',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ];

      const mockCount = [{ count: 1 }];

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockServices)
      };

      const mockCountSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(mockCount)
      };

      (db.select as jest.Mock)
        .mockReturnValueOnce(mockSelect)
        .mockReturnValueOnce(mockCountSelect);

      const result = await serviceService.searchServices(filters, 1, 20);

      expect(result.services).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });
  });
});