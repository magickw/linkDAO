/**
 * UnifiedImageUpload Component Tests
 * Tests the unified image upload component across all seller contexts
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UnifiedImageUpload } from '../UnifiedImageUpload';
import { useUnifiedImageUpload } from '../../../../hooks/useUnifiedImageUpload';
import { SellerError, SellerErrorType } from '../../../../types/sellerError';

// Mock the hook
jest.mock('../../../../hooks/useUnifiedImageUpload');
const mockUseUnifiedImageUpload = useUnifiedImageUpload as jest.MockedFunction<typeof useUnifiedImageUpload>;

// Mock file creation helper
const createMockFile = (name: string, size: number, type: string): File => {
  const file = new File(['mock content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('UnifiedImageUpload', () => {
  const defaultProps = {
    context: 'profile' as const,
    userId: 'test-user-123',
  };

  const mockHookReturn = {
    isUploading: false,
    progress: [],
    results: [],
    error: null,
    uploadMultiple: jest.fn(),
    deleteImage: jest.fn(),
    clearError: jest.fn(),
    validateFiles: jest.fn(),
  };

  beforeEach(() => {
    mockUseUnifiedImageUpload.mockReturnValue(mockHookReturn);
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render profile image upload interface', () => {
      render(<UnifiedImageUpload {...defaultProps} context="profile" />);
      
      expect(screen.getByText('Profile Picture')).toBeInTheDocument();
      expect(screen.getByText(/Upload a profile picture/)).toBeInTheDocument();
      expect(screen.getByText(/Drop your profile picture here/)).toBeInTheDocument();
    });

    it('should render cover image upload interface', () => {
      render(<UnifiedImageUpload {...defaultProps} context="cover" />);
      
      expect(screen.getByText('Cover Image')).toBeInTheDocument();
      expect(screen.getByText(/Upload a cover image/)).toBeInTheDocument();
      expect(screen.getByText(/Drop your cover image here/)).toBeInTheDocument();
    });

    it('should render listing image upload interface', () => {
      render(<UnifiedImageUpload {...defaultProps} context="listing" />);
      
      expect(screen.getByText('Product Images')).toBeInTheDocument();
      expect(screen.getByText(/Upload up to \d+ product images/)).toBeInTheDocument();
      expect(screen.getByText(/Drop your product images here/)).toBeInTheDocument();
    });

    it('should render custom labels when provided', () => {
      render(
        <UnifiedImageUpload 
          {...defaultProps} 
          label="Custom Label"
          description="Custom description"
          dragText="Custom drag text"
        />
      );
      
      expect(screen.getByText('Custom Label')).toBeInTheDocument();
      expect(screen.getByText('Custom description')).toBeInTheDocument();
      expect(screen.getByText('Custom drag text')).toBeInTheDocument();
    });
  });

  describe('File Selection', () => {
    it('should handle file input change', async () => {
      const user = userEvent.setup();
      mockHookReturn.validateFiles.mockReturnValue({
        valid: [createMockFile('test.jpg', 1000, 'image/jpeg')],
        invalid: [],
      });

      render(<UnifiedImageUpload {...defaultProps} />);
      
      const fileInput = screen.getByRole('button', { name: /browse files/i });
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      const file = createMockFile('test.jpg', 1000, 'image/jpeg');
      
      await user.upload(hiddenInput, file);
      
      expect(mockHookReturn.validateFiles).toHaveBeenCalledWith([file]);
      expect(mockHookReturn.uploadMultiple).toHaveBeenCalledWith([file]);
    });

    it('should handle drag and drop', async () => {
      mockHookReturn.validateFiles.mockReturnValue({
        valid: [createMockFile('test.jpg', 1000, 'image/jpeg')],
        invalid: [],
      });

      render(<UnifiedImageUpload {...defaultProps} />);
      
      const dropZone = screen.getByText(/Drop your profile picture here/).closest('div');
      const file = createMockFile('test.jpg', 1000, 'image/jpeg');
      
      fireEvent.dragEnter(dropZone!, {
        dataTransfer: { files: [file] },
      });
      
      fireEvent.drop(dropZone!, {
        dataTransfer: { files: [file] },
      });
      
      expect(mockHookReturn.validateFiles).toHaveBeenCalledWith([file]);
      expect(mockHookReturn.uploadMultiple).toHaveBeenCalledWith([file]);
    });

    it('should show validation errors for invalid files', async () => {
      const user = userEvent.setup();
      const invalidFile = createMockFile('test.txt', 1000, 'text/plain');
      
      mockHookReturn.validateFiles.mockReturnValue({
        valid: [],
        invalid: [{ file: invalidFile, errors: ['Invalid file type'] }],
      });

      const onUploadError = jest.fn();
      render(<UnifiedImageUpload {...defaultProps} onUploadError={onUploadError} />);
      
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(hiddenInput, invalidFile);
      
      expect(onUploadError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Invalid files')
        })
      );
    });

    it('should enforce file limits', async () => {
      const user = userEvent.setup();
      const files = [
        createMockFile('test1.jpg', 1000, 'image/jpeg'),
        createMockFile('test2.jpg', 1000, 'image/jpeg'),
        createMockFile('test3.jpg', 1000, 'image/jpeg'),
      ];
      
      mockHookReturn.validateFiles.mockReturnValue({
        valid: files,
        invalid: [],
      });

      const onUploadError = jest.fn();
      render(
        <UnifiedImageUpload 
          {...defaultProps} 
          maxFiles={2}
          initialImages={[{ cdnUrl: 'existing.jpg', thumbnails: {}, metadata: {} } as any]}
          onUploadError={onUploadError} 
        />
      );
      
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(hiddenInput, files);
      
      expect(onUploadError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Maximum 2 files allowed')
        })
      );
    });
  });

  describe('Upload Progress', () => {
    it('should display upload progress', () => {
      mockUseUnifiedImageUpload.mockReturnValue({
        ...mockHookReturn,
        isUploading: true,
        progress: [
          { fileName: 'test.jpg', progress: 50, status: 'uploading' },
          { fileName: 'test2.jpg', progress: 100, status: 'completed' },
        ],
      });

      render(<UnifiedImageUpload {...defaultProps} showProgress={true} />);
      
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('test2.jpg')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should show completion indicators', () => {
      mockUseUnifiedImageUpload.mockReturnValue({
        ...mockHookReturn,
        progress: [
          { fileName: 'success.jpg', progress: 100, status: 'completed' },
          { fileName: 'error.jpg', progress: 0, status: 'error' },
        ],
      });

      render(<UnifiedImageUpload {...defaultProps} showProgress={true} />);
      
      // Check for success and error icons (using test IDs or aria-labels would be better)
      const progressBars = document.querySelectorAll('.bg-green-500, .bg-red-500');
      expect(progressBars.length).toBeGreaterThan(0);
    });
  });

  describe('Image Previews', () => {
    it('should display uploaded image previews', () => {
      const mockResults = [
        {
          cdnUrl: 'https://cdn.example.com/image1.jpg',
          thumbnails: { medium: 'https://cdn.example.com/image1-medium.jpg' },
          metadata: { width: 400, height: 400 },
        },
      ];

      mockUseUnifiedImageUpload.mockReturnValue({
        ...mockHookReturn,
        results: mockResults,
      });

      render(<UnifiedImageUpload {...defaultProps} showPreviews={true} />);
      
      const previewImage = screen.getByAltText('Upload 1');
      expect(previewImage).toBeInTheDocument();
      expect(previewImage).toHaveAttribute('src', mockResults[0].thumbnails.medium);
    });

    it('should display initial images', () => {
      const initialImages = [
        {
          cdnUrl: 'https://cdn.example.com/initial.jpg',
          thumbnails: { medium: 'https://cdn.example.com/initial-medium.jpg' },
          metadata: { width: 400, height: 400 },
        },
      ];

      render(
        <UnifiedImageUpload 
          {...defaultProps} 
          initialImages={initialImages}
          showPreviews={true} 
        />
      );
      
      const previewImage = screen.getByAltText('Upload 1');
      expect(previewImage).toBeInTheDocument();
      expect(previewImage).toHaveAttribute('src', initialImages[0].thumbnails.medium);
    });

    it('should handle image removal', async () => {
      const user = userEvent.setup();
      const mockResults = [
        {
          cdnUrl: 'https://cdn.example.com/image1.jpg',
          thumbnails: { medium: 'https://cdn.example.com/image1-medium.jpg' },
          metadata: { width: 400, height: 400 },
        },
      ];

      mockUseUnifiedImageUpload.mockReturnValue({
        ...mockHookReturn,
        results: mockResults,
      });

      const onRemoveImage = jest.fn();
      render(
        <UnifiedImageUpload 
          {...defaultProps} 
          showPreviews={true}
          onRemoveImage={onRemoveImage}
        />
      );
      
      const removeButton = document.querySelector('button[class*="bg-red-500"]');
      expect(removeButton).toBeInTheDocument();
      
      await user.click(removeButton!);
      
      expect(mockHookReturn.deleteImage).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should display error messages', () => {
      const mockError = new SellerError(
        SellerErrorType.VALIDATION_ERROR,
        'Test error message',
        'TEST_ERROR'
      );

      mockUseUnifiedImageUpload.mockReturnValue({
        ...mockHookReturn,
        error: mockError,
      });

      render(<UnifiedImageUpload {...defaultProps} />);
      
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('should allow error dismissal', async () => {
      const user = userEvent.setup();
      const mockError = new SellerError(
        SellerErrorType.VALIDATION_ERROR,
        'Test error message',
        'TEST_ERROR'
      );

      mockUseUnifiedImageUpload.mockReturnValue({
        ...mockHookReturn,
        error: mockError,
      });

      render(<UnifiedImageUpload {...defaultProps} />);
      
      const dismissButton = screen.getByRole('button', { name: /close|dismiss/i });
      await user.click(dismissButton);
      
      expect(mockHookReturn.clearError).toHaveBeenCalled();
    });

    it('should display detailed error information', () => {
      const mockError = new SellerError(
        SellerErrorType.VALIDATION_ERROR,
        'Multiple files failed',
        'BATCH_ERROR',
        {
          errors: [
            { file: 'test1.jpg', error: { message: 'Too large' } },
            { file: 'test2.jpg', error: { message: 'Invalid type' } },
          ],
        }
      );

      mockUseUnifiedImageUpload.mockReturnValue({
        ...mockHookReturn,
        error: mockError,
      });

      render(<UnifiedImageUpload {...defaultProps} />);
      
      expect(screen.getByText(/test1\.jpg.*Too large/)).toBeInTheDocument();
      expect(screen.getByText(/test2\.jpg.*Invalid type/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<UnifiedImageUpload {...defaultProps} />);
      
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
      
      const browseButton = screen.getByRole('button', { name: /browse files/i });
      expect(browseButton).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<UnifiedImageUpload {...defaultProps} />);
      
      const browseButton = screen.getByRole('button', { name: /browse files/i });
      
      await user.tab();
      expect(browseButton).toHaveFocus();
      
      await user.keyboard('{Enter}');
      // File dialog should open (can't test this directly in jsdom)
    });

    it('should have proper focus management', async () => {
      const user = userEvent.setup();
      const mockResults = [
        {
          cdnUrl: 'https://cdn.example.com/image1.jpg',
          thumbnails: { medium: 'https://cdn.example.com/image1-medium.jpg' },
          metadata: { width: 400, height: 400 },
        },
      ];

      mockUseUnifiedImageUpload.mockReturnValue({
        ...mockHookReturn,
        results: mockResults,
      });

      render(<UnifiedImageUpload {...defaultProps} showPreviews={true} />);
      
      const removeButton = document.querySelector('button[class*="bg-red-500"]');
      expect(removeButton).toBeInTheDocument();
      
      await user.tab();
      await user.tab(); // Navigate to remove button
      expect(removeButton).toHaveFocus();
    });
  });

  describe('Context-Specific Behavior', () => {
    it('should enforce single file for profile context', () => {
      render(<UnifiedImageUpload {...defaultProps} context="profile" />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput.multiple).toBe(false);
    });

    it('should allow multiple files for listing context', () => {
      render(<UnifiedImageUpload {...defaultProps} context="listing" />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput.multiple).toBe(true);
    });

    it('should show correct file count for listing context', () => {
      const mockResults = [
        { cdnUrl: 'image1.jpg', thumbnails: {}, metadata: {} },
        { cdnUrl: 'image2.jpg', thumbnails: {}, metadata: {} },
      ];

      mockUseUnifiedImageUpload.mockReturnValue({
        ...mockHookReturn,
        results: mockResults,
      });

      render(<UnifiedImageUpload {...defaultProps} context="listing" maxFiles={10} />);
      
      expect(screen.getByText('2 of 10 files')).toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    it('should call onUploadSuccess when upload completes', () => {
      const onUploadSuccess = jest.fn();
      const mockResults = [
        { cdnUrl: 'image1.jpg', thumbnails: {}, metadata: {} },
      ];

      // Simulate the hook calling onSuccess
      mockUseUnifiedImageUpload.mockImplementation((options) => {
        React.useEffect(() => {
          if (mockResults.length > 0) {
            options.onSuccess?.(mockResults);
          }
        }, []);
        
        return mockHookReturn;
      });

      render(<UnifiedImageUpload {...defaultProps} onUploadSuccess={onUploadSuccess} />);
      
      expect(onUploadSuccess).toHaveBeenCalledWith(mockResults);
    });

    it('should call onFilesSelected when files are chosen', async () => {
      const user = userEvent.setup();
      const onFilesSelected = jest.fn();
      
      mockHookReturn.validateFiles.mockReturnValue({
        valid: [createMockFile('test.jpg', 1000, 'image/jpeg')],
        invalid: [],
      });

      render(<UnifiedImageUpload {...defaultProps} onFilesSelected={onFilesSelected} />);
      
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = createMockFile('test.jpg', 1000, 'image/jpeg');
      
      await user.upload(hiddenInput, file);
      
      expect(onFilesSelected).toHaveBeenCalledWith([file]);
    });
  });
});