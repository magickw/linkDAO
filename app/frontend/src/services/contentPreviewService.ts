import { ContentPreview, NFTPreview, LinkPreview, ProposalPreview, TokenPreview, PreviewGenerationOptions, SecurityScanResult } from '../types/contentPreview';

class ContentPreviewService {
  private cache = new Map<string, ContentPreview>();
  private sandboxWorker: Worker | null = null;
  
  private defaultOptions: PreviewGenerationOptions = {
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

  constructor() {
    this.initializeSandboxWorker();
  }

  private initializeSandboxWorker() {
    if (typeof Worker !== 'undefined') {
      try {
        this.sandboxWorker = new Worker('/workers/preview-sandbox.js');
      } catch (error) {
        console.warn('Failed to initialize sandbox worker:', error);
      }
    }
  }

  async generatePreview(url: string, options?: Partial<PreviewGenerationOptions>): Promise<ContentPreview> {
    const opts = { ...this.defaultOptions, ...options };
    
    // Check cache first
    if (opts.cacheEnabled) {
      const cached = this.getCachedPreview(url);
      if (cached) return cached;
    }

    // Determine content type
    const contentType = this.detectContentType(url);
    
    let preview: ContentPreview;
    
    try {
      switch (contentType) {
        case 'nft':
          preview = await this.generateNFTPreview(url, opts);
          break;
        case 'link':
          preview = await this.generateLinkPreview(url, opts);
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
      const securityResult = await this.performSecurityScan(url, preview);
      preview.securityStatus = securityResult.status;

      // Cache the result
      if (opts.cacheEnabled) {
        this.cachePreview(url, preview, opts.cacheTTL);
      }

      return preview;
    } catch (error) {
      console.error('Preview generation failed:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to generate preview for ${url}: ${error.message}`);
      }
      throw new Error(`Failed to generate preview for ${url}: ${error}`);
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

  private async generateNFTPreview(url: string, options: PreviewGenerationOptions): Promise<ContentPreview> {
    const nftData = await this.fetchNFTData(url);
    
    const preview: ContentPreview = {
      id: `nft-${Date.now()}`,
      type: 'nft',
      url,
      data: nftData,
      thumbnail: nftData.image,
      metadata: {
        fetchedAt: new Date().toISOString(),
        source: 'nft-api'
      },
      cached: false,
      securityStatus: 'safe'
    };

    return preview;
  }

  private async fetchNFTData(url: string): Promise<NFTPreview> {
    // Extract contract address and token ID from URL
    const { contractAddress, tokenId, network } = this.parseNFTUrl(url);
    
    try {
      // Fetch from multiple sources for reliability
      const [openseaData, alchemyData] = await Promise.allSettled([
        this.fetchFromOpensea(contractAddress, tokenId),
        this.fetchFromAlchemy(contractAddress, tokenId, network || 'ethereum')
      ]);

      // Combine data from different sources
      const nftData = this.combineNFTData(openseaData, alchemyData);
      
      return {
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
      };
    } catch (error) {
      console.error('Failed to fetch NFT data:', error);
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

  private async fetchFromOpensea(contractAddress: string, tokenId: string): Promise<any> {
    const response = await fetch(`/api/nft/opensea/${contractAddress}/${tokenId}`);
    if (!response.ok) throw new Error('OpenSea API failed');
    return response.json();
  }

  private async fetchFromAlchemy(contractAddress: string, tokenId: string, network: string): Promise<any> {
    const response = await fetch(`/api/nft/alchemy/${network}/${contractAddress}/${tokenId}`);
    if (!response.ok) throw new Error('Alchemy API failed');
    return response.json();
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
      } : undefined
    };
  }

  private async generateLinkPreview(url: string, options: PreviewGenerationOptions): Promise<ContentPreview> {
    // Security check first
    if (this.isBlockedDomain(url, options.blockedDomains)) {
      throw new Error('Domain is blocked for security reasons');
    }

    const linkData = await this.fetchLinkMetadata(url, options);
    
    const preview: ContentPreview = {
      id: `link-${Date.now()}`,
      type: 'link',
      url,
      data: linkData,
      thumbnail: linkData.image,
      metadata: {
        fetchedAt: new Date().toISOString(),
        source: 'link-scraper'
      },
      cached: false,
      securityStatus: 'safe'
    };

    return preview;
  }

  private async fetchLinkMetadata(url: string, options: PreviewGenerationOptions): Promise<LinkPreview> {
    try {
      const response = await fetch('/api/preview/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, options })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        url,
        title: data.title || 'No Title',
        description: data.description || '',
        image: data.image || '',
        siteName: data.siteName || new URL(url).hostname,
        type: this.classifyLinkType(data),
        favicon: data.favicon,
        publishedTime: data.publishedTime,
        author: data.author,
        metadata: data.metadata || {},
        securityScore: data.securityScore || 0
      };
    } catch (error) {
      console.error('Link metadata fetch failed:', error);
      throw new Error('Unable to fetch link preview');
    }
  }

  private classifyLinkType(data: any): 'article' | 'video' | 'product' | 'website' {
    if (data.type === 'video' || data.videoUrl) return 'video';
    if (data.type === 'article' || data.publishedTime) return 'article';
    if (data.price || data.productId) return 'product';
    return 'website';
  }

  private async generateProposalPreview(url: string, options: PreviewGenerationOptions): Promise<ContentPreview> {
    const proposalData = await this.fetchProposalData(url);
    
    const preview: ContentPreview = {
      id: `proposal-${Date.now()}`,
      type: 'proposal',
      url,
      data: proposalData,
      thumbnail: `/images/governance-${proposalData.status}.png`,
      metadata: {
        fetchedAt: new Date().toISOString(),
        source: 'governance-api'
      },
      cached: false,
      securityStatus: 'safe'
    };

    return preview;
  }

  private async fetchProposalData(url: string): Promise<ProposalPreview> {
    const proposalId = this.extractProposalId(url);
    
    try {
      const response = await fetch(`/api/governance/proposal/${proposalId}`);
      if (!response.ok) throw new Error('Proposal API failed');
      
      const data = await response.json();
      
      return {
        id: proposalId,
        title: data.title,
        description: data.description,
        status: data.status,
        votingEnds: new Date(data.votingEnds),
        votingStarts: new Date(data.votingStarts),
        yesVotes: data.yesVotes || 0,
        noVotes: data.noVotes || 0,
        abstainVotes: data.abstainVotes || 0,
        quorum: data.quorum || 0,
        proposer: data.proposer,
        proposerReputation: data.proposerReputation,
        category: data.category || 'general',
        executionDelay: data.executionDelay,
        requiredMajority: data.requiredMajority || 50
      };
    } catch (error) {
      console.error('Failed to fetch proposal data:', error);
      throw new Error('Unable to fetch proposal information');
    }
  }

  private extractProposalId(url: string): string {
    const match = url.match(/proposal\/([^\/\?]+)/);
    if (!match) throw new Error('Unable to extract proposal ID from URL');
    return match[1];
  }

  private async generateTokenPreview(url: string, options: PreviewGenerationOptions): Promise<ContentPreview> {
    const tokenData = await this.fetchTokenData(url);
    
    const preview: ContentPreview = {
      id: `token-${Date.now()}`,
      type: 'token',
      url,
      data: tokenData,
      thumbnail: tokenData.logo,
      metadata: {
        fetchedAt: new Date().toISOString(),
        source: 'token-api'
      },
      cached: false,
      securityStatus: 'safe'
    };

    return preview;
  }

  private async fetchTokenData(url: string): Promise<TokenPreview> {
    const { contractAddress, network } = this.parseTokenUrl(url);
    
    try {
      const response = await fetch(`/api/token/${network}/${contractAddress}`);
      if (!response.ok) throw new Error('Token API failed');
      
      const data = await response.json();
      
      return {
        symbol: data.symbol,
        name: data.name,
        amount: data.amount || 0,
        usdValue: data.usdValue || 0,
        change24h: data.change24h || 0,
        change7d: data.change7d,
        logo: data.logo || '/images/default-token.png',
        contractAddress,
        network,
        decimals: data.decimals || 18,
        marketCap: data.marketCap,
        volume24h: data.volume24h,
        holders: data.holders,
        verified: data.verified || false
      };
    } catch (error) {
      console.error('Failed to fetch token data:', error);
      throw new Error('Unable to fetch token information');
    }
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

  private async performSecurityScan(url: string, preview: ContentPreview): Promise<SecurityScanResult> {
    try {
      const response = await fetch('/api/security/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, preview })
      });

      if (!response.ok) {
        // Default to safe if security scan fails
        return {
          status: 'safe',
          score: 50,
          threats: [],
          recommendations: [],
          scannedAt: new Date()
        };
      }

      return response.json();
    } catch (error) {
      console.warn('Security scan failed:', error);
      return {
        status: 'safe',
        score: 50,
        threats: [],
        recommendations: [],
        scannedAt: new Date()
      };
    }
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

  private getCachedPreview(url: string): ContentPreview | null {
    const cached = this.cache.get(url);
    if (!cached) return null;

    // Check if cache is expired
    if (cached.cacheExpiry && cached.cacheExpiry < new Date()) {
      this.cache.delete(url);
      return null;
    }

    return cached;
  }

  private cachePreview(url: string, preview: ContentPreview, ttl: number): void {
    const cachedPreview = {
      ...preview,
      cached: true,
      cacheExpiry: new Date(Date.now() + ttl)
    };
    
    this.cache.set(url, cachedPreview);
  }

  // Public methods for cache management
  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  getCacheStats(): { size: number; urls: string[] } {
    return {
      size: this.cache.size,
      urls: Array.from(this.cache.keys())
    };
  }
}

export const contentPreviewService = new ContentPreviewService();
export default contentPreviewService;