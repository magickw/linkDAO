import { thumbnailService, ThumbnailData } from '../thumbnailService';

// Mock DOM APIs
const mockImage = {
  onload: null as (() => void) | null,
  onerror: null as (() => void) | null,
  naturalWidth: 800,
  naturalHeight: 600,
  crossOrigin: '',
  src: ''
};

const mockVideo = {
  onloadedmetadata: null as (() => void) | null,
  onseeked: null as (() => void) | null,
  onerror: null as (() => void) | null,
  currentTime: 0,
  duration: 120,
  videoWidth: 1920,
  videoHeight: 1080,
  crossOrigin: '',
  muted: false,
  preload: '',
  src: ''
};

const mockCanvas = {
  width: 0,
  height: 0,
  toDataURL: jest.fn(() => 'data:image/jpeg;base64,mockdata')
};

const mockContext = {
  drawImage: jest.fn()
};

// Mock global objects
Object.defineProperty(global, 'Image', {
  value: jest.fn(() => mockImage),
  writable: true
});

Object.defineProperty(global, 'HTMLVideoElement', {
  value: jest.fn(() => mockVideo),
  writable: true
});

// Mock document.createElement
const originalCreateElement = document.createElement;
document.createElement = jest.fn((tagName: string) => {
  if (tagName === 'video') {
    return mockVideo as any;
  }
  if (tagName === 'canvas') {
    const canvas = mockCanvas as any;
    canvas.getContext = jest.fn(() => mockContext);
    return canvas;
  }
  return originalCreateElement.call(document, tagName);
});

// Mock fetch
global.fetch = jest.fn();

describe('ThumbnailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    thumbnailService.clearCache();
    
    // Reset mock objects
    mockImage.onload = null;
    mockImage.onerror = null;
    mockVideo.onloadedmetadata = null;
    mockVideo.onseeked = null;
    mockVideo.onerror = null;
    mockCanvas.toDataURL.mockReturnValue('data:image/jpeg;base64,mockdata');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateThumbnail', () => {
    it('should generate thumbnail for image URLs', async () => {
      const imageUrl = 'https://example.com/image.jpg';
      
      // Simulate successful image load
      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.onload();
        }
      }, 0);

      const result = await thumbnailService.generateThumbnail(imageUrl, 'image');

      expect(result).toEqual({
        url: imageUrl,
        width: 800,
        height: 600,
        type: 'image'
      });
    });

    it('should generate thumbnail for video URLs', async () => {
      const videoUrl = 'https://example.com/video.mp4';
      
      // Simulate successful video load and seek
      setTimeout(() => {
        if (mockVideo.onloadedmetadata) {
          mockVideo.onloadedmetadata();
        }
      }, 0);

      setTimeout(() => {
        if (mockVideo.onseeked) {
          mockVideo.onseeked();
        }
      }, 10);

      const result = await thumbnailService.generateThumbnail(videoUrl, 'video');

      expect(result).toEqual({
        url: 'data:image/jpeg;base64,mockdata',
        width: 1920,
        height: 1080,
        type: 'video'
      });
      expect(mockContext.drawImage).toHaveBeenCalledWith(mockVideo, 0, 0);
    });

    it('should generate thumbnail for link URLs', async () => {
      const linkUrl = 'https://example.com/article';
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          image: 'https://example.com/og-image.jpg',
          imageWidth: 1200,
          imageHeight: 630,
          title: 'Example Article',
          description: 'This is an example article',
          siteName: 'Example Site'
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await thumbnailService.generateThumbnail(linkUrl, 'link');

      expect(result).toEqual({
        url: 'https://example.com/og-image.jpg',
        width: 1200,
        height: 630,
        type: 'link',
        title: 'Example Article',
        description: 'This is an example article',
        siteName: 'Example Site'
      });
    });

    it('should auto-detect media type from URL', async () => {
      const imageUrl = 'https://example.com/photo.png';
      
      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.onload();
        }
      }, 0);

      const result = await thumbnailService.generateThumbnail(imageUrl);

      expect(result.type).toBe('image');
    });

    it('should return fallback thumbnail on image load error', async () => {
      const imageUrl = 'https://example.com/broken-image.jpg';
      
      setTimeout(() => {
        if (mockImage.onerror) {
          mockImage.onerror();
        }
      }, 0);

      const result = await thumbnailService.generateThumbnail(imageUrl, 'image');

      expect(result.type).toBe('fallback');
      expect(result.error).toBe('Failed to load image');
    });

    it('should return fallback thumbnail on video load error', async () => {
      const videoUrl = 'https://example.com/broken-video.mp4';
      
      setTimeout(() => {
        if (mockVideo.onerror) {
          mockVideo.onerror();
        }
      }, 0);

      const result = await thumbnailService.generateThumbnail(videoUrl, 'video');

      expect(result.type).toBe('fallback');
      expect(result.error).toBe('Failed to load video');
    });

    it('should return fallback thumbnail on link preview error', async () => {
      const linkUrl = 'https://example.com/article';
      
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await thumbnailService.generateThumbnail(linkUrl, 'link');

      expect(result.type).toBe('fallback');
      expect(result.error).toBe('Network error');
    });

    it('should handle image load timeout', async () => {
      const imageUrl = 'https://example.com/slow-image.jpg';
      
      // Don't trigger onload or onerror to simulate timeout
      
      const result = await thumbnailService.generateThumbnail(imageUrl, 'image');

      expect(result.type).toBe('fallback');
      expect(result.error).toBe('Image load timeout');
    }, 15000);

    it('should handle video load timeout', async () => {
      const videoUrl = 'https://example.com/slow-video.mp4';
      
      // Don't trigger callbacks to simulate timeout
      
      const result = await thumbnailService.generateThumbnail(videoUrl, 'video');

      expect(result.type).toBe('fallback');
      expect(result.error).toBe('Video load timeout');
    }, 20000);
  });

  describe('caching', () => {
    it('should cache thumbnail results', async () => {
      const imageUrl = 'https://example.com/image.jpg';
      
      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.onload();
        }
      }, 0);

      // First call
      const result1 = await thumbnailService.generateThumbnail(imageUrl, 'image');
      
      // Second call should return cached result
      const result2 = await thumbnailService.generateThumbnail(imageUrl, 'image');

      expect(result1).toEqual(result2);
      expect(global.Image).toHaveBeenCalledTimes(1); // Only called once due to caching
    });

    it('should clear cache', async () => {
      const imageUrl = 'https://example.com/image.jpg';
      
      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.onload();
        }
      }, 0);

      await thumbnailService.generateThumbnail(imageUrl, 'image');
      expect(thumbnailService.getCacheSize()).toBe(1);

      thumbnailService.clearCache();
      expect(thumbnailService.getCacheSize()).toBe(0);
    });
  });

  describe('media type detection', () => {
    it('should detect image extensions', async () => {
      const urls = [
        'https://example.com/photo.jpg',
        'https://example.com/image.png',
        'https://example.com/graphic.gif',
        'https://example.com/icon.svg'
      ];

      for (const url of urls) {
        setTimeout(() => {
          if (mockImage.onload) {
            mockImage.onload();
          }
        }, 0);

        const result = await thumbnailService.generateThumbnail(url);
        expect(result.type).toBe('image');
      }
    });

    it('should detect video extensions', async () => {
      const urls = [
        'https://example.com/video.mp4',
        'https://example.com/clip.webm',
        'https://example.com/movie.avi'
      ];

      for (const url of urls) {
        setTimeout(() => {
          if (mockVideo.onloadedmetadata) {
            mockVideo.onloadedmetadata();
          }
        }, 0);

        setTimeout(() => {
          if (mockVideo.onseeked) {
            mockVideo.onseeked();
          }
        }, 10);

        const result = await thumbnailService.generateThumbnail(url);
        expect(result.type).toBe('video');
      }
    });

    it('should default to link for unknown extensions', async () => {
      const linkUrl = 'https://example.com/article';
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          image: 'https://example.com/og-image.jpg',
          title: 'Article'
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await thumbnailService.generateThumbnail(linkUrl);
      expect(result.type).toBe('link');
    });
  });

  describe('preloadThumbnails', () => {
    it('should preload multiple thumbnails', async () => {
      const urls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.png',
        'https://example.com/video.mp4'
      ];

      let imageCallCount = 0;
      let videoCallCount = 0;

      (global.Image as jest.Mock).mockImplementation(() => {
        const img = { ...mockImage };
        setTimeout(() => {
          if (img.onload) {
            img.onload();
          }
        }, 0);
        imageCallCount++;
        return img;
      });

      document.createElement = jest.fn((tagName: string) => {
        if (tagName === 'video') {
          const video = { ...mockVideo };
          setTimeout(() => {
            if (video.onloadedmetadata) {
              video.onloadedmetadata();
            }
          }, 0);
          setTimeout(() => {
            if (video.onseeked) {
              video.onseeked();
            }
          }, 10);
          videoCallCount++;
          return video as any;
        }
        if (tagName === 'canvas') {
          const canvas = mockCanvas as any;
          canvas.getContext = jest.fn(() => mockContext);
          return canvas;
        }
        return originalCreateElement.call(document, tagName);
      });

      const results = await thumbnailService.preloadThumbnails(urls);

      expect(results).toHaveLength(3);
      expect(results[0].type).toBe('image');
      expect(results[1].type).toBe('image');
      expect(results[2].type).toBe('video');
    }, 10000);

    it('should handle mixed success and failure in preload', async () => {
      const urls = [
        'https://example.com/good-image.jpg',
        'https://example.com/bad-image.jpg'
      ];

      let callCount = 0;
      (global.Image as jest.Mock).mockImplementation(() => {
        const img = { ...mockImage };
        if (callCount === 0) {
          // First image succeeds
          setTimeout(() => {
            if (img.onload) {
              img.onload();
            }
          }, 0);
        } else {
          // Second image fails
          setTimeout(() => {
            if (img.onerror) {
              img.onerror();
            }
          }, 0);
        }
        callCount++;
        return img;
      });

      const results = await thumbnailService.preloadThumbnails(urls);

      expect(results).toHaveLength(2);
      expect(results[0].type).toBe('image');
      expect(results[1].type).toBe('fallback');
    });
  });

  describe('extractMediaMetadata', () => {
    it('should extract metadata for images', async () => {
      const imageUrl = 'https://example.com/image.jpg';
      
      (global.Image as jest.Mock).mockImplementation(() => {
        const img = { ...mockImage };
        setTimeout(() => {
          if (img.onload) {
            img.onload();
          }
        }, 0);
        return img;
      });

      const metadata = await thumbnailService.extractMediaMetadata(imageUrl);

      expect(metadata.type).toBe('image');
      expect(metadata.url).toBe(imageUrl);
      expect(metadata.thumbnail).toBe(imageUrl);
      expect(metadata.width).toBe(800);
      expect(metadata.height).toBe(600);
    });

    it('should extract metadata for videos including duration', async () => {
      const videoUrl = 'https://example.com/video.mp4';
      
      document.createElement = jest.fn((tagName: string) => {
        if (tagName === 'video') {
          const video = { ...mockVideo };
          setTimeout(() => {
            if (video.onloadedmetadata) {
              video.onloadedmetadata();
            }
          }, 0);
          setTimeout(() => {
            if (video.onseeked) {
              video.onseeked();
            }
          }, 10);
          return video as any;
        }
        if (tagName === 'canvas') {
          const canvas = mockCanvas as any;
          canvas.getContext = jest.fn(() => mockContext);
          return canvas;
        }
        return originalCreateElement.call(document, tagName);
      });

      const metadata = await thumbnailService.extractMediaMetadata(videoUrl);

      expect(metadata.type).toBe('video');
      expect(metadata.duration).toBe(120);
      expect(metadata.width).toBe(1920);
      expect(metadata.height).toBe(1080);
    }, 10000);
  });
});