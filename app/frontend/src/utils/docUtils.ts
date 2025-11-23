import fs from 'fs';
import path from 'path';

/**
 * Get the path to the documentation directory
 * Tries multiple possible locations to handle different deployment environments
 */
export function getDocsDirectory(): string | null {
    const possiblePaths = [
        // Local development from frontend directory
        path.join(process.cwd(), 'public', 'docs'),
        // Vercel deployment from root directory
        path.join(process.cwd(), 'app', 'frontend', 'public', 'docs'),
        // Direct relative path
        path.resolve('./public/docs'),
        path.resolve('./app/frontend/public/docs')
    ];

    for (const docsPath of possiblePaths) {
        if (fs.existsSync(docsPath)) {
            return docsPath;
        }
    }

    return null;
}

/**
 * Get the full path for a specific document
 * @param slug The document slug (filename without extension)
 */
export function getDocPath(slug: string): string | null {
    const docsDir = getDocsDirectory();

    if (!docsDir) {
        return null;
    }

    // Sanitize slug to prevent directory traversal
    const sanitizedSlug = slug.replace(/\.\./g, '').replace(/\//g, '');

    // Handle special cases
    let filename = `${sanitizedSlug}.md`;
    if (sanitizedSlug === 'technical-whitepaper') {
        filename = 'TECHNICAL_WHITEPAPER.md';
    }

    const filePath = path.join(docsDir, filename);

    if (fs.existsSync(filePath)) {
        return filePath;
    }

    return null;
}

/**
 * Get list of all available documents
 */
export function getAvailableDocuments(): string[] {
    const docsDir = getDocsDirectory();

    if (!docsDir) {
        return [];
    }

    try {
        const files = fs.readdirSync(docsDir);
        return files
            .filter(file => file.endsWith('.md'))
            .map(file => {
                const base = file.replace('.md', '');
                return base === 'TECHNICAL_WHITEPAPER' ? 'technical-whitepaper' : base;
            })
            .sort();
    } catch (error) {
        console.error('Error listing documents:', error);
        return [];
    }
}
