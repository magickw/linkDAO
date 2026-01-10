/**
 * Base OAuth Provider
 * Abstract base class for OAuth 2.0 implementations
 */

import crypto from 'crypto';

// OAuth configuration for each platform
export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  scopes: string[];
  authorizationUrl: string;
  tokenUrl: string;
}

// OAuth tokens returned after authentication
export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  tokenType?: string;
  scopes?: string[];
}

// User info from the social platform
export interface OAuthUserInfo {
  platformUserId: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  email?: string;
}

// Supported platforms
export type SocialPlatform = 'twitter' | 'facebook' | 'linkedin' | 'threads';

// Content to post to social media
export interface SocialMediaContent {
  text: string;
  mediaUrls?: string[];
  link?: string;
}

// Result of posting to social media
export interface PostResult {
  success: boolean;
  externalPostId?: string;
  externalPostUrl?: string;
  error?: string;
}

// Platform-specific character limits
export const PLATFORM_LIMITS: Record<SocialPlatform, { textLimit: number; mediaLimit: number }> = {
  twitter: { textLimit: 280, mediaLimit: 4 },
  facebook: { textLimit: 63206, mediaLimit: 10 },
  linkedin: { textLimit: 3000, mediaLimit: 9 },
  threads: { textLimit: 500, mediaLimit: 10 },
};

/**
 * Abstract base class for OAuth providers
 */
export abstract class BaseOAuthProvider {
  protected config: OAuthConfig;
  protected platform: SocialPlatform;

  constructor(platform: SocialPlatform, config: OAuthConfig) {
    this.platform = platform;
    this.config = config;
  }

  /**
   * Generate a cryptographically secure random state parameter
   */
  protected generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate PKCE code verifier (for Twitter OAuth 2.0)
   */
  protected generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Generate PKCE code challenge from verifier
   */
  protected generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }

  /**
   * Get the platform name
   */
  getPlatform(): SocialPlatform {
    return this.platform;
  }

  /**
   * Build the authorization URL for OAuth flow
   * @param state - CSRF protection state parameter
   * @param codeVerifier - Optional PKCE code verifier (required for Twitter)
   */
  abstract getAuthorizationUrl(state: string, codeVerifier?: string): string;

  /**
   * Exchange authorization code for tokens
   * @param code - Authorization code from callback
   * @param codeVerifier - Optional PKCE code verifier (required for Twitter)
   */
  abstract exchangeCodeForTokens(code: string, codeVerifier?: string): Promise<OAuthTokens>;

  /**
   * Refresh an expired access token
   * @param refreshToken - The refresh token
   */
  abstract refreshAccessToken(refreshToken: string): Promise<OAuthTokens>;

  /**
   * Get user information from the platform
   * @param accessToken - Valid access token
   */
  abstract getUserInfo(accessToken: string): Promise<OAuthUserInfo>;

  /**
   * Revoke an access token
   * @param accessToken - Token to revoke
   */
  abstract revokeToken(accessToken: string): Promise<void>;

  /**
   * Post content to the social media platform
   * @param accessToken - Valid access token
   * @param content - Content to post
   */
  abstract postContent(accessToken: string, content: SocialMediaContent): Promise<PostResult>;

  /**
   * Adapt content for platform-specific requirements
   * @param content - Original content
   */
  adaptContent(content: SocialMediaContent): SocialMediaContent {
    const limits = PLATFORM_LIMITS[this.platform];
    let text = content.text;

    // Truncate text if needed
    if (text.length > limits.textLimit) {
      // Leave room for ellipsis and link
      const maxLength = limits.textLimit - 4;
      text = text.substring(0, maxLength) + '...';
    }

    // Limit media count
    const mediaUrls = content.mediaUrls?.slice(0, limits.mediaLimit);

    return {
      ...content,
      text,
      mediaUrls,
    };
  }

  /**
   * Check if the provider supports refresh tokens
   */
  abstract supportsRefreshToken(): boolean;
}

/**
 * Factory function to get OAuth provider by platform
 */
export function getOAuthProvider(platform: SocialPlatform): BaseOAuthProvider {
  // Import dynamically to avoid circular dependencies
  switch (platform) {
    case 'twitter':
      const { TwitterOAuthProvider } = require('./twitterOAuthProvider');
      return new TwitterOAuthProvider();
    case 'facebook':
      const { FacebookOAuthProvider } = require('./facebookOAuthProvider');
      return new FacebookOAuthProvider();
    case 'linkedin':
      const { LinkedInOAuthProvider } = require('./linkedinOAuthProvider');
      return new LinkedInOAuthProvider();
    case 'threads':
      const { ThreadsOAuthProvider } = require('./threadsOAuthProvider');
      return new ThreadsOAuthProvider();
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

/**
 * Check if a platform is supported
 */
export function isSupportedPlatform(platform: string): platform is SocialPlatform {
  return ['twitter', 'facebook', 'linkedin', 'threads'].includes(platform);
}
