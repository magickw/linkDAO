import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
  const { q, type, category } = req.query;

  if (!q) {
    return res.status(400).json({ success: false, message: 'Query parameter required' });
  }

  const queryParams = new URLSearchParams();
  queryParams.append('q', q as string);
  if (type) queryParams.append('type', type as string);
  if (category) queryParams.append('category', category as string);

  try {
    const response = await fetch(
      `${backendUrl}/api/ldao-support/search?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization || '',
        },
      }
    );

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Search failed' });
  }
}
