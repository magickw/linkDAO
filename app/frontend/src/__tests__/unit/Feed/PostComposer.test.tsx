import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PostComposer } from '@/components/Feed/PostComposer';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import { draftService } from '@/services/draftService';
import { mediaProcessingService } from '@/services/mediaProcessingService';
import { serviceWorkerCacheService } from '@/services/serviceWorkerCacheService';
import testUtils from '../../setup/testSetup';

// Mock dependencies
jest.mock('@/context/Web3Context');
jest.mock('@/context/ToastContext');
jest.mock('@/services/draftService');
jest.mock('@/services/mediaProcessingService');
jest.mock('@/services/serviceWorkerCacheService');

const mockUseWeb3 = useWeb3 as jest.MockedFunction<typeof useWeb3>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockDraftService = draftService as jest.Mocked<typeof draftService>;
const mockMediaProcessingService = mediaProcessingService as jest.Mocked<typeof mediaProcessingService>;
const mockServiceWorkerCache = serviceWorkerCacheService as jest.Mocked<typeof serviceWorkerCacheService>;

const mockWeb3Context = {
  address: '0x1234567890123456789012345678901234567890',
  isConnected: true,
  connect: jest.fn(),
  disconnect: jest.fn(),
  switchNetwork: jest.fn()
};

const mockToastContext = {
  addToast: jest.fn(),
  removeToast: jest.fn(),
  toasts: []
};

const mockCommunities = [
  {
    id: 'general',
    name: 'general',
    displayName: 'General Discussion',
    iconUrl: undefined,
    memberCount: 1234,
    canPost: true
  },
  {
    id: 'defi',
    name: 'defi',
    displayName: 'DeFi Hub',
    iconUrl: undefined,
    memberCount: 856,
    canPost: true
  }
];

describe('PostComposer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWeb3.mockReturnValue(mockWeb3Context);
    mockUseToast.mockReturnValue(mockToastContext);
    
    mockServiceWorkerCache.cacheWithStrategy.mockResolvedValue(
      new Response(JSON.stringify(mockCommunities))
    );
    
    mockDraftService.saveDraft.mockResolvedValue(undefined);
    mockDraftService.getDraft.mockResolvedValue(null);
    mockDraftService.clearDraft.mockResolvedValue(undefined);
    
    mockMediaProcessingService.optimizeImage.mockResolvedValue(new File([''], 'test.jpg'));
    mockMediaProcessingService.uploadToIPFS.mockResolvedValue('bafybeictest');
  });

  describe('Basic Rendering', () => {
    it('should render post composer with all essential elements', () => {
      render(<PostComposer />);
      
      expect(screen.getByText('Create Post')).toBeInTheDocument();
      expect(screen.getByPlaceholderText("What's on your mind?")).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /post/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should show community selection when enabled', async () => {
      render(<PostComposer enableCommunitySelection={true} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/post to community/i)).toBeInTheDocument();
      });
      
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    it('should not show community selection when disabled', () => {
      render(<PostComposer enableCommunitySelection={false} />);
      
      expect(screen.queryByLabelText(/post to community/i)).not.toBeInTheDocument();
    });

    it('should show title input', () => {
      render(<PostComposer />);
      
      expect(screen.getByPlaceholderText(/post title/i)).toBeInTheDocument();
    });
  });

  describe('Content Input', () => {
    it('should handle text input', async () => {
      render(<PostComposer />);
      
      const textArea = screen.getByPlaceholderText("What's on your mind?");
      await userEvent.type(textArea, 'This is a test post');
      
      expect(textArea).toHaveValue('This is a test post');
    });

    it('should show character count', async () => {
      render(<PostComposer maxLength={100} />);
      
      const textArea = screen.getByPlaceholderText("What's on your mind?");
      await userEvent.type(textArea, 'Test content');
      
      expect(screen.getByText('88 characters remaining')).toBeInTheDocument();
    });

    it('should show warning when approaching character limit', async () => {
      render(<PostComposer maxLength={20} />);
      
      const textArea = screen.getByPlaceholderText("What's on your mind?");
      await userEvent.type(textArea, 'This is a very long test');
      
      expect(screen.getByText(/-4 characters remaining/)).toHaveClass('text-red-500');
    });

    it('should handle title input', async () => {
      render(<PostComposer />);
      
      const titleInput = screen.getByPlaceholderText(/post title/i);
      await userEvent.type(titleInput, 'My Test Post');
      
      expect(titleInput).toHaveValue('My Test Post');
    });
  });

  describe('Media Upload', () => {
    it('should handle file upload via drag and drop', async () => {
      render(<PostComposer />);
      
      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      const mediaZone = screen.getByTestId('media-upload-zone');
      
      fireEvent.drop(mediaZone, {
        dataTransfer: {
          files: [file]
        }
      });
      
      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });
    });

    it('should handle file upload via file input', async () => {
      render(<PostComposer />);
      
      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByTestId('file-input');
      
      await userEvent.upload(fileInput, file);
      
      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });
    });

    it('should optimize images on upload', async () => {
      render(<PostComposer />);
      
      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      const mediaZone = screen.getByTestId('media-upload-zone');
      
      fireEvent.drop(mediaZone, {
        dataTransfer: {
          files: [file]
        }
      });
      
      await waitFor(() => {
        expect(mockMediaProcessingService.optimizeImage).toHaveBeenCalledWith(file);
      });
    });

    it('should reject files that are too large', async () => {
      render(<PostComposer />);
      
      const largeFile = new File(['x'.repeat(60 * 1024 * 1024)], 'large.jpg', { 
        type: 'image/jpeg' 
      });
      const mediaZone = screen.getByTestId('media-upload-zone');
      
      fireEvent.drop(mediaZone, {
        dataTransfer: {
          files: [largeFile]
        }
      });
      
      await waitFor(() => {
        expect(mockToastContext.addToast).toHaveBeenCalledWith(
          expect.stringContaining('too large'),
          'error'
        );
      });
    });

    it('should limit number of media files', async () => {
      render(<PostComposer />);
      
      const files = Array.from({ length: 12 }, (_, i) => 
        new File(['test'], `test${i}.jpg`, { type: 'image/jpeg' })
      );
      
      const mediaZone = screen.getByTestId('media-upload-zone');
      
      fireEvent.drop(mediaZone, {
        dataTransfer: {
          files
        }
      });
      
      await waitFor(() => {
        expect(mockToastContext.addToast).toHaveBeenCalledWith(
          expect.stringContaining('Maximum 10 files'),
          'error'
        );
      });
    });

    it('should allow removing uploaded files', async () => {
      render(<PostComposer />);
      
      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      const mediaZone = screen.getByTestId('media-upload-zone');
      
      fireEvent.drop(mediaZone, {
        dataTransfer: {
          files: [file]
        }
      });
      
      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });
      
      const removeButton = screen.getByRole('button', { name: /remove/i });
      await userEvent.click(removeButton);
      
      expect(screen.queryByText('test.jpg')).not.toBeInTheDocument();
    });
  });

  describe('Hashtag and Mention Processing', () => {
    it('should extract hashtags from content', async () => {
      const mockOnPost = jest.fn();
      render(<PostComposer onPost={mockOnPost} />);
      
      const textArea = screen.getByPlaceholderText("What's on your mind?");
      await userEvent.type(textArea, 'This is a #test post with #hashtags');
      
      const postButton = screen.getByRole('button', { name: /post/i });
      await userEvent.click(postButton);
      
      await waitFor(() => {
        expect(mockOnPost).toHaveBeenCalledWith(
          expect.objectContaining({
            tags: ['test', 'hashtags']
          })
        );
      });
    });

    it('should extract mentions from content', async () => {
      const mockOnPost = jest.fn();
      render(<PostComposer onPost={mockOnPost} />);
      
      const textArea = screen.getByPlaceholderText("What's on your mind?");
      await userEvent.type(textArea, 'Hello @alice and @bob');
      
      const postButton = screen.getByRole('button', { name: /post/i });
      await userEvent.click(postButton);
      
      await waitFor(() => {
        expect(mockOnPost).toHaveBeenCalledWith(
          expect.objectContaining({
            mentions: ['alice', 'bob']
          })
        );
      });
    });

    it('should show hashtag and mention counts', async () => {
      render(<PostComposer />);
      
      const textArea = screen.getByPlaceholderText("What's on your mind?");
      await userEvent.type(textArea, 'Test #web3 #defi @alice');
      
      await waitFor(() => {
        expect(screen.getByText('2 hashtags')).toBeInTheDocument();
        expect(screen.getByText('1 mention')).toBeInTheDocument();
      });
    });
  });

  describe('Draft Management', () => {
    it('should auto-save drafts when enabled', async () => {
      render(<PostComposer enableDrafts={true} />);
      
      const textArea = screen.getByPlaceholderText("What's on your mind?");
      await userEvent.type(textArea, 'Draft content');
      
      // Wait for debounced auto-save
      await waitFor(() => {
        expect(mockDraftService.saveDraft).toHaveBeenCalledWith(
          'post',
          expect.objectContaining({
            content: 'Draft content'
          })
        );
      }, { timeout: 3000 });
    });

    it('should load existing draft', async () => {
      const mockDraft = {
        content: 'Existing draft content',
        title: 'Draft Title',
        tags: ['draft'],
        mentions: ['user']
      };
      
      mockDraftService.getDraft.mockResolvedValue(mockDraft);
      
      render(<PostComposer enableDrafts={true} />);
      
      const loadDraftButton = screen.getByText(/load draft/i);
      await userEvent.click(loadDraftButton);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Existing draft content')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Draft Title')).toBeInTheDocument();
      });
    });

    it('should clear draft after successful post', async () => {
      const mockOnPost = jest.fn().mockResolvedValue(undefined);
      render(<PostComposer onPost={mockOnPost} enableDrafts={true} />);
      
      const textArea = screen.getByPlaceholderText("What's on your mind?");
      await userEvent.type(textArea, 'Test post');
      
      const postButton = screen.getByRole('button', { name: /post/i });
      await userEvent.click(postButton);
      
      await waitFor(() => {
        expect(mockDraftService.clearDraft).toHaveBeenCalledWith('post');
      });
    });
  });

  describe('Community Selection', () => {
    it('should load user communities', async () => {
      render(<PostComposer enableCommunitySelection={true} />);
      
      await waitFor(() => {
        expect(mockServiceWorkerCache.cacheWithStrategy).toHaveBeenCalledWith(
          '/api/user/communities',
          'communities',
          ['communities', 'user-data']
        );
      });
    });

    it('should show community options in select', async () => {
      render(<PostComposer enableCommunitySelection={true} />);
      
      await waitFor(() => {
        const select = screen.getByRole('combobox');
        expect(select).toBeInTheDocument();
      });
      
      const select = screen.getByRole('combobox');
      await userEvent.click(select);
      
      expect(screen.getByText('General Discussion (1234 members)')).toBeInTheDocument();
      expect(screen.getByText('DeFi Hub (856 members)')).toBeInTheDocument();
    });

    it('should handle community selection', async () => {
      const mockOnPost = jest.fn();
      render(<PostComposer onPost={mockOnPost} enableCommunitySelection={true} />);
      
      await waitFor(() => {
        const select = screen.getByRole('combobox');
        expect(select).toBeInTheDocument();
      });
      
      const select = screen.getByRole('combobox');
      await userEvent.selectOptions(select, 'defi');
      
      const textArea = screen.getByPlaceholderText("What's on your mind?");
      await userEvent.type(textArea, 'DeFi post');
      
      const postButton = screen.getByRole('button', { name: /post/i });
      await userEvent.click(postButton);
      
      await waitFor(() => {
        expect(mockOnPost).toHaveBeenCalledWith(
          expect.objectContaining({
            communityId: 'defi'
          })
        );
      });
    });
  });

  describe('Post Scheduling', () => {
    it('should show scheduler when enabled', async () => {
      render(<PostComposer />);
      
      const scheduleButton = screen.getByRole('button', { name: /schedule/i });
      await userEvent.click(scheduleButton);
      
      expect(screen.getByLabelText(/schedule post/i)).toBeInTheDocument();
    });

    it('should handle scheduled post submission', async () => {
      const mockOnPost = jest.fn();
      render(<PostComposer onPost={mockOnPost} />);
      
      const scheduleButton = screen.getByRole('button', { name: /schedule/i });
      await userEvent.click(scheduleButton);
      
      const dateInput = screen.getByLabelText(/schedule post/i);
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
      await userEvent.type(dateInput, futureDate);
      
      const textArea = screen.getByPlaceholderText("What's on your mind?");
      await userEvent.type(textArea, 'Scheduled post');
      
      const postButton = screen.getByRole('button', { name: /schedule post/i });
      await userEvent.click(postButton);
      
      await waitFor(() => {
        expect(mockOnPost).toHaveBeenCalledWith(
          expect.objectContaining({
            scheduledAt: expect.any(Date)
          })
        );
      });
    });
  });

  describe('Validation', () => {
    it('should prevent posting empty content', async () => {
      render(<PostComposer />);
      
      const postButton = screen.getByRole('button', { name: /post/i });
      expect(postButton).toBeDisabled();
    });

    it('should prevent posting when wallet is not connected', () => {
      mockUseWeb3.mockReturnValue({ ...mockWeb3Context, isConnected: false });
      
      render(<PostComposer />);
      
      const postButton = screen.getByRole('button', { name: /post/i });
      expect(postButton).toBeDisabled();
    });

    it('should show validation error for content over limit', async () => {
      render(<PostComposer maxLength={10} />);
      
      const textArea = screen.getByPlaceholderText("What's on your mind?");
      await userEvent.type(textArea, 'This content is way too long');
      
      const postButton = screen.getByRole('button', { name: /post/i });
      await userEvent.click(postButton);
      
      await waitFor(() => {
        expect(mockToastContext.addToast).toHaveBeenCalledWith(
          expect.stringContaining('too long'),
          'error'
        );
      });
    });

    it('should validate selected community', async () => {
      render(<PostComposer enableCommunitySelection={true} />);
      
      await waitFor(() => {
        const select = screen.getByRole('combobox');
        expect(select).toBeInTheDocument();
      });
      
      // Manually set invalid community ID
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'invalid-community' } });
      
      const textArea = screen.getByPlaceholderText("What's on your mind?");
      await userEvent.type(textArea, 'Test post');
      
      const postButton = screen.getByRole('button', { name: /post/i });
      await userEvent.click(postButton);
      
      await waitFor(() => {
        expect(mockToastContext.addToast).toHaveBeenCalledWith(
          expect.stringContaining('invalid'),
          'error'
        );
      });
    });
  });

  describe('Post Submission', () => {
    it('should handle successful post submission', async () => {
      const mockOnPost = jest.fn().mockResolvedValue(undefined);
      render(<PostComposer onPost={mockOnPost} />);
      
      const textArea = screen.getByPlaceholderText("What's on your mind?");
      await userEvent.type(textArea, 'Test post content');
      
      const postButton = screen.getByRole('button', { name: /post/i });
      await userEvent.click(postButton);
      
      await waitFor(() => {
        expect(mockOnPost).toHaveBeenCalledWith(
          expect.objectContaining({
            content: 'Test post content',
            contentType: 'text',
            tags: [],
            mentions: [],
            media: []
          })
        );
      });
      
      expect(mockToastContext.addToast).toHaveBeenCalledWith(
        'Post created successfully!',
        'success'
      );
    });

    it('should upload media to IPFS before submission', async () => {
      const mockOnPost = jest.fn().mockResolvedValue(undefined);
      render(<PostComposer onPost={mockOnPost} />);
      
      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      const mediaZone = screen.getByTestId('media-upload-zone');
      
      fireEvent.drop(mediaZone, {
        dataTransfer: {
          files: [file]
        }
      });
      
      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });
      
      const textArea = screen.getByPlaceholderText("What's on your mind?");
      await userEvent.type(textArea, 'Post with media');
      
      const postButton = screen.getByRole('button', { name: /post/i });
      await userEvent.click(postButton);
      
      await waitFor(() => {
        expect(mockMediaProcessingService.uploadToIPFS).toHaveBeenCalled();
      });
      
      expect(mockOnPost).toHaveBeenCalledWith(
        expect.objectContaining({
          media: expect.arrayContaining([
            expect.objectContaining({
              ipfsHash: 'bafybeictest'
            })
          ])
        })
      );
    });

    it('should show loading state during submission', async () => {
      const mockOnPost = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<PostComposer onPost={mockOnPost} />);
      
      const textArea = screen.getByPlaceholderText("What's on your mind?");
      await userEvent.type(textArea, 'Test post');
      
      const postButton = screen.getByRole('button', { name: /post/i });
      await userEvent.click(postButton);
      
      expect(screen.getByText('Posting...')).toBeInTheDocument();
      expect(postButton).toBeDisabled();
    });

    it('should handle post submission errors', async () => {
      const mockOnPost = jest.fn().mockRejectedValue(new Error('Network error'));
      render(<PostComposer onPost={mockOnPost} />);
      
      const textArea = screen.getByPlaceholderText("What's on your mind?");
      await userEvent.type(textArea, 'Test post');
      
      const postButton = screen.getByRole('button', { name: /post/i });
      await userEvent.click(postButton);
      
      await waitFor(() => {
        expect(mockToastContext.addToast).toHaveBeenCalledWith(
          'Failed to create post',
          'error'
        );
      });
    });
  });

  describe('Cancel Functionality', () => {
    it('should show confirmation when canceling with content', async () => {
      // Mock window.confirm
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      
      const mockOnCancel = jest.fn();
      render(<PostComposer onCancel={mockOnCancel} />);
      
      const textArea = screen.getByPlaceholderText("What's on your mind?");
      await userEvent.type(textArea, 'Some content');
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(cancelButton);
      
      expect(confirmSpy).toHaveBeenCalledWith(
        'Are you sure you want to discard this post?'
      );
      expect(mockOnCancel).toHaveBeenCalled();
      
      confirmSpy.mockRestore();
    });

    it('should cancel without confirmation when no content', async () => {
      const mockOnCancel = jest.fn();
      render(<PostComposer onCancel={mockOnCancel} />);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(cancelButton);
      
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<PostComposer />);
      
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-label', 'Post content');
      expect(screen.getByRole('button', { name: /add media/i })).toHaveAttribute(
        'title',
        'Add media'
      );
    });

    it('should support keyboard navigation', async () => {
      render(<PostComposer />);
      
      const textArea = screen.getByPlaceholderText("What's on your mind?");
      textArea.focus();
      
      fireEvent.keyDown(textArea, { key: 'Tab' });
      
      expect(screen.getByRole('button', { name: /add media/i })).toHaveFocus();
    });

    it('should announce character count to screen readers', async () => {
      render(<PostComposer />);
      
      const textArea = screen.getByPlaceholderText("What's on your mind?");
      await userEvent.type(textArea, 'Test');
      
      expect(screen.getByRole('status')).toHaveTextContent(/characters remaining/);
    });
  });

  describe('Performance', () => {
    it('should debounce auto-save functionality', async () => {
      render(<PostComposer enableDrafts={true} />);
      
      const textArea = screen.getByPlaceholderText("What's on your mind?");
      
      // Type rapidly
      await userEvent.type(textArea, 'a');
      await userEvent.type(textArea, 'b');
      await userEvent.type(textArea, 'c');
      
      // Should only save once after debounce period
      await waitFor(() => {
        expect(mockDraftService.saveDraft).toHaveBeenCalledTimes(1);
      }, { timeout: 3000 });
    });

    it('should handle large media files efficiently', async () => {
      render(<PostComposer />);
      
      const startTime = performance.now();
      
      const file = new File(['x'.repeat(10 * 1024 * 1024)], 'large.jpg', { 
        type: 'image/jpeg' 
      });
      const mediaZone = screen.getByTestId('media-upload-zone');
      
      fireEvent.drop(mediaZone, {
        dataTransfer: {
          files: [file]
        }
      });
      
      await waitFor(() => {
        expect(mockMediaProcessingService.optimizeImage).toHaveBeenCalled();
      });
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should process within 1 second
    });
  });
});