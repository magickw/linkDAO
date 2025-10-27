import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useAccount } from 'wagmi';
import TransactionHistory from '../TransactionHistory';

// Mock wagmi useAccount hook
jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
}));

// Mock transaction history service
jest.mock('@/services/web3/transactionHistoryService', () => ({
  transactionHistoryService: {
    getCombinedHistory: jest.fn().mockResolvedValue([]),
    exportHistoryAsCSV: jest.fn().mockResolvedValue('Date,Type,From,To,Amount,Status,Transaction Hash\n2023-01-01T00:00:00.000Z,purchase,0x123,,1000,success,0xabc'),
  },
}));

// Mock design system components
jest.mock('@/design-system/components/Button', () => {
  return {
    Button: ({ children, onClick, variant, className }: any) => (
      <button 
        onClick={onClick} 
        data-variant={variant}
        className={className}
      >
        {children}
      </button>
    ),
  };
});

jest.mock('@/design-system/components/GlassPanel', () => {
  return {
    GlassPanel: ({ children, variant, className }: any) => (
      <div data-variant={variant} className={className}>{children}</div>
    ),
  };
});

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  ArrowDownLeft: () => <div data-testid="arrow-down-left" />,
  ArrowUpRight: () => <div data-testid="arrow-up-right" />,
  Lock: () => <div data-testid="lock" />,
  Unlock: () => <div data-testid="unlock" />,
  Gift: () => <div data-testid="gift" />,
  Download: () => <div data-testid="download" />,
  Filter: () => <div data-testid="filter" />,
}));

// Mock URL.createObjectURL and URL.revokeObjectURL for export functionality
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: jest.fn(),
});

Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: jest.fn(),
});

describe('TransactionHistory Component', () => {
  const mockUserAddress = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    (useAccount as jest.Mock).mockReturnValue({
      address: mockUserAddress,
      isConnected: true,
    });
    (URL.createObjectURL as jest.Mock).mockReturnValue('blob:test');
  });

  test('should render transaction history component', () => {
    render(<TransactionHistory />);
    expect(screen.getByText('Transaction History')).toBeInTheDocument();
  });

  test('should show connect wallet message when not connected', () => {
    (useAccount as jest.Mock).mockReturnValue({
      address: null,
      isConnected: false,
    });
    
    render(<TransactionHistory />);
    expect(screen.getByText('Connect Wallet for History')).toBeInTheDocument();
  });

  test('should show empty state when no transactions', async () => {
    render(<TransactionHistory />);
    // Wait for the component to load
    expect(await screen.findByText('No Transactions Found')).toBeInTheDocument();
  });

  test('should display purchase transactions', async () => {
    // Mock the service to return a purchase transaction
    const mockPurchaseTransaction = {
      hash: '0xabc123',
      user: mockUserAddress,
      amount: '1000',
      cost: '10',
      currency: 'ETH',
      timestamp: Date.now(),
      type: 'purchase',
      status: 'success',
      method: 'crypto'
    };

    jest.requireMock('@/services/web3/transactionHistoryService').transactionHistoryService.getCombinedHistory
      .mockResolvedValueOnce([mockPurchaseTransaction]);

    render(<TransactionHistory />);
    
    // Wait for transactions to load
    await waitFor(() => {
      expect(screen.getByText('Token Purchase')).toBeInTheDocument();
    });
    
    // Check that purchase details are displayed
    expect(screen.getByText('+1000 LDAO')).toBeInTheDocument();
    expect(screen.getByText('Paid 10 ETH')).toBeInTheDocument();
  });

  test('should export transaction history as CSV', async () => {
    render(<TransactionHistory />);
    
    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Export')).toBeInTheDocument();
    });
    
    // Click export button
    const exportButton = screen.getByText('Export');
    fireEvent.click(exportButton);
    
    // Check that export was called
    expect(jest.requireMock('@/services/web3/transactionHistoryService').transactionHistoryService.exportHistoryAsCSV)
      .toHaveBeenCalledWith(mockUserAddress);
  });

  test('should display correct transaction icons', async () => {
    const mockTransactions = [
      {
        hash: '0x1',
        from: mockUserAddress,
        to: '0xdef',
        value: '500',
        timestamp: Date.now(),
        type: 'transfer',
        status: 'success'
      },
      {
        hash: '0x2',
        user: mockUserAddress,
        amount: '1000',
        timestamp: Date.now() - 1000,
        type: 'stake',
        status: 'success',
        tierId: 1
      },
      {
        hash: '0x3',
        user: mockUserAddress,
        amount: '1000',
        cost: '10',
        currency: 'ETH',
        timestamp: Date.now() - 2000,
        type: 'purchase',
        status: 'success',
        method: 'crypto'
      }
    ];

    jest.requireMock('@/services/web3/transactionHistoryService').transactionHistoryService.getCombinedHistory
      .mockResolvedValueOnce(mockTransactions);

    render(<TransactionHistory />);
    
    // Wait for transactions to load
    await waitFor(() => {
      expect(screen.getByText('Transfer')).toBeInTheDocument();
    });
    
    // Check that icons are rendered (we're checking for the testids from our mocks)
    const icons = screen.getAllByTestId(/arrow-down-left|lock|arrow-down-left/);
    expect(icons.length).toBeGreaterThan(0);
  });
});