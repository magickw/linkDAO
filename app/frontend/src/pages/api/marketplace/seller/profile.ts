import { NextApiRequest, NextApiResponse } from 'next';
import { sellerService } from '../../../../services/sellerService';

// Get the backend URL from environment variables
const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  // Handle POST requests (creating a new profile)
  if (method === 'POST') {
    try {
      // Construct the backend URL for creating a profile
      const backendEndpoint = `${BACKEND_URL}/api/sellers/profile`;
      console.log(`Proxying POST request to: ${backendEndpoint}`);
      
      // Forward the request to the backend
      const backendResponse = await fetch(backendEndpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body),
      });

      console.log(`Backend response status: ${backendResponse.status}`);
      
      // Get the response data
      const data = await backendResponse.json();
      console.log(`Backend response data:`, data);

      // Forward the response back to the client
      return res.status(backendResponse.status).json(data);
    } catch (error) {
      console.error('Error proxying request to backend:', error);
      return res.status(500).json({ error: 'Failed to proxy request to backend' });
    }
  }

  // If we reach here, it's an unsupported method
  return res.status(405).json({ error: 'Method not allowed' });
}