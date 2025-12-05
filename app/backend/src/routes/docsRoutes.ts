import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

// Generic docs endpoint handler - reads actual markdown files
router.get('/:slug', (req, res) => {
  try {
    const { slug } = req.params;

    // Security: Prevent directory traversal
    const sanitizedSlug = slug.replace(/\.\./g, '').replace(/\//g, '');

    // Special case: technical-whitepaper maps to TECHNICAL_WHITEPAPER.md
    let filename = `${sanitizedSlug}.md`;
    if (sanitizedSlug === 'technical-whitepaper') {
      filename = 'TECHNICAL_WHITEPAPER.md';
    }

    // Build file path - look for docs in frontend/public/docs
    const possiblePaths = [
      // Standard relative path from backend to frontend docs
      path.join(__dirname, '../../../frontend/public/docs', filename),
      // Alternative path when running from project root
      path.join(process.cwd(), 'app', 'frontend', 'public', 'docs', filename),
      // Path when backend and docs are deployed together
      path.join(__dirname, '../../public/docs', filename),
      // Direct path resolution
      path.resolve(__dirname, '../../../frontend/public/docs', filename),
      path.resolve(process.cwd(), 'app/frontend/public/docs', filename),
      path.resolve('./app/frontend/public/docs', filename),
      // In case docs are copied to backend
      path.join(__dirname, '../public/docs', filename),
      path.join(__dirname, '../../docs', filename)
    ];

    let filePath: string | null = null;
    let fileFound = false;

    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        filePath = possiblePath;
        fileFound = true;
        break;
      }
    }

    if (!fileFound || !filePath) {
      return res.status(404).json({
        success: false,
        error: `Documentation not found for: ${sanitizedSlug}`,
        slug: sanitizedSlug,
        triedPaths: possiblePaths // Include this for debugging purposes
      });
    }

    // Read file content
    const fileContent = fs.readFileSync(filePath, 'utf8');

    // Get file stats for metadata
    const stats = fs.statSync(filePath);
    const wordCount = fileContent.split(/\s+/).length;
    const estimatedReadingTime = Math.ceil(wordCount / 200); // 200 words per minute

    // Extract title from markdown content (first H1)
    const titleMatch = fileContent.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : sanitizedSlug;

    // Return content with metadata (matching the format expected by frontend)
    res.json({
      success: true,
      content: fileContent,
      title: title,
      lastUpdated: stats.mtime.toISOString(),
      wordCount,
      estimatedReadingTime,
      fileSize: stats.size
    });
  } catch (error) {
    console.error('Error fetching documentation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch documentation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Docs list endpoint
router.get('/', (req, res) => {
  try {
    // Try to read the docs directory
    const possibleDocsPaths = [
      path.join(__dirname, '../../../frontend/public/docs'),
      path.join(process.cwd(), 'app', 'frontend', 'public', 'docs'),
      path.resolve(__dirname, '../../../frontend/public/docs'),
      path.resolve(process.cwd(), 'app/frontend/public/docs')
    ];

    let docsPath: string | null = null;
    for (const possiblePath of possibleDocsPaths) {
      if (fs.existsSync(possiblePath)) {
        docsPath = possiblePath;
        break;
      }
    }

    if (!docsPath) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Read all markdown files in the docs directory
    const files = fs.readdirSync(docsPath).filter(file => file.endsWith('.md'));

    const docList = files.map(file => {
      const filePath = path.join(docsPath!, file);
      const stats = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : file.replace('.md', '');

      // Convert filename to slug
      let slug = file.replace('.md', '');
      if (file === 'TECHNICAL_WHITEPAPER.md') {
        slug = 'technical-whitepaper';
      }

      return {
        slug,
        title,
        lastUpdated: stats.mtime.toISOString()
      };
    });

    res.json({
      success: true,
      data: docList
    });
  } catch (error) {
    console.error('Error fetching documentation list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch documentation list'
    });
  }
});

export { router as docsRoutes };