/**
 * AI-Powered Suggestion Service
 * Provides intelligent search suggestions using machine learning algorithms
 */

import { Community } from '../models/Community';
import { EnhancedCommunity } from '../types/enhancedSearch';
import { fuzzySearch, tokenizeSearch, FuzzySearchResult } from './fuzzySearchUtils';

// Mock AI model for demonstration - in a real implementation, this would be a proper ML model
class MockAIModel {
  private trainingData: Map<string, string[]> = new Map();

  /**
   * Train the model with user queries and selections
   */
  train(query: string, selection: string): void {
    if (!this.trainingData.has(query)) {
      this.trainingData.set(query, []);
    }
    this.trainingData.get(query)!.push(selection);
  }

  /**
   * Predict likely completions for a partial query
   */
  predict(query: string, candidates: string[], limit: number = 5): string[] {
    // Simple prediction based on training data
    const predictions: Array<{ text: string; score: number }> = [];

    // Check for exact prefix matches in training data
    for (const [trainedQuery, selections] of this.trainingData.entries()) {
      if (trainedQuery.startsWith(query.toLowerCase())) {
        selections.forEach(selection => {
          const existing = predictions.find(p => p.text === selection);
          if (existing) {
            existing.score += 1;
          } else {
            predictions.push({ text: selection, score: 1 });
          }
        });
      }
    }

    // Add fuzzy matches
    const fuzzyResults = fuzzySearch(candidates, query, [], { threshold: 0.7 });
    fuzzyResults.forEach(result => {
      const text = String(result.item);
      const existing = predictions.find(p => p.text === text);
      const score = 1 - (result.score || 0); // Convert distance to similarity
      
      if (existing) {
        existing.score += score;
      } else {
        predictions.push({ text, score });
      }
    });

    // Sort by score and return top results
    return predictions
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(p => p.text);
  }

  /**
   * Get related terms based on semantic similarity
   */
  getRelatedTerms(term: string, candidates: string[], limit: number = 5): string[] {
    // Simple implementation - in reality, this would use embeddings
    const related: Array<{ text: string; score: number }> = [];
    
    // Find terms that share common substrings
    for (const candidate of candidates) {
      if (candidate === term) continue;
      
      let score = 0;
      
      // Check for common substrings
      const minLength = Math.min(term.length, candidate.length);
      for (let i = 1; i <= minLength; i++) {
        if (term.includes(candidate.substring(0, i)) || candidate.includes(term.substring(0, i))) {
          score += i / minLength;
        }
      }
      
      // Bonus for same category/prefix
      if (term.split(' ')[0] === candidate.split(' ')[0]) {
        score += 0.5;
      }
      
      if (score > 0) {
        related.push({ text: candidate, score });
      }
    }
    
    return related
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(r => r.text);
  }
}

/**
 * AI Suggestion Service
 * Provides intelligent search suggestions and autocomplete
 */
export class AISuggestionService {
  private static instance: AISuggestionService;
  private aiModel: MockAIModel;
  private communityCache: Map<string, EnhancedCommunity> = new Map();
  private searchHistory: Array<{ query: string; timestamp: number }> = [];
  private MAX_HISTORY_SIZE = 100;

  private constructor() {
    this.aiModel = new MockAIModel();
    this.loadTrainingData();
  }

  static getInstance(): AISuggestionService {
    if (!AISuggestionService.instance) {
      AISuggestionService.instance = new AISuggestionService();
    }
    return AISuggestionService.instance;
  }

  /**
   * Get search suggestions for a query
   */
  async getSearchSuggestions(
    query: string,
    context?: {
      userId?: string;
      recentCommunities?: string[];
      searchHistory?: string[];
    },
    limit: number = 10
  ): Promise<string[]> {
    if (!query || query.length < 2) return [];

    // Get candidate suggestions from various sources
    const candidates = await this.getCandidateSuggestions(context);

    // Get AI-powered predictions
    const aiPredictions = this.aiModel.predict(query, candidates, limit);

    // Get fuzzy matches
    const fuzzyMatches = fuzzySearch(
      candidates,
      query,
      [],
      { threshold: 0.6, shouldSort: true }
    ).slice(0, limit).map(r => String(r.item));

    // Get token-based matches for multi-word queries
    const tokenMatches = tokenizeSearch(
      candidates,
      query,
      [],
      { threshold: 0.7, shouldSort: true }
    ).slice(0, limit).map(r => String(r.item));

    // Combine and deduplicate results
    const allSuggestions = [...aiPredictions, ...fuzzyMatches, ...tokenMatches];
    const uniqueSuggestions = [...new Set(allSuggestions)];

    // Sort by relevance (AI predictions first, then others)
    const suggestionScores = new Map<string, number>();
    
    aiPredictions.forEach((suggestion, index) => {
      suggestionScores.set(suggestion, 100 - index);
    });
    
    fuzzyMatches.forEach((suggestion, index) => {
      const currentScore = suggestionScores.get(suggestion) || 0;
      suggestionScores.set(suggestion, Math.max(currentScore, 50 - index));
    });
    
    tokenMatches.forEach((suggestion, index) => {
      const currentScore = suggestionScores.get(suggestion) || 0;
      suggestionScores.set(suggestion, Math.max(currentScore, 30 - index));
    });

    return uniqueSuggestions
      .sort((a, b) => (suggestionScores.get(b) || 0) - (suggestionScores.get(a) || 0))
      .slice(0, limit);
  }

  /**
   * Get related communities based on a query or community
   */
  async getRelatedCommunities(
    queryOrCommunity: string,
    allCommunities: EnhancedCommunity[],
    limit: number = 5
  ): Promise<EnhancedCommunity[]> {
    // Get related terms
    const communityNames = allCommunities.map(c => c.name);
    const relatedTerms = this.aiModel.getRelatedTerms(queryOrCommunity, communityNames, limit * 2);

    // Find communities matching related terms
    const relatedCommunities: EnhancedCommunity[] = [];
    
    for (const term of relatedTerms) {
      const matchingCommunities = fuzzySearch(
        allCommunities,
        term,
        ['name', 'displayName', 'description', 'category', 'tags'],
        { threshold: 0.7 }
      );
      
      matchingCommunities.forEach(result => {
        if (!relatedCommunities.some(c => c.id === result.item.id)) {
          relatedCommunities.push(result.item);
        }
      });
      
      if (relatedCommunities.length >= limit) break;
    }

    return relatedCommunities.slice(0, limit);
  }

  /**
   * Get trending suggestions based on recent activity
   */
  async getTrendingSuggestions(
    context?: {
      userId?: string;
      recentCommunities?: string[];
    },
    limit: number = 10
  ): Promise<string[]> {
    // Get recent search history
    const recentHistory = this.searchHistory
      .filter(entry => Date.now() - entry.timestamp < 24 * 60 * 60 * 1000) // Last 24 hours
      .map(entry => entry.query);

    // Get trending from recent history
    const trendingTerms = this.getTrendingTerms(recentHistory, limit);

    // Combine with context-based suggestions
    const contextSuggestions: string[] = [];
    if (context?.recentCommunities) {
      contextSuggestions.push(...context.recentCommunities);
    }

    // Return combined unique suggestions
    const allSuggestions = [...trendingTerms, ...contextSuggestions];
    return [...new Set(allSuggestions)].slice(0, limit);
  }

  /**
   * Record user search behavior for training
   */
  recordSearch(query: string, selectedSuggestion?: string): void {
    // Add to search history
    this.searchHistory.push({ query, timestamp: Date.now() });
    
    // Trim history to max size
    if (this.searchHistory.length > this.MAX_HISTORY_SIZE) {
      this.searchHistory = this.searchHistory.slice(-this.MAX_HISTORY_SIZE);
    }

    // Train AI model if a suggestion was selected
    if (selectedSuggestion) {
      this.aiModel.train(query, selectedSuggestion);
    }
  }

  /**
   * Update community cache
   */
  updateCommunityCache(communities: EnhancedCommunity[]): void {
    this.communityCache.clear();
    communities.forEach(community => {
      this.communityCache.set(community.id, community);
    });
  }

  /**
   * Get candidate suggestions from various sources
   */
  private async getCandidateSuggestions(
    context?: {
      userId?: string;
      recentCommunities?: string[];
      searchHistory?: string[];
    }
  ): Promise<string[]> {
    const candidates = new Set<string>();

    // Add recent communities from context
    if (context?.recentCommunities) {
      context.recentCommunities.forEach(name => candidates.add(name));
    }

    // Add from search history
    if (context?.searchHistory) {
      context.searchHistory.forEach(term => candidates.add(term));
    } else {
      // Use internal search history
      this.searchHistory
        .slice(-20)
        .forEach(entry => candidates.add(entry.query));
    }

    // Add popular community names
    for (const community of this.communityCache.values()) {
      candidates.add(community.name);
      candidates.add(community.displayName);
      if (community.category) candidates.add(community.category);
      if (community.tags) community.tags.forEach(tag => candidates.add(tag));
    }

    return Array.from(candidates);
  }

  /**
   * Get trending terms from search history
   */
  private getTrendingTerms(terms: string[], limit: number): string[] {
    const frequencyMap = new Map<string, number>();
    
    terms.forEach(term => {
      frequencyMap.set(term, (frequencyMap.get(term) || 0) + 1);
    });

    return Array.from(frequencyMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(entry => entry[0]);
  }

  /**
   * Load initial training data (in a real implementation, this would come from a database)
   */
  private loadTrainingData(): void {
    // Mock training data
    const trainingData = [
      { query: "defi", selections: ["DeFi", "Decentralized Finance", "yield farming"] },
      { query: "nft", selections: ["NFT", "Non-Fungible Token", "digital art"] },
      { query: "dao", selections: ["DAO", "Decentralized Autonomous Organization", "governance"] },
      { query: "web3", selections: ["Web3", "blockchain", "decentralized"] },
      { query: "crypto", selections: ["cryptocurrency", "bitcoin", "ethereum", "blockchain"] }
    ];

    trainingData.forEach(data => {
      data.selections.forEach(selection => {
        this.aiModel.train(data.query, selection);
      });
    });
  }
}

// Export singleton instance
export const aiSuggestionService = AISuggestionService.getInstance();