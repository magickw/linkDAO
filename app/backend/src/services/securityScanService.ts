import { safeLogger } from '../utils/safeLogger';

interface SecurityScanResult {
  status: 'safe' | 'warning' | 'blocked';
  score: number;
  threats: string[];
  recommendations: string[];
  scannedAt: Date;
}

export class SecurityScanService {
  private readonly blockedDomains = [
    'malicious-site.com',
    'phishing-example.com',
    'scam-nft.com'
  ];

  private readonly suspiciousDomains = [
    'bit.ly',
    'tinyurl.com',
    'shortened.link'
  ];

  async scanUrl(url: string, preview?: any): Promise<SecurityScanResult> {
    const threats: string[] = [];
    const recommendations: string[] = [];
    let score = 100; // Start with perfect score

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase();

      // Check blocked domains
      if (this.blockedDomains.some(blocked => domain.includes(blocked))) {
        threats.push('Domain is on blocklist');
        score = 0;
        return {
          status: 'blocked',
          score,
          threats,
          recommendations: ['Do not visit this site'],
          scannedAt: new Date()
        };
      }

      // Check suspicious domains
      if (this.suspiciousDomains.some(suspicious => domain.includes(suspicious))) {
        threats.push('URL shortener detected');
        recommendations.push('Be cautious with shortened URLs');
        score -= 20;
      }

      // Check for suspicious URL patterns
      if (this.hasSuspiciousPatterns(url)) {
        threats.push('Suspicious URL patterns detected');
        recommendations.push('Verify the legitimacy of this URL');
        score -= 15;
      }

      // Check HTTPS
      if (urlObj.protocol !== 'https:') {
        threats.push('Non-HTTPS connection');
        recommendations.push('Prefer HTTPS sites for security');
        score -= 10;
      }

      // Check for suspicious content in preview
      if (preview && this.hasSuspiciousContent(preview)) {
        threats.push('Suspicious content detected');
        recommendations.push('Review content carefully before interacting');
        score -= 25;
      }

      // Determine status based on score
      let status: 'safe' | 'warning' | 'blocked';
      if (score >= 80) {
        status = 'safe';
      } else if (score >= 50) {
        status = 'warning';
        recommendations.push('Exercise caution when visiting this site');
      } else {
        status = 'blocked';
        recommendations.push('Consider avoiding this site');
      }

      return {
        status,
        score: Math.max(0, score),
        threats,
        recommendations,
        scannedAt: new Date()
      };
    } catch (error) {
      safeLogger.error('Security scan failed:', error);
      return {
        status: 'warning',
        score: 50,
        threats: ['Unable to complete security scan'],
        recommendations: ['Exercise caution'],
        scannedAt: new Date()
      };
    }
  }

  private hasSuspiciousPatterns(url: string): boolean {
    const suspiciousPatterns = [
      /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/, // IP addresses
      /[a-z0-9]{20,}\./, // Long random subdomains
      /free.*crypto/i,
      /claim.*nft/i,
      /urgent.*action/i,
      /limited.*time/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(url));
  }

  private hasSuspiciousContent(preview: any): boolean {
    if (!preview.data) return false;

    const suspiciousKeywords = [
      'free crypto',
      'claim now',
      'limited time',
      'urgent action',
      'click here to win',
      'congratulations you won',
      'verify your wallet',
      'connect wallet immediately'
    ];

    const content = [
      preview.data.title,
      preview.data.description,
      preview.data.siteName
    ].join(' ').toLowerCase();

    return suspiciousKeywords.some(keyword => content.includes(keyword));
  }

  async scanBulkUrls(urls: string[]): Promise<Record<string, SecurityScanResult>> {
    const results: Record<string, SecurityScanResult> = {};
    
    // Process in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const batchPromises = batch.map(async url => {
        try {
          const result = await this.scanUrl(url);
          return { url, result };
        } catch (error) {
          return {
            url,
            result: {
              status: 'warning' as const,
              score: 50,
              threats: ['Scan failed'],
              recommendations: ['Exercise caution'],
              scannedAt: new Date()
            }
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ url, result }) => {
        results[url] = result;
      });
    }

    return results;
  }
}

export const securityScanService = new SecurityScanService();
