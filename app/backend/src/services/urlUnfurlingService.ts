import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';

export interface UnfurledContent {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  type?: string;
  url?: string;
  favicon?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  tags?: string[];
  locale?: string;
  contentLength?: number;
  responseTime?: number;
  statusCode?: number;
  redirectChain?: string[];
  finalUrl?: string;
}

export interface UnfurlingOptions {
  followRedirects?: boolean;
  maxRedirects?: number;
  timeout?: number;
  userAgent?: string;
  maxContentLength?: number;
  includeContent?: boolean;
}

export class UrlUnfurlingService {
  private readonly defaultOptions: Required<UnfurlingOptions> = {
    followRedirects: true,
    maxRedirects: 5,
    timeout: 10000,
    userAgent: 'LinkDAO-Bot/1.0 (+https://linkdao.io/bot)',
    maxContentLength: 1024 * 1024, // 1MB
    includeContent: false,
  };

  /**
   * Unfurl a URL to extract metadata and content information
   */
  async unfurlUrl(url: string, options: UnfurlingOptions = {}): Promise<UnfurledContent> {
    const opts = { ...this.defaultOptions, ...options };
    const startTime = Date.now();

    try {
      const normalizedUrl = this.normalizeUrl(url);
      const response = await this.fetchUrl(normalizedUrl, opts);
      const responseTime = Date.now() - startTime;

      if (!this.isHtmlContent(response.headers['content-type'])) {
        return this.createBasicUnfurledContent(normalizedUrl, response, responseTime);
      }

      const $ = cheerio.load(response.data);
      const unfurledContent = this.extractMetadata($, normalizedUrl, response, responseTime);

      return unfurledContent;
    } catch (error) {
      console.error('URL unfurling error:', error);
      return {
        url,
        statusCode: error.response?.status || 0,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Unfurl multiple URLs in parallel
   */
  async unfurlUrls(urls: string[], options: UnfurlingOptions = {}): Promise<UnfurledContent[]> {
    const promises = urls.map(url => 
      this.unfurlUrl(url, options).catch(error => ({
        url,
        statusCode: 0,
        responseTime: 0,
      }))
    );

    return await Promise.all(promises);
  }

  /**
   * Extract just the basic information without full content analysis
   */
  async getBasicInfo(url: string): Promise<{
    finalUrl: string;
    statusCode: number;
    contentType: string;
    contentLength: number;
    redirectChain: string[];
    responseTime: number;
  }> {
    const startTime = Date.now();

    try {
      const response = await axios.head(url, {
        timeout: 5000,
        maxRedirects: 5,
        validateStatus: () => true, // Don't throw on any status code
      });

      return {
        finalUrl: response.request.res.responseUrl || url,
        statusCode: response.status,
        contentType: response.headers['content-type'] || '',
        contentLength: parseInt(response.headers['content-length'] || '0'),
        redirectChain: this.extractRedirectChain(response),
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        finalUrl: url,
        statusCode: 0,
        contentType: '',
        contentLength: 0,
        redirectChain: [],
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Check if URL is accessible and safe to unfurl
   */
  async isUrlAccessible(url: string): Promise<{
    accessible: boolean;
    statusCode: number;
    error?: string;
  }> {
    try {
      const response = await axios.head(url, {
        timeout: 5000,
        maxRedirects: 3,
        validateStatus: (status) => status < 500, // Only fail on server errors
      });

      return {
        accessible: response.status < 400,
        statusCode: response.status,
      };
    } catch (error) {
      return {
        accessible: false,
        statusCode: error.response?.status || 0,
        error: error.message,
      };
    }
  }

  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.toString();
    } catch {
      // If URL parsing fails, try adding protocol
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return `https://${url}`;
      }
      return url;
    }
  }

  private async fetchUrl(url: string, options: Required<UnfurlingOptions>): Promise<any> {
    const response = await axios.get(url, {
      timeout: options.timeout,
      maxRedirects: options.maxRedirects,
      headers: {
        'User-Agent': options.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      maxContentLength: options.maxContentLength,
      validateStatus: (status) => status < 500,
    });

    return response;
  }

  private isHtmlContent(contentType: string): boolean {
    if (!contentType) return false;
    return contentType.includes('text/html') || contentType.includes('application/xhtml');
  }

  private createBasicUnfurledContent(
    url: string, 
    response: any, 
    responseTime: number
  ): UnfurledContent {
    const urlObj = new URL(url);
    
    return {
      url,
      finalUrl: response.request.res.responseUrl || url,
      siteName: urlObj.hostname,
      statusCode: response.status,
      contentLength: parseInt(response.headers['content-length'] || '0'),
      responseTime,
      redirectChain: this.extractRedirectChain(response),
    };
  }

  private extractMetadata(
    $: cheerio.CheerioAPI, 
    url: string, 
    response: any, 
    responseTime: number
  ): UnfurledContent {
    const urlObj = new URL(url);
    
    const unfurled: UnfurledContent = {
      url,
      finalUrl: response.request.res.responseUrl || url,
      statusCode: response.status,
      responseTime,
      redirectChain: this.extractRedirectChain(response),
    };

    // Basic HTML metadata
    unfurled.title = this.extractTitle($);
    unfurled.description = this.extractDescription($);
    unfurled.image = this.extractImage($, url);
    unfurled.favicon = this.extractFavicon($, url);
    unfurled.author = this.extractAuthor($);
    unfurled.siteName = this.extractSiteName($, urlObj.hostname);
    unfurled.type = this.extractType($);
    unfurled.locale = this.extractLocale($);
    unfurled.publishedTime = this.extractPublishedTime($);
    unfurled.modifiedTime = this.extractModifiedTime($);
    unfurled.tags = this.extractTags($);

    // Content analysis
    unfurled.contentLength = response.data.length;

    return unfurled;
  }

  private extractTitle($: cheerio.CheerioAPI): string | undefined {
    // Try Open Graph first
    let title = $('meta[property="og:title"]').attr('content');
    
    // Try Twitter Card
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

    return title ? title.trim().substring(0, 200) : undefined;
  }

  private extractDescription($: cheerio.CheerioAPI): string | undefined {
    // Try Open Graph first
    let description = $('meta[property="og:description"]').attr('content');
    
    // Try Twitter Card
    if (!description) {
      description = $('meta[name="twitter:description"]').attr('content');
    }
    
    // Try meta description
    if (!description) {
      description = $('meta[name="description"]').attr('content');
    }

    return description ? description.trim().substring(0, 500) : undefined;
  }

  private extractImage($: cheerio.CheerioAPI, baseUrl: string): string | undefined {
    // Try Open Graph first
    let image = $('meta[property="og:image"]').attr('content');
    
    // Try Twitter Card
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

    return image ? this.resolveUrl(image, baseUrl) : undefined;
  }

  private extractFavicon($: cheerio.CheerioAPI, baseUrl: string): string | undefined {
    // Try various favicon selectors
    const selectors = [
      'link[rel="icon"]',
      'link[rel="shortcut icon"]',
      'link[rel="apple-touch-icon"]',
      'link[rel="apple-touch-icon-precomposed"]',
    ];

    for (const selector of selectors) {
      const href = $(selector).attr('href');
      if (href) {
        return this.resolveUrl(href, baseUrl);
      }
    }

    // Default favicon location
    try {
      const urlObj = new URL(baseUrl);
      return `${urlObj.protocol}//${urlObj.host}/favicon.ico`;
    } catch {
      return undefined;
    }
  }

  private extractAuthor($: cheerio.CheerioAPI): string | undefined {
    // Try various author selectors
    const selectors = [
      'meta[name="author"]',
      'meta[property="article:author"]',
      'meta[name="twitter:creator"]',
      '[rel="author"]',
      '.author',
      '.byline',
    ];

    for (const selector of selectors) {
      const author = $(selector).attr('content') || $(selector).text();
      if (author) {
        return author.trim().substring(0, 100);
      }
    }

    return undefined;
  }

  private extractSiteName($: cheerio.CheerioAPI, hostname: string): string | undefined {
    // Try Open Graph site name
    let siteName = $('meta[property="og:site_name"]').attr('content');
    
    // Try Twitter site
    if (!siteName) {
      siteName = $('meta[name="twitter:site"]').attr('content');
    }
    
    // Try application name
    if (!siteName) {
      siteName = $('meta[name="application-name"]').attr('content');
    }

    return siteName ? siteName.trim() : hostname;
  }

  private extractType($: cheerio.CheerioAPI): string | undefined {
    return $('meta[property="og:type"]').attr('content');
  }

  private extractLocale($: cheerio.CheerioAPI): string | undefined {
    // Try Open Graph locale
    let locale = $('meta[property="og:locale"]').attr('content');
    
    // Try HTML lang attribute
    if (!locale) {
      locale = $('html').attr('lang');
    }

    return locale;
  }

  private extractPublishedTime($: cheerio.CheerioAPI): string | undefined {
    const selectors = [
      'meta[property="article:published_time"]',
      'meta[name="date"]',
      'time[datetime]',
      '.published',
      '.date',
    ];

    for (const selector of selectors) {
      const time = $(selector).attr('content') || $(selector).attr('datetime') || $(selector).text();
      if (time) {
        return time.trim();
      }
    }

    return undefined;
  }

  private extractModifiedTime($: cheerio.CheerioAPI): string | undefined {
    return $('meta[property="article:modified_time"]').attr('content');
  }

  private extractTags($: cheerio.CheerioAPI): string[] | undefined {
    const tags: string[] = [];

    // Try meta keywords
    const keywords = $('meta[name="keywords"]').attr('content');
    if (keywords) {
      tags.push(...keywords.split(',').map(k => k.trim()));
    }

    // Try article tags
    $('meta[property="article:tag"]').each((_, el) => {
      const tag = $(el).attr('content');
      if (tag) tags.push(tag.trim());
    });

    return tags.length > 0 ? tags.slice(0, 10) : undefined;
  }

  private extractRedirectChain(response: any): string[] {
    const chain: string[] = [];
    
    if (response.request._redirectable && response.request._redirectable._redirects) {
      response.request._redirectable._redirects.forEach((redirect: any) => {
        chain.push(redirect.url);
      });
    }

    return chain;
  }

  private resolveUrl(url: string, baseUrl: string): string {
    try {
      return new URL(url, baseUrl).toString();
    } catch {
      return url;
    }
  }
}