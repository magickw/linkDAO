import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnhancedPostComposer } from '@/components/EnhancedPostComposer/EnhancedPostComposer';
import { ContentCreationProvider } from '@/contexts/ContentCreationContext';
import { ContentType } from '@/types/enhancedPost';

// Mock services
jest.mock('@/services/draftService');
jest.mock('@/services/mediaProcessingService');
jest.mock('@/services/contentValidationService');

const mockOnSubmit = jest.fn();
const mockOnDraftSave = jest.fn();

const renderWithProvider = (props = {}) => {
  const defaultProps = {
    context: 'feed' as const,
    onSubmit: mockOnSubmit,
    onDraftSave: mockOnDraftSave,
    ...props,
  };

  return render(
    <ContentCreationProvider>
      <EnhancedPostComposer {...defaultProps} />
    </ContentCreationProvider>
  );
};

describe('EnhancedPostComposer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Content Type Tabs', () => {
    it('should render all content type tabs', () => {
      renderWithProvider();
      
      expect(screen.getByRole('tab', { name: /text/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /media/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /link/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /poll/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /proposal/i })).toBeInTheDocument();
    });

    it('should switch content types when tabs are clicked', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const mediaTab = screen.getByRole('tab', { name: /media/i });
      await user.click(mediaTab);
      
      expect(screen.getByTestId('media-upload-zone')).toBeInTheDocument();
    });

    it('should show context-specific tools for each content type', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      // Switch to poll tab
      const pollTab = screen.getByRole('tab', { name: /poll/i });
      await user.click(pollTab);
      
      expect(screen.getByTestId('poll-creator')).toBeInTheDocument();
      expect(screen.getByText(/token-weighted voting/i)).toBeInTheDocument();
    });
  });

  describe('Media Upload', () => {
    it('should handle drag and drop file upload', async () => {
      renderWithProvider();
      
      const user = userEvent.setup();
      const mediaTab = screen.getByRole('tab', { name: /media/i });
      await user.click(mediaTab);
      
      const dropZone = screen.getByTestId('media-upload-zone');
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file],
        },
      });
      
      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });
    });

    it('should show upload progress', async () => {
      renderWithProvider();
      
      const user = userEvent.setup();
      const mediaTab = screen.getByRole('tab', { name: /media/i });
      await user.click(mediaTab);
      
      const dropZone = screen.getByTestId('media-upload-zone');
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file],
        },
      });
      
      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });
    });

    it('should provide image editing tools', async () => {
      renderWithProvider();
      
      const user = userEvent.setup();
      const mediaTab = screen.getByRole('tab', { name: /media/i });
      await user.click(mediaTab);
      
      const dropZone = screen.getByTestId('media-upload-zone');
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file],
        },
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('image-editor')).toBeInTheDocument();
      });
    });
  });

  describe('Hashtag and Mention Input', () => {
    it('should show hashtag autocomplete', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const textArea = screen.getByRole('textbox');
      await user.type(textArea, 'This is a test #web');
      
      await waitFor(() => {
        expect(screen.getByTestId('hashtag-suggestions')).toBeInTheDocument();
      });
    });

    it('should show mention autocomplete', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const textArea = screen.getByRole('textbox');
      await user.type(textArea, 'Hello @john');
      
      await waitFor(() => {
        expect(screen.getByTestId('mention-suggestions')).toBeInTheDocument();
      });
    });

    it('should insert selected hashtag', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const textArea = screen.getByRole('textbox');
      await user.type(textArea, 'Test #web');
      
      await waitFor(() => {
        expect(screen.getByTestId('hashtag-suggestions')).toBeInTheDocument();
      });
      
      const suggestion = screen.getByText('#web3');
      await user.click(suggestion);
      
      expect(textArea).toHaveValue('Test #web3');
    });
  });

  describe('Poll Creation', () => {
    it('should create poll with multiple options', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const pollTab = screen.getByRole('tab', { name: /poll/i });
      await user.click(pollTab);
      
      const addOptionButton = screen.getByText(/add option/i);
      await user.click(addOptionButton);
      await user.click(addOptionButton);
      
      const options = screen.getAllByTestId('poll-option-input');
      expect(options).toHaveLength(4); // 2 default + 2 added
    });

    it('should configure token-weighted voting', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const pollTab = screen.getByRole('tab', { name: /poll/i });
      await user.click(pollTab);
      
      const tokenWeightToggle = screen.getByRole('checkbox', { name: /token-weighted/i });
      await user.click(tokenWeightToggle);
      
      expect(screen.getByTestId('token-weight-config')).toBeInTheDocument();
    });
  });

  describe('Draft Management', () => {
    it('should auto-save drafts', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const textArea = screen.getByRole('textbox');
      await user.type(textArea, 'This is a draft');
      
      await waitFor(() => {
        expect(mockOnDraftSave).toHaveBeenCalledWith(
          expect.objectContaining({
            content: 'This is a draft',
          })
        );
      }, { timeout: 3000 });
    });

    it('should recover drafts on load', () => {
      const mockDraft = {
        id: '1',
        content: 'Recovered draft',
        contentType: ContentType.TEXT,
        createdAt: new Date(),
      };
      
      // Mock draft service to return a draft
      jest.doMock('@/services/draftService', () => ({
        getDraft: jest.fn().mockResolvedValue(mockDraft),
        saveDraft: jest.fn(),
        deleteDraft: jest.fn(),
      }));
      
      renderWithProvider();
      
      expect(screen.getByDisplayValue('Recovered draft')).toBeInTheDocument();
    });
  });

  describe('Content Validation', () => {
    it('should validate content before submission', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const textArea = screen.getByRole('textbox');
      await user.type(textArea, 'Valid content');
      
      const submitButton = screen.getByRole('button', { name: /post/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            content: 'Valid content',
          })
        );
      });
    });

    it('should show validation errors', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      // Mock validation service to return error
      jest.doMock('@/services/contentValidationService', () => ({
        validateContent: jest.fn().mockResolvedValue({
          isValid: false,
          errors: ['Content contains inappropriate language'],
        }),
      }));
      
      const textArea = screen.getByRole('textbox');
      await user.type(textArea, 'Invalid content');
      
      const submitButton = screen.getByRole('button', { name: /post/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/inappropriate language/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithProvider();
      
      expect(screen.getByRole('tablist')).toHaveAttribute('aria-label', 'Content types');
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-label', 'Post content');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const firstTab = screen.getByRole('tab', { name: /text/i });
      firstTab.focus();
      
      await user.keyboard('{ArrowRight}');
      
      expect(screen.getByRole('tab', { name: /media/i })).toHaveFocus();
    });

    it('should announce content type changes to screen readers', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const mediaTab = screen.getByRole('tab', { name: /media/i });
      await user.click(mediaTab);
      
      expect(screen.getByRole('status')).toHaveTextContent(/media content type selected/i);
    });
  });

  describe('Performance', () => {
    it('should debounce auto-save', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const textArea = screen.getByRole('textbox');
      
      // Type rapidly
      await user.type(textArea, 'a');
      await user.type(textArea, 'b');
      await user.type(textArea, 'c');
      
      // Should only save once after debounce
      await waitFor(() => {
        expect(mockOnDraftSave).toHaveBeenCalledTimes(1);
      }, { timeout: 3000 });
    });

    it('should lazy load media processing tools', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const mediaTab = screen.getByRole('tab', { name: /media/i });
      await user.click(mediaTab);
      
      // Media processing tools should be loaded on demand
      await waitFor(() => {
        expect(screen.getByTestId('media-processing-tools')).toBeInTheDocument();
      });
    });
  });
});