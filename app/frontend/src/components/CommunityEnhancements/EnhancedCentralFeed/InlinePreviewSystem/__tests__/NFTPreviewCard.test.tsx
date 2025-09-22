/**
 * NFTPreviewCard Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import NFTPreviewCard from '../NFTPreviewCard';
import { NFTPreview } from '../../../../../types/communityEnhancements';

describe('NFTPreviewCard', () => {
  const mockNFT: NFTPreview = {
    tokenId: '1234',
    collection: 'Bored Ape Yacht Club',
    image: 'https://example.com/nft.jpg',
    floorPrice: 15.5,
    rarity: 'rare',
    marketData: {
      lastSale: 18.2,
      volume24h: 1250.75
    }
  };

  const mockOnExpand = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders NFT information correctly', () => {
      render(<NFTPreviewCard nft={mockNFT} />);
      
      expect(screen.getByText('Bored Ape Yacht Club')).toBeInTheDocument();
      expect(screen.getByText('#1234')).toBeInTheDocument();
      expect(screen.getByText('15.50 ETH')).toBeInTheDocument();
      expect(screen.getByText('Floor Price')).toBeInTheDocument();
    });

    it('renders NFT image with correct alt text', () => {
      render(<NFTPreviewCard nft={mockNFT} />);
      
      const image = screen.getByAltText('Bored Ape Yacht Club #1234');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', mockNFT.image);
    });

    it('renders rarity badge when rarity is provided', () => {
      render(<NFTPreviewCard nft={mockNFT} />);
      
      expect(screen.getByText('Rare')).toBeInTheDocument();
      expect(screen.getByText('🔵')).toBeInTheDocument();
    });

    it('does not render rarity badge when rarity is not provided', () => {
      const nftWithoutRarity = { ...mockNFT, rarity: undefined };
      render(<NFTPreviewCard nft={nftWithoutRarity} />);
      
      expect(screen.queryByText('Rare')).not.toBeInTheDocument();
    });
  });

  describe('Market Data Display', () => {
    it('shows market data when showMarketData is true', () => {
      render(<NFTPreviewCard nft={mockNFT} showMarketData={true} />);
      
      expect(screen.getByText('Last Sale')).toBeInTheDocument();
      expect(screen.getByText('18.20 ETH')).toBeInTheDocument();
      expect(screen.getByText('24h Volume')).toBeInTheDocument();
      expect(screen.getByText('1.3K ETH')).toBeInTheDocument();
    });

    it('hides market data when showMarketData is false', () => {
      render(<NFTPreviewCard nft={mockNFT} showMarketData={false} />);
      
      expect(screen.queryByText('Last Sale')).not.toBeInTheDocument();
      expect(screen.queryByText('24h Volume')).not.toBeInTheDocument();
    });

    it('shows compact market data in compact mode', () => {
      render(<NFTPreviewCard nft={mockNFT} compact={true} showMarketData={true} />);
      
      expect(screen.getByText('Last: 18.20 ETH')).toBeInTheDocument();
      expect(screen.getByText('Vol: 1.3K ETH')).toBeInTheDocument();
    });

    it('handles missing market data gracefully', () => {
      const nftWithoutMarketData = { ...mockNFT, marketData: undefined };
      render(<NFTPreviewCard nft={nftWithoutMarketData} />);
      
      expect(screen.queryByText('Last Sale')).not.toBeInTheDocument();
      expect(screen.queryByText('24h Volume')).not.toBeInTheDocument();
    });
  });

  describe('Price Formatting', () => {
    it('formats large prices correctly', () => {
      const expensiveNFT = { ...mockNFT, floorPrice: 1500.25 };
      render(<NFTPreviewCard nft={expensiveNFT} />);
      
      expect(screen.getByText('1.5K ETH')).toBeInTheDocument();
    });

    it('formats small prices correctly', () => {
      const cheapNFT = { ...mockNFT, floorPrice: 0.05 };
      render(<NFTPreviewCard nft={cheapNFT} />);
      
      expect(screen.getByText('0.05 ETH')).toBeInTheDocument();
    });

    it('formats volume in millions correctly', () => {
      const highVolumeNFT = {
        ...mockNFT,
        marketData: { lastSale: 10, volume24h: 2500000 }
      };
      render(<NFTPreviewCard nft={highVolumeNFT} />);
      
      expect(screen.getByText('2.5M ETH')).toBeInTheDocument();
    });
  });

  describe('Rarity Configuration', () => {
    const rarityTests = [
      { rarity: 'common', label: 'Common', icon: '⚪' },
      { rarity: 'uncommon', label: 'Uncommon', icon: '🟢' },
      { rarity: 'rare', label: 'Rare', icon: '🔵' },
      { rarity: 'epic', label: 'Epic', icon: '🟣' },
      { rarity: 'legendary', label: 'Legendary', icon: '🟡' },
      { rarity: 'mythic', label: 'Mythic', icon: '🔴' }
    ];

    rarityTests.forEach(({ rarity, label, icon }) => {
      it(`renders ${rarity} rarity correctly`, () => {
        const nftWithRarity = { ...mockNFT, rarity };
        render(<NFTPreviewCard nft={nftWithRarity} />);
        
        expect(screen.getByText(label)).toBeInTheDocument();
        expect(screen.getByText(icon)).toBeInTheDocument();
      });
    });

    it('handles unknown rarity as common', () => {
      const nftWithUnknownRarity = { ...mockNFT, rarity: 'unknown' };
      render(<NFTPreviewCard nft={nftWithUnknownRarity} />);
      
      expect(screen.getByText('Common')).toBeInTheDocument();
      expect(screen.getByText('⚪')).toBeInTheDocument();
    });
  });

  describe('Image Loading States', () => {
    it('shows loading skeleton initially', () => {
      render(<NFTPreviewCard nft={mockNFT} />);
      
      const skeleton = document.querySelector('.ce-skeleton');
      expect(skeleton).toBeInTheDocument();
    });

    it('shows error state when image fails to load', async () => {
      render(<NFTPreviewCard nft={mockNFT} />);
      
      const image = screen.getByAltText('Bored Ape Yacht Club #1234');
      fireEvent.error(image);
      
      await waitFor(() => {
        expect(screen.getByText('Image unavailable')).toBeInTheDocument();
      });
    });

    it('hides skeleton when image loads successfully', async () => {
      render(<NFTPreviewCard nft={mockNFT} />);
      
      const image = screen.getByAltText('Bored Ape Yacht Club #1234');
      fireEvent.load(image);
      
      await waitFor(() => {
        const skeleton = document.querySelector('.ce-skeleton');
        expect(skeleton).not.toBeInTheDocument();
      });
    });
  });

  describe('Expand Functionality', () => {
    it('shows expand indicator when onExpand is provided', () => {
      render(<NFTPreviewCard nft={mockNFT} onExpand={mockOnExpand} />);
      
      const card = screen.getByRole('button');
      expect(card).toBeInTheDocument();
    });

    it('calls onExpand when card is clicked', () => {
      render(<NFTPreviewCard nft={mockNFT} onExpand={mockOnExpand} />);
      
      const card = screen.getByRole('button');
      fireEvent.click(card);
      
      expect(mockOnExpand).toHaveBeenCalledWith(mockNFT);
    });

    it('calls onExpand when Enter key is pressed', () => {
      render(<NFTPreviewCard nft={mockNFT} onExpand={mockOnExpand} />);
      
      const card = screen.getByRole('button');
      fireEvent.keyDown(card, { key: 'Enter' });
      
      expect(mockOnExpand).toHaveBeenCalledWith(mockNFT);
    });

    it('calls onExpand when Space key is pressed', () => {
      render(<NFTPreviewCard nft={mockNFT} onExpand={mockOnExpand} />);
      
      const card = screen.getByRole('button');
      fireEvent.keyDown(card, { key: ' ' });
      
      expect(mockOnExpand).toHaveBeenCalledWith(mockNFT);
    });

    it('does not call onExpand when loading', () => {
      render(<NFTPreviewCard nft={mockNFT} onExpand={mockOnExpand} isLoading={true} />);
      
      const card = screen.getByRole('button');
      fireEvent.click(card);
      
      expect(mockOnExpand).not.toHaveBeenCalled();
    });

    it('does not show expand indicator when onExpand is not provided', () => {
      render(<NFTPreviewCard nft={mockNFT} />);
      
      const card = screen.queryByRole('button');
      expect(card).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading overlay when isLoading is true', () => {
      render(<NFTPreviewCard nft={mockNFT} isLoading={true} />);
      
      const loadingSpinner = document.querySelector('.animate-spin');
      expect(loadingSpinner).toBeInTheDocument();
    });

    it('applies loading styles when isLoading is true', () => {
      render(<NFTPreviewCard nft={mockNFT} isLoading={true} />);
      
      const card = screen.getByLabelText(/NFT: Bored Ape Yacht Club/);
      expect(card).toHaveClass('opacity-75', 'cursor-wait');
    });
  });

  describe('Compact Mode', () => {
    it('applies compact styling when compact is true', () => {
      render(<NFTPreviewCard nft={mockNFT} compact={true} />);
      
      const card = screen.getByLabelText(/NFT: Bored Ape Yacht Club/);
      expect(card).toHaveClass('max-w-xs');
    });

    it('applies normal styling when compact is false', () => {
      render(<NFTPreviewCard nft={mockNFT} compact={false} />);
      
      const card = screen.getByLabelText(/NFT: Bored Ape Yacht Club/);
      expect(card).toHaveClass('max-w-sm');
    });
  });

  describe('CSS Classes', () => {
    it('applies base CSS classes', () => {
      render(<NFTPreviewCard nft={mockNFT} />);
      
      const card = screen.getByLabelText(/NFT: Bored Ape Yacht Club/);
      expect(card).toHaveClass('ce-nft-preview-card');
      expect(card).toHaveClass('bg-white');
      expect(card).toHaveClass('dark:bg-gray-800');
    });

    it('applies custom className', () => {
      render(<NFTPreviewCard nft={mockNFT} className="custom-class" />);
      
      const card = screen.getByLabelText(/NFT: Bored Ape Yacht Club/);
      expect(card).toHaveClass('custom-class');
    });

    it('applies hover classes when expandable', () => {
      render(<NFTPreviewCard nft={mockNFT} onExpand={mockOnExpand} />);
      
      const card = screen.getByRole('button');
      expect(card).toHaveClass('cursor-pointer');
      expect(card).toHaveClass('hover:transform');
      expect(card).toHaveClass('hover:scale-105');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA label with all NFT information', () => {
      render(<NFTPreviewCard nft={mockNFT} onExpand={mockOnExpand} />);
      
      const card = screen.getByRole('button');
      expect(card).toHaveAttribute(
        'aria-label',
        'NFT: Bored Ape Yacht Club #1234, rare rarity, floor price 15.5 ETH'
      );
    });

    it('has proper ARIA label without optional information', () => {
      const minimalNFT = {
        tokenId: '1234',
        collection: 'Test Collection',
        image: 'https://example.com/nft.jpg'
      };
      render(<NFTPreviewCard nft={minimalNFT} />);
      
      const card = screen.getByLabelText('NFT: Test Collection #1234');
      expect(card).toBeInTheDocument();
    });

    it('has aria-hidden on decorative elements', () => {
      render(<NFTPreviewCard nft={mockNFT} />);
      
      const rarityIcon = screen.getByText('🔵');
      const ethSymbol = screen.getByText('Ξ');
      
      expect(rarityIcon).toHaveAttribute('aria-hidden', 'true');
      expect(ethSymbol).toHaveAttribute('aria-hidden', 'true');
    });

    it('provides comprehensive screen reader information', () => {
      render(<NFTPreviewCard nft={mockNFT} onExpand={mockOnExpand} />);
      
      const srInfo = screen.getByText(/NFT from Bored Ape Yacht Club, token ID 1234/);
      expect(srInfo).toHaveClass('sr-only');
      expect(srInfo).toHaveTextContent('click to expand for more details');
    });

    it('supports keyboard navigation', () => {
      render(<NFTPreviewCard nft={mockNFT} onExpand={mockOnExpand} />);
      
      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('does not have tabIndex when not expandable', () => {
      render(<NFTPreviewCard nft={mockNFT} />);
      
      const card = screen.getByRole('img');
      expect(card).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Performance', () => {
    it('memoizes component correctly', () => {
      const { rerender } = render(<NFTPreviewCard nft={mockNFT} />);
      const firstRender = screen.getByText('Bored Ape Yacht Club');
      
      // Re-render with same props
      rerender(<NFTPreviewCard nft={mockNFT} />);
      const secondRender = screen.getByText('Bored Ape Yacht Club');
      
      expect(firstRender).toBe(secondRender);
    });

    it('uses lazy loading for images', () => {
      render(<NFTPreviewCard nft={mockNFT} />);
      
      const image = screen.getByAltText('Bored Ape Yacht Club #1234');
      expect(image).toHaveAttribute('loading', 'lazy');
    });
  });

  describe('Edge Cases', () => {
    it('handles missing floor price', () => {
      const nftWithoutPrice = { ...mockNFT, floorPrice: undefined };
      render(<NFTPreviewCard nft={nftWithoutPrice} />);
      
      expect(screen.queryByText('Floor Price')).not.toBeInTheDocument();
    });

    it('handles zero floor price', () => {
      const freeNFT = { ...mockNFT, floorPrice: 0 };
      render(<NFTPreviewCard nft={freeNFT} />);
      
      expect(screen.getByText('0.00 ETH')).toBeInTheDocument();
    });

    it('handles very long collection names', () => {
      const longNameNFT = {
        ...mockNFT,
        collection: 'This is a very long collection name that should be truncated'
      };
      render(<NFTPreviewCard nft={longNameNFT} />);
      
      const collectionName = screen.getByText(longNameNFT.collection);
      expect(collectionName).toHaveClass('truncate');
    });
  });
});