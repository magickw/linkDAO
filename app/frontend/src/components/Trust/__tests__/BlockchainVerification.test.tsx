import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BlockchainVerification } from '../BlockchainVerification';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock window.open
const mockOpen = jest.fn();
Object.defineProperty(window, 'open', {
  value: mockOpen,
  writable: true,
});

describe('BlockchainVerification', () => {
  beforeEach(() => {
    mockOpen.mockClear();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('renders with loading state initially', () => {
    render(<BlockchainVerification transactionHash="0x123" />);
    
    expect(screen.getByText('Blockchain Verification')).toBeInTheDocument();
    expect(screen.getByText('Verifying...')).toBeInTheDocument();
    expect(screen.getByText('Ethereum Network')).toBeInTheDocument();
  });

  it('shows verified state after loading', async () => {
    jest.useFakeTimers();
    render(<BlockchainVerification transactionHash="0x123" />);
    
    // Fast-forward time to trigger verification
    jest.advanceTimersByTime(2000);
    
    await waitFor(() => {
      expect(screen.getByText('Verified')).toBeInTheDocument();
      expect(screen.getByText('42 confirmations')).toBeInTheDocument();
    });
    
    jest.useRealTimers();
  });

  it('displays transaction hash correctly', () => {
    const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    render(<BlockchainVerification transactionHash={txHash} />);
    
    expect(screen.getByText('Transaction Hash')).toBeInTheDocument();
    expect(screen.getByText(`${txHash.slice(0, 10)}...${txHash.slice(-8)}`)).toBeInTheDocument();
  });

  it('displays contract address when provided', () => {
    const contractAddress = '0x1234567890123456789012345678901234567890';
    render(<BlockchainVerification contractAddress={contractAddress} />);
    
    expect(screen.getByText('Contract Address')).toBeInTheDocument();
    expect(screen.getByText(`${contractAddress.slice(0, 10)}...${contractAddress.slice(-8)}`)).toBeInTheDocument();
  });

  it('displays NFT token information when provided', () => {
    const contractAddress = '0x1234567890123456789012345678901234567890';
    const tokenId = '12345';
    
    render(
      <BlockchainVerification 
        contractAddress={contractAddress}
        tokenId={tokenId}
      />
    );
    
    expect(screen.getByText('NFT Token')).toBeInTheDocument();
    expect(screen.getByText(`#${tokenId}`)).toBeInTheDocument();
  });

  it('opens correct explorer URLs when view buttons are clicked', () => {
    const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    const contractAddress = '0x1234567890123456789012345678901234567890';
    
    render(
      <BlockchainVerification 
        transactionHash={txHash}
        contractAddress={contractAddress}
        network="ethereum"
      />
    );
    
    // Click transaction view button
    const txViewButton = screen.getAllByText('View →')[0];
    fireEvent.click(txViewButton);
    expect(mockOpen).toHaveBeenCalledWith(`https://etherscan.io/tx/${txHash}`, '_blank');
    
    // Click contract view button
    const contractViewButton = screen.getAllByText('View →')[1];
    fireEvent.click(contractViewButton);
    expect(mockOpen).toHaveBeenCalledWith(`https://etherscan.io/address/${contractAddress}`, '_blank');
  });

  it('uses correct explorer URLs for different networks', () => {
    const txHash = '0x123';
    
    // Test Polygon network
    const { rerender } = render(
      <BlockchainVerification 
        transactionHash={txHash}
        network="polygon"
      />
    );
    
    expect(screen.getByText('Polygon Network')).toBeInTheDocument();
    
    const viewButton = screen.getByText('View →');
    fireEvent.click(viewButton);
    expect(mockOpen).toHaveBeenCalledWith(`https://polygonscan.com/tx/${txHash}`, '_blank');
    
    // Test Arbitrum network
    rerender(
      <BlockchainVerification 
        transactionHash={txHash}
        network="arbitrum"
      />
    );
    
    expect(screen.getByText('Arbitrum Network')).toBeInTheDocument();
  });

  it('displays correct network icons', () => {
    const { rerender } = render(<BlockchainVerification network="ethereum" />);
    expect(screen.getByText('⟠')).toBeInTheDocument();
    
    rerender(<BlockchainVerification network="polygon" />);
    expect(screen.getByText('⬟')).toBeInTheDocument();
    
    rerender(<BlockchainVerification network="arbitrum" />);
    expect(screen.getByText('🔷')).toBeInTheDocument();
  });

  it('toggles details section when button is clicked', async () => {
    render(
      <BlockchainVerification 
        blockNumber={18500000}
        timestamp={1640995200}
      />
    );
    
    // Initially details should be hidden
    expect(screen.queryByText('Block Number:')).not.toBeInTheDocument();
    
    // Click show details
    const showDetailsButton = screen.getByText('Show Details');
    fireEvent.click(showDetailsButton);
    
    await waitFor(() => {
      expect(screen.getByText('Block Number:')).toBeInTheDocument();
      expect(screen.getByText('#18,500,000')).toBeInTheDocument();
      expect(screen.getByText('Hide Details')).toBeInTheDocument();
    });
    
    // Click hide details
    const hideDetailsButton = screen.getByText('Hide Details');
    fireEvent.click(hideDetailsButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Block Number:')).not.toBeInTheDocument();
      expect(screen.getByText('Show Details')).toBeInTheDocument();
    });
  });

  it('displays timestamp correctly in details', async () => {
    const timestamp = 1640995200; // Jan 1, 2022
    render(<BlockchainVerification timestamp={timestamp} />);
    
    const showDetailsButton = screen.getByText('Show Details');
    fireEvent.click(showDetailsButton);
    
    await waitFor(() => {
      expect(screen.getByText('Timestamp:')).toBeInTheDocument();
      expect(screen.getByText(new Date(timestamp * 1000).toLocaleString())).toBeInTheDocument();
    });
  });

  it('displays gas information in details after verification', async () => {
    jest.useFakeTimers();
    render(<BlockchainVerification transactionHash="0x123" />);
    
    // Wait for verification to complete
    jest.advanceTimersByTime(2000);
    
    await waitFor(() => {
      expect(screen.getByText('Verified')).toBeInTheDocument();
    });
    
    // Show details
    const showDetailsButton = screen.getByText('Show Details');
    fireEvent.click(showDetailsButton);
    
    await waitFor(() => {
      expect(screen.getByText('Gas Used:')).toBeInTheDocument();
      expect(screen.getByText('0.0021 ETH')).toBeInTheDocument();
    });
    
    jest.useRealTimers();
  });

  it('applies custom className', () => {
    const { container } = render(<BlockchainVerification className="custom-class" />);
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});