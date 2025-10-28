import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
  const { category, search } = req.query;
  
  const queryParams = new URLSearchParams();
  if (category) queryParams.append('category', category as string);
  if (search) queryParams.append('search', search as string);
  
  try {
    const response = await fetch(
      `${backendUrl}/api/ldao-support/faq?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch FAQ' });
  }
}
