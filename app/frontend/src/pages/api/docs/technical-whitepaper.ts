import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Build file path - try multiple possible locations
    let filePath: string | null = null;
    const filename = 'TECHNICAL_WHITEPAPER.md';

    const possiblePaths = [
      // Local development from frontend directory
      path.join(process.cwd(), 'public', 'docs'),
      // Vercel deployment from root directory
      path.join(process.cwd(), 'app', 'frontend', 'public', 'docs'),
      // Direct relative path
      path.resolve('./public/docs'),
      path.resolve('./app/frontend/public/docs')
    ];

    for (const possiblePath of possiblePaths) {
      const tryPath = path.join(possiblePath, filename);
      if (fs.existsSync(tryPath)) {
        filePath = tryPath;
        break;
      }
    }

    if (!filePath) {
      return res.status(404).json({ error: 'Technical whitepaper not found' });
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');

    // Return the content as JSON
    res.status(200).json({
      content: fileContent,
      title: 'Technical Whitepaper',
      lastUpdated: new Date().toISOString(),
      wordCount: fileContent.split(/\s+/).length,
      estimatedReadingTime: Math.ceil(fileContent.split(/\s+/).length / 200) // Average reading speed: 200 words per minute
    });
  } catch (error) {
    console.error('Error reading technical whitepaper:', error);
    res.status(500).json({ error: 'Failed to load technical whitepaper' });
  }
}