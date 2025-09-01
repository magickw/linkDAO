import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NFTVerificationBadge } from '../NFTVerificationBadge';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock window.open
const mockOpen = jest.fn();
Object.defineProperty(window, 'open', {
  value: mockOpen,
  writable: true,
});

const mockMetadata = {
  name: 'Test NFT',
  description: 'A test NFT for verification',
  image: 'https://example.com/image.png',
  attributes: [
    { trait_type: 'Color', value: 'Blue' },
    { trait_type: 'Rarity', value: 'Rare' }
  ],
  creator: '0x1234567890123456789012345678901234567890',
  royalties: 5
};

const mockProvenance = [
  {
    owner: '0x1111111111111111111111111111111111111111',
    timestamp: 1640995200,
    transactionHash: '0xabc123',
    event: 'minted' as const
  },
  {
    owner: '0x2222222222222222222222222222222222222222',
    timestamp: 1641081600,
    transactionHash: '0xdef456',
    price: '1.5 ETH',
    event: 'sold' as const
  }
];

describe('NFTVerificationBadge', () => {
  beforeEach(() => {
    mockOpen.mockClear();
  });

  it('renders small badge correctly', () => {
    render(
      <NFTVerificationBadge
        contractAddress="0x123"
        tokenId="1"
        size="small"
        verified={true}
      />
    );
    
    expect(screen.getByText('⛓️')).toBeInTheDocument();
    expect(screen.getByText('NFT Verified')).toBeInTheDocument();
  });

  it('renders medium badge as clickable button', () => {
    render(
      <NFTVerificationBadge
        contractAddress="0x123"
        tokenId="1"
        size="medium"
      />
    );
    
    const badge = screen.getByRole('button');
    expect(badge).toBeInTheDocument();
    expect(screen.getByText('⛓️')).toBeInTheDocument();
  });

  it('opens verification modal when clicked', async () => {
    render(
      <NFTVerificationBadge
        contractAddress="0x1234567890123456789012345678901234567890"
        tokenId="12345"
        metadata={mockMetadata}
      />
    );
    
    const badge = screen.getByRole('button');
    fireEvent.click(badge);
    
    await waitFor(() => {
      expect(screen.getByText('NFT Verification')).toBeInTheDocument();
      expect(screen.getByText('Token #12345')).toBeInTheDocument();
      expect(screen.getByText('Authentic NFT Verified')).toBeInTheDocument();
    });
  });

  it('displays contract information in modal', async () => {
    const contractAddress = '0x1234567890123456789012345678901234567890';
    
    render(
      <NFTVerificationBadge
        contractAddress={contractAddress}
        tokenId="12345"
      />
    );
    
    const badge = screen.getByRole('button');
    fireEvent.click(badge);
    
    await waitFor(() => {
      expect(screen.getByText('Contract Address')).toBeInTheDocument();
      expect(screen.getByText('0x1234...7890')).toBeInTheDocument();
      expect(screen.getByText('Token ID')).toBeInTheDocument();
      expect(screen.getByText('#12345')).toBeInTheDocument();
    });
  });

  it('opens external links when view buttons are clicked', async () => {
    const contractAddress = '0x1234567890123456789012345678901234567890';
    const tokenId = '12345';
    
    render(
      <NFTVerificationBadge
        contractAddress={contractAddress}
        tokenId={tokenId}
      />
    );
    
    const badge = screen.getByRole('button');
    fireEvent.click(badge);
    
    await waitFor(() => {
      // Click view contract button
      const viewContractButton = screen.getByText('View Contract →');
      fireEvent.click(viewContractButton);
      expect(mockOpen).toHaveBeenCalledWith(
        `https://etherscan.io/address/${contractAddress}`,
        '_blank'
      );
      
      // Click view on OpenSea button
      const viewOpenSeaButton = screen.getByText('View on OpenSea →');
      fireEvent.click(viewOpenSeaButton);
      expect(mockOpen).toHaveBeenCalledWith(
        `https://opensea.io/assets/ethereum/${contractAddress}/${tokenId}`,
        '_blank'
      );
    });
  });

  it('displays metadata tab when metadata is provided', async () => {
    render(
      <NFTVerificationBadge
        contractAddress="0x123"
        tokenId="1"
        metadata={mockMetadata}
      />
    );
    
    const badge = screen.getByRole('button');
    fireEvent.click(badge);
    
    await waitFor(() => {
      expect(screen.getByText('Metadata')).toBeInTheDocument();
      expect(screen.getByText(mockMetadata.name)).toBeInTheDocument();
      expect(screen.getByText(mockMetadata.description)).toBeInTheDocument();
    });
  });

  it('displays attributes correctly in metadata tab', async () => {
    render(
      <NFTVerificationBadge
        contractAddress="0x123"
        tokenId="1"
        metadata={mockMetadata}
      />
    );
    
    const badge = screen.getByRole('button');
    fireEvent.click(badge);
    
    await waitFor(() => {
      expect(screen.getByText('Attributes')).toBeInTheDocument();
      expect(screen.getByText('Color')).toBeInTheDocument();
      expect(screen.getByText('Blue')).toBeInTheDocument();
      expect(screen.getByText('Rarity')).toBeInTheDocument();
      expect(screen.getByText('Rare')).toBeInTheDocument();
    });
  });

  it('displays creator and royalties information', async () => {
    render(
      <NFTVerificationBadge
        contractAddress="0x123"
        tokenId="1"
        metadata={mockMetadata}
      />
    );
    
    const badge = screen.getByRole('button');
    fireEvent.click(badge);
    
    await waitFor(() => {
      expect(screen.getByText('Creator:')).toBeInTheDocument();
      expect(screen.getByText('0x1234...7890')).toBeInTheDocument();
      expect(screen.getByText('Royalties:')).toBeInTheDocument();
      expect(screen.getByText('5%')).toBeInTheDocument();
    });
  });

  it('displays provenance tab when provenance is provided', async () => {
    render(
      <NFTVerificationBadge
        contractAddress="0x123"
        tokenId="1"
        showProvenance={true}
        provenance={mockProvenance}
      />
    );
    
    const badge = screen.getByRole('button');
    fireEvent.click(badge);
    
    await waitFor(() => {
      expect(screen.getByText('Provenance (2)')).toBeInTheDocument();
    });
  });

  it('switches between metadata and provenance tabs', async () => {
    render(
      <NFTVerificationBadge
        contractAddress="0x123"
        tokenId="1"
        metadata={mockMetadata}
        showProvenance={true}
        provenance={mockProvenance}
      />
    );
    
    const badge = screen.getByRole('button');
    fireEvent.click(badge);
    
    await waitFor(() => {
      // Switch to metadata tab first
      const metadataTab = screen.getByText('Metadata');
      fireEvent.click(metadataTab);
      
      expect(screen.getByText(mockMetadata.name)).toBeInTheDocument();
      
      // Switch to provenance tab
      const provenanceTab = screen.getByText('Provenance (2)');
      fireEvent.click(provenanceTab);
      
      expect(screen.getByText('minted')).toBeInTheDocument();
      expect(screen.getByText('sold')).toBeInTheDocument();
    });
  });

  it('displays provenance events with correct information', async () => {
    render(
      <NFTVerificationBadge
        contractAddress="0x123"
        tokenId="1"
        showProvenance={true}
        provenance={mockProvenance}
      />
    );
    
    const badge = screen.getByRole('button');
    fireEvent.click(badge);
    
    await waitFor(() => {
      const provenanceTab = screen.getByText('Provenance (2)');
      fireEvent.click(provenanceTab);
      
      // Check minted event
      expect(screen.getByText('🎨')).toBeInTheDocument();
      expect(screen.getByText('minted')).toBeInTheDocument();
      expect(screen.getByText('0x1111...1111')).toBeInTheDocument();
      
      // Check sold event
      expect(screen.getByText('💰')).toBeInTheDocument();
      expect(screen.getByText('sold')).toBeInTheDocument();
      expect(screen.getByText('0x2222...2222')).toBeInTheDocument();
      expect(screen.getByText('1.5 ETH')).toBeInTheDocument();
    });
  });

  it('opens transaction links from provenance', async () => {
    render(
      <NFTVerificationBadge
        contractAddress="0x123"
        tokenId="1"
        showProvenance={true}
        provenance={mockProvenance}
      />
    );
    
    const badge = screen.getByRole('button');
    fireEvent.click(badge);
    
    await waitFor(() => {
      const provenanceTab = screen.getByText('Provenance (2)');
      fireEvent.click(provenanceTab);
      
      const viewTxButtons = screen.getAllByText('View Tx');
      fireEvent.click(viewTxButtons[0]);
      
      expect(mockOpen).toHaveBeenCalledWith(
        'https://etherscan.io/tx/0xabc123',
        '_blank'
      );
    });
  });

  it('closes modal when close button is clicked', async () => {
    render(
      <NFTVerificationBadge
        contractAddress="0x123"
        tokenId="1"
      />
    );
    
    const badge = screen.getByRole('button');
    fireEvent.click(badge);
    
    await waitFor(() => {
      expect(screen.getByText('NFT Verification')).toBeInTheDocument();
    });
    
    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);
    
    await waitFor(() => {
      expect(screen.queryByText('NFT Verification')).not.toBeInTheDocument();
    });
  });

  it('closes modal when backdrop is clicked', async () => {
    render(
      <NFTVerificationBadge
        contractAddress="0x123"
        tokenId="1"
      />
    );
    
    const badge = screen.getByRole('button');
    fireEvent.click(badge);
    
    await waitFor(() => {
      expect(screen.getByText('NFT Verification')).toBeInTheDocument();
    });
    
    // Click on backdrop (the modal overlay)
    const backdrop = screen.getByText('NFT Verification').closest('[class*="fixed inset-0"]');
    if (backdrop) {
      fireEvent.click(backdrop);
    }
    
    await waitFor(() => {
      expect(screen.queryByText('NFT Verification')).not.toBeInTheDocument();
    });
  });
});