import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get the target URL from the query parameters
    const { target, ...queryParams } = req.query;
    
    if (!target || typeof target !== 'string') {
      return res.status(400).json({ error: 'Missing target URL' });
    }

    // Reconstruct the target URL with query parameters
    const url = new URL(target);
    Object.keys(queryParams).forEach(key => {
      if (key !== 'target') {
        url.searchParams.append(key, queryParams[key] as string);
      }
    });

    // Prepare headers, removing Next.js specific headers
    const { host, 'content-length': contentLength, ...forwardedHeaders } = req.headers;
    
    // Create clean headers object
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add forwarded headers, converting arrays to strings
    Object.entries(forwardedHeaders).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        headers[key] = value.join(', ');
      } else if (typeof value === 'string') {
        headers[key] = value;
      }
    });

    // Forward the request to the target URL
    const response = await fetch(url.toString(), {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    // Forward the response back to the client
    const data = await response.json();
    
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy request failed' });
  }
}