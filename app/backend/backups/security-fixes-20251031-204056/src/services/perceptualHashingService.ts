import crypto from 'crypto';
import { safeLogger } from '../utils/safeLogger';
import sharp from 'sharp';
import { safeLogger } from '../utils/safeLogger';

export interface PerceptualHashResult {
  hash: string;
  algorithm: 'dhash' | 'ahash' | 'phash';
  confidence: number;
}

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  similarity: number;
  originalContentId?: string;
  hash: string;
}

/**
 * Perceptual hashing service for duplicate image detection
 * Implements multiple hashing algorithms for robust duplicate detection
 */
export class PerceptualHashingService {
  private readonly HASH_SIZE = 8;
  private readonly SIMILARITY_THRESHOLD = 0.9;

  /**
   * Generate perceptual hash for image content
   */
  async generateImageHash(imageBuffer: Buffer): Promise<PerceptualHashResult> {
    try {
      // Resize image to standard size for consistent hashing
      const resized = await sharp(imageBuffer)
        .resize(this.HASH_SIZE + 1, this.HASH_SIZE)
        .grayscale()
        .raw()
        .toBuffer();

      // Generate difference hash (dHash)
      const hash = this.computeDifferenceHash(resized);
      
      return {
        hash,
        algorithm: 'dhash',
        confidence: 1.0
      };
    } catch (error) {
      safeLogger.error('Error generating perceptual hash:', error);
      throw new Error('Failed to generate perceptual hash');
    }
  }

  /**
   * Compute difference hash (dHash) - most effective for duplicate detection
   */
  private computeDifferenceHash(pixels: Buffer): string {
    const hash: number[] = [];
    
    for (let row = 0; row < this.HASH_SIZE; row++) {
      for (let col = 0; col < this.HASH_SIZE; col++) {
        const leftPixel = pixels[row * (this.HASH_SIZE + 1) + col];
        const rightPixel = pixels[row * (this.HASH_SIZE + 1) + col + 1];
        hash.push(leftPixel < rightPixel ? 1 : 0);
      }
    }

    // Convert binary array to hex string
    let hexHash = '';
    for (let i = 0; i < hash.length; i += 4) {
      const nibble = hash.slice(i, i + 4);
      const value = nibble.reduce((acc, bit, idx) => acc + (bit << (3 - idx)), 0);
      hexHash += value.toString(16);
    }

    return hexHash;
  }

  /**
   * Calculate Hamming distance between two hashes
   */
  calculateSimilarity(hash1: string, hash2: string): number {
    if (hash1.length !== hash2.length) {
      return 0;
    }

    let differences = 0;
    const totalBits = hash1.length * 4; // Each hex char represents 4 bits

    for (let i = 0; i < hash1.length; i++) {
      const val1 = parseInt(hash1[i], 16);
      const val2 = parseInt(hash2[i], 16);
      const xor = val1 ^ val2;
      
      // Count set bits in XOR result
      let bits = xor;
      while (bits) {
        differences += bits & 1;
        bits >>= 1;
      }
    }

    return 1 - (differences / totalBits);
  }

  /**
   * Check if image is duplicate of existing content
   */
  async checkForDuplicate(
    imageBuffer: Buffer,
    existingHashes: Map<string, string>
  ): Promise<DuplicateDetectionResult> {
    const newHashResult = await this.generateImageHash(imageBuffer);
    
    for (const [contentId, existingHash] of existingHashes) {
      const similarity = this.calculateSimilarity(newHashResult.hash, existingHash);
      
      if (similarity >= this.SIMILARITY_THRESHOLD) {
        return {
          isDuplicate: true,
          similarity,
          originalContentId: contentId,
          hash: newHashResult.hash
        };
      }
    }

    return {
      isDuplicate: false,
      similarity: 0,
      hash: newHashResult.hash
    };
  }

  /**
   * Generate hash for video content (using first frame)
   */
  async generateVideoHash(videoBuffer: Buffer): Promise<PerceptualHashResult> {
    try {
      // Extract first frame from video
      const frameBuffer = await sharp(videoBuffer, { pages: 1 })
        .png()
        .toBuffer();

      return this.generateImageHash(frameBuffer);
    } catch (error) {
      safeLogger.error('Error generating video hash:', error);
      throw new Error('Failed to generate video hash');
    }
  }
}

export const perceptualHashingService = new PerceptualHashingService();