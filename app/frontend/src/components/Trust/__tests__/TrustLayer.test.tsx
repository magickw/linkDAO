import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TrustLayer } from '../TrustLayer';

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

describe('TrustLayer', () => {
  beforeEach(() => {
    mockOpen.mockClear();
  });

  it('renders basic trust layer without optional props', () => {
    render(<TrustLayer />);
    
    expect(screen.getByText('Trust & Security')).toBeInTheDocument();
  });

  it('displays escrow guarantee when enabled', () => {
    render(<TrustLayer escrowGuarantee={true} />);
    
    expect(screen.getAllByText('Escrow Protected')).toHaveLength(2); // Badge + detailed section
    expect(screen.getByText('Your payment is secured until delivery confirmation')).toBeInTheDocument();
  });

  it('displays authenticity NFT information when provided', () => {
    const nftAddress = '0x1234567890123456789012345678901234567890';
    render(<TrustLayer authenticityNFT={nftAddress} />);
    
    expect(screen.getByText('Blockchain Certified')).toBeInTheDocument();
    expect(screen.getByText('Authenticity verified on-chain')).toBeInTheDocument();
    
    const viewCertificateButton = screen.getByText('View Certificate →');
    fireEvent.click(viewCertificateButton);
    
    expect(mockOpen).toHaveBeenCalledWith(
      `https://etherscan.io/token/${nftAddress}`,
      '_blank'
    );
  });

  it('displays buyer protection when enabled', () => {
    render(<TrustLayer buyerProtection={true} />);
    
    expect(screen.getByText('Buyer Protection')).toBeInTheDocument();
    expect(screen.getByText('Full refund guarantee with dispute resolution')).toBeInTheDocument();
  });

  it('displays transaction proof when transaction hash is provided', () => {
    const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    const blockNumber = 18500000;
    
    render(
      <TrustLayer 
        transactionHash={txHash}
        blockNumber={blockNumber}
      />
    );
    
    expect(screen.getByText('Transaction Proof')).toBeInTheDocument();
    expect(screen.getByText(`${txHash.slice(0, 10)}...${txHash.slice(-8)}`)).toBeInTheDocument();
    expect(screen.getByText(`Block #${blockNumber.toLocaleString()}`)).toBeInTheDocument();
    
    const viewOnEtherscanButton = screen.getByText('View on Etherscan →');
    fireEvent.click(viewOnEtherscanButton);
    
    expect(mockOpen).toHaveBeenCalledWith(
      `https://etherscan.io/tx/${txHash}`,
      '_blank'
    );
  });

  it('displays all trust indicators when all props are provided', () => {
    const props = {
      escrowGuarantee: true,
      authenticityNFT: '0x1234567890123456789012345678901234567890',
      buyerProtection: true,
      transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      blockNumber: 18500000
    };
    
    render(<TrustLayer {...props} />);
    
    expect(screen.getAllByText('Escrow Protected')).toHaveLength(2); // Badge + detailed section
    expect(screen.getByText('Blockchain Certified')).toBeInTheDocument();
    expect(screen.getByText('Buyer Protection')).toBeInTheDocument();
    expect(screen.getByText('Transaction Proof')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<TrustLayer className="custom-class" />);
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders trust indicators component', () => {
    render(
      <TrustLayer 
        escrowGuarantee={true}
        authenticityNFT="0x123"
        buyerProtection={true}
      />
    );
    
    // TrustIndicators component should be rendered
    // This would need to be tested based on the actual TrustIndicators implementation
    expect(screen.getByText('Trust & Security')).toBeInTheDocument();
  });
});