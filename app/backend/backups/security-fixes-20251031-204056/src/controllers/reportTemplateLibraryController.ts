import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { reportTemplateLibraryService } from '../services/reportTemplateLibraryService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';

export class ReportTemplateLibraryController {
  // Category Management
  async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, icon } = req.body;

      if (!name) {
        res.status(400).json({
          success: false,
          error: 'Category name is required'
        });
        return;
      }

      const category = await reportTemplateLibraryService.createCategory({
        name,
        description: description || '',
        icon: icon || '📁'
      });

      res.status(201).json({
        success: true,
        data: category,
        message: 'Category created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create category'
      });
    }
  }

  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await reportTemplateLibraryService.getCategories();

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get categories'
      });
    }
  }

  async getCategory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const category = await reportTemplateLibraryService.getCategory(id);

      if (!category) {
        res.status(404).json({
          success: false,
          error: 'Category not found'
        });
        return;
      }

      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get category'
      });
    }
  }

  async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      const category = await reportTemplateLibraryService.updateCategory(id, updates);

      res.json({
        success: true,
        data: category,
        message: 'Category updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update category'
      });
    }
  }

  async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await reportTemplateLibraryService.deleteCategory(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Category not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Category deleted successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete category'
      });
    }
  }

  // Template Categorization
  async addTemplateToCategory(req: Request, res: Response): Promise<void> {
    try {
      const { templateId, categoryId } = req.params;

      await reportTemplateLibraryService.addTemplateToCategory(templateId, categoryId);

      res.json({
        success: true,
        message: 'Template added to category successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add template to category'
      });
    }
  }

  async removeTemplateFromCategory(req: Request, res: Response): Promise<void> {
    try {
      const { templateId, categoryId } = req.params;

      await reportTemplateLibraryService.removeTemplateFromCategory(templateId, categoryId);

      res.json({
        success: true,
        message: 'Template removed from category successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove template from category'
      });
    }
  }

  async getTemplatesByCategory(req: Request, res: Response): Promise<void> {
    try {
      const { categoryId } = req.params;
      const templates = await reportTemplateLibraryService.getTemplatesByCategory(categoryId);

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get templates by category'
      });
    }
  }

  // Search and Discovery
  async searchTemplates(req: Request, res: Response): Promise<void> {
    try {
      const query = {
        text: req.query.text as string,
        category: req.query.category as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        createdBy: req.query.createdBy as string,
        isPublic: req.query.isPublic ? req.query.isPublic === 'true' : undefined,
        minRating: req.query.minRating ? parseFloat(req.query.minRating as string) : undefined,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
      };

      const result = await reportTemplateLibraryService.searchTemplates(query);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search templates'
      });
    }
  }

  // Usage Analytics
  async recordTemplateUsage(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const userId = req.user?.id || 'anonymous';

      await reportTemplateLibraryService.recordTemplateUsage(templateId, userId);

      res.json({
        success: true,
        message: 'Template usage recorded'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to record template usage'
      });
    }
  }

  async getTemplateUsageStats(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const stats = await reportTemplateLibraryService.getTemplateUsageStats(templateId);

      if (!stats) {
        res.status(404).json({
          success: false,
          error: 'Usage stats not found'
        });
        return;
      }

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get usage stats'
      });
    }
  }

  async getPopularTemplates(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const templates = await reportTemplateLibraryService.getPopularTemplates(limit);

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get popular templates'
      });
    }
  }

  async getTrendingTemplates(req: Request, res: Response): Promise<void> {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 7;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const templates = await reportTemplateLibraryService.getTrendingTemplates(days, limit);

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get trending templates'
      });
    }
  }

  // Rating System
  async rateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const { rating, comment } = req.body;
      const userId = req.user?.id || 'anonymous';

      if (!rating || rating < 1 || rating > 5) {
        res.status(400).json({
          success: false,
          error: 'Rating must be between 1 and 5'
        });
        return;
      }

      const templateRating = await reportTemplateLibraryService.rateTemplate(
        templateId,
        userId,
        rating,
        comment
      );

      res.status(201).json({
        success: true,
        data: templateRating,
        message: 'Template rated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to rate template'
      });
    }
  }

  async getTemplateRatings(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const ratings = await reportTemplateLibraryService.getTemplateRatings(templateId);

      res.json({
        success: true,
        data: ratings
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get template ratings'
      });
    }
  }

  async getUserRating(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const userId = req.user?.id || 'anonymous';

      const rating = await reportTemplateLibraryService.getUserRating(templateId, userId);

      res.json({
        success: true,
        data: rating
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user rating'
      });
    }
  }

  // Sharing and Collaboration
  async shareTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const { sharedWith, shareType, expiresAt } = req.body;
      const sharedBy = req.user?.id || 'anonymous';

      if (!sharedWith || !Array.isArray(sharedWith) || sharedWith.length === 0) {
        res.status(400).json({
          success: false,
          error: 'sharedWith must be a non-empty array'
        });
        return;
      }

      if (!shareType || !['view', 'edit', 'copy'].includes(shareType)) {
        res.status(400).json({
          success: false,
          error: 'shareType must be one of: view, edit, copy'
        });
        return;
      }

      const share = await reportTemplateLibraryService.shareTemplate(
        templateId,
        sharedBy,
        sharedWith,
        shareType,
        expiresAt ? new Date(expiresAt) : undefined
      );

      res.status(201).json({
        success: true,
        data: share,
        message: 'Template shared successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to share template'
      });
    }
  }

  async getTemplateShares(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const shares = await reportTemplateLibraryService.getTemplateShares(templateId);

      res.json({
        success: true,
        data: shares
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get template shares'
      });
    }
  }

  async getUserSharedTemplates(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      const shares = await reportTemplateLibraryService.getUserSharedTemplates(userId);

      res.json({
        success: true,
        data: shares
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get shared templates'
      });
    }
  }

  async revokeShare(req: Request, res: Response): Promise<void> {
    try {
      const { shareId } = req.params;
      const revoked = await reportTemplateLibraryService.revokeShare(shareId);

      if (!revoked) {
        res.status(404).json({
          success: false,
          error: 'Share not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Share revoked successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to revoke share'
      });
    }
  }

  // Version Control
  async createTemplateVersion(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const { changes } = req.body;
      const createdBy = req.user?.id || 'anonymous';

      if (!changes || !Array.isArray(changes)) {
        res.status(400).json({
          success: false,
          error: 'Changes must be an array'
        });
        return;
      }

      const version = await reportTemplateLibraryService.createTemplateVersion(
        templateId,
        changes,
        createdBy
      );

      res.status(201).json({
        success: true,
        data: version,
        message: 'Template version created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create template version'
      });
    }
  }

  async getTemplateVersions(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const versions = await reportTemplateLibraryService.getTemplateVersions(templateId);

      res.json({
        success: true,
        data: versions
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get template versions'
      });
    }
  }

  async getTemplateVersion(req: Request, res: Response): Promise<void> {
    try {
      const { templateId, version } = req.params;
      const versionNumber = parseInt(version);

      if (isNaN(versionNumber)) {
        res.status(400).json({
          success: false,
          error: 'Version must be a number'
        });
        return;
      }

      const templateVersion = await reportTemplateLibraryService.getTemplateVersion(
        templateId,
        versionNumber
      );

      if (!templateVersion) {
        res.status(404).json({
          success: false,
          error: 'Template version not found'
        });
        return;
      }

      res.json({
        success: true,
        data: templateVersion
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get template version'
      });
    }
  }

  // Approval Workflow
  async submitTemplateForApproval(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const submittedBy = req.user?.id || 'anonymous';

      const approvalId = await reportTemplateLibraryService.submitTemplateForApproval(
        templateId,
        submittedBy
      );

      res.status(201).json({
        success: true,
        data: { approvalId },
        message: 'Template submitted for approval'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit template for approval'
      });
    }
  }

  async approveTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { approvalId } = req.params;
      const { comments } = req.body;
      const approvedBy = req.user?.id || 'anonymous';

      await reportTemplateLibraryService.approveTemplate(approvalId, approvedBy, comments);

      res.json({
        success: true,
        message: 'Template approved successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve template'
      });
    }
  }

  async rejectTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { approvalId } = req.params;
      const { reason } = req.body;
      const rejectedBy = req.user?.id || 'anonymous';

      if (!reason) {
        res.status(400).json({
          success: false,
          error: 'Rejection reason is required'
        });
        return;
      }

      await reportTemplateLibraryService.rejectTemplate(approvalId, rejectedBy, reason);

      res.json({
        success: true,
        message: 'Template rejected'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reject template'
      });
    }
  }

  // Recommendations
  async getRecommendedTemplates(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;

      const templates = await reportTemplateLibraryService.getRecommendedTemplates(userId, limit);

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get recommended templates'
      });
    }
  }

  async getSimilarTemplates(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;

      const templates = await reportTemplateLibraryService.getSimilarTemplates(templateId, limit);

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get similar templates'
      });
    }
  }
}

export const reportTemplateLibraryController = new ReportTemplateLibraryController();