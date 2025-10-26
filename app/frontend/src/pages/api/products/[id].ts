/**
 * Mock API endpoint for product data
 * This endpoint simulates the backend API for product data
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { mockProducts } from '@/data/mockProducts';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    // Find the product by ID
    const product = mockProducts.find(p => p.id === id);

    if (product) {
      res.status(200).json({
        success: true,
        data: product
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
  } else {
    res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }
}