import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContentCreationWorkflow } from '../ContentCreationWorkflow';
import { EnhancedStateProvider } from '@/contexts/EnhancedStateProvider';

// Mock services
jest.mock('@/services/draftService', () => ({
  draftService: {
    saveDraft: jest.fn(),
    loadDraft: jest.fn(),
    deleteDraft: jest.fn(),
    listDrafts: jest.fn(),
  },
}));

jest.mock('@/services/mediaProcessingService', () => ({
  mediaProcessingService: {
    uploadMedia: jest.fn(),
    processImage: jest.fn(),
    generateThumbnail: jest.fn(),
    validateFile: jest.fn(),
  },
}));

jest.mock('@/services/contentValidationService', () => ({
  contentValidationService: {
    validateContent: jest.fn(),
    sanitizeContent: jest.fn(),
    checkForSpam: jest.fn(),
    validateHashtags: jest.fn(),
  },
}));

jest.mock('@/services/securityService', () => ({
  securityService: {
    scanContent: jest.fn(),
    validateLinks: jest.fn(),
    checkPermissions: jest.fn(),
  },
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EnhancedStateProvider>
    {children}
  </EnhancedStateProvider>
);

describe('Content Creation Workflow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    require('@/services/contentValidationService').contentValidationService.validateContent.mockResolvedValue({
      valid: true,
      errors: [],
    });
    require('@/services/contentValidationService').contentValidationService.sanitizeContent.mockImplementation(
      (content) => content
    );
    require('@/services/securityService').securityService.scanContent.mockResolvedValue({
      safe: true,
      issues: [],
    });
    require('@/services/draftService').draftService.saveDraft.mockResolvedValue({
      id: 'draft-123',
      savedAt: new Date(),
    });
  });

  it('completes full text post creation workflow', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = jest.fn().mockResolvedValue({ success: true, postId: 'post-123' });
    
    render(
      <TestWrapper>
        <ContentCreationWorkflow 
          context="feed"
          onSubmit={mockOnSubmit}
        />
      </TestWrapper>
    );

    // Type content
    const textInput = screen.getByRole('textbox');
    await user.type(textInput, 'This is a test post with #hashtag and @mention');

    // Submit post
    const submitButton = screen.getByRole('button', { name: /post|submit/i });
    await user.click(submitButton);

    // Should show loading state
    expect(screen.getByTestId('submission-loading')).toBeInTheDocument();

    // Wait for submission to complete
    await waitFor(() => {
      expect(screen.queryByTestId('submission-loading')).not.toBeInTheDocument();
    });

    // Verify workflow steps
    expect(require('@/services/contentValidationService').contentValidationService.validateContent).toHaveBeenCalled();
    expect(require('@/services/contentValidationService').contentValidationService.sanitizeContent).toHaveBeenCalled();
    expect(require('@/services/securityService').securityService.scanContent).toHaveBeenCalled();
    expect(mockOnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: 'text',
        content: 'This is a test post with #hashtag and @mention',
        hashtags: ['hashtag'],
        mentions: ['mention'],
      })
    );

    // Should show success message
    expect(screen.getByText(/post created successfully/i)).toBeInTheDocument();
  });

  it('handles media upload workflow', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = jest.fn().mockResolvedValue({ success: true, postId: 'post-456' });
    
    // Mock media processing
    require('@/services/mediaProcessingService').mediaProcessingService.validateFile.mockResolvedValue({
      valid: true,
      type: 'image/jpeg',
      size: 1024000,
    });
    require('@/services/mediaProcessingService').mediaProcessingService.uploadMedia.mockResolvedValue({
      url: 'https://example.com/image.jpg',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      metadata: { width: 1920, height: 1080 },
    });

    render(
      <TestWrapper>
        <ContentCreationWorkflow 
          context="feed"
          onSubmit={mockOnSubmit}
        />
      </TestWrapper>
    );

    // Switch to media tab
    const mediaTab = screen.getByRole('tab', { name: /media/i });
    await user.click(mediaTab);

    // Upload file
    const fileInput = screen.getByTestId('file-input');
    const file = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });
    await user.upload(fileInput, file);

    // Should show upload progress
    expect(screen.getByTestId('upload-progress')).toBeInTheDocument();

    // Wait for upload to complete
    await waitFor(() => {
      expect(screen.getByTestId('media-preview')).toBeInTheDocument();
    });

    // Add caption
    const captionInput = screen.getByPlaceholderText(/caption/i);
    await user.type(captionInput, 'Test image caption');

    // Submit post
    const submitButton = screen.getByRole('button', { name: /post|submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: 'media',
          content: 'Test image caption',
          media: expect.arrayContaining([
            expect.objectContaining({
              url: 'https://example.com/image.jpg',
              type: 'image/jpeg',
            })
          ]),
        })
      );
    });
  });

  it('handles poll creation workflow', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = jest.fn().mockResolvedValue({ success: true, postId: 'post-789' });
    
    render(
      <TestWrapper>
        <ContentCreationWorkflow 
          context="feed"
          onSubmit={mockOnSubmit}
        />
      </TestWrapper>
    );

    // Switch to poll tab
    const pollTab = screen.getByRole('tab', { name: /poll/i });
    await user.click(pollTab);

    // Create poll
    const questionInput = screen.getByPlaceholderText(/poll question/i);
    await user.type(questionInput, 'What is your favorite color?');

    const option1Input = screen.getByPlaceholderText(/option 1/i);
    await user.type(option1Input, 'Red');

    const option2Input = screen.getByPlaceholderText(/option 2/i);
    await user.type(option2Input, 'Blue');

    // Add third option
    const addOptionButton = screen.getByRole('button', { name: /add option/i });
    await user.click(addOptionButton);

    const option3Input = screen.getByPlaceholderText(/option 3/i);
    await user.type(option3Input, 'Green');

    // Set poll duration
    const durationSelect = screen.getByRole('combobox', { name: /duration/i });
    await user.selectOptions(durationSelect, '7');

    // Enable token weighting
    const tokenWeightingCheckbox = screen.getByRole('checkbox', { name: /token weighting/i });
    await user.click(tokenWeightingCheckbox);

    // Submit poll
    const submitButton = screen.getByRole('button', { name: /create poll/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: 'poll',
          poll: expect.objectContaining({
            question: 'What is your favorite color?',
            options: ['Red', 'Blue', 'Green'],
            duration: 7,
            tokenWeighted: true,
          }),
        })
      );
    });
  });

  it('handles proposal creation workflow', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = jest.fn().mockResolvedValue({ success: true, postId: 'post-012' });
    
    render(
      <TestWrapper>
        <ContentCreationWorkflow 
          context="community"
          communityId="dao-community"
          onSubmit={mockOnSubmit}
        />
      </TestWrapper>
    );

    // Switch to proposal tab
    const proposalTab = screen.getByRole('tab', { name: /proposal/i });
    await user.click(proposalTab);

    // Fill proposal details
    const titleInput = screen.getByPlaceholderText(/proposal title/i);
    await user.type(titleInput, 'Increase community rewards');

    const descriptionInput = screen.getByPlaceholderText(/description/i);
    await user.type(descriptionInput, 'This proposal suggests increasing the community reward pool by 20%');

    // Select proposal type
    const typeSelect = screen.getByRole('combobox', { name: /proposal type/i });
    await user.selectOptions(typeSelect, 'funding');

    // Set voting parameters
    const votingDurationInput = screen.getByLabelText(/voting duration/i);
    await user.clear(votingDurationInput);
    await user.type(votingDurationInput, '14');

    const quorumInput = screen.getByLabelText(/quorum/i);
    await user.clear(quorumInput);
    await user.type(quorumInput, '25');

    // Submit proposal
    const submitButton = screen.getByRole('button', { name: /create proposal/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: 'proposal',
          proposal: expect.objectContaining({
            title: 'Increase community rewards',
            description: 'This proposal suggests increasing the community reward pool by 20%',
            type: 'funding',
            votingDuration: 14,
            quorum: 25,
          }),
          communityId: 'dao-community',
        })
      );
    });
  });

  it('handles draft auto-save and recovery', async () => {
    const user = userEvent.setup();
    
    // Mock existing draft
    require('@/services/draftService').draftService.loadDraft.mockResolvedValue({
      id: 'draft-456',
      content: 'Previously saved content',
      contentType: 'text',
      savedAt: new Date(Date.now() - 300000), // 5 minutes ago
    });

    render(
      <TestWrapper>
        <ContentCreationWorkflow 
          context="feed"
          onSubmit={jest.fn()}
        />
      </TestWrapper>
    );

    // Should show draft recovery option
    await waitFor(() => {
      expect(screen.getByText(/recover draft/i)).toBeInTheDocument();
    });

    // Recover draft
    const recoverButton = screen.getByRole('button', { name: /recover/i });
    await user.click(recoverButton);

    // Should load draft content
    expect(screen.getByDisplayValue('Previously saved content')).toBeInTheDocument();

    // Type new content
    const textInput = screen.getByRole('textbox');
    await user.clear(textInput);
    await user.type(textInput, 'Updated draft content');

    // Wait for auto-save
    await waitFor(() => {
      expect(require('@/services/draftService').draftService.saveDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Updated draft content',
        })
      );
    }, { timeout: 3000 });
  });

  it('handles content validation errors', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = jest.fn();
    
    // Mock validation failure
    require('@/services/contentValidationService').contentValidationService.validateContent.mockResolvedValue({
      valid: false,
      errors: [
        { field: 'content', message: 'Content contains prohibited words' },
        { field: 'hashtags', message: 'Too many hashtags' },
      ],
    });

    render(
      <TestWrapper>
        <ContentCreationWorkflow 
          context="feed"
          onSubmit={mockOnSubmit}
        />
      </TestWrapper>
    );

    const textInput = screen.getByRole('textbox');
    await user.type(textInput, 'Invalid content with #too #many #hashtags #here #and #more');

    const submitButton = screen.getByRole('button', { name: /post|submit/i });
    await user.click(submitButton);

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/prohibited words/i)).toBeInTheDocument();
      expect(screen.getByText(/too many hashtags/i)).toBeInTheDocument();
    });

    // Should not submit
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('handles security scan failures', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = jest.fn();
    
    // Mock security scan failure
    require('@/services/securityService').securityService.scanContent.mockResolvedValue({
      safe: false,
      issues: [
        { type: 'malicious_link', severity: 'high', message: 'Suspicious link detected' },
      ],
    });

    render(
      <TestWrapper>
        <ContentCreationWorkflow 
          context="feed"
          onSubmit={mockOnSubmit}
        />
      </TestWrapper>
    );

    const textInput = screen.getByRole('textbox');
    await user.type(textInput, 'Check out this link: https://suspicious-site.com');

    const submitButton = screen.getByRole('button', { name: /post|submit/i });
    await user.click(submitButton);

    // Should show security warning
    await waitFor(() => {
      expect(screen.getByText(/suspicious link detected/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /review and edit/i })).toBeInTheDocument();
    });

    // Should not submit
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('handles network errors with retry', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = jest.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ success: true, postId: 'post-345' });
    
    render(
      <TestWrapper>
        <ContentCreationWorkflow 
          context="feed"
          onSubmit={mockOnSubmit}
        />
      </TestWrapper>
    );

    const textInput = screen.getByRole('textbox');
    await user.type(textInput, 'Test post content');

    const submitButton = screen.getByRole('button', { name: /post|submit/i });
    await user.click(submitButton);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });

    // Retry submission
    const retryButton = screen.getByRole('button', { name: /retry/i });
    await user.click(retryButton);

    // Should succeed on retry
    await waitFor(() => {
      expect(screen.getByText(/post created successfully/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).toHaveBeenCalledTimes(2);
  });

  it('handles file upload errors', async () => {
    const user = userEvent.setup();
    
    // Mock file validation failure
    require('@/services/mediaProcessingService').mediaProcessingService.validateFile.mockResolvedValue({
      valid: false,
      errors: ['File too large', 'Unsupported format'],
    });

    render(
      <TestWrapper>
        <ContentCreationWorkflow 
          context="feed"
          onSubmit={jest.fn()}
        />
      </TestWrapper>
    );

    // Switch to media tab
    const mediaTab = screen.getByRole('tab', { name: /media/i });
    await user.click(mediaTab);

    // Try to upload invalid file
    const fileInput = screen.getByTestId('file-input');
    const file = new File(['large file'], 'large.exe', { type: 'application/exe' });
    await user.upload(fileInput, file);

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/file too large/i)).toBeInTheDocument();
      expect(screen.getByText(/unsupported format/i)).toBeInTheDocument();
    });
  });

  it('maintains state across tab switches', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <ContentCreationWorkflow 
          context="feed"
          onSubmit={jest.fn()}
        />
      </TestWrapper>
    );

    // Type content in text tab
    const textInput = screen.getByRole('textbox');
    await user.type(textInput, 'Text content');

    // Switch to poll tab
    const pollTab = screen.getByRole('tab', { name: /poll/i });
    await user.click(pollTab);

    // Add poll question
    const questionInput = screen.getByPlaceholderText(/poll question/i);
    await user.type(questionInput, 'Poll question');

    // Switch back to text tab
    const textTab = screen.getByRole('tab', { name: /text/i });
    await user.click(textTab);

    // Content should be preserved
    expect(screen.getByDisplayValue('Text content')).toBeInTheDocument();

    // Switch back to poll tab
    await user.click(pollTab);

    // Poll content should be preserved
    expect(screen.getByDisplayValue('Poll question')).toBeInTheDocument();
  });
});