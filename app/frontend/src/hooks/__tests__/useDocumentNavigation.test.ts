import { renderHook, act } from '@testing-library/react';
import { useDocumentNavigation } from '../useDocumentNavigation';
import { mockDocuments } from '../../components/Support/__tests__/mocks/documentMocks';

// Mock the document service
jest.mock('../../services/documentService', () => ({
  DocumentService: jest.fn().mockImplementation(() => ({
    getDocumentById: jest.fn((id) => 
      Promise.resolve(mockDocuments.find(doc => doc.id === id))
    ),
    getDocumentsByCategory: jest.fn((category) =>
      Promise.resolve(mockDocuments.filter(doc => doc.category === category))
    ),
    getRelatedDocuments: jest.fn((id) =>
      Promise.resolve(mockDocuments.slice(0, 2))
    )
  }))
}));

// Mock router
const mockPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
    query: { id: 'beginners-guide' },
    pathname: '/support/[id]'
  })
}));

describe('useDocumentNavigation Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Document Loading', () => {
    test('loads current document on mount', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useDocumentNavigation());

      expect(result.current.loading).toBe(true);
      expect(result.current.currentDocument).toBeNull();

      await waitForNextUpdate();

      expect(result.current.loading).toBe(false);
      expect(result.current.currentDocument).toEqual(mockDocuments[0]);
    });

    test('handles document loading errors', async () => {
      const mockError = new Error('Document not found');
      jest.mocked(require('../../services/documentService').DocumentService)
        .mockImplementation(() => ({
          getDocumentById: jest.fn().mockRejectedValue(mockError)
        }));

      const { result, waitForNextUpdate } = renderHook(() => useDocumentNavigation());

      await waitForNextUpdate();

      expect(result.current.error).toBe(mockError);
      expect(result.current.currentDocument).toBeNull();
    });

    test('updates document when route changes', async () => {
      const { result, waitForNextUpdate, rerender } = renderHook(() => useDocumentNavigation());

      await waitForNextUpdate();
      expect(result.current.currentDocument?.id).toBe('beginners-guide');

      // Mock route change
      jest.mocked(require('next/router').useRouter).mockReturnValue({
        push: mockPush,
        query: { id: 'security-guide' },
        pathname: '/support/[id]'
      });

      rerender();
      await waitForNextUpdate();

      expect(result.current.currentDocument?.id).toBe('security-guide');
    });
  });

  describe('Navigation Functions', () => {
    test('navigates to document by ID', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useDocumentNavigation());

      await waitForNextUpdate();

      act(() => {
        result.current.navigateToDocument('security-guide');
      });

      expect(mockPush).toHaveBeenCalledWith('/support/security-guide');
    });

    test('navigates to category', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useDocumentNavigation());

      await waitForNextUpdate();

      act(() => {
        result.current.navigateToCategory('security');
      });

      expect(mockPush).toHaveBeenCalledWith('/support?category=security');
    });

    test('navigates to next document in category', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useDocumentNavigation());

      await waitForNextUpdate();

      act(() => {
        result.current.navigateToNext();
      });

      expect(result.current.nextDocument).toBeTruthy();
      expect(mockPush).toHaveBeenCalled();
    });

    test('navigates to previous document in category', async () => {
      // Mock being on second document
      jest.mocked(require('next/router').useRouter).mockReturnValue({
        push: mockPush,
        query: { id: 'security-guide' },
        pathname: '/support/[id]'
      });

      const { result, waitForNextUpdate } = renderHook(() => useDocumentNavigation());

      await waitForNextUpdate();

      act(() => {
        result.current.navigateToPrevious();
      });

      expect(result.current.previousDocument).toBeTruthy();
      expect(mockPush).toHaveBeenCalled();
    });

    test('handles navigation when no next document exists', async () => {
      // Mock being on last document
      jest.mocked(require('../../services/documentService').DocumentService)
        .mockImplementation(() => ({
          getDocumentById: jest.fn(() => Promise.resolve(mockDocuments[3])),
          getDocumentsByCategory: jest.fn(() => Promise.resolve([mockDocuments[3]])),
          getRelatedDocuments: jest.fn(() => Promise.resolve([]))
        }));

      const { result, waitForNextUpdate } = renderHook(() => useDocumentNavigation());

      await waitForNextUpdate();

      act(() => {
        result.current.navigateToNext();
      });

      expect(result.current.nextDocument).toBeNull();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Navigation History', () => {
    test('maintains navigation history', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useDocumentNavigation());

      await waitForNextUpdate();

      expect(result.current.navigationHistory).toHaveLength(1);
      expect(result.current.navigationHistory[0].id).toBe('beginners-guide');

      act(() => {
        result.current.navigateToDocument('security-guide');
      });

      expect(result.current.navigationHistory).toHaveLength(2);
    });

    test('allows going back in history', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useDocumentNavigation());

      await waitForNextUpdate();

      // Navigate to another document
      act(() => {
        result.current.navigateToDocument('security-guide');
      });

      expect(result.current.canGoBack).toBe(true);

      act(() => {
        result.current.goBack();
      });

      expect(mockPush).toHaveBeenCalledWith('/support/beginners-guide');
    });

    test('limits history size', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useDocumentNavigation());

      await waitForNextUpdate();

      // Navigate through many documents
      for (let i = 0; i < 15; i++) {
        act(() => {
          result.current.navigateToDocument(`doc-${i}`);
        });
      }

      // History should be limited to prevent memory issues
      expect(result.current.navigationHistory.length).toBeLessThanOrEqual(10);
    });

    test('clears history when specified', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useDocumentNavigation());

      await waitForNextUpdate();

      act(() => {
        result.current.navigateToDocument('security-guide');
      });

      expect(result.current.navigationHistory).toHaveLength(2);

      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.navigationHistory).toHaveLength(1);
    });
  });

  describe('Related Documents', () => {
    test('loads related documents', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useDocumentNavigation());

      await waitForNextUpdate();

      expect(result.current.relatedDocuments).toHaveLength(2);
      expect(result.current.relatedDocuments[0]).toEqual(mockDocuments[0]);
    });

    test('updates related documents when current document changes', async () => {
      const { result, waitForNextUpdate, rerender } = renderHook(() => useDocumentNavigation());

      await waitForNextUpdate();
      const initialRelated = result.current.relatedDocuments;

      // Change document
      jest.mocked(require('next/router').useRouter).mockReturnValue({
        push: mockPush,
        query: { id: 'security-guide' },
        pathname: '/support/[id]'
      });

      rerender();
      await waitForNextUpdate();

      expect(result.current.relatedDocuments).not.toEqual(initialRelated);
    });
  });

  describe('Document Metadata', () => {
    test('calculates next and previous documents in category', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useDocumentNavigation());

      await waitForNextUpdate();

      expect(result.current.nextDocument).toBeTruthy();
      expect(result.current.previousDocument).toBeNull(); // First document
    });

    test('provides document position in category', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useDocumentNavigation());

      await waitForNextUpdate();

      expect(result.current.documentPosition).toEqual({
        current: 1,
        total: expect.any(Number)
      });
    });

    test('calculates reading progress', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useDocumentNavigation());

      await waitForNextUpdate();

      expect(result.current.readingProgress).toEqual({
        percentage: 0,
        timeRemaining: expect.any(Number),
        wordsRead: 0,
        totalWords: expect.any(Number)
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    test('handles keyboard navigation shortcuts', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useDocumentNavigation());

      await waitForNextUpdate();

      // Mock keyboard event
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        altKey: true
      });

      act(() => {
        result.current.handleKeyboardShortcut(event);
      });

      expect(mockPush).toHaveBeenCalled();
    });

    test('ignores shortcuts when modifier keys not pressed', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useDocumentNavigation());

      await waitForNextUpdate();

      const event = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        altKey: false
      });

      act(() => {
        result.current.handleKeyboardShortcut(event);
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    test('handles search shortcut', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useDocumentNavigation());

      await waitForNextUpdate();

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true
      });

      act(() => {
        result.current.handleKeyboardShortcut(event);
      });

      expect(result.current.searchFocused).toBe(true);
    });
  });

  describe('Performance Optimization', () => {
    test('memoizes expensive calculations', async () => {
      const { result, waitForNextUpdate, rerender } = renderHook(() => useDocumentNavigation());

      await waitForNextUpdate();

      const initialRelated = result.current.relatedDocuments;

      // Rerender without changing dependencies
      rerender();

      // Should return same reference (memoized)
      expect(result.current.relatedDocuments).toBe(initialRelated);
    });

    test('debounces navigation calls', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useDocumentNavigation());

      await waitForNextUpdate();

      // Rapid navigation calls
      act(() => {
        result.current.navigateToDocument('doc1');
        result.current.navigateToDocument('doc2');
        result.current.navigateToDocument('doc3');
      });

      // Should only navigate to the last document
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith('/support/doc3');
    });

    test('cancels pending requests on unmount', async () => {
      const abortSpy = jest.fn();
      global.AbortController = jest.fn(() => ({
        abort: abortSpy,
        signal: {}
      })) as any;

      const { result, waitForNextUpdate, unmount } = renderHook(() => useDocumentNavigation());

      await waitForNextUpdate();

      unmount();

      expect(abortSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('handles navigation errors gracefully', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useDocumentNavigation());

      await waitForNextUpdate();

      // Mock navigation error
      mockPush.mockRejectedValueOnce(new Error('Navigation failed'));

      act(() => {
        result.current.navigateToDocument('invalid-doc');
      });

      expect(result.current.error).toBeTruthy();
    });

    test('retries failed document loads', async () => {
      const mockGetDocument = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockDocuments[0]);

      jest.mocked(require('../../services/documentService').DocumentService)
        .mockImplementation(() => ({
          getDocumentById: mockGetDocument,
          getDocumentsByCategory: jest.fn(() => Promise.resolve([])),
          getRelatedDocuments: jest.fn(() => Promise.resolve([]))
        }));

      const { result, waitForNextUpdate } = renderHook(() => useDocumentNavigation());

      await waitForNextUpdate();

      expect(result.current.error).toBeTruthy();

      act(() => {
        result.current.retry();
      });

      await waitForNextUpdate();

      expect(result.current.currentDocument).toEqual(mockDocuments[0]);
      expect(result.current.error).toBeNull();
    });
  });
});