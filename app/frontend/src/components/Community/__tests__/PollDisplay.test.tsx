import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PollDisplay } from '../PollDisplay';
import { PollResult } from '@/types/poll';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock the date-fns library
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => 'in 2 days'),
}));

describe('PollDisplay', () => {
  const mockPoll: PollResult = {
    id: 'poll-1',
    postId: 1,
    question: 'What is your favorite color?',
    allowMultiple: false,
    tokenWeighted: false,
    minTokens: 0,
    expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    isExpired: false,
    createdAt: new Date(),
    options: [
      {
        id: 'option-1',
        text: 'Red',
        orderIndex: 0,
        votes: 5,
        tokenVotes: 5,
        percentage: 50,
        tokenPercentage: 50,
      },
      {
        id: 'option-2',
        text: 'Blue',
        orderIndex: 1,
        votes: 3,
        tokenVotes: 3,
        percentage: 30,
        tokenPercentage: 30,
      },
      {
        id: 'option-3',
        text: 'Green',
        orderIndex: 2,
        votes: 2,
        tokenVotes: 2,
        percentage: 20,
        tokenPercentage: 20,
      },
    ],
    totalVotes: 10,
    totalTokenVotes: 10,
  };

  const mockOnVote = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders poll question and options', () => {
    render(<PollDisplay poll={mockPoll} onVote={mockOnVote} />);

    expect(screen.getByText('📊 What is your favorite color?')).toBeInTheDocument();
    expect(screen.getByText('Red')).toBeInTheDocument();
    expect(screen.getByText('Blue')).toBeInTheDocument();
    expect(screen.getByText('Green')).toBeInTheDocument();
  });

  it('displays poll metadata correctly', () => {
    render(<PollDisplay poll={mockPoll} onVote={mockOnVote} />);

    expect(screen.getByText('10 votes')).toBeInTheDocument();
    expect(screen.getByText('Expires in 2 days')).toBeInTheDocument();
  });

  it('shows multiple choice indicator for multiple choice polls', () => {
    const multipleChoicePoll = { ...mockPoll, allowMultiple: true };
    render(<PollDisplay poll={multipleChoicePoll} onVote={mockOnVote} />);

    expect(screen.getByText('Multiple choice')).toBeInTheDocument();
  });

  it('shows token amount input for token-weighted polls', () => {
    const tokenPoll = { ...mockPoll, tokenWeighted: true, minTokens: 5 };
    render(<PollDisplay poll={tokenPoll} onVote={mockOnVote} />);

    expect(screen.getByText('Token Amount (min: 5)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
  });

  it('allows selecting options in voting mode', async () => {
    const user = userEvent.setup();
    render(<PollDisplay poll={mockPoll} onVote={mockOnVote} />);

    const redOption = screen.getByRole('button', { name: /Red/ });
    await user.click(redOption);

    expect(redOption).toHaveClass('border-blue-500');
  });

  it('allows multiple selections for multiple choice polls', async () => {
    const user = userEvent.setup();
    const multipleChoicePoll = { ...mockPoll, allowMultiple: true };
    render(<PollDisplay poll={multipleChoicePoll} onVote={mockOnVote} />);

    const redOption = screen.getByRole('button', { name: /Red/ });
    const blueOption = screen.getByRole('button', { name: /Blue/ });

    await user.click(redOption);
    await user.click(blueOption);

    expect(redOption).toHaveClass('border-blue-500');
    expect(blueOption).toHaveClass('border-blue-500');
  });

  it('calls onVote when vote button is clicked', async () => {
    const user = userEvent.setup();
    render(<PollDisplay poll={mockPoll} onVote={mockOnVote} />);

    const redOption = screen.getByRole('button', { name: /Red/ });
    await user.click(redOption);

    const voteButton = screen.getByRole('button', { name: 'Vote' });
    await user.click(voteButton);

    expect(mockOnVote).toHaveBeenCalledWith(['option-1'], undefined);
  });

  it('calls onVote with token amount for token-weighted polls', async () => {
    const user = userEvent.setup();
    const tokenPoll = { ...mockPoll, tokenWeighted: true, minTokens: 1 };
    render(<PollDisplay poll={tokenPoll} onVote={mockOnVote} />);

    const redOption = screen.getByRole('button', { name: /Red/ });
    await user.click(redOption);

    const tokenInput = screen.getByDisplayValue('1');
    await user.clear(tokenInput);
    await user.type(tokenInput, '10');

    const voteButton = screen.getByRole('button', { name: 'Vote' });
    await user.click(voteButton);

    expect(mockOnVote).toHaveBeenCalledWith(['option-1'], 10);
  });

  it('shows results view when showResults is true', () => {
    render(<PollDisplay poll={mockPoll} onVote={mockOnVote} showResults={true} />);

    expect(screen.getByText('50.0%')).toBeInTheDocument();
    expect(screen.getByText('5 votes')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Vote' })).not.toBeInTheDocument();
  });

  it('shows results view for expired polls', () => {
    const expiredPoll = { ...mockPoll, isExpired: true };
    render(<PollDisplay poll={expiredPoll} onVote={mockOnVote} />);

    expect(screen.getByText('50.0%')).toBeInTheDocument();
    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('shows user vote indicator when user has voted', () => {
    const pollWithUserVote = {
      ...mockPoll,
      userVote: {
        optionIds: ['option-1'],
        tokenAmount: 1,
        votedAt: new Date(),
      },
    };
    render(<PollDisplay poll={pollWithUserVote} onVote={mockOnVote} />);

    expect(screen.getByText(/You voted/)).toBeInTheDocument();
  });

  it('highlights user voted options in results view', () => {
    const pollWithUserVote = {
      ...mockPoll,
      userVote: {
        optionIds: ['option-1'],
        tokenAmount: 1,
        votedAt: new Date(),
      },
    };
    render(<PollDisplay poll={pollWithUserVote} onVote={mockOnVote} showResults={true} />);

    const redOptionContainer = screen.getByText('Red').closest('div')?.parentElement;
    expect(redOptionContainer).toHaveClass('border-blue-500');
  });

  it('disables voting when disabled prop is true', () => {
    render(<PollDisplay poll={mockPoll} onVote={mockOnVote} disabled={true} />);

    const redOption = screen.getByRole('button', { name: /Red/ });
    expect(redOption).toBeDisabled();
  });

  it('shows loading state during voting', async () => {
    const user = userEvent.setup();
    const slowOnVote = jest.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));
    render(<PollDisplay poll={mockPoll} onVote={slowOnVote} />);

    const redOption = screen.getByRole('button', { name: /Red/ });
    await user.click(redOption);

    const voteButton = screen.getByRole('button', { name: 'Vote' });
    await user.click(voteButton);

    expect(screen.getByText('Voting...')).toBeInTheDocument();
  });

  it('allows toggling between voting and results view', async () => {
    const user = userEvent.setup();
    render(<PollDisplay poll={mockPoll} onVote={mockOnVote} />);

    // Initially in voting mode
    expect(screen.getByRole('button', { name: /Red/ })).toBeInTheDocument();

    // Switch to results view
    const viewResultsButton = screen.getByText('View results');
    await user.click(viewResultsButton);

    expect(screen.getByText('50.0%')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Red/ })).not.toBeInTheDocument();

    // Switch back to voting view
    const hideResultsButton = screen.getByText('Hide results');
    await user.click(hideResultsButton);

    expect(screen.getByRole('button', { name: /Red/ })).toBeInTheDocument();
  });

  it('prevents voting on expired polls', () => {
    const expiredPoll = { ...mockPoll, isExpired: true };
    render(<PollDisplay poll={expiredPoll} onVote={mockOnVote} />);

    const options = screen.getAllByRole('button');
    options.forEach(option => {
      expect(option).toBeDisabled();
    });
  });

  it('shows token votes for token-weighted polls in results', () => {
    const tokenPoll = { ...mockPoll, tokenWeighted: true };
    render(<PollDisplay poll={tokenPoll} onVote={mockOnVote} showResults={true} />);

    expect(screen.getByText('5 tokens')).toBeInTheDocument();
    expect(screen.getByText('10 tokens')).toBeInTheDocument(); // Total
  });

  it('enforces minimum token amount for token-weighted polls', async () => {
    const user = userEvent.setup();
    const tokenPoll = { ...mockPoll, tokenWeighted: true, minTokens: 10 };
    render(<PollDisplay poll={tokenPoll} onVote={mockOnVote} />);

    const tokenInput = screen.getByDisplayValue('10');
    await user.clear(tokenInput);
    await user.type(tokenInput, '5');

    // Should automatically adjust to minimum
    expect(screen.getByDisplayValue('10')).toBeInTheDocument();
  });
});