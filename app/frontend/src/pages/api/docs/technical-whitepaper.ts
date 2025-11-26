import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Set JSON content type to ensure proper response format
    res.setHeader('Content-Type', 'application/json');

    // Build file path - try multiple possible locations
    let fileContent: string | null = null;
    const filename = 'TECHNICAL_WHITEPAPER.md';

    const possiblePaths = [
      // Local development from frontend directory
      path.join(process.cwd(), 'public', 'docs'),
      // Vercel deployment from root directory
      path.join(process.cwd(), 'app', 'frontend', 'public', 'docs'),
      // Direct relative path
      path.resolve('./public/docs'),
      path.resolve('./app/frontend/public/docs'),
      // Vercel serverless function path
      path.join(process.cwd(), '.next', 'server', 'pages', 'docs'),
    ];

    // Try filesystem first
    for (const possiblePath of possiblePaths) {
      try {
        const tryPath = path.join(possiblePath, filename);
        if (fs.existsSync(tryPath)) {
          fileContent = fs.readFileSync(tryPath, 'utf8');
          console.log('[Technical Whitepaper API] Found file at:', tryPath);
          break;
        }
      } catch (error) {
        continue;
      }
    }

    // If filesystem read failed, try fetching from public URL
    if (!fileContent) {
      console.log('[Technical Whitepaper API] Filesystem read failed, trying HTTP fetch...');

      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host || process.env.VERCEL_URL || process.env.NEXT_PUBLIC_APP_URL || 'localhost:3000';
      const baseUrl = `${protocol}://${host}`;
      const publicUrl = `${baseUrl}/docs/${filename}`;

      try {
        const fetchResponse = await fetch(publicUrl);
        if (fetchResponse.ok) {
          const text = await fetchResponse.text();
          if (!text.startsWith('<!DOCTYPE') && !text.startsWith('<html')) {
            fileContent = text;
            console.log('[Technical Whitepaper API] Successfully fetched from public URL');
          }
        }
      } catch (fetchError) {
        console.error('[Technical Whitepaper API] HTTP fetch error:', fetchError);
      }
    }

    if (!fileContent) {
      return res.status(404).json({
        success: false,
        error: 'Technical whitepaper not found',
        message: 'Could not find TECHNICAL_WHITEPAPER.md in any expected location.'
      });
    }

    // Return the content as JSON
    res.status(200).json({
      success: true,
      content: fileContent,
      title: 'Technical Whitepaper',
      lastUpdated: new Date().toISOString(),
      wordCount: fileContent.split(/\s+/).length,
      estimatedReadingTime: Math.ceil(fileContent.split(/\s+/).length / 200)
    });
  } catch (error) {
    console.error('Error reading technical whitepaper:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load technical whitepaper',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}