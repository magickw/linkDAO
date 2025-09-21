import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BadgeCollection } from '@/components/Reputation/BadgeCollection';
import { ProgressIndicator } from '@/components/Reputation/ProgressIndicator';
import { MiniProfileCard } from '@/components/Reputation/MiniProfileCard';
import { ReputationProvider } from '@/contexts/ReputationContext';
import { Badge, UserReputation, ProgressMilestone } from '@/types/reputation';

// Mock services
jest.mock('@/services/reputationService');

const mockBadges: Badge[] = [
  {
    id: 'early-adopter',
    name: 'Early Adopter',
    description: 'Joined in the first month',
    icon: '🌟',
    rarity: 'rare',
    earnedAt: new Date('2024-01-01'),
    requirements: [{ type: 'join_date', value: '2024-01-31' }],
  },
  {
    id: 'expert',
    name: 'Expert',
    description: 'Demonstrated expertise in the community',
    icon: '🎓',
    rarity: 'epic',
    earnedAt: new Date('2024-02-15'),
    requirements: [{ type: 'reputation_score', value: 1000 }],
  },
  {
    id: 'community-leader',
    name: 'Community Leader',
    description: 'Led community initiatives',
    icon: '👑',
    rarity: 'legendary',
    earnedAt: new Date('2024-03-01'),
    requirements: [{ type: 'leadership_score', value: 500 }],
  },
];

const mockProgress: ProgressMilestone[] = [
  {
    category: 'posting',
    current: 75,
    target: 100,
    reward: 'Content Creator Badge',
    progress: 0.75,
  },
  {
    category: 'governance',
    current: 25,
    target: 50,
    reward: 'Governance Participant Badge',
    progress: 0.5,
  },
];

const mockUserReputation: UserReputation = {
  totalScore: 1250,
  level: {
    name: 'Expert',
    level: 5,
    minScore: 1000,
    maxScore: 2000,
    privileges: ['enhanced_posting', 'governance_weight'],
  },
  badges: mockBadges,
  progress: mockProgress,
  breakdown: {
    posting: 500,
    governance: 300,
    community: 250,
    trading: 150,
    moderation: 50,
  },
  history: [],
};

const mockOnBadgeClick = jest.fn();
const mockOnProgressView = jest.fn();

describe('BadgeCollection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all badges', () => {
    render(
      <ReputationProvider>
        <BadgeCollection badges={mockBadges} onBadgeClick={mockOnBadgeClick} />
      </ReputationProvider>
    );
    
    expect(screen.getByText('Early Adopter')).toBeInTheDocument();
    expect(screen.getByText('Expert')).toBeInTheDocument();
    expect(screen.getByText('Community Leader')).toBeInTheDocument();
  });

  it('should show badge rarity indicators', () => {
    render(
      <ReputationProvider>
        <BadgeCollection badges={mockBadges} onBadgeClick={mockOnBadgeClick} />
      </ReputationProvider>
    );
    
    expect(screen.getByTestId('badge-early-adopter')).toHaveClass('rarity-rare');
    expect(screen.getByTestId('badge-expert')).toHaveClass('rarity-epic');
    expect(screen.getByTestId('badge-community-leader')).toHaveClass('rarity-legendary');
  });

  it('should show badge tooltips on hover', async () => {
    const user = userEvent.setup();
    render(
      <ReputationProvider>
        <BadgeCollection badges={mockBadges} onBadgeClick={mockOnBadgeClick} />
      </ReputationProvider>
    );
    
    const expertBadge = screen.getByTestId('badge-expert');
    await user.hover(expertBadge);
    
    await waitFor(() => {
      expect(screen.getByText('Demonstrated expertise in the community')).toBeInTheDocument();
    });
  });

  it('should handle badge clicks', async () => {
    const user = userEvent.setup();
    render(
      <ReputationProvider>
        <BadgeCollection badges={mockBadges} onBadgeClick={mockOnBadgeClick} />
      </ReputationProvider>
    );
    
    const expertBadge = screen.getByTestId('badge-expert');
    await user.click(expertBadge);
    
    expect(mockOnBadgeClick).toHaveBeenCalledWith(mockBadges[1]);
  });

  it('should sort badges by rarity', () => {
    render(
      <ReputationProvider>
        <BadgeCollection badges={mockBadges} onBadgeClick={mockOnBadgeClick} />
      </ReputationProvider>
    );
    
    const badgeElements = screen.getAllByTestId(/^badge-/);
    expect(badgeElements[0]).toHaveAttribute('data-testid', 'badge-community-leader'); // legendary first
    expect(badgeElements[1]).toHaveAttribute('data-testid', 'badge-expert'); // epic second
    expect(badgeElements[2]).toHaveAttribute('data-testid', 'badge-early-adopter'); // rare last
  });

  it('should show earned date', () => {
    render(
      <ReputationProvider>
        <BadgeCollection badges={mockBadges} onBadgeClick={mockOnBadgeClick} />
      </ReputationProvider>
    );
    
    expect(screen.getByText('Earned Jan 1, 2024')).toBeInTheDocument();
  });
});

describe('ProgressIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render progress bars for all categories', () => {
    render(
      <ReputationProvider>
        <ProgressIndicator progress={mockProgress} onProgressView={mockOnProgressView} />
      </ReputationProvider>
    );
    
    expect(screen.getByText('Posting')).toBeInTheDocument();
    expect(screen.getByText('Governance')).toBeInTheDocument();
  });

  it('should show correct progress percentages', () => {
    render(
      <ReputationProvider>
        <ProgressIndicator progress={mockProgress} onProgressView={mockOnProgressView} />
      </ReputationProvider>
    );
    
    const postingProgress = screen.getByTestId('progress-posting');
    expect(postingProgress).toHaveAttribute('aria-valuenow', '75');
    expect(postingProgress).toHaveAttribute('aria-valuemax', '100');
    
    const governanceProgress = screen.getByTestId('progress-governance');
    expect(governanceProgress).toHaveAttribute('aria-valuenow', '25');
    expect(governanceProgress).toHaveAttribute('aria-valuemax', '50');
  });

  it('should show milestone rewards', () => {
    render(
      <ReputationProvider>
        <ProgressIndicator progress={mockProgress} onProgressView={mockOnProgressView} />
      </ReputationProvider>
    );
    
    expect(screen.getByText('Content Creator Badge')).toBeInTheDocument();
    expect(screen.getByText('Governance Participant Badge')).toBeInTheDocument();
  });

  it('should animate progress changes', async () => {
    const { rerender } = render(
      <ReputationProvider>
        <ProgressIndicator progress={mockProgress} onProgressView={mockOnProgressView} />
      </ReputationProvider>
    );
    
    const updatedProgress = [...mockProgress];
    updatedProgress[0].current = 85;
    updatedProgress[0].progress = 0.85;
    
    rerender(
      <ReputationProvider>
        <ProgressIndicator progress={updatedProgress} onProgressView={mockOnProgressView} />
      </ReputationProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('progress-animation')).toBeInTheDocument();
    });
  });

  it('should show milestone celebration when target is reached', async () => {
    const completedProgress: ProgressMilestone[] = [
      {
        category: 'posting',
        current: 100,
        target: 100,
        reward: 'Content Creator Badge',
        progress: 1.0,
      },
    ];
    
    render(
      <ReputationProvider>
        <ProgressIndicator progress={completedProgress} onProgressView={mockOnProgressView} />
      </ReputationProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('milestone-celebration')).toBeInTheDocument();
    });
  });

  it('should handle progress view clicks', async () => {
    const user = userEvent.setup();
    render(
      <ReputationProvider>
        <ProgressIndicator progress={mockProgress} onProgressView={mockOnProgressView} />
      </ReputationProvider>
    );
    
    const viewDetailsButton = screen.getByRole('button', { name: /view details/i });
    await user.click(viewDetailsButton);
    
    expect(mockOnProgressView).toHaveBeenCalled();
  });
});

describe('MiniProfileCard', () => {
  const mockUser = {
    id: 'user-1',
    username: 'testuser',
    displayName: 'Test User',
    avatar: '/avatar.jpg',
    walletAddress: '0x123456789',
    reputation: mockUserReputation,
    isFollowing: false,
  };

  const mockOnFollow = jest.fn();
  const mockOnUnfollow = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render user information', () => {
    render(
      <ReputationProvider>
        <MiniProfileCard
          user={mockUser}
          onFollow={mockOnFollow}
          onUnfollow={mockOnUnfollow}
        />
      </ReputationProvider>
    );
    
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('@testuser')).toBeInTheDocument();
    expect(screen.getByText('1,250')).toBeInTheDocument(); // reputation score
  });

  it('should show user badges', () => {
    render(
      <ReputationProvider>
        <MiniProfileCard
          user={mockUser}
          onFollow={mockOnFollow}
          onUnfollow={mockOnUnfollow}
        />
      </ReputationProvider>
    );
    
    expect(screen.getByText('🌟')).toBeInTheDocument(); // Early Adopter
    expect(screen.getByText('🎓')).toBeInTheDocument(); // Expert
    expect(screen.getByText('👑')).toBeInTheDocument(); // Community Leader
  });

  it('should show reputation level', () => {
    render(
      <ReputationProvider>
        <MiniProfileCard
          user={mockUser}
          onFollow={mockOnFollow}
          onUnfollow={mockOnUnfollow}
        />
      </ReputationProvider>
    );
    
    expect(screen.getByText('Expert')).toBeInTheDocument();
    expect(screen.getByText('Level 5')).toBeInTheDocument();
  });

  it('should show wallet address', () => {
    render(
      <ReputationProvider>
        <MiniProfileCard
          user={mockUser}
          onFollow={mockOnFollow}
          onUnfollow={mockOnUnfollow}
        />
      </ReputationProvider>
    );
    
    expect(screen.getByText('0x1234...6789')).toBeInTheDocument();
  });

  it('should handle follow button click', async () => {
    const user = userEvent.setup();
    render(
      <ReputationProvider>
        <MiniProfileCard
          user={mockUser}
          onFollow={mockOnFollow}
          onUnfollow={mockOnUnfollow}
        />
      </ReputationProvider>
    );
    
    const followButton = screen.getByRole('button', { name: /follow/i });
    await user.click(followButton);
    
    expect(mockOnFollow).toHaveBeenCalledWith('user-1');
  });

  it('should handle unfollow button click', async () => {
    const user = userEvent.setup();
    const followingUser = { ...mockUser, isFollowing: true };
    
    render(
      <ReputationProvider>
        <MiniProfileCard
          user={followingUser}
          onFollow={mockOnFollow}
          onUnfollow={mockOnUnfollow}
        />
      </ReputationProvider>
    );
    
    const unfollowButton = screen.getByRole('button', { name: /unfollow/i });
    await user.click(unfollowButton);
    
    expect(mockOnUnfollow).toHaveBeenCalledWith('user-1');
  });

  it('should show reputation breakdown on hover', async () => {
    const user = userEvent.setup();
    render(
      <ReputationProvider>
        <MiniProfileCard
          user={mockUser}
          onFollow={mockOnFollow}
          onUnfollow={mockOnUnfollow}
        />
      </ReputationProvider>
    );
    
    const reputationScore = screen.getByText('1,250');
    await user.hover(reputationScore);
    
    await waitFor(() => {
      expect(screen.getByText('Posting: 500')).toBeInTheDocument();
      expect(screen.getByText('Governance: 300')).toBeInTheDocument();
      expect(screen.getByText('Community: 250')).toBeInTheDocument();
    });
  });

  it('should show loading state during follow action', async () => {
    const user = userEvent.setup();
    mockOnFollow.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
    
    render(
      <ReputationProvider>
        <MiniProfileCard
          user={mockUser}
          onFollow={mockOnFollow}
          onUnfollow={mockOnUnfollow}
        />
      </ReputationProvider>
    );
    
    const followButton = screen.getByRole('button', { name: /follow/i });
    await user.click(followButton);
    
    expect(screen.getByTestId('follow-loading')).toBeInTheDocument();
  });
});

describe('Reputation System Integration', () => {
  it('should update reputation in real-time', async () => {
    const { rerender } = render(
      <ReputationProvider>
        <ProgressIndicator progress={mockProgress} onProgressView={mockOnProgressView} />
      </ReputationProvider>
    );
    
    // Simulate reputation update
    const updatedProgress = [...mockProgress];
    updatedProgress[0].current = 80;
    updatedProgress[0].progress = 0.8;
    
    rerender(
      <ReputationProvider>
        <ProgressIndicator progress={updatedProgress} onProgressView={mockOnProgressView} />
      </ReputationProvider>
    );
    
    await waitFor(() => {
      const postingProgress = screen.getByTestId('progress-posting');
      expect(postingProgress).toHaveAttribute('aria-valuenow', '80');
    });
  });

  it('should trigger achievement notifications', async () => {
    const achievementProgress: ProgressMilestone[] = [
      {
        category: 'posting',
        current: 100,
        target: 100,
        reward: 'Content Creator Badge',
        progress: 1.0,
      },
    ];
    
    render(
      <ReputationProvider>
        <ProgressIndicator progress={achievementProgress} onProgressView={mockOnProgressView} />
      </ReputationProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('achievement-notification')).toBeInTheDocument();
      expect(screen.getByText(/congratulations/i)).toBeInTheDocument();
    });
  });

  it('should handle reputation calculation errors', async () => {
    // Mock service error
    jest.doMock('@/services/reputationService', () => ({
      calculateReputation: jest.fn().mockRejectedValue(new Error('Calculation failed')),
    }));
    
    render(
      <ReputationProvider>
        <ProgressIndicator progress={mockProgress} onProgressView={mockOnProgressView} />
      </ReputationProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/unable to load reputation/i)).toBeInTheDocument();
    });
  });
});

describe('Accessibility', () => {
  it('should have proper ARIA labels for badges', () => {
    render(
      <ReputationProvider>
        <BadgeCollection badges={mockBadges} onBadgeClick={mockOnBadgeClick} />
      </ReputationProvider>
    );
    
    const expertBadge = screen.getByTestId('badge-expert');
    expect(expertBadge).toHaveAttribute('aria-label', 'Expert badge, epic rarity, earned February 15, 2024');
  });

  it('should have proper ARIA labels for progress bars', () => {
    render(
      <ReputationProvider>
        <ProgressIndicator progress={mockProgress} onProgressView={mockOnProgressView} />
      </ReputationProvider>
    );
    
    const postingProgress = screen.getByTestId('progress-posting');
    expect(postingProgress).toHaveAttribute('aria-label', 'Posting progress: 75 out of 100');
  });

  it('should support keyboard navigation', async () => {
    const user = userEvent.setup();
    render(
      <ReputationProvider>
        <BadgeCollection badges={mockBadges} onBadgeClick={mockOnBadgeClick} />
      </ReputationProvider>
    );
    
    const firstBadge = screen.getByTestId('badge-community-leader');
    firstBadge.focus();
    
    await user.keyboard('{Tab}');
    
    expect(screen.getByTestId('badge-expert')).toHaveFocus();
  });

  it('should announce reputation changes to screen readers', async () => {
    const { rerender } = render(
      <ReputationProvider>
        <ProgressIndicator progress={mockProgress} onProgressView={mockOnProgressView} />
      </ReputationProvider>
    );
    
    const updatedProgress = [...mockProgress];
    updatedProgress[0].current = 85;
    updatedProgress[0].progress = 0.85;
    
    rerender(
      <ReputationProvider>
        <ProgressIndicator progress={updatedProgress} onProgressView={mockOnProgressView} />
      </ReputationProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/posting progress updated/i);
    });
  });
});