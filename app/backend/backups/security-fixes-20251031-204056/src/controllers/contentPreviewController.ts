import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { contentPreviewService } from '../services/contentPreviewService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { securityScanService } from '../services/securityScanService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { linkScraperService } from '../services/linkScraperService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { nftDataService } from '../services/nftDataService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { tokenDataService } from '../services/tokenDataService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { governanceService } from '../services/governanceService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';

export class ContentPreviewController {
  async generatePreview(req: Request, res: Response) {
    try {
      const { url, options } = req.body;

      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      // Validate URL format
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ error: 'Invalid URL format' });
      }

      const preview = await contentPreviewService.generatePreview(url, options);
      
      res.json({
        success: true,
        preview
      });
    } catch (error) {
      safeLogger.error('Preview generation failed:', error);
      res.status(500).json({
        error: 'Failed to generate preview',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getCachedPreview(req: Request, res: Response) {
    try {
      const { urlHash } = req.params;
      
      const cachedPreview = await contentPreviewService.getCachedPreview(urlHash);
      
      if (!cachedPreview) {
        return res.status(404).json({ error: 'Preview not found in cache' });
      }

      res.json({
        success: true,
        preview: cachedPreview
      });
    } catch (error) {
      safeLogger.error('Cache retrieval failed:', error);
      res.status(500).json({
        error: 'Failed to retrieve cached preview',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async clearCache(req: Request, res: Response) {
    try {
      await contentPreviewService.clearCache();
      
      res.json({
        success: true,
        message: 'Preview cache cleared successfully'
      });
    } catch (error) {
      safeLogger.error('Cache clearing failed:', error);
      res.status(500).json({
        error: 'Failed to clear cache',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getCacheStats(req: Request, res: Response) {
    try {
      const stats = await contentPreviewService.getCacheStats();
      
      res.json({
        success: true,
        stats
      });
    } catch (error) {
      safeLogger.error('Cache stats retrieval failed:', error);
      res.status(500).json({
        error: 'Failed to retrieve cache stats',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async securityScan(req: Request, res: Response) {
    try {
      const { url, preview } = req.body;

      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      const scanResult = await securityScanService.scanUrl(url, preview);
      
      res.json({
        success: true,
        scanResult
      });
    } catch (error) {
      safeLogger.error('Security scan failed:', error);
      res.status(500).json({
        error: 'Security scan failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async generateLinkPreview(req: Request, res: Response) {
    try {
      const { url, options } = req.body;

      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      const linkData = await linkScraperService.scrapeUrl(url, options);
      
      res.json({
        success: true,
        data: linkData
      });
    } catch (error) {
      safeLogger.error('Link preview generation failed:', error);
      res.status(500).json({
        error: 'Failed to generate link preview',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getOpenseaNFT(req: Request, res: Response) {
    try {
      const { contractAddress, tokenId } = req.params;

      if (!contractAddress || !tokenId) {
        return res.status(400).json({ error: 'Contract address and token ID are required' });
      }

      const nftData = await nftDataService.getFromOpensea(contractAddress, tokenId);
      
      res.json({
        success: true,
        data: nftData
      });
    } catch (error) {
      safeLogger.error('OpenSea NFT fetch failed:', error);
      res.status(500).json({
        error: 'Failed to fetch NFT from OpenSea',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getAlchemyNFT(req: Request, res: Response) {
    try {
      const { network, contractAddress, tokenId } = req.params;

      if (!network || !contractAddress || !tokenId) {
        return res.status(400).json({ error: 'Network, contract address, and token ID are required' });
      }

      const nftData = await nftDataService.getFromAlchemy(network, contractAddress, tokenId);
      
      res.json({
        success: true,
        data: nftData
      });
    } catch (error) {
      safeLogger.error('Alchemy NFT fetch failed:', error);
      res.status(500).json({
        error: 'Failed to fetch NFT from Alchemy',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getTokenInfo(req: Request, res: Response) {
    try {
      const { network, contractAddress } = req.params;

      if (!network || !contractAddress) {
        return res.status(400).json({ error: 'Network and contract address are required' });
      }

      const tokenData = await tokenDataService.getTokenInfo(network, contractAddress);
      
      res.json({
        success: true,
        data: tokenData
      });
    } catch (error) {
      safeLogger.error('Token info fetch failed:', error);
      res.status(500).json({
        error: 'Failed to fetch token information',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getProposalInfo(req: Request, res: Response) {
    try {
      const { proposalId } = req.params;

      if (!proposalId) {
        return res.status(400).json({ error: 'Proposal ID is required' });
      }

      const proposalData = await governanceService.getProposal(proposalId);
      
      res.json({
        success: true,
        data: proposalData
      });
    } catch (error) {
      safeLogger.error('Proposal info fetch failed:', error);
      res.status(500).json({
        error: 'Failed to fetch proposal information',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const contentPreviewController = new ContentPreviewController();