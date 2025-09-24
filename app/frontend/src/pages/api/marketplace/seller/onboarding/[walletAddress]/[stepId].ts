import { NextApiRequest, NextApiResponse } from 'next';

// Get the backend URL from environment variables
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const { walletAddress, stepId } = req.query;

  switch (method) {
    case 'GET':
      try {
        if (!walletAddress || typeof walletAddress !== 'string') {
          return res.status(400).json({ error: 'Wallet address is required' });
        }

        if (!stepId || typeof stepId !== 'string') {
          return res.status(400).json({ error: 'Step ID is required' });
        }

        // Forward the request to the backend
        const getEndpoint = `${BACKEND_URL}/marketplace/seller/onboarding/${walletAddress}/${stepId}`;
        console.log(`Proxying ${method} request to: ${getEndpoint}`);
        
        const getResponse = await fetch(getEndpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log(`Backend response status: ${getResponse.status}`);
        
        // Get the response data
        const getData = await getResponse.json();
        console.log(`Backend response data:`, getData);

        // Forward the response back to the client
        res.status(getResponse.status).json(getData);
      } catch (error) {
        console.error('Error fetching step data:', error);
        res.status(500).json({ error: 'Failed to fetch step data' });
      }
      break;

    case 'PUT':
      try {
        if (!walletAddress || typeof walletAddress !== 'string') {
          return res.status(400).json({ error: 'Wallet address is required' });
        }

        if (!stepId || typeof stepId !== 'string') {
          return res.status(400).json({ error: 'Step ID is required' });
        }

        // Forward the request to the backend
        const putEndpoint = `${BACKEND_URL}/marketplace/seller/onboarding/${walletAddress}/${stepId}`;
        console.log(`Proxying ${method} request to: ${putEndpoint}`);
        
        const putResponse = await fetch(putEndpoint, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(req.body),
        });

        console.log(`Backend response status: ${putResponse.status}`);
        
        // Get the response data
        const putData = await putResponse.json();
        console.log(`Backend response data:`, putData);

        // Forward the response back to the client
        res.status(putResponse.status).json(putData);
      } catch (error) {
        console.error('Error updating step:', error);
        res.status(500).json({ error: 'Failed to update step' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'PUT']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}