import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import InlinePreviewRenderer, { ContentPreview } from '../InlinePreviewRenderer';

// Mock the child components
jest.mock('../NFTPreview', () => {
  return function MockNFTPreview({ data }: any) {
    return <div data-testid="nft-preview">{data.name}</div>;
  };
});

jest.mock('../LinkPreview', () => {
  return function MockLinkPreview({ data }: any) {
    return <div data-testid="link-preview">{data.title}</div>;
  };
});

jest.mock('../ProposalPreview', () => {
  return function MockProposalPreview({ data }: any) {
    return <div data-testid="proposal-preview">{data.title}</div>;
  };
});

jest.mock('../TokenPreview', () => {
  return function MockTokenPreview({ data }: any) {
    return <div data-testid="token-preview">{data.symbol}</div>;
  };
});

describe('InlinePreviewRenderer', () => {
  const mockPreviews: ContentPreview[] = [
    {
      type: 'nft',
      data: {
        contractAddress: '0x123',
        tokenId: '1',
        name: 'Test NFT',
        description: 'Test description',
        image: 'test.jpg',
        collection: 'Test Collection',
        owner: '0x456'
      }
    },
    {
      type: 'link',
      data: {
        url: 'https://example.com',
        title: 'Test Article',
        description: 'Test description',
        image: 'test.jpg',
        siteName: 'Example',
        type: 'article',
        metadata: {}
      }
    },
    {
      type: 'proposal',
      data: {
        id: 'prop-1',
        title: 'Test Proposal',
        description: 'Test description',
        status: 'active',
        votingEnds: new Date(),
        yesVotes: 100,
        noVotes: 50,
        quorum: 75,
        proposer: '0x789'
      }
    }
  ];

  it('renders nothing when no previews provided', () => {
    const { container } = render(<InlinePreviewRenderer previews={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders all preview types correctly', () => {
    render(<InlinePreviewRenderer previews={mockPreviews} />);
    
    expect(screen.getByTestId('nft-preview')).toBeInTheDocument();
    expect(screen.getByTestId('link-preview')).toBeInTheDocument();
    expect(screen.getByTestId('proposal-preview')).toBeInTheDocument();
    
    expect(screen.getByText('Test NFT')).toBeInTheDocument();
    expect(screen.getByText('Test Article')).toBeInTheDocument();
    expect(screen.getByText('Test Proposal')).toBeInTheDocument();
  });

  it('respects maxPreviews limit', () => {
    render(<InlinePreviewRenderer previews={mockPreviews} maxPreviews={2} />);
    
    expect(screen.getByTestId('nft-preview')).toBeInTheDocument();
    expect(screen.getByTestId('link-preview')).toBeInTheDocument();
    expect(screen.queryByTestId('proposal-preview')).not.toBeInTheDocument();
    
    expect(screen.getByText('+1 more preview')).toBeInTheDocument();
  });

  it('shows all previews when showAll is true', () => {
    render(<InlinePreviewRenderer previews={mockPreviews} maxPreviews={2} showAll />);
    
    expect(screen.getByTestId('nft-preview')).toBeInTheDocument();
    expect(screen.getByTestId('link-preview')).toBeInTheDocument();
    expect(screen.getByTestId('proposal-preview')).toBeInTheDocument();
    
    expect(screen.queryByText('+1 more preview')).not.toBeInTheDocument();
  });

  it('handles token preview type', () => {
    const tokenPreview: ContentPreview = {
      type: 'token',
      data: {
        symbol: 'ETH',
        name: 'Ethereum',
        amount: 1.5,
        usdValue: 2400,
        change24h: 5.2,
        logo: 'eth.png',
        contractAddress: '0x123'
      }
    };

    render(<InlinePreviewRenderer previews={[tokenPreview]} />);
    
    expect(screen.getByTestId('token-preview')).toBeInTheDocument();
    expect(screen.getByText('ETH')).toBeInTheDocument();
  });
});