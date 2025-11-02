import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { 
  QuickFilterPanel, 
  CommunityIconList, 
  EnhancedUserCard, 
  NavigationBreadcrumbs, 
  ActivityIndicators,
  defaultQuickFilters,
  generateBreadcrumbs,
  createActivityIndicator
} from '../index';
import { 
  CommunityWithIcons, 
  EnhancedUserProfile, 
  NavigationBreadcrumb, 
  ActivityIndicator 
} from '@/types/navigation';

// Mock data
const mockCommunities: CommunityWithIcons[] = [
  {
    id: 'test-community',
    name: 'test-community',
    displayName: 'Test Community',
    memberCount: 100,
    avatar: '🧪',
    icon: '🧪',
    unreadCount: 5,
    lastActivity: new Date(),
    userRole: { type: 'member', permissions: ['read', 'write'] },
    isJoined: true,
    activityLevel: 'high'
  }
];

const mockUser: EnhancedUserProfile = {
  id: 'test-user',
  walletAddress: '0x1234567890123456789012345678901234567890',
  username: 'testuser',
  displayName: 'Test User',
  avatar: '',
  bio: 'Test bio',
  reputation: {
    totalScore: 1000,
    level: {
      level: 5,
      name: 'Community Builder',
      minScore: 500,
      maxScore: 1500,
      privileges: []
    },
    breakdown: {
      posting: 300,
      governance: 200,
      community: 300,
      trading: 150,
      moderation: 50
    },
    progress: [],
    history: []
  },
  badges: [
    {
      id: 'test-badge',
      name: 'Test Badge',
      description: 'A test badge',
      icon: '🏆',
      rarity: 'common',
      earnedAt: new Date(),
      requirements: []
    }
  ],
  achievements: [],
  level: {
    level: 5,
    name: 'Community Builder',
    minScore: 500,
    maxScore: 1500,
    privileges: []
  },
  followers: 50,
  following: 75,
  posts: 25,
  communities: [],
  lastActive: new Date(),
  joinedAt: new Date(),
  activityScore: 85,
  engagementRate: 12.5
};

const mockBreadcrumbs: NavigationBreadcrumb[] = [
  { label: 'Home', href: '/', isActive: false, icon: '🏠' },
  { label: 'Communities', href: '/communities', isActive: false, icon: '👥' },
  { label: 'Test Community', isActive: true, icon: '🧪' }
];

const mockActivityIndicators: ActivityIndicator[] = [
  createActivityIndicator('test-notification', 'notification', 3, 'medium'),
  createActivityIndicator('test-transaction', 'transaction', 1, 'low')
];

describe('Navigation Components', () => {
  describe('QuickFilterPanel', () => {
    it('renders filter buttons correctly', () => {
      const mockOnFilterChange = jest.fn();
      
      render(
        <QuickFilterPanel 
          filters={defaultQuickFilters} 
          onFilterChange={mockOnFilterChange} 
        />
      );
      
      expect(screen.getByText('My Posts')).toBeInTheDocument();
      expect(screen.getByText('Tipped Posts')).toBeInTheDocument();
      expect(screen.getByText('Governance Posts')).toBeInTheDocument();
    });

    it('calls onFilterChange when filter is clicked', () => {
      const mockOnFilterChange = jest.fn();
      
      render(
        <QuickFilterPanel 
          filters={defaultQuickFilters} 
          onFilterChange={mockOnFilterChange} 
        />
      );
      
      fireEvent.click(screen.getByText('My Posts'));
      expect(mockOnFilterChange).toHaveBeenCalledWith('my-posts');
    });
  });

  describe('CommunityIconList', () => {
    it('renders communities correctly', () => {
      const mockOnCommunitySelect = jest.fn();
      const mockOnCommunityToggle = jest.fn();
      const mockOnToggleShowAll = jest.fn();
      
      render(
        <CommunityIconList
          communities={mockCommunities}
          onCommunitySelect={mockOnCommunitySelect}
          onCommunityToggle={mockOnCommunityToggle}
          showAllCommunities={false}
          onToggleShowAll={mockOnToggleShowAll}
        />
      );
      
      expect(screen.getByText('Test Community')).toBeInTheDocument();
      expect(screen.getByText('100 members')).toBeInTheDocument();
    });

    it('shows unread count badge', () => {
      const mockOnCommunitySelect = jest.fn();
      const mockOnCommunityToggle = jest.fn();
      const mockOnToggleShowAll = jest.fn();
      
      render(
        <CommunityIconList
          communities={mockCommunities}
          onCommunitySelect={mockOnCommunitySelect}
          onCommunityToggle={mockOnCommunityToggle}
          showAllCommunities={false}
          onToggleShowAll={mockOnToggleShowAll}
        />
      );
      
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  describe('EnhancedUserCard', () => {
    it('renders user information correctly', () => {
      render(
        <EnhancedUserCard 
          user={mockUser} 
          address={mockUser.walletAddress}
          profile={mockUser}
        />
      );
      
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('Community Builder')).toBeInTheDocument();
    });

    it('shows reputation progress', () => {
      render(
        <EnhancedUserCard 
          user={mockUser} 
          address={mockUser.walletAddress}
          profile={mockUser}
        />
      );
      
      expect(screen.getByText('1000 pts')).toBeInTheDocument();
    });

    it('displays badges', () => {
      render(
        <EnhancedUserCard 
          user={mockUser} 
          address={mockUser.walletAddress}
          profile={mockUser}
        />
      );
      
      expect(screen.getByText('🏆')).toBeInTheDocument();
    });
  });

  describe('NavigationBreadcrumbs', () => {
    it('renders breadcrumbs correctly', () => {
      render(<NavigationBreadcrumbs breadcrumbs={mockBreadcrumbs} />);
      
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Communities')).toBeInTheDocument();
      expect(screen.getByText('Test Community')).toBeInTheDocument();
    });

    it('shows active breadcrumb without link', () => {
      render(<NavigationBreadcrumbs breadcrumbs={mockBreadcrumbs} />);
      
      const activeBreadcrumb = screen.getByText('Test Community');
      expect(activeBreadcrumb.closest('a')).toBeNull();
    });
  });

  describe('ActivityIndicators', () => {
    it('renders activity indicators correctly', () => {
      const mockOnIndicatorClick = jest.fn();
      
      render(
        <ActivityIndicators 
          indicators={mockActivityIndicators}
          onIndicatorClick={mockOnIndicatorClick}
        />
      );
      
      expect(screen.getByText('🔔')).toBeInTheDocument();
      expect(screen.getByText('💰')).toBeInTheDocument();
    });

    it('shows count badges', () => {
      const mockOnIndicatorClick = jest.fn();
      
      render(
        <ActivityIndicators 
          indicators={mockActivityIndicators}
          onIndicatorClick={mockOnIndicatorClick}
        />
      );
      
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('Helper Functions', () => {
    it('generates breadcrumbs correctly', () => {
      const breadcrumbs = generateBreadcrumbs('/dao/test-community', 'Test Community');
      
      expect(breadcrumbs).toHaveLength(3);
      expect(breadcrumbs[0].label).toBe('Home');
      expect(breadcrumbs[1].label).toBe('Communities');
      expect(breadcrumbs[2].label).toBe('Test Community');
    });

    it('creates activity indicator correctly', () => {
      const indicator = createActivityIndicator('test', 'notification', 5, 'high');
      
      expect(indicator.id).toBe('test');
      expect(indicator.type).toBe('notification');
      expect(indicator.count).toBe(5);
      expect(indicator.priority).toBe('high');
      expect(indicator.isAnimated).toBe(true);
    });
  });
});