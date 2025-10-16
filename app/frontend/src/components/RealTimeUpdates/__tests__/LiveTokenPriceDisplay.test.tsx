import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { LiveTokenPriceDisplay } from '../LiveTokenPriceDisplay';

// Mock WebSocket
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1, // OPEN
};

// Mock WebSocket constructor
global.WebSocket = jest.fn(() => mockWebSocket) as any;

// Mock token price service
jest.mock('@/services/web3/tokenPriceService', () => ({
  getTokenPrice: jest.fn(() => Promise.resolve({
    price: 1.25,
    change24h: 5.67,
    volume24h: 1000000,
    marketCap: 50000000,
    lastUpdated: new Date(),
  })),
  subscribeToPrice: jest.fn(),
  unsubscribeFromPrice: jest.fn(),
}));

describe('LiveTokenPriceDisplay', () => {
  const mockProps = {
    tokenAddress: '0x1234567890123456789012345678901234567890',
    displayFormat: 'detailed' as const,
    showChange: true,
    updateInterval: 5000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders token price with detailed format', async () => {
    render(<LiveTokenPriceDisplay {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('$1.25')).toBeInTheDocument();
      expect(screen.getByText('+5.67%')).toBeInTheDocument();
    });
  });

  it('renders token price with compact format', async () => {
    render(<LiveTokenPriceDisplay {...mockProps} displayFormat="compact" />);

    await waitFor(() => {
      expect(screen.getByText('$1.25')).toBeInTheDocument();
      // Compact format should show less detail
      expect(screen.queryByText('Volume:')).not.toBeInTheDocument();
    });
  });

  it('shows positive price change with green styling', async () => {
    render(<LiveTokenPriceDisplay {...mockProps} />);

    await waitFor(() => {
      const changeElement = screen.getByText('+5.67%');
      expect(changeElement).toHaveClass('text-green-500');
      expect(screen.getByText('↗')).toBeInTheDocument();
    });
  });

  it('shows negative price change with red styling', async () => {
    const mockGetTokenPrice = require('@/services/web3/tokenPriceService').getTokenPrice;
    mockGetTokenPrice.mockResolvedValue({
      price: 1.15,
      change24h: -3.45,
      volume24h: 800000,
      marketCap: 45000000,
      lastUpdated: new Date(),
    });

    render(<LiveTokenPriceDisplay {...mockProps} />);

    await waitFor(() => {
      const changeElement = screen.getByText('-3.45%');
      expect(changeElement).toHaveClass('text-red-500');
      expect(screen.getByText('↘')).toBeInTheDocument();
    });
  });

  it('hides price change when showChange is false', async () => {
    render(<LiveTokenPriceDisplay {...mockProps} showChange={false} />);

    await waitFor(() => {
      expect(screen.getByText('$1.25')).toBeInTheDocument();
      expect(screen.queryByText('+5.67%')).not.toBeInTheDocument();
    });
  });

  it('displays loading state initially', () => {
    render(<LiveTokenPriceDisplay {...mockProps} />);

    expect(screen.getByTestId('price-loading')).toBeInTheDocument();
    expect(screen.getByText('Loading price...')).toBeInTheDocument();
  });

  it('displays error state when price fetch fails', async () => {
    const mockGetTokenPrice = require('@/services/web3/tokenPriceService').getTokenPrice;
    mockGetTokenPrice.mockRejectedValue(new Error('Failed to fetch price'));

    render(<LiveTokenPriceDisplay {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Price unavailable')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('shows detailed information in detailed format', async () => {
    render(<LiveTokenPriceDisplay {...mockProps} displayFormat="detailed" />);

    await waitFor(() => {
      expect(screen.getByText('$1.25')).toBeInTheDocument();
      expect(screen.getByText('Volume: $1.00M')).toBeInTheDocument();
      expect(screen.getByText('Market Cap: $50.0M')).toBeInTheDocument();
    });
  });

  it('establishes WebSocket connection for real-time updates', async () => {
    render(<LiveTokenPriceDisplay {...mockProps} />);

    await waitFor(() => {
      expect(global.WebSocket).toHaveBeenCalledWith(
        expect.stringContaining('ws://localhost:3001/ws/token-price')
      );
    });
  });

  it('handles WebSocket price updates', async () => {
    render(<LiveTokenPriceDisplay {...mockProps} />);

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText('$1.25')).toBeInTheDocument();
    });

    // Simulate WebSocket message
    const mockMessage = {
      data: JSON.stringify({
        tokenAddress: mockProps.tokenAddress,
        price: 1.35,
        change24h: 8.0,
        volume24h: 1200000,
        marketCap: 54000000,
      }),
    };

    // Trigger the onmessage handler
    const onMessageHandler = mockWebSocket.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )?.[1];
    
    if (onMessageHandler) {
      onMessageHandler(mockMessage);
    }

    await waitFor(() => {
      expect(screen.getByText('$1.35')).toBeInTheDocument();
      expect(screen.getByText('+8.00%')).toBeInTheDocument();
    });
  });

  it('formats large numbers correctly', async () => {
    const mockGetTokenPrice = require('@/services/web3/tokenPriceService').getTokenPrice;
    mockGetTokenPrice.mockResolvedValue({
      price: 1234.56,
      change24h: 12.34,
      volume24h: 1234567890,
      marketCap: 9876543210,
      lastUpdated: new Date(),
    });

    render(<LiveTokenPriceDisplay {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('$1,234.56')).toBeInTheDocument();
      expect(screen.getByText('Volume: $1.23B')).toBeInTheDocument();
      expect(screen.getByText('Market Cap: $9.88B')).toBeInTheDocument();
    });
  });

  it('shows last updated timestamp', async () => {
    const fixedDate = new Date('2024-01-15T10:30:00Z');
    const mockGetTokenPrice = require('@/services/web3/tokenPriceService').getTokenPrice;
    mockGetTokenPrice.mockResolvedValue({
      price: 1.25,
      change24h: 5.67,
      volume24h: 1000000,
      marketCap: 50000000,
      lastUpdated: fixedDate,
    });

    render(<LiveTokenPriceDisplay {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Updated: 10:30 AM')).toBeInTheDocument();
    });
  });

  it('handles connection errors gracefully', async () => {
    // Mock WebSocket connection error
    mockWebSocket.addEventListener.mockImplementation((event, handler) => {
      if (event === 'error') {
        setTimeout(() => handler(new Error('Connection failed')), 100);
      }
    });

    render(<LiveTokenPriceDisplay {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Connection error')).toBeInTheDocument();
      expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
    });
  });

  it('cleans up WebSocket connection on unmount', () => {
    const { unmount } = render(<LiveTokenPriceDisplay {...mockProps} />);

    unmount();

    expect(mockWebSocket.close).toHaveBeenCalled();
  });

  it('respects custom update interval', async () => {
    jest.useFakeTimers();
    
    render(<LiveTokenPriceDisplay {...mockProps} updateInterval={10000} />);

    const mockGetTokenPrice = require('@/services/web3/tokenPriceService').getTokenPrice;
    
    // Fast-forward time
    jest.advanceTimersByTime(10000);

    await waitFor(() => {
      expect(mockGetTokenPrice).toHaveBeenCalledTimes(2); // Initial + one interval
    });

    jest.useRealTimers();
  });

  it('is accessible with proper ARIA labels', async () => {
    render(<LiveTokenPriceDisplay {...mockProps} />);

    await waitFor(() => {
      const priceDisplay = screen.getByTestId('live-price-display');
      expect(priceDisplay).toHaveAttribute('aria-label', 'Live token price: $1.25, up 5.67%');
      expect(priceDisplay).toHaveAttribute('role', 'status');
      expect(priceDisplay).toHaveAttribute('aria-live', 'polite');
    });
  });

  it('handles zero price gracefully', async () => {
    const mockGetTokenPrice = require('@/services/web3/tokenPriceService').getTokenPrice;
    mockGetTokenPrice.mockResolvedValue({
      price: 0,
      change24h: 0,
      volume24h: 0,
      marketCap: 0,
      lastUpdated: new Date(),
    });

    render(<LiveTokenPriceDisplay {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('$0.00')).toBeInTheDocument();
      expect(screen.getByText('0.00%')).toBeInTheDocument();
    });
  });

  it('shows stale data indicator when updates are delayed', async () => {
    jest.useFakeTimers();
    
    render(<LiveTokenPriceDisplay {...mockProps} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('$1.25')).toBeInTheDocument();
    });

    // Fast-forward to make data stale (30 seconds)
    jest.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(screen.getByText('⚠ Stale data')).toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  it('handles multiple token addresses correctly', async () => {
    const { rerender } = render(<LiveTokenPriceDisplay {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('$1.25')).toBeInTheDocument();
    });

    // Change token address
    const newTokenAddress = '0x9876543210987654321098765432109876543210';
    rerender(<LiveTokenPriceDisplay {...mockProps} tokenAddress={newTokenAddress} />);

    // Should fetch new price for new token
    const mockGetTokenPrice = require('@/services/web3/tokenPriceService').getTokenPrice;
    expect(mockGetTokenPrice).toHaveBeenCalledWith(newTokenAddress);
  });
});