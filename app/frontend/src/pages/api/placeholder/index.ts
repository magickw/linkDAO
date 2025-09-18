import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Default placeholder (400x300)
  const width = 400;
  const height = 300;
  
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
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="20" fill="#6b7280" text-anchor="middle" dominant-baseline="middle">
        ${width} × ${height}
      </text>
      <circle cx="120" cy="90" r="15" fill="#9ca3af" opacity="0.5" />
      <circle cx="280" cy="210" r="10" fill="#9ca3af" opacity="0.3" />
    </svg>
  `.trim();
  
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  res.status(200).send(svg);
}