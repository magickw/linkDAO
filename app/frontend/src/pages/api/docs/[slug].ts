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
 *
 * Note: This endpoint always returns JSON responses, even for errors.
 * All exceptions are caught and converted to proper JSON error responses.
 */

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // CRITICAL: Wrap entire handler in try-catch to prevent unhandled exceptions
  // that cause Next.js to return HTML error pages instead of JSON
  try {
    // Set JSON content type to ensure proper response format
    res.setHeader('Content-Type', 'application/json');

    const { slug } = req.query;

    if (!slug || typeof slug !== 'string') {
      console.log('[Docs API] Invalid slug:', slug);
      return res.status(400).json({
        success: false,
        error: 'Document slug is required'
      });
    }

    console.log('[Docs API] Processing request for slug:', slug);

    // Security: Prevent directory traversal
    const sanitizedSlug = slug.replace(/\.\./g, '').replace(/\//g, '');

    // Special case: technical-whitepaper maps to TECHNICAL_WHITEPAPER.md
    let filename = `${sanitizedSlug}.md`;
    if (sanitizedSlug === 'technical-whitepaper') {
      filename = 'TECHNICAL_WHITEPAPER.md';
    }

    console.log('[Docs API] Looking for file:', filename);
    console.log('[Docs API] Current working directory:', process.cwd());

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

    console.log('[Docs API] Trying paths:', possiblePaths);

    for (const possiblePath of possiblePaths) {
      try {
        const tryPath = path.join(possiblePath, filename);
        console.log('[Docs API] Checking path:', tryPath);

        if (fs.existsSync(tryPath)) {
          docsDir = possiblePath;
          filePath = tryPath;
          console.log('[Docs API] Found file at:', filePath);
          break;
        }
      } catch (error) {
        // Continue to next path if this one fails
        console.error(`[Docs API] Error checking path ${possiblePath}:`, error);
        continue;
      }
    }

    if (!filePath) {
      console.error('[Docs API] File not found:', filename);
      return res.status(404).json({
        success: false,
        error: 'Document not found',
        slug: sanitizedSlug,
        message: `Could not find ${filename} in any of the expected locations`,
        triedPaths: possiblePaths.map(p => path.join(p, filename))
      });
    }

    // Read file content with error handling
    let fileContent: string;
    try {
      fileContent = fs.readFileSync(filePath, 'utf8');
      console.log('[Docs API] Successfully read file, length:', fileContent.length);
    } catch (readError) {
      console.error('[Docs API] Error reading file:', readError);
      return res.status(500).json({
        success: false,
        error: 'Failed to read document',
        message: readError instanceof Error ? readError.message : 'Unknown error reading file',
        slug: sanitizedSlug
      });
    }

    // Get file stats for metadata with error handling
    let stats: fs.Stats;
    try {
      stats = fs.statSync(filePath);
    } catch (statsError) {
      console.error('[Docs API] Error getting file stats:', statsError);
      // Continue without stats - we have the content
      return res.status(200).json({
        success: true,
        content: fileContent,
        slug: sanitizedSlug,
        title: extractTitle(fileContent) || sanitizedSlug
      });
    }

    const wordCount = fileContent.split(/\s+/).length;
    const estimatedReadingTime = Math.ceil(wordCount / 200); // 200 words per minute

    console.log('[Docs API] Returning document successfully');

    // Return content with metadata
    return res.status(200).json({
      success: true,
      content: fileContent,
      slug: sanitizedSlug,
      title: extractTitle(fileContent) || sanitizedSlug,
      lastUpdated: stats.mtime.toISOString(),
      wordCount,
      estimatedReadingTime,
      fileSize: stats.size
    });
  } catch (error) {
    // This is the outermost catch - ensures we ALWAYS return JSON
    console.error(`[Docs API] Unhandled error in handler:`, error);

    // Ensure we haven't already sent a response
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        slug: req.query.slug
      });
    }
  }
}

/**
 * Extract title from markdown content (first H1)
 */
function extractTitle(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1] : null;
}
