import express from 'express';
import { safeLogger } from '../utils/safeLogger';
import { Request, Response } from 'express';

const router = express.Router();

/**
 * Proxy endpoint for external API requests
 * This helps avoid CORS issues by making requests from the backend
 */
router.get('/api/proxy', async (req: Request, res: Response) => {
  try {
    const { url } = req.query;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Missing URL parameter' });
    }
    
    // Validate URL is from allowed domains
    const allowedDomains = [
      'eth-mainnet.g.alchemy.com',
      'base-mainnet.g.alchemy.com',
      'base-goerli.g.alchemy.com',
      'polygon-mainnet.g.alchemy.com',
      'arb-mainnet.g.alchemy.com',
      'eth-sepolia.g.alchemy.com',
      'eth.llamarpc.com',
      'mainnet.base.org',
      'goerli.base.org',
      'polygon.llamarpc.com',
      'arbitrum.llamarpc.com'
    ];
    
    try {
      const urlObj = new URL(url);
      const isAllowed = allowedDomains.some(domain => urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain));
      
      if (!isAllowed) {
        return res.status(403).json({ error: 'URL not allowed' });
      }
    } catch (urlError) {
      return res.status(400).json({ error: 'Invalid URL' });
    }
    
    // Make the request to the external service
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Handle HEAD requests differently (no response body)
    if (req.method === 'HEAD') {
      // Copy relevant headers from the response
      const headersToCopy = ['content-type', 'content-length', 'etag', 'last-modified'];
      headersToCopy.forEach(header => {
        const value = response.headers.get(header);
        if (value) {
          res.set(header, value);
        }
      });
      
      // Send the response back to the client
      return res.status(response.status).end();
    }
    
    // Get the response data for non-HEAD requests
    const data = await response.json();
    
    // Set appropriate headers
    res.set('Content-Type', 'application/json');
    
    // Send the response back to the client
    res.status(response.status).json(data);
  } catch (error) {
    safeLogger.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy request failed' });
  }
});

router.post('/api/proxy', async (req: Request, res: Response) => {
  try {
    const { url } = req.query;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Missing URL parameter' });
    }
    
    // Validate URL is from allowed domains
    const allowedDomains = [
      'eth-mainnet.g.alchemy.com',
      'base-mainnet.g.alchemy.com',
      'base-goerli.g.alchemy.com',
      'polygon-mainnet.g.alchemy.com',
      'arb-mainnet.g.alchemy.com',
      'eth-sepolia.g.alchemy.com',
      'eth.llamarpc.com',
      'mainnet.base.org',
      'goerli.base.org',
      'polygon.llamarpc.com',
      'arbitrum.llamarpc.com'
    ];
    
    try {
      const urlObj = new URL(url);
      const isAllowed = allowedDomains.some(domain => urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain));
      
      if (!isAllowed) {
        return res.status(403).json({ error: 'URL not allowed' });
      }
    } catch (urlError) {
      return res.status(400).json({ error: 'Invalid URL' });
    }
    
    // Make the request to the external service
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });
    
    // Get the response data
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      // If JSON parsing fails, return the raw text
      const text = await response.text();
      return res.status(response.status).send(text);
    }
    
    // Set appropriate headers
    res.set('Content-Type', 'application/json');
    
    // Send the response back to the client
    res.status(response.status).json(data);
  } catch (error) {
    safeLogger.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy request failed' });
  }
});

export default router;
