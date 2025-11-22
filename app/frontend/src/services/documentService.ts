export interface Document {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  readTime: number; // in minutes
  lastUpdated: string; // ISO date string
  popularity: number;
  tags: string[];
  content: string;
  author: string;
  version: string;
}

export interface DocumentAnalytics {
  documentViews: Record<string, number>;
  searchQueries: { query: string; count: number }[];
  popularDocuments: string[];
  categoryViews: Record<string, number>;
}

// Simple fuzzy search function
function fuzzyMatch(query: string, text: string): boolean {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Direct match
  if (textLower.includes(queryLower)) {
    return true;
  }
  
  // For short queries (<= 8 characters), check for typos with 1 character difference
  if (query.length <= 8) {
    // Check each word in the text
    const words = textLower.split(/\s+/);
    for (const word of words) {
      if (word.length >= query.length - 1 && word.length <= query.length + 1) {
        // Special case for transposition (swapped characters)
        if (query.length === word.length) {
          let differences = 0;
          let transpositions = 0;
          
          for (let i = 0; i < query.length; i++) {
            if (queryLower[i] !== word[i]) {
              differences++;
              // Check if it's a transposition
              if (i < query.length - 1 && 
                  queryLower[i] === word[i + 1] && 
                  queryLower[i + 1] === word[i]) {
                transpositions++;
                i++; // Skip the next character as it's part of the transposition
              }
            }
          }
          
          // Allow 1 transposition or up to 1 difference
          if (transpositions === 1 && differences === 2 || differences <= 1) {
            return true;
          }
        } else {
          // Different lengths - check for insertion/deletion
          let differences = 0;
          const minLength = Math.min(query.length, word.length);
          
          for (let i = 0; i < minLength; i++) {
            if (queryLower[i] !== word[i]) {
              differences++;
              if (differences > 1) break;
            }
          }
          
          // Also check for insertion/deletion at the end
          if (Math.abs(query.length - word.length) === 1) {
            differences += 1;
          }
          
          // Allow one character difference
          if (differences <= 1) {
            return true;
          }
        }
      }
    }
  } else {
    // For longer queries, check if 80% of characters match
    let matches = 0;
    for (let i = 0; i < Math.min(query.length, text.length); i++) {
      if (queryLower[i] === textLower[i]) {
        matches++;
      }
    }
    if (matches / query.length >= 0.8) {
      return true;
    }
  }
  
  return false;
}

export class DocumentService {
  documents: Document[] = [];
  cacheExpiry: number = 0;
  cacheTimeout: number = 5 * 60 * 1000; // 5 minutes
  private searchTimeout: NodeJS.Timeout | null = null;
  private pendingRequests: Map<string, Promise<any>> = new Map();

  constructor() {
    this.cacheExpiry = Date.now() + this.cacheTimeout;
  }

  async loadDocuments(invalidateCache: boolean = false): Promise<Document[]> {
    // Check if we have valid cached documents
    if (!invalidateCache && this.documents.length > 0 && Date.now() < this.cacheExpiry) {
      return this.documents;
    }

    try {
      const response = await fetch('/api/support/documents');
      if (!response) {
        throw new Error('No response from server');
      }
      
      if (!response.ok) {
        throw new Error('Failed to load documents');
      }
      
      const data = await response.json();
      
      // Validate document structure
      if (data.documents) {
        data.documents.forEach((doc: any) => this.validateDocument(doc));
        this.documents = data.documents;
        this.cacheExpiry = Date.now() + this.cacheTimeout;
        return this.documents;
      }
      
      throw new Error('Invalid document structure');
    } catch (error) {
      console.error('Error loading documents:', error);
      throw error;
    }
  }

  async getDocumentById(id: string): Promise<Document | null> {
    // Implement request deduplication
    const requestKey = `document_${id}`;
    if (this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey);
    }

    const requestPromise = this._fetchDocumentById(id);
    this.pendingRequests.set(requestKey, requestPromise);
    
    try {
      return await requestPromise;
    } finally {
      this.pendingRequests.delete(requestKey);
    }
  }

  private async _fetchDocumentById(id: string): Promise<Document | null> {
    try {
      const response = await fetch(`/api/support/documents/${id}`);
      if (!response) {
        throw new Error('No response from server');
      }
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Failed to load document');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error loading document:', error);
      throw error;
    }
  }

  searchDocuments(query: string): Document[] {
    if (!query) return this.documents;
    
    const lowerQuery = query.toLowerCase();
    
    return this.documents.filter(doc => {
      const titleMatch = doc.title.toLowerCase().includes(lowerQuery);
      const descriptionMatch = doc.description.toLowerCase().includes(lowerQuery);
      const tagMatch = doc.tags.some(tag => tag.toLowerCase().includes(lowerQuery));
      const fuzzyTitleMatch = fuzzyMatch(query, doc.title);
      const fuzzyDescriptionMatch = fuzzyMatch(query, doc.description);
      const fuzzyTagMatch = doc.tags.some(tag => fuzzyMatch(query, tag));
      
      return titleMatch || descriptionMatch || tagMatch || fuzzyTitleMatch || fuzzyDescriptionMatch || fuzzyTagMatch;
    }).sort((a, b) => {
      // Simple relevance scoring
      const aScore = this.calculateRelevanceScore(a, lowerQuery);
      const bScore = this.calculateRelevanceScore(b, lowerQuery);
      return bScore - aScore; // Higher scores first
    });
  }

  private calculateRelevanceScore(document: Document, query: string): number {
    let score = 0;
    
    // Exact title match gets highest score
    if (document.title.toLowerCase() === query) {
      score += 100;
    } else if (document.title.toLowerCase().includes(query)) {
      // Partial title match
      score += 50;
    }
    
    // Description match
    if (document.description.toLowerCase().includes(query)) {
      score += 20;
    }
    
    // Content match (lower weight)
    if (document.content.toLowerCase().includes(query)) {
      score += 5;
    }
    
    // Tag match
    if (document.tags.some(tag => tag.toLowerCase().includes(query))) {
      score += 15;
    }
    
    // Bonus for exact matches in title (case insensitive)
    if (document.title.toLowerCase().includes(query)) {
      score += 10;
    }
    
    return score;
  }

  debouncedSearch(query: string): Promise<Document[]> {
    return new Promise((resolve) => {
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }
      
      this.searchTimeout = setTimeout(() => {
        const results = this.searchDocuments(query);
        resolve(results);
      }, 300);
    });
  }

  getDocumentsByCategory(category: string): Document[] {
    return this.documents.filter(doc => doc.category === category);
  }

  getDocumentsByDifficulty(difficulty: string): Document[] {
    return this.documents.filter(doc => doc.difficulty === difficulty);
  }

  getDocumentsByTag(tag: string): Document[] {
    return this.documents.filter(doc => doc.tags.includes(tag));
  }

  sortDocuments(sortBy: 'popularity' | 'recency' | 'difficulty' | 'readTime'): Document[] {
    const docs = [...this.documents];
    
    switch (sortBy) {
      case 'popularity':
        return docs.sort((a, b) => b.popularity - a.popularity);
      case 'recency':
        return docs.sort((a, b) => 
          new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
        );
      case 'difficulty':
        const difficultyOrder = ['beginner', 'intermediate', 'advanced'];
        return docs.sort((a, b) => 
          difficultyOrder.indexOf(a.difficulty) - difficultyOrder.indexOf(b.difficulty)
        );
      case 'readTime':
        return docs.sort((a, b) => a.readTime - b.readTime);
      default:
        return docs;
    }
  }

  async trackDocumentView(documentId: string): Promise<void> {
    try {
      await fetch('/api/support/analytics/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId })
      });
    } catch (error) {
      console.error('Error tracking document view:', error);
      // Don't throw error as this is analytics data
    }
  }

  async trackSearchQuery(query: string): Promise<void> {
    try {
      await fetch('/api/support/analytics/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
    } catch (error) {
      console.error('Error tracking search query:', error);
      // Don't throw error as this is analytics data
    }
  }

  async getDocumentAnalytics(): Promise<DocumentAnalytics> {
    try {
      const response = await fetch('/api/support/analytics');
      if (!response) {
        throw new Error('No response from server');
      }
      
      if (!response.ok) {
        throw new Error('Failed to load analytics');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error loading analytics:', error);
      throw error;
    }
  }

  validateDocument(document: any): asserts document is Document {
    if (!document.id || !document.title || !document.description || !document.category || 
        !document.difficulty || !document.readTime || !document.lastUpdated || 
        !document.popularity || !document.tags || !document.content || 
        !document.author || !document.version) {
      throw new Error('Invalid document structure: missing required fields');
    }
    
    if (typeof document.readTime !== 'number') {
      throw new Error('Invalid document structure: readTime must be a number');
    }
    
    if (!['beginner', 'intermediate', 'advanced'].includes(document.difficulty)) {
      throw new Error('Invalid document structure: difficulty must be beginner, intermediate, or advanced');
    }
    
    if (!Array.isArray(document.tags)) {
      throw new Error('Invalid document structure: tags must be an array');
    }
    
    // Validate that category is one of the expected values
    const validCategories = ['getting-started', 'security', 'troubleshooting', 'advanced'];
    if (!validCategories.includes(document.category)) {
      throw new Error(`Invalid document structure: category must be one of ${validCategories.join(', ')}`);
    }
  }

  async loadDocumentContent(documentId: string): Promise<Document> {
    try {
      const response = await fetch(`/api/support/documents/${documentId}/content`);
      if (!response) {
        throw new Error('No response from server');
      }
      
      if (!response.ok) {
        throw new Error('Failed to load document content');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error loading document content:', error);
      throw error;
    }
  }
}

export const documentService = new DocumentService();