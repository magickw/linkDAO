import { renderHook, act } from '@testing-library/react';
import useDocumentNavigation from '../useDocumentNavigation';

const mockDocuments = [
  {
    id: 'doc1',
    title: 'Getting Started',
    description: 'Basic guide',
    category: 'getting-started',
    type: 'guide',
    difficulty: 'beginner',
    readTime: '5 min',
    popularity: 90,
    views: 1000,
    lastUpdated: '2024-01-01',
    tags: ['basics', 'setup']
  },
  {
    id: 'doc2',
    title: 'Advanced Setup',
    description: 'Advanced configuration',
    category: 'getting-started',
    type: 'guide',
    difficulty: 'advanced',
    readTime: '15 min',
    popularity: 75,
    views: 500,
    lastUpdated: '2024-01-02',
    tags: ['advanced', 'setup']
  },
  {
    id: 'doc3',
    title: 'Security Guide',
    description: 'Security best practices',
    category: 'security',
    type: 'guide',
    difficulty: 'intermediate',
    readTime: '10 min',
    popularity: 85,
    views: 800,
    lastUpdated: '2024-01-03',
    tags: ['security', 'safety']
  }
];

describe('useDocumentNavigation', () => {
  beforeEach(() => {
    // Mock window.addEventListener and removeEventListener
    global.window.addEventListener = jest.fn();
    global.window.removeEventListener = jest.fn();
    global.window.pageYOffset = 0;
    global.document.documentElement.scrollHeight = 1000;
    global.window.innerHeight = 800;
  });

  it('should return null values when no document is selected', () => {
    const { result } = renderHook(() => 
      useDocumentNavigation(mockDocuments, null, 'all')
    );

    expect(result.current.currentDocument).toBeNull();
    expect(result.current.previousDocument).toBeNull();
    expect(result.current.nextDocument).toBeNull();
    expect(result.current.relatedDocuments).toEqual([]);
  });

  it('should find current document and calculate navigation', () => {
    const { result } = renderHook(() => 
      useDocumentNavigation(mockDocuments, 'doc1', 'all')
    );

    expect(result.current.currentDocument?.id).toBe('doc1');
    expect(result.current.previousDocument).toBeNull(); // First document
    expect(result.current.nextDocument?.id).toBe('doc2'); // Next by popularity
  });

  it('should calculate related documents based on tags and category', () => {
    const { result } = renderHook(() => 
      useDocumentNavigation(mockDocuments, 'doc1', 'all')
    );

    const relatedIds = result.current.relatedDocuments.map(doc => doc.id);
    expect(relatedIds).toContain('doc2'); // Same category and shared tag
  });

  it('should track navigation history', () => {
    const { result } = renderHook(() => 
      useDocumentNavigation(mockDocuments, 'doc1', 'all')
    );

    act(() => {
      result.current.navigateToDocument('doc2');
    });

    expect(result.current.navigationHistory).toContain('doc2');
    expect(result.current.canGoBack).toBe(true);
  });

  it('should handle going back in navigation', () => {
    const { result } = renderHook(() => 
      useDocumentNavigation(mockDocuments, 'doc1', 'all')
    );

    act(() => {
      result.current.navigateToDocument('doc2');
    });

    act(() => {
      const previousId = result.current.goBack();
      expect(previousId).toBe('doc1');
    });
  });

  it('should filter by category when specified', () => {
    const { result } = renderHook(() => 
      useDocumentNavigation(mockDocuments, 'doc1', 'getting-started')
    );

    // Should only consider documents in the same category
    expect(result.current.categoryDocuments.every(doc => 
      doc.category === 'getting-started'
    )).toBe(true);
  });

  it('should calculate scroll progress', () => {
    // Mock scroll position
    Object.defineProperty(window, 'pageYOffset', { value: 100, writable: true });
    
    const { result } = renderHook(() => 
      useDocumentNavigation(mockDocuments, 'doc1', 'all')
    );

    // Should calculate progress based on scroll position
    expect(typeof result.current.scrollProgress).toBe('number');
    expect(result.current.scrollProgress).toBeGreaterThanOrEqual(0);
    expect(result.current.scrollProgress).toBeLessThanOrEqual(100);
  });
});