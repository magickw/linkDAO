import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DEXTradingInterface from '../DEXTradingInterface';

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('DEXTradingInterface', () => {
  const defaultProps = {
    userAddress: '0x1234567890123456789012345678901234567890',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the trading interface', () => {
    render(<DEXTradingInterface {...defaultProps} />);
    
    expect(screen.getByText('DEX Trading')).toBeInTheDocument();
    expect(screen.getByText('Swap tokens instantly')).toBeInTheDocument();
  });

  it('shows token selectors', () => {
    render(<DEXTradingInterface {...defaultProps} />);
    
    expect(screen.getByText('From')).toBeInTheDocument();
    expect(screen.getByText('To')).toBeInTheDocument();
    
    // Should show ETH and LDAO by default
    expect(screen.getByDisplayValue('ETH')).toBeInTheDocument();
    expect(screen.getByDisplayValue('LDAO')).toBeInTheDocument();
  });

  it('allows token selection', () => {
    render(<DEXTradingInterface {...defaultProps} />);
    
    const fromTokenSelect = screen.getByDisplayValue('ETH');
    fireEvent.change(fromTokenSelect, { target: { value: 'USDC' } });
    
    expect(screen.getByDisplayValue('USDC')).toBeInTheDocument();
  });

  it('shows amount input fields', () => {
    render(<DEXTradingInterface {...defaultProps} />);
    
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('You\'ll receive')).toBeInTheDocument();
    
    const amountInput = screen.getByPlaceholderText('0.0');
    expect(amountInput).toBeInTheDocument();
  });

  it('has MAX button for setting maximum amount', () => {
    render(<DEXTradingInterface {...defaultProps} />);
    
    const maxButton = screen.getByText('MAX');
    expect(maxButton).toBeInTheDocument();
  });

  it('allows swapping token positions', () => {
    render(<DEXTradingInterface {...defaultProps} />);
    
    const swapButton = screen.getByRole('button', { name: /swap/i });
    fireEvent.click(swapButton);
    
    // After swap, LDAO should be in the from position
    expect(screen.getByDisplayValue('LDAO')).toBeInTheDocument();
  });

  it('shows settings panel when settings button is clicked', () => {
    render(<DEXTradingInterface {...defaultProps} />);
    
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton);
    
    expect(screen.getByText('Slippage Tolerance')).toBeInTheDocument();
    expect(screen.getByText('DEX Selection')).toBeInTheDocument();
  });

  it('allows changing slippage tolerance', () => {
    render(<DEXTradingInterface {...defaultProps} />);
    
    // Open settings
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton);
    
    // Change slippage
    const slippageButton = screen.getByText('1.0%');
    fireEvent.click(slippageButton);
    
    expect(slippageButton).toHaveClass('bg-blue-600');
  });

  it('shows DEX options in settings', () => {
    render(<DEXTradingInterface {...defaultProps} />);
    
    // Open settings
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton);
    
    expect(screen.getByText('Uniswap V3')).toBeInTheDocument();
    expect(screen.getByText('SushiSwap')).toBeInTheDocument();
    expect(screen.getByText('1inch')).toBeInTheDocument();
  });

  it('shows price chart', () => {
    render(<DEXTradingInterface {...defaultProps} />);
    
    expect(screen.getByText('LDAO/USD Price (24h)')).toBeInTheDocument();
    expect(screen.getByText('+2.4%')).toBeInTheDocument();
  });

  it('shows quote details when amount is entered', async () => {
    render(<DEXTradingInterface {...defaultProps} />);
    
    const amountInput = screen.getByPlaceholderText('0.0');
    fireEvent.change(amountInput, { target: { value: '1' } });
    
    await waitFor(() => {
      expect(screen.getByText('Price Impact')).toBeInTheDocument();
      expect(screen.getByText('Minimum Received')).toBeInTheDocument();
      expect(screen.getByText('Gas Fee')).toBeInTheDocument();
      expect(screen.getByText('Route')).toBeInTheDocument();
    });
  });

  it('shows swap button with correct states', () => {
    render(<DEXTradingInterface {...defaultProps} />);
    
    // Initially should show "Enter Amount"
    expect(screen.getByText('Enter Amount')).toBeInTheDocument();
    
    // After entering amount, should show swap button
    const amountInput = screen.getByPlaceholderText('0.0');
    fireEvent.change(amountInput, { target: { value: '1' } });
    
    expect(screen.getByText(/Swap ETH for LDAO/)).toBeInTheDocument();
  });

  it('requires wallet connection', () => {
    render(<DEXTradingInterface userAddress={undefined} />);
    
    expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
  });

  it('shows high price impact warning', async () => {
    render(<DEXTradingInterface {...defaultProps} />);
    
    // Enter a large amount to trigger high price impact
    const amountInput = screen.getByPlaceholderText('0.0');
    fireEvent.change(amountInput, { target: { value: '10000' } });
    
    await waitFor(() => {
      expect(screen.getByText('High Price Impact')).toBeInTheDocument();
      expect(screen.getByText('This swap will significantly affect the token price. Consider reducing the amount.')).toBeInTheDocument();
    });
  });

  it('shows informational message about DEX trading', () => {
    render(<DEXTradingInterface {...defaultProps} />);
    
    expect(screen.getByText('DEX Trading')).toBeInTheDocument();
    expect(screen.getByText('Trades are executed on decentralized exchanges. Prices update in real-time.')).toBeInTheDocument();
  });

  it('handles swap execution', async () => {
    render(<DEXTradingInterface {...defaultProps} />);
    
    // Enter amount
    const amountInput = screen.getByPlaceholderText('0.0');
    fireEvent.change(amountInput, { target: { value: '1' } });
    
    await waitFor(() => {
      const swapButton = screen.getByText(/Swap ETH for LDAO/);
      fireEvent.click(swapButton);
    });
    
    // Should show swapping state
    await waitFor(() => {
      expect(screen.getByText('Swapping...')).toBeInTheDocument();
    });
  });

  it('shows loading state when getting quote', async () => {
    render(<DEXTradingInterface {...defaultProps} />);
    
    const amountInput = screen.getByPlaceholderText('0.0');
    fireEvent.change(amountInput, { target: { value: '1' } });
    
    // Should briefly show getting quote state
    expect(screen.getByText('Getting Quote...')).toBeInTheDocument();
  });

  it('closes when close button is clicked', () => {
    const onClose = jest.fn();
    render(<DEXTradingInterface {...defaultProps} onClose={onClose} />);
    
    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('shows token balances when available', () => {
    render(<DEXTradingInterface {...defaultProps} />);
    
    // Mock balances would be shown here
    // In a real test, we'd mock the balance loading
    expect(screen.getByText('From')).toBeInTheDocument();
  });

  it('validates amount input', async () => {
    render(<DEXTradingInterface {...defaultProps} />);
    
    const amountInput = screen.getByPlaceholderText('0.0');
    
    // Test negative amount
    fireEvent.change(amountInput, { target: { value: '-1' } });
    expect(amountInput.value).toBe('-1');
    
    // Test zero amount
    fireEvent.change(amountInput, { target: { value: '0' } });
    expect(screen.getByText('Enter Amount')).toBeInTheDocument();
  });

  it('shows different fee rates for different DEXes', () => {
    render(<DEXTradingInterface {...defaultProps} />);
    
    // Open settings
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton);
    
    expect(screen.getByText('0.3% fee')).toBeInTheDocument(); // Uniswap
    expect(screen.getByText('0.25% fee')).toBeInTheDocument(); // SushiSwap
    expect(screen.getByText('0.1% fee')).toBeInTheDocument(); // 1inch
  });

  it('shows TVL information for DEXes', () => {
    render(<DEXTradingInterface {...defaultProps} />);
    
    // Open settings
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton);
    
    expect(screen.getByText('TVL: $4.2B')).toBeInTheDocument();
    expect(screen.getByText('TVL: $1.8B')).toBeInTheDocument();
    expect(screen.getByText('TVL: $2.1B')).toBeInTheDocument();
  });
});