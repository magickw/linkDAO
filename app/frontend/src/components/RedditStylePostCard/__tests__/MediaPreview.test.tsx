import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MediaPreview from '../MediaPreview';
import { thumbnailService } from '@/services/thumbnailService';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    img: ({ children, ...props }: any) => <img {...props}>{children}</img>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Play: () => <div data-testid="play-icon">▶</div>,
  ExternalLink: () => <div data-testid="external-link-icon">🔗</div>,
  Image: () => <div data-testid="image-icon">🖼</div>,
  Film: () => <div data-testid="film-icon">🎬</div>,
  Link: () => <div data-testid="link-icon">🔗</div>,
  AlertCircle: () => <div data-testid="alert-icon">⚠</div>,
}));

// Mock thumbnail service
jest.mock('@/services/thumbnailService', () => ({
  thumbnailService: {
    generateThumbnail: jest.fn(),
    extractMediaMetadata: jest.fn(),
  },
}));

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
});
window.IntersectionObserver = mockIntersectionObserver;

describe('MediaPreview', () => {
  const mockThumbnailService = thumbnailService as jest.Mocked<typeof thumbnailService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIntersectionObserver.mockClear();
  });

  it('renders loading skeleton initially', () => {
    mockThumbnailService.generateThumbnail.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );
    mockThumbnailService.extractMediaMetadata.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<MediaPreview url="https://example.com/image.jpg" lazy={false} />);

    expect(screen.getByTestId('image-icon')).toBeInTheDocument();
  });

  it('renders image preview correctly', async () => {
    const mockThumbnail = {
      url: 'https://example.com/image.jpg',
      width: 800,
      height: 600,
      type: 'image' as const
    };

    const mockMetadata = {
      type: 'image' as const,
      url: 'https://example.com/image.jpg',
      thumbnail: 'https://example.com/image.jpg',
      width: 800,
      height: 600
    };

    mockThumbnailService.generateThumbnail.mockResolvedValue(mockThumbnail);
    mockThumbnailService.extractMediaMetadata.mockResolvedValue(mockMetadata);

    render(<MediaPreview url="https://example.com/image.jpg" lazy={false} />);

    await waitFor(() => {
      expect(screen.getByAltText('Media preview')).toBeInTheDocument();
    });

    const image = screen.getByAltText('Media preview');
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('renders video preview with play button and duration', async () => {
    const mockThumbnail = {
      url: 'data:image/jpeg;base64,mockdata',
      width: 1920,
      height: 1080,
      type: 'video' as const
    };

    const mockMetadata = {
      type: 'video' as const,
      url: 'https://example.com/video.mp4',
      thumbnail: 'data:image/jpeg;base64,mockdata',
      width: 1920,
      height: 1080,
      duration: 125 // 2:05
    };

    mockThumbnailService.generateThumbnail.mockResolvedValue(mockThumbnail);
    mockThumbnailService.extractMediaMetadata.mockResolvedValue(mockMetadata);

    render(<MediaPreview url="https://example.com/video.mp4" lazy={false} />);

    await waitFor(() => {
      expect(screen.getByAltText('Video preview')).toBeInTheDocument();
    });

    expect(screen.getByTestId('play-icon')).toBeInTheDocument();
    expect(screen.getByText('2:05')).toBeInTheDocument();
  });

  it('renders link preview with title and description', async () => {
    const mockThumbnail = {
      url: 'https://example.com/og-image.jpg',
      width: 1200,
      height: 630,
      type: 'link' as const,
      title: 'Example Article',
      description: 'This is an example article',
      siteName: 'Example Site'
    };

    const mockMetadata = {
      type: 'link' as const,
      url: 'https://example.com/article',
      thumbnail: 'https://example.com/og-image.jpg',
      title: 'Example Article',
      description: 'This is an example article',
      siteName: 'Example Site'
    };

    mockThumbnailService.generateThumbnail.mockResolvedValue(mockThumbnail);
    mockThumbnailService.extractMediaMetadata.mockResolvedValue(mockMetadata);

    render(<MediaPreview url="https://example.com/article" lazy={false} />);

    await waitFor(() => {
      expect(screen.getByText('Example Article')).toBeInTheDocument();
    });

    expect(screen.getByText('This is an example article')).toBeInTheDocument();
    expect(screen.getByText('Example Site')).toBeInTheDocument();
    expect(screen.getByTestId('external-link-icon')).toBeInTheDocument();
  });

  it('renders error state when thumbnail generation fails', async () => {
    const mockError = new Error('Failed to load media');
    mockThumbnailService.generateThumbnail.mockRejectedValue(mockError);
    mockThumbnailService.extractMediaMetadata.mockRejectedValue(mockError);

    render(<MediaPreview url="https://example.com/broken.jpg" lazy={false} />);

    await waitFor(() => {
      expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
    });

    expect(screen.getByText('Failed to load media')).toBeInTheDocument();
  });

  it('handles click events correctly', async () => {
    const mockOnClick = jest.fn();
    const mockThumbnail = {
      url: 'https://example.com/image.jpg',
      width: 800,
      height: 600,
      type: 'image' as const
    };

    const mockMetadata = {
      type: 'image' as const,
      url: 'https://example.com/image.jpg',
      thumbnail: 'https://example.com/image.jpg',
      width: 800,
      height: 600
    };

    mockThumbnailService.generateThumbnail.mockResolvedValue(mockThumbnail);
    mockThumbnailService.extractMediaMetadata.mockResolvedValue(mockMetadata);

    render(
      <MediaPreview 
        url="https://example.com/image.jpg" 
        lazy={false} 
        onClick={mockOnClick}
      />
    );

    await waitFor(() => {
      expect(screen.getByAltText('Media preview')).toBeInTheDocument();
    });

    const container = screen.getByAltText('Media preview').closest('div');
    if (container) {
      fireEvent.click(container);
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    }
  });

  it('implements lazy loading with intersection observer', () => {
    const mockObserve = jest.fn();
    const mockDisconnect = jest.fn();
    
    mockIntersectionObserver.mockReturnValue({
      observe: mockObserve,
      unobserve: jest.fn(),
      disconnect: mockDisconnect,
    });

    render(<MediaPreview url="https://example.com/image.jpg" lazy={true} />);

    expect(mockIntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      {
        rootMargin: '50px',
        threshold: 0.1
      }
    );
    expect(mockObserve).toHaveBeenCalled();
  });

  it('skips lazy loading when lazy=false', async () => {
    const mockThumbnail = {
      url: 'https://example.com/image.jpg',
      width: 800,
      height: 600,
      type: 'image' as const
    };

    const mockMetadata = {
      type: 'image' as const,
      url: 'https://example.com/image.jpg',
      thumbnail: 'https://example.com/image.jpg',
      width: 800,
      height: 600
    };

    mockThumbnailService.generateThumbnail.mockResolvedValue(mockThumbnail);
    mockThumbnailService.extractMediaMetadata.mockResolvedValue(mockMetadata);

    render(<MediaPreview url="https://example.com/image.jpg" lazy={false} />);

    // Should not set up intersection observer
    expect(mockIntersectionObserver).not.toHaveBeenCalled();

    // Should immediately start loading
    await waitFor(() => {
      expect(mockThumbnailService.generateThumbnail).toHaveBeenCalled();
    });
  });

  it('handles image load errors gracefully', async () => {
    const mockThumbnail = {
      url: 'https://example.com/image.jpg',
      width: 800,
      height: 600,
      type: 'image' as const
    };

    const mockMetadata = {
      type: 'image' as const,
      url: 'https://example.com/image.jpg',
      thumbnail: 'https://example.com/image.jpg',
      width: 800,
      height: 600
    };

    mockThumbnailService.generateThumbnail.mockResolvedValue(mockThumbnail);
    mockThumbnailService.extractMediaMetadata.mockResolvedValue(mockMetadata);

    render(<MediaPreview url="https://example.com/image.jpg" lazy={false} />);

    await waitFor(() => {
      expect(screen.getByAltText('Media preview')).toBeInTheDocument();
    });

    const image = screen.getByAltText('Media preview');
    fireEvent.error(image);

    // Should handle the error gracefully without crashing
    expect(image).toBeInTheDocument();
  });

  it('formats video duration correctly', async () => {
    const testCases = [
      { duration: 65, expected: '1:05' },
      { duration: 125, expected: '2:05' },
      { duration: 3661, expected: '61:01' },
      { duration: 30, expected: '0:30' }
    ];

    for (const { duration, expected } of testCases) {
      const mockThumbnail = {
        url: 'data:image/jpeg;base64,mockdata',
        width: 1920,
        height: 1080,
        type: 'video' as const
      };

      const mockMetadata = {
        type: 'video' as const,
        url: 'https://example.com/video.mp4',
        thumbnail: 'data:image/jpeg;base64,mockdata',
        width: 1920,
        height: 1080,
        duration
      };

      mockThumbnailService.generateThumbnail.mockResolvedValue(mockThumbnail);
      mockThumbnailService.extractMediaMetadata.mockResolvedValue(mockMetadata);

      const { unmount } = render(
        <MediaPreview url="https://example.com/video.mp4" lazy={false} />
      );

      await waitFor(() => {
        expect(screen.getByText(expected)).toBeInTheDocument();
      });

      unmount();
    }
  });

  it('shows/hides play button based on showPlayButton prop', async () => {
    const mockThumbnail = {
      url: 'data:image/jpeg;base64,mockdata',
      width: 1920,
      height: 1080,
      type: 'video' as const
    };

    const mockMetadata = {
      type: 'video' as const,
      url: 'https://example.com/video.mp4',
      thumbnail: 'data:image/jpeg;base64,mockdata',
      width: 1920,
      height: 1080,
      duration: 125
    };

    mockThumbnailService.generateThumbnail.mockResolvedValue(mockThumbnail);
    mockThumbnailService.extractMediaMetadata.mockResolvedValue(mockMetadata);

    // Test with showPlayButton=false
    const { rerender } = render(
      <MediaPreview 
        url="https://example.com/video.mp4" 
        lazy={false} 
        showPlayButton={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByAltText('Video preview')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('play-icon')).not.toBeInTheDocument();

    // Test with showPlayButton=true (default)
    rerender(
      <MediaPreview 
        url="https://example.com/video.mp4" 
        lazy={false} 
        showPlayButton={true}
      />
    );

    expect(screen.getByTestId('play-icon')).toBeInTheDocument();
  });

  it('shows/hides link icon based on showLinkIcon prop', async () => {
    const mockThumbnail = {
      url: 'https://example.com/og-image.jpg',
      width: 1200,
      height: 630,
      type: 'link' as const,
      title: 'Example Article',
      siteName: 'Example Site'
    };

    const mockMetadata = {
      type: 'link' as const,
      url: 'https://example.com/article',
      thumbnail: 'https://example.com/og-image.jpg',
      title: 'Example Article',
      siteName: 'Example Site'
    };

    mockThumbnailService.generateThumbnail.mockResolvedValue(mockThumbnail);
    mockThumbnailService.extractMediaMetadata.mockResolvedValue(mockMetadata);

    // Test with showLinkIcon=false
    const { rerender } = render(
      <MediaPreview 
        url="https://example.com/article" 
        lazy={false} 
        showLinkIcon={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Example Article')).toBeInTheDocument();
    });

    const linkIcons = screen.queryAllByTestId('link-icon');
    expect(linkIcons).toHaveLength(0);

    // Test with showLinkIcon=true (default)
    rerender(
      <MediaPreview 
        url="https://example.com/article" 
        lazy={false} 
        showLinkIcon={true}
      />
    );

    expect(screen.getByTestId('link-icon')).toBeInTheDocument();
  });
});