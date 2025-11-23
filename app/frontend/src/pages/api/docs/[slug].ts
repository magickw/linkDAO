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

    // Build file path
    const filePath = path.join(process.cwd(), 'public', 'docs', filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'Document not found',
        slug: sanitizedSlug,
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

/**
 * Get list of available documents
 */
function getAvailableDocuments(): string[] {
  try {
    const docsPath = path.join(process.cwd(), 'public', 'docs');
    const files = fs.readdirSync(docsPath);
    return files
      .filter(file => file.endsWith('.md') && file !== 'TECHNICAL_WHITEPAPER.md')
      .map(file => file.replace('.md', ''))
      .sort();
  } catch {
    return [];
  }
}
