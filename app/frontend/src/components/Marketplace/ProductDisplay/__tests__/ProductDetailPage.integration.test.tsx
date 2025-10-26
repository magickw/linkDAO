/**
 * Integration Test for ProductDetailPage
 * Tests the product detail page with real data fetching
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ProductPage from '@/pages/product/[id]';

// Mock router
jest.mock('next/router', () => ({
  useRouter: () => ({
    query: { id: 'test-product-id' },
    push: jest.fn(),
    reload: jest.fn(),
  }),
}));

// Mock the marketplace service
jest.mock('@/services/marketplaceService', () => ({
  marketplaceService: {
    getListingByIdWithRetry: jest.fn(),
  },
}));

describe('ProductPage Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays loading state initially', async () => {
    const { marketplaceService } = require('@/services/marketplaceService');
    marketplaceService.getListingByIdWithRetry.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<ProductPage />);

    expect(screen.getByText('Loading Product')).toBeInTheDocument();
  });

  it('displays product data when fetch succeeds', async () => {
    const mockProductData = {
      id: 'test-product-id',
      title: 'Test Product',
      description: 'Test Description',
      priceAmount: 100,
      priceCurrency: 'USD',
      seller: {
        id: 'seller-id',
        displayName: 'Test Seller',
        reputation: 4.5,
        verified: true,
        daoApproved: true,
        profileImageUrl: 'https://example.com/avatar.jpg',
      },
      trust: {
        verified: true,
        escrowProtected: true,
        onChainCertified: true,
      },
      metadata: {
        specifications: {
          'Brand': 'Test Brand',
          'Model': 'Test Model',
        },
      },
      images: ['https://example.com/image1.jpg'],
      tags: ['test', 'product'],
      inventory: 10,
      shipping: {
        free: true,
        estimatedDays: '3-5 business days',
      },
      category: {
        name: 'Electronics',
      },
    };

    const { marketplaceService } = require('@/services/marketplaceService');
    marketplaceService.getListingByIdWithRetry.mockResolvedValue(mockProductData);

    render(<ProductPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Test Seller')).toBeInTheDocument();
  });

  it('displays error state when fetch fails', async () => {
    const { marketplaceService } = require('@/services/marketplaceService');
    marketplaceService.getListingByIdWithRetry.mockRejectedValue(new Error('Failed to fetch'));

    render(<ProductPage />);

    await waitFor(() => {
      expect(screen.getByText('Error Loading Product')).toBeInTheDocument();
    });
  });
});