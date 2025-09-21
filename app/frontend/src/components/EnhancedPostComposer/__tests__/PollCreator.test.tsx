import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PollCreator } from '../PollCreator';
import { PollData } from '@/types/enhancedPost';

describe('PollCreator', () => {
  const mockOnPollChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default empty state', () => {
    render(<PollCreator onPollChange={mockOnPollChange} />);

    expect(screen.getByPlaceholderText('Ask a question...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Option 1')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('+ Add option')).toBeInTheDocument();
  });

  it('renders with existing poll data', () => {
    const existingPoll: PollData = {
      question: 'Existing question?',
      options: [
        { id: '1', text: 'Option A', votes: 0, tokenVotes: 0 },
        { id: '2', text: 'Option B', votes: 0, tokenVotes: 0 },
        { id: '3', text: 'Option C', votes: 0, tokenVotes: 0 },
      ],
      allowMultiple: true,
      tokenWeighted: true,
      minTokens: 5,
      endDate: new Date('2024-12-31T23:59'),
    };

    render(<PollCreator poll={existingPoll} onPollChange={mockOnPollChange} />);

    expect(screen.getByDisplayValue('Existing question?')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Option A')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Option B')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Option C')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Allow multiple selections/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Token-weighted voting/ })).toBeChecked();
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
  });

  it('calls onPollChange when question is updated', async () => {
    const user = userEvent.setup();
    render(<PollCreator onPollChange={mockOnPollChange} />);

    const questionInput = screen.getByPlaceholderText('Ask a question...');
    await user.type(questionInput, 'New question?');

    expect(mockOnPollChange).toHaveBeenCalledWith(
      expect.objectContaining({
        question: 'New question?',
        options: expect.any(Array),
        allowMultiple: false,
        tokenWeighted: false,
      })
    );
  });

  it('calls onPollChange when option is updated', async () => {
    const user = userEvent.setup();
    render(<PollCreator onPollChange={mockOnPollChange} />);

    const option1Input = screen.getByPlaceholderText('Option 1');
    await user.type(option1Input, 'First option');

    expect(mockOnPollChange).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.arrayContaining([
          expect.objectContaining({ text: 'First option' }),
        ]),
      })
    );
  });

  it('adds new option when add button is clicked', async () => {
    const user = userEvent.setup();
    render(<PollCreator onPollChange={mockOnPollChange} />);

    const addButton = screen.getByText('+ Add option');
    await user.click(addButton);

    expect(screen.getByPlaceholderText('Option 3')).toBeInTheDocument();
    expect(mockOnPollChange).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.arrayContaining([
          expect.objectContaining({ text: '' }),
          expect.objectContaining({ text: '' }),
          expect.objectContaining({ text: '' }),
        ]),
      })
    );
  });

  it('removes option when remove button is clicked', async () => {
    const user = userEvent.setup();
    render(<PollCreator onPollChange={mockOnPollChange} />);

    // Add a third option first
    const addButton = screen.getByText('+ Add option');
    await user.click(addButton);

    // Now remove buttons should be visible
    const removeButtons = screen.getAllByText('×');
    expect(removeButtons).toHaveLength(3); // All options should have remove buttons now

    await user.click(removeButtons[0]);

    expect(screen.queryByPlaceholderText('Option 3')).not.toBeInTheDocument();
    expect(mockOnPollChange).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.arrayContaining([
          expect.objectContaining({ text: '' }),
          expect.objectContaining({ text: '' }),
        ]),
      })
    );
  });

  it('does not show remove buttons when only 2 options exist', () => {
    render(<PollCreator onPollChange={mockOnPollChange} />);

    expect(screen.queryByText('×')).not.toBeInTheDocument();
  });

  it('limits maximum options to 10', async () => {
    const user = userEvent.setup();
    render(<PollCreator onPollChange={mockOnPollChange} />);

    // Add options until we reach the limit
    const addButton = screen.getByText('+ Add option');
    
    // Add 8 more options (we start with 2)
    for (let i = 0; i < 8; i++) {
      await user.click(addButton);
    }

    // Should have 10 options now
    expect(screen.getByPlaceholderText('Option 10')).toBeInTheDocument();
    
    // Add button should be gone
    expect(screen.queryByText('+ Add option')).not.toBeInTheDocument();
  });

  it('toggles allow multiple selections', async () => {
    const user = userEvent.setup();
    render(<PollCreator onPollChange={mockOnPollChange} />);

    const checkbox = screen.getByRole('checkbox', { name: /Allow multiple selections/ });
    await user.click(checkbox);

    expect(checkbox).toBeChecked();
    expect(mockOnPollChange).toHaveBeenCalledWith(
      expect.objectContaining({
        allowMultiple: true,
      })
    );
  });

  it('toggles token-weighted voting', async () => {
    const user = userEvent.setup();
    render(<PollCreator onPollChange={mockOnPollChange} />);

    const checkbox = screen.getByRole('checkbox', { name: /Token-weighted voting/ });
    await user.click(checkbox);

    expect(checkbox).toBeChecked();
    expect(mockOnPollChange).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenWeighted: true,
      })
    );
  });

  it('shows minimum tokens input when token-weighted is enabled', async () => {
    const user = userEvent.setup();
    render(<PollCreator onPollChange={mockOnPollChange} />);

    const checkbox = screen.getByRole('checkbox', { name: /Token-weighted voting/ });
    await user.click(checkbox);

    expect(screen.getByText('Minimum Tokens Required')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0')).toBeInTheDocument();
  });

  it('updates minimum tokens value', async () => {
    const user = userEvent.setup();
    render(<PollCreator onPollChange={mockOnPollChange} />);

    // Enable token-weighted voting first
    const checkbox = screen.getByRole('checkbox', { name: /Token-weighted voting/ });
    await user.click(checkbox);

    const minTokensInput = screen.getByDisplayValue('0');
    await user.clear(minTokensInput);
    await user.type(minTokensInput, '10');

    expect(mockOnPollChange).toHaveBeenCalledWith(
      expect.objectContaining({
        minTokens: 10,
      })
    );
  });

  it('sets expiration date', async () => {
    const user = userEvent.setup();
    render(<PollCreator onPollChange={mockOnPollChange} />);

    const expirationInput = screen.getByLabelText(/Expiration Date/);
    await user.type(expirationInput, '2024-12-31T23:59');

    expect(mockOnPollChange).toHaveBeenCalledWith(
      expect.objectContaining({
        endDate: new Date('2024-12-31T23:59'),
      })
    );
  });

  it('disables all inputs when disabled prop is true', () => {
    render(<PollCreator onPollChange={mockOnPollChange} disabled={true} />);

    expect(screen.getByPlaceholderText('Ask a question...')).toBeDisabled();
    expect(screen.getByPlaceholderText('Option 1')).toBeDisabled();
    expect(screen.getByPlaceholderText('Option 2')).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /Allow multiple selections/ })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /Token-weighted voting/ })).toBeDisabled();
  });

  it('prevents negative minimum tokens', async () => {
    const user = userEvent.setup();
    render(<PollCreator onPollChange={mockOnPollChange} />);

    // Enable token-weighted voting first
    const checkbox = screen.getByRole('checkbox', { name: /Token-weighted voting/ });
    await user.click(checkbox);

    const minTokensInput = screen.getByDisplayValue('0');
    await user.clear(minTokensInput);
    await user.type(minTokensInput, '-5');

    // Should be adjusted to 0
    expect(screen.getByDisplayValue('0')).toBeInTheDocument();
  });

  it('shows helper text for expiration date', () => {
    render(<PollCreator onPollChange={mockOnPollChange} />);

    expect(screen.getByText('Leave empty for polls that never expire')).toBeInTheDocument();
  });

  it('sets minimum date for expiration to current time', () => {
    render(<PollCreator onPollChange={mockOnPollChange} />);

    const expirationInput = screen.getByLabelText(/Expiration Date/) as HTMLInputElement;
    const minDate = expirationInput.min;
    
    // Should be close to current time (within a few minutes)
    const now = new Date().toISOString().slice(0, 16);
    expect(minDate).toBe(now);
  });

  it('applies custom className', () => {
    const { container } = render(
      <PollCreator onPollChange={mockOnPollChange} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});