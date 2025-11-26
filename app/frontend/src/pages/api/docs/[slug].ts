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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    // First try to read from filesystem (works in local dev and some deployments)
    let fileContent: string | null = null;
    let filePath: string | null = null;

    // Build file path - try multiple possible locations
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

    console.log('[Docs API] Trying filesystem paths:', possiblePaths);

    for (const possiblePath of possiblePaths) {
      try {
        const tryPath = path.join(possiblePath, filename);
        console.log('[Docs API] Checking path:', tryPath);

        if (fs.existsSync(tryPath)) {
          filePath = tryPath;
          fileContent = fs.readFileSync(tryPath, 'utf8');
          console.log('[Docs API] Found file at:', filePath);
          break;
        }
      } catch (error) {
        // Continue to next path if this one fails
        console.log(`[Docs API] Path ${possiblePath} not accessible`);
        continue;
      }
    }

    // If filesystem read failed, try fetching from public URL (for serverless deployments)
    if (!fileContent) {
      console.log('[Docs API] Filesystem read failed, trying HTTP fetch...');

      // Get the host from the request or use environment variable
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host || process.env.VERCEL_URL || process.env.NEXT_PUBLIC_APP_URL || 'localhost:3000';
      const baseUrl = `${protocol}://${host}`;

      // Try fetching the file from the public folder via HTTP
      const publicUrl = `${baseUrl}/docs/${filename}`;
      console.log('[Docs API] Fetching from:', publicUrl);

      try {
        const fetchResponse = await fetch(publicUrl);
        if (fetchResponse.ok) {
          const contentType = fetchResponse.headers.get('content-type') || '';
          // Make sure we're getting markdown, not HTML
          if (contentType.includes('text/') || contentType.includes('application/octet-stream') || !contentType.includes('html')) {
            fileContent = await fetchResponse.text();
            // Verify it's not an HTML error page
            if (!fileContent.startsWith('<!DOCTYPE') && !fileContent.startsWith('<html')) {
              console.log('[Docs API] Successfully fetched from public URL');
            } else {
              console.log('[Docs API] Received HTML instead of markdown');
              fileContent = null;
            }
          }
        } else {
          console.log('[Docs API] HTTP fetch failed:', fetchResponse.status);
        }
      } catch (fetchError) {
        console.error('[Docs API] HTTP fetch error:', fetchError);
      }
    }

    if (!fileContent) {
      console.error('[Docs API] File not found:', filename);
      return res.status(404).json({
        success: false,
        error: 'Document not found',
        slug: sanitizedSlug,
        message: `Could not find ${filename}. The document may not exist or may not be accessible.`,
        hint: 'Make sure the document file exists in the public/docs folder.'
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
      wordCount,
      estimatedReadingTime,
      fileSize: fileContent.length
    });
  } catch (error) {
    // This is the outermost catch - ensures we ALWAYS return JSON
    console.error(`[Docs API] Unhandled error in handler:`, error);
    console.error(`[Docs API] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
    console.error(`[Docs API] Error details:`, {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      slug: req.query.slug
    });

    // Ensure we haven't already sent a response
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        slug: req.query.slug,
        hint: 'Check server logs for more details'
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
