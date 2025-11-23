import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import { getDocPath, getAvailableDocuments } from '../../../utils/docUtils';

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
    const filePath = getDocPath(slug);

    if (!filePath) {
      return res.status(404).json({
        error: 'Document not found',
        slug,
        availableDocuments: getAvailableDocuments()
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
      slug,
      title: extractTitle(fileContent) || slug,
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
