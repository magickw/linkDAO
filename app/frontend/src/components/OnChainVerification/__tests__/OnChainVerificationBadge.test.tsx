import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnChainVerificationBadge } from '../OnChainVerificationBadge';
import { OnChainProof } from '@/types/onChainVerification';

// Mock window.open
const mockOpen = jest.fn();
Object.defineProperty(window, 'open', {
  value: mockOpen,
  writable: true,
});

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

describe('OnChainVerificationBadge', () => {
  const mockProof: OnChainProof = {
    transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    blockNumber: 18500000,
    contractAddress: '0x1234567890123456789012345678901234567890',
    verified: true,
    proofType: 'governance_vote',
  };

  const mockProps = {
    proof: mockProof,
    explorerBaseUrl: 'https://etherscan.io',
    onViewTransaction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders verified badge with correct styling', () => {
    render(<OnChainVerificationBadge {...mockProps} />);

    const badge = screen.getByTestId('verification-badge');
    expect(badge).toHaveClass('verified');
    expect(screen.getByText('✓')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('renders unverified badge when verification fails', () => {
    const unverifiedProof = { ...mockProof, verified: false };
    
    render(<OnChainVerificationBadge {...mockProps} proof={unverifiedProof} />);

    const badge = screen.getByTestId('verification-badge');
    expect(badge).toHaveClass('unverified');
    expect(screen.getByText('⚠')).toBeInTheDocument();
    expect(screen.getByText('Unverified')).toBeInTheDocument();
  });

  it('displays correct proof type labels', () => {
    const proofTypes = [
      { type: 'governance_vote', label: 'Governance Vote' },
      { type: 'token_transfer', label: 'Token Transfer' },
      { type: 'nft_mint', label: 'NFT Mint' },
      { type: 'custom', label: 'Custom Proof' },
    ] as const;

    proofTypes.forEach(({ type, label }) => {
      const proofWithType = { ...mockProof, proofType: type };
      const { rerender } = render(<OnChainVerificationBadge {...mockProps} proof={proofWithType} />);
      
      expect(screen.getByText(label)).toBeInTheDocument();
      
      rerender(<div />); // Clear for next iteration
    });
  });

  it('shows transaction details on hover', async () => {
    render(<OnChainVerificationBadge {...mockProps} />);

    const badge = screen.getByTestId('verification-badge');
    fireEvent.mouseEnter(badge);

    await waitFor(() => {
      expect(screen.getByText('Transaction Details')).toBeInTheDocument();
      expect(screen.getByText('0xabcdef...567890')).toBeInTheDocument();
      expect(screen.getByText('Block #18,500,000')).toBeInTheDocument();
      expect(screen.getByText('Contract: 0x1234...7890')).toBeInTheDocument();
    });
  });

  it('opens explorer link when clicked', () => {
    render(<OnChainVerificationBadge {...mockProps} />);

    const badge = screen.getByTestId('verification-badge');
    fireEvent.click(badge);

    expect(mockOpen).toHaveBeenCalledWith(
      'https://etherscan.io/tx/0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      '_blank'
    );
  });

  it('calls onViewTransaction callback when provided', () => {
    render(<OnChainVerificationBadge {...mockProps} />);

    const badge = screen.getByTestId('verification-badge');
    fireEvent.click(badge);

    expect(mockProps.onViewTransaction).toHaveBeenCalledWith(mockProof.transactionHash);
  });

  it('handles missing explorer base URL gracefully', () => {
    const propsWithoutExplorer = { ...mockProps, explorerBaseUrl: undefined };
    
    render(<OnChainVerificationBadge {...propsWithoutExplorer} />);

    const badge = screen.getByTestId('verification-badge');
    fireEvent.click(badge);

    // Should not open external link but still call callback
    expect(mockOpen).not.toHaveBeenCalled();
    expect(mockProps.onViewTransaction).toHaveBeenCalledWith(mockProof.transactionHash);
  });

  it('displays loading state during verification', () => {
    const loadingProof = { ...mockProof, verified: undefined };
    
    render(<OnChainVerificationBadge {...mockProps} proof={loadingProof} />);

    const badge = screen.getByTestId('verification-badge');
    expect(badge).toHaveClass('loading');
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByText('Verifying...')).toBeInTheDocument();
  });

  it('handles different badge sizes', () => {
    const { rerender } = render(<OnChainVerificationBadge {...mockProps} size="small" />);
    
    let badge = screen.getByTestId('verification-badge');
    expect(badge).toHaveClass('size-sm');

    rerender(<OnChainVerificationBadge {...mockProps} size="lg" />);
    
    badge = screen.getByTestId('verification-badge');
    expect(badge).toHaveClass('size-lg');
  });

  it('supports custom styling', () => {
    render(<OnChainVerificationBadge {...mockProps} className="custom-badge" />);

    const badge = screen.getByTestId('verification-badge');
    expect(badge).toHaveClass('custom-badge');
  });

  it('is accessible with proper ARIA labels', () => {
    render(<OnChainVerificationBadge {...mockProps} />);

    const badge = screen.getByTestId('verification-badge');
    expect(badge).toHaveAttribute('aria-label', 'Verified on-chain: Governance Vote');
    expect(badge).toHaveAttribute('role', 'button');
    expect(badge).toHaveAttribute('tabIndex', '0');
  });

  it('supports keyboard navigation', () => {
    render(<OnChainVerificationBadge {...mockProps} />);

    const badge = screen.getByTestId('verification-badge');
    
    // Test Enter key
    fireEvent.keyDown(badge, { key: 'Enter', code: 'Enter' });
    expect(mockProps.onViewTransaction).toHaveBeenCalledWith(mockProof.transactionHash);

    // Test Space key
    fireEvent.keyDown(badge, { key: ' ', code: 'Space' });
    expect(mockProps.onViewTransaction).toHaveBeenCalledTimes(2);
  });

  it('formats transaction hash correctly', () => {
    render(<OnChainVerificationBadge {...mockProps} />);

    const badge = screen.getByTestId('verification-badge');
    fireEvent.mouseEnter(badge);

    // Should show truncated hash
    expect(screen.getByText('0xabcdef...567890')).toBeInTheDocument();
  });

  it('formats block number with commas', () => {
    render(<OnChainVerificationBadge {...mockProps} />);

    const badge = screen.getByTestId('verification-badge');
    fireEvent.mouseEnter(badge);

    expect(screen.getByText('Block #18,500,000')).toBeInTheDocument();
  });

  it('handles very long transaction hashes', () => {
    const longHashProof = {
      ...mockProof,
      transactionHash: '0x' + 'a'.repeat(64),
    };
    
    render(<OnChainVerificationBadge {...mockProps} proof={longHashProof} />);

    const badge = screen.getByTestId('verification-badge');
    fireEvent.mouseEnter(badge);

    // Should still truncate properly
    expect(screen.getByText('0xaaaaaa...aaaaaa')).toBeInTheDocument();
  });

  it('shows different icons for different proof types', () => {
    const proofTypes = [
      { type: 'governance_vote', icon: '🗳️' },
      { type: 'token_transfer', icon: '💸' },
      { type: 'nft_mint', icon: '🎨' },
      { type: 'custom', icon: '📋' },
    ] as const;

    proofTypes.forEach(({ type, icon }) => {
      const proofWithType = { ...mockProof, proofType: type };
      const { rerender } = render(<OnChainVerificationBadge {...mockProps} proof={proofWithType} />);
      
      expect(screen.getByText(icon)).toBeInTheDocument();
      
      rerender(<div />); // Clear for next iteration
    });
  });

  it('handles network-specific explorer URLs', () => {
    const polygonProps = {
      ...mockProps,
      explorerBaseUrl: 'https://polygonscan.com',
    };
    
    render(<OnChainVerificationBadge {...polygonProps} />);

    const badge = screen.getByTestId('verification-badge');
    fireEvent.click(badge);

    expect(mockOpen).toHaveBeenCalledWith(
      'https://polygonscan.com/tx/0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      '_blank'
    );
  });
});