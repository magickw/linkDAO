import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ListingCard from './ListingCard';
import { MarketplaceListing } from '@/services/marketplaceService';

// Mock the services
jest.mock('@/services/marketplaceService', () => ({
  MarketplaceService: jest.fn().mockImplementation(() => ({
    placeBid: jest.fn(),
  })),
}));

describe('ListingCard', () => {
  const mockListing: MarketplaceListing = {
    id: '1',
    sellerWalletAddress: '0x1234567890123456789012345678901234567890',
    tokenAddress: '0x0000000000000000000000000000000000000000',
    price: '1.5',
    quantity: 1,
    itemType: 'DIGITAL',
    listingType: 'FIXED_PRICE',
    status: 'ACTIVE',
    startTime: '2023-01-01T00:00:00Z',
    metadataURI: 'Test Item',
    isEscrowed: false,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  };

  it('renders listing information correctly', () => {
    render(<ListingCard listing={mockListing} />);
    
    expect(screen.getByText('Test Item')).toBeInTheDocument();
    expect(screen.getByText('Seller: 0x1234...7890')).toBeInTheDocument();
    expect(screen.getByText('1.5 ETH')).toBeInTheDocument();
    expect(screen.getByText('Quantity: 1')).toBeInTheDocument();
    expect(screen.getByText('Fixed Price')).toBeInTheDocument();
    expect(screen.getByText('Digital')).toBeInTheDocument();
  });

  it('renders auction listing correctly', () => {
    const auctionListing: MarketplaceListing = {
      ...mockListing,
      listingType: 'AUCTION',
      endTime: '2023-12-31T23:59:59Z',
    };
    
    render(<ListingCard listing={auctionListing} />);
    
    expect(screen.getByText('Auction')).toBeInTheDocument();
    expect(screen.getByText(/Ends: Dec 31, 2023/)).toBeInTheDocument();
  });

  it('calls onAction when action button is clicked', () => {
    const mockAction = jest.fn();
    render(<ListingCard listing={mockListing} onAction={mockAction} />);
    
    const actionButton = screen.getByText('Buy Now');
    fireEvent.click(actionButton);
    
    expect(mockAction).toHaveBeenCalledWith(mockListing);
  });

  it('shows Place Bid button for auction listings', () => {
    const auctionListing: MarketplaceListing = {
      ...mockListing,
      listingType: 'AUCTION',
    };
    
    render(<ListingCard listing={auctionListing} />);
    
    expect(screen.getByText('Place Bid')).toBeInTheDocument();
  });

  it('displays highest bid when available', () => {
    const listingWithBid: MarketplaceListing = {
      ...mockListing,
      highestBid: '2.0',
    };
    
    render(<ListingCard listing={listingWithBid} />);
    
    expect(screen.getByText('Top Bid:')).toBeInTheDocument();
    expect(screen.getByText('2.0 ETH')).toBeInTheDocument();
  });
});