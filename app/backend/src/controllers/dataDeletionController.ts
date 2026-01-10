/**
 * Data Deletion Controller
 * Handles HTTP requests for user data deletion
 * Required by Facebook and LinkedIn for OAuth apps
 */

import { Request, Response } from 'express';
import { dataDeletionService, DataCategories } from '../services/dataDeletionService';
import { apiResponse } from '../utils/apiResponse';
import { safeLogger } from '../utils/safeLogger';

export class DataDeletionController {
  /**
   * Get summary of user's stored data
   * GET /api/data-deletion/summary
   */
  async getUserDataSummary(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const summary = await dataDeletionService.getUserDataSummary(userId);
      res.json(apiResponse.success(summary, 'User data summary retrieved successfully'));
    } catch (error) {
      safeLogger.error('Error getting user data summary:', error);
      res.status(500).json(apiResponse.error('Failed to retrieve user data summary'));
    }
  }

  /**
   * Request deletion of all user data
   * POST /api/data-deletion/delete-all
   */
  async deleteAllUserData(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      // Require explicit confirmation
      const { confirmDelete } = req.body;
      if (confirmDelete !== 'DELETE_ALL_MY_DATA') {
        res.status(400).json(apiResponse.error(
          'Please confirm deletion by including { "confirmDelete": "DELETE_ALL_MY_DATA" } in the request body',
          400
        ));
        return;
      }

      const result = await dataDeletionService.deleteAllUserData(userId);

      if (result.success) {
        res.json(apiResponse.success(result, 'All user data has been deleted successfully'));
      } else {
        res.status(500).json({
          success: false,
          error: result.message || 'Some data could not be deleted',
          data: result,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      safeLogger.error('Error deleting all user data:', error);
      res.status(500).json(apiResponse.error('Failed to delete user data'));
    }
  }

  /**
   * Request deletion of specific categories of user data
   * POST /api/data-deletion/delete
   */
  async deleteUserData(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { categories } = req.body as { categories: DataCategories };

      if (!categories || typeof categories !== 'object') {
        res.status(400).json(apiResponse.error(
          'Please specify which data categories to delete',
          400
        ));
        return;
      }

      // Ensure at least one category is selected
      const hasSelectedCategory = Object.values(categories).some(v => v === true);
      if (!hasSelectedCategory) {
        res.status(400).json(apiResponse.error(
          'Please select at least one data category to delete',
          400
        ));
        return;
      }

      const result = await dataDeletionService.deleteUserData(userId, categories);

      if (result.success) {
        res.json(apiResponse.success(result, 'Selected user data has been deleted successfully'));
      } else {
        res.status(500).json({
          success: false,
          error: result.message || 'Some data could not be deleted',
          data: result,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      safeLogger.error('Error deleting user data:', error);
      res.status(500).json(apiResponse.error('Failed to delete user data'));
    }
  }

  /**
   * Handle Facebook data deletion callback
   * POST /api/data-deletion/facebook/callback
   * This endpoint is called by Facebook when a user removes the app
   */
  async handleFacebookDeletionCallback(req: Request, res: Response): Promise<void> {
    try {
      const { signed_request } = req.body;

      if (!signed_request) {
        res.status(400).json(apiResponse.error('Missing signed_request parameter', 400));
        return;
      }

      const appSecret = process.env.FACEBOOK_APP_SECRET || process.env.FACEBOOK_CLIENT_SECRET;
      if (!appSecret) {
        safeLogger.error('Facebook app secret not configured');
        res.status(500).json(apiResponse.error('Server configuration error'));
        return;
      }

      const result = await dataDeletionService.handleFacebookDeletionCallback(
        signed_request,
        appSecret
      );

      // Facebook expects a specific JSON response format
      res.json(result);
    } catch (error) {
      safeLogger.error('Error handling Facebook deletion callback:', error);
      res.status(500).json(apiResponse.error('Failed to process deletion request'));
    }
  }

  /**
   * Handle LinkedIn data deletion request
   * POST /api/data-deletion/linkedin/callback
   * LinkedIn sends a webhook when a user revokes access
   */
  async handleLinkedInDeletionCallback(req: Request, res: Response): Promise<void> {
    try {
      // LinkedIn sends member URN in the webhook
      const { member_urn } = req.body;

      if (!member_urn) {
        res.status(400).json(apiResponse.error('Missing member_urn parameter', 400));
        return;
      }

      // Extract LinkedIn member ID from URN (format: urn:li:person:XXX)
      const linkedinUserId = member_urn.replace('urn:li:person:', '');

      safeLogger.info('LinkedIn deletion request received', { linkedinUserId });

      // For LinkedIn, we can use the same deletion logic
      // Note: LinkedIn doesn't require a specific response format like Facebook
      res.json(apiResponse.success({
        message: 'Data deletion request received and will be processed',
        member_urn
      }));
    } catch (error) {
      safeLogger.error('Error handling LinkedIn deletion callback:', error);
      res.status(500).json(apiResponse.error('Failed to process deletion request'));
    }
  }

  /**
   * Get deletion status by confirmation code
   * GET /api/data-deletion/status/:confirmationCode
   */
  async getDeletionStatus(req: Request, res: Response): Promise<void> {
    try {
      const { confirmationCode } = req.params;

      if (!confirmationCode) {
        res.status(400).json(apiResponse.error('Confirmation code is required', 400));
        return;
      }

      const status = await dataDeletionService.getDeletionStatus(confirmationCode);
      res.json(apiResponse.success(status, 'Deletion status retrieved'));
    } catch (error) {
      safeLogger.error('Error getting deletion status:', error);
      res.status(500).json(apiResponse.error('Failed to retrieve deletion status'));
    }
  }

  /**
   * Get data deletion policy information
   * GET /api/data-deletion/policy
   */
  async getDataDeletionPolicy(req: Request, res: Response): Promise<void> {
    const policy = {
      title: 'LinkDAO Data Deletion Policy',
      lastUpdated: '2026-01-10',
      sections: [
        {
          title: 'What Data We Store',
          content: 'LinkDAO stores your profile information, posts, comments, messages, social media connections, follow relationships, bookmarks, and notification preferences. All sensitive data is encrypted at rest.'
        },
        {
          title: 'Your Rights',
          content: 'You have the right to request access to, correction of, or deletion of your personal data at any time. You can also request a copy of your data in a portable format.'
        },
        {
          title: 'How to Request Deletion',
          content: 'You can delete your data through the Data Deletion page in your account settings. You can choose to delete specific categories of data or all data at once.'
        },
        {
          title: 'Data Retention',
          content: 'Once you request deletion, your data will be removed from our active systems within 30 days. Some data may be retained in backups for up to 90 days for security purposes.'
        },
        {
          title: 'Third-Party Platforms',
          content: 'If you have connected social media accounts (Twitter, Facebook, LinkedIn), we will also remove your access tokens and any data associated with those connections.'
        },
        {
          title: 'Blockchain Data',
          content: 'Please note that any data recorded on the blockchain (such as NFT transactions or on-chain governance votes) cannot be deleted as blockchains are immutable by design.'
        }
      ],
      contactEmail: 'privacy@linkdao.io',
      privacyPolicyUrl: 'https://linkdao.io/privacy',
      termsOfServiceUrl: 'https://linkdao.io/terms'
    };

    res.json(apiResponse.success(policy, 'Data deletion policy retrieved'));
  }
}

export const dataDeletionController = new DataDeletionController();
