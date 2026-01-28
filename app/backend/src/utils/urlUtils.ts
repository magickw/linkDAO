/**
 * URL Utilities
 */

/**
 * Gets the primary frontend URL from the environment.
 * Handles cases where FRONTEND_URL is a comma-separated list (common for CORS).
 * Returns the first URL from the list.
 */
export function getPrimaryFrontendUrl(): string {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  if (frontendUrl.includes(',')) {
    return frontendUrl.split(',')[0].trim();
  }
  
  return frontendUrl.trim();
}
