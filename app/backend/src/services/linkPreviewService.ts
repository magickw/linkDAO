/**
 * Link Preview Service
 * Fetches Open Graph metadata from URLs for rich link previews in messages
 */

import { safeLogger } from '../utils/safeLogger';
import { cacheService } from './cacheService';

interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  type?: string;
  favicon?: string;
  domain: string;
}

// Simple in-memory cache for link previews
const previewCache = new Map<string, { data: LinkPreview; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

class LinkPreviewService {
  private readonly userAgent = 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)';
  private readonly timeout = 5000; // 5 seconds

  /**
   * Fetch link preview metadata for a URL
   */
  async getPreview(url: string): Promise<LinkPreview | null> {
    try {
      // Validate URL
      const parsedUrl = new URL(url);
      const domain = parsedUrl.hostname;

      // Check memory cache first
      const cached = previewCache.get(url);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
      }

      // Check persistent cache
      const persistentCached = await cacheService.get(`link_preview:${url}`);
      if (persistentCached && typeof persistentCached === 'string') {
        const preview = JSON.parse(persistentCached);
        previewCache.set(url, { data: preview, timestamp: Date.now() });
        return preview;
      }

      // Fetch the page
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        safeLogger.warn(`Link preview failed for ${url}: ${response.status}`);
        return null;
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        // Return basic preview for non-HTML content
        return {
          url,
          domain,
          title: parsedUrl.pathname.split('/').pop() || url,
          type: contentType.split('/')[0],
        };
      }

      const html = await response.text();
      const preview = this.parseOpenGraph(html, url, domain);

      // Cache the result
      previewCache.set(url, { data: preview, timestamp: Date.now() });
      await cacheService.set(`link_preview:${url}`, JSON.stringify(preview), CACHE_TTL / 1000);

      return preview;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        safeLogger.warn(`Link preview timeout for ${url}`);
      } else {
        safeLogger.error(`Link preview error for ${url}:`, error);
      }
      return null;
    }
  }

  /**
   * Parse Open Graph and meta tags from HTML
   */
  private parseOpenGraph(html: string, url: string, domain: string): LinkPreview {
    const preview: LinkPreview = { url, domain };

    // Helper to extract meta content
    const getMetaContent = (property: string): string | undefined => {
      // Try og: prefix
      const ogMatch = html.match(new RegExp(`<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']+)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:${property}["']`, 'i'));
      if (ogMatch) return ogMatch[1];

      // Try twitter: prefix
      const twitterMatch = html.match(new RegExp(`<meta[^>]*name=["']twitter:${property}["'][^>]*content=["']([^"']+)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:${property}["']`, 'i'));
      if (twitterMatch) return twitterMatch[1];

      // Try generic meta name
      const nameMatch = html.match(new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${property}["']`, 'i'));
      if (nameMatch) return nameMatch[1];

      return undefined;
    };

    // Extract Open Graph metadata
    preview.title = getMetaContent('title') || this.extractTitle(html);
    preview.description = getMetaContent('description');
    preview.image = getMetaContent('image');
    preview.siteName = getMetaContent('site_name');
    preview.type = getMetaContent('type');

    // Make image URL absolute
    if (preview.image && !preview.image.startsWith('http')) {
      try {
        preview.image = new URL(preview.image, url).href;
      } catch {
        // Invalid URL, keep as-is or clear
        preview.image = undefined;
      }
    }

    // Extract favicon
    const faviconMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i)
      || html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i);
    if (faviconMatch) {
      try {
        preview.favicon = new URL(faviconMatch[1], url).href;
      } catch {
        preview.favicon = `https://${domain}/favicon.ico`;
      }
    } else {
      preview.favicon = `https://${domain}/favicon.ico`;
    }

    return preview;
  }

  /**
   * Extract title from HTML
   */
  private extractTitle(html: string): string | undefined {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : undefined;
  }

  /**
   * Extract URLs from message content
   */
  extractUrls(content: string): string[] {
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
    const matches = content.match(urlRegex) || [];
    // Remove trailing punctuation
    return matches.map(url => url.replace(/[.,;:!?)]+$/, ''));
  }

  /**
   * Get previews for all URLs in a message
   */
  async getPreviewsForMessage(content: string): Promise<LinkPreview[]> {
    const urls = this.extractUrls(content);
    const previews: LinkPreview[] = [];

    // Limit to first 3 URLs
    for (const url of urls.slice(0, 3)) {
      const preview = await this.getPreview(url);
      if (preview) {
        previews.push(preview);
      }
    }

    return previews;
  }

  /**
   * Clear cache for a specific URL
   */
  async clearCache(url: string): Promise<void> {
    previewCache.delete(url);
    await cacheService.invalidate(`link_preview:${url}`);
  }
}

export const linkPreviewService = new LinkPreviewService();
export default linkPreviewService;
