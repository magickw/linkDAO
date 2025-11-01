import crypto from 'crypto';

export interface TextHashResult {
  contentHash: string;
  semanticHash: string;
  normalizedText: string;
  wordCount: number;
}

export interface TextDuplicateResult {
  isDuplicate: boolean;
  similarity: number;
  duplicateType: 'exact' | 'near-exact' | 'semantic' | 'none';
  originalContentId?: string;
  hashes: TextHashResult;
}

/**
 * Text hashing service for duplicate content detection
 * Implements multiple hashing strategies for different types of duplicates
 */
export class TextHashingService {
  private readonly EXACT_THRESHOLD = 1.0;
  private readonly NEAR_EXACT_THRESHOLD = 0.95;
  private readonly SEMANTIC_THRESHOLD = 0.85;

  /**
   * Generate comprehensive text hashes
   */
  generateTextHashes(text: string): TextHashResult {
    const normalizedText = this.normalizeText(text);
    const contentHash = this.generateContentHash(normalizedText);
    const semanticHash = this.generateSemanticHash(normalizedText);

    return {
      contentHash,
      semanticHash,
      normalizedText,
      wordCount: normalizedText.split(/\s+/).length
    };
  }

  /**
   * Normalize text for consistent hashing
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Generate content hash for exact/near-exact matching
   */
  private generateContentHash(normalizedText: string): string {
    return crypto
      .createHash('sha256')
      .update(normalizedText)
      .digest('hex');
  }

  /**
   * Generate semantic hash using shingling for fuzzy matching
   */
  private generateSemanticHash(normalizedText: string): string {
    const shingles = this.generateShingles(normalizedText, 3);
    const sortedShingles = Array.from(shingles).sort();
    
    return crypto
      .createHash('sha256')
      .update(sortedShingles.join(''))
      .digest('hex');
  }

  /**
   * Generate word shingles for semantic similarity
   */
  private generateShingles(text: string, shingleSize: number): Set<string> {
    const words = text.split(/\s+/);
    const shingles = new Set<string>();

    for (let i = 0; i <= words.length - shingleSize; i++) {
      const shingle = words.slice(i, i + shingleSize).join(' ');
      shingles.add(shingle);
    }

    return shingles;
  }

  /**
   * Calculate Jaccard similarity between two sets of shingles
   */
  private calculateJaccardSimilarity(text1: string, text2: string): number {
    const shingles1 = this.generateShingles(text1, 3);
    const shingles2 = this.generateShingles(text2, 3);

    const intersection = new Set([...shingles1].filter(x => shingles2.has(x)));
    const union = new Set([...shingles1, ...shingles2]);

    return intersection.size / union.size;
  }

  /**
   * Calculate edit distance similarity
   */
  private calculateEditSimilarity(text1: string, text2: string): number {
    const maxLength = Math.max(text1.length, text2.length);
    if (maxLength === 0) return 1.0;

    const editDistance = this.levenshteinDistance(text1, text2);
    return 1 - (editDistance / maxLength);
  }

  /**
   * Compute Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Check for duplicate text content
   */
  async checkForDuplicate(
    text: string,
    existingContent: Map<string, { hash: TextHashResult; text: string }>
  ): Promise<TextDuplicateResult> {
    const newHashes = this.generateTextHashes(text);
    let bestMatch: TextDuplicateResult = {
      isDuplicate: false,
      similarity: 0,
      duplicateType: 'none',
      hashes: newHashes
    };

    for (const [contentId, existing] of existingContent) {
      // Check for exact match
      if (newHashes.contentHash === existing.hash.contentHash) {
        return {
          isDuplicate: true,
          similarity: 1.0,
          duplicateType: 'exact',
          originalContentId: contentId,
          hashes: newHashes
        };
      }

      // Check for near-exact match using edit distance
      const editSimilarity = this.calculateEditSimilarity(
        newHashes.normalizedText,
        existing.hash.normalizedText
      );

      if (editSimilarity >= this.NEAR_EXACT_THRESHOLD) {
        bestMatch = {
          isDuplicate: true,
          similarity: editSimilarity,
          duplicateType: 'near-exact',
          originalContentId: contentId,
          hashes: newHashes
        };
        continue;
      }

      // Check for semantic similarity
      const semanticSimilarity = this.calculateJaccardSimilarity(
        newHashes.normalizedText,
        existing.hash.normalizedText
      );

      if (semanticSimilarity >= this.SEMANTIC_THRESHOLD && semanticSimilarity > bestMatch.similarity) {
        bestMatch = {
          isDuplicate: true,
          similarity: semanticSimilarity,
          duplicateType: 'semantic',
          originalContentId: contentId,
          hashes: newHashes
        };
      }
    }

    return bestMatch;
  }

  /**
   * Generate fingerprint for spam detection
   */
  generateSpamFingerprint(text: string): string {
    // Extract key features for spam detection
    const features = {
      length: text.length,
      uppercaseRatio: (text.match(/[A-Z]/g) || []).length / text.length,
      digitRatio: (text.match(/\d/g) || []).length / text.length,
      specialCharRatio: (text.match(/[!@#$%^&*()]/g) || []).length / text.length,
      urlCount: (text.match(/https?:\/\/[^\s]+/g) || []).length,
      repeatedChars: this.countRepeatedCharacters(text)
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(features))
      .digest('hex');
  }

  /**
   * Count repeated character patterns
   */
  private countRepeatedCharacters(text: string): number {
    let count = 0;
    for (let i = 0; i < text.length - 2; i++) {
      if (text[i] === text[i + 1] && text[i] === text[i + 2]) {
        count++;
      }
    }
    return count;
  }
}

export const textHashingService = new TextHashingService();
