import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LDAOPurchaseModal from '../LDAOPurchaseModal';
import { ldaoAcquisitionService } from '../../../services/ldaoAcquisitionService';

// Mock the service
jest.mock('../../../services/ldaoAcquisitionService');
const mockService = ldaoAcquisitionService as jest.Mocked<typeof ldaoAcquisitionService>;

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('LDAOPurchaseModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    userAddress: '0x1234567890123456789012345678901234567890',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockService.getQuote.mockResolvedValue({
      ldaoAmount: '1000',
      usdAmount: '10.00',
      ethAmount: '0.004',
      usdcAmount: '10.00',
      discount: 0,
      fees: {
        processing: '0.01',
        gas: '0.005',
        total: '0.015'
      },
      estimatedTime: '2-5 minutes'
    });
  });

  it('renders the modal when open', () => {
    render(<LDAOPurchaseModal {...defaultProps} />);
    
    expect(screen.getByText('Choose Method')).toBeInTheDocument();
    expect(screen.getByText('How would you like to get LDAO tokens?')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<LDAOPurchaseModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Choose Method')).not.toBeInTheDocument();
  });

  it('shows step indicator', () => {
    render(<LDAOPurchaseModal {...defaultProps} />);
    
    // Should show 4 steps
    const stepIndicators = screen.getAllByRole('generic').filter(el => 
      el.className.includes('w-8 h-8 rounded-full')
    );
    expect(stepIndicators).toHaveLength(4);
  });

  it('allows selecting payment methods', () => {
    render(<LDAOPurchaseModal {...defaultProps} />);
    
    const cryptoButton = screen.getByText('Pay with Crypto');
    const fiatButton = screen.getByText('Pay with Card');
    const earnButton = screen.getByText('Earn Tokens');
    
    expect(cryptoButton).toBeInTheDocument();
    expect(fiatButton).toBeInTheDocument();
    expect(earnButton).toBeInTheDocument();
    
    // Crypto should be selected by default
    expect(cryptoButton.closest('button')).toHaveClass('border-blue-500');
  });

  it('navigates through steps correctly', async () => {
    render(<LDAOPurchaseModal {...defaultProps} />);
    
    // Step 1: Select crypto payment
    const cryptoButton = screen.getByText('Pay with Crypto');
    fireEvent.click(cryptoButton);
    
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);
    
    // Step 2: Should show amount selection
    await waitFor(() => {
      expect(screen.getByText('Enter Amount')).toBeInTheDocument();
      expect(screen.getByText('How many LDAO tokens would you like to purchase?')).toBeInTheDocument();
    });
  });

  it('validates amount input', async () => {
    render(<LDAOPurchaseModal {...defaultProps} />);
    
    // Navigate to amount step
    fireEvent.click(screen.getByText('Continue'));
    
    await waitFor(() => {
      expect(screen.getByText('Enter Amount')).toBeInTheDocument();
    });
    
    const amountInput = screen.getByPlaceholderText('Enter custom amount');
    const continueButton = screen.getByText('Continue');
    
    // Test invalid amount
    fireEvent.change(amountInput, { target: { value: '0' } });
    fireEvent.click(continueButton);
    
    await waitFor(() => {
      expect(screen.getByText('Minimum purchase is 1 LDAO')).toBeInTheDocument();
    });
    
    // Test valid amount
    fireEvent.change(amountInput, { target: { value: '1000' } });
    
    await waitFor(() => {
      expect(screen.queryByText('Minimum purchase is 1 LDAO')).not.toBeInTheDocument();
    });
  });

  it('shows preset amount buttons', async () => {
    render(<LDAOPurchaseModal {...defaultProps} />);
    
    // Navigate to amount step
    fireEvent.click(screen.getByText('Continue'));
    
    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('500')).toBeInTheDocument();
      expect(screen.getByText('1,000')).toBeInTheDocument();
      expect(screen.getByText('5,000')).toBeInTheDocument();
      expect(screen.getByText('10,000')).toBeInTheDocument();
    });
  });

  it('fetches and displays price quote', async () => {
    render(<LDAOPurchaseModal {...defaultProps} initialAmount="1000" />);
    
    // Navigate to amount step
    fireEvent.click(screen.getByText('Continue'));
    
    await waitFor(() => {
      expect(mockService.getQuote).toHaveBeenCalledWith('1000');
      expect(screen.getByText('Live Price Quote')).toBeInTheDocument();
      expect(screen.getByText('1000 LDAO')).toBeInTheDocument();
    });
  });

  it('shows payment method selection for crypto', async () => {
    render(<LDAOPurchaseModal {...defaultProps} />);
    
    // Navigate through steps
    fireEvent.click(screen.getByText('Continue')); // Method step
    
    await waitFor(() => {
      const amountInput = screen.getByPlaceholderText('Enter custom amount');
      fireEvent.change(amountInput, { target: { value: '1000' } });
    });
    
    fireEvent.click(screen.getByText('Continue')); // Amount step
    
    await waitFor(() => {
      expect(screen.getByText('Payment Details')).toBeInTheDocument();
      expect(screen.getByText('Select cryptocurrency to pay with')).toBeInTheDocument();
      expect(screen.getByText('Ethereum (ETH)')).toBeInTheDocument();
      expect(screen.getByText('USD Coin (USDC)')).toBeInTheDocument();
    });
  });

  it('shows confirmation step with order summary', async () => {
    render(<LDAOPurchaseModal {...defaultProps} />);
    
    // Navigate through all steps
    fireEvent.click(screen.getByText('Continue')); // Method
    
    await waitFor(() => {
      const amountInput = screen.getByPlaceholderText('Enter custom amount');
      fireEvent.change(amountInput, { target: { value: '1000' } });
    });
    
    fireEvent.click(screen.getByText('Continue')); // Amount
    fireEvent.click(screen.getByText('Continue')); // Payment
    
    await waitFor(() => {
      expect(screen.getByText('Confirm Purchase')).toBeInTheDocument();
      expect(screen.getByText('Order Summary')).toBeInTheDocument();
      expect(screen.getByText('1,000')).toBeInTheDocument(); // LDAO amount
      expect(screen.getByText('ETH (Crypto)')).toBeInTheDocument(); // Payment method
    });
  });

  it('handles successful purchase', async () => {
    mockService.purchaseWithCrypto.mockResolvedValue({
      success: true,
      transactionHash: '0xabcdef123456',
      ldaoAmount: '1000'
    });
    
    render(<LDAOPurchaseModal {...defaultProps} />);
    
    // Navigate to confirmation and purchase
    fireEvent.click(screen.getByText('Continue')); // Method
    
    await waitFor(() => {
      const amountInput = screen.getByPlaceholderText('Enter custom amount');
      fireEvent.change(amountInput, { target: { value: '1000' } });
    });
    
    fireEvent.click(screen.getByText('Continue')); // Amount
    fireEvent.click(screen.getByText('Continue')); // Payment
    
    await waitFor(() => {
      const confirmButton = screen.getByText('Confirm Purchase');
      fireEvent.click(confirmButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Processing Your Purchase')).toBeInTheDocument();
    });
    
    await waitFor(() => {
      expect(screen.getByText('Purchase Successful!')).toBeInTheDocument();
      expect(screen.getByText('You\'ve successfully purchased 1000 LDAO tokens')).toBeInTheDocument();
    });
  });

  it('handles purchase failure', async () => {
    mockService.purchaseWithCrypto.mockResolvedValue({
      success: false,
      error: 'Insufficient balance'
    });
    
    render(<LDAOPurchaseModal {...defaultProps} />);
    
    // Navigate to confirmation and purchase
    fireEvent.click(screen.getByText('Continue')); // Method
    
    await waitFor(() => {
      const amountInput = screen.getByPlaceholderText('Enter custom amount');
      fireEvent.change(amountInput, { target: { value: '1000' } });
    });
    
    fireEvent.click(screen.getByText('Continue')); // Amount
    fireEvent.click(screen.getByText('Continue')); // Payment
    
    await waitFor(() => {
      const confirmButton = screen.getByText('Confirm Purchase');
      fireEvent.click(confirmButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Purchase Failed')).toBeInTheDocument();
      expect(screen.getByText('Insufficient balance')).toBeInTheDocument();
    });
  });

  it('shows wallet connection requirement for crypto payments', async () => {
    render(<LDAOPurchaseModal {...defaultProps} userAddress={undefined} />);
    
    // Navigate to payment step
    fireEvent.click(screen.getByText('Continue')); // Method
    
    await waitFor(() => {
      const amountInput = screen.getByPlaceholderText('Enter custom amount');
      fireEvent.change(amountInput, { target: { value: '1000' } });
    });
    
    fireEvent.click(screen.getByText('Continue')); // Amount
    
    await waitFor(() => {
      expect(screen.getByText('Please connect your wallet first')).toBeInTheDocument();
    });
  });

  it('redirects to earn page when earn option is selected', () => {
    // Mock window.location
    delete (window as any).location;
    window.location = { href: '' } as any;
    
    render(<LDAOPurchaseModal {...defaultProps} />);
    
    const earnButton = screen.getByText('Earn Tokens');
    fireEvent.click(earnButton);
    
    const continueButton = screen.getByText('View Opportunities');
    fireEvent.click(continueButton);
    
    expect(defaultProps.onClose).toHaveBeenCalled();
    expect(window.location.href).toBe('/earn');
  });

  it('shows volume discount information', async () => {
    render(<LDAOPurchaseModal {...defaultProps} />);
    
    // Navigate to amount step
    fireEvent.click(screen.getByText('Continue'));
    
    await waitFor(() => {
      expect(screen.getByText('Volume Discounts Available')).toBeInTheDocument();
      expect(screen.getByText('Purchase 10,000+ LDAO tokens and save up to 15% on your order.')).toBeInTheDocument();
    });
  });

  it('allows going back through steps', async () => {
    render(<LDAOPurchaseModal {...defaultProps} />);
    
    // Navigate forward
    fireEvent.click(screen.getByText('Continue')); // Method
    
    await waitFor(() => {
      expect(screen.getByText('Enter Amount')).toBeInTheDocument();
    });
    
    // Go back
    const backButton = screen.getByText('Back');
    fireEvent.click(backButton);
    
    await waitFor(() => {
      expect(screen.getByText('Choose Method')).toBeInTheDocument();
    });
  });

  it('closes modal when close button is clicked', () => {
    render(<LDAOPurchaseModal {...defaultProps} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});