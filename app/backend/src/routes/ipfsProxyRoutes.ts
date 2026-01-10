import { Router, Request, Response } from 'express';
import axios from 'axios';
import { safeLogger } from '../utils/safeLogger';

const router = Router();

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

        safeLogger.info('Proxying IPFS content', { hash });

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

        // Send the content
        res.send(response.data);

        safeLogger.info('Successfully proxied IPFS content', {
            hash,
            contentType,
            size: response.data.length
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
        gateway: process.env.IPFS_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs'
    });
});

export default router;
