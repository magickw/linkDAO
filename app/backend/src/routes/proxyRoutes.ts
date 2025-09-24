import express from 'express';
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
      const isAllowed = allowedDomains.some(domain => urlObj.hostname.includes(domain));
      
      if (!isAllowed) {
        return res.status(403).json({ error: 'URL not allowed' });
      }
    } catch (urlError) {
      return res.status(400).json({ error: 'Invalid URL' });
    }
    
    // Make the request to the external service
    const response = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Get the response data
    const data = await response.json();
    
    // Set appropriate headers
    res.set('Content-Type', 'application/json');
    res.set('Access-Control-Allow-Origin', '*');
    
    // Send the response back to the client
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
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
      const isAllowed = allowedDomains.some(domain => urlObj.hostname.includes(domain));
      
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
    const data = await response.json();
    
    // Set appropriate headers
    res.set('Content-Type', 'application/json');
    res.set('Access-Control-Allow-Origin', '*');
    
    // Send the response back to the client
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy request failed' });
  }
});

export default router;