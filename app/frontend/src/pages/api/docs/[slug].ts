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
    // Handle different deployment scenarios - try multiple possible paths
    let docsDir: string;
    let filePath: string;
    
    // Try different paths based on deployment context
    const possiblePaths = [
      // Local development from frontend directory
      path.join(process.cwd(), 'public', 'docs'),
      // Vercel deployment from root directory
      path.join(process.cwd(), 'app', 'frontend', 'public', 'docs'),
      // Alternative path resolution
      path.join(__dirname, '../../../../../../public/docs'),
      // Direct relative path
      path.resolve('./public/docs'),
      path.resolve('./app/frontend/public/docs')
    ];
    
    let fileFound = false;
    for (const possiblePath of possiblePaths) {
      filePath = path.join(possiblePath, filename);
      if (fs.existsSync(filePath)) {
        docsDir = possiblePath;
        fileFound = true;
        break;
      }
    }
    
    if (!fileFound) {
      return res.status(404).json({
        error: 'Document not found',
        slug: sanitizedSlug,
        triedPaths: possiblePaths.map(p => path.join(p, filename)),
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
    // Try different paths based on deployment context
    const possiblePaths = [
      // Local development from frontend directory
      path.join(process.cwd(), 'public', 'docs'),
      // Vercel deployment from root directory
      path.join(process.cwd(), 'app', 'frontend', 'public', 'docs'),
      // Alternative path resolution
      path.join(__dirname, '../../../../../../public/docs'),
      // Direct relative path
      path.resolve('./public/docs'),
      path.resolve('./app/frontend/public/docs')
    ];
    
    for (const docsPath of possiblePaths) {
      try {
        if (fs.existsSync(docsPath)) {
          const files = fs.readdirSync(docsPath);
          return files
            .filter(file => file.endsWith('.md'))
            .map(file => {
              // Normalize filename to slug (lowercase, remove .md)
              const base = file.replace('.md', '');
              // Map TECHNICAL_WHITEPAPER.md to technical-whitepaper slug
              return base.toLowerCase() === 'technical_whitepaper' ? 'technical-whitepaper' : base;
            })
            .sort();
        }
      } catch (error) {
        // Continue to next path
        continue;
      }
    }
    
    return [];
  } catch {
    return [];
  }
}
