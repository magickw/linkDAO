import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

/**
 * Universal Document API Endpoint
 *
 * Serves all documentation markdown files from /public/docs/
 * Usage: /api/docs/[slug] where slug is the document filename without .md
 *
 * Examples:
 * - /api/docs/introduction
 * - /api/docs/marketplace-guide
 * - /api/docs/governance-guide
 */

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { slug } = req.query;

  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'Document slug is required' });
  }

  try {
    // Security: Prevent directory traversal
    const sanitizedSlug = slug.replace(/\.\./g, '').replace(/\//g, '');

    // Special case: technical-whitepaper maps to TECHNICAL_WHITEPAPER.md
    let filename = `${sanitizedSlug}.md`;
    if (sanitizedSlug === 'technical-whitepaper') {
      filename = 'TECHNICAL_WHITEPAPER.md';
    }

    // Build file path - try multiple possible locations
    let docsDir: string | null = null;
    let filePath: string | null = null;

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
        docsDir = possiblePath;
        filePath = tryPath;
        break;
      }
    }

    if (!filePath) {
      return res.status(404).json({
        error: 'Document not found',
        slug: sanitizedSlug,
        triedPaths: possiblePaths.map(p => path.join(p, filename))
      });
    }

    // Read file content
    const fileContent = fs.readFileSync(filePath, 'utf8');

    // Get file stats for metadata
    const stats = fs.statSync(filePath);
    const wordCount = fileContent.split(/\s+/).length;
    const estimatedReadingTime = Math.ceil(wordCount / 200); // 200 words per minute

    // Return content with metadata
    res.status(200).json({
      content: fileContent,
      slug: sanitizedSlug,
      title: extractTitle(fileContent) || sanitizedSlug,
      lastUpdated: stats.mtime.toISOString(),
      wordCount,
      estimatedReadingTime,
      fileSize: stats.size
    });
  } catch (error) {
    console.error(`Error reading document ${slug}:`, error);
    res.status(500).json({
      error: 'Failed to load document',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Extract title from markdown content (first H1)
 */
function extractTitle(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1] : null;
}
