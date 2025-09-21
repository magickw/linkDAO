import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PostMetadata, { PostAward, CrosspostInfo } from '../PostMetadata';
import { FlairConfig } from '../PostFlair';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Clock: () => <div data-testid="clock-icon">🕐</div>,
  MessageCircle: () => <div data-testid="message-icon">💬</div>,
  Share2: () => <div data-testid="share-icon">📤</div>,
  Award: () => <div data-testid="award-icon">🏆</div>,
  ExternalLink: () => <div data-testid="external-link-icon">🔗</div>,
  Pin: () => <div data-testid="pin-icon">📌</div>,
  Lock: () => <div data-testid="lock-icon">🔒</div>,
  Zap: () => <div data-testid="zap-icon">⚡</div>,
}));

// Mock PostFlair component
jest.mock('../PostFlair', () => {
  return function MockPostFlair({ flair, onClick, clickable }: any) {
    const flairName = typeof flair === 'string' ? flair : flair.name;
    return (
      <span 
        data-testid="post-flair"
        onClick={clickable ? onClick : undefined}
        style={{ cursor: clickable ? 'pointer' : 'default' }}
      >
        {flairName}
      </span>
    );
  };
});

describe('PostMetadata', () => {
  const mockCommunity = {
    name: 'testcommunity',
    displayName: 'Test Community'
  };

  const mockFlair: FlairConfig = {
    id: 'discussion',
    name: 'Discussion',
    color: '#3b82f6',
    backgroundColor: '#dbeafe',
    textColor: '#1e40af',
    moderatorOnly: false
  };

  const mockAwards: PostAward[] = [
    {
      id: '1',
      name: 'Gold',
      icon: '🥇',
      count: 2,
      description: 'Gold award'
    },
    {
      id: '2',
      name: 'Silver',
      icon: '🥈',
      count: 1,
      description: 'Silver award'
    }
  ];

  const mockCrosspost: CrosspostInfo = {
    originalCommunity: 'originalcommunity',
    originalAuthor: '0x1234567890123456789012345678901234567890',
    originalPostId: 'original-post-id'
  };

  const baseProps = {
    author: '0x1234567890123456789012345678901234567890',
    createdAt: new Date('2024-01-01T12:00:00Z')
  };

  beforeEach(() => {
    // Mock current time for consistent relative time testing
    jest.useFakeTimers('modern');
    jest.setSystemTime(new Date('2024-01-01T14:00:00Z')); // 2 hours after post creation
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders basic metadata correctly', () => {
    render(<PostMetadata {...baseProps} />);

    expect(screen.getByText('u/0x1234...7890')).toBeInTheDocument();
    expect(screen.getByText('2h')).toBeInTheDocument();
    expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
  });

  it('renders community information when provided', () => {
    render(<PostMetadata {...baseProps} community={mockCommunity} />);

    expect(screen.getByText('r/Test Community')).toBeInTheDocument();
  });

  it('hides community when showCommunity is false', () => {
    render(
      <PostMetadata 
        {...baseProps} 
        community={mockCommunity} 
        showCommunity={false} 
      />
    );

    expect(screen.queryByText('r/Test Community')).not.toBeInTheDocument();
  });

  it('renders flair when provided', () => {
    render(<PostMetadata {...baseProps} flair={mockFlair} />);

    expect(screen.getByTestId('post-flair')).toBeInTheDocument();
    expect(screen.getByText('Discussion')).toBeInTheDocument();
  });

  it('renders string flair correctly', () => {
    render(<PostMetadata {...baseProps} flair="Discussion" />);

    expect(screen.getByTestId('post-flair')).toBeInTheDocument();
    expect(screen.getByText('Discussion')).toBeInTheDocument();
  });

  it('shows pinned indicator when isPinned is true', () => {
    render(<PostMetadata {...baseProps} isPinned={true} />);

    expect(screen.getByTestId('pin-icon')).toBeInTheDocument();
    expect(screen.getByText('Pinned')).toBeInTheDocument();
  });

  it('shows locked indicator when isLocked is true', () => {
    render(<PostMetadata {...baseProps} isLocked={true} />);

    expect(screen.getByTestId('lock-icon')).toBeInTheDocument();
    expect(screen.getByText('Locked')).toBeInTheDocument();
  });

  it('shows sponsored indicator when isSponsored is true', () => {
    render(<PostMetadata {...baseProps} isSponsored={true} />);

    expect(screen.getByTestId('zap-icon')).toBeInTheDocument();
    expect(screen.getByText('Sponsored')).toBeInTheDocument();
  });

  it('renders awards correctly', () => {
    render(<PostMetadata {...baseProps} awards={mockAwards} />);

    expect(screen.getByTestId('award-icon')).toBeInTheDocument();
    expect(screen.getByText('🥇')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('🥈')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows award count overflow indicator', () => {
    const manyAwards = [
      ...mockAwards,
      { id: '3', name: 'Bronze', icon: '🥉', count: 1 },
      { id: '4', name: 'Platinum', icon: '💎', count: 1 }
    ];

    render(<PostMetadata {...baseProps} awards={manyAwards} />);

    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('renders crosspost information', () => {
    render(<PostMetadata {...baseProps} crosspost={mockCrosspost} />);

    expect(screen.getByTestId('external-link-icon')).toBeInTheDocument();
    expect(screen.getByText('crossposted from r/originalcommunity')).toBeInTheDocument();
  });

  it('shows comment count when provided', () => {
    render(<PostMetadata {...baseProps} commentCount={42} />);

    expect(screen.getByTestId('message-icon')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('shows share count when provided and greater than 0', () => {
    render(<PostMetadata {...baseProps} shareCount={15} />);

    expect(screen.getByTestId('share-icon')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('hides share count when 0', () => {
    render(<PostMetadata {...baseProps} shareCount={0} />);

    expect(screen.queryByTestId('share-icon')).not.toBeInTheDocument();
  });

  it('formats relative time correctly', () => {
    const testCases = [
      { offset: 30000, expected: 'now' }, // 30 seconds
      { offset: 300000, expected: '5m' }, // 5 minutes
      { offset: 7200000, expected: '2h' }, // 2 hours
      { offset: 172800000, expected: '2d' }, // 2 days
    ];

    testCases.forEach(({ offset, expected }) => {
      const pastDate = new Date(Date.now() - offset);
      const { unmount } = render(
        <PostMetadata {...baseProps} createdAt={pastDate} />
      );

      expect(screen.getByText(expected)).toBeInTheDocument();
      unmount();
    });
  });

  it('shows full timestamp when showFullTimestamp is true', () => {
    render(
      <PostMetadata 
        {...baseProps} 
        showFullTimestamp={true}
      />
    );

    // Should show full date instead of relative time
    expect(screen.queryByText('2h')).not.toBeInTheDocument();
    // The exact format depends on locale, so we just check it's not the relative format
  });

  it('formats author address correctly', () => {
    const shortAddress = '0x123456';
    render(<PostMetadata {...baseProps} author={shortAddress} />);

    expect(screen.getByText('0x123456')).toBeInTheDocument();
  });

  it('handles click events correctly', async () => {
    const user = userEvent.setup();
    const mockOnAuthorClick = jest.fn();
    const mockOnCommunityClick = jest.fn();
    const mockOnFlairClick = jest.fn();

    render(
      <PostMetadata 
        {...baseProps}
        community={mockCommunity}
        flair={mockFlair}
        onAuthorClick={mockOnAuthorClick}
        onCommunityClick={mockOnCommunityClick}
        onFlairClick={mockOnFlairClick}
      />
    );

    // Click author
    await user.click(screen.getByText('u/0x1234...7890'));
    expect(mockOnAuthorClick).toHaveBeenCalledWith(baseProps.author);

    // Click community
    await user.click(screen.getByText('r/Test Community'));
    expect(mockOnCommunityClick).toHaveBeenCalledWith('testcommunity');

    // Click flair
    await user.click(screen.getByTestId('post-flair'));
    expect(mockOnFlairClick).toHaveBeenCalledWith(mockFlair);
  });

  it('applies custom className', () => {
    render(<PostMetadata {...baseProps} className="custom-class" />);

    const container = screen.getByText('u/0x1234...7890').closest('div');
    expect(container).toHaveClass('custom-class');
  });

  it('shows tooltip with full timestamp on time element', () => {
    render(<PostMetadata {...baseProps} />);

    const timeElement = screen.getByText('2h');
    expect(timeElement).toHaveAttribute('title', expect.stringContaining('2024'));
  });

  it('handles awards with single count correctly', () => {
    const singleAward: PostAward[] = [
      {
        id: '1',
        name: 'Gold',
        icon: '🥇',
        count: 1,
        description: 'Gold award'
      }
    ];

    render(<PostMetadata {...baseProps} awards={singleAward} />);

    expect(screen.getByText('🥇')).toBeInTheDocument();
    // Should not show count for single awards
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });
});