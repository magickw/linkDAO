import crypto from 'crypto';
import { safeLogger } from '../utils/safeLogger';
import { linkScraperService } from './linkScraperService';
import { nftDataService } from './nftDataService';
import { tokenDataService } from './tokenDataService';
import { governanceService } from './governanceService';
import { securityScanService } from './securityScanService';

interface PreviewCache {
  [key: string]: {
    preview: any;
    createdAt: Date;
    expiresAt: Date;
    accessCount: number;
    lastAccessed: Date;
  };
}

interface PreviewGenerationOptions {
  enableSandbox?: boolean;
  timeout?: number;
  maxFileSize?: number;
  allowedDomains?: string[];
  blockedDomains?: string[];
  cacheEnabled?: boolean;
  cacheTTL?: number;
}

export class ContentPreviewService {
  private cache: PreviewCache = {};
  private readonly defaultOptions: PreviewGenerationOptions = {
    enableSandbox: true,
    timeout: 10000,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    cacheEnabled: true,
    cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
    blockedDomains: [
      'malicious-site.com',
      'phishing-example.com'
    ]
  };

  async generatePreview(url: string, options?: PreviewGenerationOptions) {
    const opts = { ...this.defaultOptions, ...options };
    const urlHash = this.hashUrl(url);

    // Check cache first
    if (opts.cacheEnabled) {
      const cached = this.getCachedPreviewSync(urlHash);
      if (cached) {
        this.updateAccessStats(urlHash);
        return cached;
      }
    }

    // Security check
    if (this.isBlockedDomain(url, opts.blockedDomains)) {
      throw new Error('Domain is blocked for security reasons');
    }

    // Determine content type and generate preview
    const contentType = this.detectContentType(url);
    let preview: any;

    try {
      switch (contentType) {
        case 'nft':
          preview = await this.generateNFTPreview(url, opts);
          break;
        case 'proposal':
          preview = await this.generateProposalPreview(url, opts);
          break;
        case 'token':
          preview = await this.generateTokenPreview(url, opts);
          break;
        default:
          preview = await this.generateLinkPreview(url, opts);
      }

      // Security scan
      const securityResult = await securityScanService.scanUrl(url, preview);
      preview.securityStatus = securityResult.status;

      // Cache the result
      if (opts.cacheEnabled) {
        this.cachePreview(urlHash, preview, opts.cacheTTL!);
      }

      return preview;
    } catch (error) {
      safeLogger.error('Preview generation failed:', error);
      throw new Error(`Failed to generate preview for ${url}: ${error.message}`);
    }
  }

  private detectContentType(url: string): 'nft' | 'link' | 'proposal' | 'token' {
    // NFT patterns
    if (url.includes('opensea.io') || url.includes('rarible.com') || url.includes('foundation.app')) {
      return 'nft';
    }
    
    // Proposal patterns
    if (url.includes('snapshot.org') || url.includes('tally.xyz') || url.includes('/proposal/')) {
      return 'proposal';
    }
    
    // Token patterns
    if (url.includes('etherscan.io/token') || url.includes('coingecko.com') || url.includes('coinmarketcap.com')) {
      return 'token';
    }
    
    return 'link';
  }

  private async generateNFTPreview(url: string, options: PreviewGenerationOptions) {
    const { contractAddress, tokenId, network } = this.parseNFTUrl(url);
    
    try {
      // Fetch from multiple sources for reliability
      const [openseaData, alchemyData] = await Promise.allSettled([
        nftDataService.getFromOpensea(contractAddress, tokenId),
        nftDataService.getFromAlchemy(network || 'ethereum', contractAddress, tokenId)
      ]);

      // Combine data from different sources
      const nftData = this.combineNFTData(openseaData, alchemyData);
      
      return {
        id: `nft-${Date.now()}`,
        type: 'nft',
        url,
        data: {
          contractAddress,
          tokenId,
          name: nftData.name || 'Unknown NFT',
          description: nftData.description || '',
          image: nftData.image || '',
          collection: nftData.collection || 'Unknown Collection',
          owner: nftData.owner || '',
          price: nftData.price,
          rarity: nftData.rarity,
          traits: nftData.traits || [],
          floorPrice: nftData.floorPrice,
          lastSale: nftData.lastSale,
          network: network || 'ethereum'
        },
        thumbnail: nftData.image,
        metadata: {
          fetchedAt: new Date().toISOString(),
          source: 'nft-api'
        },
        cached: false,
        securityStatus: 'safe'
      };
    } catch (error) {
      safeLogger.error('Failed to fetch NFT data:', error);
      throw new Error('Unable to fetch NFT information');
    }
  }

  private parseNFTUrl(url: string): { contractAddress: string; tokenId: string; network?: string } {
    // OpenSea URL pattern: https://opensea.io/assets/ethereum/0x.../123
    const openseaMatch = url.match(/opensea\.io\/assets\/(\w+)\/([^\/]+)\/(\d+)/);
    if (openseaMatch) {
      return {
        network: openseaMatch[1],
        contractAddress: openseaMatch[2],
        tokenId: openseaMatch[3]
      };
    }

    // Generic pattern extraction
    const genericMatch = url.match(/0x[a-fA-F0-9]{40}/);
    const tokenMatch = url.match(/\/(\d+)$/);
    
    if (genericMatch && tokenMatch) {
      return {
        contractAddress: genericMatch[0],
        tokenId: tokenMatch[1]
      };
    }

    throw new Error('Unable to parse NFT URL');
  }

  private combineNFTData(openseaResult: PromiseSettledResult<any>, alchemyResult: PromiseSettledResult<any>): any {
    const opensea = openseaResult.status === 'fulfilled' ? openseaResult.value : null;
    const alchemy = alchemyResult.status === 'fulfilled' ? alchemyResult.value : null;

    return {
      name: opensea?.name || alchemy?.title || 'Unknown NFT',
      description: opensea?.description || alchemy?.description || '',
      image: opensea?.image_url || alchemy?.media?.[0]?.gateway || '',
      collection: opensea?.collection?.name || alchemy?.contractMetadata?.name || 'Unknown Collection',
      owner: opensea?.owner?.address || alchemy?.owners?.[0] || '',
      traits: opensea?.traits || alchemy?.metadata?.attributes || [],
      price: opensea?.last_sale ? {
        amount: opensea.last_sale.total_price,
        symbol: opensea.last_sale.payment_token.symbol,
        network: 'ethereum'
      } : undefined,
      floorPrice: opensea?.collection?.floor_price ? {
        amount: opensea.collection.floor_price,
        symbol: 'ETH',
        network: 'ethereum'
      } : undefined,
      lastSale: opensea?.last_sale ? {
        amount: opensea.last_sale.total_price,
        symbol: opensea.last_sale.payment_token.symbol,
        network: 'ethereum'
      } : undefined
    };
  }

  private async generateLinkPreview(url: string, options: PreviewGenerationOptions) {
    const linkData = await linkScraperService.scrapeUrl(url, options);
    
    return {
      id: `link-${Date.now()}`,
      type: 'link',
      url,
      data: {
        url,
        title: linkData.title || 'No Title',
        description: linkData.description || '',
        image: linkData.image || '',
        siteName: linkData.siteName || new URL(url).hostname,
        type: this.classifyLinkType(linkData),
        favicon: linkData.favicon,
        publishedTime: linkData.publishedTime,
        author: linkData.author,
        metadata: linkData.metadata || {},
        securityScore: linkData.securityScore || 0
      },
      thumbnail: linkData.image,
      metadata: {
        fetchedAt: new Date().toISOString(),
        source: 'link-scraper'
      },
      cached: false,
      securityStatus: 'safe'
    };
  }

  private classifyLinkType(data: any): 'article' | 'video' | 'product' | 'website' {
    if (data.type === 'video' || data.videoUrl) return 'video';
    if (data.type === 'article' || data.publishedTime) return 'article';
    if (data.price || data.productId) return 'product';
    return 'website';
  }

  private async generateProposalPreview(url: string, options: PreviewGenerationOptions) {
    const proposalId = this.extractProposalId(url);
    const proposalData = await governanceService.getProposal(proposalId);
    
    return {
      id: `proposal-${Date.now()}`,
      type: 'proposal',
      url,
      data: {
        id: proposalId,
        title: proposalData.title,
        description: proposalData.description,
        status: proposalData.status,
        votingEnds: new Date(proposalData.votingEnds),
        votingStarts: new Date(proposalData.votingStarts),
        yesVotes: proposalData.yesVotes || 0,
        noVotes: proposalData.noVotes || 0,
        abstainVotes: proposalData.abstainVotes || 0,
        quorum: proposalData.quorum || 0,
        proposer: proposalData.proposer,
        proposerReputation: proposalData.proposerReputation,
        category: proposalData.category || 'general',
        executionDelay: proposalData.executionDelay,
        requiredMajority: proposalData.requiredMajority || 50
      },
      thumbnail: `/images/governance-${proposalData.status}.png`,
      metadata: {
        fetchedAt: new Date().toISOString(),
        source: 'governance-api'
      },
      cached: false,
      securityStatus: 'safe'
    };
  }

  private extractProposalId(url: string): string {
    const match = url.match(/proposal\/([^\/\?]+)/);
    if (!match) throw new Error('Unable to extract proposal ID from URL');
    return match[1];
  }

  private async generateTokenPreview(url: string, options: PreviewGenerationOptions) {
    const { contractAddress, network } = this.parseTokenUrl(url);
    const tokenData = await tokenDataService.getTokenInfo(network, contractAddress);
    
    return {
      id: `token-${Date.now()}`,
      type: 'token',
      url,
      data: {
        symbol: tokenData.symbol,
        name: tokenData.name,
        amount: tokenData.amount || 0,
        usdValue: tokenData.usdValue || 0,
        change24h: tokenData.change24h || 0,
        change7d: tokenData.change7d,
        logo: tokenData.logo || '/images/default-token.png',
        contractAddress,
        network,
        decimals: tokenData.decimals || 18,
        marketCap: tokenData.marketCap,
        volume24h: tokenData.volume24h,
        holders: tokenData.holders,
        verified: tokenData.verified || false
      },
      thumbnail: tokenData.logo,
      metadata: {
        fetchedAt: new Date().toISOString(),
        source: 'token-api'
      },
      cached: false,
      securityStatus: 'safe'
    };
  }

  private parseTokenUrl(url: string): { contractAddress: string; network: string } {
    // Etherscan pattern
    const etherscanMatch = url.match(/etherscan\.io\/token\/([^\/\?]+)/);
    if (etherscanMatch) {
      return { contractAddress: etherscanMatch[1], network: 'ethereum' };
    }

    // Generic contract address pattern
    const contractMatch = url.match(/0x[a-fA-F0-9]{40}/);
    if (contractMatch) {
      return { contractAddress: contractMatch[0], network: 'ethereum' };
    }

    throw new Error('Unable to parse token URL');
  }

  private isBlockedDomain(url: string, blockedDomains?: string[]): boolean {
    if (!blockedDomains) return false;
    
    try {
      const domain = new URL(url).hostname;
      return blockedDomains.some(blocked => domain.includes(blocked));
    } catch {
      return true; // Block invalid URLs
    }
  }

  private hashUrl(url: string): string {
    return crypto.createHash('sha256').update(url).digest('hex');
  }

  private getCachedPreviewSync(urlHash: string): any | null {
    const cached = this.cache[urlHash];
    if (!cached) return null;

    // Check if cache is expired
    if (cached.expiresAt < new Date()) {
      delete this.cache[urlHash];
      return null;
    }

    return cached.preview;
  }

  async getCachedPreview(urlHash: string): Promise<any | null> {
    return this.getCachedPreviewSync(urlHash);
  }

  private cachePreview(urlHash: string, preview: any, ttl: number): void {
    this.cache[urlHash] = {
      preview: {
        ...preview,
        cached: true,
        cacheExpiry: new Date(Date.now() + ttl)
      },
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + ttl),
      accessCount: 0,
      lastAccessed: new Date()
    };
  }

  private updateAccessStats(urlHash: string): void {
    if (this.cache[urlHash]) {
      this.cache[urlHash].accessCount++;
      this.cache[urlHash].lastAccessed = new Date();
    }
  }

  async clearCache(): Promise<void> {
    this.cache = {};
  }

  async getCacheStats(): Promise<{ size: number; entries: any[] }> {
    const entries = Object.entries(this.cache).map(([hash, data]) => ({
      hash,
      createdAt: data.createdAt,
      expiresAt: data.expiresAt,
      accessCount: data.accessCount,
      lastAccessed: data.lastAccessed,
      type: data.preview.type
    }));

    return {
      size: Object.keys(this.cache).length,
      entries
    };
  }
}

export const contentPreviewService = new ContentPreviewService();
