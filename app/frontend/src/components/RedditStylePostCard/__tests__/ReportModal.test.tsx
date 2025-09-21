import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReportModal from '../ReportModal';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  X: () => <div data-testid="x">✕</div>,
  Flag: () => <div data-testid="flag">🚩</div>,
  AlertTriangle: () => <div data-testid="alert-triangle">⚠</div>,
}));

describe('ReportModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSubmit: mockOnSubmit,
    isLoading: false,
    postId: 'test-post-1',
    postAuthor: '0x1234567890123456789012345678901234567890'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', () => {
    render(<ReportModal {...defaultProps} />);
    
    expect(screen.getByText('Report Post')).toBeInTheDocument();
    expect(screen.getByText(/Why are you reporting this post by/)).toBeInTheDocument();
    expect(screen.getByText('0x123456...567890')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ReportModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Report Post')).not.toBeInTheDocument();
  });

  it('displays all report categories', () => {
    render(<ReportModal {...defaultProps} />);
    
    // Check for all report categories
    expect(screen.getByText('Spam')).toBeInTheDocument();
    expect(screen.getByText('Harassment or Bullying')).toBeInTheDocument();
    expect(screen.getByText('Hate Speech')).toBeInTheDocument();
    expect(screen.getByText('Misinformation')).toBeInTheDocument();
    expect(screen.getByText('Violence or Threats')).toBeInTheDocument();
    expect(screen.getByText('NSFW Content')).toBeInTheDocument();
    expect(screen.getByText('Copyright Violation')).toBeInTheDocument();
    expect(screen.getByText('Scam or Fraud')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('allows selecting a report reason', async () => {
    const user = userEvent.setup();
    render(<ReportModal {...defaultProps} />);
    
    const spamOption = screen.getByLabelText(/Spam/);
    await user.click(spamOption);
    
    expect(spamOption).toBeChecked();
  });

  it('enables next button when reason is selected', async () => {
    const user = userEvent.setup();
    render(<ReportModal {...defaultProps} />);
    
    const nextButton = screen.getByText('Next');
    expect(nextButton).toBeDisabled();
    
    const spamOption = screen.getByLabelText(/Spam/);
    await user.click(spamOption);
    
    expect(nextButton).toBeEnabled();
  });

  it('progresses through all steps', async () => {
    const user = userEvent.setup();
    render(<ReportModal {...defaultProps} />);
    
    // Step 1: Select reason
    const spamOption = screen.getByLabelText(/Spam/);
    await user.click(spamOption);
    
    const nextButton = screen.getByText('Next');
    await user.click(nextButton);
    
    // Step 2: Additional details
    expect(screen.getByText('Additional Details (Optional)')).toBeInTheDocument();
    expect(screen.getByText('Spam')).toBeInTheDocument(); // Category name should be shown
    
    const reviewButton = screen.getByText('Review');
    await user.click(reviewButton);
    
    // Step 3: Confirmation
    expect(screen.getByText('Review Your Report')).toBeInTheDocument();
    expect(screen.getByText('You are reporting this post for:')).toBeInTheDocument();
    expect(screen.getByText('Spam')).toBeInTheDocument();
    expect(screen.getByText('Submit Report')).toBeInTheDocument();
  });

  it('allows going back through steps', async () => {
    const user = userEvent.setup();
    render(<ReportModal {...defaultProps} />);
    
    // Go to step 2
    const spamOption = screen.getByLabelText(/Spam/);
    await user.click(spamOption);
    await user.click(screen.getByText('Next'));
    
    // Go back to step 1
    const backButton = screen.getByText('Back');
    await user.click(backButton);
    
    expect(screen.getByText(/Why are you reporting this post by/)).toBeInTheDocument();
    expect(spamOption).toBeChecked(); // Selection should be preserved
  });

  it('handles additional details input', async () => {
    const user = userEvent.setup();
    render(<ReportModal {...defaultProps} />);
    
    // Go to details step
    const spamOption = screen.getByLabelText(/Spam/);
    await user.click(spamOption);
    await user.click(screen.getByText('Next'));
    
    // Add details
    const detailsTextarea = screen.getByPlaceholderText(/Provide specific examples/);
    await user.type(detailsTextarea, 'This is spam content');
    
    expect(detailsTextarea).toHaveValue('This is spam content');
    
    // Check character count (text might be split across elements)
    expect(screen.getByText(/\/500 characters/)).toBeInTheDocument();
  });

  it('shows details in confirmation step', async () => {
    const user = userEvent.setup();
    render(<ReportModal {...defaultProps} />);
    
    // Go through all steps with details
    const spamOption = screen.getByLabelText(/Spam/);
    await user.click(spamOption);
    await user.click(screen.getByText('Next'));
    
    const detailsTextarea = screen.getByPlaceholderText(/Provide specific examples/);
    await user.type(detailsTextarea, 'This is spam content');
    await user.click(screen.getByText('Review'));
    
    // Check confirmation shows details (text might be split across elements)
    expect(screen.getByText('Details:')).toBeInTheDocument();
    expect(screen.getByText('This is spam content')).toBeInTheDocument();
  });

  it('submits report with correct data', async () => {
    const user = userEvent.setup();
    render(<ReportModal {...defaultProps} />);
    
    // Complete the flow
    const spamOption = screen.getByLabelText(/Spam/);
    await user.click(spamOption);
    await user.click(screen.getByText('Next'));
    
    const detailsTextarea = screen.getByPlaceholderText(/Provide specific examples/);
    await user.type(detailsTextarea, 'Test details');
    await user.click(screen.getByText('Review'));
    
    const submitButton = screen.getByText('Submit Report');
    await user.click(submitButton);
    
    expect(mockOnSubmit).toHaveBeenCalledWith('spam', 'Test details');
  });

  it('submits report without details', async () => {
    const user = userEvent.setup();
    render(<ReportModal {...defaultProps} />);
    
    // Complete the flow without details
    const spamOption = screen.getByLabelText(/Spam/);
    await user.click(spamOption);
    await user.click(screen.getByText('Next'));
    await user.click(screen.getByText('Review'));
    
    const submitButton = screen.getByText('Submit Report');
    await user.click(submitButton);
    
    expect(mockOnSubmit).toHaveBeenCalledWith('spam', undefined);
  });

  it('shows loading state', () => {
    render(<ReportModal {...defaultProps} isLoading={true} />);
    
    // All buttons should be disabled
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('shows loading state on submit button', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ReportModal {...defaultProps} />);
    
    // Go to final step
    const spamOption = screen.getByLabelText(/Spam/);
    await user.click(spamOption);
    await user.click(screen.getByText('Next'));
    await user.click(screen.getByText('Review'));
    
    // Re-render with loading state
    rerender(<ReportModal {...defaultProps} isLoading={true} />);
    
    expect(screen.getByText('Submitting...')).toBeInTheDocument();
  });

  it('closes modal when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<ReportModal {...defaultProps} />);
    
    const closeButton = screen.getByTestId('x').closest('button');
    if (closeButton) {
      await user.click(closeButton);
    }
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes modal when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<ReportModal {...defaultProps} />);
    
    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('resets form state when closed and reopened', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ReportModal {...defaultProps} />);
    
    // Select an option
    const spamOption = screen.getByLabelText(/Spam/);
    await user.click(spamOption);
    expect(spamOption).toBeChecked();
    
    // Close modal
    rerender(<ReportModal {...defaultProps} isOpen={false} />);
    
    // Reopen modal
    rerender(<ReportModal {...defaultProps} isOpen={true} />);
    
    // Wait for the effect to run and form to reset
    await waitFor(() => {
      const spamOptionAfterReopen = screen.getByLabelText(/Spam/);
      expect(spamOptionAfterReopen).not.toBeChecked();
    });
    
    expect(screen.getByText(/Why are you reporting this post by/)).toBeInTheDocument();
  });

  it('enforces character limit on details', async () => {
    const user = userEvent.setup();
    render(<ReportModal {...defaultProps} />);
    
    // Go to details step
    const spamOption = screen.getByLabelText(/Spam/);
    await user.click(spamOption);
    await user.click(screen.getByText('Next'));
    
    const detailsTextarea = screen.getByPlaceholderText(/Provide specific examples/);
    
    // Try to type more than 500 characters
    const longText = 'a'.repeat(600);
    await user.type(detailsTextarea, longText);
    
    // Should be limited to 500 characters
    expect(detailsTextarea).toHaveValue('a'.repeat(500));
    expect(screen.getByText('500/500 characters')).toBeInTheDocument();
  });

  it('handles different report categories correctly', async () => {
    const user = userEvent.setup();
    render(<ReportModal {...defaultProps} />);
    
    // Test harassment category
    const harassmentOption = screen.getByLabelText(/Harassment or Bullying/);
    await user.click(harassmentOption);
    await user.click(screen.getByText('Next'));
    
    expect(screen.getByText('Harassment or Bullying')).toBeInTheDocument();
    expect(screen.getByText('⚠️')).toBeInTheDocument(); // Icon should be displayed
  });

  it('prevents submission without selecting a reason', async () => {
    const user = userEvent.setup();
    render(<ReportModal {...defaultProps} />);
    
    // The Next button should be disabled when no reason is selected
    const nextButton = screen.getByText('Next');
    expect(nextButton).toBeDisabled();
    
    // Try to click it anyway
    await user.click(nextButton);
    
    // Should still be on the first step
    expect(screen.getByText(/Why are you reporting this post by/)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('handles submission errors gracefully', async () => {
    const user = userEvent.setup();
    const failingOnSubmit = jest.fn().mockRejectedValue(new Error('Submission failed'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    render(<ReportModal {...defaultProps} onSubmit={failingOnSubmit} />);
    
    // Complete the flow
    const spamOption = screen.getByLabelText(/Spam/);
    await user.click(spamOption);
    await user.click(screen.getByText('Next'));
    await user.click(screen.getByText('Review'));
    
    const submitButton = screen.getByText('Submit Report');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Report submission failed:', expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });
});