import { Router, Request, Response } from 'express';
import axios from 'axios';
import { safeLogger } from '../utils/safeLogger';

const router = Router();

/**
 * Generic RPC Proxy Route
 * Proxies JSON-RPC requests to external nodes to avoid CORS and protect API keys.
 * Used by the frontend to talk to Ethereum nodes via the backend.
 */
router.all('/', async (req: Request, res: Response) => {
    const target = req.query.target as string;

    if (!target) {
        return res.status(400).json({
            success: false,
            error: 'Missing target URL'
        });
    }

    // Security: Only allow HTTPS targets
    if (!target.startsWith('https://')) {
        return res.status(400).json({
            success: false,
            error: 'Only HTTPS targets are allowed for security'
        });
    }

    try {
        // Log the proxy request (optional, can be noisy)
        // safeLogger.info('Proxying RPC request', { target, method: req.method });

        const response = await axios({
            method: req.method,
            url: target,
            data: req.body,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'LinkDAO-RPC-Proxy/1.0'
            },
            timeout: 20000, // 20s timeout for RPC operations
            validateStatus: () => true // Forward all status codes
        });

        // Forward essential headers
        if (response.headers['content-type']) {
            res.set('Content-Type', response.headers['content-type']);
        }
        
        // Disable caching for RPC responses
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

        res.status(response.status).send(response.data);

    } catch (error: any) {
        safeLogger.error('RPC Proxy Error:', {
            target,
            error: error.message,
            code: error.code
        });

        // Return a JSON-RPC compatible error if possible, or a standard HTTP error
        if (req.body && req.body.id) {
            return res.status(502).json({
                jsonrpc: '2.0',
                id: req.body.id,
                error: {
                    code: -32000,
                    message: `RPC Proxy Error: ${error.message}`
                }
            });
        }

        res.status(502).json({
            success: false,
            error: 'Bad Gateway',
            message: 'Failed to connect to upstream RPC node',
            details: error.message
        });
    }
});

export default router;
