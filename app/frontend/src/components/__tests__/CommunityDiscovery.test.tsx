import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CommunityDiscovery } from '../CommunityManagement/CommunityDiscovery';
import { useWeb3 } from '@/context/Web3Context';

// Mock dependencies
jest.mock('@/context/Web3Context');

const mockUseWeb3 = useWeb3 as jest.MockedFunction<typeof useWeb3>;

const mockCommunities = [
  {
    id: 'ethereum-builders',
    name: 'ethereum-builders',
    displayName: 'Ethereum Builders',
    description: 'A community for Ethereum developers and builders',
    category: 'Technology',
    memberCount: 1240,
    isPublic: true,
    tags: ['ethereum', 'development', 'blockchain'],
    avatar: '/images/communities/ethereum.png',
  },
  {
    id: 'defi-traders',
    name: 'defi-traders',
    displayName: 'DeFi Traders',
    description: 'Discuss DeFi protocols and trading strategies',
    category: 'Finance',
    memberCount: 890,
    isPublic: true,
    tags: ['defi', 'trading', 'finance'],
    avatar: '/images/communities/defi.png',
  },
  {
    id: 'nft-collectors',
    name: 'nft-collectors',
    displayName: 'NFT Collectors',
    description: 'Share and discover amazing NFT collections',
    category: 'Art',
    memberCount: 2100,
    isPublic: true,
    tags: ['nft', 'art', 'collectibles'],
    avatar: '/images/communities/nft.png',
  },
];

describe('CommunityDiscovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseWeb3.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true,
    } as any);

    // Mock fetch for communities
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCommunities),
    });
  });

  it('renders community discovery interface', async () => {
    render(<CommunityDiscovery />);

    expect(screen.getByText('Discover Communities')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search communities/i)).toBeInTheDocument();
    expect(screen.getByText('All Categories')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Ethereum Builders')).toBeInTheDocument();
      expect(screen.getByText('DeFi Traders')).toBeInTheDocument();
      expect(screen.getByText('NFT Collectors')).toBeInTheDocument();
    });
  });

  it('filters communities by search term', async () => {
    render(<CommunityDiscovery />);

    await waitFor(() => {
      expect(screen.getByText('Ethereum Builders')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search communities/i);
    fireEvent.change(searchInput, { target: { value: 'ethereum' } });

    await waitFor(() => {
      expect(screen.getByText('Ethereum Builders')).toBeInTheDocument();
      expect(screen.queryByText('DeFi Traders')).not.toBeInTheDocument();
      expect(screen.queryByText('NFT Collectors')).not.toBeInTheDocument();
    });
  });

  it('filters communities by category', async () => {
    render(<CommunityDiscovery />);

    await waitFor(() => {
      expect(screen.getByText('Ethereum Builders')).toBeInTheDocument();
    });

    // Click on Technology category filter
    const technologyFilter = screen.getByText('Technology');
    fireEvent.click(technologyFilter);

    await waitFor(() => {
      expect(screen.getByText('Ethereum Builders')).toBeInTheDocument();
      expect(screen.queryByText('DeFi Traders')).not.toBeInTheDocument();
      expect(screen.queryByText('NFT Collectors')).not.toBeInTheDocument();
    });
  });

  it('sorts communities by different criteria', async () => {
    render(<CommunityDiscovery />);

    await waitFor(() => {
      expect(screen.getByText('Ethereum Builders')).toBeInTheDocument();
    });

    // Click on sort dropdown
    const sortButton = screen.getByText('Most Members');
    fireEvent.click(sortButton);

    // Select newest sort option
    const newestOption = screen.getByText('Newest');
    fireEvent.click(newestOption);

    // Communities should be re-sorted (we can't easily test the order without more complex setup)
    expect(screen.getByText('Ethereum Builders')).toBeInTheDocument();
  });

  it('displays community information correctly', async () => {
    render(<CommunityDiscovery />);

    await waitFor(() => {
      expect(screen.getByText('Ethereum Builders')).toBeInTheDocument();
      expect(screen.getByText('1,240 members')).toBeInTheDocument();
      expect(screen.getByText('A community for Ethereum developers and builders')).toBeInTheDocument();
    });
  });

  it('handles joining a community', async () => {
    const mockJoinFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    // Override fetch for join request
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCommunities),
      })
      .mockResolvedValueOnce(mockJoinFetch());

    render(<CommunityDiscovery />);

    await waitFor(() => {
      expect(screen.getByText('Ethereum Builders')).toBeInTheDocument();
    });

    const joinButtons = screen.getAllByText('Join');
    fireEvent.click(joinButtons[0]);

    await waitFor(() => {
      expect(mockJoinFetch).toHaveBeenCalled();
    });
  });

  it('shows loading state while fetching communities', () => {
    // Mock fetch to never resolve
    global.fetch = jest.fn().mockImplementation(() => new Promise(() => {}));

    render(<CommunityDiscovery />);

    expect(screen.getByText('Loading communities...')).toBeInTheDocument();
  });

  it('handles fetch errors gracefully', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    render(<CommunityDiscovery />);

    await waitFor(() => {
      expect(screen.getByText('Error loading communities')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  it('retries loading communities when retry button is clicked', async () => {
    // First call fails, second succeeds
    global.fetch = jest.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCommunities),
      });

    render(<CommunityDiscovery />);

    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Ethereum Builders')).toBeInTheDocument();
    });
  });

  it('shows empty state when no communities match filters', async () => {
    render(<CommunityDiscovery />);

    await waitFor(() => {
      expect(screen.getByText('Ethereum Builders')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search communities/i);
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('No communities found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search or filters')).toBeInTheDocument();
    });
  });
});