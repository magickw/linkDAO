import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { dimensions } = req.query;
    
    // Parse dimensions from URL path
    let width = 400;
    let height = 300;
    
    if (Array.isArray(dimensions) && dimensions.length >= 2) {
      width = parseInt(dimensions[0]) || 400;
      height = parseInt(dimensions[1]) || 300;
    } else if (Array.isArray(dimensions) && dimensions.length === 1) {
      const dim = parseInt(dimensions[0]) || 400;
      width = dim;
      height = dim;
    }
    
    // Limit dimensions for security
    width = Math.min(Math.max(width, 50), 2000);
    height = Math.min(Math.max(height, 50), 2000);
    
    // Generate SVG placeholder
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#e5e7eb;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#d1d5db;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)" />
        <rect x="2" y="2" width="${width-4}" height="${height-4}" fill="none" stroke="#9ca3af" stroke-width="2" stroke-dasharray="5,5" />
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${Math.min(width, height) / 15}" fill="#6b7280" text-anchor="middle" dominant-baseline="middle">
          ${width} × ${height}
        </text>
        <circle cx="${width * 0.3}" cy="${height * 0.3}" r="${Math.min(width, height) / 20}" fill="#9ca3af" opacity="0.5" />
        <circle cx="${width * 0.7}" cy="${height * 0.7}" r="${Math.min(width, height) / 25}" fill="#9ca3af" opacity="0.3" />
      </svg>
    `.trim();
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Return SVG
    res.status(200).send(svg);
  } catch (error) {
    console.error('Placeholder API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}