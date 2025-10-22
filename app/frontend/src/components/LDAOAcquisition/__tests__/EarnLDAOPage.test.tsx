import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EarnLDAOPage from '../EarnLDAOPage';
import { ldaoAcquisitionService } from '../../../services/ldaoAcquisitionService';

// Mock the service
jest.mock('../../../services/ldaoAcquisitionService');
const mockService = ldaoAcquisitionService as jest.Mocked<typeof ldaoAcquisitionService>;

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('EarnLDAOPage', () => {
  const mockOpportunities = [
    {
      id: 'profile_setup',
      title: 'Complete Profile Setup',
      description: 'Add profile picture, bio, and social links',
      reward: '50 LDAO',
      difficulty: 'easy' as const,
      timeEstimate: '5 minutes',
      category: 'social' as const,
      requirements: ['Connect wallet', 'Verify email']
    },
    {
      id: 'first_post',
      title: 'Create Your First Post',
      description: 'Share content with the community',
      reward: '25 LDAO',
      difficulty: 'easy' as const,
      timeEstimate: '10 minutes',
      category: 'social' as const
    }
  ];

  const mockUserProgress = {
    level: 3,
    xp: 150,
    xpToNextLevel: 200,
    streak: 5,
    totalEarned: '125',
    completedTasks: ['profile_setup'],
    achievements: [
      {
        id: 'first_task',
        title: 'Getting Started',
        description: 'Complete your first earning task',
        icon: '🎯',
        unlockedAt: new Date('2024-01-01')
      }
    ],
    rank: 42,
    weeklyEarnings: 75
  };

  const mockLeaderboard = [
    {
      rank: 1,
      address: '0x1111111111111111111111111111111111111111',
      displayName: 'TopEarner',
      totalEarned: '5000',
      weeklyEarned: '500',
      level: 15
    },
    {
      rank: 2,
      address: '0x2222222222222222222222222222222222222222',
      totalEarned: '4500',
      weeklyEarned: '450',
      level: 14
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockService.getEarnOpportunities.mockResolvedValue(mockOpportunities);
    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/ldao/user-progress/')) {
        return Promise.resolve({
          json: () => Promise.resolve(mockUserProgress)
        } as Response);
      }
      if (url.includes('/api/ldao/leaderboard')) {
        return Promise.resolve({
          json: () => Promise.resolve(mockLeaderboard)
        } as Response);
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  it('renders loading state initially', () => {
    render(<EarnLDAOPage />);
    
    expect(screen.getByRole('generic')).toHaveClass('animate-spin');
  });

  it('renders page title and description', async () => {
    render(<EarnLDAOPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Earn LDAO Tokens')).toBeInTheDocument();
      expect(screen.getByText('Complete activities and earn free LDAO tokens to unlock platform benefits')).toBeInTheDocument();
    });
  });

  it('shows user progress when wallet is connected', async () => {
    render(<EarnLDAOPage userAddress="0x1234567890123456789012345678901234567890" />);
    
    await waitFor(() => {
      expect(screen.getByText('125')).toBeInTheDocument(); // Total earned
      expect(screen.getByText('1')).toBeInTheDocument(); // Completed tasks
      expect(screen.getByText('#42')).toBeInTheDocument(); // Rank
      expect(screen.getByText('75')).toBeInTheDocument(); // Weekly earnings
    });
  });

  it('shows level and XP progress', async () => {
    render(<EarnLDAOPage userAddress="0x1234567890123456789012345678901234567890" />);
    
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument(); // Level
      expect(screen.getByText('150/200 XP')).toBeInTheDocument(); // XP progress
      expect(screen.getByText('5')).toBeInTheDocument(); // Streak
    });
  });

  it('shows earning opportunities grouped by category', async () => {
    render(<EarnLDAOPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Social Rewards')).toBeInTheDocument();
      expect(screen.getByText('Complete Profile Setup')).toBeInTheDocument();
      expect(screen.getByText('Create Your First Post')).toBeInTheDocument();
    });
  });

  it('shows task details correctly', async () => {
    render(<EarnLDAOPage />);
    
    await waitFor(() => {
      expect(screen.getByText('50 LDAO')).toBeInTheDocument();
      expect(screen.getByText('25 LDAO')).toBeInTheDocument();
      expect(screen.getByText('5 minutes')).toBeInTheDocument();
      expect(screen.getByText('10 minutes')).toBeInTheDocument();
      expect(screen.getByText('easy')).toBeInTheDocument();
    });
  });

  it('shows requirements for tasks that have them', async () => {
    render(<EarnLDAOPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Requirements:')).toBeInTheDocument();
      expect(screen.getByText('Connect wallet')).toBeInTheDocument();
      expect(screen.getByText('Verify email')).toBeInTheDocument();
    });
  });

  it('handles task completion', async () => {
    mockService.claimEarnedTokens.mockResolvedValue({
      success: true,
      ldaoAmount: '50'
    });
    
    render(<EarnLDAOPage userAddress="0x1234567890123456789012345678901234567890" />);
    
    await waitFor(() => {
      const startButton = screen.getAllByText('Start Task')[0];
      fireEvent.click(startButton);
    });
    
    await waitFor(() => {
      expect(mockService.claimEarnedTokens).toHaveBeenCalledWith('first_post');
    });
  });

  it('shows completed tasks with checkmark', async () => {
    render(<EarnLDAOPage userAddress="0x1234567890123456789012345678901234567890" />);
    
    await waitFor(() => {
      expect(screen.getByText('✓ Completed')).toBeInTheDocument();
    });
  });

  it('requires wallet connection for task completion', async () => {
    render(<EarnLDAOPage />);
    
    await waitFor(() => {
      const connectButtons = screen.getAllByText('Connect Wallet');
      expect(connectButtons.length).toBeGreaterThan(0);
    });
  });

  it('switches between tabs correctly', async () => {
    render(<EarnLDAOPage userAddress="0x1234567890123456789012345678901234567890" />);
    
    await waitFor(() => {
      // Should show tasks by default
      expect(screen.getByText('Complete Profile Setup')).toBeInTheDocument();
    });
    
    // Switch to achievements
    const achievementsTab = screen.getByText('Achievements');
    fireEvent.click(achievementsTab);
    
    await waitFor(() => {
      expect(screen.getByText('Your Achievements')).toBeInTheDocument();
      expect(screen.getByText('Getting Started')).toBeInTheDocument();
    });
    
    // Switch to leaderboard
    const leaderboardTab = screen.getByText('Leaderboard');
    fireEvent.click(leaderboardTab);
    
    await waitFor(() => {
      expect(screen.getByText('Top Earners')).toBeInTheDocument();
      expect(screen.getByText('TopEarner')).toBeInTheDocument();
    });
  });

  it('shows achievements with progress bars for locked ones', async () => {
    render(<EarnLDAOPage userAddress="0x1234567890123456789012345678901234567890" />);
    
    // Switch to achievements tab
    const achievementsTab = screen.getByText('Achievements');
    fireEvent.click(achievementsTab);
    
    await waitFor(() => {
      expect(screen.getByText('Task Master')).toBeInTheDocument();
      expect(screen.getByText('Complete 10 tasks')).toBeInTheDocument();
      expect(screen.getByText('1/10 tasks completed')).toBeInTheDocument();
    });
  });

  it('highlights current user in leaderboard', async () => {
    const userAddress = '0x1111111111111111111111111111111111111111';
    render(<EarnLDAOPage userAddress={userAddress} />);
    
    // Switch to leaderboard tab
    const leaderboardTab = screen.getByText('Leaderboard');
    fireEvent.click(leaderboardTab);
    
    await waitFor(() => {
      const userRow = screen.getByText('TopEarner').closest('div');
      expect(userRow).toHaveClass('bg-blue-50');
    });
  });

  it('shows benefits section', async () => {
    render(<EarnLDAOPage />);
    
    await waitFor(() => {
      expect(screen.getByText('What You Can Do With LDAO Tokens')).toBeInTheDocument();
      expect(screen.getByText('Tip Creators')).toBeInTheDocument();
      expect(screen.getByText('Stake for Rewards')).toBeInTheDocument();
      expect(screen.getByText('Governance Voting')).toBeInTheDocument();
      expect(screen.getByText('Marketplace Discounts')).toBeInTheDocument();
    });
  });

  it('shows connect wallet prompt for non-connected users', async () => {
    render(<EarnLDAOPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Ready to Start Earning?')).toBeInTheDocument();
      expect(screen.getByText('Connect your wallet to start completing tasks and earning LDAO tokens')).toBeInTheDocument();
    });
  });

  it('shows achievement celebration modal', async () => {
    // Mock a scenario where user completes their first task
    mockService.claimEarnedTokens.mockResolvedValue({
      success: true,
      ldaoAmount: '25'
    });
    
    render(<EarnLDAOPage userAddress="0x1234567890123456789012345678901234567890" />);
    
    await waitFor(() => {
      const startButton = screen.getAllByText('Start Task')[0];
      fireEvent.click(startButton);
    });
    
    // Should show celebration modal for new achievement
    await waitFor(() => {
      expect(screen.getByText('Achievement Unlocked!')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    mockService.getEarnOpportunities.mockRejectedValue(new Error('API Error'));
    
    render(<EarnLDAOPage />);
    
    await waitFor(() => {
      // Should still render the page structure even if opportunities fail to load
      expect(screen.getByText('Earn LDAO Tokens')).toBeInTheDocument();
    });
  });

  it('shows correct difficulty colors', async () => {
    const opportunitiesWithDifficulties = [
      { ...mockOpportunities[0], difficulty: 'easy' as const },
      { ...mockOpportunities[1], difficulty: 'medium' as const, id: 'medium_task' },
      { ...mockOpportunities[1], difficulty: 'hard' as const, id: 'hard_task' }
    ];
    
    mockService.getEarnOpportunities.mockResolvedValue(opportunitiesWithDifficulties);
    
    render(<EarnLDAOPage />);
    
    await waitFor(() => {
      const easyBadge = screen.getAllByText('easy')[0];
      expect(easyBadge).toHaveClass('text-green-600');
      
      const mediumBadge = screen.getAllByText('medium')[0];
      expect(mediumBadge).toHaveClass('text-yellow-600');
      
      const hardBadge = screen.getAllByText('hard')[0];
      expect(hardBadge).toHaveClass('text-red-600');
    });
  });

  it('shows task count per category', async () => {
    render(<EarnLDAOPage />);
    
    await waitFor(() => {
      expect(screen.getByText('2 tasks')).toBeInTheDocument();
    });
  });
});