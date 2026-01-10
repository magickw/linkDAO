import { Router, Request, Response } from 'express';
import axios from 'axios';
import { safeLogger } from '../utils/safeLogger';

const router = Router();

// In-memory LRU cache for IPFS content (immutable content, safe to cache indefinitely)
interface CacheEntry {
    data: Buffer;
    contentType: string;
    size: number;
    lastAccessed: number;
}

class IPFSCache {
    private cache: Map<string, CacheEntry> = new Map();
    private maxSize: number; // Max cache size in bytes
    private currentSize: number = 0;
    private maxEntries: number = 500; // Max number of cached items

    constructor(maxSizeMB: number = 100) {
        this.maxSize = maxSizeMB * 1024 * 1024;
    }

    get(hash: string): CacheEntry | undefined {
        const entry = this.cache.get(hash);
        if (entry) {
            entry.lastAccessed = Date.now();
            return entry;
        }
        return undefined;
    }

    set(hash: string, data: Buffer, contentType: string): void {
        const size = data.length;

        // Don't cache items larger than 10MB individually
        if (size > 10 * 1024 * 1024) {
            return;
        }

        // Evict entries if needed
        while ((this.currentSize + size > this.maxSize || this.cache.size >= this.maxEntries) && this.cache.size > 0) {
            this.evictOldest();
        }

        // If existing entry, remove its size first
        const existing = this.cache.get(hash);
        if (existing) {
            this.currentSize -= existing.size;
        }

        this.cache.set(hash, {
            data,
            contentType,
            size,
            lastAccessed: Date.now()
        });
        this.currentSize += size;
    }

    private evictOldest(): void {
        let oldestKey: string | null = null;
        let oldestTime = Infinity;

        const entries = Array.from(this.cache.entries());
        for (const [key, entry] of entries) {
            if (entry.lastAccessed < oldestTime) {
                oldestTime = entry.lastAccessed;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            const entry = this.cache.get(oldestKey);
            if (entry) {
                this.currentSize -= entry.size;
            }
            this.cache.delete(oldestKey);
        }
    }

    getStats(): { entries: number; sizeMB: number; maxSizeMB: number } {
        return {
            entries: this.cache.size,
            sizeMB: Math.round(this.currentSize / (1024 * 1024) * 100) / 100,
            maxSizeMB: Math.round(this.maxSize / (1024 * 1024))
        };
    }
}

// Initialize cache with 100MB limit (configurable via env)
const ipfsCache = new IPFSCache(parseInt(process.env.IPFS_CACHE_SIZE_MB || '100'));

/**
 * IPFS Proxy Route
 * Proxies IPFS content through the backend to avoid CORS issues
 * Supports caching and proper content-type headers
 */
router.get('/ipfs/:hash(*)', async (req: Request, res: Response) => {
    try {
        const { hash } = req.params;

        // Validate hash format (basic validation)
        if (!hash || hash.length < 10) {
            return res.status(400).json({
                success: false,
                error: 'Invalid IPFS hash'
            });
        }

        // Check cache first
        const cached = ipfsCache.get(hash);
        if (cached) {
            // Set appropriate headers
            res.set('Content-Type', cached.contentType);
            res.set('Access-Control-Allow-Origin', '*');
            res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.set('Cross-Origin-Resource-Policy', 'cross-origin');
            res.set('Cross-Origin-Embedder-Policy', 'unsafe-none');
            res.set('Cache-Control', 'public, max-age=31536000, immutable');
            res.set('Content-Length', String(cached.size));
            res.set('X-Cache', 'HIT');

            return res.send(cached.data);
        }

        safeLogger.info('Proxying IPFS content (cache miss)', { hash });

        // Fetch from Pinata gateway
        const gatewayUrl = process.env.IPFS_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs';
        const ipfsUrl = `${gatewayUrl}/${hash}`;

        const response = await axios.get(ipfsUrl, {
            responseType: 'arraybuffer',
            timeout: 30000, // 30 second timeout
            headers: {
                'User-Agent': 'LinkDAO-IPFS-Proxy/1.0'
            }
        });

        // Set appropriate headers
        const contentType = response.headers['content-type'] || 'application/octet-stream';
        res.set('Content-Type', contentType);

        // Enable CORS and Cross-Origin Resource Policy for cross-origin loading
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        res.set('Cross-Origin-Embedder-Policy', 'unsafe-none');

        // Cache for 1 year (IPFS content is immutable)
        res.set('Cache-Control', 'public, max-age=31536000, immutable');

        // Set content length if available
        if (response.headers['content-length']) {
            res.set('Content-Length', response.headers['content-length']);
        }
        res.set('X-Cache', 'MISS');

        // Store in cache for future requests
        const dataBuffer = Buffer.from(response.data);
        ipfsCache.set(hash, dataBuffer, contentType);

        // Send the content
        res.send(dataBuffer);

        safeLogger.info('Successfully proxied IPFS content', {
            hash,
            contentType,
            size: dataBuffer.length,
            cacheStats: ipfsCache.getStats()
        });

    } catch (error: any) {
        safeLogger.error('Error proxying IPFS content:', {
            hash: req.params.hash,
            error: error.message,
            status: error.response?.status
        });

        if (error.response?.status === 404) {
            return res.status(404).json({
                success: false,
                error: 'IPFS content not found'
            });
        }

        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            return res.status(504).json({
                success: false,
                error: 'Gateway timeout - content may be unavailable'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to fetch IPFS content'
        });
    }
});

/**
 * OPTIONS handler for CORS preflight
 */
router.options('/ipfs/:hash(*)', (req: Request, res: Response) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Cross-Origin-Embedder-Policy', 'unsafe-none');
    res.status(204).send();
});

/**
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
    res.json({
        success: true,
        service: 'ipfs-proxy',
        status: 'healthy',
        gateway: process.env.IPFS_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs',
        cache: ipfsCache.getStats()
    });
});

export default router;
