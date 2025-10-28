/**
 * Fuzzy Search Utility Functions
 * Implements fuzzy string matching algorithms for enhanced search
 */

/**
 * Fuzzy search options
 */
export interface FuzzySearchOptions {
  threshold?: number; // Minimum similarity score (0-1)
  caseSensitive?: boolean;
  includeScore?: boolean;
  includeMatches?: boolean;
  shouldSort?: boolean;
  findAllMatches?: boolean;
  minMatchCharLength?: number;
  location?: number;
  distance?: number;
  useExtendedSearch?: boolean;
  ignoreLocation?: boolean;
  ignoreFieldNorm?: boolean;
  fieldNormWeight?: number;
}

/**
 * Search result with score and matches
 */
export interface FuzzySearchResult<T> {
  item: T;
  refIndex: number;
  score?: number;
  matches?: Array<{
    indices: [number, number][];
    value: string;
    key: string;
    arrayIndex: number;
  }>;
}

/**
 * Fuzzy search class implementing various fuzzy matching algorithms
 */
export class FuzzySearch<T> {
  private items: T[];
  private options: FuzzySearchOptions;
  private keys: string[];

  constructor(items: T[], keys: string[] = [], options: FuzzySearchOptions = {}) {
    this.items = items;
    this.keys = keys;
    this.options = {
      threshold: 0.6,
      caseSensitive: false,
      includeScore: true,
      includeMatches: false,
      shouldSort: true,
      findAllMatches: false,
      minMatchCharLength: 1,
      location: 0,
      distance: 100,
      useExtendedSearch: false,
      ignoreLocation: false,
      ignoreFieldNorm: false,
      fieldNormWeight: 1,
      ...options
    };
  }

  /**
   * Search for items matching the query
   * @param query - Search query
   * @returns Array of matching items with scores
   */
  search(query: string): FuzzySearchResult<T>[] {
    if (!query) return [];

    const results: FuzzySearchResult<T>[] = [];
    const processedQuery = this.options.caseSensitive ? query : query.toLowerCase();

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const matchResult = this.matchItem(item, processedQuery);
      
      if (matchResult && matchResult.score !== undefined && matchResult.score <= (this.options.threshold || 0.6)) {
        results.push({
          item,
          refIndex: i,
          score: matchResult.score,
          matches: matchResult.matches
        });
      }
    }

    // Sort by score if requested
    if (this.options.shouldSort !== false) {
      results.sort((a, b) => (a.score || 0) - (b.score || 0));
    }

    return results;
  }

  /**
   * Match a single item against the query
   */
  private matchItem(item: T, query: string): { score: number; matches?: any[] } | null {
    if (this.keys.length === 0) {
      // Match against the entire item converted to string
      const itemString = this.options.caseSensitive 
        ? String(item) 
        : String(item).toLowerCase();
      return this.calculateScore(itemString, query);
    }

    // Match against specified keys
    let bestScore = Infinity;
    const matches: any[] = [];
    
    for (const key of this.keys) {
      const value = this.getNestedValue(item, key);
      if (value !== undefined && value !== null) {
        const stringValue = this.options.caseSensitive 
          ? String(value) 
          : String(value).toLowerCase();
        const result = this.calculateScore(stringValue, query);
        
        if (result && result.score < bestScore) {
          bestScore = result.score;
          if (this.options.includeMatches && result.matches) {
            matches.push(...result.matches.map(m => ({ ...m, key })));
          }
        }
      }
    }

    if (bestScore === Infinity) return null;

    return {
      score: bestScore,
      matches: this.options.includeMatches ? matches : undefined
    };
  }

  /**
   * Calculate similarity score between two strings using a combination of algorithms
   */
  private calculateScore(text: string, pattern: string): { score: number; matches?: any[] } {
    // Handle exact matches
    if (text === pattern) {
      return { score: 0 };
    }

    // Handle substring matches
    const substringIndex = text.indexOf(pattern);
    if (substringIndex !== -1) {
      const distance = substringIndex;
      const score = distance / (text.length + pattern.length);
      return { score };
    }

    // Use Levenshtein distance for fuzzy matching
    const levenshteinDistance = this.levenshteinDistance(text, pattern);
    const maxLength = Math.max(text.length, pattern.length);
    const score = maxLength > 0 ? levenshteinDistance / maxLength : 0;

    return { score };
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i += 1) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j += 1) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // insertion
          matrix[j - 1][i] + 1, // deletion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Highlight matches in text
   */
  static highlightMatches(text: string, matches: [number, number][]): string {
    if (!matches || matches.length === 0) return text;

    // Sort matches by start position
    const sortedMatches = [...matches].sort((a, b) => a[0] - b[0]);

    let result = '';
    let lastIndex = 0;

    for (const [start, end] of sortedMatches) {
      // Add text before match
      if (start > lastIndex) {
        result += text.slice(lastIndex, start);
      }

      // Add highlighted match
      result += `<mark>${text.slice(start, end + 1)}</mark>`;

      lastIndex = end + 1;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      result += text.slice(lastIndex);
    }

    return result;
  }
}

/**
 * Simple fuzzy search function for quick searches
 * @param items - Array of items to search
 * @param query - Search query
 * @param keys - Keys to search within (for objects)
 * @param options - Search options
 * @returns Array of matching items with scores
 */
export function fuzzySearch<T>(
  items: T[],
  query: string,
  keys: string[] = [],
  options: FuzzySearchOptions = {}
): FuzzySearchResult<T>[] {
  const searcher = new FuzzySearch(items, keys, options);
  return searcher.search(query);
}

/**
 * Token-based search for better word matching
 */
export function tokenizeSearch<T>(
  items: T[],
  query: string,
  keys: string[] = [],
  options: FuzzySearchOptions = {}
): FuzzySearchResult<T>[] {
  const tokens = query.trim().split(/\s+/);
  if (tokens.length === 0) return [];

  // Search for each token
  const tokenResults = tokens.map(token => {
    const searcher = new FuzzySearch(items, keys, options);
    return searcher.search(token);
  });

  // Combine results - item must match all tokens
  const combinedResults = new Map<string, FuzzySearchResult<T> & { tokenScores: number[] }>();

  tokenResults.forEach((results, tokenIndex) => {
    results.forEach(result => {
      const key = JSON.stringify(result.item);
      if (combinedResults.has(key)) {
        const existing = combinedResults.get(key)!;
        existing.tokenScores[tokenIndex] = result.score || 1;
      } else {
        const tokenScores = new Array(tokens.length).fill(1);
        tokenScores[tokenIndex] = result.score || 1;
        combinedResults.set(key, { ...result, tokenScores });
      }
    });
  });

  // Calculate combined scores (average of token scores)
  const finalResults: FuzzySearchResult<T>[] = [];
  combinedResults.forEach(result => {
    const averageScore = result.tokenScores.reduce((sum, score) => sum + score, 0) / result.tokenScores.length;
    if (averageScore <= (options.threshold || 0.6)) {
      finalResults.push({
        ...result,
        score: averageScore
      });
    }
  });

  // Sort by score
  if (options.shouldSort !== false) {
    finalResults.sort((a, b) => (a.score || 0) - (b.score || 0));
  }

  return finalResults;
}