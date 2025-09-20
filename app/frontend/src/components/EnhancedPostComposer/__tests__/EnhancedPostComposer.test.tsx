import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnhancedPostComposer } from '../EnhancedPostComposer';
import { ContentCreationProvider } from '@/contexts/ContentCreationContext';
import { EngagementProvider } from '@/contexts/EngagementContext';

// Mock the sub-components
jest.mock('../ContentTypeTabs', () => ({
  ContentTypeTabs: ({ onTypeChange, activeType }: any) => (
    <div data-testid="content-type-tabs">
      <button onClick={() => onTypeChange('text')} data-testid="text-tab">Text</button>
      <button onClick={() => onTypeChange('media')} data-testid="media-tab">Media</button>
      <button onClick={() => onTypeChange('poll')} data-testid="poll-tab">Poll</button>
      <span data-testid="active-type">{activeType}</span>
    </div>
  ),
}));

jest.mock('../MediaUploadZone', () => ({
  MediaUploadZone: ({ onFilesSelected }: any) => (
    <div data-testid="media-upload-zone">
      <input
        type="file"
        data-testid="file-input"
        onChange={(e) => onFilesSelected(Array.from(e.target.files || []))}
        multiple
      />
    </div>
  ),
}));

jest.mock('../HashtagMentionInput', () => ({
  HashtagMentionInput: ({ value, onChange, placeholder }: any) => (
    <textarea
      data-testid="hashtag-mention-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

jest.mock('../PollCreator', () => ({
  PollCreator: ({ onPollChange }: any) => (
    <div data-testid="poll-creator">
      <button onClick={() => onPollChange({ question: 'Test poll?', options: ['Yes', 'No'] })}>
        Create Poll
      </button>
    </div>
  ),
}));

jest.mock('../ProposalCreator', () => ({
  ProposalCreator: ({ onProposalChange }: any) => (
    <div data-testid="proposal-creator">
      <button onClick={() => onProposalChange({ title: 'Test Proposal', description: 'Test description' })}>
        Create Proposal
      </button>
    </div>
  ),
}));

const mockOnSubmit = jest.fn();
const mockOnDraftSave = jest.fn();

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ContentCreationProvider>
    <EngagementProvider>
      {children}
    </EngagementProvider>
  </ContentCreationProvider>
);

describe('EnhancedPostComposer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    context: 'feed' as const,
    onSubmit: mockOnSubmit,
    onDraftSave: mockOnDraftSave,
  };

  it('renders with default text content type', () => {
    render(
      <TestWrapper>
        <EnhancedPostComposer {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByTestId('content-type-tabs')).toBeInTheDocument();
    expect(screen.getByTestId('hashtag-mention-input')).toBeInTheDocument();
    expect(screen.getByTestId('active-type')).toHaveTextContent('text');
  });

  it('switches content types correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <EnhancedPostComposer {...defaultProps} />
      </TestWrapper>
    );

    await user.click(screen.getByTestId('media-tab'));
    expect(screen.getByTestId('active-type')).toHaveTextContent('media');
    expect(screen.getByTestId('media-upload-zone')).toBeInTheDocument();

    await user.click(screen.getByTestId('poll-tab'));
    expect(screen.getByTestId('active-type')).toHaveTextContent('poll');
    expect(screen.getByTestId('poll-creator')).toBeInTheDocument();
  });

  it('handles text input changes', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <EnhancedPostComposer {...defaultProps} />
      </TestWrapper>
    );

    const textInput = screen.getByTestId('hashtag-mention-input');
    await user.type(textInput, 'Hello world! #test @user');

    expect(textInput).toHaveValue('Hello world! #test @user');
  });

  it('handles file uploads in media mode', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <EnhancedPostComposer {...defaultProps} />
      </TestWrapper>
    );

    await user.click(screen.getByTestId('media-tab'));
    
    const fileInput = screen.getByTestId('file-input');
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    await user.upload(fileInput, file);
    
    expect(fileInput).toHaveProperty('files', expect.arrayContaining([file]));
  });

  it('creates polls correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <EnhancedPostComposer {...defaultProps} />
      </TestWrapper>
    );

    await user.click(screen.getByTestId('poll-tab'));
    await user.click(screen.getByText('Create Poll'));

    // Poll creation should be handled by the component
    expect(screen.getByTestId('poll-creator')).toBeInTheDocument();
  });

  it('creates proposals correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <EnhancedPostComposer {...defaultProps} initialContentType="proposal" />
      </TestWrapper>
    );

    await user.click(screen.getByText('Create Proposal'));
    expect(screen.getByTestId('proposal-creator')).toBeInTheDocument();
  });

  it('handles form submission', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <EnhancedPostComposer {...defaultProps} />
      </TestWrapper>
    );

    const textInput = screen.getByTestId('hashtag-mention-input');
    await user.type(textInput, 'Test post content');

    const submitButton = screen.getByRole('button', { name: /post|submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: 'text',
          content: 'Test post content',
        })
      );
    });
  });

  it('auto-saves drafts', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <EnhancedPostComposer {...defaultProps} />
      </TestWrapper>
    );

    const textInput = screen.getByTestId('hashtag-mention-input');
    await user.type(textInput, 'Draft content');

    // Wait for auto-save to trigger
    await waitFor(() => {
      expect(mockOnDraftSave).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Draft content',
        })
      );
    }, { timeout: 3000 });
  });

  it('handles community context', () => {
    render(
      <TestWrapper>
        <EnhancedPostComposer 
          {...defaultProps} 
          context="community" 
          communityId="test-community" 
        />
      </TestWrapper>
    );

    expect(screen.getByTestId('content-type-tabs')).toBeInTheDocument();
    // Community-specific features should be available
  });

  it('validates content before submission', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <EnhancedPostComposer {...defaultProps} />
      </TestWrapper>
    );

    // Try to submit without content
    const submitButton = screen.getByRole('button', { name: /post|submit/i });
    await user.click(submitButton);

    // Should not call onSubmit with empty content
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('handles errors gracefully', async () => {
    const mockOnSubmitWithError = jest.fn().mockRejectedValue(new Error('Submission failed'));
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <EnhancedPostComposer {...defaultProps} onSubmit={mockOnSubmitWithError} />
      </TestWrapper>
    );

    const textInput = screen.getByTestId('hashtag-mention-input');
    await user.type(textInput, 'Test content');

    const submitButton = screen.getByRole('button', { name: /post|submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmitWithError).toHaveBeenCalled();
    });

    // Error should be displayed to user
    expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
  });

  it('supports keyboard shortcuts', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <EnhancedPostComposer {...defaultProps} />
      </TestWrapper>
    );

    const textInput = screen.getByTestId('hashtag-mention-input');
    await user.type(textInput, 'Test content');

    // Test Ctrl+Enter for submission
    await user.keyboard('{Control>}{Enter}{/Control}');

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  it('maintains accessibility standards', () => {
    render(
      <TestWrapper>
        <EnhancedPostComposer {...defaultProps} />
      </TestWrapper>
    );

    // Check for proper ARIA labels and roles
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /post|submit/i })).toBeInTheDocument();
    
    // Check for proper labeling
    const textInput = screen.getByTestId('hashtag-mention-input');
    expect(textInput).toHaveAttribute('aria-label');
  });
});