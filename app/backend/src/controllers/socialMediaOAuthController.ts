/**
 * Social Media OAuth Controller
 * Handles OAuth flow and connection management
 */

import { Request, Response } from 'express';
import { socialMediaConnectionService } from '../services/socialMediaConnectionService';
import { isSupportedPlatform } from '../services/oauth';
import { safeLogger } from '../utils/safeLogger';
import { apiResponse } from '../utils/apiResponse';

// Helper to get the primary frontend URL (first one from comma-separated list)
function getPrimaryFrontendUrl(): string {
  const frontendUrls = process.env.FRONTEND_URL || 'http://localhost:3000';
  // FRONTEND_URL may contain multiple comma-separated URLs for CORS
  // Extract just the first one for redirects
  return frontendUrls.split(',')[0].trim();
}

class SocialMediaOAuthController {
  /**
   * Initiate OAuth flow for a platform
   * POST /api/social-media/connect/:platform
   */
  async initiateOAuth(req: Request, res: Response): Promise<void> {
    try {
      const { platform } = req.params;
      const userId = (req as any).user?.id || (req as any).userId;

      if (!userId) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      if (!platform || !isSupportedPlatform(platform)) {
        res.status(400).json(apiResponse.error(`Unsupported platform: ${platform}. Supported: twitter, facebook, linkedin, threads`, 400));
        return;
      }

      const result = await socialMediaConnectionService.initiateOAuth(userId, platform);

      res.json(apiResponse.success({
        authUrl: result.authUrl,
        platform,
      }, `Redirect to ${platform} to authorize`));
    } catch (error) {
      safeLogger.error('OAuth initiation error:', error);
      res.status(500).json(apiResponse.error(
        error instanceof Error ? error.message : 'Failed to initiate OAuth',
        500
      ));
    }
  }

  /**
   * OAuth callback handler
   * GET /api/social-media/callback/:platform
   */
  async handleCallback(req: Request, res: Response): Promise<void> {
    try {
      const { platform } = req.params;
      const { code, state, error, error_description } = req.query;

      // Handle OAuth errors from provider
      if (error) {
        safeLogger.warn('OAuth provider error:', { platform, error, error_description });
        // Redirect to frontend with error
        const frontendUrl = getPrimaryFrontendUrl();
        res.redirect(`${frontendUrl}/settings/connections?error=${encodeURIComponent(String(error_description || error))}&platform=${platform}`);
        return;
      }

      if (!code || !state) {
        res.status(400).json(apiResponse.error('Missing code or state parameter', 400));
        return;
      }

      if (!platform || !isSupportedPlatform(platform)) {
        res.status(400).json(apiResponse.error(`Unsupported platform: ${platform}`, 400));
        return;
      }

      const connection = await socialMediaConnectionService.completeOAuth(
        String(state),
        String(code)
      );

      // Redirect to frontend with success
      const frontendUrl = getPrimaryFrontendUrl();
      res.redirect(`${frontendUrl}/settings/connections?success=true&platform=${platform}&username=${encodeURIComponent(connection.platformUsername || connection.platformDisplayName || '')}`);
    } catch (error) {
      safeLogger.error('OAuth callback error:', error);

      // Redirect to frontend with error
      const frontendUrl = getPrimaryFrontendUrl();
      const errorMessage = error instanceof Error ? error.message : 'OAuth callback failed';
      res.redirect(`${frontendUrl}/settings/connections?error=${encodeURIComponent(errorMessage)}&platform=${req.params.platform}`);
    }
  }

  /**
   * Get all connected accounts for the current user
   * GET /api/social-media/connections
   */
  async getConnections(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || (req as any).userId;

      if (!userId) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const connections = await socialMediaConnectionService.getConnections(userId);

      // Don't expose sensitive token data
      const safeConnections = connections.map((conn) => ({
        id: conn.id,
        platform: conn.platform,
        platformUsername: conn.platformUsername,
        platformDisplayName: conn.platformDisplayName,
        platformAvatarUrl: conn.platformAvatarUrl,
        status: conn.status,
        connectedAt: conn.connectedAt,
        lastUsedAt: conn.lastUsedAt,
      }));

      res.json(apiResponse.success(safeConnections, 'Connections retrieved'));
    } catch (error) {
      safeLogger.error('Get connections error:', error);
      res.status(500).json(apiResponse.error('Failed to get connections', 500));
    }
  }

  /**
   * Get a specific connection
   * GET /api/social-media/connections/:platform
   */
  async getConnection(req: Request, res: Response): Promise<void> {
    try {
      const { platform } = req.params;
      const userId = (req as any).user?.id || (req as any).userId;

      if (!userId) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      if (!platform || !isSupportedPlatform(platform)) {
        res.status(400).json(apiResponse.error(`Unsupported platform: ${platform}`, 400));
        return;
      }

      const connection = await socialMediaConnectionService.getConnection(userId, platform);

      if (!connection) {
        res.status(404).json(apiResponse.error(`No ${platform} connection found`, 404));
        return;
      }

      res.json(apiResponse.success({
        id: connection.id,
        platform: connection.platform,
        platformUsername: connection.platformUsername,
        platformDisplayName: connection.platformDisplayName,
        platformAvatarUrl: connection.platformAvatarUrl,
        status: connection.status,
        connectedAt: connection.connectedAt,
        lastUsedAt: connection.lastUsedAt,
      }, 'Connection retrieved'));
    } catch (error) {
      safeLogger.error('Get connection error:', error);
      res.status(500).json(apiResponse.error('Failed to get connection', 500));
    }
  }

  /**
   * Disconnect a platform
   * DELETE /api/social-media/connections/:platform
   */
  async disconnectPlatform(req: Request, res: Response): Promise<void> {
    try {
      const { platform } = req.params;
      const userId = (req as any).user?.id || (req as any).userId;

      if (!userId) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      if (!platform || !isSupportedPlatform(platform)) {
        res.status(400).json(apiResponse.error(`Unsupported platform: ${platform}`, 400));
        return;
      }

      await socialMediaConnectionService.disconnectPlatform(userId, platform);

      res.json(apiResponse.success(null, `${platform} disconnected successfully`));
    } catch (error) {
      safeLogger.error('Disconnect platform error:', error);
      res.status(500).json(apiResponse.error('Failed to disconnect platform', 500));
    }
  }

  /**
   * Refresh connection token
   * POST /api/social-media/connections/:platform/refresh
   */
  async refreshConnection(req: Request, res: Response): Promise<void> {
    try {
      const { platform } = req.params;
      const userId = (req as any).user?.id || (req as any).userId;

      if (!userId) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      if (!platform || !isSupportedPlatform(platform)) {
        res.status(400).json(apiResponse.error(`Unsupported platform: ${platform}`, 400));
        return;
      }

      const connection = await socialMediaConnectionService.getConnection(userId, platform);

      if (!connection) {
        res.status(404).json(apiResponse.error(`No ${platform} connection found`, 404));
        return;
      }

      // Attempt to refresh
      await socialMediaConnectionService.refreshToken(connection.id);

      // Get updated connection
      const updatedConnection = await socialMediaConnectionService.getConnection(userId, platform);

      res.json(apiResponse.success({
        id: updatedConnection?.id,
        platform: updatedConnection?.platform,
        status: updatedConnection?.status,
      }, 'Connection refreshed successfully'));
    } catch (error) {
      safeLogger.error('Refresh connection error:', error);
      res.status(500).json(apiResponse.error(
        error instanceof Error ? error.message : 'Failed to refresh connection',
        500
      ));
    }
  }
}

export const socialMediaOAuthController = new SocialMediaOAuthController();
