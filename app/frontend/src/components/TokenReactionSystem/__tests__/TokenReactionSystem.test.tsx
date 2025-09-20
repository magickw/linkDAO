import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TokenReactionSystem } from '../TokenReactionSystem';
import { EngagementProvider } from '@/contexts/EngagementContext';
import { ReputationProvider } from '@/contexts/ReputationContext';

// Mock the token reaction service
jest.mock('@/services/tokenReactionService', () => ({
  tokenReactionService: {
    reactToPost: jest.fn(),
    getReactions: jest.fn(),
    getReactors: jest.fn(),
    calculateReactionCost: jest.fn(),
  },
}));

// Mock wallet connection
jest.mock('@/hooks/useWallet', () => ({
  useWallet: () => ({
    address: '0x1234567890abcdef',
    isConnected: true,
    balance: '100',
    connect: jest.fn(),
  }),
}));

const mockOnReact = jest.fn();
const mockOnViewReactors = jest.fn();

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EngagementProvider>
    <ReputationProvider>
      {children}
    </ReputationProvider>
  </EngagementProvider>
);

const mockReactions = [
  {
    type: '🔥',
    users: [
      { address: '0xuser1', amount: 5, username: 'user1' },
      { address: '0xuser2', amount: 3, username: 'user2' },
    ],
    totalAmount: 8,
    tokenType: 'LDAO',
  },
  {
    type: '🚀',
    users: [
      { address: '0xuser3', amount: 10, username: 'user3' },
    ],
    totalAmount: 10,
    tokenType: 'LDAO',
  },
];

describe('TokenReactionSystem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    postId: 'test-post-1',
    reactions: mockReactions,
    userWallet: '0x1234567890abcdef',
    onReact: mockOnReact,
    onViewReactors: mockOnViewReactors,
  };

  it('renders all reaction types', () => {
    render(
      <TestWrapper>
        <TokenReactionSystem {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('🔥')).toBeInTheDocument();
    expect(screen.getByText('🚀')).toBeInTheDocument();
    expect(screen.getByText('💎')).toBeInTheDocument();
  });

  it('displays reaction counts correctly', () => {
    render(
      <TestWrapper>
        <TokenReactionSystem {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('8')).toBeInTheDocument(); // Fire reaction total
    expect(screen.getByText('10')).toBeInTheDocument(); // Rocket reaction total
  });

  it('handles reaction clicks', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <TokenReactionSystem {...defaultProps} />
      </TestWrapper>
    );

    const fireButton = screen.getByRole('button', { name: /fire|🔥/i });
    await user.click(fireButton);

    await waitFor(() => {
      expect(mockOnReact).toHaveBeenCalledWith('🔥', expect.any(Number));
    });
  });

  it('shows reaction stake modal for expensive reactions', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <TokenReactionSystem {...defaultProps} />
      </TestWrapper>
    );

    const diamondButton = screen.getByRole('button', { name: /diamond|💎/i });
    await user.click(diamondButton);

    // Should show stake modal for expensive reactions
    expect(screen.getByText(/stake|amount/i)).toBeInTheDocument();
  });

  it('displays reactor modal when clicking on reaction count', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <TokenReactionSystem {...defaultProps} />
      </TestWrapper>
    );

    const reactionCount = screen.getByText('8');
    await user.click(reactionCount);

    await waitFor(() => {
      expect(mockOnViewReactors).toHaveBeenCalledWith('🔥');
    });
  });

  it('shows celebration animation for milestone reactions', async () => {
    const user = userEvent.setup();
    
    // Mock a reaction that triggers milestone
    const mockOnReactWithMilestone = jest.fn().mockResolvedValue({
      success: true,
      milestone: true,
      newTotal: 100,
    });
    
    render(
      <TestWrapper>
        <TokenReactionSystem 
          {...defaultProps} 
          onReact={mockOnReactWithMilestone}
        />
      </TestWrapper>
    );

    const fireButton = screen.getByRole('button', { name: /fire|🔥/i });
    await user.click(fireButton);

    await waitFor(() => {
      expect(screen.getByTestId('celebration-animation')).toBeInTheDocument();
    });
  });

  it('handles insufficient balance gracefully', async () => {
    const user = userEvent.setup();
    
    // Mock wallet with insufficient balance
    const mockOnReactWithError = jest.fn().mockRejectedValue(
      new Error('Insufficient balance')
    );
    
    render(
      <TestWrapper>
        <TokenReactionSystem 
          {...defaultProps} 
          onReact={mockOnReactWithError}
        />
      </TestWrapper>
    );

    const diamondButton = screen.getByRole('button', { name: /diamond|💎/i });
    await user.click(diamondButton);

    await waitFor(() => {
      expect(screen.getByText(/insufficient balance/i)).toBeInTheDocument();
    });
  });

  it('shows loading state during reaction', async () => {
    const user = userEvent.setup();
    
    // Mock delayed reaction
    const mockOnReactDelayed = jest.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );
    
    render(
      <TestWrapper>
        <TokenReactionSystem 
          {...defaultProps} 
          onReact={mockOnReactDelayed}
        />
      </TestWrapper>
    );

    const fireButton = screen.getByRole('button', { name: /fire|🔥/i });
    await user.click(fireButton);

    expect(screen.getByTestId('reaction-loading')).toBeInTheDocument();
  });

  it('prevents double reactions', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <TokenReactionSystem {...defaultProps} />
      </TestWrapper>
    );

    const fireButton = screen.getByRole('button', { name: /fire|🔥/i });
    
    // Click multiple times rapidly
    await user.click(fireButton);
    await user.click(fireButton);
    await user.click(fireButton);

    // Should only call onReact once
    await waitFor(() => {
      expect(mockOnReact).toHaveBeenCalledTimes(1);
    });
  });

  it('displays user reactions correctly', () => {
    const reactionsWithUserReaction = [
      {
        ...mockReactions[0],
        users: [
          ...mockReactions[0].users,
          { address: '0x1234567890abcdef', amount: 2, username: 'currentUser' },
        ],
      },
    ];
    
    render(
      <TestWrapper>
        <TokenReactionSystem 
          {...defaultProps} 
          reactions={reactionsWithUserReaction}
        />
      </TestWrapper>
    );

    // User's reaction should be highlighted
    const fireButton = screen.getByRole('button', { name: /fire|🔥/i });
    expect(fireButton).toHaveClass('user-reacted');
  });

  it('handles network errors gracefully', async () => {
    const user = userEvent.setup();
    
    const mockOnReactWithNetworkError = jest.fn().mockRejectedValue(
      new Error('Network error')
    );
    
    render(
      <TestWrapper>
        <TokenReactionSystem 
          {...defaultProps} 
          onReact={mockOnReactWithNetworkError}
        />
      </TestWrapper>
    );

    const fireButton = screen.getByRole('button', { name: /fire|🔥/i });
    await user.click(fireButton);

    await waitFor(() => {
      expect(screen.getByText(/network error|try again/i)).toBeInTheDocument();
    });
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <TokenReactionSystem {...defaultProps} />
      </TestWrapper>
    );

    // Tab through reaction buttons
    await user.tab();
    expect(screen.getByRole('button', { name: /fire|🔥/i })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: /rocket|🚀/i })).toHaveFocus();

    // Press Enter to react
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockOnReact).toHaveBeenCalledWith('🚀', expect.any(Number));
    });
  });

  it('maintains accessibility standards', () => {
    render(
      <TestWrapper>
        <TokenReactionSystem {...defaultProps} />
      </TestWrapper>
    );

    // Check for proper ARIA labels
    const fireButton = screen.getByRole('button', { name: /fire|🔥/i });
    expect(fireButton).toHaveAttribute('aria-label');
    expect(fireButton).toHaveAttribute('aria-describedby');

    // Check for proper role attributes
    expect(screen.getByRole('group')).toBeInTheDocument();
  });

  it('handles real-time reaction updates', async () => {
    const { rerender } = render(
      <TestWrapper>
        <TokenReactionSystem {...defaultProps} />
      </TestWrapper>
    );

    // Simulate real-time update
    const updatedReactions = [
      {
        ...mockReactions[0],
        totalAmount: 15,
        users: [...mockReactions[0].users, { address: '0xnewuser', amount: 7, username: 'newuser' }],
      },
    ];

    rerender(
      <TestWrapper>
        <TokenReactionSystem 
          {...defaultProps} 
          reactions={updatedReactions}
        />
      </TestWrapper>
    );

    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('shows reaction tooltips on hover', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <TokenReactionSystem {...defaultProps} />
      </TestWrapper>
    );

    const fireButton = screen.getByRole('button', { name: /fire|🔥/i });
    await user.hover(fireButton);

    await waitFor(() => {
      expect(screen.getByText(/costs.*token/i)).toBeInTheDocument();
    });
  });
});