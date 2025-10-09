import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouterProvider } from 'next-router-mock/MemoryRouterProvider';
import Layout from '@/components/Layout';
import CartPage from '@/pages/cart';
import CheckoutPage from '@/pages/checkout';
import OrdersPage from '@/pages/orders/index';
import { EnhancedCartProvider } from '@/hooks/useEnhancedCart';
import { orderService } from '@/services/orderService';
import { disputeService } from '@/services/disputeService';
import { config as wagmiConfig } from '@/lib/wagmi';

jest.mock('@/services/orderService');
jest.mock('@/services/disputeService');

const mockedOrderService = orderService as jest.Mocked<typeof orderService>;
const mockedDisputeService = disputeService as jest.Mocked<typeof disputeService>;

const queryClient = new QueryClient();

const ProviderWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <WagmiProvider config={wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider>
        <EnhancedCartProvider>
          <MemoryRouterProvider url="/">
            <Layout>{children}</Layout>
          </MemoryRouterProvider>
        </EnhancedCartProvider>
      </RainbowKitProvider>
    </QueryClientProvider>
  </WagmiProvider>
);

describe('Marketplace flow integration', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('guards checkout when cart empty and wallet disconnected', () => {
    mockedOrderService.getOrderHistory.mockResolvedValue({ orders: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    mockedOrderService.getOrderStatistics.mockResolvedValue({
      totalOrders: 0,
      completedOrders: 0,
      pendingOrders: 0,
      disputedOrders: 0,
      totalValue: 0,
      averageOrderValue: 0,
      completionRate: 0,
      statusBreakdown: {
        CREATED: 0,
        PAYMENT_PENDING: 0,
        PAID: 0,
        PROCESSING: 0,
        SHIPPED: 0,
        DELIVERED: 0,
        COMPLETED: 0,
        DISPUTED: 0,
        CANCELLED: 0,
        REFUNDED: 0,
      },
    });
    mockedDisputeService.getDisputeStats.mockResolvedValue({
      totalDisputes: 0,
      activeDisputes: 0,
      resolvedDisputes: 0,
      userDisputes: 0,
    });

    render(
      <ProviderWrapper>
        <CheckoutPage />
      </ProviderWrapper>
    );

    expect(screen.getByText(/Your cart is empty/i)).toBeInTheDocument();
    expect(orderService.getOrderHistory).not.toHaveBeenCalled();
  });

  it('completes cart -> checkout -> orders happy path', async () => {
    mockedOrderService.getOrderHistory.mockResolvedValue({
      orders: [
        {
          id: 'ORDER_TEST_1',
          product: {
            id: 'prod-1',
            title: 'Demo Product',
            description: 'Mock order from checkout test',
            image: '/api/placeholder/240/240',
            category: 'demo',
            quantity: 1,
            unitPrice: 0.1,
            totalPrice: 0.1,
          },
          status: 'PROCESSING',
          totalAmount: 0.1,
          currency: 'ETH',
          createdAt: new Date().toISOString(),
          estimatedDelivery: new Date(Date.now() + 86400000).toISOString(),
          trackingCarrier: 'LinkDAO Logistics',
          trackingNumber: 'LD-UNIT-123',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    mockedOrderService.getOrderStatistics.mockResolvedValue({
      totalOrders: 1,
      completedOrders: 0,
      pendingOrders: 1,
      disputedOrders: 0,
      totalValue: 0.1,
      averageOrderValue: 0.1,
      completionRate: 0,
      statusBreakdown: {
        CREATED: 0,
        PAYMENT_PENDING: 0,
        PAID: 0,
        PROCESSING: 1,
        SHIPPED: 0,
        DELIVERED: 0,
        COMPLETED: 0,
        DISPUTED: 0,
        CANCELLED: 0,
        REFUNDED: 0,
      },
    });

    mockedDisputeService.getDisputeStats.mockResolvedValue({
      totalDisputes: 5,
      activeDisputes: 1,
      resolvedDisputes: 4,
      userDisputes: 0,
    });

    render(
      <ProviderWrapper>
        <CartPage />
      </ProviderWrapper>
    );

    expect(screen.getByText(/Your cart is empty/i)).toBeInTheDocument();

    sessionStorage.setItem(
      'linkdao_recent_orders',
      JSON.stringify([
        {
          id: 'LOCAL_ORDER',
          product: {
            id: 'prod-local',
            title: 'Local Session Product',
            description: 'Stored between checkout and orders',
            image: '/api/placeholder/240/240',
            category: 'demo',
            quantity: 1,
            unitPrice: 0.2,
            totalPrice: 0.2,
          },
          status: 'PROCESSING',
          totalAmount: 0.2,
          currency: 'ETH',
          createdAt: new Date().toISOString(),
          estimatedDelivery: new Date(Date.now() + 172800000).toISOString(),
          trackingCarrier: 'Demo Carrier',
          trackingNumber: 'DEMO-456',
        },
      ])
    );

    render(
      <ProviderWrapper>
        <OrdersPage />
      </ProviderWrapper>
    );

    await waitFor(() => {
      expect(mockedOrderService.getOrderHistory).toHaveBeenCalled();
    });

    expect(screen.getByText(/Order History & Tracking/i)).toBeInTheDocument();
    expect(screen.getByText(/Demo Product/i)).toBeInTheDocument();
    expect(screen.getByText(/Total orders/i)).toBeInTheDocument();
  });
});
