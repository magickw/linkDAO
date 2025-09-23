import { NextApiRequest, NextApiResponse } from 'next';

// Get the backend URL from environment variables
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('API route called:', req.method, req.url);
  console.log('Request query:', req.query);
  console.log('Request body:', req.body);
  
  const { method } = req;
  const { walletAddress } = req.query;

  try {
    // Construct the backend URL
    let backendEndpoint = `${BACKEND_URL}/marketplace/seller/profile`;
    
    // For GET and PUT requests with a wallet address, append the wallet address
    // For POST requests, don't append anything (creating a new profile)
    if (walletAddress && typeof walletAddress === 'string' && walletAddress !== 'undefined' && walletAddress !== 'profile') {
      backendEndpoint += `/${walletAddress}`;
    }

    console.log(`Proxying ${method} request to: ${backendEndpoint}`);
    
    // Forward the request to the backend
    const backendResponse = await fetch(backendEndpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });

    console.log(`Backend response status: ${backendResponse.status}`);
    
    // Get the response data
    const data = await backendResponse.json();
    console.log(`Backend response data:`, data);

    // Forward the response back to the client
    res.status(backendResponse.status).json(data);
  } catch (error) {
    console.error('Error proxying request to backend:', error);
    res.status(500).json({ error: 'Failed to proxy request to backend' });
  }
}