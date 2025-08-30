import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServiceMarketplace } from '../ServiceMarketplace';
import { serviceApiService } from '../../../../services/serviceApiService';

// Mock the service API
vi.mock('../../../../services/serviceApiService');

const mockCategories = [
  {
    id: '1',
    name: 'Digital Services',
    description: 'Web development and design',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const mockServices = [
  {
    id: 'service-1',
    providerId: 'provider-1',
    categoryId: '1',
    title: 'Web Development',
    description: 'Full-stack web development services',
    pricingModel: 'hourly' as const,
    basePrice: '50.00',
    currency: 'USD',
    isRemote: true,
    locationRequired: false,
    status: 'active' as const,
    featured: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

describe('ServiceMarketplace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(serviceApiService.getCategories).mockResolvedValue(mockCategories);
    vi.mocked(serviceApiService.searchServices).mockResolvedValue({
      services: mockServices,
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1
      }
    });
  });

  it('should render service marketplace with services', async () => {
    render(<ServiceMarketplace />);

    expect(screen.getByText('Service Marketplace')).toBeInTheDocument();
    expect(screen.getByText('Discover and book professional services from verified providers')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Web Development')).toBeInTheDocument();
    });
  });

  it('should show create service button for providers', async () => {
    render(<ServiceMarketplace userRole="provider" />);

    expect(screen.getByText('Create Service')).toBeInTheDocument();
  });

  it('should handle service search and filtering', async () => {
    render(<ServiceMarketplace />);

    await waitFor(() => {
      expect(serviceApiService.searchServices).toHaveBeenCalledWith({}, 1, 20);
    });
  });
});