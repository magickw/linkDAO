import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Read the technical whitepaper file
    const filePath = path.join(process.cwd(), 'public', 'docs', 'TECHNICAL_WHITEPAPER.md');
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