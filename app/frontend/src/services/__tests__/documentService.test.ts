import { DocumentService } from '../documentService';
import { mockDocuments, mockCategories, mockAnalytics } from '../../components/Support/__tests__/mocks/documentMocks';

// Mock fetch for API calls
global.fetch = jest.fn();

describe('DocumentService', () => {
  let documentService: DocumentService;

  beforeEach(() => {
    documentService = new DocumentService();
    jest.clearAllMocks();
  });

  describe('Document Loading', () => {
    test('loads all documents successfully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ documents: mockDocuments })
      });

      const documents = await documentService.loadDocuments();

      expect(documents).toEqual(mockDocuments);
      expect(fetch).toHaveBeenCalledWith('/api/support/documents');
    });

    test('handles API errors gracefully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(documentService.loadDocuments()).rejects.toThrow('Failed to load documents');
    });

    test('handles network errors', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(documentService.loadDocuments()).rejects.toThrow('Network error');
    });

    test('validates document structure', async () => {
      const invalidDocuments = [
        { id: 'test', title: 'Test' } // Missing required fields
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ documents: invalidDocuments })
      });

      await expect(documentService.loadDocuments()).rejects.toThrow('Invalid document structure');
    });

    test('loads document by ID', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDocuments[0]
      });

      const document = await documentService.getDocumentById('beginners-guide');

      expect(document).toEqual(mockDocuments[0]);
      expect(fetch).toHaveBeenCalledWith('/api/support/documents/beginners-guide');
    });

    test('returns null for non-existent document', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const document = await documentService.getDocumentById('non-existent');

      expect(document).toBeNull();
    });
  });

  describe('Document Search', () => {
    beforeEach(() => {
      documentService.documents = mockDocuments;
    });

    test('searches documents by title', () => {
      const results = documentService.searchDocuments('Beginner');

      expect(results).toHaveLength(1);
      expect(results[0].title).toContain('Beginner');
    });

    test('searches documents by content', () => {
      const results = documentService.searchDocuments('wallet setup');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(doc => doc.content.includes('wallet'))).toBe(true);
    });

    test('searches documents by tags', () => {
      const results = documentService.searchDocuments('security');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(doc => doc.tags.includes('security'))).toBe(true);
    });

    test('returns empty array for no matches', () => {
      const results = documentService.searchDocuments('nonexistent');

      expect(results).toHaveLength(0);
    });

    test('handles empty search query', () => {
      const results = documentService.searchDocuments('');

      expect(results).toEqual(mockDocuments);
    });

    test('performs case-insensitive search', () => {
      const results = documentService.searchDocuments('SECURITY');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(doc => doc.title.toLowerCase().includes('security'))).toBe(true);
    });

    test('ranks search results by relevance', () => {
      const results = documentService.searchDocuments('guide');

      // Results should be sorted by relevance (title matches first, then content)
      expect(results[0].title).toContain('Guide');
    });

    test('implements fuzzy search for typos', () => {
      const results = documentService.searchDocuments('securtiy'); // Typo in 'security'

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(doc => doc.tags.includes('security'))).toBe(true);
    });
  });

  describe('Document Filtering', () => {
    beforeEach(() => {
      documentService.documents = mockDocuments;
    });

    test('filters documents by category', () => {
      const results = documentService.getDocumentsByCategory('security');

      expect(results).toHaveLength(1);
      expect(results[0].category).toBe('security');
    });

    test('filters documents by difficulty', () => {
      const results = documentService.getDocumentsByDifficulty('beginner');

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(doc => doc.difficulty === 'beginner')).toBe(true);
    });

    test('filters documents by tags', () => {
      const results = documentService.getDocumentsByTag('wallet');

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(doc => doc.tags.includes('wallet'))).toBe(true);
    });

    test('returns empty array for invalid category', () => {
      const results = documentService.getDocumentsByCategory('invalid');

      expect(results).toHaveLength(0);
    });
  });

  describe('Document Sorting', () => {
    beforeEach(() => {
      documentService.documents = mockDocuments;
    });

    test('sorts documents by popularity', () => {
      const results = documentService.sortDocuments('popularity');

      expect(results[0].popularity).toBeGreaterThanOrEqual(results[1].popularity);
    });

    test('sorts documents by recency', () => {
      const results = documentService.sortDocuments('recency');

      const firstDate = new Date(results[0].lastUpdated);
      const secondDate = new Date(results[1].lastUpdated);
      expect(firstDate.getTime()).toBeGreaterThanOrEqual(secondDate.getTime());
    });

    test('sorts documents by difficulty', () => {
      const results = documentService.sortDocuments('difficulty');

      const difficultyOrder = ['beginner', 'intermediate', 'advanced'];
      const firstIndex = difficultyOrder.indexOf(results[0].difficulty);
      const secondIndex = difficultyOrder.indexOf(results[1].difficulty);
      expect(firstIndex).toBeLessThanOrEqual(secondIndex);
    });

    test('sorts documents by read time', () => {
      const results = documentService.sortDocuments('readTime');

      expect(results[0].readTime).toBeLessThanOrEqual(results[1].readTime);
    });

    test('handles invalid sort option', () => {
      const results = documentService.sortDocuments('invalid' as any);

      // Should return documents in original order
      expect(results).toEqual(mockDocuments);
    });
  });

  describe('Document Analytics', () => {
    test('tracks document views', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await documentService.trackDocumentView('beginners-guide');

      expect(fetch).toHaveBeenCalledWith('/api/support/analytics/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: 'beginners-guide' })
      });
    });

    test('tracks search queries', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await documentService.trackSearchQuery('wallet setup');

      expect(fetch).toHaveBeenCalledWith('/api/support/analytics/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'wallet setup' })
      });
    });

    test('gets document analytics', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalytics
      });

      const analytics = await documentService.getDocumentAnalytics();

      expect(analytics).toEqual(mockAnalytics);
      expect(fetch).toHaveBeenCalledWith('/api/support/analytics');
    });

    test('handles analytics API errors gracefully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      // Should not throw error, just log it
      await expect(documentService.trackDocumentView('test')).resolves.not.toThrow();
    });
  });

  describe('Document Caching', () => {
    test('caches loaded documents', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ documents: mockDocuments })
      });

      // First call
      await documentService.loadDocuments();
      
      // Second call should use cache
      const documents = await documentService.loadDocuments();

      expect(documents).toEqual(mockDocuments);
      expect(fetch).toHaveBeenCalledTimes(1); // Only called once due to caching
    });

    test('invalidates cache when specified', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ documents: mockDocuments })
      });

      // First call
      await documentService.loadDocuments();

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ documents: [] })
      });

      // Second call with cache invalidation
      const documents = await documentService.loadDocuments(true);

      expect(documents).toEqual([]);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    test('respects cache expiration', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ documents: mockDocuments })
      });

      // First call
      await documentService.loadDocuments();

      // Mock expired cache
      documentService.cacheExpiry = Date.now() - 1000;

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ documents: [] })
      });

      // Should fetch again due to expired cache
      const documents = await documentService.loadDocuments();

      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Document Validation', () => {
    test('validates required document fields', () => {
      const invalidDoc = { id: 'test' }; // Missing required fields

      expect(() => documentService.validateDocument(invalidDoc as any)).toThrow();
    });

    test('validates document metadata types', () => {
      const invalidDoc = {
        ...mockDocuments[0],
        readTime: 'invalid' // Should be number
      };

      expect(() => documentService.validateDocument(invalidDoc as any)).toThrow();
    });

    test('validates document categories', () => {
      const invalidDoc = {
        ...mockDocuments[0],
        category: 'invalid-category'
      };

      expect(() => documentService.validateDocument(invalidDoc)).toThrow();
    });

    test('validates document difficulty levels', () => {
      const invalidDoc = {
        ...mockDocuments[0],
        difficulty: 'invalid-difficulty'
      };

      expect(() => documentService.validateDocument(invalidDoc as any)).toThrow();
    });

    test('accepts valid documents', () => {
      expect(() => documentService.validateDocument(mockDocuments[0])).not.toThrow();
    });
  });

  describe('Performance Optimization', () => {
    test('implements debounced search', async () => {
      const searchSpy = jest.spyOn(documentService, 'searchDocuments');
      documentService.documents = mockDocuments;

      // Rapid search calls
      documentService.debouncedSearch('test1');
      documentService.debouncedSearch('test2');
      documentService.debouncedSearch('test3');

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 350));

      // Should only call search once with the last query
      expect(searchSpy).toHaveBeenCalledTimes(1);
      expect(searchSpy).toHaveBeenCalledWith('test3');
    });

    test('lazy loads document content', async () => {
      const partialDoc = {
        ...mockDocuments[0],
        content: undefined
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => partialDoc
      });

      const document = await documentService.getDocumentById('beginners-guide');

      expect(document.content).toBeUndefined();

      // Load full content
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDocuments[0]
      });

      const fullDocument = await documentService.loadDocumentContent('beginners-guide');

      expect(fullDocument.content).toBeDefined();
    });

    test('implements request deduplication', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDocuments[0]
      });

      // Multiple simultaneous requests for same document
      const promises = [
        documentService.getDocumentById('beginners-guide'),
        documentService.getDocumentById('beginners-guide'),
        documentService.getDocumentById('beginners-guide')
      ];

      await Promise.all(promises);

      // Should only make one API call
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });
});