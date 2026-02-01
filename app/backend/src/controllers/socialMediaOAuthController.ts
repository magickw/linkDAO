/**
 * Social Media OAuth Controller
 * Handles OAuth flow and connection management
 */

import { Request, Response } from 'express';
import { socialMediaConnectionService } from '../services/socialMediaConnectionService';
import { isSupportedPlatform } from '../services/oauth';
import { safeLogger } from '../utils/safeLogger';
import { getPrimaryFrontendUrl } from '../utils/urlUtils';
import { ApiResponse } from '../utils/apiResponse';

class SocialMediaOAuthController {
  /**
   * Serve Bluesky Client Metadata
   * GET /api/social-media/bluesky-metadata.json
   */
  async getBlueskyMetadata(req: Request, res: Response): Promise<void> {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.linkdao.io';
    const frontendUrl = getPrimaryFrontendUrl();

    const metadata = {
      client_id: `${backendUrl}/api/social-media/bluesky-metadata.json`,
      client_name: 'LinkDAO',
      client_uri: frontendUrl,
      logo_uri: `${frontendUrl}/logo.png`,
      redirect_uris: [
        `${backendUrl}/api/social-media/callback/bluesky`
      ],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      scope: 'atproto transition:generic',
      token_endpoint_auth_method: 'none',
      application_type: 'web',
      dpop_bound_access_tokens: true
    };

    res.header('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify(metadata, null, 2));
  }

  /**
   * Connect Bluesky directly (App Password)
   * POST /api/social-media/connect/bluesky/direct
   */
  async connectBlueskyDirect(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || (req as any).userId;
      const { handle, appPassword } = req.body;

      if (!userId) {
        return ApiResponse.unauthorized(res, 'Authentication required');
      }

      if (!handle || !appPassword) {
        return ApiResponse.badRequest(res, 'Handle and App Password are required');
      }

      const connection = await socialMediaConnectionService.connectBlueskyDirect(userId, handle, appPassword);

      return ApiResponse.success(res, {
        success: true,
        data: {
          id: connection.id,
          platform: connection.platform,
          username: connection.platformUsername,
          displayName: connection.platformDisplayName,
        }
      });
    } catch (error) {
      safeLogger.error('Bluesky direct connection error:', error);
      return ApiResponse.serverError(res, error instanceof Error ? error.message : 'Failed to connect to Bluesky');
    }
  }

  /**
   * Initiate OAuth flow for a platform
   * POST /api/social-media/connect/:platform
   */
  async initiateOAuth(req: Request, res: Response): Promise<void> {
    try {
      const { platform } = req.params;
      const userId = (req as any).user?.id || (req as any).userId;

      if (!userId) {
        return ApiResponse.unauthorized(res, 'Authentication required');
      }

      if (!platform || !isSupportedPlatform(platform)) {
        return ApiResponse.badRequest(res, `Unsupported platform: ${platform}. Supported: twitter, facebook, linkedin, threads, bluesky`);
      }

      const result = await socialMediaConnectionService.initiateOAuth(userId, platform);

      return ApiResponse.success(res, {
        authUrl: result.authUrl,
        platform,
      });
    } catch (error) {
      safeLogger.error('OAuth initiation error:', error);

      const errorMessage = error instanceof Error ? error.message : 'Failed to initiate OAuth';

      // Check if it's a configuration error
      if (errorMessage.includes('not configured') || errorMessage.includes('BLUESKY_CLIENT_ID')) {
        return ApiResponse.badRequest(res, `${errorMessage} Please contact the administrator to configure this platform.`);
      }

      return ApiResponse.serverError(res, errorMessage);
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
        return ApiResponse.badRequest(res, 'Missing code or state parameter');
      }

      if (!platform || !isSupportedPlatform(platform)) {
        return ApiResponse.badRequest(res, `Unsupported platform: ${platform}`);
      }

      // For Bluesky, pass the full callback params for DPoP handling
      let callbackParams: URLSearchParams | undefined;
      if (platform === 'bluesky') {
        callbackParams = new URLSearchParams();
        for (const [key, value] of Object.entries(req.query)) {
          if (typeof value === 'string') {
            callbackParams.set(key, value);
          }
        }
      }

      const connection = await socialMediaConnectionService.completeOAuth(
        String(state),
        String(code),
        callbackParams
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
        return ApiResponse.unauthorized(res, 'Authentication required');
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

      return ApiResponse.success(res, safeConnections);
    } catch (error) {
      safeLogger.error('Get connections error:', error);
      return ApiResponse.serverError(res, 'Failed to get connections');
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
        return ApiResponse.unauthorized(res, 'Authentication required');
      }

      if (!platform || !isSupportedPlatform(platform)) {
        return ApiResponse.badRequest(res, `Unsupported platform: ${platform}`);
      }

      const connection = await socialMediaConnectionService.getConnection(userId, platform);

      if (!connection) {
        return ApiResponse.notFound(res, `No ${platform} connection found`);
      }

      return ApiResponse.success(res, {
        id: connection.id,
        platform: connection.platform,
        platformUsername: connection.platformUsername,
        platformDisplayName: connection.platformDisplayName,
        platformAvatarUrl: connection.platformAvatarUrl,
        status: connection.status,
        connectedAt: connection.connectedAt,
        lastUsedAt: connection.lastUsedAt,
      });
    } catch (error) {
      safeLogger.error('Get connection error:', error);
      return ApiResponse.serverError(res, 'Failed to get connection');
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
        return ApiResponse.unauthorized(res, 'Authentication required');
      }

      if (!platform || !isSupportedPlatform(platform)) {
        return ApiResponse.badRequest(res, `Unsupported platform: ${platform}`);
      }

      await socialMediaConnectionService.disconnectPlatform(userId, platform);

      return ApiResponse.success(res, null);
    } catch (error) {
      safeLogger.error('Disconnect platform error:', error);
      return ApiResponse.serverError(res, 'Failed to disconnect platform');
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
        return ApiResponse.unauthorized(res, 'Authentication required');
      }

      if (!platform || !isSupportedPlatform(platform)) {
        return ApiResponse.badRequest(res, `Unsupported platform: ${platform}`);
      }

      const connection = await socialMediaConnectionService.getConnection(userId, platform);

      if (!connection) {
        return ApiResponse.notFound(res, `No ${platform} connection found`);
      }

      // Attempt to refresh
      await socialMediaConnectionService.refreshToken(connection.id);

      // Get updated connection
      const updatedConnection = await socialMediaConnectionService.getConnection(userId, platform);

      return ApiResponse.success(res, {
        id: updatedConnection?.id,
        platform: updatedConnection?.platform,
        status: updatedConnection?.status,
      });
    } catch (error) {
      safeLogger.error('Refresh connection error:', error);
      return ApiResponse.serverError(res, error instanceof Error ? error.message : 'Failed to refresh connection');
    }
  }
}

export const socialMediaOAuthController = new SocialMediaOAuthController();
