import axios from 'axios';
import { safeLogger } from '../utils/safeLogger';
import * as cheerio from 'cheerio';

interface LinkScrapingOptions {
  timeout?: number;
  maxFileSize?: number;
  userAgent?: string;
}

interface LinkData {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  type?: string;
  favicon?: string;
  publishedTime?: string;
  author?: string;
  metadata?: Record<string, any>;
  securityScore?: number;
}

export class LinkScraperService {
  private readonly defaultOptions: LinkScrapingOptions = {
    timeout: 10000,
    maxFileSize: 5 * 1024 * 1024, // 5MB
    userAgent: 'LinkDAO-Preview-Bot/1.0'
  };

  async scrapeUrl(url: string, options?: LinkScrapingOptions): Promise<LinkData> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      // Validate URL
      const urlObj = new URL(url);
      
      // Make HTTP request with security measures
      const response = await axios.get(url, {
        timeout: opts.timeout,
        maxContentLength: opts.maxFileSize,
        maxRedirects: 5,
        headers: {
          'User-Agent': opts.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        validateStatus: (status) => status < 400
      });

      // Parse HTML content
      const $ = cheerio.load(response.data);
      
      // Extract metadata
      const linkData: LinkData = {
        title: this.extractTitle($),
        description: this.extractDescription($),
        image: this.extractImage($, urlObj),
        siteName: this.extractSiteName($, urlObj),
        type: this.extractType($),
        favicon: this.extractFavicon($, urlObj),
        publishedTime: this.extractPublishedTime($),
        author: this.extractAuthor($),
        metadata: this.extractAdditionalMetadata($),
        securityScore: this.calculateSecurityScore(response, $)
      };

      return linkData;
    } catch (error) {
      safeLogger.error('Link scraping failed:', error);
      
      // Return minimal data for failed scrapes
      return {
        title: 'Unable to load title',
        description: 'Content could not be retrieved',
        siteName: new URL(url).hostname,
        securityScore: 0
      };
    }
  }

  private extractTitle($: cheerio.CheerioAPI): string {
    // Try Open Graph title first
    let title = $('meta[property="og:title"]').attr('content');
    
    // Try Twitter title
    if (!title) {
      title = $('meta[name="twitter:title"]').attr('content');
    }
    
    // Try regular title tag
    if (!title) {
      title = $('title').text();
    }
    
    // Try h1 as fallback
    if (!title) {
      title = $('h1').first().text();
    }

    return title?.trim() || 'No Title';
  }

  private extractDescription($: cheerio.CheerioAPI): string {
    // Try Open Graph description
    let description = $('meta[property="og:description"]').attr('content');
    
    // Try Twitter description
    if (!description) {
      description = $('meta[name="twitter:description"]').attr('content');
    }
    
    // Try meta description
    if (!description) {
      description = $('meta[name="description"]').attr('content');
    }

    return description?.trim() || '';
  }

  private extractImage($: cheerio.CheerioAPI, urlObj: URL): string {
    // Try Open Graph image
    let image = $('meta[property="og:image"]').attr('content');
    
    // Try Twitter image
    if (!image) {
      image = $('meta[name="twitter:image"]').attr('content');
    }
    
    // Try to find a prominent image
    if (!image) {
      const imgSrc = $('img').first().attr('src');
      if (imgSrc) {
        image = imgSrc;
      }
    }

    // Convert relative URLs to absolute
    if (image && !image.startsWith('http')) {
      if (image.startsWith('//')) {
        image = urlObj.protocol + image;
      } else if (image.startsWith('/')) {
        image = urlObj.origin + image;
      } else {
        image = urlObj.origin + '/' + image;
      }
    }

    return image || '';
  }

  private extractSiteName($: cheerio.CheerioAPI, urlObj: URL): string {
    // Try Open Graph site name
    let siteName = $('meta[property="og:site_name"]').attr('content');
    
    // Try application name
    if (!siteName) {
      siteName = $('meta[name="application-name"]').attr('content');
    }

    return siteName?.trim() || urlObj.hostname;
  }

  private extractType($: cheerio.CheerioAPI): string {
    // Try Open Graph type
    let type = $('meta[property="og:type"]').attr('content');
    
    // Try to detect type from content
    if (!type) {
      if ($('video').length > 0 || $('meta[property="og:video"]').length > 0) {
        type = 'video';
      } else if ($('article').length > 0 || $('meta[property="article:published_time"]').length > 0) {
        type = 'article';
      } else {
        type = 'website';
      }
    }

    return type;
  }

  private extractFavicon($: cheerio.CheerioAPI, urlObj: URL): string {
    // Try various favicon selectors
    const faviconSelectors = [
      'link[rel="icon"]',
      'link[rel="shortcut icon"]',
      'link[rel="apple-touch-icon"]'
    ];

    for (const selector of faviconSelectors) {
      const href = $(selector).attr('href');
      if (href) {
        // Convert relative URLs to absolute
        if (!href.startsWith('http')) {
          if (href.startsWith('//')) {
            return urlObj.protocol + href;
          } else if (href.startsWith('/')) {
            return urlObj.origin + href;
          } else {
            return urlObj.origin + '/' + href;
          }
        }
        return href;
      }
    }

    // Default favicon location
    return urlObj.origin + '/favicon.ico';
  }

  private extractPublishedTime($: cheerio.CheerioAPI): string | undefined {
    // Try various published time selectors
    const timeSelectors = [
      'meta[property="article:published_time"]',
      'meta[name="pubdate"]',
      'time[datetime]',
      'meta[property="og:updated_time"]'
    ];

    for (const selector of timeSelectors) {
      const time = $(selector).attr('content') || $(selector).attr('datetime');
      if (time) {
        return time;
      }
    }

    return undefined;
  }

  private extractAuthor($: cheerio.CheerioAPI): string | undefined {
    // Try various author selectors
    const authorSelectors = [
      'meta[name="author"]',
      'meta[property="article:author"]',
      'meta[name="twitter:creator"]',
      '[rel="author"]'
    ];

    for (const selector of authorSelectors) {
      const author = $(selector).attr('content') || $(selector).text();
      if (author) {
        return author.trim();
      }
    }

    return undefined;
  }

  private extractAdditionalMetadata($: cheerio.CheerioAPI): Record<string, any> {
    const metadata: Record<string, any> = {};

    // Extract all meta tags
    $('meta').each((_, element) => {
      const $meta = $(element);
      const name = $meta.attr('name') || $meta.attr('property');
      const content = $meta.attr('content');
      
      if (name && content) {
        metadata[name] = content;
      }
    });

    // Extract structured data (JSON-LD)
    $('script[type="application/ld+json"]').each((_, element) => {
      try {
        const jsonLd = JSON.parse($(element).html() || '');
        metadata.jsonLd = jsonLd;
      } catch (error) {
        // Ignore invalid JSON-LD
      }
    });

    return metadata;
  }

  private calculateSecurityScore(response: any, $: cheerio.CheerioAPI): number {
    let score = 100;

    // Check HTTPS
    if (!response.config.url.startsWith('https://')) {
      score -= 20;
    }

    // Check for security headers
    const securityHeaders = [
      'strict-transport-security',
      'content-security-policy',
      'x-frame-options',
      'x-content-type-options'
    ];

    securityHeaders.forEach(header => {
      if (!response.headers[header]) {
        score -= 5;
      }
    });

    // Check for suspicious content
    const suspiciousKeywords = [
      'free crypto',
      'claim now',
      'limited time',
      'urgent action'
    ];

    const pageText = $.text().toLowerCase();
    suspiciousKeywords.forEach(keyword => {
      if (pageText.includes(keyword)) {
        score -= 10;
      }
    });

    return Math.max(0, score);
  }

  async scrapeBulkUrls(urls: string[], options?: LinkScrapingOptions): Promise<Record<string, LinkData>> {
    const results: Record<string, LinkData> = {};
    
    // Process in batches to avoid overwhelming target servers
    const batchSize = 5;
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const batchPromises = batch.map(async url => {
        try {
          const data = await this.scrapeUrl(url, options);
          return { url, data };
        } catch (error) {
          return {
            url,
            data: {
              title: 'Failed to load',
              description: 'Content could not be retrieved',
              siteName: new URL(url).hostname,
              securityScore: 0
            }
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ url, data }) => {
        results[url] = data;
      });

      // Add delay between batches to be respectful
      if (i + batchSize < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}

export const linkScraperService = new LinkScraperService();
