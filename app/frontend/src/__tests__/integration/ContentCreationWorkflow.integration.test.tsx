import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnhancedPostComposer } from '@/components/EnhancedPostComposer/EnhancedPostComposer';
import { ContentCreationProvider } from '@/contexts/ContentCreationContext';
import { ReputationProvider } from '@/contexts/ReputationContext';
import * as draftService from '@/services/draftService';
import * as mediaProcessingService from '@/services/mediaProcessingService';
import * as contentValidationService from '@/services/contentValidationService';
import * as postService from '@/services/postService';

// Mock services
jest.mock('@/services/draftService');
jest.mock('@/services/mediaProcessingService');
jest.mock('@/services/contentValidationService');
jest.mock('@/services/postService');

const mockDraftService = draftService as jest.Mocked<typeof draftService>;
const mockMediaProcessingService = mediaProcessingService as jest.Mocked<typeof mediaProcessingService>;
const mockContentValidationService = contentValidationService as jest.Mocked<typeof contentValidationService>;
const mockPostService = postService as jest.Mocked<typeof postService>;

const mockOnSubmit = jest.fn();
const mockOnDraftSave = jest.fn();

const renderContentCreationWorkflow = (props = {}) => {
  const defaultProps = {
    context: 'feed' as const,
    onSubmit: mockOnSubmit,
    onDraftSave: mockOnDraftSave,
    ...props,
  };

  return render(
    <ContentCreationProvider>
      <ReputationProvider>
        <EnhancedPostComposer {...defaultProps} />
      </ReputationProvider>
    </ContentCreationProvider>
  );
};

describe('Content Creation Workflow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful validation by default
    mockContentValidationService.validateContent.mockResolvedValue({
      isValid: true,
      errors: [],
      warnings: [],
    });
    
    // Mock successful post creation
    mockPostService.createPost.mockResolvedValue({
      id: 'new-post-1',
      success: true,
    });
    
    // Mock draft service
    mockDraftService.saveDraft.mockResolvedValue({ id: 'draft-1' });
    mockDraftService.getDraft.mockResolvedValue(null);
  });

  describe('Text Post Creation Workflow', () => {
    it('should complete full text post creation workflow', async () => {
      const user = userEvent.setup();
      renderContentCreationWorkflow();
      
      // Step 1: Enter content
      const textArea = screen.getByRole('textbox', { name: /post content/i });
      await user.type(textArea, 'This is a test post with #hashtag and @mention');
      
      // Step 2: Verify hashtag suggestions appear
      await waitFor(() => {
        expect(screen.getByTestId('hashtag-suggestions')).toBeInTheDocument();
      });
      
      // Step 3: Select hashtag suggestion
      const hashtagSuggestion = screen.getByText('#hashtag');
      await user.click(hashtagSuggestion);
      
      // Step 4: Verify mention suggestions appear
      await waitFor(() => {
        expect(screen.getByTestId('mention-suggestions')).toBeInTheDocument();
      });
      
      // Step 5: Select mention suggestion
      const mentionSuggestion = screen.getByText('@mention');
      await user.click(mentionSuggestion);
      
      // Step 6: Submit post
      const submitButton = screen.getByRole('button', { name: /post/i });
      await user.click(submitButton);
      
      // Step 7: Verify validation is called
      await waitFor(() => {
        expect(mockContentValidationService.validateContent).toHaveBeenCalledWith({
          content: expect.stringContaining('This is a test post'),
          contentType: 'text',
          hashtags: ['hashtag'],
          mentions: ['mention'],
        });
      });
      
      // Step 8: Verify post creation
      await waitFor(() => {
        expect(mockPostService.createPost).toHaveBeenCalledWith({
          contentType: 'text',
          content: expect.stringContaining('This is a test post'),
          hashtags: ['hashtag'],
          mentions: ['mention'],
        });
      });
      
      // Step 9: Verify success callback
      expect(mockOnSubmit).toHaveBeenCalledWith({
        id: 'new-post-1',
        success: true,
      });
    });

    it('should handle content validation errors', async () => {
      const user = userEvent.setup();
      
      // Mock validation failure
      mockContentValidationService.validateContent.mockResolvedValue({
        isValid: false,
        errors: ['Content contains inappropriate language'],
        warnings: [],
      });
      
      renderContentCreationWorkflow();
      
      const textArea = screen.getByRole('textbox');
      await user.type(textArea, 'Inappropriate content');
      
      const submitButton = screen.getByRole('button', { name: /post/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/inappropriate language/i)).toBeInTheDocument();
      });
      
      // Post should not be created
      expect(mockPostService.createPost).not.toHaveBeenCalled();
    });

    it('should show validation warnings but allow submission', async () => {
      const user = userEvent.setup();
      
      // Mock validation with warnings
      mockContentValidationService.validateContent.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: ['Post may be too short for optimal engagement'],
      });
      
      renderContentCreationWorkflow();
      
      const textArea = screen.getByRole('textbox');
      await user.type(textArea, 'Short');
      
      const submitButton = screen.getByRole('button', { name: /post/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/may be too short/i)).toBeInTheDocument();
      });
      
      // Should still allow submission
      const proceedButton = screen.getByRole('button', { name: /post anyway/i });
      await user.click(proceedButton);
      
      expect(mockPostService.createPost).toHaveBeenCalled();
    });
  });

  describe('Media Post Creation Workflow', () => {
    it('should complete media upload and processing workflow', async () => {
      const user = userEvent.setup();
      
      // Mock media processing
      mockMediaProcessingService.processImage.mockResolvedValue({
        processedUrl: '/processed-image.jpg',
        thumbnail: '/thumbnail.jpg',
        metadata: { width: 800, height: 600 },
      });
      
      renderContentCreationWorkflow();
      
      // Step 1: Switch to media tab
      const mediaTab = screen.getByRole('tab', { name: /media/i });
      await user.click(mediaTab);
      
      // Step 2: Upload file
      const dropZone = screen.getByTestId('media-upload-zone');
      const file = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [file] },
      });
      
      // Step 3: Verify upload progress
      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });
      
      // Step 4: Verify media processing
      await waitFor(() => {
        expect(mockMediaProcessingService.processImage).toHaveBeenCalledWith(file, {
          optimize: true,
          generateThumbnail: true,
          maxWidth: 1200,
        });
      });
      
      // Step 5: Verify processed image preview
      await waitFor(() => {
        expect(screen.getByTestId('processed-image-preview')).toBeInTheDocument();
      });
      
      // Step 6: Add caption
      const captionInput = screen.getByLabelText(/caption/i);
      await user.type(captionInput, 'Test image caption');
      
      // Step 7: Submit post
      const submitButton = screen.getByRole('button', { name: /post/i });
      await user.click(submitButton);
      
      // Step 8: Verify post creation with media
      await waitFor(() => {
        expect(mockPostService.createPost).toHaveBeenCalledWith({
          contentType: 'media',
          content: 'Test image caption',
          media: [{
            url: '/processed-image.jpg',
            thumbnail: '/thumbnail.jpg',
            type: 'image',
            metadata: { width: 800, height: 600 },
          }],
          hashtags: [],
          mentions: [],
        });
      });
    });

    it('should handle media processing failures', async () => {
      const user = userEvent.setup();
      
      // Mock processing failure
      mockMediaProcessingService.processImage.mockRejectedValue(
        new Error('Processing failed')
      );
      
      renderContentCreationWorkflow();
      
      const mediaTab = screen.getByRole('tab', { name: /media/i });
      await user.click(mediaTab);
      
      const dropZone = screen.getByTestId('media-upload-zone');
      const file = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [file] },
      });
      
      await waitFor(() => {
        expect(screen.getByText(/processing failed/i)).toBeInTheDocument();
      });
      
      // Should show retry option
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should provide image editing tools', async () => {
      const user = userEvent.setup();
      
      mockMediaProcessingService.processImage.mockResolvedValue({
        processedUrl: '/processed-image.jpg',
        thumbnail: '/thumbnail.jpg',
        metadata: { width: 800, height: 600 },
      });
      
      renderContentCreationWorkflow();
      
      const mediaTab = screen.getByRole('tab', { name: /media/i });
      await user.click(mediaTab);
      
      const dropZone = screen.getByTestId('media-upload-zone');
      const file = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [file] },
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('image-editor')).toBeInTheDocument();
      });
      
      // Test crop tool
      const cropButton = screen.getByRole('button', { name: /crop/i });
      await user.click(cropButton);
      
      expect(screen.getByTestId('crop-tool')).toBeInTheDocument();
      
      // Test filter tool
      const filterButton = screen.getByRole('button', { name: /filter/i });
      await user.click(filterButton);
      
      expect(screen.getByTestId('filter-tool')).toBeInTheDocument();
    });
  });

  describe('Poll Creation Workflow', () => {
    it('should complete poll creation workflow', async () => {
      const user = userEvent.setup();
      renderContentCreationWorkflow();
      
      // Step 1: Switch to poll tab
      const pollTab = screen.getByRole('tab', { name: /poll/i });
      await user.click(pollTab);
      
      // Step 2: Enter poll question
      const questionInput = screen.getByLabelText(/poll question/i);
      await user.type(questionInput, 'What is your favorite feature?');
      
      // Step 3: Add poll options
      const option1Input = screen.getByTestId('poll-option-0');
      await user.type(option1Input, 'Token Reactions');
      
      const option2Input = screen.getByTestId('poll-option-1');
      await user.type(option2Input, 'Enhanced Composer');
      
      // Step 4: Add more options
      const addOptionButton = screen.getByRole('button', { name: /add option/i });
      await user.click(addOptionButton);
      
      const option3Input = screen.getByTestId('poll-option-2');
      await user.type(option3Input, 'Reputation System');
      
      // Step 5: Configure token weighting
      const tokenWeightToggle = screen.getByRole('checkbox', { name: /token-weighted/i });
      await user.click(tokenWeightToggle);
      
      // Step 6: Set poll duration
      const durationSelect = screen.getByLabelText(/poll duration/i);
      await user.selectOptions(durationSelect, '7');
      
      // Step 7: Submit poll
      const submitButton = screen.getByRole('button', { name: /post/i });
      await user.click(submitButton);
      
      // Step 8: Verify poll creation
      await waitFor(() => {
        expect(mockPostService.createPost).toHaveBeenCalledWith({
          contentType: 'poll',
          content: 'What is your favorite feature?',
          poll: {
            question: 'What is your favorite feature?',
            options: [
              { id: expect.any(String), text: 'Token Reactions', votes: 0 },
              { id: expect.any(String), text: 'Enhanced Composer', votes: 0 },
              { id: expect.any(String), text: 'Reputation System', votes: 0 },
            ],
            tokenWeighted: true,
            duration: 7,
            endsAt: expect.any(Date),
          },
          hashtags: [],
          mentions: [],
        });
      });
    });

    it('should validate poll options', async () => {
      const user = userEvent.setup();
      renderContentCreationWorkflow();
      
      const pollTab = screen.getByRole('tab', { name: /poll/i });
      await user.click(pollTab);
      
      const questionInput = screen.getByLabelText(/poll question/i);
      await user.type(questionInput, 'Test poll?');
      
      // Leave options empty
      const submitButton = screen.getByRole('button', { name: /post/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/at least 2 options required/i)).toBeInTheDocument();
      });
      
      expect(mockPostService.createPost).not.toHaveBeenCalled();
    });
  });

  describe('Draft Management Workflow', () => {
    it('should auto-save drafts during composition', async () => {
      const user = userEvent.setup();
      renderContentCreationWorkflow();
      
      const textArea = screen.getByRole('textbox');
      await user.type(textArea, 'This is a draft');
      
      // Wait for auto-save debounce
      await waitFor(() => {
        expect(mockDraftService.saveDraft).toHaveBeenCalledWith({
          contentType: 'text',
          content: 'This is a draft',
          hashtags: [],
          mentions: [],
          createdAt: expect.any(Date),
        });
      }, { timeout: 3000 });
    });

    it('should recover drafts on component mount', async () => {
      const mockDraft = {
        id: 'draft-1',
        contentType: 'text',
        content: 'Recovered draft content',
        hashtags: ['recovered'],
        mentions: [],
        createdAt: new Date(),
      };
      
      mockDraftService.getDraft.mockResolvedValue(mockDraft);
      
      renderContentCreationWorkflow();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Recovered draft content')).toBeInTheDocument();
      });
      
      // Should show recovery notification
      expect(screen.getByText(/draft recovered/i)).toBeInTheDocument();
    });

    it('should handle draft conflicts', async () => {
      const user = userEvent.setup();
      
      const conflictingDraft = {
        id: 'draft-1',
        contentType: 'text',
        content: 'Conflicting draft',
        hashtags: [],
        mentions: [],
        createdAt: new Date(Date.now() - 60000), // 1 minute ago
      };
      
      mockDraftService.getDraft.mockResolvedValue(conflictingDraft);
      
      renderContentCreationWorkflow();
      
      // User starts typing new content
      const textArea = screen.getByRole('textbox');
      await user.type(textArea, 'New content');
      
      // Should show conflict resolution dialog
      await waitFor(() => {
        expect(screen.getByText(/draft conflict/i)).toBeInTheDocument();
      });
      
      // User chooses to keep new content
      const keepNewButton = screen.getByRole('button', { name: /keep new/i });
      await user.click(keepNewButton);
      
      expect(textArea).toHaveValue('New content');
    });

    it('should delete draft after successful post', async () => {
      const user = userEvent.setup();
      renderContentCreationWorkflow();
      
      const textArea = screen.getByRole('textbox');
      await user.type(textArea, 'Content to post');
      
      // Wait for auto-save
      await waitFor(() => {
        expect(mockDraftService.saveDraft).toHaveBeenCalled();
      }, { timeout: 3000 });
      
      const submitButton = screen.getByRole('button', { name: /post/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockPostService.createPost).toHaveBeenCalled();
      });
      
      // Should delete draft after successful post
      expect(mockDraftService.deleteDraft).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle post creation failures', async () => {
      const user = userEvent.setup();
      
      mockPostService.createPost.mockRejectedValue(
        new Error('Server error')
      );
      
      renderContentCreationWorkflow();
      
      const textArea = screen.getByRole('textbox');
      await user.type(textArea, 'Test content');
      
      const submitButton = screen.getByRole('button', { name: /post/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/failed to create post/i)).toBeInTheDocument();
      });
      
      // Should show retry option
      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
      
      // Content should be preserved
      expect(textArea).toHaveValue('Test content');
    });

    it('should handle network failures gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock network failure
      mockPostService.createPost.mockRejectedValue(
        new Error('Network unavailable')
      );
      
      renderContentCreationWorkflow();
      
      const textArea = screen.getByRole('textbox');
      await user.type(textArea, 'Network test');
      
      const submitButton = screen.getByRole('button', { name: /post/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
      
      // Should offer to save as draft
      const saveDraftButton = screen.getByRole('button', { name: /save as draft/i });
      await user.click(saveDraftButton);
      
      expect(mockDraftService.saveDraft).toHaveBeenCalled();
    });

    it('should preserve content during errors', async () => {
      const user = userEvent.setup();
      
      mockContentValidationService.validateContent.mockRejectedValue(
        new Error('Validation service unavailable')
      );
      
      renderContentCreationWorkflow();
      
      const textArea = screen.getByRole('textbox');
      await user.type(textArea, 'Content to preserve');
      
      const submitButton = screen.getByRole('button', { name: /post/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/validation failed/i)).toBeInTheDocument();
      });
      
      // Content should still be there
      expect(textArea).toHaveValue('Content to preserve');
    });
  });

  describe('Performance and UX', () => {
    it('should show loading states during submission', async () => {
      const user = userEvent.setup();
      
      // Mock slow post creation
      mockPostService.createPost.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 2000))
      );
      
      renderContentCreationWorkflow();
      
      const textArea = screen.getByRole('textbox');
      await user.type(textArea, 'Loading test');
      
      const submitButton = screen.getByRole('button', { name: /post/i });
      await user.click(submitButton);
      
      // Should show loading state
      expect(screen.getByTestId('post-loading')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('should provide progress feedback for media uploads', async () => {
      const user = userEvent.setup();
      
      // Mock upload progress
      mockMediaProcessingService.processImage.mockImplementation(
        (file, options, onProgress) => {
          // Simulate progress updates
          setTimeout(() => onProgress?.(25), 100);
          setTimeout(() => onProgress?.(50), 200);
          setTimeout(() => onProgress?.(75), 300);
          setTimeout(() => onProgress?.(100), 400);
          
          return Promise.resolve({
            processedUrl: '/processed.jpg',
            thumbnail: '/thumb.jpg',
            metadata: {},
          });
        }
      );
      
      renderContentCreationWorkflow();
      
      const mediaTab = screen.getByRole('tab', { name: /media/i });
      await user.click(mediaTab);
      
      const dropZone = screen.getByTestId('media-upload-zone');
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [file] },
      });
      
      // Should show progress updates
      await waitFor(() => {
        expect(screen.getByText('25%')).toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument();
      });
    });

    it('should debounce auto-save to prevent excessive API calls', async () => {
      const user = userEvent.setup();
      renderContentCreationWorkflow();
      
      const textArea = screen.getByRole('textbox');
      
      // Type rapidly
      await user.type(textArea, 'a');
      await user.type(textArea, 'b');
      await user.type(textArea, 'c');
      await user.type(textArea, 'd');
      await user.type(textArea, 'e');
      
      // Should only save once after debounce period
      await waitFor(() => {
        expect(mockDraftService.saveDraft).toHaveBeenCalledTimes(1);
      }, { timeout: 3000 });
    });
  });
});