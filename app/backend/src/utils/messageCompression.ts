/**
 * Message Compression Utility
 * Provides LZ-based compression for message content to reduce storage/bandwidth
 *
 * Uses pako (zlib) for efficient compression with UTF-8 support
 */

import { safeLogger } from './safeLogger';
import zlib from 'zlib';
import { promisify } from 'util';

// Promisified zlib functions
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

// Compression configuration
const COMPRESSION_THRESHOLD = 256; // Only compress messages > 256 bytes
const COMPRESSION_LEVEL = 6; // Balance between speed and ratio (1-9)

interface CompressionResult {
  success: boolean;
  data?: string; // base64 encoded compressed data
  originalSize?: number;
  compressedSize?: number;
  compressionRatio?: number;
  error?: string;
}

interface DecompressionResult {
  success: boolean;
  data?: string;
  error?: string;
}

/**
 * Compresses message content using gzip
 * Only compresses if content exceeds threshold and compression is beneficial
 */
export async function compressMessage(content: string): Promise<CompressionResult> {
  const originalSize = Buffer.byteLength(content, 'utf8');

  // Skip compression for small messages
  if (originalSize < COMPRESSION_THRESHOLD) {
    return {
      success: true,
      data: content,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1.0
    };
  }

  try {
    const compressed = await gzip(Buffer.from(content, 'utf8'), {
      level: COMPRESSION_LEVEL
    });

    const compressedSize = compressed.length;
    const compressionRatio = compressedSize / originalSize;

    // Only use compression if it actually reduces size
    if (compressionRatio >= 0.9) {
      return {
        success: true,
        data: content, // Return uncompressed
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1.0
      };
    }

    return {
      success: true,
      data: compressed.toString('base64'),
      originalSize,
      compressedSize,
      compressionRatio
    };
  } catch (error) {
    safeLogger.error('Message compression failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Compression failed'
    };
  }
}

/**
 * Decompresses message content
 */
export async function decompressMessage(compressedData: string): Promise<DecompressionResult> {
  try {
    // Check if data is base64 encoded (compressed)
    // Plain text won't be valid base64 that decompresses
    if (!isCompressed(compressedData)) {
      return {
        success: true,
        data: compressedData
      };
    }

    const compressed = Buffer.from(compressedData, 'base64');
    const decompressed = await gunzip(compressed);

    return {
      success: true,
      data: decompressed.toString('utf8')
    };
  } catch (error) {
    // If decompression fails, assume it's not compressed
    return {
      success: true,
      data: compressedData
    };
  }
}

/**
 * Checks if content appears to be compressed
 */
function isCompressed(data: string): boolean {
  // Gzip magic number in base64 starts with H4sI
  return data.startsWith('H4sI');
}

/**
 * Compresses content for storage with metadata
 * Returns a string that can be stored directly in the database
 */
export async function compressForStorage(content: string): Promise<string> {
  const result = await compressMessage(content);

  if (!result.success || !result.data) {
    return content;
  }

  // If not actually compressed (ratio ~1.0), return original
  if (result.compressionRatio && result.compressionRatio >= 0.9) {
    return content;
  }

  // Return with compression marker
  return JSON.stringify({
    _compressed: true,
    data: result.data,
    originalSize: result.originalSize
  });
}

/**
 * Decompresses content from storage
 * Handles both compressed and uncompressed content transparently
 */
export async function decompressFromStorage(storedContent: string): Promise<string> {
  // Check if content is JSON with compression marker
  if (!storedContent.startsWith('{')) {
    return storedContent;
  }

  try {
    const parsed = JSON.parse(storedContent);

    if (!parsed._compressed) {
      return storedContent;
    }

    const result = await decompressMessage(parsed.data);

    if (result.success && result.data) {
      return result.data;
    }

    // Return compressed data if decompression fails
    safeLogger.error('Failed to decompress message content');
    return storedContent;
  } catch {
    // Not valid JSON, return as-is
    return storedContent;
  }
}

/**
 * Batch compress multiple messages
 */
export async function compressMessageBatch(
  messages: Array<{ id: string; content: string }>
): Promise<Array<{ id: string; compressedContent: string; saved: number }>> {
  const results: Array<{ id: string; compressedContent: string; saved: number }> = [];

  for (const message of messages) {
    const originalSize = Buffer.byteLength(message.content, 'utf8');
    const compressed = await compressForStorage(message.content);
    const compressedSize = Buffer.byteLength(compressed, 'utf8');

    results.push({
      id: message.id,
      compressedContent: compressed,
      saved: originalSize - compressedSize
    });
  }

  return results;
}

/**
 * Estimates compression ratio for a batch of messages
 */
export async function estimateCompressionSavings(
  messages: string[]
): Promise<{ totalOriginal: number; totalCompressed: number; ratio: number }> {
  let totalOriginal = 0;
  let totalCompressed = 0;

  for (const message of messages) {
    const result = await compressMessage(message);
    if (result.success && result.originalSize && result.compressedSize) {
      totalOriginal += result.originalSize;
      totalCompressed += result.compressedSize;
    }
  }

  return {
    totalOriginal,
    totalCompressed,
    ratio: totalOriginal > 0 ? totalCompressed / totalOriginal : 1.0
  };
}

export default {
  compressMessage,
  decompressMessage,
  compressForStorage,
  decompressFromStorage,
  compressMessageBatch,
  estimateCompressionSavings
};
