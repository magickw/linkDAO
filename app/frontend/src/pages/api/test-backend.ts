import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Test the backend health endpoint
    const response = await fetch('http://localhost:3004/health');
    const data = await response.json();
    
    res.status(200).json({
      success: true,
      backendHealth: data,
      message: 'Successfully connected to backend'
    });
  } catch (error: any) {
    console.error('Backend connection error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to connect to backend',
      details: error instanceof Error ? error.stack : 'No stack trace available'
    });
  }
}