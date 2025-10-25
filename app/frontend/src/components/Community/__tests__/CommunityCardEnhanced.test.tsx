import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CommunityCardEnhanced from '../CommunityCardEnhanced';
import { Community } from '../../../models/Community';

// Mock community data
const mockCommunity: Community = {
  id: 'test-community',
  name: 'test-community',
  displayName: 'Test Community',
  description: 'A test community for testing purposes',
  memberCount: 1234,
  avatar: '🏛️',
  banner: 'https://example.com/banner.jpg',
  category: 'Development',
  tags: ['ethereum', 'blockchain', 'web3'],
  isPublic: true,
  rules: ['Be respectful', 'No spam'],
  moderators: ['0x1234...5678'],
  treasuryAddress: '0x1234567890123456789012345678901234567890',
  governanceToken: 'TEST',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  settings: {
    allowedPostTypes: [],
    requireApproval: false,
    minimumReputation: 0,
    stakingRequirements: []
  }
};

describe('CommunityCardEnhanced', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders community information correctly', () => {
      render(<CommunityCardEnhanced community={mockCommunity} />);
      
      expect(screen.getByText('Test Community')).toBeInTheDocument();
      expect(screen.getByText('r/test-community')).toBeInTheDocument();
      expect(screen.getByText('A test community for testing purposes')).toBeInTheDocument();
      expect(screen.getByText('1.2K')).toBeInTheDocument(); // Formatted member count
      expect(screen.getByText('Development')).toBeInTheDocument();
    });

    it('renders loading skeleton when isLoading is true', () => {
      render(<CommunityCardEnhanced community={mockCommunity} isLoading={true} />);
      
      expect(screen.getByRole('article')).toHaveClass('animate-pulse');
    });

    it('displays trending badge when showTrendingInfo is true', () => {
      const trendingCommunity = {
        ...mockCommunity,
        growthRate: 60 // Hot community
      };
      
      render(<CommunityCardEnhanced community={trendingCommunity} showTrendingInfo={true} />);
      
      expect(screen.getByText('🔥 Hot')).toBeInTheDocument();
    });

    it('renders tags correctly', () => {
      render(<CommunityCardEnhanced community={mockCommunity} />);
      
      expect(screen.getByText('ethereum')).toBeInTheDocument();
      expect(screen.getByText('blockchain')).toBeInTheDocument();
      expect(screen.getByText('web3')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('handles community selection', () => {
      const mockOnSelect = jest.fn();
      render(<CommunityCardEnhanced community={mockCommunity} onSelect={mockOnSelect} />);
      
      const card = screen.getByRole('article');
      fireEvent.click(card);
      
      expect(mockOnSelect).toHaveBeenCalledWith(mockCommunity);
    });

    it('handles join community action', () => {
      const mockOnJoin = jest.fn();
      render(<CommunityCardEnhanced community={mockCommunity} onJoin={mockOnJoin} />);
      
      const joinButton = screen.getByText('Join');
      fireEvent.click(joinButton);
      
      expect(mockOnJoin).toHaveBeenCalledWith('test-community');
    });
  });

  describe('Props and Variants', () => {
    it('renders compact version correctly', () => {
      render(<CommunityCardEnhanced community={mockCommunity} compact={true} />);
      
      // Check that compact class is applied
      expect(screen.getByRole('article')).toHaveClass('max-w-xs');
    });
  });
});