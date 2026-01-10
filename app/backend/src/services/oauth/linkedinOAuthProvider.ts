/**
 * LinkedIn OAuth Provider
 * Implements OAuth 2.0 for LinkedIn API
 */

import { BaseOAuthProvider, OAuthConfig, OAuthTokens, OAuthUserInfo, SocialMediaContent, PostResult } from './baseOAuthProvider';
import { safeLogger } from '../../utils/safeLogger';

// LinkedIn API endpoints
const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';
const LINKEDIN_SHARE_URL = 'https://api.linkedin.com/v2/ugcPosts';

// Default scopes for LinkedIn
// If you have "Sign In with LinkedIn using OpenID Connect" enabled, use: openid profile email w_member_social
// If you only have basic LinkedIn OAuth, use: r_liteprofile r_emailaddress w_member_social
// Configure via LINKEDIN_SCOPES env var (space-separated)
const getLinkedInScopes = (): string[] => {
  const envScopes = process.env.LINKEDIN_SCOPES;
  if (envScopes) {
    return envScopes.split(/[\s,]+/).filter(s => s.length > 0);
  }
  // Default to minimal scope that should work with most apps
  // Users can add more via LINKEDIN_SCOPES env var
  return ['profile', 'w_member_social'];
};

export class LinkedInOAuthProvider extends BaseOAuthProvider {
  constructor() {
    const config: OAuthConfig = {
      clientId: process.env.LINKEDIN_CLIENT_ID || '',
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
      callbackUrl: process.env.LINKEDIN_CALLBACK_URL || 'http://localhost:3001/api/social-media/callback/linkedin',
      scopes: getLinkedInScopes(),
      authorizationUrl: LINKEDIN_AUTH_URL,
      tokenUrl: LINKEDIN_TOKEN_URL,
    };
    super('linkedin', config);
  }

  /**
   * Build LinkedIn OAuth authorization URL
   */
  getAuthorizationUrl(state: string, _codeVerifier?: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.callbackUrl,
      scope: this.config.scopes.join(' '),
      state: state,
    });

    return `${LINKEDIN_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, _codeVerifier?: string): Promise<OAuthTokens> {
    try {
      const response = await fetch(LINKEDIN_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: this.config.callbackUrl,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
        }).toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        safeLogger.error('LinkedIn token exchange failed:', { status: response.status, error: errorText });
        throw new Error(`Token exchange failed: ${response.status}`);
      }

      const data = await response.json();

      // LinkedIn tokens typically expire in 60 days (5184000 seconds)
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000)
          : undefined,
        tokenType: data.token_type,
        scopes: data.scope?.split(' '),
      };
    } catch (error) {
      safeLogger.error('LinkedIn token exchange error:', error);
      throw error;
    }
  }

  /**
   * Refresh an expired access token
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    try {
      const response = await fetch(LINKEDIN_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
        }).toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        safeLogger.error('LinkedIn token refresh failed:', { status: response.status, error: errorText });
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const data = await response.json();

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt: data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000)
          : undefined,
        tokenType: data.token_type,
      };
    } catch (error) {
      safeLogger.error('LinkedIn token refresh error:', error);
      throw error;
    }
  }

  /**
   * Get user information from LinkedIn
   * Supports both OpenID Connect (userinfo) and legacy (r_liteprofile) endpoints
   */
  async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
    try {
      // Try OpenID Connect userinfo endpoint first
      const response = await fetch(LINKEDIN_USERINFO_URL, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          platformUserId: data.sub, // LinkedIn user URN
          displayName: data.name,
          email: data.email,
          avatarUrl: data.picture,
        };
      }

      // Fall back to legacy API endpoints if OpenID Connect fails
      safeLogger.info('OpenID userinfo failed, trying legacy LinkedIn API');
      return await this.getUserInfoLegacy(accessToken);
    } catch (error) {
      safeLogger.error('LinkedIn user info error, trying legacy API:', error);
      // Try legacy API as fallback
      return await this.getUserInfoLegacy(accessToken);
    }
  }

  /**
   * Get user information using legacy LinkedIn API (r_liteprofile, r_emailaddress scopes)
   */
  private async getUserInfoLegacy(accessToken: string): Promise<OAuthUserInfo> {
    try {
      // Get basic profile info
      const profileResponse = await fetch(
        'https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!profileResponse.ok) {
        const errorText = await profileResponse.text();
        safeLogger.error('LinkedIn legacy profile fetch failed:', { status: profileResponse.status, error: errorText });
        throw new Error(`Failed to get user profile: ${profileResponse.status}`);
      }

      const profileData = await profileResponse.json();

      // Get email (separate API call for legacy)
      let email: string | undefined;
      try {
        const emailResponse = await fetch(
          'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))',
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (emailResponse.ok) {
          const emailData = await emailResponse.json();
          email = emailData.elements?.[0]?.['handle~']?.emailAddress;
        }
      } catch (emailError) {
        safeLogger.warn('Failed to fetch LinkedIn email:', emailError);
      }

      // Extract profile picture URL from the complex LinkedIn structure
      let avatarUrl: string | undefined;
      const profilePicture = profileData.profilePicture?.['displayImage~']?.elements;
      if (profilePicture && profilePicture.length > 0) {
        // Get the largest image
        const largestImage = profilePicture[profilePicture.length - 1];
        avatarUrl = largestImage?.identifiers?.[0]?.identifier;
      }

      const displayName = [profileData.localizedFirstName, profileData.localizedLastName]
        .filter(Boolean)
        .join(' ') || 'LinkedIn User';

      return {
        platformUserId: profileData.id,
        displayName,
        email,
        avatarUrl,
      };
    } catch (error) {
      safeLogger.error('LinkedIn legacy user info error:', error);
      throw error;
    }
  }

  /**
   * Revoke an access token
   * Note: LinkedIn doesn't have a public token revocation endpoint
   * The user must manually revoke access from their LinkedIn settings
   */
  async revokeToken(_accessToken: string): Promise<void> {
    // LinkedIn doesn't provide a token revocation endpoint
    // We just remove the token from our database
    safeLogger.info('LinkedIn token revocation: Token removed from storage (manual revocation required on LinkedIn)');
  }

  /**
   * Post content to LinkedIn (UGC Post)
   */
  async postContent(accessToken: string, content: SocialMediaContent): Promise<PostResult> {
    try {
      const adaptedContent = this.adaptContent(content);

      // Get user info to get the person URN
      const userInfo = await this.getUserInfo(accessToken);
      const personUrn = `urn:li:person:${userInfo.platformUserId}`;

      // Build UGC post payload
      const postPayload: any = {
        author: personUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: adaptedContent.text,
            },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      };

      // Add link if present
      if (adaptedContent.link) {
        postPayload.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'ARTICLE';
        postPayload.specificContent['com.linkedin.ugc.ShareContent'].media = [
          {
            status: 'READY',
            originalUrl: adaptedContent.link,
          },
        ];
      }

      // Note: Image uploads require additional steps:
      // 1. Register upload with LinkedIn
      // 2. Upload image to the provided URL
      // 3. Use the asset URN in the post
      // This implementation handles text/link posts

      const response = await fetch(LINKEDIN_SHARE_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(postPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        safeLogger.error('LinkedIn post failed:', { status: response.status, error: errorData });

        if (response.status === 401) {
          return {
            success: false,
            error: 'Access token expired or invalid. Please reconnect your LinkedIn account.',
          };
        }
        if (response.status === 403) {
          return {
            success: false,
            error: 'Posting permission denied. Please ensure you granted the necessary permissions.',
          };
        }

        return {
          success: false,
          error: errorData.message || 'Failed to post to LinkedIn',
        };
      }

      const data = await response.json();
      const postId = data.id;

      // Extract the activity ID from the URN for the share URL
      // Format: urn:li:share:1234567890
      const activityId = postId?.split(':').pop();

      return {
        success: true,
        externalPostId: postId,
        externalPostUrl: activityId
          ? `https://www.linkedin.com/feed/update/${postId}`
          : undefined,
      };
    } catch (error) {
      safeLogger.error('LinkedIn post error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error posting to LinkedIn',
      };
    }
  }

  /**
   * Register an image upload with LinkedIn
   * Returns the upload URL and asset URN
   */
  async registerImageUpload(accessToken: string, personUrn: string): Promise<{ uploadUrl: string; asset: string } | null> {
    try {
      const registerPayload = {
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: personUrn,
          serviceRelationships: [
            {
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent',
            },
          ],
        },
      };

      const response = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerPayload),
      });

      if (!response.ok) {
        safeLogger.error('LinkedIn image registration failed:', { status: response.status });
        return null;
      }

      const data = await response.json();
      return {
        uploadUrl: data.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl,
        asset: data.value?.asset,
      };
    } catch (error) {
      safeLogger.error('LinkedIn image registration error:', error);
      return null;
    }
  }

  /**
   * LinkedIn supports refresh tokens (60 days for access, 365 days for refresh)
   */
  supportsRefreshToken(): boolean {
    return true;
  }
}
