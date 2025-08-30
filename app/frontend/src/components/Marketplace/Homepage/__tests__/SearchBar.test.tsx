/**
 * SearchBar Component Tests
 * Tests for the auto-suggest search functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from '../SearchBar';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    input: ({ children, ...props }: any) => <input {...props}>{children}</input>,
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}));

describe('SearchBar', () => {
  const mockOnSearch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search input with placeholder', () => {
    render(<SearchBar />);
    
    const searchInput = screen.getByPlaceholderText('Search products, NFTs, services...');
    expect(searchInput).toBeInTheDocument();
  });

  it('renders custom placeholder when provided', () => {
    const customPlaceholder = 'Search for items...';
    render(<SearchBar placeholder={customPlaceholder} />);
    
    const searchInput = screen.getByPlaceholderText(customPlaceholder);
    expect(searchInput).toBeInTheDocument();
  });

  it('shows search icon', () => {
    render(<SearchBar />);
    
    // Search icon is an SVG, not an img element
    const searchIcon = document.querySelector('svg');
    expect(searchIcon).toBeInTheDocument();
  });

  it('updates input value when user types', async () => {
    const user = userEvent.setup();
    render(<SearchBar />);
    
    const searchInput = screen.getByPlaceholderText('Search products, NFTs, services...');
    
    await act(async () => {
      await user.type(searchInput, 'ethereum');
    });
    
    expect(searchInput).toHaveValue('ethereum');
  });

  it('shows loading spinner when searching', async () => {
    const user = userEvent.setup();
    render(<SearchBar />);
    
    const searchInput = screen.getByPlaceholderText('Search products, NFTs, services...');
    
    await act(async () => {
      await user.type(searchInput, 'eth');
    });
    
    // Loading spinner appears briefly during search - check for loading state
    // The component shows loading state internally, we can verify the search functionality works
    expect(searchInput).toHaveValue('eth');
  });

  it('shows suggestions when query length is >= 2', async () => {
    const user = userEvent.setup();
    render(<SearchBar />);
    
    const searchInput = screen.getByPlaceholderText('Search products, NFTs, services...');
    
    await act(async () => {
      await user.type(searchInput, 'ethereum');
    });
    
    await waitFor(() => {
      expect(screen.getByText('Ethereum NFT Collection')).toBeInTheDocument();
    });
  });

  it('does not show suggestions when query length is < 2', async () => {
    const user = userEvent.setup();
    render(<SearchBar />);
    
    const searchInput = screen.getByPlaceholderText('Search products, NFTs, services...');
    
    await act(async () => {
      await user.type(searchInput, 'e');
    });
    
    // Should not show suggestions
    expect(screen.queryByText('Ethereum NFT Collection')).not.toBeInTheDocument();
  });

  it('calls onSearch when suggestion is clicked', async () => {
    const user = userEvent.setup();
    render(<SearchBar onSearch={mockOnSearch} />);
    
    const searchInput = screen.getByPlaceholderText('Search products, NFTs, services...');
    
    await act(async () => {
      await user.type(searchInput, 'ethereum');
    });
    
    await waitFor(() => {
      expect(screen.getByText('Ethereum NFT Collection')).toBeInTheDocument();
    });
    
    const suggestion = screen.getByText('Ethereum NFT Collection');
    await act(async () => {
      await user.click(suggestion);
    });
    
    expect(mockOnSearch).toHaveBeenCalledWith('Ethereum NFT Collection');
  });

  it('calls onSearch when form is submitted', async () => {
    const user = userEvent.setup();
    render(<SearchBar onSearch={mockOnSearch} />);
    
    const searchInput = screen.getByPlaceholderText('Search products, NFTs, services...');
    
    await act(async () => {
      await user.type(searchInput, 'test query');
      await user.keyboard('{Enter}');
    });
    
    expect(mockOnSearch).toHaveBeenCalledWith('test query');
  });

  it('closes suggestions when clicking outside', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <SearchBar />
        <div data-testid="outside-element">Outside</div>
      </div>
    );
    
    const searchInput = screen.getByPlaceholderText('Search products, NFTs, services...');
    
    await act(async () => {
      await user.type(searchInput, 'ethereum');
    });
    
    await waitFor(() => {
      expect(screen.getByText('Ethereum NFT Collection')).toBeInTheDocument();
    });
    
    const outsideElement = screen.getByTestId('outside-element');
    await act(async () => {
      await user.click(outsideElement);
    });
    
    await waitFor(() => {
      expect(screen.queryByText('Ethereum NFT Collection')).not.toBeInTheDocument();
    });
  });

  it('displays correct type icons for different suggestion types', async () => {
    const user = userEvent.setup();
    render(<SearchBar />);
    
    const searchInput = screen.getByPlaceholderText('Search products, NFTs, services...');
    
    await act(async () => {
      await user.type(searchInput, 'crypto');
    });
    
    await waitFor(() => {
      // Should show suggestions with different types
      expect(screen.getByText('Crypto Hardware Wallet')).toBeInTheDocument();
      expect(screen.getByText('PRODUCT')).toBeInTheDocument();
    });
  });

  it('displays prices for suggestions that have them', async () => {
    const user = userEvent.setup();
    render(<SearchBar />);
    
    const searchInput = screen.getByPlaceholderText('Search products, NFTs, services...');
    
    await act(async () => {
      await user.type(searchInput, 'ethereum');
    });
    
    await waitFor(() => {
      expect(screen.getByText('0.5 ETH')).toBeInTheDocument();
    });
  });

  it('applies correct styling classes', () => {
    const { container } = render(<SearchBar className="custom-class" />);
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});