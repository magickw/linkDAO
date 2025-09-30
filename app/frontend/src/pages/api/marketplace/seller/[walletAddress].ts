import { NextApiRequest, NextApiResponse } from 'next';
import { sellerService } from '../../../../services/sellerService';

// Get the backend URL from environment variables
// Use BACKEND_URL for server-side, fallback to NEXT_PUBLIC_BACKEND_URL for compatibility
const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('API route called:', req.method, req.url);
  console.log('Request query:', req.query);
  console.log('Request body:', req.body);
  
  const { method } = req;
  const { walletAddress } = req.query;

  // Handle GET requests with caching
  if (method === 'GET' && walletAddress && typeof walletAddress === 'string' && walletAddress !== 'undefined' && walletAddress !== 'profile') {
    try {
      console.log(`Fetching seller profile with caching for: ${walletAddress}`);
      const profile = await sellerService.getSellerProfile(walletAddress);
      
      if (profile === null) {
        // Profile not found (could be cached 404)
        return res.status(404).json({ success: false, message: 'Seller profile not found' });
      }
      
      return res.status(200).json({ success: true, data: profile });
    } catch (error) {
      console.error('Error fetching seller profile:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch seller profile' });
    }
  }
  
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
  
  // Handle PUT requests (updating an existing profile)
  if (method === 'PUT' && walletAddress && typeof walletAddress === 'string' && walletAddress !== 'undefined' && walletAddress !== 'profile') {
    try {
      // Construct the backend URL for updating a profile
      const backendEndpoint = `${BACKEND_URL}/api/sellers/profile/${walletAddress}`;
      console.log(`Proxying PUT request to: ${backendEndpoint}`);
      
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